@echo off
cd /d %~dp0\..
REM ── CyberBench: Run all matching cases (batch evaluation) ──

if "%~1"=="" (
    echo Usage: batch.bat AGENT_NAME [options]
    exit /b 1
)

set AGENT_NAME=%~1
shift

.\.venv\Scripts\python.exe main.py batch --agent-name "%AGENT_NAME%" %1 %2 %3 %4 %5 %6 %7 %8 %9
