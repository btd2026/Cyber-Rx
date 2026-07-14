'use strict';

/**
 * Hybrid weekly confirm queue — reduce human touch to a single click. For hybrid controls
 * Nerion pulls the evidence and proposes a verdict; the human approves or disputes rather than
 * hunting for proof. Decisions persist. Source-scan guard.
 */
const fs = require('fs');
const path = require('path');
const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('Hybrid confirm queue', () => {
  it('queues hybrid controls with a proposed verdict and pre-attached evidence', () => {
    expect(ciso).toContain('function c5ReviewQueue(){');
    expect(ciso).toContain("if(a.method!=='hybrid')return;");
    expect(ciso).toContain('out.push({id:id,proposed:a.verdict,coverage:a.coverage,evidence:ev,confirmed:!!conf[id]');
  });
  it('persists an approve / dispute / undo decision per control', () => {
    expect(ciso).toContain('function c5ConfirmControl(id,decision){');
    expect(ciso).toContain("localStorage.setItem('cyberrx_confirmations',JSON.stringify(o));");
  });
  it('renders the queue with Approve/Dispute and wires the actions', () => {
    expect(ciso).toContain('Weekly confirm queue · ');
    expect(ciso).toContain('data-confirm="approve:');
    expect(ciso).toContain('data-confirm="dispute:');
    expect(ciso).toContain("c5ConfirmControl(id,(act==='clear')?null:act);c5ContinuousAssessment(host);");
    expect(ciso).toContain('+queuePanel');
  });
});
