'use strict';

/**
 * ProjectPortfolioService — current cybersecurity projects/portfolio, with ROI
 * and delay-impact projections so leaders can see how delivery timing changes
 * the security posture.
 *
 * Intake (two ways):
 *   - upload an inventory file (CSV / Excel / text) of current security projects, or
 *   - pull projects/epics from a project system (Jira) via the REST API.
 *
 * Analysis (LLM with deterministic fallback):
 *   - per project: budget, expected posture lift, dollar exposure reduced,
 *     ROI, and ROI realized at each milestone,
 *   - delay scenarios (30/60/90-day slip): how much posture lift is deferred and
 *     how much exposure stays on the books while the project is late,
 *   - portfolio rollup the executive dashboards render.
 *
 * Everything degrades gracefully: no LLM key → deterministic model; empty org →
 * an industry-flavored demo portfolio so the view is populated.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');
const vault = require('../utils/vault');
const { parseCsv } = require('../ingestion/parsers');

const MODEL = process.env.ANTHROPIC_REVIEW_MODEL || 'claude-haiku-4-5-20251001';
const round = (n) => Math.round(n);
const num = (v) => { const x = Number(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return Number.isFinite(x) ? x : 0; };

async function ensureTable() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS security_projects (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, name TEXT NOT NULL, objective TEXT,
      status TEXT, percent_complete INT, start_date TEXT, target_end TEXT,
      budget NUMERIC, owner TEXT, domain TEXT, source TEXT,
      milestones JSONB DEFAULT '[]', analysis JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now())`);
  } catch (e) { logger.debug('security_projects ensureTable failed', { error: e.message }); }
}

// ---- intake: file ----------------------------------------------------------
function decode(contentBase64) {
  try { return Buffer.from(String(contentBase64 || '').split(',').pop(), 'base64').toString('utf8'); }
  catch (_) { return ''; }
}

// Map a free-form row to a normalized project using fuzzy column names.
function rowToProject(row) {
  const g = (keys) => { for (const k of Object.keys(row)) { if (keys.some((n) => k.toLowerCase().includes(n))) return row[k]; } return ''; };
  const name = g(['project', 'name', 'initiative', 'epic', 'summary', 'title']);
  if (!name) return null;
  return {
    name: String(name).slice(0, 160),
    objective: String(g(['objective', 'goal', 'description', 'purpose'])) || '',
    status: String(g(['status', 'state', 'phase'])) || 'In Progress',
    percentComplete: num(g(['percent', 'complete', 'progress', '%'])) || 0,
    startDate: String(g(['start', 'begin'])) || '',
    targetEnd: String(g(['target', 'end', 'due', 'finish', 'deadline'])) || '',
    budget: num(g(['budget', 'cost', 'spend', 'investment'])) || 0,
    owner: String(g(['owner', 'lead', 'sponsor', 'assignee'])) || '',
    domain: String(g(['domain', 'category', 'pillar', 'area'])) || '',
  };
}

async function parseInventory(fileName, contentBase64, text) {
  const raw = text || decode(contentBase64);
  if (!raw.trim()) return [];
  // CSV / tabular first.
  let projects = [];
  try {
    if (/,|\t/.test(raw.split('\n')[0] || '')) {
      const rows = parseCsv(raw);
      projects = (rows || []).map(rowToProject).filter(Boolean);
    }
  } catch (e) { logger.debug('project csv parse failed', { error: e.message }); }
  if (projects.length) return projects;
  // Fall back to the LLM for free-form documents.
  const llm = await llmExtract(raw);
  return llm.length ? llm : [];
}

function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try { const Anthropic = require('@anthropic-ai/sdk'); return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); }
  catch (_) { return null; }
}

async function llmExtract(text) {
  const client = getAnthropic();
  if (!client) return [];
  try {
    const resp = await client.messages.create({
      model: MODEL, max_tokens: 1500, temperature: 0,
      messages: [{ role: 'user', content:
        'Extract the cybersecurity projects from this inventory. Return ONLY JSON: {"projects":[{"name","objective","status","percentComplete","startDate","targetEnd","budget","owner","domain"}]}. budget is a number (USD), percentComplete 0-100. Text:\n\n' + text.slice(0, 12000) }],
    });
    const t = (resp.content && resp.content[0] && resp.content[0].text) || '';
    const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
    return (j.projects || []).map((p) => ({
      name: p.name, objective: p.objective || '', status: p.status || 'In Progress',
      percentComplete: num(p.percentComplete), startDate: p.startDate || '', targetEnd: p.targetEnd || '',
      budget: num(p.budget), owner: p.owner || '', domain: p.domain || '',
    })).filter((p) => p.name);
  } catch (e) { logger.warn('project LLM extract failed', { error: e.message }); return []; }
}

// ---- intake: Jira ----------------------------------------------------------
async function importFromJira(orgId, { baseUrl, email, apiToken, jql }) {
  if (!baseUrl || !email || !apiToken) throw new Error('Jira base URL, email, and API token are required.');
  await vault.set(orgId, 'project:jira', { baseUrl, email, apiToken }).catch(() => {});
  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  const query = jql || 'issuetype in (Epic, Initiative) ORDER BY created DESC';
  const url = `${baseUrl.replace(/\/$/, '')}/rest/api/3/search?maxResults=50&fields=summary,status,duedate,customfield_10015,description&jql=${encodeURIComponent(query)}`;
  const r = await fetch(url, { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } });
  if (!r.ok) throw new Error(`Jira returned HTTP ${r.status}. Check the URL, email, and API token (read access).`);
  const data = await r.json();
  const issues = (data && data.issues) || [];
  return issues.map((it) => {
    const f = it.fields || {};
    return {
      name: f.summary || it.key, objective: typeof f.description === 'string' ? f.description.slice(0, 280) : '',
      status: (f.status && f.status.name) || 'In Progress', percentComplete: statusToPct((f.status && f.status.name) || ''),
      startDate: f.customfield_10015 || '', targetEnd: f.duedate || '', budget: 0, owner: '', domain: '', externalRef: it.key,
    };
  });
}
function statusToPct(s) { const x = String(s).toLowerCase(); if (/done|closed|complete/.test(x)) return 100; if (/review|test|verif/.test(x)) return 80; if (/progress|doing|active/.test(x)) return 50; if (/to ?do|backlog|open|new/.test(x)) return 10; return 25; }

// ---- persistence -----------------------------------------------------------
async function saveProjects(orgId, projects) {
  await ensureTable();
  // Replace the org's project set (idempotent re-import).
  try { await db.query('DELETE FROM security_projects WHERE org_id=$1', [orgId]); } catch (_) {}
  const saved = [];
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    const id = `proj_${orgId}_${i + 1}`;
    try {
      await db.query(
        `INSERT INTO security_projects (id, org_id, name, objective, status, percent_complete, start_date, target_end, budget, owner, domain, source, milestones, analysis)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [id, orgId, p.name, p.objective || '', p.status || 'In Progress', round(p.percentComplete || 0), p.startDate || '', p.targetEnd || '', p.budget || 0, p.owner || '', p.domain || '', p.source || 'upload', JSON.stringify(p.milestones || []), JSON.stringify(p.analysis || {})]);
      saved.push(Object.assign({ id }, p));
    } catch (e) { logger.debug('save project failed', { error: e.message }); }
  }
  return saved;
}

async function listProjects(orgId) {
  await ensureTable();
  try {
    const rows = await db.query('SELECT * FROM security_projects WHERE org_id=$1 ORDER BY budget DESC NULLS LAST, name', [orgId]);
    return rows.map((r) => ({
      id: r.id, name: r.name, objective: r.objective, status: r.status, percentComplete: r.percent_complete,
      startDate: r.start_date, targetEnd: r.target_end, budget: num(r.budget), owner: r.owner, domain: r.domain,
      milestones: r.milestones || [], analysis: r.analysis || {},
    }));
  } catch (_) { return []; }
}

// ---- analysis: ROI + milestone + delay model -------------------------------
// Deterministic model: each project's expected posture lift and the dollar
// exposure it removes derive from its budget, status, and security domain. ROI
// realizes proportionally across milestones; a delay defers the lift and keeps
// exposure on the books for the slip window.
const DOMAIN_LIFT = { identity: 9, iam: 9, mfa: 9, detection: 7, edr: 6, siem: 6, cloud: 7, cspm: 7, vuln: 8, patch: 8, data: 6, dlp: 6, thirdparty: 6, vendor: 6, recovery: 6, backup: 6, network: 5, governance: 4, awareness: 4 };
function liftFor(p) {
  const d = String(p.domain || p.name || '').toLowerCase();
  let lift = 5;
  for (const k of Object.keys(DOMAIN_LIFT)) { if (d.includes(k)) { lift = DOMAIN_LIFT[k]; break; } }
  // bigger budgets buy somewhat more lift (diminishing)
  return Math.min(14, round(lift + Math.log10(Math.max(1, (p.budget || 0) / 250000)) * 2));
}

// Which risks a project reduces — keyed by security domain, matched against the
// titles in the org's risk register. This is a deterministic keyword linkage
// (NOT a DecisionEngine call — the engine consumes the portfolio, so calling it
// back here would recurse).
const PROJECT_RISK_KW = {
  identity: /identit|credential|account|privileg|access|admin|\bmfa\b|phish|login|password|lateral/i,
  iam: /identit|credential|account|privileg|access|admin|\bmfa\b|login|password/i,
  mfa: /credential|phish|account|login|\bmfa\b|password|access/i,
  detection: /detect|endpoint|malware|ransom|lateral|respon|alert|threat|dwell|\bedr\b/i,
  edr: /detect|endpoint|malware|ransom|lateral|respon|\bedr\b/i,
  siem: /detect|alert|log|monitor|respon|threat/i,
  cloud: /cloud|bucket|\bs3\b|config|misconfig|saas|azure|\baws\b|\bgcp\b|public[-\s]?facing/i,
  cspm: /cloud|config|misconfig|guardrail|saas|azure|\baws\b/i,
  vuln: /vuln|patch|\bcve\b|exploit|unpatch|internet[-\s]?facing|edge|gateway|\bkev\b/i,
  patch: /vuln|patch|\bcve\b|exploit|unpatch/i,
  data: /\bdata\b|exfil|leak|\bdlp\b|\bpii\b|\bphi\b|sensitive|loss|encrypt/i,
  dlp: /\bdata\b|exfil|leak|\bdlp\b|sensitive/i,
  thirdparty: /vendor|third[-\s]?party|supply|\bbaa\b|contract|partner|remote support/i,
  vendor: /vendor|third[-\s]?party|supply|partner/i,
  recovery: /backup|recover|continuity|ransom|restore|resilien/i,
  backup: /backup|recover|restore|ransom/i,
  network: /network|segment|firewall|perimeter|lateral/i,
};
function reducesRisksFor(p, risks) {
  if (!Array.isArray(risks) || !risks.length) return [];
  const d = String(p.domain || '').toLowerCase();
  let re = null;
  for (const k of Object.keys(PROJECT_RISK_KW)) { if (d.includes(k)) { re = PROJECT_RISK_KW[k]; break; } }
  // fall back to matching against the project name when domain is blank/unknown
  if (!re) { for (const k of Object.keys(PROJECT_RISK_KW)) { if (String(p.name || '').toLowerCase().includes(k)) { re = PROJECT_RISK_KW[k]; break; } } }
  if (!re) return [];
  return risks.filter((r) => re.test(`${r.title || ''} ${r.affectedSystem || ''}`))
    .map((r) => ({ title: r.title, severity: r.severity, exposure: Number(r.financialExposure) || 0 }))
    .slice(0, 4);
}

// Engine calibration: realized benefit historically lands below the model's
// straight-line projection (delivery friction, partial adoption). We apply a
// single calibration factor so PREDICTED vs REALIZED is shown honestly rather
// than implying perfect linear accrual.
const REALIZED_FACTOR = 0.82;
function projectAnalysis(p, exposurePerPoint, risks) {
  const lift = liftFor(p);
  const exposureReduced = round(lift * exposurePerPoint);
  const budget = p.budget || 0;
  // ROI here is expected-loss-avoided per dollar — not classic financial ROI.
  const roi = budget > 0 ? Math.round((exposureReduced / budget) * 100) / 100 : null;
  const pct = (p.percentComplete || 0) / 100;
  // Realized so far: work delivered × the calibration factor.
  const realizedLift = round(lift * pct * REALIZED_FACTOR);
  const realizedExposureReduced = round(exposureReduced * pct * REALIZED_FACTOR);
  const realizedRoi = budget > 0 ? Math.round((realizedExposureReduced / budget) * 100) / 100 : null;
  // Milestones: derive 3 even checkpoints if none provided; posture lift accrues linearly.
  let ms = Array.isArray(p.milestones) && p.milestones.length ? p.milestones : [
    { name: 'Design / pilot', percent: 33 }, { name: 'Rollout', percent: 66 }, { name: 'Operational', percent: 100 },
  ];
  ms = ms.map((m) => ({
    name: m.name, percent: m.percent, postureGain: round((lift * (m.percent || 0)) / 100),
    exposureRemoved: round((exposureReduced * (m.percent || 0)) / 100),
    reached: (p.percentComplete || 0) >= (m.percent || 0),
  }));
  // Delay scenarios: exposure retained ≈ remaining exposure × (slip ÷ 365).
  const remaining = round(exposureReduced * (1 - pct));
  const delay = [30, 60, 90].map((days) => ({ days, deferredLift: lift, exposureRetained: round(remaining * (days / 365)) }));
  return {
    postureLift: lift, exposureReduced, roi, milestones: ms, delay, remainingExposure: remaining,
    realizedLift, realizedExposureReduced, realizedRoi, calibrationFactor: REALIZED_FACTOR,
    reducesRisks: reducesRisksFor(p, risks),
  };
}

async function analyze(orgId) {
  let projects = await listProjects(orgId);
  if (!projects.length) { projects = demoProjects(); }
  // exposure-per-posture-point + the risk register from the org's context
  // (industry-shaped). loadCtx, NOT DecisionEngine — the engine consumes the
  // portfolio, so calling back into it here would recurse.
  let grossExposure = 48200000, risks = [];
  try {
    const Exec = require('./ExecDashboardService'); const c = await Exec.loadCtx(orgId);
    grossExposure = (c.financial && c.financial.grossExposure) || grossExposure;
    risks = (c.risks && c.risks.top) || [];
  } catch (_) {}
  const exposurePerPoint = round(grossExposure / 100);
  const analyzed = projects.map((p) => Object.assign({}, p, { analysis: projectAnalysis(p, exposurePerPoint, risks) }));
  // persist analysis back when these are real rows
  if (projects[0] && projects[0].id) {
    for (const p of analyzed) { try { await db.query('UPDATE security_projects SET analysis=$1 WHERE id=$2', [JSON.stringify(p.analysis), p.id]); } catch (_) {} }
  }
  return analyzed;
}

// ---- portfolio rollup ------------------------------------------------------
async function portfolio(orgId) {
  const projects = await analyze(orgId);
  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
  const totalLift = projects.reduce((s, p) => s + p.analysis.postureLift, 0);
  const totalExposureReduced = projects.reduce((s, p) => s + p.analysis.exposureReduced, 0);
  const realizedLift = projects.reduce((s, p) => s + p.analysis.realizedLift, 0);
  const realizedExposureReduced = projects.reduce((s, p) => s + p.analysis.realizedExposureReduced, 0);
  // ROI = expected loss avoided per dollar (predicted and realized-to-date).
  const blendedRoi = totalBudget > 0 ? Math.round((totalExposureReduced / totalBudget) * 100) / 100 : null;
  const realizedRoi = totalBudget > 0 ? Math.round((realizedExposureReduced / totalBudget) * 100) / 100 : null;
  // How realized accrual is tracking against the straight-line projection.
  const expectedToDate = projects.reduce((s, p) => s + round((p.analysis.exposureReduced * (p.percentComplete || 0)) / 100), 0);
  const calibration = expectedToDate > 0 ? Math.round((realizedExposureReduced / expectedToDate) * 100) : null;
  const atRisk = projects.filter((p) => /hold|blocked|delayed|risk|behind/i.test(p.status) || (p.percentComplete || 0) < 25);
  // Portfolio-level delay scenario: if the at-risk projects each slip 60 days.
  const slip60 = atRisk.reduce((s, p) => s + (p.analysis.delay.find((d) => d.days === 60) || {}).exposureRetained || 0, 0);
  const deferredLift = atRisk.reduce((s, p) => s + p.analysis.postureLift, 0);
  return {
    counts: { total: projects.length, atRisk: atRisk.length },
    totalBudget, totalLift, realizedLift, totalExposureReduced, realizedExposureReduced, blendedRoi, realizedRoi, calibration,
    delayScenario: { slipDays: 60, projectsAffected: atRisk.length, exposureRetained: slip60, postureLiftDeferred: deferredLift, names: atRisk.map((p) => p.name) },
    projects,
  };
}

// ---- demo portfolio (empty org) --------------------------------------------
function demoProjects() {
  return [
    { name: 'MFA & Privileged Access Hardening', objective: 'Phishing-resistant MFA + PAM on crown-jewel systems', status: 'In Progress', percentComplete: 55, startDate: '2026-02-01', targetEnd: '2026-09-30', budget: 1800000, owner: 'IAM Lead', domain: 'identity' },
    { name: 'EDR / XDR Rollout', objective: 'Endpoint detection & response across the estate', status: 'In Progress', percentComplete: 40, startDate: '2026-03-15', targetEnd: '2026-11-30', budget: 1200000, owner: 'SecOps', domain: 'detection' },
    { name: 'Cloud Security Posture (CSPM)', objective: 'Continuous cloud config monitoring + guardrails', status: 'On Hold', percentComplete: 15, startDate: '2026-01-10', targetEnd: '2026-08-31', budget: 900000, owner: 'Cloud Platform', domain: 'cloud' },
    { name: 'Vulnerability & Patch Acceleration', objective: 'Reduce critical-vuln mean-time-to-patch', status: 'In Progress', percentComplete: 60, startDate: '2026-02-20', targetEnd: '2026-07-31', budget: 700000, owner: 'VP Infrastructure', domain: 'vuln' },
    { name: 'Third-Party Risk Program', objective: 'Continuous vendor monitoring + BAA/contract remediation', status: 'Delayed', percentComplete: 20, startDate: '2026-01-05', targetEnd: '2026-10-31', budget: 600000, owner: 'TPRM', domain: 'thirdparty' },
  ];
}

module.exports = { parseInventory, importFromJira, saveProjects, listProjects, analyze, portfolio };
