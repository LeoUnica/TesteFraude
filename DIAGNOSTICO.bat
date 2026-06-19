@echo off
set LOG=%USERPROFILE%\Desktop\promotera_erro.txt
echo PromoteraSys - Diagnostico > %LOG%
echo Data: %DATE% %TIME% >> %LOG%
echo. >> %LOG%

echo Testando Node.js... >> %LOG%
node --version >> %LOG% 2>&1
if errorlevel 1 (
  echo ERRO: Node.js nao encontrado no PATH >> %LOG%
  echo Caminho node: >> %LOG%
  where node >> %LOG% 2>&1
) else (
  echo Node.js OK >> %LOG%
)

echo. >> %LOG%
echo Testando backend... >> %LOG%
cd /d "%~dp0backend"
echo Diretorio: %CD% >> %LOG%
echo Arquivos: >> %LOG%
dir src\index.js >> %LOG% 2>&1

echo. >> %LOG%
echo Iniciando backend (aguarde 5 segundos)... >> %LOG%
node src/index.js >> %LOG% 2>&1 &
timeout /t 5 /nobreak >nul

echo. >> %LOG%
echo Verificando porta 4500... >> %LOG%
netstat -an | findstr ":4500" >> %LOG% 2>&1

echo. >> %LOG%
echo FIM DO DIAGNOSTICO >> %LOG%

echo Abrindo arquivo de diagnostico...
notepad %LOG%
