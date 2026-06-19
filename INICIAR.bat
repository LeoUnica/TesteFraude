@echo off
title Unica Promotora

echo ============================================
echo    UNICA PROMOTORA - Iniciando sistema...
echo ============================================
echo.

echo [0] Liberando porta 4500...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4500 " 2^>nul') do (
  taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: Iniciar Redis (se existir)
if exist "C:\Redis\redis-server.exe" (
  echo [1/2] Iniciando Redis...
  start "Redis" /min cmd /k "C:\Redis\redis-server.exe --port 6379"
  timeout /t 2 /nobreak >nul
) else (
  echo [1/2] Redis nao encontrado - continuando sem Celery...
)

:: Iniciar backend FastAPI
echo [2/2] Iniciando backend FastAPI...
set ROOT=%~dp0
pushd "%ROOT%backend"
start "Unica Promotora Backend" cmd /k "python -m uvicorn app.main:app --host 0.0.0.0 --port 4500"
popd

echo.
echo    Aguardando servidor iniciar...
timeout /t 6 /nobreak >nul

echo.
echo ============================================
echo    Sistema disponivel em:
echo    http://localhost:4500
echo    API Docs: http://localhost:4500/docs
echo.
echo    Login: admin / Admin@123
echo ============================================
echo.

start "" "http://localhost:4500"
