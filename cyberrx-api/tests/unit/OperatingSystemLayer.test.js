'use strict';

// Pure-logic unit tests for the six OS-layer services (no DB required).
const Forecast = require('../../src/services/ForecastService');
const Sim = require('../../src/services/SimulationService');
const Alloc = require('../../src/services/AllocationService');
const Ops = require('../../src/services/AgentOperatorService');
const Net = require('../../src/services/OutcomeNetworkService');

describe('#1 ForecastService — Brier + calibration', () => {
  it('scores a perfect forecaster at Brier 0', () => {
    expect(Forecast.brier([[1, 1], [0, 0], [1, 1]])).toBe(0);
  });
  it('scores a confidently-wrong forecaster near 1', () => {
    expect(Forecast.brier([[1, 0], [0, 1]])).toBe(1);
  });
  it('returns null with no data', () => {
    expect(Forecast.brier([])).toBeNull();
  });
  it('buckets calibration and compares predicted vs observed', () => {
    const bins = Forecast.calibration([[0.05, 0], [0.08, 0], [0.95, 1], [0.92, 1]]);
    const low = bins.find((b) => b.predicted < 50);
    const high = bins.find((b) => b.predicted > 50);
    expect(low.observed).toBe(0);
    expect(high.observed).toBe(100);
  });
});

describe('#4 SimulationService — aggregate + chain collapse', () => {
  const cards = [
    { id: 'A', type: 'single', aboveAppetite: true, recommended: 'remediate', options: [{ id: 'remediate', cost: 100, residualRiskReductionPct: 80 }], event: { id: 'evtA', severity: 'High', loss: { expected: 1000 } } },
    { id: 'B', type: 'single', aboveAppetite: false, recommended: 'remediate', options: [{ id: 'remediate', cost: 50, residualRiskReductionPct: 50 }], event: { id: 'evtB', severity: 'Medium', loss: { expected: 400 } } },
    { id: 'C', type: 'compound', aboveAppetite: true, recommended: 'break_cheaper', options: [{ id: 'break_cheaper', cost: 60, residualRiskReductionPct: 75 }], event: { id: 'evtC', severity: 'Critical', loss: { expected: 5000 }, members: [{ id: 'evtA' }, { id: 'evtB' }] } },
  ];
  it('aggregates expected loss and above-appetite count', () => {
    const a = Sim.aggregate(cards);
    expect(a.expectedLoss).toBe(6400);
    expect(a.aboveAppetite).toBe(2);
    expect(a.compounds).toBe(1);
  });
  it('collapses a compound when a member link is fixed', () => {
    const { cards: after, collapsed } = Sim.applyScenario(cards, new Set(['A']), new Set());
    expect(collapsed.map((c) => c.id)).toContain('C');       // chain gone
    expect(after.find((c) => c.id === 'A').event.loss.expected).toBe(200); // 1000 * (1-0.8)
    expect(Sim.aggregate(after).expectedLoss).toBe(600);     // 200 (A) + 400 (B); C removed
  });
});

describe('#5 AllocationService — ROI-greedy knapsack + frontier', () => {
  const items = [
    { cardId: 'x', cost: 100, riskReduced: 900, efficiency: 9 },
    { cardId: 'y', cost: 100, riskReduced: 200, efficiency: 2 },
    { cardId: 'z', cost: 100, riskReduced: 500, efficiency: 5 },
  ];
  it('funds the highest-ROI items first within budget', () => {
    const r = Alloc.allocate([...items].sort((a, b) => b.efficiency - a.efficiency), 200);
    expect(r.selected.map((i) => i.cardId)).toEqual(['x', 'z']); // skips low-ROI y
    expect(r.spend).toBe(200);
    expect(r.reduced).toBe(1400);
    expect(r.unfunded.map((i) => i.cardId)).toEqual(['y']);
  });
  it('builds a cumulative efficient frontier', () => {
    const f = Alloc.frontier([...items].sort((a, b) => b.efficiency - a.efficiency));
    expect(f[f.length - 1].spend).toBe(300);
    expect(f[f.length - 1].riskReduced).toBe(1600);
  });
});

describe('#3 AgentOperatorService — guardrail policy', () => {
  const card = (over, rec) => ({ decision: null, recommended: rec || 'remediate', type: 'single', event: { severity: 'High' }, options: [{ id: 'remediate', cost: over ? 999999 : 1000, residualRiskReductionPct: 80 }, { id: 'accept', acceptsRationale: true }] });
  it('drafts under a draft mandate', () => {
    expect(Ops.decideAction(card(false), { enabled: true, autonomy: 'draft', costCap: 250000 }).mode).toBe('draft');
  });
  it('acts within cap under an act mandate', () => {
    expect(Ops.decideAction(card(false), { enabled: true, autonomy: 'act', costCap: 250000 }).mode).toBe('act');
  });
  it('escalates when cost exceeds the cap', () => {
    expect(Ops.decideAction(card(true), { enabled: true, autonomy: 'act', costCap: 250000 }).mode).toBe('escalate');
  });
  it('never auto-accepts risk', () => {
    expect(Ops.decideAction(card(false, 'accept'), { enabled: true, autonomy: 'act', costCap: 250000 }).mode).toBe('escalate');
  });
  it('skips a disabled operator or an already-decided card', () => {
    expect(Ops.decideAction(card(false), { enabled: false, autonomy: 'act', costCap: 1 }).mode).toBe('skip');
    expect(Ops.decideAction({ ...card(false), decision: { action: 'remediate' } }, { enabled: true, autonomy: 'act', costCap: 1e9 }).mode).toBe('skip');
  });
});

describe('#6 OutcomeNetworkService — cohort summarize', () => {
  it('computes base rate and the most-effective control', () => {
    const rows = [
      { occurred: true, control_applied: 'Remediate at the source', control_worked: true },
      { occurred: false, control_applied: 'Remediate at the source', control_worked: true },
      { occurred: true, control_applied: 'Apply a compensating control', control_worked: false },
      { occurred: false, control_applied: null, control_worked: null },
    ];
    const s = Net.summarize(rows);
    expect(s.n).toBe(4);
    expect(s.baseRate).toBe(50);
    expect(s.topControl.control).toBe('Remediate at the source');
    expect(s.topControl.workedPct).toBe(100);
  });
});
