@echo off
cd /d %~dp0\..
REM ==================================================================
REM   CyberBench - Stop all running services
REM ==================================================================

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
