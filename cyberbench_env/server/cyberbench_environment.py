"""
cyberbench_env/server/cyberbench_environment.py

OpenEnv Environment subclass that wraps the CyberBench multi-agent pipeline.
"""

from __future__ import annotations

import asyncio
from typing import Any, Optional

try:
    from openenv.core.env_server import Environment  # type: ignore
except Exception:  # pragma: no cover — openenv not installed
    Environment = object  # type: ignore

from cyberbench_env.models import AnalyzeAction, CyberObservation, CyberState
from rl.bridge import briefing_fn, judge_fn, make_case_picker


class CyberBenchEnvironment(Environment):  # type: ignore[misc]
    """
    Gymnasium-style environment exposing the CyberBench pipeline over OpenEnv.
    """

    SUPPORTS_CONCURRENT_SESSIONS = False  # stateful — one episode at a time

    def __init__(self, difficulty: str = "all") -> None:
        try:
            super().__init__()
        except Exception:
            pass
        self._difficulty = difficulty
        self._case_picker = make_case_picker(difficulty)
        self._current_case: Optional[dict] = None
        self._current_briefing: str = ""
        self._episode_count: int = 0
        self._last_scores: dict = {}
        self._score_history: list = []

    # ── reset (sync — required by ABC) ──────────────────────────
    def reset(
        self,
        seed: Optional[int] = None,
        episode_id: Optional[str] = None,
        **kwargs: Any,
    ) -> CyberObservation:
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Already inside an event loop: create a new one in a thread
                import nest_asyncio  # type: ignore
                nest_asyncio.apply()
        except Exception:
            pass
        return asyncio.get_event_loop().run_until_complete(
            self.reset_async(seed=seed, episode_id=episode_id, **kwargs)
        )

    async def reset_async(
        self,
        seed: Optional[int] = None,
        episode_id: Optional[str] = None,
        **kwargs: Any,
    ) -> CyberObservation:
        self._episode_count += 1
        self._current_case = self._case_picker()
        case = self._current_case
        self._current_briefing = await briefing_fn(case)
        self._last_scores = {}

        obs = CyberObservation(
            case_id=case["case_id"],
            goal=case["goal"],
            difficulty=case["difficulty"],
            category=case["category"],
            briefing=self._current_briefing,
            done=False,
            reward=None,
        )
        try:
            return self._apply_transform(obs)  # type: ignore[attr-defined]
        except Exception:
            return obs

    # ── step (sync — required by ABC) ───────────────────────────
    def step(
        self,
        action: AnalyzeAction,
        timeout_s: Optional[float] = None,
        **kwargs: Any,
    ) -> CyberObservation:
        return asyncio.get_event_loop().run_until_complete(
            self.step_async(action, timeout_s=timeout_s, **kwargs)
        )

    async def step_async(
        self,
        action: AnalyzeAction,
        timeout_s: Optional[float] = None,
        **kwargs: Any,
    ) -> CyberObservation:
        if self._current_case is None:
            raise RuntimeError("Call reset() before step()")

        case = self._current_case
        scores = await judge_fn(
            goal=case["goal"],
            ground_truth=case["known_truth"],
            briefing=self._current_briefing,
            response=action.response_text,
        )
        self._last_scores = scores

        overall = scores.get("overall", 0.0)
        self._score_history.append(overall)

        obs = CyberObservation(
            case_id=case["case_id"],
            goal=case["goal"],
            difficulty=case["difficulty"],
            category=case["category"],
            briefing=self._current_briefing,
            scores=scores,
            done=True,
            reward=overall,
        )

        self._current_case = None
        try:
            return self._apply_transform(obs)  # type: ignore[attr-defined]
        except Exception:
            return obs

    @property
    def state(self) -> CyberState:
        last_10 = self._score_history[-10:] if self._score_history else []
        avg = sum(last_10) / len(last_10) if last_10 else 0.0
        return CyberState(
            episode_id=str(self._episode_count),
            step_count=self._episode_count,
            current_case_id=(
                self._current_case["case_id"] if self._current_case else None
            ),
            current_difficulty=self._difficulty,
            total_episodes=self._episode_count,
            avg_score_last_10=round(avg, 2),
        )
