"""
sbert/train.py  —  Fine-tune SBERT on cybersecurity sentence pairs.
"""

import json
import math
import platform
import random
import shutil
import sys
import os
import ssl
import warnings

import httpx

# ── SSL bypass for corporate proxies ──
_orig_httpx_init = httpx.Client.__init__


def _patched_httpx_init(self, *args, **kwargs):
    kwargs.setdefault("verify", False)
    _orig_httpx_init(self, *args, **kwargs)


httpx.Client.__init__ = _patched_httpx_init
ssl._create_default_https_context = ssl._create_unverified_context
warnings.filterwarnings("ignore", message="Unverified HTTPS request")
# Suppress sentence_transformers old-API deprecation noise
warnings.filterwarnings("ignore", category=DeprecationWarning, message="Importing from 'sentence_transformers")
warnings.filterwarnings("ignore", category=UserWarning, message="pin_memory")

# Allow running as `python sbert/train.py` from project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sentence_transformers import SentenceTransformer
from sentence_transformers.losses import CosineSimilarityLoss
from sentence_transformers.evaluation import EmbeddingSimilarityEvaluator
from sentence_transformers import InputExample
from torch.utils.data import DataLoader


# ── Windows safetensors fix ───────────────────────────────────────────────────
# On Windows, safetensors memory-maps model files, and the OS (error 1224)
# blocks overwriting a memory-mapped file. Patch save() to use pickle format.
if platform.system() == "Windows":
    _orig_st_save = SentenceTransformer.save

    def _win_safe_save(self, path, *args, **kwargs):
        kwargs["safe_serialization"] = False
        return _orig_st_save(self, path, *args, **kwargs)

    SentenceTransformer.save = _win_safe_save

from sbert.config import (
    BASE_MODEL,
    CORPUS_PATH,
    OUTPUT_MODEL_DIR,
    EPOCHS,
    BATCH_SIZE,
    LEARNING_RATE,
    WARMUP_RATIO,
    EVAL_SPLIT,
    SEED,
)


def load_corpus(path: str) -> list:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def split_data(pairs: list, eval_ratio: float, seed: int):
    random.seed(seed)
    shuffled = pairs.copy()
    random.shuffle(shuffled)
    split_idx = max(1, int(len(shuffled) * (1 - eval_ratio)))
    return shuffled[:split_idx], shuffled[split_idx:]


def to_examples(pairs: list) -> list:
    return [
        InputExample(
            texts=[p["sentence1"], p["sentence2"]],
            label=float(p["score"]),
        )
        for p in pairs
    ]


def build_evaluator(eval_pairs: list):
    s1 = [p["sentence1"] for p in eval_pairs]
    s2 = [p["sentence2"] for p in eval_pairs]
    scores = [float(p["score"]) for p in eval_pairs]
    return EmbeddingSimilarityEvaluator(
        s1, s2, scores, name="cyber-eval"
    )


def train():
    print("=" * 60)
    print("  SBERT Cybersecurity Fine-Tuning")
    print("=" * 60)

    pairs = load_corpus(CORPUS_PATH)
    print(f"\nCorpus loaded: {len(pairs)} pairs")

    train_pairs, eval_pairs = split_data(pairs, EVAL_SPLIT, SEED)
    print(f"Train: {len(train_pairs)} | Eval: {len(eval_pairs)}")

    # Clean output dir before training to avoid stale memory-mapped files on Windows
    if os.path.isdir(OUTPUT_MODEL_DIR):
        shutil.rmtree(OUTPUT_MODEL_DIR)

    print(f"\nLoading base model: {BASE_MODEL}")
    model = SentenceTransformer(BASE_MODEL)

    train_examples = to_examples(train_pairs)
    train_dataloader = DataLoader(
        train_examples, shuffle=True, batch_size=BATCH_SIZE
    )

    train_loss = CosineSimilarityLoss(model)
    evaluator = build_evaluator(eval_pairs)

    total_steps = len(train_dataloader) * EPOCHS
    warmup_steps = math.ceil(total_steps * WARMUP_RATIO)
    print(f"Total training steps: {total_steps}, warmup: {warmup_steps}")

    print(f"\nTraining started ...")
    model.fit(
        train_objectives=[(train_dataloader, train_loss)],
        evaluator=evaluator,
        epochs=EPOCHS,
        warmup_steps=warmup_steps,
        output_path=OUTPUT_MODEL_DIR,
        optimizer_params={"lr": LEARNING_RATE},
        evaluation_steps=len(train_dataloader),
        save_best_model=True,
        show_progress_bar=True,
    )

    print(f"\nModel saved to: {OUTPUT_MODEL_DIR}")
    print("Training complete!")


if __name__ == "__main__":
    train()
