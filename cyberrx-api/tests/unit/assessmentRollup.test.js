'use strict';

/**
 * Crown-jewel-weighted, weakest-link rollup — the score is NOT a simple average. Each
 * control's three axes are multiplied (not blended) so weak evidence can't inflate it;
 * controls protecting confirmed crown jewels are weighted heavier; and a broken crown-jewel
 * control drags its category down via a weakest-link pull instead of being averaged away. The
 * overall carries its confidence (the machine-verified share). Source-scan guard.
 */
const fs = require('fs');
const path = require('path');

const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('Assessment rollup — crown-jewel weighting + weakest link', () => {
  it('scores a control by MULTIPLYING the axes, so weak evidence cannot inflate it', () => {
    expect(ciso).toContain('function c5ControlScore(a){');
    expect(ciso).toContain('return vb*af*ff*cf;');
    // an expired attestation (not_assessed) scores 0
    expect(ciso).toContain('var vb={met:1,partial:0.5,not_met:0,not_assessed:0}[a.verdict];');
  });

  it('weights controls by the crown jewels they protect (tier-scaled)', () => {
    expect(ciso).toContain('function c5CrownControlWeights(){');
    expect(ciso).toContain('var tierW={Critical:3,High:2.2,Medium:1.6};');
    expect(ciso).toContain('w[cid]=Math.max(w[cid]||1,tw);');
  });

  it('rolls up control→category→function→overall, NOT a simple average', () => {
    expect(ciso).toContain('function c5AssessmentRollup(){');
    // weakest-link at the category level
    expect(ciso).toContain('var score=(weakest<0.5)?(wavg+weakest)/2:wavg;');
    // function + overall are weighted, not averaged
    expect(ciso).toContain('cs.reduce(function(s,c){return s+c.score*c.weight;},0)/wsum');
  });

  it('carries confidence — the machine-verified share of the weighted score', () => {
    expect(ciso).toContain("if(a.method==='live')mvW+=wt;");
    expect(ciso).toContain('var confidence=totW?mvW/totW:0;');
  });

  it('renders the weighted posture + per-function bars with the honest caveat', () => {
    expect(ciso).toContain('var roll=c5AssessmentRollup();');
    expect(ciso).toContain('crown-jewel-weighted, weakest-link');
    expect(ciso).toContain("card('Weighted posture',(roll.overall*5).toFixed(1)+' / 5'");
    expect(ciso).toContain('var cards=\'<div class="c5cards">\'');
  });
});
