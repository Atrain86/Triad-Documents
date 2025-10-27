#!/bin/bash
# Phase III-F: Emergent Workflow Orchestration Deployment Script

# Make script executable if necessary
if [[ ! -x "$0" ]]; then
    chmod +x "$0"
    echo "Made script executable"
fi

# Create necessary log directories
mkdir -p logs
touch logs/workflow_trace.log

# Display deployment banner
echo ""
echo "========================================================"
echo " TRIAD PHASE III-F: WORKFLOW ORCHESTRATION DEPLOYMENT"
echo "========================================================"
echo ""
echo "Starting Emergent Workflow Orchestration Layer..."
echo ""

# Run in background with nohup or use in foreground with direct execution
if [ "$1" == "--daemon" ]; then
  echo "Starting in daemon mode..."
  nohup node --experimental-modules scripts/start_workflow_engine.js > logs/workflow_engine.log 2>&1 &
  echo $! > .workflow_engine.pid
  echo "Emergent Workflow Orchestration Layer started in background (PID: $(cat .workflow_engine.pid))"
  echo "Monitor logs with: tail -f logs/workflow_engine.log"
else
  echo "Starting in foreground mode..."
  echo "Press Ctrl+C to stop"
  echo ""
  node --experimental-modules scripts/start_workflow_engine.js
fi

echo ""
echo "To verify operation: node --experimental-modules scripts/verify_workflow_complete.js"
echo ""
