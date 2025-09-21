@echo off
REM ISM-NIST Mapper - Start Script (Windows)

echo 🚀 Starting ISM-NIST Mapper...

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ and try again.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm and try again.
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm run install:all
    if errorlevel 1 (
        echo ❌ Failed to install dependencies. Please check your internet connection and try again.
        pause
        exit /b 1
    )
)

REM Check if OpenAI API key is set
if not exist "backend\.env" (
    echo ⚠️  No .env file found. Creating one from template...
    copy "backend\.env.example" "backend\.env"
    echo 📝 Please edit backend\.env and add your OpenAI API key before starting the application.
    echo    You can get an API key from: https://platform.openai.com/api-keys
    pause
)

REM Create directories
if not exist "logs" mkdir logs
if not exist ".pids" mkdir .pids

REM Start backend server first
echo 🔧 Starting backend server...
if not exist "backend" (
    echo ❌ Backend directory not found. Make sure you're running this from the project root.
    pause
    exit /b 1
)

cd backend
start "ISM-NIST Backend" /min cmd /c "npm run dev > ..\logs\backend.log 2>&1"
cd ..

echo ✅ Backend server starting...

REM Wait for backend to initialize
echo ⏳ Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

REM Start frontend server
echo 🎨 Starting frontend server...
if not exist "frontend" (
    echo ❌ Frontend directory not found. Make sure you're running this from the project root.
    pause
    exit /b 1
)

cd frontend
start "ISM-NIST Frontend" /min cmd /c "npm run dev > ..\logs\frontend.log 2>&1"
cd ..

echo ✅ Frontend server starting...

REM Wait for servers to start
timeout /t 5 /nobreak >nul

echo.
echo 🎉 ISM-NIST Mapper is starting up!
echo.
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:3001
echo 📊 Health Check: http://localhost:3001/api/health
echo.
echo 📝 Logs:
echo    Backend: logs\backend.log
echo    Frontend: logs\frontend.log
echo.
echo 🛑 To stop the application, run: stop.bat
echo.
echo Opening frontend in your default browser...
timeout /t 3 /nobreak >nul
start http://localhost:3000

pause