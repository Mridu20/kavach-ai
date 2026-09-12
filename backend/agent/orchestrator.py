"""
State Machine Agent Orchestrator for General-Purpose AI Agent.
Coordinates execution steps, manages task state, and interfaces with language models and tools.
"""

import uuid
import re
import logging
from typing import Any, Dict, List, Optional
from backend.agent.state import (
    AgentState,
    AgentTrace,
    StepStatus,
    TaskCategory,
)
from backend.agent.planner import AgentPlanner
from backend.agent.tools_registry import ToolRegistry, default_tool_registry

logger = logging.getLogger("kavach_agent.orchestrator")


class AgentOrchestrator:
    """Manages the lifecycle of an Agent execution state machine."""

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
            message=f"Initialized agent task '{task_id}'.",
            payload={"query": query, "input_files": files},
        )

        # Classify and plan dynamically
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
        if state.cancellation_requested:
            state.status = "CANCELLED"
            return state

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
            if state.cancellation_requested:
                state.status = "CANCELLED"
                break
            self.execute_next_step(state)

        # Ensure a coherent text response is set
        if not state.text_response:
            if state.findings.get("synthesized_analysis"):
                state.text_response = state.findings["synthesized_analysis"]
            else:
                state.text_response = (
                    "I was unable to generate a response. Please ensure that the language model server is accessible."
                )
        return state

    def _build_tool_params(self, tool_name: str, state: AgentState) -> Dict[str, Any]:
        first_file = state.input_files[0] if state.input_files else ""
        query = state.user_query

        if tool_name == "ocr_pdf_tool":
            return {"file_path": first_file}

        elif tool_name == "vision_analysis_tool":
            return {"image_path": first_file, "prompt": query}

        elif tool_name == "sandbox_code_tool":
            # Extract python code block from query if present, otherwise use provided query directly
            code_match = re.search(r"```(?:python)?\s*(.*?)\s*```", query, re.DOTALL)
            code = code_match.group(1) if code_match else query
            return {"code": code}

        elif tool_name == "generate_docx_tool":
            content = state.findings.get("synthesized_analysis") or state.text_response or query
            return {
                "title": f"Document: {query[:50]}",
                "content": content,
                "findings": state.findings,
                "task_id": state.task_id,
                "output_path": f"{state.task_id}_Document.docx",
            }

        elif tool_name == "generate_xlsx_tool":
            items = []
            structured = state.findings.get("structured_findings", [])
            if structured and isinstance(structured, list):
                for f in structured:
                    if isinstance(f, dict):
                        items.append(f)
            if not items:
                items = [{"task": query[:100], "status": "COMPLETED"}]
            return {"items": items, "output_path": f"{state.task_id}_Spreadsheet.xlsx"}

        elif tool_name == "model_router_tool":
            system_prompt = (
                "You are a helpful, direct, and knowledgeable general-purpose AI assistant. "
                "Answer the user's questions clearly, accurately, and thoughtfully. "
                "If the user has provided document context, analyze that context faithfully without inventing missing facts. "
                "If you lack sufficient information, acknowledge your uncertainty honestly."
            )

            prompt_parts = [f"System: {system_prompt}", f"User Query: {state.user_query}"]

            if state.findings.get("ocr_extracted_text"):
                prompt_parts.append(
                    f"\n--- Uploaded Document Content ---\n{state.findings['ocr_extracted_text'][:4000]}"
                )
            if state.findings.get("vision_analysis"):
                prompt_parts.append(
                    f"\n--- Uploaded Image Analysis ---\n{state.findings['vision_analysis'][:2000]}"
                )
            if state.findings.get("sandbox_stdout"):
                prompt_parts.append(
                    f"\n--- Code Execution Output ---\n{state.findings['sandbox_stdout'][:2000]}"
                )
            if state.findings.get("sandbox_stderr"):
                prompt_parts.append(
                    f"\n--- Code Execution Error ---\n{state.findings['sandbox_stderr'][:1000]}"
                )

            # Route model by category
            task_type = "general"
            if state.category == TaskCategory.SANDBOX_CODE_EXECUTION:
                task_type = "coding"
            elif any(state.input_files) and any(ext in str(state.input_files).lower() for ext in [".png", ".jpg", ".jpeg"]):
                task_type = "vision"

            return {"task_type": task_type, "prompt": "\n\n".join(prompt_parts)}

        return {}

    def _update_state_findings(self, state: AgentState, tool_name: str, output: Any):
        if not isinstance(output, dict):
            return

        if tool_name == "ocr_pdf_tool":
            state.findings["ocr_extracted_text"] = output.get("extracted_text", "")
            state.findings["pages_processed"] = output.get("pages_processed", 0)
            if "structured_findings" in output:
                state.findings["structured_findings"] = output["structured_findings"]

        elif tool_name == "vision_analysis_tool":
            state.findings["vision_analysis"] = output.get("analysis", "")
            if "structured_findings" in output:
                state.findings["structured_findings"] = output["structured_findings"]

        elif tool_name == "model_router_tool":
            response_text = output.get("response", "")
            if response_text:
                state.findings["synthesized_analysis"] = response_text
                state.text_response = response_text
            state.findings["model_used"] = output.get("selected_model", "unknown")
            if output.get("error"):
                state.findings["model_error"] = output["error"]

        elif tool_name == "sandbox_code_tool":
            state.findings["sandbox_stdout"] = output.get("stdout", "")
            state.findings["sandbox_stderr"] = output.get("stderr", "")
            state.findings["sandbox_exit_code"] = output.get("exit_code", -1)
            state.findings["sandbox_mode"] = output.get("sandbox_mode", "unknown")

        elif tool_name == "generate_docx_tool":
            state.draft_deliverables["document_docx"] = output.get("output_path", "")
            # Legacy key alias for frontend backward-compatibility
            state.draft_deliverables["approval_note_docx"] = output.get("output_path", "")

        elif tool_name == "generate_xlsx_tool":
            state.draft_deliverables["spreadsheet_xlsx"] = output.get("output_path", "")
            # Legacy key alias for frontend backward-compatibility
            state.draft_deliverables["action_tracker_xlsx"] = output.get("output_path", "")
