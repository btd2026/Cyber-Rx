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

  // CIO-specific patterns from the shared ledger: repeated velocity-over-control,
  // and recovery assumptions that have never been decided/tested.
  const shipChoices = ledgerRows.filter((r) => /_friction_/.test(r.card_id || '') && r.action === 'select' && r.option_id === 'ship');
  if (shipChoices.length >= 2) {
    add('High', 'Velocity over control on delivery', `${shipChoices.length} initiative(s) were shipped on time with the security gate deferred rather than built in.`,
      'A repeated ship-on-time pattern compounds un-owned risk on the systems you depend on most. Set a secure-by-design default for tier-0 and require sign-off to defer it.', ['CIO', 'CISO', 'Board']);
  }
  const disruption = cards.filter((c) => c.event.scenarioType === 'Business disruption' || c.event.scenarioType === 'Ransomware');
  const disruptionUndecided = disruption.filter((c) => !decidedByCard[c.id]);
  if (disruptionUndecided.length) {
    add(disruptionUndecided.some((c) => c.event.severity === 'Critical') ? 'High' : 'Medium', 'Untested recovery assumptions',
      `${disruptionUndecided.length} business-disruption / ransomware event(s) have no recorded recovery decision — the recovery plan is assumed, not validated.`,
      'Run a restore test against declared RTO/RPO for the tier-0 services these events threaten, and record the result; an untested backup is the classic unrecoverable-ransomware blind spot.', ['CIO', 'CISO', 'CRO']);
  }

  // CRO-specific patterns: appetite-vs-reality gaps and unmanaged aggregation.
  let appetite = { riskThreshold: 'High' };
  try { const cfg = await require('./TenantConfigService').get(orgId); if (cfg && cfg.config && cfg.config.appetite) appetite = cfg.config.appetite; } catch (_) {}
  const sevRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const apThreshold = sevRank[appetite.riskThreshold] != null ? sevRank[appetite.riskThreshold] : 1;
  const aboveAppetiteUndecided = cards.filter((c) => (sevRank[c.event.severity] != null ? sevRank[c.event.severity] : 1) <= apThreshold && !decidedByCard[c.id]);
  if (aboveAppetiteUndecided.length) {
    add('High', 'Appetite-vs-reality gap', `${aboveAppetiteUndecided.length} exposure(s) sit at or above the board-set appetite (${appetite.riskThreshold}+) with no recorded risk decision.`,
      'Either bring these within appetite with a treatment, or formally accept them with a signed rationale — an appetite stated but not enforced is a governance finding.', ['CRO', 'Board', 'CISO']);
  }
  const compoundsUndecided = cards.filter((c) => c.type === 'compound' && !decidedByCard[c.id]);
  if (compoundsUndecided.length) {
    add('High', 'Unmanaged aggregation / concentration', `${compoundsUndecided.length} correlated multi-risk scenario(s) are undecided — risks managed individually that combine above appetite (e.g. "${compoundsUndecided[0].event.title}").`,
      'Govern these at portfolio altitude: break one link to collapse the chain, and check for single vendor/cloud/region dependencies behind the correlation.', ['CRO', 'Board']);
  }

  if (!findings.length) {
    add('Low', 'No blind spots detected', 'Every critical event has a recorded decision and all roles are engaging.',
      'Maintain the cadence; re-run after the next event generation.', ROLES);
  }

  const byRole = {};
  ROLES.forEach((role) => { byRole[role] = findings.filter((f) => f.roles.includes(role)); });
  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    summary: {
      totalEvents: cards.length, undecided: undecided.length,
      criticalTotal: critical.length, undecidedCritical: undecidedCritical.length,
      aiTotal: aiCards.length, aiOpen: aiUndecided.length,
      decisionsLogged: ledgerRows.length, silentRoles,
    },
    findings, byRole,
  };
}

module.exports = { detect };
