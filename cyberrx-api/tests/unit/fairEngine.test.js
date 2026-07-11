/**
 * Nerion FAIR engine — accuracy + traceability verification suite.
 * Covers: golden R1 worked example, reconciliation, control attribution, roll-up (EAL additive /
 * tail NOT additive), determinism, provenance + confidence, and the business-value bound check.
 */
const FE = require('../../../CyberRXNew/public/fair-engine.js');

const SEED = 7;
const src = (type, conf) => ({ type, name: type + '-src', confidence: conf });

describe('FAIR engine — module + golden R1 example', () => {
  it('is a versioned, requireable module', () => {
    expect(typeof FE.computeRisk).toBe('function');
    expect(FE.VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('golden: TEF 1.2/yr × vuln_residual 20% × LM $250M ⇒ EAL ≈ $60M/yr (point → exact)', () => {
    const r = FE.computeRisk({
      id: 'R1',
      threatEventFrequency: 1.2,
      vulnerability_inherent: 0.2,           // no controls → residual = inherent = 0.2
      lossMagnitude: { primary: 250e6 },     // exact telemetry → point value
      correlationGroupIds: [],
      controls: [],
      tefSources: [src('telemetry', 'high')], vulnSources: [src('modeled', 'med')], lmSources: [src('self_reported', 'med')],
    }, { seed: 1 });
    expect(r.residual.EAL.value).toBeCloseTo(60e6, -5); // 1.2 × 0.2 × 250e6 = 60e6
    expect(r.residual.tail).toBeCloseTo(60e6, -5);      // point ⇒ no spread ⇒ tail == EAL
  });

  it('golden: with a distribution the TAIL is COMPUTED from the samples, not a hardcoded $650M', () => {
    const r = FE.computeRisk({
      id: 'R1d',
      threatEventFrequency: 1.2,
      vulnerability_inherent: 0.2,
      lossMagnitude: { primary: { min: 150e6, mostLikely: 250e6, max: 350e6, dist: 'pert' } },
      controls: [], correlationGroupIds: [],
      tefSources: [src('telemetry', 'high')], vulnSources: [src('modeled', 'med')], lmSources: [src('self_reported', 'med')],
    }, { seed: SEED });
    expect(Math.abs(r.residual.EAL.value - 60e6) / 60e6).toBeLessThan(0.03); // mean preserved ≈ $60M
    expect(r.residual.tail).toBeGreaterThan(r.residual.EAL.value);           // tail > mean
    expect(r.residual.tail).not.toBe(650e6);                                 // derived, not hardcoded
    expect(r.residual.EAL.distribution.p95).toBe(r.residual.tail);           // tail == p95 of the sample set
  });
});

const RISK_WITH_CONTROLS = {
  id: 'R2', appId: 'CRM',
  threatEventFrequency: { min: 0.5, mostLikely: 1.2, max: 3 },
  vulnerability_inherent: { min: 0.2, mostLikely: 0.4, max: 0.7 },
  lossMagnitude: { primary: { min: 100e6, mostLikely: 250e6, max: 600e6 }, secondary: { min: 10e6, mostLikely: 50e6, max: 150e6 } },
  correlationGroupIds: ['identity'],
  businessValue: 900e6,
  controls: [
    { id: 'PR.AA-05', name: 'Least-privilege', factor: 'frequency', effectiveness: 0.6, nistFunction: 'PROTECT', effectivenessSource: src('telemetry', 'high') },
    { id: 'PR.IR-01', name: 'Segmentation', factor: 'frequency', effectiveness: 0.3, nistFunction: 'PROTECT', effectivenessSource: src('self_reported', 'med') },
    { id: 'RC.RP-01', name: 'Recovery', factor: 'magnitude', effectiveness: 0.4, nistFunction: 'RECOVER', effectivenessSource: src('telemetry', 'high') },
  ],
  tefSources: [src('telemetry', 'high')], vulnSources: [src('modeled', 'med')], lmSources: [src('self_reported', 'med')],
};

describe('Reconciliation', () => {
  const r = FE.computeRisk(RISK_WITH_CONTROLS, { seed: SEED });
  it('Mitigated + Residual EAL = Inherent EAL (within rounding)', () => {
    expect(r.reconciliation.mitigatedPlusResidualEqualsInherent).toBe(true);
    expect(r.mitigated + r.residual.EAL.value).toBeCloseTo(r.inherent.EAL.value, 2);
  });
  it('Σ(control loss-reduction) + interaction remainder = Mitigated', () => {
    const sum = r.controls.reduce((s, c) => s + c.lossReduction, 0);
    expect(sum + r.interactionRemainder).toBeCloseTo(r.mitigated, 2);
    expect(r.reconciliation.controlsPlusRemainderEqualsMitigated).toBe(true);
  });
  it("controls layer via product-of-complements — residual EAL < inherent EAL", () => {
    expect(r.residual.EAL.value).toBeLessThan(r.inherent.EAL.value);
    expect(r.mitigated).toBeGreaterThan(0);
  });
  it('normalize mode makes marginals sum exactly to Mitigated (remainder 0)', () => {
    const rn = FE.computeRisk(RISK_WITH_CONTROLS, { seed: SEED, attribution: 'normalize' });
    const sum = rn.controls.reduce((s, c) => s + c.lossReduction, 0);
    expect(sum).toBeCloseTo(rn.mitigated, 2);
    expect(rn.interactionRemainder).toBe(0);
  });
});

describe('Control-level attribution — never the same figure on every control', () => {
  const r = FE.computeRisk(RISK_WITH_CONTROLS, { seed: SEED });
  it('each control carries a distinct loss-reduction $', () => {
    const vals = r.controls.map((c) => Math.round(c.lossReduction));
    expect(new Set(vals).size).toBe(vals.length);
  });
  it('the stronger control removes more loss than the weaker one', () => {
    const strong = r.controls.find((c) => c.id === 'PR.AA-05'); // eff 0.6
    const weak = r.controls.find((c) => c.id === 'PR.IR-01');   // eff 0.3
    expect(strong.lossReduction).toBeGreaterThan(weak.lossReduction);
  });
});

describe('Roll-up — EAL additive, TAIL not additive (correlation aggregation)', () => {
  const inv = {
    functions: [{ id: 'F', name: 'Sales' }],
    processes: [{ id: 'P', name: 'Order-to-cash', functionId: 'F' }],
    apps: [
      { id: 'A1', name: 'CRM', processId: 'P', customerFacing: true, revenueDependency: 0.8, businessValue: 900e6 },
      { id: 'A2', name: 'ERP', processId: 'P', customerFacing: false, revenueDependency: 0.2, businessValue: 400e6 },
    ],
  };
  const nodes = FE.buildTree(inv);
  const mkRisk = (id, app, group) => ({
    id, type: 'risk', parentId: app, appId: app,
    threatEventFrequency: { min: 0.5, mostLikely: 1, max: 3 },
    vulnerability_inherent: { min: 0.2, mostLikely: 0.4, max: 0.7 },
    lossMagnitude: { primary: { min: 50e6, mostLikely: 150e6, max: 350e6 } },
    correlationGroupIds: group ? [group] : [],
    controls: [{ id: 'PR.AA-05', factor: 'frequency', effectiveness: 0.5, effectivenessSource: src('telemetry', 'high') }],
    tefSources: [src('telemetry', 'high')], vulnSources: [src('modeled', 'med')], lmSources: [src('self_reported', 'med')],
  });
  const all = nodes.concat([mkRisk('A1:r1', 'A1', 'identity'), mkRisk('A2:r1', 'A2', 'identity')]);
  const tree = FE.computeTree(all, { seed: SEED, iters: 10000 });
  const P = tree.byId.P, A1 = tree.byId.A1, A2 = tree.byId.A2, F = tree.byId.F;

  it('parent EAL == Σ child EAL exactly (linearity of expectation)', () => {
    expect(P.EAL).toBeCloseTo(A1.EAL + A2.EAL, 6);
    expect(F.EAL).toBeCloseTo(P.EAL, 6);
  });
  it('parent tail ≤ Σ child tails (aggregated distribution, not summed percentiles)', () => {
    expect(P.tail).toBeLessThanOrEqual(A1.tail + A2.tail + 1);
    expect(P.tail).toBeGreaterThan(0);
  });
  it('buildTree auto-flags crown jewels (customer-facing + high revenue dependency)', () => {
    expect(A1.crownJewel).toBe(true);
    expect(A2.crownJewel).toBe(false);
    expect(A1.parentId).toBe('P');
    expect(P.parentId).toBe('F');
  });
  it('refresh recomputes only the affected path up to the root', () => {
    const touched = tree.refreshFrom('A1:r1');
    expect(touched).toEqual(expect.arrayContaining(['A1:r1', 'A1', 'P', 'F']));
    expect(touched).not.toContain('A2');
  });
});

describe('Determinism — fixed seed ⇒ reproducible', () => {
  it('same inputs + seed ⇒ identical EAL and tail', () => {
    const a = FE.computeRisk(RISK_WITH_CONTROLS, { seed: 42 });
    const b = FE.computeRisk(RISK_WITH_CONTROLS, { seed: 42 });
    expect(a.residual.EAL.value).toBe(b.residual.EAL.value);
    expect(a.residual.tail).toBe(b.residual.tail);
    expect(a.inherent.EAL.value).toBe(b.inherent.EAL.value);
  });
});

describe('Provenance + confidence (non-negotiable)', () => {
  const r = FE.computeRisk(RISK_WITH_CONTROLS, { seed: SEED });
  it('no figure ships without ≥1 source', () => {
    expect(r.sources.length).toBeGreaterThanOrEqual(1);
    expect(r.inherent.EAL.sources.length).toBeGreaterThanOrEqual(1);
    r.controls.forEach((c) => expect(c.sources.length).toBeGreaterThanOrEqual(1));
  });
  it('mixed provenance shows BOTH source badges (telemetry + self_reported)', () => {
    expect(r.sourceTypes).toEqual(expect.arrayContaining(['telemetry', 'self_reported']));
  });
  it('a self-reported-only figure is NEVER high confidence', () => {
    const rs = FE.computeRisk({
      id: 'Rs', threatEventFrequency: { min: 0.5, mostLikely: 1, max: 2 }, vulnerability_inherent: { min: 0.2, mostLikely: 0.4, max: 0.6 },
      lossMagnitude: { primary: { min: 10e6, mostLikely: 50e6, max: 100e6 } }, controls: [],
      tefSources: [src('self_reported', 'high')], vulnSources: [src('self_reported', 'high')], lmSources: [src('self_reported', 'high')],
    }, { seed: SEED });
    expect(rs.confidence).not.toBe('high');
  });
  it('missing required input surfaces (missingInputs, confidence low) — never fabricates a default silently', () => {
    const rm = FE.computeRisk({
      id: 'Rm', vulnerability_inherent: { min: 0.2, mostLikely: 0.4, max: 0.7 }, lossMagnitude: { primary: { min: 10e6, mostLikely: 50e6, max: 100e6 } },
      controls: [], vulnSources: [src('modeled', 'med')], lmSources: [src('self_reported', 'med')],
      // threatEventFrequency intentionally omitted
    }, { seed: SEED });
    expect(rm.missingInputs).toContain('threatEventFrequency');
    expect(rm.confidence).toBe('low');
    expect(rm.usedSectorDefault).toBe(true);
    expect(rm.residual.EAL.value).toBeGreaterThan(0); // still computes (modeled), tagged — not a silent guess
  });
});

describe('Bound check — a risk cannot lose more than its asset is worth', () => {
  it('flags (does not silently cap) when inherent LM exceeds business value', () => {
    const r = FE.computeRisk({
      id: 'Rb', businessValue: 100e6,
      threatEventFrequency: 1, vulnerability_inherent: 0.5,
      lossMagnitude: { primary: { min: 80e6, mostLikely: 150e6, max: 300e6 } }, controls: [],
      tefSources: [src('telemetry', 'high')], vulnSources: [src('modeled', 'med')], lmSources: [src('self_reported', 'med')],
    }, { seed: SEED });
    expect(r.boundViolation.flagged).toBe(true);
    expect(r.boundViolation.lmInherentMax).toBeGreaterThan(r.boundViolation.businessValue);
    expect(r.inherent.EAL.value).toBeGreaterThan(0); // computed, not capped
  });
});
