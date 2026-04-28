@echo off
REM ==================================================================
REM   CyberBench - Full project setup (Python + Node.js)
REM ==================================================================
cd /d %~dp0\..

echo [1/6] Creating Python virtual environment...
py -3.11 -m venv .venv
if errorlevel 1 (
    echo ERROR: Python 3.11 not found. Install it or adjust the py version.
    exit /b 1
)

echo [2/6] Upgrading pip...
.\.venv\Scripts\python.exe -m pip install --upgrade pip ^
    --trusted-host pypi.org --trusted-host files.pythonhosted.org

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
    echo WARNING: SBERT download failed - you can retry with: download_model.bat
)

echo [5/6] Installing Node.js dependencies for UI...
if exist web\package.json (
    cd web
    call npm install
    cd ..
) else (
    echo WARNING: web/ directory not found - skipping frontend setup.
)

echo [6/6] Creating .env from template...
if not exist .env (
    copy .env.example .env >nul
    echo Created .env - edit it to add your GROQ_API_KEY.
) else (
    echo .env already exists - skipping.
)

echo.
echo Setup complete.
