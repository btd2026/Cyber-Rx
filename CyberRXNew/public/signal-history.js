/* ============================================================================
   Signal history — makes "continuous" real.
   ----------------------------------------------------------------------------
   The cockpit scores control coverage at a point in time. To claim CONTINUOUS
   assessment (and to show DRIFT — the thing a green-but-decaying compliance
   dashboard hides), we persist a daily coverage point per control per scope and
   expose the series, the trend over a window, and a sparkline. localStorage-
   backed today (per-tenant, client-side); the same shape a backend
   signal_history(org, scope, key, value, as_of) table would serve.

   Idempotent per calendar day: one point per control per scope per day (latest
   value that day wins), capped so the store can't grow unbounded. In demo mode a
   short illustrative uplift history is seeded once so the continuity story renders
   before a real tenant has accrued its own — clearly labelled illustrative.
   ========================================================================== */
(function () {
  'use strict';
  var KEY = 'cyberrx_signal_history', MAXPTS = 180;
  function today() { try { return new Date().toISOString().slice(0, 10); } catch (_) { return ''; } }
  function dateBack(days) { try { return new Date(Date.now() - days * 864e5).toISOString().slice(0, 10); } catch (_) { return today(); } }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (_) {} }
  function caps() { return (typeof CAPS !== 'undefined' && CAPS) ? CAPS : []; }
  function dep(c) { try { return (typeof capDeploy === 'function') ? capDeploy(c) : null; } catch (_) { return null; } }

  // Record today's coverage for every connected control under `scope`.
  function shRecord(scope) {
    if (!caps().length) return;
    var all = load(), sc = all[scope] = all[scope] || {}, d = today();
    caps().forEach(function (c) {
      var p = dep(c); if (p == null) return;
      var arr = sc[c.k] = sc[c.k] || [];
      var last = arr[arr.length - 1];
      if (last && last.d === d) { last.v = p; }
      else { arr.push({ d: d, v: p }); if (arr.length > MAXPTS) arr.splice(0, arr.length - MAXPTS); }
    });
    save(all);
  }

  function shSeries(scope, k) { var all = load(); return (all[scope] && all[scope][k]) || []; }

  // Movement across the series: newest vs the point ~`days` ago (default a quarter),
  // else the oldest point. { points, first, from, to, delta, fromDate, toDate }.
  function shTrend(scope, k, days) {
    var s = shSeries(scope, k); if (!s.length) return null;
    var to = s[s.length - 1];
    if (s.length < 2) return { points: 1, first: true, to: to.v, toDate: to.d };
    var from = s[0];
    if (days) { var cutoff = Date.parse(to.d) - days * 864e5; for (var i = s.length - 1; i >= 0; i--) { if (Date.parse(s[i].d) <= cutoff) { from = s[i]; break; } } }
    return { points: s.length, first: false, from: from.v, to: to.v, delta: to.v - from.v, fromDate: from.d, toDate: to.d };
  }

  // Tiny inline SVG sparkline of the coverage series, coloured by net direction.
  function shSpark(scope, k, w, h) {
    var s = shSeries(scope, k); if (s.length < 2) return '';
    w = w || 90; h = h || 22;
    var vals = s.map(function (p) { return p.v; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), rng = (max - min) || 1;
    var pts = vals.map(function (v, i) { var x = (i / (vals.length - 1)) * (w - 2) + 1; var y = h - ((v - min) / rng) * (h - 3) - 1.5; return x.toFixed(1) + ',' + y.toFixed(1); }).join(' ');
    var col = vals[vals.length - 1] >= vals[0] ? 'good' : 'crit';
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" style="vertical-align:middle;flex:none"><polyline points="' + pts + '" fill="none" stroke="var(--' + col + ')" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }

  // Seed a short illustrative uplift history for demo, once, when the scope has none.
  function shSeedDemo(scope) {
    if (!caps().length) return;
    var all = load(); if (all[scope] && Object.keys(all[scope]).length) return;
    var sc = all[scope] = {}, N = 12;
    caps().forEach(function (c) {
      var cur = dep(c); if (cur == null) return;
      var start = Math.max(0, cur - (10 + (c.k.length % 4) * 3));   // deterministic-ish improving path
      var arr = [];
      for (var i = 0; i < N; i++) { var v = Math.round(start + (cur - start) * (i / (N - 1))); arr.push({ d: dateBack((N - 1 - i) * 7), v: Math.max(0, Math.min(100, v)) }); }
      sc[c.k] = arr;
    });
    save(all);
  }

  // One tick per render: seed demo history if applicable, then record today's point.
  function shTick(scope) {
    try { if (typeof demoActive === 'function' && demoActive()) shSeedDemo(scope); } catch (_) {}
    shRecord(scope);
  }

  window.shRecord = shRecord; window.shSeries = shSeries; window.shTrend = shTrend;
  window.shSpark = shSpark; window.shSeedDemo = shSeedDemo; window.shTick = shTick;
})();
