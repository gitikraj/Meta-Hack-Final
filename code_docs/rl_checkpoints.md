# rl_checkpoints/ — RL Experience Replay Buffer

Persistent storage for the RL training loop. Holds the serialised experience replay buffer written by `ExperienceBuffer.save()` and read back by `ExperienceBuffer.load()` on startup so training can resume across sessions.

## Folder Structure

```
rl_checkpoints/
└── buffer.json
```

---

## `buffer.json`

Runtime JSON file — a JSON array of `Episode` objects persisted by the `ExperienceBuffer` class (`rl/experience_buffer.py`). Written after every episode that is added to the buffer. Loaded on server/trainer startup to resume from the previous session.

**Current state**: Empty array (`[]`) — no training episodes have been stored yet.

### Schema per Episode Object

```json
{
  "episode_id": 1,
  "case_id": "test_case",
  "difficulty": "easy",
  "category": "incident",
  "goal": "investigate attack",
  "briefing": "briefing text",
  "response": "response text",
  "reward": {
    "raw_overall": 72.0,
    "shaped_reward": 0.235,
    "dimension_scores": {
      "accuracy": 80.0,
      "completeness": 60.0,
      "actionability": 70.0,
      "technical_depth": 65.0,
      "mitre_alignment": 80.0,
      "relevance": 47.5
    },
    "dimension_deltas": {
      "accuracy": 0.0,
      "completeness": 0.0,
      "actionability": 0.0,
      "technical_depth": 0.0,
      "mitre_alignment": 0.0,
      "relevance": 0.0
    },
    "weakest_dimension": "relevance",
    "strongest_dimension": "accuracy",
    "streak": 1,
    "verdict": "partial"
  },
  "judge_strengths": "good stuff",
  "judge_gaps": "needs work",
  "judge_recommendation": "do better",
  "prompt_version": 0,
  "_fingerprint": "b790ecaf7429f896"
}
```

### Field Reference

| Field | Type | Description |
|---|---|---|
| `episode_id` | int | Sequential episode number since buffer creation |
| `case_id` | string | Which scenario case was used |
| `difficulty` | string | `"easy"` / `"medium"` / `"hard"` |
| `category` | string | Case category label |
| `goal` | string | Investigation goal text shown to the agent |
| `briefing` | string | Full briefing (logs + environment) sent to the agent |
| `response` | string | Raw agent response text |
| `reward.raw_overall` | float | Judge's overall score (0–100) |
| `reward.shaped_reward` | float | Transformed reward after `RewardShaper` (signed float) |
| `reward.dimension_scores` | object | Per-dimension judge scores (accuracy, completeness, etc.) |
| `reward.dimension_deltas` | object | Score change vs. previous episode per dimension |
| `reward.weakest_dimension` | string | Label of the lowest-scoring dimension |
| `reward.strongest_dimension` | string | Label of the highest-scoring dimension |
| `reward.streak` | int | Consecutive episodes above passing threshold |
| `reward.verdict` | string | `"pass"` / `"partial"` / `"fail"` |
| `judge_strengths` | string | Free-text judge feedback on strengths |
| `judge_gaps` | string | Free-text judge feedback on gaps |
| `judge_recommendation` | string | Free-text improvement recommendation |
| `prompt_version` | int | Version of the system prompt used for this episode |
| `_fingerprint` | string | Hash of (case_id + response) for deduplication |

### Related Code

- **Writer**: `rl/experience_buffer.py` → `ExperienceBuffer.save()`
- **Reader**: `rl/experience_buffer.py` → `ExperienceBuffer.load()`
- **Config**: `rl/config.py` → `RLConfig.checkpoint_dir = "rl_checkpoints"`
- **Buffer capacity**: 200 episodes (configurable via `RLConfig.buffer_capacity`)
