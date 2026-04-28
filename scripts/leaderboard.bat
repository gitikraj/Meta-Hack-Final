@echo off
cd /d %~dp0\..
REM ── CyberBench: Show leaderboard ──

.\.venv\Scripts\python.exe main.py leaderboard %*
