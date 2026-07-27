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

    return {
      scope: scope, systems: systems, basis: basis,
      totalCrit: ps.totalCrit, procTree: ps.on,
      verdict: {
        score: entityScore, band: entityBand, of5: (entityScore / 20).toFixed(1),
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
  function llChip(level) { var col = level === 'hi' ? 'crit' : (level === 'med' ? 'warn' : 'muted'); return '<b style="color:var(--' + col + ')">' + T('br.' + level) + '</b>'; }
  function fwids(arr, cls) {
    if (!arr || !arr.length) return '<span style="color:var(--muted)">—</span>';
    return arr.map(function (id) { return '<span class="fwid ' + cls + '" style="margin:0 3px 3px 0">' + esc(id) + '</span>'; }).join('');
  }
  function provBadge(provider) {
    var common = provider === 'common', col = common ? 'blue' : 'ink-2';
    return '<span style="font-size:10px;font-weight:700;color:var(--' + col + ');white-space:nowrap">' + (common ? '⬡ ' : '◈ ') + T(common ? 'br.ctrl.common' : 'br.ctrl.specific') + '</span>';
  }

  // Semicircular verdict gauge — the answer, at a glance.
  function gauge(score, band) {
    var col = bandCol(band), R = 52, CX = 64, CY = 64;
    var frac = Math.max(0, Math.min(100, score)) / 100;
    // 180° sweep, left (empty/red edge) → right; needle at the score.
    var ang = Math.PI * (1 - frac);
    var nx = CX + R * Math.cos(ang), ny = CY - R * Math.sin(ang);
    var C = Math.PI * R; // half-circumference
    return '<svg viewBox="0 0 128 78" width="128" height="78" style="flex:none">'
      + '<path d="M12 64 A52 52 0 0 1 116 64" fill="none" stroke="var(--line)" stroke-width="10" stroke-linecap="round"/>'
      + '<path d="M12 64 A52 52 0 0 1 116 64" fill="none" stroke="var(--' + col + ')" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + (frac * C).toFixed(1) + ' ' + C.toFixed(1) + '"/>'
      + '<line x1="' + CX + '" y1="' + CY + '" x2="' + nx.toFixed(1) + '" y2="' + ny.toFixed(1) + '" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/>'
      + '<circle cx="' + CX + '" cy="' + CY + '" r="3.5" fill="var(--ink)"/>'
      + '<text x="' + CX + '" y="58" text-anchor="middle" font-size="20" font-weight="800" fill="var(--' + col + ')" font-family="var(--mono,ui-monospace)">' + (score / 20).toFixed(1) + '</text>'
      + '<text x="' + CX + '" y="72" text-anchor="middle" font-size="9" fill="var(--muted)">' + esc(T('er.gauge.of5')) + '</text>'
      + '</svg>';
  }

  // The control table for one risk — every mitigating control across CSF · CIS · ISO,
  // its Program-Health score (PH) and whether it is corporate-common or entity-run.
  function ctrlTable(risk) {
    var head = '<div style="display:grid;grid-template-columns:1.6fr 1fr .7fr 1fr 1.15fr 1.1fr;gap:8px;padding:6px 10px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line)">'
      + '<span>' + T('br.ctrl.col.cap') + '</span><span>' + T('br.ctrl.col.csf') + '</span><span>' + T('br.ctrl.col.cis') + '</span><span>' + T('br.ctrl.col.iso') + '</span><span>' + T('er.ctrl.col.ph') + '</span><span>' + T('br.ctrl.col.model') + '</span></div>';
    var rows = risk.controls.map(function (c) {
      var isWeak = risk.weakest && c.k === risk.weakest.k;
      return '<div class="er-ctrl" data-cap="' + c.k + '" style="display:grid;grid-template-columns:1.6fr 1fr .7fr 1fr 1.15fr 1.1fr;gap:8px;align-items:center;padding:9px 10px;border-bottom:1px solid var(--line);cursor:pointer' + (isWeak ? ';background:color-mix(in srgb,var(--crit) 5%,transparent)' : '') + '">'
        + '<span style="font-size:12px;color:var(--ink);font-weight:600">' + esc(c.name) + (isWeak ? ' <span style="font-size:9px;color:var(--crit);font-weight:800">⚠</span>' : '') + '<span style="display:block;font-size:10px;color:var(--muted);font-weight:500">' + esc(c.tool) + '</span></span>'
        + '<span style="font-size:11px">' + fwids(c.csf, 'csf') + '</span>'
        + '<span style="font-size:11px">' + fwids(c.cis, 'r53') + '</span>'
        + '<span style="font-size:11px">' + fwids(c.iso, 'csf') + '</span>'
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
      + '<span style="font-size:11px;color:var(--ink-2)">' + T('br.risk.likelihood') + ' ' + llChip(risk.likelihood) + '</span>'
      + '<span style="font-size:11px;color:var(--ink-2)">' + T('br.risk.impact') + ' ' + llChip(risk.impact) + '</span>'
      + '<span style="font-size:11px;color:var(--ink-2);display:flex;align-items:center;gap:7px">' + T('br.risk.mitigation') + ' <b style="color:var(--' + mitCol + ');font-variant-numeric:tabular-nums">' + (risk.mitigation == null ? '—' : risk.mitigation + '%') + '</b></span>'
      + '<span style="font-size:11px;color:var(--blue);font-weight:700">' + T('br.risk.open') + '</span>'
      + '</div>';
    return '<div style="border-bottom:1px solid var(--line)">' + head + (open ? ('<div style="padding:0 12px 12px">' + ctrlTable(risk) + '</div>') : '') + '</div>';
  }

  function sysCard(s, model) {
    var open = (C5_ER_SYS === s.i);
    var expo = s.internet ? T('er.exposure.internet') : T('er.exposure.internal');
    var supp = (model.procTree && s.support != null)
      ? T('er.sys.supports', { n: s.support })
      : (s.isCrit ? T('er.sys.critical') : T('er.sys.standard'));
    var head = '<div class="er-sys" data-sys="' + s.i + '" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:14px 16px;cursor:pointer">'
      + '<span style="flex:1;min-width:220px"><span style="font-size:15px;font-weight:750;color:var(--ink)">' + esc(s.name) + '</span>'
      + (s.cls ? ' <span style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em">· ' + esc(s.cls) + '</span>' : '')
      + '<span style="display:block;font-size:11px;color:var(--ink-2);margin-top:3px">' + supp + ' · ' + expo + '</span></span>'
      + bandChip(s.band)
      + '<span style="width:132px;flex:none">' + matBar(s.weakMit, false) + '</span>'
      + '<span style="font-size:11px;color:var(--blue);font-weight:700;flex:none">' + T('er.sys.open') + '</span>'
      + '</div>';
    var body = open ? ('<div style="border-top:1px solid var(--line)">'
      + '<div style="padding:10px 16px 4px;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)">' + T('er.sys.risks') + '</div>'
      + s.risks.map(function (r) { return riskRow(r, s.i); }).join('') + '</div>') : '';
    return '<div style="border:1px solid var(--line);border-radius:13px;overflow:hidden;margin-bottom:10px;background:var(--surface)' + (open ? ';box-shadow:0 1px 0 color-mix(in srgb,var(--blue) 30%,transparent)' : '') + '">' + head + body + '</div>';
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
    return '<div class="c5pa" style="margin:0 0 14px;padding:18px 20px;border-left:4px solid var(--' + col + ')">'
      + '<div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">'
      + gauge(v.score, v.band)
      + '<div style="flex:1;min-width:280px">'
      + '<div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:6px">' + T('er.verdict.label') + '</div>'
      + '<div style="font-size:21px;font-weight:800;color:var(--ink);line-height:1.25">' + T('er.verdict.headline', { scope: scB, band: '<span style="color:var(--' + col + ')">' + T('er.band.' + v.band) + '</span>' }) + '</div>'
      + '<div style="font-size:13px;color:var(--ink-2);margin-top:9px;line-height:1.6;max-width:820px">' + reason + '</div>'
      + '</div></div></div>';
  }

  function c5EntityRisk() {
    var host = document.getElementById('c5-entityrisk'); if (!host) return;
    try { window.C5_SCOPE_FWKEY = 'csf'; if (typeof C5_ASSESS_FW !== 'undefined') C5_ASSESS_FW = 'csf'; } catch (_) {}
    var scope = (typeof c5Scope === 'function') ? c5Scope() : 'enterprise';
    var scopeLbl = (scope === 'enterprise') ? 'Enterprise' : ((typeof scopeLabel === 'function') ? scopeLabel(scope) : scope);
    var scB = '<b>' + esc(scopeLbl) + '</b>';
    var model; try { model = c5EntityRiskModel(scope); } catch (e) { model = null; }

    var header = (typeof c5header === 'function') ? c5header() : '';
    var scopeNavHtml = ''; try { if (typeof scopeNav === 'function') { var sn = scopeNav(); if (sn) scopeNavHtml = '<div class="c5pa" style="margin:0 0 4px">' + sn + '</div>'; } } catch (_) {}
    var deckBtn = (typeof c5DeckBtnHtml === 'function') ? c5DeckBtnHtml('csf') : '';

    if (!model) {
      host.innerHTML = header + scopeNavHtml
        + '<div class="c5pa-eyebrow" style="margin-top:2px">' + T('er.eyebrow', { scope: scB }) + '</div>'
        + '<div class="c5note" style="margin-top:10px">◐ ' + T('er.empty') + '</div>';
      return;
    }

    var eyebrow = '<div class="c5pa-eyebrow" style="margin:2px 0 12px">' + T('er.eyebrow', { scope: scB }) + deckBtn + '</div>';

    var systemsTitle = '<div style="display:flex;align-items:baseline;gap:10px;margin:2px 0 10px">'
      + '<span style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">' + T('er.systems') + '</span>'
      + '<span style="font-size:11.5px;color:var(--ink-2)">' + T(model.basis === 'process' ? 'er.systems.basis.proc' : 'er.systems.basis.crit') + '</span></div>';
    var cards = model.systems.map(function (s) { return sysCard(s, model); }).join('');

    host.innerHTML = header + scopeNavHtml + eyebrow + verdictHero(model, scB) + systemsTitle + cards
      + '<div class="c5foot">' + T('er.foot') + '</div>';
    wire(host);
  }
  window.c5EntityRisk = c5EntityRisk;

  function wire(host) {
    host.querySelectorAll('.er-sys[data-sys]').forEach(function (el) {
      el.onclick = function () { var i = +el.dataset.sys; C5_ER_SYS = (C5_ER_SYS === i) ? null : i; C5_ER_RISK = null; c5EntityRisk(); };
    });
    host.querySelectorAll('.er-risk[data-risk]').forEach(function (el) {
      el.onclick = function (ev) { ev.stopPropagation(); var k = el.dataset.risk; C5_ER_RISK = (C5_ER_RISK === k) ? null : k; c5EntityRisk(); };
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
