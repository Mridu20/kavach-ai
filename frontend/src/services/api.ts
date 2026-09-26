/**
 * KAVACH AI — API Client
 * All data comes from the real backend. No simulators.
 *
 * CHANGES from your original:
 * - Added uploadFile() - actually sends files to the backend.
 * - Added fetchNetworkStats() - real psutil-backed data for NetworkMonitor.
 * - activeModelsList now describes your real 7B Ollama models instead of
 *   fictional 32B/70B specs (update the tag strings if yours differ).
 * - initialNetworkLogs kept ONLY as a loading-state placeholder; the
 *   NetworkMonitor component should overwrite it with fetchNetworkStats()
 *   on mount and poll it, not render it directly.
 */

import { AgentState, HumanDecision, ModelInfo, NetworkPacketLog } from "../types/agent";


// ── Session token ──────────────────────────────────────────────────────────
// Held in localStorage so a refresh keeps you signed in. The server treats the
// token as opaque and stores only its digest, so this value is useless once
// revoked or expired.

const TOKEN_KEY = "kavach_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private browsing or blocked storage: the session simply won't persist.
  }
}

/** Thrown when the server rejects the session, so the UI can send the user back to sign-in. */
export class UnauthorizedError extends Error {
  constructor(message = "Your session has expired. Please sign in again.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * fetch with the session token attached.
 *
 * Every call goes through here so a new endpoint cannot accidentally ship
 * unauthenticated, and so a 401 is surfaced as one recognisable error type.
 */
export async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(url, { ...init, headers });
  if (response.status === 401) {
    setToken(null);
    throw new UnauthorizedError();
  }
  return response;
}

const API_BASE_URL = "http://localhost:8000/api/agent";
const SYSTEM_BASE_URL = "http://localhost:8000/api/system";

// ── Static reference data (describes the real running architecture) ───────

export const activeModelsList: ModelInfo[] = [
  {
    id: "qwen-coder",
    name: "Qwen2.5-Coder-7B-Instruct (Q4_K_M)",
    specialization: "Code Generation & Execution",
    weightsFormat: "GGUF Q4_K_M (Ollama, local GPU)",
    vramUsageGb: 5.5,
    contextLength: "32k Tokens",
    status: "ACTIVE",
    tokenThroughput: 22.0,
    description: "Generates and reasons about Python scripts executed safely in the sandbox.",
  },
  {
    id: "qwen-vl",
    name: "Qwen2.5-VL-7B (Q4_K_M)",
    specialization: "Visual Analysis & Image Understanding",
    weightsFormat: "GGUF Q4_K_M (Ollama, local GPU)",
    vramUsageGb: 6.0,
    contextLength: "32k Tokens",
    status: "ACTIVE",
    tokenThroughput: 18.0,
    description: "Multimodal image understanding, diagram parsing, and visual document reasoning.",
  },
  {
    id: "qwen-instruct",
    name: "Qwen2.5-7B-Instruct (Q4_K_M)",
    specialization: "General Reasoning & Conversation",
    weightsFormat: "GGUF Q4_K_M (Ollama, local GPU)",
    vramUsageGb: 5.5,
    contextLength: "32k Tokens",
    status: "ROUTED",
    tokenThroughput: 24.0,
    description: "Multi-turn dialog, analytical reasoning, and synthesized text responses.",
  },
  {
    id: "tesseract-ocr",
    name: "Tesseract OCR v5 (CPU Engine)",
    specialization: "Document Text & Table Extraction",
    weightsFormat: "Native C++ / Pytesseract (Local CPU)",
    vramUsageGb: 0,
    contextLength: "Multi-Page Stream",
    status: "ACTIVE",
    tokenThroughput: 45.0,
    description: "High-speed local OCR engine for attached documents and images with zero cloud egress.",
  },
];

// Placeholder shown only until the first real fetchNetworkStats() resolves.
export const initialNetworkLogs: NetworkPacketLog[] = [];

export const sampleScenarios = [
  {
    id: "sc-1",
    title: "1. Explain a Technical Concept",
    category: "GENERAL_REASONING" as const,
    query: "Explain how transformer self-attention mechanisms work in simple, intuitive terms with an example.",
  },
  {
    id: "sc-2",
    title: "2. Write & Test Python Code",
    category: "SANDBOX_CODE_EXECUTION" as const,
    query: "Write and execute a Python script in the sandbox to calculate primes up to 1000 and report the elapsed time.",
  },
  {
    id: "sc-3",
    title: "3. Analyze Attached Document",
    category: "DOCUMENT_ANALYSIS" as const,
    query: "Please read the attached file, extract the primary directives, and provide an executive summary with key recommendations.",
  },
  {
    id: "sc-4",
    title: "4. Generate Formatted Document",
    category: "DELIVERABLE_GENERATION" as const,
    query: "Create a project status summary covering deliverables, milestones, and upcoming tasks, and generate docx document.",
  },
];

export const sampleIndustrialScenarios = sampleScenarios;


// ── Live API calls ─────────────────────────────────────────────────────────

export async function fetchAvailableTools(): Promise<
  Array<{ name: string; description: string; category: string }>
> {
  const response = await authedFetch(`${API_BASE_URL}/tools`);
  if (!response.ok) throw new Error(`Tools fetch failed: ${response.status}`);
  return response.json();
}

/**
 * NEW: uploads a real File to the backend and returns the server-side path.
 * Call this for every file BEFORE runAgentWorkflow().
 */
export async function uploadFile(file: File): Promise<{ saved_path: string; original_filename: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await authedFetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "Unknown error");
    throw new Error(`Upload failed (${response.status}): ${detail}`);
  }

  return response.json();
}

/**
 * Runs the agent workflow for a given query and file list.
 * `inputFiles` must be REAL server-side paths returned by uploadFile(),
 * not raw browser filenames.
 */
export async function runAgentWorkflow(
  query: string,
  inputFiles: string[] = [],
  conversationId?: string | null
): Promise<AgentState> {
  const response = await authedFetch(`${API_BASE_URL}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_query: query,
      input_files: inputFiles,
      conversation_id: conversationId ?? null,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "Unknown error");
    throw new Error(`Agent run failed (${response.status}): ${detail}`);
  }

  return response.json();
}

/**
 * Runs the agent workflow with real-time SSE step streaming.
 * Calls `onProgress(state)` as each step is performed by the agent backend.
 * Supports AbortSignal for immediate client-side and server-side interruption.
 */
export async function runAgentWorkflowStream(
  query: string,
  inputFiles: string[] = [],
  onProgress?: (state: AgentState) => void,
  signal?: AbortSignal,
  conversationId?: string | null
): Promise<AgentState> {
  try {
    const response = await authedFetch(`${API_BASE_URL}/run-stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_query: query,
        input_files: inputFiles,
        conversation_id: conversationId ?? null,
      }),
      signal,
    });

    if (!response.ok || !response.body) {
      return runAgentWorkflow(query, inputFiles, conversationId);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalState: AgentState | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          try {
            const payload = JSON.parse(trimmed.slice(6));
            if (payload.type === "ERROR") {
              throw new Error(payload.error || "Agent execution failed");
            }
            if (payload.type === "CANCELLED" && payload.state) {
              return payload.state;
            }
            if (payload.state) {
              finalState = payload.state;
              if (onProgress) {
                onProgress(payload.state);
              }
            }
          } catch (err) {
            if (err instanceof Error && err.message.includes("Agent execution failed")) {
              throw err;
            }
          }
        }
      }
    }

    if (finalState) return finalState;
    return runAgentWorkflow(query, inputFiles, conversationId);
  } catch (err) {
    if (signal?.aborted) {
      throw new Error("Generation cancelled by user.");
    }
    // Fallback if SSE streaming endpoint fails
    return runAgentWorkflow(query, inputFiles, conversationId);
  }
}

/**
 * Signals backend to abort execution of the task immediately.
 */
export async function cancelAgentWorkflow(taskId: string): Promise<AgentState> {
  const response = await authedFetch(`${API_BASE_URL}/cancel/${encodeURIComponent(taskId)}`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Cancellation failed: ${response.status}`);
  }
  return response.json();
}

export async function submitHumanApproval(
  taskId: string,
  decision: HumanDecision,
  reviewer: string,
  comments?: string,
  modifications?: Record<string, unknown>
): Promise<AgentState> {
  const response = await authedFetch(`${API_BASE_URL}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task_id: taskId, decision, reviewer, comments, modifications }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "Unknown error");
    throw new Error(`Approval submission failed (${response.status}): ${detail}`);
  }

  return response.json();
}

/**
 * NEW: real, live network connection data for the sovereignty panel.
 */
export async function fetchNetworkStats(): Promise<{
  total_connections: number;
  local_count: number;
  external_count: number;
  connections: Array<{ id: string; destination: string; isExternal: boolean; status: string }>;
}> {
  const response = await authedFetch(`${SYSTEM_BASE_URL}/network`);
  if (!response.ok) throw new Error(`Network stats fetch failed: ${response.status}`);
  return response.json();
}

/**
 * Returns the real download URL for a generated deliverable.
 * `filename` is the output_path returned in state.draft_deliverables.
 */
export function getDeliverableDownloadUrl(filename: string): string {
  return `${API_BASE_URL}/download/${encodeURIComponent(filename)}`;
}

// ── Conversation history ───────────────────────────────────────────────────
// Backed by a local SQLite file on the server. Nothing leaves the host.

const CONVERSATIONS_BASE_URL = "http://localhost:8000/api/conversations";

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface StoredMessage {
  id: number;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Array<{ doc: string; page?: number; score?: number }> | null;
  task_id?: string | null;
  created_at: string;
}

export async function fetchConversations(limit = 50): Promise<ConversationSummary[]> {
  const response = await authedFetch(`${CONVERSATIONS_BASE_URL}?limit=${limit}`);
  if (!response.ok) throw new Error(`Conversation list failed: ${response.status}`);
  const data = await response.json();
  return data.conversations ?? [];
}

export async function fetchConversation(
  conversationId: string
): Promise<ConversationSummary & { messages: StoredMessage[] }> {
  const response = await authedFetch(`${CONVERSATIONS_BASE_URL}/${encodeURIComponent(conversationId)}`);
  if (!response.ok) throw new Error(`Conversation fetch failed: ${response.status}`);
  return response.json();
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const response = await authedFetch(`${CONVERSATIONS_BASE_URL}/${encodeURIComponent(conversationId)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(`Conversation delete failed: ${response.status}`);
}

export async function renameConversation(
  conversationId: string,
  title: string
): Promise<ConversationSummary> {
  const response = await authedFetch(`${CONVERSATIONS_BASE_URL}/${encodeURIComponent(conversationId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) throw new Error(`Conversation rename failed: ${response.status}`);
  return response.json();
}

// ── Authentication ─────────────────────────────────────────────────────────
// Local accounts only. There is no identity provider and no outbound call:
// an air-gapped deployment must still be able to sign people in.

const AUTH_BASE_URL = "http://localhost:8000/api/auth";

export interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  email?: string | null;
  employee_id?: string | null;
  role: "admin" | "user";
  is_active: boolean;
  created_at: string;
}

async function authJson(path: string, init: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");

  const response = await fetch(`${AUTH_BASE_URL}${path}`, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(formatApiError(data, response.status));
  }
  return data;
}

/**
 * Turns a FastAPI error body into something a person can act on.
 *
 * Validation failures arrive as `detail: [{loc, msg}, ...]`, not a string.
 * Passing that array to `new Error()` renders "[object Object]", which tells
 * the user nothing and hides the actual problem — which field, and why.
 */
export function formatApiError(data: any, status?: number): string {
  const detail = data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const messages = detail.map((item) => {
      const field = Array.isArray(item?.loc)
        ? item.loc.filter((p: unknown) => p !== "body").join(".")
        : "";
      const message = item?.msg || "is invalid";
      if (!field) return message;
      // "username: String should have at least 3 characters"
      const label = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, " ");
      return `${label}: ${message}`;
    });
    if (messages.length) return messages.join(". ");
  }

  return `Request failed${status ? ` (${status})` : ""}.`;
}

/** Whether this deployment still needs its first administrator. */
export async function fetchAuthStatus(): Promise<{ needs_bootstrap: boolean; user_count: number }> {
  return authJson("/status");
}

export async function bootstrapAdmin(payload: {
  username: string;
  password: string;
  full_name: string;
  email?: string;
  employee_id?: string;
}): Promise<AuthUser> {
  return authJson("/bootstrap", { method: "POST", body: JSON.stringify(payload) });
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const data = await authJson("/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data.user;
}

export async function logout(): Promise<void> {
  try {
    await authJson("/logout", { method: "POST" });
  } finally {
    // Clear locally even if the server call fails, so the UI never strands
    // someone in a signed-in state they cannot leave.
    setToken(null);
  }
}

/** Resolves the current session, or null when not signed in. */
export async function fetchMe(): Promise<AuthUser | null> {
  if (!getToken()) return null;
  try {
    return await authJson("/me");
  } catch {
    setToken(null);
    return null;
  }
}

export async function fetchUsers(): Promise<AuthUser[]> {
  const data = await authJson("/users");
  return data.users ?? [];
}

export async function createUser(payload: {
  username: string;
  password: string;
  full_name: string;
  email?: string;
  employee_id?: string;
  role?: "admin" | "user";
}): Promise<AuthUser> {
  return authJson("/users", { method: "POST", body: JSON.stringify(payload) });
}

export async function deleteUser(userId: string): Promise<void> {
  await authJson(`/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
}
