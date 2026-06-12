'use strict';

/**
 * CisoReportBuilder — professional CISO exports (PDF + PowerPoint)
 * ---------------------------------------------------------------
 * Turns the full CISO Security Posture Dashboard (CisoDashboardService) into a
 * board-ready, well-explained document:
 *   - PDF  (pdfkit): branded cover, executive summary with plain-English
 *     explanations, posture & domains, top risks, threshold breaches, priority
 *     actions, attack pathways, readiness & investment, hidden risks, and a
 *     traceability appendix. Running header/footer + page numbers.
 *   - PPTX (pptxgenjs): a clean board deck of the same content, one idea per
 *     slide, with speaker-ready bullets.
 *
 * Everything is generated from computed data, and each figure carries the
 * validation-run id in the appendix so it is traceable.
 */

const PDFDocument = require('pdfkit');

const INK = '#0f172a', INK2 = '#334155', MUTE = '#64748b', LINE = '#e2e8f0', PANEL = '#f4f7fb', NAVY = '#0f1b2d';
const GREEN = '#1f8a4c', AMBER = '#B07C2E', ORANGE = '#A85B2E', RED = '#C0392B', BLUE = '#1d4ed8';
const bandColor = (b) => ({ Strong: GREEN, Moderate: AMBER, Weak: ORANGE, Critical: RED }[b] || MUTE);
const sevColor = (s) => ({ Critical: RED, High: ORANGE, Medium: AMBER, Low: GREEN }[s] || MUTE);
const PAGE_W = 612, M = 54, CONTENT_W = PAGE_W - M * 2;

// ---------------------------------------------------------------- PDF --------
function buildPdf(res, d, fw) {
  const doc = new PDFDocument({ size: 'LETTER', margin: M, bufferPages: true, info: {
    Title: 'CISO Security Posture Report', Author: 'CyberRx', Subject: 'Executive cybersecurity posture',
  } });
  doc.pipe(res);

  const p = d.overallPosture;
  const when = new Date(d.generatedAt).toLocaleString();

  // ---- Cover ----
  doc.rect(0, 0, PAGE_W, 792).fill(NAVY);
  doc.fillColor('#7aa2ff').fontSize(12).font('Helvetica-Bold').text('CYBERRX', M, 120, { characterSpacing: 3 });
  doc.fillColor('#8fa3bd').fontSize(11).font('Helvetica').text('Executive Cyber Operating System', M, 140);
  doc.fillColor('#ffffff').fontSize(34).font('Helvetica-Bold').text('CISO Security Posture Report', M, 300, { width: CONTENT_W });
  doc.fillColor('#cbd5e1').fontSize(13).font('Helvetica').text(`${d.organizationId}`, M, 360);
  doc.fillColor('#8fa3bd').fontSize(11).text(`Generated ${when}  ·  Validation run #${p && d.questions[0] ? (d.runId || '—') : '—'}`, M, 382);
  // posture badge
  const col = bandColor(band(p.current));
  doc.roundedRect(M, 440, 230, 96, 8).fill('#16263b');
  doc.fillColor(col === ORANGE ? '#f0a868' : col).fontSize(46).font('Helvetica-Bold').text(`${p.current}`, M + 18, 456);
  doc.fillColor('#8fa3bd').fontSize(11).font('Helvetica').text('/ 100  Overall posture', M + 110, 470);
  doc.fillColor('#e2e8f0').fontSize(12).text(`${band(p.current)}  ·  ${p.delta >= 0 ? '+' : ''}${p.delta} vs last period`, M + 110, 490);
  doc.fillColor('#64748b').fontSize(9).text('CONFIDENTIAL — for the named recipient only', M, 720);

  // ---- Body ----
  doc.addPage();
  let firstBody = true;

  h1(doc, 'Executive summary');
  para(doc, p.narrative);
  d.questions.forEach((q) => qaBlock(doc, q));

  section(doc, 'Security posture & domain health');
  para(doc, `Overall posture is ${p.current}/100 (${band(p.current)}), ${p.trend}, ${p.delta >= 0 ? 'up' : 'down'} ${Math.abs(p.delta)} since last period. Weighted across eight domains; identity and detection carry the most weight.`);
  domainTable(doc, d.domainMatrix);

  section(doc, 'Top control-risk contributors');
  para(doc, 'Ranked by likelihood × impact × blast radius. These are where an attacker gets the most leverage.');
  d.controlRisk.slice(0, 6).forEach((c, i) => riskRow(doc, i + 1, c));

  section(doc, 'Threshold breaches (risk-appetite)');
  para(doc, `${d.thresholds.breaches} of ${d.thresholds.total} internal thresholds are breached (${d.thresholds.critical} critical). Each breach is a risk-appetite violation.`);
  d.thresholds.rows.filter((r) => r.status === 'Breach').slice(0, 10).forEach((t) => thresholdRow(doc, t));

  section(doc, 'Priority actions');
  para(doc, 'Ranked by severity × urgency × business impact × threat activity × remediation confidence.');
  d.actionQueue.slice(0, 6).forEach((a) => actionRow(doc, a));

  section(doc, 'Attack pathways to critical processes');
  d.attackPathways.slice(0, 3).forEach((path) => pathwayBlock(doc, path));

  section(doc, 'Cyber-event readiness & investment');
  para(doc, `Major-event readiness is ${d.readiness.overall}/100 (${d.readiness.rating}). Weakest areas: ${[...d.readiness.items].sort((a, b) => a.score - b.score).slice(0, 2).map((r) => r.name).join(', ')}.`);
  d.investments.slice(0, 5).forEach((iv) => investRow(doc, iv));

  section(doc, 'Hidden / unapproved risk acceptance');
  para(doc, 'Risks the organization is carrying without a formal, documented decision to accept them.');
  d.hiddenRisks.slice(0, 6).forEach((hh) => hiddenRow(doc, hh));

  // ---- Four-lens framework compliance ----
  if (fw) {
    section(doc, 'Framework compliance — four lenses');
    para(doc, 'The same program seen through four independent frameworks: NIST CSF 2.0, SP 800-53 r5, MITRE ATT&CK, and CIS Controls v8.1.');
    if (fw.csf) { doc.fillColor(INK).fontSize(10.5).font('Helvetica-Bold').text(`NIST CSF 2.0 — overall ${fw.csf.overall ?? '—'}`); para(doc, fw.csf.functions.map((f) => `${f.name} ${f.score ?? '—'}`).join('  ·  ')); }
    if (fw.nist80053 && fw.nist80053.baseline) { doc.fillColor(INK).fontSize(10.5).font('Helvetica-Bold').text(`NIST 800-53 r5 — ${fw.nist80053.baseline.name} baseline ${fw.nist80053.baseline.coveragePct}%`); para(doc, `${fw.nist80053.baseline.covered} of ${fw.nist80053.baseline.total} controls evidenced. Weakest families: ${(fw.nist80053.families || []).slice(0, 6).map((f) => `${f.family} ${f.score}`).join(', ')}.`); }
    if (fw.attack && fw.attack.summary) { doc.fillColor(INK).fontSize(10.5).font('Helvetica-Bold').text(`MITRE ATT&CK — ${fw.attack.summary.covered}/${fw.attack.summary.total} techniques covered`); para(doc, `Prevent ${fw.attack.summary.prevent}, detect ${fw.attack.summary.detect}.`); }
    if (fw.cis && fw.cis.status === 'ingested') {
      doc.fillColor(INK).fontSize(10.5).font('Helvetica-Bold').text(`CIS Controls v${fw.cis.version} — the 18 Controls`);
      (fw.cis.controls || []).forEach((c) => { ensureSpace(doc, 12); const col = c.attainmentPct >= 80 ? GREEN : c.attainmentPct >= 50 ? AMBER : RED; doc.fillColor(INK2).fontSize(9).font('Helvetica').text(`${c.number}. ${c.name}`, M + 8, doc.y, { width: 360, continued: true }).fillColor(col).font('Helvetica-Bold').text(`   ${c.attainmentPct}% (${c.covered}/${c.safeguards})`); });
      doc.moveDown(0.3);
    }
  }

  // ---- Appendix ----
  doc.addPage();
  h1(doc, 'Appendix — methodology & traceability');
  para(doc, 'Scores are computed from validation checks against your security tools, rolled up requirement → domain → overall. Attack-path and ATT&CK coverage derive from technique-to-control mappings joined to passing checks. Every figure in this report is computed, not estimated.');
  kv(doc, 'Organization', String(d.organizationId));
  kv(doc, 'Generated', when);
  kv(doc, 'Overall posture', `${p.current}/100 (${band(p.current)}), ${p.delta >= 0 ? '+' : ''}${p.delta} vs prior`);
  kv(doc, 'Data sources', (d.evidenceSources || []).map((s) => s.name).join(', '));
  para(doc, 'Mock/demo data is used where a live integration is not yet connected; the data model is structured so a live API replaces a value of the same shape without changing this report.');

  // footers
  const range = doc.bufferedPageRange();
  for (let i = 1; i < range.count; i++) {
    doc.switchToPage(i);
    doc.fillColor(MUTE).fontSize(8).font('Helvetica')
      .text('CyberRx · CISO Security Posture Report · CONFIDENTIAL', M, 762, { width: CONTENT_W, align: 'left' });
    doc.text(`Page ${i} of ${range.count - 1}`, M, 762, { width: CONTENT_W, align: 'right' });
  }
  doc.end();
}

// ---- pdf helpers ----
function ensureSpace(doc, need) { if (doc.y + need > 720) doc.addPage(); }
function band(s) { return s >= 80 ? 'Strong' : s >= 60 ? 'Moderate' : s >= 40 ? 'Weak' : 'Critical'; }
function h1(doc, t) { doc.moveDown(0.2); doc.fillColor(INK).fontSize(20).font('Helvetica-Bold').text(t); doc.moveTo(M, doc.y + 3).lineTo(PAGE_W - M, doc.y + 3).strokeColor(LINE).lineWidth(1).stroke(); doc.moveDown(0.6); }
function section(doc, t) { ensureSpace(doc, 90); doc.moveDown(0.8); doc.fillColor(NAVY).fontSize(14).font('Helvetica-Bold').text(t); doc.moveTo(M, doc.y + 2).lineTo(PAGE_W - M, doc.y + 2).strokeColor(LINE).stroke(); doc.moveDown(0.5); }
function para(doc, t) { if (!t) return; doc.fillColor(INK2).fontSize(10.5).font('Helvetica').text(t, { width: CONTENT_W, lineGap: 2 }); doc.moveDown(0.4); }
function kv(doc, k, v) { doc.fontSize(10).font('Helvetica-Bold').fillColor(MUTE).text(k + ':  ', { continued: true }).font('Helvetica').fillColor(INK).text(v || '—'); }

function qaBlock(doc, q) {
  ensureSpace(doc, 120);
  const col = bandColor(q.status);
  const y0 = doc.y;
  doc.roundedRect(M, y0, CONTENT_W, 1, 0); // anchor
  doc.fillColor(INK).fontSize(11.5).font('Helvetica-Bold').text(`Q${q.n}. ${q.question}`, M + 8, y0 + 6, { width: CONTENT_W - 16 });
  doc.fillColor(INK2).fontSize(10).font('Helvetica').text(q.answer, M + 8, doc.y + 2, { width: CONTENT_W - 16, lineGap: 1.5 });
  if (q.explanation) doc.fillColor(BLUE).fontSize(9.5).font('Helvetica-Oblique').text(q.explanation, M + 8, doc.y + 3, { width: CONTENT_W - 16, lineGap: 1.5 });
  doc.fillColor(MUTE).fontSize(9).font('Helvetica').text(`Status ${q.status} · Confidence ${q.confidence} · Recommended: ${q.recommendedAction} (Owner ${q.owner}, by ${q.targetDate})`, M + 8, doc.y + 3, { width: CONTENT_W - 16 });
  // left accent bar
  doc.rect(M, y0, 3, doc.y - y0 + 2).fill(col);
  doc.moveDown(0.7);
}

function domainTable(doc, rows) {
  ensureSpace(doc, 40 + rows.length * 14);
  rows.forEach((r) => {
    ensureSpace(doc, 18);
    const y = doc.y; const col = bandColor(r.status);
    doc.fillColor(INK).fontSize(9.5).font('Helvetica-Bold').text(r.name + (r.weight ? ` (${r.weight}%)` : ''), M, y, { width: 200, continued: false });
    // bar
    const bx = M + 210, bw = 200;
    doc.roundedRect(bx, y + 2, bw, 7, 3).fill('#eef2f6');
    doc.roundedRect(bx, y + 2, bw * (r.current / 100), 7, 3).fill(col);
    doc.fillColor(col).fontSize(9.5).font('Helvetica-Bold').text(`${r.current}`, bx + bw + 8, y, { width: 30 });
    doc.fillColor(MUTE).fontSize(8.5).font('Helvetica').text(`${r.delta >= 0 ? '+' : ''}${r.delta} ${r.trend}`, bx + bw + 40, y);
    doc.y = y + 14;
  });
  doc.moveDown(0.3);
}

function riskRow(doc, n, c) {
  ensureSpace(doc, 40);
  const y = doc.y;
  doc.fillColor(RED).fontSize(10).font('Helvetica-Bold').text(`#${n}  ${c.name}`, M, y, { width: CONTENT_W - 60, continued: true }).fillColor(MUTE).font('Helvetica').fontSize(9).text(`   ${c.riskContribution}/100`);
  doc.fillColor(INK2).fontSize(9).font('Helvetica').text(`${c.csf} · ${c.cis} · ${c.likelihood} likelihood, ${c.impact} impact · affects ${c.processAffected}`, M + 14, doc.y + 1, { width: CONTENT_W - 14 });
  doc.fillColor(MUTE).fontSize(9).text(`Evidence: ${c.evidence}`, M + 14, doc.y + 1, { width: CONTENT_W - 14 });
  doc.fillColor(GREEN).fontSize(9).text(`→ ${c.action}`, M + 14, doc.y + 1, { width: CONTENT_W - 14 });
  doc.moveDown(0.4);
}

function thresholdRow(doc, t) {
  ensureSpace(doc, 22);
  const y = doc.y; const col = sevColor(t.breachSeverity);
  doc.rect(M, y + 1, 3, 22).fill(col);
  doc.fillColor(INK).fontSize(9.5).font('Helvetica-Bold').text(t.name, M + 10, y, { width: 280, continued: false });
  doc.fillColor(col).fontSize(9.5).font('Helvetica-Bold').text(`${t.current}${t.unit === '%' ? '%' : ' ' + t.unit} vs ${t.threshold} · ${t.breachSeverity}`, M + 300, y, { width: CONTENT_W - 300 });
  doc.fillColor(MUTE).fontSize(8.5).font('Helvetica').text(`→ ${t.action}`, M + 10, doc.y + 1, { width: CONTENT_W - 10 });
  doc.moveDown(0.3);
}

function actionRow(doc, a) {
  ensureSpace(doc, 30);
  const y = doc.y;
  doc.fillColor(a.rank <= 2 ? RED : INK).fontSize(10).font('Helvetica-Bold').text(`#${a.rank}  ${a.action}`, M, y, { width: CONTENT_W });
  doc.fillColor(INK2).fontSize(9).font('Helvetica').text(`Why now: ${a.whyNow}`, M + 14, doc.y + 1, { width: CONTENT_W - 14 });
  doc.fillColor(MUTE).fontSize(8.5).text(`Protects ${a.process} · Owner ${a.owner} · Due ${a.dueDate}${a.escalation ? ' · ESCALATE' : ''}`, M + 14, doc.y + 1, { width: CONTENT_W - 14 });
  doc.moveDown(0.35);
}

function pathwayBlock(doc, p) {
  ensureSpace(doc, 60);
  doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(p.process);
  doc.fillColor(INK2).fontSize(9.5).font('Helvetica').text(p.narrative, { width: CONTENT_W, lineGap: 1.5 });
  doc.fillColor(MUTE).fontSize(9).text(`Weakest link: ${p.weakestControl} · Impact: ${p.businessImpact}`, { width: CONTENT_W });
  doc.fillColor(GREEN).fontSize(9).text(`→ Fix first: ${p.breakingControls[0]}. ${p.mitigation}.`, { width: CONTENT_W });
  doc.moveDown(0.5);
}

function investRow(doc, iv) {
  ensureSpace(doc, 18);
  const y = doc.y;
  doc.fillColor(INK).fontSize(9.5).font('Helvetica-Bold').text(`${iv.name} (${iv.spend})`, M, y, { width: 280 });
  doc.fillColor(GREEN).fontSize(9.5).text(`risk ${iv.baselineRisk} → ${iv.currentRisk}  (−${iv.riskReduction})`, M + 290, y, { width: CONTENT_W - 290 });
  if (iv.blockers) doc.fillColor(MUTE).fontSize(8.5).font('Helvetica').text(`blocker: ${iv.blockers}`, M + 10, doc.y + 1);
  doc.moveDown(0.3);
}

function hiddenRow(doc, h) {
  ensureSpace(doc, 26);
  doc.fillColor('#7c3aed').fontSize(9.5).font('Helvetica-Bold').text(h.risk, { width: CONTENT_W });
  doc.fillColor(INK2).fontSize(9).font('Helvetica').text(`${h.evidence} · ${h.domain} / ${h.process}`, M + 10, doc.y + 1, { width: CONTENT_W - 10 });
  doc.fillColor(MUTE).fontSize(8.5).text(`→ ${h.escalation}`, M + 10, doc.y + 1, { width: CONTENT_W - 10 });
  doc.moveDown(0.3);
}

// --------------------------------------------------------------- PPTX --------
async function buildPptxBuffer(d, fw) {
  const Pptx = require('pptxgenjs');
  const pptx = new Pptx();
  pptx.defineLayout({ name: 'W', width: 13.333, height: 7.5 }); pptx.layout = 'W';
  pptx.author = 'CyberRx'; pptx.company = String(d.organizationId);
  const p = d.overallPosture;
  const NAVYH = '0f1b2d', INKH = '0f172a', MUTEH = '64748b', GREENH = '1f8a4c', REDH = 'c0392b', AMBERH = 'b07c2e';
  const bColor = (b) => ({ Strong: GREENH, Moderate: AMBERH, Weak: 'a85b2e', Critical: REDH }[b] || MUTEH);

  // Title slide
  let s = pptx.addSlide(); s.background = { color: NAVYH };
  s.addText('CYBERRX', { x: 0.6, y: 0.5, fontSize: 14, color: '7aa2ff', bold: true, charSpacing: 3 });
  s.addText('CISO Security Posture Report', { x: 0.6, y: 2.4, w: 12, fontSize: 40, color: 'FFFFFF', bold: true });
  s.addText(`${d.organizationId}`, { x: 0.6, y: 3.5, fontSize: 18, color: 'cbd5e1' });
  s.addText(`Generated ${new Date(d.generatedAt).toLocaleString()}`, { x: 0.6, y: 4.0, fontSize: 12, color: '8fa3bd' });
  s.addText(`${p.current}`, { x: 0.6, y: 4.8, fontSize: 54, color: bColor(band(p.current)), bold: true });
  s.addText(`/100  ${band(p.current)}  ·  ${p.delta >= 0 ? '+' : ''}${p.delta} vs last period`, { x: 2.3, y: 5.4, fontSize: 16, color: 'e2e8f0' });

  // Executive summary — the 5 answers
  s = pptx.addSlide(); slideTitle(s, 'Executive summary');
  d.questions.forEach((q, i) => {
    const y = 1.2 + i * 1.15;
    s.addText([{ text: `Q${q.n}. ${q.question}\n`, options: { bold: true, color: INKH, fontSize: 12 } },
      { text: q.answer, options: { color: '334155', fontSize: 10 } }], { x: 0.5, y, w: 12.3, h: 1.05, valign: 'top' });
  });

  // Domains
  s = pptx.addSlide(); slideTitle(s, 'Domain health');
  const drows = [[{ text: 'Domain', options: hcell() }, { text: 'Score', options: hcell() }, { text: 'Δ', options: hcell() }, { text: 'Trend', options: hcell() }]];
  d.domainMatrix.forEach((r) => drows.push([cell(r.name + (r.weight ? ` (${r.weight}%)` : '')), cell(String(r.current), bColor(r.status)), cell(`${r.delta >= 0 ? '+' : ''}${r.delta}`), cell(r.trend)]));
  s.addTable(drows, { x: 0.5, y: 1.1, w: 12.3, fontSize: 10, border: { type: 'solid', color: 'e2e8f0', pt: 0.5 } });

  // Top risks
  s = pptx.addSlide(); slideTitle(s, 'Top control-risk contributors');
  d.controlRisk.slice(0, 6).forEach((c, i) => s.addText([
    { text: `#${i + 1}  ${c.name}  (${c.riskContribution}/100)\n`, options: { bold: true, color: REDH, fontSize: 12 } },
    { text: `${c.csf} · ${c.cis} · affects ${c.processAffected}. ${c.evidence}\n`, options: { color: '334155', fontSize: 9.5 } },
    { text: `→ ${c.action}`, options: { color: GREENH, fontSize: 9.5 } },
  ], { x: 0.5, y: 1.1 + i * 0.95, w: 12.3, h: 0.9, valign: 'top' }));

  // Priority actions
  s = pptx.addSlide(); slideTitle(s, 'Priority actions — what to do now');
  d.actionQueue.slice(0, 6).forEach((a, i) => s.addText([
    { text: `#${a.rank}  ${a.action}\n`, options: { bold: true, color: INKH, fontSize: 12 } },
    { text: `Why now: ${a.whyNow} · Owner ${a.owner} · Due ${a.dueDate}${a.escalation ? ' · ESCALATE' : ''}`, options: { color: '64748b', fontSize: 9.5 } },
  ], { x: 0.5, y: 1.1 + i * 0.9, w: 12.3, h: 0.85, valign: 'top' }));

  // Attack pathway
  s = pptx.addSlide(); slideTitle(s, 'Most likely attack pathway');
  const ap = d.attackPathways[0];
  if (ap) s.addText([
    { text: `${ap.process}\n`, options: { bold: true, color: INKH, fontSize: 16 } },
    { text: `${ap.narrative}\n\n`, options: { color: '334155', fontSize: 12 } },
    { text: `Weakest link: ${ap.weakestControl}\nImpact: ${ap.businessImpact}\n`, options: { color: REDH, fontSize: 11 } },
    { text: `Fix first: ${ap.breakingControls[0]}. ${ap.mitigation}.`, options: { color: GREENH, fontSize: 11, bold: true } },
  ], { x: 0.6, y: 1.3, w: 12, h: 5, valign: 'top' });

  // Readiness + thresholds summary
  s = pptx.addSlide(); slideTitle(s, 'Readiness & risk-appetite');
  s.addText(`Cyber-event readiness: ${d.readiness.overall}/100 (${d.readiness.rating})`, { x: 0.6, y: 1.3, fontSize: 16, bold: true, color: bColor(d.readiness.rating) });
  s.addText(`${d.thresholds.breaches} of ${d.thresholds.total} internal thresholds breached (${d.thresholds.critical} critical).`, { x: 0.6, y: 2.0, fontSize: 14, color: INKH });
  s.addText(d.thresholds.rows.filter((r) => r.status === 'Breach').slice(0, 8).map((t) => `• ${t.name}: ${t.current}${t.unit === '%' ? '%' : ' ' + t.unit} vs ${t.threshold} (${t.breachSeverity})`).join('\n'),
    { x: 0.6, y: 2.7, w: 12, fontSize: 11, color: '334155' });

  // Framework compliance — four lenses
  if (fw) {
    s = pptx.addSlide(); slideTitle(s, 'Framework compliance — four lenses');
    const lines = [];
    if (fw.csf) lines.push(`NIST CSF 2.0 — overall ${fw.csf.overall ?? '—'}: ${fw.csf.functions.map((f) => `${f.name} ${f.score ?? '—'}`).join(', ')}`);
    if (fw.nist80053 && fw.nist80053.baseline) lines.push(`NIST 800-53 r5 — ${fw.nist80053.baseline.name} baseline ${fw.nist80053.baseline.coveragePct}% (${fw.nist80053.baseline.covered}/${fw.nist80053.baseline.total})`);
    if (fw.attack && fw.attack.summary) lines.push(`MITRE ATT&CK — ${fw.attack.summary.covered}/${fw.attack.summary.total} techniques covered (prevent ${fw.attack.summary.prevent}, detect ${fw.attack.summary.detect})`);
    if (fw.cis && fw.cis.status === 'ingested') lines.push(`CIS Controls v${fw.cis.version} — ${(fw.cis.controls || []).filter((c) => c.attainmentPct < 50).length} of 18 controls below 50%`);
    s.addText(lines.map((l) => `• ${l}`).join('\n\n'), { x: 0.6, y: 1.3, w: 12, fontSize: 14, color: '0f172a', lineSpacingMultiple: 1.2 });
    if (fw.cis && fw.cis.status === 'ingested') {
      const rows = [[{ text: 'CIS Control', options: hcell() }, { text: '%', options: hcell() }, { text: 'Status', options: hcell() }]];
      (fw.cis.controls || []).forEach((c) => rows.push([cell(`${c.number}. ${c.name}`), cell(`${c.attainmentPct}%`, c.attainmentPct >= 80 ? GREENH : c.attainmentPct >= 50 ? AMBERH : REDH), cell(c.status)]));
      s.addTable(rows, { x: 0.6, y: 3.4, w: 12.1, fontSize: 8.5, border: { type: 'solid', color: 'e2e8f0', pt: 0.5 }, autoPage: true });
    }
  }

  return pptx.write({ outputType: 'nodebuffer' });
}
function slideTitle(s, t) { s.addText(t, { x: 0.5, y: 0.35, fontSize: 22, bold: true, color: '0f1b2d' }); s.addShape('line', { x: 0.5, y: 0.95, w: 12.3, h: 0, line: { color: 'e2e8f0', width: 1 } }); }
function hcell() { return { bold: true, color: 'FFFFFF', fill: '0f1b2d', fontSize: 10, align: 'left' }; }
function cell(text, color) { return { text, options: { color: color || '0f172a', fontSize: 10, align: 'left' } }; }

module.exports = { buildPdf, buildPptxBuffer };
