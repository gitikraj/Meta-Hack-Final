@echo off
REM ==================================================================
REM   CyberBench - Stop all running services
REM ==================================================================
cd /d %~dp0\..

echo.
echo  Stopping CyberBench services...
echo.

REM -- Kill FastAPI backend (port 8000) --
set FOUND_BACKEND=0
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :8000 ^| findstr LISTENING') do (
    echo   Killing backend PID %%a (port 8000)
    taskkill /PID %%a /F >nul 2>&1
    set FOUND_BACKEND=1
)
if %FOUND_BACKEND%==0 echo   Backend not running (port 8000 free)

REM -- Kill Next.js frontend (port 3000) --
set FOUND_FRONTEND=0
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :3000 ^| findstr LISTENING') do (
    echo   Killing frontend PID %%a (port 3000)
    taskkill /PID %%a /F >nul 2>&1
    set FOUND_FRONTEND=1
)
if %FOUND_FRONTEND%==0 echo   Frontend not running (port 3000 free)

REM -- Kill any leftover titled windows --
taskkill /FI "WINDOWTITLE eq CyberBench-Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq CyberBench-Frontend*" /F >nul 2>&1

REM -- Kill any orphaned uvicorn / node processes from CyberBench --
for /f "tokens=2" %%p in ('tasklist /FI "IMAGENAME eq uvicorn.exe" /NH 2^>nul ^| findstr uvicorn') do (
    taskkill /PID %%p /F >nul 2>&1
)

echo.
echo  ==================================================================
echo   All CyberBench services stopped.
echo  ==================================================================
echo.
echo   To restart:  scripts\start.bat
echo   Quick start: scripts\start.bat --skip-setup --skip-train
echo.
