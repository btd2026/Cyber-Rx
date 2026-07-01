const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const db = require('../utils/db');

/**
 * Internal function to perform readiness checks
 */
async function performReadinessCheck() {
  const checks = {
    database: false,
    redis: false
  };

  let ready = true;
  const errors = {};

  // Check database connectivity
  try {
    await db.query('SELECT 1');
    checks.database = true;
  } catch (error) {
    ready = false;
    errors.database = error.message;
    logger.error('Database readiness check failed', { error: error.message });
  }

  // Check Redis connectivity (if configured)
  if (process.env.REDIS_URL) {
    try {
      const Redis = require('ioredis');
      const redis = new Redis(process.env.REDIS_URL, {
        connectTimeout: 500,
        maxRetriesPerRequest: 0
      });
      await redis.ping();
      await redis.quit();
      checks.redis = true;
    } catch (error) {
      ready = false;
      errors.redis = error.message;
      logger.error('Redis readiness check failed', { error: error.message });
    }
  } else {
    checks.redis = true;
  }

  return {
    ready,
    checks,
    errors
  };
}

/**
 * Basic health check endpoint
 * Returns comprehensive status information with critical service checks
 * MUST respond within 1 second
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  const healthStatus = {
    status: 'healthy',
    version: process.env.npm_package_version || '1.0.0',
    // Render sets RENDER_GIT_COMMIT automatically — confirms the deployed commit.
    commit: (process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || 'unknown').slice(0, 12),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    checks: {}
  };

  let overallHealthy = true;
  const errors = {};

  // Database health check
  try {
    const dbStart = Date.now();
    await db.query('SELECT 1');
    const dbDuration = Date.now() - dbStart;
    healthStatus.checks.database = {
      status: 'healthy',
      latency_ms: dbDuration,
      connected: true
    };
  } catch (error) {
    overallHealthy = false;
    healthStatus.checks.database = {
      status: 'unhealthy',
      connected: false,
      error: error.message
    };
    errors.database = error.message;
    logger.error('Health check: Database failed', { error: error.message });
  }

  // Redis health check (if configured)
  if (process.env.REDIS_URL) {
    try {
      const redisStart = Date.now();
      const Redis = require('ioredis');
      const redis = new Redis(process.env.REDIS_URL, {
        connectTimeout: 1000,
        maxRetriesPerRequest: 0
      });
      await redis.ping();
      const redisDuration = Date.now() - redisStart;
      await redis.quit();
      healthStatus.checks.redis = {
        status: 'healthy',
        latency_ms: redisDuration,
        connected: true
      };
    } catch (error) {
      overallHealthy = false;
      healthStatus.checks.redis = {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
      errors.redis = error.message;
      logger.error('Health check: Redis failed', { error: error.message });
    }
  } else {
    healthStatus.checks.redis = {
      status: 'not_configured',
      connected: false,
      message: 'Redis is optional and not configured'
    };
  }

  healthStatus.status = overallHealthy ? 'healthy' : 'unhealthy';
  healthStatus.duration_ms = Date.now() - startTime;

  const statusCode = overallHealthy ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

/**
 * Liveness probe
 * Indicates if the service is running
 * Kubernetes uses this to restart containers that are deadlocked
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

/**
 * Readiness probe
 * Indicates if the service is ready to accept traffic
 * Checks critical dependencies with 1-second timeout enforcement
 */
router.get('/ready', async (req, res) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Health check timeout after 1000ms')), 1000);
  });

  try {
    const healthPromise = performReadinessCheck();
    const result = await Promise.race([healthPromise, timeoutPromise]);
    const statusCode = result.ready ? 200 : 503;
    res.status(statusCode).json({
      status: result.ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: result.checks,
      errors: Object.keys(result.errors).length > 0 ? result.errors : undefined
    });
  } catch (error) {
    logger.error('Readiness check failed or timed out', { error: error.message });
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error.message,
      checks: { database: false, redis: false }
    });
  }
});

/**
 * Detailed database health check
 * Returns database connection pool status and query performance
 */
router.get('/database', async (req, res) => {
  try {
    // Check connectivity
    await db.query('SELECT 1');

    // Get connection pool stats
    const pool = db.pool;
    const poolStats = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };

    // Get database size
    const sizeResult = await db.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `);
    const dbSize = sizeResult.rows[0].size;

    // Get active connections
    const connectionsResult = await db.query(`
      SELECT count(*) as active_connections
      FROM pg_stat_activity
      WHERE state = 'active'
      AND pid != pg_backend_pid()
    `);
    const activeConnections = parseInt(connectionsResult.rows[0].active_connections);

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        size: dbSize,
        activeConnections,
        pool: poolStats
      }
    });
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error.message
      }
    });
  }
});

/**
 * Redis health check
 * Returns Redis connection status and memory usage
 */
router.get('/redis', async (req, res) => {
  if (!process.env.REDIS_URL) {
    return res.json({
      status: 'not_configured',
      timestamp: new Date().toISOString(),
      redis: {
        configured: false,
        message: 'Redis is not configured'
      }
    });
  }

  try {
    const Redis = require('ioredis');
    const redis = new Redis(process.env.REDIS_URL);

    // Check connectivity
    await redis.ping();

    // Get memory usage
    const info = await redis.info('memory');
    const memoryStats = {};
    info.split('\n').forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (key && value) {
          memoryStats[key] = value;
        }
      }
    });

    // Get key count
    const dbSize = await redis.dbsize();

    await redis.quit();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      redis: {
        connected: true,
        totalKeys: dbSize,
        memory: {
          used: memoryStats.used_memory_human,
          peak: memoryStats.used_memory_peak_human,
          rss: memoryStats.used_memory_rss_human
        }
      }
    });
  } catch (error) {
    logger.error('Redis health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      redis: {
        connected: false,
        error: error.message
      }
    });
  }
});

/**
 * System metrics endpoint
 * Returns basic system metrics for monitoring
 */
router.get('/metrics', async (req, res) => {
  try {
    // Get memory usage
    const memoryUsage = process.memoryUsage();

    // Get uptime
    const uptime = process.uptime();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      system: {
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
        },
        uptime: {
          seconds: Math.floor(uptime),
          human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
        },
        platform: process.platform,
        nodeVersion: process.version,
        cpuUsage: process.cpuUsage()
      }
    });
  } catch (error) {
    logger.error('Metrics collection failed', { error: error.message });
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;
