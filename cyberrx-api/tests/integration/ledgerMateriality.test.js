/**
 * Integration tests for the DB-dependent, security-critical paths added in the
 * executive-dashboard work: the tamper-evident decision-ledger hash chain and
 * the SEC materiality determination → ledger linkage. Runs against the test DB.
 */

const db = require('../../src/utils/db');
const Engine = require('../../src/services/DecisionEngineService');
const Materiality = require('../../src/services/MaterialityService');

const ORG = `itest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

async function cleanup() {
  for (const t of ['decision_ledger', 'materiality_assessments', 'crq_assumptions']) {
    try { await db.query(`DELETE FROM ${t} WHERE org_id=$1`, [ORG]); } catch (_) {}
  }
}

afterAll(async () => { await cleanup(); });

describe('decision-ledger hash chain', () => {
  beforeAll(async () => { await cleanup(); });

  it('chains appended decisions with increasing seq and verifies intact', async () => {
    await Engine.record(ORG, 'card_a', { role: 'CISO', action: 'select', optionId: 'remediate', rationale: 'fix it', decidedBy: 'a@x.com' });
    await Engine.record(ORG, 'card_b', { role: 'CRO', action: 'accept', optionId: 'accept', rationale: 'within appetite, monitored', decidedBy: 'b@x.com' });
    await Engine.record(ORG, 'card_c', { role: 'CFO', action: 'select', optionId: 'transfer', rationale: 'insure the tail', decidedBy: 'c@x.com' });

    const v = await Engine.verifyLedger(ORG);
    expect(v.entries).toBe(3);
    expect(v.valid).toBe(true);
    expect(v.brokenAt).toBeNull();
    expect(v.rootHash).toBeTruthy();
  });

  it('requires a rationale to accept & monitor', async () => {
    await expect(Engine.record(ORG, 'card_d', { role: 'CISO', action: 'accept', optionId: 'accept', rationale: '' }))
      .rejects.toHaveProperty('code', 'RATIONALE_REQUIRED');
  });

  it('detects tampering when a recorded rationale is altered out of band', async () => {
    const before = await Engine.verifyLedger(ORG);
    expect(before.valid).toBe(true);
    // Tamper: change a row's rationale without recomputing its hash.
    await db.query(`UPDATE decision_ledger SET rationale='(silently altered)' WHERE org_id=$1 AND card_id='card_b'`, [ORG]);
    const after = await Engine.verifyLedger(ORG);
    expect(after.valid).toBe(false);
    expect(after.brokenAt).not.toBeNull();
  });
});

describe('SEC materiality determination', () => {
  const ref = 'evt_material_1';

  it('records a material determination, sets the 4-business-day clock, and logs to the ledger', async () => {
    const out = await Materiality.determine(ORG, {
      eventRef: ref, title: 'Ransomware on claims platform', determination: 'material',
      rationale: 'PHI exposure and operational disruption exceed threshold', decidedBy: 'gc@x.com',
      factors: { financial: 'yes', data: 'yes', operational: 'yes' }, quant: { lossExpected: 5000000 },
    });
    expect(out.material).toBe(true);
    expect(out.filingDeadline).toBeTruthy();
    // 4 business days is strictly after the determination date.
    expect(new Date(out.filingDeadline).getTime()).toBeGreaterThan(new Date(out.determinedAt).getTime());

    const list = await Materiality.list(ORG);
    const found = list.assessments.find((a) => a.eventRef === ref);
    expect(found).toBeTruthy();
    expect(found.determination).toBe('material');

    // The determination is written to the tamper-evident ledger.
    const ledger = await Engine.ledger(ORG);
    expect(ledger.some((r) => r.card_id === `materiality:${ref}`)).toBe(true);
  });

  it('rejects a determination with no rationale', async () => {
    await expect(Materiality.determine(ORG, { eventRef: 'evt_x', determination: 'material', rationale: '  ' }))
      .rejects.toHaveProperty('code', 'RATIONALE_REQUIRED');
  });

  it('a not-material determination carries no filing deadline', async () => {
    const out = await Materiality.determine(ORG, { eventRef: 'evt_nm', title: 'Minor phishing', determination: 'not_material', rationale: 'no sensitive data, contained' });
    expect(out.material).toBe(false);
    expect(out.filingDeadline).toBeNull();
  });

  it('builds a disclosure package with an integrity proof', async () => {
    const list = await Materiality.list(ORG);
    const a = list.assessments.find((x) => x.eventRef === ref);
    const pkg = await Materiality.evidencePackage(ORG, a.id);
    expect(pkg.assessment.determination).toBe('material');
    expect(pkg.manifest).toHaveProperty('chainValid');
    expect(Array.isArray(pkg.ledger)).toBe(true);
  });
});
