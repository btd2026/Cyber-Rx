'use strict';

/**
 * CloTriggerService — CLO Sub-tab 2 (priority): Trigger Map & Materiality.
 *
 * For each top cyber scenario (the SHARED decision-spine events — the CLO's
 * trigger and the CISO's technical event are the SAME event), maps the laws /
 * clocks / contracts it would fire, plus a materiality checklist populated from
 * the live event. Each exposure carries the CISO lens (technical) and the CFO
 * lens (financial materiality). Projections show approaching deadlines and
 * litigation likelihood. DecisionCard options are the CLO's first moves:
 * pre-stage notification, legal hold, regulator engagement — written to the
 * shared ledger (and the acceptance rationale is litigation-discoverable, so the
 * guidance steers toward defensible reasoning).
 */

const logger = require('../utils/logger');
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };

async function getTriggers(orgId) {
  const Engine = require('./DecisionEngineService');
  const Obl = require('./CloObligationService');
  const [{ obligations }, listing] = await Promise.all([
    Obl.obligationsFor(orgId),
    Engine.list(orgId, 'CLO').catch(() => ({ cards: [] })),
  ]);
  const cards = listing.cards || [];

  const scenarios = [...cards]
    .sort((a, b) => ((b.event.loss && b.event.loss.expected) || 0) - ((a.event.loss && a.event.loss.expected) || 0))
    .slice(0, 8)
    .map((card) => {
      const e = card.event;
      // Laws/clocks/contracts this shared event would fire.
      const fired = obligations.filter((o) => Obl.firesFor(o, e)).map((o) => ({ obligation: o.obligation, jurisdiction: o.jurisdiction, clockLabel: o.clockLabel, clockHours: o.clockHours, trigger: o.trigger }));
      const nearest = fired.filter((f) => f.clockHours != null).sort((a, b) => a.clockHours - b.clockHours)[0] || null;
      // Cross-lens views of the SAME event.
      let cisoLens = null, cfoLens = null;
      try { cisoLens = Engine.lensFor('CISO', card); } catch (_) {}
      try { cfoLens = Engine.lensFor('CFO', card); } catch (_) {}
      const litigationLikelihood = litigationRisk(e);
      return {
        id: card.id, type: card.type, title: e.title, severity: e.severity, scenarioType: e.scenarioType,
        dataAtRisk: e.dataAtRisk, crownJewel: e.crownJewel, loss: e.loss, timing: e.timing,
        decision: card.decision || null, aboveAppetite: card.aboveAppetite,
        firedObligations: fired, nearestClock: nearest,
        materiality: materialityChecklist(card),
        technical: cisoLens ? { headline: cisoLens.headline, narrative: cisoLens.narrative, attackPath: e.attackPath } : null,
        financialMateriality: cfoLens ? { headline: cfoLens.headline, primary: cfoLens.primary, narrative: cfoLens.narrative } : null,
        projection: { p30: e.timing.p30, p90: e.timing.p90, litigationLikelihood, nearestDeadline: nearest ? nearest.clockLabel : 'No fixed clock' },
        options: cloOptions(card.id),
        recommended: 'prestage',
      };
    });

  const totalFired = new Set();
  scenarios.forEach((s) => s.firedObligations.forEach((f) => totalFired.add(f.obligation)));
  const narration = `Trigger map and materiality, General Counsel. ${scenarios.length} top cyber scenario(s) would collectively fire ${totalFired.size} distinct obligation(s). ` +
    `${scenarios.filter((s) => s.materiality.material).length} screen as potentially material. ` +
    `Each scenario is the same technical event the security team sees — click for the attack path and the financial-materiality translation. ` +
    `The first legal moves are pre-staged here: notification, legal hold, regulator engagement.`;

  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    counts: { scenarios: scenarios.length, obligationsFired: totalFired.size, material: scenarios.filter((s) => s.materiality.material).length },
    scenarios, narration, sharedSpine: true,
    legalCaveat: 'Acceptances and rationale recorded here are discoverable in litigation; the rationale guidance steers toward defensible reasoning. Flagged for Legal review before launch.',
  };
}

// Materiality checklist populated from the live event (board/SEC framing).
function materialityChecklist(card) {
  const e = card.event;
  const sensitive = /phi|pci|pii|regulated|sensitive|secret|ip/i.test(e.dataAtRisk || '');
  const items = [
    { item: 'Involves regulated / sensitive data', status: sensitive ? 'Yes' : 'Review', note: e.dataAtRisk || 'unknown' },
    { item: 'Quantified impact is significant', status: (e.loss && e.loss.p90) >= 5e6 ? 'Yes' : 'Review', note: `P90 ${usd((e.loss && e.loss.p90) || 0)}` },
    { item: 'High near-term likelihood', status: (e.timing && e.timing.p30) >= 30 ? 'Yes' : 'Review', note: `${(e.timing && e.timing.p30) || 0}% in 30 days (${e.timing && e.timing.confidence})` },
    { item: 'Notification clocks would trigger', status: sensitive ? 'Likely — validate per obligation' : 'Assess', note: 'See fired obligations' },
    { item: 'Documented decision + rationale exists', status: card.decision ? 'Yes' : 'No — required', note: card.decision ? 'logged' : 'open' },
  ];
  const yes = items.filter((i) => /^yes/i.test(i.status)).length;
  return { items, material: yes >= 3, score: yes };
}

function litigationRisk(e) {
  let s = 0;
  if (/phi|pci|pii|regulated/i.test(e.dataAtRisk || '')) s += 2;
  if (e.severity === 'Critical') s += 2; else if (e.severity === 'High') s += 1;
  if ((e.loss && e.loss.p90) >= 1e7) s += 1;
  if (e.scenarioType === 'Data exfiltration') s += 1;
  return s >= 5 ? 'High' : s >= 3 ? 'Elevated' : 'Moderate';
}

// CLO decision options — written to the shared ledger via the decisions route.
function cloOptions(cardId) {
  return [
    { id: 'prestage', label: 'Pre-stage notification', cost: 0, costLabel: 'Counsel time', timeToEffectDays: 2, friction: 'Low', note: 'Draft notifications and identify recipients/clocks now, before a determination is forced — preserves the ability to meet the shortest clock.' },
    { id: 'legalhold', label: 'Issue legal hold', cost: 0, costLabel: 'Counsel time', timeToEffectDays: 1, friction: 'Low', note: 'Preserve evidence and suspend routine deletion; protects against spoliation claims.' },
    { id: 'regulator', label: 'Proactive regulator engagement', cost: 0, costLabel: 'Counsel time', timeToEffectDays: 5, friction: 'Medium', note: 'Voluntary early engagement can reduce penalty exposure; coordinate messaging with disclosure counsel.' },
    { id: 'accept', label: 'Monitor — no action yet', cost: 0, costLabel: '$0', timeToEffectDays: 0, friction: 'None', acceptsRationale: true, note: 'Documented decision NOT to act yet. Discoverable in litigation — record defensible reasoning: basis for non-materiality, who decided, and the review date.' },
  ];
}

module.exports = { getTriggers };
