@echo off
echo Encerrando PromoteraSys...
taskkill /F /FI "WINDOWTITLE eq PromoteraSys Backend" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq PromoteraSys Frontend" >nul 2>&1
echo Pronto.
timeout /t 2 /nobreak >nul
