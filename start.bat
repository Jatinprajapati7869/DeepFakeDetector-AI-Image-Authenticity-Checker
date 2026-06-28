@echo off
title DeepFakeDetector Launcher
echo.
echo  Starting DeepFakeDetector...
echo  Backend : http://localhost:8000
echo  Frontend: http://localhost:5173
echo  API docs: http://localhost:8000/docs
echo.

REM ── Backend (new cmd window) ────────────────────────────────────────────────
REM Uses "python -m uvicorn" so it works regardless of PATH configuration.
start "Backend - DeepFakeDetector" cmd /k "cd /d "%~dp0backend" && python -m uvicorn app.main:app --reload --port 8000"

REM Wait for the backend to finish starting before launching the frontend
timeout /t 4 /nobreak >nul

REM ── Frontend (new cmd window) ───────────────────────────────────────────────
REM Uses "cmd /k" (not PowerShell) so npm runs without execution-policy issues.
start "Frontend - DeepFakeDetector" cmd /k "cd /d "%~dp0frontend" && npm run dev"

REM Wait for Vite dev server, then open browser
timeout /t 6 /nobreak >nul
start "" "http://localhost:5173"
