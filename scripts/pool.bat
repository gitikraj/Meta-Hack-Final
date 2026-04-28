@echo off
cd /d %~dp0\..
REM ── CyberBench: Show scenario pool summary ──

.\.venv\Scripts\python.exe main.py pool %*
