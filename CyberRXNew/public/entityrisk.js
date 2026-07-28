/* ============================================================================
   Entity cyber-risk verdict — the top of the chain, with the answer stated.
   ----------------------------------------------------------------------------
   Business risk reads bottom-up: process → risk → control. This reads the chain
   the OTHER way and ends on a VERDICT:

     Entity → its critical processes → the Systems that support them → each
     system's cyber risks → the NIST CSF · CIS · ISO 27002 controls that mitigate
     each → those controls' Program-Health scores → an entity-level verdict.

   Nothing here is a second model. It reuses c5BizRiskModel(scope) verbatim —
   the same systems (crown jewels), the same risk → control mapping, and above
   all the SAME control scores Program Health renders (capDeploy under this
   scope's telemetry, tagged "PH" everywhere they appear). So this tab and
   Program Health can never disagree: raise a weak control in Program Health and
   the entity verdict moves here directly.

   Verdict logic (stated in the footer, computed here):
     • a risk is well-mitigated only if its WEAKEST mitigating control scores well
       (one gap opens the path);
     • a system's residual is its worst risk;
     • the entity's residual is its critical systems WEIGHTED by how many critical
       processes each supports (from LIVE.value_chain — the Entity → Process →
       System chain captured at onboarding), falling back to system criticality
       when the process tree isn't loaded.

   Scope-aware end to end (Enterprise = mean of regions = mean of entities) and
   centralized/decentralized-aware, exactly like the rest of the cockpit. ====== */
(function () {
  'use strict';
  function T(k, p) { return (typeof c5osT === 'function') ? c5osT(k, p) : ((typeof nt === 'function') ? nt(k, p) : k); }
  function esc(s) { return (typeof c5esc === 'function') ? c5esc(s) : String(s == null ? '' : s); }

  // ── The Entity → Process → System chain, from the value-chain captured at
  //    onboarding. For each crown-jewel system (by name) we count the CRITICAL
  //    processes it supports — the weight the entity verdict rolls up on.
  function procSupportIndex() {
    var vc = (typeof LIVE !== 'undefined' && LIVE && LIVE.value_chain) || null;
    var fns = (vc && vc.functions) || [];
    var bySys = {}, critProc = {}, anyCrit = false;
    fns.forEach(function (f) {
      (f.processes || []).forEach(function (p) {
        var isCrit = /crit/i.test(String(p.criticality || p.tier || f.criticality || ''));
        if (isCrit) { critProc[p.name] = 1; anyCrit = true; }
        (p.assets || []).forEach(function (a) {
          if (!a || !a.crown_jewel) return;
          var m = bySys[a.name] || (bySys[a.name] = { procs: {}, crit: {} });
          m.procs[p.name] = 1; if (isCrit) m.crit[p.name] = 1;
        });
      });
    });
    return {
      on: fns.length > 0,
      totalCrit: anyCrit ? Object.keys(critProc).length : 0,
      // critical processes a system supports (fall back to all its processes if the
      // estate marks none critical), or null when there is no tree at all.
      count: function (name) {
        var m = bySys[name]; if (!m) return null;
        var c = Object.keys(m.crit).length; return c || Object.keys(m.procs).length;
      }
    };
  }

  // Group the systems under the BUSINESS PROCESSES they support, from the same
  // value-chain tree (Entity → Process → System). A system supporting two processes
  // shows under both — that is correct. `sysByName` maps a system name to its scored
  // system object from the biz spine. Returns ordered process groups (critical first,
  // worst residual first), plus an "other systems" group for anything unmapped.
  function businessGroups(systems, sysByName) {
    var vc = (typeof LIVE !== 'undefined' && LIVE && LIVE.value_chain) || null;
    var fns = (vc && vc.functions) || [];
    if (!fns.length) return { grouped: false, groups: [] };
    var groups = [], seen = {};
    fns.forEach(function (f) {
      (f.processes || []).forEach(function (p) {
        var names = {};
        (p.assets || []).forEach(function (a) { if (a && a.crown_jewel && sysByName[a.name]) names[a.name] = 1; });
        var sys = Object.keys(names).map(function (n) { return sysByName[n]; });
        if (!sys.length) return;
        sys.forEach(function (s) { seen[s.name] = 1; });
        sys.sort(function (a, b) { return a.score - b.score; });
        var worst = sys.reduce(function (m, s) { return (m == null || s.score < m) ? s.score : m; }, null);
        groups.push({ name: p.name, fn: f.name || '', crit: /crit/i.test(String(p.criticality || p.tier || f.criticality || '')), systems: sys, worst: worst, other: false });
      });
    });
    var left = systems.filter(function (s) { return !seen[s.name]; });
    if (left.length) {
      left.sort(function (a, b) { return a.score - b.score; });
      var lw = left.reduce(function (m, s) { return (m == null || s.score < m) ? s.score : m; }, null);
      groups.push({ name: null, fn: '', crit: false, systems: left, worst: lw, other: true });
    }
    // Critical processes first, then worst residual first; the "other" bucket last.
    groups.sort(function (a, b) {
      if (a.other !== b.other) return a.other ? 1 : -1;
      if (a.crit !== b.crit) return a.crit ? -1 : 1;
      return (a.worst == null ? 999 : a.worst) - (b.worst == null ? 999 : b.worst);
    });
    return { grouped: true, groups: groups };
  }

  function bandOfScore(sc) { return sc == null ? 'high' : (sc >= 75 ? 'low' : (sc >= 50 ? 'elevated' : 'high')); }
  function scoreCol(sc) {
    if (typeof capColor === 'function') return capColor(sc);
    return sc == null ? 'muted' : sc >= 90 ? 'good' : sc >= 75 ? 'blue' : sc >= 50 ? 'warn' : 'crit';
  }
  function bandCol(band) { return band === 'low' ? 'good' : (band === 'elevated' ? 'warn' : 'crit'); }
  // A null-scored system (no measured mitigating control) is exposure, not a blank —
  // it rolls up as clearly-high so the verdict never flatters an unmonitored estate.
  function rollupScore(weakMit) { return weakMit == null ? 30 : weakMit; }

  // The whole model: reuse c5BizRiskModel's systems, add per-system process weight
  // and roll them into one entity verdict.
  function c5EntityRiskModel(scope) {
    var biz = (typeof window.c5BizRiskModel === 'function') ? window.c5BizRiskModel(scope) : null;
    if (!biz || !biz.processes || !biz.processes.length) return null;
    var ps = procSupportIndex();

    var systems = biz.processes.map(function (sys) {
      var isCrit = /crit/i.test(String(sys.tier || ''));
      var support = ps.on ? ps.count(sys.name) : null;      // real critical-process count, or null
      var score = rollupScore(sys.weakMit);                  // 0–100 residual (weakest mitigating control)
      var band = bandOfScore(sys.weakMit);                   // low / elevated / high
      // The single weakest control across all of this system's risks — the lever.
      var weakest = null, weakRiskName = sys.weakRisk ? sys.weakRisk.name : '';
      sys.risks.forEach(function (r) {
        (r.controls || []).forEach(function (c) {
          if (c.maturity == null) return;
          if (weakest == null || c.maturity < weakest.maturity) { weakest = c; weakRiskName = r.name; }
        });
      });
      return {
        i: sys.i, name: sys.name, tier: sys.tier || '', internet: !!sys.internet, cls: sys.cls || '',
        risks: sys.risks, score: score, band: band, weakMit: sys.weakMit,
        isCrit: isCrit, support: support, weakest: weakest, weakRiskName: weakRiskName
      };
    });

    // Weight basis: real critical-process support if the tree gives it, else criticality.
    var sumSupport = systems.reduce(function (a, s) { return a + (s.support || 0); }, 0);
    var basis = (ps.on && sumSupport > 0) ? 'process' : 'criticality';
    systems.forEach(function (s) { s.weight = (basis === 'process') ? (s.support || 0) : (s.isCrit ? 2 : 1); });

    // Entity residual = systems weighted by how many critical processes each supports.
    var wsum = 0, acc = 0;
    systems.forEach(function (s) { wsum += s.weight; acc += s.score * s.weight; });
    var entityScore = wsum > 0 ? Math.round(acc / wsum) : Math.round(systems.reduce(function (a, s) { return a + s.score; }, 0) / systems.length);
    var entityBand = bandOfScore(entityScore);

    // Verdict facts.
    var nHigh = systems.filter(function (s) { return s.band === 'high'; }).length;
    var nElev = systems.filter(function (s) { return s.band === 'elevated'; }).length;
    var wExposed = 0; systems.forEach(function (s) { if (s.band !== 'low') wExposed += s.weight; });
    var pctExposed = wsum > 0 ? Math.round(wExposed / wsum * 100) : 0;
    // Top driver = the system carrying the most weighted exposure (weight × shortfall).
    var driver = null, dScore = -1;
    systems.forEach(function (s) { var e = s.weight * (100 - s.score); if (e > dScore) { dScore = e; driver = s; } });

    // Sort worst-first so the reader lands on the exposure, then works down.
    systems.sort(function (a, b) { return (a.score - b.score) || (b.weight - a.weight); });

    // Group them under the business processes they support (the primary layout).
    var sysByName = {}; systems.forEach(function (s) { sysByName[s.name] = s; });
    var bg = businessGroups(systems, sysByName);

    return {
      scope: scope, systems: systems, basis: basis,
      grouped: bg.grouped, groups: bg.groups,
      totalCrit: ps.totalCrit, procTree: ps.on,
      verdict: {
        // score = 0–100 defence/coverage (higher is better). The verdict is stated as
        // RISK, so the gauge reads risk = 100 − defence (higher is worse) on the same
        // 0–5 scale the region strip now uses — one number per entity, everywhere.
        score: entityScore, band: entityBand, of5: (entityScore / 20).toFixed(1),
        risk: 100 - entityScore, riskOf5: ((100 - entityScore) / 20).toFixed(1),
        nHigh: nHigh, nElev: nElev, pctExposed: pctExposed,
        driver: driver ? { name: driver.name, ctrl: driver.weakest ? driver.weakest.name : null, of5: driver.weakest ? (driver.weakest.maturity / 20).toFixed(1) : null } : null
      },
      nSys: systems.length, kPct: biz.kPct
    };
  }
  window.c5EntityRiskModel = c5EntityRiskModel;

  // ── Rendering ──────────────────────────────────────────────────────────────
  var C5_ER_SYS = null;   // open system index
  var C5_ER_RISK = null;  // open risk key within the open system
  var C5_ER_CTRL = {};    // cap key → control object (for the per-framework drill)

  function bandChip(band) {
    var col = bandCol(band);
    return '<span style="font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--' + col + ');background:color-mix(in srgb,var(--' + col + ') 12%,transparent);border:1px solid color-mix(in srgb,var(--' + col + ') 34%,transparent);border-radius:20px;padding:2px 9px">' + T('er.band.' + band) + '</span>';
  }
  function matBar(p, ph) {
    var col = scoreCol(p);
    var w = p == null ? 0 : Math.max(0, Math.min(100, p));
    var tag = ph ? '<span title="' + esc(T('er.ph.tip')) + '" style="font-size:8.5px;font-weight:800;letter-spacing:.04em;color:var(--blue);border:1px solid color-mix(in srgb,var(--blue) 40%,transparent);border-radius:4px;padding:0 3px;line-height:1.5">PH</span>' : '';
    return '<div style="display:flex;align-items:center;gap:7px;min-width:128px"><div style="flex:1;height:6px;background:var(--line);border-radius:4px;overflow:hidden;min-width:52px"><i style="display:block;height:100%;width:' + w + '%;background:var(--' + col + ')"></i></div><span style="font-size:11px;font-weight:700;color:var(--' + col + ');font-variant-numeric:tabular-nums">' + (p == null ? '—' : p + '%') + '</span>' + tag + '</div>';
  }
  function llChip(level, why) { var col = level === 'hi' ? 'crit' : (level === 'med' ? 'warn' : 'muted'); return '<b style="color:var(--' + col + ')' + (why ? ';cursor:help;border-bottom:1px dotted currentColor' : '') + '"' + (why ? ' title="' + esc(why) + '"' : '') + '>' + T('br.' + level) + '</b>'; }
  function fwids(arr, cls) {
    if (!arr || !arr.length) return '<span style="color:var(--muted)">—</span>';
    return arr.map(function (id) { return '<span class="fwid ' + cls + '" style="margin:0 3px 3px 0">' + esc(id) + '</span>'; }).join('');
  }
  function provBadge(provider) {
    var common = provider === 'common', col = common ? 'blue' : 'ink-2';
    return '<span style="font-size:10px;font-weight:700;color:var(--' + col + ');white-space:nowrap">' + (common ? '⬡ ' : '◈ ') + T(common ? 'br.ctrl.common' : 'br.ctrl.specific') + '</span>';
  }

  // ── Per-framework drill ──────────────────────────────────────────────────────
  // Clicking a control's CIS cell must show CIS, its CSF cell CSF, its ISO cell ISO —
  // not the capability's generic $-value drill. Each framework cell opens a drill
  // scoped to THAT framework: the control's identifiers there (with names/descriptions
  // for NIST CSF, which we hold; CIS and ISO are referenced by identifier only, as the
  // licensed standard text is not reproduced), its Program-Health score, and the
  // cross-framework mapping so the same control is legible across all three.
  function fwLabel(fw) { return fw === 'csf' ? 'NIST CSF 2.0' : (fw === 'cis' ? 'CIS Controls v8' : 'ISO/IEC 27002:2022'); }
  function erRow(k, v) { return '<div class="drow"><div class="drow-h"><b>' + k + '</b><span class="drow-tool">' + (v || '') + '</span></div></div>'; }

  function fwCell(fw, ids, capKey) {
    var cls = fw === 'cis' ? 'r53' : 'csf';
    if (!ids || !ids.length) return '<span style="font-size:11px;color:var(--muted)">—</span>';
    var chips = ids.map(function (id) { return '<span class="fwid ' + cls + '" style="margin:0 3px 3px 0">' + esc(id) + '</span>'; }).join('');
    return '<span class="er-fw" data-fw="' + fw + '" data-cap="' + esc(capKey) + '" title="' + esc(fwLabel(fw)) + ' — details" style="font-size:11px;cursor:pointer;display:inline-block">' + chips + '</span>';
  }

  // A self-contained, audit-grade dossier for ONE control under ONE framework. Everything a
  // Fortune-100 CISO (or their auditor) would ask is answered in-place — the live score and
  // HOW it is measured (method · source signal · freshness · coverage), requirement-by-
  // requirement traceability (what each framework line requires and what evidences it), the
  // valid-evidence-scope integrity guard, and the cross-standard crosswalk. It never defers
  // to "the other tab". Grounded entirely in real per-capability metadata (CAP_BY_KEY /
  // CAP_FRAMEWORK / NEURON_XWALK / CAP_SIGKEY / C5_CSF_META), so it holds up to scrutiny.
  function fwDrill(fw, c) {
    var k = c.k;
    var full = (typeof CAP_BY_KEY !== 'undefined' && CAP_BY_KEY[k]) || {};
    var fwm = (typeof CAP_FRAMEWORK !== 'undefined' && CAP_FRAMEWORK[k]) || {};
    var xw = (typeof NEURON_XWALK !== 'undefined' && NEURON_XWALK[k]) || {};
    var ids = fw === 'csf' ? (c.csf || []) : (fw === 'cis' ? (c.cis || []) : (c.iso || []));
    var ph = c.maturity, col = scoreCol(ph);
    var scope = (typeof c5Scope === 'function') ? c5Scope() : 'enterprise';
    var src = (typeof c5capSrc === 'function') ? c5capSrc(k) : { tool: c.tool, field: k, lastRefresh: '' };
    var prov = (typeof capProvider === 'function') ? capProvider(k, scope) : (c.provider || 'specific');
    var bar = (typeof capBar === 'function') ? capBar(ph) : '';
    // Assurance method — the provable-vs-asserted split an auditor defends on.
    var METHOD = { auto: ['Sensor-proven', 'scored continuously from the connected tool’s live telemetry — the strongest evidence'],
                   semi: ['Semi-automated', 'live telemetry confirmed by operational review'],
                   manual: ['Attested', 'self-reported at onboarding — documented intent, not sensor-verified'] };
    var mth = METHOD[full.auto] || METHOD.manual;
    var roleLbl = { prevent: 'Preventive', detect: 'Detective', both: 'Preventive + detective' }[xw.role] || 'Control';
    var domain = xw.domain || '';

    // 1 — Score + what it is
    var hero = '<div class="drill-hero ' + col + '">' + (ph == null ? '—' : ph + '%') + ' <span class="pill" style="font-size:10px;vertical-align:middle">Program health</span></div>' + bar
      + '<div class="drill-p"><b>' + esc(c.name) + '</b>' + (c.tool ? (' — ' + esc(c.tool)) : '') + '. <b>' + roleLbl + '</b> control' + (domain ? (' · ' + esc(domain)) : '') + '.'
      + (ph != null && ph < 100 ? (' <span style="color:var(--muted)">' + (100 - ph) + '% of in-scope assets not yet covered.</span>') : '') + '</div>';

    // 1b — The STORY: an analyst's verdict on whether this control is at par, WHY, what the
    // gap means for the risk it mitigates, and how to close it. This is the value a CISO reads
    // first — every clause is grounded in the live score and the assurance method, so it is
    // both narrative and verifiable.
    var verdict, vcol;
    if (ph == null) { verdict = 'not yet measured'; vcol = 'muted'; }
    else if (ph >= 90) { verdict = 'strong — at ' + ph + '%'; vcol = 'good'; }
    else if (ph >= 75) { verdict = 'healthy, at par — ' + ph + '%'; vcol = 'good'; }
    else if (ph >= 50) { verdict = 'below par — ' + ph + '%'; vcol = 'warn'; }
    else { verdict = 'weak, well below par — ' + ph + '%'; vcol = 'crit'; }
    var methodStory = full.auto === 'auto' ? ('proven continuously from ' + esc(c.tool) + '’s live sensor telemetry — the strongest, audit-grade evidence')
      : full.auto === 'semi' ? ('read live from ' + esc(c.tool) + ' telemetry and confirmed by operational review')
        : ('self-attested at onboarding — documented intent, not yet sensor-verified, so treat it as a control you have declared rather than proven');
    var gapStory = ph == null ? ('Connect ' + esc(c.tool) + ' to measure it from evidence rather than assertion.')
      : ph >= 90 ? ('At ' + ph + '% it covers nearly the whole in-scope estate; the last ' + (100 - ph) + '% is the residual surface to hold closed.')
        : ph >= 75 ? ('It clears the 75% healthy line, but the remaining ' + (100 - ph) + '% of in-scope assets is still uncovered — the residual path this risk takes.')
          : ('It needs +' + (75 - ph) + ' points to reach the 75% healthy line; until then roughly ' + (100 - ph) + '% of the in-scope estate is uncovered, and that gap is exactly where this risk gets through.');
    var story = '<div class="drill-p" style="border-left:3px solid var(--' + vcol + ');padding-left:12px;margin:4px 0 2px">'
      + '<b>' + esc(c.name) + '</b> is <b style="color:var(--' + vcol + ')">' + verdict + '</b>. '
      + 'It is a <b>' + roleLbl.toLowerCase() + '</b> control' + (domain ? (' over your <b>' + esc(domain).toLowerCase() + '</b>') : '') + ', ' + methodStory + '. '
      + gapStory + (full.need && ph != null && ph < 100 ? (' <span style="color:var(--muted)">To move it: ' + esc(full.need) + '</span>') : '')
      + '</div>';

    // 2 — How the score is known (measured HERE, not "the same as another tab")
    var assurance = story + '<div class="ev-sec">How this score is measured</div>'
      + erRow('Method', '<b>' + mth[0] + '</b> — ' + mth[1])
      + erRow('Measured from', ph != null ? (esc(src.tool) + ' · signal <code>' + esc(src.field) + '</code>') : ('not connected — ' + ((typeof capConnectPrompt === 'function') ? capConnectPrompt(k) : ('connect ' + esc(c.tool)))))
      + (ph != null && src.lastRefresh ? erRow('Last refreshed', esc(src.lastRefresh)) : '')
      + erRow('Coverage', ph != null ? (ph + '% of in-scope assets · ' + (100 - ph) + '% gap') : '—')
      + erRow('Operating model', prov === 'common' ? '⬡ Corporate-common — inherited across the estate' : '◈ Entity-run — operated by this unit');

    // 3 — Requirement-by-requirement traceability in THIS framework
    var reqRows;
    if (fw === 'csf') {
      reqRows = ids.map(function (id) {
        var meta = (typeof C5_CSF_META !== 'undefined') ? C5_CSF_META[id] : null;
        var nm = (meta && meta.name) ? meta.name : ((typeof c5CsfName === 'function') ? c5CsfName(id) : '');
        var cat = (meta && meta.cat) ? meta.cat : '';
        // Full official NIST CSF 2.0 subcategory text for EVERY id (not just the curated
        // C5_CSF_META subset), so every requirement row is authoritative and defensible.
        var desc = (meta && meta.desc) ? meta.desc : ((typeof CSF_DESC !== 'undefined' && CSF_DESC[id]) ? CSF_DESC[id] : '');
        return '<div class="drow"><div class="drow-h"><b>' + esc(id) + '</b><span class="drow-tool">' + esc(nm) + (cat ? (' · ' + esc(cat)) : '') + '</span></div>'
          + (desc ? ('<div class="drill-p" style="margin:3px 0 0;color:var(--muted);font-size:11.5px">' + esc(desc) + '</div>') : '') + '</div>';
      }).join('');
      var r53 = fwm.r53 || [];
      if (r53.length) reqRows += '<div class="drill-p" style="color:var(--muted)">Anchored to NIST SP 800-53: <b>' + r53.map(esc).join(' · ') + '</b> — the authoritative controls these subcategories require.</div>';
    } else {
      reqRows = ids.map(function (id) { return erRow(esc(id), 'mapped — licensed standard text not reproduced'); }).join('');
    }
    // The evidence line: what proves these requirements, and to what degree.
    var trace = '<div class="drill-p">' + (ph != null
      ? ('<b>' + esc(c.tool) + '</b> is the live evidence for ' + (fw === 'csf' ? 'these subcategories' : 'these controls') + ' — currently <b style="color:var(--' + col + ')">' + ph + '% deployed</b> (signal <code>' + esc(src.field) + '</code>). ' + (ph < 100 ? ('Closing the remaining ' + (100 - ph) + '% raises this control across every framework it maps to.') : 'Fully deployed across the in-scope estate.'))
      : ('No live evidence yet. ' + ((typeof capConnectPrompt === 'function') ? capConnectPrompt(k) : ('Connect ' + esc(c.tool) + '.')))) + '</div>';
    var reqSec = '<div class="ev-sec">How it satisfies ' + esc(fwLabel(fw)) + '</div>' + reqRows + trace;

    // 4 — Valid-evidence-scope integrity guard (the anti-inflation control)
    var applies = (typeof CAP_ASSET_APPLIES !== 'undefined' && CAP_ASSET_APPLIES[k]) || [];
    var CL = (typeof ASSET_CLASS_LABEL !== 'undefined') ? ASSET_CLASS_LABEL : {};
    var scopeSec = '';
    if (applies.length) {
      var applyLbl = applies.map(function (a) { return CL[a] || a; });
      var notLbl = Object.keys(CL).filter(function (a) { return applies.indexOf(a) < 0; }).map(function (a) { return CL[a]; });
      scopeSec = '<div class="ev-sec">Valid evidence scope</div>' + erRow('Credited on', esc(applyLbl.join(' · '))) + (notLbl.length ? erRow('Not valid evidence for', esc(notLbl.join(' · '))) : '')
        + '<div class="drill-p" style="color:var(--muted)">Credited only where its telemetry is valid evidence for that asset class — so the score can’t be inflated by crediting the wrong tool for the wrong system.</div>';
    }

    // 5 — Crosswalk to the OTHER standards (no redundant repeat of the one you are in)
    var cross = [];
    if (fw !== 'csf' && c.csf && c.csf.length) cross.push(['NIST CSF 2.0', c.csf]);
    if (fw !== 'cis' && xw.cis && xw.cis.length) cross.push(['CIS Controls v8', xw.cis]);
    if (fw !== 'iso' && xw.iso && xw.iso.length) cross.push(['ISO/IEC 27002:2022', xw.iso]);
    if (xw.soc2 && xw.soc2.length) cross.push(['SOC 2', xw.soc2]);
    if (xw.pci && xw.pci.length) cross.push(['PCI DSS', xw.pci]);
    var xwSec = cross.length ? ('<div class="ev-sec">Same control, other standards</div>' + cross.map(function (o) { return erRow(esc(o[0]), esc(o[1].join(' · '))); }).join('')) : '';

    // 6 — The action that moves it
    var actSec = '<div class="ev-sec">' + (ph == null ? 'To start measuring' : 'What raising it looks like') + '</div><div class="drill-p">' + (ph == null ? ((typeof capConnectPrompt === 'function') ? capConnectPrompt(k) : esc(full.connect || '')) : esc(full.need || '')) + '</div>';

    return hero + assurance + reqSec + scopeSec + xwSec + actSec;
  }

  // Semicircular verdict gauge — a TRUE risk speedometer: the needle rises with cyber-risk
  // (left = low, right = high) over fixed national-security RAG bands (GREEN 0–1.25 · AMBER
  // 1.25–2.5 · RED 2.5–5 on the /5 scale, i.e. the ≥75 / ≥50 defence thresholds inverted).
  // `risk` is 0–100 where higher is worse; the number shown is risk/20 and its colour is the
  // band. Because every zone is always painted, the reader can see where the needle sits.
  function gauge(risk, band) {
    var col = bandCol(band), R = 52, CX = 64, CY = 64;
    var frac = Math.max(0, Math.min(100, risk)) / 100;   // 0 = no risk (far left) … 1 = max risk (far right)
    function pt(f) { var a = Math.PI * (1 - f); return [(CX + R * Math.cos(a)).toFixed(1), (CY - R * Math.sin(a)).toFixed(1)]; }
    function arc(f0, f1) { var p0 = pt(f0), p1 = pt(f1); return 'M' + p0[0] + ' ' + p0[1] + ' A' + R + ' ' + R + ' 0 0 1 ' + p1[0] + ' ' + p1[1]; }
    var np = pt(frac);
    return '<svg viewBox="0 0 128 80" width="128" height="80" style="flex:none">'
      // RAG zones — thresholds match bandOfScore (risk 25 / 50): green → amber → red, left to right.
      + '<path d="' + arc(0, 0.25) + '" fill="none" stroke="var(--good)" stroke-width="10" stroke-linecap="round"/>'
      + '<path d="' + arc(0.25, 0.5) + '" fill="none" stroke="var(--warn)" stroke-width="10"/>'
      + '<path d="' + arc(0.5, 1) + '" fill="none" stroke="var(--crit)" stroke-width="10" stroke-linecap="round"/>'
      + '<line x1="' + CX + '" y1="' + CY + '" x2="' + np[0] + '" y2="' + np[1] + '" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/>'
      + '<circle cx="' + CX + '" cy="' + CY + '" r="3.5" fill="var(--ink)"/>'
      + '<text x="' + CX + '" y="58" text-anchor="middle" font-size="20" font-weight="800" fill="var(--' + col + ')" font-family="var(--mono,ui-monospace)">' + (risk / 20).toFixed(1) + '</text>'
      + '<text x="' + CX + '" y="72" text-anchor="middle" font-size="8.5" fill="var(--muted)">' + esc(T('er.gauge.risk5')) + '</text>'
      + '</svg>';
  }
  // National-security RAG chip: GREEN (low risk) · AMBER (elevated) · RED (high).
  function ragChip(band) {
    var col = bandCol(band);
    return '<span style="font-size:10px;font-weight:800;letter-spacing:.06em;color:var(--' + col + ');background:color-mix(in srgb,var(--' + col + ') 12%,transparent);border:1px solid color-mix(in srgb,var(--' + col + ') 40%,transparent);border-radius:20px;padding:2px 10px;white-space:nowrap">● ' + T('er.rag.' + band) + '</span>';
  }

  // The control table for one risk — every mitigating control across CSF · CIS · ISO,
  // its Program-Health score (PH) and whether it is corporate-common or entity-run.
  function ctrlTable(risk) {
    var head = '<div style="display:grid;grid-template-columns:1.6fr 1fr .7fr 1fr 1.15fr 1.1fr;gap:8px;padding:6px 10px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line)">'
      + '<span>' + T('br.ctrl.col.cap') + '</span><span>' + T('br.ctrl.col.csf') + '</span><span>' + T('br.ctrl.col.cis') + '</span><span>' + T('br.ctrl.col.iso') + '</span><span>' + T('er.ctrl.col.ph') + '</span><span>' + T('br.ctrl.col.model') + '</span></div>';
    var rows = risk.controls.map(function (c) {
      var isWeak = risk.weakest && c.k === risk.weakest.k;
      C5_ER_CTRL[c.k] = c;   // so a framework-cell click can resolve the control
      return '<div class="er-ctrl" data-cap="' + c.k + '" style="display:grid;grid-template-columns:1.6fr 1fr .7fr 1fr 1.15fr 1.1fr;gap:8px;align-items:center;padding:9px 10px;border-bottom:1px solid var(--line);cursor:pointer' + (isWeak ? ';background:color-mix(in srgb,var(--crit) 5%,transparent)' : '') + '">'
        + '<span style="font-size:12px;color:var(--ink);font-weight:600">' + esc(c.name) + (isWeak ? ' <span style="font-size:9px;color:var(--crit);font-weight:800">⚠</span>' : '') + '<span style="display:block;font-size:10px;color:var(--muted);font-weight:500">' + esc(c.tool) + '</span></span>'
        + fwCell('csf', c.csf, c.k)
        + fwCell('cis', c.cis, c.k)
        + fwCell('iso', c.iso, c.k)
        + '<span>' + matBar(c.maturity, true) + '</span>'
        + '<span>' + provBadge(c.provider) + '</span>'
        + '</div>';
    }).join('');
    var most = risk.weakest ? ('<div style="font-size:11px;color:var(--ink-2);padding:9px 10px;line-height:1.5">' + T('br.ctrl.mostreduces', { ctrl: '<b>' + esc(risk.weakest.name) + '</b>' }) + '</div>') : '';
    return '<div style="margin-top:8px;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--surface)">'
      + '<div style="padding:9px 12px;font-size:12px;font-weight:700;color:var(--ink);border-bottom:1px solid var(--line)">' + T('br.ctrl.title', { risk: '<b>' + esc(risk.name) + '</b>' }) + ' <span style="font-weight:500;color:var(--muted)">· ' + T('br.ctrl.across') + '</span></div>'
      + head + rows + most + '</div>';
  }

  function riskRow(risk, sysIdx) {
    var open = (C5_ER_SYS === sysIdx && C5_ER_RISK === risk.key);
    var under = risk.mitigation != null && risk.mitigation < 50;
    var mitCol = risk.mitigation == null ? 'muted' : (risk.mitigation >= 75 ? 'good' : (risk.mitigation >= 50 ? 'warn' : 'crit'));
    var head = '<div class="er-risk" data-risk="' + esc(risk.key) + '" data-sys="' + sysIdx + '" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:11px 12px;cursor:pointer;border-radius:9px' + (open ? ';background:color-mix(in srgb,var(--blue) 5%,transparent)' : '') + '">'
      + '<span style="flex:1;min-width:180px;font-size:13px;font-weight:650;color:var(--ink)">' + (risk.adversarial ? '⚔ ' : '⚙ ') + esc(risk.name) + (under ? ' <span title="' + esc(T('er.under.tip')) + '" style="font-size:9px;color:var(--crit);font-weight:800">⚠</span>' : '') + '</span>'
      + '<span style="font-size:11px;color:var(--ink-2)">' + T('br.risk.likelihood') + ' ' + llChip(risk.likelihood, risk.likelihoodWhy) + '</span>'
      + '<span style="font-size:11px;color:var(--ink-2)">' + T('br.risk.impact') + ' ' + llChip(risk.impact, risk.impactWhy) + '</span>'
      + '<span style="font-size:11px;color:var(--ink-2);display:flex;align-items:center;gap:7px">' + T('br.risk.mitigation') + ' <b style="color:var(--' + mitCol + ');font-variant-numeric:tabular-nums;cursor:help;border-bottom:1px dotted currentColor" title="' + esc(risk.mitigationWhy) + '">' + (risk.mitigation == null ? '—' : risk.mitigation + '%') + '</b></span>'
      + '<span style="font-size:11px;color:var(--blue);font-weight:700">' + T('br.risk.open') + '</span>'
      + '</div>';
    return '<div style="border-bottom:1px solid var(--line)">' + head + (open ? ('<div style="padding:0 12px 12px">' + ctrlTable(risk) + '</div>') : '') + '</div>';
  }

  function sysCard(s, model, grouped) {
    var open = (C5_ER_SYS === s.i);
    var expo = s.internet ? T('er.exposure.internet') : T('er.exposure.internal');
    // When grouped under a process, the process context is already shown, so the
    // system subline is just class · exposure; ungrouped, we name its process support.
    var sub = grouped
      ? esc(expo)
      : ((model.procTree && s.support != null ? T('er.sys.supports', { n: s.support }) : (s.isCrit ? T('er.sys.critical') : T('er.sys.standard'))) + ' · ' + expo);
    var head = '<div class="er-sys" data-sys="' + s.i + '" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:13px 16px;cursor:pointer">'
      + '<span style="flex:1;min-width:220px"><span style="font-size:14px;font-weight:700;color:var(--ink)">🖥 ' + esc(s.name) + '</span>'
      + (s.cls ? ' <span style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em">· ' + esc(s.cls) + '</span>' : '')
      + '<span style="display:block;font-size:11px;color:var(--ink-2);margin-top:3px">' + sub + '</span></span>'
      + bandChip(s.band)
      + '<span style="width:132px;flex:none">' + matBar(s.weakMit, false) + '</span>'
      + '<span style="font-size:11px;color:var(--blue);font-weight:700;flex:none">' + T('er.sys.open') + '</span>'
      + '</div>';
    var body = open ? ('<div style="border-top:1px solid var(--line)">'
      + '<div style="padding:10px 16px 4px;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)">' + T('er.sys.risks') + '</div>'
      + s.risks.map(function (r) { return riskRow(r, s.i); }).join('') + '</div>') : '';
    return '<div style="border:1px solid var(--line);border-radius:11px;overflow:hidden;margin-bottom:9px;background:var(--surface)' + (open ? ';box-shadow:0 1px 0 color-mix(in srgb,var(--blue) 30%,transparent)' : '') + '">' + head + body + '</div>';
  }

  // A business-process group: the process header (name · criticality · residual =
  // its worst system), then the systems that support it, each drilling to its
  // risks and the controls that mitigate them.
  function procGroup(g, model) {
    var band = bandOfScore(g.worst);
    var title = g.other ? T('er.proc.other') : esc(g.name);
    var tag = g.other ? '' : (g.crit
      ? ' <span style="font-size:9.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--crit)">· ' + T('er.proc.crit') + '</span>'
      : ' <span style="font-size:9.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)">· ' + T('er.proc.std') + '</span>');
    var head = '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 10px">'
      + '<span style="font-size:15px">🏦</span>'
      + '<span style="flex:1;min-width:200px;font-size:15.5px;font-weight:750;color:var(--ink)">' + title + tag
      + '<span style="display:block;font-size:11px;color:var(--ink-2);margin-top:2px;font-weight:500">' + T('er.proc.systems', { n: g.systems.length }) + (g.other ? '' : ('' + (g.fn ? ' · ' + esc(g.fn) : ''))) + '</span></span>'
      + (g.other ? '' : bandChip(band))
      + '</div>';
    var cards = g.systems.map(function (s) { return sysCard(s, model, true); }).join('');
    return '<div class="c5pa" style="padding:14px 16px;margin:0 0 14px;border-left:3px solid var(--' + (g.other ? 'line' : bandCol(band)) + ')">' + head + cards + '</div>';
  }

  function verdictHero(model, scB) {
    var v = model.verdict, col = bandCol(v.band);
    var reason;
    if (v.driver && v.driver.ctrl && v.driver.of5 != null) {
      reason = T('er.reason.full', { hi: v.nHigh, el: v.nElev, pct: v.pctExposed, sys: '<b>' + esc(v.driver.name) + '</b>', ctrl: '<b>' + esc(v.driver.ctrl) + '</b>', score: v.driver.of5 });
    } else if (v.driver) {
      reason = T('er.reason.nodriver', { hi: v.nHigh, el: v.nElev, pct: v.pctExposed, sys: '<b>' + esc(v.driver.name) + '</b>' });
    } else {
      reason = T('er.reason.min', { hi: v.nHigh, el: v.nElev, pct: v.pctExposed });
    }
    // Band-specific headline so it always reads as clean English — the old single template
    // slotted the band word into "is at {band} cyber risk", which produced the broken
    // "is at well-defended cyber risk" on the green band.
    var headKey = v.band === 'low' ? 'er.verdict.head.low' : (v.band === 'elevated' ? 'er.verdict.head.elevated' : 'er.verdict.head.high');
    return '<div class="c5pa" style="margin:0 0 14px;padding:18px 20px;border-left:4px solid var(--' + col + ')">'
      + '<div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">'
      + gauge(v.risk, v.band)
      + '<div style="flex:1;min-width:280px">'
      + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:7px"><span style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">' + T('er.verdict.label') + '</span>' + ragChip(v.band) + '</div>'
      + '<div style="font-size:21px;font-weight:800;color:var(--ink);line-height:1.25">' + T(headKey, { scope: scB }) + '</div>'
      + '<div style="font-size:13px;color:var(--ink-2);margin-top:9px;line-height:1.6;max-width:820px">' + reason + '</div>'
      + '</div></div></div>';
  }

  // Verdict-tab scope strip — scored on the SAME cyber-risk number the gauge shows, so an
  // entity never displays two different /5 figures. (The shared scopeNav strip stays a
  // program-MATURITY strip on the program-health tabs, where higher-is-better is correct;
  // here the axis is risk, higher-is-worse, ranked most-exposed first.) Falls back silently.
  function erRiskOf(id) { try { var m = c5EntityRiskModel(id); return (m && m.verdict) ? m.verdict.risk : null; } catch (_) { return null; } }
  function erScopeCell(id, label, sub, rk, lead, curScope, weak) {
    if (rk == null) return '';
    var band = bandOfScore(100 - rk), c = bandCol(band), sel = (id === curScope);
    var bd = sel ? 'var(--blue)' : (weak ? 'var(--crit)' : 'var(--line)');
    return '<button data-scope="' + id + '" style="text-align:left;border:' + (lead ? '2px' : '1px') + ' solid ' + (lead ? 'var(--blue)' : bd) + ';border-radius:10px;padding:9px 12px;background:' + (sel ? 'color-mix(in srgb,var(--blue) 8%,var(--surface))' : 'var(--surface)') + ';cursor:pointer;min-width:150px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="font-size:12px;color:var(--ink)">' + esc(label) + '</b><span style="font-size:17px;font-weight:800;color:var(--' + c + ');font-variant-numeric:tabular-nums">' + (rk / 20).toFixed(1) + '</span></div>'
      + '<div style="font-size:10px;color:var(--muted);margin-top:2px">' + (sub ? (esc(sub) + ' · ') : '') + T('er.rag.' + band) + '</div>'
      + (sel ? '<div style="font-size:10px;font-weight:700;color:var(--blue);margin-top:4px">● ' + T('er.scope.now') + '</div>' : (weak ? '<div style="font-size:10px;font-weight:700;color:var(--crit);margin-top:4px">◆ ' + T('er.scope.weak') + '</div>' : '')) + '</button>';
  }
  function erScopeNav(scope) {
    try {
      if (typeof REGIONS === 'undefined' || !REGIONS || !REGIONS.length) return '';
      var activeRegion = (typeof scopeRegion === 'function') ? scopeRegion(scope) : 'enterprise';
      var lead = '', items = [], title;
      if (scope === 'enterprise') {
        lead = erScopeCell('enterprise', 'Enterprise', 'consolidated · all regions', erRiskOf('enterprise'), true, scope, false);
        REGIONS.filter(function (r) { return r.kind === 'region'; }).forEach(function (r) { var rk = erRiskOf(r.id); if (rk != null) items.push({ id: r.id, label: r.label, sub: r.regime || '', rk: rk }); });
        title = T('er.scope.regions');
      } else {
        var reg = null; REGIONS.forEach(function (r) { if (r.id === activeRegion) reg = r; });
        if (!reg || !reg.entities || !reg.entities.length) return '';
        lead = erScopeCell(reg.id, 'All ' + reg.label, 'consolidated · all entities', erRiskOf(reg.id), true, scope, false);
        reg.entities.forEach(function (e) { var rk = erRiskOf(e.id); if (rk != null) items.push({ id: e.id, label: e.label, sub: '', rk: rk }); });
        title = T('er.scope.entities');
      }
      if (!items.length && !lead) return '';
      items.sort(function (a, b) { return b.rk - a.rk; });   // most-exposed first
      var cards = items.map(function (x, i) { return erScopeCell(x.id, x.label, x.sub, x.rk, false, scope, i === 0 && x.id !== scope); }).join('');
      return '<div class="c5pa" style="margin:0 0 6px;padding:12px 14px"><div style="font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">' + esc(title) + '</div><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:stretch">' + lead + cards + '</div></div>';
    } catch (_) { return ''; }
  }

  function c5EntityRisk() {
    var host = document.getElementById('c5-entityrisk'); if (!host) return;
    try { window.C5_SCOPE_FWKEY = 'csf'; if (typeof C5_ASSESS_FW !== 'undefined') C5_ASSESS_FW = 'csf'; } catch (_) {}
    var scope = (typeof c5Scope === 'function') ? c5Scope() : 'enterprise';
    var scopeLbl = (scope === 'enterprise') ? 'Enterprise' : ((typeof scopeLabel === 'function') ? scopeLabel(scope) : scope);
    var scB = '<b>' + esc(scopeLbl) + '</b>';
    var model; try { model = c5EntityRiskModel(scope); } catch (e) { model = null; }

    var header = (typeof c5header === 'function') ? c5header() : '';
    var scopeNavHtml = '';
    try {
      var ern = erScopeNav(scope);
      if (ern) scopeNavHtml = ern;
      else if (typeof scopeNav === 'function') { var sn = scopeNav(); if (sn) scopeNavHtml = '<div class="c5pa" style="margin:0 0 4px">' + sn + '</div>'; }
    } catch (_) {}
    var deckBtn = (typeof c5DeckBtnHtml === 'function') ? c5DeckBtnHtml('csf') : '';

    if (!model) {
      host.innerHTML = header + scopeNavHtml
        + '<div class="c5pa-eyebrow" style="margin-top:2px">' + T('er.eyebrow', { scope: scB }) + '</div>'
        + '<div class="c5note" style="margin-top:10px">◐ ' + T('er.empty') + '</div>';
      return;
    }

    var eyebrow = '<div class="c5pa-eyebrow" style="margin:2px 0 12px">' + T('er.eyebrow', { scope: scB }) + deckBtn + '</div>';

    // Primary layout: business process → the systems that support it → each system's
    // risks → the controls that mitigate them. Falls back to a flat system list when
    // the value chain (Entity → Process → System) has not been captured.
    var chainTitle = '<div style="display:flex;align-items:baseline;gap:10px;margin:2px 0 12px">'
      + '<span style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">' + T(model.grouped ? 'er.chain' : 'er.systems') + '</span>'
      + '<span style="font-size:11.5px;color:var(--ink-2)">' + T(model.grouped ? 'er.chain.dek' : 'er.systems.basis.crit') + '</span></div>';
    var body = model.grouped
      ? model.groups.map(function (g) { return procGroup(g, model); }).join('')
      : model.systems.map(function (s) { return sysCard(s, model, false); }).join('');

    host.innerHTML = header + scopeNavHtml + eyebrow + verdictHero(model, scB) + chainTitle + body
      + '<div class="c5foot">' + T('er.foot') + '</div>';
    wire(host);
  }
  window.c5EntityRisk = c5EntityRisk;

  function wire(host) {
    try { if (typeof wireScopeNav === 'function') wireScopeNav(host); } catch (_) {}   // risk scope-strip clicks
    host.querySelectorAll('.er-sys[data-sys]').forEach(function (el) {
      el.onclick = function () { var i = +el.dataset.sys; C5_ER_SYS = (C5_ER_SYS === i) ? null : i; C5_ER_RISK = null; c5EntityRisk(); };
    });
    host.querySelectorAll('.er-risk[data-risk]').forEach(function (el) {
      el.onclick = function (ev) { ev.stopPropagation(); var k = el.dataset.risk; C5_ER_RISK = (C5_ER_RISK === k) ? null : k; c5EntityRisk(); };
    });
    // Framework cell → a drill scoped to THAT framework (CIS shows CIS, CSF shows CSF,
    // ISO shows ISO). Must run before the row handler and stop it.
    host.querySelectorAll('.er-fw[data-fw]').forEach(function (el) {
      el.onclick = function (ev) {
        ev.stopPropagation();
        var fw = el.dataset.fw, c = C5_ER_CTRL[el.dataset.cap];
        try { if (c && typeof openDrill === 'function') openDrill(fwLabel(fw) + ' — ' + c.name, fwDrill(fw, c)); } catch (_) {}
      };
    });
    host.querySelectorAll('.er-ctrl[data-cap]').forEach(function (el) {
      el.onclick = function (ev) {
        ev.stopPropagation();
        var k = el.dataset.cap;
        try {
          if (typeof openDrill === 'function' && typeof drillControlValue === 'function' && typeof CAP_BY_KEY !== 'undefined' && CAP_BY_KEY[k]) {
            openDrill(CAP_BY_KEY[k].name + ' — value & calculation', drillControlValue(k));
          }
        } catch (_) {}
      };
    });
  }
})();
