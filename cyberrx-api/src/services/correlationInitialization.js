'use strict';

const CorrelationEngineOptimized = require('./CorrelationEngineOptimized');
const RedisClientFactory = require('./redisClient');
const logger = require('../utils/logger');

/**
 * Initialize Optimized Correlation Engine with Redis and monitoring
 * Call this during application startup
 */
async function initializeCorrelationEngine() {
  try {
    logger.info('Initializing Optimized Correlation Engine...');

    // Initialize Redis client
    const redisClient = await RedisClientFactory.createClient({
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
      database: process.env.REDIS_DB || '0'
    });

    if (!RedisClientFactory.isReady()) {
      throw new Error('Redis client not connected');
    }

    // Initialize correlation engine with Redis and logger
    CorrelationEngineOptimized.initialize(redisClient, logger);

    logger.info('Optimized Correlation Engine initialized successfully');

    // Get initial cache stats
    const redisInfo = await RedisClientFactory.getInfo();
    logger.info('Redis Info', {
      version: redisInfo?.server?.redis_version,
      uptime: redisInfo?.server?.uptime_in_days,
      connected_clients: redisInfo?.clients?.connected_clients,
      used_memory_human: redisInfo?.memory?.used_memory_human
    });

    return {
      success: true,
      redisConnected: true,
      cacheEnabled: true
    };
  } catch (err) {
    logger.error('Failed to initialize Optimized Correlation Engine:', err);
    logger.warn('Falling back to standard Correlation Engine (no caching)');

    // Return failure but don't crash the app
    return {
      success: false,
      redisConnected: false,
      cacheEnabled: false,
      error: err.message
    };
  }
}

/**
 * Shutdown correlation engine gracefully
 */
async function shutdownCorrelationEngine() {
  try {
    logger.info('Shutting down Correlation Engine...');

    // Close Redis connection
    await RedisClientFactory.close();

    logger.info('Correlation Engine shut down successfully');
  } catch (err) {
    logger.error('Error shutting down Correlation Engine:', err);
  }
}

/**
 * Health check for correlation engine
 */
async function healthCheck() {
  const isRedisReady = RedisClientFactory.isReady();
  const metrics = CorrelationEngineOptimized.getPerformanceMetrics();
  const cacheStats = isRedisReady ? await CorrelationEngineOptimized.getCacheStats() : null;

  return {
    status: isRedisReady ? 'healthy' : 'degraded',
    redisConnected: isRedisReady,
    cacheEnabled: isRedisReady,
    metrics,
    cacheStats,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  initializeCorrelationEngine,
  shutdownCorrelationEngine,
  healthCheck
};
