'use strict';

/**
 * The weekly confirm queue is now its own Program Health tab (c5ConfirmQueueView), not a
 * panel inside Continuous assessment. The assessment view keeps only a compact "N awaiting"
 * link pointing to it. Source-scan guard.
 */
const fs = require('fs');
const path = require('path');
const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('Confirm queue — its own tab', () => {
  it('has a dedicated renderer showing the full queue with a summary', () => {
    expect(ciso).toContain('function c5ConfirmQueueView(host){');
    expect(ciso).toContain('var ordered=pending.concat(queue.filter(function(q){return q.confirmed;}));');
    expect(ciso).toContain('c5ConfirmQueueView(host);');
  });
  it('is wired as a Program Health subtab with a pending-count badge', () => {
    expect(ciso).toContain('data-phtab="queue">Confirm queue');
    expect(ciso).toContain("else if(tab==='queue'){c5ConfirmQueueView(body);}");
    expect(ciso).toContain('var qN=(typeof c5ReviewQueue===\'function\')?c5ReviewQueue().filter(function(q){return !q.confirmed;}).length:0;');
  });
  it('the assessment view no longer embeds the full queue — just a link to the tab', () => {
    expect(ciso).not.toContain("✔ Weekly confirm queue · '+pending.length+' awaiting a click");
    expect(ciso).toContain('awaiting a one-click confirm — see the <b>Confirm queue</b> tab.');
  });
});
