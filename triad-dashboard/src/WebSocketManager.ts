class WebSocketManager {
  constructor(url, options = {}) {
    // Core configuration
    this.url = url;
    
    // Connection state
    this.ws = null;
    this.reconnectAttempt = 0;
    this.isIntentionallyClosed = false;
    this.isConnected = false;
    
    // Message queue for offline buffering
    this.messageQueue = [];
    this.maxQueueSize = options.maxQueueSize || 100;
    
    // Reconnection configuration with exponential backoff
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.backoffMultiplier = options.backoffMultiplier || 1.5;
    
    // Health check configuration
    this.enableHealthCheck = options.enableHealthCheck !== false;
    this.healthCheckInterval = options.healthCheckInterval || 30000;
    this.pongTimeout = options.pongTimeout || 5000;
    
    // Intervals and timeouts
    this.reconnectTimeout = null;
    this.healthInterval = null;
    this.pongTimeoutId = null;
    
    // Debug mode
    this.debug = options.debug || false;
    
    // Event listeners for external monitoring
    this.eventListeners = {
      connected: [],
      disconnected: [],
      error: [],
      reconnecting: [],
      message: [],
      'triad:health': [],
      'triad:costs': [],
      'triad:killswitch': [],
      'triad:log': []
    };

    // Initialize Triad Bridge integration
    this.initTriadBridge();
  }
  
  // Initialize Triad Bridge
  initTriadBridge() {
    // Listen for Triad Bridge events
    window.addEventListener('triad:health', (event) => {
      this.handleTriadEvent('health', event.detail);
    });

    window.addEventListener('triad:costs', (event) => {
      this.handleTriadEvent('costs', event.detail);
    });

    window.addEventListener('triad:killswitch', (event) => {
      this.handleTriadEvent('killswitch', event.detail);
    });

    window.addEventListener('triad:log', (event) => {
      this.handleTriadEvent('log', event.detail);
    });

    // Handle postMessage events from Triad Bridge
    window.addEventListener('message', (event) => {
      if (event.data && event.data.source === 'triad-bridge') {
        this.handleTriadEvent(event.data.type, event.data.data);
      }
    });
  }

  // Handle Triad events
  handleTriadEvent(type, data) {
    switch (type) {
      case 'health':
        this.updateHealthIndicator(data);
        break;
      case 'costs':
        this.updateCostDisplay(data);
        break;
      case 'killswitch':
        this.handleKillswitch(data);
        break;
      case 'log':
        this.appendToLog(data);
        break;
    }

    // Emit event for external listeners
    this.emit(`triad:${type}`, data);
  }
  
  // Event emitter methods
  on(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].push(callback);
    }
  }
  
  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(cb => cb(data));
    }
  }
  
  // Main connection method
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || 
        this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempt = 0;
        this.emit('connected', { timestamp: Date.now() });
        
        if (this.enableHealthCheck) {
          this.startHealthCheck();
        }
        
        this.flushMessageQueue();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') {
            this.handlePong(data);
            return;
          }
          this.emit('message', data);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        this.emit('error', { error, timestamp: Date.now() });
      };
      
      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.stopHealthCheck();
        
        this.emit('disconnected', { 
          code: event.code, 
          reason: event.reason,
          timestamp: Date.now()
        });
        
        if (!this.isIntentionallyClosed) {
          if (this.reconnectAttempt < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        }
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  }
  
  // Schedule reconnection with exponential backoff
  scheduleReconnect() {
    const delay = Math.min(
      this.baseDelay * Math.pow(this.backoffMultiplier, this.reconnectAttempt),
      this.maxDelay
    );
    
    this.emit('reconnecting', { 
      attempt: this.reconnectAttempt + 1,
      delay,
      timestamp: Date.now()
    });
    
    this.reconnectAttempt++;
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  // Send message with queuing support
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        this.queueMessage(message);
        return false;
      }
    } else {
      this.queueMessage(message);
      return false;
    }
  }
  
  // Queue message for later delivery
  queueMessage(message) {
    if (this.messageQueue.length >= this.maxQueueSize) {
      this.messageQueue.shift();
    }
    this.messageQueue.push(message);
  }
  
  // Flush all queued messages
  flushMessageQueue() {
    if (this.messageQueue.length === 0) return;
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (!this.send(message)) {
        this.messageQueue.unshift(message);
        break;
      }
    }
  }
  
  // Health check implementation
  startHealthCheck() {
    if (!this.enableHealthCheck) return;
    
    this.stopHealthCheck();
    
    this.healthInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const pingMessage = {
          type: 'ping',
          timestamp: Date.now(),
          id: Math.random().toString(36).substr(2, 9)
        };
        
        this.send(pingMessage);
        
        this.pongTimeoutId = setTimeout(() => {
          this.ws.close(4000, 'Ping timeout');
        }, this.pongTimeout);
      }
    }, this.healthCheckInterval);
  }
  
  // Handle pong response
  handlePong(data) {
    if (this.pongTimeoutId) {
      clearTimeout(this.pongTimeoutId);
      this.pongTimeoutId = null;
    }
  }
  
  // Stop health check
  stopHealthCheck() {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }
    
    if (this.pongTimeoutId) {
      clearTimeout(this.pongTimeoutId);
      this.pongTimeoutId = null;
    }
  }
  
  // Gracefully close connection
  close() {
    this.isIntentionallyClosed = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.stopHealthCheck();
    
    if (this.ws) {
      this.ws.close(1000, 'Client closing connection');
      this.ws = null;
    }
    
    this.messageQueue = [];
  }
  
  // Get connection state
  getState() {
    return {
      connected: this.isConnected,
      reconnectAttempt: this.reconnectAttempt,
      queuedMessages: this.messageQueue.length,
      url: this.url
    };
  }
}

export default WebSocketManager;
