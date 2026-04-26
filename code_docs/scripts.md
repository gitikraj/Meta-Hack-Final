# scripts/ — Batch Scripts

## Folder Structure

```
scripts/
├── batch.bat
├── download_model.bat
├── history.bat
├── leaderboard.bat
├── pool.bat
├── run.bat
├── setup.bat
├── start.bat
├── stop.bat
├── train_rl.bat
└── train_sbert.bat
```

---

## `batch.bat`

```bat
@echo off
cd /d %~dp0\..
REM ── CyberBench: Run all matching cases (batch evaluation) ──
REM Usage: batch.bat <agent-name> [--difficulty easy|medium|hard] [--category CAT] [--quiet]
REM Example: batch.bat MyAgent
REM          batch.bat MyAgent --difficulty hard --quiet

if "%~1"=="" (
    echo Usage: batch.bat AGENT_NAME [options]
    exit /b 1
)

set AGENT_NAME=%~1
shift

.\.venv\Scripts\python.exe main.py batch --agent-name "%AGENT_NAME%" %1 %2 %3 %4 %5 %6 %7 %8 %9
```

---

## `download_model.bat`

```bat
@echo off
cd /d %~dp0\..
REM ── CyberBench: Download SBERT base model ──
REM Downloads all-MiniLM-L6-v2 locally (bypasses SSL issues).

echo Downloading base SBERT model to sbert/base_model/ ...
.\.venv\Scripts\python.exe sbert\download_model.py
if errorlevel 1 (
    echo ERROR: Download failed.
    exit /b 1
)
echo Base model downloaded.
```

---

## `history.bat`

```bat
@echo off
cd /d %~dp0\..
REM ── CyberBench: Show run history for an agent ──
REM Usage: history.bat <agent-name>

if "%~1"=="" (
    echo Usage: history.bat AGENT_NAME
    exit /b 1
)

.\.venv\Scripts\python.exe main.py history --agent-name "%~1"
```

---

## `leaderboard.bat`

```bat
@echo off
cd /d %~dp0\..
REM ── CyberBench: Show leaderboard ──
REM Usage: leaderboard.bat [--top N] [--sort-by FIELD]

.\.venv\Scripts\python.exe main.py leaderboard %*
```

---

## `pool.bat`

```bat
@echo off
cd /d %~dp0\..
REM ── CyberBench: Show scenario pool summary ──
REM Usage: pool.bat [--difficulty easy|medium|hard] [--category CAT]

.\.venv\Scripts\python.exe main.py pool %*
```

---

## `run.bat`

```bat
@echo off
cd /d %~dp0\..
REM ── CyberBench: Run a single evaluation ──
REM Usage: run.bat <agent-name> [--case-id CASE_ID] [--difficulty easy|medium|hard] [--quiet]
REM Example: run.bat MyAgent --difficulty hard
REM          run.bat MyAgent --case-id CASE-001

if "%~1"=="" (
    echo Usage: run.bat AGENT_NAME [options]
    echo Options:
    echo   --case-id CASE_ID       Run a specific case
    echo   --difficulty LEVEL      Filter by easy/medium/hard
    echo   --category CAT          Filter by category
    echo   --mode MODE             random / manual / sequential
    echo   --quiet                 Suppress verbose logging
    exit /b 1
)

set AGENT_NAME=%~1
shift

.\.venv\Scripts\python.exe main.py run --agent-name "%AGENT_NAME%" %1 %2 %3 %4 %5 %6 %7 %8 %9
```

---

## `setup.bat`

```bat
@echo off
REM ══════════════════════════════════════════════════════════════
REM   CyberBench — Full project setup (Python + Node.js)
REM ══════════════════════════════════════════════════════════════
cd /d %~dp0\..

echo [1/6] Creating Python virtual environment...
py -3.11 -m venv .venv
if errorlevel 1 (
    echo ERROR: Python 3.11 not found. Install it or adjust the py version.
    exit /b 1
)

echo [2/6] Upgrading pip...
.\.venv\Scripts\python.exe -m pip install --upgrade pip ^
    --trusted-host pypi.org --trusted-host files.pythonhosted.org >nul 2>&1

echo [3/6] Installing Python dependencies...
.\.venv\Scripts\python.exe -m pip install -r requirements.txt ^
    --trusted-host pypi.org --trusted-host files.pythonhosted.org ^
    --trusted-host download.pytorch.org
if errorlevel 1 (
    echo ERROR: pip install failed.
    exit /b 1
)

echo [4/6] Downloading SBERT base model...
.\.venv\Scripts\python.exe sbert\download_model.py
if errorlevel 1 (
    echo WARNING: SBERT download failed — you can retry with: download_model.bat
)

echo [5/6] Installing Node.js dependencies for UI...
if exist web\package.json (
    cd web
    call npm install
    cd ..
) else (
    echo WARNING: web/ directory not found — skipping frontend setup.
)

echo [6/6] Creating .env from template...
if not exist .env (
    copy .env.example .env >nul
    echo Created .env — edit it to add your GROQ_API_KEY.
) else (
    echo .env already exists — skipping.
)

echo.
```

---

## `start.bat`

```bat
@echo off
REM ══════════════════════════════════════════════════════════════
REM   CyberBench — Start backend + frontend
REM ══════════════════════════════════════════════════════════════
cd /d %~dp0\..

echo Starting FastAPI backend on http://localhost:8000 ...
start "CyberBench-Backend" cmd /c "cd /d %~dp0 && call .venv\Scripts\activate && python -m uvicorn server.main:app --host 0.0.0.0 --port 8000 --reload"

REM Give the backend a moment to start
timeout /t 3 /nobreak >nul

echo Starting Next.js frontend on http://localhost:3000 ...
start "CyberBench-Frontend" cmd /c "cd /d %~dp0\web && npm run dev"

echo.
echo ══════════════════════════════════════════════════════════════
echo   CyberBench is running!
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo   API docs: http://localhost:8000/docs
echo.
echo   To stop:  stop.bat
echo ══════════════════════════════════════════════════════════════
```

---

## `stop.bat`

```bat
@echo off
cd /d %~dp0\..
REM ══════════════════════════════════════════════════════════════
REM   CyberBench — Stop all running services
REM ══════════════════════════════════════════════════════════════

echo Stopping CyberBench services...

REM Kill uvicorn (FastAPI backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    echo   Killing backend PID %%a (port 8000)
    taskkill /PID %%a /F >nul 2>&1
)

REM Kill Next.js dev server (port 3000)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo   Killing frontend PID %%a (port 3000)
    taskkill /PID %%a /F >nul 2>&1
)

REM Kill any leftover node/python processes from our titled windows
taskkill /FI "WINDOWTITLE eq CyberBench-Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq CyberBench-Frontend*" /F >nul 2>&1

echo.
echo All CyberBench services stopped.
```

---

## `train_rl.bat`

```bat
@echo off
REM ══════════════════════════════════════════════════════════════
REM   CyberBench — Run RL self-improvement training
REM ══════════════════════════════════════════════════════════════
REM Usage: train_rl.bat [episodes] [difficulty]
REM   episodes:   Number of episodes (default: 10)
REM   difficulty: easy / medium / hard / all (default: all)
REM Example: train_rl.bat 20 hard
cd /d %~dp0\..

set EPISODES=%~1
set DIFFICULTY=%~2
if "%EPISODES%"=="" set EPISODES=10
if "%DIFFICULTY%"=="" set DIFFICULTY=all

echo RL Self-Improvement Training
echo.
echo   Episodes:   %EPISODES%
echo   Difficulty: %DIFFICULTY%
echo   Buffer:     rl_checkpoints/buffer.json
echo   Log:        rl_training.log
echo.

call .venv\Scripts\activate
python -m rl.run_training --episodes %EPISODES% --difficulty %DIFFICULTY%
if errorlevel 1 (
    echo ERROR: RL training failed.
    exit /b 1
)

echo.
echo ══════════════════════════════════════════════════════════════
echo   RL training complete! Check rl_training.log for details.
echo ══════════════════════════════════════════════════════════════
```

---

## `train_sbert.bat`

```bat
@echo off
REM ══════════════════════════════════════════════════════════════
REM   CyberBench — Fine-tune SBERT on cybersecurity corpus
REM ══════════════════════════════════════════════════════════════
cd /d %~dp0\..

echo Fine-tuning SBERT for cybersecurity semantic scoring...
echo.
echo   Base model:  sbert/base_model/  (all-MiniLM-L6-v2)
echo   Corpus:      sbert/corpus/cyber_pairs.json  (150+ pairs)
echo   Output:      sbert/model/
echo.

if not exist sbert\base_model\model.safetensors (
    echo Base model not found. Downloading first...
    .\.venv\Scripts\python.exe sbert\download_model.py
    if errorlevel 1 (
        echo ERROR: Download failed. Run setup.bat first.
        exit /b 1
    )
)

.\.venv\Scripts\python.exe sbert\train.py
if errorlevel 1 (
    echo ERROR: Training failed.
    exit /b 1
)

echo.
echo ══════════════════════════════════════════════════════════════
echo   SBERT training complete!
echo   Fine-tuned model saved to sbert/model/
echo ══════════════════════════════════════════════════════════════
```
