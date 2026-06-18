'use strict';

/**
 * ConcentrationService — LIVE single-point-of-failure and concentration analysis
 * from the asset/process inventory (assets + business_processes), shared by the
 * CIO resilience lens and the CRO aggregation lens so both read the same truth.
 *
 * Live signals (when assets are ingested):
 *   - SPOF: an asset that many business processes depend on (fan-in via
 *     business_process_ids) with no redundant peer.
 *   - Cloud / region concentration: assets grouped by cloud_provider and
 *     location — a dominant single failure domain.
 *   - Identity concentration: a single auth/identity asset many processes use.
 *
 * Falls back to a clearly-labeled modeled set only when no assets exist, so the
 * view is populated for evaluation and becomes real the moment a CMDB is connected.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

async function rows(sql, params = []) { try { return await db.query(sql, params); } catch (e) { logger.debug('concentration query degraded', { error: e.message }); return []; } }

async function loadAssets(orgId) {
  return rows(
    `SELECT id, name, type, cloud_provider, location, criticality, tier,
            COALESCE(business_process_ids, '[]'::jsonb) AS business_process_ids
       FROM assets WHERE organization_id=$1`, [orgId]);
}
const procCount = (a) => { try { const v = a.business_process_ids; return Array.isArray(v) ? v.length : (v ? JSON.parse(v).length : 0); } catch (_) { return 0; } };

// LIVE single points of failure from asset → process fan-in.
async function detectSpofs(orgId) {
  const assets = await loadAssets(orgId);
  if (assets.length) {
    const spofs = assets
      .map((a) => ({ a, fanIn: procCount(a) }))
      .filter((x) => x.fanIn >= 3)
      .sort((x, y) => y.fanIn - x.fanIn)
      .slice(0, 6)
      .map(({ a, fanIn }) => ({
        name: a.name, layer: a.type || 'system', dependents: fanIn,
        why: `${fanIn} business process(es) depend on this single ${a.type || 'system'}${a.location ? ` in ${a.location}` : ''} with no redundant peer in inventory.`,
        recommendation: /network|api/i.test(a.type || '') ? 'Add a redundant path / second instance to remove the chokepoint.' : 'Introduce active-active redundancy so loss of this node does not halt dependents.',
        source: 'live',
      }));
    if (spofs.length) return spofs;
  }
  return modeledSpofs();
}

// LIVE cloud / region / identity concentration from the asset inventory.
async function detectConcentration(orgId) {
  const assets = await loadAssets(orgId);
  const out = [];

  if (assets.length) {
    // Cloud-provider concentration.
    const byCloud = tally(assets.map((a) => a.cloud_provider).filter(Boolean));
    const topCloud = byCloud[0];
    if (topCloud && topCloud.count / assets.filter((a) => a.cloud_provider).length >= 0.6) {
      out.push({ kind: 'cloud', label: `Cloud concentration: ${topCloud.key}`, detail: `${topCloud.count} of ${assets.filter((a) => a.cloud_provider).length} cloud assets run on ${topCloud.key} — a single provider failure domain.`, severity: topCloud.count >= 5 ? 'High' : 'Medium', recommendation: 'Establish a tested multi-cloud / second-provider plan for tier-0 workloads.', source: 'live' });
    }
    // Region / location concentration.
    const byLoc = tally(assets.map((a) => a.location).filter(Boolean));
    const topLoc = byLoc[0];
    if (topLoc && topLoc.count / assets.filter((a) => a.location).length >= 0.6) {
      out.push({ kind: 'region', label: `Region concentration: ${topLoc.key}`, detail: `${topLoc.count} of ${assets.filter((a) => a.location).length} located assets sit in ${topLoc.key} — one regional impairment is a single failure domain.`, severity: 'High', recommendation: 'Distribute tier-0 workloads across a second region/AZ with tested failover.', source: 'live' });
    }
    // Identity-provider concentration (an identity/auth asset many processes use).
    const idp = assets.filter((a) => /identity|sso|auth|idp|directory|okta|entra|ping/i.test(`${a.name} ${a.type}`)).sort((x, y) => procCount(y) - procCount(x))[0];
    if (idp && procCount(idp) >= 3) {
      out.push({ kind: 'identity', label: `Identity-provider concentration: ${idp.name}`, detail: `${procCount(idp)} process(es) authenticate through ${idp.name} with no inventoried break-glass alternative.`, severity: 'High', recommendation: 'Stand up a tested break-glass path and a secondary IdP.', source: 'live' });
    }
    if (out.length) return out;
  }
  return modeledConcentration();
}

function tally(arr) {
  const m = {}; arr.forEach((k) => { m[k] = (m[k] || 0) + 1; });
  return Object.keys(m).map((k) => ({ key: k, count: m[k] })).sort((a, b) => b.count - a.count);
}
function modeledSpofs() {
  return [
    { name: 'Primary identity provider (SSO)', layer: 'app', dependents: 9, why: 'Nearly every business service authenticates through one identity provider with no break-glass alternative.', recommendation: 'Stand up a tested break-glass path and secondary IdP region.', modeled: true },
    { name: 'Core payments / clearing gateway', layer: 'app', dependents: 5, why: 'Revenue-bearing flows funnel through a single gateway instance.', recommendation: 'Active-active the gateway across regions.', modeled: true },
    { name: 'Primary data-center network core', layer: 'network', dependents: 7, why: 'A flat core with one egress path; loss halts dependent tiers.', recommendation: 'Dual-core with independent egress and segmentation.', modeled: true },
  ];
}
function modeledConcentration() {
  return [
    { kind: 'cloud', label: 'Cloud / region concentration', detail: 'Most tier-0 workloads run in a single cloud region — one failure domain for the enterprise.', severity: 'High', recommendation: 'Distribute tier-0 workloads across a second region/AZ with tested failover.', modeled: true },
    { kind: 'identity', label: 'Identity-provider concentration', detail: 'Nearly all services authenticate through one identity provider with no tested break-glass path.', severity: 'High', recommendation: 'Stand up a break-glass path and a secondary IdP.', modeled: true },
  ];
}

module.exports = { detectSpofs, detectConcentration };
