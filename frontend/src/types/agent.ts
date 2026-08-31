/**
 * Types and schemas for Kavach AI Sovereign Industrial AI Workbench
 */

export type TaskCategory =
  | "DOCUMENT_INSPECTION"
  | "SOP_RAG_QUERY"
  | "SANDBOX_CODE_EXECUTION"
  | "DELIVERABLE_GENERATION"
  | "GENERAL_REASONING";

export type StepStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "SKIPPED";

export type HumanDecision =
  | "NOT_SUBMITTED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "MODIFIED"
  | "REJECTED";

export interface EvidenceItem {
  source_doc: string;
  page_num?: number;
  snippet: string;
  confidence_score: number;
  image_url?: string;
}

export interface PlanStep {
  step_id: number;
  title: string;
  description: string;
  assigned_tool: string;
  status: StepStatus;
  result?: Record<string, any>;
  error?: string;
  retry_count?: number;
}

export interface ToolCallRecord {
  call_id: string;
  step_id: number;
  tool_name: string;
  input_params: Record<string, any>;
  output?: any;
  execution_time_ms: number;
  success: boolean;
  error_message?: string;
  timestamp: string;
}

export interface VerificationCheck {
  check_name: string;
  passed: boolean;
  details: string;
}

export interface VerificationResult {
  verified: boolean;
  checks: VerificationCheck[];
  feedback: string;
  revision_needed: boolean;
  attempt: number;
  zero_external_calls: boolean;
}

export interface HumanApprovalState {
  status: HumanDecision;
  reviewer?: string;
  comments?: string;
  modifications?: Record<string, any>;
  timestamp?: string;
}

export interface TraceEvent {
  event_id: string;
  timestamp: string;
  event_type: string;
  message: string;
  payload: Record<string, any>;
}

export interface AgentTrace {
  task_id: string;
  events: TraceEvent[];
  start_time: string;
  end_time?: string;
  total_tool_calls: number;
  total_tokens_used: number;
}

export interface AgentState {
  task_id: string;
  user_query: string;
  input_files: string[];
  category: TaskCategory;
  plan: PlanStep[];
  current_step_index: number;
  tool_calls: ToolCallRecord[];
  retrieved_evidence: EvidenceItem[];
  findings: Record<string, any>;
  draft_deliverables: Record<string, string>;
  verification?: VerificationResult;
  approval: HumanApprovalState;
  trace: AgentTrace;
  status: string;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  specialization: string;
  weightsFormat: string;
  vramUsageGb: number;
  contextLength: string;
  status: "ACTIVE" | "STANDBY" | "ROUTED";
  tokenThroughput: number;
  description: string;
}

export interface NetworkPacketLog {
  id: string;
  timestamp: string;
  destination: string;
  ip: string;
  protocol: string;
  status: "LOCAL_BLOCKED" | "ON_PREM_GPU" | "INTERNAL_SOCKET";
  isExternal: boolean;
  sizeBytes: number;
}
