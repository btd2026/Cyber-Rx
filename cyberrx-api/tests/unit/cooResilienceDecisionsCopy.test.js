/**
 * COO seat completion — 01 Resilience (c5coResilience) rebuilt to the contract, the shared
 * c5CriticalServices() source used by both Resilience and Recovery, and 04 Decisions
 * (c5coDecisions) with the convergence strip + Decision 2 = cloud-host failover.
 * (Recovery/02 + Vendors/03 guarded by cooRecoveryCopy / cooSupplyCopy.)
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
function fnOf(n) { const a = src.indexOf('function ' + n + '('); return src.slice(a, src.indexOf('\nfunction ', a + 20)); }
const re = fnOf('c5coResilience');
const dc = fnOf('c5coDecisions');
const cs = fnOf('c5CriticalServices');

describe('shared c5CriticalServices — one source for Recovery + Resilience', () => {
  it('defines the five services once, customer row live', () => {
    expect(src).toContain('function c5CriticalServices()');
    ['customer', 'payments', 'fulfillment', 'supply', 'financial'].forEach((k) => expect(cs).toContain("c5sysLabel('" + k));
    expect(cs).toContain('rto:(rtoConn?worst:24)');
    expect(cs).toContain("failover:'No failover'"); // the customer platform SPOF
  });
});

describe('COO 01 Resilience — contract', () => {
  it('the headline is DERIVED from continuity — never a self-graded "resilient/Strong" over a miss', () => {
    expect(re).toContain('var head=(offN===0)');
    expect(re).not.toContain('Operations are resilient — one process carries the only real risk');
  });
  it('per-service continuity matrix (RTO vs target, within/at-risk), from the shared source', () => {
    expect(re).toContain('var svc=c5CriticalServices()');
    expect(re).toContain('Continuity by critical service — recover within target');
    expect(re).toContain('RTO target ');
    expect(re).toContain("(ok?'Within target':'At risk')");
  });
  it('SPOF is derived, and the "if it goes down" impact strip uses the shared cross-cutting figures', () => {
    expect(re).toContain('spofN=svc.filter');
    expect(re).toContain('If the customer platform goes down:');
    expect(re).toContain('c5xDowntimeHr()');
    expect(re).toContain('c5xCustomers()');
  });
  it('decision routes to the shared identity fix + a connected-source footnote', () => {
    expect(re).toContain('IDF=c5IdFix()');
    expect(re).toContain('Fund the identity fix — protects continuity');
    expect(re).toContain("+connN+' sources connected");
  });
});

describe('COO 04 Decisions — contract', () => {
  it('opens with the convergence strip', () => {
    expect(dc).toContain("c5convergeStrip('coo')");
  });
  it('Decision 1 is the identity fix WITH its honest downside (interim exposure)', () => {
    expect(dc).toContain("Fund the '+IDF.short+' fix?");
    expect(dc).toContain("Interim exposure persists across the '+IDF.timeline");
  });
  it('Decision 2 is adding a cloud-host failover for the SPOF', () => {
    expect(dc).toContain('Add a cloud-host failover for the customer platform?');
    expect(dc).toContain('removes the single point of failure');
  });
  it('keeps the audit-trail promise (no AI/LLM at run-time)', () => {
    expect(dc).toContain('no AI/LLM at run-time');
  });
});
