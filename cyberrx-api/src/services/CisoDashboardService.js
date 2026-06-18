'use strict';

/**
 * CisoDashboardService
 * --------------------
 * Composes the dedicated CISO Security Posture Dashboard from the data model
 * (data/cisoDashboard.js — mock today, live-replaceable via ciso_entities) and,
 * where available, live computed signals (ValidationRunService / ATT&CK
 * coverage). It:
 *   - computes the weighted Overall Security Posture Score + delta/trend,
 *   - derives domain health, threshold breaches, ranked actions,
 *   - GENERATES a decision-ready executive answer for each of the 15 CISO
 *     questions (Answer / Confidence / Status / What changed / Why it matters /
 *     Evidence / Recommended action / Owner / Target date) — answers are built
 *     from the structured data and tied to evidence, not chart summaries,
 *   - persists a snapshot to ciso_dashboard_snapshots for trend/history.
 *
 * CISO persona only — no CIO/CFO/CRO/CLO/Audit/HR content.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');
const D = require('../data/cisoDashboard');
const N = require('./cisoNarration');

const round = (n) => Math.round(n);
function scoreBand(s) { return s >= 80 ? 'Strong' : s >= 60 ? 'Moderate' : s >= 40 ? 'Weak' : 'Critical'; }
function trendOf(delta) { return delta >= 2 ? 'improving' : delta <= -2 ? 'deteriorating' : 'stable'; }
function thresholdStatus(t) {
  const ok = t.direction === 'lte' ? t.current <= t.limit : t.current >= t.limit;
  return ok ? 'Within' : 'Breach';
}

// Load an entity set from ciso_entities (live-replaceable) else the module.
async function entities(orgId, type, fallback) {
  try {
    const rows = await db.query(
      `SELECT data FROM ciso_entities WHERE org_id=$1 AND entity_type=$2 ORDER BY ordinal NULLS LAST, entity_id`, [orgId, type]);
    if (rows.length) return rows.map((r) => (typeof r.data === 'string' ? JSON.parse(r.data) : r.data));
  } catch (e) { logger.debug('ciso_entities read fallback', { type, error: e.message }); }
  return fallback;
}

async function compose(orgId) {
  const [domains, controls, thresholds, processes, pathways, readiness, investments, hidden, attention, actions, peers, emerging, sources] =
    await Promise.all([
      entities(orgId, 'SecurityDomain', D.SECURITY_DOMAINS),
      entities(orgId, 'ControlArea', D.CONTROL_AREAS),
      entities(orgId, 'Threshold', D.THRESHOLDS),
      entities(orgId, 'CriticalBusinessProcess', D.BUSINESS_PROCESSES),
      entities(orgId, 'AttackPathway', D.ATTACK_PATHWAYS),
      entities(orgId, 'CyberReadinessItem', D.READINESS_ITEMS),
      entities(orgId, 'SecurityInvestment', D.INVESTMENTS),
      entities(orgId, 'HiddenRisk', D.HIDDEN_RISKS),
      entities(orgId, 'SecurityAction', D.ATTENTION_ITEMS),
      entities(orgId, 'SecurityAction', D.ACTIONS).then(() => D.ACTIONS), // actions are module-driven
      Promise.resolve(D.PEER_MATURITY),
      Promise.resolve(D.EMERGING_RISKS),
      Promise.resolve(D.EVIDENCE_SOURCES),
    ]);
  // Maintain linkage: the Process Protection list must be the SAME processes the
  // user approved in the Process phase (business_processes), with their supporting
  // applications from the crosswalk. Fall back to the demo set only when the org
  // has not completed the Process phase yet.
  const approved = await approvedProcesses(orgId);
  const finalProcesses = approved.length ? approved : processes;
  return { domains, controls, thresholds, processes: finalProcesses, pathways, readiness, investments, hidden, attention, actions, peers, emerging, sources };
}

// Build the Process-Protection rows from the org's approved processes + the
// applications mapped to them (app_process_map). Coverage/risk default to
// 'Medium' (not yet assessed) rather than fabricated specifics.
async function approvedProcesses(orgId) {
  let rows = [];
  try {
    rows = await db.query(
      `SELECT bp.id, bp.name, bp.crit_tier, bp.rto,
              COALESCE(ARRAY_AGG(DISTINCT a.name) FILTER (WHERE a.name IS NOT NULL), '{}') AS apps
         FROM business_processes bp
         LEFT JOIN app_process_map m ON m.process_id = bp.id AND m.organization_id = bp.organization_id
         LEFT JOIN applications a ON a.id = m.application_id
        WHERE bp.organization_id = $1
        GROUP BY bp.id, bp.name, bp.crit_tier, bp.rto
        ORDER BY bp.crit_tier NULLS LAST, bp.name`, [orgId]);
  } catch (e) { logger.debug('approvedProcesses degraded', { error: e.message }); return []; }
  const protByTier = { 1: 55, 2: 60, 3: 65, 4: 70 };
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    supportingSystems: Array.isArray(r.apps) ? r.apps : [],
    protectionLevel: protByTier[r.crit_tier] || 60,
    identityRisk: 'Medium', vulnRisk: 'Medium', detectionCoverage: 'Medium',
    dataProtection: 'Medium', recoveryReadiness: 'Medium', thirdPartyRisk: 'Medium',
    resilienceRating: 'Moderate',
    tier: r.crit_tier || null, rto: r.rto || null,
  }));
}

// ---- component builders ----------------------------------------------------
function overallPosture(domains) {
  const weighted = domains.filter((d) => d.weight > 0);
  const wsum = weighted.reduce((s, d) => s + d.weight, 0) || 1;
  const current = round(weighted.reduce((s, d) => s + d.weight * d.current, 0) / wsum);
  const previous = round(weighted.reduce((s, d) => s + d.weight * d.previous, 0) / wsum);
  const delta = current - previous;
  const improved = weighted.filter((d) => d.current - d.previous >= 2).sort((a, b) => (b.current - b.previous) - (a.current - a.previous));
  const declined = weighted.filter((d) => d.current - d.previous <= -2).sort((a, b) => (a.current - a.previous) - (b.current - b.previous));
  const narrative = `Posture ${delta >= 0 ? 'improved' : 'declined'} ${Math.abs(delta)} point${Math.abs(delta) === 1 ? '' : 's'} to ${current}/100 (${scoreBand(current)}). ` +
    (improved.length ? `Gains in ${improved.slice(0, 2).map((d) => d.name).join(' and ')}` : 'No domain materially improved') +
    (declined.length ? `; offset by deterioration in ${declined.slice(0, 2).map((d) => d.name).join(' and ')}.` : '.');
  return {
    current, previous, delta, trend: trendOf(delta),
    confidence: 'Medium',
    weights: domains.filter((d) => d.weight > 0).map((d) => ({ domain: d.name, weight: d.weight })),
    narrative,
  };
}

function domainMatrix(domains) {
  return domains.map((d) => {
    const delta = d.current - d.previous;
    return { id: d.id, name: d.name, weight: d.weight, current: d.current, previous: d.previous, delta,
      trend: trendOf(delta), status: scoreBand(d.current),
      topImproving: d.topImproving, topDeteriorating: d.topDeteriorating, source: d.source };
  });
}

function controlRisk(controls) {
  return [...controls].sort((a, b) => b.riskContribution - a.riskContribution)
    .map((c, i) => ({ rank: i + 1, ...c }));
}

function thresholdBoard(thresholds) {
  const rows = thresholds.map((t) => ({ ...t, status: thresholdStatus(t),
    headroom: t.direction === 'lte' ? t.limit - t.current : t.current - t.limit }));
  return { rows, breaches: rows.filter((r) => r.status === 'Breach').length, total: rows.length,
    critical: rows.filter((r) => r.status === 'Breach' && r.breachSeverity === 'Critical').length };
}

function actionQueue(actions) {
  return [...actions]
    .map((a) => ({ ...a, priorityScore: a.severity * a.urgency * a.businessImpact * a.threatRel * a.remediationConfidence }))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .map((a, i) => ({ rank: i + 1, ...a }));
}

function readinessView(items) {
  const overall = round(items.reduce((s, r) => s + r.score, 0) / (items.length || 1));
  return { items, overall, rating: scoreBand(overall) };
}

function investmentView(investments) {
  return investments.map((iv) => ({ ...iv, riskReduction: iv.baselineRisk - iv.currentRisk }));
}

// ---- executive answer generator -------------------------------------------
// Each answer is decision-ready and traceable. Built from the model, not charts.
function buildAnswers(model, posture, matrix, ranks, board, queue, readiness, invest, refreshed) {
  const A = (n, q, o) => ({ id: `q${n}`, n, question: q, lastRefreshed: refreshed, ...o });
  const topDecline = matrix.filter((d) => d.trend === 'deteriorating').sort((a, b) => a.delta - b.delta);
  const topImprove = matrix.filter((d) => d.trend === 'improving').sort((a, b) => b.delta - a.delta);
  const topControls = ranks.slice(0, 3);
  const breaches = board.rows.filter((r) => r.status === 'Breach');
  const critBreaches = breaches.filter((r) => r.breachSeverity === 'Critical');
  const topActions = queue.slice(0, 3);
  const topAttn = model.attention.slice(0, 3);
  const worstProc = [...model.processes].sort((a, b) => a.protectionLevel - b.protectionLevel)[0];
  const worstPath = model.pathways[0];
  const hiddenNoAccept = model.hidden.filter((h) => h.formalAcceptance === false);
  const peerGaps = [...model.peers].sort((a, b) => a.gap - b.gap);
  const fastEmerging = model.emerging.filter((e) => e.velocity === 'High' && e.ourAdaptation !== 'High');

  return [
    A(1, D.QUESTIONS[0].q, {
      answer: `Our security posture is ${posture.current}/100 (${scoreBand(posture.current)}) and ${posture.delta >= 0 ? 'improving' : 'slipping'} — ${posture.delta >= 0 ? '+' : ''}${posture.delta} vs last period. Strongest: ${[...matrix].sort((a, b) => b.current - a.current)[0].name}; weakest: ${[...matrix].sort((a, b) => a.current - b.current)[0].name}.`,
      confidence: 'High', status: scoreBand(posture.current),
      whatChanged: posture.narrative,
      whyItMatters: 'This is the one number that tells the board whether the program is gaining or losing ground against threat, and which domains are driving the change.',
      evidence: [`Weighted posture ${posture.previous} -> ${posture.current} (${posture.trend})`,
        ...topImprove.slice(0, 2).map((d) => `Improving: ${d.name} +${d.delta} (${d.topImproving.metric})`),
        ...topDecline.slice(0, 2).map((d) => `Deteriorating: ${d.name} ${d.delta} (${d.topDeteriorating.metric})`)],
      businessImpact: `Net cyber risk to claims, member data, and payments moved with the score; deterioration in ${(topDecline[0] || {}).name || 'detection'} is the main drag.`,
      riskDrivers: topDecline.slice(0, 3).map((d) => `${d.name} (${d.delta})`),
      recommendedAction: topDecline.length ? `Stand up a recovery plan for ${topDecline[0].name} (${topDecline[0].topDeteriorating.metric}).` : 'Sustain the trajectory and protect the gains.',
      owner: 'CISO', targetDate: '2026-07-31',
      dataSources: ['Posture engine', 'Domain Health Matrix'], component: 'overallPosture',
    }),
    A(2, D.QUESTIONS[1].q, {
      answer: `Greatest risk sits in ${topControls.map((c) => c.name).join(', ')}. Act now on: ${topActions.slice(0, 2).map((a) => a.action).join('; ')}.`,
      confidence: 'High', status: topControls[0].riskContribution >= 80 ? 'Critical' : 'Weak',
      whatChanged: `${model.attention.filter((a) => a.severity === 'Critical').length} critical item(s) now require a CISO decision; the top risk contributor is ${topControls[0].name} (${topControls[0].riskContribution}/100).`,
      whyItMatters: topAttn[0].businessImpact,
      evidence: [...topControls.map((c) => `${c.name} (${c.csf} / ${c.cis}): ${c.evidence}`),
        ...topActions.slice(0, 2).map((a) => `Action #${a.rank}: ${a.action} -> protects ${a.process}`)],
      businessImpact: topAttn.map((a) => `${a.process}: ${a.businessImpact}`).join('; '),
      riskDrivers: topControls.map((c) => c.name),
      recommendedAction: `Authorize: ${topActions[0].action} (owner ${topActions[0].owner}, due ${topActions[0].dueDate}).`,
      owner: topActions[0].owner, targetDate: topActions[0].dueDate,
      dataSources: ['Control Risk Contribution', 'Action-Now Queue', 'NIST CSF 2.0 / CIS'], component: 'controlRisk',
    }),
    A(3, D.QUESTIONS[2].q, {
      answer: `If attacked today we are most exposed on ${worstProc.name} via ${worstPath.initialAccess.toLowerCase()}, exploiting ${worstPath.weakestControl}. Major-event readiness is ${readiness.overall}/100 (${readiness.rating}).`,
      confidence: 'Medium', status: readiness.overall < 50 ? 'Critical' : 'Weak',
      whatChanged: `Weakest control on the top attack path is ${worstPath.weakestControl}; weakest readiness areas are ${[...readiness.items].sort((a, b) => a.score - b.score).slice(0, 2).map((r) => r.name).join(' and ')}.`,
      whyItMatters: worstPath.businessImpact,
      evidence: [`Most likely path: ${worstPath.narrative}`,
        `Weakest control: ${worstPath.weakestControl}`,
        `Lowest-protected process: ${worstProc.name} (${worstProc.protectionLevel}/100)`,
        ...[...readiness.items].sort((a, b) => a.score - b.score).slice(0, 2).map((r) => `Readiness gap: ${r.name} (${r.score})`)],
      businessImpact: worstPath.businessImpact,
      riskDrivers: [worstPath.weakestControl, worstProc.name, worstPath.process],
      recommendedAction: `Break the top attack chain: ${worstPath.breakingControls[0]}. ${worstPath.mitigation}.`,
      owner: 'CISO', targetDate: '2026-07-15',
      dataSources: ['Attack Pathways', 'MITRE ATT&CK', 'Cyber-Event Readiness', 'Business Process Protection'], component: 'pathways',
    }),
    A(4, D.QUESTIONS[3].q, {
      answer: `No — ${board.breaches} of ${board.total} internal thresholds are breached (${critBreaches.length} critical), and we are silently accepting ${hiddenNoAccept.length} risk(s) with no formal approval.`,
      confidence: 'High', status: critBreaches.length ? 'Critical' : board.breaches > 4 ? 'Weak' : 'Moderate',
      whatChanged: `Active breaches: ${breaches.slice(0, 4).map((b) => b.name).join(', ')}. Unapproved accepted risks include "${(hiddenNoAccept[0] || {}).risk}".`,
      whyItMatters: 'Threshold breaches and undocumented risk acceptance are board-approved-appetite violations the organization has not formally signed off on.',
      evidence: [...breaches.slice(0, 4).map((b) => `${b.name}: ${b.current}${b.unit === '%' ? '%' : ' ' + b.unit} vs ${b.threshold} (${b.breachSeverity})`),
        ...model.hidden.slice(0, 3).map((h) => `Hidden: ${h.risk} — ${h.evidence}`)],
      businessImpact: 'Each breach widens an exploitable window; each silent acceptance is risk the board never approved.',
      riskDrivers: [...critBreaches.map((b) => b.name), ...model.hidden.slice(0, 2).map((h) => h.risk)].slice(0, 4),
      recommendedAction: `${(critBreaches[0] || breaches[0] || {}).action || 'Remediate breached thresholds'}; escalate hidden risks for formal acceptance or remediation.`,
      owner: 'CISO', targetDate: '2026-07-10',
      dataSources: ['Security Threshold Dashboard', 'Hidden Risk register', 'Risk appetite policy'], component: 'thresholds',
    }),
    A(5, D.QUESTIONS[4].q, {
      answer: `Yes — tracked initiatives have cut measured risk by ~${round(invest.reduce((s, i) => s + i.riskReduction, 0) / invest.length)} points on average (biggest win: ${[...invest].sort((a, b) => b.riskReduction - a.riskReduction)[0].name}). We trail peers most in ${peerGaps.slice(0, 2).map((p) => p.domain).join(' and ')}, and ${fastEmerging.length} risks are outpacing us.`,
      confidence: 'Medium', status: 'Moderate',
      whatChanged: `${invest.filter((i) => /Approve|Fund|Mandate/.test(i.decision)).length} initiative(s) need a funding decision; fastest-moving exposure is ${(fastEmerging[0] || {}).risk}.`,
      whyItMatters: 'Shows whether security spend is producing measurable risk reduction, and where we are falling behind peers and emerging threats.',
      evidence: [...invest.slice(0, 4).map((i) => `${i.name} (${i.spend}): risk ${i.baselineRisk} -> ${i.currentRisk} (-${i.riskReduction})${i.blockers ? `, blocker: ${i.blockers}` : ''}`),
        ...peerGaps.slice(0, 2).map((p) => `Peer gap: ${p.domain} us ${p.us} vs ${p.peerMedian} (${p.gap})`)],
      businessImpact: 'Risk reduction is concentrated in identity, endpoint, and cloud; below-median vulnerability and third-party maturity are the clearest catch-up targets.',
      riskDrivers: [...invest.filter((i) => i.blockers).slice(0, 2).map((i) => `${i.name}: ${i.blockers}`), ...fastEmerging.slice(0, 2).map((e) => e.risk)],
      recommendedAction: ([...invest].find((i) => /Approve|Fund|Mandate/.test(i.decision)) || invest[0]).decision,
      owner: 'CISO', targetDate: '2026-08-31',
      dataSources: ['Investment-to-Risk Reduction', 'Peer benchmark', 'Emerging Risk register'], component: 'investments',
    }),
  ];
}
async function persistSnapshot(orgId, overall) {
  try {
    await db.query(
      `INSERT INTO ciso_dashboard_snapshots (org_id, period, overall, previous, delta) VALUES ($1,$2,$3,$4,$5)`,
      [orgId, new Date().toISOString().slice(0, 7), overall.current, overall.previous, overall.delta]);
  } catch (e) { logger.debug('ciso snapshot skipped', { error: e.message }); }
}

// Re-lens the full CISO scaffold for another executive seat: the hero score,
// the pillar strip (domainMatrix), and the five Current State questions become
// that leader's own, while the rich shared sections (control risk, thresholds,
// action queue, process protection, attack pathways, readiness, hidden risk)
// keep rendering the org's security/risk truth — so every leader page has the
// EXACT same setup, populated with their corresponding information.
async function applyRoleLens(payload, role, ctx, refreshed) {
  const Exec = require('./ExecDashboardService');
  payload.persona = role;
  payload.overallPosture = Exec.roleOverall(role, ctx);
  payload.domainMatrix = Exec.roleDomains(role, ctx).map((d) => ({ ...d }));
  payload.roleTabs = Exec.roleLayout(role, ctx);
  const raw = Exec.roleQuestions(role, ctx);
  payload.questions = raw.map((q) => ({
    ...q,
    lastRefreshed: refreshed,
    explanation: q.whyItMatters || '',
    narration: [q.answer, q.whyItMatters, q.recommendedAction ? `Recommended: ${q.recommendedAction}` : ''].filter(Boolean).join(' '),
  }));
  // (AI decision-intelligence is now folded into the shared decision spine —
  // see DecisionEngineService.generate — so it appears in the Decisions &
  // Projections / Decision Queue tab for every role, not a per-role section.)
}

async function getDashboard(orgId, role) {
  const model = await compose(orgId);
  const refreshed = new Date().toISOString();
  const posture = overallPosture(model.domains);
  const matrix = domainMatrix(model.domains);
  const ranks = controlRisk(model.controls);
  const board = thresholdBoard(model.thresholds);
  const queue = actionQueue(model.actions);
  const readiness = readinessView(model.readiness);
  const invest = investmentView(model.investments);
  const answers = buildAnswers(model, posture, matrix, ranks, board, queue, readiness, invest, refreshed);
  await persistSnapshot(orgId, posture);

  // Enrich with SME explanations + voice narration (the agent acts as an
  // expert who explains, and the voice teaches rather than reads the screen).
  const nmodel = { domainMatrix: matrix, controlRisk: ranks, attackPathways: model.pathways, thresholds: board, readiness };
  answers.forEach((a) => { const e = N.answerNarration(a.n, nmodel, posture); a.explanation = e.explanation; a.narration = e.narration; });
  ranks.forEach((c) => { const e = N.entityNarration('control', c); c.explanation = e.explanation; c.narration = e.narration; });
  board.rows.forEach((t) => { const e = N.entityNarration('threshold', t); t.explanation = e.explanation; t.narration = e.narration; });
  model.pathways.forEach((p) => { const e = N.entityNarration('pathway', p); p.explanation = e.explanation; p.narration = e.narration; });
  model.processes.forEach((p) => { const e = N.entityNarration('process', p); p.explanation = e.explanation; p.narration = e.narration; });
  matrix.forEach((d) => { const e = N.entityNarration('domain', d); d.explanation = e.explanation; d.narration = e.narration; });
  model.hidden.forEach((h) => { const e = N.entityNarration('hidden', h); h.explanation = e.explanation; h.narration = e.narration; });
  invest.forEach((iv) => { const e = N.entityNarration('investment', iv); iv.explanation = e.explanation; iv.narration = e.narration; });
  model.emerging.forEach((em) => { const e = N.entityNarration('emerging', em); em.explanation = e.explanation; em.narration = e.narration; });
  const tabs = ['qa', 'domains', 'controls', 'thresholds', 'actions', 'processes', 'paths', 'readiness', 'hidden'];
  const tabNarration = {};
  tabs.forEach((t) => { tabNarration[t] = N.tabNarration(t, nmodel, posture, board, readiness); });

  const payload = {
    persona: 'CISO', organizationId: orgId, generatedAt: refreshed,
    overallPosture: posture,
    domainMatrix: matrix,
    controlRisk: ranks,
    attentionItems: model.attention,
    thresholds: board,
    actionQueue: queue,
    businessProcesses: model.processes,
    attackPathways: model.pathways,
    readiness,
    investments: invest,
    hiddenRisks: model.hidden,
    peerMaturity: model.peers,
    emergingRisks: model.emerging,
    evidenceSources: model.sources,
    questions: answers,
    tabNarration,
  };

  // For any non-CISO seat, re-lens the hero, pillars, and questions to that role
  // while keeping the rest of the (shared) scaffold intact.
  if (role && role !== 'CISO') {
    try {
      const Exec = require('./ExecDashboardService');
      await applyRoleLens(payload, role, await Exec.loadCtx(orgId), refreshed);
    } catch (e) { logger.warn('role lens failed; serving CISO baseline', { role, error: e.message }); }
  }
  return payload;
}

module.exports = { getDashboard };
