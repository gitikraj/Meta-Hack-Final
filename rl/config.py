from dataclasses import dataclass, field
from typing import Optional


@dataclass
class RLConfig:
    """All knobs for the reinforcement learning self-improvement loop."""
    max_episodes: int = 50
    warmup_episodes: int = 3
    eval_every: int = 5
    early_stop_threshold: float = 90.0
    reward_weights: dict = field(default_factory=lambda: {
        "accuracy": 0.25, "completeness": 0.20, "actionability": 0.20,
        "technical_depth": 0.15, "mitre_alignment": 0.10, "relevance": 0.10,
    })
    reward_baseline: float = 50.0
    reward_scale: float = 0.01
    buffer_capacity: int = 200
    top_k_examples: int = 3
    min_score_for_exemplar: float = 75.0
    curriculum_enabled: bool = True
    difficulty_order: list = field(default_factory=lambda: ["easy", "medium", "hard"])
    promote_threshold: float = 70.0
    checkpoint_dir: str = "rl_checkpoints"
    save_every: int = 5
    verbose: bool = True
    log_file: Optional[str] = "rl_training.log"
