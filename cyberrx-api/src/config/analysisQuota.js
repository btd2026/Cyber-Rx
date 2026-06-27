'use strict';

/**
 * Crown-Jewels analysis run cost ceiling (spec §3b). Inventory changes more
 * often than policy, so this is a per-run ceiling, not a tight monthly cap:
 * FULL graph rebuilds consume from the cap; incremental DELTA syncs are cheap
 * and uncapped by default (but every run still records cost telemetry).
 *
 * Defaults:
 *   ANALYSIS_FULL_REBUILD_CAP = 5            (full rebuilds per window per scope)
 *   ANALYSIS_WINDOW           = calendar_month   (or rolling_30d)
 *   ANALYSIS_SCOPE            = account       (also: org, user)
 *   ANALYSIS_DELTA_CAPPED     = false         (deltas count against the cap?)
 * No silent bypass: ANALYSIS_ENABLED=false is for narrow test setup only.
 *
 * Note: this codebase has no separate account entity, so `account` resolves to
 * the org id (same Checkpoint-0 decision as the Compliance Engine quota).
 */

const WINDOWS = ['calendar_month', 'rolling_30d'];
const SCOPES = ['account', 'org', 'user'];
const posInt = (name, def) => { const v = parseInt(process.env[name], 10); return Number.isFinite(v) && v > 0 ? v : def; };
const oneOf = (name, allowed, def) => { const v = (process.env[name] || '').trim(); return allowed.includes(v) ? v : def; };

module.exports = {
  WINDOWS, SCOPES,
  get cap() { return posInt('ANALYSIS_FULL_REBUILD_CAP', 5); },
  get window() { return oneOf('ANALYSIS_WINDOW', WINDOWS, 'calendar_month'); },
  get scope() { return oneOf('ANALYSIS_SCOPE', SCOPES, 'account'); },
  get deltaCapped() { return (process.env.ANALYSIS_DELTA_CAPPED || 'false') === 'true'; },
  get enabled() { return (process.env.ANALYSIS_ENABLED || 'true') !== 'false'; },
};
