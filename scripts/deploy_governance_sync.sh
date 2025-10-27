#!/bin/bash
# Phase III-D: Governance-Aware Synchronization Layer Deployment Script

# Make script executable if necessary
if [[ ! -x "$0" ]]; then
    chmod +x "$0"
    echo "Made script executable"
fi

# Create necessary log directories
mkdir -p logs
touch logs/governance_sync.log

# Display deployment banner
echo ""
echo "======================================================="
echo " TRIAD PHASE III-D: GOVERNANCE-AWARE SYNC DEPLOYMENT"
echo "======================================================="
echo ""
echo "Starting Governance-Aware Synchronization Layer..."
echo ""

# Run in background with nohup or use in foreground with direct execution
if [ "$1" == "--daemon" ]; then
  echo "Starting in daemon mode..."
  nohup node --experimental-modules scripts/start_governance_sync.js > logs/governance_sync_process.log 2>&1 &
  echo $! > .governance_sync.pid
  echo "Governance sync started in background (PID: $(cat .governance_sync.pid))"
  echo "Monitor logs with: tail -f logs/governance_sync_process.log"
else
  echo "Starting in foreground mode..."
  echo "Press Ctrl+C to stop"
  echo ""
  node --experimental-modules scripts/start_governance_sync.js
fi

echo ""
echo "To verify operation: node --experimental-modules scripts/verify_governance.js"
echo ""
