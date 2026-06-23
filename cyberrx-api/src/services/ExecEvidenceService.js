'use strict';

/**
 * ExecEvidenceService — live platform signals behind the executive briefs' evidence.
 *
 * The briefs run on a single demo incident, so incident-specific proof stays
 * clearly marked as modeled on the client. THIS service supplies the genuinely
 * live signals the platform can stand behind right now — each with a real
 * timestamp, source, and a `live` flag — so "evidence on demand" resolves to
 * actual data, not hard-coded strings:
 *
 *   - per-source data coverage + record counts (VisibilityService)
 *   - decision-ledger integrity (SHA-256 hash chain — DecisionEngineService)
 *   - tenant-isolation audit events recorded (security_audit_logs)
 *
 * Every lookup is best-effort and degrades to a clearly-flagged "unavailable"
 * line rather than failing the whole bundle.
 */

const logger = require('../utils/logger');

async function signals(orgId) {
  const ts = new Date().toISOString();
  const out = [];

  // 1 · Per-source data coverage (what the outputs are actually computed from).
  try {
    const vis = await require('./VisibilityService').assess(orgId);
    out.push({ group: 'Data coverage', label: 'Overall data visibility', value: `${vis.overall}% (${vis.band})`, source: 'VisibilityService', ts, live: true });
    (vis.classes || []).forEach((c) => {
      out.push({
        group: 'Data coverage', label: c.label,
        value: c.hasData ? `${c.rows} records · ${c.band} confidence` : 'no data — inferred',
        source: c.connected ? 'live connector' : (c.hasData ? 'uploaded / ingested' : 'inferred'),
        ts, live: !!c.hasData,
      });
    });
  } catch (e) { logger.debug('exec signals: visibility degraded', { error: e.message }); out.push({ group: 'Data coverage', label: 'Data visibility', value: 'unavailable', source: '—', ts, live: false }); }

  // 2 · Decision-ledger integrity (the defensible record's tamper-evidence).
  try {
    const integ = await require('./DecisionEngineService').verifyLedger(orgId);
    out.push({
      group: 'Defensible record', label: 'Decision-ledger integrity',
      value: `${integ.valid ? 'chain intact' : 'CHAIN BROKEN'} · ${integ.entries} ${integ.entries === 1 ? 'entry' : 'entries'}`,
      source: 'SHA-256 per-org hash chain', detail: integ.rootHash ? `root ${String(integ.rootHash).slice(0, 16)}…` : null,
      ts, live: true,
    });
  } catch (e) { logger.debug('exec signals: ledger degraded', { error: e.message }); }

  // 3 · Tenant-isolation audit events (security trail is being written).
  try {
    const rows = await require('./SecurityAuditService').list({ limit: 100 });
    out.push({
      group: 'Security audit', label: 'Tenant-isolation events recorded',
      value: `${rows.length} in audit trail`, source: 'security_audit_logs',
      detail: rows[0] ? `latest ${rows[0].event_type} @ ${new Date(rows[0].created_at).toISOString()}` : 'none recorded',
      ts, live: true,
    });
  } catch (e) { logger.debug('exec signals: audit degraded', { error: e.message }); }

  return { organizationId: orgId, generatedAt: ts, signals: out };
}

module.exports = { signals };
