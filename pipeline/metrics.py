import json
import os
from datetime import datetime, timezone
from pathlib import Path

LEADERBOARD_PATH = "data/leaderboard.json"


def _load_leaderboard() -> list:
    if os.path.exists(LEADERBOARD_PATH):
        with open(LEADERBOARD_PATH, "r") as f:
            return json.load(f)
    return []


def _save_leaderboard(entries: list):
    Path(LEADERBOARD_PATH).parent.mkdir(parents=True, exist_ok=True)
    with open(LEADERBOARD_PATH, "w") as f:
        json.dump(entries, f, indent=2, default=str)


def compute_metrics(
    case: dict,
    agent_name: str,
    log_result: dict,
    vuln_result: dict,
    threat_result: dict,
    orchestrator_result: dict,
    target_result: dict,
    judge_result: dict,
) -> dict:
    algo = judge_result.get("algorithmic", {})
    qual = judge_result.get("qualitative", {})

    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent_name": agent_name,
        "case_id": case["case_id"],
        "difficulty": case["difficulty"],
        "category": case["category"],
        "scores": {
            "overall": judge_result.get("overall", 0),
            "algorithmic_total": algo.get("total", 0),
            "technique_match": algo.get("technique_match", 0),
            "ioc_match": algo.get("ioc_match", 0),
            "action_match": algo.get("action_match", 0),
            "root_cause_match": algo.get("root_cause_match", 0),
            "blast_radius_match": algo.get("blast_radius_match", 0),
            "completeness": algo.get("completeness", 0),
            "qualitative_total": qual.get("total", 0),
            "reasoning_quality": qual.get("reasoning_quality", 0),
            "actionability": qual.get("actionability", 0),
            "technical_depth": qual.get("technical_depth", 0),
        },
        "verdict": judge_result.get("verdict", "unknown"),
        "strengths": judge_result.get("strengths", ""),
        "gaps": judge_result.get("gaps", ""),
        "recommendation": judge_result.get("recommendation", ""),
        "target_response": target_result.get("response", ""),
        "pipeline_stats": {
            "suspicious_entries": log_result.get("suspicious_entry_count", 0),
            "total_log_entries": log_result.get("total_entry_count", 0),
            "asset_vulns": len(vuln_result.get("asset_vulnerabilities", [])),
            "dep_vulns": len(vuln_result.get("dependency_vulnerabilities", [])),
            "iocs_analyzed": len(threat_result.get("ioc_analysis", [])),
            "target_response_length": len(target_result.get("response", "")),
        },
        "agent_confidence": {
            "log_analyst": log_result.get("confidence", None),
            "vuln_scanner": vuln_result.get("confidence", None),
            "threat_intel": threat_result.get("confidence", None),
            "orchestrator": orchestrator_result.get("overall_confidence", None),
        },
        "processing_times_ms": {
            "log_analyst": (log_result.get("meta") or {}).get("processing_time_ms"),
            "vuln_scanner": (vuln_result.get("meta") or {}).get("processing_time_ms"),
            "threat_intel": (threat_result.get("meta") or {}).get("processing_time_ms"),
            "orchestrator": (orchestrator_result.get("meta") or {}).get("processing_time_ms"),
            "target_agent": (target_result.get("meta") or {}).get("processing_time_ms"),
            "judge": (judge_result.get("meta") or {}).get("processing_time_ms"),
        },
    }

    leaderboard = _load_leaderboard()
    leaderboard.append(entry)
    _save_leaderboard(leaderboard)

    return entry


def get_leaderboard(sort_by: str = "overall", top_n: int = 20) -> list:
    leaderboard = _load_leaderboard()
    leaderboard.sort(
        key=lambda e: e.get("scores", {}).get(sort_by, 0),
        reverse=True,
    )
    return leaderboard[:top_n]


def get_agent_history(agent_name: str) -> list:
    leaderboard = _load_leaderboard()
    return [e for e in leaderboard if e["agent_name"] == agent_name]
