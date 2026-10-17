@echo off
title Vibora Retro Next.js 14 - Servidor Produccion
echo ======================================================
echo    MODO PRODUCCION: VIBORA RETRO (MAXIMO RENDIMIENTO)
echo ======================================================
echo.

cd /d "%~dp0"

if exist "C:\Users\thehe\AppData\Local\Programs\nodejs\node.exe" set "PATH=C:\Users\thehe\AppData\Local\Programs\nodejs;%PATH%"
if exist "%USERPROFILE%\AppData\Local\Programs\nodejs\node.exe" set "PATH=%USERPROFILE%\AppData\Local\Programs\nodejs;%PATH%"
if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"

echo [*] Limpiando puerto 3000 de sesiones previas...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo [*] Levantando servidor optimizado en http://localhost:3000 ...
start "" /B cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

call npm start
pause
