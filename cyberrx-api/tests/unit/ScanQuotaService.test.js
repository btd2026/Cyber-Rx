'use strict';

/**
 * ScanQuotaService unit tests — uses an injected in-memory store (no DB).
 * Covers the spec §3b behaviors: limit enforcement with reset date, the
 * reserve→consume→refund state machine, refund restoring a slot, the guarded
 * gate wrapper, config-driven limit, admin grant/reset, and scope resolution.
 * True concurrency/atomicity (advisory lock) is covered by the DB-gated
 * integration test.
 */

const ScanQuota = require('../../src/services/ScanQuotaService');

// In-memory store implementing the scanQuotaStore interface. runInReservationLock
// runs decide() synchronously over the array, mirroring the count-then-insert the
// Postgres advisory lock makes atomic.
function makeFakeStore() {
  const reservations = []; const grants = []; const audits = [];
  const active = (r) => r.status === 'reserved' || r.status === 'consumed';
  const match = (r, s, id, pk) => r.scope_type === s && r.scope_id === id && r.period_key === pk;
  const countActive = (s, id, pk) => reservations.filter((r) => match(r, s, id, pk) && active(r)).length;
  const sumGrants = (s, id, pk) => grants.filter((g) => g.scope_type === s && g.scope_id === id && g.period_key === pk).reduce((a, g) => a + g.extra, 0);
  const oldest = (s, id, pk) => reservations.filter((r) => match(r, s, id, pk) && active(r)).map((r) => r.created_at).sort()[0] || null;
  return {
    reservations, grants, audits,
    async runInReservationLock(s, id, pk, window, decide) {
      const d = decide({ used: countActive(s, id, pk), grants: sumGrants(s, id, pk), oldestActiveAt: oldest(s, id, pk) });
      if (d.row) reservations.push({ id: d.row.id, scope_type: s, scope_id: id, period_key: pk, status: 'reserved', scan_id: d.row.scan_id || null, document_id: d.row.document_id || null, created_at: new Date().toISOString() });
      return d;
    },
    async getReservation(id) { return reservations.find((r) => r.id === id) || null; },
    async updateReservationStatus(id, status, patch = {}) { const r = reservations.find((x) => x.id === id); if (!r) return null; r.status = status; if (patch.scanId) r.scan_id = patch.scanId; return { ...r }; },
    async refundActiveForPeriod(s, id, pk) { let n = 0; reservations.forEach((r) => { if (match(r, s, id, pk) && active(r)) { r.status = 'refunded'; n++; } }); return n; },
    async insertGrant(g) { grants.push({ ...g, scope_type: g.scopeType, scope_id: g.scopeId, period_key: g.periodKey }); },
    async usageRead(s, id, pk) { return { used: countActive(s, id, pk), grants: sumGrants(s, id, pk), oldestActiveAt: oldest(s, id, pk) }; },
    async insertAudit(a) { audits.push(a); },
  };
}

const IDS = { orgId: 'org-1' };
let store;
beforeEach(() => {
  delete process.env.SCAN_QUOTA_LIMIT; delete process.env.SCAN_QUOTA_WINDOW;
  delete process.env.SCAN_QUOTA_SCOPE; delete process.env.SCAN_QUOTA_ENABLED;
  store = makeFakeStore();
  ScanQuota.setStore(store);
});

describe('pure helpers', () => {
  test('periodKey buckets by calendar month (UTC)', () => {
    expect(ScanQuota.periodKey('calendar_month', new Date('2026-06-27T12:00:00Z'))).toBe('2026-06');
    expect(ScanQuota.periodKey('calendar_month', new Date('2026-01-01T00:00:00Z'))).toBe('2026-01');
    expect(ScanQuota.periodKey('rolling_30d')).toBe('rolling');
  });
  test('resetDate(calendar_month) is the 1st of next month UTC', () => {
    expect(ScanQuota.resetDate('calendar_month', new Date('2026-06-27T00:00:00Z')).toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(ScanQuota.resetDate('calendar_month', new Date('2026-12-15T00:00:00Z')).toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
  test('resetDate(rolling_30d) is oldest active + 30d', () => {
    const oldest = '2026-06-01T00:00:00Z';
    expect(ScanQuota.resetDate('rolling_30d', new Date('2026-06-10T00:00:00Z'), oldest).toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });
  test('resolveScope defaults to org and falls back to org when user id is absent', () => {
    expect(ScanQuota.resolveScope({ orgId: 'o' }, 'org')).toEqual({ scopeType: 'org', scopeId: 'o' });
    expect(ScanQuota.resolveScope({ orgId: 'o', userId: 'u' }, 'user')).toEqual({ scopeType: 'user', scopeId: 'u' });
    expect(ScanQuota.resolveScope({ orgId: 'o' }, 'user')).toEqual({ scopeType: 'org', scopeId: 'o' });
    expect(ScanQuota.resolveScope({ orgId: 'o' }, 'account')).toEqual({ scopeType: 'account', scopeId: 'o' });
  });
});

describe('reserve / limit enforcement', () => {
  test('allows up to the limit, then rejects the 3rd with a friendly reset date', async () => {
    const r1 = await ScanQuota.reserve(IDS); expect(r1.remaining).toBe(1);
    const r2 = await ScanQuota.reserve(IDS); expect(r2.remaining).toBe(0);
    const err = await ScanQuota.reserve(IDS).catch((e) => e); // the 3rd is rejected
    expect(err).toMatchObject({ code: 'SCAN_QUOTA_EXCEEDED', used: 2, limit: 2 });
    expect(err.message).toMatch(/Scan limit reached: 2 of 2/);
    expect(err.message).toMatch(/resets on \d{4}-\d{2}-\d{2}/);
    expect(err.resetDate).toBeTruthy();
    expect(store.audits.filter((a) => a.action === 'reserve')).toHaveLength(2);
    expect(store.audits.filter((a) => a.action === 'reject')).toHaveLength(1);
  });

  test('limit is config-driven via SCAN_QUOTA_LIMIT', async () => {
    process.env.SCAN_QUOTA_LIMIT = '3';
    await ScanQuota.reserve(IDS); await ScanQuota.reserve(IDS); const r3 = await ScanQuota.reserve(IDS);
    expect(r3.remaining).toBe(0);
    await expect(ScanQuota.reserve(IDS)).rejects.toHaveProperty('code', 'SCAN_QUOTA_EXCEEDED');
  });

  test('reservations are isolated per scope id', async () => {
    await ScanQuota.reserve({ orgId: 'a' }); await ScanQuota.reserve({ orgId: 'a' });
    await expect(ScanQuota.reserve({ orgId: 'a' })).rejects.toHaveProperty('code', 'SCAN_QUOTA_EXCEEDED');
    const rb = await ScanQuota.reserve({ orgId: 'b' }); // different org unaffected
    expect(rb.remaining).toBe(1);
  });
});

describe('consume / refund', () => {
  test('consume keeps the slot; refund returns it', async () => {
    const r = await ScanQuota.reserve(IDS);
    await ScanQuota.consume(r.reservationId);
    expect((await store.getReservation(r.reservationId)).status).toBe('consumed');
    await ScanQuota.reserve(IDS); // now at 2
    await expect(ScanQuota.reserve(IDS)).rejects.toHaveProperty('code', 'SCAN_QUOTA_EXCEEDED');
    // refund the consumed one -> a slot frees -> next reserve succeeds
    await ScanQuota.refund(r.reservationId, 'infra_failure');
    const again = await ScanQuota.reserve(IDS);
    expect(again.reservationId).toBeTruthy();
    expect(store.audits.some((a) => a.action === 'refund')).toBe(true);
  });
});

describe('runGuardedScan (the gate)', () => {
  test('reserves, runs work, consumes on success', async () => {
    const out = await ScanQuota.runGuardedScan(IDS, { documentId: 'd1' }, async ({ reservationId, quota }) => {
      expect(reservationId).toBeTruthy(); expect(quota.remaining).toBe(1);
      return 'pipeline-result';
    });
    expect(out).toBe('pipeline-result');
    expect(store.reservations[0].status).toBe('consumed');
  });

  test('refunds and rethrows when the pipeline throws (infra failure)', async () => {
    const boom = new Error('embedding service down');
    await expect(ScanQuota.runGuardedScan(IDS, {}, async () => { throw boom; })).rejects.toBe(boom);
    expect(store.reservations[0].status).toBe('refunded');
    // the refunded slot is reusable
    const r = await ScanQuota.reserve(IDS); const r2 = await ScanQuota.reserve(IDS);
    expect(r.reservationId && r2.reservationId).toBeTruthy();
  });

  test('over-limit short-circuits: work never runs', async () => {
    await ScanQuota.reserve(IDS); await ScanQuota.reserve(IDS);
    const work = jest.fn();
    await expect(ScanQuota.runGuardedScan(IDS, {}, work)).rejects.toHaveProperty('code', 'SCAN_QUOTA_EXCEEDED');
    expect(work).not.toHaveBeenCalled();
  });

  test('SCAN_QUOTA_ENABLED=false bypasses the gate (no reservation) — test/dev only', async () => {
    process.env.SCAN_QUOTA_ENABLED = 'false';
    const work = jest.fn(async () => 'ok');
    const out = await ScanQuota.runGuardedScan(IDS, {}, work);
    expect(out).toBe('ok'); expect(work).toHaveBeenCalled();
    expect(store.reservations).toHaveLength(0);
  });
});

describe('admin override (logged)', () => {
  test('adminGrant raises the effective limit', async () => {
    await ScanQuota.reserve(IDS); await ScanQuota.reserve(IDS);
    await expect(ScanQuota.reserve(IDS)).rejects.toHaveProperty('code', 'SCAN_QUOTA_EXCEEDED');
    const after = await ScanQuota.adminGrant(IDS, { extra: 1, actor: 'admin-1', reason: 'customer escalation' });
    expect(after.limit).toBe(3); expect(after.remaining).toBe(1);
    const r = await ScanQuota.reserve(IDS); expect(r.reservationId).toBeTruthy();
    expect(store.audits.some((a) => a.action === 'admin_grant' && a.actor === 'admin-1')).toBe(true);
  });

  test('adminReset refunds active reservations and is logged', async () => {
    await ScanQuota.reserve(IDS); await ScanQuota.reserve(IDS);
    const after = await ScanQuota.adminReset(IDS, { actor: 'admin-1', reason: 'manual reset' });
    expect(after.used).toBe(0); expect(after.remaining).toBe(2);
    expect(store.audits.some((a) => a.action === 'admin_reset')).toBe(true);
  });

  test('admin actions validate inputs', async () => {
    await expect(ScanQuota.adminGrant(IDS, { extra: 0, actor: 'a' })).rejects.toThrow(/positive integer/);
    await expect(ScanQuota.adminGrant(IDS, { extra: 1 })).rejects.toThrow(/actor/);
    await expect(ScanQuota.adminReset(IDS, {})).rejects.toThrow(/actor/);
  });
});

describe('usage snapshot (free)', () => {
  test('reports used/limit/remaining/resetDate and consumes nothing', async () => {
    await ScanQuota.reserve(IDS);
    const u1 = await ScanQuota.usage(IDS);
    const u2 = await ScanQuota.usage(IDS); // viewing twice changes nothing
    expect(u1).toMatchObject({ used: 1, limit: 2, remaining: 1 });
    expect(u2.used).toBe(1);
    expect(u1.resetDate).toBeTruthy();
  });
});
