'use strict';
/**
 * Loader for the native enforcement addon (license_native.node).
 *
 * Exposes a stable shape whether or not the addon is compiled:
 *   { available:boolean, ed25519Verify(pubPem,msgBuf,sigBuf):bool, sha256Hex(buf):string }
 *
 * On the shipped appliance the addon is built at image time; in dev/CI/hosted it
 * may be absent, in which case callers fall back to Node's `crypto` (see
 * LicenseService). Set LICENSE_REQUIRE_NATIVE=true on the appliance to make its
 * absence a hard failure instead — so an attacker can't neuter enforcement by
 * simply deleting the .node file.
 */
const path = require('path');

const CANDIDATES = [
  path.join(__dirname, 'build', 'Release', 'license_native.node'),
  path.join(__dirname, 'build', 'Debug', 'license_native.node'),
];

let addon = null;
for (const p of CANDIDATES) {
  try { addon = require(p); break; } catch (_) { /* try next */ }
}

module.exports = addon
  ? { available: true, ed25519Verify: addon.ed25519Verify, sha256Hex: addon.sha256Hex }
  : { available: false, ed25519Verify: null, sha256Hex: null };
