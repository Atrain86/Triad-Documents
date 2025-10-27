#!/bin/bash
# Phase III-G: Emergent Learning & Optimization Deployment Script

# Make script executable if necessary
if [[ ! -x "$0" ]]; then
    chmod +x "$0"
    echo "Made script executable"
fi

# Create necessary log directories
mkdir -p logs
touch logs/learning_trace.log

# Display deployment banner
echo ""
echo "========================================================"
echo " TRIAD PHASE III-G: EMERGENT LEARNING DEPLOYMENT"
echo "========================================================"
echo ""
echo "Starting Emergent Learning & Optimization Layer..."
echo ""

# Run in background with nohup or use in foreground with direct execution
if [ "$1" == "--daemon" ]; then
  echo "Starting in daemon mode..."
  nohup node --experimental-modules scripts/start_learning_engine.js > logs/learning_engine.log 2>&1 &
  echo $! > .learning_engine.pid
  echo "Emergent Learning & Optimization Layer started in background (PID: $(cat .learning_engine.pid))"
  echo "Monitor logs with: tail -f logs/learning_engine.log"
else
  echo "Starting in foreground mode..."
  echo "Press Ctrl+C to stop"
  echo ""
  node --experimental-modules scripts/start_learning_engine.js
fi

echo ""
echo "To verify operation: node --experimental-modules scripts/verify_learning_engine.js"
echo ""
