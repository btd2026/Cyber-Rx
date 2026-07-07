'use strict';
/**
 * TamperResponseService — the appliance dead-man seal.
 * Verifies (against ephemeral keys/files in a temp dir):
 *   - severity model: HARD vs SOFT vs NONE
 *   - integrity manifest verify (signed) + patched-file detection
 *   - enforceAtStartup seals + crypto-shreds ONLY on HARD tamper, ONLY when enforcing
 *   - customer data is never touched (only the vault key is shredded)
 *   - vendor-signed unseal token recovery (fingerprint + nonce bound, single-use)
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const License = require('../../src/services/LicenseService');
const Tamper = require('../../src/services/TamperResponseService');

let dir, pubPath, privateKey;

function sign(payload) {
  return crypto.sign(null, Buffer.from(License.canonicalize(payload), 'utf8'), privateKey).toString('base64');
}
function writeManifest(files) {
  const payload = { v: 1, generated: '2026-01-01T00:00:00Z', files };
  fs.writeFileSync(Tamper._paths.MANIFEST, JSON.stringify({ payload, sig: sign(payload) }));
}
function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}
function clearArtifacts() {
  for (const p of [Tamper._paths.SEAL, Tamper._paths.MANIFEST, Tamper._paths.VAULT_KEY]) {
    try { fs.unlinkSync(p); } catch (_) {}
  }
}

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nerion-tamper-'));
  pubPath = path.join(dir, 'pub.pem');
  const kp = crypto.generateKeyPairSync('ed25519');
  fs.writeFileSync(pubPath, kp.publicKey.export({ type: 'spki', format: 'pem' }));
  privateKey = kp.privateKey;

  Tamper.__setPathsForTest({
    ROOT: dir,
    PUB_KEY: pubPath,
    MANIFEST: path.join(dir, 'integrity.manifest'),
    SEAL: path.join(dir, '.sealed'),
    VAULT_KEY: path.join(dir, '.vault_key'),
  });
});
afterEach(clearArtifacts);
afterAll(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} });

// A benign license status stub (assess accepts an injected status).
const OK = { state: License.STATE.ACTIVE };
const TAMPERED = { state: License.STATE.TAMPERED };
const WRONG_MACHINE = { state: License.STATE.WRONG_MACHINE };
const CLOCK = { state: License.STATE.CLOCK_SUSPECT };

describe('severity model', () => {
  it('NONE for a clean box', () => {
    expect(Tamper.assess({ licenseStatus: OK }).severity).toBe(Tamper.SEVERITY.NONE);
  });
  it('HARD for a broken license signature', () => {
    expect(Tamper.assess({ licenseStatus: TAMPERED }).severity).toBe(Tamper.SEVERITY.HARD);
  });
  it('SOFT for wrong_machine (legit VM migration path)', () => {
    expect(Tamper.assess({ licenseStatus: WRONG_MACHINE }).severity).toBe(Tamper.SEVERITY.SOFT);
  });
  it('SOFT for clock rollback (legit NTP-correction path)', () => {
    expect(Tamper.assess({ licenseStatus: CLOCK }).severity).toBe(Tamper.SEVERITY.SOFT);
  });
});

describe('integrity manifest', () => {
  it('HARD when a protected file is patched after signing', () => {
    const f = path.join(dir, 'protected.js');
    fs.writeFileSync(f, 'const answer = 42;\n');
    writeManifest({ 'protected.js': sha256File(f) });
    expect(Tamper.verifyManifest().ok).toBe(true);
    // Attacker patches the protected file.
    fs.writeFileSync(f, 'const answer = 43; /* patched */\n');
    const man = Tamper.verifyManifest();
    expect(man.ok).toBe(false);
    expect(Tamper.assess({ licenseStatus: OK }).severity).toBe(Tamper.SEVERITY.HARD);
  });

  it('HARD when a protected file is deleted', () => {
    const f = path.join(dir, 'gone.js');
    fs.writeFileSync(f, 'x');
    writeManifest({ 'gone.js': sha256File(f) });
    fs.unlinkSync(f);
    expect(Tamper.verifyManifest().ok).toBe(false);
  });

  it('rejects a manifest signed by the wrong key (cannot forge a pass)', () => {
    const other = crypto.generateKeyPairSync('ed25519');
    const f = path.join(dir, 'p.js'); fs.writeFileSync(f, 'x');
    const payload = { v: 1, files: { 'p.js': sha256File(f) } };
    const sig = crypto.sign(null, Buffer.from(License.canonicalize(payload), 'utf8'), other.privateKey).toString('base64');
    fs.writeFileSync(Tamper._paths.MANIFEST, JSON.stringify({ payload, sig }));
    expect(Tamper.verifyManifest().ok).toBe(false);
  });

  it('present=false (feature off) when no manifest is provisioned', () => {
    expect(Tamper.verifyManifest().present).toBe(false);
  });
});

describe('enforceAtStartup — seal + crypto-shred', () => {
  it('does NOT act when enforcement is off, even on HARD tamper', () => {
    Tamper.provisionVaultKey(true);
    const v = Tamper.enforceAtStartup({ enforce: false, licenseStatus: TAMPERED });
    expect(v.acted).toBe(false);
    expect(Tamper.isSealed()).toBe(false);
    expect(fs.existsSync(Tamper._paths.VAULT_KEY)).toBe(true); // key untouched
  });

  it('does NOT act on SOFT tamper even when enforcing', () => {
    Tamper.provisionVaultKey(true);
    const v = Tamper.enforceAtStartup({ enforce: true, licenseStatus: WRONG_MACHINE });
    expect(v.acted).toBe(false);
    expect(v.severity).toBe(Tamper.SEVERITY.SOFT);
    expect(Tamper.isSealed()).toBe(false);
    expect(fs.existsSync(Tamper._paths.VAULT_KEY)).toBe(true);
  });

  it('SEALS + shreds the vault key on HARD tamper when enforcing', () => {
    Tamper.provisionVaultKey(true);
    expect(fs.existsSync(Tamper._paths.VAULT_KEY)).toBe(true);
    const v = Tamper.enforceAtStartup({ enforce: true, licenseStatus: TAMPERED });
    expect(v.acted).toBe(true);
    expect(v.sealed).toBe(true);
    expect(Tamper.isSealed()).toBe(true);
    // Vendor material destroyed; seal record carries a recovery nonce.
    expect(fs.existsSync(Tamper._paths.VAULT_KEY)).toBe(false);
    expect(v.nonce).toMatch(/^[0-9a-f]{32}$/);
  });

  it('never touches a customer-data file (only the vault key)', () => {
    const customerData = path.join(dir, 'customer_data.db');
    fs.writeFileSync(customerData, 'IRREPLACEABLE CUSTOMER RECORDS');
    Tamper.provisionVaultKey(true);
    Tamper.enforceAtStartup({ enforce: true, licenseStatus: TAMPERED });
    expect(fs.existsSync(customerData)).toBe(true);
    expect(fs.readFileSync(customerData, 'utf8')).toBe('IRREPLACEABLE CUSTOMER RECORDS');
  });

  it('reports sealed on subsequent assess() calls', () => {
    Tamper.provisionVaultKey(true);
    Tamper.enforceAtStartup({ enforce: true, licenseStatus: TAMPERED });
    const a = Tamper.assess({ licenseStatus: OK }); // even a clean license stays sealed
    expect(a.sealed).toBe(true);
    expect(a.severity).toBe(Tamper.SEVERITY.HARD);
  });
});

describe('unseal recovery', () => {
  function mintToken(fingerprint, nonce) {
    const payload = { action: 'unseal', fingerprint, nonce, issued: '2026-01-02T00:00:00Z' };
    return { payload, sig: sign(payload) };
  }

  it('clears the seal + re-provisions the vault key with a valid token', () => {
    Tamper.provisionVaultKey(true);
    Tamper.enforceAtStartup({ enforce: true, licenseStatus: TAMPERED });
    const info = Tamper.sealInfo();
    expect(info.sealed).toBe(true);

    const res = Tamper.unseal(mintToken(info.fingerprint, info.nonce));
    expect(res.ok).toBe(true);
    expect(Tamper.isSealed()).toBe(false);
    expect(fs.existsSync(Tamper._paths.VAULT_KEY)).toBe(true); // re-armed
  });

  it('rejects a token with the wrong nonce', () => {
    Tamper.provisionVaultKey(true);
    Tamper.enforceAtStartup({ enforce: true, licenseStatus: TAMPERED });
    const info = Tamper.sealInfo();
    const res = Tamper.unseal(mintToken(info.fingerprint, 'deadbeef'.repeat(4)));
    expect(res.ok).toBe(false);
    expect(Tamper.isSealed()).toBe(true); // still sealed
  });

  it('rejects a token bound to a different machine fingerprint', () => {
    Tamper.provisionVaultKey(true);
    Tamper.enforceAtStartup({ enforce: true, licenseStatus: TAMPERED });
    const info = Tamper.sealInfo();
    const res = Tamper.unseal(mintToken('some-other-machine', info.nonce));
    expect(res.ok).toBe(false);
    expect(Tamper.isSealed()).toBe(true);
  });

  it('rejects a token signed by the wrong key', () => {
    Tamper.provisionVaultKey(true);
    Tamper.enforceAtStartup({ enforce: true, licenseStatus: TAMPERED });
    const info = Tamper.sealInfo();
    const other = crypto.generateKeyPairSync('ed25519');
    const payload = { action: 'unseal', fingerprint: info.fingerprint, nonce: info.nonce };
    const forged = { payload, sig: crypto.sign(null, Buffer.from(License.canonicalize(payload), 'utf8'), other.privateKey).toString('base64') };
    expect(Tamper.unseal(forged).ok).toBe(false);
    expect(Tamper.isSealed()).toBe(true);
  });

  it('unseal on an un-sealed box is a no-op error', () => {
    expect(Tamper.unseal({ payload: {}, sig: 'x' }).ok).toBe(false);
  });
});
