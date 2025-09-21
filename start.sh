#!/bin/bash

# ISM-NIST Mapper - Start Script
echo "🚀 Starting ISM-NIST Mapper..."

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📁 Working directory: $(pwd)"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm and try again."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ] || [ ! -d "frontend/node_modules" ] || [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm run install:all
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies. Please check your internet connection and try again."
        exit 1
    fi
fi

# Check if OpenAI API key is set
if [ ! -f "backend/.env" ]; then
    echo "⚠️  No .env file found. Creating one from template..."
    cp backend/.env.example backend/.env
    echo "📝 Please edit backend/.env and add your OpenAI API key before starting the application."
    echo "   You can get an API key from: https://platform.openai.com/api-keys"
    read -p "Press Enter to continue once you've added your API key..."
fi

# Create necessary directories
mkdir -p .pids
mkdir -p logs

# Start the backend first (it should be ready before frontend tries to connect)
echo "🔧 Starting backend server..."
if [ ! -d "backend" ]; then
    echo "❌ Backend directory not found. Make sure you're running this from the project root."
    exit 1
fi

cd backend
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../.pids/backend.pid
cd ..

echo "✅ Backend server starting (PID: $BACKEND_PID)"

# Wait a moment for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 3

echo "🎨 Starting frontend server..."
if [ ! -d "frontend" ]; then
    echo "❌ Frontend directory not found. Make sure you're running this from the project root."
    exit 1
fi

cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../.pids/frontend.pid
cd ..

echo "✅ Frontend server starting (PID: $FRONTEND_PID)"

# Wait a moment for frontend to start
sleep 3

# Check if processes are running
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend server started (PID: $BACKEND_PID)"
else
    echo "❌ Failed to start backend server"
    exit 1
fi

if ps -p $FRONTEND_PID > /dev/null; then
    echo "✅ Frontend server started (PID: $FRONTEND_PID)"
else
    echo "❌ Failed to start frontend server"
    exit 1
fi

echo ""
echo "🎉 ISM-NIST Mapper is now running!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:3001"
echo "📊 Health Check: http://localhost:3001/api/health"
echo ""
echo "📝 Logs:"
echo "   Backend: logs/backend.log"
echo "   Frontend: logs/frontend.log"
echo ""
echo "🛑 To stop the application, run: ./stop.sh"
echo ""