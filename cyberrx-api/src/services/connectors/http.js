'use strict';

// Shared HTTP helpers for security-tool connectors: a timeout-bounded fetch and
// a JSON reader that turns non-2xx into a clear, vendor-tagged error.
async function http(url, opts = {}, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

async function jsonOrThrow(r, vendor) {
  if (!r || !r.ok) {
    let detail = ''; try { detail = (await r.text()).slice(0, 200); } catch (_) {}
    throw new Error(`${vendor} returned HTTP ${r ? r.status : '?'}${detail ? ` (${detail})` : ''}`);
  }
  return r.json();
}

const nowIso = () => new Date().toISOString();

module.exports = { http, jsonOrThrow, nowIso };
