'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { authenticateJWT } = require('./middleware/auth');
const { orgIsolation } = require('./middleware/org_isolation');
const { apiGetLimiter, apiPostLimiter, apiPutLimiter, apiDeleteLimiter } = require('./middleware/rateLimit');
const logger = require('./config/logger');
const { passport } = require('./config/passport');
const { sessionMiddleware, closeSessionStore } = require('./config/session');
const app = express();

// Initialize Sentry if configured
if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Add custom context
      event.request = event.request || {};
      event.request.env = {
        nodeVersion: process.version,
        platform: process.platform
      };
      return event;
    }
  });
  logger.info('Sentry initialized');
} else {
  logger.warn('Sentry not configured - SENTRY_DSN not set');
}

// CORS configuration - production-grade allowlist
// Build allowlist from CORS_ALLOWLIST env var (comma-separated)
const allowedOrigins = [];

// Production Vercel URLs (always allowed in production)
// Entries may contain '*' wildcards (e.g. Vercel preview deployments whose
// subdomain hash changes on every deploy).
const productionOrigins = [
  'https://cyber-rx-frontend.vercel.app',
  'https://frontend-mu-drab-93.vercel.app',
  // Vercel preview/branch deployments for this project (hash changes per deploy)
  'https://cyber-rx-frontend-*.vercel.app',
  'https://cyber-rx-*-btd2026s-projects.vercel.app',
  'https://*-btd2026s-projects.vercel.app'
];

// Development URLs (only in development mode)
const developmentOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174'
];

// Add origins based on environment
if (process.env.NODE_ENV === 'development') {
  // In development, allow localhost and any explicitly configured origins
  allowedOrigins.push(...developmentOrigins);
  if (process.env.CORS_ALLOWLIST) {
    const originsFromEnv = process.env.CORS_ALLOWLIST.split(',').map(url => url.trim());
    allowedOrigins.push(...originsFromEnv);
  }
} else {
  // In production, ONLY allow explicitly configured origins
  // Start with production Vercel URLs
  allowedOrigins.push(...productionOrigins);

  // Add from CORS_ALLOWLIST if provided (critical for production security)
  if (process.env.CORS_ALLOWLIST) {
    const originsFromEnv = process.env.CORS_ALLOWLIST.split(',').map(url => url.trim());
    allowedOrigins.push(...originsFromEnv);
  }

  // Optional: Add FRONTEND_URL as fallback (deprecated, use CORS_ALLOWLIST instead)
  if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
    console.warn('FRONTEND_URL is deprecated. Use CORS_ALLOWLIST environment variable instead.');
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
}

// Split the allowlist into exact origins and wildcard patterns. Any entry
// containing '*' is compiled to a RegExp (e.g. Vercel preview deployments).
const exactOrigins = [];
const originPatterns = [];
for (const entry of allowedOrigins) {
  if (entry.includes('*')) {
    const re = new RegExp(
      '^' + entry.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]*') + '$'
    );
    originPatterns.push(re);
  } else {
    exactOrigins.push(entry);
  }
}

function isOriginAllowed(origin) {
  if (exactOrigins.indexOf(origin) !== -1) return true;
  return originPatterns.some((re) => re.test(origin));
}

// Log CORS configuration on startup
logger.info('CORS configured', {
  environment: process.env.NODE_ENV || 'development',
  exactOrigins,
  patterns: originPatterns.map((re) => re.source),
  originCount: allowedOrigins.length
});

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    // WARNING: In production, consider disabling this for stricter security
    if (!origin) {
      if (process.env.NODE_ENV === 'production' && process.env.CORS_REQUIRE_ORIGIN === 'true') {
        return callback(new Error('CORS: Origin header required in production'));
      }
      return callback(null, true);
    }

    // Check if origin is in allowlist (exact match or wildcard pattern)
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(JSON.stringify({
        ts: new Date().toISOString(),
        event: 'cors_blocked',
        origin,
        exactOrigins,
        patterns: originPatterns.map((re) => re.source)
      }));
      callback(new Error('CORS not allowed for origin: ' + origin));
    }
  },
  credentials: true, // Allow cookies and authentication headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Org-ID'],
  maxAge: 86400 // Cache preflight response for 24 hours
}));
app.use(express.json({ limit: '1mb' }));

// Session middleware for SSO flows
app.use(sessionMiddleware);

// Passport initialization for SSO authentication
app.use(passport.initialize());
app.use(passport.session());

// Request logging middleware
app.use(function(req, res, next) {
  const start = Date.now();
  res.on('finish', function() {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      orgId: req.headers['x-org-id'] || 'unknown',
      status: res.statusCode,
      duration: duration
    };

    // Log slow requests as warnings
    if (duration > 1000) {
      logger.warn('Slow request', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });
  next();
});

// Health check routes — public
app.use('/health', require('./routes/health'));

// Legacy health check endpoint for backward compatibility
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Route groups with rate limiting
app.use('/api/itsm',             [apiPostLimiter, apiPutLimiter], require('./routes/itsm'));
app.use('/api/tools',            [apiGetLimiter, apiPostLimiter], require('./routes/tools'));
app.use('/api/credentials',      [apiGetLimiter, apiPostLimiter, apiDeleteLimiter], require('./routes/credentials'));
app.use('/api/credentials',      [apiGetLimiter, apiPostLimiter], require('./routes/credentialRotation'));
app.use('/api/orgs',             [apiGetLimiter, apiPostLimiter], require('./routes/orgs'));

// M3: Authentication Routes (public - no auth required for signup/login)
app.use('/api/auth',             require('./routes/auth'));

// SSO Routes (public - SAML and OIDC authentication)
app.use('/sso',                  require('./routes/sso'));

// M1: Risk Correlation Engine Routes with rate limiting
app.use('/api/business-processes', [apiGetLimiter, apiPostLimiter, apiPutLimiter, apiDeleteLimiter], require('./routes/business-processes'));
app.use('/api/assets',            [apiGetLimiter, apiPostLimiter, apiPutLimiter, apiDeleteLimiter], require('./routes/assets'));
app.use('/api/vendors',           [apiGetLimiter, apiPostLimiter, apiPutLimiter, apiDeleteLimiter], require('./routes/vendors'));
app.use('/api/data-objects',      [apiGetLimiter, apiPostLimiter, apiPutLimiter, apiDeleteLimiter], require('./routes/data-objects'));
app.use('/api/threat-scenarios',   [apiGetLimiter, apiPostLimiter, apiPutLimiter, apiDeleteLimiter], require('./routes/threat-scenarios'));
app.use('/api/legal-obligations',  [apiGetLimiter, apiPostLimiter, apiPutLimiter, apiDeleteLimiter], require('./routes/legal-obligations'));
app.use('/api/executive-owners',   [apiGetLimiter, apiPostLimiter, apiPutLimiter], require('./routes/executive-owners'));
app.use('/api/risks',             [apiGetLimiter, apiPostLimiter, apiPutLimiter, apiDeleteLimiter], require('./routes/risks'));
app.use('/api/findings',           [apiGetLimiter, apiPostLimiter, apiPutLimiter, apiDeleteLimiter], require('./routes/findings'));
app.use('/api/correlation',        [apiPostLimiter], require('./routes/correlation'));

// Executive Narratives Routes with rate limiting
app.use('/api/narratives',         [apiGetLimiter, apiPostLimiter, apiPutLimiter, apiDeleteLimiter], require('./routes/narratives'));

// Core Workflow Entities: Controls, Remediation Tasks, Evidence with rate limiting
app.use('/api/controls',           [apiGetLimiter, apiPostLimiter, apiPutLimiter, apiDeleteLimiter], require('./routes/controls'));
app.use('/api/tasks',              [apiGetLimiter, apiPostLimiter, apiPutLimiter, apiDeleteLimiter], require('./routes/tasks'));
app.use('/api/evidence',           [apiGetLimiter, apiPostLimiter, apiDeleteLimiter], require('./routes/evidence'));

// Vendor Continuous Monitoring Routes with rate limiting
app.use('/api/vendor-monitoring',  [apiGetLimiter, apiPostLimiter], require('./routes/vendor-monitoring'));

// Vendor Sync Status API with rate limiting
app.use('/api/vendors',            [apiGetLimiter], require('./routes/syncStatus'));

// Vendor Sync API with rate limiting (POST endpoints for triggering syncs)
app.use('/api/vendors',            [apiGetLimiter, apiPostLimiter], require('./routes/vendorSync'));

// Audit Trail API with rate limiting
app.use('/api/audit-trail',        [apiGetLimiter], require('./routes/audit-trail'));

// PDF Report Generation with rate limiting
app.use('/api/reports',            [apiPostLimiter], require('./routes/reports'));

// Executive AI Agent layer - continuous role-specific executive briefs
app.use('/api/agents',            [apiGetLimiter, apiPostLimiter], require('./routes/agents'));

// Seed management (admin routes - protect in production) with rate limiting
app.use('/api/seeds',             [apiGetLimiter, apiPostLimiter, apiDeleteLimiter], require('./routes/seeds'));

// 404
app.use(function(req, res) {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Global error handler
app.use(function(err, req, res, next) {
  // Log error with context
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    orgId: req.headers['x-org-id'] || 'unknown'
  });

  // Send to Sentry if configured
  if (process.env.SENTRY_DSN) {
    const Sentry = require('@sentry/node');
    Sentry.captureException(err);
  }

  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// Initialize DB on startup (non-blocking)
const db = require('./utils/db');
db.init()
  .then(() => logger.info('Database initialized'))
  .then(() => {
    // Optional: load the executive-brief demo dataset on startup. Gated by an
    // env flag so it never runs unintentionally; idempotent and safe to re-run.
    if (process.env.SEED_DEMO_DATA === 'true') {
      const { seedExecutiveDemo } = require('./utils/seedDemo');
      return seedExecutiveDemo({ force: process.env.SEED_DEMO_FORCE === 'true' })
        .then(() => logger.info('Demo data seeded on startup'))
        .catch(err => logger.warn('Demo seed on startup failed', { error: err.message }));
    }
  })
  .catch(err => logger.warn('Database initialization warning', { error: err.message }));

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  logger.info('CyberRx API started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal} - Starting graceful shutdown`);

  // Set timeout for force shutdown
  const forceShutdown = setTimeout(() => {
    logger.error('Force shutdown after timeout');
    process.exit(1);
  }, 30000); // 30 second timeout

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');

    // Close database connections
    db.pool.end()
      .then(() => {
        logger.info('Database connections closed');
        clearTimeout(forceShutdown);
        logger.info('Graceful shutdown complete');
        process.exit(0);
      })
      .catch(err => {
        logger.error('Error closing database connections', { error: err.message });
        clearTimeout(forceShutdown);
        process.exit(1);
      })
      .finally(() => {
        // Close Redis session store
        closeSessionStore();
      });
  });

  // If server doesn't close in time, force shutdown
  setTimeout(() => {
    logger.warn('Forcing shutdown due to timeout');
    process.exit(1);
  }, 25000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', {
    message: err.message,
    stack: err.stack
  });
  if (process.env.SENTRY_DSN) {
    const Sentry = require('@sentry/node');
    Sentry.captureException(err);
  }
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', {
    reason: reason,
    promise: promise
  });
  if (process.env.SENTRY_DSN) {
    const Sentry = require('@sentry/node');
    Sentry.captureException(reason);
  }
});

// Lambda handler export (for AWS)
module.exports = app;
module.exports.handler = require('serverless-http')(app);
