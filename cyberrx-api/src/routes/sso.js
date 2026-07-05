'use strict';

/**
 * SSO Routes
 * Task: SSO Integration
 *
 * Provides SAML (Okta) and OIDC (Azure AD) authentication endpoints.
 * Integrates with Passport.js for SSO authentication and user provisioning.
 * Supports MFA enablement and verification.
 *
 * Routes:
 * - GET  /sso/saml          - Initiate SAML login (Okta)
 * - POST /sso/saml/callback - SAML callback endpoint
 * - GET  /sso/azure         - Initiate OIDC login (Azure AD)
 * - GET  /sso/azure/callback- OIDC callback endpoint
 * - POST /sso/mfa/enable    - Enable MFA for current user
 * - POST /sso/mfa/verify    - Verify MFA token during login
 * - GET  /sso/mfa/qrcode    - Get MFA QR code for setup
 */

const express = require('express');
const router = express.Router();
const { passport, generateJWT, getFrontendRedirect } = require('../config/passport');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { query } = require('../utils/db');
const { authenticateJWT } = require('../middleware/auth');

/**
 * ============================================================================
 * SAML ROUTES (Okta)
 * ============================================================================
 */

/**
 * GET /sso/saml
 * Initiate SAML SSO login flow with Okta
 *
 * Query params:
 * - redirect: Optional frontend URL to redirect after login
 *
 * Redirects user to Okta login page
 */
router.get('/saml', (req, res, next) => {
  const redirectUrl = req.query.redirect;
  if (redirectUrl) {
    req.session = req.session || {};
    req.session.ssoRedirect = redirectUrl;
  }

  passport.authenticate('saml', {
    successRedirect: '/sso/saml/callback',
    failureRedirect: '/sso/login-failed'
  })(req, res, next);
});

/**
 * POST /sso/saml/callback
 * SAML callback endpoint for Okta response
 *
 * Receives SAML assertion from Okta, authenticates user,
 * generates JWT token, and redirects to frontend
 */
router.post('/saml/callback',
  passport.authenticate('saml', { failureRedirect: '/sso/login-failed' }),
  async (req, res) => {
    try {
      const user = req.user;

      // Log successful SSO authentication
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        event: 'sso_login_success',
        provider: 'okta',
        userId: user.id,
        email: user.email,
        orgId: user.org_id
      }));

      // Check if MFA is enabled for this user
      if (user.mfa_enabled) {
        // Store user session for MFA verification
        req.session = req.session || {};
        req.session.mfaPendingUser = user.id;
        req.session.mfaProvider = 'okta';

        // Redirect to MFA verification page
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/mfa?required=true`);
      }

      // Generate JWT token
      const token = generateJWT(user);

      // Get frontend redirect URL
      const redirectUrl = req.session?.ssoRedirect || getFrontendRedirect(token);
      delete req.session.ssoRedirect;

      // Redirect to frontend with token
      return res.redirect(redirectUrl);
    } catch (err) {
      console.error('SAML callback error:', err);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/error?message=saml_callback_failed`);
    }
  }
);

/**
 * GET /sso/metadata
 * SAML metadata endpoint for Okta configuration
 *
 * Returns service provider metadata XML
 */
router.get('/metadata', (req, res) => {
  const strategies = passport._strategies;

  if (!strategies || !strategies.saml) {
    return res.status(404).json({ error: 'SAML strategy not configured' });
  }

  const samlStrategy = strategies.saml;
  const metadata = samlStrategy.generateServiceProviderMetadata(
    process.env.SAML_CERT || null // Don't include cert in metadata
  );

  res.set('Content-Type', 'application/xml');
  res.send(metadata);
});

/**
 * ============================================================================
 * OIDC ROUTES (Azure AD)
 * ============================================================================
 */

/**
 * GET /sso/azure
 * Initiate OIDC SSO login flow with Azure AD
 *
 * Query params:
 * - redirect: Optional frontend URL to redirect after login
 *
 * Redirects user to Azure AD login page
 */
router.get('/azure', (req, res, next) => {
  const redirectUrl = req.query.redirect;
  if (redirectUrl) {
    req.session = req.session || {};
    req.session.ssoRedirect = redirectUrl;
  }

  passport.authenticate('azure-oidc', {
    successRedirect: '/sso/azure/callback',
    failureRedirect: '/sso/login-failed'
  })(req, res, next);
});

/**
 * GET /sso/azure/callback
 * OIDC callback endpoint for Azure AD response
 *
 * Receives authorization code from Azure AD, exchanges for tokens,
 * authenticates user, generates JWT, and redirects to frontend
 */
router.get('/azure/callback',
  passport.authenticate('azure-oidc', { failureRedirect: '/sso/login-failed' }),
  async (req, res) => {
    try {
      const user = req.user;

      // Log successful SSO authentication
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        event: 'sso_login_success',
        provider: 'azure-ad',
        userId: user.id,
        email: user.email,
        orgId: user.org_id
      }));

      // Check if MFA is enabled for this user
      if (user.mfa_enabled) {
        // Store user session for MFA verification
        req.session = req.session || {};
        req.session.mfaPendingUser = user.id;
        req.session.mfaProvider = 'azure-ad';

        // Redirect to MFA verification page
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/mfa?required=true`);
      }

      // Generate JWT token
      const token = generateJWT(user);

      // Get frontend redirect URL
      const redirectUrl = req.session?.ssoRedirect || getFrontendRedirect(token);
      delete req.session.ssoRedirect;

      // Redirect to frontend with token
      return res.redirect(redirectUrl);
    } catch (err) {
      console.error('Azure AD callback error:', err);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/error?message=azure_callback_failed`);
    }
  }
);

/**
 * ============================================================================
 * MFA ROUTES
 * ============================================================================
 */

/**
 * POST /sso/mfa/enable
 * Enable MFA for the current authenticated user
 *
 * Requires JWT authentication
 *
 * Returns QR code URL for TOTP app setup
 */
router.post('/mfa/enable', authenticateJWT, async (req, res) => {
  try {
    // Use userId from JWT instead of request body
    const userId = req.userId;

    // Get user info
    const users = await query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `Nerion (${user.email})`,
      issuer: 'Nerion',
      length: 32
    });

    // Store encrypted secret in database (in production, encrypt this)
    await query(`
      UPDATE users
      SET mfa_secret = $1
      WHERE id = $2
    `, [secret.base32, user.id]);

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      event: 'mfa_enabled',
      userId: user.id,
      email: user.email
    }));

    res.json({
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32,
      message: 'MFA enabled. Scan QR code with authenticator app.'
    });
  } catch (err) {
    console.error('MFA enable error:', err);
    res.status(500).json({ error: 'Failed to enable MFA' });
  }
});

/**
 * POST /sso/mfa/verify
 * Verify MFA token during login
 *
 * Requires JWT authentication
 *
 * Body:
 * - token: 6-digit TOTP token
 *
 * Validates token and completes login flow
 */
router.post('/mfa/verify', authenticateJWT, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.userId;

    if (!token) {
      return res.status(400).json({ error: 'MFA token required' });
    }

    // Get user info
    const users = await query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.mfa_secret) {
      return res.status(400).json({ error: 'MFA not enabled for this user' });
    }

    // Verify TOTP token
    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps (60 seconds) tolerance
    });

    if (!verified) {
      console.warn(JSON.stringify({
        ts: new Date().toISOString(),
        event: 'mfa_verification_failed',
        userId: user.id,
        ip: req.ip
      }));

      return res.status(401).json({ error: 'Invalid MFA token' });
    }

    // Mark MFA as enabled and verified
    await query(`
      UPDATE users
      SET mfa_enabled = true
      WHERE id = $1
    `, [user.id]);

    // Generate JWT token
    const jwtToken = generateJWT(user);

    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      event: 'mfa_verification_success',
      userId: user.id,
      email: user.email
    }));

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: user.org_id,
        mfaEnabled: true
      }
    });
  } catch (err) {
    console.error('MFA verify error:', err);
    res.status(500).json({ error: 'Failed to verify MFA token' });
  }
});

/**
 * GET /sso/mfa/qrcode
 * Get MFA QR code for authenticated user
 *
 * Requires JWT authentication
 *
 * Returns QR code for TOTP app setup
 */
router.get('/mfa/qrcode', authenticateJWT, async (req, res) => {
  try {
    // Get user info from JWT
    const userId = req.userId;

    const users = await query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.mfa_secret) {
      return res.status(400).json({ error: 'MFA not enabled for this user' });
    }

    // Generate QR code
    const otpauth = `otpauth://totp/Nerion:${user.email}?secret=${user.mfa_secret}&issuer=Nerion`;
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    res.json({
      qrCode: qrCodeUrl,
      manualEntryKey: user.mfa_secret
    });
  } catch (err) {
    console.error('MFA QR code error:', err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

/**
 * POST /sso/mfa/disable
 * Disable MFA for authenticated user
 *
 * Requires JWT authentication
 *
 * Body:
 * - password: User's password (required for security)
 *
 * Disables MFA and removes secret
 */
router.post('/mfa/disable', authenticateJWT, async (req, res) => {
  try {
    const bcrypt = require('bcrypt');
    const { password } = req.body;
    const userId = req.userId;

    if (!password) {
      return res.status(400).json({ error: 'Password required to disable MFA' });
    }

    // Get user info
    const users = await query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify password (local accounts only)
    if (!user.sso_provider || user.sso_provider === 'local') {
      const passwordMatch = user.password === password ||
                             (await bcrypt.compare(password, user.password || ''));

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    // Disable MFA and remove secret
    await query(`
      UPDATE users
      SET mfa_enabled = false, mfa_secret = NULL
      WHERE id = $1
    `, [user.id]);

    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      event: 'mfa_disabled',
      userId: user.id,
      email: user.email
    }));

    res.json({ message: 'MFA disabled successfully' });
  } catch (err) {
    console.error('MFA disable error:', err);
    res.status(500).json({ error: 'Failed to disable MFA' });
  }
});

/**
 * ============================================================================
 * UTILITY ROUTES
 * ============================================================================
 */

/**
 * GET /sso/providers
 * Get available SSO providers
 *
 * Returns list of configured SSO providers
 */
router.get('/providers', (req, res) => {
  const providers = [];

  if (process.env.SAML_ENTRY_POINT && process.env.SAML_ISSUER && process.env.SAML_CERT) {
    providers.push({
      id: 'okta',
      name: 'Okta',
      type: 'saml',
      loginUrl: '/sso/saml'
    });
  }

  if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID) {
    providers.push({
      id: 'azure-ad',
      name: 'Azure Active Directory',
      type: 'oidc',
      loginUrl: '/sso/azure'
    });
  }

  res.json({ providers });
});

/**
 * GET /sso/login-failed
 * SSO login failure page
 *
 * Returns error page for failed SSO login
 */
router.get('/login-failed', (req, res) => {
  res.status(401).json({
    error: 'SSO login failed',
    message: 'Authentication was unsuccessful. Please try again or contact your administrator.'
  });
});

module.exports = router;
