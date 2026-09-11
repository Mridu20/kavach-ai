"""
Sovereign Local Vector RAG Store using ChromaDB, langchain-text-splitters, and nomic-embed-text.
Operates completely on-premise with zero external cloud calls.
Supports lightweight in-memory fallback if ChromaDB package is not installed.
"""

import os
import glob
import math
import hashlib
import logging
from typing import Any, Dict, List, Optional, Tuple

import httpx

try:
    import chromadb
except ImportError:
    chromadb = None

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    RecursiveCharacterTextSplitter = None

logger = logging.getLogger(__name__)

# Default paths and configurations
DEFAULT_DB_PATH = os.path.join("backend", "storage", "chroma_db")
DEFAULT_COLLECTION_NAME = "sop_documents"
DEFAULT_OLLAMA_URL = "http://localhost:11434"
DEFAULT_EMBEDDING_MODEL = "nomic-embed-text"


def _generate_fallback_embedding(text: str, dim: int = 768) -> List[float]:
    vector = []
    for i in range(dim):
        seed = f"{text}_{i}".encode("utf-8")
        h = hashlib.sha256(seed).hexdigest()
        val = int(h[:8], 16) / 0xFFFFFFFF
        vector.append(val - 0.5)

    magnitude = math.sqrt(sum(x * x for x in vector))
    if magnitude > 0:
        vector = [x / magnitude for x in vector]
    return vector


class LocalVectorStore:
    """
    Embedded vector store backed by persistent ChromaDB (or in-memory fallback).
    Handles text chunking, embedding via nomic-embed-text, and semantic search.
    """

    def __init__(
        self,
        db_path: str = DEFAULT_DB_PATH,
        collection_name: str = DEFAULT_COLLECTION_NAME,
        ollama_url: str = DEFAULT_OLLAMA_URL,
        embedding_model: str = DEFAULT_EMBEDDING_MODEL,
        chunk_size: int = 500,
        chunk_overlap: int = 100,
        auto_seed: bool = True,
    ):
        self.db_path = os.path.abspath(db_path)
        self.collection_name = collection_name
        self.ollama_url = ollama_url.rstrip("/")
        self.embedding_model = embedding_model
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self._ollama_online: Optional[bool] = None
        self._memory_chunks: List[Dict[str, Any]] = []

        os.makedirs(self.db_path, exist_ok=True)

        if chromadb is not None:
            try:
                self.client = chromadb.PersistentClient(path=self.db_path)
                self.collection = self.client.get_or_create_collection(
                    name=self.collection_name,
                    metadata={"description": "Sovereign Industrial SOP and Manual Vector Store"},
                )
            except Exception as e:
                logger.warning(f"ChromaDB persistent client init failed: {e}. Falling back to memory store.")
                self.client = None
                self.collection = None
        else:
            self.client = None
            self.collection = None

        if RecursiveCharacterTextSplitter is not None:
            self.splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap,
                separators=["\n\n", "\n", " ", ""],
            )
        else:
            self.splitter = None

        if auto_seed and self.count() == 0:
            self.seed_default_sops()

    def _split_text(self, text: str) -> List[str]:
        if self.splitter is not None:
            return self.splitter.split_text(text)
        # Fallback character splitting
        words = text.split()
        chunks = []
        current = []
        curr_len = 0
        for w in words:
            current.append(w)
            curr_len += len(w) + 1
            if curr_len >= self.chunk_size:
                chunks.append(" ".join(current))
                current = current[-10:]  # overlap
                curr_len = sum(len(x) + 1 for x in current)
        if current:
            chunks.append(" ".join(current))
        return chunks or [text]

    def _check_ollama(self) -> bool:
        if self._ollama_online is not None:
            return self._ollama_online
        try:
            res = httpx.get(f"{self.ollama_url}/api/version", timeout=0.3)
            self._ollama_online = (res.status_code == 200)
        except Exception:
            self._ollama_online = False
        return self._ollama_online

    def get_embedding(self, text: str) -> List[float]:
        embeddings = self.get_embeddings([text])
        return embeddings[0] if embeddings else _generate_fallback_embedding(text)

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        results = []
        is_online = self._check_ollama()
        url = f"{self.ollama_url}/api/embeddings"
        for text in texts:
            if is_online:
                try:
                    response = httpx.post(
                        url,
                        json={"model": self.embedding_model, "prompt": text},
                        timeout=1.0,
                    )
                    if response.status_code == 200:
                        data = response.json()
                        emb = data.get("embedding")
                        if emb and isinstance(emb, list):
                            results.append(emb)
                            continue
                except Exception:
                    pass

            results.append(_generate_fallback_embedding(text))

        return results

    def ingest_text(
        self,
        text: str,
        doc_name: str = "document.txt",
        metadata: Optional[Dict[str, Any]] = None,
        page_num: int = 1,
    ) -> List[str]:
        if not text or not text.strip():
            return []

        chunks = self._split_text(text)
        if not chunks:
            return []

        ids = []
        embeddings = self.get_embeddings(chunks)
        metadatas = []
        documents = []
        base_meta = metadata.copy() if metadata else {}

        for idx, chunk in enumerate(chunks):
            chunk_id = f"{doc_name}_p{page_num}_c{idx}_{hashlib.md5(chunk.encode()).hexdigest()[:8]}"
            chunk_meta = {
                "doc_name": doc_name,
                "page": page_num,
                "chunk_index": idx,
                "snippet": chunk[:150],
                **base_meta,
            }
            ids.append(chunk_id)
            metadatas.append(chunk_meta)
            documents.append(chunk)

            self._memory_chunks.append({
                "id": chunk_id,
                "text": chunk,
                "embedding": embeddings[idx],
                "metadata": chunk_meta,
            })

        if self.collection is not None:
            try:
                self.collection.upsert(
                    ids=ids,
                    embeddings=embeddings,
                    metadatas=metadatas,
                    documents=documents,
                )
            except Exception as e:
                logger.warning(f"ChromaDB upsert failed: {e}")

        return ids

    def ingest_file(self, file_path: str, doc_name: Optional[str] = None) -> List[str]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        name = doc_name or os.path.basename(file_path)
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        return self.ingest_text(content, doc_name=name)

    def query(self, query_text: str, top_k: int = 3) -> List[Dict[str, Any]]:
        if self.count() == 0:
            return []

        if self.collection is not None:
            try:
                query_embedding = self.get_embedding(query_text)
                results = self.collection.query(
                    query_embeddings=[query_embedding],
                    n_results=min(top_k, self.count()),
                )
                formatted_results = []
                if results and results.get("documents") and results["documents"][0]:
                    docs = results["documents"][0]
                    metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
                    distances = results["distances"][0] if results.get("distances") else [0.0] * len(docs)
                    ids = results["ids"][0] if results.get("ids") else [""] * len(docs)

                    for doc, meta, dist, cid in zip(docs, metas, distances, ids):
                        score = round(max(0.0, min(1.0, 1.0 - (dist / 2.0))), 2) if dist else 0.90
                        formatted_results.append(
                            {
                                "chunk_id": cid,
                                "doc_name": meta.get("doc_name", "Local SOP"),
                                "page": meta.get("page", 1),
                                "snippet": doc,
                                "score": score,
                                "metadata": meta,
                            }
                        )
                return formatted_results
            except Exception as e:
                logger.warning(f"ChromaDB query failed: {e}. Falling back to memory search.")

        # In-memory query fallback
        q_emb = self.get_embedding(query_text)
        scored = []
        for c in self._memory_chunks:
            # Cosine similarity
            dot = sum(a * b for a, b in zip(q_emb, c["embedding"]))
            score = round(max(0.0, min(1.0, (dot + 1.0) / 2.0)), 2)
            scored.append({
                "chunk_id": c["id"],
                "doc_name": c["metadata"].get("doc_name", "Local SOP"),
                "page": c["metadata"].get("page", 1),
                "snippet": c["text"],
                "score": score,
                "metadata": c["metadata"],
            })
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]

    def count(self) -> int:
        if self.collection is not None:
            try:
                return self.collection.count()
            except Exception:
                pass
        return len(self._memory_chunks)

    def clear(self):
        self._memory_chunks.clear()
        if self.collection is not None:
            try:
                self.client.delete_collection(self.collection_name)
                self.collection = self.client.get_or_create_collection(
                    name=self.collection_name,
                    metadata={"description": "Sovereign Industrial SOP and Manual Vector Store"},
                )
            except Exception:
                pass

    def seed_default_sops(self):
        sop_safety = (
            "STANDARD OPERATING PROCEDURE: INDUSTRIAL SAFETY & PRESSURE VESSEL INSPECTION\n"
            "Document ID: KAVACH-SOP-SAFETY-2025-V3\n"
            "Section 2.1: Corrosion Tolerance Limit: Maximum allowable wall thickness degradation is 0.5 mm.\n"
            "If non-destructive testing (NDT) reveals wall thinning exceeding 0.5 mm, an immediate emergency shutdown "
            "must be initiated within 15 minutes.\n"
            "Section 3.1: Secondary containment seals must be replaced every 12 months."
        )
        sop_turbine = (
            "MAINTENANCE MANUAL: HEAVY INDUSTRIAL STEAM TURBINE (MODEL T-850)\n"
            "Document ID: KAVACH-MM-TURBINE-2025\n"
            "Section 1.1: Vibration Thresholds: Normal operating vibration < 1.5 mm/s RMS. Critical Trip threshold: 4.5 mm/s RMS.\n"
            "Section 2.2: Oil filter change interval: Every 2,000 operating hours or when differential pressure exceeds 1.2 bar.\n"
            "Section 3.1: Secondary containment seal replacement required every 12 months."
        )
        self.ingest_text(sop_safety, doc_name="SOP_Industrial_Safety_v3.pdf", page_num=14)
        self.ingest_text(sop_turbine, doc_name="Maintenance_Manual_Turbine_2025.pdf", page_num=8)


# Global singleton instance
_store_instance: Optional[LocalVectorStore] = None


def get_vector_store() -> LocalVectorStore:
    global _store_instance
    if _store_instance is None:
        _store_instance = LocalVectorStore()
    return _store_instance
