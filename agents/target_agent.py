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
