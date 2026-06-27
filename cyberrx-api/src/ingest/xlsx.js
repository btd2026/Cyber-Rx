'use strict';

/**
 * ingest/xlsx.js — minimal dependency-free .xlsx reader
 * -----------------------------------------------------
 * Reads sheets from an Office Open XML workbook with no third-party library
 * (so it runs on Render without adding a dependency). Parses the ZIP central
 * directory, inflates entries with zlib, and turns a worksheet into a 2-D array
 * of cell strings (shared strings + inline numbers resolved).
 *
 * Scope: enough to read a simple workbook (text + shared strings).
 * Not a general xlsx implementation — no formulas, styles, or dates.
 */

const fs = require('fs');
const zlib = require('zlib');

function readZip(filePath) {
  const buf = fs.readFileSync(filePath);
  // End of Central Directory record
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 22 - 65536; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('xlsx: EOCD not found');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const entries = {};
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break;
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen);
    entries[name] = { method, compSize, localOff };
    off += 46 + nameLen + extraLen + commentLen;
  }
  const extract = (name) => {
    const e = entries[name]; if (!e) return null;
    if (buf.readUInt32LE(e.localOff) !== 0x04034b50) throw new Error('xlsx: bad local header ' + name);
    const nameLen = buf.readUInt16LE(e.localOff + 26);
    const extraLen = buf.readUInt16LE(e.localOff + 28);
    const start = e.localOff + 30 + nameLen + extraLen;
    const data = buf.subarray(start, start + e.compSize);
    return e.method === 8 ? zlib.inflateRawSync(data) : Buffer.from(data);
  };
  return { entries, extract };
}

function decode(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

// shared strings -> array (each <si> may have one <t> or many <r><t>)
function sharedStrings(xml) {
  if (!xml) return [];
  const out = [];
  const re = /<si>([\s\S]*?)<\/si>/g; let m;
  while ((m = re.exec(xml))) {
    const parts = []; const tr = /<t[^>]*>([\s\S]*?)<\/t>/g; let t;
    while ((t = tr.exec(m[1]))) parts.push(t[1]);
    out.push(decode(parts.join('')));
  }
  return out;
}

const colNum = (ref) => { const c = ref.match(/^[A-Z]+/)[0]; let n = 0; for (const ch of c) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };

// Worksheet -> array of rows; each row is an array of strings by column index.
function sheetRows(xml, shared) {
  const rows = [];
  const rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g; let r;
  while ((r = rowRe.exec(xml))) {
    const cells = []; const cRe = /<c r="([A-Z]+\d+)"(?:[^>]*\bt="([^"]*)")?[^>]*>(?:<v>([\s\S]*?)<\/v>|<is>(?:<t[^>]*>([\s\S]*?)<\/t>)<\/is>)?<\/c>/g; let c;
    while ((c = cRe.exec(r[1]))) {
      const idx = colNum(c[1]); const type = c[2]; let val = '';
      if (c[4] != null) val = decode(c[4]);
      else if (c[3] != null) val = type === 's' ? (shared[+c[3]] || '') : decode(c[3]);
      cells[idx] = val;
    }
    rows.push(cells);
  }
  return rows;
}

function readSheet(filePath, sheetName) {
  const zip = readZip(filePath);
  const wb = zip.extract('xl/workbook.xml').toString('utf8');
  const rels = zip.extract('xl/_rels/workbook.xml.rels').toString('utf8');
  const shared = sharedStrings(zip.extract('xl/sharedStrings.xml') ? zip.extract('xl/sharedStrings.xml').toString('utf8') : '');
  // find sheet r:id by name, then target file
  const sheetTag = new RegExp(`<sheet[^>]*name="${sheetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*r:id="(rId\\d+)"`).exec(wb);
  if (!sheetTag) throw new Error('xlsx: sheet not found: ' + sheetName);
  const target = new RegExp(`Id="${sheetTag[1]}"[^>]*Target="([^"]+)"`).exec(rels);
  const path = 'xl/' + target[1].replace(/^\//, '');
  const xml = zip.extract(path).toString('utf8');
  return sheetRows(xml, shared);
}

function sheetNames(filePath) {
  const zip = readZip(filePath);
  const wb = zip.extract('xl/workbook.xml').toString('utf8');
  return [...wb.matchAll(/<sheet[^>]*name="([^"]*)"/g)].map((m) => decode(m[1]));
}

module.exports = { readSheet, sheetNames };
