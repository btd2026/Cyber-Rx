/**
 * Guards for the unified seat-decision format: the legacy per-seat "asks" cards
 * (c5Asks / the "Residual risk decision — … " sample) are no longer rendered, and every
 * executive seat — including the Board — uses the standardized c5dec / c5decisions panel.
 */

const fs = require('fs');
const path = require('path');

const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const seats = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit-seats.js'), 'utf8');
const cock = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');

describe('legacy asks cards are no longer rendered', () => {
  it('c5SeatViews clears the -asks containers instead of rendering c5Asks', () => {
    const fn = ciso.slice(ciso.indexOf('function c5SeatViews()'), ciso.indexOf('function c5SeatViews()') + 260);
    expect(fn).toMatch(/getElementById\(s\+'-asks'\);if\(h\)h\.innerHTML=''/);
    expect(fn).not.toMatch(/c5Asks\(s\)/);
  });
  it('the residual-risk "sample" card is not rendered on any seat', () => {
    // c5Asks (which drew the "The ask:" / sample card) is retired; nothing calls it.
    expect(ciso).not.toMatch(/c5SeatViews\(\)\{[^}]*c5Asks\(/);
  });
});

function fnBody(name) {
  const s = ciso.indexOf('function ' + name + '(');
  if (s < 0) return '';
  const e = ciso.indexOf('\nfunction ', s + 10);
  return ciso.slice(s, e > s ? e : s + 4000);
}

describe('every executive seat uses the standardized c5dec decision panel', () => {
  // c5DecProj is the CISO seat's decision tab.
  ['c5ceDecisions', 'c5cfDecisions', 'c5coDecisions', 'c5crDecisions', 'c5clDecisions', 'c5ctDecisions', 'c5bdDecisions', 'c5DecProj'].forEach((f) => {
    it(f + ' renders via c5decisions(list)', () => {
      const region = fnBody(f);
      expect(region.length).toBeGreaterThan(50);
      expect(region).toContain('c5decisions(list)');
    });
  });
});

describe('CISO decision tab (c5DecProj) is standardized and renamed "Decisions"', () => {
  const region = fnBody('c5DecProj');
  const seatsFile = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit-seats.js'), 'utf8');
  it('builds standardized c5dec items from the funding levers', () => {
    expect(region).toContain("c5dec('cs',i+1,'Fund '+l.name+'?'");
    expect(region).toContain('c5shell(');
    expect(region).toContain('Decisions · what needs your sign-off?');
  });
  it('drops the old bespoke 3-panel projection tool', () => {
    expect(ciso).not.toContain('Partner accountability queue');
    expect(ciso).not.toContain('My decision queue');
    expect(ciso).not.toContain('control improvement planner');
    expect(ciso).not.toContain('class="c5dp-wrap"');
  });
  it('the CISO section is titled just "Decisions" (not "Decisions & projections")', () => {
    expect(seatsFile).toContain("sec('08','Decisions','','<div id=\"c5-decproj\"></div>')");
    expect(seatsFile).not.toContain('Decisions &amp; projections');
  });
});

describe('Board now has a standardized decisions panel (formatted like the other seats)', () => {
  const region = fnBody('c5bdDecisions');
  it('c5bdDecisions exists and uses c5dec items', () => {
    expect(region).toContain("c5dec('bd',1,");
    expect(region).toContain("c5dec('bd',2,");
    expect(region).toContain('c5decisions(list)');
  });
  it('board items are oversight actions — note/endorse the funded fix + commission assurance — driver from the shared config', () => {
    // Restructured Board Decisions: the driver now comes from the shared identity-fix config
    // (c5IdFix, which is data-ranked via c5TopDriver), Decision 1 notes/endorses the funded
    // action, and Decision 2 commissions independent assurance (the new Assurance tab's call).
    expect(region).toContain('var IDF=c5IdFix()');
    expect(region).toContain('Note and endorse management');
    expect(region).toContain('Commission independent assurance over cyber reporting');
    expect(region).toContain("c5convergeStrip('board')");
  });
  it('the board seat body renders bd-decisions (not the legacy board-asks)', () => {
    expect(seats).toContain('<div id="bd-decisions"></div>');
    expect(seats).not.toContain('<div id="board-asks"></div>');
  });
  it('c5bdDecisions is wired into the render pipeline', () => {
    expect(cock).toContain('c5bdGovernance();c5bdDecisions();');
  });
});
