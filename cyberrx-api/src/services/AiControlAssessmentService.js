'use strict';

/**
 * AiControlAssessmentService — AI governance Phase 2: assess AI controls against
 * NIST AI RMF, the OWASP Top 10 for LLM Applications, and MITRE ATLAS.
 *
 * Each framework is assessed INDEPENDENTLY (no cross-framework mapping), matching
 * the platform's control-assessment principle. Scoring is driven by the AI-BOM
 * signals collected in Phase 1 (shadow AI, agentic-without-oversight, sensitive
 * data to external models, ungoverned systems, inventory completeness). Where a
 * control needs evidence we don't yet have a connector for, it scores as a
 * transparent "Partial — needs evidence" rather than a fabricated pass.
 */

const AI = require('./AiInventoryService');

const band = (s) => (s >= 80 ? 'Strong' : s >= 60 ? 'Partial' : s >= 40 ? 'Weak' : 'Gap');
const clamp = (n) => Math.max(5, Math.min(98, Math.round(n)));

// Derive scoring signals from the AI-BOM.
async function signals(orgId) {
  const inv = await AI.inventory(orgId);
  const c = inv.counts || {};
  const t = Math.max(1, c.total || 0);
  return {
    total: c.total || 0,
    hasInventory: (c.total || 0) > 0,
    shadow: c.shadow || 0, shadowRate: (c.shadow || 0) / t,
    agentic: c.agentic || 0,
    agenticNoHITL: (inv.systems || []).filter((s) => s.autonomy === 'Agentic' && !s.humanInLoop).length,
    sensitiveExternal: c.sensitiveExternal || 0, sensitiveExternalRate: (c.sensitiveExternal || 0) / t,
    ungoverned: c.ungoverned || 0, ungovernedRate: (c.ungoverned || 0) / t,
    critical: c.critical || 0,
    governanceScore: inv.governanceScore || 60,
  };
}

// Each control: id, name, and score(sig) → 0-100. Findings/recs derived from band.
// "base" controls that need evidence we can't yet pull score 55 (Partial).
const NEEDS_EVIDENCE = 55;

// `d` = the dominant AI-BOM signal that drives this control's score; it powers
// the grounded "why / target / decision" the leader sees (see DRIVERS below).
const NIST_AI_RMF = {
  id: 'nist_ai_rmf', name: 'NIST AI RMF',
  controls: [
    { id: 'GV-1', name: 'AI policy & accountability', fn: 'GOVERN', d: 'ungoverned', score: (s) => clamp(s.hasInventory ? 78 - s.ungovernedRate * 40 : 35) },
    { id: 'GV-2', name: 'AI inventory & roles/ownership', fn: 'GOVERN', d: 'ungoverned', score: (s) => clamp(s.hasInventory ? 85 - s.ungovernedRate * 50 : 25) },
    { id: 'GV-3', name: 'AI/third-party supply chain', fn: 'GOVERN', d: 'supplychain', score: (s) => clamp(80 - s.sensitiveExternalRate * 45 - s.shadowRate * 20) },
    { id: 'MP-1', name: 'Context & intended use mapped', fn: 'MAP', d: 'shadow', score: (s) => clamp(s.hasInventory ? 72 - s.shadowRate * 40 : 35) },
    { id: 'MP-2', name: 'AI risk identification', fn: 'MAP', d: 'critical', score: (s) => clamp(75 - s.critical * 8) },
    { id: 'MP-3', name: 'Impact assessment (incl. EU AI Act tiering)', fn: 'MAP', d: 'evidence', score: () => NEEDS_EVIDENCE },
    { id: 'MS-1', name: 'Test, evaluation & red-teaming', fn: 'MEASURE', d: 'evidence', score: () => NEEDS_EVIDENCE - 5 },
    { id: 'MS-2', name: 'Monitoring & metrics', fn: 'MEASURE', d: 'shadow', score: (s) => clamp(60 - s.shadowRate * 30) },
    { id: 'MS-3', name: 'Data quality & provenance', fn: 'MEASURE', d: 'sensitive', score: (s) => clamp(65 - s.sensitiveExternalRate * 30) },
    { id: 'MG-1', name: 'Risk response & treatment', fn: 'MANAGE', d: 'ungoverned', score: (s) => clamp(70 - s.ungovernedRate * 35) },
    { id: 'MG-2', name: 'AI incident response', fn: 'MANAGE', d: 'evidence', score: () => NEEDS_EVIDENCE },
    { id: 'MG-3', name: 'Human oversight & change mgmt', fn: 'MANAGE', d: 'agentic', score: (s) => clamp(s.agenticNoHITL ? 40 - s.agenticNoHITL * 8 : 75) },
  ],
};

const OWASP_LLM = {
  id: 'owasp_llm', name: 'OWASP Top 10 for LLMs',
  controls: [
    { id: 'LLM01', name: 'Prompt injection', d: 'evidence', score: () => NEEDS_EVIDENCE },
    { id: 'LLM02', name: 'Sensitive information disclosure', d: 'sensitive', score: (s) => clamp(80 - s.sensitiveExternalRate * 55) },
    { id: 'LLM03', name: 'Supply chain (models/plugins)', d: 'shadow', score: (s) => clamp(72 - s.shadowRate * 35) },
    { id: 'LLM04', name: 'Data & model poisoning', d: 'evidence', score: () => NEEDS_EVIDENCE },
    { id: 'LLM05', name: 'Improper output handling', d: 'evidence', score: () => NEEDS_EVIDENCE },
    { id: 'LLM06', name: 'Excessive agency', d: 'agentic', score: (s) => clamp(s.agenticNoHITL ? 38 - s.agenticNoHITL * 8 : s.agentic ? 65 : 82) },
    { id: 'LLM07', name: 'System prompt leakage', d: 'evidence', score: () => NEEDS_EVIDENCE },
    { id: 'LLM08', name: 'Vector & embedding weaknesses', d: 'sensitive', score: (s) => clamp(s.sensitiveExternal ? 58 : 70) },
    { id: 'LLM09', name: 'Misinformation / overreliance', d: 'agentic', score: (s) => clamp(s.agenticNoHITL ? 50 : 68) },
    { id: 'LLM10', name: 'Unbounded consumption', d: 'evidence', score: () => NEEDS_EVIDENCE + 5 },
  ],
};

const MITRE_ATLAS = {
  id: 'mitre_atlas', name: 'MITRE ATLAS',
  controls: [
    { id: 'AML.TA0002', name: 'Reconnaissance of AI systems', d: 'shadow', score: (s) => clamp(s.shadow ? 55 : 70) },
    { id: 'AML.TA0004', name: 'Initial access to AI/ML', d: 'sensitive', score: (s) => clamp(75 - s.sensitiveExternalRate * 30) },
    { id: 'AML.T0051', name: 'LLM prompt injection', d: 'evidence', score: () => NEEDS_EVIDENCE },
    { id: 'AML.T0024', name: 'Exfiltration via AI inference', d: 'sensitive', score: (s) => clamp(78 - s.sensitiveExternalRate * 50) },
    { id: 'AML.T0018', name: 'Manipulate AI model (poisoning)', d: 'evidence', score: () => NEEDS_EVIDENCE },
    { id: 'AML.T0053', name: 'LLM plugin / tool compromise', d: 'agentic', score: (s) => clamp(s.agenticNoHITL ? 42 : s.agentic ? 62 : 78) },
    { id: 'AML.TA0011', name: 'Impact (abuse / DoS of AI)', d: 'evidence', score: () => NEEDS_EVIDENCE + 5 },
    { id: 'AML.T0048', name: 'Discover model ontology / data', d: 'shadow', score: (s) => clamp(s.shadowRate ? 52 : 68) },
  ],
};

const FRAMEWORKS = { nist_ai_rmf: NIST_AI_RMF, owasp_llm: OWASP_LLM, mitre_atlas: MITRE_ATLAS };

function findingFor(name, st) {
  if (st === 'Strong') return `${name}: operating effectively based on current AI inventory signals.`;
  if (st === 'Partial') return `${name}: partially in place — needs evidence or hardening to confirm.`;
  if (st === 'Weak') return `${name}: weak — current AI usage shows material gaps here.`;
  return `${name}: gap — not addressed for the AI systems in scope.`;
}
function recFor(id, name, st) {
  if (st === 'Strong') return 'Maintain and add continuous monitoring.';
  const map = {
    'LLM06': 'Constrain agent permissions and require human approval for consequential actions.',
    'LLM02': 'Add DLP/redaction on prompts and outputs; restrict sensitive data sent to external models.',
    'MG-3': 'Put human-in-the-loop on autonomous agents; gate high-impact actions.',
    'GV-2': 'Assign an owner to every AI system and bring shadow AI under governance.',
    'MP-3': 'Run an impact assessment and classify each system under the EU AI Act risk tiers.',
    'MS-1': 'Stand up model evals and adversarial red-teaming (prompt injection, jailbreak).',
  };
  return map[id] || `Address ${name.toLowerCase()} with a defined control and supporting evidence.`;
}

// Decision-grade explanation per control, grounded in the live AI-BOM signals:
// WHY it scored this way, the TARGET state, and the DECISION leadership should
// take. Keyed by the control's dominant driver. Goal: support a decision, not
// just label a status.
const TARGET_SCORE = 80; // "Strong"
function explain(driver, sig, status, name) {
  if (status === 'Strong') {
    return { why: 'Current AI inventory signals show this operating effectively.', target: 'Sustain at Strong (80+); keep evidence current.', decision: 'No action beyond continuous monitoring and scheduled re-test.' };
  }
  const E = {
    ungoverned: {
      why: `${sig.ungoverned} of ${sig.total} AI systems have no accountable owner or formal governance — that is what holds this at ${status}.`,
      target: 'Every AI system has a named owner and sits under governance (0 ungoverned).',
      decision: 'Mandate owner assignment for each system and set a deadline to govern or retire shadow AI.',
    },
    shadow: {
      why: `${sig.shadow} shadow-AI tool(s) are in use outside oversight, so this can't be assured.`,
      target: 'No unsanctioned AI; all GenAI access routed through approved, monitored tools.',
      decision: 'Run a shadow-AI amnesty, then block unsanctioned GenAI at the egress/proxy.',
    },
    sensitive: {
      why: `${sig.sensitiveExternal} system(s) send regulated/sensitive data to external models with no confirmed safeguards.`,
      target: 'No sensitive data leaves to external models without DLP, redaction and a signed DPA.',
      decision: 'Require DLP/redaction on prompts & outputs; approve external-model use of sensitive data only with a DPA.',
    },
    supplychain: {
      why: `External model dependencies (${sig.sensitiveExternal} external, ${sig.shadow} shadow) are not yet under third-party governance.`,
      target: 'Every external AI/model provider is inventoried, risk-assessed and contractually governed.',
      decision: 'Bring AI providers into TPRM; require model & data terms (DPA, training-data use) before approval.',
    },
    agentic: {
      why: `${sig.agenticNoHITL} autonomous agent(s) act with no human in the loop, so consequential actions are uncontrolled.`,
      target: 'Agents run least-privilege with human approval gating any consequential action.',
      decision: 'Constrain agent permissions and require human sign-off on high-impact actions.',
    },
    critical: {
      why: `${sig.critical} AI system(s) carry critical risk, which dominates this control.`,
      target: 'Each critical-risk AI system has an identified, owned and treated risk.',
      decision: 'Prioritise treatment of critical-risk systems; accept residual risk only with documented sign-off.',
    },
    evidence: {
      why: 'No connector or artifact is on file to confirm this control yet, so it is scored conservatively as unverified rather than assumed to pass.',
      target: 'Evidence on file (test results, logs, or an attested control), verified on a schedule.',
      decision: `Stand up the control for ${name.toLowerCase()} and capture evidence; until then treat as unverified.`,
    },
  };
  return E[driver] || E.evidence;
}

function scoreFramework(fw, sig) {
  const controls = fw.controls.map((c) => {
    const sc = clamp(c.score(sig));
    const st = band(sc);
    const ex = explain(c.d, sig, st, c.name);
    return {
      id: c.id, name: c.name, fn: c.fn || null, score: sc, status: st,
      finding: findingFor(c.name, st), recommendation: recFor(c.id, c.name, st),
      why: ex.why, target: ex.target, targetScore: TARGET_SCORE, decision: ex.decision,
    };
  });
  const score = clamp(controls.reduce((a, c) => a + c.score, 0) / controls.length);
  return {
    id: fw.id, name: fw.name, score, band: band(score),
    counts: { strong: controls.filter((c) => c.status === 'Strong').length, partial: controls.filter((c) => c.status === 'Partial').length, weak: controls.filter((c) => c.status === 'Weak').length, gap: controls.filter((c) => c.status === 'Gap').length },
    controls,
  };
}

async function assess(orgId, framework) {
  const sig = await signals(orgId);
  if (framework && FRAMEWORKS[framework]) return scoreFramework(FRAMEWORKS[framework], sig);
  return { frameworks: Object.values(FRAMEWORKS).map((fw) => scoreFramework(fw, sig)), signals: sig };
}

// ---- EU AI Act risk classification ----------------------------------------
// Heuristic tiering of each AI system into the Act's risk tiers, with the
// obligations each tier triggers. Real classification is a legal determination;
// this gives the CLO/CRO/Board a defensible first-pass to validate.
const SENSITIVE2 = ['PHI', 'PCI', 'IP/Secrets', 'PII'];
function classifyOne(s) {
  const purpose = (s.purpose || '').toLowerCase();
  const decisional = /decision|triage|eligib|adjudicat|credit|hir|screen|score|prioritiz|approve|deny/.test(purpose);
  const sensitive = SENSITIVE2.includes(s.dataSensitivity);
  let tier, rationale;
  if (decisional && (sensitive || s.autonomy !== 'Assistive')) {
    tier = 'High-risk'; rationale = 'Influences decisions affecting individuals (e.g., access to services/benefits) on sensitive data.';
  } else if (s.autonomy === 'Agentic' || s.systemType === 'LLM Application' || s.systemType === 'Embedded GenAI') {
    tier = 'Limited-risk'; rationale = 'Interacts with people / generates content — transparency obligations apply.';
  } else {
    tier = 'Minimal-risk'; rationale = 'Internal/assistive use with no decisional impact on individuals.';
  }
  const obligations = tier === 'High-risk'
    ? ['Risk management system', 'Data governance & quality', 'Technical documentation', 'Human oversight', 'Logging & traceability', 'Accuracy/robustness/cybersecurity', 'Conformity assessment']
    : tier === 'Limited-risk' ? ['Transparency: disclose AI use', 'Label AI-generated content', 'Basic logging'] : ['Voluntary codes of conduct'];
  return { name: s.name, tier, rationale, obligations, dataSensitivity: s.dataSensitivity, autonomy: s.autonomy, owner: s.owner, sanctioned: s.sanctioned };
}
async function classifyEuAiAct(orgId) {
  const inv = await AI.inventory(orgId);
  const systems = (inv.systems || []).map(classifyOne);
  const counts = systems.reduce((m, s) => { const k = s.tier.split('-')[0].toLowerCase(); m[k] = (m[k] || 0) + 1; return m; }, { high: 0, limited: 0, minimal: 0 });
  const high = systems.filter((s) => s.tier === 'High-risk');
  return {
    counts, systems,
    summary: high.length
      ? `${high.length} system(s) likely fall under the EU AI Act's high-risk tier and carry the full obligation set (risk management, human oversight, documentation, conformity assessment). Validate with Legal.`
      : 'No high-risk AI systems identified; transparency obligations apply to your generative/agentic systems. Validate with Legal.',
  };
}

module.exports = { assess, classifyEuAiAct, FRAMEWORKS };
