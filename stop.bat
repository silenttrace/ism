@echo off
REM ISM-NIST Mapper - Stop Script (Windows)

echo 🛑 Stopping ISM-NIST Mapper...

REM Kill processes by window title
echo 🔄 Stopping backend server...
taskkill /fi "WindowTitle eq ISM-NIST Backend*" /f /t >nul 2>&1

echo 🔄 Stopping frontend server...
taskkill /fi "WindowTitle eq ISM-NIST Frontend*" /f /t >nul 2>&1

REM Also kill processes on specific ports
echo 🧹 Cleaning up processes on ports 3000 and 3001...

REM Kill process on port 3001 (backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    taskkill /f /pid %%a >nul 2>&1
)

REM Kill process on port 3000 (frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    taskkill /f /pid %%a >nul 2>&1
)

REM Clean up directories
if exist ".pids" rmdir /s /q .pids >nul 2>&1

echo.
echo ✅ ISM-NIST Mapper has been stopped
echo.
pause