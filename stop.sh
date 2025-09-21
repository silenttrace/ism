#!/bin/bash

# ISM-NIST Mapper - Stop Script
echo "🛑 Stopping ISM-NIST Mapper..."

# Function to stop a process by PID file
stop_process() {
    local service_name=$1
    local pid_file=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo "🔄 Stopping $service_name (PID: $pid)..."
            kill $pid
            
            # Wait up to 10 seconds for graceful shutdown
            local count=0
            while ps -p $pid > /dev/null 2>&1 && [ $count -lt 10 ]; do
                sleep 1
                count=$((count + 1))
            done
            
            # Force kill if still running
            if ps -p $pid > /dev/null 2>&1; then
                echo "⚡ Force stopping $service_name..."
                kill -9 $pid
            fi
            
            echo "✅ $service_name stopped"
        else
            echo "ℹ️  $service_name was not running"
        fi
        rm -f "$pid_file"
    else
        echo "ℹ️  No PID file found for $service_name"
    fi
}

# Stop backend server
stop_process "Backend server" ".pids/backend.pid"

# Stop frontend server
stop_process "Frontend server" ".pids/frontend.pid"

# Also kill any remaining Node.js processes that might be related
echo "🧹 Cleaning up any remaining processes..."

# Kill processes on ports 3000 and 3001 (more targeted approach)
if command -v lsof &> /dev/null; then
    # Kill process on port 3001 (backend)
    backend_port_pid=$(lsof -ti:3001)
    if [ ! -z "$backend_port_pid" ]; then
        echo "🔄 Stopping process on port 3001..."
        kill $backend_port_pid 2>/dev/null || true
    fi
    
    # Kill process on port 3000 (frontend)
    frontend_port_pid=$(lsof -ti:3000)
    if [ ! -z "$frontend_port_pid" ]; then
        echo "🔄 Stopping process on port 3000..."
        kill $frontend_port_pid 2>/dev/null || true
    fi
fi

# Clean up PID directory
if [ -d ".pids" ]; then
    rmdir .pids 2>/dev/null || true
fi

echo ""
echo "✅ ISM-NIST Mapper has been stopped"
echo ""