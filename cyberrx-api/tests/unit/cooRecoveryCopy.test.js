/**
 * Source-scan guards for the COO "Recovery" tab (CyberRXNew/public/ciso5.js —
 * c5coRecovery). The tab must answer "Can we recover within our targets?" from the
 * recovery evidence (RTO/RPO vs target, last DR test, backup verification, the top
 * recovery dependency) — leading with the RTO miss when the target is missed, ranking
 * the top recovery gap from the data (never hard-coded to identity), and generating the
 * headline / bottom line / button / evidence confidence dynamically.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const a = src.indexOf('function c5coRecovery()');
const b = src.indexOf('function c5coDecisions(', a);
const fn = a >= 0 && b > a ? src.slice(a, b) : '';

describe('COO Recovery — answers the target question, no hard-coded conclusion', () => {
  it('locates the tab and asks "can we recover within our targets?"', () => {
    expect(a).toBeGreaterThan(0);
    expect(fn).toContain('Recovery readiness · can we recover within our targets?');
  });
  it('drops the old hard-coded "watch the identity path" / customer-platform lead', () => {
    expect(fn).not.toContain('Recovery is tested — watch the identity path.');
    expect(fn).not.toContain('could slow a customer-platform restore');
    expect(fn).not.toContain("txt:'Fund the '+c5esc(TD.short)+' fix — faster recovery'");
    expect(fn).not.toMatch(/faster recovery/);
  });
  it('does not conflate the top exposure driver (c5TopDriver) with the recovery dependency', () => {
    expect(fn).not.toContain('c5TopDriver()');
  });
});

describe('COO Recovery — RTO miss leads the message', () => {
  it('when RTO is missed, the headline states the missed RTO target', () => {
    expect(fn).toContain('Recovery is tested, but one critical path misses the RTO target.');
    expect(fn).toMatch(/top&&top\.key==='rto'/);
  });
  it('the RTO card becomes an "RTO gap" with the overshoot, never "within target" when missed', () => {
    expect(fn).toMatch(/rtoMiss\?rcard\('coo_rto','RTO gap'/);
    expect(fn).toMatch(/rcard\('coo_rto','RTO within target'/); // the within-target branch also exists
    expect(fn).toContain('Slowest critical recovery path exceeds target by ');
  });
  it('never says recovery is fully ready / guaranteed / no-risk', () => {
    expect(fn).not.toMatch(/fully ready/i);
    expect(fn).not.toMatch(/guaranteed recovery/i);
    expect(fn).not.toMatch(/\bno risk\b/i);
    expect(fn).not.toMatch(/protects uptime/i);
  });
});

describe('COO Recovery — RPO / backups / test card logic', () => {
  it('RPO shows "within target" when the target is met', () => {
    expect(fn).toContain("rcard('coo_rpo','RPO within target'");
    expect(fn).toContain("'Within target','g','Data-loss window is within target.'");
    expect(fn).toMatch(/rpoMiss\?rcard\('coo_rpo','RPO gap'/);
  });
  it('a passed test with a material dependency gap says "Passed, gap remains"', () => {
    expect(fn).toMatch(/materialDep\?rcard\('coo_last_test','Recovery test','Passed, gap remains'/);
    expect(fn).toContain("still affects target recovery");
    expect(fn).toMatch(/rcard\('coo_last_test','Recovery test','Passed','Passed','g'/); // clean-pass branch too
  });
  it('backup tile reflects verified / stale / missing states', () => {
    expect(fn).toMatch(/bkVerified\?c5tile\('coo_backups','g','Verified'/);
    expect(fn).toMatch(/c5tile\('coo_backups','a','Stale'/);
    expect(fn).toMatch(/c5tile\('coo_backups','n','Missing'/);
  });
});

describe('COO Recovery — top recovery dependency is data-ranked, not always identity', () => {
  it('ranks gaps by severity and picks top = gaps[0]', () => {
    expect(fn).toMatch(/gaps\.sort\(function\(a,b\)\{return b\.sev-a\.sev;\}\)/);
    expect(fn).toMatch(/var top=gaps\[0\]\|\|null/);
  });
  it('every candidate gap carries its own head / phrase / button (so all three change with the top gap)', () => {
    ["key:'rto'", "key:'rpo'", "key:'backup'", "key:'identity'", "key:'test'"].forEach((k) => expect(fn).toContain(k));
    expect(fn).toContain("button:'Close the RTO gap'");
    expect(fn).toContain("button:'Close identity recovery gap'");
    expect(fn).toContain("button:'Resolve backup recovery gap'");
  });
  it('the bottom-line button is generated from the top gap, not a fixed string', () => {
    expect(fn).toMatch(/btn=\{mid:top\.mid,txt:top\.button\}/);
    expect(fn).toMatch(/btn=\{mid:'coo_rto',txt:'Close the RTO gap'\}/); // RTO branch
  });
  it('the dependency tile is labelled "Top recovery dependency" and reflects Gap/Ready dynamically', () => {
    expect(fn).toContain('Top recovery dependency');
    expect(fn).toMatch(/depPill=!idConn\?'—':idGap\?'Gap':'Ready'/);
  });
});

describe('COO Recovery — missing evidence & evidence confidence', () => {
  it('missing recovery-test evidence yields "Not enough evidence to confirm recovery readiness."', () => {
    expect(fn).toContain('Not enough evidence to confirm recovery readiness.');
    expect(fn).toMatch(/if\(!testConn\)\{/);
    expect(fn).toContain("txt:'Connect recovery evidence'");
  });
  it('renders an evidence-confidence strip that cannot be High without test + dependency evidence', () => {
    expect(fn).toMatch(/var evPanel=c5EvLine\(evLevel,/);
    expect(fn).toMatch(/var evLevel=demo\?'Demo':\(\(!testConn\|\|!idConn\)&&evConf\.level==='High'\?'Medium':evConf\.level\)/);
    expect(fn).toMatch(/Recovery test result \(DR\)',connected:testConn,critical:true/);
    expect(fn).toMatch(/Recovery-dependency mapping',connected:idConn,critical:true/);
  });
  it('backups-verified-but-incomplete produces the incomplete-readiness message', () => {
    expect(fn).toContain('Backups are verified, but recovery readiness is incomplete.');
  });
});

describe('COO Recovery — labelling, demo, and source traceability', () => {
  it('labels demo values in non-production', () => {
    expect(fn).toMatch(/var demo=\(typeof signalsAreDemo/);
    expect(fn).toContain("values shown are demo");
  });
  it('every card/tile keeps data-c5m for drill-down source traceability', () => {
    expect(fn).toMatch(/rcard\(mid,title,val,statusTxt,cls,sub\)\{return '<div class="c5card" data-c5m="'\+mid/);
    expect(fn).toContain('data-c5m="coo_identity_recovery"');
    expect(fn).toContain('Drill any card for its source, owner and evidence date.');
  });
  it('RTO/RPO/test values come from live signals, computed from targets', () => {
    expect(fn).toMatch(/R\.worst_recovery_hours/);
    expect(fn).toMatch(/sig\('rpo_minutes'\)/);
    expect(fn).toMatch(/sig\('dr_test_days'\)/);
    expect(fn).toMatch(/sig\('backup_immutable_pct'\)/);
  });
});
