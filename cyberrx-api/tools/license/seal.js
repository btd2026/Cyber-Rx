#!/usr/bin/env node
'use strict';
/**
 * seal.js — VENDOR-ONLY tamper-seal tooling.
 *
 *   node tools/license/seal.js manifest [--files a.js,b.js] [--out config/integrity.manifest]
 *       Compute SHA-256 of each protected file and write a vendor-SIGNED
 *       integrity manifest. On the appliance, any post-ship edit to a listed
 *       file → hash mismatch → HARD tamper → seal + crypto-shred. Run this at
 *       image-build time, after the code is final. Defaults to sealing the
 *       license/enforcement modules themselves.
 *
 *   node tools/license/seal.js provision-vault
 *       Create the vault key the appliance shreds on tamper (build step).
 *
 *   node tools/license/seal.js unseal-token --fingerprint <fp> --nonce <nonce> [--out unseal.json]
 *       Mint a signed, single-use unseal token to RECOVER a sealed appliance.
 *       Get <fp> and <nonce> from the customer's  GET /api/license/seal.
 *
 * Requires the private signing key (config/license_priv.pem, from keygen.js).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { canonicalize } = require('../../src/services/LicenseService');
const Tamper = require('../../src/services/TamperResponseService');

const PKG_ROOT = path.join(__dirname, '..', '..');
const CONFIG_DIR = path.join(PKG_ROOT, 'config');
const PRIV_PATH = process.env.LICENSE_PRIVKEY_PATH || path.join(CONFIG_DIR, 'license_priv.pem');

// Default protected set: the enforcement path itself. Extend with --files.
const DEFAULT_PROTECTED = [
  'src/services/LicenseService.js',
  'src/services/TamperResponseService.js',
  'src/middleware/licenseGate.js',
  'src/routes/license.js',
];

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

function privateKey() {
  if (!fs.existsSync(PRIV_PATH)) {
    console.error('Private signing key not found at', PRIV_PATH, '- run keygen.js first.');
    process.exit(1);
  }
  return crypto.createPrivateKey(fs.readFileSync(PRIV_PATH, 'utf8'));
}

function sign(payload) {
  const data = Buffer.from(canonicalize(payload), 'utf8');
  return crypto.sign(null, data, privateKey()).toString('base64');
}

function cmdManifest() {
  const list = (arg('files', null) ? arg('files').split(',') : DEFAULT_PROTECTED)
    .map((s) => s.trim()).filter(Boolean);
  const out = arg('out', path.join(CONFIG_DIR, 'integrity.manifest'));

  const files = {};
  for (const rel of list) {
    const abs = path.join(PKG_ROOT, rel);
    if (!fs.existsSync(abs)) { console.error('Skipping missing file:', rel); continue; }
    files[rel] = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
  }
  const payload = { v: 1, generated: new Date().toISOString(), files };
  const manifest = { payload, sig: sign(payload) };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(manifest, null, 2));
  console.log('Integrity manifest written:', out);
  console.log('  protected files:', Object.keys(files).length);
  Object.keys(files).forEach((f) => console.log('   -', f));
}

function cmdProvisionVault() {
  const made = Tamper.provisionVaultKey(process.argv.includes('--force'));
  console.log(made ? 'Vault key provisioned.' : 'Vault key already present (use --force to rotate).');
}

function cmdUnsealToken() {
  const fingerprint = arg('fingerprint', null);
  const nonce = arg('nonce', null);
  if (!fingerprint || !nonce) {
    console.error('Usage: seal.js unseal-token --fingerprint <fp> --nonce <nonce>');
    console.error('Get both from the customer via GET /api/license/seal on the sealed box.');
    process.exit(1);
  }
  const out = arg('out', path.join(CONFIG_DIR, 'unseal.json'));
  const payload = { action: 'unseal', fingerprint, nonce, issued: new Date().toISOString() };
  const token = { payload, sig: sign(payload) };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(token, null, 2));
  console.log('Unseal token written:', out);
  console.log('  bound to fingerprint:', fingerprint.slice(0, 16) + '…');
  console.log('  nonce               :', nonce);
  console.log('Send this file to the operator; POST it to /api/license/unseal on the box.');
}

function main() {
  const cmd = process.argv[2];
  switch (cmd) {
    case 'manifest': return cmdManifest();
    case 'provision-vault': return cmdProvisionVault();
    case 'unseal-token': return cmdUnsealToken();
    default:
      console.error('Usage: seal.js <manifest|provision-vault|unseal-token> [options]');
      process.exit(1);
  }
}

main();
