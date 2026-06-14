'use strict';

/**
 * ingestion/parsers — dependency-free parsing of tabular sources into
 * { format, headers, rows }. Supports CSV, JSON, and XML out of the box; XLSX is
 * handled best-effort via the shared DocumentNormalizer (falls back to an
 * exception upstream if it can't yield rows). New formats plug in via FORMATS.
 *
 * Never throws on individual bad rows — it returns whatever it can parse; the
 * IngestionService decides what is usable vs. an exception.
 */

const FORMAT_BY_EXT = { csv: 'csv', tsv: 'csv', json: 'json', xml: 'xml', xlsx: 'xlsx', xls: 'xlsx' };

function detectFormat({ fileName, mime, text } = {}) {
  const ext = String(fileName || '').toLowerCase().split('.').pop();
  if (FORMAT_BY_EXT[ext]) return FORMAT_BY_EXT[ext];
  if (mime) { if (/json/.test(mime)) return 'json'; if (/xml/.test(mime)) return 'xml'; if (/csv/.test(mime)) return 'csv'; }
  const t = String(text || '').trim();
  if (t.startsWith('{') || t.startsWith('[')) return 'json';
  if (t.startsWith('<')) return 'xml';
  return 'csv';
}

// ---- CSV (RFC-4180-ish: quotes, embedded commas/newlines) -------------------
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  const s = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const grid = rows.filter((r) => r.some((v) => String(v).trim() !== ''));
  if (!grid.length) return { headers: [], rows: [] };
  const headers = grid[0].map((h) => String(h).trim());
  const out = grid.slice(1).map((r) => {
    const o = {}; headers.forEach((h, i) => { o[h] = r[i] != null ? String(r[i]).trim() : ''; }); return o;
  });
  return { headers, rows: out };
}

// ---- JSON (array of objects, or an object wrapping the first array) ----------
function parseJson(text) {
  const data = JSON.parse(text);
  let arr = Array.isArray(data) ? data : null;
  if (!arr && data && typeof data === 'object') arr = Object.values(data).find(Array.isArray) || null;
  if (!arr) arr = data ? [data] : [];
  const rows = arr.filter((x) => x && typeof x === 'object').map((x) => {
    const o = {}; Object.keys(x).forEach((k) => { o[k] = x[k] == null ? '' : (typeof x[k] === 'object' ? JSON.stringify(x[k]) : String(x[k])); }); return o;
  });
  const headers = [...rows.reduce((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set())];
  return { headers, rows };
}

// ---- XML (best-effort: most-frequent repeated element becomes a row) ---------
function parseXml(text) {
  const stripped = String(text).replace(/<\?xml[^>]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  // Count every element occurrence (incl. nested) via opening tags.
  const counts = {};
  let om; const openRe = /<([A-Za-z_][\w.-]*)\b[^>]*?(\/?)>/g;
  while ((om = openRe.exec(stripped))) { if (om[2] === '/') continue; counts[om[1]] = (counts[om[1]] || 0) + 1; }
  // The row element is the most frequent element that CONTAINS child elements
  // (so we don't mistake a leaf like <name> for the row).
  const hasChildren = (tag) => { const mm = stripped.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`)); return mm ? /<[A-Za-z_]/.test(mm[1]) : false; };
  const rowTag = Object.keys(counts).sort((a, b) => {
    const ca = hasChildren(a) ? 1 : 0, cb = hasChildren(b) ? 1 : 0;
    return cb - ca || counts[b] - counts[a];
  })[0];
  if (!rowTag) return { headers: [], rows: [] };
  const rows = [];
  const re = new RegExp(`<${rowTag}\\b[^>]*>([\\s\\S]*?)</${rowTag}>`, 'g');
  let m;
  while ((m = re.exec(stripped))) {
    const inner = m[1]; const o = {};
    inner.replace(/<([A-Za-z_][\w.-]*)\b[^>]*>([\s\S]*?)<\/\1>/g, (_, k, v) => { o[k] = v.replace(/<[^>]+>/g, '').trim(); return ''; });
    if (Object.keys(o).length) rows.push(o);
  }
  const headers = [...rows.reduce((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set())];
  return { headers, rows };
}

function parseXlsx(input) {
  // Best-effort: DocumentNormalizer yields text; structured XLSX rows are not
  // reliably recoverable dependency-free, so callers should prefer CSV export.
  try {
    const { normalize } = require('../services/DocumentNormalizer');
    const { text } = normalize(input, 'sheet.xlsx');
    // If the sheet is comma/tab separated after extraction, try CSV.
    return parseCsv(text);
  } catch (_) { return { headers: [], rows: [] }; }
}

const FORMATS = { csv: parseCsv, json: parseJson, xml: parseXml, xlsx: parseXlsx };

function parse(input, meta = {}) {
  const isBuffer = Buffer.isBuffer(input);
  const text = isBuffer ? input.toString('utf8') : String(input == null ? '' : input);
  const format = detectFormat({ ...meta, text });
  const fn = FORMATS[format] || parseCsv;
  const { headers, rows } = format === 'xlsx' ? parseXlsx(isBuffer ? input : Buffer.from(text)) : fn(text);
  return { format, headers, rows };
}

module.exports = { parse, detectFormat, parseCsv, parseJson, parseXml };
