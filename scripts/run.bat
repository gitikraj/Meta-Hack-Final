@echo off
cd /d %~dp0\..
REM ── CyberBench: Run a single evaluation ──

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
