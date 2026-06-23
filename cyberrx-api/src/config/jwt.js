'use strict';

/**
 * Centralized JWT secret access — fails closed.
 *
 * The API must never sign or verify tokens with a hardcoded default secret. A
 * baked-in "dev secret" shipped in source means anyone reading the repo can
 * forge a token for any org and role (full tenant + privilege bypass). So a
 * missing JWT_SECRET is treated as a fatal misconfiguration, not something to
 * paper over: callers that sign/verify catch the throw and fail the request
 * (401/500) rather than trusting an attacker-known key.
 */
function requireJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const err = new Error('JWT_SECRET is not configured — refusing to sign or verify tokens with a default secret.');
    err.code = 'JWT_SECRET_MISSING';
    throw err;
  }
  return secret;
}

module.exports = { requireJwtSecret };
