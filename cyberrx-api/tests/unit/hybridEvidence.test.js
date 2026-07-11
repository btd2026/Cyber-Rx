'use strict';

/**
 * Four evidence classes across every framework (continuous-assessment view):
 *   live telemetry — a connected tool assesses the control fully & automatically (auto capability)
 *   hybrid         — a connected tool pulls telemetry, but a human validates it (semi/manual)
 *   document       — no tool can automate it; evidenced only by an analyzed policy
 *   not evidenced  — neither
 * controlCmmi assigns the class; c5fwSrcCounts tallies it and resolves crosswalk-mapped controls
 * (CIS/SOC2/HIPAA/ISO/800-53) to the strongest class of the CSF controls they map to.
 */
const fs = require('fs');
const path = require('path');
const cock = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');
const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('hybrid evidence classification (Phase — continuous assessment)', () => {
  it('controlCmmi splits tool-assessed controls into live (automated) vs hybrid (needs validation)', () => {
    const fn = cock.slice(cock.indexOf('function controlCmmi('), cock.indexOf('function controlCmmi(') + 900);
    expect(fn).toContain("(ceil!=null&&ceil<5)?'hybrid':'system'"); // semi/manual ceil<5 => hybrid
    expect(fn).toContain("hasTool?"); // no tool => document (can't be automated)
  });

  it('c5fwSrcCounts counts hybrid and resolves mapped/native controls to their CSF class (all frameworks)', () => {
    expect(ciso).toContain('hybrid:h');
    expect(ciso).toContain("node.src==='mapped'||node.src==='native'"); // crosswalked frameworks resolve too
    expect(ciso).toContain('var RANK={system:4,hybrid:3,document:2,none:1}'); // strongest class wins
  });

  it('the evidence bar renders all four classes and a continuously-assessed headline', () => {
    expect(ciso).toContain('continuously assessed from your connected tools');
    expect(ciso).toContain('live telemetry');
    expect(ciso).toContain('hybrid (telemetry + review)');
    expect(ciso).toContain('can’t be automated at all');
    expect(ciso).toContain('(!T.total)?'); // the bar shows for every framework, not just non-native
  });
});
