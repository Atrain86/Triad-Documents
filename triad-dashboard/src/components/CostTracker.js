import React, { useState, useEffect } from 'react';
import { WebSocketContext } from '../WebSocketManager';

const CostTracker = () => {
  const [costData, setCostData] = useState({
    gpt5: { calls: 0, tokens: 0, cost: 0 },
    opus: { calls: 0, tokens: 0, cost: 0 },
    architect: { calls: 0, tokens: 0, cost: 0 },
    cline: { calls: 0, tokens: 0, cost: 0 }
  });
  
  const [totalCost, setTotalCost] = useState(0);
  const [timeRange, setTimeRange] = useState('day');
  const ws = React.useContext(WebSocketContext);

  useEffect(() => {
    if (ws) {
      const handleCostUpdate = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'cost_update') {
          setCostData(prevData => ({
            ...prevData,
            [data.agent]: {
              calls: data.calls,
              tokens: data.tokens,
              cost: data.cost
            }
          }));
        }
      };

      ws.addEventListener('message', handleCostUpdate);
      requestCostData();

      return () => ws.removeEventListener('message', handleCostUpdate);
    }
  }, [ws, timeRange]);

  useEffect(() => {
    // Calculate total cost whenever costData changes
    const total = Object.values(costData).reduce((sum, agent) => sum + agent.cost, 0);
    setTotalCost(total);
  }, [costData]);

  const requestCostData = () => {
    if (ws) {
      ws.send({
        type: 'get_cost_data',
        timeRange,
        timestamp: Date.now()
      });
    }
  };

  const formatCost = (cost) => {
    return `$${cost.toFixed(4)}`;
  };

  const formatNumber = (num) => {
    return num.toLocaleString();
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

  const calculateUsagePercentage = (agent) => {
    const maxTokens = {
      gpt5: 150000,
      opus: 200000,
      architect: 100000,
      cline: 120000
    };
    return (agent.tokens / maxTokens[agent.id]) * 100;
  };

  const timeRanges = [
    { id: 'hour', label: 'Last Hour' },
    { id: 'day', label: 'Last 24 Hours' },
    { id: 'week', label: 'Last 7 Days' },
    { id: 'month', label: 'Last 30 Days' }
  ];

  return (
    <div className="cost-tracker">
      <div className="cost-header">
        <h2>Cost Tracker</h2>
        <div className="time-range-selector">
          {timeRanges.map(range => (
            <button
              key={range.id}
              className={`range-btn ${timeRange === range.id ? 'active' : ''}`}
              onClick={() => setTimeRange(range.id)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cost-summary">
        <div className="total-cost">
          <span className="label">Total Cost:</span>
          <span className="value">{formatCost(totalCost)}</span>
        </div>
      </div>
      
      <div className="cost-grid">
        {Object.entries(costData).map(([agentId, data]) => (
          <div key={agentId} className={`cost-card ${agentId}`}>
            <div className="cost-header">
              <h3>{agentId.toUpperCase()}</h3>
              <span className="cost-badge" style={{ backgroundColor: getAgentColor(agentId) }}>
                {formatCost(data.cost)}
              </span>
            </div>
            
            <div className="cost-details">
              <div className="detail-row">
                <span className="label">API Calls:</span>
                <span className="value">{formatNumber(data.calls)}</span>
              </div>
              <div className="detail-row">
                <span className="label">Tokens Used:</span>
                <span className="value">{formatNumber(data.tokens)}</span>
              </div>
              <div className="token-bar">
                <div 
                  className="token-fill"
                  style={{ 
                    width: `${calculateUsagePercentage({ ...data, id: agentId })}%`,
                    backgroundColor: getAgentColor(agentId)
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="cost-footer">
        <button 
          className="refresh-btn"
          onClick={requestCostData}
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
};

export default CostTracker;
