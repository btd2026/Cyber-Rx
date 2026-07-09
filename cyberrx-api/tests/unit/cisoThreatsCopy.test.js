/**
 * Source-scan guards for the CISO "Threats" tab (CyberRXNew/public/ciso5.js — the
 * THREAT_PATHS/c5Threats surface + c5tacticMetric wording). Asserts the threat-command
 * framing: no-confirmed-intrusion (not "no active attack"), coverage (not "defended"),
 * posture strip, top attack paths, evidence-aware MITRE grid, identity-dependency,
 * evidence confidence, and the identity-attack-path bottom line.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const tStart = src.indexOf('var THREAT_PATHS=');
const tEnd = src.indexOf('/* ---------- Tab 05 — Peers', tStart);
const region = tStart >= 0 && tEnd > tStart ? src.slice(tStart, tEnd) : '';
// c5tacticMetric wording lives earlier in the file.
const tm = src.slice(src.indexOf('function c5tacticMetric'), src.indexOf('function c5tacticMetric') + 1600);

describe('Threats — no overclaiming', () => {
  it('does not display "No active attack" anywhere', () => {
    expect(src).not.toContain('No active attack');
  });
  it('displays "No confirmed active intrusion"', () => {
    expect(src).toContain('No confirmed active intrusion in connected telemetry');
    expect(region).toContain('No confirmed active intrusion, but identity-driven attack paths remain the highest threat exposure.');
  });
  it('tactic coverage is labelled "coverage", never "defended"', () => {
    expect(tm).toMatch(/cov\+'% coverage'/);
    expect(tm).not.toMatch(/% defended/);
    expect(region).not.toMatch(/% defended/);
  });
  it('does not claim tactics are fully covered / no partial tactics', () => {
    expect(region).not.toMatch(/fully covered/i);
    expect(region).not.toContain('No partial tactics');
    expect(region).toContain('tactics mapped; coverage strength varies by evidence and control type');
  });
});

describe('Threats — posture strip & attack paths', () => {
  it('renders the four-item posture summary strip incl. highest exposure path', () => {
    expect(region).toContain('c5ThreatsStrip(ts,ta,E.level,demo)');
    expect(region).toContain('Confirmed active intrusion');
    expect(region).toContain('Highest exposure path');
    expect(region).toContain('Identity → Privilege → Customer platform');
  });
  it('renders a Top attack paths section with business-relevant paths', () => {
    expect(region).toContain('Top attack paths requiring attention');
    expect(region).toContain('Identity compromise → privilege escalation → cloud access');
    expect(region).toContain('Phishing → credential theft → lateral movement');
    expect(region).toContain('Vendor compromise → service disruption');
  });
  it('each attack path carries status, relevance, affected tactics and next action', () => {
    expect(region).toMatch(/Why it matters: /);
    expect(region).toMatch(/Affected tactics: /);
    expect(region).toMatch(/<b>Next action:<\/b>/);
  });
});

describe('Threats — evidence-aware MITRE grid', () => {
  it('identity-dependent tactics are flagged and never read Strong while identity evidence is partial', () => {
    expect(tm).toContain("var IDENTITY_TACTICS=['Initial Access','Persistence','Privilege Escalation','Defense Evasion','Credential Access','Discovery','Lateral Movement']");
    expect(region).toMatch(/if\(idDep&&identityPartial&&covStat==='Strong Coverage'\)covStat='Moderate Coverage'/);
    expect(region).toContain('Identity evidence partial');
    expect(region).toContain('identity path');
  });
  it('shows coverage status and Prevent/Detect/Respond compactly', () => {
    expect(region).toMatch(/P\/D\/R: '\+m\.prevent\+' · '\+m\.detect\+' · '\+m\.respond/);
    expect(tm).toMatch(/prevent:pdr\(/);
    expect(tm).toMatch(/coverage_status:covStat/);
  });
  it('marks demo telemetry in non-production', () => {
    expect(region).toMatch(/signalsAreDemo/);
    expect(region).toContain('Demo Telemetry');
    expect(region).toContain('Values are demo telemetry');
  });
});

describe('Threats — evidence confidence', () => {
  it('renders the evidence-confidence panel', () => {
    expect(region).toContain('c5ThreatsEvidencePanel(E)');
  });
  it('identity operating evidence is a critical, not-connected source (never High)', () => {
    expect(region).toMatch(/Identity operating evidence',connected:false,\s*critical:true/);
  });
  it('evidence level shows Demo when telemetry is demo', () => {
    expect(region).toMatch(/var level=demo\?'Demo':conf\.level/);
  });
});

describe('Threats — bottom line', () => {
  it('identifies identity-driven access into customer-platform services as the material path', () => {
    expect(region).toContain('The most material threat path is identity-driven access into customer-platform services.');
  });
  it('does not use the old "toward full" / "removes your single largest exposure" claims', () => {
    expect(region).not.toContain('One move takes your coverage toward full');
    expect(region).not.toMatch(/removes your single largest exposure/);
  });
  it('button says Close identity attack-path gaps', () => {
    expect(region).toContain("txt:'Close identity attack-path gaps'");
  });
  it('preserves drill-down / source traceability', () => {
    expect(region).toMatch(/data-c5m="tac_'\+t\+'"/);
    expect(region).toMatch(/data-c5m="'\+\(p\.mid/);
  });
});
