'use strict';
/**
 * LicenseService — offline signed-license enforcement.
 * Exercises the full flow against ephemeral keys/files in a temp dir so no key
 * material or license artifact touches the repo. Covers: signature verify,
 * active/grace/expired states, machine binding, tamper detection, and the
 * anti-clock-rollback high-water mechanism.
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const License = require('../../src/services/LicenseService');

const DAY = 24 * 60 * 60 * 1000;

// --- Ephemeral vendor keypair + workspace ---------------------------------
let dir, pubPath, privPath, licPath, statePath, privateKey;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nerion-lic-'));
  pubPath = path.join(dir, 'pub.pem');
  privPath = path.join(dir, 'priv.pem');
  licPath = path.join(dir, 'license.json');
  statePath = path.join(dir, '.state.json');

  const kp = crypto.generateKeyPairSync('ed25519');
  fs.writeFileSync(pubPath, kp.publicKey.export({ type: 'spki', format: 'pem' }));
  fs.writeFileSync(privPath, kp.privateKey.export({ type: 'pkcs8', format: 'pem' }));
  privateKey = kp.privateKey;
});

afterEach(() => { try { fs.unlinkSync(statePath); } catch (_) {} });
afterAll(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} });

// Sign a payload with the ephemeral private key exactly as issue.js does.
function writeLicense(payload) {
  const data = Buffer.from(License.canonicalize(payload), 'utf8');
  const sig = crypto.sign(null, data, privateKey).toString('base64');
  fs.writeFileSync(licPath, JSON.stringify({ payload, sig }));
}

function check(opts) {
  return License.checkStatus(Object.assign({
    pubKeyPath: pubPath, licensePath: licPath, statePath,
    skipMachineCheck: true,
  }, opts));
}

const t0 = Date.parse('2026-01-01T00:00:00Z');

describe('signature + expiry states', () => {
  it('reports ACTIVE for a valid unexpired trial', () => {
    const p = License.buildPayload({ customer: 'Acme', plan: 'trial', now: t0 });
    writeLicense(p);
    const s = check({ now: t0 + 1 * DAY });
    expect(s.state).toBe(License.STATE.ACTIVE);
    expect(s.ok).toBe(true);
    expect(s.plan).toBe('trial');
    expect(s.daysLeft).toBe(License.TRIAL_DAYS - 1);
  });

  it('trial default span is 14 days, paid is 365', () => {
    expect(License.buildPayload({ plan: 'trial', now: t0 }).expires)
      .toBe(new Date(t0 + License.TRIAL_DAYS * DAY).toISOString());
    expect(License.buildPayload({ plan: 'paid', now: t0 }).expires)
      .toBe(new Date(t0 + License.PAID_DAYS * DAY).toISOString());
  });

  it('enters GRACE just past expiry (still ok, but warns)', () => {
    const p = License.buildPayload({ plan: 'trial', now: t0, graceDays: 7 });
    writeLicense(p);
    const s = check({ now: t0 + (License.TRIAL_DAYS + 2) * DAY });
    expect(s.state).toBe(License.STATE.GRACE);
    expect(s.ok).toBe(true);
    expect(s.graceDaysLeft).toBeGreaterThan(0);
    expect(s.reason).toMatch(/grace/i);
  });

  it('EXPIRED once past expiry + grace (blocks)', () => {
    const p = License.buildPayload({ plan: 'trial', now: t0, graceDays: 7 });
    writeLicense(p);
    const s = check({ now: t0 + (License.TRIAL_DAYS + 30) * DAY });
    expect(s.state).toBe(License.STATE.EXPIRED);
    expect(s.ok).toBe(false);
  });

  it('MISSING when no license file exists', () => {
    const s = License.checkStatus({ pubKeyPath: pubPath, licensePath: path.join(dir, 'nope.json'), statePath });
    expect(s.state).toBe(License.STATE.MISSING);
    expect(s.ok).toBe(false);
  });
});

describe('tamper detection', () => {
  it('TAMPERED when the payload is edited after signing', () => {
    const p = License.buildPayload({ plan: 'trial', now: t0 });
    writeLicense(p);
    // Attacker extends expiry by 10 years in the file, leaving the old signature.
    const lic = JSON.parse(fs.readFileSync(licPath, 'utf8'));
    lic.payload.expires = new Date(t0 + 3650 * DAY).toISOString();
    fs.writeFileSync(licPath, JSON.stringify(lic));
    const s = check({ now: t0 + 100 * DAY });
    expect(s.state).toBe(License.STATE.TAMPERED);
    expect(s.ok).toBe(false);
  });

  it('TAMPERED when signed by the wrong key', () => {
    const other = crypto.generateKeyPairSync('ed25519');
    const p = License.buildPayload({ plan: 'paid', now: t0 });
    const data = Buffer.from(License.canonicalize(p), 'utf8');
    const sig = crypto.sign(null, data, other.privateKey).toString('base64');
    fs.writeFileSync(licPath, JSON.stringify({ payload: p, sig }));
    const s = check({ now: t0 + 1 * DAY });
    expect(s.state).toBe(License.STATE.TAMPERED);
  });
});

describe('machine binding', () => {
  it('WRONG_MACHINE when fingerprint does not match', () => {
    const p = License.buildPayload({ plan: 'paid', machineId: 'fingerprint-AAA', now: t0 });
    writeLicense(p);
    const s = License.checkStatus({
      pubKeyPath: pubPath, licensePath: licPath, statePath,
      now: t0 + 1 * DAY, machineId: 'fingerprint-BBB',
    });
    expect(s.state).toBe(License.STATE.WRONG_MACHINE);
    expect(s.ok).toBe(false);
  });

  it('ACTIVE when bound fingerprint matches', () => {
    const p = License.buildPayload({ plan: 'paid', machineId: 'fingerprint-AAA', now: t0 });
    writeLicense(p);
    const s = License.checkStatus({
      pubKeyPath: pubPath, licensePath: licPath, statePath,
      now: t0 + 1 * DAY, machineId: 'fingerprint-AAA',
    });
    expect(s.state).toBe(License.STATE.ACTIVE);
    expect(s.ok).toBe(true);
  });
});

describe('anti-clock-rollback', () => {
  it('flags CLOCK_SUSPECT when the clock is wound back past the high-water mark', () => {
    const p = License.buildPayload({ plan: 'paid', now: t0 });
    writeLicense(p);
    // First check at day 100 sets the high-water mark to t0+100d.
    const s1 = check({ now: t0 + 100 * DAY });
    expect(s1.state).toBe(License.STATE.ACTIVE);
    // Now the clock jumps back to day 1 (attacker dodging expiry) — beyond skew.
    const s2 = check({ now: t0 + 1 * DAY });
    expect(s2.state).toBe(License.STATE.CLOCK_SUSPECT);
    expect(s2.ok).toBe(false);
  });

  it('tolerates benign backward drift within the skew window', () => {
    const p = License.buildPayload({ plan: 'paid', now: t0 });
    writeLicense(p);
    check({ now: t0 + 100 * DAY }); // set high-water
    // Small backward drift (well under CLOCK_SKEW_MS) is allowed.
    const s = check({ now: t0 + 100 * DAY - (License.CLOCK_SKEW_MS / 2) });
    expect(s.state).toBe(License.STATE.ACTIVE);
  });

  it('rejects a state file whose high-water tag was forged (fail-safe to 0)', () => {
    const p = License.buildPayload({ plan: 'paid', now: t0 });
    writeLicense(p);
    check({ now: t0 + 100 * DAY }); // legit high-water written
    // Attacker rewinds the high-water mark by editing the state file directly.
    fs.writeFileSync(statePath, JSON.stringify({ highWater: t0 + 1 * DAY, tag: 'deadbeef' }));
    // Forged tag → treated as high-water 0 → no false CLOCK_SUSPECT, but also no
    // protection carried over from the tampered file. A later legit check re-arms.
    const s = check({ now: t0 + 2 * DAY });
    expect(s.state).toBe(License.STATE.ACTIVE);
  });
});

describe('machineFingerprint', () => {
  it('is a stable 64-char hex digest', () => {
    const fp1 = License.machineFingerprint();
    const fp2 = License.machineFingerprint();
    expect(fp1).toMatch(/^[0-9a-f]{64}$/);
    expect(fp1).toBe(fp2);
  });
});
