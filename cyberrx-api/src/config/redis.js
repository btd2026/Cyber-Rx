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
 * Parse Redis URL into connection config
 * Supports both redis:// and rediss:// (TLS) protocols
 */
function parseRedisUrl(url) {
  try {
    const parsed = new URL(url);

    return {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port) || 6379,
      password: parsed.password || undefined,
      db: (parsed.pathname && parsed.pathname !== '/')
        ? parseInt(parsed.pathname.substring(1))
        : 0,
      tls: parsed.protocol === 'rediss:'
    };
  } catch (err) {
    console.error('Invalid REDIS_URL:', url);
    return null;
  }
}

/**
 * Get Redis connection configuration from environment
 */
function getRedisConfig() {
  // If REDIS_URL is provided, use it
  if (process.env.REDIS_URL) {
    const config = parseRedisUrl(process.env.REDIS_URL);
    if (config) {
      return config;
    }
  }

  // Otherwise, use individual environment variables
  return {
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      reconnectStrategy: (retries) => {
        // Exponential backoff with jitter
        const delay = Math.min(
          Math.exp(retries) * 50 + Math.random() * 100,
          MAX_RECONNECT_DELAY
        );

        console.warn(`Redis reconnect attempt ${retries}, retrying in ${delay}ms`);

        // Stop retrying after 10 attempts
        if (retries > 10) {
          console.error('Redis reconnection failed after 10 attempts');
          return new Error('Redis reconnection failed');
        }

        return delay;
      }
    },
    password: process.env.REDIS_PASSWORD || undefined,
    database: parseInt(process.env.REDIS_DB) || 0,
    // Enable TLS if REDIS_TLS is set to true
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined
  };
}

/**
 * Initialize Redis client with proper configuration
 */
async function initRedisClient() {
  if (client) {
    return client;
  }

  try {
    const config = getRedisConfig();

    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      event: 'redis_init',
      host: config.socket?.host || config.host,
      port: config.socket?.port || config.port,
      db: config.database || config.db,
      tls: !!config.tls
    }));

    // Create Redis client
    client = redis.createClient(config);

    // Handle connection events
    client.on('connect', () => {
      isConnected = true;
      connectionAttempts = 0;
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
      console.error('Redis client error:', err.message);

      if (err.message.includes('ECONNREFUSED')) {
        console.error('Redis connection refused - rate limiting will fall back to in-memory');
      }
    });

    client.on('reconnecting', () => {
      connectionAttempts++;
      console.warn(`Redis reconnection attempt ${connectionAttempts}`);
    });

    client.on('end', () => {
      isConnected = false;
      console.warn('Redis connection ended');
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
