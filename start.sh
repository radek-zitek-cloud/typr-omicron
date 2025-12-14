#!/bin/bash
set -e

# Start script for Typr Omicron
# Starts both backend and frontend servers

echo "Starting Typr Omicron..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Start backend in background
echo "Starting backend server..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo "Waiting for backend to start..."
sleep 3

# Start frontend
echo "Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================"
echo "Typr Omicron is running!"
echo "========================================"
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "========================================"

# Function to handle cleanup
cleanup() {
    echo ""
    echo "Stopping servers..."
    
    # Send SIGTERM first
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    
    # Wait briefly for graceful shutdown
    sleep 2
    
    # Force kill if still running
    kill -9 $BACKEND_PID 2>/dev/null
    kill -9 $FRONTEND_PID 2>/dev/null
    
    exit 0
}

# Register cleanup function
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
