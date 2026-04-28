"""
qwen_training/data_collector.py

Runs the briefing pipeline (Groq agents) + Qwen target agent + Judge
to collect labeled (prompt, response, score) tuples for training.

Each collected episode is stored as:
{
    "prompt":      <full formatted chat prompt fed to Qwen>,
    "response":    <Qwen's raw generated text>,
    "score":       <judge overall 0-100>,
    "verdict":     <pass|partial|fail>,
    "case_id":     <str>,
    "difficulty":  <easy|medium|hard>,
    "judge_full":  <full judge output dict>,
}
"""

import asyncio
import json
import os
import sys
import time
from pathlib import Path
from typing import Optional

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from dotenv import load_dotenv
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

from pipeline.case_selector import CaseSelector
from pipeline.env_loader import CaseEnvironmentLoader
from agents.log_analyst import run as log_analyst_run
from agents.vuln_scanner import run as vuln_scanner_run
from agents.threat_intel import run as threat_intel_run
from agents.orchestrator import run as orchestrator_run
from agents.judge import run as judge_run
from qwen_training.qwen_target_agent import QwenTargetAgent


async def _run_briefing_pipeline(case: dict) -> dict:
    """
    Runs Groq helper agents to produce a briefing.
    Returns orchestrator output (contains briefing_for_target_agent).
    """
    loader = CaseEnvironmentLoader(case)

    log_input = loader.for_log_analyst()
    vuln_input = loader.for_vuln_scanner()

    log_result = await log_analyst_run(log_input)
    threat_input = loader.for_threat_intel(log_result)

    vuln_result, threat_result = await asyncio.gather(
        vuln_scanner_run(vuln_input),
        threat_intel_run(threat_input),
    )

    orchestrator_result = await orchestrator_run({
        "goal": case["goal"],
        "log_analysis": log_result,
        "vuln_analysis": vuln_result,
        "threat_analysis": threat_result,
    })

    return orchestrator_result


async def collect_episode(
    case: dict,
    agent: QwenTargetAgent,
    verbose: bool = True,
) -> dict:
    """
    Run one full episode and return labeled (prompt, response, score) dict.
    """
    if verbose:
        print(f"  [Collect] Case: {case['case_id']} ({case['difficulty']})")

    loader = CaseEnvironmentLoader(case)

    # Step 1: briefing via Groq agents
    t0 = time.time()
    orchestrator_result = await _run_briefing_pipeline(case)
    briefing_time = time.time() - t0

    # Step 2: Qwen generates response
    target_input = loader.for_target_agent(orchestrator_result)
    target_input["agent_name"] = "Qwen-CyberBench"
    target_input["agent_description"] = (
        "A fine-tuned 3B cybersecurity incident response model."
    )

    t1 = time.time()
    prompt = agent.build_prompt(target_input)
    response = agent.generate(prompt)
    qwen_time = time.time() - t1

    # Step 3: Judge scores the response
    ground_truth = loader.ground_truth()
    t2 = time.time()
    judge_result = await judge_run({
        "goal": case["goal"],
        "ground_truth": ground_truth["known_truth"],
        "target_response": response,
    })
    judge_time = time.time() - t2

    score = judge_result.get("overall", 0)
    verdict = judge_result.get("verdict", "fail")

    if verbose:
        print(
            f"  [Collect] Score: {score:.1f} | Verdict: {verdict} | "
            f"Briefing: {briefing_time:.1f}s | Qwen: {qwen_time:.1f}s | Judge: {judge_time:.1f}s"
        )

    return {
        "prompt": prompt,
        "response": response,
        "score": score,
        "verdict": verdict,
        "case_id": case["case_id"],
        "difficulty": case["difficulty"],
        "category": case["category"],
        "goal": case["goal"],
        "judge_full": judge_result,
        "timing": {
            "briefing_s": round(briefing_time, 2),
            "qwen_s": round(qwen_time, 2),
            "judge_s": round(judge_time, 2),
        },
    }


async def collect_dataset(
    n_episodes: int = 20,
    difficulty: str = "all",
    scenarios_path: str = "data/scenarios.json",
    output_path: str = "qwen_training/collected_data.jsonl",
    min_score_to_save: float = 0.0,
    agent: Optional[QwenTargetAgent] = None,
    verbose: bool = True,
) -> list:
    """
    Collect n_episodes and save to JSONL file.
    If min_score_to_save > 0, only saves high-scoring episodes (for RSF).
    """
    if agent is None:
        agent = QwenTargetAgent()

    selector = CaseSelector(scenarios_path, mode="random", difficulty=difficulty)
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    collected = []
    saved = 0

    print(f"\n[DataCollector] Starting {n_episodes} episodes (difficulty={difficulty})")
    print(f"[DataCollector] Output: {output_path}")
    print(f"[DataCollector] Min score to save: {min_score_to_save}\n")

    for ep in range(1, n_episodes + 1):
        case = selector.pick()
        try:
            episode = await collect_episode(case, agent, verbose=verbose)
            collected.append(episode)

            if episode["score"] >= min_score_to_save:
                with open(output_path, "a", encoding="utf-8") as f:
                    f.write(json.dumps(episode) + "\n")
                saved += 1

            print(
                f"  Ep {ep}/{n_episodes} | "
                f"Score={episode['score']:.1f} | "
                f"Saved={saved} | "
                f"AvgScore={sum(e['score'] for e in collected)/len(collected):.1f}"
            )

        except Exception as exc:
            print(f"  [ERROR] Ep {ep} failed: {exc}")

    scores = [e["score"] for e in collected]
    print(f"\n[DataCollector] Done. Episodes={len(collected)} Saved={saved}")
    if scores:
        print(f"[DataCollector] Scores: min={min(scores):.1f} max={max(scores):.1f} avg={sum(scores)/len(scores):.1f}")

    return collected
