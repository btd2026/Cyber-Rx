/**
 * Source-scan guards for the CISO "AI & Supply Chain" tab (CyberRXNew/public/ciso5.js —
 * the AIS_* helpers + c5AiSupply). Asserts the board-level framing: the AI-exposure
 * headline, safer statuses (no "Healthy"), inventory/scanning != readiness, next
 * actions, evidence confidence, and the business-run-AI bottom line.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const s = src.indexOf('var AIS_NEXT=');
const eMark = src.indexOf('Posture is self-reported until the named tool connects', s);
const region = s >= 0 && eMark > s ? src.slice(s, eMark + 120) : '';

describe('AI & Supply Chain — headline & answer', () => {
  it('locates the tab', () => {
    expect(s).toBeGreaterThan(0);
    expect(region).toContain('where are we exposed across AI and software supply chain');
  });
  it('uses the AI-exposure headline', () => {
    expect(region).toContain('AI exposure is no longer just model risk — it now includes shadow AI, code, pipelines, identities, and crypto readiness.');
  });
});

describe('AI & Supply Chain — safer statuses (no Healthy)', () => {
  it('aisStatus returns Monitored / Action needed / Monitor / Not Enough Evidence, never Healthy', () => {
    const fn = region.slice(region.indexOf('function aisStatus'), region.indexOf('function aisSub'));
    expect(fn).toContain("t:'Monitored'");
    expect(fn).toContain("t:'Action needed'");
    expect(fn).toContain("t:'Monitor'");
    expect(fn).toContain("t:'Not Enough Evidence'");
    expect(fn).not.toMatch(/'Healthy'/);
  });
  it('renders custom command cards, not the shared ring grid', () => {
    expect(region).toMatch(/defs\.map\(function\(d\)\{return c5AisCard\(byId\[d\.id\],d\.ic,demo\)/);
    expect(region).not.toContain('var tiles=c5RingGrid(defs)');
  });
});

describe('AI & Supply Chain — inventory/scanning is not readiness', () => {
  it('PQC is Monitor with migration-planning-needed, never Healthy from inventory', () => {
    expect(region).toContain("if(m.id==='ais_pqc')return {t:'Monitor'");
    expect(region).toContain('Crypto inventory complete; migration planning needed');
  });
  it('AI-assisted coding says controls under validation, not scanning-sufficient', () => {
    expect(region).toContain('Code scanned; leakage, license, and policy controls under validation');
  });
  it('CI/CD mentions provenance tracked or flags provenance evidence needed', () => {
    expect(region).toContain('Scanned, signed, and provenance tracked');
    expect(region).toContain('Scanned and signed; provenance evidence needed');
  });
  it('machine identities show ownership/rotation/privilege under review', () => {
    expect(region).toContain('Ownership, rotation, and privilege under review');
  });
});

describe('AI & Supply Chain — next actions & evidence', () => {
  it('every Action-needed / partial card carries a next action', () => {
    expect(region).toContain("ais_aiml:'Complete posture review for the AI system with an open gap.'");
    expect(region).toContain("ais_nhi:'Validate service-account ownership, rotation, and privileged access.'");
    expect(region).toMatch(/<b>Next action:<\/b>/);
  });
  it('drill labels for the two action fronts', () => {
    expect(region).toContain("ais_aiml:'Open AI posture gaps'");
    expect(region).toContain("ais_nhi:'Review machine-identity exposure'");
  });
  it('renders the evidence-confidence panel with AI-SPM as a critical self-reported source', () => {
    expect(region).toContain('c5AisEvidencePanel(E)');
    expect(region).toMatch(/AI security posture \(AI-SPM\)',\s*connected:live\('ais_aiml'\),\s*critical:true/);
  });
  it('marks demo and self-reported evidence in non-production', () => {
    expect(region).toMatch(/signalsAreDemo/);
    expect(region).toMatch(/if\(demo\)return 'Demo'/);
    expect(region).toContain('Self-reported until tool connects');
    expect(region).toMatch(/var level=.*demo\?'Demo':conf\.level|level:demo\?'Demo':conf\.level/);
  });
  it('preserves drill-down / source traceability', () => {
    expect(region).toMatch(/data-c5m="'\+m\.id\+'"/);
  });
});

describe('AI & Supply Chain — bottom line', () => {
  it('identifies business-run AI systems + machine identities as the concentration', () => {
    expect(region).toContain('Your highest AI and supply-chain exposure is in business-run AI systems.');
    expect(region).toContain('Exposure is concentrated in business-run AI systems and machine identities');
  });
  it('does not use the old "Close your highest exposure first" / "good shape" copy', () => {
    expect(region).not.toContain('Close your highest AI & supply-chain exposure first');
    expect(region).not.toContain('in good shape');
  });
  it('button says Close AI posture gap', () => {
    expect(region).toContain("blBtn='Close AI posture gap'");
  });
});
