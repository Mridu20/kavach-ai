"""
Retrieval threshold calibration harness.

Prints the top similarity score for queries that SHOULD hit the knowledge base
and queries that SHOULD NOT, so DEFAULT_MIN_SCORE can be placed in the empty
band between them.

Run after changing the corpus or the embedding model:

    ./venv/bin/python scripts/calibrate_retrieval.py

A healthy result shows a clear gap between the two groups. If they overlap, the
corpus and the off-topic set are too similar to separate by score alone and the
retrieval gate in backend/agent/planner.py must do more of the work.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.rag.store import DEFAULT_MIN_SCORE, EmbeddingUnavailableError, LocalVectorStore

# Questions the corpus genuinely answers.
SHOULD_HIT = [
    "What is our corrosion tolerance limit?",
    "What is the turbine critical vibration trip threshold?",
    "How often must secondary containment seals be replaced?",
    "What oil grade does the T-850 turbine use?",
    "When must pressure relief valves be recertified?",
    "What are the confined space entry atmospheric requirements?",
]

# Questions the corpus does not cover, including deliberate near-misses that
# use organisational phrasing without matching any indexed subject.
SHOULD_MISS = [
    "What is the capital of France?",
    "Who won the 2018 football world cup?",
    "Write a python function to reverse a string",
    "What is our policy on underwater basket weaving?",
    "Explain the history of the Roman empire",
]


def main() -> int:
    store = LocalVectorStore()

    health = store.health()
    if not health["embeddings_available"]:
        print(f"FAIL: {health['detail']}")
        return 1
    if store.count() == 0:
        print("FAIL: knowledge base is empty. POST /api/rag/reindex first.")
        return 1

    print(f"Corpus: {store.count()} chunks | threshold: {DEFAULT_MIN_SCORE}\n")

    def top_score(q: str) -> float:
        # min_score=0 so we observe the raw distribution, not the filtered one.
        results = store.query(q, top_k=1, min_score=0.0)
        return results[0]["score"] if results else 0.0

    try:
        hits = [(q, top_score(q)) for q in SHOULD_HIT]
        misses = [(q, top_score(q)) for q in SHOULD_MISS]
    except EmbeddingUnavailableError as e:
        print(f"FAIL: {e}")
        return 1

    print("SHOULD HIT (want score >= threshold)")
    for q, s in hits:
        print(f"  {s:.3f}  {'ok ' if s >= DEFAULT_MIN_SCORE else 'MISS'}  {q}")

    print("\nSHOULD MISS (want score < threshold)")
    for q, s in misses:
        print(f"  {s:.3f}  {'ok ' if s < DEFAULT_MIN_SCORE else 'LEAK'}  {q}")

    lowest_hit = min(s for _, s in hits)
    highest_miss = max(s for _, s in misses)
    margin = lowest_hit - highest_miss

    print(f"\nlowest hit : {lowest_hit:.3f}")
    print(f"highest miss: {highest_miss:.3f}")
    print(f"margin      : {margin:+.3f}")

    if margin <= 0:
        print("\nFAIL: bands overlap, no threshold can separate these cleanly.")
        return 1

    suggested = round(highest_miss + margin / 2, 2)
    print(f"suggested   : {suggested}  (midpoint of the empty band)")

    if not (highest_miss < DEFAULT_MIN_SCORE <= lowest_hit):
        print(f"\nWARN: DEFAULT_MIN_SCORE ({DEFAULT_MIN_SCORE}) sits outside the empty band.")
        return 1

    print("\nPASS: threshold separates hits from noise.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
