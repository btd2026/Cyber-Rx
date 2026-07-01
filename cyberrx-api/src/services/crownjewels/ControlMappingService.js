'use strict';

/**
 * ControlMappingService — Stage 7: maps NIST SP 800-53 Rev5 and NIST CSF 2.0
 * controls to assets based on FIPS-199 impact classification, risk-driven
 * selection, and crosswalk propagation.
 *
 * Deterministic + explainable; no LLM. Framework-agnostic engine — only NIST
 * 800-53 and CSF 2.0 content; ISO/CIS excluded (see assessmentFrameworks.js).
 *
 * All functions exported for testability.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../../utils/db');
const cfg = require('../../config/assessmentFrameworks');

// ---------------------------------------------------------------------------
// 1. FIPS-199 impact classification
// ---------------------------------------------------------------------------

const HIGH_DATA = /PHI|PCI|CLASSIFIED|CUI|SECRET/i;
const MOD_DATA_FIN = /FINANCIAL|PII|REGULATED/i;
const MOD_DATA_CONF = /CONFIDENTIAL|IP|PROPRIETARY/i;
const LOW_DATA = /INTERNAL|PUBLIC/i;

/**
 * Classify an asset's FIPS-199-style impact level from its attributes.
 * @param {object} asset
 * @returns {{ impact_level: 'low'|'moderate'|'high', rationale: string }}
 */
function classifyImpactLevel(asset) {
  const classes = Array.isArray(asset.data_classification)
    ? asset.data_classification
    : (asset.data_classification ? [asset.data_classification] : []);
  const joined = classes.join(' ');

  let level = 'low';
  const reasons = [];

  // Data-classification checks
  if (HIGH_DATA.test(joined)) {
    level = 'high';
    reasons.push('data includes high-sensitivity category (PHI/PCI/CLASSIFIED/CUI/SECRET)');
  } else if (MOD_DATA_FIN.test(joined)) {
    level = 'moderate';
    reasons.push('data includes financial/PII/regulated category');
  } else if (MOD_DATA_CONF.test(joined)) {
    level = 'moderate';
    reasons.push('data includes confidential/IP/proprietary category');
  } else if (LOW_DATA.test(joined) || classes.length === 0) {
    reasons.push('data classification is internal/public or unspecified');
  }

  // Crown-jewel tier bump
  if (String(asset.crown_jewel_tier || '').toLowerCase() === 'tier1') {
    if (level !== 'high') reasons.push('crown-jewel tier1 bumps impact to high');
    level = 'high';
  }

  // Internet-facing + regulated data bump
  const exposure = String(asset.exposure || '').toLowerCase();
  const hasRegulated = HIGH_DATA.test(joined) || MOD_DATA_FIN.test(joined);
  if (exposure.includes('internet') && hasRegulated) {
    if (level !== 'high') reasons.push('internet-facing with regulated data bumps impact to high');
    level = 'high';
  }

  return {
    impact_level: level,
    rationale: `${asset.name || asset.id}: impact=${level} — ${reasons.join('; ') || 'default low classification'}.`,
  };
}

// ---------------------------------------------------------------------------
// 2. Baseline families by impact level (simplified NIST 800-53 baselines)
// ---------------------------------------------------------------------------

const LOW_FAMILIES = [
  'AC', 'AT', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR',
  'MA', 'MP', 'PE', 'PL', 'PS', 'RA', 'SA', 'SC', 'SI',
];

const BASELINE_FAMILIES = {
  low: LOW_FAMILIES,
  moderate: [...LOW_FAMILIES, 'PM'],
  high: [...LOW_FAMILIES, 'PM'],
};

// ---------------------------------------------------------------------------
// 3. Baseline control selection from the corpus
// ---------------------------------------------------------------------------

/**
 * Select applicable 800-53 controls from the corpus by impact level.
 * - low:      base controls (no enhancements) from low-baseline families
 * - moderate: all base controls (all families — moderate adds PM + more
 *             controls per family)
 * - high:     all base + enhancement controls
 * @param {'low'|'moderate'|'high'} impactLevel
 * @param {Array} corpus  Array of corpus records from ControlCorpusService
 * @returns {string[]}    Array of control_id strings
 */
function selectBaselineControls(impactLevel, corpus) {
  const spineLabel = cfg.SPINE.label;
  const spineRecords = corpus.filter((r) => r.framework === spineLabel);
  const families = BASELINE_FAMILIES[impactLevel] || BASELINE_FAMILIES.low;
  const isEnhancement = (cid) => /\(\d+\)/.test(cid);

  if (impactLevel === 'low') {
    return spineRecords
      .filter((r) => families.includes(r.family) && !isEnhancement(r.control_id))
      .map((r) => r.control_id);
  }
  if (impactLevel === 'moderate') {
    // All base controls (all families are effectively in scope at moderate)
    return spineRecords
      .filter((r) => !isEnhancement(r.control_id))
      .map((r) => r.control_id);
  }
  // high: base + enhancements — everything
  return spineRecords.map((r) => r.control_id);
}

// ---------------------------------------------------------------------------
// 4. Risk-driven control mapping (keyword-based, no LLM)
// ---------------------------------------------------------------------------

const THREAT_FAMILY_MAP = {
  credential: 'IA', authentication: 'IA',
  access: 'AC', authorization: 'AC',
  malware: 'SI', ransomware: 'SI',
  network: 'SC', perimeter: 'SC',
  audit: 'AU', logging: 'AU',
  incident: 'IR',
  backup: 'CP', recovery: 'CP',
  config: 'CM', patch: 'CM',
  personnel: 'PS',
  physical: 'PE',
  'supply chain': 'SA', supply_chain: 'SA',
  'risk assessment': 'RA', risk_assessment: 'RA',
};

/**
 * For each risk mapping, find corpus controls whose family matches the risk's
 * category or threat_refs via simple keyword matching.
 * @param {Array} riskMappings  Array of { risk_id, asset_id, category, threat_refs, ... }
 * @param {Array} corpus        Full corpus array
 * @returns {Array}  Additional control_application record stubs with basis='risk_driven'
 */
function mapRiskDrivenControls(riskMappings, corpus) {
  const spineLabel = cfg.SPINE.label;
  const spineRecords = corpus.filter((r) => r.framework === spineLabel);
  // Pre-index spine by family
  const byFamily = {};
  for (const r of spineRecords) {
    (byFamily[r.family] = byFamily[r.family] || []).push(r.control_id);
  }

  const results = [];
  for (const rm of riskMappings || []) {
    const searchText = [
      rm.category || '',
      ...(Array.isArray(rm.threat_refs) ? rm.threat_refs : [rm.threat_refs || '']),
      rm.title || '',
      rm.description || '',
    ].join(' ').toLowerCase();

    const matchedFamilies = new Set();
    for (const [keyword, family] of Object.entries(THREAT_FAMILY_MAP)) {
      if (searchText.includes(keyword)) matchedFamilies.add(family);
    }

    for (const fam of matchedFamilies) {
      for (const controlId of (byFamily[fam] || [])) {
        results.push({
          control_id: controlId,
          framework: spineLabel,
          framework_version: cfg.SPINE.version,
          asset_id: rm.asset_id,
          risk_id: rm.risk_id,
          basis: 'risk_driven',
          rationale: `Risk "${rm.category || rm.risk_id}" maps to ${fam}-family controls via threat keyword match.`,
          confidence: 0.8,
        });
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// 5. Documentation status enrichment from grounded assessments
// ---------------------------------------------------------------------------

const STATUS_MAP = {
  'Fully addressed': 'documented',
  'Partially addressed': 'partially',
  'Not addressed': 'not_documented',
};

/**
 * Enrich control_application records with documentation_status from the
 * org's most recent grounded_assessment records.
 * @param {string} orgId
 * @param {Array}  controlApplications  Array of control application stubs
 * @returns {Array}  Same array, mutated with documentation_status set
 */
async function enrichDocumentationStatus(orgId, controlApplications) {
  const rows = await db.query(
    `SELECT DISTINCT ON (control_id) control_id, status
       FROM grounded_assessment
      WHERE org_id = $1
      ORDER BY control_id, created_at DESC`,
    [orgId],
  );

  const statusByControl = {};
  for (const r of rows) {
    statusByControl[r.control_id] = STATUS_MAP[r.status] || 'unknown';
  }

  for (const ca of controlApplications) {
    ca.documentation_status = statusByControl[ca.control_id] || 'unknown';
  }
  return controlApplications;
}

// ---------------------------------------------------------------------------
// 6. CSF 2.0 propagation via crosswalk
// ---------------------------------------------------------------------------

/**
 * For each 800-53 control application, use the corpus crosswalk to also create
 * CSF 2.0 control applications. Basis stays the same; rationale notes crosswalk
 * propagation. Does NOT map CSF independently.
 * @param {Array} controlApplications  800-53 control applications
 * @param {Array} corpus               Full corpus array
 * @returns {Array}  New CSF 2.0 control application stubs
 */
function propagateToCsf(controlApplications, corpus) {
  // Build crosswalk lookup: 800-53 control_id -> CSF mappings
  const spineLabel = cfg.SPINE.label;
  const crosswalkByControl = {};
  for (const r of corpus) {
    if (r.framework === spineLabel && r.crosswalk) {
      crosswalkByControl[r.control_id] = r.crosswalk;
    }
  }

  const csfTarget = cfg.ALL_TARGETS.nist_csf_2;
  if (!csfTarget) return [];

  const csfLabel = csfTarget.label;
  const csfVersion = csfTarget.version;
  const results = [];

  for (const ca of controlApplications) {
    if (ca.framework !== spineLabel) continue;
    const xwalk = crosswalkByControl[ca.control_id];
    if (!xwalk || !xwalk[csfLabel]) continue;

    for (const mapping of xwalk[csfLabel]) {
      results.push({
        control_id: mapping.control_id,
        framework: csfLabel,
        framework_version: csfVersion,
        asset_id: ca.asset_id,
        risk_id: ca.risk_id || null,
        basis: ca.basis,
        rationale: `Propagated from ${ca.control_id} via 800-53→CSF 2.0 crosswalk (${mapping.mapping}).`,
        confidence: mapping.mapping === 'full' ? ca.confidence : Math.min(ca.confidence, 0.7),
        documentation_status: ca.documentation_status || 'unknown',
      });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// 7. Main entry — mapControls
// ---------------------------------------------------------------------------

/**
 * Map controls to assets for an org. For each asset: classify impact → select
 * baseline → add risk-driven → propagate to CSF → enrich documentation_status
 * → persist.
 *
 * @param {string} orgId
 * @param {Array}  assets        Array of asset objects
 * @param {Array}  riskMappings  Array of { risk_id, asset_id, category, threat_refs, ... }
 * @param {object} [opts]        { corpus, runId, dryRun }
 * @returns {{ applications, gaps, stats }}
 */
async function mapControls(orgId, assets, riskMappings, opts = {}) {
  const corpus = opts.corpus || [];
  const runId = opts.runId || null;

  // De-duplicate helper: track seen (control_id, framework, asset_id, risk_id)
  const seen = new Set();
  function dedupKey(ca) {
    return `${ca.control_id}|${ca.framework}|${ca.asset_id}|${ca.risk_id || ''}`;
  }

  const allApplications = [];
  let baselineDriven = 0;
  let riskDriven = 0;
  let csfPropagated = 0;

  // Risk mappings indexed by asset_id
  const risksByAsset = {};
  for (const rm of riskMappings || []) {
    (risksByAsset[rm.asset_id] = risksByAsset[rm.asset_id] || []).push(rm);
  }

  for (const asset of assets) {
    const { impact_level, rationale: impactRationale } = classifyImpactLevel(asset);

    // Baseline controls
    const baselineIds = selectBaselineControls(impact_level, corpus);
    const baselineApps = baselineIds.map((cid) => ({
      control_id: cid,
      framework: cfg.SPINE.label,
      framework_version: cfg.SPINE.version,
      asset_id: asset.id,
      risk_id: null,
      basis: 'baseline_attribute_driven',
      rationale: `Baseline (${impact_level}) — ${impactRationale}`,
      confidence: 0.9,
    }));

    for (const ba of baselineApps) {
      const k = dedupKey(ba);
      if (!seen.has(k)) { seen.add(k); allApplications.push(ba); baselineDriven += 1; }
    }

    // Risk-driven controls for this asset
    const assetRisks = risksByAsset[asset.id] || [];
    const riskApps = mapRiskDrivenControls(assetRisks, corpus);
    for (const ra of riskApps) {
      const k = dedupKey(ra);
      if (!seen.has(k)) { seen.add(k); allApplications.push(ra); riskDriven += 1; }
    }
  }

  // Enrich documentation status from grounded assessments
  await enrichDocumentationStatus(orgId, allApplications);

  // Propagate to CSF 2.0
  const csfApps = propagateToCsf(allApplications, corpus);
  for (const ca of csfApps) {
    const k = dedupKey(ca);
    if (!seen.has(k)) { seen.add(k); allApplications.push(ca); csfPropagated += 1; }
  }

  // Persist to control_application table
  if (!opts.dryRun) {
    for (const ca of allApplications) {
      const id = uuidv4();
      await db.query(
        `INSERT INTO control_application
           (id, organization_id, control_id, framework, framework_version,
            asset_id, risk_id, basis, rationale, confidence,
            documentation_status, review_status, run_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
         ON CONFLICT (organization_id, control_id, framework, asset_id, COALESCE(risk_id, ''))
         DO UPDATE SET
           framework_version = EXCLUDED.framework_version,
           basis = EXCLUDED.basis,
           rationale = EXCLUDED.rationale,
           confidence = EXCLUDED.confidence,
           documentation_status = EXCLUDED.documentation_status,
           run_id = EXCLUDED.run_id`,
        [id, orgId, ca.control_id, ca.framework, ca.framework_version || null,
          ca.asset_id, ca.risk_id || null, ca.basis, ca.rationale || null,
          ca.confidence == null ? 0.9 : ca.confidence,
          ca.documentation_status || 'unknown', 'auto', runId],
      );
    }
  }

  // Identify gaps: controls where documentation_status is 'not_documented' on crown jewels
  const crownAssetIds = new Set(
    assets.filter((a) => a.crown_jewel || a.crown_jewel_tier === 'tier1' || a.crown_jewel_tier === 'tier2')
      .map((a) => a.id),
  );
  const gaps = allApplications.filter(
    (ca) => ca.documentation_status === 'not_documented' && crownAssetIds.has(ca.asset_id),
  );

  return {
    applications: allApplications,
    gaps,
    stats: {
      baseline_driven: baselineDriven,
      risk_driven: riskDriven,
      csf_propagated: csfPropagated,
      gaps_on_crown_jewels: gaps.length,
      total: allApplications.length,
    },
  };
}

module.exports = {
  classifyImpactLevel,
  BASELINE_FAMILIES,
  selectBaselineControls,
  mapRiskDrivenControls,
  enrichDocumentationStatus,
  propagateToCsf,
  mapControls,
  // Internals exported for testability
  THREAT_FAMILY_MAP,
  STATUS_MAP,
};
