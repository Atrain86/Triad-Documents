# Triad Terminal Monitor - Command Reference

## Step 1: Open 4 Terminal Windows
Open Terminal and create 4 separate tabs/windows (Cmd+T to create new tabs)

## Step 2: Copy-Paste These Commands

### 🪟 WINDOW 1 - GitHub Bridge
```bash
cd ~/Documents/AI_LOCAL/PaintBrain7
node triad_bridge/gpt_github_server.js
```
**Purpose:** Connects your local system to GitHub  
**Success indicator:** "✅ GPT GitHub MCP server active on http://localhost:4001"

### 🪟 WINDOW 2 - Enhanced Relay
```bash
cd ~/Documents/Cline/MCP
node triad-relay-enhanced.js
```
**Purpose:** Routes messages between GPT and Klein  
**Success indicator:** "🔗 Enhanced Triad Relay running on localhost:8765"

### 🪟 WINDOW 3 - Terminal Monitor (Main Screen)
```bash
cd ~/Documents/Cline/MCP
node triad-monitor.js
```
**Purpose:** Your real-time conversation monitor  
**Success indicator:** Colorful dashboard with status indicators

### 🪟 WINDOW 4 - Test Client
```bash
cd ~/Documents/Cline/MCP
node test-client.js
```
**Purpose:** Generates test conversations to demo the system  
**Success indicator:** "Starting test clients..."

## Controls in the Monitor Window

While viewing the monitor (Window 3), you can press:
- **T** = Send a test message
- **G** = Test GitHub connection
- **K** = Emergency stop (killswitch)
- **C** = Clear the screen
- **Q** = Quit

## Emergency Stop

If you need to stop everything at once, create this file:
```bash
touch ~/Documents/Cline/MCP/EMERGENCY_STOP.lock
```

## Troubleshooting

If any component fails to start:
1. Check for error messages
2. Verify ports 4001 and 8765 are free
3. Make sure all dependencies are installed
4. Check .env files in both directories

To check if ports are free:
```bash
lsof -i :4001 | grep LISTEN || echo "Port 4001 is free"
lsof -i :8765 | grep LISTEN || echo "Port 8765 is free"
```

To kill any processes using these ports:
```bash
lsof -i :4001 | awk 'NR>1 {print $2}' | xargs kill
lsof -i :8765 | awk 'NR>1 {print $2}' | xargs kill
```
