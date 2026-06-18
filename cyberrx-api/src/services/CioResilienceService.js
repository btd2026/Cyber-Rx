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

  // SPOFs + concentration from the substrate (graph fan-in + vendors/cloud).
  const [spofs, concentration] = await Promise.all([detectSpofs(orgId), detectConcentration(orgId)]);

  const narration = `Resilience and single points of failure, CIO. ${events.length} shared risk(s) threaten operations` +
    `${events[0] ? `, led by ${events[0].title} reaching ${events[0].crownJewel}` : ''}. ` +
    `${spofs.length} single point(s) of failure detected${spofs[0] ? `, starting with ${spofs[0].name}` : ''}. ` +
    `${concentration.length} concentration risk(s)${concentration[0] ? ` — ${concentration[0].label}` : ''}. ` +
    `These are the same events the security team sees; click any risk for the recovery path and the live attack path.`;

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

// SPOFs: graph nodes (apps/devices/network) that many processes depend on. Falls
// back to a modeled set keyed to the org's crown jewel when the graph is empty.
async function detectSpofs(orgId) {
  try {
    const graph = await require('./AttackPathService').buildGraph(orgId);
    const layers = graph.layers || [];
    const out = [];
    for (const lid of ['app', 'device', 'network']) {
      const nodes = (layers.find((l) => l.id === lid) || {}).nodes || [];
      nodes.forEach((nd) => {
        const fanIn = Array.isArray(nd.procs) ? nd.procs.length : 0;
        if (fanIn >= 3) out.push({
          name: nd.label, layer: lid, dependents: fanIn,
          why: `${fanIn} business processes depend on this single ${lid} with no redundant path.`,
          recommendation: lid === 'network' ? 'Add a redundant path / segment to remove the chokepoint.' : 'Introduce redundancy / active-active so loss of this node does not halt dependents.',
        });
      });
    }
    if (out.length) return out.sort((a, b) => b.dependents - a.dependents).slice(0, 5);
  } catch (e) { logger.debug('spof graph degraded', { error: e.message }); }
  // Modeled fallback — the classic enterprise SPOFs.
  return [
    { name: 'Primary identity provider (SSO)', layer: 'app', dependents: 9, why: 'Nearly every business service authenticates through one identity provider with no break-glass alternative.', recommendation: 'Stand up a tested break-glass path and secondary IdP region.' },
    { name: 'Core payments / clearing gateway', layer: 'app', dependents: 5, why: 'Revenue-bearing flows funnel through a single gateway instance.', recommendation: 'Active-active the gateway across regions.' },
    { name: 'Primary data-center network core', layer: 'network', dependents: 7, why: 'A flat core with one egress path; loss halts dependent tiers.', recommendation: 'Dual-core with independent egress and segmentation.' },
    { modeled: true },
  ].filter((x) => !x.modeled).map((x) => ({ ...x, modeled: true }));
}

// Vendor / cloud / region concentration from the vendor inventory + a modeled
// cloud/region split (labeled when modeled).
async function detectConcentration(orgId) {
  const out = [];
  try {
    const Exec = require('./ExecDashboardService');
    const c = await Exec.loadCtx(orgId);
    const vendors = (c.vendors && (c.vendors.list || c.vendors.top)) || [];
    const critical = vendors.filter((v) => /critical|tier ?1|high/i.test(String(v.criticality || v.tier || '')) || (v.exposure || 0) > 0);
    if (critical.length) {
      const top = critical[0];
      out.push({ kind: 'vendor', label: `Vendor concentration: ${top.name || 'a single critical vendor'}`, detail: `${critical.length} critical service(s) concentrate on a small set of vendors; ${top.name || 'the lead vendor'} underpins multiple processes.`, severity: critical.length >= 3 ? 'High' : 'Medium', recommendation: 'Qualify a secondary supplier for the most-depended-on service and contractually require resilience SLAs.' });
    }
  } catch (_) {}
  // Modeled cloud/region concentration (replace with live cloud inventory).
  out.push({ kind: 'cloud', label: 'Cloud / region concentration', detail: 'The majority of tier-0 workloads run in a single cloud region; a regional impairment is a single failure domain.', severity: 'High', recommendation: 'Distribute tier-0 workloads across a second region/AZ with tested failover.', modeled: true });
  return out;
}

module.exports = { getResilience };
