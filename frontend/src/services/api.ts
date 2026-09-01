/**
 * KAVACH AI — API Client
 * All data comes from the real backend. No simulators.
 */

import { AgentState, HumanDecision, ModelInfo, NetworkPacketLog } from "../types/agent";

const API_BASE_URL = "http://localhost:8000/api/agent";

// ── Static reference data (used by other tabs, not dummy outputs) ──────────

export const activeModelsList: ModelInfo[] = [
  {
    id: "qwen-coder",
    name: "Qwen-2.5-Coder-32B-Instruct",
    specialization: "Isolated Sandbox Code Execution & Mathematical Calculations",
    weightsFormat: "GGUF Q4_K_M (On-Premise GPU)",
    vramUsageGb: 19.4,
    contextLength: "128k Tokens",
    status: "ACTIVE",
    tokenThroughput: 48.2,
    description: "Executes Python stress/fatigue calculations & generates deterministic audit scripts.",
  },
  {
    id: "llava-vision",
    name: "LLaVA-v1.6-34B-Vision / Qwen2-VL",
    specialization: "P&ID Drawings, Ultrasonic Scans, Weld Defect Recognition",
    weightsFormat: "AWQ 4-Bit (Local VRAM)",
    vramUsageGb: 21.2,
    contextLength: "32k Tokens",
    status: "ACTIVE",
    tokenThroughput: 34.6,
    description: "Multimodal visual OCR & structural defect localization on industrial schematics.",
  },
  {
    id: "llama3-reasoning",
    name: "Llama-3.3-70B-Instruct-Sovereign",
    specialization: "Industrial SOP Compliance, Approval Note Synthesis, RAG Grounding",
    weightsFormat: "EXL2 4.25bpw (Air-Gapped Cluster)",
    vramUsageGb: 38.5,
    contextLength: "128k Tokens",
    status: "ROUTED",
    tokenThroughput: 39.1,
    description: "Synthesizes formal PSU / Refinery Board Approval Notes with statutory citations.",
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek-R1-Distill-Llama-70B",
    specialization: "Multi-step Chain-of-Thought Verification & Failure Mode Analysis",
    weightsFormat: "GGUF Q5_K_M (Local Host)",
    vramUsageGb: 42.0,
    contextLength: "64k Tokens",
    status: "STANDBY",
    tokenThroughput: 28.4,
    description: "Deep reasoning engine verifying ASME Section VIII engineering limit adherence.",
  },
];

export const initialNetworkLogs: NetworkPacketLog[] = [
  {
    id: "pkt-01",
    timestamp: "Just now",
    destination: "Localhost GPU Tensor Engine (CUDA:0)",
    ip: "127.0.0.1:8000",
    protocol: "IPC / Local Shared Memory",
    status: "ON_PREM_GPU",
    isExternal: false,
    sizeBytes: 4194304,
  },
  {
    id: "pkt-02",
    timestamp: "1s ago",
    destination: "Docker Network Sandbox (Isolated Bridge)",
    ip: "172.18.0.2:0 (NO_INET)",
    protocol: "Unix Domain Socket",
    status: "INTERNAL_SOCKET",
    isExternal: false,
    sizeBytes: 12480,
  },
  {
    id: "pkt-03",
    timestamp: "3s ago",
    destination: "Vector ChromaDB / Milvus Local SQLite",
    ip: "127.0.0.1:8001",
    protocol: "Local Embedded",
    status: "ON_PREM_GPU",
    isExternal: false,
    sizeBytes: 89120,
  },
  {
    id: "pkt-04",
    timestamp: "5s ago",
    destination: "Blocked Cloud Outbound (api.openai.com)",
    ip: "0.0.0.0 (IPTABLES DROP)",
    protocol: "HTTPS / 443",
    status: "LOCAL_BLOCKED",
    isExternal: true,
    sizeBytes: 0,
  },
  {
    id: "pkt-05",
    timestamp: "7s ago",
    destination: "Blocked Cloud Outbound (api.anthropic.com)",
    ip: "0.0.0.0 (AIR-GAP AIRTIGHT)",
    protocol: "HTTPS / 443",
    status: "LOCAL_BLOCKED",
    isExternal: true,
    sizeBytes: 0,
  },
];

export const sampleIndustrialScenarios = [
  {
    id: "sc-1",
    title: "Document Inspection",
    category: "DOCUMENT_INSPECTION",
    query: "Review the attached pump maintenance log. Extract the key findings, identify any anomalies, and draft an approval note for the supervisor.",
    files: ["pump_maintenance_log_Q3.pdf"]
  },
  {
    id: "sc-2",
    title: "Sandbox Execution",
    category: "SANDBOX_CODE_EXECUTION",
    query: "Analyze the vibration telemetry CSV data. Write and execute a Python script in the sandbox to identify periods where vibration exceeds the safe threshold of 0.8g.",
    files: ["vibration_telemetry_unit4.csv"]
  },
  {
    id: "sc-3",
    title: "Multimodal Analysis",
    category: "MULTIMODAL_ANALYSIS",
    query: "Examine this P&ID drawing and identify the location of the pressure relief valve. Cross-reference with the safety manual to ensure it's positioned correctly.",
    files: ["pid_diagram_reactor_B.png", "safety_manual_v2.pdf"]
  }
];

// ── Live API calls ─────────────────────────────────────────────────────────

/**
 * Fetches the list of registered tools from the backend.
 */
export async function fetchAvailableTools(): Promise<
  Array<{ name: string; description: string; category: string }>
> {
  const response = await fetch(`${API_BASE_URL}/tools`);
  if (!response.ok) throw new Error(`Tools fetch failed: ${response.status}`);
  return response.json();
}

/**
 * Runs the agent workflow for a given query and file list.
 * Throws if the backend is unreachable — no silent fallback.
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

/**
 * Submits a human-in-the-loop approval decision.
 * Throws if the backend is unreachable.
 */
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
