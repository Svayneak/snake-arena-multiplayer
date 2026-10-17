@echo off
title Snake Arena Multiplayer & Spectator Room Launcher
echo ======================================================
echo    INICIANDO SNAKE ARENA (MULTIJUGADOR + ESPECTADOR)
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

:: Liberar puerto 3000 si hay sesiones previas
echo [*] Liberando puerto 3000 (Web Next.js)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    taskkill /f /pid %%a >nul 2>&1
)

:: Liberar puerto 3500 si hay sesiones previas
echo [*] Liberando puerto 3500 (Relay WebSocket)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3500 ^| findstr LISTENING 2^>nul') do (
    taskkill /f /pid %%a >nul 2>&1
)

:: Limpiar archivos residuales de traza
if exist ".next\trace" del /f /q ".next\trace" >nul 2>&1

:: Iniciar Servidor WebSocket Relay en ventana separada
echo [*] Levantando Relay WebSocket en puerto 3500...
start "Relay Server :3500" /MIN cmd /c "node server/relay.js"

:: Abrir navegador en ambas pantallas (Juego y Sala de Espectador) tras 3 segundos
echo [*] Abriendo Navegador: Juego (Slot #1) y Sala de Espectador (/spectator)...
start "" /B cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000 && timeout /t 1 /nobreak >nul && start http://localhost:3000/spectator"

echo [*] Levantando Servidor Web Next.js en http://localhost:3000 ...
echo [*] Conectar Celular (Misma Red Wi-Fi): http://192.168.1.5:3000/spectator
echo [*] Conectar Jugadores en Red Wi-Fi:      http://192.168.1.5:3000
echo.
call npm run dev
pause
