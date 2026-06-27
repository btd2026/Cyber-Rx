'use strict';

/**
 * ExportService — renders the assessment report (AssessmentReportService model)
 * to PDF, XLSX and DOCX. PDF uses pdfkit; XLSX/DOCX are real OOXML (zipped XML)
 * built with jszip — no heavyweight docx/exceljs dependency required. Every
 * export leads with the design/documentation-only caveat.
 */

const JSZip = require('jszip');

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colLetter = (i) => String.fromCharCode(65 + i); // small sheets (<26 cols)

// ---------------- PDF ----------------
function toPdf(report) {
  return new Promise((resolve, reject) => {
    let PDFDocument; try { PDFDocument = require('pdfkit'); } catch (e) { return reject(new Error(`pdfkit unavailable: ${e.message}`)); }
    const doc = new PDFDocument({ margin: 50 });
    const chunks = []; doc.on('data', (c) => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);

    doc.fontSize(18).text('Compliance Assessment Report', { underline: false });
    if (report.generated_at) doc.fontSize(9).fillColor('#666').text(`Generated ${report.generated_at}`);
    doc.moveDown(0.5).fontSize(9).fillColor('#a33').text(report.coverage_caveat).fillColor('#000');

    doc.moveDown().fontSize(14).text('Per-framework scorecard');
    (report.scorecards || []).forEach((s) => {
      doc.moveDown(0.3).fontSize(11).text(`${s.framework} ${s.framework_version || ''} — coverage ${s.coverage_pct}%`);
      doc.fontSize(9).fillColor('#444').text(`Fully ${s.fully} · Partially ${s.partially} · Not addressed ${s.not_addressed} · N/A ${s.not_applicable} · total ${s.total}`).fillColor('#000');
    });

    doc.moveDown().fontSize(14).text(`Gap register (${report.gap_register.length})`);
    report.gap_register.slice(0, 200).forEach((g) => {
      doc.moveDown(0.3).fontSize(10).text(`${g.framework} ${g.control_id} — ${g.status} [${g.control_nature}]`);
      if (g.gap_description) doc.fontSize(9).fillColor('#444').text(`Gap: ${g.gap_description}`).fillColor('#000');
      if (g.remediation_suggestion) doc.fontSize(9).fillColor('#246').text(`Fix: ${g.remediation_suggestion}`).fillColor('#000');
      doc.fontSize(8).fillColor('#888').text(`OE evidence still required: ${g.operating_effectiveness_evidence_type}`).fillColor('#000');
    });

    doc.moveDown().fontSize(14).text(`Evidence-linked findings (${report.findings.length})`);
    report.findings.slice(0, 200).forEach((f) => {
      doc.moveDown(0.3).fontSize(10).text(`${f.framework} ${f.control_id} — ${f.status}${f.propagated_from ? ` (propagated from ${f.propagated_from})` : ''}`);
      (f.evidence || []).forEach((e) => doc.fontSize(9).fillColor('#161').text(`“${e.quote}” (${e.section_ref})`).fillColor('#000'));
    });

    doc.end();
  });
}

// ---------------- XLSX ----------------
function sheetXml(rows) {
  const body = rows.map((row, r) => {
    const cells = row.map((cell, c) => {
      const ref = `${colLetter(c)}${r + 1}`;
      if (cell && typeof cell === 'object' && cell.num != null) return `<c r="${ref}"><v>${Number(cell.num)}</v></c>`;
      const v = cell && typeof cell === 'object' ? cell.v : cell;
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}">${cells}</row>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

async function toXlsx(report) {
  const sheets = [
    { name: 'Scorecards', rows: [['Framework', 'Version', 'Coverage %', 'Fully', 'Partially', 'Not addressed', 'N/A', 'Total'],
      ...report.scorecards.map((s) => [s.framework, s.framework_version || '', { num: s.coverage_pct }, { num: s.fully }, { num: s.partially }, { num: s.not_addressed }, { num: s.not_applicable }, { num: s.total }])] },
    { name: 'Gap Register', rows: [['Framework', 'Control', 'Status', 'Nature', 'Gap', 'Remediation', 'OE evidence'],
      ...report.gap_register.map((g) => [g.framework, g.control_id, g.status, g.control_nature, g.gap_description, g.remediation_suggestion, g.operating_effectiveness_evidence_type])] },
    { name: 'Findings', rows: [['Framework', 'Control', 'Status', 'Method', 'Evidence quote', 'Section'],
      ...report.findings.flatMap((f) => (f.evidence.length ? f.evidence : [{ quote: '', section_ref: '' }]).map((e) => [f.framework, f.control_id, f.status, f.assessment_method, e.quote, e.section_ref]))] },
    { name: 'Heatmap', rows: [['Family', 'Assessed', 'Coverage %', 'Fully', 'Partially', 'Not addressed', 'Doc-touched'],
      ...(report.heatmap || []).map((h) => [h.family, { num: h.assessed }, { num: h.coverage_pct }, { num: h.fully }, { num: h.partially }, { num: h.not_addressed }, { num: h.doc_touched }])] },
  ];
  const zip = new JSZip();
  zip.file('[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file('xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`);
  sheets.forEach((s, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s.rows)));
  return zip.generateAsync({ type: 'nodebuffer' });
}

// ---------------- DOCX ----------------
const para = (text, { bold, size, color } = {}) => {
  const rpr = `${bold ? '<w:b/>' : ''}${size ? `<w:sz w:val="${size * 2}"/>` : ''}${color ? `<w:color w:val="${color}"/>` : ''}`;
  return `<w:p><w:pPr><w:rPr>${rpr}</w:rPr></w:pPr><w:r><w:rPr>${rpr}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
};

async function toDocx(report) {
  const p = [];
  p.push(para('Compliance Assessment Report', { bold: true, size: 18 }));
  if (report.generated_at) p.push(para(`Generated ${report.generated_at}`, { size: 8, color: '666666' }));
  p.push(para(report.coverage_caveat, { size: 9, color: 'AA3333' }));
  p.push(para('Per-framework scorecard', { bold: true, size: 14 }));
  report.scorecards.forEach((s) => {
    p.push(para(`${s.framework} ${s.framework_version || ''} — coverage ${s.coverage_pct}%`, { bold: true, size: 11 }));
    p.push(para(`Fully ${s.fully} · Partially ${s.partially} · Not addressed ${s.not_addressed} · N/A ${s.not_applicable} · total ${s.total}`, { size: 9, color: '444444' }));
  });
  p.push(para(`Gap register (${report.gap_register.length})`, { bold: true, size: 14 }));
  report.gap_register.forEach((g) => {
    p.push(para(`${g.framework} ${g.control_id} — ${g.status} [${g.control_nature}]`, { bold: true, size: 10 }));
    if (g.gap_description) p.push(para(`Gap: ${g.gap_description}`, { size: 9 }));
    if (g.remediation_suggestion) p.push(para(`Fix: ${g.remediation_suggestion}`, { size: 9, color: '224466' }));
    p.push(para(`OE evidence still required: ${g.operating_effectiveness_evidence_type}`, { size: 8, color: '888888' }));
  });
  p.push(para(`Evidence-linked findings (${report.findings.length})`, { bold: true, size: 14 }));
  report.findings.forEach((f) => {
    p.push(para(`${f.framework} ${f.control_id} — ${f.status}${f.propagated_from ? ` (propagated from ${f.propagated_from})` : ''}`, { bold: true, size: 10 }));
    (f.evidence || []).forEach((e) => p.push(para(`“${e.quote}” (${e.section_ref})`, { size: 9, color: '116611' })));
  });

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${p.join('')}<w:sectPr/></w:body></w:document>`;
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', document);
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function exportReport(report, format) {
  if (format === 'pdf') return { buffer: await toPdf(report), contentType: 'application/pdf' };
  if (format === 'xlsx') return { buffer: await toXlsx(report), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  if (format === 'docx') return { buffer: await toDocx(report), contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  throw new Error(`unsupported export format: ${format}`);
}

module.exports = { toPdf, toXlsx, toDocx, exportReport };
