@echo off
cd /d %~dp0
echo Iniciando Redis...
start "Redis Server" cmd /k "C:\Redis\redis-server.exe"
timeout /t 2 /nobreak >nul
echo.
echo Iniciando Unica Promotora Backend (FastAPI)...
echo Acesse: http://localhost:4500
echo Docs:   http://localhost:4500/docs
echo.
python -m uvicorn app.main:app --host 0.0.0.0 --port 4500 --reload
