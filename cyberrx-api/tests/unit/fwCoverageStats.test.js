/**
 * Guards for the Frameworks header de-crowding: the inline "How these N controls are
 * evidenced / To close the gap" text is moved into a "Coverage stats" button that opens
 * the breakdown in the right-side detail drawer. All numbers stay data-driven.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const stats = src.slice(src.indexOf('function c5FwEvidenceStats('), src.indexOf('function c5Frameworks()'));

describe('Frameworks header — uncrowded', () => {
  it('no longer renders the inline "How these … are evidenced today" paragraph in the header', () => {
    expect(src).not.toContain("How these '+T.total+' controls are evidenced");
    expect(src).not.toMatch(/To close the gap: '\+/); // the old inline gap line is gone
  });
  it('adds a Coverage-stats button that shows the count still to close', () => {
    expect(src).toContain('id="c5fwStatsBtn"');
    expect(src).toContain('📊 Coverage stats');
    expect(src).toMatch(/s\.none>0\?\(' · '\+s\.none\+' to close'\)/);
  });
  it('wires the button to open the stats in the detail drawer', () => {
    expect(src).toContain("getElementById('c5fwStatsBtn')");
    expect(src).toContain("openDrill('Framework coverage & evidence',c5FwEvidenceStats(T,sel))");
  });
});

describe('Coverage-stats drawer (c5FwEvidenceStats) — data-driven', () => {
  it('exists and derives every number from the assessment totals', () => {
    expect(stats.length).toBeGreaterThan(200);
    expect(stats).toContain('var sc=c5fwSrcCounts(T)');
    expect(stats).toContain('How these controls are evidenced today');
  });
  it('breaks down connected-tool / policy / mapping / not-evidenced counts', () => {
    expect(stats).toMatch(/From connected tools',sc\.sys/);
    expect(stats).toMatch(/From your policies',sc\.doc/);
    expect(stats).toMatch(/Not yet evidenced',sc\.none/);
  });
  it('shows the close-the-gap steps (upload docs / connect tools) from c5fwGaps', () => {
    expect(stats).toContain('var gaps=c5fwGaps(T)');
    expect(stats).toContain('To close the gap');
    expect(stats).toMatch(/Upload <b>'\+docg\.map/);
    expect(stats).toMatch(/Connect <b>'\+tg\.map/);
    expect(stats).toContain('then press <b>↻ Recompute</b>');
  });
  it('handles the framework-native path (natively assessed / not yet tested)', () => {
    expect(stats).toMatch(/Natively assessed',sc\.native/);
    expect(stats).toMatch(/Not yet tested',sc\.none/);
  });
});
