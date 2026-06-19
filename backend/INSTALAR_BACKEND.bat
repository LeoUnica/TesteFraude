@echo off
cd /d %~dp0
echo Instalando dependencias Python para Unica Promotora Backend...
echo.
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
echo.
echo Instalacao concluida!
echo Para iniciar o backend, execute INICIAR_BACKEND.bat
pause
