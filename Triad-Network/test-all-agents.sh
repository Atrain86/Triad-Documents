#!/bin/bash

# Test script to launch all three Triad agents
# This simulates the agents being online

echo "🚀 Starting all Triad test agents..."
echo ""

# Start each agent in the background
node test-agent.js GPT-5 &
GPT5_PID=$!

node test-agent.js Cline &
CLINE_PID=$!

node test-agent.js Claude &
CLAUDE_PID=$!

echo "✅ All agents started!"
echo ""
echo "Agent PIDs:"
echo "  GPT-5: $GPT5_PID"
echo "  Cline: $CLINE_PID"
echo "  Claude: $CLAUDE_PID"
echo ""
echo "Check the dashboard at http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all agents"

# Wait for user interrupt
trap "echo ''; echo '🛑 Stopping all agents...'; kill $GPT5_PID $CLINE_PID $CLAUDE_PID 2>/dev/null; exit" INT

# Wait indefinitely
wait
