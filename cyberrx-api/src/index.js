'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// CORS configuration - allowlist from environment
// Build allowlist from CORS_ALLOWLIST env var (comma-separated) or FRONTEND_URL
const allowedOrigins = [];

// Add localhost URLs for development
if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push(
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173'
  );
}

// Add from CORS_ALLOWLIST if provided (recommended for production)
if (process.env.CORS_ALLOWLIST) {
  const originsFromEnv = process.env.CORS_ALLOWLIST.split(',').map(url => url.trim());
  allowedOrigins.push(...originsFromEnv);
}
// Fallback: add FRONTEND_URL if CORS_ALLOWLIST not set
else if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is in allowlist
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed for origin: ' + origin));
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
app.use('/api/itsm',             require('./routes/itsm'));
app.use('/api/tools',            require('./routes/tools'));
app.use('/api/credentials',      require('./routes/credentials'));
app.use('/api/orgs',             require('./routes/orgs'));

// M1: Risk Correlation Engine Routes
app.use('/api/business-processes', require('./routes/business-processes'));
app.use('/api/assets',            require('./routes/assets'));
app.use('/api/data-objects',      require('./routes/data-objects'));
app.use('/api/threat-scenarios',   require('./routes/threat-scenarios'));
app.use('/api/legal-obligations',  require('./routes/legal-obligations'));
app.use('/api/executive-owners',   require('./routes/executive-owners'));

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
