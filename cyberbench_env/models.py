"""
cyberbench_env/models.py — Pydantic models for the CyberBench OpenEnv environment.
"""

from typing import Any, Dict, Optional

from pydantic import Field

try:
    from openenv.core.env_server.types import Action, Observation, State  # type: ignore
except Exception:  # pragma: no cover — openenv not installed
    from pydantic import BaseModel as _BM

    class Action(_BM):  # type: ignore
        pass

    class Observation(_BM):  # type: ignore
        done: bool = False
        reward: Optional[float] = None

    class State(_BM):  # type: ignore
        episode_id: Optional[str] = None
        step_count: int = 0


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
