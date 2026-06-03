'use strict';

/**
 * JWT Enforcement Test Suite
 * Task: T-300
 *
 * Verifies that all protected API endpoints require valid JWT authentication
 * and return 401 Unauthorized when no token is provided.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../src/index');

describe('T-300: JWT Enforcement', () => {
  beforeAll(() => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key';
  });

  describe('Public Endpoints (should work WITHOUT token)', () => {
    test('POST /api/auth/login - should work without token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });

      // Should not return 401 for JWT auth (auth error is expected for wrong credentials)
      expect([400, 401]).toContain(response.status);
    });

    test('GET /health - should work without token', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    });

    test('GET /sso/providers - should work without token', async () => {
      const response = await request(app)
        .get('/sso/providers');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('providers');
    });
  });

  describe('Protected Endpoints (should return 401 WITHOUT token)', () => {
    let validToken;

    beforeAll(() => {
      // Generate valid test token
      validToken = jwt.sign(
        {
          userId: 'test-user-123',
          email: 'test@example.com',
          orgId: 'test-org-123',
          role: 'admin'
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    test('GET /api/orgs/:id - should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/orgs/test-org');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    test('GET /api/risks - should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/risks');

      expect(response.status).toBe(401);
    });

    test('POST /sso/mfa/enable - should return 401 without token', async () => {
      const response = await request(app)
        .post('/sso/mfa/enable')
        .send({ userId: 'test-user' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    test('POST /sso/mfa/verify - should return 401 without token', async () => {
      const response = await request(app)
        .post('/sso/mfa/verify')
        .send({ userId: 'test-user', token: '123456' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    test('GET /sso/mfa/qrcode - should return 401 without token', async () => {
      const response = await request(app)
        .get('/sso/mfa/qrcode');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    test('POST /sso/mfa/disable - should return 401 without token', async () => {
      const response = await request(app)
        .post('/sso/mfa/disable')
        .send({ password: 'testpass' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('Valid Token Access (should work WITH valid token)', () => {
    let validToken;

    beforeAll(() => {
      validToken = jwt.sign(
        {
          userId: 'test-user-123',
          email: 'test@example.com',
          orgId: 'test-org-123',
          role: 'admin'
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    test('GET /api/orgs/:id with valid token - should not return 401', async () => {
      const response = await request(app)
        .get('/api/orgs/test-org')
        .set('Authorization', `Bearer ${validToken}`);

      // May return 404 or other errors, but NOT 401
      expect(response.status).not.toBe(401);
    });

    test('GET /api/risks with valid token - should not return 401', async () => {
      const response = await request(app)
        .get('/api/risks')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).not.toBe(401);
    });

    test('POST /sso/mfa/enable with valid token - should not return 401', async () => {
      const response = await request(app)
        .post('/sso/mfa/enable')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).not.toBe(401);
    });

    test('GET /sso/mfa/qrcode with valid token - should not return 401', async () => {
      const response = await request(app)
        .get('/sso/mfa/qrcode')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).not.toBe(401);
    });
  });

  describe('Invalid Token Handling', () => {
    test('GET /api/orgs/:id with invalid token - should return 401', async () => {
      const response = await request(app)
        .get('/api/orgs/test-org')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    test('GET /api/risks with expired token - should return 401', async () => {
      const expiredToken = jwt.sign(
        {
          userId: 'test-user-123',
          email: 'test@example.com',
          orgId: 'test-org-123',
          role: 'admin'
        },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired
      );

      const response = await request(app)
        .get('/api/risks')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    test('GET /api/assets with malformed token - should return 401', async () => {
      const response = await request(app)
        .get('/api/assets')
        .set('Authorization', 'Bearer not-even-a-jwt');

      expect(response.status).toBe(401);
    });

    test('GET /api/controls without Authorization header - should return 401', async () => {
      const response = await request(app)
        .get('/api/controls');

      expect(response.status).toBe(401);
    });

    test('GET /api/business-processes with wrong Authorization format - should return 401', async () => {
      const response = await request(app)
        .get('/api/business-processes')
        .set('Authorization', 'Basic some-credentials');

      expect(response.status).toBe(401);
    });
  });
});
