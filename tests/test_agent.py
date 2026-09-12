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

    def test_active_tool_registry_does_not_contain_rag(self):
        """RAG tool is not in active default tool registry."""
        registry = default_tool_registry
        tools = registry.list_tools()
        tool_names = [t["name"] for t in tools]
        self.assertNotIn("rag_search_tool", tool_names)

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

    def test_model_router_offline_honest_response(self):
        """When local Ollama model is offline, returns an honest message without fake ASME derating."""
        registry = ToolRegistry()
        tool = registry.get_tool("model_router_tool")
        self.assertIsNotNone(tool)

        result = tool.run(task_type="general", prompt="Calculate derated MAWP for pressure vessel")
        self.assertIn("response", result)
        response = result["response"]
        # Must not contain hardcoded ASME UG-27 SA-516 88.54 PSI or OISD-118 fake calculation
        self.assertNotIn("SA-516", response)
        self.assertNotIn("88.54 PSI", response)
        self.assertNotIn("OISD-118 Section 4.2.1", response)
        self.assertIn("Ollama", response)

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

    def test_streaming_endpoint(self):
        """FastAPI SSE streaming route works for general questions."""
        client = TestClient(app)
        response = client.post(
            "/api/agent/run-stream",
            json={"user_query": "Hello AI assistant", "input_files": []},
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

    def test_rag_endpoints_not_in_active_app(self):
        """RAG router is removed from active FastAPI application."""
        client = TestClient(app)
        res = client.post("/api/rag/query", json={"query": "test"})
        # 404 Not Found confirms rag_router is bypassed / not registered
        self.assertEqual(res.status_code, 404)

    def test_missing_file_extraction_returns_honest_error(self):
        """Missing file returns clean error without generating fake inspection findings."""
        from ingestion.extractor import extract_content
        result = extract_content("completely_nonexistent_weld_report.pdf")
        self.assertFalse(result.success)
        self.assertIn("File not found", result.error)
        self.assertEqual(len(result.structured.findings), 0)


if __name__ == "__main__":
    unittest.main()
