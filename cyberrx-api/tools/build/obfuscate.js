#!/usr/bin/env node
'use strict';
/**
 * obfuscate.js — VENDOR build step (Layer 2).
 *
 * Applies heavy obfuscation (string-array + control-flow flattening + dead-code
 * injection) to the ENFORCEMENT PATH specifically — the modules an attacker would
 * target to defeat licensing/tamper checks. Obfuscating just these (not the whole
 * app) keeps the runtime fast while making the security-critical logic hard to
 * read or patch. Combined with the integrity manifest, any edit to the obfuscated
 * output is itself a HARD tamper.
 *
 *   node tools/build/obfuscate.js              # obfuscate in place under dist-obf/
 *   node tools/build/obfuscate.js --verify     # obfuscate + prove it still verifies
 *
 * The obfuscated files are written to dist-obf/ mirroring src/ layout so the build
 * can swap them in before bundling.
 */
const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const PKG_ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(PKG_ROOT, 'dist-obf');

// The security-critical modules. Extend as the enforcement surface grows.
const TARGETS = [
  'src/services/LicenseService.js',
  'src/services/TamperResponseService.js',
  'src/middleware/licenseGate.js',
  'src/routes/license.js',
];

// Aggressive but runtime-safe options. (control-flow flattening + string array
// are the high-value transforms; we keep threshold < 1 so hot paths stay usable.)
const OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  identifierNamesGenerator: 'hexadecimal',
  numbersToExpressions: true,
  simplify: true,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.9,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
  // Never rename/transform Node globals or the require graph.
  reservedNames: ['^require$', '^module$', '^exports$', '^process$', '^__dirname$', '^Buffer$'],
};

function obfuscateFile(rel) {
  const src = fs.readFileSync(path.join(PKG_ROOT, rel), 'utf8');
  const out = JavaScriptObfuscator.obfuscate(src, OPTIONS).getObfuscatedCode();
  const dest = path.join(OUT_DIR, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, out);
  return { rel, from: src.length, to: out.length };
}

function main() {
  const results = TARGETS.map(obfuscateFile);
  console.log('Obfuscated enforcement modules → dist-obf/');
  for (const r of results) {
    console.log(`   ${r.rel}: ${r.from} → ${r.to} bytes`);
  }

  if (process.argv.includes('--verify')) {
    // Load the obfuscated LicenseService and prove a signature still verifies —
    // catches any transform that would break the runtime behaviour.
    const crypto = require('crypto');
    const obf = require(path.join(OUT_DIR, 'src/services/LicenseService.js'));
    const kp = crypto.generateKeyPairSync('ed25519');
    const pub = kp.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const payload = { v: 1, plan: 'paid', ok: true };
    const data = Buffer.from(obf.canonicalize(payload), 'utf8');
    const sig = crypto.sign(null, data, kp.privateKey).toString('base64');
    const ok = obf.verifySignature(payload, sig, kp.publicKey);
    const bad = obf.verifySignature({ v: 1, plan: 'trial' }, sig, kp.publicKey);
    if (ok !== true || bad !== false) {
      console.error('OBFUSCATION VERIFY FAILED: verify=' + ok + ' tamperReject=' + (!bad));
      process.exit(1);
    }
    console.log('Verify OK: obfuscated LicenseService still validates signatures and rejects tampers.');
  }
}

main();
