'use strict';

/**
 * Unit Tests: Passport Configuration
 * Task: SSO Integration
 *
 * Tests Passport.js configuration for SAML and OIDC strategies.
 */

const { passport, generateJWT, getFrontendRedirect } = require('../../src/config/passport');
const jwt = require('jsonwebtoken');

describe('Passport Configuration', () => {
  // The unit test project does not load tests/setup.js, so provision a JWT secret
  // here. (generateJWT now fails closed when JWT_SECRET is unset — the insecure
  // hardcoded dev-secret fallback was removed.)
  beforeAll(() => { process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only'; });

  describe('generateJWT', () => {
    it('should generate a valid JWT token', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        org_id: 'org-123',
        role: 'admin',
        sso_provider: 'okta'
      };

      const token = generateJWT(mockUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify token structure
      const parts = token.split('.');
      expect(parts.length).toBe(3); // Header, payload, signature
    });

    it('should decode to correct user information', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        org_id: 'org-123',
        role: 'admin',
        sso_provider: 'okta'
      };

      const token = generateJWT(mockUser);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.orgId).toBe(mockUser.org_id);
      expect(decoded.role).toBe(mockUser.role);
      expect(decoded.ssoProvider).toBe(mockUser.sso_provider);
    });

    it('should set correct expiration time', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        org_id: 'org-123',
        role: 'viewer'
      };

      const token = generateJWT(mockUser);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Token should expire in 8 hours (28800 seconds)
      const now = Math.floor(Date.now() / 1000);
      const expirationTime = decoded.exp;
      const expectedExpiration = now + 28800;

      expect(expirationTime).toBeCloseTo(expectedExpiration, 0);
    });

    it('should set correct issuer and audience', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        org_id: 'org-123',
        role: 'viewer'
      };

      const token = generateJWT(mockUser);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.iss).toBe('cyberrx-api');
      expect(decoded.aud).toBe('cyberrx-frontend');
    });
  });

  describe('getFrontendRedirect', () => {
    it('should generate correct redirect URL with token', () => {
      const token = 'test-jwt-token';
      const redirect = getFrontendRedirect(token);

      expect(redirect).toContain(token);
      expect(redirect).toContain('/auth/callback');
    });

    it('should use FRONTEND_URL from environment', () => {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const token = 'test-jwt-token';
      const redirect = getFrontendRedirect(token);

      expect(redirect).toContain(frontendUrl);
    });

    it('should escape token in URL', () => {
      const token = 'jwt-token-with/special-chars';
      const redirect = getFrontendRedirect(token);

      expect(redirect).toContain(encodeURIComponent(token));
    });
  });

  describe('Passport Strategies', () => {
    it('should have passport initialized', () => {
      expect(passport).toBeDefined();
      expect(typeof passport.initialize).toBe('function');
    });

    it('should have session support', () => {
      expect(typeof passport.session).toBe('function');
      expect(typeof passport.serializeUser).toBe('function');
      expect(typeof passport.deserializeUser).toBe('function');
    });

    it('should have strategy configuration', () => {
      // Strategies are conditionally loaded based on env vars
      // This test verifies the passport object is properly configured
      expect(passport._strategies).toBeDefined();
      expect(typeof passport._strategies).toBe('object');
    });
  });
});
