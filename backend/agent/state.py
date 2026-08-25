"""
Agent state schemas and execution trace models for KAVACH AI Workbench.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class TaskCategory(str, Enum):
    DOCUMENT_INSPECTION = "DOCUMENT_INSPECTION"
    SOP_RAG_QUERY = "SOP_RAG_QUERY"
    SANDBOX_CODE_EXECUTION = "SANDBOX_CODE_EXECUTION"
    DELIVERABLE_GENERATION = "DELIVERABLE_GENERATION"
    GENERAL_REASONING = "GENERAL_REASONING"


class StepStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class HumanDecision(str, Enum):
    NOT_SUBMITTED = "NOT_SUBMITTED"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    MODIFIED = "MODIFIED"
    REJECTED = "REJECTED"


class EvidenceItem(BaseModel):
    source_doc: str
    page_num: Optional[int] = None
    snippet: str
    confidence_score: float = 1.0
    image_url: Optional[str] = None


class PlanStep(BaseModel):
    step_id: int
    title: str
    description: str
    assigned_tool: str
    status: StepStatus = StepStatus.PENDING
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    retry_count: int = 0


class ToolCallRecord(BaseModel):
    call_id: str
    step_id: int
    tool_name: str
    input_params: Dict[str, Any] = Field(default_factory=dict)
    output: Optional[Any] = None
    execution_time_ms: float = 0.0
    success: bool = True
    error_message: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class VerificationCheck(BaseModel):
    check_name: str
    passed: bool
    details: str


class VerificationResult(BaseModel):
    verified: bool = False
    checks: List[VerificationCheck] = Field(default_factory=list)
    feedback: str = ""
    revision_needed: bool = False
    attempt: int = 1
    zero_external_calls: bool = True


class HumanApprovalState(BaseModel):
    status: HumanDecision = HumanDecision.NOT_SUBMITTED
    reviewer: Optional[str] = None
    comments: Optional[str] = None
    modifications: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None


class TraceEvent(BaseModel):
    event_id: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    event_type: str  # CLASSIFICATION, PLANNING, TOOL_START, TOOL_END, VERIFICATION, HITL_WAIT, DECISION, ERROR
    message: str
    payload: Dict[str, Any] = Field(default_factory=dict)


class AgentTrace(BaseModel):
    task_id: str
    events: List[TraceEvent] = Field(default_factory=list)
    start_time: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    end_time: Optional[str] = None
    total_tool_calls: int = 0
    total_tokens_used: int = 0


class AgentState(BaseModel):
    task_id: str
    user_query: str
    input_files: List[str] = Field(default_factory=list)
    category: TaskCategory = TaskCategory.GENERAL_REASONING
    plan: List[PlanStep] = Field(default_factory=list)
    current_step_index: int = 0
    tool_calls: List[ToolCallRecord] = Field(default_factory=list)
    retrieved_evidence: List[EvidenceItem] = Field(default_factory=list)
    findings: Dict[str, Any] = Field(default_factory=dict)
    draft_deliverables: Dict[str, str] = Field(default_factory=dict)  # e.g., {"approval_note": "path/to/docx"}
    verification: Optional[VerificationResult] = None
    approval: HumanApprovalState = Field(default_factory=HumanApprovalState)
    trace: AgentTrace = Field(default_factory=lambda: AgentTrace(task_id=""))
    status: str = "INITIALIZED"  # INITIALIZED, PLANNING, EXECUTING, VERIFYING, AWAITING_APPROVAL, COMPLETED, REJECTED, FAILED
    error: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def add_trace_event(self, event_type: str, message: str, payload: Optional[Dict[str, Any]] = None) -> TraceEvent:
        if payload is None:
            payload = {}
        event = TraceEvent(
            event_id=f"evt_{len(self.trace.events) + 1}",
            event_type=event_type,
            message=message,
            payload=payload,
        )
        self.trace.events.append(event)
        self.updated_at = datetime.now(timezone.utc).isoformat()
        return event
