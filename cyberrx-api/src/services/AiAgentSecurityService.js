'use strict';

/**
 * AiAgentSecurityService — AI governance, the runtime-security layer.
 *
 *   guardrails(orgId)   per-system control posture vs. the OWASP Top 10 for LLM
 *                       Applications (2025) — assessed from the AI-BOM signals.
 *   agents(orgId)       least-privilege analysis for autonomous agents: the
 *                       tools / data / actions each can reach, human-approval on
 *                       high-impact actions, and a kill-switch.
 *   platformAiUse()     how CyberRX itself uses LLMs (a buyer-trust artifact).
 *
 * Everything is assessed deterministically from the inventory until a runtime
 * AI-gateway feed exists (that upgrade is the integration-layer workstream), so
 * provenance reads 'modeled' (real systems) or 'demo' (sample BOM) — never an
 * overstated 'live'.
 */

const AI = require('./AiInventoryService');
const { prov } = require('../utils/provenance');

const SENSITIVE = ['PHI', 'PCI', 'IP/Secrets', 'PII'];
const STATUS_SCORE = { in_place: 100, partial: 55, gap: 15, n_a: null };
const clamp = (n) => Math.max(5, Math.min(98, Math.round(n)));

// ---- D2: per-system guardrail posture (OWASP LLM Top 10, 2025) --------------
// Each control yields a status from the system's BOM signals. Where a control
// needs runtime evidence we can't yet pull, it scores 'partial' (transparent),
// never a fabricated pass.
const LLM_CONTROLS = [
  { id: 'LLM01', name: 'Prompt injection', f: (s) => (s.autonomy === 'Agentic' && !s.humanInLoop ? 'gap' : 'partial') },
  { id: 'LLM02', name: 'Sensitive information disclosure', f: (s) => (s.sensitive && s.external ? (s.sanctioned !== 'Sanctioned' ? 'gap' : 'partial') : 'in_place') },
  { id: 'LLM03', name: 'Supply chain (models / plugins)', f: (s) => (s.sanctioned === 'Shadow' ? 'gap' : s.sanctioned === 'Unreviewed' ? 'partial' : 'in_place') },
  { id: 'LLM04', name: 'Data & model poisoning', f: () => 'partial' },
  { id: 'LLM05', name: 'Improper output handling', f: (s) => (s.autonomy === 'Agentic' && !s.humanInLoop ? 'gap' : 'partial') },
  { id: 'LLM06', name: 'Excessive agency', f: (s) => (s.autonomy !== 'Agentic' ? 'n_a' : s.humanInLoop ? 'partial' : 'gap') },
  { id: 'LLM07', name: 'System-prompt leakage', f: () => 'partial' },
  { id: 'LLM08', name: 'Vector & embedding weaknesses', f: (s) => (s.sensitive ? 'partial' : 'n_a') },
  { id: 'LLM09', name: 'Misinformation / overreliance', f: (s) => (s.autonomy === 'Agentic' && !s.humanInLoop ? 'gap' : 'partial') },
  { id: 'LLM10', name: 'Unbounded consumption', f: (s) => (s.external && !s.owner ? 'gap' : 'partial') },
];

function guardrailFor(sys) {
  const s = { ...sys, sensitive: SENSITIVE.includes(sys.dataSensitivity), external: sys.hosting === 'External SaaS' };
  const controls = LLM_CONTROLS.map((c) => ({ id: c.id, name: c.name, status: c.f(s) }));
  const scored = controls.filter((c) => STATUS_SCORE[c.status] != null);
  const score = scored.length ? clamp(scored.reduce((a, c) => a + STATUS_SCORE[c.status], 0) / scored.length) : 60;
  const gaps = controls.filter((c) => c.status === 'gap');
  return { controls, score, gaps: gaps.map((g) => `${g.id} ${g.name}`) };
}

// A connected AI gateway (Azure OpenAI / LangSmith) provides runtime evidence,
// so guardrail/agent posture can be reported as 'live' rather than modeled.
async function aiGateway(orgId) {
  try { const s = await require('./IntegrationService').sourcesForOrg(orgId); return (s.ai_monitored && s.ai_monitored.fresh) ? s.ai_monitored : null; }
  catch (_) { return null; }
}

async function guardrails(orgId) {
  const inv = await AI.inventory(orgId);
  const isDemo = !!inv.demo;
  const gw = await aiGateway(orgId);
  const mode = gw ? 'live' : (isDemo ? 'demo' : 'modeled');
  const provSource = gw ? gw.source : 'Guardrail assessment';
  const systems = (inv.systems || []).map((s) => {
    const g = guardrailFor(s);
    return { id: s.id, name: s.name, systemType: s.systemType, autonomy: s.autonomy,
      score: g.score, controls: g.controls, gaps: g.gaps, provenance: prov(mode, provSource) };
  });
  const fleet = systems.length ? Math.round(systems.reduce((a, s) => a + s.score, 0) / systems.length) : null;
  // Worst control across the fleet, by gap count.
  const byControl = LLM_CONTROLS.map((c) => ({ id: c.id, name: c.name,
    gaps: systems.filter((s) => s.controls.find((x) => x.id === c.id && x.status === 'gap')).length }))
    .sort((a, b) => b.gaps - a.gaps);
  return { fleetScore: fleet, systems, worstControls: byControl.filter((c) => c.gaps > 0).slice(0, 5),
    provenance: prov(mode, provSource) };
}

// ---- D3: agent least-privilege ---------------------------------------------
// Use the captured agent detail when present; otherwise infer a plausible
// capability profile from the BOM signals so the view is populated honestly.
function inferAgent(s) {
  const a = s.agent || {};
  const tools = a.tools || inferTools(s);
  const dataScopes = a.dataScopes || (SENSITIVE.includes(s.dataSensitivity) ? [s.dataSensitivity] : ['Internal']);
  const actions = a.actions || ['read', 'summarize', ...(s.humanInLoop ? [] : ['act/close', 'write'])];
  const humanApprovalOn = a.humanApprovalOn || (s.humanInLoop ? ['act/close', 'write'] : []);
  const killSwitch = a.killSwitch != null ? a.killSwitch : false;
  return { tools, dataScopes, actions, humanApprovalOn, killSwitch };
}
function inferTools(s) {
  const p = String(s.purpose || '').toLowerCase();
  const t = [];
  if (/triage|alert|soc|ticket|close/.test(p)) t.push('Ticketing', 'SIEM query');
  if (/email|message|respond|notify/.test(p)) t.push('Email/Send');
  if (/code|repo|deploy/.test(p)) t.push('Code repo', 'CI/CD');
  if (/data|query|db|record/.test(p)) t.push('Database');
  return t.length ? t : ['LLM', 'Web/API'];
}

function agentRisk(s) {
  const cap = inferAgent(s);
  const highImpact = cap.actions.filter((x) => /act|close|write|delete|deploy|send|pay/.test(x));
  const unguarded = highImpact.filter((x) => !cap.humanApprovalOn.includes(x));
  const sensitive = cap.dataScopes.some((d) => SENSITIVE.includes(d));
  const flags = [];
  if (!s.humanInLoop) flags.push({ level: 'critical', text: 'No human in the loop' });
  if (unguarded.length) flags.push({ level: 'critical', text: `High-impact actions without approval: ${unguarded.join(', ')}` });
  if (!cap.killSwitch) flags.push({ level: 'high', text: 'No kill-switch / pause control' });
  if (sensitive) flags.push({ level: 'high', text: `Can reach sensitive data (${cap.dataScopes.filter((d) => SENSITIVE.includes(d)).join(', ')})` });
  if (cap.tools.length > 5) flags.push({ level: 'medium', text: `Broad tool access (${cap.tools.length} tools)` });
  let score = 100;
  score -= (s.humanInLoop ? 0 : 30) + unguarded.length * 14 + (cap.killSwitch ? 0 : 12) + (sensitive ? 12 : 0) + Math.max(0, cap.tools.length - 5) * 4;
  const level = flags.some((f) => f.level === 'critical') ? 'Critical' : flags.some((f) => f.level === 'high') ? 'High' : flags.length ? 'Medium' : 'Low';
  return { ...cap, highImpact, leastPrivilegeScore: clamp(score), flags, riskLevel: level };
}

async function agents(orgId) {
  const inv = await AI.inventory(orgId);
  const gw = await aiGateway(orgId);
  const mode = gw ? 'live' : (inv.demo ? 'demo' : 'modeled');
  const list = (inv.systems || []).filter((s) => s.autonomy === 'Agentic').map((s) => ({
    id: s.id, name: s.name, owner: s.owner, humanInLoop: s.humanInLoop, dataSensitivity: s.dataSensitivity,
    ...agentRisk(s), provenance: prov(mode, 'Agent least-privilege'),
  }));
  return {
    agents: list,
    counts: { total: list.length, critical: list.filter((a) => a.riskLevel === 'Critical').length,
      noHITL: list.filter((a) => !a.humanInLoop).length, noKillSwitch: list.filter((a) => !a.killSwitch).length },
    provenance: prov(mode, 'Agent least-privilege'),
  };
}

// ---- D6: how CyberRX itself uses LLMs (buyer-trust transparency) ------------
function platformAiUse() {
  const summaryModel = process.env.ANTHROPIC_SUMMARY_MODEL || 'claude-opus-4-8';
  const reviewModel = process.env.ANTHROPIC_REVIEW_MODEL || 'claude-haiku-4-5-20251001';
  return {
    statement: 'CyberRX uses LLMs as a governed, human-in-the-loop drafting aid — never as an unattended decision-maker.',
    uses: [
      { task: 'Executive summary drafting', model: summaryModel, humanReview: true, note: 'Generated as a DRAFT, stored for consultant review, and never auto-published.' },
      { task: 'Inventory / document extraction', model: reviewModel, humanReview: true, note: 'Structured extraction at temperature 0; falls back to deterministic parsing with no key.' },
    ],
    controls: [
      'Temperature 0 for extraction — deterministic, minimal variance.',
      'Human review before any AI-drafted content is published.',
      'Tenant data is processed transiently and is not used to train models.',
      'Every AI feature degrades to a deterministic, grounded fallback with no API key.',
      'No autonomous actions: the platform recommends; people decide and the decision is logged.',
    ],
    provenance: prov('live', 'CyberRX platform configuration'),
  };
}

module.exports = { guardrails, agents, platformAiUse, guardrailFor, agentRisk };
