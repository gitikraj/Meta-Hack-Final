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
