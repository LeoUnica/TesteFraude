@echo off
title PromoteraSys - Instalacao de Dependencias
echo.
echo ==========================================
echo   PromoteraSys - Instalando Dependencias
echo ==========================================
echo.
echo Este processo pode levar alguns minutos...
echo.

echo [1/2] Instalando dependencias do Backend...
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (
    echo ERRO: Falha ao instalar dependencias do backend!
    pause
    exit /b 1
)

echo.
echo [2/2] Instalando dependencias do Frontend...
cd /d "%~dp0frontend"
call npm install
if %errorlevel% neq 0 (
    echo ERRO: Falha ao instalar dependencias do frontend!
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   Instalacao concluida com sucesso!
echo.
echo   Execute INICIAR.bat para abrir o sistema
echo ==========================================
echo.
pause
