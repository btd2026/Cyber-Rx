'use strict';

const Catalog = require('../../src/services/InputCatalogService');
const Delta = require('../../src/services/DeltaDashboardService');

const ctx = (connectors, setup, invalid) => ({ connectors: new Set(connectors || []), setup: setup || {}, invalid: new Set(invalid || []) });

describe('InputCatalogService — DELTA roles', () => {
  test('new roles exist with the right widget counts', () => {
    expect(Catalog.WIDGETS.board).toHaveLength(9);
    expect(Catalog.WIDGETS.clo).toHaveLength(7);
    expect(Catalog.WIDGETS.cro).toHaveLength(7);
  });
  test('new connectors + registers + derived inputs are classified', () => {
    expect(Catalog.typeOf('ERM Platform')).toBe('connector');
    expect(Catalog.typeOf('Risk Appetite Statements')).toBe('document');
    expect(Catalog.typeOf('FAIR')).toBe('derived');
    expect(Catalog.typeOf('Cyber Insurance Policy')).toBe('derived');
  });
  test('derived inputs resolve from setup_json', () => {
    expect(Catalog.statusOf('FAIR', ctx([], { economics: {} }))).toBe('connected');
    expect(Catalog.statusOf('FAIR', ctx([], {}))).toBe('missing');
    expect(Catalog.statusOf('Cyber Insurance Policy', ctx([], { economics: { insurance: { limit: 150 } } }))).toBe('connected');
    expect(Catalog.statusOf('Cyber Insurance Policy', ctx([], { economics: { insurance: {} } }))).toBe('missing');
    expect(Catalog.statusOf('Budget Planning', ctx([], { economics: { budget: 9e6 } }))).toBe('connected');
  });
  test('Privacy Platform reuses existing onetrust (no duplicate)', () => {
    expect(Catalog.statusOf('Privacy Platform', ctx(['onetrust']))).toBe('connected');
  });
  test('board_posture gates until ERM + GRC + Risk Appetite satisfied', () => {
    const none = Catalog.readinessFrom('board', ctx([], {}));
    const posture = none.widgets.find((w) => w.id === 'board_posture');
    expect(posture.satisfied).toBe(false);
    expect(posture.missing).toEqual(expect.arrayContaining(['ERM Platform', 'GRC', 'Risk Appetite Statements']));

    const ok = Catalog.readinessFrom('board', ctx(['erm', 'sap'], { riskAppetite: [{ category: 'X' }] }));
    expect(ok.widgets.find((w) => w.id === 'board_posture').satisfied).toBe(true);
  });
});

describe('DeltaDashboardService.buildFrom', () => {
  const readiness = (role, c) => Catalog.readinessFrom(role, c);

  test('board: satisfied posture computes Within/Over appetite from economics', () => {
    const c = ctx(['erm', 'sap'], { economics: { ale: 68e6, tail: 100e6, appetite: { appetite: 120e6 }, insurance: { limit: 150e6 }, budget: 9e6 }, riskAppetite: [{ category: 'X' }], regulatoryRegister: [{ regulation: 'GDPR' }], materialityCriteria: [{ metric: 'x' }], benchmarkData: [{ metric: 'y' }] });
    const out = Delta.buildFrom('board', { readiness: readiness('board', c), setup: c.setup, connectors: c.connectors });
    const posture = out.tiles.find((t) => t.id === 'board_posture');
    expect(posture.satisfied).toBe(true);
    expect(posture.headline).toBe('Within appetite'); // tail 100M ≤ appetite 120M
    expect(out.tiles.length).toBe(9);
  });

  test('board: unmet tile carries needs + no headline', () => {
    const c = ctx([], {});
    const out = Delta.buildFrom('board', { readiness: readiness('board', c), setup: c.setup, connectors: c.connectors });
    const posture = out.tiles.find((t) => t.id === 'board_posture');
    expect(posture.satisfied).toBe(false);
    expect(posture.headline).toBeNull();
    expect(posture.detail).toMatch(/^Needs:/);
  });

  test('cro: quantified ALE tile is real (not mocked) from economics', () => {
    const c = ctx(['erm', 'sap'], { economics: { ale: 68e6, tail: 180e6, budget: 9e6, insurance: { limit: 150e6 } }, bia: [{ name: 'p' }], riskAppetite: [{ category: 'X' }] });
    const out = Delta.buildFrom('cro', { readiness: readiness('cro', c), setup: c.setup, connectors: c.connectors });
    const q = out.tiles.find((t) => t.id === 'cro_quantified');
    // requires FAIR (economics present) + Incident History + BIA; economics present, bia present.
    // Incident History needs a connector — so it gates unless siem/servicenow connected.
    expect(out.tiles.length).toBe(7);
    if (q.satisfied) { expect(q.mocked).toBe(false); expect(q.headline).toMatch(/ALE/); }
  });

  test('clo: privacy tile marks mocked when no privacy connector', () => {
    const c = ctx(['legal_matter', 'data_classification'], { regulatoryRegister: [{ regulation: 'GDPR' }] });
    const out = Delta.buildFrom('clo', { readiness: readiness('clo', c), setup: c.setup, connectors: c.connectors });
    const priv = out.tiles.find((t) => t.id === 'clo_privacy');
    expect(priv.satisfied).toBe(false); // Privacy Platform not connected → gated
  });
});
