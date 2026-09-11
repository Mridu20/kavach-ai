"""
FastAPI Router for Sovereign Agent Execution, State Management, and Human Approval.

CHANGES from your original:
- Added POST /api/agent/upload  -> saves a real file to backend/storage/uploads/
- Added GET  /api/agent/download/{filename} -> serves a real generated deliverable
Everything else is unchanged from your existing file.
"""

import json
import asyncio
import os
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from backend.agent.state import AgentState, AgentTrace, HumanDecision
from backend.agent.orchestrator import AgentOrchestrator
from backend.agent.verifier import SelfVerifier
from backend.agent.human_approval import HumanApprovalManager

router = APIRouter(prefix="/api/agent", tags=["Agent Orchestrator"])
orchestrator = AgentOrchestrator()

UPLOAD_DIR = os.path.join("backend", "storage", "uploads")
OUTPUT_DIR = os.path.join("backend", "storage", "outputs")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


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


# --------------------------------------------------------------------------
# NEW: real file upload
# --------------------------------------------------------------------------

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Saves an uploaded file to backend/storage/uploads/ and returns the
    real server-side path. The frontend must call this BEFORE /run and
    pass the returned `saved_path` in `input_files`.
    """
    safe_name = f"{uuid.uuid4().hex[:8]}_{file.filename}"
    saved_path = os.path.join(UPLOAD_DIR, safe_name)

    with open(saved_path, "wb") as out:
        content = await file.read()
        out.write(content)

    return {
        "original_filename": file.filename,
        "saved_path": saved_path,
        "size_bytes": len(content),
    }


# --------------------------------------------------------------------------
# NEW: real file download for generated deliverables
# --------------------------------------------------------------------------

@router.get("/download/{filename}")
def download_deliverable(filename: str):
    """
    Serves a real generated deliverable (docx/xlsx) from backend/storage/outputs/.
    `filename` should match the output_path returned by the docx/xlsx tools.
    """
    # Prevent path traversal - only allow serving from OUTPUT_DIR by basename
    safe_name = os.path.basename(filename)
    file_path = os.path.join(OUTPUT_DIR, safe_name)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Deliverable not found: {safe_name}")

    return FileResponse(
        path=file_path,
        filename=safe_name,
        media_type="application/octet-stream",
    )


# --------------------------------------------------------------------------
# Existing endpoints with cancellation and auto-approval support
# --------------------------------------------------------------------------

@router.post("/cancel/{task_id}", response_model=AgentState)
def cancel_agent_workflow(task_id: str):
    """Halts execution of an in-flight agent task."""
    state = orchestrator.get_task(task_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found.")
    state.request_cancel()
    return state


@router.post("/run", response_model=AgentState, status_code=status.HTTP_200_OK)
def run_agent_workflow(req: RunAgentRequest):
    """Starts agent task, runs execution plan steps, and executes self-verification."""
    state = orchestrator.create_task(query=req.user_query, input_files=req.input_files, task_id=req.task_id)
    state = orchestrator.run_all_steps(state)
    SelfVerifier.verify(state)
    if state.verification and state.verification.verified:
        HumanApprovalManager.submit_decision(state=state, decision=HumanDecision.APPROVED, reviewer="Sovereign Governance Gate")
    return state


@router.post("/run-stream")
async def run_agent_workflow_stream(req: RunAgentRequest):
    """Streams real-time step-by-step agent execution updates via Server-Sent Events (SSE)."""
    async def event_generator():
        try:
            state = orchestrator.create_task(query=req.user_query, input_files=req.input_files, task_id=req.task_id)
            yield f"data: {json.dumps({'type': 'INIT', 'state': state.model_dump()})}\n\n"
            await asyncio.sleep(0.1)

            while state.current_step_index < len(state.plan) and state.status in ["PLANNED", "EXECUTING"]:
                if state.cancellation_requested:
                    state.status = "CANCELLED"
                    yield f"data: {json.dumps({'type': 'CANCELLED', 'state': state.model_dump()})}\n\n"
                    return

                state = orchestrator.execute_next_step(state)
                yield f"data: {json.dumps({'type': 'STEP_UPDATE', 'state': state.model_dump()})}\n\n"
                await asyncio.sleep(0.15)

            if state.cancellation_requested:
                state.status = "CANCELLED"
                yield f"data: {json.dumps({'type': 'CANCELLED', 'state': state.model_dump()})}\n\n"
                return

            SelfVerifier.verify(state)
            if state.verification and state.verification.verified:
                HumanApprovalManager.submit_decision(state=state, decision=HumanDecision.APPROVED, reviewer="Sovereign Governance Gate")

            # Ensure text response is in final state
            if not state.text_response and state.findings.get("synthesized_analysis"):
                state.text_response = state.findings["synthesized_analysis"]

            yield f"data: {json.dumps({'type': 'COMPLETE', 'state': state.model_dump()})}\n\n"
        except asyncio.CancelledError:
            if 'state' in locals():
                state.request_cancel()
            return
        except Exception as e:
            err_data = {"type": "ERROR", "error": str(e)}
            yield f"data: {json.dumps(err_data)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


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
