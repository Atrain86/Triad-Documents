#!/bin/bash

# Triad Terminal Monitor Setup Script
# This script helps you set up the Triad monitoring system

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}     TRIAD TERMINAL MONITOR SETUP HELPER         ${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

# Kill any existing processes on required ports
echo -e "${YELLOW}Checking and clearing required ports...${NC}"

# Check port 4001 (GitHub Bridge)
PORT_4001_PID=$(lsof -ti:4001)
if [ -n "$PORT_4001_PID" ]; then
  echo -e "${RED}Port 4001 is in use by PID $PORT_4001_PID - killing process...${NC}"
  kill -9 $PORT_4001_PID
  echo -e "${GREEN}Process killed${NC}"
else
  echo -e "${GREEN}Port 4001 is free${NC}"
fi

# Check port 8765 (Enhanced Relay)
PORT_8765_PID=$(lsof -ti:8765)
if [ -n "$PORT_8765_PID" ]; then
  echo -e "${RED}Port 8765 is in use by PID $PORT_8765_PID - killing process...${NC}"
  kill -9 $PORT_8765_PID
  echo -e "${GREEN}Process killed${NC}"
else
  echo -e "${GREEN}Port 8765 is free${NC}"
fi

echo ""
echo -e "${GREEN}All ports are now free!${NC}"
echo ""

# Display instructions
echo -e "${YELLOW}===================== SETUP INSTRUCTIONS =====================${NC}"
echo ""
echo -e "${BLUE}You need to open 4 separate terminal windows/tabs:${NC}"
echo ""

echo -e "${GREEN}WINDOW 1 - GitHub Bridge:${NC}"
echo -e "cd ~/Documents/AI_LOCAL/PaintBrain7"
echo -e "node triad_bridge/gpt_github_server.js"
echo ""

echo -e "${GREEN}WINDOW 2 - Enhanced Relay:${NC}"
echo -e "cd ~/Documents/Cline/MCP"
echo -e "node triad-relay-enhanced.js"
echo ""

echo -e "${GREEN}WINDOW 3 - Terminal Monitor:${NC}"
echo -e "cd ~/Documents/Cline/MCP"
echo -e "node triad-monitor.js"
echo ""

echo -e "${GREEN}WINDOW 4 - Test Client:${NC}"
echo -e "cd ~/Documents/Cline/MCP"
echo -e "node test-client.js"
echo ""

echo -e "${YELLOW}=============================================================${NC}"
echo ""
echo -e "${BLUE}Start in this order: Window 1 → Window 2 → Window 3 → Window 4${NC}"
echo -e "${BLUE}Keep all windows open to maintain the connection${NC}"
echo ""
echo -e "${RED}If you need to stop everything, press Ctrl+C in each window${NC}"
echo -e "${RED}or create an emergency stop file:${NC}"
echo -e "touch ~/Documents/Cline/MCP/EMERGENCY_STOP.lock"
echo ""
echo -e "${YELLOW}=============================================================${NC}"
echo ""
echo -e "${GREEN}Ready to launch! Open your terminals now.${NC}"
echo ""
