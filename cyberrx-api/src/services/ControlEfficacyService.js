'use strict';

/**
 * ControlEfficacyService — Control Efficacy sub-tab (CISO).
 *
 * Enterprise principle: never an abstract control-health score. Every control is
 * tied to the RISK(S) IT REDUCES, and we flag "this control is degrading AND it's
 * what's holding back risk #N". Plus SOC performance (MTTD/MTTR) and a framework
 * overlay (base framework + active industry regulations) with a visible
 * compliance posture.
 *
 * Consumes the shared substrate: CisoDashboardService (control areas, domain
 * trend, thresholds/SOC), the decision spine (the risks/events controls reduce),
 * tenant config (base frameworks), and the industry profile (regulatory overlay).
 */

const logger = require('../utils/logger');

const clamp = (n) => Math.max(2, Math.min(100, Math.round(n)));
// control area → posture domain (for trend) and the risk keywords it reduces.
const CONTROL_DOMAIN = {
  priv_access: 'iam', mfa: 'iam', access_recert: 'iam', jml: 'iam',
  logging: 'detection', detection_eng: 'detection', email_sec: 'detection', ir_readiness: 'detection',
  edr: 'endpoint', vuln_remediation: 'vuln', patch: 'vuln', cloud_config: 'cloud',
  dlp: 'data', third_party_access: 'thirdparty', backup_restore: 'recovery',
  net_seg: 'network', appsec_testing: 'appsec', awareness: 'awareness',
};
const CONTROL_RISK_KW = {
  priv_access: /privileg|mfa|credential|access|domain compromise|lateral/i,
  mfa: /mfa|credential|phish|account|domain compromise/i,
  vuln_remediation: /unpatch|vuln|exploit|internet|kev|ransomware detonation|domain compromise/i,
  patch: /unpatch|vuln|patch|ransomware detonation/i,
  backup_restore: /ransom|backup|unrecoverable|recover/i,
  third_party_access: /vendor|third|supply|exfiltration \(third/i,
  logging: /detect|logging|dwell|ransom/i,
  detection_eng: /detect|lateral|ransom/i,
  edr: /ransom|endpoint|malware|detonation/i,
  cloud_config: /cloud|bucket|misconfig|exfiltration/i,
  dlp: /data|exfiltration|leak|phi|pii|shadow ai/i,
  ir_readiness: /ransom|incident|recover/i,
  net_seg: /lateral|network|pivot|movement/i,
  awareness: /phish|credential|email|social/i,
};

async function getEfficacy(orgId) {
  const [dash, decisions, cfg] = await Promise.all([
    require('./CisoDashboardService').getDashboard(orgId, 'CISO').catch(() => ({})),
    require('./DecisionEngineService').list(orgId, 'CISO').catch(() => ({ cards: [] })),
    require('./TenantConfigService').get(orgId).catch(() => ({ config: {} })),
  ]);
  const { prov } = require('../utils/provenance');
  const controlRisk = dash.controlRisk || [];
  // Effectiveness is computed from control risk contribution: 'derived' when the
  // org's own controls back it, 'demo' when we're on the sample set.
  const ctrlMode = ((dash.dataProvenance || {}).origins || {}).ControlArea === 'live' ? 'derived' : 'demo';
  const domainMatrix = dash.domainMatrix || [];
  const domTrend = {}; domainMatrix.forEach((d) => { domTrend[d.id] = d.trend; });
  const events = (decisions.cards || []).map((c) => ({ title: c.event.title, severity: c.event.severity }));

  const sevRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const link = (id) => {
    const re = CONTROL_RISK_KW[id]; if (!re) return [];
    return events.filter((e) => re.test(e.title)).sort((a, b) => sevRank[a.severity] - sevRank[b.severity]).slice(0, 3);
  };

  const controls = controlRisk.map((c) => {
    const dom = CONTROL_DOMAIN[c.id];
    const trend = domTrend[dom] || 'stable';
    const effectiveness = clamp(100 - (c.riskContribution || 0));
    const reduces = link(c.id);
    const weak = effectiveness < 45;
    const degrading = trend === 'deteriorating';
    const gatingTop = reduces[0] || null;
    const gating = !!(gatingTop && (gatingTop.severity === 'Critical' || gatingTop.severity === 'High'));
    return {
      id: c.id, name: c.name, csf: c.csf, cis: c.cis,
      effectiveness, riskContribution: c.riskContribution, trend, weak, degrading,
      reducesRisks: reduces, processAffected: c.processAffected, action: c.action, evidence: c.evidence,
      gating, gatingRisk: gatingTop,
      flag: gating && (weak || degrading) ? (degrading ? 'Degrading — gating' : 'Weak — gating') : null,
      provenance: prov(ctrlMode, 'Control efficacy model'),
    };
  }).sort((a, b) => ((b.flag ? 1 : 0) - (a.flag ? 1 : 0)) || ((b.riskContribution || 0) - (a.riskContribution || 0)));

  // SOC performance from thresholds.
  const thr = (dash.thresholds && dash.thresholds.rows) || [];
  const pick = (id) => thr.find((t) => t.id === id);
  const soc = ['mttd', 'mttr', 'triage_sla', 'edr_cov'].map((id) => pick(id)).filter(Boolean).map((t) => ({
    id: t.id, name: t.name, current: t.current, unit: t.unit, threshold: t.threshold, trend: t.trend,
    breach: t.status === 'Breach', severity: t.breachSeverity || null,
  }));

  // Framework overlay: base (tenant config) + active industry regulations.
  let overlays = [];
  try {
    const Industry = require('../data/industryProfiles');
    const db = require('../utils/db');
    let industry = 'generic';
    try { const r = await db.query('SELECT setup_json FROM orgs WHERE id=$1', [orgId]); industry = (r[0] && r[0].setup_json && r[0].setup_json.industry) || 'generic'; } catch (_) {}
    overlays = (Industry.getProfile(industry).regulations || []).map((name) => ({ name }));
  } catch (e) { logger.debug('overlay load failed', { error: e.message }); }
  const base = (cfg.config && cfg.config.frameworks) || ['nist_csf_2_0'];
  // Posture = CSF overall if available, else weighted control effectiveness.
  let posture = null;
  try { const a = await require('./NistCsfService').getAssessment(orgId); if (a && Number.isFinite(Number(a.overall))) posture = Math.round(Number(a.overall)); } catch (_) {}
  if (!Number.isFinite(posture)) posture = clamp(controls.reduce((s, c) => s + c.effectiveness, 0) / Math.max(1, controls.length));

  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    controls, soc,
    framework: { base, overlays, posture, postureBand: posture >= 80 ? 'Strong' : posture >= 60 ? 'Moderate' : posture >= 40 ? 'Weak' : 'Critical' },
    counts: { total: controls.length, flagged: controls.filter((c) => c.flag).length, linked: controls.filter((c) => c.reducesRisks.length).length },
  };
}

module.exports = { getEfficacy };
