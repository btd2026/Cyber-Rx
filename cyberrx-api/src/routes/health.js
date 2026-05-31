const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const db = require('../utils/db');

/**
 * Basic health check endpoint
 * Returns minimal status information
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Liveness probe
 * Indicates if the service is running
 * Kubernetes uses this to restart containers that are deadlocked
 */
router.get('/live', (req, res) => {
  // Simply return 200 if we're alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

/**
 * Readiness probe
 * Indicates if the service is ready to accept traffic
 * Checks critical dependencies
 */
router.get('/ready', async (req, res) => {
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
    logger.error('Database health check failed', { error: error.message });
  }

  // Check Redis connectivity (if configured)
  if (process.env.REDIS_URL) {
    try {
      const Redis = require('ioredis');
      const redis = new Redis(process.env.REDIS_URL);
      await redis.ping();
      await redis.quit();
      checks.redis = true;
    } catch (error) {
      ready = false;
      errors.redis = error.message;
      logger.error('Redis health check failed', { error: error.message });
    }
  } else {
    // Redis is optional
    checks.redis = true;
  }

  if (ready) {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks
    });
  } else {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
      errors
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
