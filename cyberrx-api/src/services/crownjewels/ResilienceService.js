'use strict';

/**
 * ResilienceService — operational-resilience metrics for the CIO/CRO seats
 * (spec: Data & Formulas, Part B #6-10). Pure; no DB.
 *
 *   downtime cost/hr per process =  attributed annual revenue ÷ operating hours
 *   worst-case recovery          =  max( recovery_hours ) over revenue systems
 *   single-vendor blast radius   =  Σ ($/hr of systems that depend on a vendor)
 *   tech-debt exposure           =  Σ (open-risk exposure on EOL/unsupported assets)
 *
 * Inputs are already-normalized objects the engine assembles from the org's
 * process revenue + asset vendor/EOL/recovery attributes. Everything degrades
 * gracefully to nulls/empties when the data isn't there.
 */

const cfg = require('../../config/resilience');

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const pos = (v) => { const n = num(v); return n > 0 ? n : 0; };

// per-process $/hr from attributed annual revenue
function processDowntime(processes = []) {
  const hrs = cfg.operatingHoursPerYear || 8760;
  return processes
    .map((p) => ({ name: p.name, per_hr: pos(p.revenue) ? pos(p.revenue) / hrs : null, rto_hours: p.rtoHours != null ? num(p.rtoHours) : null }))
    .filter((p) => p.per_hr != null)
    .sort((a, b) => b.per_hr - a.per_hr);
}

// worst-case recovery = slowest revenue-critical system
function worstRecovery(assets = []) {
  const rec = assets.map((a) => num(a.recoveryHours)).filter((h) => h > 0);
  return rec.length ? Math.max(...rec) : null;
}

// single-vendor blast radius = Σ $/hr of systems depending on each vendor
function vendorBlast(assets = []) {
  const byVendor = {};
  for (const a of assets) {
    const v = String(a.vendor || '').trim();
    if (!v) continue;
    (byVendor[v] = byVendor[v] || { vendor: v, per_hr: 0, systems: [] });
    byVendor[v].per_hr += pos(a.perHr);
    byVendor[v].systems.push(a.name);
  }
  const list = Object.values(byVendor).sort((a, b) => b.per_hr - a.per_hr);
  return { list, top: list[0] || null };
}

// tech-debt exposure = Σ open-risk exposure on end-of-life / unsupported assets
function techDebt(assets = []) {
  const eol = assets.filter((a) => a.eol === true || /eol|end.of.life|unsupported|past support/i.test(String(a.eol || '')));
  const exposure = eol.reduce((s, a) => s + pos(a.exposure), 0);
  return { count: eol.length, exposure, assets: eol.map((a) => a.name) };
}

/**
 * @param {object} input { processes:[{name,revenue,rtoHours}], assets:[{name,vendor,eol,recoveryHours,perHr,exposure}] }
 */
function compute({ processes = [], assets = [] } = {}) {
  const downtime = processDowntime(processes);
  const recovery = worstRecovery(assets);
  const vendor = vendorBlast(assets);
  const debt = techDebt(assets);
  return {
    downtime_by_process: downtime,
    top_downtime_per_hr: downtime.length ? downtime[0].per_hr : null,
    worst_recovery_hours: recovery,
    vendor_concentration: vendor.list,
    top_vendor_blast: vendor.top,
    tech_debt: debt,
    has_data: !!(downtime.length || recovery != null || vendor.list.length || debt.count),
  };
}

module.exports = { compute, processDowntime, worstRecovery, vendorBlast, techDebt };
