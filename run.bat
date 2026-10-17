@echo off
title Vibora Retro Next.js 14 - Servidor Dev
echo ======================================================
echo    INICIANDO VIBORA RETRO (NEXT.JS 14 APP ROUTER)
echo ======================================================
echo.

cd /d "%~dp0"

:: Configurar Node.js en PATH
if exist "C:\Users\thehe\AppData\Local\Programs\nodejs\node.exe" set "PATH=C:\Users\thehe\AppData\Local\Programs\nodejs;%PATH%"
if exist "%USERPROFILE%\AppData\Local\Programs\nodejs\node.exe" set "PATH=%USERPROFILE%\AppData\Local\Programs\nodejs;%PATH%"
if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"

echo [*] Version de Node.js:
node -v
echo.

:: Liberar puerto 3000 si hay procesos huerfanos previos
echo [*] Limpiando puerto 3000 de sesiones previas...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    echo [*] Cerrando proceso previo en puerto 3000 (PID: %%a)...
    taskkill /f /pid %%a >nul 2>&1
)

:: Limpiar archivos temporales de trace si quedaron bloqueados
if exist ".next\trace" del /f /q ".next\trace" >nul 2>&1

echo [*] Levantando servidor Next.js en http://localhost:3000 ...
:: Abrir el navegador con 3 segundos de cortesia para que el servidor este listo
start "" /B cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

call npm run dev
pause
