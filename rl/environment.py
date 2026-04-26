"""
Gym-style RL environment that wraps the full evaluation pipeline.
"""

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Callable, Awaitable

from rl.config import RLConfig
from rl.reward import RewardShaper, RewardSignal
from rl.experience_buffer import ExperienceBuffer, Episode


@dataclass
class Observation:
    case_id: str
    goal: str
    difficulty: str
    category: str
    briefing: str


@dataclass
class StepResult:
    observation: Observation
    reward: RewardSignal
    done: bool
    info: dict


class RLEnvironment:
    def __init__(
        self,
        config: RLConfig,
        case_picker: Callable,
        briefing_fn: Callable,
        judge_fn: Callable,
    ):
        self.config = config
        self.case_picker = case_picker
        self.briefing_fn = briefing_fn
        self.judge_fn = judge_fn
        self.shaper = RewardShaper(
            weights=config.reward_weights,
            baseline=config.reward_baseline,
            scale=config.reward_scale,
        )
        self.buffer = ExperienceBuffer(
            capacity=config.buffer_capacity,
            min_score_for_exemplar=config.min_score_for_exemplar,
        )
        # Try restoring buffer
        ckpt_path = os.path.join(config.checkpoint_dir, "buffer.json")
        if os.path.exists(ckpt_path):
            try:
                self.buffer.load(ckpt_path)
            except Exception:
                pass

        self._current_case: Optional[dict] = None
        self._curriculum_idx = 0
        self._episode_count = 0
        self._last_eval_avg = 0.0

    async def reset(self) -> Observation:
        case = self.case_picker()
        self._current_case = case
        briefing = await self.briefing_fn(case)
        return Observation(
            case_id=case["case_id"],
            goal=case["goal"],
            difficulty=case["difficulty"],
            category=case["category"],
            briefing=briefing,
        )

    async def step(self, action: str) -> StepResult:
        if self._current_case is None:
            raise RuntimeError("Call reset() before step()")
        case = self._current_case
        scores = await self.judge_fn(
            goal=case["goal"],
            ground_truth=case["known_truth"],
            briefing="",
            response=action,
        )
        reward = self.shaper.compute(scores)
        self._episode_count += 1
        # Save episode to buffer
        episode = Episode(
            episode_id=self._episode_count,
            case_id=case["case_id"],
            difficulty=case["difficulty"],
            category=case["category"],
            goal=case["goal"],
            briefing="",
            response=action,
            reward=reward,
            judge_strengths=scores.get("strengths", ""),
            judge_gaps=scores.get("gaps", ""),
            judge_recommendation=scores.get("recommendation", ""),
            prompt_version=0,
        )
        self.buffer.add(episode)
        info = {
            "episode_count": self._episode_count,
            "buffer_size": self.buffer.size,
            "avg_score_last_10": self.buffer.avg_score(last_n=10),
        }
        return StepResult(
            observation=Observation(
                case_id=case["case_id"],
                goal=case["goal"],
                difficulty=case["difficulty"],
                category=case["category"],
                briefing="",
            ),
            reward=reward,
            done=True,
            info=info,
        )

    def get_curriculum_difficulty(self) -> str:
        if not self.config.curriculum_enabled:
            return "all"
        order = self.config.difficulty_order
        return order[min(self._curriculum_idx, len(order) - 1)]

    def maybe_promote_curriculum(self):
        if not self.config.curriculum_enabled:
            return
        if self.buffer.avg_score(last_n=5) >= self.config.promote_threshold:
            if self._curriculum_idx < len(self.config.difficulty_order) - 1:
                self._curriculum_idx += 1

    def save_checkpoint(self, directory: str):
        Path(directory).mkdir(parents=True, exist_ok=True)
        self.buffer.save(os.path.join(directory, "buffer.json"))

    def load_checkpoint(self, directory: str):
        path = os.path.join(directory, "buffer.json")
        if os.path.exists(path):
            self.buffer.load(path)
