import json
from pipeline.semantic import get_scorer
from agents.utils import safe_parse_json, Timer, llm_call


# ────────────────────────────────────────────────────────────────
# PART 1 — AI Extractor: pulls structured fields from free text
# ────────────────────────────────────────────────────────────────

EXTRACTOR_PROMPT = """You extract structured facts from a cybersecurity incident response.
Read the response and extract exactly these fields. If a field is not mentioned, use an empty list or "not_mentioned".

Output ONLY this JSON, no markdown:
{
  "identified_attack_type": "short label of the attack type identified",
  "technique_ids": ["T1xxx.xxx", "T1yyy"],
  "iocs_ips": ["list of IPs mentioned as malicious/suspicious"],
  "iocs_domains": ["list of domains mentioned as malicious/suspicious"],
  "immediate_actions": ["each distinct action recommended"],
  "root_cause_summary": "1-2 sentence root cause",
  "blast_radius_summary": "1-2 sentence blast radius / impact",
  "sections_present": ["list from: what_happened, current_risk, immediate_actions, investigation, remediation, hardening"]
}"""


async def _extract_fields(response_text: str) -> dict:
    raw = await llm_call(system=EXTRACTOR_PROMPT, user_message=response_text, max_tokens=2048)
    result = safe_parse_json(raw)
    if result.get("error") == "invalid_json":
        return {}
    return result


# ────────────────────────────────────────────────────────────────
# PART 2 — Algorithmic scoring (70% of total)
# ────────────────────────────────────────────────────────────────

def _jaccard(set_a: set, set_b: set) -> float:
    """Exact-match set overlap — only used for technique IDs."""
    if not set_a and not set_b:
        return 1.0
    if not set_a or not set_b:
        return 0.0
    return len(set_a & set_b) / len(set_a | set_b)


def compute_algorithmic_score(extracted: dict, ground_truth: dict) -> dict:
    scorer = get_scorer()

    # --- technique IDs (exact match) ---
    truth_ids = set()
    for t in ground_truth.get("techniques", []):
        truth_ids.add(t["id"].upper())
    extracted_ids = {tid.upper() for tid in extracted.get("technique_ids", [])}
    technique_score = _jaccard(extracted_ids, truth_ids) * 100

    # --- IOCs: IPs + domains ---
    truth_ips = set(ground_truth.get("iocs", {}).get("ips", []))
    truth_domains = set(ground_truth.get("iocs", {}).get("domains", []))
    truth_iocs = truth_ips | truth_domains

    ext_ips = set(extracted.get("iocs_ips", []))
    ext_domains = set(extracted.get("iocs_domains", []))
    ext_iocs = ext_ips | ext_domains

    ioc_score = _jaccard(ext_iocs, truth_iocs) * 100

    # --- immediate actions ---
    truth_actions = ground_truth.get("correct_immediate_actions", [])
    ext_actions = extracted.get("immediate_actions", [])
    recall = scorer.list_match(ext_actions, truth_actions)
    precision = scorer.list_match(truth_actions, ext_actions) if ext_actions else 0.0
    action_score = (0.7 * recall + 0.3 * precision) * 100

    # --- root cause ---
    truth_rc = ground_truth.get("root_cause", "")
    ext_rc = extracted.get("root_cause_summary", "")
    root_cause_score = scorer.similarity(ext_rc, truth_rc) * 100

    # --- blast radius ---
    truth_br = ground_truth.get("blast_radius", "")
    ext_br = extracted.get("blast_radius_summary", "")
    blast_radius_score = scorer.similarity(ext_br, truth_br) * 100

    # --- section completeness ---
    expected_sections = {"what_happened", "current_risk", "immediate_actions",
                         "investigation", "remediation", "hardening"}
    bonus_sections = {"risk_score", "assumptions"}
    present = set(extracted.get("sections_present", []))
    completeness_score = (len(present & expected_sections) / len(expected_sections)) * 100
    completeness_score = min(100.0, completeness_score + len(present & bonus_sections) * 8)

    weighted = (
        technique_score * 0.25
        + ioc_score * 0.20
        + action_score * 0.20
        + root_cause_score * 0.15
        + blast_radius_score * 0.10
        + completeness_score * 0.10
    )

    return {
        "technique_match": round(technique_score, 1),
        "ioc_match": round(ioc_score, 1),
        "action_match": round(action_score, 1),
        "root_cause_match": round(root_cause_score, 1),
        "blast_radius_match": round(blast_radius_score, 1),
        "completeness": round(completeness_score, 1),
        "algorithmic_total": round(weighted, 1),
        "model_source": scorer.model_source,
    }


# ────────────────────────────────────────────────────────────────
# PART 3 — AI Qualitative scoring (30% of total)
# ────────────────────────────────────────────────────────────────

QUALITATIVE_PROMPT = """You are a qualitative reviewer for cybersecurity incident responses.
You score how well-written, coherent, and expert-sounding the response is.
You do NOT check factual accuracy — that is handled separately.

Score these three dimensions (0-100 each):

reasoning_quality:
  100 = clear logical flow, connects evidence to conclusions, well-structured
  50  = somewhat organized but jumps around or misses connections
  0   = disorganized, no clear reasoning chain

actionability:
  100 = every recommendation is specific and executable (exact commands, versions, config changes)
  50  = mix of specific and vague advice
  0   = mostly generic ("patch your systems", "improve monitoring")

technical_depth:
  100 = expert-level detail — specific tool names, forensic artifacts, log entries cited, CVSS scores
  50  = shows security knowledge but shallow on specifics
  0   = could have been written by someone with no security background

Also provide:
- strengths: 2-3 specific things done well, with examples from the text
- gaps: 2-3 specific things missing, wrong, or vague, with examples
- recommendation: 1-2 sentences on what to improve

Output ONLY this JSON, no markdown:
{
  "reasoning_quality": 0,
  "actionability": 0,
  "technical_depth": 0,
  "qualitative_total": 0,
  "strengths": "",
  "gaps": "",
  "recommendation": ""
}

qualitative_total = (reasoning_quality + actionability + technical_depth) / 3"""


async def _qualitative_score(goal: str, response_text: str) -> dict:
    user_msg = json.dumps({
        "goal": goal,
        "target_response": response_text,
    }, indent=2)

    raw = await llm_call(system=QUALITATIVE_PROMPT, user_message=user_msg, max_tokens=2048)
    result = safe_parse_json(raw)
    if result.get("error") == "invalid_json":
        return {
            "reasoning_quality": 0, "actionability": 0,
            "technical_depth": 0, "qualitative_total": 0,
            "strengths": "", "gaps": "", "recommendation": "",
        }
    return result


# ────────────────────────────────────────────────────────────────
# PART 4 — Combined judge entry point
# ────────────────────────────────────────────────────────────────

async def run(input_data: dict) -> dict:
    goal = input_data["goal"]
    ground_truth = input_data["ground_truth"]
    target_response = input_data["target_response"]

    with Timer() as t:
        extracted = await _extract_fields(target_response)
        algo = compute_algorithmic_score(extracted, ground_truth)
        qual = await _qualitative_score(goal, target_response)

        algo_weighted = algo["algorithmic_total"] * 0.70
        qual_weighted = qual.get("qualitative_total", 0) * 0.30
        overall = round(algo_weighted + qual_weighted, 1)

    verdict = "fail"
    if overall >= 75:
        verdict = "pass"
    elif overall >= 45:
        verdict = "partial"

    return {
        "overall": overall,
        "verdict": verdict,
        "algorithmic": {
            "weight": "70%",
            "total": algo["algorithmic_total"],
            "technique_match": algo["technique_match"],
            "ioc_match": algo["ioc_match"],
            "action_match": algo["action_match"],
            "root_cause_match": algo["root_cause_match"],
            "blast_radius_match": algo["blast_radius_match"],
            "completeness": algo["completeness"],
            "sbert_model": algo.get("model_source", "unknown"),
        },
        "qualitative": {
            "weight": "30%",
            "total": qual.get("qualitative_total", 0),
            "reasoning_quality": qual.get("reasoning_quality", 0),
            "actionability": qual.get("actionability", 0),
            "technical_depth": qual.get("technical_depth", 0),
        },
        "strengths": qual.get("strengths", ""),
        "gaps": qual.get("gaps", ""),
        "recommendation": qual.get("recommendation", ""),
        "extracted_fields": extracted,
        "meta": {"processing_time_ms": t.elapsed_ms},
    }
