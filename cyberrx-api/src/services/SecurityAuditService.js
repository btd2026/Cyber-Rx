'use strict';

/**
 * SecurityAuditService — durable trail for tenant-isolation / auth security events.
 *
 * Persists the events the tenant-isolation scaffolding previously only wrote to
 * stdout (org_scope_violation, unauth_nondemo_org_access, org_access_blocked).
 * Two hard rules:
 *
 *   1. Best-effort, never blocking. A failed audit write must never break or slow
 *      the request it describes, so callers fire-and-forget and every error is
 *      swallowed (logged at debug). Security logging is additive, not a gate.
 *   2. Records what was attempted, including spoofed/unknown org ids — that is the
 *      evidence. (The table has no FK to orgs for exactly this reason.)
 */

const { query } = require('../utils/db');
const logger = require('../utils/logger');

/**
 * Persist one security event. Returns a promise that always resolves (never
 * rejects). Callers may await it or fire-and-forget.
 *
 * @param {Object} e
 * @param {string}  e.eventType         - e.g. 'org_scope_violation'
 * @param {string} [e.severity]         - 'info' | 'warning' | 'critical' (default 'warning')
 * @param {string} [e.userId]
 * @param {string} [e.tokenOrgId]       - org the caller is authorized for
 * @param {string} [e.requestedOrgId]   - org the caller tried to reach
 * @param {string} [e.path]
 * @param {string} [e.ipAddress]
 * @param {string} [e.userAgent]
 * @param {boolean}[e.enforced]         - was the request actually blocked?
 * @param {Object} [e.details]
 */
async function record(e = {}) {
  try {
    await query(
      `INSERT INTO security_audit_logs
         (event_type, severity, user_id, token_org_id, requested_org_id, path, ip_address, user_agent, enforced, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        e.eventType,
        e.severity || 'warning',
        e.userId || null,
        e.tokenOrgId || null,
        e.requestedOrgId != null ? String(e.requestedOrgId) : null,
        e.path || null,
        e.ipAddress || null,
        e.userAgent || null,
        e.enforced === true,
        JSON.stringify(e.details || {}),
      ]
    );
  } catch (err) {
    // Never let an audit-write failure surface to the caller.
    logger.debug('security audit write failed', { event: e.eventType, error: err.message });
  }
}

/**
 * Read recent security events (admin investigation). Filters are optional.
 * @param {Object} [opts]
 * @param {string} [opts.eventType]
 * @param {string} [opts.requestedOrgId]
 * @param {number} [opts.limit] - capped at 500
 * @returns {Promise<Array>}
 */
async function list(opts = {}) {
  const where = [];
  const params = [];
  if (opts.eventType) { params.push(opts.eventType); where.push(`event_type = $${params.length}`); }
  if (opts.requestedOrgId) { params.push(String(opts.requestedOrgId)); where.push(`requested_org_id = $${params.length}`); }
  const limit = Math.min(500, Math.max(1, Number(opts.limit) || 100));
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  try {
    return await query(
      `SELECT id, event_type, severity, user_id, token_org_id, requested_org_id, path, ip_address, enforced, details, created_at
         FROM security_audit_logs ${clause}
        ORDER BY created_at DESC
        LIMIT ${limit}`,
      params
    );
  } catch (err) {
    logger.debug('security audit read failed', { error: err.message });
    return [];
  }
}

/** Pull a small request fingerprint from an Express req for the audit row. */
function fromReq(req) {
  return {
    path: req.path,
    ipAddress: req.headers['x-forwarded-for'] || req.ip || (req.connection && req.connection.remoteAddress) || null,
    userAgent: req.headers['user-agent'] || null,
  };
}

module.exports = { record, list, fromReq };
