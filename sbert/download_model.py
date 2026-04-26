"""
sbert/download_model.py — Download the base SBERT model past corporate SSL proxy.

Run once:  python sbert/download_model.py
"""

import ssl
import warnings

import httpx

# ── Monkey-patch httpx to skip SSL verification ──
_original_init = httpx.Client.__init__


def _patched_init(self, *args, **kwargs):
    kwargs.setdefault("verify", False)
    _original_init(self, *args, **kwargs)


httpx.Client.__init__ = _patched_init

# Also patch the default ssl context
ssl._create_default_https_context = ssl._create_unverified_context

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
