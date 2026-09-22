"""
FastAPI Router for Local RAG Vector Store Management and Semantic Querying.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel, Field

from backend.rag.store import (
    DEFAULT_MIN_SCORE,
    EmbeddingUnavailableError,
    get_vector_store,
)

router = APIRouter(prefix="/api/rag", tags=["Vector RAG"])


class RAGQueryRequest(BaseModel):
    query: str = Field(..., description="Semantic search query string")
    top_k: Optional[int] = Field(3, description="Number of matching snippets to return")
    min_score: Optional[float] = Field(
        DEFAULT_MIN_SCORE, description="Minimum cosine similarity for a result to be returned"
    )


class RAGIngestTextRequest(BaseModel):
    text: str = Field(..., description="Raw text content to split and ingest into vector store")
    doc_name: str = Field(..., description="Source document identifier")
    page_num: Optional[int] = Field(1, description="Source page number")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional custom metadata")


@router.post("/query", status_code=status.HTTP_200_OK)
def query_vector_store(req: RAGQueryRequest):
    """Executes local vector similarity search over stored SOPs and documents."""
    store = get_vector_store()
    try:
        results = store.query(
            query_text=req.query,
            top_k=req.top_k or 3,
            min_score=req.min_score if req.min_score is not None else DEFAULT_MIN_SCORE,
        )
    except EmbeddingUnavailableError as e:
        # 503 rather than a degraded 200: a caller must be able to tell
        # "nothing matched" apart from "search is broken".
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        ) from e
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


@router.get("/health", status_code=status.HTTP_200_OK)
def knowledge_base_health():
    """
    Reports whether grounded retrieval is actually possible right now.

    Check this first when answers look wrong: if embeddings_available is false,
    retrieval is down and the assistant is answering from general knowledge only.
    """
    return get_vector_store().health()


@router.post("/reindex", status_code=status.HTTP_200_OK)
def reindex_knowledge_base():
    """
    Rebuilds the index from knowledge_base/ on disk.

    Clears first so that edited or deleted source documents do not leave stale
    chunks behind, which would let the assistant cite text no longer in force.
    """
    store = get_vector_store()
    try:
        store.clear()
        report = store.seed_from_knowledge_base()
    except EmbeddingUnavailableError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        ) from e
    return {"status": "REINDEXED", "total_chunks": store.count(), **report}


@router.post("/clear", status_code=status.HTTP_200_OK)
def clear_vector_store():
    """Clears all vector collection entries."""
    store = get_vector_store()
    store.clear()
    return {"status": "CLEARED", "total_chunks": store.count()}
