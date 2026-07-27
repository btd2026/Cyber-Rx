/* Nerion — board read-out deck generator (PPTX). Builds a McKinsey-style 12–15 slide
   maturity-assessment deck from the LIVE assessment for the selected framework, in the
   language the cockpit is set to. Structure follows the DTNK assessment-report skeleton:
   cover → scope & limitations → executive summary → function scorecard → current state →
   findings → roadmap → board summary → method. Self-contained; PptxGenJS is vendored. */
(function () {
  function T(k, p) { return (typeof c5osT === 'function') ? c5osT(k, p) : ((typeof nt === 'function') ? nt(k, p) : k); }
  function esc(s) { return String(s == null ? '' : s); }
  // McKinsey-ish palette (hex, no #). Restrained: ink text, one blue accent, status trio.
  var C = { ink: '17233A', body: '3A4658', muted: '8A94A6', accent: '1F4E9C', accent2: '2D6CDF',
    good: '1F9D6B', warn: 'D98A0B', crit: 'C6413B', line: 'D9DFE8', panel: 'F4F6FA', white: 'FFFFFF', band: '17233A' };
  var FONT = 'Arial', SERIF = 'Georgia';
  function scoreColor(v) { return v >= 3.5 ? C.good : v >= 2.5 ? C.warn : C.crit; }
  function fnFull(id) { return { GV: 'Govern', ID: 'Identify', PR: 'Protect', DE: 'Detect', RS: 'Respond', RC: 'Recover' }[id]; }
  // Only the six CSF functions have a tailored business-consequence line; everything else (ISO/CIS
  // domains, AI RMF functions) uses the generic one so a missing key never leaks a raw token.
  function consKey(id) { return ({ GV: 1, ID: 1, PR: 1, DE: 1, RS: 1, RC: 1 })[id] ? id : 'GEN'; }

  // ── Gather the deck's data from the live model for one framework ──
  function deckData(fwKey) {
    var scope = (typeof c5Scope === 'function') ? c5Scope() : 'enterprise';
    var scopeLbl = (scope === 'enterprise') ? T('scope.enterprise') : ((typeof scopeLabel === 'function') ? scopeLabel(scope) : scope);
    var client = (typeof orgName === 'function' && orgName()) || 'the organization';
    var isCsfLike = (fwKey === 'csf' || fwKey === 'ai');
    var label = { csf: 'NIST CSF 2.0', ai: 'NIST AI RMF', iso: 'ISO/IEC 27001', cis: 'CIS Controls v8' }[fwKey] || fwKey;
    var total = 0, evidenced = 0, notMet = 0, overall5 = 0, functions = [], nameMap = {};
    var sv = (typeof C5_ASSESS_FW !== 'undefined') ? C5_ASSESS_FW : 'csf';
    try {
      window.C5_SCOPE_FWKEY = fwKey;
      if (isCsfLike) {
        C5_ASSESS_FW = fwKey;
        var s = (typeof c5AssessmentSummary === 'function') ? c5AssessmentSummary() : { total: 0, notMet: 0, notAssessed: 0 };
        total = s.total || 0; notMet = s.notMet || 0; evidenced = total - (s.notAssessed || 0);
        ['GV', 'ID', 'PR', 'DE', 'RS', 'RC', 'GOVERN', 'MAP', 'MEASURE', 'MANAGE'].forEach(function (k) { nameMap[k] = fnFull(k) || k; });
      } else {
        var T2 = (typeof c5fwTree === 'function') ? c5fwTree(fwKey, (typeof fwDeployedIds === 'function') ? fwDeployedIds() : {}) : { groups: [], total: 0, evidenced: 0 };
        total = T2.total || 0; evidenced = T2.evidenced || 0;
        var leaves = []; (T2.groups || []).forEach(function (g) { nameMap[String(g.id)] = String(g.name || '').replace(/^[^·]*·\s*/, '') || String(g.id); (g.children || []).forEach(function (c) { leaves.push(c); }); });
        notMet = leaves.filter(function (c) { return c.tested !== false && c.src && c.src !== 'none' && c.src !== 'native-pending' && (c.score || 0) < 1; }).length;
      }
      var agg = (typeof scopeAggTree === 'function') ? scopeAggTree(scope) : null;
      if (agg && agg.overall != null) {
        overall5 = agg.overall;
        functions = (agg.groups || []).map(function (g) { var sc = g.score || 0; return { id: g.id, name: nameMap[String(g.id)] || fnFull(g.id) || g.id, score: sc, target: 3.5, gap: Math.max(0, 3.5 - sc) }; });
      }
    } catch (_) {} finally { C5_ASSESS_FW = sv; }
    functions.sort(function (a, b) { return a.score - b.score; });
    var covPct = total ? Math.round(evidenced / total * 100) : 0;
    var vLevel = (typeof c5fwLvl === 'function') ? c5fwLvl(overall5) : '';
    var vCmmi = (typeof c5cmmiLevel === 'function') ? c5cmmiLevel(overall5) : Math.floor(overall5);
    return { fwKey: fwKey, label: label, client: client, scope: scope, scopeLbl: scopeLbl, overall5: overall5, target: 3.5,
      vLevel: vLevel, vLevelT: T('deck.lvl.'+vCmmi), vCmmi: vCmmi, covPct: covPct, total: total, evidenced: evidenced, notMet: notMet,
      functions: functions, findings: deckFindings(fwKey, functions), date: new Date().toLocaleDateString() };
  }

  // Material findings: the weakest functions, each paired with the capability that raises it
  // (from the same lever model the Decisions tab uses). Weighted-priority order = weakest first.
  function deckFindings(fwKey, functions) {
    var levers = []; try { if (typeof c5Levers === 'function') levers = c5Levers(); } catch (_) {}
    var fnScore = {}; functions.forEach(function (f) { fnScore[String(f.id).toUpperCase()] = f.score; fnScore[String(f.id)] = f.score; });
    function weakFn(l) { var best = null; (l.proj || []).forEach(function (p) { var f = String(p.id || '').split('.')[0]; if (fnScore[f] != null && (best == null || fnScore[f] < fnScore[best])) best = f; }); return best; }
    var ranked = levers.slice().sort(function (a, b) { var wa = weakFn(a), wb = weakFn(b); var sa = wa ? fnScore[wa] : 99, sb = wb ? fnScore[wb] : 99; return (sa - sb) || (b.gain - a.gain); });
    return ranked.slice(0, 5).map(function (l, i) {
      var wf = weakFn(l), sc = wf ? fnScore[wf] : null, fn = wf ? (fnFull(wf) || wf) : '';
      return { id: 'F-' + ('00' + (i + 1)).slice(-3), title: l.name, fn: fn, fnId: wf, score: sc,
        need: (typeof c5osT === 'function' && l.k) ? c5osT('dec.need.' + l.k) : (l.need || ''),
        consequence: T('deck.cons.' + consKey(wf)), priority: (sc != null && sc < 1.5) ? 'High' : (sc != null && sc < 2.5) ? 'Medium' : 'Low',
        n: (l.proj || []).length };
    });
  }

  // ── Slide chrome ──
  function footer(slide, d, page) {
    slide.addShape('line', { x: 0.5, y: 7.05, w: 12.33, h: 0, line: { color: C.line, width: 0.75 } });
    slide.addText([{ text: d.client + '  ·  ', options: { color: C.muted } }, { text: d.label, options: { color: C.muted } },
      { text: '  ·  ' + d.date + '  ·  ', options: { color: C.muted } }, { text: T('deck.footer.conf'), options: { color: C.accent, bold: true } }],
      { x: 0.5, y: 7.08, w: 10.5, h: 0.3, fontSize: 8, fontFace: FONT, align: 'left', valign: 'middle' });
    slide.addText(String(page), { x: 12.2, y: 7.08, w: 0.6, h: 0.3, fontSize: 8, color: C.muted, fontFace: FONT, align: 'right', valign: 'middle' });
  }
  // Action-title header: small-caps kicker, bold takeaway title, accent rule.
  function head(slide, kicker, title) {
    slide.addText(esc(kicker).toUpperCase(), { x: 0.5, y: 0.36, w: 12.33, h: 0.28, fontSize: 10.5, bold: true, color: C.accent, charSpacing: 2, fontFace: FONT });
    slide.addText(esc(title), { x: 0.5, y: 0.66, w: 12.33, h: 0.7, fontSize: 20, bold: true, color: C.ink, fontFace: FONT, valign: 'top' });
    slide.addShape('line', { x: 0.5, y: 1.42, w: 12.33, h: 0, line: { color: C.accent, width: 1.75 } });
  }
  function chip(slide, x, y, w, label, val, color, sub) {
    slide.addShape('rect', { x: x, y: y, w: w, h: 1.5, fill: { color: C.panel }, line: { color: C.line, width: 0.75 }, rectRadius: 0.06 });
    slide.addText(esc(label).toUpperCase(), { x: x + 0.15, y: y + 0.12, w: w - 0.3, h: 0.25, fontSize: 8.5, bold: true, color: C.muted, charSpacing: 1, fontFace: FONT });
    slide.addText(esc(val), { x: x + 0.15, y: y + 0.36, w: w - 0.3, h: 0.7, fontSize: 30, bold: true, color: color || C.ink, fontFace: FONT });
    if (sub) slide.addText(esc(sub), { x: x + 0.15, y: y + 1.08, w: w - 0.3, h: 0.35, fontSize: 9.5, color: C.body, fontFace: FONT });
  }

  // ── Deck ──
  function build(fwKey) {
    if (typeof window.PptxGenJS !== 'function') { alert('PowerPoint engine not loaded.'); return; }
    var d = deckData(fwKey);
    var pptx = new window.PptxGenJS();
    pptx.defineLayout({ name: 'NER', width: 13.333, height: 7.5 }); pptx.layout = 'NER';
    pptx.author = 'Nerion'; pptx.company = d.client; pptx.title = d.label + ' — ' + T('deck.cover.sub', { fw: d.label });
    var below = d.overall5 < 3.5;
    var readCol = scoreColor(d.overall5);

    // 1 — Cover
    var s = pptx.addSlide();
    s.background = { color: C.white };
    s.addShape('rect', { x: 0, y: 0, w: 13.333, h: 2.25, fill: { color: C.band } });
    s.addText('NERION', { x: 0.6, y: 0.5, w: 6, h: 0.4, fontSize: 13, bold: true, color: C.white, charSpacing: 3, fontFace: FONT });
    s.addText(esc(d.client), { x: 0.6, y: 2.7, w: 12, h: 0.9, fontSize: 34, bold: true, color: C.ink, fontFace: SERIF });
    s.addText(T('deck.cover.sub', { fw: d.label }), { x: 0.62, y: 3.65, w: 12, h: 0.5, fontSize: 18, color: C.accent, fontFace: FONT });
    s.addShape('line', { x: 0.62, y: 4.35, w: 4.5, h: 0, line: { color: C.accent, width: 2 } });
    s.addText([
      { text: T('deck.cover.scope') + ':  ', options: { bold: true, color: C.ink } }, { text: esc(d.scopeLbl) + '\n', options: { color: C.body } },
      { text: T('deck.cover.reportdate') + ':  ', options: { bold: true, color: C.ink } }, { text: esc(d.date) + '\n', options: { color: C.body } },
      { text: T('deck.cover.preparedby'), options: { bold: true, color: C.ink } }
    ], { x: 0.62, y: 4.7, w: 8, h: 1.6, fontSize: 12.5, fontFace: FONT, lineSpacingMultiple: 1.3, valign: 'top' });
    footer(s, d, 1);

    // 2 — Scope & limitations
    s = pptx.addSlide(); s.background = { color: C.white };
    head(s, T('deck.scope.title'), T('deck.scope.title'));
    s.addShape('rect', { x: 0.5, y: 1.75, w: 12.33, h: 3.0, fill: { color: C.panel }, line: { color: C.accent, width: 0 }, rectRadius: 0.05 });
    s.addShape('rect', { x: 0.5, y: 1.75, w: 0.08, h: 3.0, fill: { color: C.accent } });
    s.addText(T('deck.scope.body', { client: d.client }), { x: 0.85, y: 1.95, w: 11.6, h: 2.6, fontSize: 14, color: C.body, fontFace: FONT, lineSpacingMultiple: 1.35, valign: 'top' });
    s.addText(T('deck.scope.dist', { client: d.client }), { x: 0.5, y: 5.0, w: 12.33, h: 0.8, fontSize: 11, italic: true, color: C.muted, fontFace: FONT, valign: 'top' });
    footer(s, d, 2);

    // 3 — Executive summary
    s = pptx.addSlide(); s.background = { color: C.white };
    var verdict = T(below ? 'deck.exec.verdict.below' : 'deck.exec.verdict.at', { fw: d.label, level: d.vLevelT, score: d.overall5.toFixed(1) });
    head(s, T('deck.exec.title'), verdict);
    chip(s, 0.5, 1.7, 2.9, T('deck.exec.overall'), d.overall5.toFixed(1), readCol, T('deck.exec.target') + ' 3.5 · ' + esc(d.vLevelT));
    chip(s, 3.55, 1.7, 2.9, T('deck.exec.gap'), Math.max(0, 3.5 - d.overall5).toFixed(1), below ? C.crit : C.good, 'CMMI ' + d.vCmmi);
    chip(s, 6.6, 1.7, 2.9, T('deck.exec.coverage'), d.covPct + '%', d.covPct >= 75 ? C.good : d.covPct >= 50 ? C.warn : C.crit, d.evidenced + ' / ' + d.total);
    chip(s, 9.65, 1.7, 3.18, T('ca.dek.notmetlabel'), String(d.notMet), d.notMet ? C.crit : C.good, T('deck.col.priority'));
    s.addText(T('deck.exec.three'), { x: 0.5, y: 3.45, w: 6.0, h: 0.3, fontSize: 12, bold: true, color: C.ink, fontFace: FONT });
    var f3 = (d.findings || []).slice(0, 3).map(function (f) { return { text: '▪ ' + f.title + ' — ' + f.fn + ' ' + (f.score != null ? f.score.toFixed(1) + '/5' : ''), options: { color: C.body, bullet: false, breakLine: true, paraSpaceAfter: 6 } }; });
    s.addText(f3.length ? f3 : [{ text: '—' }], { x: 0.5, y: 3.8, w: 6.3, h: 2.9, fontSize: 12, fontFace: FONT, valign: 'top' });
    s.addText(T('deck.exec.close'), { x: 7.1, y: 3.45, w: 5.7, h: 0.3, fontSize: 12, bold: true, color: C.ink, fontFace: FONT });
    s.addText(T('deck.exec.close.body'), { x: 7.1, y: 3.8, w: 5.7, h: 1.3, fontSize: 11.5, color: C.body, fontFace: FONT, lineSpacingMultiple: 1.3, valign: 'top' });
    s.addText(T('deck.exec.notassessed'), { x: 7.1, y: 5.15, w: 5.7, h: 0.3, fontSize: 12, bold: true, color: C.ink, fontFace: FONT });
    s.addText(T('deck.exec.notassessed.body'), { x: 7.1, y: 5.5, w: 5.7, h: 1.2, fontSize: 11.5, color: C.body, fontFace: FONT, lineSpacingMultiple: 1.3, valign: 'top' });
    footer(s, d, 3);

    // 4 — Function summary scorecard (bar chart)
    s = pptx.addSlide(); s.background = { color: C.white };
    head(s, T('deck.scorecard.title'), T('deck.scorecard.sub'));
    var fns = d.functions.slice();
    var barData = [{ name: T('deck.col.current'), labels: fns.map(function (f) { return f.name; }), values: fns.map(function (f) { return +f.score.toFixed(1); }) },
      { name: T('deck.col.target'), labels: fns.map(function (f) { return f.name; }), values: fns.map(function () { return 3.5; }) }];
    try {
      s.addChart(pptx.ChartType.bar, barData, { x: 0.5, y: 1.7, w: 7.4, h: 5.0, barDir: 'col', chartColors: [C.accent2, C.line], showLegend: true, legendPos: 'b', legendFontSize: 10,
        valAxisMinVal: 0, valAxisMaxVal: 5, valAxisMajorUnit: 1, catAxisLabelFontSize: 9, valAxisLabelFontSize: 9, dataLabelFontSize: 9, showValue: true, dataLabelColor: C.ink, dataLabelPosition: 'outEnd' });
    } catch (e) {}
    // right: gap table
    var rows = [[{ text: T('deck.col.function'), options: hcell() }, { text: T('deck.col.current'), options: hcell() }, { text: T('deck.col.gap'), options: hcell() }]];
    fns.forEach(function (f) { rows.push([{ text: f.name, options: tcell(C.ink) }, { text: f.score.toFixed(1), options: tcell(scoreColor(f.score), true) }, { text: f.gap.toFixed(1), options: tcell(C.body) }]); });
    s.addTable(rows, { x: 8.15, y: 1.7, w: 4.65, colW: [2.75, 0.95, 0.95], border: { type: 'solid', color: C.line, pt: 0.5 }, fontFace: FONT, fontSize: 10.5, rowH: 0.42, valign: 'middle' });
    footer(s, d, 4);

    // 5 — Current state (weakest function focus)
    s = pptx.addSlide(); s.background = { color: C.white };
    var weakest = fns[0];
    head(s, T('deck.current.title'), weakest ? (weakest.name + ' — ' + T('deck.of5', { score: weakest.score.toFixed(1) })) : T('deck.current.title'));
    var yy = 1.7;
    [[T('deck.current.matters'), weakest ? T('deck.cons.' + consKey(weakest.id)) : ''],
     [T('deck.current.gaps'), fns.slice(0, 3).map(function (f) { return f.name + ' (' + f.score.toFixed(1) + ')'; }).join(' · ')],
     [T('deck.current.working'), fns.slice().reverse().slice(0, 2).map(function (f) { return f.name + ' (' + f.score.toFixed(1) + ')'; }).join(' · ')]
    ].forEach(function (blk) {
      s.addShape('rect', { x: 0.5, y: yy, w: 0.08, h: 1.4, fill: { color: C.accent } });
      s.addText(esc(blk[0]).toUpperCase(), { x: 0.75, y: yy, w: 12, h: 0.3, fontSize: 10, bold: true, color: C.accent, charSpacing: 1, fontFace: FONT });
      s.addText(esc(blk[1]) || '—', { x: 0.75, y: yy + 0.32, w: 12.0, h: 1.0, fontSize: 13.5, color: C.body, fontFace: FONT, lineSpacingMultiple: 1.25, valign: 'top' });
      yy += 1.7;
    });
    footer(s, d, 5);

    // 6..N — Findings (top 3, one slide each)
    var page = 6;
    (d.findings || []).slice(0, 3).forEach(function (f) {
      s = pptx.addSlide(); s.background = { color: C.white };
      head(s, T('deck.findings.title'), f.id + '  ·  ' + f.title);
      var pr = f.priority, prCol = pr === 'High' ? C.crit : pr === 'Medium' ? C.warn : C.muted;
      s.addShape('rect', { x: 10.8, y: 0.66, w: 2.03, h: 0.5, fill: { color: prCol }, rectRadius: 0.04 });
      s.addText(T('deck.finding.priority') + ': ' + pr, { x: 10.8, y: 0.66, w: 2.03, h: 0.5, fontSize: 10, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: FONT });
      var by = 1.75;
      [[T('deck.finding.affected'), (f.fn || '') + (f.score != null ? '  ·  ' + f.score.toFixed(1) + '/5  ·  ' + f.n + ' controls' : '')],
       [T('deck.finding.condition'), (f.fn || '') + ' ' + (f.score != null ? f.score.toFixed(1) + '/5 ' : '') + T('deck.cond.tail', { n: f.n })],
       [T('deck.finding.consequence'), f.consequence],
       [T('deck.finding.recommendation'), f.need]
      ].forEach(function (r) {
        s.addText(esc(r[0]).toUpperCase(), { x: 0.5, y: by, w: 3.0, h: 0.6, fontSize: 10, bold: true, color: C.accent, charSpacing: 1, fontFace: FONT, valign: 'top' });
        s.addText(esc(r[1]) || '—', { x: 3.7, y: by, w: 9.1, h: 1.05, fontSize: 13, color: C.body, fontFace: FONT, lineSpacingMultiple: 1.25, valign: 'top' });
        s.addShape('line', { x: 0.5, y: by + 1.12, w: 12.33, h: 0, line: { color: C.line, width: 0.5 } });
        by += 1.28;
      });
      footer(s, d, page++);
    });

    // Roadmap
    s = pptx.addSlide(); s.background = { color: C.white };
    head(s, T('deck.roadmap.title'), T('deck.roadmap.title'));
    var horizons = [T('deck.roadmap.h1'), T('deck.roadmap.h2'), T('deck.roadmap.h3')];
    var buckets = [[], [], []];
    (d.findings || []).forEach(function (f, i) { buckets[Math.min(2, Math.floor(i / 2))].push(f); });
    horizons.forEach(function (h, i) {
      var x = 0.5 + i * 4.17;
      s.addShape('rect', { x: x, y: 1.7, w: 3.95, h: 0.55, fill: { color: C.band }, rectRadius: 0.04 });
      s.addText(h, { x: x, y: 1.7, w: 3.95, h: 0.55, fontSize: 13, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: FONT });
      var items = buckets[i].map(function (f) { return { text: f.title, options: { bullet: { code: '2022' }, color: C.body, breakLine: true, paraSpaceAfter: 8, fontSize: 11.5 } }; });
      s.addText(items.length ? items : [{ text: '—', options: { color: C.muted } }], { x: x + 0.1, y: 2.45, w: 3.75, h: 3.8, fontFace: FONT, valign: 'top' });
    });
    s.addText(T('deck.roadmap.note'), { x: 0.5, y: 6.55, w: 12.33, h: 0.4, fontSize: 10, italic: true, color: C.muted, fontFace: FONT });
    footer(s, d, page++);

    // Board & audit committee summary
    s = pptx.addSlide(); s.background = { color: C.white };
    head(s, T('deck.board.title'), T('deck.board.title'));
    var bcol = 6.15;
    function bcard(x, y, title, body) {
      s.addShape('rect', { x: x, y: y, w: bcol, h: 2.2, fill: { color: C.panel }, line: { color: C.line, width: 0.75 }, rectRadius: 0.05 });
      s.addText(esc(title).toUpperCase(), { x: x + 0.2, y: y + 0.15, w: bcol - 0.4, h: 0.3, fontSize: 10, bold: true, color: C.accent, charSpacing: 1, fontFace: FONT });
      s.addText(esc(body), { x: x + 0.2, y: y + 0.5, w: bcol - 0.4, h: 1.55, fontSize: 12, color: C.body, fontFace: FONT, lineSpacingMultiple: 1.25, valign: 'top' });
    }
    bcard(0.5, 1.7, T('deck.board.exposure'), T('deck.cons.' + consKey(fns[0] && fns[0].id)));
    bcard(6.83, 1.7, T('deck.board.decisions'), (d.findings || []).slice(0, 2).map(function (f) { return '• ' + f.title; }).join('\n'));
    bcard(0.5, 4.05, T('deck.board.accepting'), T('deck.exec.close.body'));
    bcard(6.83, 4.05, T('deck.board.nextreview'), d.date);
    footer(s, d, page++);

    // Method / evidence basis
    s = pptx.addSlide(); s.background = { color: C.white };
    head(s, T('deck.method.title'), T('deck.method.title'));
    s.addText(T('deck.method.body', { x: d.evidenced, total: d.total }), { x: 0.5, y: 1.8, w: 12.33, h: 2.4, fontSize: 14, color: C.body, fontFace: FONT, lineSpacingMultiple: 1.35, valign: 'top' });
    s.addShape('line', { x: 0.5, y: 4.4, w: 12.33, h: 0, line: { color: C.line, width: 0.75 } });
    s.addText(T('deck.rule.consequence'), { x: 0.5, y: 4.6, w: 12.33, h: 1.0, fontSize: 12, italic: true, color: C.muted, fontFace: FONT, lineSpacingMultiple: 1.3, valign: 'top' });
    footer(s, d, page++);

    var fname = (d.client.replace(/[^A-Za-z0-9]+/g, '_') || 'Nerion') + '_' + d.label.replace(/[^A-Za-z0-9]+/g, '') + '_Board_Deck.pptx';
    return pptx.writeFile({ fileName: fname });
  }
  function hcell() { return { fill: { color: C.band }, color: C.white, bold: true, fontSize: 9.5, align: 'left', valign: 'middle' }; }
  function tcell(color, bold) { return { color: color || C.body, bold: !!bold, align: 'left', valign: 'middle', fill: { color: C.white } }; }

  // Button HTML for an assessment view's header. Only the four primary frameworks generate a deck;
  // returns '' for AI sub-catalogs (owasp/atlas/…) or if the engine isn't loaded.
  window.c5DeckBtnHtml = function (fwKey) {
    if (!({ csf: 1, ai: 1, iso: 1, cis: 1 })[fwKey] || typeof window.c5GenDeck !== 'function') return '';
    var lbl = (typeof c5osT === 'function') ? c5osT('deck.btn') : 'Board deck (PPTX)';
    var l = String(lbl).replace(/"/g, '&quot;');
    return '<button data-c5deck="' + fwKey + '" onclick="c5GenDeck(\'' + fwKey + '\')" style="float:right;margin-top:-2px;font-size:11px;font-weight:700;color:#fff;background:var(--blue,#2D6CDF);border:none;border-radius:7px;padding:6px 12px;cursor:pointer" title="' + l + '">▤ ' + l + '</button>';
  };
  // Public entry — used by the assessment views' "Board deck" button.
  window.c5GenDeck = function (fwKey) {
    var btns = document.querySelectorAll('[data-c5deck]');
    btns.forEach(function (b) { b.disabled = true; b.dataset._t = b.textContent; b.textContent = (typeof T === 'function' ? T('deck.generating') : 'Generating…'); });
    setTimeout(function () {
      try { Promise.resolve(build(fwKey || 'csf')).catch(function (e) { console.error(e); alert('Deck generation failed: ' + e.message); }).then(function () {
        btns.forEach(function (b) { b.disabled = false; if (b.dataset._t) b.textContent = b.dataset._t; });
      }); } catch (e) { console.error(e); alert('Deck generation failed: ' + e.message); btns.forEach(function (b) { b.disabled = false; if (b.dataset._t) b.textContent = b.dataset._t; }); }
    }, 30);
  };
})();
