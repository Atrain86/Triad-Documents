import React, { useState, useEffect } from 'react';
import { WebSocketContext } from '../WebSocketManager';

const SystemReportGenerator = () => {
  const [generating, setGenerating] = useState(false);
  const [lastReport, setLastReport] = useState(null);
  const [syncStatus, setSyncStatus] = useState({ syncing: false, error: null });
  const [githubEnabled, setGithubEnabled] = useState(false);
  const ws = React.useContext(WebSocketContext);

  useEffect(() => {
    // Check if GitHub sync is enabled
    if (ws) {
      ws.send({
        type: 'check_github_sync'
      });

      const handleMessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'github_sync_status') {
          setGithubEnabled(data.enabled);
        }
      };

      ws.addEventListener('message', handleMessage);
      return () => ws.removeEventListener('message', handleMessage);
    }
  }, [ws]);

  const generateReport = async () => {
    if (!ws) return;

    setGenerating(true);
    setSyncStatus({ syncing: false, error: null });

    try {
      // Request report generation
      ws.send({
        type: 'generate_report',
        timestamp: Date.now()
      });

      // Wait for response
      const report = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Report generation timed out'));
        }, 30000);

        const handleMessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'report_generated') {
            clearTimeout(timeout);
            ws.removeEventListener('message', handleMessage);
            resolve(data.report);
          } else if (data.type === 'report_error') {
            clearTimeout(timeout);
            ws.removeEventListener('message', handleMessage);
            reject(new Error(data.error));
          }
        };

        ws.addEventListener('message', handleMessage);
      });

      setLastReport(report);

      // Sync to GitHub if enabled
      if (githubEnabled) {
        await syncToGitHub(report);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      setSyncStatus({ syncing: false, error: error.message });
    } finally {
      setGenerating(false);
    }
  };

  const syncToGitHub = async (report) => {
    setSyncStatus({ syncing: true, error: null });

    try {
      ws.send({
        type: 'sync_report',
        report,
        timestamp: Date.now()
      });

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('GitHub sync timed out'));
        }, 10000);

        const handleMessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'sync_complete') {
            clearTimeout(timeout);
            ws.removeEventListener('message', handleMessage);
            resolve();
          } else if (data.type === 'sync_error') {
            clearTimeout(timeout);
            ws.removeEventListener('message', handleMessage);
            reject(new Error(data.error));
          }
        };

        ws.addEventListener('message', handleMessage);
      });

      setSyncStatus({ syncing: false, error: null });
    } catch (error) {
      console.error('Error syncing to GitHub:', error);
      setSyncStatus({ syncing: false, error: error.message });
    }
  };

  return (
    <div className="report-generator">
      <div className="report-header">
        <h2>System Report</h2>
        <div className="report-controls">
          <button
            className="generate-btn"
            onClick={generateReport}
            disabled={generating || syncStatus.syncing}
          >
            {generating ? 'Generating...' : 
             syncStatus.syncing ? 'Syncing...' : 
             'Generate Report'}
          </button>
          
          {githubEnabled && (
            <div className="sync-status">
              <span className="sync-icon">
                {syncStatus.syncing ? '🔄' : 
                 syncStatus.error ? '❌' : '✓'}
              </span>
              <span className="sync-text">
                {syncStatus.syncing ? 'Syncing to GitHub...' : 
                 syncStatus.error ? `Sync Error: ${syncStatus.error}` : 
                 'GitHub Sync Enabled'}
              </span>
            </div>
          )}
        </div>
      </div>

      {lastReport && (
        <div className="report-content">
          <h3>Latest Report</h3>
          <div className="report-timestamp">
            Generated: {new Date(lastReport.timestamp).toLocaleString()}
          </div>
          
          <div className="report-sections">
            {/* System Status */}
            <div className="report-section">
              <h4>System Status</h4>
              <div className="status-grid">
                {Object.entries(lastReport.systemStatus || {}).map(([system, status]) => (
                  <div key={system} className="status-item">
                    <span className="system-name">{system}</span>
                    <span className={`system-status ${status.toLowerCase()}`}>
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="report-section">
              <h4>Performance Metrics</h4>
              <div className="metrics-grid">
                {Object.entries(lastReport.metrics || {}).map(([metric, value]) => (
                  <div key={metric} className="metric-item">
                    <span className="metric-name">{metric}</span>
                    <span className="metric-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Events */}
            {lastReport.events && lastReport.events.length > 0 && (
              <div className="report-section">
                <h4>Recent Events</h4>
                <div className="events-list">
                  {lastReport.events.map((event, index) => (
                    <div key={index} className={`event-item ${event.level}`}>
                      <span className="event-timestamp">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="event-message">{event.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {lastReport.recommendations && lastReport.recommendations.length > 0 && (
              <div className="report-section">
                <h4>Recommendations</h4>
                <ul className="recommendations-list">
                  {lastReport.recommendations.map((rec, index) => (
                    <li key={index} className={`recommendation-item ${rec.priority}`}>
                      {rec.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemReportGenerator;
