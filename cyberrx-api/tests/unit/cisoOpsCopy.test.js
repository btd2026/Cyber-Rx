/**
 * Source-scan guards for the CISO "Cyber Operations" tab (CyberRXNew/public/ciso5.js —
 * the OPS_* helpers + c5Effect). Asserts the command-oriented model: internal-incident-
 * first headline, No active issue / Action needed statuses (not "Healthy/Watch"),
 * next action + severity/SLA/owner per front, War Room Standby/Active, evidence
 * confidence, and a command-oriented bottom line.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const opsStart = src.indexOf('var OPS_OWNER=');
const opsEnd = src.indexOf('host.innerHTML=body;', opsStart);
const region = opsStart >= 0 && opsEnd > opsStart ? src.slice(opsStart, opsEnd) : '';

describe('Cyber Operations — headline & question', () => {
  it('locates the tab', () => {
    expect(opsStart).toBeGreaterThan(0);
    expect(region).toContain('what needs command attention right now');
  });
  it('headline states "No active internal incident" when no incident is active', () => {
    expect(region).toMatch(/verdict='No active internal incident\. '\+/);
  });
  it('headline changes to command-the-response when an incident is active', () => {
    expect(region).toContain("verdict='Active internal incident — command the response now.'");
  });
  it('names third-party exposure and emerging risks as the watch fronts', () => {
    expect(region).toMatch(/cops_thirdparty:'third-party exposure'/);
    expect(region).toMatch(/cops_emerging:'emerging risks'/);
  });
});

describe('Cyber Operations — status model (no Healthy/Watch)', () => {
  it('opsStatus returns No active issue / Action needed / Escalation needed, never Healthy/Watch', () => {
    const fn = region.slice(region.indexOf('function opsStatus'), region.indexOf('function opsStatus') + 320);
    expect(fn).toContain("t:'No active issue'");
    expect(fn).toContain("'Action needed'");
    expect(fn).toContain("'Escalation needed'");
    expect(fn).toContain("t:'Not Enough Evidence'");
    expect(fn).not.toMatch(/'Healthy'/);
    expect(fn).not.toMatch(/'Watch'/);
  });
  it('the tab renders custom command cards (c5OpsCard), not the shared ring grid', () => {
    expect(region).toMatch(/ms\.map\(function\(x\)\{return c5OpsCard\(x\.m,x\.d\.ic,demo\)/);
    expect(region).not.toMatch(/c5RingGrid\(defs,\{alarm/);
  });
});

describe('Cyber Operations — next action, severity, SLA, owner, source', () => {
  it('every action-needed card carries a next action', () => {
    expect(region).toMatch(/cops_thirdparty:'Confirm service dependency and remediation evidence\.'/);
    expect(region).toMatch(/cops_emerging:'Validate exposure against current stack\.'/);
    expect(region).toMatch(/<b>Next action:<\/b>/);
  });
  it('third-party card shows the vendor count + dependency/remediation message', () => {
    expect(region).toContain('{n} vendors require dependency and remediation validation.');
  });
  it('emerging-risk card shows the action count + exposure-validation message', () => {
    expect(region).toContain('{n} risk requires exposure validation against the current stack.');
  });
  it('cards show severity, SLA, owner and source status', () => {
    expect(region).toMatch(/Severity: '\+opsSeverity\(m\)\+' · SLA: '\+opsSla\(m\)\+' · Owner: '\+OPS_OWNER\[m\.id\]\+' · '\+opsSource/);
    expect(region).toMatch(/cops_thirdparty:'Vendor Risk'/);
    expect(region).toMatch(/cops_emerging:'Threat Intel'/);
  });
  it('marks values Demo in non-production (mock marking)', () => {
    const fn = region.slice(region.indexOf('function opsSource'), region.indexOf('function opsSource') + 200);
    expect(fn).toMatch(/if\(demo\)return 'Demo'/);
  });
  it('preserves drill-down / source traceability', () => {
    expect(region).toMatch(/data-c5m="'\+m\.id\+'"/);
    expect(region).toMatch(/Click for the record/);
  });
});

describe('Cyber Operations — evidence confidence', () => {
  it('renders the evidence-confidence panel', () => {
    expect(region).toContain('c5OpsEvidencePanel(ms,demo)');
  });
  it('business-service dependency mapping is a critical evidence source (cannot be High if missing)', () => {
    expect(region).toMatch(/Business-service dependency mapping',connected:depMapped, critical:true/);
  });
});

describe('Cyber Operations — War Room card', () => {
  it('Standby when no escalation threshold crossed', () => {
    expect(region).toContain('War Room status · Standby');
    expect(region).toContain('No active incident has crossed escalation threshold');
  });
  it('Active with response console when a critical incident crosses threshold', () => {
    expect(region).toContain('War Room active');
    expect(region).toContain('Critical incident active — response console open');
    expect(region).toContain('Open active response');
  });
});

describe('Cyber Operations — bottom line', () => {
  it('states no active internal incident and names third-party as the live command front', () => {
    expect(region).toContain('No active internal business-impacting incident is underway.');
    expect(region).toContain('The live command front is third-party exposure');
  });
  it('button opens the third-party exposure queue', () => {
    expect(region).toContain("cops_thirdparty:'Open third-party exposure queue'");
  });
  it('does not use all-clear / fully-remediated / no-risk / healthy-across-the-board', () => {
    expect(region).not.toMatch(/all clear/i);
    expect(region).not.toMatch(/fully remediated/i);
    expect(region).not.toMatch(/healthy across the board/i);
    expect(region).not.toMatch(/\bno risk\b/i);
  });
});
