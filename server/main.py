"""
FastAPI backend for CyberBench UI <-> Pipeline integration.

Endpoints:
  POST /api/pipeline/trigger      - Accept UI logs + trigger, start pipeline async
  GET  /api/pipeline/results/{id} - Poll for pipeline results
  GET  /api/leaderboard           - Return leaderboard data
  POST /api/rl/train              - Start RL training
  GET  /api/rl/status             - RL training status + buffer stats
  POST /api/rl/stop               - Stop RL training
  GET  /api/history/{agent_name}  - Agent run history
  GET  /api/health                - Health check
"""

import asyncio
import os
import sys
import uuid
import traceback
from typing import Any, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from dotenv import load_dotenv
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

from server.pipeline_bridge import run_ui_pipeline
from pipeline.metrics import get_leaderboard, get_agent_history
from pipeline.runner import get_rl_buffer

app = FastAPI(title="CyberBench Pipeline API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── In-memory store for run state ──────────────────────────────────
pipeline_runs: dict = {}

# ── In-memory store for RL training state ──────────────────────────
rl_state: dict = {
    "status": "idle",
    "episode": 0,
    "max_episodes": 0,
    "current_score": 0.0,
    "summary": None,
    "error": None,
    "task": None,  # asyncio.Task
}


# ─────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────
class TriggerRequest(BaseModel):
    trigger_type: str
    detail: Optional[str] = ""
    meta: Optional[dict] = None
    logs: list
    session_ip: Optional[str] = None
    agent_name: Optional[str] = "CyberBench-UI-Agent"
    agent_description: Optional[str] = "Target agent being evaluated via the CyberBench interactive UI."


class TriggerResponse(BaseModel):
    run_id: str
    status: str


class RLTrainRequest(BaseModel):
    episodes: int = 10
    difficulty: str = "all"
    early_stop: float = 95.0


# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────
def _initial_agents() -> list:
    return [
        {"key": "log_analyst", "name": "Log Analyst", "role": "Reads raw logs", "icon": "📜", "status": "queued", "detail": ""},
        {"key": "vuln_scanner", "name": "Vuln Scanner", "role": "Static asset/dep scan", "icon": "🔧", "status": "queued", "detail": ""},
        {"key": "threat_intel", "name": "Threat Intel", "role": "IOC + actor lookup", "icon": "🛰", "status": "queued", "detail": ""},
        {"key": "orchestrator", "name": "Orchestrator", "role": "Synthesizes briefing", "icon": "🧩", "status": "queued", "detail": ""},
        {"key": "target_agent", "name": "Target Agent", "role": "Generates response", "icon": "🛡", "status": "queued", "detail": ""},
        {"key": "judge", "name": "Judge", "role": "Scores response", "icon": "⚖", "status": "queued", "detail": ""},
    ]


def _set_agent_status(run_id: str, key: str, status: str, detail: str = ""):
    state = pipeline_runs.get(run_id)
    if not state:
        return
    for a in state.get("agents", []):
        if a["key"] == key:
            a["status"] = status
            if detail:
                a["detail"] = detail
            break


async def _execute_pipeline(run_id: str, req: TriggerRequest):
    """Run pipeline in background, updating run state along the way."""
    state = pipeline_runs[run_id]
    try:
        # Mark agents progressing — we don't get fine-grained callbacks from
        # run_pipeline, so we use a coarse heuristic
        state["stage"] = "Building case from UI logs..."

        # Execute the full pipeline. We update agent statuses based on stage timing
        # by spawning a small monitor task.
        async def stage_watcher():
            stages = [
                ("log_analyst", "Reading raw logs..."),
                ("vuln_scanner", "Scanning assets and dependencies..."),
                ("threat_intel", "Looking up IOCs and threat actors..."),
                ("orchestrator", "Synthesizing briefing..."),
                ("target_agent", "Generating response..."),
                ("judge", "Scoring response..."),
            ]
            for i, (key, msg) in enumerate(stages):
                if state.get("status") != "running":
                    return
                _set_agent_status(run_id, key, "running", msg)
                state["stage"] = f"Stage {i+1}/6 - {msg}"
                # mark previous one as done
                if i > 0:
                    _set_agent_status(run_id, stages[i - 1][0], "done")
                # Sleep proportionally
                await asyncio.sleep(2.0)

        watcher = asyncio.create_task(stage_watcher())
        try:
            result = await run_ui_pipeline(
                trigger_type=req.trigger_type,
                ui_logs=req.logs,
                agent_name=req.agent_name or "CyberBench-UI-Agent",
                agent_description=req.agent_description or "Target agent being evaluated via the CyberBench interactive UI.",
            )
        finally:
            watcher.cancel()
            try:
                await watcher
            except Exception:
                pass

        # Mark all done
        for a in state.get("agents", []):
            if a["status"] != "failed":
                a["status"] = "done"

        state.update({
            "status": "completed",
            "stage": "Pipeline complete",
            "case_id": result.get("case_id", ""),
            "difficulty": result.get("difficulty", ""),
            "category": result.get("category", ""),
            "scores": result.get("scores", {}),
            "verdict": result.get("verdict", "unknown"),
            "strengths": result.get("strengths", ""),
            "gaps": result.get("gaps", ""),
            "recommendation": result.get("recommendation", ""),
            "agent_confidence": result.get("agent_confidence", {}),
            "processing_times_ms": result.get("processing_times_ms", {}),
            "rl_feedback": result.get("rl_feedback"),
            "target_response": result.get("target_response", ""),
            "raw": result,
        })
    except Exception as e:
        traceback.print_exc()
        for a in state.get("agents", []):
            if a["status"] == "running":
                a["status"] = "failed"
                a["detail"] = str(e)
        state.update({
            "status": "failed",
            "stage": "error",
            "error": str(e),
        })


# ─────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/pipeline/trigger", response_model=TriggerResponse)
async def trigger_pipeline(req: TriggerRequest):
    run_id = str(uuid.uuid4())
    pipeline_runs[run_id] = {
        "run_id": run_id,
        "status": "running",
        "stage": "Submitted",
        "agents": _initial_agents(),
    }
    asyncio.create_task(_execute_pipeline(run_id, req))
    return TriggerResponse(run_id=run_id, status="running")


@app.get("/api/pipeline/results/{run_id}")
async def get_result(run_id: str):
    state = pipeline_runs.get(run_id)
    if not state:
        return {"run_id": run_id, "status": "unknown"}
    return state


@app.get("/api/leaderboard")
async def leaderboard(sort_by: str = "overall", top: int = 50):
    return get_leaderboard(sort_by=sort_by, top_n=top)


@app.get("/api/pool")
async def scenario_pool():
    """Return the list of available scenarios for the Cases browser."""
    import json as _json
    scenarios_path = os.path.join(PROJECT_ROOT, "data", "scenarios.json")
    try:
        with open(scenarios_path) as f:
            scenarios = _json.load(f)
        return [
            {
                "case_id": s["case_id"],
                "goal": s["goal"],
                "difficulty": s["difficulty"],
                "category": s["category"],
                "tags": s.get("tags", []),
            }
            for s in scenarios
        ]
    except Exception as e:
        return []


@app.get("/api/cases")
async def cases():
    return await scenario_pool()


@app.get("/api/history/{agent_name}")
async def agent_history(agent_name: str):
    return {"agent_name": agent_name, "entries": get_agent_history(agent_name)}


# ── RL endpoints ───────────────────────────────────────────────────
async def _rl_train_runner(req: RLTrainRequest):
    from rl.config import RLConfig
    from rl.trainer import run_training
    from rl.bridge import make_case_picker, briefing_fn, judge_fn, llm_fn

    rl_state["status"] = "running"
    rl_state["episode"] = 0
    rl_state["max_episodes"] = req.episodes
    rl_state["current_score"] = 0.0
    rl_state["summary"] = None
    rl_state["error"] = None

    try:
        config = RLConfig(
            max_episodes=req.episodes,
            warmup_episodes=min(2, req.episodes),
            eval_every=max(1, req.episodes // 3),
            save_every=max(1, req.episodes // 3),
            early_stop_threshold=req.early_stop,
            verbose=True,
            checkpoint_dir="rl_checkpoints",
            curriculum_enabled=(req.difficulty == "all"),
        )
        summary = await run_training(
            config=config,
            case_picker=make_case_picker(req.difficulty),
            briefing_fn=briefing_fn,
            judge_fn=judge_fn,
            llm_fn=llm_fn,
        )
        rl_state["summary"] = summary
        rl_state["status"] = "completed"
    except asyncio.CancelledError:
        rl_state["status"] = "stopped"
        raise
    except Exception as e:
        traceback.print_exc()
        rl_state["status"] = "failed"
        rl_state["error"] = str(e)


@app.post("/api/rl/train")
async def rl_train(req: RLTrainRequest):
    if rl_state.get("status") == "running":
        return {"status": "already_running", "episode": rl_state.get("episode", 0)}
    task = asyncio.create_task(_rl_train_runner(req))
    rl_state["task"] = task
    return {"status": "started", "max_episodes": req.episodes}


@app.get("/api/rl/status")
async def rl_status():
    buf = get_rl_buffer()
    traj = buf.score_trajectory()
    return {
        "status": rl_state.get("status", "idle"),
        "episode": len(traj),
        "max_episodes": rl_state.get("max_episodes", 0),
        "current_score": traj[-1] if traj else 0.0,
        "buffer_size": buf.size,
        "avg_score": buf.avg_score(last_n=10),
        "pass_rate": buf.pass_rate(),
        "score_trajectory": traj,
        "dimension_averages": buf.dimension_averages(last_n=20),
        "summary": rl_state.get("summary"),
        "error": rl_state.get("error"),
    }


@app.post("/api/rl/stop")
async def rl_stop():
    task = rl_state.get("task")
    if task and not task.done():
        task.cancel()
        rl_state["status"] = "stopped"
        return {"status": "stopped"}
    return {"status": rl_state.get("status", "idle")}
