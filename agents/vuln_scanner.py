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
  "asset_vulnerabilities": [],
  "dependency_vulnerabilities": [],
  "critical_findings": [],
  "patch_priority": [],
  "summary": "2-3 sentence plain English summary",
  "confidence": "HIGH|MEDIUM|LOW",
  "uncertainties": []
}"""


async def run(input_data: dict) -> dict:
    user_message = json.dumps(input_data, indent=2, default=str)

    with Timer() as t:
        raw = await llm_call(system=SYSTEM_PROMPT, user_message=user_message, max_tokens=4096)
    result = safe_parse_json(raw)
    result["meta"] = {"processing_time_ms": t.elapsed_ms}
    return result
