'use strict';

/**
 * utils/extractText.js — best-effort document text extraction (no new deps)
 * ------------------------------------------------------------------------
 * Turns an uploaded document into plain text the review agent can read.
 * Accepts { text, contentBase64, content, fileName, mime }.
 *   - plain text / markdown / csv / json  → returned as-is
 *   - PDF  → extracts text from content streams (inflates FlateDecode), pulls
 *            the strings drawn by Tj/TJ operators. Handles the common case
 *            (incl. pdfkit-generated PDFs); not a full PDF engine.
 * Returns '' when nothing can be extracted (the caller then falls back to the
 * structured `fields` provided, and the review notes that text was unreadable).
 */

const zlib = require('zlib');

function fromPdf(buf) {
  const out = [];
  // Walk streams by byte offset; inflate FlateDecode; scan for text operators.
  const s = buf.toString('latin1');
  let i = 0;
  while (true) {
    const sm = s.indexOf('stream', i); if (sm < 0) break;
    let start = sm + 6; while (s[start] === '\r' || s[start] === '\n') start++;
    const end = s.indexOf('endstream', start); if (end < 0) break;
    i = end + 9;
    let data = Buffer.from(s.slice(start, end), 'latin1');
    if (data[0] === 0x78) { try { data = zlib.inflateSync(data); } catch (_) { continue; } }
    out.push(scanContent(data.toString('latin1')));
  }
  return out.join(' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

// Decode one PDF string token: (literal) or <hexcodes> → text.
function token(tok) {
  if (tok[0] === '(') return unescapePdf(tok.slice(1, -1));
  if (tok[0] === '<') {
    const hex = tok.slice(1, -1).replace(/[^0-9a-fA-F]/g, '');
    let r = ''; for (let j = 0; j + 1 < hex.length; j += 2) r += String.fromCharCode(parseInt(hex.substr(j, 2), 16));
    return r;
  }
  return '';
}

// Extract text shown by Tj/TJ, honoring (..) and <..> operands inside [..] TJ.
function scanContent(s) {
  const out = [];
  // standalone (str) Tj or <hex> Tj
  const single = /(\((?:\\.|[^\\()])*\)|<[0-9a-fA-F\s]*>)\s*Tj/g; let m;
  while ((m = single.exec(s))) out.push(token(m[1]));
  // [ (str) k <hex> k ... ] TJ
  const arr = /\[([\s\S]*?)\]\s*TJ/g; let a;
  while ((a = arr.exec(s))) {
    const toks = /\((?:\\.|[^\\()])*\)|<[0-9a-fA-F\s]*>/g; let p; let line = '';
    while ((p = toks.exec(a[1]))) line += token(p[0]);
    out.push(line);
  }
  return out.join('\n');
}

function unescapePdf(s) {
  return s.replace(/\\([nrtbf()\\])/g, (_, c) => ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' }[c] || c))
    .replace(/\\(\d{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
}

function looksLikePdf(buf) { return buf.length > 4 && buf.toString('latin1', 0, 5) === '%PDF-'; }

function extractText(input = {}) {
  if (input.text && typeof input.text === 'string' && input.text.trim()) return input.text;
  let buf = null;
  if (input.contentBase64) { try { buf = Buffer.from(input.contentBase64, 'base64'); } catch (_) {} }
  else if (Buffer.isBuffer(input.content)) buf = input.content;
  else if (typeof input.content === 'string' && input.content.trim()) {
    // could be raw text or base64; treat as text unless clearly a PDF header
    if (input.content.startsWith('%PDF-')) buf = Buffer.from(input.content, 'latin1');
    else return input.content;
  }
  if (!buf) return '';
  if (looksLikePdf(buf)) return fromPdf(buf);
  // unknown binary → try utf8 text
  const txt = buf.toString('utf8');
  return /[\x00-\x08\x0e-\x1f]/.test(txt.slice(0, 200)) ? '' : txt;
}

module.exports = { extractText };
