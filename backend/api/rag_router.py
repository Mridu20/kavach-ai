"""
FastAPI Router for Local RAG Vector Store Management and Semantic Querying.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel, Field

from backend.rag.store import get_vector_store

router = APIRouter(prefix="/api/rag", tags=["Vector RAG"])


class RAGQueryRequest(BaseModel):
    query: str = Field(..., description="Semantic search query string")
    top_k: Optional[int] = Field(3, description="Number of matching snippets to return")


class RAGIngestTextRequest(BaseModel):
    text: str = Field(..., description="Raw text content to split and ingest into vector store")
    doc_name: str = Field(..., description="Source document identifier")
    page_num: Optional[int] = Field(1, description="Source page number")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional custom metadata")


@router.post("/query", status_code=status.HTTP_200_OK)
def query_vector_store(req: RAGQueryRequest):
    """Executes local vector similarity search over stored SOPs and documents."""
    store = get_vector_store()
    results = store.query(query_text=req.query, top_k=req.top_k or 3)
    return {
        "query": req.query,
        "results_count": len(results),
        "results": results,
    }


@router.post("/ingest/text", status_code=status.HTTP_201_CREATED)
def ingest_text_content(req: RAGIngestTextRequest):
    """Splits raw text content with RecursiveCharacterTextSplitter and embeds into ChromaDB."""
    store = get_vector_store()
    chunk_ids = store.ingest_text(
        text=req.text,
        doc_name=req.doc_name,
        metadata=req.metadata,
        page_num=req.page_num or 1,
    )
    return {
        "status": "SUCCESS",
        "doc_name": req.doc_name,
        "chunks_ingested": len(chunk_ids),
        "chunk_ids": chunk_ids,
    }


@router.get("/stats", status_code=status.HTTP_200_OK)
def get_vector_store_stats():
    """Returns vector store statistics including document chunk count and persistent path."""
    store = get_vector_store()
    return {
        "total_chunks": store.count(),
        "db_path": store.db_path,
        "collection": store.collection_name,
        "embedding_model": store.embedding_model,
        "chunk_size": store.chunk_size,
        "chunk_overlap": store.chunk_overlap,
    }


@router.post("/clear", status_code=status.HTTP_200_OK)
def clear_vector_store():
    """Clears all vector collection entries."""
    store = get_vector_store()
    store.clear()
    return {"status": "CLEARED", "total_chunks": store.count()}
