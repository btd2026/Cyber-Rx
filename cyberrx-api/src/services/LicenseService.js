'use strict';
/**
 * LicenseService — fully-offline, cryptographically-signed license enforcement.
 *
 * Design goals (client-owned VM appliance; "data never leaves the environment"):
 *   1. NO phone-home. Verification is 100% offline — the vendor's Ed25519 PUBLIC
 *      key is embedded in the image; the license file is signed by the vendor's
 *      PRIVATE key (which never ships). The client cannot forge or extend a
 *      license without the private key.
 *   2. Expiry clock. Trial = 14 days, paid subscription = 365 days, both stamped
 *      into the signed payload at issue time. A short post-expiry grace window
 *      keeps the platform read-only-degraded rather than hard-bricking on the
 *      exact second.
 *   3. Anti-clock-rollback. Because the box is offline and client-controlled, the
 *      wall clock is untrusted. We persist a monotonic high-water timestamp; if
 *      the system clock ever reads meaningfully BEFORE the high-water mark, we
 *      flag `clock_suspect` (someone wound the clock back to dodge expiry).
 *   4. Machine binding. The payload pins a machine fingerprint; running the same
 *      license on a different VM/host is rejected (`wrong_machine`). Prevents a
 *      client from cloning the appliance to unlimited seats.
 *   5. Tamper-evidence. Any edit to the license file breaks the signature
 *      (`tampered`). The state file is itself HMAC-tagged so it can't be trivially
 *      rewound with a text editor.
 *
 * Honest limits (documented, not hidden): a determined attacker with full root on
 * a VM they own can patch the running binary to skip this check. The point of this
 * layer is to make casual/accidental license abuse impossible and deliberate abuse
 * tamper-evident and legally actionable — combined with Layer 2 (code protection)
 * and Layer 4 (EULA), not a standalone silver bullet.
 */

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 14;
const PAID_DAYS = 365;
// Post-expiry grace: platform keeps running (banner-warned) for this long after
// `expires`, so a legitimately-renewing customer isn't bricked mid-renewal.
const DEFAULT_GRACE_DAYS = 7;
// Tolerance for benign clock drift before we call a backwards clock "suspect".
const CLOCK_SKEW_MS = 36 * 60 * 60 * 1000; // 36h

// Resolve paths relative to the API package root so this works the same whether
// launched from a source checkout or a packaged appliance.
const PKG_ROOT = path.join(__dirname, '..', '..');
const DEFAULT_PUB_KEY_PATH = process.env.LICENSE_PUBKEY_PATH
  || path.join(PKG_ROOT, 'config', 'license_pub.pem');
const DEFAULT_LICENSE_PATH = process.env.LICENSE_FILE_PATH
  || path.join(PKG_ROOT, 'config', 'license.json');
// State file lives outside version control; holds the anti-rollback high-water
// mark. On a real appliance this should sit on the encrypted data volume.
const DEFAULT_STATE_PATH = process.env.LICENSE_STATE_PATH
  || path.join(PKG_ROOT, 'config', '.license_state.json');

// Status enum returned by checkStatus().state
const STATE = Object.freeze({
  ACTIVE: 'active',
  GRACE: 'grace',
  EXPIRED: 'expired',
  TAMPERED: 'tampered',
  WRONG_MACHINE: 'wrong_machine',
  CLOCK_SUSPECT: 'clock_suspect',
  MISSING: 'missing',
  NOT_YET_VALID: 'not_yet_valid',
});

/**
 * Canonical JSON: deterministic key ordering so the bytes signed by the issuer
 * are byte-identical to the bytes verified here. `JSON.stringify` preserves
 * insertion order, which is not guaranteed to match across issuer/verifier, so
 * we sort keys recursively.
 */
function canonicalize(value) {
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

/**
 * Stable machine fingerprint for this host. Combines the OS machine-id (stable
 * across reboots, unique per install) with the sorted set of non-internal MAC
 * addresses. Hashed so the raw identifiers never appear in the license file.
 */
function machineFingerprint() {
  const parts = [];

  // /etc/machine-id (Linux) or the equivalent — stable per-install identifier.
  try {
    const mid = fs.readFileSync('/etc/machine-id', 'utf8').trim();
    if (mid) parts.push('mid:' + mid);
  } catch (_) { /* not linux / not present */ }
  try {
    const mid2 = fs.readFileSync('/var/lib/dbus/machine-id', 'utf8').trim();
    if (mid2) parts.push('dbus:' + mid2);
  } catch (_) { /* optional */ }

  // Hostname as a weak secondary signal.
  parts.push('host:' + os.hostname());

  // Non-internal, non-zero MAC addresses, sorted for determinism.
  const macs = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const ni of ifaces[name] || []) {
      if (ni.internal) continue;
      if (!ni.mac || ni.mac === '00:00:00:00:00:00') continue;
      macs.push(ni.mac.toLowerCase());
    }
  }
  macs.sort();
  for (const m of Array.from(new Set(macs))) parts.push('mac:' + m);

  const digest = crypto.createHash('sha256').update(parts.join('|')).digest('hex');
  return digest;
}

function readPublicKey(pubKeyPath) {
  const pem = fs.readFileSync(pubKeyPath, 'utf8');
  return crypto.createPublicKey(pem);
}

/**
 * Verify an Ed25519 signature over the canonical payload bytes.
 * Ed25519 in Node uses `crypto.verify(null, data, key, sig)` (algorithm is null
 * because it's implied by the key type).
 */
function verifySignature(payload, sigB64, publicKey) {
  const data = Buffer.from(canonicalize(payload), 'utf8');
  const sig = Buffer.from(sigB64, 'base64');
  try {
    return crypto.verify(null, data, publicKey, sig);
  } catch (_) {
    return false;
  }
}

// --- Anti-rollback state (HMAC-tagged high-water timestamp) -----------------

function stateSecret() {
  // Derived, not stored in plaintext config. Binds the state tag to this machine
  // so a state file lifted from another box won't validate here.
  return crypto.createHash('sha256')
    .update('nerion.license.state.v1|' + machineFingerprint())
    .digest();
}

function readState(statePath) {
  try {
    const raw = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    const { highWater, tag } = raw || {};
    if (typeof highWater !== 'number' || typeof tag !== 'string') return { highWater: 0 };
    const expected = crypto.createHmac('sha256', stateSecret())
      .update(String(highWater)).digest('hex');
    // Constant-time compare; a rewritten/forged tag reverts to a zero high-water
    // (fail-safe: we never trust an unverifiable state file).
    const ok = expected.length === tag.length
      && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(tag));
    return ok ? { highWater } : { highWater: 0, corrupt: true };
  } catch (_) {
    return { highWater: 0 };
  }
}

function writeState(statePath, highWater) {
  const tag = crypto.createHmac('sha256', stateSecret())
    .update(String(highWater)).digest('hex');
  const body = JSON.stringify({ highWater, tag, updated: new Date(highWater).toISOString() });
  try {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, body, { mode: 0o600 });
  } catch (_) { /* best-effort; read-only fs still leaves signature+expiry intact */ }
}

// --- Public API -------------------------------------------------------------

/**
 * Load and cryptographically validate the license, returning a status object.
 * Never throws — a missing/broken license yields a `state` the caller gates on.
 *
 * @param {object} [opts]
 * @param {number} [opts.now] override wall-clock (ms) — test seam only.
 * @returns {{state:string, ok:boolean, plan?:string, expires?:string,
 *            daysLeft?:number, customer?:string, reason?:string, features?:object}}
 */
function checkStatus(opts = {}) {
  const now = typeof opts.now === 'number' ? opts.now : Date.now();
  const pubKeyPath = opts.pubKeyPath || DEFAULT_PUB_KEY_PATH;
  const licensePath = opts.licensePath || DEFAULT_LICENSE_PATH;
  const statePath = opts.statePath || DEFAULT_STATE_PATH;

  // 1. License file present?
  let license;
  try {
    license = JSON.parse(fs.readFileSync(licensePath, 'utf8'));
  } catch (_) {
    return { state: STATE.MISSING, ok: false, reason: 'No license file found.' };
  }
  const payload = license && license.payload;
  const sig = license && license.sig;
  if (!payload || !sig) {
    return { state: STATE.TAMPERED, ok: false, reason: 'License is malformed.' };
  }

  // 2. Signature valid? (public key must be present in the image)
  let publicKey;
  try {
    publicKey = readPublicKey(pubKeyPath);
  } catch (_) {
    return { state: STATE.MISSING, ok: false, reason: 'License public key missing from image.' };
  }
  if (!verifySignature(payload, sig, publicKey)) {
    return { state: STATE.TAMPERED, ok: false, reason: 'License signature invalid — file was modified.' };
  }

  // 3. Machine binding (skip only if payload explicitly unbound, e.g. dev license)
  if (payload.machineId && !opts.skipMachineCheck) {
    const fp = opts.machineId || machineFingerprint();
    if (fp !== payload.machineId) {
      return {
        state: STATE.WRONG_MACHINE, ok: false,
        reason: 'License is bound to a different machine.',
        plan: payload.plan, customer: payload.customer,
      };
    }
  }

  const issued = Date.parse(payload.issued);
  const expires = Date.parse(payload.expires);
  const graceMs = (Number.isFinite(payload.graceDays) ? payload.graceDays : DEFAULT_GRACE_DAYS) * DAY_MS;

  // 4. Anti-clock-rollback: compare wall clock to persisted high-water mark.
  const st = readState(statePath);
  const highWater = st.highWater || 0;
  if (now < highWater - CLOCK_SKEW_MS) {
    return {
      state: STATE.CLOCK_SUSPECT, ok: false,
      reason: 'System clock is earlier than the last known time — clock tampering suspected.',
      plan: payload.plan, customer: payload.customer, expires: payload.expires,
    };
  }
  // Advance the high-water mark (monotonic; only ever moves forward).
  if (now > highWater) writeState(statePath, now);

  // 5. Not-yet-valid (clock set before issue date, within skew tolerance).
  if (Number.isFinite(issued) && now < issued - CLOCK_SKEW_MS) {
    return {
      state: STATE.NOT_YET_VALID, ok: false,
      reason: 'License is not valid yet (system clock predates issue date).',
      plan: payload.plan, customer: payload.customer, expires: payload.expires,
    };
  }

  // 6. Expiry / grace / active.
  const daysLeft = Math.ceil((expires - now) / DAY_MS);
  const base = {
    plan: payload.plan, customer: payload.customer, customerId: payload.customerId,
    expires: payload.expires, issued: payload.issued,
    features: payload.features || {}, daysLeft,
  };
  if (now <= expires) {
    return Object.assign({ state: STATE.ACTIVE, ok: true }, base);
  }
  if (now <= expires + graceMs) {
    const graceDaysLeft = Math.ceil((expires + graceMs - now) / DAY_MS);
    return Object.assign({
      state: STATE.GRACE, ok: true,
      reason: `License expired ${-daysLeft} day(s) ago; grace period ends in ${graceDaysLeft} day(s). Renew to avoid interruption.`,
      graceDaysLeft,
    }, base);
  }
  return Object.assign({
    state: STATE.EXPIRED, ok: false,
    reason: `License expired ${-daysLeft} day(s) ago. Contact your vendor to renew.`,
  }, base);
}

/** Build an unsigned license payload for the issuer CLI (single source of truth). */
function buildPayload({ customer, customerId, plan, machineId, features, graceDays, now, days }) {
  const issuedMs = typeof now === 'number' ? now : Date.now();
  const span = (typeof days === 'number' ? days : (plan === 'paid' ? PAID_DAYS : TRIAL_DAYS)) * DAY_MS;
  return {
    v: 1,
    customer: customer || 'Unnamed Customer',
    customerId: customerId || crypto.randomUUID(),
    plan: plan === 'paid' ? 'paid' : 'trial',
    issued: new Date(issuedMs).toISOString(),
    expires: new Date(issuedMs + span).toISOString(),
    machineId: machineId || null,
    graceDays: Number.isFinite(graceDays) ? graceDays : DEFAULT_GRACE_DAYS,
    features: features || {},
  };
}

module.exports = {
  checkStatus,
  machineFingerprint,
  canonicalize,
  verifySignature,
  buildPayload,
  STATE,
  TRIAL_DAYS,
  PAID_DAYS,
  DEFAULT_GRACE_DAYS,
  CLOCK_SKEW_MS,
  _paths: { DEFAULT_PUB_KEY_PATH, DEFAULT_LICENSE_PATH, DEFAULT_STATE_PATH },
};
