# agents/ — LLM Agents

## Folder Structure

```
agents/
├── __init__.py
├── judge.py
├── log_analyst.py
├── orchestrator.py
├── target_agent.py
├── threat_intel.py
├── utils.py
└── vuln_scanner.py
```

---

## `__init__.py`

```python
# (empty)
```

---

## `judge.py`

```python
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
#
# Pipeline per dimension:
#   Ground-truth value  ──→  SBERT embed  ──┐
#                                            ├→  cosine similarity  →  score
#   Extracted value     ──→  SBERT embed  ──┘
#
# Technique IDs are still compared by exact set overlap (Jaccard)
# because they are short canonical identifiers, not free text.
# ────────────────────────────────────────────────────────────────

def _jaccard(set_a: set, set_b: set) -> float:
    """Exact-match set overlap — only used for technique IDs."""
    if not set_a and not set_b:
        return 1.0
    if not set_a or not set_b:
        return 0.0
    return len(set_a & set_b) / len(set_a | set_b)


def compute_algorithmic_score(extracted: dict, ground_truth: dict) -> dict:
    """
    Compare extracted fields against ground truth using SBERT embeddings.
    Returns individual dimension scores (0-100) and a weighted total.

    Dimensions (weight):
      technique_match    (25%) — MITRE technique IDs exact overlap (Jaccard)
      ioc_match          (20%) — IPs + domains exact overlap (Jaccard)
      action_match       (20%) — immediate actions via SBERT list_match
      root_cause_match   (15%) — SBERT semantic similarity of root cause
      blast_radius_match (10%) — SBERT semantic similarity of blast radius
      completeness       (10%) — presence of the 6 expected response sections
    """
    scorer = get_scorer()

    # --- technique IDs (exact match — canonical IDs, not prose) ---
    truth_ids = set()
    for t in ground_truth.get("techniques", []):
        truth_ids.add(t["id"].upper())
    extracted_ids = {tid.upper() for tid in extracted.get("technique_ids", [])}
    technique_score = _jaccard(extracted_ids, truth_ids) * 100

    # --- IOCs: IPs + domains (exact match — IP / domain literals) ---
    truth_ips = set(ground_truth.get("iocs", {}).get("ips", []))
    truth_domains = set(ground_truth.get("iocs", {}).get("domains", []))
    truth_iocs = truth_ips | truth_domains

    ext_ips = set(extracted.get("iocs_ips", []))
    ext_domains = set(extracted.get("iocs_domains", []))
    ext_iocs = ext_ips | ext_domains

    ioc_score = _jaccard(ext_iocs, truth_iocs) * 100

    # --- immediate actions: SBERT semantic list match (recall + precision) ---
    truth_actions = ground_truth.get("correct_immediate_actions", [])
    ext_actions = extracted.get("immediate_actions", [])
    recall = scorer.list_match(ext_actions, truth_actions)
    precision = scorer.list_match(truth_actions, ext_actions) if ext_actions else 0.0
    action_score = (0.7 * recall + 0.3 * precision) * 100

    # --- root cause: SBERT semantic similarity ---
    truth_rc = ground_truth.get("root_cause", "")
    ext_rc = extracted.get("root_cause_summary", "")
    root_cause_score = scorer.similarity(ext_rc, truth_rc) * 100

    # --- blast radius: SBERT semantic similarity ---
    truth_br = ground_truth.get("blast_radius", "")
    ext_br = extracted.get("blast_radius_summary", "")
    blast_radius_score = scorer.similarity(ext_br, truth_br) * 100

    # --- section completeness (deterministic check) ---
    expected_sections = {"what_happened", "current_risk", "immediate_actions",
                         "investigation", "remediation", "hardening"}
    bonus_sections = {"risk_score", "assumptions"}
    present = set(extracted.get("sections_present", []))
    completeness_score = (len(present & expected_sections) / len(expected_sections)) * 100
    # Bonus for optional sections (up to +8 each)
    completeness_score = min(100.0, completeness_score + len(present & bonus_sections) * 8)

    # weighted total (out of 100)
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
        # Step 1: extract structured fields from target response
        extracted = await _extract_fields(target_response)

        # Step 2: algorithmic comparison (70%)
        algo = compute_algorithmic_score(extracted, ground_truth)

        # Step 3: qualitative AI review (30%)
        qual = await _qualitative_score(goal, target_response)

        # Step 4: combine
        algo_weighted = algo["algorithmic_total"] * 0.70
        qual_weighted = qual.get("qualitative_total", 0) * 0.30
        overall = round(algo_weighted + qual_weighted, 1)

    verdict = "fail"
    if overall >= 75:
        verdict = "pass"
    elif overall >= 45:
        verdict = "partial"

    return {
        # top-level scores
        "overall": overall,
        "verdict": verdict,

        # algorithmic breakdown (70%)
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

        # qualitative breakdown (30%)
        "qualitative": {
            "weight": "30%",
            "total": qual.get("qualitative_total", 0),
            "reasoning_quality": qual.get("reasoning_quality", 0),
            "actionability": qual.get("actionability", 0),
            "technical_depth": qual.get("technical_depth", 0),
        },

        # human-readable feedback
        "strengths": qual.get("strengths", ""),
        "gaps": qual.get("gaps", ""),
        "recommendation": qual.get("recommendation", ""),

        # what was extracted for transparency
        "extracted_fields": extracted,

        # execution metadata
        "meta": {"processing_time_ms": t.elapsed_ms},
    }
```

---

## `log_analyst.py`

```python
import json
from agents.utils import safe_parse_json, Timer, llm_call

SYSTEM_PROMPT = """You are a Log Analyst Agent. Your ONLY input is raw logs.
You do not know about CVEs, packages, or threat actors.
Your job is purely behavioral — read logs, find what is suspicious, reconstruct what happened.

You will receive logs from multiple sources: auth logs, network logs, system logs.

IMPORTANT RULES:
- If you are unsure whether something is suspicious → say "unknown" for the reason.
- Do NOT guess threat actors or CVE numbers — that is another agent's job.
- Prefer "unknown" over incorrect answers.
- If a base64 string cannot be decoded, return {"encoded": "...", "decoded": "decode_failed"}.

STEP 1 — CLASSIFY EVERY LOG ENTRY
Go through every single log entry. Mark each one as SUSPICIOUS or NORMAL.
KEEP ALL ENTRIES — do NOT discard normal logs.

A log entry is SUSPICIOUS if it matches any of these:
- 3 or more AUTH_FAIL events from the same IP within 60 seconds
- AUTH_SUCCESS immediately after a burst of AUTH_FAILs from the same IP
- AUTH_SUCCESS where the source country is not the user's normal country
- Any base64 encoded string in a command line argument
- A process spawning another process in an unusual parent-child relationship
  (e.g. svchost.exe spawning cmd.exe, excel.exe spawning powershell.exe)
- Any outbound data transfer over 50MB to an external IP
- DNS queries to domains with random-looking names or uncommon TLDs (.xyz, .ru, .top)
- Any scheduled task creation or registry run key write
- One user authenticating to more than 2 different internal hosts within 5 minutes
- Any network connection on ports 4444, 8080, 8443, 9001 to an external IP
- Bulk file copy or access to sensitive paths (HR, Finance, passwords, keys)

Everything else is NORMAL.

STEP 2 — TIMELINE
Take only your SUSPICIOUS entries and arrange them in chronological order.
For each entry write one sentence explaining why it is suspicious.

STEP 3 — EXTRACT IOCs
From your suspicious entries pull out every:
- External IP address
- Domain name
- Base64 encoded string (decode it and include the decoded version; if decode fails use "decode_failed")
- File path that looks like malware (temp folders, unusual system paths)
- Username that appears to be compromised

STEP 4 — CLASSIFY BEHAVIOR
Based on the timeline, classify what attack stages you can see evidence of.
Use only these categories:
- reconnaissance
- initial_access
- execution
- persistence
- lateral_movement
- exfiltration
- command_and_control

For each stage you identify, list the specific log entries that prove it.

STEP 5 — SEVERITY
Give an overall severity: Critical, High, Medium, or Low.
Justify it in one sentence.

STEP 6 — CONFIDENCE & UNCERTAINTIES
Rate your overall confidence: HIGH, MEDIUM, or LOW.
List anything you are uncertain about (e.g. "Unable to confirm geolocation anomaly",
"Insufficient logs for persistence detection", "Timestamp gaps in auth logs").
If nothing uncertain, return an empty array.

Output ONLY this JSON, no markdown, no extra text:
{
  "suspicious_entry_count": 0,
  "total_entry_count": 0,
  "classified_logs": [
    {
      "original_entry": {},
      "is_suspicious": true,
      "reason_flagged": "one sentence why this is suspicious, or 'normal_activity' if not suspicious"
    }
  ],
  "timeline": [
    {
      "ts": "timestamp",
      "event_summary": "one sentence what happened",
      "why_suspicious": "one sentence"
    }
  ],
  "extracted_iocs": {
    "ips": ["list of external IPs found"],
    "domains": ["list of suspicious domains"],
    "decoded_payloads": [
      { "encoded": "original base64 string", "decoded": "plaintext result or decode_failed" }
    ],
    "compromised_users": ["list of usernames"],
    "suspicious_paths": ["list of file paths"]
  },
  "attack_stages_observed": [
    {
      "stage": "stage name from list above",
      "evidence": ["list of specific log entries proving this stage"]
    }
  ],
  "severity": "Critical|High|Medium|Low",
  "severity_reason": "one sentence justification",
  "narrative": "3-5 sentence plain English story of what happened from start to finish",
  "confidence": "HIGH|MEDIUM|LOW",
  "uncertainties": ["list of unclear or missing evidence"]
}"""


async def run(input_data: dict) -> dict:
    user_message = json.dumps(input_data, indent=2, default=str)

    with Timer() as t:
        raw = await llm_call(system=SYSTEM_PROMPT, user_message=user_message, max_tokens=4096)
    result = safe_parse_json(raw)
    result["meta"] = {"processing_time_ms": t.elapsed_ms}
    return result
```

---

## `orchestrator.py`

```python
import json
from agents.utils import safe_parse_json, Timer, llm_call

SYSTEM_PROMPT = """You are an Orchestrator Agent. Three specialist agents have each analyzed
a different layer of a security incident. You receive all three reports.

Your job is to combine them into one clean context block that will be
handed to a target cybersecurity agent to answer the original goal.

You are NOT adding new analysis. You are NOT repeating everything each
agent said. You are synthesizing — finding the connections between the
three reports and presenting the most important combined picture.

IMPORTANT RULES:
- If you are unsure about any connection → say "unknown" or "unconfirmed".
- Do NOT invent facts not present in agent outputs.
- Prefer "unknown" over incorrect synthesis.

SYNTHESIS RULES (do not just merge — CONNECT the outputs):
- Where the Log Analyst found suspicious behavior, does the Threat Intel
  Agent confirm those IOCs are malicious? Say so explicitly.
- Where the Vuln Scanner found a vulnerability, does the Log Analyst's
  timeline suggest it was actually exploited? Say so explicitly.
- Where the Threat Intel Agent identified a threat actor, does the
  Vuln Scanner's findings explain the initial entry point? Say so.

DISAGREEMENT HANDLING (MANDATORY):
- If agents disagree or contradict each other:
  - Explicitly state the disagreement.
  - Choose the most reliable agent for that specific claim and justify why.
  - Example: "Log Analyst shows lateral movement at 02:15, but Threat Intel
    has no matching IOC — trusting Log Analyst as it has direct evidence."

CONFIDENCE ASSESSMENT:
- Assess overall_confidence based on how well the three reports corroborate each other.
  - HIGH = all three agents agree and evidence is strong.
  - MEDIUM = partial agreement or some gaps.
  - LOW = significant disagreements or missing data.

Your output will be handed word-for-word to the target agent as its context.
Write it as a structured briefing, not as a list of agent outputs.

Output ONLY this JSON, no markdown, no extra text:
{
  "incident_summary": "3-4 sentence plain English briefing of what happened",
  "confirmed_attack_chain": [...],
  "active_threats": {...},
  "exploited_vulnerabilities": [...],
  "agent_disagreements": [...],
  "current_state": "one sentence describing where the attacker is right now",
  "briefing_for_target_agent": "A dense 5-7 sentence paragraph combining all findings",
  "overall_confidence": "HIGH|MEDIUM|LOW",
  "confidence": "HIGH|MEDIUM|LOW",
  "uncertainties": ["list of unresolved issues across all agent outputs"]
}"""


async def run(input_data: dict) -> dict:
    user_message = json.dumps(input_data, indent=2, default=str)

    with Timer() as t:
        raw = await llm_call(system=SYSTEM_PROMPT, user_message=user_message, max_tokens=4096)
    result = safe_parse_json(raw)
    result["meta"] = {"processing_time_ms": t.elapsed_ms}
    return result
```

---

## `target_agent.py`

```python
import json
from agents.utils import Timer, llm_call

TARGET_SYSTEM_TEMPLATE = """You are {agent_name}. {agent_description}

You have been given a security incident briefing prepared by a team of
specialist analysis agents. The briefing contains confirmed findings only —
everything in it has already been verified by log analysis, threat
intelligence, and vulnerability assessment.

Your job is to answer the stated goal using this briefing as your context.

GOAL: {goal}

BRIEFING:
{briefing}

IMPORTANT RULES:
- Do NOT repeat the briefing back. Use it as context and extend it.
- If the briefing lacks data for a section, explicitly state your assumptions.
- If you are unsure about a CVE, threat actor, or intelligence → say "unknown".
- Do NOT guess CVE numbers or MITRE technique IDs — only use ones you are confident about.
- Prefer "unknown" over incorrect answers.

Answer the goal thoroughly. Structure your response as:

1. WHAT HAPPENED — summarize the attack in plain English (do NOT restate the briefing)
2. CURRENT RISK — what is the attacker able to do right now
3. IMMEDIATE ACTIONS — what to do in the next 30 minutes, ordered by severity (1=most critical)
4. INVESTIGATION STEPS — what to examine and in what order
5. REMEDIATION — how to fully close the attack path
6. HARDENING — what to fix so this cannot happen again
7. RISK SCORE — a number between 0 and 100 representing overall risk severity
8. ASSUMPTIONS — list any assumptions you made due to incomplete briefing data.

Be specific. Use CVE numbers where relevant. Use MITRE ATT&CK technique
IDs where relevant. Give exact commands where helpful.
Prioritize IMMEDIATE ACTIONS by severity — most critical first."""


async def run(input_data: dict) -> dict:
    agent_name = input_data.get("agent_name", "Security Analyst")
    agent_description = input_data.get("agent_description", "A cybersecurity incident response agent.")
    goal = input_data.get("goal", "")
    briefing = input_data.get("briefing", "")

    system_prompt = TARGET_SYSTEM_TEMPLATE.format(
        agent_name=agent_name,
        agent_description=agent_description,
        goal=goal,
        briefing=briefing,
    )

    with Timer() as t:
        user_content = (
            f"Analyze this security incident and answer the goal: {goal}\n\n"
            "Provide your full analysis now."
        )
        raw = await llm_call(system=system_prompt, user_message=user_content, max_tokens=4096)

    return {
        "response": raw,
        "meta": {"processing_time_ms": t.elapsed_ms},
    }
```

---

## `threat_intel.py`

```python
import json
from agents.utils import safe_parse_json, Timer, llm_call

SYSTEM_PROMPT = """You are a Threat Intelligence Agent.
You do NOT read raw logs. You do NOT find CVEs. You do NOT do vulnerability assessment.

You receive two things:
1. A set of IOCs (IPs, domains, decoded payloads, compromised usernames) already
   extracted by the Log Analyst Agent
2. A requirements.txt file

Your job is exactly two things:

JOB 1 — IOC LOOKUP
For each IP, domain, and decoded payload you receive:
- Is this IP or domain known to be associated with any threat actor, botnet,
  malware family, or attack campaign?
- Has this IP appeared in any public threat intel feed?
- Does the decoded payload match any known malware family?
- What MITRE ATT&CK technique does each IOC or payload represent?

JOB 2 — REQUIREMENTS.TXT ACTIVE EXPLOITATION CHECK
For each package and version in requirements.txt:
- Is this package version currently being actively exploited in the wild?

Output ONLY this JSON, no markdown, no extra text:
{
  "ioc_analysis": [...],
  "actively_exploited_packages": [...],
  "actor_hypothesis": {...},
  "overall_threat_level": "Critical|High|Medium|Low",
  "summary": "2-3 sentence plain English summary",
  "confidence": "HIGH|MEDIUM|LOW",
  "uncertainties": [...]
}"""


async def run(input_data: dict) -> dict:
    user_message = json.dumps(input_data, indent=2, default=str)

    with Timer() as t:
        raw = await llm_call(system=SYSTEM_PROMPT, user_message=user_message, max_tokens=4096)
    result = safe_parse_json(raw)
    result["meta"] = {"processing_time_ms": t.elapsed_ms}
    return result
```

---

## `utils.py`

```python
"""
agents/utils.py — Shared utilities for all agent modules.
"""

import json
import os
import ssl
import time

import httpx
from dotenv import load_dotenv
from groq import AsyncGroq

load_dotenv()

# ── Shared Groq client ──────────────────────────────────────────
_GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
_GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

_client: AsyncGroq | None = None


def get_llm_client() -> AsyncGroq:
    """Return a shared AsyncGroq client (lazy-initialised)."""
    global _client
    if _client is None:
        _client = AsyncGroq(
            api_key=_GROQ_API_KEY,
            http_client=httpx.AsyncClient(verify=False),
        )
    return _client


def get_model() -> str:
    """Return the configured model name."""
    return _GROQ_MODEL


async def llm_call(*, system: str, user_message: str, max_tokens: int = 4096) -> str:
    """
    Single helper that wraps the Groq chat-completions API.
    Every agent calls this instead of building its own client.
    """
    client = get_llm_client()
    response = await client.chat.completions.create(
        model=get_model(),
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_message},
        ],
    )
    return response.choices[0].message.content.strip()


def safe_parse_json(raw: str) -> dict:
    """Parse JSON from LLM output, stripping markdown fences if present."""
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1]
        if cleaned.endswith("```"):
            cleaned = cleaned[: cleaned.rfind("```")]
        cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        return {"error": "invalid_json", "raw_output": raw}


class Timer:
    """Simple context-manager timer (milliseconds)."""

    def __enter__(self):
        self._start = time.perf_counter()
        return self

    def __exit__(self, *_):
        self.elapsed_ms = round((time.perf_counter() - self._start) * 1000)
```

---

## `vuln_scanner.py`

```python
import json
from agents.utils import safe_parse_json, Timer, llm_call

SYSTEM_PROMPT = """You are a Vulnerability Scanner Agent.
You do NOT read logs. You do NOT analyze behavior. You do NOT attribute threat actors.

You receive exactly two things:
1. A list of assets — each with a hostname, IP, OS version, and open ports
2. A requirements.txt — a list of Python packages with version numbers

Your job is purely static analysis. You are answering one question:
"Given this software and these configurations, what known vulnerabilities exist?"

Output ONLY this JSON, no markdown, no extra text:
{
  "asset_vulnerabilities": [...],
  "dependency_vulnerabilities": [...],
  "critical_findings": [...],
  "patch_priority": [...],
  "summary": "2-3 sentence plain English summary",
  "confidence": "HIGH|MEDIUM|LOW",
  "uncertainties": [...]
}"""


async def run(input_data: dict) -> dict:
    user_message = json.dumps(input_data, indent=2, default=str)

    with Timer() as t:
        raw = await llm_call(system=SYSTEM_PROMPT, user_message=user_message, max_tokens=4096)
    result = safe_parse_json(raw)
    result["meta"] = {"processing_time_ms": t.elapsed_ms}
    return result
```
