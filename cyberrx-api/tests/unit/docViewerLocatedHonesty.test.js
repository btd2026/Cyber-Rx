'use strict';

/**
 * Doc viewer honesty (c5ViewDoc): a keyword-"matched" requirement is only shown as evidenced when
 * it can actually be LOCATED in this document's text. Matches that cannot be located (common when
 * the file is a data export like a risk-register CSV, not a policy) are flagged honestly as
 * "scored elsewhere — not found in this document", never as a confident green ✓.
 */
const fs = require('fs');
const path = require('path');

const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const a = ciso.indexOf('function c5ViewDoc(');
const view = ciso.slice(a, ciso.indexOf('\nfunction ', a + 20));

describe('doc viewer — located-only honesty', () => {
  it('splits keyword matches into located vs not-located in the text', () => {
    expect(view).toContain('var matchedLoc=[],matchedUnloc=[]');
    expect(view).toContain('_kw[j]!=null'); // located only when we can pinpoint it
  });

  it('the "evidenced" count includes only located matches, not every scored requirement', () => {
    expect(view).toContain('(met.length+matchedLoc.length)');
    expect(view).toContain('evidenced in this text');
  });

  it('not-located matches are flagged honestly, never a green check', () => {
    expect(view).toContain('Scored elsewhere — not found in this document');
    expect(view).toContain('not located in this document');
    expect(view).toContain('data export'); // names the risk-register-CSV case
  });
});
