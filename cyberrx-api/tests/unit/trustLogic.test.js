/**
 * Tests for the CEO "Customer Trust" tab decision logic (CyberRXNew/public/trustLogic.js).
 *
 * The browser file is a classic <script> in a "type":"module" tree, so we load it in
 * a vm sandbox (with a CommonJS `module` shim) and exercise the exact shipped code.
 * These lock the CEO-safe wording rules: no overclaiming, evidence-gated exposure,
 * posture that moves with the evidence, and dollar figures that always carry a label.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadTrustLogic() {
  const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/trustLogic.js'), 'utf8');
  const sandbox = { self: {}, module: { exports: {} } };
  vm.runInNewContext(src, sandbox);
  return sandbox.module.exports && sandbox.module.exports.trustPosture ? sandbox.module.exports : sandbox.self.TrustLogic;
}

const TL = loadTrustLogic();

describe('trustLogic module loads', () => {
  it('exposes the public API', () => {
    ['trustPosture', 'customerDataExposure', 'trustAnswer', 'bottomLineHead', 'sourceStatus', 'EXPOSURE_LABEL', 'POSTURE'].forEach((k) => {
      expect(TL[k]).toBeDefined();
    });
  });
});

describe('customer trust posture moves with the evidence', () => {
  it('is muted "—" when the incident source is not connected (never green)', () => {
    const p = TL.trustPosture({ incidentsConnected: false });
    expect(p.label).toBe('—');
    expect(p.connected).toBe(false);
  });
  it('is Stable when connected, no incidents, no events, no material exposure', () => {
    expect(TL.trustPosture({ incidentsConnected: true, incidents: 0, disclosures: 0, identityMaterial: false }).label).toBe('Stable');
  });
  it('is Stable — Watch when clean but a material identity exposure is under watch', () => {
    expect(TL.trustPosture({ incidentsConnected: true, incidents: 0, disclosures: 0, identityMaterial: true }).label).toBe('Stable — Watch');
  });
  it('is At Risk when there is a customer-impacting incident', () => {
    expect(TL.trustPosture({ incidentsConnected: true, incidents: 2, disclosures: 0 }).label).toBe('At Risk');
  });
  it('is Critical when a customer/regulator had to be notified', () => {
    expect(TL.trustPosture({ incidentsConnected: true, incidents: 0, disclosures: 1 }).label).toBe('Critical');
  });
  it('only ever returns one of the four allowed values', () => {
    [
      { incidentsConnected: true, incidents: 0, disclosures: 0, identityMaterial: false },
      { incidentsConnected: true, incidents: 0, disclosures: 0, identityMaterial: true },
      { incidentsConnected: true, incidents: 5, disclosures: 0 },
      { incidentsConnected: true, incidents: 0, disclosures: 3 },
    ].forEach((inp) => expect(TL.POSTURE).toContain(TL.trustPosture(inp).label));
  });
});

describe('customer data exposure — safe wording, evidence-gated', () => {
  it('never says "No confirmed customer data exposure" unless SIEM AND DLP are connected', () => {
    // SIEM connected, DLP NOT connected, no incident → must be "Evidence incomplete", not a clean claim.
    const r = TL.customerDataExposure({ incidentsConnected: true, dlpConnected: false, incidentTouchingData: 0 });
    expect(r.label).toBe('Evidence incomplete');
    expect(r.complete).toBe(false);
    expect(r.label).not.toMatch(/no exposure/i);
  });
  it('says "No confirmed customer data exposure" only when evidence is complete and clean', () => {
    const r = TL.customerDataExposure({ incidentsConnected: true, dlpConnected: true, incidentTouchingData: 0 });
    expect(r.label).toBe('No confirmed customer data exposure');
    expect(r.complete).toBe(true);
  });
  it('never emits the banned phrase "No exposure"', () => {
    const labels = [
      TL.customerDataExposure({ incidentsConnected: false }),
      TL.customerDataExposure({ incidentsConnected: true, dlpConnected: false, incidentTouchingData: 0 }),
      TL.customerDataExposure({ incidentsConnected: true, dlpConnected: true, incidentTouchingData: 0 }),
      TL.customerDataExposure({ incidentsConnected: true, dlpConnected: true, incidentTouchingData: 2 }),
    ].map((r) => r.label);
    labels.forEach((l) => expect(l).not.toBe('No exposure'));
  });
  it('flags "Exposure under investigation" when an open incident could touch customer data', () => {
    expect(TL.customerDataExposure({ incidentsConnected: true, dlpConnected: true, incidentTouchingData: 1 }).label).toBe('Exposure under investigation');
  });
});

describe('the CEO answer sentence', () => {
  it('affirms no confirmed impact but names the identity watch and the availability gap', () => {
    const a = TL.trustAnswer({ incidentsConnected: true, incidents: 0, disclosures: 0, identityMaterial: true, availabilityConnected: false });
    expect(a).toMatch(/^Yes — no confirmed customer impact\./);
    expect(a).toMatch(/identity exposure in the customer platform remains under watch/);
    expect(a).toMatch(/Availability evidence is incomplete/);
  });
  it('does not claim availability is proven when availability is connected', () => {
    const a = TL.trustAnswer({ incidentsConnected: true, incidents: 0, disclosures: 0, identityMaterial: true, availabilityConnected: true });
    expect(a).not.toMatch(/Availability evidence is incomplete/);
  });
  it('says "No" and demands attention when customers were impacted', () => {
    expect(TL.trustAnswer({ incidentsConnected: true, incidents: 1, disclosures: 0 })).toMatch(/^No —/);
  });
  it('does not answer at all when the source is not connected', () => {
    expect(TL.trustAnswer({ incidentsConnected: false })).toMatch(/Connect your SIEM/);
  });
});

describe('dollar exposure always carries a business label', () => {
  it('provides a non-empty label explaining what the number means', () => {
    expect(TL.EXPOSURE_LABEL).toMatch(/exposure/i);
    expect(TL.EXPOSURE_LABEL.length).toBeGreaterThan(10);
  });
});

describe('evidence-confidence source statuses', () => {
  it('maps connected / partial / not-connected to allowed statuses', () => {
    expect(TL.sourceStatus({ connected: true }).label).toBe('Connected');
    expect(TL.sourceStatus({ connected: true, computed: true }).label).toBe('Computed');
    expect(TL.sourceStatus({ connected: true, partial: true }).label).toBe('Partially Connected');
    expect(TL.sourceStatus({ connected: false }).label).toBe('Not Connected');
    expect(TL.sourceStatus({ stale: true }).label).toBe('Stale');
    expect(TL.sourceStatus({ someEvidence: true }).label).toBe('Not Enough Evidence');
  });
});

describe('bottom-line headline is decision-oriented and honest', () => {
  it('is stable-today when clean', () => {
    expect(TL.bottomLineHead({ incidentsConnected: true, incidents: 0, disclosures: 0 })).toMatch(/stable today/i);
  });
  it('flips to act-now when customers are impacted', () => {
    expect(TL.bottomLineHead({ incidentsConnected: true, incidents: 1 })).toMatch(/act now/i);
  });
});
