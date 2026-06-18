'use strict';

/**
 * CoachingService — the coaching layer (the audit's coaching gap).
 *
 * For a given role, turns the current decision spine into: the questions that
 * leader should be asking right now, a materiality checklist (is this a
 * disclosable event?), and a ready-to-run tabletop built from the top event.
 * Driven entirely by live events/decisions so the coaching is specific, not
 * generic boilerplate.
 */

const Engine = require('./DecisionEngineService');

const STANDING_QUESTIONS = {
  CISO: ['Which event is most likely to be exploited in the next 30 days, and is it owned?', 'Where would an attacker reach a crown-jewel process fastest?', 'What are we accepting without a remediation plan?'],
  CIO: ['Which decision creates the most operational friction, and is there a lower-friction path?', 'What is end-of-life and on an attack path?', 'Are we resourced to hit the recommended time-to-effect?'],
  CFO: ['What is our expected annual loss vs. P90 worst case across open events?', 'Where does insurance cap the loss vs. where do we self-insure?', 'Which remediation buys the most loss-avoidance per dollar?'],
  CRO: ['Which open events are above our approved appetite?', 'Are we aggregating correlated risk we are treating as separate?', 'Which accepted risks need re-approval?'],
  CLO: ['If the top event is realized, what notification clocks start and when?', 'Which events involve regulated data and could be material?', 'Do we have a documented, signed rationale for every accepted risk?'],
  Board: ['Are the critical decisions owned and within appetite?', 'Is management remediating or quietly accepting risk?', 'Are we investing where the expected loss is highest?'],
};

function materialityChecklist(top) {
  if (!top) return [];
  const e = top.event;
  const sensitive = /phi|pci|pii|ip|secret|regulated|sensitive/i.test(e.dataAtRisk || '');
  return [
    { item: 'Involves regulated / sensitive data', status: sensitive ? 'Yes' : 'Review', note: e.dataAtRisk || 'unknown' },
    { item: 'Quantified financial impact is significant', status: e.loss.p90 >= 5e6 ? 'Yes' : 'Review', note: `P90 ${Math.round(e.loss.p90 / 1e6)}M` },
    { item: 'High near-term likelihood', status: e.timing.p30 >= 30 ? 'Yes' : 'Review', note: `${e.timing.p30}% in 30 days (${e.timing.confidence} confidence)` },
    { item: 'Notification clocks would trigger if realized', status: sensitive ? 'Likely (HIPAA/state/SEC — validate)' : 'Assess', note: 'Confirm per obligation' },
    { item: 'A documented decision + rationale exists', status: top.decisionLogged ? 'Yes' : 'No — required', note: top.decisionLogged ? 'logged' : 'open' },
  ];
}

function tabletop(top) {
  if (!top) return null;
  const e = top.event;
  return {
    scenario: `It's Monday morning. "${e.title}" has been realized against ${e.crownJewel}. Attacker path: ${e.attackPath.map((s) => s.label).join(' → ')}.`,
    prompts: [
      `Detection: How would we know this is happening, and how fast? (Modeled likelihood was ${e.timing.p30}% in 30 days.)`,
      `Decision: Who authorizes the response, and which of the prepared options do we execute?`,
      `Communications: Who must be notified (regulators, customers, board) and on what clock?`,
      `Recovery & cost: What is the expected loss (${Math.round(e.loss.expected / 1e6)}M expected, ${Math.round(e.loss.p90 / 1e6)}M P90), and is it within appetite/insurance?`,
    ],
  };
}

async function forRole(orgId, role) {
  const [{ cards }, ledger] = await Promise.all([Engine.generate(orgId), Engine.ledger(orgId)]);
  const decided = new Set(ledger.map((r) => r.card_id));
  const enriched = cards.map((c) => ({ ...c, decisionLogged: decided.has(c.id) }));
  const top = [...enriched].sort((a, b) => (b.event.loss.expected - a.event.loss.expected))[0] || null;
  const lensQuestions = role === 'Board'
    ? enriched.map((c) => Engine.lensFor('Board', c).questionToAsk).filter(Boolean).slice(0, 3)
    : [];
  return {
    organizationId: orgId, role, generatedAt: new Date().toISOString(),
    questionsToAsk: [...new Set([...(lensQuestions), ...(STANDING_QUESTIONS[role] || STANDING_QUESTIONS.Board)])].slice(0, 5),
    materialityChecklist: materialityChecklist(top),
    tabletop: tabletop(top),
    topEvent: top ? { title: top.event.title, severity: top.event.severity } : null,
  };
}

module.exports = { forRole };
