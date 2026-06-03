'use strict';

/**
 * CORS Integration Tests
 *
 * Comprehensive tests for CORS configuration to ensure proper origin validation.
 * Tests:
 * - Development mode allows localhost origins
 * - Production mode requires CORS_ALLOWLIST
 * - Disallowed origins are rejected
 * - CORS headers are properly set
 * - Credentials (cookies, auth headers) are allowed
 * - Preflight OPTIONS requests work correctly
 *
 * Prerequisites:
 * - Test database with sample data
 * - Environment-specific configuration
 */

const request = require('supertest');

// Mock the database to avoid connection issues
jest.mock('../../src/utils/db', () => ({
  query: jest.fn()
}));

describe('CORS Integration Tests', () => {
  let app;

  beforeAll(() => {
    // Load the app
    app = require('../../src/index');
  });

  describe('Development Mode (default)', () => {
    test('should allow localhost:3000 in development', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    test('should allow localhost:5173 in development', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:5173');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    test('should allow localhost:3001 in development', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3001');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3001');
    });

    test('should allow 127.0.0.1:3000 in development', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://127.0.0.1:3000');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://127.0.0.1:3000');
    });

    test('should reject unknown origins in development', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://malicious-site.com');

      // CORS should block the request - browser will handle the error
      // The server will respond with CORS error
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should allow requests without origin in development', async () => {
      const response = await request(app)
        .get('/health');
      // Don't set Origin header (simulates curl, server-to-server)

      expect(response.status).toBe(200);
    });
  });

  describe('Development Mode', () => {
    beforeAll(() => {
      process.env.NODE_ENV = 'development';
      process.env.CORS_ALLOWLIST = '';
      delete require.cache[require.resolve('../../src/index')];
      app = require('../../src/index');
    });

    test('should allow localhost:3000 in development', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    test('should allow localhost:5173 in development', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:5173');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    test('should allow localhost:3001 in development', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3001');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3001');
    });

    test('should allow 127.0.0.1:3000 in development', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://127.0.0.1:3000');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://127.0.0.1:3000');
    });

    test('should allow origins from CORS_ALLOWLIST in development', async () => {
      process.env.CORS_ALLOWLIST = 'https://staging.cyberrx.com,https://test.example.com';
      delete require.cache[require.resolve('../../src/index')];
      app = require('../../src/index');

      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://staging.cyberrx.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://staging.cyberrx.com');
    });

    test('should reject unknown origins in development', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://malicious-site.com');

      // CORS should block the request - browser will handle the error
      // The server will respond with CORS error
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should allow requests without origin in development', async () => {
      const response = await request(app)
        .get('/health');
      // Don't set Origin header (simulates curl, server-to-server)

      expect(response.status).toBe(200);
    });
  });

  describe('CORS Headers', () => {
    test('should include Access-Control-Allow-Credentials header', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    test('should include Access-Control-Allow-Methods header', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-methods']).toContain('PUT');
      expect(response.headers['access-control-allow-methods']).toContain('DELETE');
    });

    test('should include Access-Control-Allow-Headers header', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Authorization,Content-Type');

      expect(response.headers['access-control-allow-headers']).toContain('Authorization');
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
    });

    test('should include Access-Control-Max-Age header', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-max-age']).toBeDefined();
    });

    test('should include X-RateLimit headers in exposed headers', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-expose-headers']).toContain('X-RateLimit-Limit');
      expect(response.headers['access-control-expose-headers']).toContain('X-RateLimit-Remaining');
      expect(response.headers['access-control-expose-headers']).toContain('X-RateLimit-Reset');
    });
  });

  describe('Preflight OPTIONS Requests', () => {
    test('should handle OPTIONS request for allowed origin', async () => {
      const response = await request(app)
        .options('/api/risks')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    test('should reject OPTIONS request for disallowed origin', async () => {
      const response = await request(app)
        .options('/api/risks')
        .set('Origin', 'https://malicious-site.com')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should cache preflight response for 24 hours', async () => {
      const response = await request(app)
        .options('/api/risks')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.headers['access-control-max-age']).toBe('86400'); // 24 hours in seconds
    });
  });

  describe('Credential Support', () => {
    test('should allow credentials with valid origin', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    test('should support cookie-based authentication', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .set('Cookie', 'session=abc123');

      expect(response.status).toBe(200);
    });

    test('should support Authorization header', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .set('Authorization', 'Bearer token123');

      expect(response.status).toBe(200);
    });
  });

  describe('Security - Malicious Origins', () => {
    test('should reject origins with similar names to allowed origins', async () => {
      const maliciousOrigins = [
        'https://app.cyberrx.com.evil.com',
        'https://cyberrx.com.evil.com',
        'https://evil-cyberrx.com'
      ];

      for (const origin of maliciousOrigins) {
        const response = await request(app)
          .get('/health')
          .set('Origin', origin);

        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    test('should reject origins with IP addresses if not in allowlist', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://192.168.1.1:3000');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should reject null origin', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'null');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Real-World Scenarios', () => {
    test('should handle Vite dev server (localhost:5173)', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:5173');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    test('should handle React dev server (localhost:3000)', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });
  });
});
