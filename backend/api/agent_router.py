"""
FastAPI Router for Sovereign Agent Execution, State Management, and Human Approval.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.agent.state import AgentState, AgentTrace, HumanDecision
from backend.agent.orchestrator import AgentOrchestrator
from backend.agent.verifier import SelfVerifier
from backend.agent.human_approval import HumanApprovalManager

router = APIRouter(prefix="/api/agent", tags=["Agent Orchestrator"])
orchestrator = AgentOrchestrator()


class RunAgentRequest(BaseModel):
    user_query: str = Field(..., description="User query or instruction prompt")
    input_files: Optional[List[str]] = Field(default_factory=list, description="Uploaded file paths")
    task_id: Optional[str] = Field(None, description="Optional task ID")


class HumanApprovalRequest(BaseModel):
    task_id: str
    decision: HumanDecision
    reviewer: str = "Authorized Inspector"
    comments: Optional[str] = None
    modifications: Optional[Dict[str, Any]] = None



@router.post("/run", response_model=AgentState, status_code=status.HTTP_200_OK)
def run_agent_workflow(req: RunAgentRequest):
    """Starts agent task, runs execution plan steps, and executes self-verification."""
    state = orchestrator.create_task(query=req.user_query, input_files=req.input_files, task_id=req.task_id)
    state = orchestrator.run_all_steps(state)
    SelfVerifier.verify(state)
    return state


@router.get("/state/{task_id}", response_model=AgentState)
def get_agent_state(task_id: str):
    """Retrieves full agent state including findings, deliverables, and approval status."""
    state = orchestrator.get_task(task_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Agent task '{task_id}' not found.")
    return state


@router.get("/trace/{task_id}", response_model=AgentTrace)
def get_agent_trace(task_id: str):
    """Retrieves live execution trace events for judge dashboard & UI visualization."""
    state = orchestrator.get_task(task_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Agent task '{task_id}' not found.")
    return state.trace


@router.post("/approve", response_model=AgentState)
def submit_human_approval(req: HumanApprovalRequest):
    """Submits human approval, modification, or rejection for verified agent deliverables."""
    state = orchestrator.get_task(req.task_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Agent task '{req.task_id}' not found.")

    updated_state = HumanApprovalManager.submit_decision(
        state=state,
        decision=req.decision,
        reviewer=req.reviewer,
        comments=req.comments,
        modifications=req.modifications,
    )
    return updated_state


@router.get("/tools")
def list_available_tools():
    """Lists all sovereign local tools registered in the agent hub."""
    return orchestrator.tool_registry.list_tools()


@router.post("/ingest")
def ingest_document(file_path: str, force_ocr: bool = False, force_vlm: bool = False):
    """Phase 2 Document & Vision Ingestion API endpoint."""
    from ingestion import extract_content
    result = extract_content(file_path=file_path, force_ocr=force_ocr, force_vlm=force_vlm)
    return result.model_dump()


@router.get("/ingest/sample")
def get_sample_ingestion():
    """Returns sample Phase 2 document & vision ingestion result."""
    from ingestion import extract_content
    sample_path = "ingestion/samples/sample_plant_inspection.txt"
    result = extract_content(file_path=sample_path)
    return result.model_dump()

