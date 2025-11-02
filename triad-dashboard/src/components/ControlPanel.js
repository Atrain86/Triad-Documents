import React, { useState } from 'react';
import { WebSocketContext } from '../WebSocketManager';

const ControlPanel = ({ connectionStatus }) => {
  const [selectedSystem, setSelectedSystem] = useState('all');
  const [selectedAction, setSelectedAction] = useState('status');
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  
  const ws = React.useContext(WebSocketContext);

  const systems = [
    { id: 'all', name: 'All Systems', color: 'var(--pb-purple)' },
    { id: 'gpt5', name: 'GPT-5', color: 'var(--pb-blue)' },
    { id: 'opus', name: 'Opus', color: 'var(--pb-yellow)' },
    { id: 'architect', name: 'Architect', color: 'var(--pb-red)' },
    { id: 'cline', name: 'Cline', color: 'var(--pb-orange)' }
  ];

  const actions = [
    { id: 'status', name: 'Check Status', icon: '📊' },
    { id: 'restart', name: 'Restart', icon: '🔄' },
    { id: 'stop', name: 'Stop', icon: '⏹️' },
    { id: 'start', name: 'Start', icon: '▶️' },
    { id: 'debug', name: 'Debug Mode', icon: '🔍' },
    { id: 'reset', name: 'Reset Cache', icon: '🗑️' }
  ];

  const executeAction = async () => {
    if (!ws || connectionStatus !== 'connected') {
      setLastResult({
        success: false,
        message: 'WebSocket connection not available'
      });
      return;
    }

    setIsExecuting(true);
    setLastResult(null);

    try {
      ws.send({
        type: 'control',
        system: selectedSystem,
        action: selectedAction,
        timestamp: Date.now()
      });

      // Wait for response
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Command timed out'));
        }, 10000);

        const handleResponse = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'control_response') {
            clearTimeout(timeout);
            ws.removeEventListener('message', handleResponse);
            resolve(data);
          }
        };

        ws.addEventListener('message', handleResponse);
      });

      setLastResult({
        success: response.success,
        message: response.message,
        details: response.details
      });
    } catch (error) {
      setLastResult({
        success: false,
        message: error.message
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const isActionDisabled = (action) => {
    if (connectionStatus !== 'connected') return true;
    if (isExecuting) return true;
    
    // Specific action restrictions
    if (action === 'stop' && selectedSystem === 'all') return true;
    if (action === 'restart' && selectedSystem === 'all') return true;
    
    return false;
  };

  return (
    <div className="control-panel">
      <h2>System Controls</h2>
      
      <div className="control-section">
        <h3>Select System</h3>
        <div className="system-buttons">
          {systems.map(system => (
            <button
              key={system.id}
              className={`system-btn ${selectedSystem === system.id ? 'active' : ''}`}
              style={{ 
                '--system-color': system.color,
                opacity: connectionStatus !== 'connected' ? 0.5 : 1
              }}
              onClick={() => setSelectedSystem(system.id)}
              disabled={connectionStatus !== 'connected'}
            >
              {system.name}
            </button>
          ))}
        </div>
      </div>
      
      <div className="control-section">
        <h3>Select Action</h3>
        <div className="action-buttons">
          {actions.map(action => (
            <button
              key={action.id}
              className={`action-btn ${selectedAction === action.id ? 'active' : ''}`}
              onClick={() => setSelectedAction(action.id)}
              disabled={isActionDisabled(action.id)}
            >
              <span className="action-icon">{action.icon}</span>
              <span className="action-name">{action.name}</span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="control-section">
        <button
          className="execute-btn"
          onClick={executeAction}
          disabled={connectionStatus !== 'connected' || isExecuting}
        >
          {isExecuting ? 'Executing...' : 'Execute Command'}
        </button>
      </div>
      
      {lastResult && (
        <div className={`result-panel ${lastResult.success ? 'success' : 'error'}`}>
          <h4>{lastResult.success ? 'Success' : 'Error'}</h4>
          <p>{lastResult.message}</p>
          {lastResult.details && (
            <pre className="result-details">
              {JSON.stringify(lastResult.details, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
