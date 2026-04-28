@echo off
REM ==================================================================
REM   CyberBench - Start backend + frontend
REM ==================================================================
cd /d %~dp0\..

echo Starting FastAPI backend on http://localhost:8000 ...
start "CyberBench-Backend" cmd /c "cd /d %~dp0\.. && call .venv\Scripts\activate && python -m uvicorn server.main:app --host 0.0.0.0 --port 8000 --reload"

REM Give the backend a moment to start
timeout /t 3 /nobreak >nul

echo Starting Next.js frontend on http://localhost:3000 ...
start "CyberBench-Frontend" cmd /c "cd /d %~dp0\..\web && npm run dev"

echo.
echo ==================================================================
echo   CyberBench is running!
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo   API docs: http://localhost:8000/docs
echo.
echo   To stop:  scripts\stop.bat
echo ==================================================================
