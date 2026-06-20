'use strict';

/**
 * CioResilienceService — CIO Sub-tab 2: Resilience Risks & SPOFs.
 *
 * CRITICAL: the risks and attack paths here are the SAME shared events the CISO
 * sees — pulled from the decision spine (DecisionEngineService.list) and rendered
 * through the CIO lens. The CIO's "resilience risk" and the CISO's "attack path"
 * are one event, one DecisionCard, one ledger. We add the operational reading on
 * top: which security/availability risks threaten operations, the single points
 * of failure, and vendor/cloud/region concentration.
 *
 * Each risk carries the shared DecisionCard options so a CIO decision writes to
 * the same ledger as every other leader.
 */

const logger = require('../utils/logger');
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };

// Operationally-threatening scenarios — what a CIO must keep running.
const OPS_SCENARIOS = new Set(['Business disruption', 'Ransomware']);

async function getResilience(orgId) {
  const Engine = require('./DecisionEngineService');
  let listing = { cards: [] };
  try { listing = await Engine.list(orgId, 'CIO'); } catch (e) { logger.debug('cio resilience list failed', { error: e.message }); }

  // Resilience risks = the shared events that threaten operations: business
  // disruption / ransomware, plus anything Critical (an enterprise breach is an
  // availability event too). Ranked by expected loss; carries lens + options.
  const events = (listing.cards || [])
    .filter((c) => OPS_SCENARIOS.has(c.event.scenarioType) || c.event.severity === 'Critical')
    .slice(0, 8)
    .map((c) => ({
      id: c.id, type: c.type, title: c.event.title, severity: c.event.severity,
      scenarioType: c.event.scenarioType, crownJewel: c.event.crownJewel,
      affectedSystem: c.event.affectedSystem, exposure: c.event.exposure,
      loss: c.event.loss, timing: c.event.timing, attackPath: c.event.attackPath,
      lens: c.lens, options: c.options, recommended: c.recommended, decision: c.decision || null,
      impactedServices: impactedServices(c.event),
      recoveryPath: recoveryPath(c.event),
    }));

  // SPOFs + concentration — LIVE from the asset/process inventory (shared with
  // the CRO aggregation lens), modeled fallback only when no assets exist.
  const Conc = require('./ConcentrationService');
  const [spofs, concentration] = await Promise.all([Conc.detectSpofs(orgId), Conc.detectConcentration(orgId)]);

  const narration = `Honestly, this is where our ability to stay running is thinnest. ${events.length} of the same risks the security team tracks would actually take operations down` +
    `${events[0] ? `, and the worst is ${events[0].title} — it runs straight to ${events[0].crownJewel}` : ''}. ` +
    `${spofs.length === 0 ? 'No' : spofs.length} single point${spofs.length === 1 ? '' : 's'} of failure ${spofs.length === 1 ? 'sits' : 'sit'} under that${spofs[0] ? `, starting with ${spofs[0].name} — one dependency, no fallback` : ''}, and ${concentration.length === 0 ? 'no' : concentration.length} concentration risk${concentration.length === 1 ? '' : 's'}${concentration[0] ? ` like ${concentration[0].label}` : ''} mean a single failure cascades wide. ` +
    `What I'd do: fix the top single point of failure first — it removes the most fragility for the least effort — and pressure-test the recovery path on ${events[0] ? events[0].crownJewel : 'the crown jewels'} before, not during, an incident.`;

  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    counts: { events: events.length, spofs: spofs.length, concentration: concentration.length },
    events, spofs, concentration, narration,
    sharedSpine: true,
  };
}

// Best-effort impacted services + customer-facing read from the event.
function impactedServices(e) {
  const svc = [e.crownJewel].filter(Boolean);
  if (e.affectedSystem && e.affectedSystem !== e.crownJewel) svc.unshift(e.affectedSystem);
  const customerFacing = /portal|payment|checkout|claims|member|patient|customer|trading|order|booking/i.test(`${e.affectedSystem} ${e.crownJewel} ${e.title}`);
  return { services: [...new Set(svc)], customerFacing };
}

// A recovery path framed operationally, derived from the scenario type.
function recoveryPath(e) {
  const st = e.scenarioType;
  if (st === 'Ransomware') return ['Isolate affected segment', 'Activate clean-room restore from immutable backups', 'Validate integrity of tier-0 data', 'Staged service restoration (tier-0 first)', 'Post-incident hardening'];
  if (st === 'Data exfiltration') return ['Contain the egress path', 'Preserve forensic evidence', 'Rotate exposed credentials/keys', 'Restore service continuity', 'Notification readiness (legal clock)'];
  return ['Failover to standby/secondary', 'Confirm RTO/RPO against declared targets', 'Restore dependent services in tier order', 'Root-cause and permanent fix', 'Resilience test the recovered path'];
}

module.exports = { getResilience };
