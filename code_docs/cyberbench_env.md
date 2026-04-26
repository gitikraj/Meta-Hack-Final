# cyberbench_env/ — OpenEnv Gymnasium-Style Environment

## Folder Structure

```
cyberbench_env/
├── __init__.py
├── client.py
├── models.py
├── openenv.yaml
└── server/
    ├── __init__.py
    ├── app.py
    └── cyberbench_environment.py
```

---

## `__init__.py`

```python
"""
CyberBench OpenEnv Environment — wraps the multi-agent security analysis
pipeline as a Gymnasium-style OpenEnv environment for RL training.
"""

from cyberbench_env.models import AnalyzeAction, CyberObservation, CyberState

__all__ = ["AnalyzeAction", "CyberObservation", "CyberState"]
```

---

## `client.py`

```python
"""
cyberbench_env/client.py — OpenEnv WebSocket client for CyberBench.

Usage (async):
    async with CyberBenchClient(base_url="ws://localhost:8000") as env:
        result = await env.reset()
        print(result.observation.briefing)
        result = await env.step(AnalyzeAction(response_text="My analysis..."))
        print(result.reward, result.observation.scores)

Usage (sync wrapper):
    env = CyberBenchClient(base_url="ws://localhost:8000").sync()
    with env:
        result = env.reset()
        result = env.step(AnalyzeAction(response_text="My analysis..."))
"""

from typing import Any, Dict

from openenv.core.client_types import StepResult
from openenv.core.env_client import EnvClient

from cyberbench_env.models import AnalyzeAction, CyberObservation, CyberState


class CyberBenchClient(EnvClient[AnalyzeAction, CyberObservation, CyberState]):
    """WebSocket client that talks to the CyberBench OpenEnv server."""

    def _step_payload(self, action: AnalyzeAction) -> Dict[str, Any]:
        return action.model_dump()

    def _parse_result(self, payload: Dict[str, Any]) -> StepResult[CyberObservation]:
        obs = CyberObservation.model_validate(payload)
        return StepResult(
            observation=obs,
            reward=obs.reward,
            done=obs.done,
        )

    def _parse_state(self, payload: Dict[str, Any]) -> CyberState:
        return CyberState.model_validate(payload)
```

---

## `models.py`

```python
"""
cyberbench_env/models.py — Pydantic models for the CyberBench OpenEnv environment.

Action:      The agent's incident-response text.
Observation: Case briefing + optional judge scores after a step.
State:       Internal environment bookkeeping exposed via the /state endpoint.
"""

from typing import Any, Dict, Optional

from pydantic import Field

from openenv.core.env_server.types import Action, Observation, State


class AnalyzeAction(Action):
    """Agent submits an incident-response analysis as free-form text."""

    response_text: str = Field(
        ..., description="The agent's full incident-response analysis"
    )


class CyberObservation(Observation):
    """Returned on reset (briefing only) and after step (briefing + scores)."""

    case_id: str = Field(default="", description="Scenario identifier")
    goal: str = Field(default="", description="What the agent must investigate")
    difficulty: str = Field(default="", description="easy | medium | hard")
    category: str = Field(default="", description="incident | network | malware | appsec")
    briefing: str = Field(default="", description="Synthesised briefing from preprocessor agents")
    scores: Dict[str, Any] = Field(
        default_factory=dict,
        description="Judge scores after a step (empty on reset)",
    )


class CyberState(State):
    """Internal environment state surfaced via GET /state."""

    current_case_id: Optional[str] = Field(default=None, description="Active case")
    current_difficulty: str = Field(default="all", description="Active difficulty filter")
    total_episodes: int = Field(default=0, description="Episodes completed so far")
    avg_score_last_10: float = Field(default=0.0, description="Rolling average score")
```

---

## `openenv.yaml`

```yaml
name: cyberbench
description: >
  CyberBench — multi-agent cybersecurity incident analysis environment.
  An RL agent receives a synthesised briefing (log analysis + vuln scan +
  threat intel) and must produce a high-quality incident response that is
  scored by an AI judge.

version: "1.0.0"

server:
  module: cyberbench_env.server.app
  attribute: app
  port: 8000

client:
  module: cyberbench_env.client
  class: CyberBenchClient

models:
  action: cyberbench_env.models.AnalyzeAction
  observation: cyberbench_env.models.CyberObservation
  state: cyberbench_env.models.CyberState
```

---

## `server/__init__.py`

```python
# (empty)
```

---

## `server/app.py`

```python
"""
cyberbench_env/server/app.py — FastAPI application entry-point.

Run with:
    uvicorn cyberbench_env.server.app:app --host 0.0.0.0 --port 8000
"""

from openenv.core.env_server import create_app

from cyberbench_env.models import AnalyzeAction, CyberObservation
from cyberbench_env.server.cyberbench_environment import CyberBenchEnvironment

app = create_app(
    env=lambda: CyberBenchEnvironment(difficulty="all"),
    action_cls=AnalyzeAction,
    observation_cls=CyberObservation,
    env_name="cyberbench",
)
```

---

## `server/cyberbench_environment.py`

```python
"""
cyberbench_env/server/cyberbench_environment.py

OpenEnv Environment subclass that wraps the CyberBench multi-agent pipeline.

reset  → picks a scenario, runs preprocessor agents, returns a briefing.
step   → judges the agent's incident response, returns reward + observation.
state  → current episode bookkeeping.
"""

from __future__ import annotations

import asyncio
from typing import Any, Optional

from openenv.core.env_server import Environment

from cyberbench_env.models import AnalyzeAction, CyberObservation, CyberState
from rl.bridge import briefing_fn, judge_fn, make_case_picker


class CyberBenchEnvironment(
    Environment[AnalyzeAction, CyberObservation, CyberState]
):
    """
    Gymnasium-style environment exposing the CyberBench pipeline over OpenEnv.

    Each episode:
      1. reset()  → pick a case, run log_analyst → vuln_scanner + threat_intel
                     → orchestrator, return the synthesised briefing.
      2. step()   → receive the agent's written response, run the judge,
                     return the reward and a final observation.
    """

    SUPPORTS_CONCURRENT_SESSIONS = False  # stateful — one episode at a time

    def __init__(self, difficulty: str = "all") -> None:
        super().__init__()
        self._difficulty = difficulty
        self._case_picker = make_case_picker(difficulty)
        self._current_case: Optional[dict] = None
        self._current_briefing: str = ""
        self._episode_count: int = 0
        self._last_scores: dict[str, Any] = {}
        self._score_history: list[float] = []

    # ── reset (sync — required by ABC) ──────────────────────────
    def reset(
        self,
        seed: Optional[int] = None,
        episode_id: Optional[str] = None,
        **kwargs: Any,
    ) -> CyberObservation:
        return asyncio.get_event_loop().run_until_complete(
            self.reset_async(seed=seed, episode_id=episode_id, **kwargs)
        )

    # ── reset_async (true implementation) ───────────────────────
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
        return self._apply_transform(obs)

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

    # ── step_async (true implementation) ────────────────────────
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
            done=True,  # single-turn: episode ends after one response
            reward=overall,
        )

        self._current_case = None
        return self._apply_transform(obs)

    # ── state property ──────────────────────────────────────────
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
```
