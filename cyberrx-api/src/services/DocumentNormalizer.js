'use strict';

/**
 * DocumentNormalizer — step 1 of the intake document pipeline
 * -----------------------------------------------------------
 * normalize(buffer|text, fileName) -> { text, format }
 *
 * Pluggable by extension so new formats can be added without touching callers.
 * Dependency-free (mirrors utils/extractText.js): PDF via the existing custom
 * extractor; DOCX/XLSX via a small zlib-based ZIP reader; TXT/MD/CSV/JSON pass
 * through. Unknown/binary falls back to a best-effort UTF-8 read.
 */

const zlib = require('zlib');
const extractText = require('../utils/extractText');

// ---- minimal ZIP reader (DOCX/XLSX are OOXML zip archives) ------------------
function readZipEntries(buf) {
  const entries = {};
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 22 - 65536; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('zip: end-of-central-directory not found');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count && off + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break;
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const lho = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen);
    // local header: 30 bytes + name + extra, then data
    const lNameLen = buf.readUInt16LE(lho + 26);
    const lExtraLen = buf.readUInt16LE(lho + 28);
    const dataStart = lho + 30 + lNameLen + lExtraLen;
    const raw = buf.slice(dataStart, dataStart + compSize);
    entries[name] = () => {
      try { return method === 0 ? raw : zlib.inflateRawSync(raw); }
      catch (_) { return Buffer.alloc(0); }
    };
    off += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

const stripXml = (xml) => xml
  .replace(/<w:p\b[^>]*>/g, '\n').replace(/<\/w:p>/g, '\n')   // docx paragraphs -> newlines
  .replace(/<[^>]+>/g, ' ')                                    // drop all tags
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

function fromDocx(buf) {
  const e = readZipEntries(buf);
  const doc = e['word/document.xml'] && e['word/document.xml']();
  return doc ? stripXml(doc.toString('utf8')) : '';
}

function fromXlsx(buf) {
  const e = readZipEntries(buf);
  // shared strings (most text lives here)
  const out = [];
  const ss = e['xl/sharedStrings.xml'] && e['xl/sharedStrings.xml']();
  if (ss) {
    const m = ss.toString('utf8').match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
    m.forEach((t) => out.push(stripXml(t)));
  }
  // inline strings / numbers across all sheets
  Object.keys(e).filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).forEach((k) => {
    const xml = e[k]().toString('utf8');
    (xml.match(/<is>[\s\S]*?<\/is>/g) || []).forEach((t) => out.push(stripXml(t)));
  });
  return out.filter(Boolean).join('\n');
}

const HANDLERS = {
  txt: (b) => b.toString('utf8'), md: (b) => b.toString('utf8'),
  csv: (b) => b.toString('utf8'), json: (b) => b.toString('utf8'),
  pdf: (b) => { try { return extractText(b, 'f.pdf'); } catch (_) { return ''; } },
  docx: fromDocx, xlsx: fromXlsx,
};

function normalize(input, fileName = '') {
  const ext = String(fileName).toLowerCase().split('.').pop();
  if (typeof input === 'string') return { text: input, format: ext || 'txt' };
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input || '');
  const handler = HANDLERS[ext];
  let text = '';
  try { text = handler ? handler(buf) : buf.toString('utf8'); } catch (_) { text = ''; }
  if (!text || !text.trim()) { try { text = buf.toString('utf8').replace(/[^\x09\x0a\x0d\x20-\x7e]+/g, ' ').trim(); } catch (_) {} }
  return { text: text || '', format: ext || 'bin' };
}

module.exports = { normalize, supported: Object.keys(HANDLERS) };
