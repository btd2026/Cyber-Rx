'use strict';

/**
 * CyberArk connector (read-only, PVWA REST API). Authenticates with a service
 * account, then reads the vault account inventory to fill pam_pct — the share
 * of vaulted privileged accounts under automatic credential management
 * (rotation). That is the self-contained PAM control signal behind NIST CSF
 * PR.AA-05 (manage privileged credentials). Built to the documented CyberArk
 * PVWA contract; validate against a real vault with a read-only auditor account
 * before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => `${String(creds.pvwaUrl || '').replace(/\/+$/, '')}/PasswordVault`;

async function logon(creds) {
  const r = await http(`${base(creds)}/API/auth/Cyberark/Logon`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: creds.username, password: creds.password, concurrentSession: true }) });
  // The Logon endpoint returns the session token as a JSON string body.
  const tk = await jsonOrThrow(r, 'CyberArk');
  if (!tk) throw new Error('CyberArk: no session token returned.');
  return String(tk);
}

async function test(creds) {
  if (!creds.pvwaUrl || !creds.username || !creds.password) throw new Error('CyberArk PVWA URL, username and password are required.');
  const tk = await logon(creds);
  await jsonOrThrow(await http(`${base(creds)}/API/Accounts?limit=1`, { headers: { Authorization: tk, Accept: 'application/json' } }), 'CyberArk');
  return { ok: true, detail: 'Authenticated to the CyberArk PVWA API.' };
}

async function fetchSignals(creds) {
  const tk = await logon(creds);
  const H = { Authorization: tk, Accept: 'application/json' };
  const signals = [];
  // Privileged-account rotation coverage across the vault.
  try {
    const j = await jsonOrThrow(await http(`${base(creds)}/API/Accounts?limit=1000`, { headers: H }), 'CyberArk');
    const accounts = j.value || [];
    if (accounts.length) {
      const managed = accounts.filter((a) => a.secretManagement && a.secretManagement.automaticManagementEnabled).length;
      signals.push({ key: 'pam_pct', value: Math.round((managed / accounts.length) * 100), asOf: nowIso(), raw: { vaulted: accounts.length, autoManaged: managed } });
    }
  } catch (_) { /* confirm the account can list vault accounts */ }
  // Flagged privileged sessions — PSM sessions in the last 24h scored risky /
  // marked for review. Anomalous privileged sessions are the detection signal
  // for credential misuse; sourced from the PSM live-sessions activity API.
  try {
    const from = Math.floor((Date.now() - 864e5) / 1000);
    const j = await jsonOrThrow(await http(`${base(creds)}/API/LiveSessions?FromTime=${from}`, { headers: H }), 'CyberArk');
    const sessions = (j && (j.LiveSessions || j.Sessions || j.value)) || [];
    // Only emit when sessions were actually observed — an empty list is ambiguous
    // (no activity vs. no permission) and must not mask an unreadable vault.
    if (Array.isArray(sessions) && sessions.length) {
      const flagged = sessions.filter((s) => {
        const score = Number(s.riskScore != null ? s.riskScore : s.RiskScore);
        if (Number.isFinite(score) && score >= 50) return true;
        return /suspend|review|flag/i.test(String((s.rawProperties && s.rawProperties.status) || s.status || ''));
      }).length;
      signals.push({ key: 'priv_sessions_flagged', value: flagged, asOf: nowIso(), raw: { sessions: sessions.length, flagged } });
    }
  } catch (_) { /* PSM live-sessions not readable — pam_pct still returned */ }
  if (!signals.length) throw new Error('Authenticated, but no readable signals — confirm the account can list vault accounts.');
  return { signals, meta: { vendor: 'CyberArk' } };
}

module.exports = {
  key: 'cyberark', label: 'CyberArk', vendor: 'CyberArk', category: 'Privileged Access (PAM)',
  signals: ['pam_pct', 'priv_sessions_flagged'],
  scopes: ['Vault auditor (read-only) — list accounts', 'PSM — list live sessions'],
  fields: [
    { key: 'pvwaUrl', label: 'PVWA URL (https://pvwa.example.com)' },
    { key: 'username', label: 'Service account username' },
    { key: 'password', label: 'Service account password', secret: true },
  ],
  test, fetchSignals,
};
