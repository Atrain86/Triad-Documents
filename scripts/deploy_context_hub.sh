#!/bin/bash
# Phase III-C: Context Synchronization Layer Deployment Script

# Create necessary log directories
mkdir -p logs
touch logs/telemetry.log
touch logs/adaptive_events.log
touch logs/context_events.log
touch logs/context_sync.log
touch logs/feedback.log

# Create dummy telemetry data for testing if none exists
if [ ! -s logs/telemetry.log ]; then
  echo "Creating sample telemetry data for testing..."
  for i in {1..20}; do 
    echo $((RANDOM % 100 + 100)) >> logs/telemetry.log
  done
  echo "Created sample telemetry data"
fi

# Display deployment banner
echo ""
echo "======================================================="
echo " TRIAD PHASE III-C: CONTEXT SYNCHRONIZATION DEPLOYMENT"
echo "======================================================="
echo ""
echo "Starting Context Hub with telemetry integration..."
echo ""

# Run in background with nohup or use in foreground with direct execution
if [ "$1" == "--daemon" ]; then
  echo "Starting in daemon mode..."
  nohup node --experimental-modules scripts/triad_coordinator.js > logs/context_hub.log 2>&1 &
  echo $! > .context_hub.pid
  echo "Context Hub started in background (PID: $(cat .context_hub.pid))"
  echo "Monitor logs with: tail -f logs/context_hub.log"
else
  echo "Starting in foreground mode..."
  echo "Press Ctrl+C to stop"
  echo ""
  node --experimental-modules scripts/triad_coordinator.js
fi

echo ""
echo "To verify operation: node --experimental-modules scripts/verify_context_hub.js"
echo ""
