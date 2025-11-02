import React, { useEffect, useRef } from 'react';
import TriadDashboardUI from './components/TriadDashboardUI';

function App() {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    wsRef.current = new WebSocket('ws://localhost:8765');

    wsRef.current.onopen = () => {
      console.log('Connected to Triad governance server');
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current.onclose = () => {
      console.log('Disconnected from Triad governance server');
    };

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div>
      {wsRef.current ? (
        <TriadDashboardUI webSocket={wsRef.current} />
      ) : (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <p className="text-xl">Connecting to Triad governance server...</p>
        </div>
      )}
    </div>
  );
}

export default App;
