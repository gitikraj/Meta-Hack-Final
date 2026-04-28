"""
cyberbench_env/client.py — OpenEnv WebSocket client for CyberBench.
"""

from typing import Any, Dict

try:
    from openenv.core.client_types import StepResult  # type: ignore
    from openenv.core.env_client import EnvClient  # type: ignore
except Exception:  # pragma: no cover — openenv not installed
    StepResult = None
    EnvClient = object

from cyberbench_env.models import AnalyzeAction, CyberObservation, CyberState


if EnvClient is object:
    class CyberBenchClient:
        """Stub used when openenv is not installed."""

        def __init__(self, *_args, **_kwargs):
            raise RuntimeError(
                "openenv-core is not installed. Install with: pip install openenv-core"
            )

else:
    class CyberBenchClient(EnvClient):
        """WebSocket client that talks to the CyberBench OpenEnv server."""

        def _step_payload(self, action: AnalyzeAction) -> Dict[str, Any]:
            return action.model_dump()

        def _parse_result(self, payload: Dict[str, Any]):
            obs = CyberObservation.model_validate(payload)
            return StepResult(
                observation=obs,
                reward=getattr(obs, "reward", None),
                done=getattr(obs, "done", False),
            )

        def _parse_state(self, payload: Dict[str, Any]) -> CyberState:
            return CyberState.model_validate(payload)
