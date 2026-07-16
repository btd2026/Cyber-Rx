'use strict';

/**
 * The control detail is a full Classic-style "Finding & recommendation" — condition (what was
 * tested) / criteria / conclusion / recommendation / evidence source — plus the continuous
 * three-axis facts at the bottom. The top mirrors Classic's cards (Overall maturity · Coverage
 * · Trend · Controls failing) and the "Continuous monitoring · all 106" breakdown box.
 * Source-scan guard.
 */
const fs = require('fs');
const path = require('path');
const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('Continuous assessment — Classic-depth finding detail', () => {
  it('renders the auditor finding structure (Finding & recommendation + sections)', () => {
    expect(ciso).toContain('<div class="c5kick">Finding &amp; recommendation</div>');
    expect(ciso).toContain("'<div class=\"ev-sec\">Condition (what was tested)</div><div class=\"drill-p\">'+F.condition+'</div>'");
    expect(ciso).toContain("'<div class=\"ev-sec\">Criteria</div><div class=\"drill-p\">'+F.criteria+'</div>'");
    expect(ciso).toContain("'<div class=\"ev-sec\">Conclusion</div><div class=\"drill-p\">'+F.conclusion+'</div>'");
    expect(ciso).toContain("'<div class=\"ev-sec\">Recommendation</div><div class=\"drill-p\">'+F.recommendation+'</div>'");
    expect(ciso).toContain("'<div class=\"ev-sec\">Evidence source</div>'+F.evidence");
  });
  it('shows a status pill + score/target and keeps the three-axis facts below', () => {
    expect(ciso).toContain('class="c5pill ');
    expect(ciso).toContain("sc5.toFixed(1)+'<span style=\"font-size:14px;color:var(--muted)\"> / 5</span>");
    expect(ciso).toContain('<div class="ev-sec">Continuous assessment</div>');
  });
  it('builds method-specific condition/evidence (live · hybrid · attestation · awaiting)', () => {
    expect(ciso).toContain("if(a.method==='live'){");
    expect(ciso).toContain('Automated continuous monitoring measured ');
    expect(ciso).toContain('HYBRID — telemetry pulled, a human validates');
    expect(ciso).toContain('evidenced by a scheduled <b>attestation</b>');
    expect(ciso).toContain('No connector is wired for this telemetry-assessable control yet');
  });
  it('top mirrors Classic: cards + the continuous-monitoring breakdown box', () => {
    expect(ciso).toContain("card('Overall maturity',overall5.toFixed(1)+' / 5'");
    expect(ciso).toContain("card('Coverage',covPct+'%'");
    expect(ciso).toContain("card('Controls failing',failing");
    // the standalone continuous-monitoring breakdown box was removed
    // the peer-benchmark box (same as Classic) is included instead
    expect(ciso).toContain('id="c5fwPeerBox"');
    expect(ciso).toContain('Peer benchmark · \'+fwShort+\' · ');
    expect(ciso).toContain('peerBox+');
  });
  it('drift panel is a clean card whose rows open the finding, with an expandable show-all', () => {
    expect(ciso).toContain('var C5_ASSESS_EXP=null, C5_ASSESS_CTRL=null, C5_ASSESS_DRIFT_ALL=false;');
    expect(ciso).toContain('var shown=C5_ASSESS_DRIFT_ALL?drift.regressions:drift.regressions.slice(0,8);');
    expect(ciso).toContain('data-driftmore="1"');
    expect(ciso).toContain('C5_ASSESS_DRIFT_ALL=!C5_ASSESS_DRIFT_ALL;c5ContinuousAssessment(host);');
    // drift rows carry data-assessctl so a click opens that control's finding
    expect(ciso).toContain('return \'<div data-assessctl="\'+esc(d.id)+\'"');
  });
});
