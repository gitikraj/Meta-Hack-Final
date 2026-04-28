@echo off
cd /d %~dp0\..
REM ── CyberBench: Show run history for an agent ──

if "%~1"=="" (
    echo Usage: history.bat AGENT_NAME
    exit /b 1
)

.\.venv\Scripts\python.exe main.py history --agent-name "%~1"
