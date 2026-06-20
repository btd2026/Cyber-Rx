/**
 * Unit tests for the trust/CRQ/AI-security surfaces added across the executive
 * dashboard work: provenance contract, materiality business-day clock, AI
 * guardrail/agent scoring, and the connector registry. Pure logic — no DB.
 */

const { prov, aggregate, MODES, DEFAULT_CONFIDENCE } = require('../../src/utils/provenance');
const Materiality = require('../../src/services/MaterialityService');
const AiSec = require('../../src/services/AiAgentSecurityService');
const Connectors = require('../../src/services/connectors');

describe('provenance.prov', () => {
  it('defaults confidence by mode and carries fields', () => {
    const p = prov('live', 'Okta', { asOf: '2026-06-20', lineage: 'x' });
    expect(p).toMatchObject({ mode: 'live', source: 'Okta', confidence: DEFAULT_CONFIDENCE.live, asOf: '2026-06-20', lineage: 'x' });
  });
  it('falls back to modeled for an unknown mode', () => {
    expect(prov('bogus', 's').mode).toBe('modeled');
  });
  it('clamps confidence to 0..100', () => {
    expect(prov('live', 's', { confidence: 250 }).confidence).toBe(100);
    expect(prov('live', 's', { confidence: -5 }).confidence).toBe(0);
  });
  it('supplies a default source per mode', () => {
    expect(prov('demo').source).toMatch(/sample/i);
    expect(prov('modeled').source).toMatch(/model/i);
  });
});

describe('provenance.aggregate', () => {
  it('counts modes and reports percentages', () => {
    const a = aggregate([prov('live', 'a'), prov('derived', 'b'), prov('derived', 'c'), prov('demo', 'd')], 'Engine');
    expect(a.total).toBe(4);
    expect(a.counts).toEqual({ live: 1, derived: 2, modeled: 0, demo: 1 });
    expect(a.pct.derived).toBe(50);
    expect(a.source).toBe('Engine');
  });
  it('breaks ties toward the lower-trust mode (never overstates)', () => {
    const a = aggregate([prov('live', 'a'), prov('demo', 'b')]); // 1-1 tie
    expect(a.mode).toBe('demo');
  });
  it('picks the strict majority mode', () => {
    const a = aggregate([prov('live', 'a'), prov('live', 'b'), prov('derived', 'c')]);
    expect(a.mode).toBe('live');
  });
  it('handles an empty set without throwing', () => {
    const a = aggregate([], 'x');
    expect(a.total).toBe(0);
    expect(a.confidence).toBe(0);
  });
});

describe('MaterialityService.businessDayDeadline', () => {
  it('adds 4 business days, skipping the weekend (Fri -> next Thu)', () => {
    // 2026-06-19 is a Friday.
    expect(Materiality.businessDayDeadline('2026-06-19T12:00:00Z', 4).slice(0, 10)).toBe('2026-06-25');
  });
  it('from a Monday, 4 business days lands the same week Friday', () => {
    // 2026-06-22 is a Monday.
    expect(Materiality.businessDayDeadline('2026-06-22T12:00:00Z', 4).slice(0, 10)).toBe('2026-06-26');
  });
  it('exposes the SEC qualitative factor set', () => {
    const ids = Materiality.QUAL_FACTORS.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(['financial', 'operational', 'data', 'reputational', 'legalreg', 'strategic']));
  });
});

describe('AiAgentSecurityService.guardrailFor (OWASP LLM Top 10)', () => {
  it('flags excessive agency (LLM06) as a gap for an agent with no human in the loop', () => {
    const g = AiSec.guardrailFor({ autonomy: 'Agentic', humanInLoop: false, dataSensitivity: 'PII', hosting: 'External SaaS', sanctioned: 'Sanctioned' });
    const llm06 = g.controls.find((c) => c.id === 'LLM06');
    expect(llm06.status).toBe('gap');
    expect(g.gaps.join(' ')).toMatch(/LLM06/);
  });
  it('marks LLM06 n/a for a non-agentic system', () => {
    const g = AiSec.guardrailFor({ autonomy: 'Assistive', humanInLoop: true, dataSensitivity: 'Public/None', hosting: 'Self-hosted', sanctioned: 'Sanctioned' });
    expect(g.controls.find((c) => c.id === 'LLM06').status).toBe('n_a');
  });
  it('flags sensitive-info disclosure (LLM02) for shadow AI sending sensitive data externally', () => {
    const g = AiSec.guardrailFor({ autonomy: 'Assistive', humanInLoop: true, dataSensitivity: 'PHI', hosting: 'External SaaS', sanctioned: 'Shadow' });
    expect(g.controls.find((c) => c.id === 'LLM02').status).toBe('gap');
  });
  it('produces a bounded score', () => {
    const g = AiSec.guardrailFor({ autonomy: 'Agentic', humanInLoop: false, dataSensitivity: 'PHI', hosting: 'External SaaS', sanctioned: 'Shadow' });
    expect(g.score).toBeGreaterThanOrEqual(5);
    expect(g.score).toBeLessThanOrEqual(98);
  });
});

describe('AiAgentSecurityService.agentRisk (least-privilege)', () => {
  it('rates a no-human-in-loop, no-kill-switch agent on sensitive data as Critical', () => {
    const r = AiSec.agentRisk({ autonomy: 'Agentic', humanInLoop: false, dataSensitivity: 'PII', purpose: 'Auto-triage and close alerts' });
    expect(r.riskLevel).toBe('Critical');
    expect(r.flags.map((f) => f.text).join(' | ')).toMatch(/human in the loop/i);
    expect(r.leastPrivilegeScore).toBeLessThan(50);
  });
  it('rates a human-in-loop assistive-ish agent more favorably', () => {
    const r = AiSec.agentRisk({ autonomy: 'Agentic', humanInLoop: true, dataSensitivity: 'Public/None', purpose: 'Summarize tickets', agent: { tools: ['LLM'], dataScopes: ['Internal'], actions: ['read', 'summarize'], humanApprovalOn: [], killSwitch: true } });
    expect(r.leastPrivilegeScore).toBeGreaterThan(r ? 50 : 0);
    expect(['Low', 'Medium', 'High']).toContain(r.riskLevel);
  });
});

describe('connector registry', () => {
  it('registers the six connectors', () => {
    const keys = Connectors.list().map((c) => c.key).sort();
    expect(keys).toEqual(['azure_openai', 'crowdstrike', 'entra', 'langsmith', 'splunk', 'tenable']);
  });
  it('every connector exposes label/category/signals/scopes/fields', () => {
    for (const c of Connectors.list()) {
      expect(c.label).toBeTruthy();
      expect(c.category).toBeTruthy();
      expect(Array.isArray(c.signals)).toBe(true);
      expect(Array.isArray(c.scopes)).toBe(true);
      expect(Array.isArray(c.fields)).toBe(true);
    }
  });
  it('catalog never leaks credential values and marks secret fields', () => {
    const entra = Connectors.list().find((c) => c.key === 'entra');
    const secret = entra.fields.find((f) => f.key === 'clientSecret');
    expect(secret.secret).toBe(true);
    // The public catalog exposes field descriptors only — no values, no functions.
    for (const f of entra.fields) expect(f.value).toBeUndefined();
  });
  it('get() returns the live connector with test/fetchSignals', () => {
    const c = Connectors.get('tenable');
    expect(typeof c.test).toBe('function');
    expect(typeof c.fetchSignals).toBe('function');
    expect(Connectors.get('nope')).toBeNull();
  });
});

describe('provenance MODES', () => {
  it('is the canonical four-mode ladder', () => {
    expect(MODES).toEqual(['live', 'derived', 'modeled', 'demo']);
  });
});
