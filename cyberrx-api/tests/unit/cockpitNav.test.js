/**
 * Guards for the executive-cockpit seat navigation (CyberRXNew/public/cockpit-seats.js
 * SEATS + cockpit.html nav / SEAT_LABEL): CPO and Internal Audit seats are removed, and
 * the technology seat is labelled CIO (not CTO).
 */

const fs = require('fs');
const path = require('path');

const seats = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit-seats.js'), 'utf8');
const cock = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');

const navLine = (cock.match(/<button class="seat on"[^\n]*Board<\/button>/) || [''])[0];
const seatLabelLine = (cock.match(/var SEAT_LABEL=\{[^}]*\};/) || [''])[0];

describe('seat definitions (cockpit-seats.js)', () => {
  it('removes the CPO seat', () => {
    expect(seats).not.toMatch(/\bcpo:\{/);
    expect(seats).not.toContain("id=\"cp-security\"");
  });
  it('removes the Internal Audit seat', () => {
    expect(seats).not.toMatch(/\baudit:\{/);
    expect(seats).not.toContain("id=\"ia-coverage\"");
  });
  it('keeps the CIO seat and labels its eyebrow CIO (not CTO)', () => {
    expect(seats).toMatch(/\bcio:\{/);
    expect(seats).toContain("eyebrow:'CIO · Executive cockpit'");
    expect(seats).not.toContain("eyebrow:'CTO · Executive cockpit'");
  });
});

describe('seat nav (cockpit.html)', () => {
  it('has no CPO or Internal Audit buttons', () => {
    expect(navLine).not.toMatch(/data-seat="cpo"/);
    expect(navLine).not.toMatch(/data-seat="audit"/);
    expect(navLine).not.toMatch(/>CPO</);
    expect(navLine).not.toMatch(/>Internal Audit</);
  });
  it('labels the technology seat CIO (not CTO)', () => {
    expect(navLine).toMatch(/data-seat="cio" title="Chief Information Officer">CIO</);
    expect(navLine).not.toMatch(/>CTO</);
  });
  it('SEAT_LABEL maps cio→CIO and drops cpo / audit', () => {
    expect(seatLabelLine).toContain("cio:'CIO'");
    expect(seatLabelLine).not.toContain("cio:'CTO'");
    expect(seatLabelLine).not.toContain('cpo:');
    expect(seatLabelLine).not.toContain('audit:');
  });
  it('keeps the other seats intact', () => {
    ['ciso', 'ceo', 'cfo', 'coo', 'cio', 'cro', 'clo', 'board'].forEach((s) => {
      expect(navLine).toContain('data-seat="' + s + '"');
    });
  });
});
