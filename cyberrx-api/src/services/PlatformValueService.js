'use strict';

/**
 * PlatformValueService — the buyer-facing "value realized" rollup a CISO uses to
 * justify the spend at renewal. Read-only aggregation over what the platform has
 * already produced: decisions governed, exposure put under treatment, blind spots
 * surfaced, live-data coverage, ledger integrity, and disclosure artifacts.
 *
 * Every number traces to a real source (the decision ledger, CRQ loss model,
 * blind-spot engine, coverage rollup) — no vanity metrics.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');
const { prov } = require('../utils/provenance');

const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };
const parse = (v) => { if (!v) return {}; try { return typeof v === 'string' ? JSON.parse(v) : v; } catch (_) { return {}; } };
const lossOf = (row) => { const e = (parse(row.engine_state) || {}).event || {}; return (e.loss && Number(e.loss.expected)) || 0; };

async function summary(orgId) {
  const Engine = require('./DecisionEngineService');
  const [ledgerRows, integrity, coverage, blind, matRows] = await Promise.all([
    Engine.ledger(orgId).catch(() => []),
    Engine.verifyLedger(orgId).catch(() => ({ valid: null, entries: 0 })),
    require('./CisoPostureService').getCoverage(orgId).catch(() => null),
    require('./BlindSpotService').detect(orgId).catch(() => ({ summary: {}, findings: [] })),
    (async () => { try { return await db.query("SELECT determination FROM materiality_assessments WHERE org_id=$1", [orgId]); } catch (_) { return []; } })(),
  ]);

  // Decisions (exclude materiality determinations — counted separately).
  const decisions = ledgerRows.filter((r) => !String(r.card_id || '').startsWith('materiality:'));
  const treated = decisions.filter((r) => r.action === 'select');
  const accepted = decisions.filter((r) => r.action === 'accept');
  const exposureTreated = treated.reduce((s, r) => s + lossOf(r), 0);
  const exposureAccepted = accepted.reduce((s, r) => s + lossOf(r), 0);
  const byRole = {};
  decisions.forEach((r) => { const k = r.role || 'Unspecified'; byRole[k] = (byRole[k] || 0) + 1; });

  const bs = blind.summary || {};
  const closureRate = bs.totalEvents ? Math.round(((bs.totalEvents - (bs.undecided || 0)) / bs.totalEvents) * 100) : null;
  const criticalClosure = bs.criticalTotal ? Math.round(((bs.criticalTotal - (bs.undecidedCritical || 0)) / bs.criticalTotal) * 100) : null;
  const findings = blind.findings || [];
  const materiality = { determined: matRows.length, material: matRows.filter((m) => m.determination === 'material').length };

  // Headline value cards.
  const cards = [
    { key: 'decisions', label: 'Decisions governed', value: decisions.length, sub: `${treated.length} treated · ${accepted.length} accepted & monitored`, tone: decisions.length ? 'good' : 'flat' },
    { key: 'exposure_treated', label: 'Exposure under active treatment', value: usd(exposureTreated), sub: `${usd(exposureAccepted)} formally accepted & monitored`, tone: exposureTreated ? 'good' : 'flat' },
    { key: 'closure', label: 'Decision closure', value: closureRate == null ? '—' : `${closureRate}%`, sub: criticalClosure == null ? 'of all predicted events' : `${criticalClosure}% of critical events closed`, tone: closureRate >= 80 ? 'good' : closureRate >= 50 ? 'warn' : 'bad' },
    { key: 'blindspots', label: 'Blind spots surfaced', value: findings.length, sub: `${findings.filter((f) => f.severity === 'Critical' || f.severity === 'High').length} critical/high to action`, tone: findings.length ? 'warn' : 'good' },
    { key: 'coverage', label: 'Live data coverage', value: coverage ? `${coverage.pct.live}%` : '—', sub: coverage ? `${coverage.pct.derived}% derived · avg confidence ${coverage.confidence}%` : 'connect sources to raise', tone: coverage && coverage.pct.live >= 50 ? 'good' : 'warn' },
    { key: 'defensibility', label: 'Defensible decision record', value: integrity.entries || 0, sub: integrity.entries ? (integrity.valid ? 'hash-chain verified ✓' : 'integrity broken ⚠') : 'no entries yet', tone: integrity.entries ? (integrity.valid ? 'good' : 'bad') : 'flat' },
    { key: 'materiality', label: 'SEC materiality determinations', value: materiality.determined, sub: `${materiality.material} determined material`, tone: 'flat' },
    { key: 'roles', label: 'Executive roles engaged', value: Object.keys(byRole).length, sub: bs.silentRoles && bs.silentRoles.length ? `${bs.silentRoles.length} role(s) silent` : 'all roles participating', tone: (bs.silentRoles && bs.silentRoles.length) ? 'warn' : 'good' },
  ];

  const narrative =
    `CyberRX has governed ${decisions.length} executive decision(s), putting ${usd(exposureTreated)} of modeled exposure under active treatment` +
    `${exposureAccepted ? ` and documenting ${usd(exposureAccepted)} as formally accepted` : ''}. ` +
    `${closureRate != null ? `Decision closure is ${closureRate}%${criticalClosure != null ? ` (${criticalClosure}% on critical events)` : ''}. ` : ''}` +
    `${findings.length} blind spot(s) were surfaced from how decisions are actually being made. ` +
    `${integrity.entries ? `The decision record is a ${integrity.valid ? 'verified, ' : ''}tamper-evident hash chain of ${integrity.entries} entries, exportable for auditors and litigation. ` : ''}` +
    `${coverage ? `${coverage.pct.live}% of posture signals are live telemetry. ` : ''}` +
    `${materiality.determined ? `${materiality.determined} SEC materiality determination(s) are documented with the 8-K clock and a disclosure package. ` : ''}`;

  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    cards, byRole, narrative,
    detail: {
      decisions: decisions.length, treated: treated.length, accepted: accepted.length,
      exposureTreated, exposureAccepted, closureRate, criticalClosure,
      blindSpots: findings.length, coverageLivePct: coverage ? coverage.pct.live : null,
      ledgerEntries: integrity.entries || 0, ledgerValid: integrity.valid, materiality,
    },
    provenance: prov('derived', 'Platform activity (decision ledger, coverage, blind-spots)'),
    note: 'Value realized to date — every figure traces to the decision ledger, CRQ loss model, coverage rollup and blind-spot engine.',
  };
}

module.exports = { summary };
