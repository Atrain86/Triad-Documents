import React, { useState, useRef, useEffect } from 'react';
import { WebSocketContext } from '../WebSocketManager';

const ChatInterface = ({ connectionStatus }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('auto');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const ws = React.useContext(WebSocketContext);

  const agents = [
    { id: 'auto', name: 'Auto-Route', color: 'var(--pb-purple)' },
    { id: 'gpt5', name: 'GPT-5', color: 'var(--pb-blue)' },
    { id: 'opus', name: 'Opus', color: 'var(--pb-yellow)' },
    { id: 'architect', name: 'Architect', color: 'var(--pb-red)' },
    { id: 'cline', name: 'Cline', color: 'var(--pb-orange)' }
  ];

  useEffect(() => {
    if (ws) {
      const handleMessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_message' || data.type === 'chat_response') {
          setMessages(prev => [...prev, {
            id: data.id || Math.random().toString(36).substr(2, 9),
            type: data.type,
            content: data.content,
            agent: data.agent,
            timestamp: data.timestamp || Date.now()
          }]);
          setIsTyping(false);
        } else if (data.type === 'typing_indicator') {
          setIsTyping(true);
        }
      };

      ws.addEventListener('message', handleMessage);
      return () => ws.removeEventListener('message', handleMessage);
    }
  }, [ws]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !ws || connectionStatus !== 'connected') return;

    const message = {
      type: 'chat_message',
      content: inputValue,
      agent: selectedAgent,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    };

    ws.send(message);
    setMessages(prev => [...prev, message]);
    setInputValue('');
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getAgentColor = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.color : 'var(--pb-purple)';
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h2>Agent Chat</h2>
        <div className="agent-selector">
          {agents.map(agent => (
            <button
              key={agent.id}
              className={`agent-btn ${selectedAgent === agent.id ? 'active' : ''}`}
              style={{ 
                '--agent-color': agent.color,
                opacity: connectionStatus !== 'connected' ? 0.5 : 1
              }}
              onClick={() => setSelectedAgent(agent.id)}
              disabled={connectionStatus !== 'connected'}
            >
              {agent.name}
            </button>
          ))}
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div 
            key={message.id}
            className={`message ${message.type === 'chat_message' ? 'outgoing' : 'incoming'}`}
            style={{ borderColor: getAgentColor(message.agent) }}
          >
            <div className="message-header">
              <span className="agent-name" style={{ color: getAgentColor(message.agent) }}>
                {agents.find(a => a.id === message.agent)?.name || message.agent}
              </span>
              <span className="timestamp">{formatTimestamp(message.timestamp)}</span>
            </div>
            <div className="message-content">{message.content}</div>
          </div>
        ))}
        
        {isTyping && (
          <div className="typing-indicator">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={connectionStatus === 'connected' ? 'Type your message...' : 'Disconnected'}
          disabled={connectionStatus !== 'connected'}
        />
        <button 
          type="submit"
          disabled={!inputValue.trim() || connectionStatus !== 'connected'}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;
