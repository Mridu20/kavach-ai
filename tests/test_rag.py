"""
Test Suite for RAG Deactivation & Isolation Verification.
Verifies that vector store auto-seeding is disabled, RAG is de-registered from the agent,
and RAG endpoints are removed from the active application.
"""

import os
import shutil
import unittest
from fastapi.testclient import TestClient

from backend.rag.store import LocalVectorStore
from backend.agent.tools_registry import default_tool_registry
from backend.main import app

TEST_DB_PATH = os.path.join("backend", "storage", "test_chroma_db")


class TestRAGDeactivationAndIsolation(unittest.TestCase):

    def setUp(self):
        if os.path.exists(TEST_DB_PATH):
            shutil.rmtree(TEST_DB_PATH, ignore_errors=True)

    def tearDown(self):
        if os.path.exists(TEST_DB_PATH):
            shutil.rmtree(TEST_DB_PATH, ignore_errors=True)

    def test_vector_store_does_not_auto_seed_sops(self):
        """Vector store default init has auto_seed=False and does not load SOPs."""
        store = LocalVectorStore(db_path=TEST_DB_PATH, collection_name="test_isolation")
        # Should start empty without seeding SOP_Industrial_Safety_v3.pdf or Maintenance_Manual_Turbine_2025.pdf
        self.assertEqual(store.count(), 0)

    def test_rag_tool_not_in_active_agent_registry(self):
        """Active agent tool registry does NOT expose rag_search_tool."""
        tools = default_tool_registry.list_tools()
        tool_names = [t["name"] for t in tools]
        self.assertNotIn("rag_search_tool", tool_names)
        self.assertIsNone(default_tool_registry.get_tool("rag_search_tool"))

    def test_rag_endpoints_detached_from_fastapi(self):
        """RAG API routes are detached from the active FastAPI server."""
        client = TestClient(app)

        res_stats = client.get("/api/rag/stats")
        self.assertEqual(res_stats.status_code, 404)

        res_query = client.post("/api/rag/query", json={"query": "safety policy"})
        self.assertEqual(res_query.status_code, 404)

        res_ingest = client.post("/api/rag/ingest/text", json={"text": "data", "doc_name": "test.txt"})
        self.assertEqual(res_ingest.status_code, 404)


if __name__ == "__main__":
    unittest.main()
