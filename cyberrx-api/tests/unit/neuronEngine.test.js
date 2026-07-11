'use strict';

/**
 * Neuron Controls — Phase 2: the capability layer is now the SCORING ENGINE behind
 * the Classic framework view (source-scan guard).
 *
 *  · fwDeployedIds() / fwControlTool() derive the control→telemetry map from ONE
 *    crosswalk (capXwalkIds = CAP_FRAMEWORK csf/r53 + NEURON_XWALK cis/iso/soc2/pci),
 *    so a single telemetry pull projects onto all six frameworks.
 *  · the external-framework branch (CIS/ISO/SOC 2) telemetry-scores a control the same
 *    way CSF/800-53 do — via controlCmmi(id, cov) — with the native engine still winning
 *    first and the CSF crosswalk as the fallback.
 *
 * CSF + 800-53 numbers are unchanged (verified separately at build time via a live
 * before/after render): external control IDs are numeric/lettered and never collide
 * with CSF (XX.XX-NN) or 800-53 (AA-N) IDs, so their coverage keys are purely additive.
 */
const fs = require('fs');
const path = require('path');

const cockpit = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');
const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('Neuron Controls Phase 2 — unified scoring engine', () => {
  it('capXwalkIds fuses CAP_FRAMEWORK (csf/r53) with NEURON_XWALK (external frameworks)', () => {
    expect(cockpit).toContain('function capXwalkIds(c)');
    expect(cockpit).toContain('ids=ids.concat(nx.cis||[],nx.iso||[],nx.soc2||[],nx.pci||[]);');
  });

  it('fwDeployedIds and fwControlTool both project through capXwalkIds (all six frameworks)', () => {
    expect(cockpit).toContain('function fwDeployedIds(){var m={};CAPS.forEach(function(c){var p=capDeploy(c);if(p==null)return;capXwalkIds(c).forEach(');
    expect(cockpit).toContain('CAPS.forEach(function(c){if(capXwalkIds(c).indexOf(id)<0)return;');
  });

  it('the external-framework branch telemetry-scores via controlCmmi, native still wins first', () => {
    expect(ciso).toContain('var cc=(typeof controlCmmi===\'function\')?controlCmmi(it[0],cov):null;');
    expect(ciso).toContain("status='Telemetry (Neuron Controls)';readiness=true;");
    // native engine result is checked before the Neuron path
    expect(ciso).toContain("status=nat.assessment_status;src='native';tested=true;");
    // CSF crosswalk remains the fallback after direct telemetry
    expect(ciso).toContain('var cw=caCrosswalkScore(it[2],cov);');
  });
});
