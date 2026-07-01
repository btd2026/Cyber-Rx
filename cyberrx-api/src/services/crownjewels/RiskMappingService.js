'use strict';

/**
 * RiskMappingService -- Stage 6: map risks to assets and processes
 * with context-aware applicability.
 *
 * Three risk sources, in priority order:
 *   1. register   -- authoritative risks from the org's existing register (confidence 1.0)
 *   2. threat_library -- deterministic rules based on asset attributes (confidence 0.85)
 *
 * Pure logic except for the register ingestion (DB read). No LLM calls.
 */

const { v4: uuidv4 } = require('uuid');
const Risk = require('../../models/Risk');

// ---------------------------------------------------------------------------
// Applicability rules -- deterministic, auditable
// ---------------------------------------------------------------------------

/**
 * Each rule has:
 *   id            -- stable identifier
 *   name          -- human label
 *   assetPredicate -- (asset) => boolean
 *   riskTemplate  -- fields for a generated risk / risk_mapping row
 */
const APPLICABILITY_RULES = [
  {
    id: 'rule-internet-facing',
    name: 'External Attack Surface Exposure',
    assetPredicate: (a) => {
      const e = String(a.exposure || '').toLowerCase();
      const hint = `${a.environment || ''} ${a.cloud_provider || ''} ${a.type || ''}`.toLowerCase();
      return e.includes('internet') || /internet|public|saas/.test(hint);
    },
    riskTemplate: {
      name: 'External Attack Surface Exposure',
      category: 'Network Security',
      severity: 'High',
      likelihood: 'High',
      threat_refs: ['T1190'],
    },
  },
  {
    id: 'rule-phi-pii',
    name: 'Regulated Data Breach',
    assetPredicate: (a) => {
      const cls = Array.isArray(a.data_classification) ? a.data_classification : (a.data_classification ? [a.data_classification] : []);
      return cls.some((c) => /PHI|PII|PCI|CARDHOLDER/i.test(String(c)));
    },
    riskTemplate: {
      name: 'Regulated Data Breach',
      category: 'Data Security',
      severity: 'Critical',
      likelihood: 'Medium',
      threat_refs: ['T1530'],
    },
  },
  {
    id: 'rule-database',
    name: 'SQL Injection / Data Exfiltration',
    assetPredicate: (a) => {
      const t = String(a.type || '').toLowerCase();
      const n = String(a.name || '').toLowerCase();
      return /database|db|rds|sql|postgres|mysql|mongo|dynamo|redis|datastore/.test(`${t} ${n}`);
    },
    riskTemplate: {
      name: 'SQL Injection / Data Exfiltration',
      category: 'Application Security',
      severity: 'High',
      likelihood: 'Medium',
      threat_refs: ['T1505', 'T1048'],
    },
  },
  {
    id: 'rule-cloud-misconfig',
    name: 'Cloud Misconfiguration',
    assetPredicate: (a) => {
      const hint = `${a.cloud_provider || ''} ${a.environment || ''} ${a.type || ''}`.toLowerCase();
      return /aws|azure|gcp|cloud|saas/.test(hint);
    },
    riskTemplate: {
      name: 'Cloud Misconfiguration',
      category: 'Cloud Security',
      severity: 'High',
      likelihood: 'Medium',
      threat_refs: ['T1078.004'],
    },
  },
  {
    id: 'rule-endpoint-ransomware',
    name: 'Ransomware / Malware',
    assetPredicate: (a) => {
      const t = String(a.type || '').toLowerCase();
      return /endpoint|workstation|laptop|desktop|pc/.test(t);
    },
    riskTemplate: {
      name: 'Ransomware / Malware',
      category: 'Endpoint Security',
      severity: 'Critical',
      likelihood: 'High',
      threat_refs: ['T1486'],
    },
  },
  {
    id: 'rule-spof',
    name: 'Service Disruption - No Redundancy',
    assetPredicate: (a) => {
      return a.is_spof === true || a.redundancy === 'none' || a.redundancy_group == null;
    },
    riskTemplate: {
      name: 'Service Disruption - No Redundancy',
      category: 'Availability',
      severity: 'High',
      likelihood: 'Medium',
      threat_refs: [],
    },
  },
  {
    id: 'rule-cj-apt',
    name: 'Advanced Persistent Threat Targeting',
    assetPredicate: (a) => {
      return a.crown_jewel_tier === 'tier1';
    },
    riskTemplate: {
      name: 'Advanced Persistent Threat Targeting',
      category: 'Threat Intelligence',
      severity: 'Critical',
      likelihood: 'Medium',
      threat_refs: ['T1071'],
    },
  },
  {
    id: 'rule-no-mfa',
    name: 'Credential Compromise',
    assetPredicate: (a) => {
      const attrs = a.attributes || {};
      const mfa = attrs.mfa_enabled ?? attrs.mfa ?? a.mfa_enabled;
      return mfa === false || mfa === 'false' || mfa === 'no';
    },
    riskTemplate: {
      name: 'Credential Compromise',
      category: 'Identity & Access',
      severity: 'High',
      likelihood: 'High',
      threat_refs: ['T1078'],
    },
  },
  {
    id: 'rule-server-privesc',
    name: 'Privilege Escalation',
    assetPredicate: (a) => {
      const t = String(a.type || '').toLowerCase();
      return /server|vm|virtual.?machine|ec2|compute|host/.test(t);
    },
    riskTemplate: {
      name: 'Privilege Escalation',
      category: 'Host Security',
      severity: 'High',
      likelihood: 'Medium',
      threat_refs: ['T1068'],
    },
  },
  {
    id: 'rule-supply-chain',
    name: 'Supply Chain Compromise',
    assetPredicate: (a) => {
      const t = String(a.type || '').toLowerCase();
      const n = String(a.name || '').toLowerCase();
      return /application|app|service|api|microservice|saas|third.?party/.test(`${t} ${n}`);
    },
    riskTemplate: {
      name: 'Supply Chain Compromise',
      category: 'Supply Chain',
      severity: 'High',
      likelihood: 'Low',
      threat_refs: ['T1195'],
    },
  },
  {
    id: 'rule-unpatched',
    name: 'Exploitation of Unpatched Vulnerability',
    assetPredicate: (a) => {
      const attrs = a.attributes || {};
      if (attrs.last_patched) {
        const patchDate = new Date(attrs.last_patched);
        const daysSince = (Date.now() - patchDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince > 90;
      }
      return attrs.patch_status === 'overdue' || attrs.patch_status === 'unknown';
    },
    riskTemplate: {
      name: 'Exploitation of Unpatched Vulnerability',
      category: 'Vulnerability Management',
      severity: 'High',
      likelihood: 'High',
      threat_refs: ['T1203'],
    },
  },
  {
    id: 'rule-legacy-system',
    name: 'Legacy System Compromise',
    assetPredicate: (a) => {
      const attrs = a.attributes || {};
      const os = String(attrs.os || attrs.operating_system || '').toLowerCase();
      return attrs.end_of_life === true || attrs.eol === true ||
        /windows.*(2003|2008|xp|7|vista)|centos.?[56]|ubuntu.?1[2468]/.test(os);
    },
    riskTemplate: {
      name: 'Legacy System Compromise',
      category: 'Asset Lifecycle',
      severity: 'Critical',
      likelihood: 'High',
      threat_refs: ['T1210'],
    },
  },
  {
    id: 'rule-encryption-at-rest',
    name: 'Data Exposure - Missing Encryption at Rest',
    assetPredicate: (a) => {
      const attrs = a.attributes || {};
      return attrs.encryption_at_rest === false || attrs.encrypted === false;
    },
    riskTemplate: {
      name: 'Data Exposure - Missing Encryption at Rest',
      category: 'Data Security',
      severity: 'High',
      likelihood: 'Medium',
      threat_refs: ['T1005'],
    },
  },
  {
    id: 'rule-cj-tier2-targeted',
    name: 'Targeted Attack on High-Value Asset',
    assetPredicate: (a) => {
      return a.crown_jewel_tier === 'tier2';
    },
    riskTemplate: {
      name: 'Targeted Attack on High-Value Asset',
      category: 'Threat Intelligence',
      severity: 'High',
      likelihood: 'Medium',
      threat_refs: ['T1595'],
    },
  },
  {
    id: 'rule-network-lateral',
    name: 'Lateral Movement via Network Segmentation Gap',
    assetPredicate: (a) => {
      const attrs = a.attributes || {};
      return attrs.network_segment === 'flat' || attrs.segmented === false ||
        attrs.vlan == null && String(a.type || '').toLowerCase() === 'server';
    },
    riskTemplate: {
      name: 'Lateral Movement via Network Segmentation Gap',
      category: 'Network Security',
      severity: 'High',
      likelihood: 'Medium',
      threat_refs: ['T1021'],
    },
  },
];

// ---------------------------------------------------------------------------
// ingestRegister -- load authoritative risks from the organization's register
// ---------------------------------------------------------------------------

/**
 * Convert existing Risk DB records into risk_mapping rows.
 * These are authoritative: origin='register', confidence=1.0, never overridden.
 *
 * @param {string} orgId  Organization ID
 * @param {Array}  risks  Array of Risk model objects (already fetched or passed in)
 * @returns {Array} risk_mapping rows
 */
function ingestRegister(orgId, risks) {
  const mappings = [];

  for (const risk of risks) {
    if (!risk.id) continue;

    // Build one mapping per risk, linking to its asset and processes
    mappings.push({
      id: uuidv4(),
      organization_id: orgId,
      risk_id: risk.id,
      asset_id: risk.assetId || null,
      business_process_ids: risk.businessProcessIds || [],
      origin: 'register',
      estimated: false,
      confidence: 1.0,
      threat_refs: _extractThreatRefs(risk),
      rationale: `Authoritative risk from organization register: "${risk.title}"`,
      severity: risk.severity,
      likelihood: risk.likelihood,
      created_at: new Date().toISOString(),
    });
  }

  return mappings;
}

/**
 * Extract MITRE ATT&CK technique references from a risk's framework mappings
 * or description for de-duplication purposes.
 * @private
 */
function _extractThreatRefs(risk) {
  const refs = [];
  const mappings = risk.frameworkMappings || [];
  for (const m of mappings) {
    const s = String(m);
    const matches = s.match(/T\d{4}(?:\.\d{3})?/g);
    if (matches) refs.push(...matches);
  }
  // Also scan description
  if (risk.description) {
    const descMatches = risk.description.match(/T\d{4}(?:\.\d{3})?/g);
    if (descMatches) refs.push(...descMatches);
  }
  return [...new Set(refs)];
}

// ---------------------------------------------------------------------------
// applyDeterministicRules
// ---------------------------------------------------------------------------

/**
 * Evaluate every APPLICABILITY_RULE against each asset.
 * Produces risk_mapping rows with origin='threat_library', confidence=0.85.
 *
 * @param {Array}  assets           Array of asset objects
 * @param {Set}    existingRiskIds  Set of { `${assetId}::${threatRef}` } already covered by register
 * @returns {{ mappings: Array, newRisks: Array }}
 */
function applyDeterministicRules(assets, existingRiskIds) {
  const mappings = [];
  const newRisks = [];
  const seenRiskKeys = new Set();

  for (const asset of assets) {
    for (const rule of APPLICABILITY_RULES) {
      let matched = false;
      try {
        matched = rule.assetPredicate(asset);
      } catch (_) {
        // predicate threw — skip rule for this asset
        continue;
      }
      if (!matched) continue;

      // Check if a register risk already covers this asset + threat
      const tpl = rule.riskTemplate;
      const dominated = tpl.threat_refs.length > 0 && tpl.threat_refs.some((ref) => {
        return existingRiskIds.has(`${asset.id}::${ref}`);
      });
      if (dominated) continue;

      // Avoid duplicating the same rule for the same asset
      const dedupeKey = `${asset.id}::${rule.id}`;
      if (seenRiskKeys.has(dedupeKey)) continue;
      seenRiskKeys.add(dedupeKey);

      // Create a new Risk record for this threat-library finding
      const riskId = uuidv4();
      newRisks.push({
        id: riskId,
        title: tpl.name,
        description: `Auto-generated: ${rule.name} applies to asset "${asset.name || asset.id}" based on deterministic rule ${rule.id}.`,
        severity: tpl.severity,
        likelihood: tpl.likelihood,
        category: tpl.category,
        status: 'open',
        assetId: asset.id,
        businessProcessIds: asset.business_process_ids || [],
        threat_refs: tpl.threat_refs,
      });

      mappings.push({
        id: uuidv4(),
        organization_id: asset.organization_id || null,
        risk_id: riskId,
        asset_id: asset.id,
        business_process_ids: asset.business_process_ids || [],
        origin: 'threat_library',
        estimated: true,
        confidence: 0.85,
        threat_refs: tpl.threat_refs,
        rule_id: rule.id,
        severity: tpl.severity,
        likelihood: tpl.likelihood,
        rationale: _buildRuleRationale(rule, asset),
        created_at: new Date().toISOString(),
      });
    }
  }

  return { mappings, newRisks };
}

/**
 * Build a human-readable rationale for why a rule matched an asset.
 * @private
 */
function _buildRuleRationale(rule, asset) {
  const parts = [`Rule "${rule.name}" (${rule.id}) matched asset "${asset.name || asset.id}"`];

  // Add context about what attribute triggered the match
  if (rule.id === 'rule-internet-facing') {
    parts.push(`exposure=${asset.exposure || 'inferred from environment'}`);
  } else if (rule.id === 'rule-phi-pii') {
    parts.push(`data_classification=${JSON.stringify(asset.data_classification)}`);
  } else if (rule.id === 'rule-database') {
    parts.push(`type=${asset.type}`);
  } else if (rule.id === 'rule-cloud-misconfig') {
    parts.push(`cloud_provider=${asset.cloud_provider || 'inferred'}`);
  } else if (rule.id === 'rule-endpoint-ransomware') {
    parts.push(`type=${asset.type}`);
  } else if (rule.id === 'rule-spof') {
    parts.push(`is_spof=${asset.is_spof}, redundancy=${asset.redundancy || 'none'}`);
  } else if (rule.id === 'rule-cj-apt' || rule.id === 'rule-cj-tier2-targeted') {
    parts.push(`crown_jewel_tier=${asset.crown_jewel_tier}`);
  } else if (rule.id === 'rule-no-mfa') {
    const attrs = asset.attributes || {};
    parts.push(`mfa_enabled=${attrs.mfa_enabled ?? attrs.mfa ?? 'not set'}`);
  } else if (rule.id === 'rule-server-privesc') {
    parts.push(`type=${asset.type}`);
  } else if (rule.id === 'rule-supply-chain') {
    parts.push(`type=${asset.type}`);
  }

  const refs = rule.riskTemplate.threat_refs;
  if (refs.length > 0) {
    parts.push(`MITRE ATT&CK: ${refs.join(', ')}`);
  }

  return parts.join('. ') + '.';
}

// ---------------------------------------------------------------------------
// mapRisks -- main entry point
// ---------------------------------------------------------------------------

/**
 * Map risks to assets and business processes with context-aware applicability.
 *
 * @param {string} orgId       Organization ID
 * @param {Array}  assets      Enriched asset array (with crown_jewel_tier, data_classification, etc.)
 * @param {Array}  processes   Business process array
 * @param {Object} [opts]      Options
 * @param {Array}  [opts.existingRisks]  Pre-fetched Risk records (skips DB call if provided)
 * @returns {Promise<{mappings, risks, review, stats}>}
 */
async function mapRisks(orgId, assets, processes, opts = {}) {
  // 1. Fetch or use provided register risks
  const registerRisks = opts.existingRisks || await Risk.findByOrganization(orgId);

  // 2. Ingest register risks into mapping rows
  const registerMappings = ingestRegister(orgId, registerRisks);

  // 3. Build a set of existing coverage: assetId::threatRef pairs
  const existingCoverage = new Set();
  for (const m of registerMappings) {
    const refs = m.threat_refs || [];
    for (const ref of refs) {
      if (m.asset_id) {
        existingCoverage.add(`${m.asset_id}::${ref}`);
      }
    }
  }

  // 4. Prioritize: process crown jewels first so they get evaluated first
  const sortedAssets = _prioritizeByTier(assets);

  // 5. Apply deterministic rules
  const { mappings: ruleMappings, newRisks } = applyDeterministicRules(sortedAssets, existingCoverage);

  // 6. Combine all mappings
  const allMappings = [...registerMappings, ...ruleMappings];

  // 7. Identify low-confidence items for human review queue
  const review = allMappings.filter((m) => m.confidence < 0.8);

  // 8. Build stats
  const stats = {
    from_register: registerMappings.length,
    from_rules: ruleMappings.length,
    total: allMappings.length,
    assets_evaluated: assets.length,
    rules_evaluated: APPLICABILITY_RULES.length,
    crown_jewels_processed: sortedAssets.filter((a) => a.crown_jewel_tier === 'tier1' || a.crown_jewel_tier === 'tier2').length,
  };

  return {
    mappings: allMappings,
    risks: newRisks,
    review,
    stats,
  };
}

/**
 * Sort assets so crown jewels (tier1 first, then tier2) are processed before others.
 * @private
 */
function _prioritizeByTier(assets) {
  const tierOrder = { tier1: 0, tier2: 1, tier3: 2, none: 3 };
  return [...assets].sort((a, b) => {
    const ta = tierOrder[a.crown_jewel_tier] ?? 3;
    const tb = tierOrder[b.crown_jewel_tier] ?? 3;
    return ta - tb;
  });
}

module.exports = {
  ingestRegister,
  applyDeterministicRules,
  mapRisks,
  APPLICABILITY_RULES,
  // Exposed for testing
  _extractThreatRefs,
  _buildRuleRationale,
  _prioritizeByTier,
};
