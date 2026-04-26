# sbert/ — Sentence-BERT Fine-Tuning

## Folder Structure

```
sbert/
├── config.py
├── download_model.py
├── train.py
├── base_model/
│   ├── config_sentence_transformers.json
│   ├── config.json
│   ├── model.safetensors
│   ├── modules.json
│   ├── README.md
│   ├── sentence_bert_config.json
│   ├── tokenizer_config.json
│   ├── tokenizer.json
│   ├── 1_Pooling/
│   │   └── config.json
│   └── 2_Normalize/
├── corpus/
│   └── cyber_pairs.json
└── model/
    ├── config_sentence_transformers.json
    ├── config.json
    ├── model.safetensors
    ├── modules.json
    ├── README.md
    ├── sentence_bert_config.json
    ├── tokenizer_config.json
    ├── tokenizer.json
    ├── 1_Pooling/
    │   └── config.json
    ├── 2_Normalize/
    └── eval/
        └── similarity_evaluation_cyber-eval_results.csv
```

---

## `config.py`

```python
# ── SBERT Fine-Tuning Configuration ──────────────────────────────
# Hyperparameters for training the cybersecurity-adapted SBERT model.

# Base model — local copy downloaded by sbert/download_model.py
BASE_MODEL = "sbert/base_model"

# Paths
CORPUS_PATH = "sbert/corpus/cyber_pairs.json"
OUTPUT_MODEL_DIR = "sbert/model"

# Training
EPOCHS = 15
BATCH_SIZE = 16
LEARNING_RATE = 2e-5
WARMUP_RATIO = 0.10          # 10 % of total training steps
EVAL_SPLIT = 0.15            # hold out 15 % of pairs for evaluation
SEED = 42
```

---

## `download_model.py`

```python
"""
sbert/download_model.py — Download the base SBERT model past corporate SSL proxy.

Run once:  .\.venv\Scripts\python.exe sbert/download_model.py
"""

import ssl
import httpx

# ── Monkey-patch httpx to skip SSL verification ──
_original_init = httpx.Client.__init__

def _patched_init(self, *args, **kwargs):
    kwargs.setdefault("verify", False)
    _original_init(self, *args, **kwargs)

httpx.Client.__init__ = _patched_init

# Also patch the default ssl context
ssl._create_default_https_context = ssl._create_unverified_context

# Suppress urllib3 InsecureRequestWarning if present
import warnings
warnings.filterwarnings("ignore", message="Unverified HTTPS request")

# ── Now download the model ──
import os
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

from sentence_transformers import SentenceTransformer

MODEL_NAME = "all-MiniLM-L6-v2"
SAVE_PATH = os.path.join(os.path.dirname(__file__), "base_model")

print(f"Downloading {MODEL_NAME} ...")
model = SentenceTransformer(MODEL_NAME)

print(f"Saving to {SAVE_PATH} ...")
model.save(SAVE_PATH)

print(f"Done! Model saved to: {SAVE_PATH}")
print(f"Embedding dimension: {model.get_sentence_embedding_dimension()}")

# Quick sanity test
from sentence_transformers import util as st_util
e1 = model.encode("Block malicious IP at firewall", convert_to_tensor=True)
e2 = model.encode("Add attacker IP to network blocklist", convert_to_tensor=True)
e3 = model.encode("Update database schema", convert_to_tensor=True)
print(f"\nSanity check:")
print(f"  'Block malicious IP' vs 'Add attacker IP to blocklist': {st_util.cos_sim(e1, e2).item():.3f}")
print(f"  'Block malicious IP' vs 'Update database schema':       {st_util.cos_sim(e1, e3).item():.3f}")
```

---

## `train.py`

```python
"""
sbert/train.py  —  Fine-tune SBERT on cybersecurity sentence pairs.

Pipeline:
  1. Load corpus of (sentence1, sentence2, similarity_score) triples
  2. Split into train / eval sets
  3. Fine-tune base SBERT using CosineSimilarityLoss
  4. Evaluate with EmbeddingSimilarityEvaluator (Spearman correlation)
  5. Save best model to sbert/model/

Usage:
    python -m sbert.train            # from project root
    python sbert/train.py            # also works
"""

import json
import math
import random
import sys
import os
import ssl
import httpx
import warnings

# ── SSL bypass for corporate proxies ──
_orig_httpx_init = httpx.Client.__init__
def _patched_httpx_init(self, *args, **kwargs):
    kwargs.setdefault("verify", False)
    _orig_httpx_init(self, *args, **kwargs)
httpx.Client.__init__ = _patched_httpx_init
ssl._create_default_https_context = ssl._create_unverified_context
warnings.filterwarnings("ignore", message="Unverified HTTPS request")

# Allow running as `python sbert/train.py` from project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sentence_transformers import (
    SentenceTransformer,
    InputExample,
    losses,
    evaluation,
)
from torch.utils.data import DataLoader

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


# ── 1. Load corpus ─────────────────────────────────────────────
def load_corpus(path: str) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ── 2. Split into train / eval ─────────────────────────────────
def split_data(pairs: list[dict], eval_ratio: float, seed: int):
    random.seed(seed)
    shuffled = pairs.copy()
    random.shuffle(shuffled)
    split_idx = max(1, int(len(shuffled) * (1 - eval_ratio)))
    return shuffled[:split_idx], shuffled[split_idx:]


# ── 3. Convert to InputExamples ────────────────────────────────
def to_examples(pairs: list[dict]) -> list[InputExample]:
    return [
        InputExample(
            texts=[p["sentence1"], p["sentence2"]],
            label=float(p["score"]),
        )
        for p in pairs
    ]


# ── 4. Build evaluator ────────────────────────────────────────
def build_evaluator(eval_pairs: list[dict]):
    s1 = [p["sentence1"] for p in eval_pairs]
    s2 = [p["sentence2"] for p in eval_pairs]
    scores = [float(p["score"]) for p in eval_pairs]
    return evaluation.EmbeddingSimilarityEvaluator(
        s1, s2, scores, name="cyber-eval"
    )


# ── 5. Train ──────────────────────────────────────────────────
def train():
    print("=" * 60)
    print("  SBERT Cybersecurity Fine-Tuning")
    print("=" * 60)

    # --- corpus ---
    pairs = load_corpus(CORPUS_PATH)
    print(f"\nCorpus loaded: {len(pairs)} pairs")

    categories = {}
    for p in pairs:
        cat = p.get("category", "unknown")
        categories[cat] = categories.get(cat, 0) + 1
    print("Category breakdown:")
    for cat, count in sorted(categories.items()):
        print(f"  {cat}: {count}")

    # --- split ---
    train_pairs, eval_pairs = split_data(pairs, EVAL_SPLIT, SEED)
    print(f"\nTrain: {len(train_pairs)} | Eval: {len(eval_pairs)}")

    # --- model ---
    print(f"\nLoading base model: {BASE_MODEL}")
    model = SentenceTransformer(BASE_MODEL)

    # --- dataloader ---
    train_examples = to_examples(train_pairs)
    train_dataloader = DataLoader(
        train_examples, shuffle=True, batch_size=BATCH_SIZE
    )

    # --- loss ---
    train_loss = losses.CosineSimilarityLoss(model)

    # --- evaluator ---
    evaluator = build_evaluator(eval_pairs)

    # --- warmup ---
    total_steps = len(train_dataloader) * EPOCHS
    warmup_steps = math.ceil(total_steps * WARMUP_RATIO)
    print(f"Total training steps: {total_steps}")
    print(f"Warmup steps: {warmup_steps}")
    print(f"Epochs: {EPOCHS} | Batch size: {BATCH_SIZE} | LR: {LEARNING_RATE}")

    # --- fit ---
    print(f"\nTraining started …")
    model.fit(
        train_objectives=[(train_dataloader, train_loss)],
        evaluator=evaluator,
        epochs=EPOCHS,
        warmup_steps=warmup_steps,
        output_path=OUTPUT_MODEL_DIR,
        optimizer_params={"lr": LEARNING_RATE},
        evaluation_steps=len(train_dataloader),   # eval once per epoch
        save_best_model=True,
        show_progress_bar=True,
    )

    print(f"\nModel saved to: {OUTPUT_MODEL_DIR}")
    print("=" * 60)
    print("  Training complete!")
    print("=" * 60)

    # --- quick sanity check ---
    print("\n── Sanity Check ──")
    saved = SentenceTransformer(OUTPUT_MODEL_DIR)
    test_pairs = [
        ("Block malicious IP at firewall", "Add attacker IP to network blocklist"),
        ("Block malicious IP at firewall", "Update database schema"),
        ("Credential stuffing attack", "Automated login attempts using leaked passwords"),
        ("Credential stuffing attack", "Routine backup completed"),
    ]
    from sentence_transformers import util as st_util
    for a, b in test_pairs:
        emb_a = saved.encode(a, convert_to_tensor=True)
        emb_b = saved.encode(b, convert_to_tensor=True)
        sim = st_util.cos_sim(emb_a, emb_b).item()
        print(f"  sim={sim:.3f}  |  \"{a}\"  ↔  \"{b}\"")


if __name__ == "__main__":
    train()
```
