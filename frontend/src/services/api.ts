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

const API_BASE_URL = "http://localhost:8000/api/agent";
const SYSTEM_BASE_URL = "http://localhost:8000/api/system";

// ── Static reference data (describes the real running architecture) ───────

export const activeModelsList: ModelInfo[] = [
  {
    id: "qwen-coder",
    name: "Qwen2.5-Coder-7B-Instruct (Q4_K_M)",
    specialization: "Sandbox Code Execution & Verification Scripts",
    weightsFormat: "GGUF Q4_K_M (Ollama, local GPU)",
    vramUsageGb: 5.5,
    contextLength: "32k Tokens",
    status: "ACTIVE",
    tokenThroughput: 22.0,
    description: "Generates and reasons about Python verification/audit scripts run in the sandbox.",
  },
  {
    id: "qwen-vl",
    name: "Qwen2.5-VL-7B (Q4_K_M)",
    specialization: "P&ID Drawings, Scanned Reports, Defect Recognition",
    weightsFormat: "GGUF Q4_K_M (Ollama, local GPU)",
    vramUsageGb: 6.0,
    contextLength: "32k Tokens",
    status: "ACTIVE",
    tokenThroughput: 18.0,
    description: "Multimodal OCR & structural defect localization on industrial scans/diagrams.",
  },
  {
    id: "qwen-instruct",
    name: "Qwen2.5-7B-Instruct (Q4_K_M)",
    specialization: "General Reasoning, SOP Compliance, Approval Note Synthesis",
    weightsFormat: "GGUF Q4_K_M (Ollama, local GPU)",
    vramUsageGb: 5.5,
    contextLength: "32k Tokens",
    status: "ROUTED",
    tokenThroughput: 24.0,
    description: "Synthesizes approval notes and general reasoning grounded in RAG evidence.",
  },
  {
    id: "tesseract-ocr",
    name: "Tesseract OCR v5 (CPU Engine)",
    specialization: "Scanned Document OCR & Tabular Inspection Extraction",
    weightsFormat: "Native C++ / Pytesseract (Local CPU)",
    vramUsageGb: 0,
    contextLength: "Multi-Page Stream",
    status: "ACTIVE",
    tokenThroughput: 45.0,
    description: "High-speed local OCR engine for scanned plant inspection reports, ultrasonic NDT tables, and raster image extraction with zero GPU VRAM overhead.",
  },
];

// Placeholder shown only until the first real fetchNetworkStats() resolves.
export const initialNetworkLogs: NetworkPacketLog[] = [];

export const sampleIndustrialScenarios = [
  {
    id: "sc-1",
    title: "Document Inspection",
    category: "DOCUMENT_INSPECTION",
    query: "Review the attached pump maintenance log. Extract the key findings, identify any anomalies, and draft an approval note for the supervisor.",
    // NOTE: these no longer pretend a file exists client-side.
    // The user must actually pick/drop a file in the UI; this scenario
    // only pre-fills the query text.
  },
  {
    id: "sc-2",
    title: "Sandbox Execution",
    category: "SANDBOX_CODE_EXECUTION",
    query: "Analyze the vibration telemetry CSV data. Write and execute a Python script in the sandbox to identify periods where vibration exceeds the safe threshold of 0.8g.",
  },
  {
    id: "sc-3",
    title: "Multimodal Analysis",
    category: "MULTIMODAL_ANALYSIS",
    query: "Examine this P&ID drawing and identify the location of the pressure relief valve. Cross-reference with the safety manual to ensure it's positioned correctly.",
  },
];

// ── Live API calls ─────────────────────────────────────────────────────────

export async function fetchAvailableTools(): Promise<
  Array<{ name: string; description: string; category: string }>
> {
  const response = await fetch(`${API_BASE_URL}/tools`);
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

  const response = await fetch(`${API_BASE_URL}/upload`, {
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
  inputFiles: string[] = []
): Promise<AgentState> {
  const response = await fetch(`${API_BASE_URL}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_query: query, input_files: inputFiles }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "Unknown error");
    throw new Error(`Agent run failed (${response.status}): ${detail}`);
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
  const response = await fetch(`${API_BASE_URL}/approve`, {
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
  const response = await fetch(`${SYSTEM_BASE_URL}/network`);
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
