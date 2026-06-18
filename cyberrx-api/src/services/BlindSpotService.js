'use strict';

/**
 * BlindSpotService — per-leader neglect detection (the audit's blind-spot gap).
 *
 * Reads the decision spine (DecisionEngineService: the shared events) and the
 * decision ledger (what's actually been decided, by whom) to surface the
 * patterns leaders miss: undecided critical events, risk being accepted rather
 * than remediated, whole roles that never record a decision, and AI risk going
 * un-owned. Honest by construction — every finding traces to ledger/event data.
 */

const Engine = require('./DecisionEngineService');

const ROLES = ['CISO', 'CIO', 'CFO', 'CRO', 'CLO', 'Board'];

async function detect(orgId) {
  const [{ cards }, ledgerRows] = await Promise.all([Engine.generate(orgId), Engine.ledger(orgId)]);
  const decidedByCard = {};
  ledgerRows.forEach((r) => { if (!decidedByCard[r.card_id]) decidedByCard[r.card_id] = r; });
  const decidedRoles = new Set(ledgerRows.map((r) => r.role).filter(Boolean));

  const critical = cards.filter((c) => c.event.severity === 'Critical');
  const undecided = cards.filter((c) => !decidedByCard[c.id]);
  const undecidedCritical = critical.filter((c) => !decidedByCard[c.id]);
  const aiCards = cards.filter((c) => c.event.category === 'AI');
  const aiUndecided = aiCards.filter((c) => !decidedByCard[c.id]);
  const accepts = ledgerRows.filter((r) => r.action === 'accept');
  const selects = ledgerRows.filter((r) => r.action === 'select');
  const silentRoles = ROLES.filter((r) => !decidedRoles.has(r));

  const findings = [];
  const add = (severity, pattern, detail, recommendation, roles) => findings.push({ severity, pattern, detail, recommendation, roles });

  if (undecidedCritical.length) {
    add('Critical', 'Critical decisions left open', `${undecidedCritical.length} critical event(s) have no recorded decision (e.g. "${undecidedCritical[0].event.title}").`,
      'Action or formally accept each critical event; an open critical with no decision is the classic audit/board finding.', ['CISO', 'CRO', 'Board']);
  }
  if (accepts.length && accepts.length >= (selects.length + accepts.length) * 0.5 && (accepts.length + selects.length) >= 2) {
    add('High', 'Accepting rather than remediating', `${accepts.length} of ${accepts.length + selects.length} decisions were "accept & monitor" rather than a fix.`,
      'Re-check the accepted risks: is the team transferring real risk into the future without a plan? Confirm each acceptance is still justified.', ['CRO', 'CFO', 'Board']);
  }
  if (silentRoles.length) {
    add(silentRoles.length >= 4 ? 'High' : 'Medium', 'Roles not engaging in decisions', `No decisions recorded by: ${silentRoles.join(', ')}.`,
      'Cyber decisions are cross-functional. A role that never decides is a blind spot — pull them into the decision queue.', silentRoles);
  }
  if (aiUndecided.length) {
    add('High', 'AI risk going un-owned', `${aiUndecided.length} AI-risk event(s) detected with no decision (e.g. "${aiUndecided[0].event.title}").`,
      'Assign an owner and a decision to each AI risk; shadow AI and unsupervised agents are the fastest-growing un-owned exposure.', ['CISO', 'CIO', 'CLO']);
  }
  if (!findings.length) {
    add('Low', 'No blind spots detected', 'Every critical event has a recorded decision and all roles are engaging.',
      'Maintain the cadence; re-run after the next event generation.', ROLES);
  }

  const byRole = {};
  ROLES.forEach((role) => { byRole[role] = findings.filter((f) => f.roles.includes(role)); });
  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    summary: { totalEvents: cards.length, undecided: undecided.length, undecidedCritical: undecidedCritical.length, decisionsLogged: ledgerRows.length, silentRoles },
    findings, byRole,
  };
}

module.exports = { detect };
