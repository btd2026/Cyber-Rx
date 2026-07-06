'use strict';

/**
 * routes/license — offline license status surface for the appliance.
 *   GET /api/license/status       signed-license state (active/grace/expired/…),
 *                                 plan, days-left, customer. Drives the in-app
 *                                 expiry banner and the hard-stop gate.
 *   GET /api/license/fingerprint  this host's machine fingerprint — the value the
 *                                 vendor pastes into `issue.js --machine` to
 *                                 hardware-bind a license to this VM.
 *
 * Intentionally UNAUTHENTICATED and read-only: the front end must be able to
 * learn "your license expired" even when the rest of the platform is gated off,
 * and the fingerprint is a one-way hash that reveals nothing sensitive.
 */

const express = require('express');
const router = express.Router();
const License = require('../services/LicenseService');

// Fields safe to expose to the browser (no signature, no raw machine id echo
// beyond what the client already knows about its own box).
function publicView(s) {
  return {
    state: s.state,
    ok: s.ok,
    plan: s.plan || null,
    customer: s.customer || null,
    expires: s.expires || null,
    daysLeft: typeof s.daysLeft === 'number' ? s.daysLeft : null,
    graceDaysLeft: typeof s.graceDaysLeft === 'number' ? s.graceDaysLeft : undefined,
    reason: s.reason || null,
    features: s.features || {},
  };
}

router.get('/status', (req, res) => {
  try {
    res.json(publicView(License.checkStatus()));
  } catch (e) {
    // Fail closed on the reported state, but never 500 the banner endpoint.
    res.json({ state: 'missing', ok: false, reason: 'License status unavailable.' });
  }
});

router.get('/fingerprint', (req, res) => {
  try {
    res.json({ fingerprint: License.machineFingerprint() });
  } catch (e) {
    res.status(500).json({ error: 'Unable to compute machine fingerprint.' });
  }
});

module.exports = router;
