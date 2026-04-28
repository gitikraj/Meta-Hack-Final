"""
qwen_training/run_training.py

Entry point for local Qwen RFT training.

Usage:
    python -m qwen_training.run_training
    python -m qwen_training.run_training --rounds 3 --episodes-per-round 5
    python -m qwen_training.run_training --push-to-hub --hub-repo your-org/cyberbench-qwen
"""

import argparse
import asyncio
import json
import os
import sys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from dotenv import load_dotenv
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

from qwen_training.rft_trainer import RFTConfig, run_rft


async def main():
    parser = argparse.ArgumentParser(description="Qwen2.5-3B RFT Training for CyberBench")
    parser.add_argument("--model-name", default="Qwen/Qwen2.5-3B-Instruct")
    parser.add_argument("--rounds", type=int, default=5)
    parser.add_argument("--episodes-per-round", type=int, default=8)
    parser.add_argument("--top-k-ratio", type=float, default=0.5)
    parser.add_argument("--min-score", type=float, default=55.0)
    parser.add_argument("--difficulty", default="all")
    parser.add_argument("--output-dir", default="qwen_training/checkpoints")
    parser.add_argument("--no-4bit", action="store_true")
    parser.add_argument("--lora-rank", type=int, default=16)
    parser.add_argument("--push-to-hub", action="store_true")
    parser.add_argument("--hub-repo", default=None)
    parser.add_argument("--hub-token", default=os.environ.get("HF_TOKEN"))
    args = parser.parse_args()

    config = RFTConfig(
        model_name=args.model_name,
        load_in_4bit=not args.no_4bit,
        rounds=args.rounds,
        episodes_per_round=args.episodes_per_round,
        top_k_ratio=args.top_k_ratio,
        min_score_threshold=args.min_score,
        difficulty=args.difficulty,
        output_dir=args.output_dir,
        lora_rank=args.lora_rank,
        push_to_hub=args.push_to_hub,
        hub_repo=args.hub_repo,
        hub_token=args.hub_token,
    )

    print("=" * 60)
    print("  CyberBench — Qwen2.5-3B RFT Training")
    print("=" * 60)
    print(json.dumps({
        "model": config.model_name,
        "rounds": config.rounds,
        "episodes_per_round": config.episodes_per_round,
        "top_k_ratio": config.top_k_ratio,
        "min_score_threshold": config.min_score_threshold,
        "lora_rank": config.lora_rank,
        "output_dir": config.output_dir,
    }, indent=2))

    result = await run_rft(config)
    print("\n[Done]", json.dumps(result, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
