@echo off
cd /d %~dp0\..
REM ── CyberBench: Download SBERT base model ──

echo Downloading base SBERT model to sbert/base_model/ ...
.\.venv\Scripts\python.exe sbert\download_model.py
if errorlevel 1 (
    echo ERROR: Download failed.
    exit /b 1
)
echo Base model downloaded.
