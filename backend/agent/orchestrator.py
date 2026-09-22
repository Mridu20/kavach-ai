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
    EvidenceItem,
    StepStatus,
    TaskCategory,
)
from backend.agent.planner import AgentPlanner, detect_deliverable
from backend.agent.tools_registry import ToolRegistry, default_tool_registry

logger = logging.getLogger("kavach_agent.orchestrator")


class AgentOrchestrator:
    """Manages the lifecycle of an Agent execution state machine."""

    def __init__(self, tool_registry: Optional[ToolRegistry] = None):
        self.tool_registry = tool_registry or default_tool_registry
        self._states: Dict[str, AgentState] = {}

    def create_task(
        self,
        query: str,
        input_files: Optional[List[str]] = None,
        task_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> AgentState:
        if not task_id:
            task_id = f"task_{uuid.uuid4().hex[:10]}"

        files = input_files or []
        state = AgentState(
            task_id=task_id,
            user_query=query,
            input_files=files,
            conversation_id=conversation_id,
            conversation_history=conversation_history or [],
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

    # Natural-language lead-ins users type before the code itself. Without
    # stripping these, "Run python: print(1)" is executed verbatim and dies with
    # a SyntaxError on the word "Run" — the code never gets a chance to run.
    _CODE_PREAMBLE = re.compile(
        r"^\s*(?:please\s+)?"
        r"(?:can\s+you\s+)?"
        r"(?:run|execute|eval(?:uate)?)\s*"
        r"(?:this\s+|the\s+following\s+|my\s+)?"
        r"(?:python\s*)?"
        r"(?:code|script|snippet)?\s*"
        r"(?:in\s+(?:the\s+)?sandbox\s*)?"
        r"[:\-—]?\s*",
        re.IGNORECASE,
    )

    @staticmethod
    def _rows_from_answer(answer: str) -> List[Dict[str, Any]]:
        """
        Turns a model answer into spreadsheet rows.

        Prefers a markdown table, which is what the model is asked to produce
        for spreadsheet requests. Falls back to bullet points so a list still
        exports as one column rather than a single unusable cell.
        """
        lines = [ln.strip() for ln in answer.splitlines() if ln.strip()]

        # Markdown table: a header row, a |---|---| separator, then data.
        for idx, line in enumerate(lines[:-2]):
            if not line.startswith("|"):
                continue
            separator = lines[idx + 1]
            if not re.match(r"^\|[\s:|-]+\|$", separator):
                continue

            def cells(row: str) -> List[str]:
                return [c.strip() for c in row.strip().strip("|").split("|")]

            headers = cells(line)
            rows: List[Dict[str, Any]] = []
            for data_line in lines[idx + 2:]:
                if not data_line.startswith("|"):
                    break
                values = cells(data_line)
                if len(values) != len(headers):
                    continue
                rows.append(dict(zip(headers, values)))
            if rows:
                return rows

        # Bullet or numbered list.
        bullets = [
            re.sub(r"^[-*•]\s+|^\d+[.)]\s+", "", ln)
            for ln in lines
            if re.match(r"^[-*•]\s+|^\d+[.)]\s+", ln)
        ]
        if bullets:
            return [{"item": b} for b in bullets]

        return []

    @classmethod
    def _extract_code(cls, query: str) -> str:
        """
        Pulls executable Python out of a user message.

        Prefers a fenced block, since that is unambiguous. Otherwise strips a
        conversational preamble and runs the remainder.
        """
        fenced = re.search(r"```(?:python|py)?\s*(.*?)\s*```", query, re.DOTALL)
        if fenced:
            return fenced.group(1)

        stripped = cls._CODE_PREAMBLE.sub("", query, count=1).strip()
        return stripped or query.strip()

    def _build_tool_params(self, tool_name: str, state: AgentState) -> Dict[str, Any]:
        first_file = state.input_files[0] if state.input_files else ""
        query = state.user_query

        if tool_name == "ocr_pdf_tool":
            return {"file_path": first_file}

        elif tool_name == "rag_search_tool":
            return {"query": query, "top_k": 4}

        elif tool_name == "vision_analysis_tool":
            return {"image_path": first_file, "prompt": query}

        elif tool_name == "sandbox_code_tool":
            return {"code": self._extract_code(query)}

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
            items: List[Dict[str, Any]] = []

            answer = state.findings.get("synthesized_analysis") or state.text_response or ""
            if answer:
                items = self._rows_from_answer(answer)

            if not items:
                structured = state.findings.get("structured_findings", [])
                if isinstance(structured, list):
                    items = [f for f in structured if isinstance(f, dict)]

            if not items:
                # Last resort: keep the answer readable in the sheet rather
                # than writing the user's own question back at them.
                items = [{"content": line} for line in (answer or query).splitlines() if line.strip()]

            return {"items": items, "output_path": f"{state.task_id}_Spreadsheet.xlsx"}

        elif tool_name == "model_router_tool":
            system_prompt = (
                "You are a helpful, direct, and knowledgeable general-purpose AI assistant. "
                "Answer the user's questions clearly, accurately, and thoughtfully. "
                "If the user has provided document context, analyze that context faithfully without inventing missing facts. "
                "If you lack sufficient information, acknowledge your uncertainty honestly."
            )

            prompt_parts = [f"System: {system_prompt}"]

            # Grounding block. Only present when the retrieval gate fired.
            kb_status = state.findings.get("kb_status")
            if kb_status == "OK" and state.retrieved_evidence:
                context_lines = [
                    f"[{ev.source_doc}, p.{ev.page_num}] {ev.snippet}"
                    for ev in state.retrieved_evidence
                ]
                prompt_parts.append(
                    "The following passages were retrieved from the organisation's "
                    "internal knowledge base and are authoritative for this question.\n\n"
                    "Rules for using them:\n"
                    "1. Answer using these passages as the source of truth.\n"
                    "2. Cite every fact you take from them as [document name, p.N], "
                    "copying the name exactly as shown.\n"
                    "3. Never invent a document name, section number or page. If a "
                    "detail is not in the passages below, say so plainly.\n"
                    "4. If the passages do not answer the question, say "
                    "\"I could not find this in the knowledge base\" and then, only if "
                    "useful, offer general knowledge clearly labelled as such.\n\n"
                    "--- KNOWLEDGE BASE CONTEXT ---\n"
                    + "\n\n".join(context_lines)
                    + "\n--- END CONTEXT ---"
                )
            elif kb_status == "NO_MATCH":
                prompt_parts.append(
                    "A search of the organisation's knowledge base returned no "
                    "relevant passages for this question. Tell the user plainly that "
                    "this is not covered in the knowledge base. You may then answer "
                    "from general knowledge, but label it clearly as general knowledge "
                    "and do not cite any internal document."
                )
            elif kb_status == "UNAVAILABLE":
                prompt_parts.append(
                    "The knowledge base could not be searched because the local "
                    "embedding service is unavailable. State this limitation before "
                    "answering, and do not cite any internal document."
                )

            # Shape the answer for the file the user asked for. Without this a
            # spreadsheet request yields prose, which exports as one long cell.
            deliverable = detect_deliverable(state.user_query)
            if deliverable == "xlsx":
                prompt_parts.append(
                    "The user has asked for a spreadsheet. Present the substantive "
                    "content as a markdown table with a clear header row and one row "
                    "per record. Keep any commentary brief and outside the table."
                )
            elif deliverable == "docx":
                prompt_parts.append(
                    "The user has asked for a Word document. Write the full prose "
                    "content they asked for, organised under clear headings. Do not "
                    "describe the document or say you cannot create files — the text "
                    "you produce is written into the document automatically."
                )

            # Prior turns, so references to earlier answers resolve.
            if state.conversation_history:
                transcript = "\n".join(
                    f"{'User' if m.get('role') == 'user' else 'Assistant'}: {m.get('content', '')}"
                    for m in state.conversation_history
                )
                prompt_parts.append(
                    "Earlier turns in this conversation, for context. Use them to "
                    "resolve references such as \"that\" or \"it\", but answer only "
                    "the final question below.\n\n"
                    "--- CONVERSATION SO FAR ---\n"
                    f"{transcript}\n"
                    "--- END CONVERSATION ---"
                )

            prompt_parts.append(f"User Query: {state.user_query}")

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

        elif tool_name == "rag_search_tool":
            status = output.get("status", "NO_MATCH")
            state.findings["kb_status"] = status
            if output.get("error"):
                state.findings["kb_error"] = output["error"]
            for res in output.get("results", []):
                state.retrieved_evidence.append(
                    EvidenceItem(
                        source_doc=res.get("doc_name", "Unknown document"),
                        page_num=res.get("page"),
                        snippet=res.get("snippet", ""),
                        confidence_score=res.get("score", 0.0),
                    )
                )
            state.findings["sandbox_mode"] = output.get("sandbox_mode", "unknown")

        elif tool_name == "generate_docx_tool":
            state.draft_deliverables["document_docx"] = output.get("output_path", "")
            # Legacy key alias for frontend backward-compatibility
            state.draft_deliverables["approval_note_docx"] = output.get("output_path", "")

        elif tool_name == "generate_xlsx_tool":
            state.draft_deliverables["spreadsheet_xlsx"] = output.get("output_path", "")
            # Legacy key alias for frontend backward-compatibility
            state.draft_deliverables["action_tracker_xlsx"] = output.get("output_path", "")
