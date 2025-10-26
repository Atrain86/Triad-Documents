// Export Google API service
export * from './common/googleAPI/index.js';

import express from 'express';

// Create Express server
const app = express();
const PORT = process.env.PORT || 5002;

// Add JSON parsing middleware
app.use(express.json());

// Add ping endpoint for health checks
app.get('/api/ping', (req, res) => {
  res.json({ message: 'Server is alive' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
