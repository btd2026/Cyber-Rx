'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Dynamic CORS configuration for Vercel + Render deployment
const allowedOrigins = [
  'https://claude.ai',
  'https://www.anthropic.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
];

// Add Vercel frontend URL from environment if available
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
  // Also add wildcard for subdomains
  allowedOrigins.push(process.env.FRONTEND_URL.replace('https://', 'https://*.'));
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(null, true); // For now, allow all - tighten in production
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Request logging middleware
app.use(function(req, res, next) {
  const start = Date.now();
  res.on('finish', function() {
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      method: req.method,
      path: req.path,
      orgId: req.headers['x-org-id'] || 'unknown',
      status: res.statusCode,
      ms: Date.now() - start,
    }));
  });
  next();
});

// Health check — public
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', ts: new Date().toISOString() });
});

// Route groups
app.use('/api/itsm',        require('./routes/itsm'));
app.use('/api/tools',       require('./routes/tools'));
app.use('/api/credentials', require('./routes/credentials'));

// 404
app.use(function(req, res) {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Global error handler
app.use(function(err, req, res, next) {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Initialize DB on startup (non-blocking)
const db = require('./utils/db');
db.init().catch(err => console.warn('DB init warning:', err.message));

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`CyberRx API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

// Lambda handler export (for AWS)
module.exports = app;
module.exports.handler = require('serverless-http')(app);
