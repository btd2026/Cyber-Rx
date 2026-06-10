'use strict';

/**
 * ExecutiveAgentService
 * ---------------------
 * The CyberRX AI agent layer.
 *
 * Product vision (from the deck):
 *   "Attacks move at machine speed. CyberRX deploys AI agents that continuously
 *    read your security stack and deliver each executive the live, role-specific
 *    intelligence they need to act."
 *
 * One dedicated agent per executive persona. Each agent:
 *   1. Reads the organization's primary sources directly (risks, findings,
 *      financial impacts, legal obligations, threat scenarios, controls,
 *      business processes, vendor signals, remediation tasks) — no manual
 *      reporting, no data exports.
 *   2. Synthesizes a single role-specific brief that answers the one question
 *      that executive owns.
 *   3. Persists the brief so it is always "live" and continuously refreshed.
 *
 * When ANTHROPIC_API_KEY is configured the synthesis is performed by Claude
 * (claude-opus-4-8). When it is not (e.g. a local/demo deployment) the agent
 * falls back to a deterministic synthesis computed from the same primary-source
 * data, so the feature always works.
 */

const crypto = require('crypto');
const db = require('../utils/db');
const logger = require('../utils/logger');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

// Lazily resolve the Anthropic SDK so the deterministic path keeps working even
// if the dependency is not installed in this environment.
let AnthropicSDK = null;
let anthropicClient = null;
function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (anthropicClient) return anthropicClient;
  try {
    if (!AnthropicSDK) AnthropicSDK = require('@anthropic-ai/sdk');
    const Anthropic = AnthropicSDK.default || AnthropicSDK;
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return anthropicClient;
  } catch (err) {
    logger.warn('Anthropic SDK unavailable, using deterministic agent synthesis', { error: err.message });
    return null;
  }
}

function aiEnabled() {
  return !!getAnthropicClient();
}

// ---------------------------------------------------------------------------
// Role definitions — the six executive personas and the question each one owns.
// ---------------------------------------------------------------------------
const ROLES = {
  CFO: {
    question: 'What is our actual financial exposure from cyber risk?',
    deliverable: 'Financial exposure brief',
    persona:
      'You are the CFO\'s dedicated cyber-risk agent at a healthcare payer. You speak the language of operating margin, claims reserves, capital adequacy, and insurance coverage. You quantify cyber risk in dollars, defensibly.',
  },
  CRO: {
    question: 'Are we operating within the risk appetite the board approved?',
    deliverable: 'Board appetite status',
    persona:
      'You are the CRO\'s dedicated cyber-risk agent. You score every active risk against board-approved thresholds, surface appetite breaches immediately, and ensure every breach has an assigned owner.',
  },
  CLO: {
    question: 'What is our legal and regulatory exposure if a cyber incident occurs tomorrow?',
    deliverable: 'Live vendor & legal alerts',
    persona:
      'You are the CLO/General Counsel\'s dedicated cyber-risk agent. You maintain a live map of regulatory exposure — HIPAA, state breach laws, CMS, and vendor contract liability — and flag which obligations are triggered by active threats.',
  },
  CIO: {
    question: 'Are my security investments reducing operational risk — or just adding more tools?',
    deliverable: 'Technology decision queue',
    persona:
      'You are the CIO\'s dedicated technology-risk agent. You monitor every system dependency, map threats to claims, billing, clearinghouse, and member-portal systems, and quantify operational impact before the call comes in.',
  },
  CISO: {
    question: 'Which attack pathways threaten our critical business processes — and what does each one cost us?',
    deliverable: 'Unified executive action plan',
    persona:
      'You are the CISO\'s dedicated agent. You map active attack pathways to critical business processes — claims, billing, member portal, clearinghouse — scoring each by likelihood, blast radius, and financial exposure, and you translate that into executive language.',
  },
  Board: {
    question: 'Are we at risk, are we getting better, and are we spending the right amount on cybersecurity?',
    deliverable: 'Governance readiness',
    persona:
      'You are the Board\'s independent cyber-risk agent. You answer three questions plainly: financial exposure in dollars, whether risk posture is improving over time, and whether investment is matched to actual exposure.',
  },
};

const ROLE_KEYS = Object.keys(ROLES);

// Relevant questions each executive can ask their agent (surfaced as prompts).
const SUGGESTED_QUESTIONS = {
  CFO: [
    'What is our total cyber financial exposure right now?',
    'How much of our exposure is covered by insurance?',
    'Which risks carry the largest dollar exposure?',
    'What would a significant PHI breach cost us?',
    'What is the ROI on our security spending?',
    'How does cyber risk affect our RBC capital position?',
  ],
  CRO: [
    'Are we operating within the board-approved risk appetite?',
    'Which risks are breaching our thresholds?',
    'Which open risks still lack an assigned owner?',
    'What is our aggregate quantified risk exposure?',
    'How many critical and high risks are open?',
    'Which KRIs are currently out of tolerance?',
  ],
  CLO: [
    'What regulatory obligations are triggered by our active risks?',
    'If we had a breach tomorrow, who must we notify and by when?',
    'What is our maximum regulatory penalty exposure?',
    'Which vendors create the most contractual or legal risk?',
    'Which risks carry HIPAA or CMS obligations?',
    'What is our overall legal risk level?',
  ],
  CIO: [
    'Which systems are most at risk right now?',
    'What technology is end-of-life or unsupported?',
    'Where are our worst unpatched vulnerabilities?',
    'Which remediation tasks are overdue?',
    'Are our security investments reducing operational risk?',
    'Which crown-jewel processes are exposed?',
  ],
  CISO: [
    'Which attack pathways threaten our critical processes?',
    'What is our overall security posture?',
    'Which controls are least effective?',
    'What are our top open critical findings?',
    'Where should we prioritize remediation?',
    'What is the financial exposure of our top threats?',
  ],
  Board: [
    'Are we at risk right now?',
    'Is our cyber risk posture improving?',
    'Are we spending the right amount on cybersecurity?',
    'What is our net financial exposure?',
    'Are we within the risk appetite we approved?',
    'Is our cyber insurance adequate?',
  ],
};

function getSuggestedQuestions(role) {
  return SUGGESTED_QUESTIONS[role] || [];
}

function isValidRole(role) {
  return ROLE_KEYS.includes(role);
}

// ---------------------------------------------------------------------------
// Primary-source data gathering. Each query is defensive: a missing table or
// column degrades to empty data rather than failing the whole brief.
// ---------------------------------------------------------------------------
async function safeRows(sql, params = []) {
  try {
    return await db.query(sql, params);
  } catch (err) {
    logger.debug('ExecutiveAgent query degraded', { error: err.message });
    return [];
  }
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

async function gatherContext(orgId) {
  const [
    finImpacts,
    riskExposure,
    riskBySeverity,
    riskByStatus,
    topRisks,
    legalTotal,
    legalTriggered,
    threats,
    controlStats,
    processes,
    processesAtRisk,
    taskStats,
    overdueTasks,
    repeatFindings,
    openCriticalFindings,
    vendorSignals,
  ] = await Promise.all([
    safeRows(
      `SELECT COALESCE(SUM(total_gross),0) gross, COALESCE(SUM(net_exposure),0) net,
              COALESCE(SUM(insurance_coverage),0) insured, COUNT(*) n
         FROM financial_impacts WHERE organization_id=$1`, [orgId]),
    safeRows(
      `SELECT COALESCE(SUM(financial_exposure),0) exposure, COALESCE(SUM(cost_to_remediate),0) remediate
         FROM risks WHERE organization_id=$1 AND status IN ('open','mitigating')`, [orgId]),
    safeRows(
      `SELECT severity, COUNT(*) n FROM risks
         WHERE organization_id=$1 AND status IN ('open','mitigating')
         GROUP BY severity`, [orgId]),
    safeRows(
      `SELECT status, COUNT(*) n FROM risks WHERE organization_id=$1 GROUP BY status`, [orgId]),
    safeRows(
      `SELECT id, title, severity, status, financial_exposure, executive_owner, remediation_owner,
              regulatory_citation, business_process_ids
         FROM risks
         WHERE organization_id=$1 AND status IN ('open','mitigating')
         ORDER BY CASE severity WHEN 'Critical' THEN 0 WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,
                  COALESCE(financial_exposure,0) DESC
         LIMIT 8`, [orgId]),
    safeRows(`SELECT COUNT(*) n FROM legal_obligations WHERE organization_id=$1`, [orgId]),
    safeRows(
      `SELECT DISTINCT lo.id, lo.name, lo.source, lo.citation, lo.notification_timeline, lo.max_penalty_amount
         FROM legal_obligations lo
         JOIN risks r ON r.organization_id = lo.organization_id
          AND r.status IN ('open','mitigating')
          AND r.legal_obligation_ids @> to_jsonb(lo.id)
        WHERE lo.organization_id=$1
        LIMIT 12`, [orgId]),
    safeRows(
      `SELECT id, name, type, probability, impact_level, mitre_tactic
         FROM threat_scenarios WHERE organization_id=$1
         ORDER BY COALESCE(probability,0) DESC LIMIT 8`, [orgId]),
    safeRows(
      `SELECT COUNT(*) n,
              COALESCE(ROUND(AVG(effectiveness_score)),0) avg_eff,
              COUNT(*) FILTER (WHERE implementation_status='Implemented') implemented,
              COUNT(*) FILTER (WHERE implementation_status='None') none_impl
         FROM controls WHERE organization_id=$1`, [orgId]),
    safeRows(
      `SELECT criticality, COUNT(*) n FROM business_processes
         WHERE organization_id=$1 GROUP BY criticality`, [orgId]),
    safeRows(
      `SELECT DISTINCT bp.id, bp.name, bp.tier, bp.criticality, bp.owner
         FROM business_processes bp
         JOIN risks r ON r.organization_id = bp.organization_id
          AND r.status IN ('open','mitigating')
          AND r.business_process_ids @> to_jsonb(bp.id)
        WHERE bp.organization_id=$1
        LIMIT 12`, [orgId]),
    safeRows(
      `SELECT status, COUNT(*) n FROM remediation_tasks WHERE organization_id=$1 GROUP BY status`, [orgId]),
    safeRows(
      `SELECT COUNT(*) n FROM remediation_tasks
         WHERE organization_id=$1 AND status NOT IN ('Completed','Verified','Cancelled')
           AND target_date IS NOT NULL AND target_date < NOW()`, [orgId]),
    safeRows(
      `SELECT COUNT(*) n FROM findings WHERE organization_id=$1 AND is_repeat=true`, [orgId]),
    safeRows(
      `SELECT id, title, severity, discovered_date FROM findings
         WHERE organization_id=$1 AND severity IN ('Critical','High') AND status IN ('open','in_progress')
         ORDER BY discovered_date DESC LIMIT 8`, [orgId]),
    safeRows(
      `SELECT severity, COUNT(*) n FROM vendor_risk_signals
         WHERE organization_id=$1 AND status='active' GROUP BY severity`, [orgId]),
  ]);

  const fin = finImpacts[0] || {};
  const riskExp = riskExposure[0] || {};
  const ctrl = controlStats[0] || {};

  const sevMap = {};
  riskBySeverity.forEach((r) => { sevMap[r.severity] = n(r.n); });
  const statusMap = {};
  riskByStatus.forEach((r) => { statusMap[r.status] = n(r.n); });
  const taskMap = {};
  taskStats.forEach((r) => { taskMap[r.status] = n(r.n); });
  const procMap = {};
  processes.forEach((r) => { procMap[r.criticality] = n(r.n); });
  const vendorSev = {};
  vendorSignals.forEach((r) => { vendorSev[r.severity] = n(r.n); });

  const grossExposure = n(fin.gross) || n(riskExp.exposure);
  const netExposure = n(fin.net) || Math.max(0, grossExposure - n(fin.insured));

  return {
    financial: {
      grossExposure,
      netExposure,
      insuranceCoverage: n(fin.insured),
      costToRemediate: n(riskExp.remediate),
      coverageRatio: grossExposure > 0 ? Math.round((n(fin.insured) / grossExposure) * 100) : 0,
    },
    risks: {
      bySeverity: sevMap,
      byStatus: statusMap,
      openCount: (statusMap.open || 0) + (statusMap.mitigating || 0),
      acceptedCount: statusMap.accepted || 0,
      critical: sevMap.Critical || 0,
      high: sevMap.High || 0,
      top: topRisks.map((r) => ({
        id: r.id, title: r.title, severity: r.severity, status: r.status,
        financialExposure: n(r.financial_exposure), owner: r.executive_owner,
        remediationOwner: r.remediation_owner, regulatoryCitation: r.regulatory_citation,
      })),
    },
    legal: {
      total: n((legalTotal[0] || {}).n),
      triggered: legalTriggered.map((l) => ({
        id: l.id, name: l.name, source: l.source, citation: l.citation,
        notificationTimeline: l.notification_timeline, maxPenalty: n(l.max_penalty_amount),
      })),
    },
    threats: threats.map((t) => ({
      id: t.id, name: t.name, type: t.type, probability: n(t.probability),
      impact: t.impact_level, tactic: t.mitre_tactic,
    })),
    controls: {
      total: n(ctrl.n), avgEffectiveness: n(ctrl.avg_eff),
      implemented: n(ctrl.implemented), notImplemented: n(ctrl.none_impl),
    },
    processes: {
      byCriticality: procMap,
      total: processes.reduce((s, r) => s + n(r.n), 0),
      atRisk: processesAtRisk.map((p) => ({
        id: p.id, name: p.name, tier: p.tier, criticality: p.criticality, owner: p.owner,
      })),
    },
    remediation: {
      byStatus: taskMap,
      overdue: n((overdueTasks[0] || {}).n),
    },
    findings: {
      repeat: n((repeatFindings[0] || {}).n),
      openCritical: openCriticalFindings.map((f) => ({
        id: f.id, title: f.title, severity: f.severity,
      })),
    },
    vendors: { signalsBySeverity: vendorSev, activeSignals: vendorSignals.reduce((s, r) => s + n(r.n), 0) },
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
function usd(v) {
  const x = n(v);
  if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`;
  if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`;
  if (x >= 1e3) return `$${(x / 1e3).toFixed(0)}K`;
  return `$${x.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// Deterministic synthesis (fallback / no-API-key path)
// ---------------------------------------------------------------------------
function deterministicBrief(role, ctx) {
  const def = ROLES[role];
  const { financial: f, risks: r, legal: l, controls: c, processes: p, remediation: rm, findings: fi, threats: t, vendors: v } = ctx;

  let status = 'green';
  if (r.critical > 0 || rm.overdue > 0 || (f.coverageRatio > 0 && f.coverageRatio < 50)) status = 'amber';
  if (r.critical >= 3 || l.triggered.length >= 3) status = 'red';

  let headline = '';
  let summary = '';
  let metrics = [];
  let highlights = [];
  let actions = [];

  switch (role) {
    case 'CFO':
      headline = `${usd(f.netExposure)} net cyber exposure after ${usd(f.insuranceCoverage)} insurance`;
      summary = `Gross exposure is ${usd(f.grossExposure)} across ${r.openCount} open risks, with ${f.coverageRatio}% covered by insurance. Estimated cost to remediate the open book is ${usd(f.costToRemediate)}.`;
      metrics = [
        { label: 'Gross exposure', value: usd(f.grossExposure) },
        { label: 'Net exposure', value: usd(f.netExposure) },
        { label: 'Insurance coverage', value: `${f.coverageRatio}%` },
        { label: 'Cost to remediate', value: usd(f.costToRemediate) },
      ];
      highlights = r.top.slice(0, 4).map((x) => `${x.title} — ${usd(x.financialExposure)} exposure (${x.severity})`);
      actions = r.top.filter((x) => x.financialExposure > 0).slice(0, 3).map((x) => ({
        title: `Fund remediation of "${x.title}"`, owner: x.remediationOwner || 'CISO', priority: x.severity,
      }));
      break;
    case 'CRO':
      headline = r.critical > 0
        ? `${r.critical} critical risk(s) breaching board appetite`
        : `Operating within board-approved appetite`;
      summary = `${r.openCount} active risks scored against thresholds: ${r.critical} Critical, ${r.high} High. ${r.acceptedCount} risk(s) formally accepted. ${rm.overdue} remediation task(s) are overdue.`;
      metrics = [
        { label: 'Active risks', value: String(r.openCount) },
        { label: 'Critical (appetite breach)', value: String(r.critical) },
        { label: 'High', value: String(r.high) },
        { label: 'Accepted', value: String(r.acceptedCount) },
      ];
      highlights = r.top.slice(0, 4).map((x) => `${x.title} — ${x.severity}, owner: ${x.owner || 'unassigned'}`);
      actions = r.top.filter((x) => x.severity === 'Critical').slice(0, 3).map((x) => ({
        title: `Assign owner & decision for "${x.title}"`, owner: x.owner || 'CRO', priority: 'Critical',
      }));
      break;
    case 'CLO':
      headline = l.triggered.length > 0
        ? `${l.triggered.length} regulatory obligation(s) triggered by active risk`
        : `No regulatory obligations currently triggered`;
      summary = `${l.total} obligations tracked (HIPAA, CMS, state breach laws, vendor contracts). ${l.triggered.length} are triggered by open risks. ${v.activeSignals} active vendor risk signal(s).`;
      metrics = [
        { label: 'Obligations tracked', value: String(l.total) },
        { label: 'Triggered', value: String(l.triggered.length) },
        { label: 'Vendor signals', value: String(v.activeSignals) },
      ];
      highlights = l.triggered.slice(0, 4).map((x) => `${x.source}: ${x.name}${x.notificationTimeline ? ` (notify ${x.notificationTimeline})` : ''}`);
      actions = l.triggered.slice(0, 3).map((x) => ({
        title: `Prepare notification posture for ${x.source} — ${x.name}`, owner: 'CLO', priority: 'High',
      }));
      break;
    case 'CIO':
      headline = `${p.atRisk.length} critical system(s)/process(es) exposed; ${rm.overdue} task(s) overdue`;
      summary = `Controls average ${c.avgEffectiveness}% effectiveness (${c.implemented}/${c.total} implemented, ${c.notImplemented} not implemented). ${rm.overdue} remediation tasks past due across the technology estate.`;
      metrics = [
        { label: 'Control effectiveness', value: `${c.avgEffectiveness}%` },
        { label: 'Controls implemented', value: `${c.implemented}/${c.total}` },
        { label: 'Processes at risk', value: String(p.atRisk.length) },
        { label: 'Overdue tasks', value: String(rm.overdue) },
      ];
      highlights = p.atRisk.slice(0, 4).map((x) => `${x.name} (${x.criticality}, ${x.tier}) — owner: ${x.owner}`);
      actions = p.atRisk.slice(0, 3).map((x) => ({
        title: `Prioritize remediation protecting "${x.name}"`, owner: 'CIO', priority: x.criticality === 'Critical' ? 'Critical' : 'High',
      }));
      break;
    case 'CISO':
      headline = `${t.length} active threat pathway(s) mapped to ${p.atRisk.length} business process(es)`;
      summary = `Top attack pathways scored by likelihood and blast radius. ${r.critical} critical risks, ${fi.repeat} repeat findings. Total quantified exposure ${usd(f.grossExposure)}.`;
      metrics = [
        { label: 'Threat pathways', value: String(t.length) },
        { label: 'Critical risks', value: String(r.critical) },
        { label: 'Repeat findings', value: String(fi.repeat) },
        { label: 'Quantified exposure', value: usd(f.grossExposure) },
      ];
      highlights = t.slice(0, 4).map((x) => `${x.name} (${x.type}) — ${x.probability}% likelihood, ${x.impact} impact`);
      actions = r.top.slice(0, 3).map((x) => ({
        title: `Drive down "${x.title}" (${usd(x.financialExposure)} exposure)`, owner: x.remediationOwner || 'CISO', priority: x.severity,
      }));
      break;
    case 'Board':
      headline = `Exposure ${usd(f.netExposure)} net · posture ${status === 'green' ? 'stable' : 'needs attention'} · ${f.coverageRatio}% insured`;
      summary = `Independent view: ${usd(f.grossExposure)} gross / ${usd(f.netExposure)} net exposure across ${r.openCount} active risks (${r.critical} critical). Controls at ${c.avgEffectiveness}% effectiveness; ${f.coverageRatio}% of exposure insured.`;
      metrics = [
        { label: 'Net exposure', value: usd(f.netExposure) },
        { label: 'Critical risks', value: String(r.critical) },
        { label: 'Control effectiveness', value: `${c.avgEffectiveness}%` },
        { label: 'Insured', value: `${f.coverageRatio}%` },
      ];
      highlights = [
        `Are we at risk? ${r.critical} critical risk(s), ${usd(f.netExposure)} net exposure.`,
        `Are we getting better? Controls ${c.avgEffectiveness}% effective, ${rm.overdue} overdue task(s).`,
        `Right spend? ${usd(f.costToRemediate)} to remediate vs ${usd(f.grossExposure)} exposure.`,
      ];
      actions = [
        { title: 'Confirm cyber risk is within approved appetite', owner: 'Board / CRO', priority: r.critical > 0 ? 'High' : 'Medium' },
        { title: 'Review insurance adequacy vs gross exposure', owner: 'Board / CFO', priority: f.coverageRatio < 50 ? 'High' : 'Medium' },
      ];
      break;
    default:
      headline = 'Brief unavailable';
  }

  return {
    role,
    question: def.question,
    deliverable: def.deliverable,
    headline,
    status,
    summary,
    metrics,
    highlights: highlights.filter(Boolean),
    actions: actions.filter(Boolean),
    source: 'deterministic',
  };
}

// ---------------------------------------------------------------------------
// AI synthesis (Claude) — structured output, with deterministic fallback.
// ---------------------------------------------------------------------------
const BRIEF_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    headline: { type: 'string' },
    status: { type: 'string', enum: ['green', 'amber', 'red'] },
    summary: { type: 'string' },
    metrics: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { label: { type: 'string' }, value: { type: 'string' } },
        required: ['label', 'value'],
      },
    },
    highlights: { type: 'array', items: { type: 'string' } },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          owner: { type: 'string' },
          priority: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
        },
        required: ['title', 'owner', 'priority'],
      },
    },
  },
  required: ['headline', 'status', 'summary', 'metrics', 'highlights', 'actions'],
};

async function aiBrief(role, ctx) {
  const client = getAnthropicClient();
  if (!client) return null;
  const def = ROLES[role];

  const system =
    `${def.persona}\n\n` +
    'You are one agent in the CyberRX Executive Cyber Operating System. You run continuously inside the customer\'s perimeter, reading primary sources directly. ' +
    'You produce a single, decision-ready brief for your executive that answers the one question they own. ' +
    'Be specific and quantitative. Quantify in dollars where the data supports it. Never invent numbers — use only the provided context. ' +
    'Keep the headline to one sentence (the direct answer to the question). Keep the summary to 2-3 sentences. ' +
    'Provide 2-4 metrics, 2-4 highlights (the most decision-relevant facts), and 1-3 recommended executive actions with an owner and priority. ' +
    'Set status to red if there are critical/appetite-breaching issues, amber if there are notable issues, green if posture is sound.';

  const user =
    `Executive role: ${role}\n` +
    `Question to answer: "${def.question}"\n` +
    `Required deliverable: ${def.deliverable}\n\n` +
    `Live primary-source context (JSON) read from the organization's security stack:\n` +
    '```json\n' + JSON.stringify(ctx, null, 2) + '\n```';

  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      thinking: { type: 'adaptive' },
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { format: { type: 'json_schema', schema: BRIEF_SCHEMA } },
    });
    const textBlock = (resp.content || []).find((b) => b.type === 'text');
    if (!textBlock) return null;
    const parsed = JSON.parse(textBlock.text);
    return {
      role,
      question: def.question,
      deliverable: def.deliverable,
      headline: parsed.headline,
      status: parsed.status,
      summary: parsed.summary,
      metrics: Array.isArray(parsed.metrics) ? parsed.metrics : [],
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      source: 'ai',
    };
  } catch (err) {
    logger.warn('AI brief generation failed, falling back to deterministic', { role, error: err.message });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------
async function persistBrief(orgId, brief, ctx) {
  const id = `brief_${orgId}_${brief.role}`;
  try {
    await db.query(
      `INSERT INTO executive_briefs
         (id, organization_id, role, question, deliverable, headline, status, summary,
          metrics, highlights, actions, source, context_snapshot, generated_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())
       ON CONFLICT (organization_id, role) DO UPDATE SET
         question=EXCLUDED.question, deliverable=EXCLUDED.deliverable, headline=EXCLUDED.headline,
         status=EXCLUDED.status, summary=EXCLUDED.summary, metrics=EXCLUDED.metrics,
         highlights=EXCLUDED.highlights, actions=EXCLUDED.actions, source=EXCLUDED.source,
         context_snapshot=EXCLUDED.context_snapshot, generated_at=NOW(), updated_at=NOW()`,
      [
        id, orgId, brief.role, brief.question, brief.deliverable, brief.headline, brief.status,
        brief.summary, JSON.stringify(brief.metrics), JSON.stringify(brief.highlights),
        JSON.stringify(brief.actions), brief.source, JSON.stringify(ctx || {}),
      ]
    );
  } catch (err) {
    logger.warn('Failed to persist executive brief', { role: brief.role, error: err.message });
  }
}

function rowToBrief(row) {
  const j = (v, d) => {
    if (v == null) return d;
    if (typeof v === 'string') { try { return JSON.parse(v); } catch { return d; } }
    return v;
  };
  return {
    role: row.role,
    question: row.question,
    deliverable: row.deliverable,
    headline: row.headline,
    status: row.status,
    summary: row.summary,
    metrics: j(row.metrics, []),
    highlights: j(row.highlights, []),
    actions: j(row.actions, []),
    source: row.source,
    generatedAt: row.generated_at,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Generate (and persist) a fresh brief for a single role. */
async function generateBrief(role, orgId) {
  if (!isValidRole(role)) throw new Error('Invalid role');
  const ctx = await gatherContext(orgId);
  let brief = await aiBrief(role, ctx);
  if (!brief) brief = deterministicBrief(role, ctx);
  brief.generatedAt = new Date().toISOString();
  await persistBrief(orgId, brief, ctx);
  return brief;
}

/** Generate and persist briefs for all six roles. */
async function generateAll(orgId) {
  const ctx = await gatherContext(orgId);
  const out = [];
  for (const role of ROLE_KEYS) {
    let brief = await aiBrief(role, ctx);
    if (!brief) brief = deterministicBrief(role, ctx);
    brief.generatedAt = new Date().toISOString();
    await persistBrief(orgId, brief, ctx);
    out.push(brief);
  }
  return out;
}

/** Read the latest stored brief for a role; generate on demand if missing or forced. */
async function getBrief(role, orgId, { refresh = false } = {}) {
  if (!isValidRole(role)) throw new Error('Invalid role');
  if (!refresh) {
    const rows = await safeRows(
      `SELECT * FROM executive_briefs WHERE organization_id=$1 AND role=$2`, [orgId, role]);
    if (rows.length) return rowToBrief(rows[0]);
  }
  return generateBrief(role, orgId);
}

/** Read the latest stored briefs for all roles; generate any that are missing. */
async function getAllBriefs(orgId, { refresh = false } = {}) {
  if (refresh) return generateAll(orgId);
  const rows = await safeRows(
    `SELECT * FROM executive_briefs WHERE organization_id=$1`, [orgId]);
  const byRole = {};
  rows.forEach((r) => { byRole[r.role] = rowToBrief(r); });
  const out = [];
  for (const role of ROLE_KEYS) {
    out.push(byRole[role] || (await generateBrief(role, orgId)));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Interactive Q&A — the executive asks their agent a question; the agent
// returns a short summary plus the relevant supporting details.
// ---------------------------------------------------------------------------
const ANSWER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    details: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'details'],
};

async function aiAnswer(role, ctx, question) {
  const client = getAnthropicClient();
  if (!client) return null;
  const def = ROLES[role];
  const system =
    `${def.persona}\n\n` +
    'You are this executive\'s dedicated CyberRX agent. Answer their question using ONLY the provided live context. ' +
    'Be specific and quantitative; quantify in dollars where the data supports it. Never invent numbers. ' +
    'Respond with: (1) a concise 2-3 sentence executive summary that directly answers the question, and ' +
    '(2) a list of the most relevant supporting details (each a concrete fact or figure drawn from the context). ' +
    'If the context does not contain the answer, say so plainly in the summary and return an empty details list.';
  const user =
    `Executive role: ${role}\n` +
    `Question: "${question}"\n\n` +
    `Live primary-source context (JSON):\n` +
    '```json\n' + JSON.stringify(ctx, null, 2) + '\n```';
  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      thinking: { type: 'adaptive' },
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { format: { type: 'json_schema', schema: ANSWER_SCHEMA } },
    });
    const textBlock = (resp.content || []).find((b) => b.type === 'text');
    if (!textBlock) return null;
    const parsed = JSON.parse(textBlock.text);
    return {
      summary: parsed.summary,
      details: Array.isArray(parsed.details) ? parsed.details : [],
      source: 'ai',
    };
  } catch (err) {
    logger.warn('AI answer failed, falling back to deterministic', { role, error: err.message });
    return null;
  }
}

// Deterministic answer: route the question to the relevant slice of context by
// keyword and produce a summary + supporting detail lines. Works with no API key.
function deterministicAnswer(role, ctx, question) {
  const q = String(question || '').toLowerCase();
  const f = ctx.financial, r = ctx.risks, l = ctx.legal, c = ctx.controls,
        p = ctx.processes, rm = ctx.remediation, fi = ctx.findings, t = ctx.threats, v = ctx.vendors;
  const has = (...words) => words.some((w) => q.includes(w));
  let summary = '';
  let details = [];

  if (has('insurance', 'covered', 'coverage', 'insured')) {
    summary = `Insurance covers about ${f.coverageRatio}% of the ${usd(f.grossExposure)} gross exposure — ${usd(f.insuranceCoverage)} of cover against ${usd(f.netExposure)} net exposure.`;
    details = [
      `Gross exposure: ${usd(f.grossExposure)}`,
      `Insurance coverage: ${usd(f.insuranceCoverage)} (${f.coverageRatio}%)`,
      `Net (uninsured) exposure: ${usd(f.netExposure)}`,
    ];
  } else if (has('roi', 'spend', 'invest', 'budget')) {
    summary = `Estimated cost to remediate the open risk book is ${usd(f.costToRemediate)} against ${usd(f.grossExposure)} of gross exposure.`;
    details = r.top.filter((x) => x.financialExposure > 0).slice(0, 4).map((x) => `${x.title}: ${usd(x.financialExposure)} exposure (${x.severity})`);
  } else if (has('financial', 'exposure', 'cost', 'dollar', 'money', 'capital', 'rbc')) {
    summary = `Total quantified cyber exposure is ${usd(f.grossExposure)} gross / ${usd(f.netExposure)} net across ${r.openCount} open risks (${r.critical} critical).`;
    details = r.top.slice(0, 5).map((x) => `${x.title}: ${usd(x.financialExposure)} (${x.severity}, owner ${x.owner || 'unassigned'})`);
  } else if (has('legal', 'regulat', 'hipaa', 'cms', 'notify', 'notification', 'penalt', 'obligation', 'breach law')) {
    summary = `${l.triggered.length} of ${l.total} tracked obligations are triggered by active risks.`;
    details = l.triggered.map((x) => `${x.source}: ${x.name}${x.notificationTimeline ? ` — notify within ${x.notificationTimeline}` : ''}${x.maxPenalty ? ` (max penalty ${usd(x.maxPenalty)})` : ''}`);
    if (!details.length) details = ctx.legal.triggered.length ? [] : ['No obligations are currently triggered by open risks.'];
  } else if (has('vendor', 'third party', 'third-party', 'supply')) {
    summary = `${v.activeSignals} active vendor risk signal(s) are being tracked.`;
    details = Object.entries(v.signalsBySeverity || {}).map(([sev, n]) => `${n} ${sev}-severity vendor signal(s)`);
    if (!details.length) details = ['No active vendor risk signals.'];
  } else if (has('threat', 'attack', 'pathway', 'ransomware', 'phishing')) {
    summary = `${t.length} active threat pathway(s) are mapped to the environment.`;
    details = t.slice(0, 6).map((x) => `${x.name} (${x.type}) — ${x.probability}% likelihood, ${x.impact} impact`);
  } else if (has('control', 'posture', 'effective', 'maturity')) {
    summary = `Controls average ${c.avgEffectiveness}% effectiveness — ${c.implemented} of ${c.total} fully implemented, ${c.notImplemented} not implemented.`;
    details = [
      `Average control effectiveness: ${c.avgEffectiveness}%`,
      `Implemented: ${c.implemented} / ${c.total}`,
      `Not implemented: ${c.notImplemented}`,
      `Repeat findings: ${fi.repeat}`,
    ];
  } else if (has('patch', 'vuln', 'eol', 'end-of-life', 'end of life', 'system', 'asset', 'overdue', 'remediat', 'operational')) {
    summary = `${p.atRisk.length} critical system(s)/process(es) carry open risk and ${rm.overdue} remediation task(s) are overdue.`;
    details = p.atRisk.slice(0, 5).map((x) => `${x.name} (${x.criticality}, ${x.tier}) — owner ${x.owner}`);
    if (fi.openCritical.length) details = details.concat(fi.openCritical.slice(0, 3).map((x) => `Open critical finding: ${x.title}`));
  } else if (has('appetite', 'threshold', 'owner', 'tolerance', 'kri')) {
    summary = r.critical > 0
      ? `${r.critical} critical risk(s) are breaching board appetite; ${r.openCount} risks are open in total.`
      : `Operating within board appetite — no critical risks open (${r.openCount} open in total).`;
    details = r.top.filter((x) => x.severity === 'Critical' || x.severity === 'High').slice(0, 5)
      .map((x) => `${x.title} — ${x.severity}, owner ${x.owner || 'unassigned'}`);
  } else if (has('improv', 'trend', 'getting better', 'better', 'worse')) {
    summary = `Posture snapshot: ${r.critical} critical risks open, controls at ${c.avgEffectiveness}% effectiveness, ${rm.overdue} overdue remediation task(s).`;
    details = [
      `Open risks: ${r.openCount} (${r.critical} critical, ${r.high} high)`,
      `Control effectiveness: ${c.avgEffectiveness}%`,
      `Overdue remediation tasks: ${rm.overdue}`,
      `Repeat findings: ${fi.repeat}`,
    ];
  } else {
    // Generic: lead with exposure + top risks.
    summary = `Across the environment there are ${r.openCount} open risks (${r.critical} critical) carrying ${usd(f.grossExposure)} of quantified exposure; controls average ${c.avgEffectiveness}% effectiveness.`;
    details = r.top.slice(0, 5).map((x) => `${x.title}: ${usd(x.financialExposure)} (${x.severity})`);
  }

  return { summary, details: details.filter(Boolean), source: 'deterministic' };
}

/** Answer an executive's free-text question for a role, grounded in live org data. */
async function answerQuestion(role, orgId, question) {
  if (!isValidRole(role)) throw new Error('Invalid role');
  const q = String(question || '').trim();
  if (!q) throw new Error('Question is required');
  const ctx = await gatherContext(orgId);
  let answer = await aiAnswer(role, ctx, q);
  if (!answer) answer = deterministicAnswer(role, ctx, q);
  return { role, question: q, answeredAt: new Date().toISOString(), ...answer };
}

module.exports = {
  ROLES,
  ROLE_KEYS,
  SUGGESTED_QUESTIONS,
  getSuggestedQuestions,
  isValidRole,
  aiEnabled,
  gatherContext,
  generateBrief,
  generateAll,
  getBrief,
  getAllBriefs,
  answerQuestion,
};
