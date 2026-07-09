'use strict';

/**
 * AuditorPackBuilder — the per-framework "Generate auditor pack (PPTX)" deck.
 * ---------------------------------------------------------------------------
 * Renders the §8 auditor-pack structure from the SAME assessment the Frameworks
 * tab shows: the client posts the computed Metric/Finding records (scores, groups,
 * register, findings, roadmap, mapping, evidence) and this builds a McKinsey-clean,
 * auditor-ready deck. Nothing numeric is typed here that doesn't come from the
 * payload — the deck is a rendering of the same assessment, so it matches the tab.
 *
 * Licensing safeguards (§6): the payload for CIS/SOC 2 carries only numbers/titles/
 * criterion IDs and mappings — this builder renders whatever it is given and never
 * synthesizes proprietary control text.
 *
 * Slides: Cover · Basis & scope · Executive summary · Approach & CMMI scale ·
 * Family/function maturity (chart) · Findings register (table) · one detail slide
 * per deficiency · Observations · Remediation roadmap · Appendix A (mapping) ·
 * Appendix B (evidence + assurance basis + notices).
 */

// Palette (per §8 build rules) — hex without '#'.
const NAVY = '10406A', DEEPNAVY = '0A2233', ACCENT = '38BDF8';
const GREEN = '1E8E5A', AMBER = 'B7791F', RED = 'C0392B';
const INK = '1E2A3A', MUTE = '6B7A8D', LINE = 'D9E1EC', PANEL = 'F4F7FC', WHITE = 'FFFFFF';
const HEAD = 'Arial', BODY = 'Calibri';

const clsColor = (c) => ({ meets: GREEN, 'meets target': GREEN, observation: AMBER, deficiency: RED }[String(c || '').toLowerCase()] || MUTE);
const sc1 = (n) => (Number(n) || 0).toFixed(1);
const S = (v, d) => (v == null || v === '' ? (d || '—') : String(v));
const arr = (v) => (Array.isArray(v) ? v : []);

// ---- slide chrome ----------------------------------------------------------
function footer(s, pageNo, client) {
  s.addShape('line', { x: 0.5, y: 7.05, w: 12.33, h: 0, line: { color: LINE, width: 0.75 } });
  s.addText(`CONFIDENTIAL · ${S(client, 'Client')} · Nerion auditor pack`, { x: 0.5, y: 7.08, w: 9, h: 0.3, fontSize: 8, color: MUTE, fontFace: BODY });
  s.addText(String(pageNo), { x: 11.9, y: 7.08, w: 0.9, h: 0.3, fontSize: 8, color: MUTE, align: 'right', fontFace: BODY });
}
function title(s, kicker, t) {
  s.addShape('rect', { x: 0.5, y: 0.42, w: 0.14, h: 0.44, fill: { color: ACCENT } });
  if (kicker) s.addText(String(kicker).toUpperCase(), { x: 0.8, y: 0.34, w: 11.8, h: 0.24, fontSize: 9, color: MUTE, charSpacing: 2, fontFace: HEAD });
  s.addText(t, { x: 0.8, y: 0.52, w: 11.8, h: 0.5, fontSize: 22, bold: true, color: DEEPNAVY, fontFace: HEAD });
  s.addShape('line', { x: 0.5, y: 1.12, w: 12.33, h: 0, line: { color: LINE, width: 1 } });
}
function chip(s, x, y, text, color) {
  const w = Math.max(0.9, 0.14 + String(text).length * 0.075);
  s.addShape('roundRect', { x, y, w, h: 0.3, rectRadius: 0.06, fill: { color: PANEL }, line: { color, width: 1 } });
  s.addText(String(text), { x, y, w, h: 0.3, fontSize: 9.5, bold: true, color, align: 'center', valign: 'middle', fontFace: HEAD });
  return w;
}

async function buildPptxBuffer(payload) {
  payload = payload || {};
  const Pptx = require('pptxgenjs');
  const pptx = new Pptx();
  pptx.defineLayout({ name: 'W', width: 13.333, height: 7.5 }); pptx.layout = 'W';
  pptx.author = 'Nerion · DTNKShield'; pptx.company = S(payload.client, 'Client');
  pptx.subject = `${S(payload.standard, 'Framework')} maturity assessment`;

  const std = S(payload.standard, 'Framework');
  const client = S(payload.client, 'Client');
  const period = S(payload.period, new Date().toISOString().slice(0, 10));
  const cadence = S(payload.cadence, 'monthly');
  const overall = sc1(payload.overall);
  const target = sc1(payload.target != null ? payload.target : 3.5);
  const groups = arr(payload.groups);
  const register = arr(payload.register);
  const findings = arr(payload.findings);
  const deficiencies = findings.filter((f) => /deficiency/i.test(f.classification || ''));
  const observations = findings.filter((f) => /observation/i.test(f.classification || ''));
  const roadmap = arr(payload.roadmap);
  const mapping = arr(payload.mapping);
  const evidence = arr(payload.evidence);
  const licensing = arr(payload.licensing);
  const failing = payload.failing != null ? payload.failing : deficiencies.length;
  let pg = 0;
  const S_ = () => { const s = pptx.addSlide(); s.background = { color: WHITE }; pg += 1; return s; };

  // 1 · Cover -----------------------------------------------------------------
  {
    const s = pptx.addSlide(); s.background = { color: DEEPNAVY }; pg += 1;
    s.addShape('rect', { x: 0.6, y: 0.55, w: 0.32, h: 0.4, fill: { color: ACCENT } });
    s.addText('NERION', { x: 1.02, y: 0.54, fontSize: 15, bold: true, color: WHITE, charSpacing: 2, fontFace: HEAD });
    s.addText('CYBER BUSINESS OPERATIONS PLATFORM', { x: 1.02, y: 0.86, fontSize: 8, color: '8FA3BD', charSpacing: 2, fontFace: HEAD });
    s.addText(`${std}${payload.version ? '  ' + payload.version : ''}`, { x: 0.6, y: 2.4, w: 12, fontSize: 34, bold: true, color: WHITE, fontFace: HEAD });
    s.addText('Maturity assessment · auditor pack', { x: 0.6, y: 3.25, w: 12, fontSize: 18, color: ACCENT, fontFace: HEAD });
    // overall maturity chip
    s.addShape('roundRect', { x: 0.6, y: 4.2, w: 3.3, h: 1.2, rectRadius: 0.08, fill: { color: '16263B' } });
    s.addText(overall, { x: 0.8, y: 4.35, w: 1.6, h: 0.9, fontSize: 46, bold: true, color: clsColor(payload.overallStatus || (Number(overall) >= Number(target) ? 'meets' : Number(overall) >= 2.5 ? 'observation' : 'deficiency')), valign: 'middle', fontFace: HEAD });
    s.addText([{ text: '/ 5  overall CMMI\n', options: { fontSize: 12, color: 'E2E8F0' } }, { text: `${S(payload.overallLevel, '')} · target ${target}`, options: { fontSize: 11, color: '8FA3BD' } }], { x: 2.5, y: 4.45, w: 1.4, h: 0.9, valign: 'middle', fontFace: BODY });
    s.addText(`Client: ${client}   ·   Period: ${period}   ·   Cadence: ${cadence}`, { x: 0.6, y: 5.7, w: 12, fontSize: 12, color: 'E2E8F0', fontFace: BODY });
    s.addText('CONFIDENTIAL — prepared for the named client', { x: 0.6, y: 6.9, w: 12, fontSize: 9, color: '64748B', fontFace: BODY });
  }

  // 2 · Basis & scope ---------------------------------------------------------
  {
    const s = S_(); title(s, 'Section 1', 'Basis & scope');
    const rows = [
      ['Standard', std],
      ['Method', S(payload.method, 'Continuous, evidence-based control assessment. Each control scored on CMMI 0–5 from live tool telemetry and analyzed policies; group scores are the evidence-weighted mean of their children.')],
      ['CMMI scale', '0 None · 1 Initial · 2 Managed · 3 Defined · 4 Quantitatively Managed · 5 Optimizing'],
      ['Classification rule', `Meets target ≥ ${target} · Observation ≥ 2.5 · Deficiency < 2.5 (may be escalated by control criticality)`],
      ['Assurance basis', 'Continuous management self-assessment — not an independent audit opinion.'],
    ];
    s.addTable(rows.map((r) => [
      { text: r[0], options: { bold: true, color: NAVY, fill: { color: PANEL }, fontSize: 11, fontFace: HEAD, valign: 'top' } },
      { text: r[1], options: { color: INK, fontSize: 11, fontFace: BODY, valign: 'top' } },
    ]), { x: 0.6, y: 1.35, w: 12.1, colW: [2.4, 9.7], border: { type: 'solid', color: LINE, pt: 0.5 }, autoPage: false });
    const notices = ['Licensing & public-standard notices:'].concat(licensing.length ? licensing : ['NIST CSF 2.0, NIST SP 800-53 and the HIPAA Security Rule are U.S. Government / public-domain. CIS Controls, ISO/IEC 27001 and SOC 2 are assessed natively by Nerion-authored evidence tests referenced by control ID only — no official CIS Safeguard, ISO clause or AICPA Trust Services Criteria text is stored, reproduced, paraphrased, or crosswalked from CSF. Licensed official text uploaded by the customer is retained tenant-only and never bundled into product defaults.']);
    if (payload.demoNote) notices.push('Demonstration data: figures are illustrative until the organization’s tools and policies are connected; each will resolve to live evidence of the same shape.');
    s.addText(notices.map((n, i) => ({ text: (i ? '• ' : '') + n + (i < notices.length - 1 ? '\n' : ''), options: { bold: i === 0, color: i === 0 ? NAVY : MUTE, fontSize: i === 0 ? 10.5 : 9.5 } })), { x: 0.6, y: 5.05, w: 12.1, h: 1.7, valign: 'top', fontFace: BODY });
    footer(s, pg, client);
  }

  // 3 · Executive summary -----------------------------------------------------
  {
    const s = S_(); title(s, 'Section 2', 'Executive summary');
    s.addText(S(payload.execNarrative, S(payload.verdict, `${std} is assessed at CMMI ${overall} of 5 against a ${target} target. ${deficiencies.length} deficienc${deficiencies.length === 1 ? 'y' : 'ies'} and ${observations.length} observation${observations.length === 1 ? '' : 's'} were identified; the roadmap below returns them to target.`)), { x: 0.6, y: 1.25, w: 12.1, h: 2.35, fontSize: 12, color: INK, valign: 'top', fontFace: BODY, lineSpacingMultiple: 1.08 });
    const stats = [
      ['Overall maturity', `${overall} / 5`, clsColor(Number(overall) >= Number(target) ? 'meets' : Number(overall) >= 2.5 ? 'observation' : 'deficiency')],
      ['Deficiencies', String(deficiencies.length), deficiencies.length ? RED : GREEN],
      ['Observations', String(observations.length), observations.length ? AMBER : GREEN],
      ['Trend · vs last refresh', S(payload.trendDelta, 'Baseline'), NAVY],
    ];
    stats.forEach((st, i) => {
      const x = 0.6 + i * 3.05;
      s.addShape('roundRect', { x, y: 3.75, w: 2.85, h: 1.3, rectRadius: 0.06, fill: { color: PANEL }, line: { color: LINE, width: 0.75 } });
      s.addText(st[0], { x: x + 0.18, y: 3.85, w: 2.5, h: 0.5, fontSize: 10, color: MUTE, fontFace: HEAD });
      s.addText(st[1], { x: x + 0.18, y: 4.22, w: 2.5, h: 0.7, fontSize: 26, bold: true, color: st[2], fontFace: HEAD, valign: 'middle' });
    });
    s.addText([{ text: 'Priority recommendation  ', options: { bold: true, color: NAVY, fontSize: 12 } }, { text: S(payload.headlineRec, 'Prioritise the highest-criticality deficiencies; each is scoped with a target uplift and timeframe in the remediation roadmap.'), options: { color: INK, fontSize: 12 } }], { x: 0.6, y: 5.3, w: 12.1, h: 1.4, valign: 'top', fontFace: BODY });
    footer(s, pg, client);
  }

  // 3b · Scope & objectives ---------------------------------------------------
  if (payload.scopeProse) {
    const s = S_(); title(s, 'Section 3', 'Scope & objectives');
    s.addText(String(payload.scopeProse), { x: 0.6, y: 1.3, w: 12.1, h: 3.2, fontSize: 12.5, color: INK, valign: 'top', fontFace: BODY, lineSpacingMultiple: 1.12 });
    const rows = [
      ['Framework', std + (payload.version ? ' ' + payload.version : '')],
      ['Assessment backbone', S(payload.backbone)],
      ['Controls in scope', `${payload.total != null ? payload.total : register.length}  (${payload.evidenced != null ? payload.evidenced : '—'} evidenced)`],
      ['Assessment cadence', cadence],
    ];
    s.addTable(rows.map((r) => [
      { text: r[0], options: { bold: true, color: NAVY, fill: { color: PANEL }, fontSize: 10.5, fontFace: HEAD, valign: 'top' } },
      { text: r[1], options: { color: INK, fontSize: 10.5, fontFace: BODY, valign: 'top' } },
    ]), { x: 0.6, y: 4.7, w: 12.1, colW: [2.6, 9.5], border: { type: 'solid', color: LINE, pt: 0.5 } });
    footer(s, pg, client);
  }

  // 4 · Approach & CMMI scale -------------------------------------------------
  {
    const s = S_(); title(s, 'Section 4', 'Methodology & rating scale');
    s.addText(S(payload.methodologyProse, 'Continuous, evidence-based assessment: each control scored 0–5 from live tool telemetry and analysed policies, rolled up subcategory → category → function/family; mapped frameworks derive from the source assessment via the public crosswalk.'), { x: 0.6, y: 1.3, w: 12.1, h: 1.9, fontSize: 11.5, color: INK, valign: 'top', fontFace: BODY, lineSpacingMultiple: 1.08 });
    const lvl = [['Level', 'Name', 'Meaning'], ['0', 'None', 'No evidence on file'], ['1', 'Initial', 'Ad-hoc / reactive'], ['2', 'Managed', 'Repeatable but not standardized'], ['3', 'Defined', 'Documented & standardized'], ['4', 'Quant. Managed', 'Measured & controlled'], ['5', 'Optimizing', 'Continuously improving']];
    s.addTable(lvl.map((r, i) => r.map((c) => ({ text: c, options: { bold: i === 0, color: i === 0 ? WHITE : INK, fill: { color: i === 0 ? NAVY : (i % 2 ? PANEL : WHITE) }, fontSize: 10.5, fontFace: i === 0 ? HEAD : BODY } }))), { x: 0.6, y: 3.35, w: 7.2, colW: [1.0, 2.2, 4.0], border: { type: 'solid', color: LINE, pt: 0.5 } });
    s.addText([{ text: 'Severity thresholds\n', options: { bold: true, color: NAVY, fontSize: 12 } },
      { text: `Meets target  ≥ ${target}\n`, options: { color: GREEN, fontSize: 12, bold: true } },
      { text: 'Observation  ≥ 2.5\n', options: { color: AMBER, fontSize: 12, bold: true } },
      { text: 'Deficiency  < 2.5\n', options: { color: RED, fontSize: 12, bold: true } },
      { text: 'Severity may be escalated by control criticality (e.g. a Required HIPAA specification) even near the floor.', options: { color: MUTE, fontSize: 10 } }],
      { x: 8.2, y: 3.35, w: 4.5, h: 3, valign: 'top', fontFace: BODY });
    footer(s, pg, client);
  }

  // 5 · Family / function maturity (column chart) -----------------------------
  {
    const s = S_(); title(s, 'Section 4', `${payload.groupNoun ? payload.groupNoun : 'Family / function'} maturity`);
    const gs = groups.slice(0, 12);
    if (gs.length) {
      const chartData = [{ name: 'Maturity', labels: gs.map((g) => g.id), values: gs.map((g) => Number(g.score) || 0) }];
      const colors = gs.map((g) => clsColor(g.status || (Number(g.score) >= Number(target) ? 'meets' : Number(g.score) >= 2.5 ? 'observation' : 'deficiency')));
      s.addChart(pptx.ChartType.bar, chartData, {
        x: 0.6, y: 1.35, w: 8.0, h: 5.3, barDir: 'col', chartColors: colors, showLegend: false, showValue: true, dataLabelColor: INK, dataLabelFontSize: 9,
        valAxisMinVal: 0, valAxisMaxVal: 5, valAxisMajorUnit: 1, catAxisLabelFontSize: 9, valAxisLabelFontSize: 9, catAxisLabelColor: INK, valAxisLabelColor: MUTE, valGridLine: { color: LINE, style: 'solid', size: 0.5 },
      });
      // status list on the right
      const list = gs.map((g) => {
        const st = g.status || (Number(g.score) >= Number(target) ? 'Meets target' : Number(g.score) >= 2.5 ? 'Observation' : 'Deficiency');
        return { text: `${g.id}  ${sc1(g.score)}  — ${st}\n`, options: { color: clsColor(st), fontSize: 10.5, bold: true } };
      });
      s.addText([{ text: 'By group\n', options: { bold: true, color: NAVY, fontSize: 12 } }].concat(list), { x: 8.9, y: 1.35, w: 3.9, h: 5.3, valign: 'top', fontFace: BODY, lineSpacingMultiple: 1.1 });
    } else {
      s.addText('No group scores in the assessment payload.', { x: 0.6, y: 1.4, w: 12, fontSize: 12, color: MUTE, fontFace: BODY });
    }
    s.addText(`Target ${target} · bars colored by classification.`, { x: 0.6, y: 6.65, w: 8, fontSize: 9, color: MUTE, fontFace: BODY });
    footer(s, pg, client);
  }

  // 5b · Gap analysis (current vs target, per domain) -------------------------
  if (arr(payload.gap).length) {
    const s = S_(); title(s, 'Section 6', 'Gap analysis · current vs target');
    s.addText(`Each ${S(payload.groupNoun, 'domain').toLowerCase()} is measured against the ${target} target. The gap column quantifies the maturity uplift required, and the priority reflects distance from the deficiency floor — the domains carrying the widest gaps are where the remediation roadmap concentrates first.`, { x: 0.6, y: 1.3, w: 12.1, h: 0.8, fontSize: 11.5, color: INK, valign: 'top', fontFace: BODY });
    const head = [S(payload.groupNoun, 'Domain'), 'Current', 'Target', 'Gap', 'Priority'];
    const rows = [head.map((h) => ({ text: h, options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 9.5, fontFace: HEAD } }))];
    arr(payload.gap).slice(0, 24).forEach((gp, i) => {
      const pc = /high/i.test(gp.priority) ? RED : /medium/i.test(gp.priority) ? AMBER : GREEN;
      rows.push([gp.domain, String(gp.current), String(gp.target), String(gp.gap), gp.priority].map((c, j) => ({
        text: String(c), options: { color: j === 4 ? pc : INK, bold: j === 4, fill: { color: i % 2 ? PANEL : WHITE }, fontSize: 9.5, fontFace: BODY, valign: 'top' },
      })));
    });
    s.addTable(rows, { x: 0.5, y: 2.25, w: 12.33, colW: [6.13, 1.4, 1.4, 1.4, 2.0], border: { type: 'solid', color: LINE, pt: 0.5 }, autoPage: true, autoPageRepeatHeader: true, newSlideStartY: 1.3 });
    footer(s, pg, client);
  }

  // 6 · Findings register (table) ---------------------------------------------
  {
    const s = S_(); title(s, 'Section 5', 'Findings register');
    const head = ['Ref', 'Control', payload.derivedLabel || 'Derived from', 'Maturity', 'Target', 'Classification'];
    const rows = [head.map((h) => ({ text: h, options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 9.5, fontFace: HEAD } }))];
    register.slice(0, 26).forEach((r, i) => {
      const cls = S(r.classification, Number(r.score) >= Number(r.target || target) ? 'Meets target' : Number(r.score) >= 2.5 ? 'Observation' : 'Deficiency');
      rows.push([r.ref, r.name, r.derivedFrom || '—', sc1(r.score), sc1(r.target != null ? r.target : target), cls].map((c, j) => ({
        text: String(c), options: { color: j === 5 ? clsColor(cls) : INK, bold: j === 5, fill: { color: i % 2 ? PANEL : WHITE }, fontSize: 9, fontFace: BODY, valign: 'top' },
      })));
    });
    s.addTable(rows, { x: 0.5, y: 1.3, w: 12.33, colW: [1.4, 4.6, 2.4, 1.3, 1.2, 1.43], border: { type: 'solid', color: LINE, pt: 0.5 }, autoPage: true, autoPageRepeatHeader: true, newSlideStartY: 1.3 });
    if (register.length > 26) s.addText(`Showing 26 of ${register.length} controls — the full register is in the assessment tab and Appendix.`, { x: 0.5, y: 6.7, w: 12, fontSize: 8.5, color: MUTE, fontFace: BODY });
    footer(s, pg, client);
  }

  // 6b · Risk register (findings as rated risks) ------------------------------
  if (arr(payload.riskRegister).length) {
    const s = S_(); title(s, 'Section 8', 'Risk register · findings as rated risks');
    s.addText('The findings above are restated here as risks, each rated on likelihood and impact to derive a severity. Severity is what drives the sequencing of the remediation roadmap: the high-severity risks are addressed first, and the treatment column states the control action that reduces each.', { x: 0.6, y: 1.3, w: 12.1, h: 0.8, fontSize: 11.5, color: INK, valign: 'top', fontFace: BODY });
    const head = ['Ref', 'Risk', 'Likelihood', 'Impact', 'Severity', 'Treatment'];
    const rows = [head.map((h) => ({ text: h, options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 9.5, fontFace: HEAD } }))];
    arr(payload.riskRegister).slice(0, 24).forEach((rk, i) => {
      const sc = /high/i.test(rk.severity) ? RED : /medium/i.test(rk.severity) ? AMBER : GREEN;
      rows.push([rk.ref, rk.risk, rk.likelihood, rk.impact, rk.severity, rk.treatment].map((c, j) => ({
        text: S(c), options: { color: j === 4 ? sc : INK, bold: j === 4, fill: { color: i % 2 ? PANEL : WHITE }, fontSize: 9, fontFace: BODY, valign: 'top' },
      })));
    });
    s.addTable(rows, { x: 0.5, y: 2.25, w: 12.33, colW: [1.2, 4.4, 1.3, 1.1, 1.2, 3.13], border: { type: 'solid', color: LINE, pt: 0.5 }, autoPage: true, autoPageRepeatHeader: true, newSlideStartY: 1.3 });
    footer(s, pg, client);
  }

  // 6c · Detailed findings — framework backbone intro -------------------------
  if (payload.detailedIntro && deficiencies.length) {
    const s = S_(); title(s, 'Section 9', 'Detailed findings by domain');
    s.addText(String(payload.detailedIntro), { x: 0.6, y: 1.3, w: 12.1, h: 4.5, fontSize: 12.5, color: INK, valign: 'top', fontFace: BODY, lineSpacingMultiple: 1.14 });
    footer(s, pg, client);
  }

  // 7..N · one detail slide per deficiency ------------------------------------
  const detailCap = 14;
  deficiencies.slice(0, detailCap).forEach((f) => {
    const s = S_(); title(s, 'Deficiency', `${S(f.ref)} — ${S(f.name)}`);
    chip(s, 0.8, 1.25, 'DEFICIENCY', RED);
    const blocks = [
      ['Condition', f.condition], ['Evidence tested', arr(f.evidence).join('; ') || f.evidenceText], ['Criteria', f.criteria],
      ['Cause', f.cause], ['Effect (risk)', f.effect], ['Recommendation', (f.recommendation || '') + (f.targetUplift ? `  — target uplift: ${f.targetUplift}` : '')],
    ];
    const body = [];
    blocks.forEach((b) => { if (b[1]) { body.push({ text: b[0].toUpperCase() + '\n', options: { bold: true, color: NAVY, fontSize: 10 } }); body.push({ text: b[1] + '\n\n', options: { color: INK, fontSize: 11 } }); } });
    if (arr(f.mappings).length) { body.push({ text: 'CROSS-FRAMEWORK MAPPING\n', options: { bold: true, color: NAVY, fontSize: 10 } }); body.push({ text: arr(f.mappings).join(' · '), options: { color: ACCENT, fontSize: 11 } }); }
    s.addText(body, { x: 0.8, y: 1.75, w: 11.8, h: 5, valign: 'top', fontFace: BODY });
    footer(s, pg, client);
  });
  if (deficiencies.length > detailCap) {
    const s = S_(); title(s, 'Deficiencies', 'Additional deficiencies');
    s.addText(`${deficiencies.length - detailCap} further deficienc${deficiencies.length - detailCap === 1 ? 'y is' : 'ies are'} listed in the findings register; detail slides shown for the ${detailCap} highest-priority items.`, { x: 0.6, y: 1.4, w: 12, fontSize: 12, color: INK, fontFace: BODY });
    footer(s, pg, client);
  }

  // Observations slide --------------------------------------------------------
  if (observations.length) {
    const s = S_(); title(s, 'Below target', 'Observations');
    const body = observations.slice(0, 10).map((o) => ([
      { text: `${S(o.ref)} — ${S(o.name)}  `, options: { bold: true, color: AMBER, fontSize: 11 } },
      { text: `(${sc1(o.score)} / 5)\n`, options: { color: MUTE, fontSize: 10 } },
      { text: `${S(o.condition || o.effect, 'Below target.')} → ${S(o.recommendation, 'Uplift toward target.')}\n\n`, options: { color: INK, fontSize: 10.5 } },
    ])).reduce((a, b) => a.concat(b), []);
    s.addText(body, { x: 0.6, y: 1.3, w: 12.1, h: 5.5, valign: 'top', fontFace: BODY });
    footer(s, pg, client);
  }

  // Prioritized recommendations & phased roadmap (0–3–6–12) -------------------
  {
    const s = S_(); title(s, 'Section 10', 'Prioritized recommendations & remediation roadmap');
    const rmap = arr(payload.roadmapPhased).length ? arr(payload.roadmapPhased) : roadmap;
    if (rmap.length) {
      s.addText('Recommendations are sequenced worst-first and phased across a 0–3, 3–6 and 6–12 month plan. The near-term phase captures the quick wins that most raise maturity for least effort; the later phases carry the strategic, higher-effort uplifts. Each item carries an owner, an effort estimate and the target maturity uplift on completion.', { x: 0.6, y: 1.3, w: 12.1, h: 0.9, fontSize: 11, color: INK, valign: 'top', fontFace: BODY });
      const head = ['#', 'Action', 'Owner', 'Effort', 'Target uplift', 'Phase'];
      const rows = [head.map((h) => ({ text: h, options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 9.5, fontFace: HEAD } }))];
      rmap.slice(0, 14).forEach((r, i) => {
        const ph = S(r.phase, r.timeframe);
        const pc = /0.?3/.test(ph) ? RED : /3.?6/.test(ph) ? AMBER : NAVY;
        rows.push([String(i + 1), r.action, r.owner, r.effort, r.uplift, ph].map((c, j) => ({ text: S(c), options: { color: j === 5 ? pc : INK, bold: j === 5, fill: { color: i % 2 ? PANEL : WHITE }, fontSize: 9.5, fontFace: BODY, valign: 'top' } })));
      });
      s.addTable(rows, { x: 0.5, y: 2.3, w: 12.33, colW: [0.7, 4.93, 2.0, 1.3, 1.8, 1.6], border: { type: 'solid', color: LINE, pt: 0.5 }, autoPage: true, autoPageRepeatHeader: true, newSlideStartY: 1.3 });
    } else {
      s.addText('No open remediation items — all controls meet target.', { x: 0.6, y: 1.4, w: 12, fontSize: 12, color: GREEN, fontFace: BODY });
    }
    if (payload.projectedUplift) s.addText(`Projected overall uplift on completion: ${payload.projectedUplift}.`, { x: 0.5, y: 6.6, w: 12, fontSize: 10, bold: true, color: NAVY, fontFace: BODY });
    footer(s, pg, client);
  }

  // Appendix A — derivation / mapping -----------------------------------------
  {
    const s = S_(); title(s, 'Appendix A', 'Derivation & mapping');
    s.addText(S(payload.mappingNote, 'Where this framework is mapped, each requirement inherits the maturity of the source-framework controls it maps to (mean of mapped scores). Public crosswalk only — no proprietary control text is reproduced.'), { x: 0.6, y: 1.3, w: 12.1, h: 0.7, fontSize: 11, color: INK, fontFace: BODY });
    if (mapping.length) {
      const head = ['This framework', 'Requirement', 'Source (CSF 2.0) controls'];
      const rows = [head.map((h) => ({ text: h, options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 9.5, fontFace: HEAD } }))];
      mapping.slice(0, 22).forEach((m, i) => rows.push([m.ref, m.name, arr(m.sources).join(' · ')].map((c) => ({ text: S(c), options: { color: INK, fill: { color: i % 2 ? PANEL : WHITE }, fontSize: 9, fontFace: BODY, valign: 'top' } }))));
      s.addTable(rows, { x: 0.5, y: 2.05, w: 12.33, colW: [2.0, 5.5, 4.83], border: { type: 'solid', color: LINE, pt: 0.5 }, autoPage: true, autoPageRepeatHeader: true, newSlideStartY: 1.3 });
    } else {
      s.addText('This framework is assessed directly (not mapped) — controls are scored from evidence, not derived.', { x: 0.6, y: 2.1, w: 12, fontSize: 11, color: MUTE, fontFace: BODY });
    }
    footer(s, pg, client);
  }

  // Appendix B — evidence register + assurance basis + notices ----------------
  {
    const s = S_(); title(s, 'Appendix B', 'Evidence register & assurance basis');
    if (evidence.length) {
      const head = ['Area', 'Evidence tested'];
      const rows = [head.map((h) => ({ text: h, options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 9.5, fontFace: HEAD } }))];
      evidence.slice(0, 18).forEach((e, i) => rows.push([e.area, e.evidence].map((c) => ({ text: S(c), options: { color: INK, fill: { color: i % 2 ? PANEL : WHITE }, fontSize: 9.5, fontFace: BODY, valign: 'top' } }))));
      s.addTable(rows, { x: 0.5, y: 1.3, w: 7.6, colW: [2.4, 5.2], border: { type: 'solid', color: LINE, pt: 0.5 } });
    }
    const notices = ['Continuous management self-assessment — not an independent audit opinion.'].concat(licensing.length ? licensing : []);
    s.addText([{ text: 'Assurance basis & notices\n', options: { bold: true, color: NAVY, fontSize: 12 } }].concat(notices.map((n) => ({ text: '• ' + n + '\n', options: { color: MUTE, fontSize: 10 } }))).concat([{ text: `\nContact: dtnkshield.com`, options: { color: INK, fontSize: 10 } }]), { x: 8.3, y: 1.3, w: 4.5, h: 5, valign: 'top', fontFace: BODY });
    footer(s, pg, client);
  }

  return pptx.write({ outputType: 'nodebuffer' });
}

module.exports = { buildPptxBuffer };
