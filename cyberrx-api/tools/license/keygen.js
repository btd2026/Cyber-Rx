#!/usr/bin/env node
'use strict';
/**
 * keygen.js — VENDOR-ONLY. Generates the Ed25519 signing keypair.
 *
 *   node tools/license/keygen.js
 *
 *   - config/license_priv.pem  → THE SIGNING SECRET. Keep it OFF every shipped
 *     appliance and out of git (it is .gitignore'd). Store it in your vendor
 *     secrets vault. Anyone with this file can mint unlimited licenses.
 *   - config/license_pub.pem   → embed this in every VM image. Safe to ship.
 *
 * Run this ONCE and reuse the keypair for all customers, or rotate per-major-
 * release (rotating invalidates every previously-issued license).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '..', '..', 'config');
const PRIV_PATH = path.join(CONFIG_DIR, 'license_priv.pem');
const PUB_PATH = path.join(CONFIG_DIR, 'license_pub.pem');

function main() {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });

  if (fs.existsSync(PRIV_PATH) && !process.argv.includes('--force')) {
    console.error('Refusing to overwrite existing private key at', PRIV_PATH);
    console.error('Pass --force to rotate (this INVALIDATES all issued licenses).');
    process.exit(1);
  }

  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' });

  fs.writeFileSync(PRIV_PATH, privPem, { mode: 0o600 });
  fs.writeFileSync(PUB_PATH, pubPem, { mode: 0o644 });

  console.log('Ed25519 keypair generated:');
  console.log('  private (KEEP SECRET, gitignored):', PRIV_PATH);
  console.log('  public  (ship in image):          ', PUB_PATH);
  console.log('\nNext: issue a license with tools/license/issue.js');
}

main();
