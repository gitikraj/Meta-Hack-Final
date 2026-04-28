"""
qwen_training/qwen_target_agent.py

Drop-in replacement for agents/target_agent.py that uses a local
Qwen2.5-3B-Instruct model (or a LoRA fine-tuned checkpoint) instead of Groq.

Usage (sync, for Colab):
    agent = QwenTargetAgent()
    result = agent.run(input_data)

Usage (async, mirrors existing target_agent.run):
    result = await run(input_data, agent=agent)
"""

import os
import time
from typing import Optional

SYSTEM_TEMPLATE = """You are {agent_name}. {agent_description}

You have been given a security incident briefing prepared by specialist analysis agents.
The briefing contains confirmed findings from log analysis, threat intelligence, and
vulnerability assessment.

GOAL: {goal}

BRIEFING:
{briefing}

RULES:
- Do NOT repeat the briefing. Use it as context.
- If data is missing for a section, state your assumptions explicitly.
- Only use CVE numbers and MITRE technique IDs you are confident about.
- Prefer "unknown" over incorrect technical claims.

Structure your response EXACTLY as:

1. WHAT HAPPENED — plain English attack summary
2. CURRENT RISK — what the attacker can do right now
3. IMMEDIATE ACTIONS — numbered, ordered by severity (most critical first)
4. INVESTIGATION STEPS — what to examine and in what order
5. REMEDIATION — how to fully close the attack path
6. HARDENING — what to fix so this cannot recur
7. RISK SCORE — integer 0-100 representing overall severity
8. ASSUMPTIONS — list any assumptions due to incomplete data"""


class QwenTargetAgent:
    """
    Wraps Qwen2.5-3B-Instruct for cybersecurity incident response.
    Loads the model lazily on first call. Supports LoRA adapters.
    """

    def __init__(
        self,
        model_name: str = "Qwen/Qwen2.5-3B-Instruct",
        adapter_path: Optional[str] = None,
        load_in_4bit: bool = True,
        max_new_tokens: int = 2048,
        device_map: str = "auto",
    ):
        self.model_name = model_name
        self.adapter_path = adapter_path
        self.load_in_4bit = load_in_4bit
        self.max_new_tokens = max_new_tokens
        self.device_map = device_map
        self._model = None
        self._tokenizer = None

    def _load(self):
        """Lazy-load model + tokenizer."""
        if self._model is not None:
            return

        from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
        import torch

        print(f"[QwenAgent] Loading {self.model_name} ...")

        bnb_cfg = None
        if self.load_in_4bit:
            bnb_cfg = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_use_double_quant=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.bfloat16,
            )

        self._tokenizer = AutoTokenizer.from_pretrained(
            self.model_name,
            trust_remote_code=True,
        )
        if self._tokenizer.pad_token is None:
            self._tokenizer.pad_token = self._tokenizer.eos_token

        self._model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            quantization_config=bnb_cfg,
            device_map=self.device_map,
            trust_remote_code=True,
            torch_dtype="auto" if not self.load_in_4bit else None,
        )

        if self.adapter_path and os.path.isdir(self.adapter_path):
            from peft import PeftModel
            print(f"[QwenAgent] Loading LoRA adapter from {self.adapter_path}")
            self._model = PeftModel.from_pretrained(self._model, self.adapter_path)

        self._model.eval()
        print("[QwenAgent] Ready.")

    def generate(self, prompt: str) -> str:
        """Generate a response given a formatted chat prompt string."""
        self._load()
        import torch

        inputs = self._tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=4096,
        ).to(self._model.device)

        with torch.no_grad():
            output_ids = self._model.generate(
                **inputs,
                max_new_tokens=self.max_new_tokens,
                do_sample=True,
                temperature=0.7,
                top_p=0.9,
                repetition_penalty=1.1,
                pad_token_id=self._tokenizer.pad_token_id,
                eos_token_id=self._tokenizer.eos_token_id,
            )

        new_tokens = output_ids[0][inputs["input_ids"].shape[1]:]
        return self._tokenizer.decode(new_tokens, skip_special_tokens=True).strip()

    def build_prompt(self, input_data: dict) -> str:
        """Build the chat prompt from input_data dict."""
        self._load()

        system = SYSTEM_TEMPLATE.format(
            agent_name=input_data.get("agent_name", "Qwen Security Analyst"),
            agent_description=input_data.get(
                "agent_description",
                "A cybersecurity incident response AI trained on real attack scenarios."
            ),
            goal=input_data.get("goal", ""),
            briefing=input_data.get("briefing", ""),
        )
        user = f"Analyze this security incident and answer the goal: {input_data.get('goal', '')}\n\nProvide your full analysis now."

        # Use the tokenizer's chat template
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]
        return self._tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )

    def run(self, input_data: dict) -> dict:
        """Synchronous run — mirrors agents/target_agent.run interface."""
        t0 = time.time()
        prompt = self.build_prompt(input_data)
        response = self.generate(prompt)
        elapsed_ms = int((time.time() - t0) * 1000)
        return {
            "response": response,
            "meta": {
                "processing_time_ms": elapsed_ms,
                "model": self.model_name,
                "adapter": self.adapter_path,
            },
        }


async def run(input_data: dict, agent: Optional[QwenTargetAgent] = None) -> dict:
    """
    Async wrapper so this module can be hot-swapped into pipeline/runner.py.
    Pass a pre-loaded QwenTargetAgent instance via `agent` to avoid reloading.
    """
    import asyncio
    if agent is None:
        agent = QwenTargetAgent()
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, agent.run, input_data)
