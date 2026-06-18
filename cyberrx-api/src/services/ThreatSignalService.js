'use strict';

/**
 * ThreatSignalService — live external exploit signals for the prediction engine.
 *
 * Two public feeds, fetched live and cached (graceful fallback when the
 * environment's network policy blocks egress):
 *   - FIRST.org EPSS  — probability a CVE is exploited in the next 30 days.
 *   - CISA KEV catalog — CVEs known to be actively exploited in the wild.
 *
 * These turn the engine's timing from "modeled from severity" into a real
 * p(exploit) when a finding carries a CVE, and raise the confidence band.
 *
 * Network egress is governed by the environment's policy; if a fetch fails we
 * return cached data when available, else nothing (callers fall back to the
 * deterministic model). Nothing here throws.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

const EPSS_URL = 'https://api.first.org/data/v1/epss';
const KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
const TTL_MS = 24 * 60 * 60 * 1000; // 24h
const mem = { kev: null, kevAt: 0, epss: {} };

async function ensureCache() {
  try { await db.query(`CREATE TABLE IF NOT EXISTS threat_signal_cache (key TEXT PRIMARY KEY, data JSONB, fetched_at TIMESTAMPTZ DEFAULT now())`); }
  catch (e) { logger.debug('threat_signal_cache ensure failed', { error: e.message }); }
}
async function cacheGet(key) {
  try { const r = await db.query('SELECT data, fetched_at FROM threat_signal_cache WHERE key=$1', [key]); if (r[0]) return r[0]; } catch (_) {}
  return null;
}
async function cachePut(key, data) {
  try { await db.query(`INSERT INTO threat_signal_cache (key,data,fetched_at) VALUES ($1,$2,now()) ON CONFLICT (key) DO UPDATE SET data=$2, fetched_at=now()`, [key, JSON.stringify(data)]); } catch (_) {}
}
const fresh = (ts) => ts && (Date.now() - new Date(ts).getTime() < TTL_MS);

const CVE_RE = /CVE-\d{4}-\d{4,7}/gi;
function extractCves(text) {
  const m = String(text || '').toUpperCase().match(CVE_RE);
  return m ? [...new Set(m)] : [];
}

// ---- CISA KEV ---------------------------------------------------------------
async function kevSet() {
  if (mem.kev && Date.now() - mem.kevAt < TTL_MS) return mem.kev;
  await ensureCache();
  const cached = await cacheGet('kev:catalog');
  if (cached && fresh(cached.fetched_at)) { mem.kev = new Set(cached.data); mem.kevAt = Date.now(); return mem.kev; }
  try {
    const r = await fetch(KEV_URL, { signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const j = await r.json();
      const cves = (j.vulnerabilities || []).map((v) => v.cveID).filter(Boolean);
      await cachePut('kev:catalog', cves);
      mem.kev = new Set(cves); mem.kevAt = Date.now();
      return mem.kev;
    }
  } catch (e) { logger.debug('KEV fetch failed', { error: e.message }); }
  if (cached) { mem.kev = new Set(cached.data); mem.kevAt = Date.now(); return mem.kev; } // stale-ok
  return new Set();
}

// ---- EPSS ------------------------------------------------------------------
async function epssFor(cves) {
  const out = {};
  const want = (cves || []).filter(Boolean);
  if (!want.length) return out;
  await ensureCache();
  const need = [];
  for (const cve of want) {
    if (mem.epss[cve] && Date.now() - mem.epss[cve]._at < TTL_MS) { out[cve] = mem.epss[cve]; continue; }
    const c = await cacheGet(`epss:${cve}`);
    if (c && fresh(c.fetched_at)) { out[cve] = c.data; mem.epss[cve] = { ...c.data, _at: Date.now() }; }
    else need.push(cve);
  }
  if (need.length) {
    try {
      const r = await fetch(`${EPSS_URL}?cve=${encodeURIComponent(need.join(','))}`, { signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const j = await r.json();
        (j.data || []).forEach((row) => {
          const rec = { epss: Number(row.epss), percentile: Number(row.percentile) };
          out[row.cve] = rec; mem.epss[row.cve] = { ...rec, _at: Date.now() };
          cachePut(`epss:${row.cve}`, rec);
        });
      }
    } catch (e) { logger.debug('EPSS fetch failed', { error: e.message }); }
  }
  return out;
}

// ---- combined enrichment for an event/finding text -------------------------
// Returns the strongest exploit signal found in the text: max EPSS + KEV flag.
async function signalFor(text) {
  const cves = extractCves(text);
  const kevMentioned = /\bkev\b|known[-\s]?exploited|actively exploited/i.test(String(text || ''));
  if (!cves.length) return { cves: [], kev: kevMentioned, epss: null, source: kevMentioned ? 'keyword' : 'none' };
  const [kev, epss] = await Promise.all([kevSet(), epssFor(cves)]);
  let maxEpss = null, onKev = kevMentioned;
  cves.forEach((c) => { if (epss[c] && (maxEpss == null || epss[c].epss > maxEpss)) maxEpss = epss[c].epss; if (kev.has(c)) onKev = true; });
  return { cves, kev: onKev, epss: maxEpss, percentile: maxEpss != null ? (Object.values(epss)[0] || {}).percentile : null, source: maxEpss != null ? 'epss' : (onKev ? 'kev' : 'cve') };
}

module.exports = { extractCves, kevSet, epssFor, signalFor };
