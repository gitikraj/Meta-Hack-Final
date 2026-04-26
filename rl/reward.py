"""
Reward computation and shaping.
Takes the judge's raw multi-dimensional scores (0-100 each) and produces
a single scalar reward suitable for driving the self-improvement loop.
"""

from dataclasses import dataclass, field
from typing import Optional

SCORE_DIMENSIONS = [
    "accuracy", "completeness", "actionability",
    "technical_depth", "mitre_alignment", "relevance",
]


@dataclass
class RewardSignal:
    raw_overall: float
    shaped_reward: float
    dimension_scores: dict
    dimension_deltas: dict
    weakest_dimension: str
    strongest_dimension: str
    streak: int
    verdict: str


class RewardShaper:
    """Converts judge output into shaped reward signals."""

    def __init__(self, weights: dict, baseline: float = 50.0, scale: float = 0.01):
        self.weights = weights
        self.baseline = baseline
        self.scale = scale
        self._prev_scores: Optional[dict] = None
        self._streak = 0

    def reset(self):
        self._prev_scores = None
        self._streak = 0

    def compute(self, judge_output: dict) -> RewardSignal:
        # Extract per-dimension scores
        dimension_scores = {}
        for d in SCORE_DIMENSIONS:
            dimension_scores[d] = float(judge_output.get(d, 0.0))

        # Weighted sum of dimensions
        weighted = sum(
            dimension_scores[d] * self.weights.get(d, 0.0) for d in SCORE_DIMENSIONS
        )

        # Shaped reward = (weighted - baseline) * scale
        shaped = (weighted - self.baseline) * self.scale

        # Compute deltas vs previous
        deltas = {}
        if self._prev_scores is not None:
            for d in SCORE_DIMENSIONS:
                deltas[d] = round(dimension_scores[d] - self._prev_scores.get(d, 0.0), 2)
        else:
            deltas = {d: 0.0 for d in SCORE_DIMENSIONS}

        # Weakest / strongest
        weakest = min(SCORE_DIMENSIONS, key=lambda d: dimension_scores[d])
        strongest = max(SCORE_DIMENSIONS, key=lambda d: dimension_scores[d])

        # Track streak (consecutive episodes with overall >= baseline+10)
        raw_overall = float(judge_output.get("overall", weighted))
        verdict = judge_output.get("verdict", "unknown")
        if verdict == "pass":
            self._streak += 1
        else:
            self._streak = 0

        self._prev_scores = dict(dimension_scores)

        return RewardSignal(
            raw_overall=round(raw_overall, 2),
            shaped_reward=round(shaped, 4),
            dimension_scores={k: round(v, 2) for k, v in dimension_scores.items()},
            dimension_deltas=deltas,
            weakest_dimension=weakest,
            strongest_dimension=strongest,
            streak=self._streak,
            verdict=verdict,
        )


def compute_improvement_rate(history: list) -> dict:
    """Given a list of RewardSignal, compute slope of overall scores."""
    if not history or len(history) < 2:
        return {"slope": 0.0, "first": 0.0, "last": 0.0, "delta": 0.0}
    overalls = [r.raw_overall for r in history]
    n = len(overalls)
    # Simple linear fit
    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(overalls) / n
    num = sum((xs[i] - mean_x) * (overalls[i] - mean_y) for i in range(n))
    den = sum((xs[i] - mean_x) ** 2 for i in range(n)) or 1.0
    slope = num / den
    return {
        "slope": round(slope, 4),
        "first": round(overalls[0], 2),
        "last": round(overalls[-1], 2),
        "delta": round(overalls[-1] - overalls[0], 2),
    }
