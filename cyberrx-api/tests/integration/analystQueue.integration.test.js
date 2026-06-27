'use strict';

/** Analyst queue integration (requires Postgres). Self-skips without a DB. */

const db = require('../../src/utils/db');
const Queue = require('../../src/services/assessment/AnalystQueueService');

let dbUp = false;
const ORG = `it-q-${Date.now()}`;
beforeAll(async () => {
  try { await db.query('SELECT 1'); await db.init(); dbUp = true; }
  catch (e) { console.warn(`[analystQueue.integration] skipped — ${e.message}`); }
}, 60000);
const itDb = (n, fn) => test(n, async () => { if (!dbUp) return; await fn(); });

describe('analyst queue (live Postgres)', () => {
  itDb('enqueues conflicts, lists open, resolves with audit trail', async () => {
    await Queue.enqueue(ORG, 'scan_1', [
      { type: 'missed_coverage', framework: 'NIST_SP_800-53', control_id: 'AC-2', reason: 'doc touches it' },
      { type: 'low_confidence', framework: 'NIST_SP_800-53', control_id: 'AU-6', reason: 'conf 0.4' },
    ]);
    const open = await Queue.list(ORG, { status: 'open' });
    expect(open.length).toBeGreaterThanOrEqual(2);

    const item = open[0];
    const resolved = await Queue.resolve(item.id, { action: 'override', actor: 'analyst-1', reason: 'manual review', resolution: { status: 'Partially addressed' } });
    expect(resolved.status).toBe('overridden');
    expect(resolved.resolver).toBe('analyst-1');

    const trail = await Queue.auditTrail(item.id);
    const actions = trail.map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['enqueue', 'override']));

    // cannot re-resolve an already-resolved item
    await expect(Queue.resolve(item.id, { action: 'confirm', actor: 'x' })).rejects.toThrow(/not found or already resolved/);
  });

  itDb('validates resolve inputs', async () => {
    await expect(Queue.resolve('nope', { action: 'bogus', actor: 'a' })).rejects.toThrow(/confirm\|override\|dismiss/);
    await expect(Queue.resolve('nope', { action: 'confirm' })).rejects.toThrow(/actor/);
  });
});
