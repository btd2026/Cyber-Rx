'use strict';

/**
 * Rate Limiting Middleware with Redis Backend
 *
 * Provides distributed rate limiting using Redis for production scalability.
 * Supports multiple rate limiting strategies:
 * - Per-IP rate limiting: For authentication endpoints
 * - Per-user rate limiting: For API endpoints
 * - Per-endpoint rate limiting: Custom limits per route
 * - Global rate limiting: System-wide protection
 *
 * Features:
 * - Redis-backed distributed rate limiting
 * - Graceful fallback to in-memory if Redis unavailable
 * - Configurable windows and limits per endpoint
 * - Rate limit headers in responses
 * - IP-based and user-based limiting
 *
 * Environment Variables:
 * - REDIS_HOST: Redis server host (default: localhost)
 * - REDIS_PORT: Redis server port (default: 6379)
 * - REDIS_PASSWORD: Redis authentication password
 * - RATE_LIMIT_ENABLED: Enable/disable rate limiting (default: true)
 */

const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const { getRedisClient, isRedisAvailable } = require('../config/redis');

// In-memory fallback storage (used when Redis unavailable)
const memoryStore = new Map();

// Log the in-memory fallback once, not once per limiter created.
let warnedInMemory = false;

// Rate limiter instances
const limiters = {
  // Authentication endpoints (strict limits)
  authLogin: null,
  authSignup: null,

  // API endpoints (standard limits)
  apiGet: null,
  apiPost: null,
  apiPut: null,
  apiDelete: null,

  // Per-user limiters
  userStandard: null,

  // Per-IP limiters
  ipStrict: null,
  ipStandard: null
};

/**
 * Initialize rate limiter with Redis backend
 */
function createRateLimiter(options) {
  const redisClient = getRedisClient();

  if (isRedisAvailable() && redisClient) {
    // Use Redis-backed rate limiter
    return new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: options.prefix || 'rate-limit',
      points: options.points || 100, // Number of requests
      duration: options.duration || 60, // Per 60 seconds
      blockDuration: options.blockDuration || 0, // Do not block, just rate limit
      execEvenly: options.execEvenly || false, // Spread requests evenly
      ...options
    });
  } else {
    // Fallback to in-memory rate limiter (logged once across all limiters).
    if (!warnedInMemory) {
      warnedInMemory = true;
      console.warn('Redis unavailable, using in-memory rate limiting');
    }

    return new RateLimiterMemory({
      points: options.points || 100,
      duration: options.duration || 60,
      blockDuration: options.blockDuration || 0,
      execEvenly: options.execEvenly || false,
      ...options
    });
  }
}

/**
 * Initialize all rate limiters
 */
function initRateLimiters() {
  // Check if rate limiting is enabled
  if (process.env.RATE_LIMIT_ENABLED === 'false') {
    console.warn('Rate limiting disabled via RATE_LIMIT_ENABLED=false');
    return;
  }

  // Authentication endpoints (strict IP-based limits)
  limiters.authLogin = createRateLimiter({
    prefix: 'rl:auth:login',
    points: 5, // 5 attempts
    duration: 60, // per 1 minute
    blockDuration: 300, // Block for 5 minutes after limit reached
    execEvenly: false
  });

  limiters.authSignup = createRateLimiter({
    prefix: 'rl:auth:signup',
    points: 3, // 3 attempts
    duration: 60, // per 1 minute
    blockDuration: 300, // Block for 5 minutes after limit reached
    execEvenly: false
  });

  // API endpoints (method-based limits)
  limiters.apiGet = createRateLimiter({
    prefix: 'rl:api:get',
    points: 100, // 100 requests
    duration: 60, // per 1 minute
    blockDuration: 60 // Block for 1 minute after limit reached
  });

  limiters.apiPost = createRateLimiter({
    prefix: 'rl:api:post',
    points: 50, // 50 requests
    duration: 60, // per 1 minute
    blockDuration: 60
  });

  limiters.apiPut = createRateLimiter({
    prefix: 'rl:api:put',
    points: 50, // 50 requests
    duration: 60, // per 1 minute
    blockDuration: 60
  });

  limiters.apiDelete = createRateLimiter({
    prefix: 'rl:api:delete',
    points: 20, // 20 requests
    duration: 60, // per 1 minute
    blockDuration: 60
  });

  // Per-user rate limiting
  limiters.userStandard = createRateLimiter({
    prefix: 'rl:user',
    points: 100, // 100 requests
    duration: 60, // per 1 minute per user
    blockDuration: 60
  });

  // Per-IP rate limiting
  limiters.ipStrict = createRateLimiter({
    prefix: 'rl:ip:strict',
    points: 10, // 10 requests
    duration: 60, // per 1 minute per IP
    blockDuration: 120 // Block for 2 minutes
  });

  limiters.ipStandard = createRateLimiter({
    prefix: 'rl:ip:standard',
    points: 100, // 100 requests
    duration: 60, // per 1 minute per IP
    blockDuration: 60
  });

  console.log('Rate limiters initialized with', isRedisAvailable() ? 'Redis' : 'in-memory', 'backend');
}

/**
 * Extract client IP from request
 * Handles proxy headers (X-Forwarded-For, X-Real-IP)
 */
function getClientIp(req) {
  // Check X-Forwarded-For header (proxy chain)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0]; // Return the original client IP
  }

  // Check X-Real-IP header
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp;
  }

  // Fall back to direct connection IP
  return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
}

/**
 * Extract user ID from request (from JWT)
 */
function getUserId(req) {
  return req.userId || req.user?.userId || req.user?.id;
}

/**
 * Rate limiting middleware factory
 * Creates middleware with specified limiter and key generator
 */
function createRateLimitMiddleware(limiter, options = {}) {
  return async (req, res, next) => {
    // Check if rate limiting is enabled
    if (process.env.RATE_LIMIT_ENABLED === 'false') {
      return next();
    }

    // Ensure limiter is initialized
    if (!limiter) {
      console.error('Rate limiter not initialized');
      return next();
    }

    try {
      // Generate key for rate limiting
      let key = options.keyPrefix || 'default';

      if (options.keyBy === 'ip') {
        key = `ip:${getClientIp(req)}`;
      } else if (options.keyBy === 'user') {
        const userId = getUserId(req);
        if (userId) {
          key = `user:${userId}`;
        } else {
          // Fallback to IP if no user
          key = `ip:${getClientIp(req)}`;
        }
      } else if (options.keyBy === 'endpoint') {
        const userId = getUserId(req);
        const userPart = userId ? `user:${userId}` : `ip:${getClientIp(req)}`;
        key = `${userPart}:${req.method}:${req.path}`;
      } else if (typeof options.keyBy === 'function') {
        key = options.keyBy(req);
      }

      // Consume a point from rate limiter
      const rateLimitResult = await limiter.consume(key, options.pointsToConsume || 1);

      // Add rate limit headers to response
      res.setHeader('X-RateLimit-Limit', rateLimitResult.remainingPoints + (rateLimitResult.remainingPoints < 0 ? 0 : 1));
      res.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimitResult.remainingPoints));
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimitResult.msBeforeNext).toISOString());

      next();
    } catch (rej) {
      // Rate limit exceeded
      const secs = Math.round(rej.msBeforeNext / 1000) || 1;

      res.setHeader('Retry-After', secs);
      res.setHeader('X-RateLimit-Limit', 0);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rej.msBeforeNext).toISOString());

      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again in ${secs} seconds.`,
        retryAfter: `${secs} seconds`
      });
    }
  };
}

/**
 * Predefined rate limiting middleware for common scenarios
 */

// Authentication endpoints (strict IP-based limiting)
const authLoginLimiter = createRateLimitMiddleware(limiters.authLogin, {
  keyBy: 'ip',
  keyPrefix: 'login'
});

const authSignupLimiter = createRateLimitMiddleware(limiters.authSignup, {
  keyBy: 'ip',
  keyPrefix: 'signup'
});

// API endpoints (method-based limiting)
const apiGetLimiter = createRateLimitMiddleware(limiters.apiGet, {
  keyBy: 'user',
  keyPrefix: 'get'
});

const apiPostLimiter = createRateLimitMiddleware(limiters.apiPost, {
  keyBy: 'user',
  keyPrefix: 'post'
});

const apiPutLimiter = createRateLimitMiddleware(limiters.apiPut, {
  keyBy: 'user',
  keyPrefix: 'put'
});

const apiDeleteLimiter = createRateLimitMiddleware(limiters.apiDelete, {
  keyBy: 'user',
  keyPrefix: 'delete'
});

// Per-user rate limiting
const userStandardLimiter = createRateLimitMiddleware(limiters.userStandard, {
  keyBy: 'user',
  keyPrefix: 'user'
});

// Per-IP rate limiting
const ipStrictLimiter = createRateLimitMiddleware(limiters.ipStrict, {
  keyBy: 'ip',
  keyPrefix: 'ip-strict'
});

const ipStandardLimiter = createRateLimitMiddleware(limiters.ipStandard, {
  keyBy: 'ip',
  keyPrefix: 'ip-standard'
});

// Custom rate limiter factory
function createCustomLimiter(options) {
  const limiter = createRateLimiter({
    prefix: options.prefix || 'rl:custom',
    points: options.points || 100,
    duration: options.duration || 60,
    blockDuration: options.blockDuration || 0
  });

  return createRateLimitMiddleware(limiter, {
    keyBy: options.keyBy || 'user',
    keyPrefix: options.keyPrefix || 'custom'
  });
}

/**
 * Vendor sync rate limiter
 * Limits sync operations to prevent abuse
 */
const vendorSyncLimiter = createCustomLimiter({
  prefix: 'rl:vendor:sync',
  points: 10, // 10 requests
  duration: 60, // per 1 minute
  blockDuration: 60, // Block for 1 minute
  keyBy: 'user', // Rate limit per user (organization)
  keyPrefix: 'vendor-sync'
});

// Initialize rate limiters on module load
initRateLimiters();

/**
 * Health check for rate limiting system
 */
function rateLimitHealthCheck() {
  return {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    backend: isRedisAvailable() ? 'redis' : 'memory',
    limitersInitialized: Object.values(limiters).filter(l => l !== null).length,
    redisAvailable: isRedisAvailable()
  };
}

// Export middleware and utilities
module.exports = {
  // Middleware
  authLoginLimiter,
  authSignupLimiter,
  apiGetLimiter,
  apiPostLimiter,
  apiPutLimiter,
  apiDeleteLimiter,
  vendorSyncLimiter,
  userStandardLimiter,
  ipStrictLimiter,
  ipStandardLimiter,

  // Factory functions
  createCustomLimiter,
  createRateLimitMiddleware,

  // Utilities
  getClientIp,
  getUserId,

  // Health check
  rateLimitHealthCheck,

  // Direct access to limiters (for advanced usage)
  limiters
};
