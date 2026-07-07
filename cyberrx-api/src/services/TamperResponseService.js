'use strict';
/**
 * TamperResponseService — the appliance "dead-man seal".
 *
 * PURPOSE
 *   Detect tampering with a shipped VM appliance and respond by CRYPTO-SHREDDING
 *   the vendor's protected material (the vault key that decrypts the obfuscated
 *   code/asset bundle — Layer 2) and SEALING the application so it refuses to run
 *   until the vendor re-arms it. This renders the vendor's IP inert on a tampered
 *   box and makes the tamper permanent-until-vendor-recovery.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *   It NEVER touches, wipes, or encrypts the CUSTOMER's data. "Self-destruct"
 *   here means the software bricks itself and shreds the VENDOR's secrets — not
 *   the customer's environment. A destructive trigger against customer data would
 *   turn a false positive (a legitimate snapshot restore, an NTP correction, a
 *   host migration) into the destruction of a paying customer's work and a legal
 *   liability. Crypto-shredding vendor material achieves the anti-piracy goal
 *   without that blast radius.
 *
 * SEVERITY MODEL (false-positive-safe)
 *   HARD tamper → seal + shred. Only cryptographically-certain signals that
 *     cannot arise from benign operations:
 *       - license signature broken (the license file was edited), or
 *       - a file in the vendor-signed integrity manifest has the wrong hash
 *         (a protected binary/module was patched).
 *   SOFT tamper → block, do NOT shred. Signals with legitimate causes:
 *       - wrong_machine (customer legitimately migrated the VM to a new host)
 *       - clock_suspect (NTP correction / timezone flip)
 *     These get a 402/loud warning and are fixed by re-issuing a license, not by
 *     destroying anything.
 *
 * RECOVERY
 *   A sealed box is recoverable by the vendor ONLY: the operator sends you the
 *   seal's fingerprint + nonce (via GET /api/license/seal), you mint a signed
 *   unseal token bound to exactly that fingerprint+nonce, and dropping it in
 *   clears the seal and re-provisions a fresh vault key. So an accidental HARD
 *   trip on a paying customer is a two-minute fix, not a dead appliance.
 *
 * ENFORCEMENT
 *   Entirely opt-in via TAMPER_SEAL_ENFORCE=true (set ONLY in the shipped image).
 *   With it unset — dev, CI, hosted demo — assessment still runs (read-only) but
 *   NOTHING is ever shredded or sealed.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const License = require('./LicenseService');

let PKG_ROOT = path.join(__dirname, '..', '..');
const CONFIG_DIR = path.join(PKG_ROOT, 'config');

// Mutable so tests can point every path at a temp dir (see __setPathsForTest).
const P = {
  ROOT: PKG_ROOT,
  PUB_KEY: process.env.LICENSE_PUBKEY_PATH || path.join(CONFIG_DIR, 'license_pub.pem'),
  MANIFEST: process.env.INTEGRITY_MANIFEST_PATH || path.join(CONFIG_DIR, 'integrity.manifest'),
  SEAL: process.env.TAMPER_SEAL_PATH || path.join(CONFIG_DIR, '.sealed'),
  VAULT_KEY: process.env.VAULT_KEY_PATH || path.join(CONFIG_DIR, '.vault_key'),
};

// Test seam: repoint any subset of paths (temp dir) without env juggling.
function __setPathsForTest(partial) { Object.assign(P, partial); }

const ENFORCE = process.env.TAMPER_SEAL_ENFORCE === 'true';

const SEVERITY = Object.freeze({ NONE: 'none', SOFT: 'soft', HARD: 'hard' });

// ---------------------------------------------------------------------------
// Small helpers (signing/verify reuse the license Ed25519 primitives).
// ---------------------------------------------------------------------------

function readPublicKey() {
  return crypto.createPublicKey(fs.readFileSync(P.PUB_KEY, 'utf8'));
}

function machineSecret() {
  // Binds the local seal record's HMAC to this host so a seal file lifted from
  // one box can't be evaluated/forged on another.
  return crypto.createHash('sha256')
    .update('nerion.tamper.seal.v1|' + License.machineFingerprint())
    .digest();
}

function sha256File(p) {
  const buf = fs.readFileSync(p);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// ---------------------------------------------------------------------------
// Integrity manifest — vendor-signed { files: {relpath: sha256}, ... } + sig.
// Verified against the embedded PUBLIC key, so a customer cannot forge a
// passing manifest without the vendor private key.
// ---------------------------------------------------------------------------

/**
 * @returns {{present:bool, ok:bool, mismatches:string[], reason?:string}}
 *   present=false when no manifest is provisioned (feature simply off).
 */
function verifyManifest() {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(P.MANIFEST, 'utf8'));
  } catch (_) {
    return { present: false, ok: true, mismatches: [] };
  }
  const payload = manifest && manifest.payload;
  const sig = manifest && manifest.sig;
  if (!payload || !sig || !payload.files) {
    return { present: true, ok: false, mismatches: ['<manifest malformed>'], reason: 'Integrity manifest malformed.' };
  }
  // The manifest itself must be vendor-signed.
  let pub;
  try { pub = readPublicKey(); } catch (_) {
    return { present: true, ok: true, mismatches: [], reason: 'No public key to verify manifest.' };
  }
  if (!License.verifySignature(payload, sig, pub)) {
    return { present: true, ok: false, mismatches: ['<manifest signature invalid>'], reason: 'Integrity manifest signature invalid.' };
  }
  // Every listed file must exist and hash to the recorded value.
  const mismatches = [];
  for (const rel of Object.keys(payload.files)) {
    const abs = path.join(P.ROOT, rel);
    try {
      if (sha256File(abs) !== payload.files[rel]) mismatches.push(rel);
    } catch (_) {
      mismatches.push(rel + ' (missing)');
    }
  }
  return { present: true, ok: mismatches.length === 0, mismatches };
}

// ---------------------------------------------------------------------------
// Seal record — local, HMAC-bound, holds the nonce the vendor needs to re-arm.
// ---------------------------------------------------------------------------

function readSeal() {
  try {
    const rec = JSON.parse(fs.readFileSync(P.SEAL, 'utf8'));
    const { tag, ...body } = rec || {};
    const expected = crypto.createHmac('sha256', machineSecret())
      .update(License.canonicalize(body)).digest('hex');
    const valid = typeof tag === 'string' && tag.length === expected.length
      && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(tag));
    // A present-but-unverifiable seal file is still treated as sealed (fail
    // closed): someone tampering with the seal marker doesn't get to un-seal.
    return { present: true, valid, record: body };
  } catch (_) {
    return { present: false, valid: false, record: null };
  }
}

function isSealed() {
  return readSeal().present;
}

function writeSeal(record) {
  const tag = crypto.createHmac('sha256', machineSecret())
    .update(License.canonicalize(record)).digest('hex');
  fs.mkdirSync(path.dirname(P.SEAL), { recursive: true });
  fs.writeFileSync(P.SEAL, JSON.stringify(Object.assign({}, record, { tag }), null, 2), { mode: 0o600 });
}

// ---------------------------------------------------------------------------
// Crypto-shred — overwrite then unlink the vault key. Without it, the Layer-2
// encrypted code/asset bundle is undecryptable → vendor IP is inert on this box.
// Customer data is on a separate volume and is never referenced here.
// ---------------------------------------------------------------------------

function shredVaultKey() {
  try {
    if (fs.existsSync(P.VAULT_KEY)) {
      const len = Math.max(64, fs.statSync(P.VAULT_KEY).size);
      // Overwrite with random, flush, then unlink. Best-effort on CoW/SSD, but
      // the logical key material is destroyed and the file removed.
      fs.writeFileSync(P.VAULT_KEY, crypto.randomBytes(len));
      const fd = fs.openSync(P.VAULT_KEY, 'r+');
      try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      fs.unlinkSync(P.VAULT_KEY);
      return true;
    }
  } catch (_) { /* best-effort */ }
  return false;
}

/** Provision a fresh 32-byte vault key (vendor/build step, and post-unseal). */
function provisionVaultKey(force) {
  if (fs.existsSync(P.VAULT_KEY) && !force) return false;
  fs.mkdirSync(path.dirname(P.VAULT_KEY), { recursive: true });
  fs.writeFileSync(P.VAULT_KEY, crypto.randomBytes(32), { mode: 0o600 });
  return true;
}

// ---------------------------------------------------------------------------
// Assessment + response.
// ---------------------------------------------------------------------------

/**
 * Read-only verdict. Never shreds or seals — safe to call anywhere (routes,
 * tests, dev). Combines license state + integrity manifest into a severity.
 * @returns {{severity, signals:string[], sealed:bool, reason:string|null}}
 */
function assess(opts = {}) {
  const signals = [];
  let severity = SEVERITY.NONE;

  const seal = readSeal();
  if (seal.present) {
    return {
      severity: SEVERITY.HARD, sealed: true,
      signals: ['sealed:' + (seal.record && seal.record.reason || 'tampered')],
      reason: 'Appliance is sealed after a tamper event. Vendor re-arm required.',
    };
  }

  // License-derived signals.
  const lic = opts.licenseStatus || License.checkStatus({ now: opts.now });
  if (lic.state === License.STATE.TAMPERED) {
    signals.push('license_signature_broken');
    severity = SEVERITY.HARD;
  } else if (lic.state === License.STATE.WRONG_MACHINE) {
    signals.push('license_wrong_machine');
    if (severity === SEVERITY.NONE) severity = SEVERITY.SOFT;
  } else if (lic.state === License.STATE.CLOCK_SUSPECT) {
    signals.push('clock_rollback_suspected');
    if (severity === SEVERITY.NONE) severity = SEVERITY.SOFT;
  }

  // Integrity-manifest signals (only when a manifest is provisioned).
  const man = verifyManifest();
  if (man.present && !man.ok) {
    signals.push('integrity_manifest_mismatch:' + man.mismatches.slice(0, 5).join(','));
    severity = SEVERITY.HARD; // patched protected file — cannot be benign
  }

  return {
    severity, sealed: false, signals,
    reason: severity === SEVERITY.NONE ? null
      : (severity === SEVERITY.HARD
        ? 'Cryptographic tamper detected (edited license or patched protected file).'
        : 'Suspicious change detected (VM moved or clock altered) — re-license required.'),
  };
}

/**
 * Startup enforcement. Called once at boot BEFORE serving traffic.
 *   - Not enforcing → assess + return verdict, never act.
 *   - Already sealed → return sealed verdict (gate will 423).
 *   - HARD tamper + enforcing → seal + crypto-shred, then return sealed.
 *   - SOFT tamper → return verdict (gate will 402), no shred.
 * @returns {{acted:bool, severity, sealed:bool, signals:string[], reason}}
 */
function enforceAtStartup(opts = {}) {
  const enforce = typeof opts.enforce === 'boolean' ? opts.enforce : ENFORCE;
  const v = assess(opts);

  if (v.sealed) return Object.assign({ acted: false }, v);

  if (enforce && v.severity === SEVERITY.HARD) {
    const nonce = crypto.randomBytes(16).toString('hex');
    const record = {
      sealed: true,
      reason: v.signals[0] || 'tamper',
      signals: v.signals,
      at: new Date().toISOString(),
      nonce,
      fingerprint: License.machineFingerprint(),
    };
    const shredded = shredVaultKey();
    writeSeal(record);
    return { acted: true, sealed: true, severity: SEVERITY.HARD, signals: v.signals, shredded, reason: v.reason, nonce };
  }

  return Object.assign({ acted: false }, v);
}

/** Public seal info for the recovery route (fingerprint + nonce the vendor signs). */
function sealInfo() {
  const seal = readSeal();
  if (!seal.present) return { sealed: false };
  return {
    sealed: true,
    fingerprint: (seal.record && seal.record.fingerprint) || License.machineFingerprint(),
    nonce: seal.record && seal.record.nonce,
    reason: seal.record && seal.record.reason,
    at: seal.record && seal.record.at,
  };
}

/**
 * Clear a seal with a vendor-signed unseal token. The token payload must be
 * signed by the vendor private key and bound to THIS machine's fingerprint AND
 * the current seal's nonce (single-use for this exact seal event).
 * @returns {{ok:bool, reason:string}}
 */
function unseal(token) {
  const seal = readSeal();
  if (!seal.present) return { ok: false, reason: 'Appliance is not sealed.' };
  const payload = token && token.payload;
  const sig = token && token.sig;
  if (!payload || !sig || payload.action !== 'unseal') {
    return { ok: false, reason: 'Malformed unseal token.' };
  }
  let pub;
  try { pub = readPublicKey(); } catch (_) {
    return { ok: false, reason: 'Public key unavailable to verify token.' };
  }
  if (!License.verifySignature(payload, sig, pub)) {
    return { ok: false, reason: 'Unseal token signature invalid.' };
  }
  const fp = License.machineFingerprint();
  if (payload.fingerprint !== fp) {
    return { ok: false, reason: 'Unseal token is bound to a different machine.' };
  }
  if (!seal.record || payload.nonce !== seal.record.nonce) {
    return { ok: false, reason: 'Unseal token nonce does not match this seal.' };
  }
  // Valid → clear seal + re-provision a fresh vault key.
  try { fs.unlinkSync(P.SEAL); } catch (_) {}
  provisionVaultKey(true);
  return { ok: true, reason: 'Appliance un-sealed and re-armed.' };
}

module.exports = {
  assess,
  enforceAtStartup,
  verifyManifest,
  isSealed,
  readSeal,
  sealInfo,
  unseal,
  provisionVaultKey,
  shredVaultKey,        // exported for the manifest/build tooling + tests
  writeSeal,            // exported for tests
  SEVERITY,
  ENFORCE,
  __setPathsForTest,
  _paths: P,
};
