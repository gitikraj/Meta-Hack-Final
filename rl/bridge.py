"""
Bridge between the RL training loop and the existing CyberBench pipeline.
"""

import asyncio
import json
import os
import random
import sys
from pathlib import Path

from agents.utils import llm_call
from agents.log_analyst import run as log_analyst_run
from agents.vuln_scanner import run as vuln_scanner_run
from agents.threat_intel import run as threat_intel_run
from agents.orchestrator import run as orchestrator_run
from agents.judge import run as judge_run
from pipeline.env_loader import CaseEnvironmentLoader

SCENARIOS_PATH = os.environ.get("SCENARIOS_PATH", "data/scenarios.json")


def _load_scenarios() -> list:
    if not os.path.exists(SCENARIOS_PATH):
        return []
    try:
        with open(SCENARIOS_PATH, "r") as f:
            return [s for s in json.load(f) if s.get("active", True)]
    except Exception:
        return []


def _build_ui_cases() -> list:
    """Build minimal cases from the UI ground truth pool, if available."""
    try:
        from server.ground_truth import KNOWN_TRUTHS, GOALS, SHARED_ASSETS, SHARED_REQUIREMENTS
    except Exception:
        return []

    cases = []
    for trigger_type, gt in KNOWN_TRUTHS.items():
        case = {
            "case_id": f"ui_{trigger_type.lower()}",
            "goal": GOALS.get(trigger_type, "Investigate the security incident"),
            "difficulty": "medium",
            "category": "incident",
            "tags": [trigger_type.lower(), "ui_pool"],
            "active": True,
            "environment": {
                "os": "Mixed",
                "network_range": "10.10.2.0/24",
                "assets": SHARED_ASSETS,
            },
            "requirements_file": SHARED_REQUIREMENTS,
            "logs": {"auth_logs": [], "network_logs": [], "system_logs": []},
            "known_truth": gt,
        }
        cases.append(case)
    return cases


def make_case_picker(difficulty: str = "all"):
    """Return a callable that picks a random case from the merged pool."""
    pool = _load_scenarios() + _build_ui_cases()
    if difficulty != "all":
        pool = [c for c in pool if c.get("difficulty") == difficulty]
    if not pool:
        # Fallback: scenarios.json only
        pool = _load_scenarios()

    def pick() -> dict:
        if not pool:
            raise RuntimeError("No cases available for RL training")
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
