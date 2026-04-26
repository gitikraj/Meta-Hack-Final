import asyncio
import argparse
import json
from pipeline.case_selector import CaseSelector
from pipeline.runner import run_pipeline
from pipeline.metrics import get_leaderboard, get_agent_history


def parse_args():
    parser = argparse.ArgumentParser(description="CyberBench - Cybersecurity Agent Evaluator")
    sub = parser.add_subparsers(dest="command", required=True)
    run_p = sub.add_parser("run")
    run_p.add_argument("--agent-name", required=True)
    run_p.add_argument("--agent-description", default="A cybersecurity incident response agent.")
    run_p.add_argument("--mode", choices=["random", "manual", "sequential"], default="random")
    run_p.add_argument("--case-id", default=None)
    run_p.add_argument("--difficulty", default="all")
    run_p.add_argument("--category", default="all")
    run_p.add_argument("--tags", nargs="*", default=None)
    run_p.add_argument("--scenarios", default="data/scenarios.json")
    run_p.add_argument("--quiet", action="store_true")
    batch_p = sub.add_parser("batch")
    batch_p.add_argument("--agent-name", required=True)
    batch_p.add_argument("--agent-description", default="A cybersecurity incident response agent.")
    batch_p.add_argument("--difficulty", default="all")
    batch_p.add_argument("--category", default="all")
    batch_p.add_argument("--tags", nargs="*", default=None)
    batch_p.add_argument("--scenarios", default="data/scenarios.json")
    batch_p.add_argument("--quiet", action="store_true")
    lb_p = sub.add_parser("leaderboard")
    lb_p.add_argument("--top", type=int, default=20)
    lb_p.add_argument("--sort-by", default="overall")
    hist_p = sub.add_parser("history")
    hist_p.add_argument("--agent-name", required=True)
    pool_p = sub.add_parser("pool")
    pool_p.add_argument("--scenarios", default="data/scenarios.json")
    pool_p.add_argument("--difficulty", default="all")
    pool_p.add_argument("--category", default="all")
    pool_p.add_argument("--tags", nargs="*", default=None)
    return parser.parse_args()


async def cmd_run(args):
    selector = CaseSelector(args.scenarios, args.mode, args.difficulty, args.category, args.tags, args.case_id)
    result = await run_pipeline(args.agent_name, args.agent_description, selector, verbose=not args.quiet)
    print(json.dumps(result, indent=2, default=str))


async def cmd_batch(args):
    selector = CaseSelector(args.scenarios, "sequential", args.difficulty, args.category, args.tags)
    results = []
    for case in selector.pick_all():
        manual = CaseSelector(args.scenarios, "manual", case_id=case["case_id"])
        results.append(await run_pipeline(args.agent_name, args.agent_description, manual, verbose=not args.quiet))
    print(json.dumps(results, indent=2, default=str))


def main():
    args = parse_args()
    if args.command == "run":
        asyncio.run(cmd_run(args))
    elif args.command == "batch":
        asyncio.run(cmd_batch(args))
    elif args.command == "leaderboard":
        print(json.dumps(get_leaderboard(args.sort_by, args.top), indent=2, default=str))
    elif args.command == "history":
        print(json.dumps(get_agent_history(args.agent_name), indent=2, default=str))
    elif args.command == "pool":
        print(json.dumps(CaseSelector(args.scenarios, difficulty=args.difficulty, category=args.category, tags=args.tags).pool_summary(), indent=2))


if __name__ == "__main__":
    main()
