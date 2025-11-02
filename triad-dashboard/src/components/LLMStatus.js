import React from 'react';

const LLMStatus = ({ llms = [] }) => {
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'online': return 'var(--pb-green)';
      case 'offline': return 'var(--pb-red)';
      case 'busy': return 'var(--pb-yellow)';
      case 'error': return 'var(--pb-red)';
      default: return 'var(--pb-purple)';
    }
  };

  const getAgentColor = (agentId) => {
    const colors = {
      gpt5: 'var(--pb-blue)',
      opus: 'var(--pb-yellow)',
      architect: 'var(--pb-red)',
      cline: 'var(--pb-orange)'
    };
    return colors[agentId] || 'var(--pb-purple)';
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatLatency = (ms) => {
    if (!ms) return 'N/A';
    return `${ms}ms`;
  };

  return (
    <div className="llm-status">
      <h2>Agent Status</h2>
      <div className="agent-grid">
        {llms.map((llm) => (
          <div key={llm.id} className="agent-card" style={{ borderColor: getAgentColor(llm.id) }}>
            <div className="agent-header">
              <h3>{llm.name}</h3>
              <div className="status-wrapper">
                <span 
                  className={`status-indicator ${llm.status === 'online' ? 'active' : ''}`}
                  style={{ backgroundColor: getStatusColor(llm.status) }}
                />
                <span className="status-text">{llm.status.toUpperCase()}</span>
              </div>
            </div>
            
            <div className="agent-details">
              <div className="detail-row">
                <span className="label">Role:</span>
                <span className="value">{llm.role}</span>
              </div>
              <div className="detail-row">
                <span className="label">Last Active:</span>
                <span className="value">{formatTimestamp(llm.lastActive)}</span>
              </div>
              <div className="detail-row">
                <span className="label">Latency:</span>
                <span className="value">{formatLatency(llm.latency)}</span>
              </div>
              {llm.currentTask && (
                <div className="detail-row">
                  <span className="label">Current Task:</span>
                  <span className="value">{llm.currentTask}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LLMStatus;
