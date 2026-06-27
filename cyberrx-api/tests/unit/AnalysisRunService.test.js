'use strict';

/**
 * AnalysisRunService unit tests — in-memory store (no DB). Covers the §3b
 * behaviors: full-rebuild cap enforced with reset date, deltas uncapped, the
 * reserve→consume/refund lifecycle, runGuardedAnalysis (full vs delta), cost
 * telemetry recorded per run, and admin grant/reset.
 */

const Analysis = require('../../src/services/crownjewels/AnalysisRunService');

function makeFakeStore() {
  const runs = []; const grants = []; const audits = [];
  const activeFull = (r) => r.mode === 'full' && ['reserved', 'running', 'completed'].includes(r.status);
  const countFull = (s, id, pk) => runs.filter((r) => r.scope_type === s && r.scope_id === id && r.period_key === pk && activeFull(r)).length;
  const sumGrants = (s, id, pk) => grants.filter((g) => g.scope_type === s && g.scope_id === id && g.period_key === pk).reduce((a, g) => a + g.extra, 0);
  return {
    runs, grants, audits,
    async runInCapLock(s, id, pk, w, decide) {
      const d = decide({ used: countFull(s, id, pk), grants: sumGrants(s, id, pk) });
      if (d.row) runs.push({ id: d.row.id, scope_type: s, scope_id: id, mode: 'full', period_key: pk, status: 'reserved' });
      return d;
    },
    async insertRun(row) { runs.push({ id: row.id, scope_type: row.scopeType, scope_id: row.scopeId, mode: row.mode, period_key: row.periodKey, status: 'running' }); return row.id; },
    async setStatus(id, status, patch = {}) { const r = runs.find((x) => x.id === id); if (!r) return null; r.status = status; if (patch.usage) r.token_usage = patch.usage; return { ...r }; },
    async getRun(id) { return runs.find((r) => r.id === id) || null; },
    async usageRead(s, id, pk) { return { used: countFull(s, id, pk), grants: sumGrants(s, id, pk) }; },
    async insertGrant(g) { grants.push({ ...g, scope_type: g.scopeType, scope_id: g.scopeId, period_key: g.periodKey }); },
    async refundActiveForPeriod(s, id, pk) { let n = 0; runs.forEach((r) => { if (r.scope_type === s && r.scope_id === id && r.period_key === pk && activeFull(r)) { r.status = 'refunded'; n++; } }); return n; },
    async insertAudit(a) { audits.push(a); },
  };
}

const IDS = { orgId: 'org-1' };
let store;
beforeEach(() => {
  ['ANALYSIS_FULL_REBUILD_CAP', 'ANALYSIS_WINDOW', 'ANALYSIS_SCOPE', 'ANALYSIS_DELTA_CAPPED', 'ANALYSIS_ENABLED'].forEach((k) => delete process.env[k]);
  store = makeFakeStore();
  Analysis.setStore(store);
});

const work = async () => ({ ok: true });

describe('full-rebuild cap', () => {
  test('allows up to the cap, then rejects with a reset date', async () => {
    process.env.ANALYSIS_FULL_REBUILD_CAP = '2';
    await Analysis.runGuardedAnalysis(IDS, { mode: 'full' }, work);
    await Analysis.runGuardedAnalysis(IDS, { mode: 'full' }, work);
    const err = await Analysis.runGuardedAnalysis(IDS, { mode: 'full' }, work).catch((e) => e);
    expect(err).toMatchObject({ code: 'ANALYSIS_CAP_REACHED', used: 2, limit: 2 });
    expect(err.message).toMatch(/Cap resets on \d{4}-\d{2}-\d{2}/);
    const u = await Analysis.usage(IDS);
    expect(u).toMatchObject({ used: 2, limit: 2, remaining: 0 });
  });

  test('cap is config-driven', async () => {
    process.env.ANALYSIS_FULL_REBUILD_CAP = '1';
    await Analysis.runGuardedAnalysis(IDS, { mode: 'full' }, work);
    await expect(Analysis.runGuardedAnalysis(IDS, { mode: 'full' }, work)).rejects.toHaveProperty('code', 'ANALYSIS_CAP_REACHED');
  });
});

describe('delta runs', () => {
  test('are uncapped by default and never consume a full slot', async () => {
    process.env.ANALYSIS_FULL_REBUILD_CAP = '1';
    await Analysis.runGuardedAnalysis(IDS, { mode: 'full' }, work); // uses the only slot
    // many deltas still run
    for (let i = 0; i < 5; i += 1) await Analysis.runGuardedAnalysis(IDS, { mode: 'delta' }, work);
    const u = await Analysis.usage(IDS);
    expect(u.used).toBe(1); // deltas did not count
    expect(store.runs.filter((r) => r.mode === 'delta')).toHaveLength(5);
  });

  test('count against the cap when ANALYSIS_DELTA_CAPPED=true', async () => {
    process.env.ANALYSIS_FULL_REBUILD_CAP = '1'; process.env.ANALYSIS_DELTA_CAPPED = 'true';
    await Analysis.runGuardedAnalysis(IDS, { mode: 'delta' }, work);
    await expect(Analysis.runGuardedAnalysis(IDS, { mode: 'delta' }, work)).rejects.toHaveProperty('code', 'ANALYSIS_CAP_REACHED');
  });
});

describe('lifecycle + telemetry', () => {
  test('successful run is consumed (completed) with cost telemetry recorded', async () => {
    const out = await Analysis.runGuardedAnalysis(IDS, { mode: 'full' }, async ({ meter }) => {
      meter.record('resolve', 'claude-haiku-4-5-20251001', { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 800 }, { batch: true });
      return 'done';
    });
    expect(out.result).toBe('done');
    expect(out.usage.est_cost_usd).toBeGreaterThan(0);
    const run = await store.getRun(out.runId);
    expect(run.status).toBe('completed');
    expect(run.token_usage.by_stage.resolve).toBeTruthy();
  });

  test('infrastructure failure REFUNDS a full run (frees the slot)', async () => {
    process.env.ANALYSIS_FULL_REBUILD_CAP = '1';
    const boom = new Error('embedding service down');
    await expect(Analysis.runGuardedAnalysis(IDS, { mode: 'full' }, async () => { throw boom; })).rejects.toBe(boom);
    expect((await Analysis.usage(IDS)).remaining).toBe(1); // refunded -> slot free again
    const r = await Analysis.runGuardedAnalysis(IDS, { mode: 'full' }, work);
    expect(r.runId).toBeTruthy();
  });

  test('ANALYSIS_ENABLED=false bypasses the gate (test/dev only)', async () => {
    process.env.ANALYSIS_ENABLED = 'false';
    const out = await Analysis.runGuardedAnalysis(IDS, { mode: 'full' }, work);
    expect(out.ok).toBe(true);
    expect(store.runs).toHaveLength(0);
  });
});

describe('admin override', () => {
  test('grant raises the cap; reset frees the period', async () => {
    process.env.ANALYSIS_FULL_REBUILD_CAP = '1';
    await Analysis.runGuardedAnalysis(IDS, { mode: 'full' }, work);
    await expect(Analysis.runGuardedAnalysis(IDS, { mode: 'full' }, work)).rejects.toHaveProperty('code', 'ANALYSIS_CAP_REACHED');
    const after = await Analysis.adminGrant(IDS, { extra: 1, actor: 'admin-1', reason: 'pen-test window' });
    expect(after.limit).toBe(2);
    await Analysis.runGuardedAnalysis(IDS, { mode: 'full' }, work); // now allowed
    const reset = await Analysis.adminReset(IDS, { actor: 'admin-1', reason: 'manual' });
    expect(reset.used).toBe(0);
    expect(store.audits.some((a) => a.action === 'admin_grant')).toBe(true);
    expect(store.audits.some((a) => a.action === 'admin_reset')).toBe(true);
  });

  test('admin actions validate inputs', async () => {
    await expect(Analysis.adminGrant(IDS, { extra: 0, actor: 'a' })).rejects.toThrow(/positive integer/);
    await expect(Analysis.adminGrant(IDS, { extra: 1 })).rejects.toThrow(/actor/);
    await expect(Analysis.adminReset(IDS, {})).rejects.toThrow(/actor/);
  });
});
