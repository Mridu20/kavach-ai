"""
Local Vector RAG Package using ChromaDB, langchain-text-splitters, and nomic-embed-text.
"""

from backend.rag.store import LocalVectorStore, get_vector_store

__all__ = ["LocalVectorStore", "get_vector_store"]
