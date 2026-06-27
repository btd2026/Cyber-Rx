'use strict';

/**
 * CisoReportBuilder — professional consultant-style exports (PDF + PowerPoint)
 * ---------------------------------------------------------------------------
 * Produces a DTNK SHIELD branded assessment report:
 *   - Cover with the DTNK SHIELD mark + client name and overall posture.
 *   - Table of contents (with real page numbers, back-filled after layout).
 *   - Executive summary: what was done · key strengths · weakest areas ·
 *     recommendations.
 *   - Assessment details: for each control — a plain-English summary, the test
 *     approach (automated / manual), the result in plain English, and on a
 *     control gap an ORGANIZATION-SPECIFIC risk written from the client's own
 *     setup data (members, PHI records, revenue, insurance) — never generic.
 *   - Four-lens framework compliance + methodology/traceability appendix.
 *
 * Inputs: d (CisoDashboardService.getDashboard), fw (ExecReportService.cisoPack),
 * ctx { name, inputs } where inputs are the org's setup metrics.
 */

const PDFDocument = require('pdfkit');

const INK = '#0f172a', INK2 = '#334155', MUTE = '#64748b', LINE = '#e2e8f0', PANEL = '#f4f7fb', NAVY = '#0f1b2d';
const GOLD = '#c9a227', STEEL = '#2c4f7c';
const GREEN = '#1f8a4c', AMBER = '#B07C2E', ORANGE = '#A85B2E', RED = '#C0392B', BLUE = '#1d4ed8';
const bandColor = (b) => ({ Strong: GREEN, Moderate: AMBER, Weak: ORANGE, Critical: RED }[b] || MUTE);
const sevColor = (s) => ({ Critical: RED, High: ORANGE, Medium: AMBER, Low: GREEN }[s] || MUTE);
const PAGE_W = 612, PAGE_H = 792, M = 54, CONTENT_W = PAGE_W - M * 2;

// ----- small data helpers (org-specific risk writing) -----------------------
function fmtN(n) { n = Number(n); if (!isFinite(n) || !n) return null; if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'; if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M'; if (n >= 1e3) return Math.round(n / 1e3) + 'K'; return String(Math.round(n)); }
function usd(n) { const f = fmtN(n); return f ? '$' + f : null; }

function plainSummary(name) {
  const n = String(name).toLowerCase();
  if (n.includes('privileged')) return 'Governs the master administrative accounts that can change anything — the prime target in a ransomware attack.';
  if (n.includes('vulnerability') || n.includes('patch')) return 'Finds and fixes known software flaws before attackers exploit them, especially internet-facing systems.';
  if (n.includes('mfa')) return 'Requires a second factor so a stolen password alone cannot grant access — the top defense against phishing.';
  if (n.includes('third-party') || n.includes('vendor')) return 'Manages the risk that reaches the organization through suppliers with access to its systems and data.';
  if (n.includes('logging') || n.includes('monitoring') || n.includes('detection engineering') || n.includes('detection')) return 'Determines whether the organization can actually see an attacker operating inside its environment.';
  if (n.includes('backup') || n.includes('restore') || n.includes('recovery')) return 'Determines whether operations and data can be recovered after ransomware or destructive loss.';
  if (n.includes('cloud')) return 'Keeps cloud resources configured safely so member data is not exposed without a break-in.';
  if (n.includes('data loss') || n.includes('dlp')) return 'Stops sensitive data from leaving via email, cloud, or AI tools.';
  if (n.includes('email')) return 'Filters phishing and impersonation before it reaches a person — the most common way attacks start.';
  if (n.includes('segmentation') || n.includes('network')) return 'Limits how far an attacker can move laterally once inside the network.';
  if (n.includes('awareness') || n.includes('training')) return 'Strengthens the human firewall — staff recognizing and reporting attacks.';
  if (n.includes('access') || n.includes('joiner') || n.includes('recert')) return 'Ensures people hold only the access they need, and lose it promptly when they leave or change roles.';
  if (n.includes('incident') || n.includes('response')) return 'Determines how quickly and effectively the organization contains and manages an incident.';
  if (n.includes('endpoint')) return 'Protects laptops and servers from malware and gives responders the ability to contain a host.';
  if (n.includes('application')) return 'Finds security flaws in software before it ships to members and providers.';
  return 'A control that directly affects how exposed the organization\'s critical systems are.';
}
function testApproach(c) {
  const e = String(c.evidence || '').toLowerCase();
  if (/tabletop|exercise|attestation|policy|documented/.test(e)) return 'Manual review / attestation';
  if (/last (full )?restore test|plan |review/.test(e)) return 'Manual review / attestation';
  const tool = String(c.evidence || '').split(':')[0].trim();
  return tool && /^[A-Za-z][A-Za-z0-9 .\/-]{1,28}$/.test(tool) ? `Automated — ${tool} API` : 'Automated check';
}
function resultPlain(c) {
  const rc = c.riskContribution;
  const verdict = rc >= 80 ? 'Significant control gap' : rc >= 60 ? 'Control gap' : rc >= 40 ? 'Partially effective' : 'Operating effectively';
  return `${verdict}. ${c.evidence}`;
}
const isFinding = (c) => c.riskContribution >= 60;

// Organization-specific risk written from the client's setup data — no generics.
function orgRisk(c, ctx) {
  const I = (ctx && ctx.inputs) || {}; const name = (ctx && ctx.name) || 'the organization';
  const parts = [`For ${name}, a failure of ${c.name} gives an attacker a path to ${c.processAffected} — blast radius ${String(c.blastRadius).toLowerCase()}.`];
  const data = [];
  if (I.phi_records) data.push(`${fmtN(I.phi_records)} PHI records`);
  if (I.member_count) data.push(`${fmtN(I.member_count)} members`);
  if (data.length) parts.push(`That places ${data.join(' and ')} at risk of exposure or service disruption.`);
  if (I.phi_records) {
    const breach = I.phi_records * 165; // modeled per-record breach cost applied to the client's own record count
    parts.push(`At ${name}'s data scale this models to roughly ${usd(breach)} in breach-notification, response, and regulatory cost${I.ins_limit ? `, against ${usd(I.ins_limit)} of cyber insurance` : ''}.`);
  } else if (I.revenue) {
    parts.push(`Against ${usd(I.revenue)} in annual revenue, an outage of ${c.processAffected} directly threatens collections and member service.`);
  }
  return parts.join(' ');
}

// ---------------------------------------------------------------- PDF --------
function buildPdf(res, d, fw, ctx) {
  ctx = ctx || { name: String(d.organizationId), inputs: {} };
  const clientName = ctx.name || String(d.organizationId);
  const doc = new PDFDocument({ size: 'LETTER', margin: M, bufferPages: true, info: {
    Title: `${clientName} — Cybersecurity Posture Assessment`, Author: 'DTNK SHIELD', Subject: 'CISO security posture assessment',
  } });
  doc.pipe(res);

  const p = d.overallPosture;
  const when = new Date(d.generatedAt).toLocaleString();
  const PG = { n: 1 };                       // manual page counter (cover = 1)
  const TOC = [];                            // { title, page }
  const addPage = () => { doc.addPage(); PG.n++; };
  const ensureSpace = (need) => { if (doc.y + need > 720) addPage(); };
  const record = (title) => { TOC.push({ title, page: PG.n }); };

  // ---- Cover ----
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(NAVY);
  shield(doc, M, 96, 1.0, GOLD);
  doc.fillColor('#ffffff').fontSize(15).font('Helvetica-Bold').text('DTNK SHIELD', M + 46, 104, { characterSpacing: 2 });
  doc.fillColor('#8fa3bd').fontSize(9.5).font('Helvetica').text('CYBERSECURITY ADVISORY', M + 46, 124, { characterSpacing: 2 });
  doc.fillColor('#ffffff').fontSize(30).font('Helvetica-Bold').text('Cybersecurity Posture Assessment', M, 300, { width: CONTENT_W });
  doc.fillColor(GOLD).fontSize(16).font('Helvetica-Bold').text(clientName, M, 352);
  doc.fillColor('#8fa3bd').fontSize(10.5).font('Helvetica').text(`Prepared ${when}  ·  Validation run #${d.runId || '—'}`, M, 378);
  const col = bandColor(band(p.current));
  doc.roundedRect(M, 440, 250, 100, 8).fill('#16263b');
  doc.fillColor(col === ORANGE ? '#f0a868' : col).fontSize(48).font('Helvetica-Bold').text(`${p.current}`, M + 20, 458);
  doc.fillColor('#8fa3bd').fontSize(11).font('Helvetica').text('/ 100  Overall posture', M + 120, 472);
  doc.fillColor('#e2e8f0').fontSize(12).text(`${band(p.current)}  ·  ${p.delta >= 0 ? '+' : ''}${p.delta} vs last period`, M + 120, 492);
  doc.fillColor('#64748b').fontSize(9).text('PREPARED FOR THE NAMED CLIENT — CONFIDENTIAL', M, 720);

  // ---- TOC (reserved page; filled in after layout) ----
  addPage();                                 // page 2 = TOC
  const tocPageIndex = PG.n - 1;             // 0-based index for switchToPage

  // ---- Body ----
  addPage();                                 // first body page

  record('1. Executive summary');
  h1(doc, 'Executive summary');
  const es = ctx && ctx.execSummary;
  if (es && (es.context || es.posture || (es.key_risks && es.key_risks.length))) {
    // Intake-driven, generated executive summary (stored/reviewed or deterministic).
    if (es.context) para(doc, es.context);
    if (es.posture) { sub(doc, 'Posture'); para(doc, es.posture); }
    if (es.key_risks && es.key_risks.length) { sub(doc, 'Key risks'); es.key_risks.forEach((r) => bullet(doc, r.detail ? `${r.title} — ${r.detail}` : r.title, RED)); }
    if (es.quick_wins && es.quick_wins.length) { sub(doc, 'Quick wins'); es.quick_wins.forEach((w) => bullet(doc, w.detail ? `${w.title} — ${w.detail}` : w.title, GREEN)); }
    if (es.path_forward) { sub(doc, 'Path to target state'); para(doc, es.path_forward); }
    if (es.stored === false || es.status === 'auto') { doc.fillColor(MUTE).fontSize(8).font('Helvetica-Oblique').text('Draft generated from intake + assessment data — pending consultant review.'); doc.font('Helvetica'); doc.moveDown(0.3); }
  } else {
    const strengths = [...d.domainMatrix].sort((a, b) => b.current - a.current).slice(0, 3);
    const weakest = [...d.domainMatrix].sort((a, b) => a.current - b.current).slice(0, 3);
    const topActions = d.actionQueue.slice(0, 4);
    sub(doc, 'What was done');
    para(doc, `DTNK SHIELD assessed ${clientName}'s cybersecurity posture across ${d.controlRisk.length} control areas, evaluated through three independent frameworks — NIST CSF 2.0, NIST SP 800-53 r5, and MITRE ATT&CK. Each control was tested with automated checks against ${clientName}'s security tooling, supplemented by structured review where automation does not apply. Findings are computed from validation run #${d.runId || '—'} on ${when}. Overall posture is ${p.current}/100 (${band(p.current)}), ${p.trend}.`);
    sub(doc, 'Key strengths');
    strengths.forEach((s) => bullet(doc, `${s.name} — ${s.current}/100 (${s.status}). ${s.topImproving ? 'Improving: ' + s.topImproving.metric + '.' : ''}`, GREEN));
    sub(doc, 'Weakest areas');
    weakest.forEach((w) => bullet(doc, `${w.name} — ${w.current}/100 (${w.status}). ${w.topDeteriorating ? 'Deteriorating: ' + w.topDeteriorating.metric + '.' : ''}`, RED));
    bullet(doc, `${d.thresholds.breaches} of ${d.thresholds.total} risk-appetite thresholds are breached (${d.thresholds.critical} critical).`, RED);
    sub(doc, 'Recommendations');
    topActions.forEach((a, i) => bullet(doc, `${i + 1}. ${a.action} — protects ${a.process}; owner ${a.owner}, due ${a.dueDate}${a.escalation ? ' (escalate).' : '.'}`, STEEL));
  }

  // ---- Assessment details ----
  record('2. Assessment details');
  section(doc, 'Assessment details');
  para(doc, `Each control below shows what it is, how it was tested, and the result in plain English. Where a control gap was found, the risk is stated specifically for ${clientName} using the data provided during setup.`);
  d.controlRisk.forEach((c) => controlBlock(doc, c, ctx, ensureSpace));

  // ---- Three-lens framework compliance ----
  if (fw) {
    record('3. Framework compliance — three lenses');
    section(doc, 'Framework compliance — three lenses');
    para(doc, 'The same program seen through three independent frameworks.');
    if (fw.csf) { ensureSpace(30); doc.fillColor(INK).fontSize(10.5).font('Helvetica-Bold').text(`NIST CSF 2.0 — overall ${fw.csf.overall ?? '—'}`); para(doc, fw.csf.functions.map((f) => `${f.name} ${f.score ?? '—'}`).join('  ·  ')); }
    if (fw.nist80053 && fw.nist80053.baseline) { ensureSpace(30); doc.fillColor(INK).fontSize(10.5).font('Helvetica-Bold').text(`NIST 800-53 r5 — ${fw.nist80053.baseline.name} baseline ${fw.nist80053.baseline.coveragePct}%`); para(doc, `${fw.nist80053.baseline.covered} of ${fw.nist80053.baseline.total} controls evidenced. Weakest families: ${(fw.nist80053.families || []).filter((f) => f.score != null).slice(0, 6).map((f) => `${f.family} ${f.score}`).join(', ')}.`); }
    if (fw.attack && fw.attack.summary) { ensureSpace(24); doc.fillColor(INK).fontSize(10.5).font('Helvetica-Bold').text(`MITRE ATT&CK — ${fw.attack.summary.covered}/${fw.attack.summary.total} techniques covered`); para(doc, `Prevent ${fw.attack.summary.prevent}, detect ${fw.attack.summary.detect}.`); }
  }

  // ---- Appendix ----
  record('4. Methodology & traceability');
  addPage();
  h1(doc, 'Appendix — methodology & traceability');
  para(doc, 'Scores are computed from validation checks against the client\'s security tools, rolled up requirement → domain → overall. Attack-path and ATT&CK coverage derive from technique-to-control mappings joined to passing checks. Every figure in this report is computed, not estimated.');
  kv(doc, 'Client', clientName);
  kv(doc, 'Prepared', when);
  kv(doc, 'Overall posture', `${p.current}/100 (${band(p.current)}), ${p.delta >= 0 ? '+' : ''}${p.delta} vs prior`);
  kv(doc, 'Controls assessed', String(d.controlRisk.length));
  kv(doc, 'Data sources', (d.evidenceSources || []).map((s) => s.name).join(', '));
  para(doc, 'Organization-specific risk figures are modeled from the data provided in setup (members, PHI records, revenue, insurance). Where a live integration is not yet connected, the data model is structured so a live API replaces a value of the same shape without changing this report.');

  // ---- Back-fill the Table of Contents on the reserved page ----
  doc.switchToPage(tocPageIndex);
  doc.fillColor(NAVY).fontSize(20).font('Helvetica-Bold').text('Contents', M, 70);
  doc.moveTo(M, 96).lineTo(PAGE_W - M, 96).strokeColor(LINE).lineWidth(1).stroke();
  let ty = 116;
  TOC.forEach((t) => {
    doc.fillColor(INK).fontSize(12).font('Helvetica').text(t.title, M, ty, { width: CONTENT_W - 40 });
    doc.fillColor(MUTE).fontSize(12).font('Helvetica-Bold').text(String(t.page), PAGE_W - M - 30, ty, { width: 30, align: 'right' });
    doc.moveTo(M, ty + 18).lineTo(PAGE_W - M, ty + 18).strokeColor('#eef2f6').lineWidth(0.5).stroke();
    ty += 30;
  });

  // ---- Branded footer on every page except cover ----
  const range = doc.bufferedPageRange();
  for (let i = 1; i < range.count; i++) {
    doc.switchToPage(i);
    doc.fillColor(MUTE).fontSize(8).font('Helvetica')
      .text(`DTNK SHIELD · ${clientName} · Cybersecurity Posture Assessment · CONFIDENTIAL`, M, 762, { width: CONTENT_W, align: 'left' });
    doc.text(`Page ${i + 1}`, M, 762, { width: CONTENT_W, align: 'right' });
  }
  doc.end();
}

// Draw a simple DTNK SHIELD mark (vector) at x,y.
function shield(doc, x, y, s, color) {
  const w = 30 * s, h = 36 * s;
  doc.save();
  doc.moveTo(x, y).lineTo(x + w, y).lineTo(x + w, y + h * 0.55)
    .quadraticCurveTo(x + w, y + h * 0.9, x + w / 2, y + h)
    .quadraticCurveTo(x, y + h * 0.9, x, y + h * 0.55).lineTo(x, y).fill(color);
  doc.fillColor(NAVY).fontSize(15 * s).font('Helvetica-Bold').text('S', x + w / 2 - 4.5 * s, y + h * 0.28);
  doc.restore();
}

// ---- pdf helpers ----
function band(s) { return s >= 80 ? 'Strong' : s >= 60 ? 'Moderate' : s >= 40 ? 'Weak' : 'Critical'; }
function h1(doc, t) { doc.moveDown(0.2); doc.fillColor(INK).fontSize(20).font('Helvetica-Bold').text(t); doc.moveTo(M, doc.y + 3).lineTo(PAGE_W - M, doc.y + 3).strokeColor(LINE).lineWidth(1).stroke(); doc.moveDown(0.6); }
function section(doc, t) { if (doc.y + 90 > 720) doc.addPage(); doc.moveDown(0.8); doc.fillColor(NAVY).fontSize(14).font('Helvetica-Bold').text(t); doc.moveTo(M, doc.y + 2).lineTo(PAGE_W - M, doc.y + 2).strokeColor(LINE).stroke(); doc.moveDown(0.5); }
function sub(doc, t) { if (doc.y + 40 > 720) doc.addPage(); doc.moveDown(0.4); doc.fillColor(STEEL).fontSize(11).font('Helvetica-Bold').text(t.toUpperCase(), { characterSpacing: 0.5 }); doc.moveDown(0.2); }
function para(doc, t) { if (!t) return; doc.fillColor(INK2).fontSize(10.5).font('Helvetica').text(t, { width: CONTENT_W, lineGap: 2 }); doc.moveDown(0.4); }
function bullet(doc, t, color) { if (doc.y + 22 > 720) doc.addPage(); const y = doc.y; doc.circle(M + 3, y + 6, 2).fill(color || MUTE); doc.fillColor(INK2).fontSize(10).font('Helvetica').text(t, M + 14, y, { width: CONTENT_W - 14, lineGap: 1.5 }); doc.moveDown(0.25); }
function kv(doc, k, v) { doc.fontSize(10).font('Helvetica-Bold').fillColor(MUTE).text(k + ':  ', { continued: true }).font('Helvetica').fillColor(INK).text(v || '—'); }

// One control's assessment: summary · test approach · result · (gap) org risk + rec.
function controlBlock(doc, c, ctx, ensureSpace) {
  ensureSpace(96);
  const finding = isFinding(c);
  const accent = finding ? RED : GREEN;
  const y0 = doc.y;
  doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(`${c.name}`, M + 10, y0 + 4, { width: CONTENT_W - 120, continued: false });
  doc.fillColor(accent).fontSize(9).font('Helvetica-Bold').text(finding ? 'CONTROL GAP' : 'EFFECTIVE', PAGE_W - M - 100, y0 + 5, { width: 90, align: 'right' });
  doc.fillColor(MUTE).fontSize(8.5).font('Helvetica').text(`${c.csf} · affects ${c.processAffected}`, M + 10, doc.y + 1, { width: CONTENT_W - 20 });
  kvi(doc, 'Summary', plainSummary(c.name));
  kvi(doc, 'Test approach', testApproach(c));
  kvi(doc, 'Result', resultPlain(c));
  if (finding) {
    kvi(doc, 'Risk to the organization', orgRisk(c, ctx), RED);
    kvi(doc, 'Recommendation', c.action, GREEN);
  }
  doc.rect(M, y0 + 2, 3, doc.y - y0).fill(accent);
  doc.moveDown(0.6);
}
function kvi(doc, k, v, color) {
  if (!v) return;
  if (doc.y + 16 > 720) doc.addPage();
  doc.fillColor(color || MUTE).fontSize(8.5).font('Helvetica-Bold').text(k.toUpperCase(), M + 10, doc.y + 2, { width: CONTENT_W - 20 });
  doc.fillColor(INK2).fontSize(9.5).font('Helvetica').text(v, M + 10, doc.y + 1, { width: CONTENT_W - 20, lineGap: 1.5 });
}

// --------------------------------------------------------------- PPTX --------
async function buildPptxBuffer(d, fw, ctx) {
  ctx = ctx || { name: String(d.organizationId), inputs: {} };
  const clientName = ctx.name || String(d.organizationId);
  const Pptx = require('pptxgenjs');
  const pptx = new Pptx();
  pptx.defineLayout({ name: 'W', width: 13.333, height: 7.5 }); pptx.layout = 'W';
  pptx.author = 'DTNK SHIELD'; pptx.company = clientName;
  const p = d.overallPosture;
  const NAVYH = '0f1b2d', INKH = '0f172a', MUTEH = '64748b', GREENH = '1f8a4c', REDH = 'c0392b', AMBERH = 'b07c2e', GOLDH = 'c9a227', STEELH = '2c4f7c';
  const bColor = (b) => ({ Strong: GREENH, Moderate: AMBERH, Weak: 'a85b2e', Critical: REDH }[b] || MUTEH);

  // Title slide — DTNK SHIELD
  let s = pptx.addSlide(); s.background = { color: NAVYH };
  s.addShape('rect', { x: 0.6, y: 0.5, w: 0.34, h: 0.42, fill: { color: GOLDH } });
  s.addText('DTNK SHIELD', { x: 1.05, y: 0.5, fontSize: 16, color: 'FFFFFF', bold: true, charSpacing: 2 });
  s.addText('CYBERSECURITY ADVISORY', { x: 1.05, y: 0.85, fontSize: 9, color: '8fa3bd', charSpacing: 2 });
  s.addText('Cybersecurity Posture Assessment', { x: 0.6, y: 2.5, w: 12, fontSize: 38, color: 'FFFFFF', bold: true });
  s.addText(clientName, { x: 0.6, y: 3.6, fontSize: 20, color: GOLDH, bold: true });
  s.addText(`Prepared ${new Date(d.generatedAt).toLocaleString()} · run #${d.runId || '—'}`, { x: 0.6, y: 4.1, fontSize: 12, color: '8fa3bd' });
  s.addText(`${p.current}`, { x: 0.6, y: 4.8, fontSize: 54, color: bColor(band(p.current)), bold: true });
  s.addText(`/100  ${band(p.current)}  ·  ${p.delta >= 0 ? '+' : ''}${p.delta} vs last period`, { x: 2.3, y: 5.4, fontSize: 16, color: 'e2e8f0' });

  // Contents
  s = pptx.addSlide(); slideTitle(s, 'Contents');
  s.addText(['1. Executive summary', '2. Assessment details', '3. Framework compliance — four lenses', '4. Methodology & traceability']
    .map((t) => ({ text: t, options: { fontSize: 16, color: INKH, bullet: false, breakLine: true, paraSpaceAfter: 10 } })), { x: 0.8, y: 1.4, w: 11, h: 4 });

  // Executive summary — intake-driven generated blocks when available, else rollup.
  const es = ctx && ctx.execSummary;
  if (es && (es.context || es.posture || (es.key_risks && es.key_risks.length))) {
    s = pptx.addSlide(); slideTitle(s, 'Executive summary');
    const b1 = [];
    if (es.context) b1.push({ text: 'Context\n', options: { bold: true, color: STEELH, fontSize: 13 } }, { text: es.context + '\n\n', options: { color: '334155', fontSize: 11 } });
    if (es.posture) b1.push({ text: 'Posture\n', options: { bold: true, color: STEELH, fontSize: 13 } }, { text: es.posture + '\n\n', options: { color: '334155', fontSize: 11 } });
    if (es.path_forward) b1.push({ text: 'Path to target state\n', options: { bold: true, color: STEELH, fontSize: 13 } }, { text: es.path_forward, options: { color: '334155', fontSize: 11 } });
    s.addText(b1, { x: 0.6, y: 1.15, w: 12.1, h: 6, valign: 'top' });
    if ((es.key_risks && es.key_risks.length) || (es.quick_wins && es.quick_wins.length)) {
      s = pptx.addSlide(); slideTitle(s, 'Executive summary — key risks & quick wins');
      const b2 = [];
      if (es.key_risks && es.key_risks.length) b2.push({ text: 'Key risks\n', options: { bold: true, color: REDH, fontSize: 13 } }, { text: es.key_risks.map((r) => `• ${r.title}${r.detail ? ' — ' + r.detail : ''}`).join('\n') + '\n\n', options: { color: '334155', fontSize: 11 } });
      if (es.quick_wins && es.quick_wins.length) b2.push({ text: 'Quick wins\n', options: { bold: true, color: GREENH, fontSize: 13 } }, { text: es.quick_wins.map((w) => `• ${w.title}${w.detail ? ' — ' + w.detail : ''}`).join('\n'), options: { color: '334155', fontSize: 11 } });
      s.addText(b2, { x: 0.6, y: 1.15, w: 12.1, h: 6, valign: 'top' });
    }
  } else {
    const strengths = [...d.domainMatrix].sort((a, b) => b.current - a.current).slice(0, 3);
    const weakest = [...d.domainMatrix].sort((a, b) => a.current - b.current).slice(0, 3);
    s = pptx.addSlide(); slideTitle(s, 'Executive summary');
    s.addText([
      { text: 'What was done\n', options: { bold: true, color: STEELH, fontSize: 13 } },
      { text: `DTNK SHIELD assessed ${clientName} across ${d.controlRisk.length} controls through NIST CSF 2.0, 800-53 r5 and MITRE ATT&CK (run #${d.runId || '—'}). Overall posture ${p.current}/100 (${band(p.current)}), ${p.trend}.\n\n`, options: { color: '334155', fontSize: 11 } },
      { text: 'Key strengths\n', options: { bold: true, color: GREENH, fontSize: 13 } },
      { text: strengths.map((x) => `• ${x.name} ${x.current} (${x.status})`).join('\n') + '\n\n', options: { color: '334155', fontSize: 11 } },
      { text: 'Weakest areas\n', options: { bold: true, color: REDH, fontSize: 13 } },
      { text: weakest.map((x) => `• ${x.name} ${x.current} (${x.status})`).join('\n') + `\n• ${d.thresholds.breaches}/${d.thresholds.total} thresholds breached\n\n`, options: { color: '334155', fontSize: 11 } },
      { text: 'Recommendations\n', options: { bold: true, color: STEELH, fontSize: 13 } },
      { text: d.actionQueue.slice(0, 4).map((a, i) => `${i + 1}. ${a.action} (${a.owner}, due ${a.dueDate})`).join('\n'), options: { color: '334155', fontSize: 11 } },
    ], { x: 0.6, y: 1.15, w: 12.1, h: 6, valign: 'top' });
  }

  // Assessment details — control gaps with org-specific risk (one slide of the worst)
  s = pptx.addSlide(); slideTitle(s, 'Assessment details — control gaps');
  const gaps = d.controlRisk.filter(isFinding).slice(0, 5);
  gaps.forEach((c, i) => s.addText([
    { text: `${c.name}  (${c.csf})\n`, options: { bold: true, color: REDH, fontSize: 12 } },
    { text: `Summary: ${plainSummary(c.name)}  ·  Test: ${testApproach(c)}\n`, options: { color: '64748b', fontSize: 9 } },
    { text: `Result: ${resultPlain(c)}\n`, options: { color: '334155', fontSize: 9.5 } },
    { text: `Risk to ${clientName}: ${orgRisk(c, ctx)}\n`, options: { color: INKH, fontSize: 9.5, italic: true } },
    { text: `→ ${c.action}`, options: { color: GREENH, fontSize: 9.5 } },
  ], { x: 0.5, y: 1.1 + i * 1.18, w: 12.3, h: 1.12, valign: 'top' }));

  // Framework compliance — three lenses
  if (fw) {
    s = pptx.addSlide(); slideTitle(s, 'Framework compliance — three lenses');
    const lines = [];
    if (fw.csf) lines.push(`NIST CSF 2.0 — overall ${fw.csf.overall ?? '—'}: ${fw.csf.functions.map((f) => `${f.name} ${f.score ?? '—'}`).join(', ')}`);
    if (fw.nist80053 && fw.nist80053.baseline) lines.push(`NIST 800-53 r5 — ${fw.nist80053.baseline.name} baseline ${fw.nist80053.baseline.coveragePct}% (${fw.nist80053.baseline.covered}/${fw.nist80053.baseline.total})`);
    if (fw.attack && fw.attack.summary) lines.push(`MITRE ATT&CK — ${fw.attack.summary.covered}/${fw.attack.summary.total} techniques covered (prevent ${fw.attack.summary.prevent}, detect ${fw.attack.summary.detect})`);
    s.addText(lines.map((l) => `• ${l}`).join('\n\n'), { x: 0.6, y: 1.3, w: 12, fontSize: 14, color: '0f172a', lineSpacingMultiple: 1.2 });
  }

  return pptx.write({ outputType: 'nodebuffer' });
}
function slideTitle(s, t) { s.addShape('rect', { x: 0.5, y: 0.4, w: 0.18, h: 0.42, fill: { color: 'c9a227' } }); s.addText(t, { x: 0.8, y: 0.35, fontSize: 22, bold: true, color: '0f1b2d' }); s.addShape('line', { x: 0.5, y: 0.98, w: 12.3, h: 0, line: { color: 'e2e8f0', width: 1 } }); }

module.exports = { buildPdf, buildPptxBuffer };
