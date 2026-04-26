# CyberBench — Complete Project Structure

**Enterprise Cybersecurity AI Evaluation & Self-Improvement Platform**

---

## Full Directory Tree

```
Kuch_toh_hai/
│
├── config.py                          # Global config — reads GROQ_API_KEY, model, paths from .env
├── main.py                            # CLI entry point — run, batch, leaderboard, pool, history
├── requirements.txt                   # Python dependencies (groq, fastapi, sentence-transformers, torch, etc.)
│
├── agents/                            # LLM-powered specialist agents
│   ├── __init__.py
│   ├── utils.py                       # Shared AsyncGroq client, llm_call(), safe_parse_json(), Timer
│   ├── log_analyst.py                 # Classifies logs, extracts IOCs, detects attack stages
│   ├── vuln_scanner.py                # Static analysis — finds CVEs in assets + dependencies
│   ├── threat_intel.py                # IOC reputation, threat actor attribution, active exploitation
│   ├── orchestrator.py                # Synthesizes 3 agent reports into unified briefing
│   ├── target_agent.py                # The agent being evaluated — generates incident response
│   └── judge.py                       # Scores responses (70% algorithmic + 30% AI qualitative)
│
├── pipeline/                          # 10-stage evaluation pipeline
│   ├── __init__.py
│   ├── case_selector.py               # Random/sequential/manual case picking with filters
│   ├── env_loader.py                  # Data guard — each agent sees only its designated inputs
│   ├── logger.py                      # Pretty terminal logging with timestamps
│   ├── metrics.py                     # Computes final scores, persists leaderboard
│   ├── runner.py                      # Orchestrates all 10 stages sequentially
│   └── semantic.py                    # SBERT singleton scorer (cosine similarity + list match)
│
├── server/                            # FastAPI backend for UI integration
│   ├── __init__.py
│   ├── main.py                        # REST endpoints (trigger, results, leaderboard, RL)
│   ├── pipeline_bridge.py             # Runs pipeline async, stores results by run_id
│   ├── case_builder.py                # Assembles case dict from trigger type + UI logs
│   ├── ground_truth.py                # Known truth for all 8 UI attack scenarios
│   └── log_adapter.py                 # Converts flat UI logs → auth/network/system buckets
│
├── rl/                                # Reinforcement learning self-improvement loop
│   ├── __init__.py
│   ├── config.py                      # RLConfig dataclass (episodes, rewards, curriculum, buffer)
│   ├── environment.py                 # Gym-style env wrapping the pipeline
│   ├── reward.py                      # Reward shaping (baseline subtraction, scaling, streak bonus)
│   ├── experience_buffer.py           # Replay buffer with top-k retrieval + dimension analysis
│   ├── bridge.py                      # Bridges RL ↔ pipeline agents (case picker, judge, LLM)
│   ├── trainer.py                     # Training loop (episode iteration + early stopping)
│   └── run_training.py                # CLI entry point for standalone RL training
│
├── cyberbench_env/                    # OpenEnv Gymnasium-style wrapper
│   ├── __init__.py
│   ├── client.py                      # WebSocket client connecting to OpenEnv server
│   ├── models.py                      # Pydantic models (Observation, ActionResult, EnvConfig)
│   ├── openenv.yaml                   # OpenEnv manifest (name, version, description, actions, observations)
│   └── server/
│       ├── __init__.py
│       ├── app.py                     # WebSocket server with OpenEnv protocol handlers
│       └── cyberbench_environment.py  # CyberBenchEnvironment class wrapping full pipeline
│
├── sbert/                             # SBERT fine-tuning for cybersecurity
│   ├── config.py                      # Hyperparameters (epochs=15, batch=16, LR=2e-5, warmup=10%)
│   ├── download_model.py              # Downloads all-MiniLM-L6-v2 base model
│   ├── train.py                       # Fine-tuning with CosineSimilarityLoss + evaluation
│   ├── base_model/                    # Downloaded pre-trained model weights
│   │   ├── config.json
│   │   ├── config_sentence_transformers.json
│   │   ├── model.safetensors
│   │   ├── modules.json
│   │   ├── README.md
│   │   ├── sentence_bert_config.json
│   │   ├── tokenizer.json
│   │   ├── tokenizer_config.json
│   │   ├── 1_Pooling/
│   │   │   └── config.json
│   │   └── 2_Normalize/
│   ├── corpus/
│   │   └── cyber_pairs.json           # 150+ semantic similarity pairs for training
│   └── model/                         # Fine-tuned model output weights
│       ├── config.json
│       ├── config_sentence_transformers.json
│       ├── model.safetensors
│       ├── modules.json
│       ├── README.md
│       ├── sentence_bert_config.json
│       ├── tokenizer.json
│       ├── tokenizer_config.json
│       ├── 1_Pooling/
│       │   └── config.json
│       ├── 2_Normalize/
│       └── eval/
│           └── similarity_evaluation_cyber-eval_results.csv
│
├── data/                              # Static scenario pool
│   ├── __init__.py
│   └── scenarios.json                 # 10 attack scenarios (case_101–case_110)
│
├── checkpoints/                       # SBERT evaluation results
│   └── model/
│       └── eval/
│           └── similarity_evaluation_cyber-eval_results.csv
│
├── rl_checkpoints/                    # RL experience replay buffer
│   └── buffer.json                    # Persisted episodes (currently empty)
│
├── scripts/                           # Batch file entry points (Windows .bat)
│   ├── setup.bat                      # Full project setup (venv + pip + npm + SBERT download)
│   ├── start.bat                      # Launch backend (8000) + frontend (3000)
│   ├── stop.bat                       # Kill all CyberBench processes
│   ├── train_sbert.bat                # Fine-tune SBERT on cyber corpus
│   ├── train_rl.bat                   # Run RL self-improvement loop
│   ├── run.bat                        # CLI: single case evaluation
│   ├── batch.bat                      # CLI: batch evaluation (all matching cases)
│   ├── pool.bat                       # CLI: show scenario pool summary
│   ├── leaderboard.bat                # CLI: show rankings
│   ├── history.bat                    # CLI: show agent run history
│   └── download_model.bat             # Download SBERT base model
│
├── docs/                              # Project documentation
│   ├── README.md                      # Master docs — architecture, setup, pipeline, scoring, etc.
│   ├── agents.md                      # Full agents/ source code documentation
│   ├── context.md                     # Scenario examples + pipeline runner source
│   ├── data.md                        # scenarios.json schema documentation
│   ├── pipeline.md                    # Full pipeline/ source code documentation
│   ├── rl.md                          # RL subsystem documentation
│   ├── rl_checkpoints.md              # buffer.json schema documentation
│   ├── sbert.md                       # SBERT fine-tuning documentation
│   ├── server.md                      # Server source code documentation
│   ├── UI_context.md                  # Original React prototype source
│   └── web.md                         # Old Vite+React architecture docs
│
├── code_docs/                         # Auto-generated code documentation (this folder)
│   ├── PROJECT_STRUCTURE.md           # ← This file
│   ├── agents.md                      # Full source code for agents/
│   ├── pipeline.md                    # Full source code for pipeline/
│   ├── server.md                      # Full source code for server/
│   ├── rl.md                          # Full source code for rl/
│   ├── cyberbench_env.md              # Full source code for cyberbench_env/
│   ├── scripts.md                     # Full source code for scripts/
│   ├── sbert.md                       # Full source code for sbert/
│   ├── root.md                        # Full source code for root files
│   ├── data.md                        # Scenario data documentation
│   ├── web.md                         # Full source code for web/
│   ├── docs.md                        # Documentation of docs/ folder
│   ├── checkpoints.md                 # SBERT eval results documentation
│   └── rl_checkpoints.md              # RL buffer schema documentation
│
└── web/                               # Next.js interactive frontend
    ├── eslint.config.mjs              # ESLint config (next/core-web-vitals + typescript)
    ├── next-env.d.ts                  # Next.js ambient types
    ├── next.config.ts                 # Next.js config (empty)
    ├── package.json                   # Dependencies: Next.js 16.2.4, React 19.2.4, Tailwind 4
    ├── postcss.config.mjs             # PostCSS with @tailwindcss/postcss
    ├── tsconfig.json                  # TypeScript config (ES2017, bundler resolution)
    ├── public/                        # Static assets
    └── src/
        ├── constants.ts               # API_BASE, VALID_USERS, attack data, tag colors, helpers
        ├── types.ts                   # TypeScript interfaces (LogEntry, AgentStatus, PipelineResult, etc.)
        ├── app/
        │   ├── globals.css            # Design system — HSL tokens, glass cards, animations, scrollbar
        │   ├── layout.tsx             # Root layout with AppProvider + AppShell
        │   ├── page.tsx               # → LoginPage
        │   ├── dashboard/
        │   │   └── page.tsx           # → DashboardPage
        │   ├── documents/
        │   │   └── page.tsx           # → DocumentsPage
        │   ├── network/
        │   │   └── page.tsx           # → NetworkPage
        │   ├── search/
        │   │   └── page.tsx           # → SearchPage
        │   └── upload/
        │       └── page.tsx           # → UploadPage
        ├── components/
        │   ├── AgentPipeline.tsx       # Real-time agent pipeline progress modal
        │   ├── AppShell.tsx            # Main layout shell (Header + LogPanel + modals)
        │   ├── BackBtn.tsx             # "← Back to Dashboard" button
        │   ├── DashboardPage.tsx       # Nav tiles + stats + RL self-improvement panel
        │   ├── DocumentsPage.tsx       # File library — bulk access triggers exfiltration
        │   ├── Header.tsx              # Top bar with logo, pipeline status, user info
        │   ├── LoginPage.tsx           # Login form + credential stuffing + VPN attack buttons
        │   ├── LogPanel.tsx            # SOC log stream panel (right side)
        │   ├── LogRow.tsx              # Single log row with tag coloring
        │   ├── NetworkPage.tsx         # Lateral movement + C2 beacon simulation
        │   ├── PipelineInspector.tsx   # Pipeline replay with agent cards + score display
        │   ├── ResultsModal.tsx        # Full score breakdown modal (algo + qualitative + RL)
        │   ├── ScoreBar.tsx            # Animated score bar component
        │   ├── SearchPage.tsx          # Search with SQL injection presets
        │   └── UploadPage.tsx          # Script execution (malware/persistence simulation)
        └── context/
            └── AppContext.tsx           # Global state — all attack handlers, pipeline polling, navigation
```

---

## Module Overview

### Backend (Python)

| Module | Files | Purpose |
|--------|-------|---------|
| `agents/` | 7 | LLM-powered specialist agents (log analyst, vuln scanner, threat intel, orchestrator, target, judge, utils) |
| `pipeline/` | 7 | 10-stage evaluation pipeline (case selection, data isolation, scoring, metrics, SBERT) |
| `server/` | 6 | FastAPI REST API bridging UI to pipeline (trigger, results, leaderboard, RL endpoints) |
| `rl/` | 8 | Reinforcement learning loop (environment, reward shaping, experience buffer, training) |
| `cyberbench_env/` | 6 | OpenEnv Gymnasium-style wrapper (WebSocket server/client, Pydantic models) |
| `sbert/` | 3 | Sentence-BERT fine-tuning (download, train, config) + model weights |
| `data/` | 2 | Static scenario pool (10 cases in scenarios.json) |

### Frontend (TypeScript/React)

| Area | Files | Purpose |
|------|-------|---------|
| Config | 6 | package.json, tsconfig, ESLint, PostCSS, Next.js config |
| Types/Constants | 2 | TypeScript interfaces + attack simulation data |
| Routes | 6 | App Router pages (login, dashboard, search, documents, upload, network) |
| Components | 15 | UI components (shell, header, log panel, attack pages, modals, score bars) |
| Context | 1 | Global state with all attack handlers, pipeline polling, navigation |
| Styles | 1 | CSS design system (HSL tokens, glass cards, animations) |

### Support

| Area | Files | Purpose |
|------|-------|---------|
| `scripts/` | 11 | Windows .bat entry points for setup, start, stop, train, CLI commands |
| `docs/` | 11 | Project documentation (README, per-module docs, UI context) |
| `checkpoints/` | 1 | SBERT evaluation CSV (cosine pearson/spearman per epoch) |
| `rl_checkpoints/` | 1 | RL experience buffer JSON (currently empty) |
| `code_docs/` | 14 | Auto-generated code documentation (this folder) |

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| LLM | Groq API (llama-3.3-70b-versatile) | groq ≥1.2.0 |
| Semantic Scoring | Sentence-BERT (all-MiniLM-L6-v2, fine-tuned) | sentence-transformers ≥5.4.1 |
| ML Backend | PyTorch | ≥2.11.0 |
| API Server | FastAPI + Uvicorn | ≥0.136.1 |
| Frontend Framework | Next.js (App Router) | 16.2.4 |
| UI Library | React | 19.2.4 |
| Styling | Tailwind CSS | 4.x |
| Language (Frontend) | TypeScript | 5.x |
| Language (Backend) | Python | 3.11+ |

---

## Key Data Files

| File | Format | Description |
|------|--------|-------------|
| `data/scenarios.json` | JSON array | 10 attack scenarios with logs, assets, ground truth |
| `data/leaderboard.json` | JSON array | Agent evaluation rankings (generated at runtime) |
| `rl_checkpoints/buffer.json` | JSON array | RL experience replay episodes |
| `sbert/corpus/cyber_pairs.json` | JSON array | 150+ sentence pairs for SBERT fine-tuning |
| `checkpoints/model/eval/*.csv` | CSV | SBERT training evaluation metrics |
| `.env` | Key=Value | API keys and configuration (gitignored) |

---

## code_docs/ Index

| File | Documents |
|------|-----------|
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | This file — complete project tree and overview |
| [agents.md](agents.md) | `agents/` — All 7 agent source files with full code |
| [pipeline.md](pipeline.md) | `pipeline/` — All 7 pipeline source files with full code |
| [server.md](server.md) | `server/` — All 6 server source files with full code |
| [rl.md](rl.md) | `rl/` — All 8 RL source files with full code |
| [cyberbench_env.md](cyberbench_env.md) | `cyberbench_env/` — All 6 OpenEnv files with full code |
| [sbert.md](sbert.md) | `sbert/` — 3 Python source files with full code |
| [scripts.md](scripts.md) | `scripts/` — All 11 .bat files with full code |
| [root.md](root.md) | Root files — config.py, main.py, requirements.txt |
| [data.md](data.md) | `data/` — scenarios.json schema + full case_101 example |
| [web.md](web.md) | `web/` — All ~25 frontend source files with full code |
| [docs.md](docs.md) | `docs/` — Description of all 11 documentation files |
| [checkpoints.md](checkpoints.md) | `checkpoints/` — SBERT eval results CSV with analysis |
| [rl_checkpoints.md](rl_checkpoints.md) | `rl_checkpoints/` — buffer.json schema documentation |
