'use strict';

/**
 * Redis Configuration Module
 *
 * Provides Redis client configuration for distributed rate limiting and caching.
 * Supports both local Redis and Redis Cloud connections.
 *
 * Environment Variables:
 * - REDIS_HOST: Redis server host (default: localhost)
 * - REDIS_PORT: Redis server port (default: 6379)
 * - REDIS_PASSWORD: Redis authentication password (required for Redis Cloud)
 * - REDIS_DB: Redis database number (default: 0)
 * - REDIS_URL: Complete Redis URL (overrides individual config)
 * - REDIS_TLS: Enable TLS connection (default: false)
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection pooling for high-performance scenarios
 * - Graceful degradation when Redis is unavailable
 * - Health check monitoring
 */

const redis = require('redis');

let client = null;
let isConnected = false;
let connectionAttempts = 0;
const MAX_RECONNECT_DELAY = 30000; // 30 seconds max

/**
 * Reconnection backoff. Gives up after a few attempts so an unreachable Redis
 * doesn't loop forever — the app then runs on the in-memory fallback.
 */
function reconnectStrategy(retries) {
  if (retries > 5) {
    console.warn('Redis unreachable after 5 attempts — using in-memory fallback');
    return new Error('Redis reconnection failed');
  }
  return Math.min(Math.exp(retries) * 50 + Math.random() * 100, MAX_RECONNECT_DELAY);
}

/**
 * Get Redis connection configuration from environment.
 * Returns null when Redis is not configured (no REDIS_URL / REDIS_HOST), so the
 * app skips connecting entirely instead of hammering localhost:6379.
 */
function getRedisConfig() {
  // If REDIS_URL is provided, hand it to node-redis directly (it parses
  // redis:// and rediss:// itself) and attach our reconnect policy.
  if (process.env.REDIS_URL) {
    return { url: process.env.REDIS_URL, socket: { reconnectStrategy } };
  }

  // Otherwise only connect when a host is explicitly configured.
  if (!process.env.REDIS_HOST) {
    return null;
  }

  return {
    socket: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT) || 6379,
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      reconnectStrategy
    },
    password: process.env.REDIS_PASSWORD || undefined,
    database: parseInt(process.env.REDIS_DB) || 0
  };
}

/**
 * Initialize Redis client with proper configuration
 */
async function initRedisClient() {
  if (client) {
    return client;
  }

  const config = getRedisConfig();
  if (!config) {
    console.log('Redis not configured — using in-memory fallback for rate limiting and caching');
    return null;
  }

  try {
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      event: 'redis_init',
      host: config.url ? '(from REDIS_URL)' : config.socket?.host,
      port: config.url ? undefined : config.socket?.port,
      tls: config.url ? config.url.startsWith('rediss:') : !!config.socket?.tls
    }));

    // Create Redis client
    client = redis.createClient(config);

    // Log the first error only — the reconnect strategy bounds the retries, so
    // we avoid filling the logs with repeated identical Redis errors.
    let errorLogged = false;

    // Handle connection events
    client.on('connect', () => {
      isConnected = true;
      connectionAttempts = 0;
      errorLogged = false;
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        event: 'redis_connected'
      }));
    });

    client.on('ready', () => {
      isConnected = true;
      connectionAttempts = 0;
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        event: 'redis_ready'
      }));
    });

    client.on('error', (err) => {
      isConnected = false;
      if (!errorLogged) {
        errorLogged = true;
        console.error('Redis client error (rate limiting will fall back to in-memory):', err.message);
      }
    });

    client.on('end', () => {
      isConnected = false;
    });

    // Connect to Redis
    await client.connect();

    // Verify connection with PING
    await client.ping();

    console.log('Redis client initialized successfully');

    return client;
  } catch (err) {
    console.error('Redis initialization failed:', err.message);
    console.warn('Rate limiting will fall back to in-memory mode');

    // Don't throw - allow application to start without Redis
    client = null;
    isConnected = false;
    return null;
  }
}

/**
 * Get Redis client instance
 * Returns null if Redis is not available
 */
function getRedisClient() {
  return client;
}

/**
 * Check if Redis is connected and available
 */
function isRedisAvailable() {
  return isConnected && client && client.isOpen;
}

/**
 * Gracefully close Redis connection
 */
async function closeRedisClient() {
  if (client && client.isOpen) {
    try {
      await client.quit();
      console.log('Redis connection closed gracefully');
    } catch (err) {
      console.error('Error closing Redis connection:', err.message);

      // Force close if graceful shutdown fails
      try {
        await client.disconnect();
        console.log('Redis connection disconnected');
      } catch (disconnectErr) {
        console.error('Error disconnecting Redis:', disconnectErr.message);
      }
    }

    client = null;
    isConnected = false;
  }
}

/**
 * Health check for Redis connection
 */
async function redisHealthCheck() {
  if (!client || !client.isOpen) {
    return {
      status: 'unavailable',
      message: 'Redis client not initialized'
    };
  }

  try {
    const start = Date.now();
    await client.ping();
    const latency = Date.now() - start;

    return {
      status: 'healthy',
      latency: `${latency}ms`,
      message: 'Redis connection healthy'
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      message: err.message
    };
  }
}

// Initialize on module load (but don't block if Redis is unavailable)
initRedisClient().catch(err => {
  console.warn('Redis initialization skipped:', err.message);
});

// Export functions
module.exports = {
  initRedisClient,
  getRedisClient,
  isRedisAvailable,
  closeRedisClient,
  redisHealthCheck,
  getRedisConfig
};
