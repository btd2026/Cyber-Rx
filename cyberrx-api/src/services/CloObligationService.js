'use strict';

/**
 * CloObligationService — CLO Sub-tab 1: Obligation Posture (Current State).
 *
 * Which legal/regulatory/contractual obligations apply — by jurisdiction, data
 * type, and contract — driven by the ACTIVE INDUSTRY OVERLAY's regulatory
 * mappings (industryProfiles). Plus upcoming regulatory changes, any active
 * notification clocks, and a defensibility posture derived from the SHARED
 * decision/evidence ledger (are decisions documented with rationale?).
 *
 * Also the home of the cross-cutting legal caveat: logged risk acceptances are
 * discoverable in litigation, so the rationale guidance steers toward defensible
 * reasoning. This behavior is flagged for Legal review before launch
 * (LEGAL_REVIEW.md + the in-app Defensibility banner).
 */

const logger = require('../utils/logger');

// Canonical regulatory metadata, matched against the overlay's regulation
// strings. clockHours is the statutory notification deadline (modeled where a
// statute uses "without undue delay"). Labeled as the source of truth for the
// CLO's obligation mapping.
const REG_META = [
  { re: /hipaa|hitech/i, name: 'HIPAA / HITECH', jurisdiction: 'US Federal (HHS OCR)', dataTypes: ['PHI'], clockHours: 60 * 24, clockLabel: '60 days (individuals & HHS; media if >500)', trigger: 'Unauthorized access/acquisition of unsecured PHI' },
  { re: /gdpr/i, name: 'GDPR', jurisdiction: 'EU / EEA', dataTypes: ['PII', 'personal data'], clockHours: 72, clockLabel: '72 hours to the supervisory authority', trigger: 'Personal-data breach with risk to data subjects' },
  { re: /ccpa|cpra/i, name: 'CCPA / CPRA', jurisdiction: 'California, US', dataTypes: ['PII'], clockHours: 45 * 24, clockLabel: 'Without unreasonable delay', trigger: 'Unauthorized access to CA-resident personal information' },
  { re: /state breach/i, name: 'State Breach Laws', jurisdiction: 'US States (50-state)', dataTypes: ['PII'], clockHours: 45 * 24, clockLabel: '30–90 days (varies by state)', trigger: 'Acquisition of unencrypted personal information' },
  { re: /glba/i, name: 'GLBA', jurisdiction: 'US Federal (FTC / banking regulators)', dataTypes: ['financial', 'PII'], clockHours: 30 * 24, clockLabel: 'FTC Safeguards: 30 days if ≥500 affected', trigger: 'Breach of customer financial information' },
  { re: /pci/i, name: 'PCI DSS', jurisdiction: 'Contractual (card brands / acquirer)', dataTypes: ['PCI', 'cardholder'], clockHours: 24, clockLabel: 'Immediate to acquirer / card brands', trigger: 'Suspected cardholder-data compromise' },
  { re: /\bsox\b/i, name: 'SOX', jurisdiction: 'US Federal (SEC)', dataTypes: ['financial', 'material'], clockHours: 4 * 24, clockLabel: 'Material events via periodic/8-K reporting', trigger: 'Material impact to financial reporting/controls' },
  { re: /\bsec\b|item 1\.05|reg s-k/i, name: 'SEC Cyber Disclosure (Item 1.05)', jurisdiction: 'US Federal (SEC)', dataTypes: ['material'], clockHours: 4 * 24, clockLabel: '4 business days after materiality determination', trigger: 'Material cybersecurity incident' },
  { re: /nydfs|500/i, name: 'NYDFS 500', jurisdiction: 'New York (DFS)', dataTypes: ['nonpublic', 'PII'], clockHours: 72, clockLabel: '72 hours to the Superintendent', trigger: 'Reportable cybersecurity event' },
  { re: /ffiec|occ|fdic/i, name: 'FFIEC / OCC / FDIC', jurisdiction: 'US Federal banking', dataTypes: ['financial'], clockHours: 36, clockLabel: '36 hours (computer-security incident rule)', trigger: 'Notification incident at a banking organization' },
  { re: /naic/i, name: 'NAIC Model Law', jurisdiction: 'US States (insurance)', dataTypes: ['PII', 'financial'], clockHours: 72, clockLabel: '72 hours to the commissioner', trigger: 'Cybersecurity event affecting nonpublic information' },
  { re: /ftc act/i, name: 'FTC Act §5', jurisdiction: 'US Federal (FTC)', dataTypes: ['PII'], clockHours: null, clockLabel: 'No fixed clock — enforcement risk', trigger: 'Unfair/deceptive failure to protect consumer data' },
  { re: /dpa|contractual|customer contract/i, name: 'Customer Contracts (DPA)', jurisdiction: 'Contractual', dataTypes: ['customer'], clockHours: 72, clockLabel: 'Per DPA (commonly 72 hours / “without undue delay”)', trigger: 'Processor/sub-processor security incident' },
  { re: /soc 2|iso 27001|cms|hipaa/i, name: 'Attestation / Program (SOC 2 / ISO / CMS)', jurisdiction: 'Contractual / Program', dataTypes: ['customer'], clockHours: null, clockLabel: 'Per contract / program requirements', trigger: 'Control failure affecting attested scope' },
];

// Upcoming regulatory changes the CLO should be tracking (industry-flavored,
// clearly modeled/labeled — replace with a live regulatory feed).
const UPCOMING = {
  bank: [{ name: 'Expanded incident-reporting harmonization (CIRCIA rules finalize)', when: 'Next 12 months', impact: 'Shorter, harmonized federal reporting windows.' }],
  healthcare_payer: [{ name: 'HIPAA Security Rule update (NPRM)', when: 'Next 12 months', impact: 'Mandatory controls and tighter breach expectations.' }],
  healthcare_provider: [{ name: 'HIPAA Security Rule update (NPRM)', when: 'Next 12 months', impact: 'Mandatory controls and tighter breach expectations.' }],
  retail_ecommerce: [{ name: 'New state privacy laws in effect', when: 'This year', impact: 'More 50-state notification and consumer-rights variation.' }],
  default: [{ name: 'SEC cyber-disclosure enforcement maturing', when: 'Ongoing', impact: 'Materiality determinations increasingly scrutinized.' }, { name: 'Expanding state privacy patchwork', when: 'This year', impact: 'More jurisdictions, shorter clocks.' }],
};

function matchReg(name) {
  for (const m of REG_META) { if (m.re.test(name)) return m; }
  return { name, jurisdiction: 'Review with counsel', dataTypes: [], clockHours: null, clockLabel: 'Confirm per obligation', trigger: 'Confirm trigger with counsel' };
}

async function obligationsFor(orgId) {
  let industry = 'generic';
  try { const db = require('../utils/db'); const r = await db.query('SELECT setup_json FROM orgs WHERE id=$1', [orgId]); industry = (r[0] && r[0].setup_json && r[0].setup_json.industry) || 'generic'; } catch (_) {}
  let regs = [];
  try { regs = require('../data/industryProfiles').getProfile(industry).regulations || []; } catch (_) {}
  const obligations = regs.map((name) => { const m = matchReg(name); return { obligation: name, jurisdiction: m.jurisdiction, dataTypes: m.dataTypes, clockHours: m.clockHours, clockLabel: m.clockLabel, trigger: m.trigger }; });
  return { industry, obligations };
}

async function getPosture(orgId) {
  const Engine = require('./DecisionEngineService');
  const { industry, obligations } = await obligationsFor(orgId);

  // Active notification clocks: any realized/critical disclosure-bearing events.
  let listing = { cards: [] };
  try { listing = await Engine.list(orgId, 'CLO'); } catch (e) { logger.debug('clo posture list failed', { error: e.message }); }
  const cards = listing.cards || [];
  const disclosureEvents = cards.filter((c) => c.event.scenarioType === 'Data exfiltration' || c.event.severity === 'Critical');
  const activeClocks = disclosureEvents.slice(0, 4).map((c) => ({
    event: c.event.title, dataAtRisk: c.event.dataAtRisk, severity: c.event.severity,
    status: c.decision ? 'Decision recorded' : 'Undecided — pre-stage notification',
    nearestClock: nearestClock(obligations, c.event),
  }));

  // Defensibility posture from the shared ledger (documented decisions).
  let ledger = [];
  try { ledger = await Engine.ledger(orgId); } catch (_) {}
  const accepts = ledger.filter((r) => r.action === 'accept');
  const acceptsWithRationale = accepts.filter((r) => r.rationale && String(r.rationale).trim().length >= 40);
  const decisionsLogged = ledger.length;
  const defensibilityScore = decisionsLogged === 0 ? 40
    : Math.round(60 + (acceptsWithRationale.length / Math.max(1, accepts.length)) * 40);
  const defensibilityBand = defensibilityScore >= 80 ? 'Strong' : defensibilityScore >= 60 ? 'Adequate' : 'Weak';

  const upcoming = UPCOMING[industry] || UPCOMING.default;
  let visibility = null;
  try { visibility = await require('./VisibilityService').assess(orgId); } catch (_) {}

  const brief = `Counsel's obligation posture for a ${industry.replace(/_/g, ' ')} organization. ` +
    `${obligations.length} regulatory/contractual obligation regime(s) apply across ${[...new Set(obligations.map((o) => o.jurisdiction.split(' ')[0]))].length} jurisdiction families, ` +
    `with notification clocks as short as ${shortestClock(obligations)}. ` +
    `${activeClocks.length} cyber scenario(s) would, if realized, trigger disclosure obligations — ${activeClocks.filter((a) => a.status.startsWith('Undecided')).length} are not yet decided and should have notification pre-staged. ` +
    `Defensibility posture is ${defensibilityBand.toLowerCase()} (${defensibilityScore}/100): ${decisionsLogged} decision(s) on the record, ${acceptsWithRationale.length} of ${accepts.length} acceptances carry a substantive rationale. ` +
    `Note for counsel: logged acceptances are discoverable in litigation — the rationale guidance steers toward defensible reasoning and is flagged for Legal review before launch.`;
  const narration = `Obligation posture, General Counsel. ` + brief;

  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    industry, obligations, upcoming, activeClocks,
    defensibility: { score: defensibilityScore, band: defensibilityBand, decisionsLogged, accepts: accepts.length, acceptsWithRationale: acceptsWithRationale.length },
    visibility, brief, narration,
    legalCaveat: 'Logged risk acceptances are discoverable in litigation. Rationale fields guide toward defensible reasoning (business justification, compensating controls, review date). FLAGGED FOR LEGAL REVIEW BEFORE LAUNCH.',
    note: 'Obligations come from the active industry regulatory overlay; notification clocks are statutory where defined and modeled (labeled) where the statute uses a reasonableness standard. Upcoming changes are illustrative pending a live regulatory feed.',
  };
}

function nearestClock(obligations, e) {
  const fired = obligations.filter((o) => firesFor(o, e)).filter((o) => o.clockHours != null).sort((a, b) => a.clockHours - b.clockHours);
  return fired[0] ? { obligation: fired[0].obligation, clockLabel: fired[0].clockLabel, clockHours: fired[0].clockHours } : null;
}
function firesFor(o, e) {
  const data = String(e.dataAtRisk || '').toLowerCase();
  if (o.dataTypes.some((t) => data.includes(String(t).toLowerCase()))) return true;
  if (e.scenarioType === 'Data exfiltration') return true;
  if (e.severity === 'Critical' && /material|sec|sox/i.test(o.obligation)) return true;
  return false;
}
function shortestClock(obs) { const c = obs.filter((o) => o.clockHours != null).sort((a, b) => a.clockHours - b.clockHours)[0]; return c ? (c.clockHours <= 72 ? `${c.clockHours} hours` : `${Math.round(c.clockHours / 24)} days`) : 'varies'; }

module.exports = { getPosture, obligationsFor, matchReg, REG_META, firesFor };
