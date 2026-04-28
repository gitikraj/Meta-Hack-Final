"""
app.py — Gradio app for HuggingFace Spaces

Loads the fine-tuned Qwen2.5-3B adapter (from the Hub or local path)
and provides a UI to:
  1. Run a full pipeline eval on any of the 10 scenarios
  2. Run a free-form incident response query
  3. See score breakdown from the Judge
"""

import asyncio
import json
import os
import sys
from pathlib import Path

import gradio as gr

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)

from dotenv import load_dotenv
load_dotenv()

# ── Config ──────────────────────────────────────────────────────────────────
HF_ADAPTER_REPO = os.environ.get("HF_ADAPTER_REPO", "")  # e.g. "yourorg/cyberbench-qwen25-3b"
GROQ_API_KEY    = os.environ.get("GROQ_API_KEY", "")
USE_QWEN        = os.environ.get("USE_QWEN", "true").lower() == "true"

# ── Load agents ──────────────────────────────────────────────────────────────
from pipeline.case_selector import CaseSelector
from pipeline.env_loader import CaseEnvironmentLoader
from agents.log_analyst import run as log_analyst_run
from agents.vuln_scanner import run as vuln_scanner_run
from agents.threat_intel import run as threat_intel_run
from agents.orchestrator import run as orchestrator_run
from agents.judge import run as judge_run

# ── Load Qwen (lazy) ─────────────────────────────────────────────────────────
_qwen_agent = None

def get_qwen_agent():
    global _qwen_agent
    if _qwen_agent is None and USE_QWEN:
        from qwen_training.qwen_target_agent import QwenTargetAgent
        adapter = HF_ADAPTER_REPO if HF_ADAPTER_REPO else None
        _qwen_agent = QwenTargetAgent(
            model_name="Qwen/Qwen2.5-3B-Instruct",
            adapter_path=adapter,
            load_in_4bit=True,
        )
    return _qwen_agent


async def _run_full_eval(case_id: str, use_qwen: bool):
    selector = CaseSelector("data/scenarios.json", mode="manual", case_id=case_id)
    case = selector.pick()
    loader = CaseEnvironmentLoader(case)

    # Briefing pipeline (always Groq)
    log_input  = loader.for_log_analyst()
    vuln_input = loader.for_vuln_scanner()
    log_result = await log_analyst_run(log_input)
    vuln_result, threat_result = await asyncio.gather(
        vuln_scanner_run(vuln_input),
        threat_intel_run(loader.for_threat_intel(log_result)),
    )
    orch_result = await orchestrator_run({
        "goal": case["goal"],
        "log_analysis": log_result,
        "vuln_analysis": vuln_result,
        "threat_analysis": threat_result,
    })

    # Target agent
    target_input = loader.for_target_agent(orch_result)
    target_input["agent_name"]        = "Qwen-CyberBench" if use_qwen else "Groq-CyberBench"
    target_input["agent_description"] = "Fine-tuned cybersecurity incident response model."

    if use_qwen:
        agent = get_qwen_agent()
        loop = asyncio.get_event_loop()
        target_result = await loop.run_in_executor(None, agent.run, target_input)
    else:
        from agents.target_agent import run as target_agent_run
        target_result = await target_agent_run(target_input)

    # Judge
    gt = loader.ground_truth()
    judge_result = await judge_run({
        "goal": case["goal"],
        "ground_truth": gt["known_truth"],
        "target_response": target_result.get("response", ""),
    })

    return case, orch_result, target_result, judge_result


def run_eval(case_id: str, use_qwen: bool):
    if not GROQ_API_KEY:
        return "❌ GROQ_API_KEY not set. Add it to Space secrets.", "", ""

    try:
        loop = asyncio.new_event_loop()
        case, orch, target, judge = loop.run_until_complete(
            _run_full_eval(case_id, use_qwen)
        )
        loop.close()

        score     = judge.get("overall", 0)
        verdict   = judge.get("verdict", "fail").upper()
        algo      = judge.get("algorithmic", {})
        qual      = judge.get("qualitative", {})
        response  = target.get("response", "")
        briefing  = orch.get("briefing_for_target_agent", "")

        score_md = f"""### Score: {score:.1f}/100  |  Verdict: **{verdict}**

| Dimension | Score |
|-----------|-------|
| Technique Match (MITRE) | {algo.get('technique_match', 0):.1f} |
| IOC Match | {algo.get('ioc_match', 0):.1f} |
| Action Match (SBERT) | {algo.get('action_match', 0):.1f} |
| Root Cause Match | {algo.get('root_cause_match', 0):.1f} |
| Blast Radius Match | {algo.get('blast_radius_match', 0):.1f} |
| Completeness | {algo.get('completeness', 0):.1f} |
| Reasoning Quality | {qual.get('reasoning_quality', 0):.1f} |
| Actionability | {qual.get('actionability', 0):.1f} |
| Technical Depth | {qual.get('technical_depth', 0):.1f} |

**Strengths:** {judge.get('strengths', '')}

**Gaps:** {judge.get('gaps', '')}
"""
        return score_md, briefing[:3000] + ("..." if len(briefing) > 3000 else ""), response

    except Exception as exc:
        import traceback
        return f"❌ Error: {exc}\n\n{traceback.format_exc()}", "", ""


def run_freeform(goal: str, briefing: str, use_qwen: bool):
    if not briefing.strip():
        return "Please provide a briefing."
    input_data = {
        "agent_name": "Qwen-CyberBench" if use_qwen else "Groq-CyberBench",
        "agent_description": "Fine-tuned cybersecurity incident response model.",
        "goal": goal,
        "briefing": briefing,
    }
    try:
        if use_qwen:
            agent = get_qwen_agent()
            result = agent.run(input_data)
        else:
            loop = asyncio.new_event_loop()
            from agents.target_agent import run as target_agent_run
            result = loop.run_until_complete(target_agent_run(input_data))
            loop.close()
        return result.get("response", "No response generated.")
    except Exception as exc:
        return f"❌ Error: {exc}"


# ── Load scenario list ────────────────────────────────────────────────────────
with open("data/scenarios.json") as f:
    _scenarios = json.load(f)
CASE_CHOICES = [
    f"{s['case_id']} — {s['goal'][:60]} [{s['difficulty']}]"
    for s in _scenarios
]
CASE_IDS = [s["case_id"] for s in _scenarios]


# ── Gradio UI ─────────────────────────────────────────────────────────────────
with gr.Blocks(
    title="CyberBench — Qwen2.5-3B Incident Response",
    theme=gr.themes.Base(
        primary_hue="cyan",
        neutral_hue="slate",
    ).set(
        body_background_fill="#0a0f18",
        body_text_color="#e2e8f0",
        block_background_fill="#111827",
        block_border_color="#1e3a5f",
    ),
    css="""
        .gr-button { font-family: 'JetBrains Mono', monospace !important; }
        .score-box { font-family: monospace; font-size: 14px; }
        footer { display: none !important; }
    """
) as demo:
    gr.Markdown("""
# 🛡 CyberBench — Qwen2.5-3B Incident Response Evaluator

**Part 2 of CyberBench**: A Qwen2.5-3B model fine-tuned via Rejection-Sampling Fine-Tuning (RFT)
on cybersecurity incident response tasks, scored by an AI Judge + fine-tuned SBERT.

| Component | Model |
|-----------|-------|
| Helper Agents (Log/Vuln/Threat/Orchestrator) | Groq llama-3.3-70b |
| **Target Agent** | **Qwen2.5-3B-Instruct + LoRA** |
| Judge | Groq + fine-tuned SBERT |
""")

    gr.Markdown("""
> **Note:** If a run fails or returns an error, the **Groq API daily rate limit (100k tokens/day on the free tier)** may be exhausted.
> Set a fresh `GROQ_API_KEY` in Space secrets and restart the Space.
""")

    with gr.Tab("📋 Scenario Evaluation"):
        gr.Markdown("Run the full pipeline on one of the 10 built-in attack scenarios.")
        with gr.Row():
            case_dropdown = gr.Dropdown(
                choices=CASE_CHOICES,
                label="Select Scenario",
                value=CASE_CHOICES[0],
            )
            use_qwen_toggle = gr.Checkbox(label="Use Qwen (uncheck for Groq baseline)", value=True)
        run_btn = gr.Button("▶ Run Pipeline", variant="primary")

        with gr.Row():
            score_output = gr.Markdown(label="Judge Scores", elem_classes=["score-box"])

        with gr.Accordion("Briefing (Orchestrator Output)", open=False):
            briefing_output = gr.Textbox(label="Briefing", lines=12, interactive=False)

        with gr.Accordion("Target Agent Response", open=True):
            response_output = gr.Textbox(label="Response", lines=20, interactive=False)

        def _run_eval_ui(case_label, use_qwen):
            idx = CASE_CHOICES.index(case_label)
            case_id = CASE_IDS[idx]
            return run_eval(case_id, use_qwen)

        run_btn.click(
            fn=_run_eval_ui,
            inputs=[case_dropdown, use_qwen_toggle],
            outputs=[score_output, briefing_output, response_output],
        )

    with gr.Tab("💬 Free-form Query"):
        gr.Markdown("Provide your own briefing and goal. The model generates an incident response.")
        goal_input = gr.Textbox(
            label="Goal",
            placeholder="e.g. Determine if the VPN login represents a compromised account.",
            lines=2,
        )
        briefing_input = gr.Textbox(
            label="Briefing (paste synthesized intel here)",
            placeholder="Paste your briefing — IOCs, attack stages, CVEs, etc.",
            lines=10,
        )
        use_qwen_ff = gr.Checkbox(label="Use Qwen (uncheck for Groq baseline)", value=True)
        query_btn = gr.Button("▶ Generate Response", variant="primary")
        ff_response = gr.Textbox(label="Incident Response", lines=25, interactive=False)

        query_btn.click(
            fn=run_freeform,
            inputs=[goal_input, briefing_input, use_qwen_ff],
            outputs=[ff_response],
        )

    with gr.Tab("ℹ️ About"):
        gr.Markdown("""
## Architecture

```
Scenario (data/scenarios.json)
    │
    ▼
Log Analyst ──┐
Vuln Scanner  ├─► Orchestrator ──► TARGET AGENT ──► Judge ──► Score
Threat Intel ─┘   (Groq)          (Qwen2.5-3B)     (Groq+SBERT)
```

## Training

Training uses **Rejection-Sampling Fine-Tuning (RFT)**:

1. Qwen generates N responses per round
2. Judge scores each response (0-100)
3. Top-K responses above threshold are kept
4. LoRA fine-tuning on accepted responses (SFT loss on response tokens only)
5. Model improves each round — sees its own improved outputs

## Scoring (Judge)

- **70% Algorithmic**: MITRE technique match, IOC match, action match (SBERT), root cause (SBERT), blast radius (SBERT), completeness
- **30% Qualitative**: reasoning quality, actionability, technical depth

Verdict: **PASS** ≥75 | **PARTIAL** ≥45 | **FAIL** <45
""")

if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0",
        server_port=int(os.environ.get("GRADIO_SERVER_PORT", 7860)),
        share=False,
    )
