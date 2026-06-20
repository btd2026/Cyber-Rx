'use strict';

/**
 * DecisionEngineService — the decision spine the architecture audit identified
 * as missing.
 *
 * It produces ONE shared object per predicted event (the DecisionCard) and a
 * TRANSLATION layer that renders that single object into each role's lens — the
 * inverse of the old per-role dashboards, which computed six separate datasets.
 *
 *   Event        — what could happen: attack path + timing (p7/p30/p90, with a
 *                  confidence band) + a loss DISTRIBUTION (seeded Monte Carlo).
 *   DecisionCard — the event + 2–4 response options, each with cost,
 *                  time-to-effect, residual-risk reduction, and operational
 *                  friction, plus an "Accept & monitor" option that REQUIRES a
 *                  logged rationale. Stable id per source risk.
 *   lensFor()    — projects one card into a role framing (CISO/CFO/CIO/CRO/CLO/
 *                  Board). Same event, six views.
 *   record()     — writes the decision + rationale + a snapshot of engine state
 *                  at decision time to the decision ledger.
 *
 * Reads the real substrate through ExecDashboardService.loadCtx (open risks,
 * financial exposure, processes), falling back to the industry-shaped demo only
 * when the org has no data — so the spine is not mock-divorced.
 */

const crypto = require('crypto');
const db = require('../utils/db');
const logger = require('../utils/logger');
const { prov } = require('../utils/provenance');

const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Deterministic PRNG so the Monte Carlo loss distribution is reproducible.
function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

async function ensureLedger() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS decision_ledger (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, card_id TEXT NOT NULL, role TEXT,
      action TEXT NOT NULL, option_id TEXT, rationale TEXT, decided_by TEXT,
      engine_state JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT now())`);
    // Tamper-evidence: a per-org SHA-256 hash chain over the decision record.
    for (const col of ['seq INT', 'prev_hash TEXT', 'entry_hash TEXT', 'ts TEXT']) {
      try { await db.query(`ALTER TABLE decision_ledger ADD COLUMN IF NOT EXISTS ${col}`); } catch (_) {}
    }
    // Per-org CRQ assumption overrides (card_id '_default' = org-wide).
    await db.query(`CREATE TABLE IF NOT EXISTS crq_assumptions (
      org_id TEXT NOT NULL, card_id TEXT NOT NULL, exposure NUMERIC, freq NUMERIC,
      spread_lo NUMERIC, spread_hi NUMERIC, updated_at TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (org_id, card_id))`);
  } catch (e) { logger.debug('decision_ledger ensure failed', { error: e.message }); }
}

// Canonical string a ledger row is hashed over (stored text fields only, so it
// round-trips exactly on verification).
function ledgerCanonical(r) {
  return JSON.stringify({
    id: r.id, org_id: r.org_id, card_id: r.card_id, role: r.role || null, action: r.action,
    option_id: r.option_id || null, rationale: r.rationale || null, decided_by: r.decided_by || null,
    ts: r.ts || null, seq: r.seq, prev_hash: r.prev_hash || '0',
  });
}
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

// ---- timing: p(exploit) — live EPSS/KEV when a CVE is present, else modeled --
const BASE_ANNUAL_P = { Critical: 0.55, High: 0.35, Medium: 0.18, Low: 0.08 };
function timing(ev, signal) {
  // Live signal path: EPSS is a 30-day exploitation probability; KEV = active.
  if (signal && (signal.epss != null || signal.kev)) {
    const p30 = signal.epss != null ? Math.round(signal.epss * 100) : (signal.kev ? 60 : 30);
    const daily = 1 - Math.pow(1 - p30 / 100, 1 / 30);
    const win = (d) => Math.round((1 - Math.pow(1 - daily, d)) * 100);
    return {
      annualPct: win(365), p7: win(7), p30, p90: win(90),
      confidence: signal.epss != null ? 'High' : 'Medium',
      basis: signal.epss != null
        ? `FIRST.org EPSS (30-day exploit probability ${p30}%${signal.kev ? ', on CISA KEV' : ''}) for ${signal.cves.join(', ')}.`
        : `On CISA KEV (actively exploited): ${signal.cves.join(', ') || 'known-exploited'}.`,
      cves: signal.cves || [], kev: !!signal.kev,
    };
  }
  // Modeled fallback.
  let annual = BASE_ANNUAL_P[ev.severity] || 0.2;
  if (/kev|internet|public|exploit|unpatched|rce|ransom/i.test(ev.title)) annual = clamp(annual + 0.12, 0, 0.92);
  const windowP = (days) => Math.round((1 - Math.pow(1 - annual, days / 365)) * 100);
  return {
    annualPct: Math.round(annual * 100), p7: windowP(7), p30: windowP(30), p90: windowP(90),
    confidence: 'Low', basis: 'Modeled from severity and exposure signals — no CVE/EPSS match.', cves: [], kev: false,
  };
}

// ---- loss: seeded Monte Carlo over a triangular magnitude × annual frequency -
function lossDistribution(cardId, exposure, annualPct, ov) {
  const rnd = mulberry32(hash(cardId));
  const E = Math.max(1, (ov && ov.exposure != null ? Number(ov.exposure) : exposure) || 0);
  const spreadLo = (ov && ov.spreadLo != null ? Number(ov.spreadLo) : 0.3);
  const spreadHi = (ov && ov.spreadHi != null ? Number(ov.spreadHi) : 2.2);
  const lo = spreadLo * E, mode = E, hi = spreadHi * E;
  const p = (ov && ov.freq != null ? Number(ov.freq) : (annualPct || 20)) / 100;
  const N = 2000; const losses = [];
  for (let i = 0; i < N; i++) {
    const occurs = rnd() < p;                       // does the event happen this year
    let mag = 0;
    if (occurs) {                                   // triangular magnitude draw
      const u = rnd(); const c = (mode - lo) / (hi - lo);
      mag = u < c ? lo + Math.sqrt(u * (hi - lo) * (mode - lo)) : hi - Math.sqrt((1 - u) * (hi - lo) * (hi - mode));
    }
    losses.push(mag);
  }
  losses.sort((a, b) => a - b);
  const pct = (q) => Math.round(losses[Math.min(N - 1, Math.floor(q * N))]);
  const expected = Math.round(losses.reduce((s, x) => s + x, 0) / N);
  return { expected, p10: pct(0.10), p50: pct(0.50), p90: pct(0.90), worstCase: Math.round(hi), currency: 'USD' };
}

// ---- attack path (compact, directional entry → crown jewel) ----------------
function attackPath(ev, crownProcess) {
  const t = ev.title.toLowerCase();
  const entry = /phish|email|bec/.test(t) ? 'Phishing / credential theft'
    : /mfa|privileg|access|account/.test(t) ? 'Stolen / un-MFA’d credentials'
    : /cloud|bucket|misconfig/.test(t) ? 'Exposed cloud misconfiguration'
    : /vendor|third|clearinghouse|supply/.test(t) ? 'Trusted third-party connection'
    : /ransom|malware|edr|endpoint/.test(t) ? 'Endpoint compromise'
    : 'Exploit of an internet-facing weakness';
  return [
    { step: 'Entry', label: entry },
    { step: 'Foothold', label: ev.affectedSystem || 'Affected system' },
    { step: 'Movement', label: 'Lateral movement / privilege escalation' },
    { step: 'Objective', label: crownProcess || 'Crown-jewel process' },
  ];
}

// ---- decision options (the contract's heart) -------------------------------
function options(cardId, ev) {
  const E = ev.exposure || 0;
  const remediate = Math.round(E * 0.12), mitigate = Math.round(E * 0.04), transfer = Math.round(E * 0.03);
  const opts = [
    { id: 'remediate', label: 'Remediate at the source', cost: remediate, costLabel: usd(remediate), timeToEffectDays: 30, residualRiskReductionPct: 80, friction: 'High', note: 'Fixes the underlying weakness; highest, most durable risk reduction.' },
    { id: 'mitigate', label: 'Apply a compensating control', cost: mitigate, costLabel: usd(mitigate), timeToEffectDays: 7, residualRiskReductionPct: 50, friction: 'Low', note: 'Buys time fast (segmentation, WAF, monitoring) without the full fix.' },
    { id: 'transfer', label: 'Transfer via insurance / limit raise', cost: transfer, costLabel: `${usd(transfer)}/yr`, timeToEffectDays: 60, residualRiskReductionPct: 25, friction: 'Low', note: 'Caps the financial loss, not the likelihood; effective at renewal.' },
    { id: 'accept', label: 'Accept & monitor', cost: 0, costLabel: '$0', timeToEffectDays: 0, residualRiskReductionPct: 0, friction: 'None', acceptsRationale: true, note: 'No spend — requires a documented, signed rationale and a review date.' },
  ];
  // Recommend the option maximizing risk-reduction per (normalized cost + time), excluding accept.
  const score = (o) => o.residualRiskReductionPct / (1 + (o.cost / Math.max(1, E)) * 100 + o.timeToEffectDays / 30);
  const recommended = opts.filter((o) => o.id !== 'accept').sort((a, b) => score(b) - score(a))[0].id;
  return { opts, recommended };
}

// ---- combinatorial / compound risk -----------------------------------------
// The valuable prediction: two (or three) conditions that are low-risk ALONE but
// chain into a severe outcome. We tag each event, match tag pairs against known
// attack-chain synergies, and model the JOINT likelihood/impact/blast-radius —
// then frame the decision as "break one link to collapse the whole chain".
// Scenario type for a risk (board taxonomy): ransomware / data exfil / business
// disruption / fraud. Configurable taxonomy lives in tenant_config; this is the
// default classifier.
function classifyScenario(title) {
  const t = String(title || '').toLowerCase();
  if (/ransom|encrypt|detonation|unrecoverable/.test(t)) return 'Ransomware';
  if (/exfil|leak|data|phi|pii|disclosure|breach|shadow ai/.test(t)) return 'Data exfiltration';
  if (/fraud|payment|wire|\bbec\b|invoice|funds/.test(t)) return 'Fraud';
  if (/outage|availabil|disruption|downtime|continuity|stalled|recover/.test(t)) return 'Business disruption';
  return 'Business disruption';
}

function tagEvent(ev) {
  const t = `${ev.title} ${ev.category || ''}`.toLowerCase();
  const tags = [];
  if (/mfa|credential|password|privileg|access|account|identity/.test(t)) tags.push('credential');
  if (/segment|network|flat|lateral|vpn|rdp|firewall|perimeter/.test(t)) tags.push('network');
  if (/cve|patch|unpatched|vuln|exploit|\brce\b|internet[-\s]?facing|public[-\s]?facing|edge gateway|\bkev\b/.test(t)) tags.push('vuln');
  if (/edr|malware|ransom|endpoint|antivirus/.test(t)) tags.push('endpoint');
  if (/phi|pii|pci|dlp|encrypt|exfil|leak|bucket|storage|data/.test(t)) tags.push('data');
  if (/vendor|third|supply|clearinghouse|baa|fourth/.test(t)) tags.push('vendor');
  if (ev.category === 'AI' || /\bai\b|llm|agent|shadow ai|model/.test(t)) tags.push('ai');
  if (/backup|recover|\bdr\b|restore|resilien/.test(t)) tags.push('backup');
  return tags;
}
// rule: the two tags that chain, the resulting outcome, how much the combination
// amplifies likelihood/impact, and which single control breaks the chain.
const SYNERGIES = [
  { a: 'credential', b: 'network', name: 'Lateral movement to crown jewels', outcome: 'Stolen credentials plus a flat/unsegmented network let an attacker move from a single foothold straight to the crown-jewel processes — a contained incident becomes an enterprise breach.', likeBoost: 28, impactMult: 2.4, breaks: 'Either enforce phishing-resistant MFA or segment the network — breaking one link stops the chain.', roles: ['CISO', 'CRO', 'CIO', 'Board'] },
  { a: 'vuln', b: 'endpoint', name: 'Ransomware detonation', outcome: 'An internet-facing exploit with weak endpoint defense turns a single compromised host into org-wide ransomware.', likeBoost: 30, impactMult: 2.6, breaks: 'Patch the internet-facing weakness OR get EDR to full coverage — either alone breaks the detonation chain.', roles: ['CISO', 'CIO', 'CFO', 'Board'] },
  { a: 'vuln', b: 'credential', name: 'Full domain compromise', outcome: 'An external exploit combined with weak access controls lets an attacker escalate to privileged/domain takeover.', likeBoost: 26, impactMult: 2.3, breaks: 'Patch the exploit OR enforce MFA/PAM on privileged accounts.', roles: ['CISO', 'CRO', 'Board'] },
  { a: 'data', b: 'vendor', name: 'Mass data exfiltration (third-party path)', outcome: 'A data-protection gap plus a trusted vendor egress path enables large-scale PHI/PII exfiltration and mandatory breach notification.', likeBoost: 22, impactMult: 2.2, breaks: 'Add DLP/egress controls OR tighten the vendor connection — one fix removes the bulk-exfil path.', roles: ['CLO', 'CFO', 'CISO', 'CRO'] },
  { a: 'data', b: 'ai', name: 'Mass data exfiltration (AI path)', outcome: 'Sensitive data plus an ungoverned AI/agent egress path enables silent bulk leakage of regulated data — a reportable breach with regulatory exposure.', likeBoost: 24, impactMult: 2.2, breaks: 'Put DLP/redaction on prompts & outputs OR sanction/govern the AI tool.', roles: ['CLO', 'CISO', 'CFO', 'Board'] },
  { a: 'endpoint', b: 'backup', name: 'Unrecoverable ransomware', outcome: 'Ransomware combined with untested/incomplete backups means an extended outage with no clean recovery — the worst-case continuity event.', likeBoost: 18, impactMult: 2.8, breaks: 'Restore-test backups OR strengthen endpoint prevention — either restores recoverability.', roles: ['CISO', 'CIO', 'CFO', 'CRO', 'Board'] },
  { a: 'vendor', b: 'network', name: 'Supply-chain pivot', outcome: 'A compromised trusted third-party connection plus a flat network lets the attacker pivot from the vendor straight into internal crown jewels.', likeBoost: 20, impactMult: 2.1, breaks: 'Segment/zero-trust the vendor connection OR monitor it — one control contains the pivot.', roles: ['CISO', 'CRO', 'CLO'] },
];

function compoundFrom(orgId, A, B, rule, crown, dataAtRisk) {
  const id = `cmp_${orgId}_${hash(A.id + '|' + B.id)}`;
  const aP = A.timing.p30, bP = B.timing.p30, maxP = Math.max(aP, bP), minP = Math.min(aP, bP);
  const jointPct = clamp(Math.round(maxP + rule.likeBoost + minP * 0.3), maxP, 96);
  const win = (days) => { const daily = 1 - Math.pow(1 - jointPct / 100, 1 / 30); return Math.round((1 - Math.pow(1 - daily, days)) * 100); };
  const combinedExposure = Math.round(((A.exposure || 0) + (B.exposure || 0)) * rule.impactMult);
  const loss = lossDistribution(id, combinedExposure, jointPct);
  const cheaper = (A.exposure || 0) <= (B.exposure || 0) ? A : B;
  const other = cheaper === A ? B : A;
  const ev = {
    id: `evt_${id}`, type: 'compound', title: rule.name, severity: 'Critical',
    exposure: combinedExposure, crownJewel: crown, dataAtRisk,
    members: [
      { id: A.id, title: A.title, p30: aP, exposure: A.exposure },
      { id: B.id, title: B.title, p30: bP, exposure: B.exposure },
    ],
    combination: {
      outcome: rule.outcome,
      individual: `Individually: "${A.title}" ~${aP}% and "${B.title}" ~${bP}% in 30 days — each looks manageable.`,
      jointPct, amplification: `${(jointPct / Math.max(1, maxP)).toFixed(1)}×`,
      breaks: rule.breaks, breakLink: cheaper.title, otherLink: other.title,
    },
    timing: { annualPct: win(365), p7: win(7), p30: jointPct, p90: win(90), confidence: 'Modeled (chained)', basis: 'Joint likelihood escalated because the two conditions form a viable attack chain.' },
    loss,
    blastRadius: { reaches: crown, scope: 'Enterprise — chain reaches crown-jewel processes', count: 'Org-wide' },
    attackPath: [
      { step: 'Condition A', label: A.title },
      { step: 'Condition B', label: B.title },
      { step: 'Chain', label: rule.name },
      { step: 'Objective', label: crown },
    ],
    relevantRoles: rule.roles, scenarioType: classifyScenario(rule.name),
  };
  // Decision = which link to break. Breaking either collapses the compound.
  const breakCost = Math.round((cheaper.exposure || 0) * 0.06) || 250000;
  const opts = [
    { id: 'break_cheaper', label: `Break the chain: fix "${cheaper.title}"`, cost: breakCost, costLabel: usd(breakCost), timeToEffectDays: 14, residualRiskReductionPct: 75, friction: 'Medium', note: 'Cheapest single link — fixing it collapses the whole compound scenario.' },
    { id: 'break_other', label: `Break the chain: fix "${other.title}"`, cost: Math.round((other.exposure || 0) * 0.1) || 400000, costLabel: usd(Math.round((other.exposure || 0) * 0.1) || 400000), timeToEffectDays: 30, residualRiskReductionPct: 75, friction: 'High', note: 'Also collapses the chain; higher cost/effort than the other link.' },
    { id: 'both', label: 'Fix both links (defense in depth)', cost: breakCost + (Math.round((other.exposure || 0) * 0.1) || 400000), costLabel: usd(breakCost + (Math.round((other.exposure || 0) * 0.1) || 400000)), timeToEffectDays: 45, residualRiskReductionPct: 92, friction: 'High', note: 'Eliminates the chain and reduces each individual risk.' },
    { id: 'accept', label: 'Accept & monitor', cost: 0, costLabel: '$0', timeToEffectDays: 0, residualRiskReductionPct: 0, friction: 'None', acceptsRationale: true, note: 'Documented, signed acceptance of a chained critical scenario — review date required.' },
  ];
  return { id, type: 'compound', event: ev, options: opts, recommended: 'break_cheaper', status: 'open' };
}

function buildCompounds(orgId, cards, crown, dataAtRisk) {
  const tagged = cards.map((c) => ({ card: c, tags: tagEvent(c.event) }));
  const seen = new Set(); const out = [];
  for (let i = 0; i < tagged.length; i++) {
    for (let j = i + 1; j < tagged.length; j++) {
      const A = tagged[i], B = tagged[j];
      for (const rule of SYNERGIES) {
        const ab = (A.tags.includes(rule.a) && B.tags.includes(rule.b)) || (A.tags.includes(rule.b) && B.tags.includes(rule.a));
        if (!ab) continue;
        const key = [A.card.id, B.card.id, rule.name].sort().join('|');
        if (seen.has(key)) continue; seen.add(key);
        out.push(compoundFrom(orgId, A.card.event, B.card.event, rule, crown, dataAtRisk));
        break; // one synergy per pair
      }
    }
  }
  // Highest combined loss first; cap so the queue stays decision-focused.
  return out.sort((a, b) => b.event.loss.expected - a.event.loss.expected).slice(0, 5);
}

// ---- event + card assembly from the substrate context ----------------------
async function generate(orgId) {
  const Exec = require('./ExecDashboardService');
  const c = await Exec.loadCtx(orgId);
  const assumptions = await loadAssumptions(orgId);
  const ovFor = (id) => assumptions[id] || assumptions._default || null;
  const crown = (c.crownJewels && c.crownJewels[0] && c.crownJewels[0].name)
    || (c.processes && c.processes.atRisk && c.processes.atRisk[0] && c.processes.atRisk[0].name) || 'a crown-jewel process';
  const dataAtRisk = c.crownJewel || (c.industry ? 'regulated data' : 'sensitive data');
  const top = (c.risks && c.risks.top) || [];
  let Threat = null; try { Threat = require('./ThreatSignalService'); } catch (_) {}
  const cards = await Promise.all(top.slice(0, 8).map(async (r) => {
    const id = `dec_${orgId}_${r.id || hash(r.title)}`;
    const ev = {
      id: `evt_${orgId}_${r.id || hash(r.title)}`,
      title: r.title, severity: r.severity || 'High', exposure: r.financialExposure || 0,
      owner: r.owner || r.remediationOwner || null, affectedSystem: (c.processes.atRisk[0] || {}).name || null,
      crownJewel: crown, dataAtRisk, scenarioType: classifyScenario(r.title),
    };
    // Live exploit signal (EPSS/KEV) when the risk/finding text carries a CVE.
    let signal = null;
    if (Threat) { try { signal = await Threat.signalFor(`${r.title} ${r.description || ''} ${r.regulatoryCitation || ''}`); } catch (_) {} }
    ev.timing = timing(ev, signal);
    ev.exploitSignal = signal && (signal.epss != null || signal.kev) ? { epss: signal.epss, kev: signal.kev, cves: signal.cves } : null;
    ev.loss = lossDistribution(id, ev.exposure, ev.timing.annualPct, ovFor(id));
    ev.attackPath = attackPath(ev, crown);
    const { opts, recommended } = options(id, ev);
    return { id, event: ev, options: opts, recommended, status: 'open' };
  }));

  // AI-risk events folded into the SAME spine (migrated from the old per-role
  // aiDecisions): shadow AI on sensitive data, autonomous agents w/o oversight.
  try {
    const inv = await require('./AiInventoryService').inventory(orgId);
    const gross = (c.financial && c.financial.grossExposure) || 0;
    const aiEvents = [];
    const SENS = ['PHI', 'PCI', 'IP/Secrets', 'PII'];
    const systems = inv.systems || [];
    const shadow = systems.find((s) => s.sanctioned === 'Shadow' && SENS.includes(s.dataSensitivity));
    const agent = systems.find((s) => s.autonomy === 'Agentic' && !s.humanInLoop);
    const exfil = systems.find((s) => SENS.includes(s.dataSensitivity) && s.hosting === 'External SaaS' && s.sanctioned !== 'Sanctioned');
    const supply = systems.find((s) => s.sanctioned === 'Shadow' || s.sanctioned === 'Unreviewed');
    const used = new Set();
    const add = (s, ev) => { if (s && !used.has(s.name)) { used.add(s.name); aiEvents.push(ev); } };
    add(shadow, { key: `ai_shadow_${shadow && shadow.name}`, title: `Shadow AI processing sensitive data: "${shadow && shadow.name}"`, severity: 'Critical', exposure: Math.round(gross * 0.2) || 6000000, system: shadow && shadow.name });
    add(agent, { key: `ai_agent_${agent && agent.name}`, title: `Autonomous AI agent without oversight: "${agent && agent.name}"`, severity: 'Critical', exposure: Math.round(gross * 0.15) || 4500000, system: agent && agent.name });
    add(exfil, { key: `ai_exfil_${exfil && exfil.name}`, title: `${exfil && exfil.dataSensitivity} sent to an external model: "${exfil && exfil.name}"`, severity: 'High', exposure: Math.round(gross * 0.12) || 3500000, system: exfil && exfil.name });
    add(supply, { key: `ai_supply_${supply && supply.name}`, title: `Unvetted AI model / supply chain: "${supply && supply.name}"`, severity: 'High', exposure: Math.round(gross * 0.08) || 2500000, system: supply && supply.name });
    aiEvents.forEach((a) => {
      const id = `dec_${orgId}_${hash(a.key)}`;
      const ev = { id: `evt_${orgId}_${hash(a.key)}`, title: a.title, severity: a.severity, exposure: a.exposure, owner: 'CISO', affectedSystem: a.system, crownJewel: crown, dataAtRisk, category: 'AI', scenarioType: classifyScenario(a.title) };
      ev.timing = timing(ev, null);
      ev.loss = lossDistribution(id, ev.exposure, ev.timing.annualPct, ovFor(id));
      ev.attackPath = attackPath(ev, crown);
      const { opts, recommended } = options(id, ev);
      cards.push({ id, event: ev, options: opts, recommended, status: 'open' });
    });
  } catch (_) { /* AI inventory optional */ }

  // Stalled security projects feed the persistent decision queue (a stalled
  // project defers posture and keeps exposure on the books).
  try {
    const pf = await require('./ProjectPortfolioService').portfolio(orgId);
    (pf.projects || []).filter((p) => /hold|delay|behind|risk|block/i.test(p.status || '') || (p.percentComplete || 0) < 25)
      .slice(0, 4).forEach((p) => {
        const a = p.analysis || {}; const d60 = (a.delay || []).find((x) => x.days === 60);
        const id = `dec_${orgId}_proj_${hash(p.name)}`;
        const ev = { id: `evt_${id}`, title: `Stalled project: ${p.name}`, severity: 'High', exposure: a.remainingExposure || (d60 ? d60.exposureRetained : 0) || 0, owner: p.owner || 'CISO', affectedSystem: p.name, crownJewel: crown, dataAtRisk, category: 'project', scenarioType: 'Business disruption' };
        ev.timing = timing(ev, null);
        ev.loss = lossDistribution(id, ev.exposure, ev.timing.annualPct, ovFor(id));
        ev.attackPath = attackPath(ev, crown);
        const opt = options(id, ev);
        cards.push({ id, type: 'single', event: ev, options: opt.opts, recommended: opt.recommended, status: 'open' });
      });
  } catch (_) { /* portfolio optional */ }

  cards.forEach((c) => { if (!c.type) c.type = 'single'; });
  // Compound (chained) scenarios are the headline prediction — surface first.
  const compounds = buildCompounds(orgId, cards.filter((c) => c.event.category !== 'project'), crown, dataAtRisk);
  const all = [...compounds, ...cards];
  // Provenance for the likelihood/loss panel: 'live' when a real exploit signal
  // (EPSS/KEV) drives timing, otherwise 'modeled' (Monte Carlo loss × modeled p).
  all.forEach((c) => {
    const t = (c.event && c.event.timing) || {};
    const liveSignal = (t.cves && t.cves.length) || t.kev;
    const tuned = !!ovFor(c.id);
    c.event.provenance = prov(liveSignal ? 'live' : 'modeled',
      liveSignal ? `EPSS/KEV · ${(t.cves || []).join(', ') || 'CISA KEV'}` : 'Loss & exploit model',
      { lineage: tuned ? 'User-tuned assumptions' : (liveSignal ? null : 'Monte Carlo loss × modeled likelihood') });
  });
  return { organizationId: orgId, generatedAt: new Date().toISOString(), cards: all };
}

// ---- translation engine: one card → a role lens ----------------------------
const FRAME = { CISO: 'Security', CFO: 'Financial', CIO: 'Technology', CRO: 'Risk', CLO: 'Legal', Board: 'Governance' };
// What each leader OWNS — used both to frame the lens and to mark relevance.
const DUTY = {
  CISO: 'the security controls and the attack path', CFO: 'the financial loss and insurance posture',
  CIO: 'the affected systems and operational delivery', CRO: 'risk appetite and aggregation',
  CLO: 'disclosure obligations and materiality', Board: 'the governance decision and oversight',
};

// Turn the attack-path steps into a clear, board-readable sentence and resolve
// the generic "a crown-jewel process" placeholder to something concrete.
function readablePath(e) {
  const generic = /^(a |the )?crown.?jewel process$/i;
  const objective = (e.crownJewel && !generic.test(String(e.crownJewel).trim()))
    ? e.crownJewel : 'your most critical business processes';
  const steps = (e.attackPath || []).map((s) => s.label).filter(Boolean);
  if (steps.length) steps[steps.length - 1] = objective; // swap the generic objective for the real target
  return { objective, path: steps.join(' → ') };
}
const tteText = (d) => (d >= 1 ? `effective in roughly ${d} day${d === 1 ? '' : 's'}` : 'effective immediately');

function lensFor(role, card) {
  const e = card.event;
  const compound = card.type === 'compound';
  const path = e.attackPath.map((s) => s.label).join(' → ');
  const rec = card.options.find((o) => o.id === card.recommended) || card.options[0];
  let headline, primary, secondary, narrative, questionToAsk;
  if (compound) {
    const cb = e.combination, m = e.members;
    switch (role) {
      case 'CRO':
        headline = `Risk aggregation: ${m[0].title} + ${m[1].title}`;
        primary = { label: 'Combined likelihood', value: `${cb.jointPct}% (${cb.amplification} vs. alone)` };
        secondary = { label: 'Combined exposure', value: usd(e.exposure) };
        narrative = `Two sub-threshold risks aggregate above appetite: ${cb.individual} Combined → ${cb.jointPct}%. ${rec.label}.`;
        break;
      case 'CFO':
        headline = `Combined loss ${usd(e.loss.expected)} (P90 ${usd(e.loss.p90)})`;
        primary = { label: 'Expected (combined)', value: usd(e.loss.expected) };
        secondary = { label: 'Amplification', value: `${cb.amplification} vs. either alone` };
        narrative = `Chaining "${m[0].title}" and "${m[1].title}" makes the loss super-additive (${cb.amplification}). Breaking one link is the cheapest way to cut it: ${rec.label} (${rec.costLabel}).`;
        break;
      case 'CLO':
        headline = `Compound disclosure exposure: ${e.dataAtRisk}`;
        primary = { label: 'Combined likelihood', value: `${cb.jointPct}%` };
        secondary = { label: 'Outcome', value: e.title };
        narrative = `${cb.outcome} If realized, notification clocks start across ${e.dataAtRisk}. ${rec.label}.`;
        break;
      case 'CIO':
        headline = `Chain reaches ${e.crownJewel}`;
        primary = { label: 'Cheapest link to break', value: cb.breakLink };
        secondary = { label: 'Time to effect', value: `${rec.timeToEffectDays} days` };
        narrative = `${cb.outcome} You don't have to fix both — ${cb.breaks}`;
        break;
      case 'Board':
        headline = `Two "low" risks combine into a critical event`;
        primary = { label: 'Recommended', value: `${rec.label} (${rec.costLabel})` };
        secondary = { label: 'If we do nothing', value: `${cb.jointPct}% chance, ${usd(e.loss.expected)} expected` };
        narrative = `Individually these looked manageable; together they're critical (${cb.amplification} the likelihood). Management recommends breaking the cheapest link.`;
        questionToAsk = `Are we managing risks in isolation when the real exposure is in how they combine?`;
        break;
      case 'CISO':
      default:
        headline = `Kill chain: ${e.title}`;
        primary = { label: 'Joint likelihood (30d)', value: `${cb.jointPct}%` };
        secondary = { label: 'Chain', value: path };
        narrative = `${cb.outcome} ${cb.breaks} Recommended: ${rec.label}.`;
        break;
    }
  } else {
    switch (role) {
      case 'CFO':
        headline = `${usd(e.loss.p50)} likely loss, up to ${usd(e.loss.p90)} (P90)`;
        primary = { label: 'Expected annual loss', value: usd(e.loss.expected) };
        secondary = { label: 'Worst-case (P90)', value: usd(e.loss.p90) };
        narrative = `Modeled loss distribution for "${e.title}". Transfer caps the downside; remediation lowers the likelihood. Recommended: ${rec.label} (${rec.costLabel}).`;
        break;
      case 'CISO': {
        const rp = readablePath(e);
        headline = `Attack path to ${rp.objective}`;
        primary = { label: '30-day exploit likelihood', value: `${e.timing.p30}%` };
        secondary = { label: 'Path', value: rp.path };
        narrative = `Likely attack path — ${rp.path}. Recommended action: ${rec.label.toLowerCase()} — about ${rec.costLabel}, cuts residual risk by ~${rec.residualRiskReductionPct}%, ${tteText(rec.timeToEffectDays)}, ${rec.friction.toLowerCase()} operational friction.`;
        break;
      }
      case 'CIO':
        headline = `${e.affectedSystem || 'Affected systems'} exposed`;
        primary = { label: 'Time to effect (recommended)', value: `${rec.timeToEffectDays} days` };
        secondary = { label: 'Operational friction', value: rec.friction };
        narrative = `"${e.title}" affects ${e.affectedSystem || 'critical systems'}. Lowest-friction first, durable fix next.`;
        break;
      case 'CRO':
        headline = `${e.severity} risk vs. appetite`;
        primary = { label: '90-day likelihood', value: `${e.timing.p90}%` };
        secondary = { label: 'Exposure', value: usd(e.exposure) };
        narrative = `"${e.title}" contributes ${usd(e.loss.expected)} expected loss. ${e.severity === 'Critical' ? 'Above appetite — decision required.' : 'Track against threshold.'} Recommended: ${rec.label}.`;
        break;
      case 'CLO':
        headline = `Disclosure exposure: ${e.dataAtRisk}`;
        primary = { label: 'If realized, notify within', value: '72 hours (validate per obligation)' };
        secondary = { label: 'Materiality', value: e.severity === 'Critical' ? 'Potentially material' : 'Assess' };
        narrative = `If "${e.title}" is realized against ${e.dataAtRisk}, notification clocks start. Pre-stage the materiality assessment.`;
        break;
      case 'Board':
      default:
        headline = `Decision pending: ${e.title}`;
        primary = { label: 'Recommended', value: `${rec.label} (${rec.costLabel})` };
        secondary = { label: 'If we do nothing', value: `${usd(e.loss.expected)} expected, ${e.timing.p90}% within 90 days` };
        narrative = `Management recommends "${rec.label}". The accept-and-monitor alternative requires a documented rationale.`;
        questionToAsk = `Is "${e.title}" within our approved risk appetite, and who owns the decision?`;
        break;
    }
  }
  return {
    role, framing: FRAME[role] || 'Executive', headline, primary, secondary, narrative,
    questionToAsk: questionToAsk || null, recommended: card.recommended, options: card.options,
    narration: voiceNarration(role, card, rec),
  };
}

// Detailed spoken explanation for the agent voice — covers what it is, the
// numbers, why it matters to THIS leader, and the decision.
function voiceNarration(role, card, rec) {
  const e = card.event;
  const opensWith = `As the ${role}, you own ${DUTY[role] || 'this decision'}. `;
  if (card.type === 'compound') {
    const m = e.members, cb = e.combination;
    return opensWith +
      `Here's a chained risk. On their own, "${m[0].title}" sits around ${m[0].p30} percent and "${m[1].title}" around ${m[1].p30} percent over thirty days — each looks manageable. But combined, ${cb.outcome.toLowerCase()} ` +
      `Together the likelihood jumps to about ${cb.jointPct} percent — roughly ${cb.amplification} either one alone — and the modeled loss climbs to about ${usd(e.loss.expected)} expected, up to ${usd(e.loss.p90)} in a bad case, reaching ${e.crownJewel}. ` +
      `The good news: you don't have to fix everything. ${cb.breaks} The recommendation is to ${rec.label.toLowerCase()}, which costs about ${rec.costLabel} and takes roughly ${rec.timeToEffectDays} days. ` +
      `If you choose to accept and monitor instead, that requires a documented, signed rationale and a review date.`;
  }
  const t = e.timing;
  const basis = t.cves && t.cves.length ? `based on the live exploit signal for ${t.cves.join(', ')}` : 'modeled from severity and exposure';
  return opensWith +
    `The event is "${e.title}". Its likelihood of exploitation is about ${t.p7} percent within seven days, ${t.p30} percent within thirty, and ${t.p90} percent within ninety — ${basis}, at ${t.confidence} confidence. ` +
    `The modeled financial loss is about ${usd(e.loss.expected)} expected, with a ninety-percentile worst case near ${usd(e.loss.p90)}. The attacker path runs ${e.attackPath.map((s) => s.label).join(', then ')}. ` +
    `The recommended response is to ${rec.label.toLowerCase()} — about ${rec.costLabel}, ${rec.timeToEffectDays} days to take effect, cutting residual risk by ${rec.residualRiskReductionPct} percent, with ${rec.friction.toLowerCase()} operational friction. ` +
    `Accepting and monitoring is available but requires a logged rationale.`;
}

async function list(orgId, role) {
  const g = await generate(orgId);
  const decided = await decidedMap(orgId);
  // Central risk appetite (authored in the CRO lens, stored in tenant config) is
  // read HERE so every role's lens shares one appetite definition.
  let appetite = { riskThreshold: 'High' };
  try { const cfg = await require('./TenantConfigService').get(orgId); if (cfg && cfg.config && cfg.config.appetite) appetite = cfg.config.appetite; } catch (_) {}
  const sevRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const threshold = sevRank[appetite.riskThreshold] != null ? sevRank[appetite.riskThreshold] : 1;
  const rel = (card) => (card.type === 'compound' ? (card.event.relevantRoles || []).includes(role) : true);
  let cards = g.cards.map((card) => ({
    id: card.id, type: card.type, event: card.event, options: card.options, recommended: card.recommended,
    decision: decided[card.id] || null, relevant: role ? rel(card) : true,
    aboveAppetite: (sevRank[card.event.severity] != null ? sevRank[card.event.severity] : 1) <= threshold,
    lens: role ? lensFor(role, card) : null,
  }));
  if (role) {
    // This leader's pertinent decisions first: relevant compounds, then their
    // relevant singles, then the rest — so each C-level sees their own view.
    const rank = (c) => (c.relevant && c.type === 'compound' ? 0 : c.relevant ? 1 : c.type === 'compound' ? 2 : 3);
    cards = cards.sort((a, b) => rank(a) - rank(b));
  }
  return { organizationId: orgId, generatedAt: g.generatedAt, role: role || null, appetite, cards };
}

async function decidedMap(orgId) {
  await ensureLedger();
  try {
    const rows = await db.query('SELECT DISTINCT ON (card_id) card_id, action, option_id, rationale, decided_by, created_at FROM decision_ledger WHERE org_id=$1 ORDER BY card_id, created_at DESC', [orgId]);
    const m = {}; rows.forEach((r) => { m[r.card_id] = { action: r.action, optionId: r.option_id, rationale: r.rationale, decidedBy: r.decided_by, at: r.created_at }; });
    return m;
  } catch (_) { return {}; }
}

async function record(orgId, cardId, { role, action, optionId, rationale, decidedBy, engineState }) {
  await ensureLedger();
  if (action === 'accept' && (!rationale || !String(rationale).trim())) {
    const err = new Error('A documented rationale is required to accept & monitor a risk.'); err.code = 'RATIONALE_REQUIRED'; throw err;
  }
  const id = `dl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ts = new Date().toISOString();
  // Link into the per-org hash chain (append-only, tamper-evident).
  let prevHash = '0', seq = 1;
  try {
    const last = await db.query('SELECT seq, entry_hash FROM decision_ledger WHERE org_id=$1 AND entry_hash IS NOT NULL ORDER BY seq DESC LIMIT 1', [orgId]);
    if (last[0]) { prevHash = last[0].entry_hash || '0'; seq = (Number(last[0].seq) || 0) + 1; }
  } catch (_) {}
  const row = { id, org_id: orgId, card_id: cardId, role: role || null, action, option_id: optionId || null, rationale: rationale || null, decided_by: decidedBy || null, ts, seq, prev_hash: prevHash };
  const entryHash = sha256(ledgerCanonical(row));
  await db.query(
    `INSERT INTO decision_ledger (id, org_id, card_id, role, action, option_id, rationale, decided_by, engine_state, ts, seq, prev_hash, entry_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [id, orgId, cardId, role || null, action, optionId || null, rationale || null, decidedBy || null, JSON.stringify(engineState || {}), ts, seq, prevHash, entryHash]);
  return { id, recorded: true, seq, entryHash };
}

// ---- CRQ assumptions + methodology transparency ----------------------------
async function loadAssumptions(orgId) {
  await ensureLedger();
  const map = {};
  try {
    (await db.query('SELECT card_id, exposure, freq, spread_lo, spread_hi FROM crq_assumptions WHERE org_id=$1', [orgId]))
      .forEach((r) => { map[r.card_id] = { exposure: r.exposure, freq: r.freq, spreadLo: r.spread_lo, spreadHi: r.spread_hi }; });
  } catch (_) {}
  return map;
}

async function saveAssumptions(orgId, { cardId, exposure, freq, spreadLo, spreadHi }) {
  await ensureLedger();
  const key = cardId || '_default';
  await db.query(
    `INSERT INTO crq_assumptions (org_id, card_id, exposure, freq, spread_lo, spread_hi, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,now())
     ON CONFLICT (org_id, card_id) DO UPDATE SET exposure=EXCLUDED.exposure, freq=EXCLUDED.freq, spread_lo=EXCLUDED.spread_lo, spread_hi=EXCLUDED.spread_hi, updated_at=now()`,
    [orgId, key, exposure != null ? Number(exposure) : null, freq != null ? Number(freq) : null, spreadLo != null ? Number(spreadLo) : null, spreadHi != null ? Number(spreadHi) : null]);
  return { saved: true, cardId: key };
}

function methodology(orgId, overrides) {
  return {
    model: 'Annualized loss = Loss Event Frequency (LEF) × Loss Magnitude (LM), FAIR-aligned.',
    frequency: 'LEF from FIRST.org EPSS (30-day exploit probability) and CISA KEV when a CVE is present; otherwise modeled from severity and exposure signals.',
    magnitude: 'LM is a triangular distribution around the asset exposure (low 0.3×, mode 1×, high 2.2× by default; tunable).',
    method: 'Monte Carlo, 2,000 iterations, seeded per card for reproducibility. Reported as expected, P10, P50, P90 and worst case.',
    dataSources: ['FIRST.org EPSS', 'CISA Known Exploited Vulnerabilities', 'Org exposure / asset value', 'Org-tuned assumptions'],
    tunable: ['exposure (asset value)', 'freq (annual % override)', 'spreadLo / spreadHi (magnitude spread)'],
    overrides: overrides || {},
  };
}

// ---- tamper-evident verification + evidence package ------------------------
async function verifyLedger(orgId) {
  await ensureLedger();
  let rows = [];
  try { rows = await db.query('SELECT * FROM decision_ledger WHERE org_id=$1 AND entry_hash IS NOT NULL ORDER BY seq ASC', [orgId]); } catch (_) {}
  let prev = '0', brokenAt = null;
  for (const r of rows) {
    if ((r.prev_hash || '0') !== prev) { brokenAt = r.seq; break; }
    if (sha256(ledgerCanonical(r)) !== r.entry_hash) { brokenAt = r.seq; break; }
    prev = r.entry_hash;
  }
  return { valid: brokenAt == null, entries: rows.length, brokenAt, rootHash: rows.length ? rows[rows.length - 1].entry_hash : null };
}

async function evidencePackage(orgId) {
  const [rows, integrity] = [await ledger(orgId), await verifyLedger(orgId)];
  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    integrity,
    decisions: rows.map((r) => ({ ts: r.ts || r.created_at, seq: r.seq, role: r.role, action: r.action, optionId: r.option_id, cardId: r.card_id, rationale: r.rationale, decidedBy: r.decided_by, entryHash: r.entry_hash, prevHash: r.prev_hash })),
    manifest: { entries: integrity.entries, rootHash: integrity.rootHash, chainValid: integrity.valid, algorithm: 'SHA-256 per-org hash chain' },
  };
}

async function ledger(orgId) {
  await ensureLedger();
  try { return await db.query('SELECT * FROM decision_ledger WHERE org_id=$1 ORDER BY created_at DESC LIMIT 200', [orgId]); }
  catch (_) { return []; }
}

module.exports = { generate, lensFor, list, record, ledger, loadAssumptions, saveAssumptions, methodology, verifyLedger, evidencePackage };
