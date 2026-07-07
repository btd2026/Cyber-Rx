'use strict';
/**
 * Native enforcement addon (Layer 2) — parity + integration.
 * Skips gracefully when the addon isn't compiled (dev/CI without a build step);
 * when present, proves the native Ed25519 verify + SHA-256 match Node's crypto
 * exactly, so a license/fingerprint is backend-agnostic.
 */
const crypto = require('crypto');
const path = require('path');

let native = { available: false };
try { native = require('../../native/license_native'); } catch (_) { /* not built */ }

const d = native.available ? describe : describe.skip;

d('license_native addon', () => {
  it('is loaded', () => {
    expect(native.available).toBe(true);
    expect(typeof native.ed25519Verify).toBe('function');
    expect(typeof native.sha256Hex).toBe('function');
  });

  it('sha256Hex matches Node crypto for varied inputs', () => {
    for (const s of ['', 'a', 'nerion|mid:abc|mac:aa:bb', 'x'.repeat(1000)]) {
      const buf = Buffer.from(s, 'utf8');
      expect(native.sha256Hex(buf)).toBe(crypto.createHash('sha256').update(buf).digest('hex'));
    }
  });

  it('ed25519Verify accepts a valid signature and rejects a tampered one', () => {
    const kp = crypto.generateKeyPairSync('ed25519');
    const pub = kp.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const msg = Buffer.from('{"v":1,"plan":"paid"}', 'utf8');
    const sig = crypto.sign(null, msg, kp.privateKey);

    expect(native.ed25519Verify(pub, msg, sig)).toBe(true);
    // Flip a byte in the message → reject.
    const bad = Buffer.from('{"v":1,"plan":"trial"}', 'utf8');
    expect(native.ed25519Verify(pub, bad, sig)).toBe(false);
    // Wrong key → reject.
    const other = crypto.generateKeyPairSync('ed25519').publicKey
      .export({ type: 'spki', format: 'pem' }).toString();
    expect(native.ed25519Verify(other, msg, sig)).toBe(false);
  });

  it('ed25519Verify agrees with Node crypto.verify on the same inputs', () => {
    const kp = crypto.generateKeyPairSync('ed25519');
    const pub = kp.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const msg = crypto.randomBytes(128);
    const sig = crypto.sign(null, msg, kp.privateKey);
    const nodeOk = crypto.verify(null, msg, kp.publicKey, sig);
    expect(native.ed25519Verify(pub, msg, sig)).toBe(nodeOk);
  });

  it('does not throw on malformed PEM (returns false)', () => {
    expect(native.ed25519Verify('not a pem', Buffer.from('x'), Buffer.from('y'))).toBe(false);
  });
});
