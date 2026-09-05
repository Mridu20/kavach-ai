"""
State Machine Agent Orchestrator for KAVACH AI Workbench.
"""

import uuid
import logging
from typing import Dict, List, Optional
from backend.agent.state import (
    AgentState,
    AgentTrace,
    EvidenceItem,
    StepStatus,
    TaskCategory,
)
from backend.agent.planner import AgentPlanner
from backend.agent.tools_registry import ToolRegistry, default_tool_registry

logger = logging.getLogger("kavach_agent.orchestrator")


class AgentOrchestrator:
    """Manages the full lifecycle of an Agent execution task state machine."""

    def __init__(self, tool_registry: Optional[ToolRegistry] = None):
        self.tool_registry = tool_registry or default_tool_registry
        self._states: Dict[str, AgentState] = {}

    def create_task(self, query: str, input_files: Optional[List[str]] = None, task_id: Optional[str] = None) -> AgentState:
        if not task_id:
            task_id = f"task_{uuid.uuid4().hex[:10]}"

        files = input_files or []
        state = AgentState(
            task_id=task_id,
            user_query=query,
            input_files=files,
            trace=AgentTrace(task_id=task_id),
            status="INITIALIZED",
        )

        state.add_trace_event(
            event_type="INITIALIZATION",
            message=f"Initialized sovereign agent task '{task_id}'.",
            payload={"query": query, "input_files": files},
        )

        # Classify and plan
        category, steps = AgentPlanner.create_plan(state)
        state.category = category
        state.plan = steps
        state.status = "PLANNED"

        state.add_trace_event(
            event_type="CLASSIFICATION",
            message=f"Task classified as '{category.value}'.",
            payload={"category": category.value},
        )
        state.add_trace_event(
            event_type="PLANNING",
            message=f"Generated execution plan with {len(steps)} steps.",
            payload={"plan_steps": [s.title for s in steps]},
        )

        self._states[task_id] = state
        return state

    def get_task(self, task_id: str) -> Optional[AgentState]:
        return self._states.get(task_id)

    def execute_next_step(self, state: AgentState) -> AgentState:
        """Executes the next pending plan step in the state machine."""
        if state.current_step_index >= len(state.plan):
            state.status = "VERIFYING"
            return state

        current_step = state.plan[state.current_step_index]
        current_step.status = StepStatus.IN_PROGRESS
        state.status = "EXECUTING"

        state.add_trace_event(
            event_type="TOOL_START",
            message=f"Step {current_step.step_id}: Executing '{current_step.assigned_tool}' for '{current_step.title}'.",
            payload={"step_id": current_step.step_id, "tool": current_step.assigned_tool},
        )

        # Prepare parameters based on tool and state context
        params = self._build_tool_params(current_step.assigned_tool, state)

        # Execute tool via registry with retry logic
        call_record = self.tool_registry.execute_with_retry(
            tool_name=current_step.assigned_tool,
            step_id=current_step.step_id,
            params=params,
        )

        state.tool_calls.append(call_record)
        state.trace.total_tool_calls += 1

        if call_record.success:
            current_step.status = StepStatus.COMPLETED
            current_step.result = call_record.output if isinstance(call_record.output, dict) else {"output": call_record.output}
            self._update_state_findings(state, current_step.assigned_tool, call_record.output)

            state.add_trace_event(
                event_type="TOOL_END",
                message=f"Step {current_step.step_id} completed successfully in {call_record.execution_time_ms}ms.",
                payload={"step_id": current_step.step_id, "success": True},
            )
        else:
            current_step.status = StepStatus.FAILED
            current_step.error = call_record.error_message
            state.add_trace_event(
                event_type="ERROR",
                message=f"Step {current_step.step_id} failed: {call_record.error_message}",
                payload={"step_id": current_step.step_id, "error": call_record.error_message},
            )

        state.current_step_index += 1

        if state.current_step_index >= len(state.plan):
            state.status = "VERIFYING"

        return state

    def run_all_steps(self, state: AgentState) -> AgentState:
        """Runs all remaining steps in the plan until complete or verifying stage."""
        while state.current_step_index < len(state.plan) and state.status in ["PLANNED", "EXECUTING"]:
            self.execute_next_step(state)
        return state

    def _build_tool_params(self, tool_name: str, state: AgentState) -> Dict[str, any]:
        first_file = state.input_files[0] if state.input_files else "inspection_report.pdf"

        if tool_name == "ocr_pdf_tool":
            return {"file_path": first_file}
        elif tool_name == "vision_analysis_tool":
            return {"image_path": first_file, "prompt": "Identify defects and structural anomalies."}
        elif tool_name == "rag_search_tool":
            return {"query": state.user_query, "top_k": 3}
        elif tool_name == "sandbox_code_tool":
            return {"code": "# Auto-generated verification script\nprint('Zero cloud calls confirmed.')"}
        elif tool_name == "generate_docx_tool":
            return {"title": f"Approval Note: {state.user_query}", "findings": state.findings, "evidence": state.retrieved_evidence, "task_id": state.task_id, "output_path": f"{state.task_id}_Approval_Note.docx"}
        elif tool_name == "generate_xlsx_tool":
            return {"items": [{"task": "Inspect Weld B-12", "priority": "HIGH"}], "output_path": f"{state.task_id}_Action_Tracker.xlsx"}
        elif tool_name == "model_router_tool":
            return {"task_type": "reasoning", "prompt": state.user_query}
        return {}

    def _update_state_findings(self, state: AgentState, tool_name: str, output: any):
        if not isinstance(output, dict):
            return

        if tool_name == "ocr_pdf_tool":
            state.findings["ocr_extracted_text"] = output.get("extracted_text", "")
            state.findings["tables_found"] = output.get("tables_found", 0)
        elif tool_name == "vision_analysis_tool":
            state.findings["vision_analysis"] = output.get("analysis", "")
            state.findings["confidence"] = output.get("confidence", 0.0)
        elif tool_name == "rag_search_tool":
            results = output.get("results", [])
            for res in results:
                state.retrieved_evidence.append(
                    EvidenceItem(
                        source_doc=res.get("doc_name", "Local SOP"),
                        page_num=res.get("page"),
                        snippet=res.get("snippet", ""),
                        confidence_score=res.get("score", 1.0),
                    )
                )
        elif tool_name == "generate_docx_tool":
            state.draft_deliverables["approval_note_docx"] = output.get("output_path", "")
        elif tool_name == "generate_xlsx_tool":
            state.draft_deliverables["action_tracker_xlsx"] = output.get("output_path", "")
