'use strict';

/**
 * cae/aliasMap — reconcile the inconsistent tool names used in the control rows
 * (Recommended_Tool_Categories_and_Tools + settings tools[]) to canonical
 * cae_tool names, or to a category when the token is a generic capability.
 *
 * INTERNAL only — this is the "control-to-tool mapping logic" the product hides.
 * Tokens that resolve to neither are returned unresolved (never silently dropped).
 */

// Explicit token -> canonical cae_tool.name.
const ALIAS = {
  'entra': 'Microsoft Entra ID', 'entra pim': 'Microsoft Entra ID', 'microsoft entra id': 'Microsoft Entra ID',
  'crowdstrike': 'CrowdStrike Falcon', 'crowdstrike falcon': 'CrowdStrike Falcon', 'crowdstrike intel': 'CrowdStrike Falcon',
  'crowdstrike intelligence': 'CrowdStrike Falcon',
  'defender': 'Microsoft Defender XDR', 'defender o365': 'Microsoft Defender for Office 365',
  'defender for office 365': 'Microsoft Defender for Office 365',
  'sentinel': 'Microsoft Sentinel', 'microsoft sentinel': 'Microsoft Sentinel',
  'xsoar': 'Cortex XSOAR', 'cortex xsoar': 'Cortex XSOAR', 'splunk soar': 'Splunk SOAR',
  'servicenow': 'ServiceNow', 'servicenow irm': 'ServiceNow', 'servicenow vrm': 'ServiceNow', 'servicenow secops': 'ServiceNow',
  'panorama': 'Palo Alto Panorama/NGFW', 'palo alto panorama': 'Palo Alto Panorama/NGFW',
  'tenable': 'Tenable', 'qualys': 'Qualys VMDR', 'rapid7': 'Rapid7 InsightVM',
  'intune': 'Microsoft Intune', 'microsoft intune': 'Microsoft Intune',
  'sailpoint': 'SailPoint IdentityNow', 'okta': 'Okta', 'duo': 'Duo', 'cyberark': 'CyberArk',
  'wiz': 'Wiz', 'prisma cloud': 'Prisma Cloud', 'prisma access': 'Prisma Access',
  'purview': 'Microsoft Purview', 'microsoft purview': 'Microsoft Purview',
  'rubrik': 'Rubrik', 'veeam': 'Veeam', 'cohesity': 'Cohesity',
  'proofpoint': 'Proofpoint', 'mimecast': 'Mimecast', 'knowbe4': 'KnowBe4', 'cofense': 'Cofense',
  'github': 'GitHub Advanced Security', 'github advanced security': 'GitHub Advanced Security', 'gitlab': 'GitLab Security',
  'snyk': 'Snyk', 'veracode': 'Veracode', 'checkmarx': 'Checkmarx', 'jira': 'Jira Service Management',
  'archer': 'Archer', 'onetrust': 'OneTrust', 'logicgate': 'LogicGate', 'recorded future': 'Recorded Future',
  'sentinelone': 'SentinelOne Singularity', 'fortinet': 'Fortinet FortiManager/FortiGate',
  'cisco': 'Cisco Secure Firewall', 'zscaler': 'Zscaler', 'tanium': 'Tanium', 'nessus': 'Nessus',
  'varonis': 'Varonis', 'cyera': 'Cyera', 'symantec dlp': 'Symantec DLP', 'digital guardian': 'Digital Guardian',
  'azure key vault': 'Azure Key Vault', 'hashicorp vault': 'HashiCorp Vault',
};

// Generic capability tokens (not products) -> category.
const CATEGORY_TOKENS = {
  'waf': 'Network Firewall / SASE', 'dlp': 'DLP / Data Security', 'globalprotect': 'Network Firewall / SASE',
  'app-id': 'Network Firewall / SASE', 'app control': 'EDR / XDR', 'web': 'Email Security',
};

const norm = (s) => String(s || '').trim();
const low = (s) => norm(s).toLowerCase();

/**
 * resolve(token, ctx) -> { raw_token, match_type, tool_name?, category?, resolved }
 * ctx: { toolByLower: Map(lowername -> canonicalName), categories: Set }
 */
function resolve(token, ctx) {
  const raw = norm(token);
  const tl = low(token);
  if (!tl) return { raw_token: raw, resolved: false };

  if (ALIAS[tl]) {
    const name = ALIAS[tl];
    return { raw_token: raw, match_type: 'tool', tool_name: name, resolved: ctx.toolByLower.has(low(name)) };
  }
  if (ctx.toolByLower.has(tl)) {
    return { raw_token: raw, match_type: 'tool', tool_name: ctx.toolByLower.get(tl), resolved: true };
  }
  if (CATEGORY_TOKENS[tl]) {
    return { raw_token: raw, match_type: 'category', category: CATEGORY_TOKENS[tl], resolved: true };
  }
  // fuzzy: token is a substring of exactly one canonical tool name
  if (tl.length >= 4) {
    const hits = [];
    for (const [lname, cname] of ctx.toolByLower) {
      if (lname.includes(tl) || tl.includes(lname)) hits.push(cname);
    }
    const uniq = Array.from(new Set(hits));
    if (uniq.length === 1) return { raw_token: raw, match_type: 'tool', tool_name: uniq[0], resolved: true };
  }
  // direct category name
  if (ctx.categories.has(raw)) return { raw_token: raw, match_type: 'category', category: raw, resolved: true };
  return { raw_token: raw, resolved: false };
}

// Split a "Recommended_Tool_Categories_and_Tools" cell into tokens. Drops pure
// category descriptors (e.g. "IAM / SIEM") — those are handled by the row's
// settings tools[] and the per-control category.
function tokensFrom(cell) {
  return norm(cell).split(',').map(norm).filter(Boolean);
}

module.exports = { resolve, tokensFrom, ALIAS, CATEGORY_TOKENS };
