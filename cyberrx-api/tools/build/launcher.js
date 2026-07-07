'use strict';
/**
 * launcher.js — the single-executable (SEA) entry for the Nerion appliance.
 *
 * WHY A LAUNCHER (not a whole-app bundle): Node's SEA embeds ONE script whose
 * built-in require() only resolves core modules. The Nerion API is 100+ routes
 * with native deps (pg, bcrypt) and dynamic directory-scanning requires, which a
 * single esbuild bundle cannot faithfully reproduce. So the single binary is a
 * thin launcher that:
 *   1. runs the license + tamper gate FIRST (fail-closed, native-backed), and
 *   2. hands off to the on-disk application via createRequire.
 *
 * The application ships as V8 bytecode (.jsc, see build-appliance.sh) alongside
 * the binary — compiled, not readable source — and the enforcement path is also
 * compiled into the native addon. An attacker gets a stripped binary + bytecode
 * + a native .node, all covered by the signed integrity manifest.
 */

const { createRequire } = require('module');
const path = require('path');
const fs = require('fs');

// Resolve paths relative to the binary's own location on disk.
const APP_ROOT = process.env.NERION_APP_ROOT || path.dirname(process.execPath);
const appRequire = createRequire(path.join(APP_ROOT, 'package.json'));

function fail(msg, code) {
  process.stderr.write('\n[Nerion] ' + msg + '\n');
  process.exit(code || 1);
}

// 1. Enforcement gate BEFORE any app code loads. Uses the on-disk (native-backed)
//    LicenseService + TamperResponseService so a sealed/expired box never boots
//    the platform at all.
try {
  const License = appRequire('./src/services/LicenseService');
  const Tamper = appRequire('./src/services/TamperResponseService');

  // Tamper dead-man: seal + crypto-shred on HARD tamper (honours TAMPER_SEAL_ENFORCE).
  const v = Tamper.enforceAtStartup();
  if (v.sealed) fail('Appliance is sealed after a tamper event. Vendor re-arm required.', 3);

  // License clock: block boot when expired/invalid (honours LICENSE_ENFORCE).
  if (process.env.LICENSE_ENFORCE === 'true') {
    const s = License.checkStatus();
    if (!s.ok) fail('License ' + s.state + ': ' + (s.reason || 'invalid') + '.', 2);
    if (typeof s.daysLeft === 'number' && s.daysLeft <= 14) {
      process.stdout.write('[Nerion] License ' + s.plan + ': ' + s.daysLeft + ' day(s) remaining.\n');
    }
  }
} catch (e) {
  // In hard-mode a missing enforcement module is itself a refusal.
  if (process.env.LICENSE_REQUIRE_NATIVE === 'true' || process.env.LICENSE_ENFORCE === 'true') {
    fail('Enforcement subsystem failed to load: ' + e.message, 4);
  }
  process.stderr.write('[Nerion] enforcement check skipped (dev): ' + e.message + '\n');
}

// 2. Hand off to the application. Prefer the compiled bytecode entry when present
//    (production), else the source entry (dev).
const bytecodeEntry = path.join(APP_ROOT, 'app.jsc');
try {
  if (fs.existsSync(bytecodeEntry)) {
    // bytenode registers the .jsc loader, then require the compiled entry.
    appRequire('bytenode');
    appRequire(bytecodeEntry);
  } else {
    appRequire('./src/index.js');
  }
} catch (e) {
  fail('Application failed to start: ' + (e && e.stack ? e.stack : e), 1);
}
