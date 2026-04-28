"""
cyberbench_env/server/app.py — FastAPI application entry-point.

Run with:
    uvicorn cyberbench_env.server.app:app --host 0.0.0.0 --port 8000
"""

try:
    from openenv.core.env_server import create_app  # type: ignore

    from cyberbench_env.models import AnalyzeAction, CyberObservation
    from cyberbench_env.server.cyberbench_environment import CyberBenchEnvironment

    app = create_app(
        env=lambda: CyberBenchEnvironment(difficulty="all"),
        action_cls=AnalyzeAction,
        observation_cls=CyberObservation,
        env_name="cyberbench",
    )
except Exception:  # pragma: no cover — openenv not installed
    from fastapi import FastAPI

    app = FastAPI(title="CyberBench OpenEnv (stub)")

    @app.get("/")
    async def _missing():
        return {
            "error": "openenv-core not installed",
            "hint": "pip install openenv-core to enable the OpenEnv server",
        }
