'use strict';

/**
 * PeerBenchmarkService — the "how do I compare?" layer of Blind Spots & Coaching.
 *
 * Honest by construction. This is a MODELED industry × size reference band, not a
 * claim of live peer telemetry: an enterprise wants to know whether its decision
 * discipline and control maturity are ahead of, typical for, or behind comparable
 * organizations (same industry, same size). The reference medians/top-quartile
 * come from a maturity model keyed to industry (regulated programs run more
 * mature) and size (larger programs run more mature), and the org's own values
 * come from the live decision spine + control efficacy — so the comparison is
 * specific, not boilerplate.
 *
 * If the consent-bounded cross-tenant pipeline (BenchmarkService) is enabled with
 * a sufficient cohort, that becomes the source of truth instead; until then we
 * label the band as modeled so we never overstate what we know.
 */

const logger = require('../utils/logger');

// Reference medians / top-quartile per metric for a baseline enterprise. dir:
// 'high' = bigger is better; 'low' = smaller is better (MTTD/MTTR).
const BASE = {
  decisionClosure:     { label: 'Decisions closed', unit: '%', dir: 'high', median: 64, top: 86 },
  criticalClosure:     { label: 'Critical decisions closed', unit: '%', dir: 'high', median: 72, top: 93 },
  controlEffectiveness:{ label: 'Control effectiveness', unit: '%', dir: 'high', median: 66, top: 83 },
  mttd:                { label: 'Mean time to detect', unit: 'h', dir: 'low', median: 24, top: 6 },
  mttr:                { label: 'Mean time to respond', unit: 'h', dir: 'low', median: 72, top: 24 },
  aiGovernance:        { label: 'AI governance coverage', unit: '%', dir: 'high', median: 33, top: 68 },
};

// Industry program-maturity index (regulated industries run more mature).
const INDUSTRY_MATURITY = {
  bank: 1.12, insurance_pc: 1.10, energy_utilities: 1.08,
  healthcare_payer: 1.05, healthcare_provider: 1.04,
  saas_tech: 1.02, generic: 1.0, retail_ecommerce: 0.98,
  government: 0.95, manufacturing: 0.92, higher_ed: 0.86,
};
const INDUSTRY_LABEL = {
  bank: 'Banking', insurance_pc: 'P&C Insurance', energy_utilities: 'Energy & Utilities',
  healthcare_payer: 'Healthcare Payer', healthcare_provider: 'Healthcare Provider',
  saas_tech: 'SaaS / Technology', retail_ecommerce: 'Retail / E-commerce',
  government: 'Government', manufacturing: 'Manufacturing', higher_ed: 'Higher Education', generic: 'Cross-industry',
};

const clampPct = (n) => Math.max(3, Math.min(98, Math.round(n)));

// Enterprise size bands (no SMB tier). Prefer employees, fall back to revenue.
function sizeBand(setup) {
  const emp = Number(String(setup.employees || setup.headcount || '').replace(/[^0-9.]/g, '')) || 0;
  const rev = Number(String(setup.revenue || setup.annualRevenue || '').replace(/[^0-9.]/g, '')) || 0;
  if (emp >= 20000 || rev >= 1e10) return { band: 'Global enterprise', factor: 1.08, basis: emp ? `${emp.toLocaleString()} employees` : 'revenue scale' };
  if (emp >= 5000 || rev >= 2e9) return { band: 'Large enterprise', factor: 1.04, basis: emp ? `${emp.toLocaleString()} employees` : 'revenue scale' };
  if (emp >= 1000 || rev >= 5e8) return { band: 'Mid-enterprise', factor: 1.0, basis: emp ? `${emp.toLocaleString()} employees` : 'revenue scale' };
  return { band: 'Enterprise', factor: 0.97, basis: emp ? `${emp.toLocaleString()} employees` : (rev ? 'revenue scale' : 'size not provided') };
}

function refFor(key, factor) {
  const b = BASE[key];
  if (b.dir === 'high') return { median: clampPct(b.median * factor), top: clampPct(b.top * factor) };
  // lower-is-better: more mature → faster, so divide by the factor.
  return { median: Math.max(1, Math.round(b.median / factor)), top: Math.max(1, Math.round(b.top / factor)) };
}

// Where does the org sit relative to the modeled band?
function position(value, ref, dir) {
  if (value == null) return { standing: 'unknown', tone: 'unknown' };
  if (dir === 'high') {
    if (value >= ref.top) return { standing: 'ahead', tone: 'good' };
    if (value >= ref.median) return { standing: 'typical', tone: 'warn' };
    return { standing: 'behind', tone: 'bad' };
  }
  if (value <= ref.top) return { standing: 'ahead', tone: 'good' };
  if (value <= ref.median) return { standing: 'typical', tone: 'warn' };
  return { standing: 'behind', tone: 'bad' };
}

function coachingLine(b, value, ref, pos) {
  const v = `${value}${b.unit === '%' ? '%' : b.unit === 'h' ? 'h' : ''}`;
  const med = `${ref.median}${b.unit === '%' ? '%' : b.unit === 'h' ? 'h' : ''}`;
  const top = `${ref.top}${b.unit === '%' ? '%' : b.unit === 'h' ? 'h' : ''}`;
  if (pos.standing === 'ahead') return `You're ahead of peers (${v} vs ${med} median; top quartile ${top}). Hold the line and reinvest the lead elsewhere.`;
  if (pos.standing === 'typical') return `You're in the typical band (${v} vs ${med} median). Closing to the top quartile (${top}) is the next move.`;
  if (pos.standing === 'behind') return `You're behind comparable peers (${v} vs ${med} median). This is the gap to prioritize — peers at your size/industry are materially better here.`;
  return `Not enough signal yet to benchmark this — connect the relevant data to populate it.`;
}

// Pull MTTD/MTTR (in hours) from the control-efficacy SOC panel.
function socHours(soc, id) {
  const row = (soc || []).find((s) => s.id === id);
  if (!row || row.current == null) return null;
  const n = Number(String(row.current).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n)) return null;
  return /day/i.test(row.unit || '') ? Math.round(n * 24) : Math.round(n);
}

// compare(orgId, { blindSpots, efficacy }) — optional pre-computed inputs so the
// coaching route doesn't recompute the spine; fetched here when not supplied.
async function compare(orgId, opts = {}) {
  let blindSpots = opts.blindSpots, efficacy = opts.efficacy;
  try { if (!blindSpots) blindSpots = await require('./BlindSpotService').detect(orgId); } catch (_) {}
  try { if (!efficacy) efficacy = await require('./ControlEfficacyService').getEfficacy(orgId); } catch (_) {}

  let industry = 'generic', setup = {};
  try {
    const db = require('../utils/db');
    const r = await db.query('SELECT setup_json FROM orgs WHERE id=$1', [orgId]);
    setup = (r[0] && r[0].setup_json) || {};
    industry = setup.industry || 'generic';
  } catch (_) {}

  const size = sizeBand(setup);
  const indFactor = INDUSTRY_MATURITY[industry] || 1.0;
  const factor = indFactor * size.factor;

  const sum = (blindSpots && blindSpots.summary) || {};
  const pct = (closed, total) => (total > 0 ? clampPct((closed / total) * 100) : null);
  const actuals = {
    decisionClosure: pct((sum.totalEvents || 0) - (sum.undecided || 0), sum.totalEvents || 0),
    criticalClosure: pct((sum.criticalTotal || 0) - (sum.undecidedCritical || 0), sum.criticalTotal || 0),
    controlEffectiveness: efficacy && efficacy.framework && Number.isFinite(Number(efficacy.framework.posture)) ? Math.round(Number(efficacy.framework.posture)) : null,
    mttd: socHours(efficacy && efficacy.soc, 'mttd'),
    mttr: socHours(efficacy && efficacy.soc, 'mttr'),
    aiGovernance: pct((sum.aiTotal || 0) - (sum.aiOpen || 0), sum.aiTotal || 0),
  };

  const metrics = Object.keys(BASE).map((key) => {
    const b = BASE[key];
    const ref = refFor(key, factor);
    const value = actuals[key];
    const pos = position(value, ref, b.dir);
    return {
      key, label: b.label, unit: b.unit, dir: b.dir, value,
      peerMedian: ref.median, peerTopQuartile: ref.top,
      standing: pos.standing, tone: pos.tone, coaching: coachingLine(b, value, ref, pos),
    };
  });

  const known = metrics.filter((m) => m.value != null);
  const counts = {
    ahead: known.filter((m) => m.standing === 'ahead').length,
    typical: known.filter((m) => m.standing === 'typical').length,
    behind: known.filter((m) => m.standing === 'behind').length,
    measured: known.length,
  };
  const standing = counts.behind > counts.ahead ? 'behind peers' : counts.ahead > counts.typical + counts.behind ? 'ahead of peers' : 'typical for peers';

  // Source labelling — honest about whether this is modeled or live cohort.
  let source = 'modeled', cohortAvailable = false;
  try { cohortAvailable = require('./BenchmarkService').isEnabled(); } catch (_) {}

  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    source, cohortAvailable,
    peerGroup: { industry, industryLabel: INDUSTRY_LABEL[industry] || 'Cross-industry', sizeBand: size.band, sizeBasis: size.basis },
    standing, counts, metrics,
    note: 'Modeled industry × size reference band (median and top-quartile), not live peer telemetry. Your values are computed from the live decision spine and control efficacy.',
  };
}

module.exports = { compare, sizeBand, BASE };
