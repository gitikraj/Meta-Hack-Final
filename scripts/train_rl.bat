@echo off
REM ==================================================================
REM   CyberBench - Run RL self-improvement training
REM ==================================================================
cd /d %~dp0\..

set EPISODES=%~1
set DIFFICULTY=%~2
if "%EPISODES%"=="" set EPISODES=10
if "%DIFFICULTY%"=="" set DIFFICULTY=all

echo RL Self-Improvement Training
echo.
echo   Episodes:   %EPISODES%
echo   Difficulty: %DIFFICULTY%
echo   Buffer:     rl_checkpoints/buffer.json
echo   Log:        rl_training.log
echo.

call .venv\Scripts\activate
python -m rl.run_training --episodes %EPISODES% --difficulty %DIFFICULTY%
if errorlevel 1 (
    echo ERROR: RL training failed.
    exit /b 1
)

echo.
echo RL training complete.
