'use strict';

/**
 * Palo Alto Networks segmentation connector (read-only, PAN-OS/Panorama XML API).
 *
 * Fills seg_pct — share of security zones that are actually governed by a
 * security policy (referenced in a rule's from/to) vs. total defined zones: a
 * best-effort proxy for how much of the network is under enforced
 * segmentation. Zones with no rule are effectively unsegmented.
 *
 * Auth: PAN-OS XML API key passed as `key=`. The key is normally minted via
 * GET {fw}/api/?type=keygen&user=&password=; here the operator supplies that
 * key directly. Responses are XML, parsed defensively. Best-effort mapping —
 * validate against a real firewall/Panorama with a read-only admin before
 * relying on it.
 */

const { http, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || '').replace(/\/+$/, '');

async function getXml(url) {
  const r = await http(url);
  const text = await r.text();
  if (!r.ok || /status="error"/.test(text) || /status=\"error\"/.test(text)) {
    throw new Error(`Palo Alto returned HTTP ${r.status} (${text.slice(0, 160)})`);
  }
  return text;
}

const config = (creds, xpath) =>
  `${base(creds)}/api/?type=config&action=get&key=${encodeURIComponent(creds.apiKey)}&xpath=${encodeURIComponent(xpath)}`;

async function test(creds) {
  if (!creds.baseUrl || !creds.apiKey) throw new Error('Palo Alto base URL and API key are required.');
  const cmd = '<show><system><info></info></system></show>';
  await getXml(`${base(creds)}/api/?type=op&cmd=${encodeURIComponent(cmd)}&key=${encodeURIComponent(creds.apiKey)}`);
  return { ok: true, detail: 'Authenticated to the PAN-OS XML API.' };
}

async function fetchSignals(creds) {
  const signals = [];
  const zonesXml = await getXml(config(creds, '/config/devices/entry/vsys/entry/zone'));
  const zones = [...zonesXml.matchAll(/<entry name="([^"]+)"/g)].map((m) => m[1]);
  const total = new Set(zones).size;
  if (total > 0) {
    const referenced = new Set();
    try {
      const rulesXml = await getXml(config(creds, '/config/devices/entry/vsys/entry/rulebase/security/rules'));
      for (const blk of rulesXml.matchAll(/<(from|to)>([\s\S]*?)<\/\1>/g)) {
        for (const mem of blk[2].matchAll(/<member>([^<]+)<\/member>/g)) {
          const z = mem[1].trim();
          if (z && z.toLowerCase() !== 'any') referenced.add(z);
        }
      }
    } catch (_) { /* no readable rulebase — referenced stays empty */ }
    const covered = zones.filter((z) => referenced.has(z)).length;
    signals.push({ key: 'seg_pct', value: Math.round((covered / total) * 100), asOf: nowIso(), raw: { covered, totalZones: total } });
  }
  if (!signals.length) throw new Error('Authenticated, but no security zones were readable — confirm the API key can read the config.');
  return { signals, meta: { vendor: 'Palo Alto Networks' } };
}

module.exports = {
  key: 'paloalto_seg', label: 'Palo Alto Networks (segmentation)', vendor: 'Palo Alto Networks', category: 'Network segmentation / Zero-Trust',
  signals: ['seg_pct'],
  scopes: ['xml-api:config-read'],
  fields: [
    { key: 'baseUrl', label: 'Firewall/Panorama URL (https://fw.example.com)' },
    { key: 'apiKey', label: 'PAN-OS XML API key', secret: true },
  ],
  test, fetchSignals,
};
