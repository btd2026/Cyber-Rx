'use strict';

/**
 * Passport Configuration
 * Task: SSO Integration
 *
 * Configures Passport.js for SAML (Okta) and OIDC (Azure AD) authentication.
 * Supports enterprise SSO with automatic user provisioning and MFA.
 */

const passport = require('passport');
const { Strategy: SamlStrategy } = require('passport-saml');
const { OIDCStrategy } = require('passport-azure-oidc');
const { query } = require('../utils/db');

/**
 * ============================================================================
 * USER SERIALIZATION/DESERIALIZATION
 * ============================================================================
 */

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const users = await query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, users[0] || null);
  } catch (err) {
    done(err, null);
  }
});

/**
 * ============================================================================
 * SAML STRATEGY (Okta)
 * ============================================================================
 *
 * Environment variables required:
 * - SAML_ENTRY_POINT: Okta SSO URL (e.g., https://dev-123456.okta.com/app.dev123456/sso/saml)
 * - SAML_ISSUER: Okta issuer URI (e.g., https://dev-123456.okta.com)
 * - SAML_CERT: Okta X.509 certificate (PEM format)
 * - SAML_CALLBACK_URL: Callback URL (e.g., https://api.cyberrx.com/sso/saml/callback)
 */

if (process.env.SAML_ENTRY_POINT && process.env.SAML_ISSUER && process.env.SAML_CERT) {
  passport.use(new SamlStrategy({
    entryPoint: process.env.SAML_ENTRY_POINT,
    issuer: process.env.SAML_ISSUER,
    cert: process.env.SAML_CERT,
    callbackUrl: process.env.SAML_CALLBACK_URL || 'http://localhost:3001/sso/saml/callback',
    identifierFormat: null, // Let Okta determine format
    wantAssertionsSigned: true,
    authnContext: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
    acceptedClockSkewMs: 300000, // 5 minutes skew tolerance
    passReqToCallback: true
  }, async (req, profile, done) => {
    try {
      // Extract user attributes from SAML assertion
      const email = profile.nameID || profile.email;
      const firstName = profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] || profile.firstName;
      const lastName = profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'] || profile.lastName;
      const samlId = profile.nameID; // This is the unique SAML identifier
      const samlIssuer = profile.issuer;

      console.log('SAML Profile received:', {
        email,
        samlId,
        samlIssuer,
        attributes: Object.keys(profile)
      });

      // Find existing user by SSO ID or email
      let users = await query(
        'SELECT * FROM users WHERE sso_id = $1 OR email = $2',
        [samlId, email]
      );
      let user = users[0];

      if (!user) {
        // Auto-provision new user for SSO login
        // Determine organization from SAML assertion or use default
        const orgAttribute = profile['http://schemas.xmlsoap.org/claims/Group'] ||
                             profile['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups'];
        let orgId = process.env.DEFAULT_SSO_ORG_ID || 'default-org';

        // Try to find org by domain from email
        if (email && email.includes('@')) {
          const emailDomain = email.split('@')[1];
          const orgs = await query(
            'SELECT id FROM orgs WHERE setup_json->>\'emailDomain\' = $1 OR name ILIKE $2',
            [emailDomain, `%${emailDomain.split('.')[0]}%`]
          );
          if (orgs.length > 0) {
            orgId = orgs[0].id;
          }
        }

        const newUserId = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const userName = `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0];

        await query(`
          INSERT INTO users (id, email, name, role, org_id, sso_provider, sso_id, mfa_enabled, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          RETURNING *
        `, [newUserId, email, userName, 'viewer', orgId, 'okta', samlId, false]);

        users = await query('SELECT * FROM users WHERE id = $1', [newUserId]);
        user = users[0];

        console.log('Auto-provisioned new user from SAML:', {
          userId: user.id,
          email: user.email,
          orgId: user.org_id,
          ssoProvider: user.sso_provider
        });
      } else if (!user.sso_id || !user.sso_provider) {
        // Update existing user with SSO info
        await query(`
          UPDATE users
          SET sso_provider = $1, sso_id = $2
          WHERE id = $3
        `, ['okta', samlId, user.id]);

        user.sso_provider = 'okta';
        user.sso_id = samlId;

        console.log('Updated existing user with SSO info:', {
          userId: user.id,
          email: user.email,
          ssoProvider: user.sso_provider
        });
      }

      return done(null, user);
    } catch (err) {
      console.error('SAML authentication error:', err);
      return done(err, null);
    }
  }));

  console.log('SAML Strategy configured for Okta');
} else {
  console.warn('SAML Strategy not configured - missing SAML_ENTRY_POINT, SAML_ISSUER, or SAML_CERT');
}

/**
 * ============================================================================
 * OIDC STRATEGY (Azure AD)
 * ============================================================================
 *
 * Environment variables required:
 * - AZURE_AD_CLIENT_ID: Azure AD application client ID
 * - AZURE_AD_CLIENT_SECRET: Azure AD application client secret
 * - AZURE_AD_TENANT_ID: Azure AD tenant ID (e.g., contoso.onmicrosoft.com or tenant GUID)
 * - AZURE_AD_CALLBACK_URL: Callback URL (e.g., https://api.cyberrx.com/sso/azure/callback)
 */

if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID) {
  const azureAdConfig = {
    identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0/.well-known/openid-configuration`,
    clientID: process.env.AZURE_AD_CLIENT_ID,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
    callbackURL: process.env.AZURE_AD_CALLBACK_URL || 'http://localhost:3001/sso/azure/callback',
    scope: ['email', 'profile', 'openid'],
    responseType: 'code',
    responseMode: 'query',
    allowHttpForRedirectUrl: process.env.NODE_ENV === 'development',
    validateIssuer: true,
    passReqToCallback: true
  };

  passport.use(new OIDCStrategy(azureAdConfig, async (req, iss, sub, profile, accessToken, refreshToken, done) => {
    try {
      // Extract user attributes from Azure AD profile
      const email = profile._json.email || profile.emails ? profile.emails[0].value : null;
      const firstName = profile._json.given_name || profile.name.givenName;
      const lastName = profile._json.family_name || profile.name.familyName;
      const azureAdId = profile.oid; // Azure AD object ID (unique)
      const tenantId = profile.tid; // Azure AD tenant ID

      console.log('Azure AD Profile received:', {
        email,
        azureAdId,
        tenantId,
        attributes: Object.keys(profile)
      });

      if (!email) {
        return done(new Error('Email not found in Azure AD profile'), null);
      }

      // Find existing user by SSO ID or email
      let users = await query(
        'SELECT * FROM users WHERE sso_id = $1 OR email = $2',
        [azureAdId, email]
      );
      let user = users[0];

      if (!user) {
        // Auto-provision new user for SSO login
        let orgId = process.env.DEFAULT_SSO_ORG_ID || 'default-org';

        // Try to find org by domain from email
        if (email && email.includes('@')) {
          const emailDomain = email.split('@')[1];
          const orgs = await query(
            'SELECT id FROM orgs WHERE setup_json->>\'emailDomain\' = $1 OR name ILIKE $2',
            [emailDomain, `%${emailDomain.split('.')[0]}%`]
          );
          if (orgs.length > 0) {
            orgId = orgs[0].id;
          }
        }

        const newUserId = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const userName = `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0];

        await query(`
          INSERT INTO users (id, email, name, role, org_id, sso_provider, sso_id, mfa_enabled, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          RETURNING *
        `, [newUserId, email, userName, 'viewer', orgId, 'azure-ad', azureAdId, false]);

        users = await query('SELECT * FROM users WHERE id = $1', [newUserId]);
        user = users[0];

        console.log('Auto-provisioned new user from Azure AD:', {
          userId: user.id,
          email: user.email,
          orgId: user.org_id,
          ssoProvider: user.sso_provider
        });
      } else if (!user.sso_id || !user.sso_provider) {
        // Update existing user with SSO info
        await query(`
          UPDATE users
          SET sso_provider = $1, sso_id = $2
          WHERE id = $3
        `, ['azure-ad', azureAdId, user.id]);

        user.sso_provider = 'azure-ad';
        user.sso_id = azureAdId;

        console.log('Updated existing user with Azure AD info:', {
          userId: user.id,
          email: user.email,
          ssoProvider: user.sso_provider
        });
      }

      return done(null, user);
    } catch (err) {
      console.error('Azure AD authentication error:', err);
      return done(err, null);
    }
  }));

  console.log('OIDC Strategy configured for Azure AD');
} else {
  console.warn('OIDC Strategy not configured - missing AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, or AZURE_AD_TENANT_ID');
}

/**
 * ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================
 */

/**
 * Generate JWT token for authenticated user
 */
function generateJWT(user) {
  const jwt = require('jsonwebtoken');

  return jwt.sign(
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
}

/**
 * Get frontend redirect URL with token
 */
function getFrontendRedirect(token) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${frontendUrl}/auth/callback?token=${token}`;
}

module.exports = {
  passport,
  generateJWT,
  getFrontendRedirect
};
