import asyncio
import json
from pipeline.case_selector import CaseSelector
from pipeline.env_loader import CaseEnvironmentLoader
from agents.log_analyst import run as log_analyst_run
from agents.vuln_scanner import run as vuln_scanner_run
from agents.threat_intel import run as threat_intel_run
from agents.orchestrator import run as orchestrator_run
from agents.target_agent import run as target_agent_run
from agents.judge import run as judge_run
from rl.reward import RewardShaper, SCORE_DIMENSIONS
from rl.experience_buffer import ExperienceBuffer, Episode
from pipeline.metrics import compute_metrics
from pipeline.logger import PipelineLogger


async def run_pipeline(
    agent_name: str,
    agent_description: str,
    selector: CaseSelector,
    verbose: bool = True,
) -> dict:

    logger = PipelineLogger(verbose=verbose)

    # ── STAGE 1: pick a case ──
    logger.stage("Case selector")
    case = selector.pick()
    logger.info(f"Selected: {case['case_id']} — {case['goal']}")
    logger.info(f"Difficulty: {case['difficulty']} | Category: {case['category']}")

    # ── STAGE 2: load environment ──
    logger.stage("Environment loader")
    loader = CaseEnvironmentLoader(case)

    # ── STAGE 3: preprocess ──
    logger.stage("Preprocessor")
    log_input = loader.for_log_analyst()
    vuln_input = loader.for_vuln_scanner()

    # ── STAGE 4: log analyst ──
    logger.stage("Log Analyst Agent")
    log_result = await log_analyst_run(log_input)

    # ── STAGE 5: build threat intel input ──
    threat_input = loader.for_threat_intel(log_result)

    # ── STAGE 6: vuln scanner + threat intel in parallel ──
    logger.stage("Vuln Scanner + Threat Intel Agents (parallel)")
    vuln_result, threat_result = await asyncio.gather(
        vuln_scanner_run(vuln_input),
        threat_intel_run(threat_input),
    )

    # ── STAGE 7: orchestrator ──
    logger.stage("Orchestrator — synthesizing")
    orchestrator_result = await orchestrator_run({
        "goal": case["goal"],
        "log_analysis": log_result,
        "vuln_analysis": vuln_result,
        "threat_analysis": threat_result,
    })

    # ── STAGE 8: target agent ──
    logger.stage(f"Target Agent — {agent_name}")
    target_input = loader.for_target_agent(orchestrator_result)
    target_input["agent_name"] = agent_name
    target_input["agent_description"] = agent_description
    target_result = await target_agent_run(target_input)

    # ── STAGE 9: judge ──
    logger.stage("Judge Agent")
    ground_truth = loader.ground_truth()
    judge_result = await judge_run({
        "goal": case["goal"],
        "ground_truth": ground_truth["known_truth"],
        "target_response": target_result.get("response", ""),
    })

    # ── STAGE 10: metrics + leaderboard ──
    logger.stage("Metrics + Leaderboard")
    final = compute_metrics(
        case=case, agent_name=agent_name,
        log_result=log_result, vuln_result=vuln_result,
        threat_result=threat_result, orchestrator_result=orchestrator_result,
        target_result=target_result, judge_result=judge_result,
    )

    # ── STAGE 11: RL feedback ──
    logger.stage("RL Feedback")
    try:
        rl_feedback = _store_rl_episode(
            case=case,
            briefing=orchestrator_result.get("briefing_for_target_agent", ""),
            response=target_result.get("response", ""),
            judge_result=judge_result,
        )
        final["rl_feedback"] = rl_feedback
    except Exception as e:
        logger.info(f"RL feedback skipped: {e}")
        final["rl_feedback"] = None

    return final


# ── RL integration ─────────────────────────────────────────────────

_rl_buffer = ExperienceBuffer(capacity=200, min_score_for_exemplar=75.0)
_rl_shaper = RewardShaper(
    weights={
        "accuracy": 0.25, "completeness": 0.20, "actionability": 0.20,
        "technical_depth": 0.15, "mitre_alignment": 0.10, "relevance": 0.10,
    },
    baseline=50.0, scale=0.01,
)
_rl_episode_counter = 0


def _store_rl_episode(case: dict, briefing: str, response: str, judge_result: dict) -> dict:
    """Map judge output to RL dimensions, compute reward, store in buffer."""
    global _rl_episode_counter
    _rl_episode_counter += 1

    algo = judge_result.get("algorithmic", {})
    qual = judge_result.get("qualitative", {})

    rl_scores = {
        "accuracy": algo.get("technique_match", 0),
        "completeness": algo.get("completeness", 0),
        "actionability": algo.get("action_match", 0),
        "technical_depth": qual.get("technical_depth", 0),
        "mitre_alignment": algo.get("technique_match", 0),
        "relevance": (algo.get("root_cause_match", 0) + algo.get("blast_radius_match", 0)) / 2,
        "overall": judge_result.get("overall", 0),
        "verdict": judge_result.get("verdict", "unknown"),
    }

    reward = _rl_shaper.compute(rl_scores)

    episode = Episode(
        episode_id=_rl_episode_counter,
        case_id=case["case_id"], difficulty=case["difficulty"],
        category=case["category"], goal=case["goal"],
        briefing=briefing, response=response, reward=reward,
        judge_strengths=judge_result.get("strengths", ""),
        judge_gaps=judge_result.get("gaps", ""),
        judge_recommendation=judge_result.get("recommendation", ""),
        prompt_version=0,
    )
    _rl_buffer.add(episode)

    from pathlib import Path
    ckpt = "rl_checkpoints"
    Path(ckpt).mkdir(parents=True, exist_ok=True)
    _rl_buffer.save(f"{ckpt}/buffer.json")

    return {
        "episode_id": _rl_episode_counter,
        "shaped_reward": reward.shaped_reward,
        "raw_overall": reward.raw_overall,
        "verdict": reward.verdict,
        "weakest_dimension": reward.weakest_dimension,
        "strongest_dimension": reward.strongest_dimension,
        "dimension_scores": reward.dimension_scores,
        "streak": reward.streak,
        "buffer_size": _rl_buffer.size,
        "avg_score": _rl_buffer.avg_score(last_n=10),
        "pass_rate": _rl_buffer.pass_rate(),
    }


def get_rl_buffer() -> ExperienceBuffer:
    """Expose the RL buffer for the API server."""
    return _rl_buffer
