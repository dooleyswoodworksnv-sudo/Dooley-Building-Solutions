@echo off
echo ============================================
echo   Dooley's Building Solutions - Launcher
echo ============================================
echo.

cd /d "%~dp0"

echo [0/3] Cleaning up any old processes...
REM Kill any existing node processes on ports 3000 and 3001
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >NUL 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >NUL 2>&1
)
echo    Old processes cleared.
echo.

echo [1/3] Starting Local Asset Web Server (Port 3001)...
start "Asset Backend Server" /min cmd /k "npx tsx server.ts"

echo [2/3] Starting Development Frontend (Port 3000)...
start "React Frontend" /min cmd /k "npm run dev"

echo [3/3] Waiting for systems to spin up...
timeout /t 4 /nobreak > NUL

echo Opening Interface...
start http://localhost:3000

echo.
echo ============================================
echo   All systems running! You can close this.
echo ============================================
timeout /t 3 /nobreak > NUL
