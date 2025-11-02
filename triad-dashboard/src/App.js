import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import WebSocketManager from './WebSocketManager';

// Import components from local directory
import LLMStatus from './components/LLMStatus';
import SystemMonitor from './components/SystemMonitor';
import ControlPanel from './components/ControlPanel';
import ChatInterface from './components/ChatInterface';
import SystemReportGenerator from './components/SystemReportGenerator';
import CostTracker from './components/CostTracker';
import VSClinePipeline from './components/VSClinePipeline';
import TriadDashboardUI from './components/TriadDashboardUI'; // ✅ Added

export const WebSocketContext = React.createContext(null);

function App() {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [messages, setMessages] = useState([]);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [llmStatuses, setLlmStatuses] = useState([]);
  const [systemStats, setSystemStats] = useState({});
  const [activeTab, setActiveTab] = useState('dashboard');

  const wsManagerRef = useRef(null);

  useEffect(() => {
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8765';
    wsManagerRef.current = new WebSocketManager(wsUrl);

    wsManagerRef.current.on('connected', () => {
      setConnectionStatus('connected');
      setReconnectAttempt(0);
    });

    wsManagerRef.current.on('disconnected', () => {
      setConnectionStatus('disconnected');
    });

    wsManagerRef.current.on('reconnecting', (data) => {
      setConnectionStatus('reconnecting');
      setReconnectAttempt(data.attempt);
    });

    wsManagerRef.current.connect();

    return () => {
      if (wsManagerRef.current) {
        wsManagerRef.current.close();
      }
    };
  }, []);

  const renderConnectionStatus = () => {
    const statusColors = {
      connected: '#4CAF50',
      disconnected: '#f44336',
      reconnecting: '#FFC107'
    };

    return (
      <div className="connection-status" style={{ backgroundColor: statusColors[connectionStatus] }}>
        <span className="status-text">
          {connectionStatus.toUpperCase()}
          {connectionStatus === 'reconnecting' && ` (Attempt ${reconnectAttempt})`}
        </span>
      </div>
    );
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'messages', label: 'Logs', icon: '📋' },
    { id: 'controls', label: 'Controls', icon: '⚙️' }
  ];

  return (
    <WebSocketContext.Provider value={wsManagerRef.current}>
      <div className="App">
        <header className="App-header">
          <div className="header-content">
            <h1>⚙️ Triad Dashboard</h1>
            {renderConnectionStatus()}
          </div>
          <nav className="tab-navigation">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={"tab-button" + (activeTab === tab.id ? ' active' : '')}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </nav>
        </header>

        <main className="App-main">
          {activeTab === 'dashboard' && (
            <div className="dashboard-view">
              {/* ✅ Added TriadDashboardUI above main content */}
              <div className="mb-4">
                <TriadDashboardUI webSocketManager={wsManagerRef.current} />
              </div>

              <div className="dashboard-grid">
                <div className="dashboard-section llm-section">
                  <LLMStatus llms={llmStatuses} />
                </div>
                <div className="dashboard-section monitor-section">
                  <SystemMonitor systemStats={systemStats} />
                </div>
                <div className="dashboard-section report-section">
                  <SystemReportGenerator />
                </div>
                <div className="dashboard-section cost-section">
                  <CostTracker llms={llmStatuses} />
                </div>
                <div className="dashboard-section pipeline-section">
                  <VSClinePipeline />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="chat-view">
              <ChatInterface connectionStatus={connectionStatus} />
            </div>
          )}

          {activeTab === 'controls' && (
            <div className="controls-view">
              <ControlPanel connectionStatus={connectionStatus} />
            </div>
          )}
        </main>
      </div>
    </WebSocketContext.Provider>
  );
}

export default App;
