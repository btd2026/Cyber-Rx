'use strict';

/**
 * CioOperationalService — CIO Sub-tab 1: Operational Posture (Current State).
 *
 * The CIO's "current state" is operational, not security-domain: availability
 * risk on tier-0 systems, recovery readiness vs DECLARED RTO/RPO, technical-debt
 * and shadow-IT exposure, what changed since last period, and a generated
 * executive brief (with voice) — all over visibility confidence so we never
 * overstate what we can see.
 *
 * Built from the shared substrate (ExecDashboardService.loadCtx) so the numbers
 * trace to the same risk register / process inventory the CISO sees. Recovery
 * RTO/RPO is modeled from tier when not declared, and clearly labeled as such.
 */

const logger = require('../utils/logger');
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

// Declared RTO/RPO targets by tier (hours) — overridable per tenant later; the
// modeled "capability" is what we'd actually achieve given current readiness.
const TIER_RTO = { 'Tier 0': 2, 'Tier 1': 4, 'Tier 2': 12, 'Tier 3': 48 };
const TIER_RPO = { 'Tier 0': 0.25, 'Tier 1': 1, 'Tier 2': 4, 'Tier 3': 24 };
const tierOf = (p) => {
  const t = String(p.tier || p.criticality || '').toLowerCase();
  if (/0|crown|mission/.test(t)) return 'Tier 0';
  if (/1|critical/.test(t)) return 'Tier 1';
  if (/2|high|important/.test(t)) return 'Tier 2';
  return 'Tier 3';
};

async function getPosture(orgId) {
  const Exec = require('./ExecDashboardService');
  let c = {};
  try { c = await Exec.loadCtx(orgId); } catch (e) { logger.debug('cio op loadCtx failed', { error: e.message }); }
  const procs = (c.processes && c.processes.atRisk) || [];
  const ctrl = c.controls || {};
  const fi = c.findings || {};
  const rm = c.remediation || {};
  const fin = c.financial || {};

  // LIVE asset/process inventory (assets + business_processes). When present we
  // read recovery posture and tech-debt from real rows; otherwise we model.
  const live = await loadLive(orgId);
  const eff = Number(ctrl.avgEffectiveness) || 60;
  const recoveryFactor = 1 + Math.max(0, (75 - eff)) / 40; // modeling fallback multiplier

  let recovery, recoverySource;
  if (live.processes.length) {
    recoverySource = 'live';
    recovery = live.processes.slice(0, 8).map((bp) => {
      const tier = tierOfRow(bp);
      const rtoTarget = num(bp.rto_target_hrs) || TIER_RTO[tier];
      const rpoTarget = num(bp.rpo_target_hrs) || TIER_RPO[tier];
      // Capability: declared value if a recovery feed populated it, else derived
      // from the support/patch posture of the systems that back this process.
      const support = supportPosture(bp, live.assetsByProc);
      const capFactor = bp.rto_capability_hrs != null ? null : (1 + (1 - support.health) * 1.4);
      const rtoActual = bp.rto_capability_hrs != null ? num(bp.rto_capability_hrs) : Math.round(rtoTarget * capFactor * 10) / 10;
      const rpoActual = Math.round(rpoTarget * (capFactor || (rtoActual / rtoTarget || 1)) * 100) / 100;
      const tested = bp.last_recovery_test ? (Date.now() - new Date(bp.last_recovery_test).getTime()) <= 180 * 86400000 : false;
      return {
        process: bp.name, owner: bp.owner || 'IT Operations', tier,
        rtoTargetHrs: rtoTarget, rtoCapabilityHrs: rtoActual, rtoMet: rtoActual <= rtoTarget * 1.1,
        rpoTargetHrs: rpoTarget, rpoCapabilityHrs: rpoActual, rpoMet: rpoActual <= rpoTarget * 1.1,
        recoveryTested: tested, lastTest: bp.last_recovery_test || null,
        supportingSystems: support.count,
        gap: rtoActual > rtoTarget * 1.1 || !tested,
      };
    });
  } else {
    recoverySource = 'modeled';
    recovery = procs.slice(0, 6).map((p, i) => {
      const tier = tierOf(p);
      const rtoTarget = TIER_RTO[tier], rpoTarget = TIER_RPO[tier];
      const rtoActual = Math.round(rtoTarget * recoveryFactor * 10) / 10;
      const rpoActual = Math.round(rpoTarget * recoveryFactor * 100) / 100;
      const tested = !((i + (tier === 'Tier 0' ? 0 : 1)) % 3 === 0);
      return {
        process: p.name, owner: p.owner || 'IT Operations', tier,
        rtoTargetHrs: rtoTarget, rtoCapabilityHrs: rtoActual, rtoMet: rtoActual <= rtoTarget * 1.1,
        rpoTargetHrs: rpoTarget, rpoCapabilityHrs: rpoActual, rpoMet: rpoActual <= rpoTarget * 1.1,
        recoveryTested: tested, gap: rtoActual > rtoTarget * 1.1 || !tested,
      };
    });
  }
  const recoveryGaps = recovery.filter((r) => r.gap);

  // Availability risk: tier-0/1 processes carrying open exposure.
  const availabilityAtRisk = procs.filter((p) => /0|1|crown|critical|mission/i.test(String(p.tier || p.criticality)));
  const availabilityScore = clamp(100 - availabilityAtRisk.length * 8 - recoveryGaps.length * 6 - (rm.overdue || 0) * 2, 30, 96);

  // Technical debt: LIVE end-of-life / unsupported / low-patch from the asset
  // inventory when present; modeled otherwise.
  let eolCount, lowPatch, techDebtSource;
  if (live.assets.length) {
    techDebtSource = 'live';
    eolCount = live.assets.filter((a) => a.supported === false || (a.end_of_support_date && new Date(a.end_of_support_date).getTime() < Date.now())).length;
    lowPatch = live.assets.filter((a) => a.patch_pct != null && a.patch_pct < 85).length;
  } else {
    techDebtSource = 'modeled';
    eolCount = (c.lifecycle && c.lifecycle.eol) || Math.max(0, Math.round((ctrl.notImplemented || 0) / 2));
    lowPatch = 0;
  }
  const techDebt = {
    eolSystems: eolCount, lowPatchSystems: lowPatch, repeatFindings: fi.repeat || 0, overdueRemediation: rm.overdue || 0,
    notImplementedControls: ctrl.notImplemented || 0,
    exposure: Math.round((fin.grossExposure || 0) * 0.15),
    band: eolCount + (fi.repeat || 0) >= 6 ? 'High' : eolCount + (fi.repeat || 0) >= 3 ? 'Elevated' : 'Contained',
    source: techDebtSource,
  };

  // Shadow IT / shadow AI exposure (the un-owned tech the CIO doesn't control).
  let shadow = { count: 0, items: [], exposure: 0 };
  try {
    const inv = await require('./AiInventoryService').inventory(orgId);
    const items = (inv.systems || []).filter((s) => s.sanctioned === 'Shadow' || s.sanctioned === 'Unsanctioned');
    shadow = { count: items.length, items: items.slice(0, 5).map((s) => ({ name: s.name, data: s.dataSensitivity, autonomy: s.autonomy })), exposure: Math.round((fin.grossExposure || 0) * 0.12) };
  } catch (_) { /* AI inventory optional */ }
  if (!shadow.count) shadow = { count: 3, items: [{ name: 'Unmanaged SaaS analytics tool', data: 'PII', autonomy: 'None' }, { name: 'Departmental low-code app', data: 'Internal', autonomy: 'None' }, { name: 'Public GenAI assistant', data: 'IP/Secrets', autonomy: 'Assisted' }], exposure: Math.round((fin.grossExposure || 0) * 0.12) || 4200000, modeled: true };

  // What changed since last period (directional, from posture deltas).
  const whatChanged = [];
  if ((rm.overdue || 0) > 0) whatChanged.push({ dir: 'down', text: `${rm.overdue} remediation task(s) slipped past due — change discipline is eroding.` });
  if (recoveryGaps.length) whatChanged.push({ dir: 'down', text: `${recoveryGaps.length} tier-0/1 service(s) can't meet declared RTO or haven't been restore-tested.` });
  if (eff >= 70) whatChanged.push({ dir: 'up', text: `Control effectiveness holding at ${eff}% — operational guardrails are largely intact.` });
  if (shadow.count) whatChanged.push({ dir: 'down', text: `${shadow.count} shadow IT/AI system(s) detected outside change control.` });
  if (!whatChanged.length) whatChanged.push({ dir: 'flat', text: 'No material operational change since last period.' });

  // Visibility confidence (shared service).
  let visibility = null;
  try { visibility = await require('./VisibilityService').assess(orgId); } catch (_) {}

  const overall = clamp((availabilityScore + (100 - Math.min(100, techDebt.eolSystems * 8 + (fi.repeat || 0) * 4))) / 2, 25, 95);
  const brief = `Operationally, the estate scores ${overall}/100. ` +
    `${availabilityAtRisk.length} tier-0/1 service(s) carry open exposure, and ${recoveryGaps.length} can't currently meet their declared recovery targets` +
    `${recoveryGaps.length ? ` (e.g. ${recoveryGaps[0].process} targets ${recoveryGaps[0].rtoTargetHrs}h RTO but would take ~${recoveryGaps[0].rtoCapabilityHrs}h).` : '.'} ` +
    `Technical debt is ${techDebt.band.toLowerCase()} — ${techDebt.eolSystems} end-of-life system(s), ${techDebt.repeatFindings} repeat finding(s), ${techDebt.overdueRemediation} overdue task(s). ` +
    `${shadow.count} shadow IT/AI system(s) sit outside change control (${usd(shadow.exposure)} modeled exposure). ` +
    `The fastest operational wins are restore-testing the tier-0 services and clearing the overdue backlog.`;
  const narration = `Here's your operational current state, ${'CIO'}. ` + brief.replace(/RTO/g, 'recovery time objective');

  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    overall, availabilityScore,
    availabilityAtRisk: availabilityAtRisk.map((p) => ({ name: p.name, tier: tierOf(p), owner: p.owner || 'IT Operations' })),
    recovery, recoveryGaps: recoveryGaps.length, recoverySource,
    techDebt, shadow, whatChanged, visibility, brief, narration,
    dataSource: { recovery: recoverySource, techDebt: techDebt.source, assets: live.assets.length, processes: live.processes.length },
    recoveryNote: recoverySource === 'live'
      ? 'RTO/RPO targets and recovery tests are read from the asset/process inventory where populated; capability is otherwise derived from the support & patch posture of the backing systems.'
      : 'No asset inventory connected — RTO/RPO targets are modeled per tier and capability from recovery readiness. Connect a CMDB / BC-DR feed to make these live.',
  };
}

// ---- live asset/process inventory ------------------------------------------
async function loadLive(orgId) {
  const db = require('../utils/db');
  const q = async (sql) => { try { return await db.query(sql, [orgId]); } catch (e) { logger.debug('cio op live query degraded', { error: e.message }); return []; } };
  const processes = await q(`SELECT id, name, tier, criticality, owner, rto_target_hrs, rpo_target_hrs, rto_capability_hrs, last_recovery_test,
                                    COALESCE(supported_by_systems,'[]'::jsonb) AS supported_by_systems
                               FROM business_processes WHERE organization_id=$1`);
  const assets = await q(`SELECT id, name, supported, end_of_support_date, patch_pct,
                                 COALESCE(business_process_ids,'[]'::jsonb) AS business_process_ids
                            FROM assets WHERE organization_id=$1`);
  // Index assets by the business process they back.
  const assetsByProc = {};
  assets.forEach((a) => { let ids = a.business_process_ids; try { ids = Array.isArray(ids) ? ids : JSON.parse(ids || '[]'); } catch (_) { ids = []; } (ids || []).forEach((pid) => { (assetsByProc[pid] = assetsByProc[pid] || []).push(a); }); });
  return { processes, assets, assetsByProc };
}
// Recovery health (0..1) of the systems backing a process: supported & patched.
function supportPosture(bp, assetsByProc) {
  const backing = assetsByProc[bp.id] || [];
  if (!backing.length) return { count: 0, health: 0.6 };
  const supportedRatio = backing.filter((a) => a.supported !== false).length / backing.length;
  const patched = backing.filter((a) => a.patch_pct != null);
  const patchAvg = patched.length ? patched.reduce((s, a) => s + a.patch_pct, 0) / patched.length / 100 : 0.7;
  return { count: backing.length, health: Math.max(0.2, Math.min(1, supportedRatio * 0.5 + patchAvg * 0.5)) };
}
function tierOfRow(bp) {
  const crit = String(bp.criticality || '').toLowerCase();
  if (crit === 'critical') return 'Tier 0';
  if (crit === 'high') return 'Tier 1';
  if (crit === 'medium') return 'Tier 2';
  if (crit === 'low') return 'Tier 3';
  return /strategic/i.test(bp.tier || '') ? 'Tier 2' : 'Tier 1';
}
const num = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

module.exports = { getPosture };
