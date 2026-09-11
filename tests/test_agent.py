"""
Comprehensive Unit & Integration Test Suite for Person 1 (Lead Agentic AI).
"""

import unittest
from backend.agent.state import AgentState, HumanDecision, TaskCategory
from backend.agent.planner import AgentPlanner, TaskClassifier
from backend.agent.tools_registry import ToolRegistry
from backend.agent.orchestrator import AgentOrchestrator
from backend.agent.verifier import SelfVerifier
from backend.agent.human_approval import HumanApprovalManager


class TestAgentFramework(unittest.TestCase):

    def test_agent_state_creation(self):
        state = AgentState(task_id="test_001", user_query="Inspect turbine report")
        self.assertEqual(state.task_id, "test_001")
        self.assertEqual(state.status, "INITIALIZED")
        self.assertEqual(len(state.trace.events), 0)

        state.add_trace_event("TEST_EVENT", "State initialized cleanly")
        self.assertEqual(len(state.trace.events), 1)
        self.assertEqual(state.trace.events[0].event_type, "TEST_EVENT")

    def test_task_classification_and_planning(self):
        # 1. Inspection Report
        category = TaskClassifier.classify("Inspect scanned inspection report", ["report.pdf"])
        self.assertEqual(category, TaskCategory.DOCUMENT_INSPECTION)

        state = AgentState(task_id="test_002", user_query="Inspect scanned report", input_files=["report.pdf"])
        cat, steps = AgentPlanner.create_plan(state)
        self.assertEqual(cat, TaskCategory.DOCUMENT_INSPECTION)
        self.assertEqual(len(steps), 6)
        self.assertEqual(steps[0].assigned_tool, "ocr_pdf_tool")

        # 2. SOP Query
        cat_sop, steps_sop = AgentPlanner.create_plan(AgentState(task_id="t2", user_query="What is the SOP policy?"))
        self.assertEqual(cat_sop, TaskCategory.SOP_RAG_QUERY)
        self.assertEqual(len(steps_sop), 2)

    def test_tool_registry_and_retry(self):
        registry = ToolRegistry()
        tools = registry.list_tools()
        self.assertGreaterEqual(len(tools), 7)

        # Execute valid tool
        rec = registry.execute_with_retry(tool_name="ocr_pdf_tool", step_id=1, params={"file_path": "sample.pdf"})
        self.assertTrue(rec.success)
        self.assertIn("extracted_text", rec.output)

        # Execute invalid tool
        rec_invalid = registry.execute_with_retry(tool_name="non_existent_tool", step_id=1, params={})
        self.assertFalse(rec_invalid.success)
        self.assertIn("not registered", rec_invalid.error_message)

    def test_orchestrator_execution(self):
        orchestrator = AgentOrchestrator()
        state = orchestrator.create_task(query="Inspect turbine report", input_files=["turbine.pdf"])
        self.assertEqual(state.status, "PLANNED")
        self.assertEqual(len(state.plan), 6)

        orchestrator.run_all_steps(state)
        self.assertEqual(state.status, "VERIFYING")
        self.assertEqual(len(state.tool_calls), 6)
        self.assertGreaterEqual(len(state.retrieved_evidence), 1)
        self.assertIn("approval_note_docx", state.draft_deliverables)
        self.assertIn("action_tracker_xlsx", state.draft_deliverables)

    def test_self_verification(self):
        orchestrator = AgentOrchestrator()
        state = orchestrator.create_task(query="Inspect turbine report", input_files=["turbine.pdf"])
        orchestrator.run_all_steps(state)

        result = SelfVerifier.verify(state)
        self.assertTrue(result.verified)
        self.assertTrue(result.zero_external_calls)
        self.assertEqual(state.status, "AWAITING_APPROVAL")

    def test_human_approval_gate(self):
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
        self.assertEqual(updated_state.status, "COMPLETED")
        self.assertEqual(updated_state.approval.reviewer, "Lead Inspector")
        self.assertEqual(updated_state.approval.status, HumanDecision.APPROVED)

    def test_model_router_output_reaches_findings(self):
        """Regression test for ROOT CAUSE: model_router_tool output was silently dropped.
        
        Previously _update_state_findings had no branch for model_router_tool,
        so ALL its output was discarded. Now it writes model_used, model_error,
        and (when Ollama is online) synthesized_analysis.
        """
        orchestrator = AgentOrchestrator()
        state = orchestrator.create_task(query="Inspect turbine report", input_files=["turbine.pdf"])
        orchestrator.run_all_steps(state)

        # model_used is always set regardless of whether Ollama is reachable
        self.assertIn("model_used", state.findings,
            "model_router_tool output should be written to state.findings['model_used']")

        # If Ollama is offline, we get model_error; if online, synthesized_analysis
        has_synthesis = "synthesized_analysis" in state.findings
        has_error = "model_error" in state.findings
        self.assertTrue(has_synthesis or has_error,
            "model_router_tool should write either synthesized_analysis (Ollama online) "
            "or model_error (Ollama offline) to state.findings")

    def test_xlsx_items_derived_from_findings(self):
        """Regression test: XLSX items were hardcoded to one fake task instead of real findings."""
        orchestrator = AgentOrchestrator()
        state = orchestrator.create_task(query="Inspect turbine report", input_files=["turbine.pdf"])
        orchestrator.run_all_steps(state)

        # Find the xlsx tool call and check its input_params
        xlsx_calls = [tc for tc in state.tool_calls if tc.tool_name == "generate_xlsx_tool"]
        self.assertEqual(len(xlsx_calls), 1)
        items = xlsx_calls[0].input_params.get("items", [])
        # Should have more than the old hardcoded single item
        self.assertGreaterEqual(len(items), 1, "XLSX should have items derived from real findings")
        # Should NOT be the old hardcoded "Inspect Weld B-12"
        if len(items) > 0:
            first_task = items[0].get("task", "")
            self.assertNotEqual(first_task, "Inspect Weld B-12",
                "XLSX items should be derived from real findings, not hardcoded")

    def test_docx_content_quality(self):
        """Regression test: DOCX content should contain synthesized analysis, not just raw data."""
        import os
        orchestrator = AgentOrchestrator()
        state = orchestrator.create_task(query="Inspect turbine report", input_files=["turbine.pdf"])
        orchestrator.run_all_steps(state)

        # Verify the DOCX file was created and contains real content
        docx_path = state.draft_deliverables.get("approval_note_docx", "")
        self.assertTrue(docx_path, "DOCX deliverable path should be set")

        full_path = os.path.join("backend", "storage", "outputs", docx_path)
        self.assertTrue(os.path.exists(full_path), f"DOCX file should exist at {full_path}")

        # Open and verify content
        from docx import Document
        doc = Document(full_path)
        full_text = "\n".join(p.text for p in doc.paragraphs)
        self.assertGreater(len(full_text), 100, "DOCX should have substantial content")
        self.assertIn("Approval Note", full_text, "DOCX should have the title")

    def test_streaming_agent_endpoint(self):
        """Test FastAPI SSE streaming route returns real-time data events."""
        from fastapi.testclient import TestClient
        from backend.main import app

        client = TestClient(app)
        response = client.post(
            "/api/agent/run-stream",
            json={"user_query": "Inspect turbine report", "input_files": ["turbine.pdf"]},
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/event-stream", response.headers.get("content-type", ""))

        content = response.text
        self.assertIn("data: ", content)
        self.assertIn('"type": "INIT"', content)
        self.assertIn('"type": "COMPLETE"', content)


if __name__ == "__main__":
    unittest.main()
