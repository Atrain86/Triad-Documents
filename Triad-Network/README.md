# Triad Relay Server

WebSocket relay server for the Triad Dashboard system.

## Quick Start

```bash
cd /Users/atrain/Documents/AI_LOCAL/PaintBrain7/Triad-Network
npm start
```

The server will start on `ws://localhost:5001`

## Usage with Dashboard

1. **Start the relay server** (in one terminal):
   ```bash
   cd /Users/atrain/Documents/AI_LOCAL/PaintBrain7/Triad-Network
   npm start
   ```

2. **Start the dashboard** (in another terminal):
   ```bash
   cd /Users/atrain/Documents/AI_LOCAL/PaintBrain7/Triad-Dashboard
   npm run dev
   ```

3. **Access the dashboard**:
   - Open http://localhost:5173 in your browser
   - The dashboard will automatically connect to the relay server
   - Check the browser console for connection status

## Features

- WebSocket relay on port 5001
- Automatic reconnection support
- Message echoing for testing
- Connection status logging

## Architecture

```
┌─────────────────┐        WebSocket         ┌──────────────┐
│  Triad Dashboard│ ◄────────────────────────►│ Relay Server │
│  (Port 5173)    │      ws://localhost:5001  │  (Port 5001) │
└─────────────────┘                           └──────────────┘
```

The relay server acts as a central hub for inter-agent communication in the Triad system.
