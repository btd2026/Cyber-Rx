'use strict';

/**
 * licenseGate — appliance enforcement middleware.
 *
 * When LICENSE_ENFORCE=true (set in the shipped VM image, NOT in the hosted demo),
 * every API request is checked against the offline signed license:
 *
 *   active / grace  → allowed (grace also surfaces a renewal banner via /status)
 *   expired / tampered / wrong_machine / clock_suspect / missing → 402 blocked
 *
 * Always-open carve-outs so an expired box can still explain itself and be
 * re-licensed without a restart:
 *   - /api/license/*   (status + fingerprint — the banner + re-key path)
 *   - /health, /api/health, /  (liveness probes)
 *
 * The status is cached briefly so we don't re-verify the signature + re-read the
 * anti-rollback state file on every single request (checkStatus does crypto +
 * disk I/O). TTL is short so a freshly-installed license takes effect quickly.
 */

const License = require('../services/LicenseService');
const logger = require('../utils/logger');

const ENFORCE = process.env.LICENSE_ENFORCE === 'true';
const CACHE_TTL_MS = 60 * 1000; // re-verify at most once a minute

let _cache = null; // { at, status }

function currentStatus() {
  const now = Date.now();
  if (_cache && (now - _cache.at) < CACHE_TTL_MS) return _cache.status;
  const status = License.checkStatus();
  _cache = { at: now, status };
  return status;
}

// Expose a way to drop the cache (used after a license is installed at runtime).
function invalidateCache() { _cache = null; }

function isOpenPath(p) {
  if (p === '/' || p === '/health' || p === '/api/health' || p === '/favicon.ico') return true;
  if (p.startsWith('/api/license')) return true;
  return false;
}

function licenseGate(req, res, next) {
  if (!ENFORCE) return next();
  if (isOpenPath(req.path)) return next();

  const status = currentStatus();
  if (status.ok) {
    // Advertise remaining days / grace on a response header for lightweight
    // client banners without a separate round-trip.
    if (typeof status.daysLeft === 'number') res.setHeader('X-License-Days-Left', String(status.daysLeft));
    if (status.state === License.STATE.GRACE) res.setHeader('X-License-State', 'grace');
    return next();
  }

  // Blocked. 402 Payment Required is the semantically-correct signal here.
  return res.status(402).json({
    error: 'License invalid or expired.',
    state: status.state,
    reason: status.reason || 'Contact your vendor to renew.',
    expires: status.expires || null,
    customer: status.customer || null,
  });
}

/** Log the license posture once at boot so operators see it in the startup log. */
function logStartupStatus() {
  try {
    const s = License.checkStatus();
    const line = `License: state=${s.state} plan=${s.plan || 'n/a'} ` +
      `daysLeft=${typeof s.daysLeft === 'number' ? s.daysLeft : 'n/a'} ` +
      `enforce=${ENFORCE}`;
    if (s.ok) logger.info(line);
    else logger.warn(line + (s.reason ? ` — ${s.reason}` : ''));
    if (ENFORCE && !s.ok) {
      logger.warn('LICENSE_ENFORCE is on and the license is not valid — API is gated (402) until a valid license is installed.');
    }
  } catch (e) {
    logger.warn('License status check failed at startup', { error: e.message });
  }
}

module.exports = { licenseGate, logStartupStatus, invalidateCache, ENFORCE };
