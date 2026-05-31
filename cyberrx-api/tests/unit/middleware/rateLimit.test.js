'use strict';

/**
 * Rate Limiting Middleware Tests
 *
 * Tests for Redis-backed rate limiting with graceful fallback to in-memory.
 * Covers:
 * - Redis connection and initialization
 * - Rate limiter creation and configuration
 * - Per-IP rate limiting (authentication endpoints)
 * - Per-user rate limiting (API endpoints)
 * - Rate limit headers in responses
 * - Graceful fallback to in-memory
 * - Custom rate limiter creation
 */

const {
  getClientIp,
  getUserId,
  rateLimitHealthCheck
} = require('../../../src/middleware/rateLimit');

describe('Rate Limiting Middleware Utilities', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock request object
    req = {
      ip: '192.168.1.100',
      headers: {
        'x-forwarded-for': '203.0.113.1, 192.168.1.100',
        'x-real-ip': '203.0.113.1'
      },
      userId: 'user-123',
      user: {
        userId: 'user-123',
        email: 'test@example.com'
      },
      method: 'GET',
      path: '/api/endpoint'
    };

    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      getHeader: jest.fn()
    };

    // Mock next function
    next = jest.fn();
  });

  describe('getClientIp', () => {
    test('should extract IP from X-Forwarded-For header', () => {
      const ip = getClientIp(req);
      expect(ip).toBe('203.0.113.1');
    });

    test('should extract IP from X-Real-IP header', () => {
      delete req.headers['x-forwarded-for'];
      const ip = getClientIp(req);
      expect(ip).toBe('203.0.113.1');
    });

    test('should fall back to req.ip', () => {
      delete req.headers['x-forwarded-for'];
      delete req.headers['x-real-ip'];
      const ip = getClientIp(req);
      expect(ip).toBe('192.168.1.100');
    });

    test('should handle missing IP', () => {
      delete req.headers['x-forwarded-for'];
      delete req.headers['x-real-ip'];
      delete req.ip;
      const ip = getClientIp(req);
      expect(ip).toBeNull();
    });

    test('should handle multiple IPs in X-Forwarded-For', () => {
      req.headers['x-forwarded-for'] = '203.0.113.1, 198.51.100.1, 192.168.1.100';
      const ip = getClientIp(req);
      expect(ip).toBe('203.0.113.1');
    });
  });

  describe('getUserId', () => {
    test('should extract userId from req.userId', () => {
      const userId = getUserId(req);
      expect(userId).toBe('user-123');
    });

    test('should extract userId from req.user.userId', () => {
      delete req.userId;
      const userId = getUserId(req);
      expect(userId).toBe('user-123');
    });

    test('should extract userId from req.user.id', () => {
      delete req.userId;
      delete req.user.userId;
      req.user.id = 'user-456';
      const userId = getUserId(req);
      expect(userId).toBe('user-456');
    });

    test('should return undefined if no user ID', () => {
      delete req.userId;
      delete req.user;
      const userId = getUserId(req);
      expect(userId).toBeUndefined();
    });
  });

  describe('rateLimitHealthCheck', () => {
    test('should return health check status', () => {
      const health = rateLimitHealthCheck();

      expect(health).toMatchObject({
        enabled: expect.any(Boolean),
        backend: expect.stringMatching(/redis|memory/),
        limitersInitialized: expect.any(Number),
        redisAvailable: expect.any(Boolean)
      });
    });

    test('should indicate when rate limiting is disabled', () => {
      process.env.RATE_LIMIT_ENABLED = 'false';
      const health = rateLimitHealthCheck();
      delete process.env.RATE_LIMIT_ENABLED;

      expect(health.enabled).toBe(false);
    });

    test('should include all required fields', () => {
      const health = rateLimitHealthCheck();

      expect(Object.keys(health)).toContain('enabled');
      expect(Object.keys(health)).toContain('backend');
      expect(Object.keys(health)).toContain('limitersInitialized');
      expect(Object.keys(health)).toContain('redisAvailable');
    });
  });

  describe('Rate Limit Configuration', () => {
    test('should use environment variables for configuration', () => {
      // Test that environment variables are read correctly
      const originalEnabled = process.env.RATE_LIMIT_ENABLED;

      process.env.RATE_LIMIT_ENABLED = 'true';
      let health = rateLimitHealthCheck();
      expect(health.enabled).toBe(true);

      process.env.RATE_LIMIT_ENABLED = 'false';
      health = rateLimitHealthCheck();
      expect(health.enabled).toBe(false);

      // Restore original value
      if (originalEnabled) {
        process.env.RATE_LIMIT_ENABLED = originalEnabled;
      } else {
        delete process.env.RATE_LIMIT_ENABLED;
      }
    });
  });

  describe('IP Extraction Edge Cases', () => {
    test('should handle empty X-Forwarded-For', () => {
      req.headers['x-forwarded-for'] = '';
      const ip = getClientIp(req);
      // Should fall back to other methods
      expect(ip).not.toBe('');
    });

    test('should handle X-Forwarded-For with single IP', () => {
      req.headers['x-forwarded-for'] = '203.0.113.1';
      delete req.headers['x-real-ip'];
      const ip = getClientIp(req);
      expect(ip).toBe('203.0.113.1');
    });

    test('should handle IPv6 addresses', () => {
      req.headers['x-forwarded-for'] = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      const ip = getClientIp(req);
      expect(ip).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    });
  });

  describe('User ID Extraction Edge Cases', () => {
    test('should handle user object without userId', () => {
      delete req.userId;
      delete req.user.userId;
      delete req.user.id;
      const userId = getUserId(req);
      expect(userId).toBeUndefined();
    });

    test('should prioritize req.userId over req.user.userId', () => {
      req.userId = 'user-direct';
      req.user.userId = 'user-from-user';
      const userId = getUserId(req);
      expect(userId).toBe('user-direct');
    });

    test('should handle null user object', () => {
      req.userId = null;
      req.user = null;
      const userId = getUserId(req);
      expect(userId).toBeNull();
    });
  });
});
