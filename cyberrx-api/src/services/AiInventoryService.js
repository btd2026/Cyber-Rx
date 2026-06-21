'use strict';

/**
 * AiInventoryService — AI governance, Phase 1: the AI-BOM (AI bill of materials).
 *
 * Collects every AI/ML system the organization uses or builds — including
 * agents and shadow (unsanctioned) AI — so leaders can govern AI usage and the
 * data it touches. This is the spine the AI control assessment and AI
 * decision-intelligence (Phases 2 & 3) hang off.
 *
 * Intake: upload an inventory file (CSV/Excel/text; LLM extraction for free
 * form) or add systems manually (incl. shadow-AI sightings).
 *
 * Each AI system captures: type, provider/model, hosting, the data it touches,
 * autonomy level, human-in-the-loop, owner, and whether it is sanctioned. From
 * those we derive governance/risk flags (sensitive data to external models,
 * agentic-without-oversight, shadow AI on sensitive data, ungoverned) and an
 * AI-governance posture rollup.
 *
 * Degrades gracefully: no LLM → CSV/heuristic; empty org → demo AI-BOM.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');
const { parseCsv } = require('../ingestion/parsers');
const { prov } = require('../utils/provenance');

const MODEL = process.env.ANTHROPIC_REVIEW_MODEL || 'claude-haiku-4-5-20251001';
const lc = (v) => String(v == null ? '' : v).toLowerCase();

async function ensureTable() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS ai_systems (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, name TEXT NOT NULL, system_type TEXT,
      provider TEXT, model TEXT, hosting TEXT, data_sensitivity TEXT, autonomy TEXT,
      human_in_loop BOOLEAN, owner TEXT, sanctioned TEXT, purpose TEXT, source TEXT,
      agent_json JSONB, created_at TIMESTAMPTZ DEFAULT now())`);
    try { await db.query('ALTER TABLE ai_systems ADD COLUMN IF NOT EXISTS agent_json JSONB'); } catch (_) {}
  } catch (e) { logger.debug('ai_systems ensureTable failed', { error: e.message }); }
}

function decode(b64) { try { return Buffer.from(String(b64 || '').split(',').pop(), 'base64').toString('utf8'); } catch (_) { return ''; } }

// Normalize a tabular row using fuzzy column names.
function rowToSystem(row) {
  const g = (keys) => { for (const k of Object.keys(row)) { if (keys.some((n) => k.toLowerCase().includes(n))) return row[k]; } return ''; };
  const name = g(['name', 'system', 'application', 'tool', 'ai', 'model name']);
  if (!name) return null;
  return normalize({
    name, systemType: g(['type', 'category', 'kind']), provider: g(['provider', 'vendor', 'platform']),
    model: g(['model', 'engine', 'llm']), hosting: g(['hosting', 'deployment', 'host']),
    dataSensitivity: g(['data', 'sensitivity', 'classification']), autonomy: g(['autonomy', 'mode', 'agent']),
    humanInLoop: g(['human', 'hitl', 'oversight', 'review']), owner: g(['owner', 'lead', 'sponsor']),
    sanctioned: g(['sanction', 'approved', 'status', 'shadow']), purpose: g(['purpose', 'use', 'description', 'objective']),
  });
}

// Coerce free values into the controlled vocab the rollup/flagging relies on.
function normalize(s) {
  const t = lc(s.systemType);
  const systemType = /agent/.test(t) ? 'Agent' : /model|ml/.test(t) ? 'ML Model' : /feature|embed/.test(t) ? 'Embedded GenAI' : 'LLM Application';
  const ds = lc(s.dataSensitivity);
  const dataSensitivity = /phi|health/.test(ds) ? 'PHI' : /pci|card/.test(ds) ? 'PCI' : /ip|source|secret|trade/.test(ds) ? 'IP/Secrets' : /pii|personal|customer/.test(ds) ? 'PII' : /public|none/.test(ds) ? 'Public/None' : (ds ? 'PII' : 'Unknown');
  const au = lc(s.autonomy);
  const autonomy = /agent|autonom|act/.test(au) ? 'Agentic' : /copilot|assist/.test(au) ? 'Copilot' : 'Assistive';
  const ho = lc(s.hosting);
  const hosting = /self|on-?prem|private|internal/.test(ho) ? 'Self-hosted' : 'External SaaS';
  const sa = lc(s.sanctioned);
  const sanctioned = /shadow|unsanction|unapproved|unknown/.test(sa) ? 'Shadow' : /sanction|approved|yes/.test(sa) ? 'Sanctioned' : (s.sanctioned ? 'Sanctioned' : 'Unreviewed');
  const hil = lc(s.humanInLoop);
  const humanInLoop = /y|true|1/.test(hil) ? true : /n|false|0/.test(hil) ? false : autonomy !== 'Agentic';
  const arr = (v) => (Array.isArray(v) ? v : String(v == null ? '' : v).split(/[,;|]/).map((x) => x.trim()).filter(Boolean));
  const hasAgent = s.tools || s.dataScopes || s.actions || s.humanApprovalOn || s.killSwitch != null;
  const agent = hasAgent
    ? { tools: arr(s.tools), dataScopes: arr(s.dataScopes), actions: arr(s.actions), humanApprovalOn: arr(s.humanApprovalOn), killSwitch: /y|true|1/.test(lc(s.killSwitch)) }
    : null;
  return {
    name: String(s.name).slice(0, 160), systemType, provider: s.provider || '', model: s.model || '',
    hosting, dataSensitivity, autonomy, humanInLoop, owner: s.owner || '', sanctioned, purpose: s.purpose || '', agent,
  };
}

function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try { const Anthropic = require('@anthropic-ai/sdk'); return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); } catch (_) { return null; }
}

async function llmExtract(text) {
  const client = getAnthropic(); if (!client) return [];
  try {
    const { fence, GUIDANCE } = require('./llmSafety');
    const doc = fence(text.slice(0, 12000), 'DOCUMENT');
    const resp = await client.messages.create({
      model: MODEL, max_tokens: 1600, temperature: 0,
      system: `You extract AI/ML system inventories from documents. ${GUIDANCE}`,
      messages: [{ role: 'user', content:
        'Extract every AI/ML system (LLM apps, GenAI features, ML models, AI agents, AI features inside SaaS) from the document below. Return ONLY JSON: {"systems":[{"name","systemType","provider","model","hosting","dataSensitivity","autonomy","humanInLoop","owner","sanctioned","purpose"}]}. autonomy is Assistive|Copilot|Agentic; dataSensitivity is the most sensitive data it touches; sanctioned is Sanctioned|Shadow|Unreviewed.\n\n' + doc.block }],
    });
    const t = (resp.content && resp.content[0] && resp.content[0].text) || '';
    const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
    return (j.systems || []).map(normalize).filter((s) => s.name);
  } catch (e) { logger.warn('ai inventory LLM extract failed', { error: e.message }); return []; }
}

async function parseInventory(fileName, contentBase64, text) {
  const raw = text || decode(contentBase64);
  if (!raw.trim()) return [];
  let systems = [];
  try { if (/,|\t/.test(raw.split('\n')[0] || '')) { systems = (parseCsv(raw) || []).map(rowToSystem).filter(Boolean); } }
  catch (e) { logger.debug('ai csv parse failed', { error: e.message }); }
  if (systems.length) return systems;
  return await llmExtract(raw);
}

async function saveSystems(orgId, systems, { replace = true } = {}) {
  await ensureTable();
  if (replace) { try { await db.query('DELETE FROM ai_systems WHERE org_id=$1', [orgId]); } catch (_) {} }
  const saved = [];
  let base = 0;
  if (!replace) { try { const c = await db.query('SELECT COUNT(*)::int n FROM ai_systems WHERE org_id=$1', [orgId]); base = (c[0] && c[0].n) || 0; } catch (_) {} }
  for (let i = 0; i < systems.length; i++) {
    const s = systems[i]; const id = `ai_${orgId}_${base + i + 1}`;
    try {
      await db.query(
        `INSERT INTO ai_systems (id, org_id, name, system_type, provider, model, hosting, data_sensitivity, autonomy, human_in_loop, owner, sanctioned, purpose, source, agent_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [id, orgId, s.name, s.systemType, s.provider, s.model, s.hosting, s.dataSensitivity, s.autonomy, !!s.humanInLoop, s.owner, s.sanctioned, s.purpose, s.source || 'upload', s.agent ? JSON.stringify(s.agent) : null]);
      saved.push(Object.assign({ id }, s));
    } catch (e) { logger.debug('save ai system failed', { error: e.message }); }
  }
  return saved;
}

async function listSystems(orgId) {
  await ensureTable();
  try {
    const rows = await db.query('SELECT * FROM ai_systems WHERE org_id=$1 ORDER BY created_at', [orgId]);
    return rows.map((r) => ({
      id: r.id, name: r.name, systemType: r.system_type, provider: r.provider, model: r.model, hosting: r.hosting,
      dataSensitivity: r.data_sensitivity, autonomy: r.autonomy, humanInLoop: r.human_in_loop, owner: r.owner,
      sanctioned: r.sanctioned, purpose: r.purpose,
      agent: r.agent_json ? (typeof r.agent_json === 'string' ? JSON.parse(r.agent_json) : r.agent_json) : null,
    }));
  } catch (_) { return []; }
}

// ---- governance flags + posture -------------------------------------------
const SENSITIVE = ['PHI', 'PCI', 'IP/Secrets', 'PII'];
function flagsFor(s) {
  const sensitive = SENSITIVE.includes(s.dataSensitivity);
  const external = s.hosting === 'External SaaS';
  const flags = [];
  if (s.sanctioned === 'Shadow' && sensitive) flags.push({ level: 'critical', text: 'Shadow AI processing sensitive data' });
  else if (s.sanctioned === 'Shadow') flags.push({ level: 'high', text: 'Unsanctioned (shadow) AI in use' });
  if (s.autonomy === 'Agentic' && !s.humanInLoop) flags.push({ level: 'critical', text: 'Autonomous agent with no human in the loop' });
  if (sensitive && external) flags.push({ level: 'high', text: `${s.dataSensitivity} sent to an external model` });
  if (!s.owner) flags.push({ level: 'medium', text: 'No accountable owner' });
  if (s.sanctioned === 'Unreviewed') flags.push({ level: 'medium', text: 'Not yet reviewed/approved' });
  const level = flags.some((f) => f.level === 'critical') ? 'Critical' : flags.some((f) => f.level === 'high') ? 'High' : flags.length ? 'Medium' : 'Low';
  return { flags, riskLevel: level };
}

async function inventory(orgId) {
  let systems = await listSystems(orgId);
  let isDemo = false;
  if (!systems.length) { systems = demoSystems(); isDemo = true; }
  const enriched = systems.map((s) => Object.assign({}, s, flagsFor(s), { provenance: prov(isDemo ? 'demo' : 'live', 'AI inventory') }));
  const by = (k) => enriched.reduce((m, s) => { const v = s[k] || 'Unknown'; m[v] = (m[v] || 0) + 1; return m; }, {});
  const shadow = enriched.filter((s) => s.sanctioned === 'Shadow');
  const agentic = enriched.filter((s) => s.autonomy === 'Agentic');
  const sensitiveExternal = enriched.filter((s) => SENSITIVE.includes(s.dataSensitivity) && s.hosting === 'External SaaS');
  const ungoverned = enriched.filter((s) => !s.owner || s.sanctioned !== 'Sanctioned');
  const critical = enriched.filter((s) => s.riskLevel === 'Critical');
  // Governance posture: start at 100, dock for ungoverned, shadow-sensitive, agentic-no-HITL.
  let score = 100;
  score -= shadow.length * 8 + sensitiveExternal.length * 4 + agentic.filter((s) => !s.humanInLoop).length * 10 + ungoverned.length * 3;
  score = Math.max(20, Math.min(98, Math.round(score)));
  return {
    counts: {
      total: enriched.length, shadow: shadow.length, agentic: agentic.length,
      sensitiveExternal: sensitiveExternal.length, ungoverned: ungoverned.length, critical: critical.length,
    },
    byType: by('systemType'), bySanctioned: by('sanctioned'), byDataSensitivity: by('dataSensitivity'),
    governanceScore: score,
    demo: isDemo,
    provenance: prov(isDemo ? 'demo' : 'live', 'AI inventory'),
    systems: enriched,
  };
}

// ---- demo AI-BOM (empty org) ----------------------------------------------
function demoSystems() {
  return [
    { name: 'Member-services GenAI assistant', systemType: 'LLM Application', provider: 'Cloud LLM', model: 'hosted LLM', hosting: 'External SaaS', dataSensitivity: 'PHI', autonomy: 'Copilot', humanInLoop: true, owner: 'VP Member Svcs', sanctioned: 'Sanctioned', purpose: 'Drafts member responses from policy/PHI context' },
    { name: 'Claims triage ML model', systemType: 'ML Model', provider: 'In-house', model: 'gradient-boost', hosting: 'Self-hosted', dataSensitivity: 'PHI', autonomy: 'Assistive', humanInLoop: true, owner: 'Data Science', sanctioned: 'Sanctioned', purpose: 'Prioritizes claims for adjudication' },
    { name: 'Marketing team using public ChatGPT', systemType: 'LLM Application', provider: 'OpenAI', model: 'GPT', hosting: 'External SaaS', dataSensitivity: 'PII', autonomy: 'Assistive', humanInLoop: true, owner: '', sanctioned: 'Shadow', purpose: 'Ad copy and customer email drafting (unsanctioned)' },
    { name: 'Engineering coding copilot', systemType: 'Embedded GenAI', provider: 'Code AI', model: 'code LLM', hosting: 'External SaaS', dataSensitivity: 'IP/Secrets', autonomy: 'Copilot', humanInLoop: true, owner: 'VP Engineering', sanctioned: 'Unreviewed', purpose: 'Code completion across source repos' },
    { name: 'Autonomous SOC triage agent', systemType: 'Agent', provider: 'SecOps platform', model: 'agentic LLM', hosting: 'Self-hosted', dataSensitivity: 'PII', autonomy: 'Agentic', humanInLoop: false, owner: 'SecOps', sanctioned: 'Sanctioned', purpose: 'Auto-triages and closes low-severity alerts' },
  ];
}

module.exports = { parseInventory, saveSystems, listSystems, inventory, flagsFor };
