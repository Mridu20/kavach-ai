# SIH 2026: KAVACH AI Demo Startup Script
# This script starts the backend (FastAPI) and frontend (Vite React) locally.

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   KAVACH AI - Sovereign Workbench Demo   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Start the FastAPI Backend
Write-Host "Starting FastAPI Backend on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $PWD; if (Test-Path venv\Scripts\activate.ps1) { .\venv\Scripts\activate.ps1 }; uvicorn backend.main:app --reload --port 8000"

# 2. Wait a few seconds for backend to initialize
Start-Sleep -Seconds 5

# 3. Start the Frontend Development Server
Write-Host "Starting React Frontend on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "==========================================" -ForegroundColor Green
Write-Host "Demo Environment Started!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "Backend API: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
