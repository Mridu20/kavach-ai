"""
Comprehensive Test Suite for General-Purpose AI Agent.
Verifies complete decoupling from RAG, ChromaDB, SOPs, hardcoded industrial rules, and fake demo data.
"""

import os
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from backend.agent.state import AgentState, HumanDecision, TaskCategory, StepStatus
from backend.agent.planner import AgentPlanner, TaskClassifier
from backend.agent.tools_registry import ToolRegistry, default_tool_registry
from backend.agent.orchestrator import AgentOrchestrator
from backend.agent.verifier import SelfVerifier
from backend.agent.human_approval import HumanApprovalManager
from backend.main import app


class TestGeneralPurposeAgent(unittest.TestCase):

    def test_general_query_creates_simple_reasoning_plan(self):
        """1. A normal general question does not call RAG or document extraction."""
        category = TaskClassifier.classify("What is the difference between a process and a thread?", [])
        self.assertEqual(category, TaskCategory.GENERAL_REASONING)

        state = AgentState(task_id="test_gen_01", user_query="What is the difference between a process and a thread?")
        cat, steps = AgentPlanner.create_plan(state)
        self.assertEqual(cat, TaskCategory.GENERAL_REASONING)
        self.assertEqual(len(steps), 1)
        self.assertEqual(steps[0].assigned_tool, "model_router_tool")
        # Ensure no RAG or SOP tool is in the plan
        assigned_tools = [s.assigned_tool for s in steps]
        self.assertNotIn("rag_search_tool", assigned_tools)

    def test_industrial_keywords_in_text_do_not_force_rag_or_inspection(self):
        """Queries mentioning inspection/weld/turbine without attached files stay GENERAL_REASONING."""
        query = "Can you explain how ultrasonic testing works for inspection of turbine welds?"
        category = TaskClassifier.classify(query, [])
        self.assertEqual(category, TaskCategory.GENERAL_REASONING)

        state = AgentState(task_id="test_kw_01", user_query=query)
        cat, steps = AgentPlanner.create_plan(state)
        self.assertEqual(cat, TaskCategory.GENERAL_REASONING)
        self.assertEqual(len(steps), 1)
        self.assertEqual(steps[0].assigned_tool, "model_router_tool")

    def test_document_analysis_only_when_files_attached(self):
        """Document extraction steps are only planned when the user actually attaches files."""
        state_no_file = AgentState(task_id="t_nofile", user_query="Please review this report", input_files=[])
        cat_no_file, steps_no_file = AgentPlanner.create_plan(state_no_file)
        self.assertEqual(cat_no_file, TaskCategory.GENERAL_REASONING)
        self.assertEqual(len(steps_no_file), 1)

        state_with_file = AgentState(task_id="t_file", user_query="Please review this", input_files=["notes.pdf"])
        cat_with_file, steps_with_file = AgentPlanner.create_plan(state_with_file)
        self.assertEqual(cat_with_file, TaskCategory.DOCUMENT_ANALYSIS)
        self.assertEqual(len(steps_with_file), 2)
        self.assertEqual(steps_with_file[0].assigned_tool, "ocr_pdf_tool")
        self.assertEqual(steps_with_file[1].assigned_tool, "model_router_tool")
        # Ensure RAG search is NOT in the plan
        assigned_tools = [s.assigned_tool for s in steps_with_file]
        self.assertNotIn("rag_search_tool", assigned_tools)

    def test_rag_tool_is_available_but_never_auto_planned(self):
        """
        The knowledge base tool is registered and usable, but must not appear in
        a plan unless the retrieval gate opens.

        This replaces an earlier test that asserted the tool was absent entirely.
        RAG was removed because forced retrieval turned every answer into an
        SOP-flavoured report; the fix is gating it (see needs_knowledge_base),
        not deleting a capability the problem statement requires.
        """
        registry = default_tool_registry
        tool_names = [t["name"] for t in registry.list_tools()]
        self.assertIn("rag_search_tool", tool_names)

        # Available, yet absent from a general plan.
        state = AgentState(task_id="t_gate", user_query="What is the capital of France?")
        _, steps = AgentPlanner.create_plan(state)
        self.assertNotIn("rag_search_tool", [s.assigned_tool for s in steps])

    def test_orchestrator_execution_produces_no_fake_evidence(self):
        """No fake SOP citations or fake ASME findings are added to state."""
        orchestrator = AgentOrchestrator()
        state = orchestrator.create_task(query="Hi, how are you?")
        orchestrator.run_all_steps(state)

        # Verified: zero retrieved evidence items
        self.assertEqual(len(state.retrieved_evidence), 0)
        # Verified: calculation_details not artificially populated with ASME / OISD derating
        self.assertIsNone(state.calculation_details)
        # Verified: multi_doc_comparison not artificially populated
        self.assertIsNone(state.multi_doc_comparison)

    def test_model_router_never_fabricates_engineering_values(self):
        """
        The router must never emit the hardcoded ASME derating figures that an
        earlier revision returned as a canned "calculation", and must be honest
        when the local model is unavailable.

        Valid in both states: previously this asserted the response always
        mentions Ollama, which only held while no model was installed and began
        failing the moment one was pulled.
        """
        registry = ToolRegistry()
        tool = registry.get_tool("model_router_tool")
        self.assertIsNotNone(tool)

        result = tool.run(task_type="general", prompt="Calculate derated MAWP for pressure vessel")
        self.assertIn("response", result)
        response = result["response"]

        # The core guarantee, regardless of whether a model is loaded.
        self.assertNotIn("SA-516", response)
        self.assertNotIn("88.54 PSI", response)
        self.assertNotIn("OISD-118 Section 4.2.1", response)

        if result.get("error"):
            # Offline: must say so plainly rather than inventing an answer.
            self.assertIn("Ollama", response)
        else:
            # Online: a real generated answer.
            self.assertTrue(response.strip(), "model returned an empty response")

    def test_verifier_passes_general_query_without_sop_evidence(self):
        """SelfVerifier does not fail general questions for lacking SOP evidence."""
        orchestrator = AgentOrchestrator()
        state = orchestrator.create_task(query="Tell me a fun fact about space.")
        orchestrator.run_all_steps(state)

        result = SelfVerifier.verify(state)
        self.assertTrue(result.verified)
        self.assertEqual(state.status, "COMPLETED")
        # Check names verified
        check_names = [c.check_name for c in result.checks]
        self.assertNotIn("EVIDENCE_BACKING", check_names)
        self.assertNotIn("REQUIRED_DELIVERABLES", check_names)

    def test_streaming_endpoint_requires_authentication(self):
        """Agent runs are recorded against an account, so a session is required."""
        client = TestClient(app)
        response = client.post(
            "/api/agent/run-stream",
            json={"user_query": "Hello AI assistant", "input_files": []},
        )
        self.assertEqual(response.status_code, 401)

    def test_streaming_endpoint(self):
        """FastAPI SSE streaming route works for general questions."""
        from tests.test_conversations import auth_headers

        client = TestClient(app)
        response = client.post(
            "/api/agent/run-stream",
            json={"user_query": "Hello AI assistant", "input_files": []},
            headers=auth_headers(client),
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/event-stream", response.headers.get("content-type", ""))
        self.assertIn('"type": "INIT"', response.text)
        self.assertIn('"type": "COMPLETE"', response.text)

    def test_cancellation(self):
        """Cancellation properly updates task state."""
        orchestrator = AgentOrchestrator()
        state = orchestrator.create_task(query="Test cancellation")
        state.request_cancel()
        self.assertTrue(state.cancellation_requested)
        self.assertEqual(state.status, "CANCELLED")

    def test_rag_endpoints_are_mounted(self):
        """
        The knowledge base API is reachable. A 404 here means rag_router was
        unmounted and the assistant has silently lost document grounding — the
        exact regression that made answers ungrounded before.

        503 is an acceptable response: it means the endpoint exists and is
        honestly reporting that the local embedding service is down.
        """
        client = TestClient(app)
        res = client.post("/api/rag/query", json={"query": "test"})
        self.assertNotEqual(res.status_code, 404, "rag_router is not mounted")
        self.assertIn(res.status_code, (200, 503))

    def test_missing_file_extraction_returns_honest_error(self):
        """Missing file returns clean error without generating fake inspection findings."""
        from ingestion.extractor import extract_content
        result = extract_content("completely_nonexistent_weld_report.pdf")
        self.assertFalse(result.success)
        self.assertIn("File not found", result.error)
        self.assertEqual(len(result.structured.findings), 0)


if __name__ == "__main__":
    unittest.main()
