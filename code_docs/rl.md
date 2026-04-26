# rl/ — Reinforcement Learning Self-Improvement

## Folder Structure

```
rl/
├── __init__.py
├── bridge.py
├── config.py
├── environment.py
├── experience_buffer.py
├── reward.py
├── run_training.py
└── trainer.py
```

---

## `__init__.py`

```python
# rl — reinforcement learning self-improvement loop for LLM agents
# The "policy" is the agent's prompt strategy.
# The "reward" is the judge's multi-dimensional score.
# Improvement happens via experience replay, lesson extraction,
# and prompt evolution across episodes.
```

---

## `bridge.py`

```python
"""
Bridge between the RL training loop and the existing CyberBench pipeline.

Provides the four callables that the RL Trainer/Environment need:
  - case_picker: picks scenarios from data/scenarios.json + UI ground truth pool
  - briefing_fn: runs log_analyst → vuln_scanner + threat_intel → orchestrator
  - judge_fn:    runs the judge agent and maps its output to RL reward dimensions
  - llm_fn:      calls the target agent LLM via shared Groq client
"""

import asyncio, json, os, random, sys
from pathlib import Path

from agents.utils import llm_call
from agents.log_analyst import run as log_analyst_run
from agents.vuln_scanner import run as vuln_scanner_run
from agents.threat_intel import run as threat_intel_run
from agents.orchestrator import run as orchestrator_run
from agents.judge import run as judge_run
from pipeline.env_loader import CaseEnvironmentLoader
from server.ground_truth import KNOWN_TRUTHS, GOALS, SHARED_ASSETS, SHARED_REQUIREMENTS


def make_case_picker(difficulty: str = "all") -> callable:
    """Return a callable that picks a random case from the merged pool."""
    pool = _load_scenarios() + _build_ui_cases()
    if difficulty != "all":
        pool = [c for c in pool if c["difficulty"] == difficulty]
    def pick() -> dict:
        return random.choice(pool)
    return pick


async def briefing_fn(case: dict) -> str:
    """Run the full pipeline preprocessor chain and return the orchestrator's briefing."""
    loader = CaseEnvironmentLoader(case)
    log_result = await log_analyst_run(loader.for_log_analyst())
    threat_input = loader.for_threat_intel(log_result)
    vuln_result, threat_result = await asyncio.gather(
        vuln_scanner_run(loader.for_vuln_scanner()),
        threat_intel_run(threat_input),
    )
    orchestrator_result = await orchestrator_run({
        "goal": case["goal"],
        "log_analysis": log_result,
        "vuln_analysis": vuln_result,
        "threat_analysis": threat_result,
    })
    return orchestrator_result.get("briefing_for_target_agent", json.dumps(orchestrator_result))


async def judge_fn(goal: str, ground_truth: dict, briefing: str, response: str) -> dict:
    """Run the judge agent and map its output to the 6 RL reward dimensions."""
    judge_result = await judge_run({
        "goal": goal, "ground_truth": ground_truth, "target_response": response,
    })
    algo = judge_result.get("algorithmic", {})
    qual = judge_result.get("qualitative", {})
    return {
        "accuracy": algo.get("technique_match", 0),
        "completeness": algo.get("completeness", 0),
        "actionability": algo.get("action_match", 0),
        "technical_depth": qual.get("technical_depth", 0),
        "mitre_alignment": algo.get("technique_match", 0),
        "relevance": (algo.get("root_cause_match", 0) + algo.get("blast_radius_match", 0)) / 2,
        "overall": judge_result.get("overall", 0),
        "verdict": judge_result.get("verdict", "unknown"),
        "strengths": judge_result.get("strengths", ""),
        "gaps": judge_result.get("gaps", ""),
        "recommendation": judge_result.get("recommendation", ""),
    }


async def llm_fn(prompt: str) -> str:
    """Calls the target LLM (Groq) as the cybersecurity incident responder."""
    return await llm_call(
        system="You are a senior cybersecurity incident responder.",
        user_message=prompt, max_tokens=4096,
    )
```

---

## `config.py`

```python
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class RLConfig:
    """All knobs for the reinforcement learning self-improvement loop."""
    max_episodes: int = 50
    warmup_episodes: int = 3
    eval_every: int = 5
    early_stop_threshold: float = 90.0
    reward_weights: dict = field(default_factory=lambda: {
        "accuracy": 0.25, "completeness": 0.20, "actionability": 0.20,
        "technical_depth": 0.15, "mitre_alignment": 0.10, "relevance": 0.10,
    })
    reward_baseline: float = 50.0
    reward_scale: float = 0.01
    buffer_capacity: int = 200
    top_k_examples: int = 3
    min_score_for_exemplar: float = 75.0
    curriculum_enabled: bool = True
    difficulty_order: list = field(default_factory=lambda: ["easy", "medium", "hard"])
    promote_threshold: float = 70.0
    checkpoint_dir: str = "rl_checkpoints"
    save_every: int = 5
    verbose: bool = True
    log_file: Optional[str] = "rl_training.log"
```

---

## `environment.py`

```python
"""
Gym-style RL environment that wraps the full evaluation pipeline.

Lifecycle of one episode:
  1. env.reset()       → picks a scenario, returns the initial observation
  2. env.step(action)  → sends the agent's response through the judge,
                          returns (observation, reward, done, info)
"""

from dataclasses import dataclass
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
    def __init__(self, config, case_picker, briefing_fn, judge_fn): ...
    async def reset(self) -> Observation: ...
    async def step(self, action: str) -> StepResult: ...
    def get_curriculum_difficulty(self) -> str: ...
    def maybe_promote_curriculum(self): ...
    def save_checkpoint(self, directory: str): ...
    def load_checkpoint(self, directory: str): ...
```

---

## `experience_buffer.py`

```python
"""Experience replay buffer for the LLM self-improvement loop."""

from dataclasses import dataclass, asdict
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
    judge_strengths: str
    judge_gaps: str
    judge_recommendation: str
    prompt_version: int
    _fingerprint: str = ""


class ExperienceBuffer:
    """Fixed-capacity ring buffer with ranked retrieval."""
    def __init__(self, capacity=200, min_score_for_exemplar=75.0): ...
    def add(self, episode: Episode): ...
    def top_k(self, k=3, exclude_case_id=None) -> list[Episode]: ...
    def worst_k(self, k=3) -> list[Episode]: ...
    def best_for_dimension(self, dimension, k=2) -> list[Episode]: ...
    def recent(self, k=5) -> list[Episode]: ...
    def by_case(self, case_id) -> list[Episode]: ...
    def by_difficulty(self, difficulty) -> list[Episode]: ...
    def avg_score(self, last_n=None) -> float: ...
    def dimension_averages(self, last_n=None) -> dict[str, float]: ...
    def weakest_dimension(self, last_n=10) -> str: ...
    def pass_rate(self, last_n=None) -> float: ...
    def score_trajectory(self) -> list[float]: ...
    def save(self, path: str): ...
    def load(self, path: str): ...
```

---

## `reward.py`

```python
"""
Reward computation and shaping.
Takes the judge's raw multi-dimensional scores (0-100 each) and produces
a single scalar reward suitable for driving the self-improvement loop.
"""

from dataclasses import dataclass, field

SCORE_DIMENSIONS = [
    "accuracy", "completeness", "actionability",
    "technical_depth", "mitre_alignment", "relevance",
]


@dataclass
class RewardSignal:
    raw_overall: float
    shaped_reward: float
    dimension_scores: dict[str, float]
    dimension_deltas: dict[str, float]
    weakest_dimension: str
    strongest_dimension: str
    streak: int
    verdict: str


class RewardShaper:
    """Converts judge output into shaped reward signals."""
    def __init__(self, weights, baseline, scale): ...
    def compute(self, judge_output: dict) -> RewardSignal: ...
    def reset(self): ...


def compute_improvement_rate(history: list[RewardSignal]) -> dict: ...
```

---

## `run_training.py`

```python
"""
Standalone RL self-improvement loop entry point.

Usage:
    python -m rl.run_training
    python -m rl.run_training --episodes 10 --difficulty easy
"""

import argparse, asyncio, json
from rl.config import RLConfig
from rl.trainer import run_training
from rl.bridge import make_case_picker, briefing_fn, judge_fn, llm_fn


async def main():
    parser = argparse.ArgumentParser(description="CyberBench RL Self-Improvement Training")
    parser.add_argument("--episodes", type=int, default=10)
    parser.add_argument("--difficulty", type=str, default="all")
    parser.add_argument("--eval-every", type=int, default=3)
    parser.add_argument("--early-stop", type=float, default=95.0)
    parser.add_argument("--checkpoint-dir", type=str, default="rl_checkpoints")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    config = RLConfig(
        max_episodes=args.episodes,
        warmup_episodes=min(2, args.episodes),
        eval_every=args.eval_every,
        save_every=max(1, args.episodes // 3),
        early_stop_threshold=args.early_stop,
        verbose=not args.quiet,
        checkpoint_dir=args.checkpoint_dir,
        curriculum_enabled=(args.difficulty == "all"),
    )

    summary = await run_training(
        config=config,
        case_picker=make_case_picker(args.difficulty),
        briefing_fn=briefing_fn,
        judge_fn=judge_fn,
        llm_fn=llm_fn,
    )
    print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
```

---

## `trainer.py`

```python
"""
Training loop that drives the RL self-improvement cycle.
"""

from rl.config import RLConfig
from rl.environment import RLEnvironment, Observation
from rl.reward import RewardSignal, compute_improvement_rate

TARGET_AGENT_BASE_PROMPT = """You are a senior cybersecurity incident responder.
...
GOAL: {goal}
BRIEFING: {briefing}
...
"""


class Trainer:
    def __init__(self, config, env, llm_fn, on_episode_end=None): ...
    async def train(self) -> dict: ...
    def _build_prompt(self, obs) -> str: ...
    def _log_progress(self): ...
    def _build_summary(self, elapsed_sec) -> dict: ...
    def _log(self, msg): ...


async def run_training(config, case_picker, briefing_fn, judge_fn, llm_fn) -> dict:
    env = RLEnvironment(config=config, case_picker=case_picker, briefing_fn=briefing_fn, judge_fn=judge_fn)
    trainer = Trainer(config=config, env=env, llm_fn=llm_fn)
    return await trainer.train()
```
