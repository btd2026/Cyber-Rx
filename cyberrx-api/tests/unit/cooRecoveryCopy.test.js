/**
 * Source-scan guards for the COO "Recovery" tab (CyberRXNew/public/ciso5.js —
 * c5coRecovery). Rebuilt around a per-service recovery matrix with an explicit identity
 * root-cause that threads to the Resilience tab.
 *
 * Structure: header (breadcrumb + one supporting line) · three metric cards (RTO gap /
 * RPO / last test) + a single green backups line · the recovery-by-service matrix
 * (centerpiece) · an Illustrative operational-impact strip · a decision callout
 * (reusing c5bl) · a small evidence footnote. Every figure wires to its live signal;
 * per-service breakdown and impact are Illustrative until wired. Row status is COMPUTED
 * (RTO <= target), never hard-coded.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const a = src.indexOf('function c5coRecovery()');
const b = src.indexOf('function c5coDecisions(', a);
const fn = a >= 0 && b > a ? src.slice(a, b) : '';

describe('COO Recovery — header & question', () => {
  it('answers "can we recover within our targets?"', () => {
    expect(a).toBeGreaterThan(0);
    expect(fn).toContain('Recovery readiness · can we recover within our targets?');
  });
  it('the headline names the missed RTO path and gap (wired, not hard-coded)', () => {
    expect(fn).toContain("misses its RTO target by '+durH(rtoGapH)+'.");
  });
  it('one supporting line reports the computed on-target count (X of Y)', () => {
    expect(fn).toContain("svcOn+' of '+svcTotal+' critical services restore within target.");
  });
});

describe('COO Recovery — three metric cards + a demoted backups line', () => {
  it('RTO gap card is red / "Off target" when the target is missed (not amber "Gap")', () => {
    expect(fn).toMatch(/rtoMiss\?rcard\('coo_rto','RTO gap',durH\(worst\)\+' vs '\+rtoTgt\+'h','Off target','r'/);
    expect(fn).toMatch(/rcard\('coo_rto','RTO',durH\(worst\)\+' vs '\+rtoTgt\+'h','On target','g'/);
    expect(fn).not.toContain('Passed, gap remains'); // muddy old test label is gone
  });
  it('RPO card shows within/off target from the target comparison', () => {
    expect(fn).toContain("'Within target','g','Data-loss window is within target.'");
    expect(fn).toMatch(/rpoMiss\?rcard\('coo_rpo','RPO'/);
  });
  it('last-recovery-test card is a clean "Passed · This quarter · live failover"', () => {
    expect(fn).toContain("rcard('coo_last_test','Last recovery test','Passed','This quarter','n','Live failover — surfaced the RTO gap.')");
  });
  it('backups are a single green confirmation line (old standalone card demoted), still drillable', () => {
    expect(fn).toContain('Backups immutable and restore-tested this quarter');
    expect(fn).toContain('data-c5m="coo_backups"');
    expect(fn).not.toContain("c5tile('coo_backups'"); // no standalone backup tile any more
  });
});

describe('COO Recovery — the per-service matrix (centerpiece)', () => {
  it('has the header row: left title + right "All paths tested this quarter"', () => {
    expect(fn).toContain('Recovery by critical service — actual vs target');
    expect(fn).toContain('All paths tested this quarter');
  });
  it('uses the SAME five services as the other seats via the shared C5_SYSTEMS source', () => {
    // service names are pulled from the single shared source (not retyped), so seats can't drift
    ['payments', 'fulfillment', 'supply', 'financial'].forEach((k) => expect(fn).toContain("c5sysLabel('" + k + "')"));
    expect(fn).toContain("c5sysLabel('customer'"); // customer row keeps its live label override
    expect(fn).toContain("GreenLake billing · identity recovery '+idPct+'%"); // identity root folded into the at-risk row
  });
  it('the customer-platform row wires to live signals; others are Illustrative samples', () => {
    expect(fn).toMatch(/rto:\(rtoConn\?worst:24\),tgt:rtoTgt,rpo:\(rpoConn\?rpoMin:15\)/);
    expect(fn).toMatch(/Illustrative/);
  });
  it('row status is COMPUTED from RTO <= target, never hard-coded', () => {
    expect(fn).toContain('var ok=s.rto<=s.tgt');
    expect(fn).toContain('svcOn=services.filter(function(s){return s.rto<=s.tgt;}).length');
    expect(fn).toMatch(/\(ok\?'On target':'Off target'\)/);
  });
});

describe('COO Recovery — operational-impact strip (Illustrative)', () => {
  it('renders the gap in operational terms with the Illustrative badge', () => {
    expect(fn).toContain("-hour gap, in operational terms:");
    expect(fn).toContain('billing exposure');
    expect(fn).toContain("SLA credits trigger past '+rtoTgt+'h");
    expect(fn).toContain('c5xCustomers()'); // customers from the shared cross-cutting source
  });
  it('derives billing exposure from the shared downtime-per-hour figure (gap × hourly)', () => {
    expect(fn).toContain('var xh=c5xDowntimeHr();');
    expect(fn).toContain('rtoConn?rtoGapH:20)*xh.usd');
    expect(fn).not.toContain("'~$240M'"); // no hard-coded fallback any more
  });
});

describe('COO Recovery — decision callout threads identity to Resilience', () => {
  it('reuses the c5bl box with a "The decision" eyebrow', () => {
    expect(fn).toContain("c5bl('The decision'");
  });
  it('makes the identity root-cause explicit and threads to the Resilience tab', () => {
    expect(fn).toContain("finish deploying identity recovery ('+idPct+'% → 100%)");
    expect(fn).toContain('the same exposure flagged on the Resilience tab');
  });
  it('the primary button is "Close the RTO gap", wired to coo_rto', () => {
    expect(fn).toContain("decBtn={mid:'coo_rto',txt:'Close the RTO gap'}");
  });
});

describe('COO Recovery — evidence footnote & live wiring', () => {
  it('footnote counts connected sources (no separate evidence-confidence panel)', () => {
    expect(fn).toMatch(/connN=evSrcs\.filter\(function\(s\)\{return s\.connected;\}\)\.length/);
    expect(fn).toContain("sources connected");
    expect(fn).not.toContain('c5EvLine'); // the confidence panel is replaced by the footnote
  });
  it('labels demo values in non-production', () => {
    expect(fn).toMatch(/var demo=\(typeof signalsAreDemo/);
    expect(fn).toContain("' · demo'");
  });
  it('RTO/RPO/test/backup/identity all come from live signals, computed vs targets', () => {
    expect(fn).toMatch(/R\.worst_recovery_hours/);
    expect(fn).toMatch(/sig\('rpo_minutes'\)/);
    expect(fn).toMatch(/sig\('dr_test_days'\)/);
    expect(fn).toMatch(/sig\('backup_immutable_pct'\)/);
    expect(fn).toMatch(/c5avgDeploy\(\['mfa','pam'\]\)/);
  });
  it('does not conflate the top exposure driver (c5TopDriver) with the recovery dependency', () => {
    expect(fn).not.toContain('c5TopDriver()');
  });
  it('never overclaims recovery as guaranteed / no-risk / protects uptime', () => {
    expect(fn).not.toMatch(/guaranteed recovery/i);
    expect(fn).not.toMatch(/\bno risk\b/i);
    expect(fn).not.toMatch(/protects uptime/i);
  });
});
