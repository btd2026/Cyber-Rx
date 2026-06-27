'use strict';

/**
 * Scan-quota configuration (spec §3b). Every value is env-overridable so the
 * limit, window and scope are config-driven — never hardcoded — and the default
 * is the same in every environment. There is NO silent bypass: the only knob
 * that turns the gate off is SCAN_QUOTA_ENABLED=false, which is meant for
 * narrow test setup, not production.
 *
 * Defaults:
 *   SCAN_QUOTA_LIMIT  = 2
 *   SCAN_QUOTA_WINDOW = calendar_month   (also: rolling_30d)
 *   SCAN_QUOTA_SCOPE  = org              (also: user, account)
 *
 * Note on scope: the product spec's default is `user`, but in this codebase the
 * scan entrypoint (POST /api/intake/documents) is unauthenticated and only a
 * tenant `org_id` is reliably available, so the deployed default here is `org`
 * (per the Checkpoint-0 decision). `user`/`account` remain fully supported for
 * environments that authenticate the scan route.
 */

const WINDOWS = ['calendar_month', 'rolling_30d'];
const SCOPES = ['user', 'account', 'org'];

function posInt(name, def) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v > 0 ? v : def;
}
function oneOf(name, allowed, def) {
  const v = (process.env[name] || '').trim();
  return allowed.includes(v) ? v : def;
}

module.exports = {
  WINDOWS,
  SCOPES,
  // Getters so tests (and hot-reload) see env changes without re-require.
  get limit() { return posInt('SCAN_QUOTA_LIMIT', 2); },
  get window() { return oneOf('SCAN_QUOTA_WINDOW', WINDOWS, 'calendar_month'); },
  get scope() { return oneOf('SCAN_QUOTA_SCOPE', SCOPES, 'org'); },
  get enabled() { return (process.env.SCAN_QUOTA_ENABLED || 'true') !== 'false'; },
};
