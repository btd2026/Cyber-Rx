'use strict';

/**
 * System discovery — real connection mechanics + an upload path. Picking a discovery source
 * now reveals the actual credentials a real integration needs (instance URL / API token) and
 * a "Connect & pull" action, and orgs without a CMDB can upload a CSV of their estate. Three
 * ways in: connect · upload · paste. Source-scan guard.
 */
const fs = require('fs');
const path = require('path');

const onboarding = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/onboarding.html'), 'utf8');

describe('System discovery — connection mechanics', () => {
  it('defines the real connection fields per source (URL / token), not just a chip', () => {
    expect(onboarding).toContain('var SRC_FIELDS={');
    expect(onboarding).toContain("l:'Instance URL',ph:'https://yourorg.service-now.com'");
    expect(onboarding).toContain("l:'API token / password'");
    // cloud + idp + edr each carry their own connection shape
    expect(onboarding).toContain("l:'Read-only role ARN or API key'");
    expect(onboarding).toContain("l:'Org domain'");
    expect(onboarding).toContain("l:'Console / tenant URL'");
  });

  it('renders a per-source connection card with a Connect & pull action', () => {
    expect(onboarding).toContain('function renderDiscConn()');
    expect(onboarding).toContain('id="discConn"');
    expect(onboarding).toContain('data-connsrc="');
    expect(onboarding).toContain('Connect &amp; pull inventory');
    // a source is not counted until the user actually connects it
    expect(onboarding).toContain("if(!c.classList.toggle('on'))delete DISCOVERED[c.getAttribute('data-l')];");
  });

  it('never persists credentials from onboarding — the secure connector re-collects at go-live', () => {
    expect(onboarding).toContain('credentials aren’t stored from setup');
  });
});

describe('System discovery — upload for orgs without a CMDB', () => {
  it('offers a CSV/spreadsheet upload as a first-class path', () => {
    expect(onboarding).toContain('No CMDB? Upload your system list');
    expect(onboarding).toContain('id="sysFile"');
    expect(onboarding).toContain('accept=".csv,.tsv,.txt"');
  });

  it('parses the upload with the same parser as the paste box (one owner/region/class model)', () => {
    expect(onboarding).toContain('function parseSystems(text){');
    expect(onboarding).toContain('IMPORTED=parseSystems(String(r.result||\'\'));');
    expect(onboarding).toContain("IMPORTED=parseSystems(document.getElementById('sysBulk').value||'');");
    // the owner→region/class derivation still lives in the shared parser
    expect(onboarding).toContain("var scope=(p[2]||'').toLowerCase();var region=(scope==='corporate'||!scope)?'':(scope.indexOf('_')>0?scope.split('_')[0]:scope);");
  });
});
