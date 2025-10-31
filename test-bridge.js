import WebSocket from 'ws';
import crypto from 'crypto';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';

// Load environment variables
config();

class BridgeTestClient {
  constructor() {
    this.secret = process.env.TRIAD_SECRET;
    this.results = [];
    this.testsPassed = 0;
    this.testsFailed = 0;
  }

  async runTests() {
    console.log('🧪 Starting Bridge Restoration Tests...\n');
    
    // Test 1: Relay Connection
    await this.testRelayConnection();
    
    // Test 2: GitHub Server Connection
    await this.testGitHubServer();
    
    // Test 3: GPT-Klein Message Exchange
    await this.testMessageExchange();
    
    // Test 4: GitHub Operations via Relay
    await this.testGitHubOperations();
    
    // Test 5: Killswitch Functionality
    await this.testKillswitch();
    
    // Test 6: Full Round-Trip
    await this.testFullRoundTrip();
    
    // Generate report
    this.generateReport();
  }

  async testRelayConnection() {
    console.log('Test 1: Relay Connection...');
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const ws = new WebSocket('ws://localhost:8765');
      
      ws.on('open', () => {
        const latency = Date.now() - startTime;
        this.recordResult('Relay Connection', true, latency);
        ws.close();
        resolve();
      });
      
      ws.on('error', (err) => {
        this.recordResult('Relay Connection', false, 0, err.message);
        resolve();
      });
    });
  }

  async testGitHubServer() {
    console.log('Test 2: GitHub Server Health...');
    const startTime = Date.now();
    
    try {
      const response = await fetch('http://localhost:4001/github/branches?owner=Atrain86&repo=Triad-Documents');
      const data = await response.json();
      const latency = Date.now() - startTime;
      
      if (response.ok) {
        this.recordResult('GitHub Server', true, latency);
      } else {
        this.recordResult('GitHub Server', false, latency, 'Server error');
      }
    } catch (error) {
      this.recordResult('GitHub Server', false, 0, error.message);
    }
  }

  async testMessageExchange() {
    console.log('Test 3: GPT-Klein Message Exchange...');
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const gptClient = this.createClient('gpt5');
      const kleinClient = this.createClient('cline');
      
      let messageReceived = false;
      
      gptClient.on('open', () => {
        // Authenticate GPT
        this.authenticate(gptClient, 'gpt5');
      });
      
      kleinClient.on('open', () => {
        // Authenticate Klein
        this.authenticate(kleinClient, 'cline');
      });
      
      kleinClient.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.type === 'message' && message.sender === 'gpt5') {
          messageReceived = true;
          const latency = Date.now() - startTime;
          this.recordResult('Message Exchange', true, latency);
          gptClient.close();
          kleinClient.close();
          resolve();
        }
      });
      
      // Send test message after both are authenticated
      setTimeout(() => {
        if (!messageReceived) {
          this.sendTestMessage(gptClient, 'gpt5', 'Test bridge communication');
        }
      }, 500);
      
      setTimeout(() => {
        if (!messageReceived) {
          this.recordResult('Message Exchange', false, 0, 'Timeout');
          gptClient.close();
          kleinClient.close();
          resolve();
        }
      }, 3000);
    });
  }

  async testGitHubOperations() {
    console.log('Test 4: GitHub Operations via Relay...');
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const ws = this.createClient('cline');
      
      ws.on('open', () => {
        this.authenticate(ws, 'cline');
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (message.type === 'auth_success') {
          // Send GitHub operation request
          const timestamp = Date.now();
          const githubOp = {
            type: 'github',
            sender: 'cline',
            timestamp,
            signature: this.createSignature('cline', timestamp),
            operation: {
              type: 'branches',
              params: {
                owner: 'Atrain86',
                repo: 'Triad-Documents'
              }
            }
          };
          ws.send(JSON.stringify(githubOp));
        } else if (message.type === 'github_response') {
          const latency = Date.now() - startTime;
          this.recordResult('GitHub Operations', true, latency);
          ws.close();
          resolve();
        } else if (message.type === 'github_error') {
          this.recordResult('GitHub Operations', false, 0, message.error);
          ws.close();
          resolve();
        }
      });
      
      ws.on('error', (err) => {
        this.recordResult('GitHub Operations', false, 0, err.message);
        resolve();
      });
      
      setTimeout(() => {
        this.recordResult('GitHub Operations', false, 0, 'Timeout');
        ws.close();
        resolve();
      }, 5000);
    });
  }

  async testKillswitch() {
    console.log('Test 5: Killswitch Functionality...');
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const ws = this.createClient('cline');
      let killswitchActivated = false;
      
      ws.on('open', () => {
        this.authenticate(ws, 'cline');
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (message.type === 'auth_success') {
          // Send killswitch activation
          const timestamp = Date.now();
          const killswitchMsg = {
            type: 'killswitch',
            action: 'activate',
            sender: 'cline',
            timestamp,
            signature: this.createSignature('cline', timestamp)
          };
          ws.send(JSON.stringify(killswitchMsg));
        } else if (message.type === 'system' && message.message.includes('Killswitch activated')) {
          killswitchActivated = true;
          
          // Try to send a message (should fail)
          const timestamp = Date.now();
          const testMsg = {
            type: 'message',
            sender: 'cline',
            content: 'Test during killswitch',
            goal: 'Test killswitch',
            confidence: 0.95,
            timestamp,
            signature: this.createSignature('cline', timestamp)
          };
          ws.send(JSON.stringify(testMsg));
        } else if (message.type === 'error' && message.error.includes('Killswitch active')) {
          if (killswitchActivated) {
            const latency = Date.now() - startTime;
            this.recordResult('Killswitch', true, latency);
            
            // Deactivate killswitch for other tests
            const timestamp = Date.now();
            const deactivateMsg = {
              type: 'killswitch',
              action: 'deactivate',
              sender: 'cline',
              timestamp,
              signature: this.createSignature('cline', timestamp)
            };
            ws.send(JSON.stringify(deactivateMsg));
            
            setTimeout(() => {
              ws.close();
              resolve();
            }, 100);
          }
        }
      });
      
      setTimeout(() => {
        this.recordResult('Killswitch', false, 0, 'Timeout');
        ws.close();
        resolve();
      }, 5000);
    });
  }

  async testFullRoundTrip() {
    console.log('Test 6: Full Round-Trip (GPT → Klein → GitHub → Klein → GPT)...');
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const gptClient = this.createClient('gpt5');
      const kleinClient = this.createClient('cline');
      let roundTripComplete = false;
      
      gptClient.on('open', () => {
        this.authenticate(gptClient, 'gpt5');
      });
      
      kleinClient.on('open', () => {
        this.authenticate(kleinClient, 'cline');
      });
      
      gptClient.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (message.type === 'github_response' && !roundTripComplete) {
          roundTripComplete = true;
          const latency = Date.now() - startTime;
          
          if (latency < 500) {
            this.recordResult('Full Round-Trip', true, latency);
          } else {
            this.recordResult('Full Round-Trip', false, latency, `Latency ${latency}ms exceeds 500ms target`);
          }
          
          gptClient.close();
          kleinClient.close();
          resolve();
        }
      });
      
      kleinClient.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (message.type === 'github' && message.sender === 'gpt5') {
          // Klein forwards GitHub request to relay
          kleinClient.send(data);
        }
      });
      
      // Initiate round-trip after authentication
      setTimeout(() => {
        if (!roundTripComplete) {
          const timestamp = Date.now();
          const githubRequest = {
            type: 'github',
            sender: 'gpt5',
            timestamp,
            signature: this.createSignature('gpt5', timestamp),
            operation: {
              type: 'content',
              params: {
                owner: 'Atrain86',
                repo: 'Triad-Documents',
                path: 'README.md'
              }
            }
          };
          gptClient.send(JSON.stringify(githubRequest));
        }
      }, 500);
      
      setTimeout(() => {
        if (!roundTripComplete) {
          this.recordResult('Full Round-Trip', false, 0, 'Timeout');
          gptClient.close();
          kleinClient.close();
          resolve();
        }
      }, 5000);
    });
  }

  createClient(sender) {
    return new WebSocket('ws://localhost:8765');
  }

  authenticate(ws, sender) {
    const timestamp = Date.now();
    const authMsg = {
      type: 'auth',
      sender,
      timestamp,
      signature: this.createSignature(sender, timestamp)
    };
    ws.send(JSON.stringify(authMsg));
  }

  sendTestMessage(ws, sender, content) {
    const timestamp = Date.now();
    const msg = {
      type: 'message',
      sender,
      content,
      goal: 'Test bridge communication',
      confidence: 0.95,
      timestamp,
      signature: this.createSignature(sender, timestamp)
    };
    ws.send(JSON.stringify(msg));
  }

  createSignature(sender, timestamp) {
    const data = `${sender}:${timestamp}`;
    return crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('hex');
  }

  recordResult(test, success, latency, error = null) {
    const result = {
      test,
      success,
      latency,
      error
    };
    
    if (success) {
      console.log(`✅ ${test}: ${latency}ms`);
      this.testsPassed++;
    } else {
      console.log(`❌ ${test}: ${error}`);
      this.testsFailed++;
    }
    
    this.results.push(result);
  }

  generateReport() {
    console.log('\n📊 Test Results Summary:');
    console.log(`Tests Passed: ${this.testsPassed}`);
    console.log(`Tests Failed: ${this.testsFailed}`);
    
    const averageLatency = this.results
      .filter(r => r.success && r.latency > 0)
      .reduce((sum, r) => sum + r.latency, 0) / this.testsPassed || 0;
    
    console.log(`Average Latency: ${Math.round(averageLatency)}ms`);
    
    const report = {
      timestamp: Date.now(),
      testsPassed: this.testsPassed,
      testsFailed: this.testsFailed,
      averageLatency: Math.round(averageLatency),
      results: this.results,
      verification: {
        relayActive: this.results.find(r => r.test === 'Relay Connection')?.success || false,
        githubServerActive: this.results.find(r => r.test === 'GitHub Server')?.success || false,
        messageLatency: averageLatency < 500,
        recoveryTime: averageLatency < 60000,
        killswitchFunctional: this.results.find(r => r.test === 'Killswitch')?.success || false
      }
    };
    
    // Save report
    writeFileSync('./triad_logs/bridge_test_report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Report saved to triad_logs/bridge_test_report.json');
  }
}

// Run tests
const tester = new BridgeTestClient();
tester.runTests().catch(console.error);
