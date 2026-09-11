"""
Unit and Integration Test Suite for Phase 3 Local Vector RAG.
"""

import os
import shutil
import unittest
from fastapi.testclient import TestClient

from backend.rag.store import LocalVectorStore, get_vector_store
from backend.agent.tools_registry import default_tool_registry
from backend.main import app

TEST_DB_PATH = os.path.join("backend", "storage", "test_chroma_db")


class TestRAGModule(unittest.TestCase):

    def setUp(self):
        if os.path.exists(TEST_DB_PATH):
            shutil.rmtree(TEST_DB_PATH, ignore_errors=True)

    def tearDown(self):
        if os.path.exists(TEST_DB_PATH):
            shutil.rmtree(TEST_DB_PATH, ignore_errors=True)

    def test_local_vector_store_initialization(self):
        store = LocalVectorStore(db_path=TEST_DB_PATH, collection_name="test_sops", auto_seed=False)
        self.assertEqual(store.count(), 0)
        self.assertEqual(store.collection_name, "test_sops")

    def test_text_chunking_and_ingestion(self):
        store = LocalVectorStore(db_path=TEST_DB_PATH, collection_name="test_chunking", auto_seed=False)
        sample_text = (
            "SECTION 1: EMERGENCY PROCEDURES\n"
            "1.1 In the event of a pressure spike exceeding 10 bar, actuate emergency shutoff valve V-12 immediately.\n"
            "1.2 Verify primary coolant loop flow rate is above 400 liters per minute.\n\n"
            "SECTION 2: TURBINE MAINTENANCE\n"
            "2.1 Secondary containment seal must be replaced every 12 months.\n"
            "2.2 Check bearing oil pressure every 500 operating hours."
        )

        chunk_ids = store.ingest_text(text=sample_text, doc_name="Emergency_Manual.pdf", page_num=2)
        self.assertGreater(len(chunk_ids), 0)
        self.assertEqual(store.count(), len(chunk_ids))

    def test_semantic_vector_search(self):
        store = LocalVectorStore(db_path=TEST_DB_PATH, collection_name="test_search", auto_seed=False)
        store.ingest_text(
            text="Corrosion limit is 0.5 mm. Exceeding 0.5 mm requires immediate 15 minute emergency plant shutdown.",
            doc_name="SOP_Safety.pdf",
            page_num=14,
        )
        store.ingest_text(
            text="Synthetic lubricant oil VG 46 filter replacement required every 2000 hours.",
            doc_name="Turbine_Manual.pdf",
            page_num=8,
        )

        results = store.query(query_text="What is the corrosion shutdown limit?", top_k=2)
        self.assertGreaterEqual(len(results), 1)
        top_match = results[0]
        self.assertIn("doc_name", top_match)
        self.assertIn("snippet", top_match)
        self.assertGreaterEqual(top_match["score"], 0.0)

    def test_rag_agent_tool_integration(self):
        registry = default_tool_registry
        rec = registry.execute_with_retry(
            tool_name="rag_search_tool",
            step_id=1,
            params={"query": "What is the corrosion thickness tolerance limit?", "top_k": 2},
        )
        self.assertTrue(rec.success)
        self.assertIn("results", rec.output)
        self.assertGreaterEqual(len(rec.output["results"]), 1)

    def test_fastapi_rag_endpoints(self):
        client = TestClient(app)

        # Stats endpoint
        res_stats = client.get("/api/rag/stats")
        self.assertEqual(res_stats.status_code, 200)
        stats_data = res_stats.json()
        self.assertIn("total_chunks", stats_data)

        # Ingest text endpoint
        res_ingest = client.post(
            "/api/rag/ingest/text",
            json={
                "text": "Emergency isolation valve actuation procedure step 1.",
                "doc_name": "API_Test_Doc.pdf",
                "page_num": 1,
            },
        )
        self.assertEqual(res_ingest.status_code, 201)
        ingest_data = res_ingest.json()
        self.assertEqual(ingest_data["status"], "SUCCESS")

        # Query endpoint
        res_query = client.post(
            "/api/rag/query",
            json={"query": "isolation valve procedure", "top_k": 2},
        )
        self.assertEqual(res_query.status_code, 200)
        query_data = res_query.json()
        self.assertIn("results", query_data)


if __name__ == "__main__":
    unittest.main()
