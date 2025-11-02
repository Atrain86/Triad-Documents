# Testing the Triad Network

This guide explains how to test the Triad relay server and dashboard.

## Prerequisites

Make sure both the relay server and dashboard are running:

**Terminal 1 - Relay Server:**
```bash
cd Triad-Network
node server.js
```

**Terminal 2 - Dashboard:**
```bash
cd Triad-Dashboard
npm start
```

The dashboard should be accessible at http://localhost:3000

## Testing Methods

### Method 1: Quick Test (All Agents at Once)

Run all three test agents simultaneously:

```bash
cd Triad-Network
./test-all-agents.sh
```

This will start GPT-5, Cline, and Claude test agents. You should see:
- All three agents show as "ONLINE" (green) in the dashboard
- Heartbeat messages in the terminal every 5 seconds
- Press Ctrl+C to stop all agents

### Method 2: Individual Agents

Start agents one at a time to see the connection process:

**Terminal 3 - GPT-5:**
```bash
cd Triad-Network
node test-agent.js GPT-5
```

**Terminal 4 - Cline:**
```bash
cd Triad-Network
node test-agent.js Cline
```

**Terminal 5 - Claude:**
```bash
cd Triad-Network
node test-agent.js Claude
```

## What You Should See

### In the Dashboard (http://localhost:3000)
- Each agent card should turn green with "ONLINE" status
- The connection status indicator (top right) should be green
- You can type messages in the chat input and send them
- Messages appear in the message log

### In the Relay Server Terminal
- Connection messages when agents join
- Registration confirmations
- Heartbeat messages every 5 seconds
- Message broadcasts when you send from dashboard

### In Each Test Agent Terminal
- Connection confirmation
- Registration success
- Heartbeat sent messages every 5 seconds
- Received message notifications

## Troubleshooting

### Agents Show as OFFLINE
1. Ensure the relay server is running (Terminal 1)
2. Check that agents are actually connected (look for registration messages)
3. Verify WebSocket connection at ws://localhost:5001

### Dashboard Shows Disconnected
1. Ensure the dashboard is running (Terminal 2)
2. Check browser console for errors (F12)
3. Verify the dashboard is connecting to ws://localhost:5001

### Messages Not Sending
1. Check that at least one agent is connected
2. Look for errors in the relay server terminal
3. Verify the message format in browser console

## Next Steps

Once the test agents work:
1. Replace test agents with actual AI agent implementations
2. Add proper authentication
3. Implement message routing logic
4. Add persistence for message history
