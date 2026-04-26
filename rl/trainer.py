"""
Training loop that drives the RL self-improvement cycle.
"""

import asyncio
import time
from typing import Callable, Optional

from rl.config import RLConfig
from rl.environment import RLEnvironment, Observation
from rl.reward import RewardSignal, compute_improvement_rate

TARGET_AGENT_BASE_PROMPT = """You are a senior cybersecurity incident responder.

Use the briefing below as the source of truth and answer the goal with concrete,
actionable detail. Structure your response with these sections:
1. WHAT HAPPENED
2. CURRENT RISK
3. IMMEDIATE ACTIONS (numbered)
4. INVESTIGATION STEPS
5. REMEDIATION
6. HARDENING
7. RISK SCORE (0-100)
8. ASSUMPTIONS

Use exact MITRE ATT&CK technique IDs (T1xxx) and CVE IDs where applicable.

GOAL: {goal}

BRIEFING:
{briefing}
"""


class Trainer:
    def __init__(
        self,
        config: RLConfig,
        env: RLEnvironment,
        llm_fn: Callable,
        on_episode_end: Optional[Callable] = None,
    ):
        self.config = config
        self.env = env
        self.llm_fn = llm_fn
        self.on_episode_end = on_episode_end
        self.reward_history: list = []

    async def train(self) -> dict:
        start = time.time()
        for ep in range(1, self.config.max_episodes + 1):
            obs = await self.env.reset()
            prompt = self._build_prompt(obs)
            try:
                response = await self.llm_fn(prompt)
            except Exception as e:
                self._log(f"Episode {ep} llm_fn error: {e}")
                continue
            try:
                step = await self.env.step(response)
            except Exception as e:
                self._log(f"Episode {ep} step error: {e}")
                continue

            self.reward_history.append(step.reward)
            self._log(
                f"Ep {ep}/{self.config.max_episodes} "
                f"case={obs.case_id} score={step.reward.raw_overall} "
                f"verdict={step.reward.verdict}"
            )

            if self.on_episode_end:
                try:
                    self.on_episode_end(ep, obs, step)
                except Exception:
                    pass

            # checkpoint
            if ep % max(1, self.config.save_every) == 0:
                self.env.save_checkpoint(self.config.checkpoint_dir)

            # curriculum bump
            if ep % max(1, self.config.eval_every) == 0:
                self.env.maybe_promote_curriculum()

            # early stopping
            avg = self.env.buffer.avg_score(last_n=5)
            if avg >= self.config.early_stop_threshold and ep >= self.config.warmup_episodes:
                self._log(f"Early stopping at episode {ep} (avg={avg})")
                break

        # final save
        self.env.save_checkpoint(self.config.checkpoint_dir)
        elapsed = time.time() - start
        return self._build_summary(elapsed)

    def _build_prompt(self, obs: Observation) -> str:
        # Inject up to top-k examples from buffer if available
        examples = self.env.buffer.top_k(
            k=self.config.top_k_examples, exclude_case_id=obs.case_id
        )
        ex_text = ""
        if examples:
            ex_text = "\n\nHIGH-SCORING PRIOR RESPONSES (for style reference only):\n"
            for i, e in enumerate(examples, 1):
                snippet = e.response[:600].replace("\n", " ")
                ex_text += f"\n[Example {i} — case {e.case_id}, score {e.reward.raw_overall}]\n{snippet}\n"

        prompt = TARGET_AGENT_BASE_PROMPT.format(
            goal=obs.goal,
            briefing=obs.briefing,
        )
        return prompt + ex_text

    def _log_progress(self):
        recent = self.env.buffer.avg_score(last_n=5)
        self._log(f"Recent avg: {recent}")

    def _build_summary(self, elapsed_sec: float) -> dict:
        return {
            "episodes_run": len(self.reward_history),
            "elapsed_sec": round(elapsed_sec, 1),
            "buffer_size": self.env.buffer.size,
            "avg_score_overall": self.env.buffer.avg_score(),
            "avg_score_last_5": self.env.buffer.avg_score(last_n=5),
            "avg_score_last_10": self.env.buffer.avg_score(last_n=10),
            "pass_rate": self.env.buffer.pass_rate(),
            "weakest_dimension": self.env.buffer.weakest_dimension(),
            "dimension_averages": self.env.buffer.dimension_averages(),
            "improvement": compute_improvement_rate(self.reward_history),
            "score_trajectory": self.env.buffer.score_trajectory(),
        }

    def _log(self, msg: str):
        if self.config.verbose:
            print(f"[RL] {msg}")
        if self.config.log_file:
            try:
                with open(self.config.log_file, "a") as f:
                    f.write(msg + "\n")
            except Exception:
                pass


async def run_training(
    config: RLConfig,
    case_picker: Callable,
    briefing_fn: Callable,
    judge_fn: Callable,
    llm_fn: Callable,
) -> dict:
    env = RLEnvironment(
        config=config,
        case_picker=case_picker,
        briefing_fn=briefing_fn,
        judge_fn=judge_fn,
    )
    trainer = Trainer(config=config, env=env, llm_fn=llm_fn)
    return await trainer.train()
