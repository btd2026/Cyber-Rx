'use strict';

/**
 * Analysis-run gate integration (requires Postgres). Proves the full-rebuild cap
 * is atomic under concurrency (advisory lock), deltas are uncapped, and infra
 * failures refund. Self-skips without a DB.
 */

const db = require('../../src/utils/db');
const Analysis = require('../../src/services/crownjewels/AnalysisRunService');

let dbUp = false;
const org = () => ({ orgId: `it-cj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` });
beforeAll(async () => {
  try { await db.query('SELECT 1'); await db.init(); dbUp = true; }
  catch (e) { console.warn(`[analysisRun.integration] skipped — ${e.message}`); }
  process.env.ANALYSIS_FULL_REBUILD_CAP = '2'; process.env.ANALYSIS_SCOPE = 'org';
  Analysis.setStore(require('../../src/services/crownjewels/analysisRunStore'));
}, 60000);
const itDb = (n, fn) => test(n, async () => { if (!dbUp) return; await fn(); });
const work = async () => ({ ok: true });

describe('analysis run gate (live Postgres)', () => {
  itDb('concurrent full rebuilds cannot exceed the cap', async () => {
    const ids = org();
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => Analysis.runGuardedAnalysis(ids, { mode: 'full' }, work)));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(rejected).toHaveLength(3);
    rejected.forEach((r) => expect(r.reason.code).toBe('ANALYSIS_CAP_REACHED'));
  });

  itDb('deltas are uncapped and recorded', async () => {
    const ids = org();
    for (let i = 0; i < 4; i += 1) await Analysis.runGuardedAnalysis(ids, { mode: 'delta' }, work);
    expect((await Analysis.usage(ids)).used).toBe(0);
    const rows = await db.query("SELECT COUNT(*)::int n FROM analysis_run WHERE scope_id=$1 AND mode='delta'", [ids.orgId]);
    expect(rows[0].n).toBe(4);
  });

  itDb('infra failure refunds a full slot', async () => {
    const ids = org();
    await expect(Analysis.runGuardedAnalysis(ids, { mode: 'full' }, async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect((await Analysis.usage(ids)).used).toBe(0);
  });
});
