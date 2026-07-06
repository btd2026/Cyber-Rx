#!/usr/bin/env node
'use strict';
/**
 * issue.js — VENDOR-ONLY. Mints a signed license for one customer/appliance.
 *
 * Usage:
 *   node tools/license/issue.js \
 *     --customer "Acme Bank" \
 *     --plan trial|paid \
 *     --machine <fingerprint>        (optional; omit for an unbound license) \
 *     --days 14                      (optional; overrides plan default) \
 *     --grace 7                      (optional; post-expiry grace days) \
 *     --out config/license.json
 *
 * The machine fingerprint is obtained by running, ON THE TARGET APPLIANCE:
 *   node -e "console.log(require('./src/services/LicenseService').machineFingerprint())"
 * (or GET /api/license/fingerprint). Paste it into --machine to hardware-bind
 * the license so it can't be copied to another VM.
 *
 * Output is the license.json to drop into the appliance's config/ directory.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { buildPayload, canonicalize } = require('../../src/services/LicenseService');

const CONFIG_DIR = path.join(__dirname, '..', '..', 'config');
const PRIV_PATH = process.env.LICENSE_PRIVKEY_PATH || path.join(CONFIG_DIR, 'license_priv.pem');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

function main() {
  if (!fs.existsSync(PRIV_PATH)) {
    console.error('Private signing key not found at', PRIV_PATH);
    console.error('Run tools/license/keygen.js first (vendor-side).');
    process.exit(1);
  }

  const plan = (arg('plan', 'trial') === 'paid') ? 'paid' : 'trial';
  const daysStr = arg('days', null);
  const graceStr = arg('grace', null);
  const machineId = arg('machine', null);
  const customer = arg('customer', 'Trial Customer');
  const customerId = arg('customer-id', null);
  const out = arg('out', path.join(CONFIG_DIR, 'license.json'));

  const payload = buildPayload({
    customer,
    customerId: customerId || undefined,
    plan,
    machineId: machineId || null,
    days: daysStr != null ? Number(daysStr) : undefined,
    graceDays: graceStr != null ? Number(graceStr) : undefined,
  });

  const privateKey = crypto.createPrivateKey(fs.readFileSync(PRIV_PATH, 'utf8'));
  const data = Buffer.from(canonicalize(payload), 'utf8');
  const sig = crypto.sign(null, data, privateKey).toString('base64');

  const license = { payload, sig };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(license, null, 2));

  console.log('License issued:');
  console.log('  customer :', payload.customer);
  console.log('  plan     :', payload.plan);
  console.log('  issued   :', payload.issued);
  console.log('  expires  :', payload.expires, `(${daysStr || (plan === 'paid' ? 365 : 14)} days)`);
  console.log('  machine  :', machineId ? machineId.slice(0, 16) + '… (bound)' : 'UNBOUND (any host)');
  console.log('  written  :', out);
}

main();
