#!/bin/bash
# Phase III-E: Co-operative Intelligence Layer Deployment Script

# Make script executable if necessary
if [[ ! -x "$0" ]]; then
    chmod +x "$0"
    echo "Made script executable"
fi

# Create necessary log directories
mkdir -p logs
touch logs/decision_trace.log

# Display deployment banner
echo ""
echo "======================================================="
echo " TRIAD PHASE III-E: COOPERATIVE INTELLIGENCE DEPLOYMENT"
echo "======================================================="
echo ""
echo "Starting Co-operative Intelligence Layer..."
echo ""

# Run in background with nohup or use in foreground with direct execution
if [ "$1" == "--daemon" ]; then
  echo "Starting in daemon mode..."
  nohup node --experimental-modules scripts/start_cooperative_layer.js > logs/cooperative_layer.log 2>&1 &
  echo $! > .cooperative_layer.pid
  echo "Co-operative Intelligence Layer started in background (PID: $(cat .cooperative_layer.pid))"
  echo "Monitor logs with: tail -f logs/cooperative_layer.log"
else
  echo "Starting in foreground mode..."
  echo "Press Ctrl+C to stop"
  echo ""
  node --experimental-modules scripts/start_cooperative_layer.js
fi

echo ""
echo "To verify operation: node --experimental-modules scripts/verify_governance_integration.js"
echo ""
