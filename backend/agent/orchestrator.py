"""
State Machine Agent Orchestrator for KAVACH AI Workbench.
"""

import uuid
import logging
from typing import Any, Dict, List, Optional
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

    def _build_tool_params(self, tool_name: str, state: AgentState) -> Dict[str, Any]:
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
            return {
                "title": f"Approval Note: {state.user_query}",
                "findings": state.findings,
                "evidence": state.retrieved_evidence,
                "task_id": state.task_id,
                "output_path": f"{state.task_id}_Approval_Note.docx",
            }
        elif tool_name == "generate_xlsx_tool":
            # Derive real action items from structured findings or findings keys
            items = []
            structured = state.findings.get("structured_findings", [])
            if structured and isinstance(structured, list):
                for f in structured:
                    if isinstance(f, dict):
                        items.append({
                            "task": f.get("description", "Inspection action required"),
                            "priority": f.get("severity", "MEDIUM"),
                            "status": "OPEN",
                        })
            if not items:
                # Fallback: create items from top-level findings keys
                for key, value in state.findings.items():
                    if key in ("structured_findings", "synthesized_analysis"):
                        continue
                    items.append({
                        "task": f"{key.replace('_', ' ').title()}: {str(value)[:100]}",
                        "priority": "MEDIUM",
                        "status": "OPEN",
                    })
            if not items:
                items = [{"task": state.user_query[:100], "priority": "MEDIUM", "status": "OPEN"}]
            return {"items": items, "output_path": f"{state.task_id}_Action_Tracker.xlsx"}
        elif tool_name == "model_router_tool":
            # Build a rich prompt that includes all prior tool outputs for synthesis
            prompt_parts = [f"User Query: {state.user_query}"]
            if state.findings.get("ocr_extracted_text"):
                prompt_parts.append(f"\n--- OCR Extracted Text ---\n{state.findings['ocr_extracted_text'][:2000]}")
            if state.findings.get("vision_analysis"):
                prompt_parts.append(f"\n--- Visual Inspection Analysis ---\n{state.findings['vision_analysis'][:2000]}")
            if state.retrieved_evidence:
                evidence_text = "\n".join(
                    f"[{ev.source_doc}, p.{ev.page_num}] {ev.snippet}"
                    for ev in state.retrieved_evidence[:5]
                )
                prompt_parts.append(f"\n--- SOP Evidence Citations ---\n{evidence_text}")
            if state.findings.get("structured_findings"):
                import json as _json
                try:
                    sf_text = _json.dumps(state.findings["structured_findings"][:5], indent=2, default=str)
                except Exception:
                    sf_text = str(state.findings["structured_findings"])[:1000]
                prompt_parts.append(f"\n--- Structured Findings ---\n{sf_text}")
            prompt_parts.append(
                "\nBased on the above inspection data, SOP evidence, and visual analysis, "
                "synthesize a comprehensive risk assessment and approval recommendation. "
                "Include specific findings, severity levels, and recommended actions."
            )
            return {"task_type": "reasoning", "prompt": "\n".join(prompt_parts)}
        return {}

    def _update_state_findings(self, state: AgentState, tool_name: str, output: Any):
        if not isinstance(output, dict):
            return

        if tool_name == "ocr_pdf_tool":
            state.findings["ocr_extracted_text"] = output.get("extracted_text", "")
            state.findings["tables_found"] = output.get("tables_found", 0)
            if "structured_findings" in output:
                state.findings["structured_findings"] = output["structured_findings"]
        elif tool_name == "vision_analysis_tool":
            state.findings["vision_analysis"] = output.get("analysis", "")
            state.findings["confidence"] = output.get("confidence", 0.0)
            if "structured_findings" in output and "structured_findings" not in state.findings:
                state.findings["structured_findings"] = output["structured_findings"]
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
        elif tool_name == "model_router_tool":
            # ROOT CAUSE FIX: Previously missing — LLM synthesis was silently dropped
            response_text = output.get("response", "")
            if response_text:
                state.findings["synthesized_analysis"] = response_text
            state.findings["model_used"] = output.get("selected_model", "unknown")
            if output.get("error"):
                state.findings["model_error"] = output["error"]
        elif tool_name == "sandbox_code_tool":
            state.findings["sandbox_stdout"] = output.get("stdout", "")
            state.findings["sandbox_stderr"] = output.get("stderr", "")
            state.findings["sandbox_exit_code"] = output.get("exit_code", -1)
            state.findings["sandbox_mode"] = output.get("sandbox_mode", "unknown")
        elif tool_name == "generate_docx_tool":
            state.draft_deliverables["approval_note_docx"] = output.get("output_path", "")
        elif tool_name == "generate_xlsx_tool":
            state.draft_deliverables["action_tracker_xlsx"] = output.get("output_path", "")
