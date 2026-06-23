@echo off
title Unica Promotora - Sistema de Antifraude
color 0A

echo ============================================
echo    UNICA PROMOTORA - Iniciando sistema...
echo ============================================
echo.

echo [1] Liberando porta 4500...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4500 " 2^>nul') do (
  taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo [2] Verificando Python...
python --version
if errorlevel 1 (
  echo ERRO: Python nao encontrado no PATH!
  pause
  exit /b 1
)

echo [3] Iniciando backend FastAPI...
set ROOT=%~dp0
pushd "%ROOT%backend"
start "Unica Promotora - Backend" cmd /k "python -m uvicorn app.main:app --host 0.0.0.0 --port 4500 & pause"
popd

echo.
echo Aguardando servidor iniciar (8 segundos)...
timeout /t 8 /nobreak >nul

echo.
echo ============================================
echo    Sistema disponivel em:
echo    http://localhost:4500
echo ============================================
echo.
start "" "http://localhost:4500"
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
