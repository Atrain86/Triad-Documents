#!/bin/bash

echo "🧹 Killing old Vite, Node, and tsx processes..."
pkill -f vite
pkill -f node
pkill -f tsx
sleep 1

echo "🚀 Starting backend on port 5001..."
cd server
npm run dev &
sleep 3

echo "💻 Starting frontend on port 5173..."
cd ../client
npm run dev &
sleep 2

echo "✅ Paint Brain is running!"
echo "   Backend:  http://localhost:5001"
echo "   Frontend: http://localhost:5173"

