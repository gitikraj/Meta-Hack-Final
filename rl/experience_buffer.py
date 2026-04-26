"""Experience replay buffer for the LLM self-improvement loop."""

import hashlib
import json
import os
from dataclasses import dataclass, asdict, field
from pathlib import Path
from typing import Optional

from rl.reward import RewardSignal, SCORE_DIMENSIONS


@dataclass
class Episode:
    episode_id: int
    case_id: str
    difficulty: str
    category: str
    goal: str
    briefing: str
    response: str
    reward: RewardSignal
    judge_strengths: str = ""
    judge_gaps: str = ""
    judge_recommendation: str = ""
    prompt_version: int = 0
    _fingerprint: str = ""

    def __post_init__(self):
        if not self._fingerprint:
            base = f"{self.case_id}|{self.response[:512]}"
            self._fingerprint = hashlib.md5(base.encode("utf-8")).hexdigest()[:16]


class ExperienceBuffer:
    """Fixed-capacity ring buffer with ranked retrieval."""

    def __init__(self, capacity: int = 200, min_score_for_exemplar: float = 75.0):
        self.capacity = capacity
        self.min_score_for_exemplar = min_score_for_exemplar
        self._episodes: list = []

    @property
    def size(self) -> int:
        return len(self._episodes)

    def add(self, episode: Episode):
        # Skip duplicates by fingerprint
        for e in self._episodes:
            if e._fingerprint == episode._fingerprint:
                return
        self._episodes.append(episode)
        if len(self._episodes) > self.capacity:
            self._episodes = self._episodes[-self.capacity:]

    def top_k(self, k: int = 3, exclude_case_id: Optional[str] = None) -> list:
        pool = [e for e in self._episodes if e.reward.raw_overall >= self.min_score_for_exemplar]
        if exclude_case_id:
            pool = [e for e in pool if e.case_id != exclude_case_id]
        pool.sort(key=lambda e: e.reward.raw_overall, reverse=True)
        return pool[:k]

    def worst_k(self, k: int = 3) -> list:
        ep = sorted(self._episodes, key=lambda e: e.reward.raw_overall)
        return ep[:k]

    def best_for_dimension(self, dimension: str, k: int = 2) -> list:
        ep = sorted(
            self._episodes,
            key=lambda e: e.reward.dimension_scores.get(dimension, 0),
            reverse=True,
        )
        return ep[:k]

    def recent(self, k: int = 5) -> list:
        return self._episodes[-k:]

    def by_case(self, case_id: str) -> list:
        return [e for e in self._episodes if e.case_id == case_id]

    def by_difficulty(self, difficulty: str) -> list:
        return [e for e in self._episodes if e.difficulty == difficulty]

    def avg_score(self, last_n: Optional[int] = None) -> float:
        ep = self._episodes[-last_n:] if last_n else self._episodes
        if not ep:
            return 0.0
        return round(sum(e.reward.raw_overall for e in ep) / len(ep), 2)

    def dimension_averages(self, last_n: Optional[int] = None) -> dict:
        ep = self._episodes[-last_n:] if last_n else self._episodes
        if not ep:
            return {d: 0.0 for d in SCORE_DIMENSIONS}
        return {
            d: round(sum(e.reward.dimension_scores.get(d, 0) for e in ep) / len(ep), 2)
            for d in SCORE_DIMENSIONS
        }

    def weakest_dimension(self, last_n: int = 10) -> str:
        avgs = self.dimension_averages(last_n=last_n)
        if not avgs:
            return "accuracy"
        return min(avgs, key=lambda d: avgs[d])

    def pass_rate(self, last_n: Optional[int] = None) -> float:
        ep = self._episodes[-last_n:] if last_n else self._episodes
        if not ep:
            return 0.0
        passes = sum(1 for e in ep if e.reward.verdict == "pass")
        return round(passes / len(ep), 3)

    def score_trajectory(self) -> list:
        return [round(e.reward.raw_overall, 2) for e in self._episodes]

    def save(self, path: str):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        data = []
        for e in self._episodes:
            d = asdict(e)
            # asdict converts nested dataclasses too
            data.append(d)
        with open(path, "w") as f:
            json.dump(data, f, indent=2, default=str)

    def load(self, path: str):
        if not os.path.exists(path):
            return
        try:
            with open(path, "r") as f:
                data = json.load(f)
        except (json.JSONDecodeError, ValueError):
            return
        loaded = []
        for d in data:
            try:
                rw = d.get("reward", {})
                if isinstance(rw, dict):
                    rsignal = RewardSignal(
                        raw_overall=rw.get("raw_overall", 0.0),
                        shaped_reward=rw.get("shaped_reward", 0.0),
                        dimension_scores=rw.get("dimension_scores", {}),
                        dimension_deltas=rw.get("dimension_deltas", {}),
                        weakest_dimension=rw.get("weakest_dimension", ""),
                        strongest_dimension=rw.get("strongest_dimension", ""),
                        streak=rw.get("streak", 0),
                        verdict=rw.get("verdict", "unknown"),
                    )
                else:
                    rsignal = rw
                ep = Episode(
                    episode_id=d.get("episode_id", 0),
                    case_id=d.get("case_id", ""),
                    difficulty=d.get("difficulty", ""),
                    category=d.get("category", ""),
                    goal=d.get("goal", ""),
                    briefing=d.get("briefing", ""),
                    response=d.get("response", ""),
                    reward=rsignal,
                    judge_strengths=d.get("judge_strengths", ""),
                    judge_gaps=d.get("judge_gaps", ""),
                    judge_recommendation=d.get("judge_recommendation", ""),
                    prompt_version=d.get("prompt_version", 0),
                    _fingerprint=d.get("_fingerprint", ""),
                )
                loaded.append(ep)
            except Exception:
                continue
        self._episodes = loaded
