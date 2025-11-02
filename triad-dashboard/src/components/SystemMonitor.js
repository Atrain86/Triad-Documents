import React from 'react';

const SystemMonitor = ({ systemStats = {} }) => {
  const formatPercentage = (value) => {
    if (!value && value !== 0) return 'N/A';
    return `${Math.round(value)}%`;
  };

  const formatMemory = (bytes) => {
    if (!bytes && bytes !== 0) return 'N/A';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const getUsageColor = (percentage) => {
    if (!percentage && percentage !== 0) return 'var(--pb-purple)';
    if (percentage >= 90) return 'var(--pb-red)';
    if (percentage >= 70) return 'var(--pb-yellow)';
    return 'var(--pb-green)';
  };

  const renderUsageBar = (percentage) => {
    if (!percentage && percentage !== 0) return null;
    return (
      <div className="usage-bar">
        <div 
          className="usage-fill"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: getUsageColor(percentage)
          }}
        />
      </div>
    );
  };

  return (
    <div className="system-monitor">
      <h2>System Health</h2>
      
      <div className="stats-grid">
        {/* CPU Usage */}
        <div className="stat-card">
          <div className="stat-header">
            <h3>CPU Usage</h3>
            <span className="stat-value" style={{ color: getUsageColor(systemStats.cpu?.usage) }}>
              {formatPercentage(systemStats.cpu?.usage)}
            </span>
          </div>
          {renderUsageBar(systemStats.cpu?.usage)}
          <div className="stat-details">
            <div className="detail-row">
              <span className="label">Cores:</span>
              <span className="value">{systemStats.cpu?.cores || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Load Avg:</span>
              <span className="value">{systemStats.cpu?.loadAvg || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="stat-card">
          <div className="stat-header">
            <h3>Memory Usage</h3>
            <span className="stat-value" style={{ color: getUsageColor(systemStats.memory?.usage) }}>
              {formatPercentage(systemStats.memory?.usage)}
            </span>
          </div>
          {renderUsageBar(systemStats.memory?.usage)}
          <div className="stat-details">
            <div className="detail-row">
              <span className="label">Total:</span>
              <span className="value">{formatMemory(systemStats.memory?.total)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Free:</span>
              <span className="value">{formatMemory(systemStats.memory?.free)}</span>
            </div>
          </div>
        </div>

        {/* Disk Usage */}
        <div className="stat-card">
          <div className="stat-header">
            <h3>Disk Usage</h3>
            <span className="stat-value" style={{ color: getUsageColor(systemStats.disk?.usage) }}>
              {formatPercentage(systemStats.disk?.usage)}
            </span>
          </div>
          {renderUsageBar(systemStats.disk?.usage)}
          <div className="stat-details">
            <div className="detail-row">
              <span className="label">Total:</span>
              <span className="value">{formatMemory(systemStats.disk?.total)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Free:</span>
              <span className="value">{formatMemory(systemStats.disk?.free)}</span>
            </div>
          </div>
        </div>

        {/* Network Status */}
        <div className="stat-card">
          <div className="stat-header">
            <h3>Network</h3>
          </div>
          <div className="stat-details">
            <div className="detail-row">
              <span className="label">Status:</span>
              <span className="value" style={{ 
                color: systemStats.network?.connected ? 'var(--pb-green)' : 'var(--pb-red)'
              }}>
                {systemStats.network?.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Latency:</span>
              <span className="value">
                {systemStats.network?.latency ? `${systemStats.network.latency}ms` : 'N/A'}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Upload:</span>
              <span className="value">
                {systemStats.network?.upload ? `${systemStats.network.upload} MB/s` : 'N/A'}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Download:</span>
              <span className="value">
                {systemStats.network?.download ? `${systemStats.network.download} MB/s` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemMonitor;
