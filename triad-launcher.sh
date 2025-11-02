#!/bin/bash

# Triad Terminal Monitor Launcher
# This script helps you launch each component in separate terminal windows

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
  local port=$1
  if lsof -i:"$port" > /dev/null; then
    return 0 # Port is in use
  else
    return 1 # Port is free
  fi
}

# Function to kill process on a port
kill_process_on_port() {
  local port=$1
  local pid
  pid=$(lsof -ti:"$port")
  if [ -n "$pid" ]; then
    echo -e "${RED}Killing process $pid on port $port...${NC}"
    kill -9 "$pid"
    sleep 1
    echo -e "${GREEN}Process killed${NC}"
  fi
}

# Display header
clear
echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}     TRIAD TERMINAL MONITOR LAUNCHER             ${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

# Check and kill processes on required ports
echo -e "${YELLOW}Checking required ports...${NC}"

# Check port 4001 (GitHub Bridge)
if check_port 4001; then
  echo -e "${RED}Port 4001 is in use - clearing...${NC}"
  kill_process_on_port 4001
else
  echo -e "${GREEN}Port 4001 is free${NC}"
fi

# Check port 8765 (Enhanced Relay)
if check_port 8765; then
  echo -e "${RED}Port 8765 is in use - clearing...${NC}"
  kill_process_on_port 8765
else
  echo -e "${GREEN}Port 8765 is free${NC}"
fi

echo -e "${GREEN}All ports are ready!${NC}"
echo ""

# Explain what will happen
echo -e "${YELLOW}This script will open 4 terminal windows:${NC}"
echo -e "1. ${BLUE}GitHub Bridge${NC} - Connects to GitHub API"
echo -e "2. ${BLUE}Enhanced Relay${NC} - Routes messages between agents"
echo -e "3. ${BLUE}Terminal Monitor${NC} - Shows the conversations"
echo -e "4. ${BLUE}Test Client${NC} - Generates test messages"
echo ""
echo -e "${YELLOW}Ready to launch terminals? (y/n)${NC}"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
  # On macOS, use osascript to open terminal windows
  if [[ "$OSTYPE" == "darwin"* ]]; then
    
    # Open terminal for GitHub Bridge
    osascript -e 'tell application "Terminal"
      do script "cd ~/Documents/AI_LOCAL/PaintBrain7 && echo -e \"\\033[1;34mStarting GitHub Bridge...\\033[0m\" && sleep 2 && node triad_bridge/gpt_github_server.js"
      set current settings of selected tab of window 1 to settings set "Pro"
      set position of window 1 to {100, 100}
      set size of window 1 to {600, 400}
    end tell'
    
    sleep 3
    
    # Open terminal for Enhanced Relay
    osascript -e 'tell application "Terminal"
      do script "cd ~/Documents/Cline/MCP && echo -e \"\\033[1;34mStarting Enhanced Relay...\\033[0m\" && sleep 2 && node triad-relay-enhanced.js"
      set current settings of selected tab of window 1 to settings set "Pro"
      set position of window 1 to {720, 100}
      set size of window 1 to {600, 400}
    end tell'
    
    sleep 3
    
    # Open terminal for Terminal Monitor
    osascript -e 'tell application "Terminal"
      do script "cd ~/Documents/Cline/MCP && echo -e \"\\033[1;34mStarting Terminal Monitor...\\033[0m\" && sleep 2 && node triad-monitor.js"
      set current settings of selected tab of window 1 to settings set "Pro"
      set position of window 1 to {100, 550}
      set size of window 1 to {800, 500}
    end tell'
    
    sleep 3
    
    # Open terminal for Test Client
    osascript -e 'tell application "Terminal"
      do script "cd ~/Documents/Cline/MCP && echo -e \"\\033[1;34mStarting Test Client...\\033[0m\" && sleep 2 && node test-client.js"
      set current settings of selected tab of window 1 to settings set "Pro"
      set position of window 1 to {920, 550}
      set size of window 1 to {600, 400}
    end tell'
    
    echo -e "${GREEN}All terminals launched! Watch the Terminal Monitor window.${NC}"
  else
    echo -e "${RED}This feature requires macOS. Please open terminal windows manually:${NC}"
    echo -e "${YELLOW}Terminal 1:${NC} cd ~/Documents/AI_LOCAL/PaintBrain7 && node triad_bridge/gpt_github_server.js"
    echo -e "${YELLOW}Terminal 2:${NC} cd ~/Documents/Cline/MCP && node triad-relay-enhanced.js"
    echo -e "${YELLOW}Terminal 3:${NC} cd ~/Documents/Cline/MCP && node triad-monitor.js"
    echo -e "${YELLOW}Terminal 4:${NC} cd ~/Documents/Cline/MCP && node test-client.js"
  fi
else
  echo -e "${YELLOW}Launch cancelled. You can start the terminals manually:${NC}"
  echo -e "${BLUE}Terminal 1:${NC} cd ~/Documents/AI_LOCAL/PaintBrain7 && node triad_bridge/gpt_github_server.js"
  echo -e "${BLUE}Terminal 2:${NC} cd ~/Documents/Cline/MCP && node triad-relay-enhanced.js"
  echo -e "${BLUE}Terminal 3:${NC} cd ~/Documents/Cline/MCP && node triad-monitor.js"
  echo -e "${BLUE}Terminal 4:${NC} cd ~/Documents/Cline/MCP && node test-client.js"
fi

echo ""
echo -e "${YELLOW}MONITOR CONTROLS:${NC}"
echo -e "${BLUE}T${NC} - Send test message"
echo -e "${BLUE}G${NC} - Test GitHub connection"
echo -e "${BLUE}K${NC} - Emergency killswitch"
echo -e "${BLUE}C${NC} - Clear the screen"
echo -e "${BLUE}Q${NC} - Quit the monitor"
echo ""
echo -e "${RED}EMERGENCY STOP:${NC} touch ~/Documents/Cline/MCP/EMERGENCY_STOP.lock"
echo ""
