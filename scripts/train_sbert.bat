@echo off
REM ==================================================================
REM   CyberBench - Fine-tune SBERT on cybersecurity corpus
REM ==================================================================
cd /d %~dp0\..

echo Fine-tuning SBERT for cybersecurity semantic scoring...
echo.
echo   Base model:  sbert/base_model/  (all-MiniLM-L6-v2)
echo   Corpus:      sbert/corpus/cyber_pairs.json
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
echo SBERT training complete - model saved to sbert/model/
