'use strict';

/**
 * Session Configuration
 * Task: SSO Integration
 *
 * Configures Express session middleware with Redis-backed storage.
 * Supports SSO authentication flows with secure session management.
 */

const session = require('express-session');
let RedisStore = null;
let redisClient = null;

/**
 * Try to initialize Redis for session storage
 */
if (process.env.REDIS_URL || process.env.REDIS_HOST) {
  try {
    const redis = require('redis');
    const RedisUrl = process.env.REDIS_URL;

    redisClient = redis.createClient({
      url: RedisUrl || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`,
      password: process.env.REDIS_PASSWORD,
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined
    });

    redisClient.on('error', (err) => {
      console.warn('Redis session store error:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('Redis session store connected');
    });

    // Connect to Redis
    redisClient.connect().catch(err => {
      console.warn('Redis connection failed, falling back to memory sessions:', err.message);
    });

    const ConnectRedis = require('connect-redis');
    RedisStore = ConnectRedis(session);
  } catch (err) {
    console.warn('Failed to initialize Redis session store:', err.message);
  }
}

/**
 * Session middleware configuration
 */
const sessionMiddleware = session({
  // Use Redis store if available, otherwise use memory store (development only)
  store: RedisStore ? new RedisStore({ client: redisClient }) : undefined,

  // Session secret
  secret: process.env.SESSION_SECRET || 'cyberrx-session-secret-dev',

  // Session configuration
  name: 'cyberrx.sid',
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiration on every request

  // Cookie configuration
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent JavaScript access
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax', // CSRF protection
    domain: process.env.COOKIE_DOMAIN // For cross-subdomain cookies
  }
});

/**
 * Close Redis connection (for graceful shutdown)
 */
async function closeSessionStore() {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('Redis session store closed');
    } catch (err) {
      console.error('Error closing Redis session store:', err);
    }
  }
}

module.exports = {
  sessionMiddleware,
  closeSessionStore,
  redisClient
};
