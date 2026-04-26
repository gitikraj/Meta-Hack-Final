"""
Standalone RL self-improvement loop entry point.

Usage:
    python -m rl.run_training
    python -m rl.run_training --episodes 10 --difficulty easy
"""

import argparse
import asyncio
import json
import os
import sys

# Ensure project root is on sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from rl.config import RLConfig
from rl.trainer import run_training
from rl.bridge import make_case_picker, briefing_fn, judge_fn, llm_fn


async def main():
    parser = argparse.ArgumentParser(description="CyberBench RL Self-Improvement Training")
    parser.add_argument("--episodes", type=int, default=10)
    parser.add_argument("--difficulty", type=str, default="all")
    parser.add_argument("--eval-every", type=int, default=3)
    parser.add_argument("--early-stop", type=float, default=95.0)
    parser.add_argument("--checkpoint-dir", type=str, default="rl_checkpoints")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    config = RLConfig(
        max_episodes=args.episodes,
        warmup_episodes=min(2, args.episodes),
        eval_every=args.eval_every,
        save_every=max(1, args.episodes // 3),
        early_stop_threshold=args.early_stop,
        verbose=not args.quiet,
        checkpoint_dir=args.checkpoint_dir,
        curriculum_enabled=(args.difficulty == "all"),
    )

    summary = await run_training(
        config=config,
        case_picker=make_case_picker(args.difficulty),
        briefing_fn=briefing_fn,
        judge_fn=judge_fn,
        llm_fn=llm_fn,
    )
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
