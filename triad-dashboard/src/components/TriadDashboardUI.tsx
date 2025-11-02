import React, { useState, useEffect } from 'react';
import ControlBar from './ControlBar';

interface AgentStatus {
  status: 'active' | 'inactive';
  color: string;
}

interface AgentStates {
  GPT: AgentStatus;
  Opus: AgentStatus;
  Architect: AgentStatus;
  Cline: AgentStatus;
}

const AgentIndicator: React.FC<{ name: string; status: AgentStatus }> = ({ name, status }) => (
  <div className="flex flex-col items-center">
    <div 
      className={`w-4 h-4 rounded-full mb-2 ${
        status.status === 'active' ? 'animate-pulse' : 'opacity-50'
      }`}
      style={{ backgroundColor: status.color }}
    />
    <span className="text-sm font-medium">{name}</span>
    <span className="text-xs text-gray-400">{status.status}</span>
  </div>
);

interface TriadDashboardUIProps {
  webSocket: WebSocket;
}

const TriadDashboardUI: React.FC<TriadDashboardUIProps> = ({ webSocket }) => {
  const [health, setHealth] = useState('normal');
  const [cost, setCost] = useState({ current: 0, total: 0 });
  const [agents, setAgents] = useState<AgentStates>({
    GPT: { status: 'inactive', color: '#0099CC' },
    Opus: { status: 'inactive', color: '#8B5FBF' },
    Architect: { status: 'inactive', color: '#F7C11F' },
    Cline: { status: 'inactive', color: '#E03E3E' }
  });

  useEffect(() => {
    if (!webSocket) return;

    webSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'health':
          setHealth(data.status);
          break;
        case 'cost':
          setCost(data.data);
          break;
        case 'agent_activity':
          setAgents(prev => ({
            ...prev,
            [data.agent]: {
              ...prev[data.agent as keyof AgentStates],
              status: data.status
            }
          }));
          break;
      }
    };
  }, [webSocket]);

  const handleRunCommand = () => {
    webSocket?.send(JSON.stringify({ type: 'command', action: 'run' }));
  };

  const handleSaveSnapshot = () => {
    webSocket?.send(JSON.stringify({ type: 'command', action: 'snapshot' }));
  };

  const handleKillSwitch = () => {
    webSocket?.send(JSON.stringify({ type: 'command', action: 'killswitch' }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-aframeYellow mb-4">Triad Dashboard</h1>
        </header>

        {/* Agent Status Grid */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {Object.entries(agents).map(([name, status]) => (
            <AgentIndicator key={name} name={name} status={status} />
          ))}
        </div>

        {/* Telemetry Panel */}
        <div className="bg-gray-900 p-6 rounded-lg border border-aframeBlue mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${
                health === 'normal' ? 'bg-green-500' : 'bg-aframeRed'
              }`} />
              <span>System Health: {health}</span>
            </div>
            <div className="text-aframeYellow">
              Cost: ${cost.current.toFixed(2)} / ${cost.total.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Control Bar */}
        <ControlBar
          onRunCommand={handleRunCommand}
          onSaveSnapshot={handleSaveSnapshot}
          onKillSwitch={handleKillSwitch}
        />
      </div>
    </div>
  );
};

export default TriadDashboardUI;
