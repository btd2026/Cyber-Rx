'use strict';

/**
 * ExecReportPdf — STEP D3
 * -----------------------
 * Streams a one-click PDF for the CISO monthly pack or the CRO/board quarterly
 * pack using the existing pdfkit dependency. Every figure is followed by an
 * appendix that cites the validation_run id it was computed from, so each
 * number is traceable.
 */

const PDFDocument = require('pdfkit');

const INK = '#0f172a', MUTE = '#64748b', LINE = '#e2e8f0';
const GREEN = '#1f8a4c', AMBER = '#B07C2E', RED = '#C0392B';
const colorFor = (s) => (s === 'green' ? GREEN : s === 'amber' ? AMBER : s === 'red' ? RED : MUTE);
const ratingColor = (r) => (r === 'strong' ? GREEN : r === 'adequate' ? AMBER : r === 'weak' ? RED : MUTE);

function header(doc, title, sub) {
  doc.fillColor(INK).fontSize(20).text('CyberRx', { continued: false });
  doc.fillColor(MUTE).fontSize(9).text(sub || '');
  doc.moveDown(0.3);
  doc.fillColor(INK).fontSize(15).text(title);
  doc.moveTo(doc.x, doc.y + 4).lineTo(555, doc.y + 4).strokeColor(LINE).stroke();
  doc.moveDown(0.8);
}
function h2(doc, t) { doc.moveDown(0.6).fillColor(INK).fontSize(12).text(t); doc.moveDown(0.2); }
function kv(doc, k, v, color) {
  doc.fontSize(10).fillColor(MUTE).text(k, { continued: true }).fillColor(color || INK).text('  ' + v);
}

function stream(res, audience, orgId, pack) {
  const doc = new PDFDocument({ size: 'LETTER', margin: 48 });
  doc.pipe(res);
  const when = new Date(pack.generatedAt).toLocaleString();

  if (audience === 'cro') {
    header(doc, 'Board / CRO Cybersecurity Pack', `${orgId} · ${when} · run #${pack.runId}`);
    doc.fontSize(11).fillColor(INK).text(pack.postureStatement);
    kv(doc, 'Enterprise readiness:', `${pack.enterpriseReadiness}/100  (Tier ${pack.maturityTier.tier} — ${pack.maturityTier.label})`);
    if (pack.whatChanged) {
      h2(doc, 'What changed since last board meeting');
      const d = pack.whatChanged.overallDelta;
      kv(doc, 'Overall readiness:', `${d >= 0 ? '+' : ''}${d} points`, d >= 0 ? GREEN : RED);
      pack.whatChanged.byFunction.forEach((f) => kv(doc, `  ${f.name}:`, `${f.delta >= 0 ? '+' : ''}${f.delta}`, f.delta >= 0 ? GREEN : RED));
    }
    h2(doc, 'Top business processes by exposure');
    pack.topProcesses.forEach((p) => {
      doc.fontSize(10).fillColor(INK).text(`${p.name}  (${p.criticality})`, { continued: true })
        .fillColor(MUTE).text(`   exposure ${p.exposureScore}/100${p.financialExposure ? ' · $' + Number(p.financialExposure).toLocaleString() : ''}`);
      doc.fontSize(9).fillColor(MUTE).text(p.headline);
    });
    h2(doc, 'Business-impact themes');
    pack.businessImpacts.forEach((b) => {
      doc.fontSize(10).fillColor(ratingColor(b.rating)).text(`${b.theme} — ${b.rating.toUpperCase()}`, { continued: true })
        .fillColor(MUTE).fontSize(9).text(`   (${b.basis})`);
      doc.fontSize(9).fillColor(INK).text(b.statement);
    });
    h2(doc, 'Profile coverage');
    kv(doc, pack.profileCoverage.name + ':', `${pack.profileCoverage.coveragePct}% (${pack.profileCoverage.coveredControls}/${pack.profileCoverage.totalControls} controls evidenced)`);
  } else {
    header(doc, 'CISO Security Posture Pack', `${orgId} · ${when} · run #${pack.runId}`);
    h2(doc, 'NIST CSF 2.0 function scores');
    kv(doc, 'Overall:', `${pack.csf.overall ?? 'n/a'}/100`);
    pack.csf.functions.forEach((f) => kv(doc, `  ${f.name}:`, f.score == null ? 'n/a' : `${f.score}/100`, colorFor(f.status)));
    h2(doc, `NIST 800-53 — ${pack.nist80053.baseline.name} baseline`);
    kv(doc, 'Baseline coverage:', `${pack.nist80053.baseline.coveragePct}% (${pack.nist80053.baseline.covered}/${pack.nist80053.baseline.total})`);
    kv(doc, 'Weakest families:', pack.nist80053.families.slice(0, 6).map((f) => `${f.family} ${f.score}`).join('  '));
    h2(doc, 'MITRE ATT&CK coverage');
    const a = pack.attack.summary;
    kv(doc, 'Techniques covered:', `${a.covered}/${a.total}  (prevent ${a.prevent}, detect ${a.detect}, none ${a.none})`);
    h2(doc, 'Failing-control queue');
    pack.failingQueue.slice(0, 12).forEach((q) => {
      doc.fontSize(10).fillColor(RED).text(`${q.title}`, { continued: true })
        .fillColor(MUTE).fontSize(9).text(`   ${q.observed ?? ''} vs ${q.expected ?? ''}  [${q.csf || ''}]`);
      doc.fontSize(9).fillColor(INK).text(`→ ${q.recommendation}`);
    });
    if (pack.cis && pack.cis.status === 'pending') {
      h2(doc, 'CIS Controls v8.1'); doc.fontSize(9).fillColor(MUTE).text(pack.cis.note);
    }
  }

  // Appendix — traceability
  doc.addPage();
  header(doc, 'Appendix — Traceability', `${orgId} · ${when}`);
  doc.fontSize(10).fillColor(INK).text('Every figure in this pack is computed from a stored validation run.');
  kv(doc, 'Validation run id:', `#${pack.runId}`);
  if (pack.runMeta) {
    kv(doc, 'Checks:', `${pack.runMeta.checks_total} total · ${pack.runMeta.checks_passed} passed · ${pack.runMeta.checks_failed} failed · ${pack.runMeta.checks_skipped} skipped`);
    kv(doc, 'Run started:', String(pack.runMeta.started_at));
  }
  doc.fontSize(8).fillColor(MUTE).moveDown(0.5)
    .text('Scores roll up check results → requirements → functions/families → overall. ATT&CK coverage derives from the CTID ATT&CK↔800-53 mapping joined to passing checks. Provisional mappings (CSF↔800-53) are flagged in the engine and FOLLOW_UPS.md.');
  doc.end();
}

module.exports = { stream };
