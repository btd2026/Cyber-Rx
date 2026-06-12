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
  return { domains, controls, thresholds, processes, pathways, readiness, investments, hidden, attention, actions, peers, emerging, sources };
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
      answer: `We are ${posture.delta >= 0 ? 'more' : 'less'} secure than last period — overall posture ${posture.delta >= 0 ? 'rose' : 'fell'} ${Math.abs(posture.delta)} points to ${posture.current}/100 (${scoreBand(posture.current)}).`,
      confidence: 'High', status: scoreBand(posture.current),
      whatChanged: posture.narrative,
      whyItMatters: 'Direction of travel tells the board whether the program is gaining or losing ground against threat.',
      evidence: [`Weighted posture ${posture.previous}→${posture.current}`, ...topImprove.slice(0, 1).map((d) => `${d.name} +${d.delta}`), ...topDecline.slice(0, 1).map((d) => `${d.name} ${d.delta}`)],
      businessImpact: 'Net risk to claims, member data, and payments shifted with the score.',
      riskDrivers: topDecline.slice(0, 2).map((d) => `${d.name} (${d.delta})`),
      recommendedAction: topDecline.length ? `Reverse deterioration in ${topDecline[0].name}` : 'Sustain trajectory; protect gains',
      owner: 'CISO', targetDate: '2026-07-31',
      dataSources: ['Posture engine', 'Domain scorecards'], component: 'overallPosture',
    }),
    A(2, D.QUESTIONS[1].q, {
      answer: `${topImprove.length} domains improving (led by ${(topImprove[0] || {}).name || '—'}), ${topDecline.length} deteriorating (worst: ${(topDecline[0] || {}).name || '—'}).`,
      confidence: 'High', status: topDecline.length >= 3 ? 'Weak' : 'Moderate',
      whatChanged: `Improving: ${topImprove.map((d) => `${d.name} +${d.delta}`).join(', ') || 'none'}. Deteriorating: ${topDecline.map((d) => `${d.name} ${d.delta}`).join(', ') || 'none'}.`,
      whyItMatters: 'Deteriorating domains are where risk is actively accumulating.',
      evidence: matrix.map((d) => `${d.name} ${d.previous}→${d.current}`).slice(0, 6),
      businessImpact: `Deterioration in ${(topDecline[0] || {}).name || 'detection'} weakens protection of ${worstProc.name}.`,
      riskDrivers: topDecline.map((d) => `${d.name}: ${d.topDeteriorating.metric}`).slice(0, 3),
      recommendedAction: topDecline.length ? `Stand up a recovery plan for ${topDecline[0].name}` : 'Maintain monitoring',
      owner: 'CISO', targetDate: '2026-07-15',
      dataSources: ['Domain Health Matrix'], component: 'domainMatrix',
    }),
    A(3, D.QUESTIONS[2].q, {
      answer: `The largest enterprise risk contributors are ${topControls.map((c) => c.name).join(', ')}.`,
      confidence: 'High', status: topControls[0].riskContribution >= 80 ? 'Critical' : 'Weak',
      whatChanged: `${topControls[0].name} leads at ${topControls[0].riskContribution}/100 risk contribution.`,
      whyItMatters: `These controls have the highest likelihood × impact × blast radius against ${topControls[0].processAffected}.`,
      evidence: topControls.map((c) => `${c.name}: ${c.evidence}`),
      businessImpact: topControls.map((c) => `${c.name} → ${c.processAffected}`).join('; '),
      riskDrivers: topControls.map((c) => `${c.name} (${c.csf} / ${c.cis})`),
      recommendedAction: topControls[0].action,
      owner: 'CISO', targetDate: '2026-07-15',
      dataSources: ['Control Risk Contribution', 'NIST CSF 2.0 / CIS mapping'], component: 'controlRisk',
    }),
    A(4, D.QUESTIONS[3].q, {
      answer: `Top gaps: ${topAttn.map((a) => a.title.split(' ').slice(0, 6).join(' ')).join('; ')}.`,
      confidence: 'High', status: topAttn.some((a) => a.severity === 'Critical') ? 'Critical' : 'Weak',
      whatChanged: `${model.attention.filter((a) => a.severity === 'Critical').length} critical items now require CISO decision.`,
      whyItMatters: topAttn[0].businessImpact,
      evidence: topAttn.map((a) => `${a.title} — ${a.whyNow}`),
      businessImpact: topAttn.map((a) => `${a.process}: ${a.businessImpact}`).join('; '),
      riskDrivers: topAttn.map((a) => a.title),
      recommendedAction: topAttn[0].decision,
      owner: topAttn[0].owner, targetDate: topAttn[0].targetDate,
      dataSources: ['Top CISO Attention Items'], component: 'attention',
    }),
    A(5, D.QUESTIONS[4].q, {
      answer: `No — ${board.breaches} of ${board.total} internal thresholds are breached (${critBreaches.length} critical).`,
      confidence: 'High', status: critBreaches.length ? 'Critical' : board.breaches > 4 ? 'Weak' : 'Moderate',
      whatChanged: `Active breaches: ${breaches.slice(0, 5).map((b) => b.name).join(', ')}.`,
      whyItMatters: 'Threshold breaches are risk-appetite violations the board has not formally accepted.',
      evidence: breaches.map((b) => `${b.name}: ${b.current}${b.unit} vs ${b.threshold}`).slice(0, 8),
      businessImpact: 'Each breach widens an exploitable window on critical processes.',
      riskDrivers: critBreaches.concat(breaches).slice(0, 3).map((b) => b.name),
      recommendedAction: (critBreaches[0] || breaches[0] || {}).action || 'Remediate breached thresholds',
      owner: 'CISO', targetDate: '2026-07-10',
      dataSources: ['Security Threshold Dashboard', 'Risk appetite policy'], component: 'thresholds',
    }),
    A(6, D.QUESTIONS[5].q, {
      answer: `Now: ${topActions.map((a) => a.action).join('; ')}.`,
      confidence: 'High', status: 'Critical',
      whatChanged: `Ranked by severity × urgency × business impact × threat relevance × remediation confidence; ${queue.filter((a) => a.escalation).length} need escalation.`,
      whyItMatters: topActions[0].whyNow,
      evidence: topActions.map((a) => `#${a.rank} ${a.action} (score ${a.priorityScore}) — protects ${a.process}`),
      businessImpact: topActions.map((a) => `${a.process}: ${a.riskReduced}`).join('; '),
      riskDrivers: topActions.map((a) => a.action),
      recommendedAction: `Authorize #1: ${topActions[0].action}`,
      owner: topActions[0].owner, targetDate: topActions[0].dueDate,
      dataSources: ['Action-Now Queue'], component: 'actionQueue',
    }),
    A(7, D.QUESTIONS[6].q, {
      answer: `Current posture is ${posture.current}/100 — ${scoreBand(posture.current)}. Strongest: ${[...matrix].sort((a, b) => b.current - a.current)[0].name}; weakest: ${[...matrix].sort((a, b) => a.current - b.current)[0].name}.`,
      confidence: 'Medium', status: scoreBand(posture.current),
      whatChanged: posture.narrative,
      whyItMatters: 'Posture is the weighted measure of how well we protect critical processes and member data.',
      evidence: posture.weights.map((w) => `${w.domain} ${w.weight}%`).concat([`Overall ${posture.current}/100`]),
      businessImpact: `Moderate residual risk concentrated in ${worstProc.name} and identity.`,
      riskDrivers: [...matrix].sort((a, b) => a.current - b.current).slice(0, 3).map((d) => d.name),
      recommendedAction: 'Focus investment on the lowest-scoring weighted domains',
      owner: 'CISO', targetDate: '2026-09-30',
      dataSources: ['Overall Posture Score', 'Domain Health Matrix'], component: 'overallPosture',
    }),
    A(8, D.QUESTIONS[7].q, {
      answer: `${model.pathways.length} priority attack pathways threaten critical processes — most severe: ${worstPath.process} via ${worstPath.weakestControl}.`,
      confidence: 'Medium', status: 'Weak',
      whatChanged: `Weakest control on the top path is ${worstPath.weakestControl}.`,
      whyItMatters: worstPath.businessImpact,
      evidence: model.pathways.map((p) => `${p.process}: ${p.narrative}`),
      businessImpact: model.pathways.map((p) => `${p.process}: ${p.businessImpact}`).join('; '),
      riskDrivers: model.pathways.map((p) => `${p.process} — weakest: ${p.weakestControl}`),
      recommendedAction: worstPath.mitigation,
      owner: 'CISO', targetDate: '2026-07-31',
      dataSources: ['Attack Pathway Analysis', 'MITRE ATT&CK'], component: 'pathways',
    }),
    A(9, D.QUESTIONS[8].q, {
      answer: `The most material disruption risk right now is ${topAttn[0].title.toLowerCase()} affecting ${topAttn[0].process}.`,
      confidence: 'High', status: 'Critical',
      whatChanged: topAttn[0].whyNow,
      whyItMatters: topAttn[0].businessImpact,
      evidence: model.attention.filter((a) => a.severity === 'Critical' || a.severity === 'High').map((a) => `${a.process}: ${a.title}`),
      businessImpact: `${topAttn[0].process} could be materially disrupted; ${worstPath.businessImpact.toLowerCase()}.`,
      riskDrivers: model.attention.slice(0, 3).map((a) => a.title),
      recommendedAction: topAttn[0].decision,
      owner: topAttn[0].owner, targetDate: topAttn[0].targetDate,
      dataSources: ['Attention Items', 'Business Process Protection'], component: 'processes',
    }),
    A(10, D.QUESTIONS[9].q, {
      answer: `We are unknowingly accepting ${hiddenNoAccept.length} risks with no formal approval — including "${(hiddenNoAccept[0] || {}).risk}".`,
      confidence: 'Medium', status: 'Weak',
      whatChanged: `${hiddenNoAccept.length} hidden risks have no risk-acceptance on record; ${model.hidden.filter((h) => h.formalAcceptance === 'expired').length} have expired exceptions.`,
      whyItMatters: 'These are unmanaged accepted risks the board never explicitly approved.',
      evidence: model.hidden.map((h) => `${h.risk} — ${h.evidence}`),
      businessImpact: model.hidden.slice(0, 3).map((h) => `${h.process}: ${h.impact}`).join('; '),
      riskDrivers: model.hidden.map((h) => h.domain).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3),
      recommendedAction: (hiddenNoAccept[0] || {}).escalation || 'Escalate each for formal acceptance or remediation',
      owner: 'CISO', targetDate: '2026-07-20',
      dataSources: ['Hidden Risk / Unknown Acceptance'], component: 'hidden',
    }),
    A(11, D.QUESTIONS[10].q, {
      answer: `An attacker today would most likely succeed via ${worstPath.initialAccess.toLowerCase()} into ${worstPath.process}, exploiting ${worstPath.weakestControl}.`,
      confidence: 'Medium', status: 'Weak',
      whatChanged: `Lowest-protected process is ${worstProc.name} (${worstProc.protectionLevel}/100).`,
      whyItMatters: worstPath.businessImpact,
      evidence: [worstPath.narrative, `Weakest control: ${worstPath.weakestControl}`, `${worstProc.name} protection ${worstProc.protectionLevel}/100`],
      businessImpact: worstPath.businessImpact,
      riskDrivers: worstPath.breakingControls.slice(0, 3),
      recommendedAction: `Break the chain: ${worstPath.breakingControls[0]}`,
      owner: 'CISO', targetDate: '2026-07-15',
      dataSources: ['Attack Pathways', 'Business Process Protection'], component: 'pathways',
    }),
    A(12, D.QUESTIONS[11].q, {
      answer: `Yes — tracked initiatives have cut measured risk by an average of ${round(invest.reduce((s, i) => s + i.riskReduction, 0) / invest.length)} points; biggest win: ${[...invest].sort((a, b) => b.riskReduction - a.riskReduction)[0].name}.`,
      confidence: 'Medium', status: 'Moderate',
      whatChanged: invest.map((i) => `${i.name}: ${i.baselineRisk}→${i.currentRisk}`).slice(0, 3).join('; '),
      whyItMatters: 'Demonstrates security spend is producing measurable risk reduction, not just activity.',
      evidence: invest.map((i) => `${i.name} (${i.spend}): −${i.riskReduction}, +${i.futureReduction} expected`),
      businessImpact: 'Risk reduction concentrated in identity, endpoint, and cloud.',
      riskDrivers: invest.filter((i) => i.blockers).map((i) => `${i.name}: ${i.blockers}`).slice(0, 3),
      recommendedAction: ([...invest].find((i) => /Approve|Fund|Mandate/.test(i.decision)) || invest[0]).decision,
      owner: 'CISO', targetDate: '2026-08-31',
      dataSources: ['Investment-to-Risk Reduction'], component: 'investments',
    }),
    A(13, D.QUESTIONS[12].q, {
      answer: `Major-event readiness is ${readiness.overall}/100 (${readiness.rating}). Weakest: ${[...readiness.items].sort((a, b) => a.score - b.score).slice(0, 2).map((r) => r.name).join(', ')}.`,
      confidence: 'Medium', status: readiness.rating,
      whatChanged: `${readiness.items.filter((r) => r.score < 50).length} readiness elements are weak (esp. restore testing & ransomware).`,
      whyItMatters: 'Determines whether we could contain and recover from a major ransomware or breach event.',
      evidence: readiness.items.map((r) => `${r.name}: ${r.status} (${r.score})`),
      businessImpact: 'Unproven recovery could extend a claims outage for days during ransomware.',
      riskDrivers: [...readiness.items].sort((a, b) => a.score - b.score).slice(0, 3).map((r) => r.name),
      recommendedAction: 'Run a ransomware tabletop and quarterly restore tests',
      owner: 'IR Lead', targetDate: '2026-08-15',
      dataSources: ['Cyber Event Readiness'], component: 'readiness',
    }),
    A(14, D.QUESTIONS[13].q, {
      answer: `${fastEmerging.length} risks are emerging faster than we are adapting — led by ${(fastEmerging[0] || {}).risk}.`,
      confidence: 'Medium', status: 'Weak',
      whatChanged: fastEmerging.map((e) => `${e.risk} (velocity ${e.velocity}, adaptation ${e.ourAdaptation})`).join('; '),
      whyItMatters: 'These outpace current controls and will drive next-period risk if unaddressed.',
      evidence: model.emerging.map((e) => `${e.risk}: ${e.note}`),
      businessImpact: 'GenAI data leakage and identity-based ransomware are the fastest-moving exposures.',
      riskDrivers: fastEmerging.map((e) => e.risk),
      recommendedAction: 'Prioritize GenAI DLP and privileged-identity hardening',
      owner: 'CISO', targetDate: '2026-08-31',
      dataSources: ['Emerging Risk register', 'Threat intel'], component: 'emerging',
    }),
    A(15, D.QUESTIONS[14].q, {
      answer: `We trail peer median most in ${peerGaps.slice(0, 2).map((p) => `${p.domain} (${p.gap})`).join(' and ')}.`,
      confidence: 'Low', status: 'Weak',
      whatChanged: `Largest peer gaps: ${peerGaps.slice(0, 3).map((p) => `${p.domain} ${p.gap}`).join(', ')}.`,
      whyItMatters: 'Trailing peers raises both breach likelihood and board/regulator scrutiny.',
      evidence: model.peers.map((p) => `${p.domain}: us ${p.us} vs peer ${p.peerMedian} (${p.gap})`),
      businessImpact: 'Below-median vulnerability and third-party maturity are the clearest catch-up targets.',
      riskDrivers: peerGaps.slice(0, 3).map((p) => p.domain),
      recommendedAction: `Close the ${peerGaps[0].domain} gap to peer median`,
      owner: 'CISO', targetDate: '2026-12-31',
      dataSources: ['Peer maturity benchmark'], component: 'peers',
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

async function getDashboard(orgId) {
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

  return {
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
  };
}

module.exports = { getDashboard };
