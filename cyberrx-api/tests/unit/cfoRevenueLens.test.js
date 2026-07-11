'use strict';

/**
 * Phase D — the revenue-confirmation gate surfaced to the CFO seat (a lens over the shared model).
 * Source-scan guard: the CFO overview reads LIVE.revenue_confirmation and renders the
 * confirmed/provisional crown-jewel lens, and the demo model provides that block.
 */
const fs = require('fs');
const path = require('path');

const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const cock = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');

const cfo = ciso.slice(ciso.indexOf('function c5cfOverview()'), ciso.indexOf('/* ── COO ── */'));

describe('CFO seat — revenue-confirmation lens (Phase D)', () => {
  it('reads the shared revenue_confirmation block, not a hardcoded number', () => {
    expect(cfo).toContain('LIVE.revenue_confirmation');
  });
  it('renders a "Revenue-confirmed jewels" card that flags provisional jewels', () => {
    expect(cfo).toContain("id:'cf_rev'");
    expect(cfo).toContain('Revenue-confirmed jewels');
    expect(cfo).toContain('provisional');
    // crown jewels derive only from confirmed revenue processes
    expect(cfo).toContain('derived <b>only</b> from the revenue processes you’ve confirmed');
  });
  it('the demo model supplies revenue_confirmation + a provisional crown jewel', () => {
    expect(cock).toContain('revenue_confirmation:');
    expect(cock).toContain('provisional_jewels');
    expect(cock).toContain('provisional:true');
  });
});
