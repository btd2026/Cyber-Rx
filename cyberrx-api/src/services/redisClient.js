'use strict';

const redis = require('redis');

/**
 * Redis Client Factory
 * Creates and manages Redis connection for caching
 */
class RedisClientFactory {
  static client = null;
  static isConnected = false;

  /**
   * Create and connect Redis client
   * @param {Object} config - Redis configuration
   * @returns {Promise<Object>} Redis client
   */
  static async createClient(config = {}) {
    if (this.client && this.isConnected) {
      return this.client;
    }

    const redisUrl = config.url || process.env.REDIS_URL || 'redis://localhost:6379';

    const client = redis.createClient({
      url: redisUrl,
      socket: {
        host: config.host || process.env.REDIS_HOST || 'localhost',
        port: config.port || parseInt(process.env.REDIS_PORT || '6379'),
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection failed');
          }
          return Math.min(retries * 100, 3000);
        }
      },
      password: config.password || process.env.REDIS_PASSWORD,
      database: config.database || parseInt(process.env.REDIS_DB || '0')
    });

    // Error handling
    client.on('error', (err) => {
      console.error('Redis Client Error:', err.message);
      this.isConnected = false;
    });

    client.on('connect', () => {
      console.log('Redis Client Connected');
      this.isConnected = true;
    });

    client.on('reconnecting', () => {
      console.log('Redis Client Reconnecting...');
      this.isConnected = false;
    });

    client.on('ready', () => {
      console.log('Redis Client Ready');
      this.isConnected = true;
    });

    await client.connect();

    this.client = client;
    return client;
  }

  /**
   * Get existing client or create new one
   * @returns {Promise<Object>} Redis client
   */
  static async getClient() {
    if (!this.client) {
      return await this.createClient();
    }
    return this.client;
  }

  /**
   * Close Redis connection
   * @returns {Promise<void>}
   */
  static async close() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      console.log('Redis Client Closed');
    }
  }

  /**
   * Check if Redis is connected
   * @returns {boolean} Connection status
   */
  static isReady() {
    return this.isConnected && this.client !== null;
  }

  /**
   * Flush all keys (use with caution)
   * @returns {Promise<void>}
   */
  static async flushAll() {
    if (this.client) {
      await this.client.flushAll();
      console.log('Redis FLUSHALL executed');
    }
  }

  /**
   * Get Redis info
   * @returns {Promise<Object>} Redis info
   */
  static async getInfo() {
    if (!this.client) {
      return null;
    }

    const info = await this.client.info();
    return this.parseInfo(info);
  }

  /**
   * Parse Redis INFO output
   * @private
   */
  static parseInfo(infoString) {
    const lines = infoString.split('\r\n');
    const result = {};

    let currentSection = '';
    for (const line of lines) {
      if (line.startsWith('# ')) {
        currentSection = line.substring(2);
        result[currentSection] = {};
      } else if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (currentSection) {
          result[currentSection][key] = value;
        } else {
          result[key] = value;
        }
      }
    }

    return result;
  }
}

module.exports = RedisClientFactory;
