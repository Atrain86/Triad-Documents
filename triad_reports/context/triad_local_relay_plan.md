# Triad Local Relay Design Specification
## Dual-Port Architecture with Enhanced Safety

---

## System Architecture

### Core Components

1. **Relay Server**
   ```typescript
   interface RelayServer {
     port1: 8765;  // GPT-5 endpoint
     port2: 8766;  // Klein endpoint
     authMode: 'shared-secret-rotating';
     tlsEnabled: true;
     maxLatency: 500;  // milliseconds
   }
   ```

2. **Message Protocol**
   ```typescript
   interface TriadMessage {
     header: {
       goal: string;          // explicit intent
       confidence: number;    // ≥ 0.85
       tone_score: number;    // ≥ 0.85
       timestamp: number;
       messageId: string;     // UUID
     };
     auth: {
       sender: 'gpt5' | 'cline';
       token: string;         // rotating HMAC
       signature: string;     // SHA-256
     };
     content: {
       type: 'message' | 'system' | 'error';
       payload: any;
       state_hash: string;    // for rollback
     };
   }
   ```

3. **Safety Middleware**
   ```typescript
   interface SafetyChecks {
     ethical_validation: (msg: TriadMessage) => Promise<boolean>;
     tone_analysis: (msg: TriadMessage) => Promise<number>;
     goal_verification: (msg: TriadMessage) => Promise<boolean>;
     killswitch_status: () => Promise<boolean>;
   }
   ```

### Security Implementation

1. **Authentication Flow**
   - Initial shared secret from .env
   - Token rotation every 5 minutes
   - HMAC-based message signing
   - Full request/response validation

2. **TLS Configuration**
   ```javascript
   const tlsOptions = {
     key: fs.readFileSync('local-key.pem'),
     cert: fs.readFileSync('local-cert.pem'),
     rejectUnauthorized: true,
     minVersion: 'TLSv1.3'
   };
   ```

3. **Network Isolation**
   - Localhost-only binding
   - Port restrictions
   - Connection rate limiting
   - IP whitelist (127.0.0.1)

### Performance Optimizations

1. **Message Queue**
   ```typescript
   interface MessageQueue {
     maxSize: 1000;
     flushInterval: 100;  // ms
     priorityLevels: 3;
     dropStrategy: 'oldest';
   }
   ```

2. **Connection Pool**
   - Pre-warmed connections
   - Keep-alive enabled
   - Connection reuse
   - Automatic cleanup

3. **Async Processing**
   - Non-blocking I/O
   - Promise-based operations
   - Parallel safety checks
   - Batched logging

### Governance Integration

1. **Ethical Validation**
   ```typescript
   interface EthicalCheck {
     confidence_threshold: 0.85;
     tone_threshold: 0.85;
     max_retries: 3;
     backoff_ms: 100;
   }
   ```

2. **Audit System**
   ```typescript
   interface AuditLog {
     format: 'JSONL';
     rotation: '1h';
     compression: true;
     fields: [
       'timestamp',
       'messageId',
       'sender',
       'goal',
       'confidence',
       'tone_score',
       'latency',
       'state_hash'
     ];
   }
   ```

3. **State Management**
   - Atomic operations
   - Transaction logging
   - State snapshots
   - Rollback points

## Installation Guide

1. **Environment Setup**
   ```bash
   # Create local certificates
   openssl req -x509 -newkey rsa:4096 -nodes \
     -keyout local-key.pem \
     -out local-cert.pem \
     -days 365 \
     -subj "/CN=localhost"

   # Install dependencies
   npm install ws dotenv crypto fs-extra uuid
   ```

2. **Configuration**
   ```bash
   # .env file
   TRIAD_SECRET=<shared_secret>
   GPT_PORT=8765
   KLEIN_PORT=8766
   TLS_ENABLED=true
   MAX_LATENCY=500
   CONFIDENCE_THRESHOLD=0.85
   TONE_THRESHOLD=0.85
   ```

3. **Directory Structure**
   ```
   /triad_local_relay/
   ├── certs/
   │   ├── local-key.pem
   │   └── local-cert.pem
   ├── src/
   │   ├── server.js
   │   ├── middleware/
   │   ├── auth/
   │   └── safety/
   ├── logs/
   │   └── audit/
   └── state/
       └── snapshots/
   ```

## Testing Protocol

1. **Basic Connectivity**
   ```bash
   # Test GPT-5 endpoint
   curl -k https://localhost:8765/health

   # Test Klein endpoint
   curl -k https://localhost:8766/health
   ```

2. **Authentication**
   ```javascript
   // Test token rotation
   const token = generateToken();
   await validateToken(token);
   await rotateToken();
   ```

3. **Message Flow**
   ```javascript
   // Test round-trip
   const msg = createTestMessage();
   const start = Date.now();
   await sendMessage(msg);
   const latency = Date.now() - start;
   assert(latency < 500);
   ```

4. **Safety Checks**
   ```javascript
   // Test killswitch
   await triggerKillswitch();
   const response = await getKillswitchStatus();
   assert(response.time < 1000);
   ```

## Monitoring & Maintenance

1. **Health Checks**
   - Latency monitoring
   - Connection status
   - Queue depth
   - Error rates

2. **Resource Usage**
   - Memory consumption
   - CPU utilization
   - Network I/O
   - File descriptors

3. **Backup & Recovery**
   - Hourly state snapshots
   - Transaction logs
   - Configuration backups
   - Certificate rotation

## Emergency Procedures

1. **Killswitch Activation**
   - Immediate connection termination
   - State preservation
   - Audit log finalization
   - Administrator notification

2. **Recovery Process**
   - State verification
   - Log analysis
   - Incremental restart
   - Connection re-establishment

3. **Incident Response**
   - Error classification
   - Impact assessment
   - Mitigation steps
   - Post-mortem analysis

---
Generated: October 30, 2025 22:27 PDT
Author: Klein
Version: 1.0
Status: Ready for Implementation
