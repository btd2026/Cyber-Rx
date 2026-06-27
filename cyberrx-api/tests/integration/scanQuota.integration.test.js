'use strict';

/**
 * Scan-quota integration tests (require Postgres). These exercise the REAL
 * scanQuotaStore against a live DB, proving the properties a unit test with an
 * in-memory store cannot: transactional atomicity under concurrency (the
 * pg_advisory_xact_lock), persistence of the counter, refund, and admin reset.
 *
 * Self-skips when no database is reachable (e.g. the offline sandbox) so it
 * never false-fails; run with a Postgres TEST_DATABASE_URL to execute fully.
 */

const db = require('../../src/utils/db');
const ScanQuota = require('../../src/services/ScanQuotaService');

let dbUp = false;
const org = () => ({ orgId: `it-org-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });

beforeAll(async () => {
  try { await db.query('SELECT 1'); await db.init(); dbUp = true; }
  catch (e) { console.warn(`[scanQuota.integration] skipped — no DB: ${e.message}`); }
  process.env.SCAN_QUOTA_LIMIT = '2';
  process.env.SCAN_QUOTA_WINDOW = 'calendar_month';
  process.env.SCAN_QUOTA_SCOPE = 'org';
  ScanQuota.setStore(require('../../src/services/scanQuotaStore')); // ensure the real pg store
});

const itDb = (name, fn) => test(name, async () => { if (!dbUp) return; await fn(); });

describe('scan quota (live Postgres)', () => {
  itDb('persists the counter and rejects the 3rd scan with a reset date', async () => {
    const ids = org();
    const r1 = await ScanQuota.reserve(ids); expect(r1.remaining).toBe(1);
    const r2 = await ScanQuota.reserve(ids); expect(r2.remaining).toBe(0);
    const err = await ScanQuota.reserve(ids).catch((e) => e);
    expect(err.code).toBe('SCAN_QUOTA_EXCEEDED');
    expect(err.used).toBe(2); expect(err.limit).toBe(2);
    expect(new Date(err.resetDate).getUTCDate()).toBe(1); // 1st of next month
    const u = await ScanQuota.usage(ids);
    expect(u).toMatchObject({ used: 2, limit: 2, remaining: 0 });
  });

  itDb('concurrent double-submit cannot exceed the limit (advisory lock)', async () => {
    const ids = org();
    // Fire 6 reservations at once; exactly 2 must succeed, 4 rejected.
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => ScanQuota.reserve(ids)));
    const ok = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(ok).toHaveLength(2);
    expect(rejected).toHaveLength(4);
    rejected.forEach((r) => expect(r.reason.code).toBe('SCAN_QUOTA_EXCEEDED'));
  });

  itDb('refund returns a slot so a subsequent scan succeeds', async () => {
    const ids = org();
    const a = await ScanQuota.reserve(ids);
    await ScanQuota.consume(a.reservationId);
    await ScanQuota.reserve(ids); // at limit
    await expect(ScanQuota.reserve(ids)).rejects.toHaveProperty('code', 'SCAN_QUOTA_EXCEEDED');
    await ScanQuota.refund(a.reservationId, 'infra_failure');
    const again = await ScanQuota.reserve(ids);
    expect(again.reservationId).toBeTruthy();
  });

  itDb('runGuardedScan refunds on pipeline failure', async () => {
    const ids = org();
    await expect(ScanQuota.runGuardedScan(ids, {}, async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    // the failed run did not consume the quota
    const u = await ScanQuota.usage(ids);
    expect(u.used).toBe(0);
  });

  itDb('admin grant raises the limit; admin reset frees the period', async () => {
    const ids = org();
    await ScanQuota.reserve(ids); await ScanQuota.reserve(ids);
    await expect(ScanQuota.reserve(ids)).rejects.toHaveProperty('code', 'SCAN_QUOTA_EXCEEDED');
    const granted = await ScanQuota.adminGrant(ids, { extra: 1, actor: 'admin-it', reason: 'test' });
    expect(granted.limit).toBe(3);
    const r = await ScanQuota.reserve(ids); expect(r.reservationId).toBeTruthy();
    const reset = await ScanQuota.adminReset(ids, { actor: 'admin-it', reason: 'test reset' });
    expect(reset.used).toBe(0);
    // audit trail recorded the admin actions
    const audit = await db.query('SELECT action FROM scan_quota_audit WHERE scope_id=$1', [ids.orgId]);
    const actions = audit.map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['admin_grant', 'admin_reset', 'reserve', 'reject']));
  });
});
