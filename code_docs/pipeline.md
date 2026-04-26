# pipeline/ — 10-Stage Pipeline

## Folder Structure

```
pipeline/
├── __init__.py
├── case_selector.py
├── env_loader.py
├── logger.py
├── metrics.py
├── runner.py
└── semantic.py
```

---

## `__init__.py`

```python
# (empty)
```

---

## `case_selector.py`

```python
import json
import random
from pathlib import Path
from typing import Optional


class CaseSelector:
    def __init__(
        self,
        scenarios_path: str = "data/scenarios.json",
        mode: str = "random",
        difficulty: str = "all",
        category: str = "all",
        tags: Optional[list] = None,
        case_id: Optional[str] = None,
    ):
        self.mode = mode
        self.difficulty = difficulty
        self.category = category
        self.tags = tags or []
        self.case_id = case_id
        self._cursor = 0

        with open(scenarios_path, "r") as f:
            all_scenarios = json.load(f)

        self.pool = [s for s in all_scenarios if s.get("active", True)]

    def _apply_filters(self) -> list:
        filtered = self.pool

        if self.difficulty != "all":
            filtered = [s for s in filtered if s["difficulty"] == self.difficulty]

        if self.category != "all":
            filtered = [s for s in filtered if s["category"] == self.category]

        if self.tags:
            filtered = [
                s for s in filtered
                if any(tag in s.get("tags", []) for tag in self.tags)
            ]

        return filtered

    def pick(self) -> dict:
        if self.mode == "manual":
            if not self.case_id:
                raise ValueError("manual mode requires case_id to be set")
            match = [s for s in self.pool if s["case_id"] == self.case_id]
            if not match:
                raise ValueError(f"case_id {self.case_id} not found in pool")
            return match[0]

        filtered = self._apply_filters()

        if not filtered:
            raise ValueError(
                f"No cases match filters: difficulty={self.difficulty} "
                f"category={self.category} tags={self.tags}"
            )

        if self.mode == "random":
            return random.choice(filtered)

        if self.mode == "sequential":
            case = filtered[self._cursor % len(filtered)]
            self._cursor += 1
            return case

        raise ValueError(f"Unknown mode: {self.mode}")

    def pick_all(self) -> list:
        return self._apply_filters()

    def pool_summary(self) -> dict:
        filtered = self._apply_filters()
        return {
            "total_in_pool": len(self.pool),
            "matching_filters": len(filtered),
            "by_difficulty": {
                "easy":   len([s for s in filtered if s["difficulty"] == "easy"]),
                "medium": len([s for s in filtered if s["difficulty"] == "medium"]),
                "hard":   len([s for s in filtered if s["difficulty"] == "hard"]),
            },
            "by_category": {
                cat: len([s for s in filtered if s["category"] == cat])
                for cat in set(s["category"] for s in filtered)
            },
            "case_ids": [s["case_id"] for s in filtered],
        }
```

---

## `env_loader.py`

```python
class CaseEnvironmentLoader:
    def __init__(self, case: dict):
        self.case = case

    def for_log_analyst(self) -> dict:
        return {
            "case_id": self.case["case_id"],
            "goal": self.case["goal"],
            "logs": self.case["logs"],
        }

    def for_vuln_scanner(self) -> dict:
        return {
            "case_id": self.case["case_id"],
            "goal": self.case["goal"],
            "assets": self.case["environment"]["assets"],
            "requirements_file": self.case["requirements_file"],
        }

    def for_threat_intel(self, log_analyst_output: dict) -> dict:
        return {
            "case_id": self.case["case_id"],
            "goal": self.case["goal"],
            "extracted_iocs": log_analyst_output.get("extracted_iocs", {}),
            "attack_stages": log_analyst_output.get("attack_stages_observed", []),
            "requirements_file": self.case["requirements_file"],
        }

    def for_target_agent(self, orchestrator_output: dict) -> dict:
        return {
            "case_id": self.case["case_id"],
            "goal": self.case["goal"],
            "briefing": orchestrator_output.get("briefing_for_target_agent", ""),
        }

    def ground_truth(self) -> dict:
        return {
            "case_id": self.case["case_id"],
            "goal": self.case["goal"],
            "known_truth": self.case["known_truth"],
        }
```

---

## `logger.py`

```python
import sys
from datetime import datetime, timezone


class PipelineLogger:
    def __init__(self, verbose: bool = True):
        self.verbose = verbose
        self._stage_num = 0

    def stage(self, name: str):
        self._stage_num += 1
        if self.verbose:
            ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
            print(f"\n{'='*60}")
            print(f"  STAGE {self._stage_num}: {name}  [{ts}]")
            print(f"{'='*60}")
            sys.stdout.flush()

    def info(self, msg: str):
        if self.verbose:
            ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
            print(f"  [{ts}] {msg}")
            sys.stdout.flush()

    def warn(self, msg: str):
        if self.verbose:
            ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
            print(f"  [{ts}] ⚠ {msg}")
            sys.stdout.flush()

    def error(self, msg: str):
        ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
        print(f"  [{ts}] ✖ {msg}", file=sys.stderr)
        sys.stderr.flush()
```

---

## `metrics.py`

```python
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

    # append to leaderboard
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
```

---

## `runner.py`

```python
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

    # ── STAGE 4: run log analyst first ──
    logger.stage("Log Analyst Agent")
    log_result = await log_analyst_run(log_input)

    # ── STAGE 5: build threat intel input from log analyst output ──
    threat_input = loader.for_threat_intel(log_result)

    # ── STAGE 6: vuln scanner + threat intel in parallel ──
    logger.stage("Vuln Scanner + Threat Intel Agents (parallel)")
    vuln_result, threat_result = await asyncio.gather(
        vuln_scanner_run(vuln_input),
        threat_intel_run(threat_input),
    )

    # ── STAGE 7: orchestrator synthesizes all three ──
    logger.stage("Orchestrator — synthesizing")
    orchestrator_result = await orchestrator_run({
        "goal": case["goal"],
        "log_analysis": log_result,
        "vuln_analysis": vuln_result,
        "threat_analysis": threat_result,
    })

    # ── STAGE 8: target agent gets briefing only ──
    logger.stage(f"Target Agent — {agent_name}")
    target_input = loader.for_target_agent(orchestrator_result)
    target_input["agent_name"] = agent_name
    target_input["agent_description"] = agent_description
    target_result = await target_agent_run(target_input)

    # ── STAGE 9: judge scores against ground truth ──
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

    # ── STAGE 11: RL feedback — store episode for self-improvement ──
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
```

---

## `semantic.py`

```python
"""
pipeline/semantic.py  —  Semantic similarity scoring using fine-tuned SBERT.
"""

import os
from sentence_transformers import SentenceTransformer, util as st_util

_FINE_TUNED_PATH = os.path.join("sbert", "model")
_BASE_MODEL_PATH = os.path.join("sbert", "base_model")


class CyberSemanticScorer:
    """Wraps a fine-tuned SBERT model for cybersecurity semantic similarity."""

    def __init__(self):
        if os.path.isdir(_FINE_TUNED_PATH) and os.listdir(_FINE_TUNED_PATH):
            self._model = SentenceTransformer(_FINE_TUNED_PATH)
            self._source = "fine-tuned"
        elif os.path.isdir(_BASE_MODEL_PATH) and os.listdir(_BASE_MODEL_PATH):
            self._model = SentenceTransformer(_BASE_MODEL_PATH)
            self._source = "base-local"
        else:
            raise RuntimeError(
                "No SBERT model found. Run 'python sbert/download_model.py' first."
            )

    @property
    def model_source(self) -> str:
        return self._source

    def similarity(self, text_a: str, text_b: str) -> float:
        """Cosine similarity between two texts.  Returns 0.0–1.0."""
        if not text_a.strip() or not text_b.strip():
            return 0.0
        emb_a = self._model.encode(text_a, convert_to_tensor=True)
        emb_b = self._model.encode(text_b, convert_to_tensor=True)
        score = st_util.cos_sim(emb_a, emb_b).item()
        return max(0.0, min(1.0, score))

    def best_match(self, candidate: str, references: list[str]) -> float:
        """Highest cosine similarity of *candidate* against any *reference*."""
        if not candidate.strip() or not references:
            return 0.0
        cand_emb = self._model.encode(candidate, convert_to_tensor=True)
        ref_embs = self._model.encode(references, convert_to_tensor=True)
        scores = st_util.cos_sim(cand_emb, ref_embs)
        return max(0.0, min(1.0, scores.max().item()))

    def list_match(self, extracted: list[str], truth: list[str]) -> float:
        """
        For each truth item, find its best semantic match in extracted.
        Return the average of those best-match scores (recall-oriented).
        """
        if not truth:
            return 1.0
        if not extracted:
            return 0.0
        truth_embs = self._model.encode(truth, convert_to_tensor=True)
        ext_embs = self._model.encode(extracted, convert_to_tensor=True)
        sim_matrix = st_util.cos_sim(truth_embs, ext_embs)
        best_per_truth = sim_matrix.max(dim=1).values
        avg = best_per_truth.mean().item()
        return max(0.0, min(1.0, avg))


_scorer: CyberSemanticScorer | None = None


def get_scorer() -> CyberSemanticScorer:
    """Return the singleton scorer (lazy-loaded on first call)."""
    global _scorer
    if _scorer is None:
        _scorer = CyberSemanticScorer()
    return _scorer
```
