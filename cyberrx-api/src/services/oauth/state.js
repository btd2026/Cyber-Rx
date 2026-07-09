'use strict';

/**
 * oauth/state — a stateless, tamper-proof OAuth `state` parameter.
 *
 * The state carries who is connecting (org, connector, provider) plus a nonce and
 * expiry, HMAC-signed so the callback can trust it without any server-side session
 * store. This both defends against CSRF and lets the flow work across instances.
 */

const crypto = require('crypto');

function secret() {
  return process.env.OAUTH_STATE_SECRET || process.env.SESSION_SECRET || process.env.JWT_SECRET || 'nerion-oauth-dev-secret-change-me';
}

// default 10-minute validity for a consent round-trip
const DEFAULT_TTL_MS = 10 * 60 * 1000;

function sign(payload, ttlMs) {
  const body = Object.assign({}, payload, {
    exp: Date.now() + (ttlMs || DEFAULT_TTL_MS),
    nonce: crypto.randomBytes(8).toString('hex'),
  });
  const b64 = Buffer.from(JSON.stringify(body)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret()).update(b64).digest('base64url');
  return b64 + '.' + mac;
}

function verify(token) {
  if (!token || typeof token !== 'string' || token.indexOf('.') < 0) return null;
  const [b64, mac] = token.split('.');
  const expected = crypto.createHmac('sha256', secret()).update(b64).digest('base64url');
  // constant-time compare
  const a = Buffer.from(mac || ''); const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let body; try { body = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')); } catch (_) { return null; }
  if (!body || typeof body.exp !== 'number' || Date.now() > body.exp) return null;
  return body;
}

module.exports = { sign, verify, DEFAULT_TTL_MS };
