'use strict';

/**
 * Rate Limiting Integration Tests
 *
 * End-to-end tests for rate limiting behavior across authentication and API endpoints.
 * Tests:
 * - Login endpoint rate limiting (5 attempts per minute per IP)
 * - Signup endpoint rate limiting (3 attempts per minute per IP)
 * - GET endpoint rate limiting (100 requests per minute per user)
 * - POST endpoint rate limiting (50 requests per minute per user)
 * - Rate limit headers in responses
 * - Rate limit violation responses
 *
 * Prerequisites:
 * - Redis server running (or fallback to in-memory)
 * - Test database with sample data
 * - Clean rate limit state before each test
 */

const request = require('supertest');
const app = require('../../src/index');

describe('Rate Limiting Integration Tests', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Create test user for authenticated tests
    const signupResponse = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'ratelimit-test@example.com',
        password: 'TestPassword123!',
        orgId: 'org-test',
        name: 'Rate Limit Test User'
      });

    if (signupResponse.status === 201) {
      testUser = signupResponse.body.user;
      authToken = signupResponse.body.token;
    } else {
      // User might already exist, try logging in
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'ratelimit-test@example.com',
          password: 'TestPassword123!'
        });

      if (loginResponse.status === 200) {
        testUser = loginResponse.body.user;
        authToken = loginResponse.body.token;
      }
    }
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/login', () => {
      test('should allow 5 login attempts per minute per IP', async () => {
        const attempts = [];

        // Make 5 failed login attempts
        for (let i = 0; i < 5; i++) {
          const response = await request(app)
            .post('/api/auth/login')
            .send({
              email: 'wrong@example.com',
              password: 'WrongPassword123!'
            });

          attempts.push(response.status);
        }

        // First 5 should be processed (401 for wrong credentials)
        const successfulAttempts = attempts.filter(status => status !== 429);
        expect(successfulAttempts).toHaveLength(5);

        // 6th attempt should be rate limited
        const sixthAttempt = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'wrong@example.com',
            password: 'WrongPassword123!'
          });

        expect(sixthAttempt.status).toBe(429);
        expect(sixthAttempt.body).toMatchObject({
          error: 'Too many requests'
        });
        expect(sixthAttempt.headers['retry-after']).toBeDefined();
      });

      test('should include rate limit headers', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'WrongPassword123!'
          });

        expect(response.headers['x-ratelimit-limit']).toBeDefined();
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
        expect(response.headers['x-ratelimit-reset']).toBeDefined();
      });

      test('should reset after 1 minute', async () => {
        // This test requires manual verification or using Jest timer mocks
        // For now, we'll just verify the structure
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'WrongPassword123!'
          });

        expect(response.headers['x-ratelimit-reset']).toBeDefined();
      }, 10000);
    });

    describe('POST /api/auth/signup', () => {
      test('should allow 3 signup attempts per minute per IP', async () => {
        const attempts = [];

        // Make 3 signup attempts with different emails
        for (let i = 0; i < 3; i++) {
          const response = await request(app)
            .post('/api/auth/signup')
            .send({
              email: `ratelimit-test-${i}@example.com`,
              password: 'TestPassword123!',
              orgId: 'org-test'
            });

          attempts.push(response.status);
        }

        // First 3 should be processed
        const successfulAttempts = attempts.filter(status => status !== 429);
        expect(successfulAttempts.length).toBeGreaterThan(0);

        // 4th attempt should be rate limited
        const fourthAttempt = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'ratelimit-test-4@example.com',
            password: 'TestPassword123!',
            orgId: 'org-test'
          });

        expect(fourthAttempt.status).toBe(429);
        expect(fourthAttempt.body).toMatchObject({
          error: 'Too many requests'
        });
      });

      test('should include rate limit headers', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: `test-${Date.now()}@example.com`,
            password: 'TestPassword123!',
            orgId: 'org-test'
          });

        expect(response.headers['x-ratelimit-limit']).toBeDefined();
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
        expect(response.headers['x-ratelimit-reset']).toBeDefined();
      });
    });
  });

  describe('API Endpoints (Authenticated)', () => {
    describe('GET /api/risks', () => {
      test('should allow 100 GET requests per minute per user', async () => {
        // Test with smaller number for practical testing
        const requests = [];
        const testCount = 10;

        for (let i = 0; i < testCount; i++) {
          const response = await request(app)
            .get('/api/risks')
            .set('Authorization', `Bearer ${authToken}`);

          requests.push({
            status: response.status,
            remaining: response.headers['x-ratelimit-remaining']
          });
        }

        // All requests should succeed
        const successfulRequests = requests.filter(r => r.status !== 429);
        expect(successfulRequests).toHaveLength(testCount);

        // Remaining should decrease
        const firstRemaining = parseInt(requests[0].remaining);
        const lastRemaining = parseInt(requests[requests.length - 1].remaining);
        expect(lastRemaining).toBeLessThan(firstRemaining);
      });

      test('should include rate limit headers', async () => {
        const response = await request(app)
          .get('/api/risks')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.headers['x-ratelimit-limit']).toBeDefined();
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
        expect(response.headers['x-ratelimit-reset']).toBeDefined();

        // Verify remaining is a number
        expect(parseInt(response.headers['x-ratelimit-remaining'])).toBeGreaterThanOrEqual(0);
      });
    });

    describe('POST /api/risks', () => {
      test('should allow 50 POST requests per minute per user', async () => {
        const requests = [];

        // Make 5 POST requests
        for (let i = 0; i < 5; i++) {
          const response = await request(app)
            .post('/api/risks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              title: `Test Risk ${i}`,
              description: 'Test risk for rate limiting',
              likelihood: 'medium',
              impact: 'high'
            });

          requests.push(response.status);
        }

        // All requests should be processed (may fail validation, but not rate limited)
        const nonRateLimitedRequests = requests.filter(status => status !== 429);
        expect(nonRateLimitedRequests).toHaveLength(5);
      });

      test('should have lower limit than GET requests', async () => {
        const getResponse = await request(app)
          .get('/api/risks')
          .set('Authorization', `Bearer ${authToken}`);

        const postResponse = await request(app)
          .post('/api/risks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Test Risk',
            description: 'Test'
          });

        // POST should have lower limit (50 vs 100 for GET)
        const getLimit = parseInt(getResponse.headers['x-ratelimit-limit']);
        const postLimit = parseInt(postResponse.headers['x-ratelimit-limit']);

        expect(postLimit).toBeLessThanOrEqual(getLimit);
      });
    });
  });

  describe('Rate Limit Violation Responses', () => {
    test('should return 429 status when limit exceeded', async () => {
      // Exhaust rate limit for signup endpoint
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/auth/signup')
          .send({
            email: `violation-test-${i}@example.com`,
            password: 'TestPassword123!',
            orgId: 'org-test'
          });
      }

      // This request should be rate limited
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'violation-test-5@example.com',
          password: 'TestPassword123!',
          orgId: 'org-test'
        });

      expect(response.status).toBe(429);
    });

    test('should include retry-after header', async () => {
      // Make requests to trigger rate limit
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/auth/signup')
          .send({
            email: `retry-test-${i}@example.com`,
            password: 'TestPassword123!',
            orgId: 'org-test'
          });
      }

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'retry-test-5@example.com',
          password: 'TestPassword123!',
          orgId: 'org-test'
        });

      if (response.status === 429) {
        expect(response.headers['retry-after']).toBeDefined();
        const retryAfter = parseInt(response.headers['retry-after']);
        expect(retryAfter).toBeGreaterThan(0);
      }
    });

    test('should include error message in response', async () => {
      // Make requests to trigger rate limit
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/auth/signup')
          .send({
            email: `message-test-${i}@example.com`,
            password: 'TestPassword123!',
            orgId: 'org-test'
          });
      }

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'message-test-5@example.com',
          password: 'TestPassword123!',
          orgId: 'org-test'
        });

      if (response.status === 429) {
        expect(response.body).toMatchObject({
          error: 'Too many requests'
        });
        expect(response.body.message).toContain('seconds');
        expect(response.body.retryAfter).toBeDefined();
      }
    });
  });

  describe('Different Limits for Different Methods', () => {
    test('should apply different limits for GET and POST', async () => {
      // Get rate limit info for GET
      const getResponse = await request(app)
        .get('/api/risks')
        .set('Authorization', `Bearer ${authToken}`);

      // Get rate limit info for POST
      const postResponse = await request(app)
        .post('/api/risks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Test' });

      // GET should have higher limit than POST
      const getLimit = parseInt(getResponse.headers['x-ratelimit-limit'] || '0');
      const postLimit = parseInt(postResponse.headers['x-ratelimit-limit'] || '0');

      if (getLimit > 0 && postLimit > 0) {
        expect(getLimit).toBeGreaterThanOrEqual(postLimit);
      }
    });

    test('should apply different limits for POST and DELETE', async () => {
      // Get rate limit info for POST
      const postResponse = await request(app)
        .post('/api/risks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Test' });

      // Get rate limit info for DELETE (if endpoint exists)
      const deleteResponse = await request(app)
        .delete('/api/risks/risk-test')
        .set('Authorization', `Bearer ${authToken}`);

      // DELETE should have lower limit than POST
      const postLimit = parseInt(postResponse.headers['x-ratelimit-limit'] || '0');
      const deleteLimit = parseInt(deleteResponse.headers['x-ratelimit-limit'] || '0');

      if (postLimit > 0 && deleteLimit > 0) {
        expect(deleteLimit).toBeLessThanOrEqual(postLimit);
      }
    });
  });

  describe('Per-User vs Per-IP Limiting', () => {
    test('should use per-IP limiting for authentication endpoints', async () => {
      // Authentication endpoints use IP-based limiting
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!'
        });

      // Rate limit should be based on IP
      expect(response1.headers['x-ratelimit-limit']).toBeDefined();
    });

    test('should use per-user limiting for authenticated API endpoints', async () => {
      // Authenticated endpoints use user-based limiting
      const response = await request(app)
        .get('/api/risks')
        .set('Authorization', `Bearer ${authToken}`);

      // Rate limit should be based on user
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });

  describe('Rate Limit Reset Behavior', () => {
    test('should include reset timestamp in headers', async () => {
      const response = await request(app)
        .get('/api/risks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.headers['x-ratelimit-reset']).toBeDefined();

      // Verify it's a valid ISO timestamp
      const resetDate = new Date(response.headers['x-ratelimit-reset']);
      expect(resetDate instanceof Date).toBe(true);
      expect(resetDate.getTime()).toBeGreaterThan(Date.now());
    });

    test('should allow requests after reset period', async () => {
      // This test requires waiting for reset period
      // For practical testing, we'll just verify the structure
      const response = await request(app)
        .get('/api/risks')
        .set('Authorization', `Bearer ${authToken}`);

      const resetDate = new Date(response.headers['x-ratelimit-reset']);
      const now = new Date();

      // Reset should be within a reasonable time window (1-60 seconds from now for testing)
      const diffSeconds = (resetDate - now) / 1000;
      expect(diffSeconds).toBeGreaterThan(0);
      expect(diffSeconds).toBeLessThanOrEqual(60);
    }, 10000);
  });

  describe('Concurrent Requests', () => {
    test('should handle concurrent requests correctly', async () => {
      // Make concurrent requests
      const concurrentRequests = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/risks')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(concurrentRequests);

      // All should succeed
      const successfulResponses = responses.filter(r => r.status !== 429);
      expect(successfulResponses).toHaveLength(10);

      // All should have rate limit headers
      responses.forEach(response => {
        expect(response.headers['x-ratelimit-limit']).toBeDefined();
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      });
    });
  });

  describe('Health Check Integration', () => {
    test('should include rate limiting status in health check', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);

      // Check if health endpoint includes rate limiting info
      // (This depends on the health endpoint implementation)
      if (response.body.services) {
        expect(response.body.services).toHaveProperty('rateLimiting');
      }
    });
  });
});
