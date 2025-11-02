import React, { useState, useEffect, useRef } from 'react';

const TriadDashboardUI = ({ webSocketManager }) => {
  // State management
  const [health, setHealth] = useState({ status: 'normal', color: 'blue' });
  const [costs, setCosts] = useState({ current: 0, total: 0 });
  const [killswitch, setKillswitch] = useState({ active: false, reason: '' });
  const [agents, setAgents] = useState({
    GPT: { status: 'offline', color: 'gray' },
    Opus: { status: 'offline', color: 'gray' },
    Architect: { status: 'offline', color: 'gray' },
    Cline: { status: 'offline', color: 'gray' }
  });
  const logWindowRef = useRef(null);

  // Event listeners setup
  useEffect(() => {
    if (webSocketManager) {
      // Health status updates
      webSocketManager.on('triad:health', (data) => {
        setHealth({
          status: data.status,
          color: data.color
        });
      });

      // Cost updates
      webSocketManager.on('triad:costs', (data) => {
        setCosts(data);
      });

      // Killswitch status
      webSocketManager.on('triad:killswitch', (data) => {
        setKillswitch(data);
      });

      // Agent status updates
      webSocketManager.on('triad:agent', (data) => {
        setAgents(prev => ({
          ...prev,
          [data.name]: {
            status: data.status,
            color: data.color
          }
        }));
      });

      // Log entries
      webSocketManager.on('triad:log', (data) => {
        appendToLog(data);
      });
    }
  }, [webSocketManager]);

  // Auto-scroll log window
  const appendToLog = (data) => {
    if (logWindowRef.current) {
      const entry = document.createElement('div');
      entry.className = `log-entry ${data.level} mb-1 px-2 py-1 rounded`;
      entry.textContent = `[${new Date(data.timestamp).toLocaleTimeString()}] ${data.message}`;
      logWindowRef.current.appendChild(entry);
      logWindowRef.current.scrollTop = logWindowRef.current.scrollHeight;
    }
  };

  return (
    <div className="bg-gray-900 text-white p-4 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Triad Control Panel</h2>
        <div className="flex items-center space-x-4">
          {/* Health Indicator */}
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 bg-aframe${health.color} animate-pulse`}></div>
            <span className="text-sm">System Health</span>
          </div>
          {/* Cost Display */}
          <div className="flex items-center">
            <span className="text-aframeYellow font-mono">
              ${costs.current.toFixed(2)} / ${costs.total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {/* Agent Status Lights */}
        {Object.entries(agents).map(([name, status]) => (
          <div key={name} className="flex flex-col items-center bg-gray-800 p-3 rounded">
            <div className={`w-4 h-4 rounded-full mb-2 bg-aframe${status.color}`}></div>
            <span className="text-sm font-medium">{name}</span>
            <span className="text-xs text-gray-400">{status.status}</span>
          </div>
        ))}
      </div>

      {/* Killswitch Toggle */}
      <div className={`mb-4 p-3 rounded flex items-center justify-between
        ${killswitch.active ? 'bg-aframeRed bg-opacity-20' : 'bg-gray-800'}`}>
        <div>
          <h3 className="font-medium">Emergency Killswitch</h3>
          {killswitch.active && (
            <p className="text-sm text-aframeRed">{killswitch.reason}</p>
          )}
        </div>
        <button
          className={`px-4 py-2 rounded font-medium transition-colors
            ${killswitch.active 
              ? 'bg-aframeRed text-white' 
              : 'bg-gray-700 hover:bg-aframeRed'}`}
          onClick={() => webSocketManager.send({ type: 'killswitch:toggle' })}
        >
          {killswitch.active ? 'ACTIVE' : 'INACTIVE'}
        </button>
      </div>

      {/* Log Console */}
      <div className="bg-gray-800 rounded p-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">System Log</h3>
          <button
            className="text-xs text-gray-400 hover:text-white"
            onClick={() => {
              if (logWindowRef.current) {
                logWindowRef.current.innerHTML = '';
              }
            }}
          >
            Clear
          </button>
        </div>
        <div
          ref={logWindowRef}
          className="h-48 overflow-y-auto font-mono text-xs space-y-1 p-2"
        >
          {/* Log entries are appended here */}
        </div>
      </div>
    </div>
  );
};

export default TriadDashboardUI;
