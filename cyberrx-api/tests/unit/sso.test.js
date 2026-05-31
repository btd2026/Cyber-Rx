'use strict';

/**
 * Unit Tests: SSO Routes
 * Task: SSO Integration
 *
 * Tests SSO route handlers for SAML, OIDC, and MFA functionality.
 */

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const ssoRoutes = require('../../src/routes/sso');

// Mock dependencies
jest.mock('../../src/config/passport');
jest.mock('../../src/utils/db');
jest.mock('qrcode');
jest.mock('speakeasy');

describe('SSO Routes', () => {
  let app;

  beforeEach(() => {
    // Create Express app with middleware
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false
    }));
    app.use('/sso', ssoRoutes);

    // Clear mocks
    jest.clearAllMocks();
  });

  describe('GET /sso/providers', () => {
    it('should return available SSO providers', async () => {
      // Mock environment variables
      process.env.SAML_ENTRY_POINT = 'https://okta.test/saml';
      process.env.SAML_ISSUER = 'https://okta.test';
      process.env.SAML_CERT = 'test-cert';
      process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
      process.env.AZURE_AD_CLIENT_SECRET = 'test-secret';
      process.env.AZURE_AD_TENANT_ID = 'test-tenant';

      const response = await request(app)
        .get('/sso/providers')
        .expect(200);

      expect(response.body.providers).toBeDefined();
      expect(Array.isArray(response.body.providers)).toBe(true);
      expect(response.body.providers.length).toBeGreaterThan(0);

      // Check Okta provider
      const oktaProvider = response.body.providers.find(p => p.id === 'okta');
      expect(oktaProvider).toBeDefined();
      expect(oktaProvider.type).toBe('saml');

      // Check Azure AD provider
      const azureProvider = response.body.providers.find(p => p.id === 'azure-ad');
      expect(azureProvider).toBeDefined();
      expect(azureProvider.type).toBe('oidc');
    });

    it('should return empty array when no providers configured', async () => {
      // Clear environment variables
      delete process.env.SAML_ENTRY_POINT;
      delete process.env.AZURE_AD_CLIENT_ID;

      const response = await request(app)
        .get('/sso/providers')
        .expect(200);

      expect(response.body.providers).toEqual([]);
    });
  });

  describe('POST /sso/mfa/enable', () => {
    it('should enable MFA for authenticated user', async () => {
      const speakeasy = require('speakeasy');
      const QRCode = require('qrcode');

      // Mock speakeasy
      speakeasy.generateSecret.mockReturnValue({
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/test'
      });

      // Mock QRCode
      QRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockqr');

      const response = await request(app)
        .post('/sso/mfa/enable')
        .send({ userId: 'user-123' })
        .expect(200);

      expect(response.body.qrCode).toBeDefined();
      expect(response.body.manualEntryKey).toBeDefined();
      expect(response.body.message).toContain('MFA enabled');
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .post('/sso/mfa/enable')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('User ID required');
    });

    it('should return 404 if user not found', async () => {
      const { query } = require('../../src/utils/db');
      query.mockResolvedValue([]);

      const response = await request(app)
        .post('/sso/mfa/enable')
        .send({ userId: 'non-existent-user' })
        .expect(404);

      expect(response.body.error).toContain('User not found');
    });
  });

  describe('POST /sso/mfa/verify', () => {
    it('should verify valid MFA token', async () => {
      const speakeasy = require('speakeasy');

      // Mock speakeasy verification
      speakeasy.totp.verify.mockReturnValue(true);

      const { query } = require('../../src/utils/db');
      query.mockResolvedValue([{
        id: 'user-123',
        email: 'test@example.com',
        mfa_secret: 'JBSWY3DPEHPK3PXP'
      }]);

      const response = await request(app)
        .post('/sso/mfa/verify')
        .send({
          userId: 'user-123',
          token: '123456'
        })
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.user.mfaEnabled).toBe(true);
    });

    it('should reject invalid MFA token', async () => {
      const speakeasy = require('speakeasy');

      // Mock speakeasy verification to fail
      speakeasy.totp.verify.mockReturnValue(false);

      const { query } = require('../../src/utils/db');
      query.mockResolvedValue([{
        id: 'user-123',
        mfa_secret: 'JBSWY3DPEHPK3PXP'
      }]);

      const response = await request(app)
        .post('/sso/mfa/verify')
        .send({
          userId: 'user-123',
          token: '000000'
        })
        .expect(401);

      expect(response.body.error).toContain('Invalid MFA token');
    });

    it('should return 400 if missing required fields', async () => {
      const response = await request(app)
        .post('/sso/mfa/verify')
        .send({
          userId: 'user-123'
          // Missing token
        })
        .expect(400);

      expect(response.body.error).toContain('token required');
    });

    it('should return 404 if user not found', async () => {
      const { query } = require('../../src/utils/db');
      query.mockResolvedValue([]);

      const response = await request(app)
        .post('/sso/mfa/verify')
        .send({
          userId: 'non-existent-user',
          token: '123456'
        })
        .expect(404);

      expect(response.body.error).toContain('User not found');
    });

    it('should return 400 if MFA not enabled for user', async () => {
      const { query } = require('../../src/utils/db');
      query.mockResolvedValue([{
        id: 'user-123',
        mfa_secret: null
      }]);

      const response = await request(app)
        .post('/sso/mfa/verify')
        .send({
          userId: 'user-123',
          token: '123456'
        })
        .expect(400);

      expect(response.body.error).toContain('MFA not enabled');
    });
  });

  describe('GET /sso/mfa/qrcode', () => {
    it('should return QR code for authenticated user', async () => {
      const QRCode = require('qrcode');
      const jwt = require('jsonwebtoken');

      // Mock JWT
      jwt.verify.mockReturnValue({ userId: 'user-123' });

      // Mock database query
      const { query } = require('../../src/utils/db');
      query.mockResolvedValue([{
        id: 'user-123',
        email: 'test@example.com',
        mfa_secret: 'JBSWY3DPEHPK3PXP'
      }]);

      // Mock QRCode
      QRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockqr');

      const response = await request(app)
        .get('/sso/mfa/qrcode')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body.qrCode).toBeDefined();
      expect(response.body.manualEntryKey).toBeDefined();
    });

    it('should return 401 if no authorization header', async () => {
      const response = await request(app)
        .get('/sso/mfa/qrcode')
        .expect(401);

      expect(response.body.error).toContain('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      const jwt = require('jsonwebtoken');

      // Mock JWT
      jwt.verify.mockReturnValue({ userId: 'user-123' });

      // Mock database query to return empty
      const { query } = require('../../src/utils/db');
      query.mockResolvedValue([]);

      const response = await request(app)
        .get('/sso/mfa/qrcode')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(404);

      expect(response.body.error).toContain('User not found');
    });
  });

  describe('POST /sso/mfa/disable', () => {
    it('should disable MFA for authenticated user', async () => {
      const jwt = require('jsonwebtoken');
      const bcrypt = require('bcrypt');

      // Mock JWT
      jwt.verify.mockReturnValue({ userId: 'user-123' });

      // Mock database query
      const { query } = require('../../src/utils/db');
      query.mockResolvedValue([{
        id: 'user-123',
        email: 'test@example.com',
        password: '$2b$10$hashedpassword',
        sso_provider: 'local'
      }]);

      // Mock bcrypt
      bcrypt.compare.mockResolvedValue(true);

      const response = await request(app)
        .post('/sso/mfa/disable')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ password: 'current-password' })
        .expect(200);

      expect(response.body.message).toContain('MFA disabled');
    });

    it('should return 401 if no authorization header', async () => {
      const response = await request(app)
        .post('/sso/mfa/disable')
        .send({ password: 'current-password' })
        .expect(401);

      expect(response.body.error).toContain('Unauthorized');
    });

    it('should return 400 if password is missing', async () => {
      const jwt = require('jsonwebtoken');

      // Mock JWT
      jwt.verify.mockReturnValue({ userId: 'user-123' });

      const response = await request(app)
        .post('/sso/mfa/disable')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('Password required');
    });

    it('should return 401 if password is invalid', async () => {
      const jwt = require('jsonwebtoken');
      const bcrypt = require('bcrypt');

      // Mock JWT
      jwt.verify.mockReturnValue({ userId: 'user-123' });

      // Mock database query
      const { query } = require('../../src/utils/db');
      query.mockResolvedValue([{
        id: 'user-123',
        password: '$2b$10$hashedpassword',
        sso_provider: 'local'
      }]);

      // Mock bcrypt to fail
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/sso/mfa/disable')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ password: 'wrong-password' })
        .expect(401);

      expect(response.body.error).toContain('Invalid password');
    });
  });

  describe('GET /sso/login-failed', () => {
    it('should return login failed error', async () => {
      const response = await request(app)
        .get('/sso/login-failed')
        .expect(401);

      expect(response.body.error).toContain('SSO login failed');
    });
  });
});
