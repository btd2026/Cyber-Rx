'use strict';

/**
 * Phase D — the value tree marks PROVISIONAL crown jewels (derived from a revenue process the
 * user hasn't confirmed) as candidates, not promoted jewels. Source-scan guard.
 */
const fs = require('fs');
const path = require('path');

const tree = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/crownjewel-tree.html'), 'utf8');
const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('value tree — provisional crown jewels (Phase D)', () => {
  it('jewelNode renders a provisional state distinct from a confirmed crown jewel', () => {
    expect(tree).toContain('var prov=!!j.provisional');
    expect(tree).toContain('Provisional · confirm revenue');
    expect(tree).toContain("prov?' provisional':''");
    expect(tree).toContain('.node.jewel.provisional'); // dashed/amber style
  });
  it('the host input builder carries provisional from the asset', () => {
    expect(ciso).toContain('provisional:!!a.provisional');
  });
  it('the footer explains the provisional state (not promoted until confirmed)', () => {
    expect(tree).toContain('not yet confirmed');
    expect(tree).toContain('not a promoted crown jewel');
  });
});
