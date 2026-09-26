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

    def test_rag_tool_is_registered_and_honest(self):
        """
        The knowledge base tool is available, and returns nothing rather than
        placeholder evidence when it has no genuine match.

        Replaces a test asserting the tool was unregistered. Deletion was the
        wrong remedy: the failure was fabricated fallback snippets and random
        hash embeddings, both of which are now removed at the source.
        """
        tool = default_tool_registry.get_tool("rag_search_tool")
        self.assertIsNotNone(tool, "rag_search_tool is not registered")

        out = tool.run(query="zzzz nonexistent topic qqqq", top_k=3)
        self.assertEqual(out["results"], [], "fabricated evidence for an unmatched query")
        self.assertIn(out["status"], {"NO_MATCH", "UNAVAILABLE", "ERROR"})

    def test_rag_endpoints_are_mounted(self):
        """RAG API routes are reachable; 404 would mean grounding was lost."""
        client = TestClient(app)

        self.assertNotEqual(client.get("/api/rag/stats").status_code, 404)
        self.assertNotEqual(client.get("/api/rag/health").status_code, 404)
        self.assertNotEqual(
            client.post("/api/rag/query", json={"query": "safety policy"}).status_code, 404
        )


if __name__ == "__main__":
    unittest.main()
