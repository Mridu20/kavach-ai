"""
Sovereign Local Vector RAG Store using ChromaDB, langchain-text-splitters, and nomic-embed-text.
Operates completely on-premise with zero external cloud calls.
Supports lightweight in-memory fallback if ChromaDB package is not installed.
"""

import os
import re
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

KNOWLEDGE_BASE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "knowledge_base",
)

# Cosine similarity below this is treated as "no relevant match".
#
# Calibrated against nomic-embed-text over the current corpus:
#   genuine hits        0.75 - 0.83  ("our corrosion tolerance limit")
#   plausible near-miss 0.50         ("our policy on underwater basket weaving")
#   unrelated           0.36 - 0.37  ("capital of France")
# 0.60 sits in the empty band between real matches and noise. Re-measure with
# scripts/calibrate_retrieval.py after any substantial change to the corpus.
DEFAULT_MIN_SCORE = 0.6


class EmbeddingUnavailableError(RuntimeError):
    """
    Raised when real embeddings cannot be produced.

    This is deliberately a hard failure. An earlier revision substituted
    hash-derived pseudo-vectors whenever Ollama was unreachable, which made
    every chunk and every query land at an arbitrary point in vector space.
    Retrieval silently degraded into picking random paragraphs, and the
    resulting answers looked like confident nonsense. Failing loudly is the
    only way that stays diagnosable.
    """


def _normalize(vector: List[float]) -> List[float]:
    """Scales a vector to unit length so cosine similarity is a plain dot product."""
    magnitude = math.sqrt(sum(x * x for x in vector))
    if magnitude == 0:
        raise EmbeddingUnavailableError("Embedding model returned a zero-magnitude vector.")
    return [x / magnitude for x in vector]


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
        auto_seed: bool = False,
        probe_timeout: float = 2.0,
        embed_timeout: float = 60.0,
    ):
        self.db_path = os.path.abspath(db_path)
        self.collection_name = collection_name
        self.ollama_url = ollama_url.rstrip("/")
        self.embedding_model = embedding_model
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.probe_timeout = probe_timeout
        self.embed_timeout = embed_timeout
        self._ollama_online: Optional[bool] = None
        self._memory_chunks: List[Dict[str, Any]] = []

        os.makedirs(self.db_path, exist_ok=True)

        if chromadb is not None:
            try:
                self.client = chromadb.PersistentClient(path=self.db_path)
                self.collection = self.client.get_or_create_collection(
                    name=self.collection_name,
                    # Cosine space: vectors are stored normalized, so distance
                    # maps cleanly onto a 0..1 similarity for thresholding.
                    metadata={
                        "description": "Sovereign Industrial SOP and Manual Vector Store",
                        "hnsw:space": "cosine",
                    },
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
            self.seed_from_knowledge_base()

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

    @staticmethod
    def _find_headings(text: str) -> List[Tuple[int, str]]:
        """
        Locates section headings and their character offsets.

        Matches numbered headings ("SECTION 2: CORROSION THRESHOLDS") and bare
        all-caps title lines, which is how the SOPs and manuals in this corpus
        are structured.
        """
        headings: List[Tuple[int, str]] = []
        offset = 0
        for line in text.splitlines(keepends=True):
            stripped = line.strip()
            if stripped and (
                re.match(r"^SECTION\s+\d+", stripped, re.IGNORECASE)
                or (len(stripped) > 8 and stripped == stripped.upper() and any(c.isalpha() for c in stripped))
            ):
                headings.append((offset, stripped.rstrip(":")))
            offset += len(line)
        return headings

    def _contextualize(self, chunk: str, doc_name: str, heading: Optional[str]) -> str:
        """
        Prefixes a chunk with its document and section heading before embedding.

        Without this, a chunk that reads "2.1 Corrosion Tolerance Limit ... 0.5 mm"
        embeds with no indication of which document or section it belongs to,
        while the heading itself lands at the tail of the neighbouring chunk.
        Queries then match the heading chunk instead of the clause that holds
        the answer. Prefixing restores that context on the embedded text only —
        the stored snippet stays clean, so citations quote the source verbatim.
        """
        parts = [f"Document: {doc_name}"]
        if heading:
            parts.append(f"Section: {heading}")
        parts.append(chunk)
        return "\n".join(parts)

    def _check_ollama(self) -> bool:
        """Probes the local Ollama daemon. Cached for the life of the store."""
        if self._ollama_online is not None:
            return self._ollama_online
        try:
            res = httpx.get(f"{self.ollama_url}/api/version", timeout=self.probe_timeout)
            self._ollama_online = (res.status_code == 200)
        except Exception:
            self._ollama_online = False
        return self._ollama_online

    def health(self) -> Dict[str, Any]:
        """Reports whether real retrieval is currently possible, and why not if it isn't."""
        online = self._check_ollama()
        return {
            "embeddings_available": online,
            "embedding_model": self.embedding_model,
            "ollama_url": self.ollama_url,
            "indexed_chunks": self.count(),
            "detail": (
                "Ready."
                if online
                else f"Ollama unreachable at {self.ollama_url}. Start it with `ollama serve`."
            ),
        }

    def get_embedding(self, text: str) -> List[float]:
        return self.get_embeddings([text])[0]

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Embeds texts with nomic-embed-text via the local Ollama daemon.

        Raises EmbeddingUnavailableError rather than degrading: a wrong vector
        is worse than no vector, because it produces plausible-looking answers
        built on randomly selected source material.
        """
        if not texts:
            return []

        if not self._check_ollama():
            raise EmbeddingUnavailableError(
                f"Ollama is not reachable at {self.ollama_url}. "
                f"Start it with `ollama serve`, then ensure the embedding model is present: "
                f"`ollama pull {self.embedding_model}`."
            )

        url = f"{self.ollama_url}/api/embeddings"
        results: List[List[float]] = []

        # A generous timeout on purpose: the first call after boot pays for
        # loading the model into memory, which routinely exceeds a second.
        with httpx.Client(timeout=self.embed_timeout) as client:
            for text in texts:
                try:
                    response = client.post(
                        url, json={"model": self.embedding_model, "prompt": text}
                    )
                except httpx.RequestError as e:
                    raise EmbeddingUnavailableError(
                        f"Embedding request to {url} failed: {e}"
                    ) from e

                if response.status_code == 404:
                    raise EmbeddingUnavailableError(
                        f"Embedding model '{self.embedding_model}' is not installed. "
                        f"Run: ollama pull {self.embedding_model}"
                    )
                if response.status_code != 200:
                    raise EmbeddingUnavailableError(
                        f"Ollama returned HTTP {response.status_code} for an embedding request: "
                        f"{response.text[:200]}"
                    )

                embedding = response.json().get("embedding")
                if not embedding or not isinstance(embedding, list):
                    raise EmbeddingUnavailableError(
                        f"Ollama returned no embedding vector for model '{self.embedding_model}'."
                    )

                # Stored normalized so cosine distance is well behaved and
                # similarity scores land in a meaningful 0..1 range.
                results.append(_normalize(embedding))

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

        # Resolve the section heading in force for each chunk by walking the
        # original text, so chunks keep their structural context when embedded.
        headings = self._find_headings(text)
        chunk_headings: List[Optional[str]] = []
        cursor = 0
        for chunk in chunks:
            position = text.find(chunk[:80], cursor)
            if position == -1:
                position = cursor
            else:
                cursor = position + 1
            current = None
            for offset, heading in headings:
                if offset <= position:
                    current = heading
                else:
                    break
            chunk_headings.append(current)

        ids = []
        # Embed the contextualised form; store and cite the raw chunk.
        embeddings = self.get_embeddings([
            self._contextualize(c, doc_name, h) for c, h in zip(chunks, chunk_headings)
        ])
        metadatas = []
        documents = []
        base_meta = metadata.copy() if metadata else {}

        for idx, chunk in enumerate(chunks):
            chunk_id = f"{doc_name}_p{page_num}_c{idx}_{hashlib.md5(chunk.encode()).hexdigest()[:8]}"
            chunk_meta = {
                "doc_name": doc_name,
                "page": page_num,
                "chunk_index": idx,
                "section": chunk_headings[idx] or "",
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

    def query(
        self,
        query_text: str,
        top_k: int = 3,
        min_score: float = DEFAULT_MIN_SCORE,
    ) -> List[Dict[str, Any]]:
        """
        Semantic search over the local corpus.

        Returns only chunks scoring at or above min_score. An empty list is a
        real, meaningful answer: the corpus has nothing relevant. Callers must
        surface that honestly rather than passing weak matches to the model,
        which is how invented citations get produced.
        """
        if self.count() == 0:
            return []

        query_embedding = self.get_embedding(query_text)

        if self.collection is not None:
            try:
                results = self.collection.query(
                    query_embeddings=[query_embedding],
                    n_results=min(top_k, self.count()),
                )
                formatted_results = []
                if results and results.get("documents") and results["documents"][0]:
                    docs = results["documents"][0]
                    metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
                    distances = results["distances"][0] if results.get("distances") else [None] * len(docs)
                    ids = results["ids"][0] if results.get("ids") else [""] * len(docs)

                    for doc, meta, dist, cid in zip(docs, metas, distances, ids):
                        # Cosine space over normalized vectors: distance = 1 - similarity.
                        # The previous formula assumed an L2 space and a 0..2 range,
                        # which clamped every real score to 0.0 and made the
                        # relevance threshold impossible to apply.
                        meta = meta or {}
                        similarity = 1.0 - dist if dist is not None else 1.0
                        score = round(max(0.0, min(1.0, similarity)), 3)
                        if score < min_score:
                            continue
                        formatted_results.append(
                            {
                                "chunk_id": cid,
                                "doc_name": meta.get("doc_name", "Unknown document"),
                                "page": meta.get("page", 1),
                                "snippet": doc,
                                "score": score,
                                "metadata": meta,
                            }
                        )
                return formatted_results
            except EmbeddingUnavailableError:
                raise
            except Exception as e:
                logger.warning(f"ChromaDB query failed: {e}. Falling back to in-memory search.")

        # In-memory search. Vectors are normalized, so the dot product is cosine similarity.
        scored = []
        for c in self._memory_chunks:
            similarity = sum(a * b for a, b in zip(query_embedding, c["embedding"]))
            score = round(max(0.0, min(1.0, similarity)), 3)
            if score < min_score:
                continue
            scored.append({
                "chunk_id": c["id"],
                "doc_name": c["metadata"].get("doc_name", "Unknown document"),
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

    def seed_from_knowledge_base(self, kb_dir: Optional[str] = None) -> Dict[str, Any]:
        """
        Indexes every document in knowledge_base/ .

        Deliberately has no built-in document text. An earlier revision carried
        hardcoded SOP strings here and named them after .pdf files that were
        never on disk, so answers cited sources nobody could open. The corpus
        is whatever the organisation actually put in the folder — nothing else.
        """
        kb_dir = kb_dir or KNOWLEDGE_BASE_DIR
        report: Dict[str, Any] = {"indexed": [], "skipped": [], "chunks": 0}

        if not os.path.isdir(kb_dir):
            logger.warning(f"Knowledge base directory not found: {kb_dir}")
            return report

        for fpath in sorted(glob.glob(os.path.join(kb_dir, "*.*"))):
            name = os.path.basename(fpath)
            try:
                if os.path.getsize(fpath) == 0:
                    report["skipped"].append({"file": name, "reason": "empty file"})
                    continue
                ids = self.ingest_file(fpath)
                if ids:
                    report["indexed"].append({"file": name, "chunks": len(ids)})
                    report["chunks"] += len(ids)
                else:
                    report["skipped"].append({"file": name, "reason": "no extractable text"})
            except EmbeddingUnavailableError:
                raise
            except Exception as e:
                logger.warning(f"Could not index {name}: {e}")
                report["skipped"].append({"file": name, "reason": str(e)})

        logger.info(
            f"Knowledge base indexed: {len(report['indexed'])} file(s), {report['chunks']} chunk(s)."
        )
        return report


# Global singleton instance
_store_instance: Optional[LocalVectorStore] = None


def get_vector_store() -> LocalVectorStore:
    global _store_instance
    if _store_instance is None:
        _store_instance = LocalVectorStore()
    return _store_instance
