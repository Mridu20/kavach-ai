"""
Comprehensive Unit & Integration Test Suite for Person 1 (Lead Agentic AI).
"""

import pytest
from backend.agent.state import AgentState, HumanDecision, TaskCategory
from backend.agent.planner import AgentPlanner, TaskClassifier
from backend.agent.tools_registry import ToolRegistry, default_tool_registry
from backend.agent.orchestrator import AgentOrchestrator
from backend.agent.verifier import SelfVerifier
from backend.agent.human_approval import HumanApprovalManager


def test_agent_state_creation():
    state = AgentState(task_id="test_001", user_query="Inspect turbine report")
    assert state.task_id == "test_001"
    assert state.status == "INITIALIZED"
    assert len(state.trace.events) == 0

    state.add_trace_event("TEST_EVENT", "State initialized cleanly")
    assert len(state.trace.events) == 1
    assert state.trace.events[0].event_type == "TEST_EVENT"


def test_task_classification_and_planning():
    # 1. Inspection Report
    category = TaskClassifier.classify("Inspect scanned inspection report", ["report.pdf"])
    assert category == TaskCategory.DOCUMENT_INSPECTION

    state = AgentState(task_id="test_002", user_query="Inspect scanned report", input_files=["report.pdf"])
    cat, steps = AgentPlanner.create_plan(state)
    assert cat == TaskCategory.DOCUMENT_INSPECTION
    assert len(steps) == 6
    assert steps[0].assigned_tool == "ocr_pdf_tool"

    # 2. SOP Query
    cat_sop, steps_sop = AgentPlanner.create_plan(AgentState(task_id="t2", user_query="What is the SOP policy?"))
    assert cat_sop == TaskCategory.SOP_RAG_QUERY
    assert len(steps_sop) == 2


def test_tool_registry_and_retry():
    registry = ToolRegistry()
    tools = registry.list_tools()
    assert len(tools) >= 7

    # Execute valid tool
    rec = registry.execute_with_retry(tool_name="ocr_pdf_tool", step_id=1, params={"file_path": "sample.pdf"})
    assert rec.success is True
    assert "extracted_text" in rec.output

    # Execute invalid tool
    rec_invalid = registry.execute_with_retry(tool_name="non_existent_tool", step_id=1, params={})
    assert rec_invalid.success is False
    assert "not registered" in rec_invalid.error_message


def test_orchestrator_execution():
    orchestrator = AgentOrchestrator()
    state = orchestrator.create_task(query="Inspect turbine report", input_files=["turbine.pdf"])
    assert state.status == "PLANNED"
    assert len(state.plan) == 6

    orchestrator.run_all_steps(state)
    assert state.status == "VERIFYING"
    assert len(state.tool_calls) == 6
    assert len(state.retrieved_evidence) >= 1
    assert "approval_note_docx" in state.draft_deliverables
    assert "action_tracker_xlsx" in state.draft_deliverables


def test_self_verification():
    orchestrator = AgentOrchestrator()
    state = orchestrator.create_task(query="Inspect turbine report", input_files=["turbine.pdf"])
    orchestrator.run_all_steps(state)

    result = SelfVerifier.verify(state)
    assert result.verified is True
    assert result.zero_external_calls is True
    assert state.status == "AWAITING_APPROVAL"


def test_human_approval_gate():
    orchestrator = AgentOrchestrator()
    state = orchestrator.create_task(query="Inspect turbine report", input_files=["turbine.pdf"])
    orchestrator.run_all_steps(state)
    SelfVerifier.verify(state)

    # Approve
    updated_state = HumanApprovalManager.submit_decision(
        state=state,
        decision=HumanDecision.APPROVED,
        reviewer="Lead Inspector",
        comments="All verified.",
    )
    assert updated_state.status == "COMPLETED"
    assert updated_state.approval.reviewer == "Lead Inspector"
    assert updated_state.approval.status == HumanDecision.APPROVED
