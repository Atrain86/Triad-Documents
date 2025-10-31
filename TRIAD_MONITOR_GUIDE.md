# Triad Terminal Monitor - Quick Start Guide

## 🚀 What This Does

The **Triad Monitor** gives you a real-time terminal UI to:
- Watch live conversations between GPT, Klein, and GitHub
- Test GitHub operations (read/write/alter files)
- Activate killswitch for safety
- Monitor performance metrics

## 📦 Setup (3 Steps)

### Step 1: Start the GitHub Bridge
```bash
cd ~/Documents/AI_LOCAL/PaintBrain7
node triad_bridge/gpt_github_server.js
```
✅ Should see: "GPT GitHub MCP server active on http://localhost:4001"

### Step 2: Start the Enhanced Relay
```bash
cd ~/Documents/Cline/MCP
node triad-relay-enhanced.js
```
✅ Should see: "Enhanced Triad Relay running on localhost:8765"

### Step 3: Launch the Monitor
```bash
cd ~/Documents/Cline/MCP
node triad-monitor.js
```
✅ Should see the colorful terminal UI!

## 🎮 Controls

| Key | Action | Description |
|-----|--------|-------------|
| **T** | Test Message | Sends a test message through the relay |
| **G** | GitHub Test | Tests GitHub operations (lists branches) |
| **K** | Killswitch | Activates/deactivates safety killswitch |
| **C** | Clear | Clears the message history |
| **Q** | Quit | Exits the monitor |

## 📊 What You'll See

```
╔════════════ TRIAD CONVERSATION MONITOR ═══════════╗
║         TRIAD CONVERSATION MONITOR v1.0           ║
╚════════════════════════════════════════════════════╝

📡 CONNECTION STATUS
──────────────────────────────────────────────────
Relay: ● CONNECTED
GPT-5: ● ONLINE
Klein: ● ONLINE

📊 STATISTICS
──────────────────────────────────────────────────
Total Messages: 12
GitHub Operations: 3
Average Latency: 234ms
Last Activity: 11:38:45 PM

💬 CONVERSATION STREAM
──────────────────────────────────────────────────
[11:38:45 PM] gpt5 → Klein
  Goal: "Analyze repository structure"
  Confidence: 0.92 | Tone: 0.88

[11:38:46 PM] cline → GitHub
  Operation: branches
  Params: {"owner":"Atrain86","repo":"Triad-Documents"}...

[11:38:47 PM] GitHub → Relay
  Status: SUCCESS 234ms
```

## 🔬 Testing GitHub Operations

### Test READ Operation
Press **G** to test reading from GitHub (lists branches)

### Test WRITE Operation (via test client)
```bash
# In another terminal:
node test-client.js
```

### Monitor File Changes
The monitor will show all GitHub operations in real-time:
- CREATE file operations
- UPDATE file operations  
- DELETE operations
- Branch/PR creation

## 🛡️ Safety Features

- **Killswitch (K)**: Instantly halts all operations
- **Auto-reconnect**: Reconnects if relay goes down
- **Message validation**: All messages are authenticated
- **Confidence scoring**: Shows confidence levels for each message

## 🎯 Guaranteed Features

The Triad Monitor guarantees:

1. **Real-time observation**: See all messages between agents as they happen
2. **GitHub verification**: Confirm file operations are successful
3. **Safety controls**: Immediate killswitch if needed
4. **Goal visibility**: See goal statements for every message
5. **Performance tracking**: Monitor latency and operation counts

## 🔄 How to Set Up Autonomous Communication

### Step 1: Start All Services
```bash
# Terminal 1 - GitHub Bridge
cd ~/Documents/AI_LOCAL/PaintBrain7
node triad_bridge/gpt_github_server.js

# Terminal 2 - Enhanced Relay
cd ~/Documents/Cline/MCP
node triad-relay-enhanced.js

# Terminal 3 - Monitor
cd ~/Documents/Cline/MCP
node triad-monitor.js
```

### Step 2: Trigger Communication

```bash
# Terminal 4 - Test Client
cd ~/Documents/Cline/MCP
node test-client.js
```

The test client will:
1. Connect GPT and Klein to the relay
2. Send test messages
3. Initiate GitHub operations
4. Verify full round-trip communication

You'll see all the activity in the Terminal Monitor in real-time!

## 🚀 Future Improvements

In the future, a Progressive Web App dashboard will be developed with:

- Web-based UI with real-time visualizations
- Message flow diagrams
- Historical data tracking
- Enhanced controls for the Architect
- Automated testing tools

## 📋 Troubleshooting

| Issue | Solution |
|-------|----------|
| **Monitor can't connect** | Verify relay is running on port 8765 |
| **No GitHub operations** | Check GitHub bridge is running on port 4001 |
| **Authentication failure** | Ensure TRIAD_SECRET in .env is set correctly |
| **No agent activity** | Run test-client.js to generate sample traffic |
| **Display issues** | Try a terminal with color support (iTerm2 recommended) |

For any other issues, check the logs in:
```
~/Documents/Cline/MCP/triad_logs/
```

---

Created: October 30, 2025
Author: Klein (Cline)
Version: 1.0
