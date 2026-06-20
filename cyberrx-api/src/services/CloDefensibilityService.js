'use strict';

/**
 * CloDefensibilityService — CLO Sub-tab 3: Defensibility & Evidence.
 *
 * Surfaces the SHARED decision/evidence ledger as a legal artifact: who knew
 * what when, the decisions and their rationale, scored for defensibility. Plus
 * legal-hold status, evidence/privilege preservation, and board-oversight
 * documentation (Caremark duty-of-oversight / SEC governance). Exportable via the
 * shared ledger CSV.
 *
 * Cross-cutting caveat surfaced prominently here: logged acceptances are
 * discoverable in litigation; rationale guidance steers toward defensible
 * reasoning; this behavior is flagged for Legal review before launch.
 */

const logger = require('../utils/logger');

const RATIONALE_MIN = 40; // chars for a "substantive" rationale (heuristic)

async function getDefensibility(orgId) {
  const Engine = require('./DecisionEngineService');
  let ledger = [], cards = [];
  try { ledger = await Engine.ledger(orgId); } catch (e) { logger.debug('clo defensibility ledger failed', { error: e.message }); }
  try { const l = await Engine.list(orgId, 'CLO'); cards = l.cards || []; } catch (_) {}

  // The ledger as a legal record (who knew what when + rationale + defensibility).
  const record = ledger.map((r) => {
    const substantive = r.rationale && String(r.rationale).trim().length >= RATIONALE_MIN;
    const isAccept = r.action === 'accept';
    return {
      at: r.created_at, role: r.role, action: r.action, optionId: r.option_id,
      cardId: r.card_id, decidedBy: r.decided_by, rationale: r.rationale || null,
      discoverable: isAccept,
      defensibility: isAccept ? (substantive ? 'Defensible' : 'Weak — thin rationale') : 'N/A (treatment selected)',
    };
  });
  const accepts = ledger.filter((r) => r.action === 'accept');
  const thin = accepts.filter((r) => !(r.rationale && String(r.rationale).trim().length >= RATIONALE_MIN));

  // "Who knew what when": critical events on the record vs. open.
  const criticalCards = cards.filter((c) => c.event.severity === 'Critical');
  const criticalDecided = criticalCards.filter((c) => c.decision);

  // Board-oversight documentation (Caremark / SEC): is management surfacing
  // critical risk to a decision record at all?
  const oversight = [
    { item: 'Critical risks surfaced to a decision record', status: criticalCards.length === 0 ? 'N/A' : criticalDecided.length === criticalCards.length ? 'Yes' : `${criticalDecided.length}/${criticalCards.length}`, note: 'Caremark: a board must make a good-faith effort to ensure a reporting/monitoring system exists.' },
    { item: 'Decisions carry documented rationale', status: accepts.length === 0 ? 'No acceptances yet' : `${accepts.length - thin.length}/${accepts.length} substantive`, note: 'Defensible decisions are documented, not assumed.' },
    { item: 'Reporting cadence to the board', status: 'Configure', note: 'Evidence a recurring cyber-risk report to the board/committee.' },
    { item: 'SEC governance disclosure readiness', status: criticalCards.length ? 'Review' : 'Monitor', note: 'Reg S-K Item 106: describe board oversight & management role for cyber risk.' },
  ];

  // Legal hold + evidence/privilege preservation (status surface; live wiring
  // comes from the matter/IR system).
  const openMatters = record.some((r) => r.action === 'accept'); // proxy until matter feed
  const preservation = [
    { item: 'Legal hold issued for active scenarios', status: 'Not issued (pre-incident)', note: 'Issue on credible threat of litigation/investigation; suspend routine deletion.' },
    { item: 'Evidence preservation (logs, images, ledger)', status: 'Ledger preserved', note: 'The decision/evidence ledger is retained and exportable as an artifact.' },
    { item: 'Privilege protocol (counsel-directed investigation)', status: 'Define', note: 'Route incident investigation through counsel to support privilege claims.' },
  ];

  const defensibilityScore = ledger.length === 0 ? 40 : Math.round(60 + ((accepts.length - thin.length) / Math.max(1, accepts.length)) * 40);
  const narration = `Here is my read on whether we could defend these decisions later: ` +
    `${thin.length === 0 ? 'this is in reasonable shape' : 'this is the exposure I would close first'}. ` +
    `The good part is that we have a contemporaneous record — ${ledger.length} decision(s) showing who knew what, when, which is exactly what a regulator or plaintiff's counsel will ask for. ` +
    `The concern is the ${accepts.length} risk acceptance(s): ${thin.length} carry thin rationale, and in discovery a one-line "we accepted it" reads as negligence, not judgment. ` +
    `${criticalCards.length ? `On oversight, only ${criticalDecided.length} of ${criticalCards.length} critical risk(s) are decided on the record — under Caremark, an undocumented critical risk is the gap that draws personal liability. ` : ''}` +
    `What I would do: shore up the thin rationales now and export the ledger as your board-oversight artifact — and note every acceptance here is discoverable, which is precisely why it is flagged for Legal review before launch.`;

  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    defensibilityScore,
    summary: { decisions: ledger.length, accepts: accepts.length, thinRationale: thin.length, criticalDecided: criticalDecided.length, criticalTotal: criticalCards.length },
    record, oversight, preservation,
    exportUrl: `/api/decisions/ledger.csv?org_id=${encodeURIComponent(orgId)}`,
    narration,
    legalCaveat: 'LOGGED RISK ACCEPTANCES ARE DISCOVERABLE IN LITIGATION. Rationale fields are designed to guide toward defensible reasoning (business basis, compensating controls, accountable owner, review date). This behavior is FLAGGED FOR LEGAL REVIEW BEFORE LAUNCH — see LEGAL_REVIEW.md.',
  };
}

module.exports = { getDefensibility };
