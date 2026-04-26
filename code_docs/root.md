# Root Files

## Structure

```
(project root)
├── config.py
├── main.py
└── requirements.txt
```

---

## `config.py`

```python
import os
from dotenv import load_dotenv

load_dotenv()


def get_config() -> dict:
    return {
        "groq_api_key": os.environ.get("GROQ_API_KEY", ""),
        "model": os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
        "scenarios_path": os.environ.get("SCENARIOS_PATH", "data/scenarios.json"),
        "leaderboard_path": os.environ.get("LEADERBOARD_PATH", "data/leaderboard.json"),
    }
```

---

## `main.py`

```python
import asyncio
import argparse
import json
import sys
from pipeline.case_selector import CaseSelector
from pipeline.runner import run_pipeline
from pipeline.metrics import get_leaderboard, get_agent_history


def parse_args():
    parser = argparse.ArgumentParser(
        description="CyberBench — Cybersecurity Agent Evaluator"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # ── run: execute a single evaluation ──
    run_p = sub.add_parser("run", help="Run evaluation pipeline on a case")
    run_p.add_argument("--agent-name", required=True, help="Name of the target agent")
    run_p.add_argument(
        "--agent-description",
        default="A cybersecurity incident response agent.",
        help="Short description of the agent being tested",
    )
    run_p.add_argument(
        "--mode",
        choices=["random", "manual", "sequential"],
        default="random",
        help="Case selection mode",
    )
    run_p.add_argument("--case-id", default=None, help="Case ID for manual mode")
    run_p.add_argument(
        "--difficulty",
        choices=["all", "easy", "medium", "hard"],
        default="all",
    )
    run_p.add_argument("--category", default="all")
    run_p.add_argument("--tags", nargs="*", default=None)
    run_p.add_argument("--scenarios", default="data/scenarios.json")
    run_p.add_argument("--quiet", action="store_true")

    # ── batch: run all matching cases ──
    batch_p = sub.add_parser("batch", help="Run all matching cases")
    batch_p.add_argument("--agent-name", required=True)
    batch_p.add_argument(
        "--agent-description",
        default="A cybersecurity incident response agent.",
    )
    batch_p.add_argument("--difficulty", default="all")
    batch_p.add_argument("--category", default="all")
    batch_p.add_argument("--tags", nargs="*", default=None)
    batch_p.add_argument("--scenarios", default="data/scenarios.json")
    batch_p.add_argument("--quiet", action="store_true")

    # ── leaderboard: show top scores ──
    lb_p = sub.add_parser("leaderboard", help="Show the leaderboard")
    lb_p.add_argument("--top", type=int, default=20)
    lb_p.add_argument(
        "--sort-by",
        default="overall",
        choices=[
            "overall",
            "accuracy",
            "completeness",
            "actionability",
            "technical_depth",
            "mitre_alignment",
            "relevance",
        ],
    )

    # ── history: show all runs for an agent ──
    hist_p = sub.add_parser("history", help="Show run history for an agent")
    hist_p.add_argument("--agent-name", required=True)

    # ── pool: show available scenarios ──
    pool_p = sub.add_parser("pool", help="Show scenario pool summary")
    pool_p.add_argument("--scenarios", default="data/scenarios.json")
    pool_p.add_argument("--difficulty", default="all")
    pool_p.add_argument("--category", default="all")
    pool_p.add_argument("--tags", nargs="*", default=None)

    return parser.parse_args()


async def cmd_run(args):
    selector = CaseSelector(
        scenarios_path=args.scenarios,
        mode=args.mode,
        difficulty=args.difficulty,
        category=args.category,
        tags=args.tags,
        case_id=args.case_id,
    )
    result = await run_pipeline(
        agent_name=args.agent_name,
        agent_description=args.agent_description,
        selector=selector,
        verbose=not args.quiet,
    )
    print("\n" + json.dumps(result, indent=2, default=str))
    return result


async def cmd_batch(args):
    selector = CaseSelector(
        scenarios_path=args.scenarios,
        mode="sequential",
        difficulty=args.difficulty,
        category=args.category,
        tags=args.tags,
    )
    cases = selector.pick_all()
    print(f"Running {len(cases)} cases for agent: {args.agent_name}\n")

    results = []
    for i, case in enumerate(cases):
        print(f"\n{'#'*60}")
        print(f"  CASE {i+1}/{len(cases)}: {case['case_id']}")
        print(f"{'#'*60}")

        case_selector = CaseSelector(
            scenarios_path=args.scenarios,
            mode="manual",
            case_id=case["case_id"],
        )
        result = await run_pipeline(
            agent_name=args.agent_name,
            agent_description=args.agent_description,
            selector=case_selector,
            verbose=not args.quiet,
        )
        results.append(result)

    # summary
    scores = [r["scores"]["overall"] for r in results]
    avg = sum(scores) / len(scores) if scores else 0
    print(f"\n{'='*60}")
    print(f"  BATCH COMPLETE — {len(results)} cases")
    print(f"  Average overall score: {avg:.1f}/100")
    print(f"  Pass: {sum(1 for r in results if r['verdict'] == 'pass')}")
    print(f"  Partial: {sum(1 for r in results if r['verdict'] == 'partial')}")
    print(f"  Fail: {sum(1 for r in results if r['verdict'] == 'fail')}")
    print(f"{'='*60}")

    return results


def cmd_leaderboard(args):
    entries = get_leaderboard(sort_by=args.sort_by, top_n=args.top)
    if not entries:
        print("No entries in leaderboard yet. Run some evaluations first.")
        return

    print(f"\n{'Rank':<5} {'Agent':<25} {'Case':<12} {'Score':<8} {'Verdict':<10}")
    print("-" * 60)
    for i, e in enumerate(entries, 1):
        print(
            f"{i:<5} {e['agent_name']:<25} {e['case_id']:<12} "
            f"{e['scores']['overall']:<8.1f} {e['verdict']:<10}"
        )


def cmd_history(args):
    entries = get_agent_history(args.agent_name)
    if not entries:
        print(f"No history for agent: {args.agent_name}")
        return

    print(f"\nHistory for: {args.agent_name} ({len(entries)} runs)\n")
    for e in entries:
        print(
            f"  {e['timestamp'][:19]}  {e['case_id']:<12} "
            f"score={e['scores']['overall']:.1f}  verdict={e['verdict']}"
        )


def cmd_pool(args):
    selector = CaseSelector(
        scenarios_path=args.scenarios,
        difficulty=args.difficulty,
        category=args.category,
        tags=args.tags,
    )
    summary = selector.pool_summary()
    print(json.dumps(summary, indent=2))


def main():
    args = parse_args()

    if args.command == "run":
        asyncio.run(cmd_run(args))
    elif args.command == "batch":
        asyncio.run(cmd_batch(args))
    elif args.command == "leaderboard":
        cmd_leaderboard(args)
    elif args.command == "history":
        cmd_history(args)
    elif args.command == "pool":
        cmd_pool(args)


if __name__ == "__main__":
    main()
```

---

## `requirements.txt`

```txt
# ── LLM ───────────────────────────────────────────────────────
groq>=1.2.0
python-dotenv>=1.2.2
httpx>=0.28.1

# ── SBERT / ML ────────────────────────────────────────────────
sentence-transformers>=5.4.1
torch>=2.11.0
transformers>=5.5.4
tokenizers>=0.22.2
accelerate>=1.13.0
datasets>=4.8.4
safetensors>=0.7.0
huggingface-hub>=1.11.0

# ── Scientific / Numeric ─────────────────────────────────────
numpy>=2.4.4
scipy>=1.17.1
tqdm>=4.67.3

# ── Server ────────────────────────────────────────────────────
fastapi>=0.136.1
uvicorn[standard]>=0.46.0

# ── OpenEnv ───────────────────────────────────────────────────
openenv-core>=0.2.3
```
