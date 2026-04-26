"""
pipeline/semantic.py  —  Semantic similarity scoring using fine-tuned SBERT.
"""

import os
from sentence_transformers import SentenceTransformer, util as st_util

_FINE_TUNED_PATH = os.path.join("sbert", "model")
_BASE_MODEL_PATH = os.path.join("sbert", "base_model")


class CyberSemanticScorer:
    """Wraps a fine-tuned SBERT model for cybersecurity semantic similarity."""

    def __init__(self):
        if os.path.isdir(_FINE_TUNED_PATH) and os.listdir(_FINE_TUNED_PATH):
            self._model = SentenceTransformer(_FINE_TUNED_PATH)
            self._source = "fine-tuned"
        elif os.path.isdir(_BASE_MODEL_PATH) and os.listdir(_BASE_MODEL_PATH):
            self._model = SentenceTransformer(_BASE_MODEL_PATH)
            self._source = "base-local"
        else:
            # Fallback: try the HuggingFace name (will download on first call)
            try:
                self._model = SentenceTransformer("all-MiniLM-L6-v2")
                self._source = "base-remote"
            except Exception:
                raise RuntimeError(
                    "No SBERT model found. Run 'python sbert/download_model.py' first."
                )

    @property
    def model_source(self) -> str:
        return self._source

    def similarity(self, text_a: str, text_b: str) -> float:
        """Cosine similarity between two texts.  Returns 0.0–1.0."""
        if not text_a or not text_a.strip() or not text_b or not text_b.strip():
            return 0.0
        emb_a = self._model.encode(text_a, convert_to_tensor=True)
        emb_b = self._model.encode(text_b, convert_to_tensor=True)
        score = st_util.cos_sim(emb_a, emb_b).item()
        return max(0.0, min(1.0, score))

    def best_match(self, candidate: str, references: list) -> float:
        """Highest cosine similarity of *candidate* against any *reference*."""
        if not candidate or not candidate.strip() or not references:
            return 0.0
        cand_emb = self._model.encode(candidate, convert_to_tensor=True)
        ref_embs = self._model.encode(references, convert_to_tensor=True)
        scores = st_util.cos_sim(cand_emb, ref_embs)
        return max(0.0, min(1.0, scores.max().item()))

    def list_match(self, extracted: list, truth: list) -> float:
        """For each truth item, find its best semantic match in extracted."""
        if not truth:
            return 1.0
        if not extracted:
            return 0.0
        truth_embs = self._model.encode(truth, convert_to_tensor=True)
        ext_embs = self._model.encode(extracted, convert_to_tensor=True)
        sim_matrix = st_util.cos_sim(truth_embs, ext_embs)
        best_per_truth = sim_matrix.max(dim=1).values
        avg = best_per_truth.mean().item()
        return max(0.0, min(1.0, avg))


_scorer = None


def get_scorer() -> CyberSemanticScorer:
    """Return the singleton scorer (lazy-loaded on first call)."""
    global _scorer
    if _scorer is None:
        _scorer = CyberSemanticScorer()
    return _scorer
