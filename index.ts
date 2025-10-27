// Export Google API service
export * from './common/googleAPI/index.js';

import express from 'express';

// Create Express server
const app = express();
const PORT = process.env.PORT || 5002;

// Add JSON parsing middleware
app.use(express.json());

// Triad API Governance Integration - Health Check Endpoint
app.get('/api/ping', (req, res) => {
  res.json({
    message: 'Server is alive',
    service: 'Triad-Documents',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
