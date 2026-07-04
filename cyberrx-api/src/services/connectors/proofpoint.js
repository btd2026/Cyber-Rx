'use strict';

/**
 * Proofpoint TAP connector (read-only, TAP SIEM API).
 *
 * Fills bec_blocked — the count of business-email-compromise / impostor
 * messages BLOCKED over the trailing window. Proofpoint's TAP SIEM API returns
 * message events with a `classification` (impostor, malware, phish, spam); we
 * count blocked messages classified `impostor` (Proofpoint's label for
 * BEC / display-name spoofing / payment-redirect fraud) from
 * /v2/siem/messages/blocked.
 *
 * Auth is the documented service-principal + secret via HTTP Basic. The SIEM
 * API caps the window at 3600 seconds per call, so a 90-day total is not a
 * single call — we report the last 24h blocked-impostor count and annotate the
 * window; the dashboard shows it as "blocked / period". Built to the documented
 * TAP contract; validate against a real tenant before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.apiUrl || 'https://tap-api-v2.proofpoint.com').replace(/\/+$/, '');
const authH = (creds) => ({
  Authorization: `Basic ${Buffer.from(`${creds.servicePrincipal}:${creds.secret}`).toString('base64')}`,
  Accept: 'application/json',
});

async function test(creds) {
  if (!creds.servicePrincipal || !creds.secret) throw new Error('Proofpoint service principal and secret are required.');
  // The SIEM API rejects windows > 3600s; a 300s probe confirms the credentials.
  await jsonOrThrow(await http(`${base(creds)}/v2/siem/messages/blocked?format=json&sinceSeconds=300`, { headers: authH(creds) }), 'Proofpoint');
  return { ok: true, detail: 'Authenticated to the Proofpoint TAP SIEM API.' };
}

async function fetchSignals(creds) {
  const H = authH(creds);
  const signals = [];
  // Blocked messages over the max single-call window (3600s); count impostor (BEC).
  try {
    const j = await jsonOrThrow(await http(`${base(creds)}/v2/siem/messages/blocked?format=json&sinceSeconds=3600`, { headers: H }), 'Proofpoint');
    const msgs = (j && j.messagesBlocked) || [];
    const bec = msgs.filter((m) => {
      const parts = [].concat(m.threatsInfoMap || []).map((t) => String(t.classification || '').toLowerCase());
      return parts.includes('impostor') || String(m.messageClassification || '').toLowerCase() === 'impostor';
    }).length;
    signals.push({ key: 'bec_blocked', value: bec, asOf: nowIso(), raw: { windowSeconds: 3600, blockedTotal: msgs.length, impostorBlocked: bec } });
  } catch (e) { if (/HTTP 4|HTTP 5/.test(e.message)) throw e; }
  if (!signals.length) throw new Error('Authenticated, but no blocked-message data was readable — confirm the service principal has SIEM API access.');
  return { signals, meta: { vendor: 'Proofpoint' } };
}

module.exports = {
  key: 'proofpoint', label: 'Proofpoint TAP', vendor: 'Proofpoint', category: 'Email Security',
  signals: ['bec_blocked'],
  scopes: ['TAP SIEM API (service principal)'],
  fields: [
    { key: 'servicePrincipal', label: 'Service principal' },
    { key: 'secret', label: 'Secret', secret: true },
    { key: 'apiUrl', label: 'API URL (optional — defaults to tap-api-v2.proofpoint.com)', optional: true },
  ],
  test, fetchSignals,
};
