"""
qwen_training/rft_trainer.py

Rejection-Sampling Fine-Tuning (RFT) trainer for Qwen2.5-3B-Instruct.

Training loop:
  1. Collect N episodes (Qwen generates, Judge scores)
  2. Keep top-K by score as "accepted" examples
  3. Fine-tune Qwen on accepted examples with SFT + LoRA
  4. Repeat for M rounds

This implements online RFT (also known as STaR / expert iteration).
Each round the model improves and generates better candidates for the next round.
"""

import json
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


@dataclass
class RFTConfig:
    # Model
    model_name: str = "Qwen/Qwen2.5-3B-Instruct"
    load_in_4bit: bool = True

    # LoRA
    lora_rank: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.05
    lora_target_modules: list = field(default_factory=lambda: [
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ])

    # Training
    rounds: int = 5
    episodes_per_round: int = 8
    top_k_ratio: float = 0.5
    min_score_threshold: float = 55.0

    # SFT hyperparams
    learning_rate: float = 2e-4
    num_train_epochs: int = 2
    per_device_train_batch_size: int = 1
    gradient_accumulation_steps: int = 4
    max_seq_length: int = 3072
    warmup_ratio: float = 0.1

    # Data / Output
    difficulty: str = "all"
    scenarios_path: str = "data/scenarios.json"
    output_dir: str = "qwen_training/checkpoints"
    hub_repo: Optional[str] = None
    push_to_hub: bool = False
    hub_token: Optional[str] = None


def build_lora_model(config: RFTConfig):
    """Load Qwen with 4-bit quantization and attach LoRA adapters."""
    from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
    from peft import LoraConfig, get_peft_model, TaskType
    import torch

    print(f"[RFT] Loading base model: {config.model_name}")
    bnb_cfg = BitsAndBytesConfig(
        load_in_4bit=config.load_in_4bit,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
    ) if config.load_in_4bit else None

    tokenizer = AutoTokenizer.from_pretrained(config.model_name, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    model = AutoModelForCausalLM.from_pretrained(
        config.model_name,
        quantization_config=bnb_cfg,
        device_map="auto",
        trust_remote_code=True,
    )

    lora_cfg = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=config.lora_rank,
        lora_alpha=config.lora_alpha,
        lora_dropout=config.lora_dropout,
        target_modules=config.lora_target_modules,
        bias="none",
    )

    if config.load_in_4bit:
        from peft import prepare_model_for_kbit_training
        model = prepare_model_for_kbit_training(model)

    model = get_peft_model(model, lora_cfg)
    model.print_trainable_parameters()

    return model, tokenizer


def episodes_to_sft_dataset(episodes: list, tokenizer, max_length: int):
    """
    Convert accepted episodes into a HuggingFace Dataset for SFT.
    Each example: full prompt + response (input_ids + labels).
    """
    from datasets import Dataset

    records = []
    for ep in episodes:
        full_text = ep["prompt"] + ep["response"] + tokenizer.eos_token
        enc = tokenizer(
            full_text,
            truncation=True,
            max_length=max_length,
            padding=False,
        )
        # Labels: -100 for prompt tokens (no loss on them), real ids for response
        prompt_enc = tokenizer(ep["prompt"], truncation=True, max_length=max_length)
        prompt_len = len(prompt_enc["input_ids"])
        labels = [-100] * prompt_len + enc["input_ids"][prompt_len:]
        records.append({
            "input_ids": enc["input_ids"],
            "attention_mask": enc["attention_mask"],
            "labels": labels,
        })

    return Dataset.from_list(records)


def sft_step(model, tokenizer, episodes: list, config: RFTConfig, round_idx: int):
    """Run one SFT step on the accepted episodes."""
    from transformers import TrainingArguments, Trainer, DataCollatorForSeq2Seq

    dataset = episodes_to_sft_dataset(episodes, tokenizer, config.max_seq_length)
    print(f"  [SFT] Training on {len(dataset)} examples ...")

    output_subdir = os.path.join(config.output_dir, f"round_{round_idx:02d}")
    Path(output_subdir).mkdir(parents=True, exist_ok=True)

    training_args = TrainingArguments(
        output_dir=output_subdir,
        num_train_epochs=config.num_train_epochs,
        per_device_train_batch_size=config.per_device_train_batch_size,
        gradient_accumulation_steps=config.gradient_accumulation_steps,
        learning_rate=config.learning_rate,
        warmup_ratio=config.warmup_ratio,
        fp16=False,
        bf16=True,
        logging_steps=1,
        save_strategy="no",
        report_to="none",
        dataloader_pin_memory=False,
        remove_unused_columns=False,
    )

    collator = DataCollatorForSeq2Seq(
        tokenizer,
        model=model,
        padding=True,
        pad_to_multiple_of=8,
        label_pad_token_id=-100,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
        data_collator=collator,
    )
    trainer.train()

    adapter_path = os.path.join(output_subdir, "adapter")
    model.save_pretrained(adapter_path)
    tokenizer.save_pretrained(adapter_path)
    print(f"  [SFT] Adapter saved to {adapter_path}")
    return adapter_path


async def run_rft(config: RFTConfig) -> dict:
    """
    Main RFT training loop:
    For each round:
      1. Collect episodes with current model
      2. Accept top-K (by judge score)
      3. SFT on accepted examples
      4. Reload agent with updated adapter
    """
    import asyncio
    from qwen_training.qwen_target_agent import QwenTargetAgent
    from qwen_training.data_collector import collect_episode
    from pipeline.case_selector import CaseSelector

    Path(config.output_dir).mkdir(parents=True, exist_ok=True)
    history = []
    adapter_path = None

    model, tokenizer = build_lora_model(config)

    for rnd in range(1, config.rounds + 1):
        print(f"\n{'='*60}")
        print(f"  RFT Round {rnd}/{config.rounds}")
        print(f"{'='*60}")

        agent = QwenTargetAgent(
            model_name=config.model_name,
            adapter_path=adapter_path,
            load_in_4bit=config.load_in_4bit,
        )
        # Inject the already-loaded model so we don't reload every round
        agent._model = model
        agent._tokenizer = tokenizer

        selector = CaseSelector(config.scenarios_path, mode="random", difficulty=config.difficulty)
        episodes = []

        for ep_idx in range(1, config.episodes_per_round + 1):
            case = selector.pick()
            try:
                ep = await collect_episode(case, agent, verbose=True)
                episodes.append(ep)
                print(f"  Ep {ep_idx}/{config.episodes_per_round} | Score={ep['score']:.1f}")
            except Exception as exc:
                print(f"  [WARN] Episode failed: {exc}")

        if not episodes:
            print("  [WARN] No episodes collected, skipping SFT.")
            continue

        # Filter: keep top-K or those above threshold
        episodes.sort(key=lambda e: e["score"], reverse=True)
        k = max(1, int(len(episodes) * config.top_k_ratio))
        accepted = [e for e in episodes[:k] if e["score"] >= config.min_score_threshold]

        avg_score = sum(e["score"] for e in episodes) / len(episodes)
        accept_rate = len(accepted) / len(episodes)
        print(f"\n  Round {rnd} stats: avg={avg_score:.1f} accepted={len(accepted)}/{len(episodes)} ({accept_rate:.0%})")

        round_record = {
            "round": rnd,
            "episodes": len(episodes),
            "accepted": len(accepted),
            "avg_score": round(avg_score, 2),
            "max_score": round(max(e["score"] for e in episodes), 2),
        }
        history.append(round_record)

        if accepted:
            adapter_path = sft_step(model, tokenizer, accepted, config, rnd)
        else:
            print("  [INFO] No episodes above threshold — skipping SFT this round.")

        # Save round summary
        summary_path = os.path.join(config.output_dir, "training_history.json")
        with open(summary_path, "w") as f:
            json.dump(history, f, indent=2)

    # Push final adapter to HuggingFace Hub
    if config.push_to_hub and config.hub_repo and adapter_path:
        print(f"\n[RFT] Pushing adapter to HuggingFace Hub: {config.hub_repo}")
        model.push_to_hub(config.hub_repo, token=config.hub_token)
        tokenizer.push_to_hub(config.hub_repo, token=config.hub_token)
        print("[RFT] Push complete!")

    print(f"\n[RFT] Training complete. History:\n{json.dumps(history, indent=2)}")
    return {"history": history, "final_adapter": adapter_path}
