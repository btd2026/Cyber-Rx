// Converts each HPE policy .md into a real .pdf the cockpit can actually read.
//
// The backend PDF extractor (routes/documents.js extractText) is a crude
// printable-ASCII byte-scan — it cannot decode Flate streams OR hex/kerned glyph
// runs (which is what pdfkit emits). So we hand-write a minimal, dependency-free
// PDF whose text is LITERAL ASCII in uncompressed content streams — `(text) Tj`
// with a base-14 Helvetica font — so every word survives the byte-scan intact.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- text prep -----------------------------------------------------------
const UNI = { '—': '-', '–': '-', '’': "'", '‘': "'", '“': '"', '”': '"', '•': '-', '…': '...', '×': 'x', '→': '->', ' ': ' ', 'é': 'e', '‑': '-', '≥': '>=', '≤': '<=' };
const asciify = (s) => String(s).replace(/[-￿]/g, (c) => UNI[c] || '').replace(/[^\x20-\x7E]/g, '');
const esc = (s) => asciify(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
function wrap(s, n) { const words = s.split(/\s+/); const out = []; let line = ''; for (const w of words) { if ((line + ' ' + w).trim().length > n) { if (line) out.push(line); line = w; } else line = (line ? line + ' ' : '') + w; } if (line) out.push(line); return out.length ? out : ['']; }

// Turn one markdown line into render tokens {text, size, bold, gap}.
function tokens(raw) {
  const line = raw.replace(/\*\*/g, '').replace(/`/g, '');
  if (/^#\s+/.test(line)) return [{ text: line.replace(/^#\s+/, ''), size: 17, bold: true, gapBefore: 8 }];
  if (/^##\s+/.test(line)) return [{ text: line.replace(/^##+\s+/, ''), size: 13, bold: true, gapBefore: 6 }];
  if (/^###\s+/.test(line)) return [{ text: line.replace(/^###+\s+/, ''), size: 11.5, bold: true, gapBefore: 4 }];
  if (/^\s*[-*]\s+/.test(line)) return wrap('- ' + line.replace(/^\s*[-*]\s+/, ''), 96).map((t, i) => ({ text: (i ? '  ' : '') + t, size: 10, bold: false }));
  if (/^\s*\|/.test(line)) return [{ text: line.replace(/\|/g, ' | ').replace(/\s+/g, ' ').trim(), size: 9, bold: false }];
  if (line.trim() === '') return [{ blank: true }];
  return wrap(line, 100).map((t) => ({ text: t, size: 10, bold: false }));
}

// ---- minimal PDF assembler ----------------------------------------------
function buildPdf(mdText, title) {
  const PW = 612, PH = 792, ML = 54, MT = 738, MB = 54;
  // paginate
  const pages = []; let cur = []; let y = MT;
  const flat = mdText.split(/\r?\n/).flatMap(tokens);
  for (const t of flat) {
    if (t.blank) { y -= 6; if (y < MB) { pages.push(cur); cur = []; y = MT; } continue; }
    const lead = t.size + 4 + (t.gapBefore || 0);
    if (y - lead < MB) { pages.push(cur); cur = []; y = MT; }
    y -= (t.gapBefore || 0);
    cur.push({ text: t.text, size: t.size, bold: t.bold, x: ML, y });
    y -= t.size + 4;
  }
  if (cur.length) pages.push(cur);

  const objs = []; // string bodies, 1-indexed via push order
  const add = (s) => { objs.push(s); return objs.length; };
  const fontReg = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const pageObjNums = [];
  const contentObjNums = [];
  // reserve Pages object number
  const pagesNum = objs.length + 1; add('__PAGES__');
  pages.forEach((lines) => {
    let stream = '';
    lines.forEach((ln) => { stream += `BT /${ln.bold ? 'F2' : 'F1'} ${ln.size} Tf ${ln.x} ${ln.y.toFixed(1)} Td (${esc(ln.text)}) Tj ET\n`; });
    const cNum = add(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}endstream`);
    contentObjNums.push(cNum);
    const pNum = add(`<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 ${fontReg} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${cNum} 0 R >>`);
    pageObjNums.push(pNum);
  });
  objs[pagesNum - 1] = `<< /Type /Pages /Kids [${pageObjNums.map((n) => n + ' 0 R').join(' ')}] /Count ${pageObjNums.length} >>`;
  const catalogNum = add(`<< /Type /Catalog /Pages ${pagesNum} 0 R >>`);

  // serialize with xref
  let pdf = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
  const offsets = [];
  objs.forEach((body, i) => { offsets[i] = Buffer.byteLength(pdf, 'latin1'); pdf += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xrefStart = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => { pdf += String(off).padStart(10, '0') + ' 00000 n \n'; });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root ${catalogNum} 0 R /Info << /Title (${esc(title)}) >> >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

const files = fs.readdirSync(__dirname).filter((f) => /^d\d+_.*\.md$/.test(f));
let done = 0;
for (const md of files) {
  const src = fs.readFileSync(path.join(__dirname, md), 'utf8');
  const out = path.join(__dirname, md.replace(/\.md$/, '.pdf'));
  fs.writeFileSync(out, buildPdf(src, md.replace(/\.md$/, '')));
  done++; console.log('wrote ' + path.basename(out));
}
console.log(`\n${done} PDFs generated (literal-ASCII text, extractable by the server byte-scan).`);
