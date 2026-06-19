Dim shell, rootPath
Set shell = CreateObject("WScript.Shell")
rootPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Liberar porta 4500
shell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| findstr "":4500 ""') do taskkill /F /PID %a", 0, True

' Iniciar Redis silenciosamente (se existir)
If CreateObject("Scripting.FileSystemObject").FileExists("C:\Redis\redis-server.exe") Then
    shell.Run "C:\Redis\redis-server.exe --port 6379", 0, False
    WScript.Sleep 2000
End If

' Iniciar backend FastAPI silenciosamente (sem janela)
shell.Run "cmd /c cd /d """ & rootPath & "\backend"" && python -m uvicorn app.main:app --host 0.0.0.0 --port 4500", 0, False

' Aguardar inicialização
WScript.Sleep 6000

' Abrir navegador
shell.Run "http://localhost:4500"
