# Triad Monitor Extensions

This document outlines advanced extensions for the Triad Terminal Monitor system, including PWA dashboard integration and GitHub log synchronization.

## PWA Dashboard Hooks

### Overview

The Terminal Monitor can be extended with a Progressive Web App (PWA) dashboard to provide a visual interface for monitoring Triad conversations and activities.

### Implementation Steps

1. **Create Dashboard Front-End**

```bash
# Create a new dashboard directory
mkdir -p ~/Documents/AI_LOCAL/PaintBrain7/triad-dashboard
cd ~/Documents/AI_LOCAL/PaintBrain7/triad-dashboard

# Initialize a new React PWA
npx create-react-app . --template pwa
```

2. **Add WebSocket Connection to Relay**

In `src/App.js`, implement WebSocket connection to receive real-time updates:

```javascript
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState({
    relay: 'disconnected',
    gpt5: 'offline',
    claude: 'offline',
    klein: 'offline'
  });

  useEffect(() => {
    // Connect to Triad Relay
    const socket = new WebSocket('ws://localhost:8765/dashboard');
    
    socket.onopen = () => {
      console.log('Connected to Triad Relay');
    };
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Handle different message types
      if (data.type === 'status_update') {
        setStatus(data.status);
      } else if (data.type === 'conversation') {
        setMessages(prevMessages => [...prevMessages, data]);
      }
    };
    
    socket.onclose = () => {
      console.log('Disconnected from Triad Relay');
    };
    
    return () => {
      socket.close();
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Triad Monitor Dashboard</h1>
        <div className="status-panel">
          <div className={`status-indicator ${status.relay}`}>Relay: {status.relay}</div>
          <div className={`status-indicator ${status.gpt5}`}>GPT-5: {status.gpt5}</div>
          <div className={`status-indicator ${status.claude}`}>Claude: {status.claude}</div>
          <div className={`status-indicator ${status.klein}`}>Klein: {status.klein}</div>
        </div>
      </header>
      <main>
        <div className="conversation-panel">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}`}>
              <div className="message-header">
                <span className="sender">{msg.sender}</span>
                <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                <span className="confidence">Confidence: {msg.confidence}</span>
              </div>
              <div className="content">{msg.content}</div>
              <div className="goal">Goal: {msg.goal}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
```

3. **Modify Relay to Support Dashboard**

Add the following endpoint to the Triad Relay (`triad-relay-enhanced.js`):

```javascript
// Add dashboard support
wss.on('connection', (ws, req) => {
  // Check if this is a dashboard connection
  if (req.url === '/dashboard') {
    console.log('Dashboard connected');
    
    // Add to dashboard clients
    dashboardClients.push(ws);
    
    // Send current status
    ws.send(JSON.stringify({
      type: 'status_update',
      status: {
        relay: 'connected',
        gpt5: agents.has('gpt5') ? 'online' : 'offline',
        claude: agents.has('claude') ? 'online' : 'offline',
        klein: agents.has('klein') ? 'online' : 'offline'
      }
    }));
    
    ws.on('close', () => {
      // Remove from dashboard clients
      const index = dashboardClients.indexOf(ws);
      if (index !== -1) {
        dashboardClients.splice(index, 1);
      }
      console.log('Dashboard disconnected');
    });
    
    return;
  }
  
  // Rest of the existing connection code...
});

// Function to broadcast to all dashboard clients
function broadcastToDashboard(data) {
  dashboardClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Modify message handling to broadcast to dashboard
function handleMessage(sender, message) {
  // Existing message handling code...
  
  // Broadcast to dashboard
  broadcastToDashboard({
    type: 'conversation',
    ...message
  });
}
```

4. **Start the Dashboard**

```bash
cd ~/Documents/AI_LOCAL/PaintBrain7/triad-dashboard
npm start
```

5. **Access the Dashboard**

Open your browser to `http://localhost:3000` to view the dashboard.

## Auto-Log Uploads to GitHub

### Overview

Automatically upload session logs to GitHub for later review and analysis.

### Prerequisites

1. Create a dedicated GitHub repository for Triad logs
2. Generate a GitHub Personal Access Token with repo scope

### Implementation Steps

1. **Create GitHub Upload Script**

Create a new file `~/Documents/AI_LOCAL/PaintBrain7/triad_bridge/github-log-uploader.js`:

```javascript
import fs from 'fs';
import path from 'path';
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const GITHUB_TOKEN = process.env.GITHUB_LOG_TOKEN;
const REPO_OWNER = process.env.GITHUB_LOG_OWNER;
const REPO_NAME = process.env.GITHUB_LOG_REPO;
const LOG_DIR = path.join(process.env.HOME, 'Documents/Cline/MCP/logs');

// Initialize Octokit
const octokit = new Octokit({ auth: GITHUB_TOKEN });

// Function to upload a log file
async function uploadLog(logFile) {
  try {
    const content = fs.readFileSync(path.join(LOG_DIR, logFile), 'utf8');
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    
    const response = await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: `logs/${timestamp}-${logFile}`,
      message: `Upload log: ${logFile}`,
      content: Buffer.from(content).toString('base64'),
      committer: {
        name: 'Triad Logger',
        email: 'triad@example.com'
      }
    });
    
    console.log(`Uploaded ${logFile} to GitHub: ${response.data.content.html_url}`);
    return response.data.content.html_url;
  } catch (error) {
    console.error(`Error uploading ${logFile}:`, error);
    throw error;
  }
}

// Function to watch for new log files
function watchLogDirectory() {
  console.log(`Watching log directory: ${LOG_DIR}`);
  
  fs.watch(LOG_DIR, (eventType, filename) => {
    if (eventType === 'rename' && filename.endsWith('.log')) {
      console.log(`New log file detected: ${filename}`);
      
      // Wait a moment to ensure file is completely written
      setTimeout(() => {
        uploadLog(filename)
          .then(url => {
            console.log(`Log uploaded: ${url}`);
          })
          .catch(err => {
            console.error(`Failed to upload log: ${err.message}`);
          });
      }, 5000);
    }
  });
}

// Main function
function main() {
  console.log('Starting GitHub log uploader...');
  
  if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
    console.error('Missing required environment variables. Please check your .env file.');
    process.exit(1);
  }
  
  // Create logs directory if it doesn't exist
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  
  // Start watching for new log files
  watchLogDirectory();
}

main();
```

2. **Update .env File**

Add the following to your `.env` file:

```
# GitHub Log Upload Configuration
GITHUB_LOG_TOKEN=your_personal_access_token
GITHUB_LOG_OWNER=your_github_username
GITHUB_LOG_REPO=triad-logs
```

3. **Install Dependencies**

```bash
cd ~/Documents/AI_LOCAL/PaintBrain7
npm install @octokit/rest
```

4. **Update Launcher Script**

Modify `triad-launcher.sh` to include the log uploader:

```bash
# Add this to the launcher script
osascript -e 'tell application "Terminal"
  do script "cd ~/Documents/AI_LOCAL/PaintBrain7 && echo -e \"\\033[1;34mStarting GitHub Log Uploader...\\033[0m\" && sleep 2 && node triad_bridge/github-log-uploader.js"
  set current settings of selected tab of window 1 to settings set "Pro"
  set position of window 1 to {1240, 100}
  set size of window 1 to {500, 300}
end tell'
```

5. **Enable Logging in Triad Monitor**

Update `triad-monitor.js` to write logs to files:

```javascript
// Add this at the top of the file
import fs from 'fs';
import path from 'path';

// Create logs directory
const LOG_DIR = path.join(process.env.HOME, 'Documents/Cline/MCP/logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create a new log file for this session
const LOG_FILE = path.join(LOG_DIR, `triad-session-${Date.now()}.log`);
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

// Function to log messages
function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${JSON.stringify(message)}\n`;
  logStream.write(logEntry);
}

// Modify the message handling to include logging
socket.on('message', (data) => {
  const message = JSON.parse(data);
  // Existing message handling code...
  
  // Log the message
  logMessage(message);
});
```

## Integration and Testing

1. Start all components with the updated launcher script
2. Verify that logs are being generated in the log directory
3. Confirm that logs are being uploaded to GitHub
4. Access the PWA dashboard to see real-time updates

## Troubleshooting

### Dashboard Connection Issues

If the dashboard cannot connect to the relay:

1. Verify the relay is running
2. Check that WebSocket URL is correct
3. Ensure there are no CORS issues (you may need to add CORS headers to the relay)

### GitHub Upload Failures

If logs are not being uploaded to GitHub:

1. Verify GitHub token has correct permissions
2. Check that the repository exists and is accessible
3. Look for errors in the log uploader terminal window
