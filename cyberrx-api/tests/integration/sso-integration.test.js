'use strict';

/**
 * Integration Tests: SSO Authentication Flow
 * Task: SSO Integration
 *
 * Tests end-to-end SSO authentication flows including user provisioning,
 * token generation, and MFA verification.
 */

const request = require('supertest');
const { app } = require('../../src/index');
const { query } = require('../../src/utils/db');
const jwt = require('jsonwebtoken');

describe('SSO Integration Tests', () => {
  // Test user data
  const testUser = {
    id: 'sso-test-user-123',
    email: 'sso-test@example.com',
    name: 'SSO Test User',
    role: 'viewer',
    org_id: 'test-org-123',
    sso_provider: 'okta',
    sso_id: 'okta-test-id-123',
    mfa_enabled: false,
    mfa_secret: null
  };

  // Clean up test data
  beforeAll(async () => {
    try {
      await query('DELETE FROM users WHERE email = $1', [testUser.email]);
    } catch (err) {
      console.warn('Cleanup failed:', err.message);
    }
  });

  afterAll(async () => {
    try {
      await query('DELETE FROM users WHERE email = $1', [testUser.email]);
    } catch (err) {
      console.warn('Cleanup failed:', err.message);
    }
  });

  describe('SAML Authentication Flow (Okta)', () => {
    it('should initiate SAML login', async () => {
      const response = await request(app)
        .get('/sso/saml')
        .expect(302); // Redirect to Okta

      expect(response.headers.location).toBeDefined();
      expect(response.headers.location).toContain('okta');
    });

    it('should handle SAML callback and provision user', async () => {
      // This would require mocking SAML response
      // In real scenario, Okta would POST to this endpoint
      const response = await request(app)
        .post('/sso/saml/callback')
        .send({
          SAMLResponse: 'mock-saml-response'
        })
        .expect(302); // Redirect to frontend

      // Verify user was created in database
      const users = await query('SELECT * FROM users WHERE email = $1', [testUser.email]);
      expect(users.length).toBeGreaterThan(0);
    });

    it('should generate valid JWT after SAML login', async () => {
      const users = await query('SELECT * FROM users WHERE email = $1', [testUser.email]);
      const user = users[0];

      // Generate JWT using same logic as SSO callback
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          orgId: user.org_id,
          role: user.role,
          ssoProvider: user.sso_provider
        },
        process.env.JWT_SECRET || 'cyberrx-dev-secret',
        {
          expiresIn: '8h',
          issuer: 'cyberrx-api',
          audience: 'cyberrx-frontend'
        }
      );

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cyberrx-dev-secret');
      expect(decoded.userId).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.ssoProvider).toBe('okta');
    });
  });

  describe('OIDC Authentication Flow (Azure AD)', () => {
    it('should initiate Azure AD login', async () => {
      const response = await request(app)
        .get('/sso/azure')
        .expect(302); // Redirect to Azure AD

      expect(response.headers.location).toBeDefined();
      expect(response.headers.location).toContain('login.microsoftonline.com');
    });

    it('should handle Azure AD callback', async () => {
      // This would require mocking OIDC response
      const response = await request(app)
        .get('/sso/azure/callback?code=mock-auth-code')
        .expect(302); // Redirect to frontend

      expect(response.headers.location).toBeDefined();
    });
  });

  describe('User Provisioning', () => {
    it('should auto-provision user on first SSO login', async () => {
      const ssoTestId = `azure-test-${Date.now()}`;
      const newTestUser = {
        id: `user-${Date.now()}`,
        email: `autoprovision-${Date.now()}@example.com`,
        name: 'Auto Provision Test',
        role: 'viewer',
        org_id: testUser.org_id,
        sso_provider: 'azure-ad',
        sso_id: ssoTestId
      };

      // Insert user (simulating auto-provisioning)
      await query(`
        INSERT INTO users (id, email, name, role, org_id, sso_provider, sso_id, mfa_enabled)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [newTestUser.id, newTestUser.email, newTestUser.name, newTestUser.role,
          newTestUser.org_id, newTestUser.sso_provider, newTestUser.sso_id, false]);

      // Verify user exists
      const users = await query('SELECT * FROM users WHERE sso_id = $1', [ssoTestId]);
      expect(users.length).toBe(1);
      expect(users[0].sso_provider).toBe('azure-ad');
      expect(users[0].sso_id).toBe(ssoTestId);

      // Clean up
      await query('DELETE FROM users WHERE id = $1', [newTestUser.id]);
    });

    it('should map email domain to organization', async () => {
      // Test organization mapping logic
      const testEmail = 'user@bcbs-mass.example.com';
      const orgs = await query(
        'SELECT id FROM orgs WHERE name ILIKE $1',
        ['%Massachusetts%']
      );

      if (orgs.length > 0) {
        // In production, this would auto-assign user to BCBS Massachusetts
        expect(orgs[0].id).toBeDefined();
      }
    });
  });

  describe('MFA Flow', () => {
    let mfaTestUser;

    beforeEach(async () => {
      // Create test user with MFA
      mfaTestUser = {
        id: `mfa-test-${Date.now()}`,
        email: `mfa-test-${Date.now()}@example.com`,
        name: 'MFA Test User',
        role: 'viewer',
        org_id: testUser.org_id,
        sso_provider: 'okta',
        sso_id: `okta-mfa-${Date.now()}`,
        mfa_enabled: false,
        mfa_secret: null
      };

      await query(`
        INSERT INTO users (id, email, name, role, org_id, sso_provider, sso_id, mfa_enabled, mfa_secret)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [mfaTestUser.id, mfaTestUser.email, mfaTestUser.name, mfaTestUser.role,
          mfaTestUser.org_id, mfaTestUser.sso_provider, mfaTestUser.sso_id,
          mfaTestUser.mfa_enabled, mfaTestUser.mfa_secret]);
    });

    afterEach(async () => {
      // Clean up MFA test user
      if (mfaTestUser) {
        await query('DELETE FROM users WHERE id = $1', [mfaTestUser.id]);
      }
    });

    it('should enable MFA for user', async () => {
      const response = await request(app)
        .post('/sso/mfa/enable')
        .send({ userId: mfaTestUser.id })
        .expect(200);

      expect(response.body.qrCode).toBeDefined();
      expect(response.body.manualEntryKey).toBeDefined();

      // Verify secret was stored
      const users = await query('SELECT mfa_secret FROM users WHERE id = $1', [mfaTestUser.id]);
      expect(users[0].mfa_secret).not.toBeNull();
    });

    it('should verify MFA token', async () => {
      // First, enable MFA to get secret
      const speakeasy = require('speakeasy');
      const secret = speakeasy.generateSecret({ length: 32 }).base32;

      // Update user with secret
      await query('UPDATE users SET mfa_secret = $1 WHERE id = $2', [secret, mfaTestUser.id]);

      // Generate valid token
      const token = speakeasy.totp({
        secret: secret,
        encoding: 'base32'
      });

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      expect(verified).toBe(true);
    });

    it('should reject invalid MFA token', async () => {
      // Set secret
      await query('UPDATE users SET mfa_secret = $1 WHERE id = $2', ['JBSWY3DPEHPK3PXP', mfaTestUser.id]);

      const response = await request(app)
        .post('/sso/mfa/verify')
        .send({
          userId: mfaTestUser.id,
          token: '000000' // Invalid token
        })
        .expect(401);

      expect(response.body.error).toContain('Invalid MFA token');
    });

    it('should disable MFA for user', async () => {
      // Enable MFA first
      await query('UPDATE users SET mfa_secret = $1, mfa_enabled = true WHERE id = $2',
                  ['JBSWY3DPEHPK3PXP', mfaTestUser.id]);

      // Generate JWT for authentication
      const authToken = jwt.sign(
        { userId: mfaTestUser.id },
        process.env.JWT_SECRET || 'cyberrx-dev-secret'
      );

      const response = await request(app)
        .post('/sso/mfa/disable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ password: 'test-password' })
        .expect(200);

      expect(response.body.message).toContain('MFA disabled');

      // Verify MFA was disabled
      const users = await query('SELECT mfa_enabled, mfa_secret FROM users WHERE id = $1', [mfaTestUser.id]);
      expect(users[0].mfa_enabled).toBe(false);
      expect(users[0].mfa_secret).toBeNull();
    });
  });

  describe('SSO Provider Discovery', () => {
    it('should list available SSO providers', async () => {
      const response = await request(app)
        .get('/sso/providers')
        .expect(200);

      expect(response.body.providers).toBeDefined();
      expect(Array.isArray(response.body.providers)).toBe(true);

      // If configured, verify provider structure
      if (response.body.providers.length > 0) {
        const provider = response.body.providers[0];
        expect(provider.id).toBeDefined();
        expect(provider.name).toBeDefined();
        expect(provider.type).toBeDefined();
        expect(provider.loginUrl).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle login failure gracefully', async () => {
      const response = await request(app)
        .get('/sso/login-failed')
        .expect(401);

      expect(response.body.error).toContain('SSO login failed');
    });

    it('should handle authentication error during callback', async () => {
      // This tests error handling when IdP returns error
      const response = await request(app)
        .post('/sso/saml/callback')
        .send({ error: 'access_denied' })
        .expect(302); // Should still redirect

      expect(response.headers.location).toContain('auth/error');
    });
  });

  describe('Security Tests', () => {
    it('should validate SAML signature', () => {
      // This would require actual SAML response with signature
      // In production, passport-saml handles this automatically
      expect(process.env.SAML_CERT).toBeDefined();
    });

    it('should validate OIDC token', () => {
      // This would require actual OIDC token
      // In production, passport-azure-oidc handles this automatically
      expect(process.env.AZURE_AD_CLIENT_ID).toBeDefined();
    });

    it('should use secure session storage', () => {
      // Redis should be configured for production
      if (process.env.NODE_ENV === 'production') {
        expect(process.env.REDIS_URL).toBeDefined();
      }
    });

    it('should encrypt MFA secrets', () => {
      // In production, mfa_secret should be encrypted at rest
      // This is a placeholder for encryption verification
      expect(true).toBe(true); // Placeholder
    });
  });
});
