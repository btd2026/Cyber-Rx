'use strict';

/**
 * The Nerion Map — the proprietary capability→control crosswalk, exposed as an
 * INTERNAL-ONLY view (source-scan guard). It must be gated so a client never sees it,
 * and the gate + the honest "this only hides the view, not the data" caveat must hold.
 */
const fs = require('fs');
const path = require('path');

const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('Nerion Map — internal-only IP view', () => {
  it('is gated behind an operator flag (localStorage cyberrx_internal / ?internal=1)', () => {
    expect(ciso).toContain('function nerionInternal()');
    expect(ciso).toContain("localStorage.getItem('cyberrx_internal')==='1'");
    expect(ciso).toContain('/[?&#]internal=1');
  });

  it('the internal subtab and its dispatch only appear when the gate is open', () => {
    expect(ciso).toContain('(internal?(\'<button class="subtab');
    expect(ciso).toContain('data-phtab="nmap"');
    expect(ciso).toContain("else if(tab==='nmap'&&internal){c5NeuronMap(body);}");
    // the tab resolution itself requires internal
    expect(ciso).toContain("(C5_PH_TAB==='nmap'&&internal)?'nmap':'classic'");
  });

  it('renders the full crosswalk (CAP_FRAMEWORK csf/r53 + NEURON_XWALK external IDs)', () => {
    expect(ciso).toContain('function c5NeuronMap(host)');
    expect(ciso).toContain("if(k==='csf')return (fw&&fw.csf)||[];if(k==='r53')return (fw&&fw.r53)||[];return x[k]||[];");
    expect(ciso).toContain('◆ INTERNAL — Nerion IP · not for client distribution');
  });

  it('carries the honest caveat: gating hides the view, not the data', () => {
    expect(ciso).toContain('gating hides the view, not the data');
    expect(ciso).toContain('readable in devtools');
    expect(ciso).toContain('move server-side behind auth');
  });
});
