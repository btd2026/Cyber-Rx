/* ============================================================================
   Control map — the mirror image of Business risk.
   ----------------------------------------------------------------------------
   Business risk reads process → risk → control. This reads CONTROL → PROCESS →
   RISK: start from an actual framework control (e.g. NIST CSF PR.AA-01, or the
   governance control GV.OC-01) and trace it forward to the business processes it
   governs and the cyber risks it mitigates on each. One control protects many
   processes; on each it answers a different risk.

   It reuses ONE spine — nothing is hardcoded — by inverting c5BizRiskModel:
     • technical controls  ← the capability that delivers each CSF subcategory
       (CAP_FRAMEWORK.csf), its scope-aware deployment (capDeploy) and provider
       (capProvider → corporate-common / entity-run), and the process→risk
       mitigation the biz-risk model already computed.
     • governance controls ← the GV.* subcategories evidenced by POLICY, read from
       the scope-resolved docScores() (Corporate-inherited for a centralized /
       hybrid entity, own for a federated one). A governance control doesn't block
       malware — it makes a process a governed, prioritized critical service so its
       protective controls are actually funded. It sets the frame for every
       critical process.
   Scope-aware end to end (Enterprise = mean of regions = mean of entities) and
   centralized/decentralized-aware, exactly like the rest of the cockpit. ======= */
(function () {
  'use strict';
  function T(k, p) { return (typeof c5osT === 'function') ? c5osT(k, p) : ((typeof nt === 'function') ? nt(k, p) : k); }
  function esc(s) { return (typeof c5esc === 'function') ? c5esc(s) : String(s == null ? '' : s); }

  var FN_ORDER = { GV: 0, ID: 1, PR: 2, DE: 3, RS: 4, RC: 5 };
  var FN_COLOR = { GV: '#6E4FA3', ID: 'var(--blue,#2D6CDF)', PR: 'var(--good,#0CA30C)', DE: 'var(--warn,#E8A33D)', RS: 'var(--crit,#C0392B)', RC: '#0E7C86' };
  function GOV_RISK() { return { key: 'governance', name: T('cm.govern.risk'), impact: 'gov', govern: true, adversarial: false }; }
  function sevOf(r) { if (r.govern || r.impact === 'gov') return 'gov'; return r.impact === 'hi' ? 'crit' : (r.impact === 'med' ? 'high' : 'med'); }
  function sevColor(s) { return s === 'crit' ? 'var(--crit,#C0392B)' : s === 'high' ? 'var(--warn,#E8A33D)' : s === 'gov' ? '#6E4FA3' : 'var(--muted,#8892a6)'; }
  function csfName(id) { return (typeof c5CsfName === 'function') ? c5CsfName(id) : ''; }

  // ── Model ────────────────────────────────────────────────────────────────
  function c5ControlMapModel(scope) {
    var biz = (typeof window.c5BizRiskModel === 'function') ? window.c5BizRiskModel(scope) : null;
    if (!biz) return null;
    var CAPFW = (typeof CAP_FRAMEWORK !== 'undefined') ? CAP_FRAMEWORK : {};
    var XW = (typeof NEURON_XWALK !== 'undefined') ? NEURON_XWALK : {};

    // Invert the biz model by capability: cap → {maturity, provider, procs:{name:{process, risks}}}
    var capIdx = {};
    biz.processes.forEach(function (proc) {
      proc.risks.forEach(function (risk) {
        risk.controls.forEach(function (ctrl) {
          var e = capIdx[ctrl.k] || (capIdx[ctrl.k] = { k: ctrl.k, name: ctrl.name, tool: ctrl.tool, maturity: ctrl.maturity, provider: ctrl.provider, procs: {} });
          var pe = e.procs[proc.name] || (e.procs[proc.name] = { process: proc, risks: {} });
          pe.risks[risk.key] = risk;
        });
      });
    });

    // Expand each capability into the CSF subcategories it satisfies (control-first granularity).
    var byId = {};
    Object.keys(capIdx).forEach(function (k) {
      var cap = capIdx[k], fw = CAPFW[k] || {};
      (fw.csf || []).forEach(function (cid) {
        var e = byId[cid] || (byId[cid] = { id: cid, fn: cid.slice(0, 2), csfName: csfName(cid), govern: false, capNames: {}, caps: [], procs: {}, cis: {}, iso: {} });
        e.caps.push(cap); e.capNames[cap.name] = 1;
        Object.keys(cap.procs).forEach(function (pn) {
          var pe = e.procs[pn] || (e.procs[pn] = { process: cap.procs[pn].process, risks: {} });
          Object.assign(pe.risks, cap.procs[pn].risks);
        });
        ((XW[k] && XW[k].cis) || []).forEach(function (i) { e.cis[i] = 1; });
        ((XW[k] && XW[k].iso) || []).forEach(function (i) { e.iso[i] = 1; });
      });
    });

    // Governance controls (GV.*) from the scope-resolved policy evidence — they set the frame for
    // every critical process. All GV controls map identically (governance risk on every process), so
    // we show ONE representative per Govern category (lowest id, so e.g. GV.OC-01), keeping the map
    // readable rather than repeating 20 identical rows. Maturity = the policy's CMMI (0–5) → %,
    // scope-resolved with Corporate inheritance.
    var ds = (typeof docScores === 'function') ? docScores() : {};
    var gov = GOV_RISK();
    var govCat = {};
    Object.keys(ds).forEach(function (id) {
      if (id.slice(0, 2) !== 'GV') return;
      var cat = id.split('-')[0];
      if (!govCat[cat] || id < govCat[cat]) govCat[cat] = id;
    });
    var CAT_ORDER = ['GV.OC', 'GV.RM', 'GV.RR', 'GV.PO', 'GV.OV', 'GV.SC'];
    Object.keys(govCat).sort(function (a, b) { var ia = CAT_ORDER.indexOf(a), ib = CAT_ORDER.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); }).forEach(function (cat) {
      var id = govCat[cat], cmmi = Number(ds[id] && ds[id].cmmi); if (!isFinite(cmmi)) cmmi = 0;
      var e = { id: id, fn: 'GV', csfName: csfName(id), govern: true, capNames: {}, caps: [], procs: {}, cis: {}, iso: {}, cmmi: cmmi, doc: (ds[id] && ds[id].doc) || '' };
      biz.processes.forEach(function (proc) { e.procs[proc.name] = { process: proc, risks: { governance: gov } }; });
      byId[id] = e;
    });

    var controls = Object.keys(byId).map(function (cid) {
      var e = byId[cid];
      if (e.govern) { e.maturity = Math.round(e.cmmi / 5 * 100); e.provider = 'common'; e.deliveredBy = e.doc || T('cm.policy'); }
      else {
        var ms = e.caps.map(function (c) { return c.maturity; }).filter(function (v) { return v != null; });
        e.maturity = ms.length ? Math.round(ms.reduce(function (a, b) { return a + b; }, 0) / ms.length) : null;
        e.provider = e.caps.map(function (c) { return c.provider; }).every(function (p) { return p === 'common'; }) ? 'common' : 'specific';
        e.deliveredBy = Object.keys(e.capNames).join(' · ');
      }
      e.cisIds = Object.keys(e.cis); e.isoIds = Object.keys(e.iso);
      e.procList = Object.keys(e.procs).map(function (pn) { return { name: pn, process: e.procs[pn].process, risks: Object.keys(e.procs[pn].risks).map(function (rk) { return e.procs[pn].risks[rk]; }) }; });
      e.procN = e.procList.length;
      var rset = {}; e.procList.forEach(function (p) { p.risks.forEach(function (r) { rset[r.key] = 1; }); });
      e.riskN = Object.keys(rset).length;
      return e;
    });
    controls.sort(function (a, b) { return (FN_ORDER[a.fn] - FN_ORDER[b.fn]) || (a.id < b.id ? -1 : 1); });

    return { scope: scope, controls: controls, nControls: controls.length, nProc: biz.nProc, mRisks: biz.mRisks, kPct: biz.kPct, processes: biz.processes };
  }
  window.c5ControlMapModel = c5ControlMapModel;

  // ── Rendering ──────────────────────────────────────────────────────────────
  var C5_CM_MODE = 'control';   // 'control' | 'process'
  var C5_CM_SEL = null;         // selected control id
  var C5_CM_PSEL = null;        // selected process name

  function matBar(p) {
    var col = (typeof capColor === 'function') ? capColor(p) : (p == null ? 'muted' : p >= 90 ? 'good' : p >= 75 ? 'blue' : p >= 50 ? 'warn' : 'crit');
    var w = p == null ? 0 : Math.max(0, Math.min(100, p));
    return '<div style="display:flex;align-items:center;gap:8px;min-width:110px"><div style="flex:1;height:6px;background:var(--line);border-radius:4px;overflow:hidden;min-width:52px"><i style="display:block;height:100%;width:' + w + '%;background:var(--' + col + ')"></i></div><span style="font-size:11px;font-weight:700;color:var(--' + col + ');font-variant-numeric:tabular-nums">' + (p == null ? '—' : p + '%') + '</span></div>';
  }
  function provBadge(provider) {
    var common = provider === 'common';
    return '<span style="font-size:10px;font-weight:700;color:' + (common ? 'var(--blue)' : 'var(--ink-2)') + ';white-space:nowrap">' + (common ? '⬡ ' : '◈ ') + T(common ? 'br.ctrl.common' : 'br.ctrl.specific') + '</span>';
  }
  function riskChip(r) {
    var s = sevOf(r);
    return '<span style="display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:550;border:1px ' + (s === 'gov' ? 'dashed' : 'solid') + ' var(--line);border-radius:20px;padding:4px 11px 4px 9px;color:var(--ink-2)"><span style="width:8px;height:8px;border-radius:50%;flex:none;background:' + sevColor(s) + '"></span>' + esc(r.name) + '</span>';
  }
  function fwids(arr, cls) {
    if (!arr || !arr.length) return '';
    return arr.slice(0, 4).map(function (id) { return '<span class="fwid ' + cls + '" style="margin:0 3px 3px 0">' + esc(id) + '</span>'; }).join('');
  }
  function fnChip(fn) {
    return '<span style="font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#fff;background:' + (FN_COLOR[fn] || 'var(--muted)') + ';border-radius:6px;padding:2px 8px">' + T('fn.' + fn) + '</span>';
  }

  // Left rail — controls grouped by CSF function (governance first), or processes.
  function railHtml(model) {
    if (C5_CM_MODE === 'control') {
      var order = ['GV', 'ID', 'PR', 'DE', 'RS', 'RC'], html = '<div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:14px 16px 6px">' + T('cm.controls') + '</div>';
      order.forEach(function (fn) {
        var items = model.controls.filter(function (c) { return c.fn === fn; });
        if (!items.length) return;
        var isGov = fn === 'GV';
        html += '<div style="border-top:1px solid var(--line)"><div style="font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:10px 16px 4px;color:' + (FN_COLOR[fn] || 'var(--muted)') + ';display:flex;align-items:center;gap:7px"><span style="width:7px;height:7px;border-radius:2px;background:' + (FN_COLOR[fn] || 'var(--muted)') + '"></span>' + T('fn.' + fn) + (isGov ? (' <span style="font-weight:500;color:var(--muted);text-transform:none;letter-spacing:0">· ' + T('cm.govern.group') + '</span>') : '') + '</div>';
        items.forEach(function (c) {
          var on = c.id === C5_CM_SEL;
          html += '<button class="cm-item" data-cid="' + esc(c.id) + '" style="display:flex;align-items:flex-start;gap:10px;width:100%;text-align:left;background:' + (on ? 'color-mix(in srgb,var(--blue) 8%,transparent)' : 'transparent') + ';border:0;border-left:3px solid ' + (on ? 'var(--blue)' : 'transparent') + ';cursor:pointer;padding:8px 16px 8px 13px;font-family:inherit">'
            + '<span style="font-family:var(--mono,ui-monospace);font-size:11.5px;font-weight:700;color:var(--blue);flex:none;width:64px;padding-top:1px">' + esc(c.id) + '</span>'
            + '<span style="flex:1;min-width:0"><span style="font-size:12.5px;color:var(--ink);line-height:1.35;display:block">' + esc(c.csfName || c.deliveredBy) + '</span>'
            + '<span style="display:flex;align-items:center;gap:7px;margin-top:3px">' + matBar(c.maturity) + '</span></span></button>';
        });
        html += '</div>';
      });
      return html;
    }
    var h2 = '<div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:14px 16px 6px">' + T('br.processes') + '</div><div style="border-top:1px solid var(--line)">';
    model.processes.forEach(function (p) {
      var n = model.controls.filter(function (c) { return c.procList.some(function (x) { return x.name === p.name; }); }).length;
      var on = p.name === C5_CM_PSEL;
      h2 += '<button class="cm-pitem" data-pn="' + esc(p.name) + '" style="display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:' + (on ? 'color-mix(in srgb,var(--blue) 8%,transparent)' : 'transparent') + ';border:0;border-left:3px solid ' + (on ? 'var(--blue)' : 'transparent') + ';cursor:pointer;padding:10px 16px 10px 13px;font-family:inherit">'
        + '<span style="flex:1;min-width:0"><span style="font-size:13px;font-weight:650;color:var(--ink)">' + esc(p.name) + '</span>'
        + '<span style="display:block;font-size:11px;color:var(--muted);margin-top:2px">' + T('cm.stat.controls') + ': <b style="color:var(--ink-2)">' + n + '</b></span></span></button>';
    });
    return h2 + '</div>';
  }

  function detailHtml(model) {
    if (C5_CM_MODE === 'control') {
      var c = model.controls.filter(function (x) { return x.id === C5_CM_SEL; })[0] || model.controls[0];
      if (!c) return '';
      var cards = c.procList.map(function (pl) {
        var p = pl.process;
        return '<div style="border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:10px">'
          + '<div style="display:flex;align-items:center;gap:11px;flex-wrap:wrap"><span style="font-weight:650;font-size:14px;color:var(--ink)">' + esc(p.name) + '</span>'
          + (p.tier ? '<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)">· ' + esc(p.tier) + '</span>' : '') + '</div>'
          + '<div style="font-size:11.5px;color:var(--muted);margin:11px 0 7px">' + T('cm.mitigateson') + '</div>'
          + '<div style="display:flex;flex-wrap:wrap;gap:7px">' + pl.risks.map(riskChip).join('') + '</div></div>';
      }).join('');
      var note = c.govern ? T('cm.govern.note') : T('cm.tech.note', { ctrl: '<b>' + esc(c.deliveredBy) + '</b>', k: (c.maturity == null ? '—' : c.maturity) });
      var idRow = '<span style="font-size:11px">' + fwids(c.cisIds, 'r53') + fwids(c.isoIds, 'csf') + '</span>';
      return '<div style="padding:20px 22px 16px;border-bottom:1px solid var(--line)">'
        + '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">' + fnChip(c.fn) + '<span style="font-family:var(--mono,ui-monospace);font-size:14px;font-weight:700;color:var(--blue)">' + esc(c.id) + '</span></div>'
        + '<div style="font-family:var(--serif,Georgia);font-weight:650;font-size:22px;line-height:1.2;margin:11px 0 0;color:var(--ink)">' + esc(c.csfName || c.deliveredBy) + '</div>'
        + '<div style="font-size:13.5px;color:var(--ink-2);margin:10px 0 0;max-width:62ch;line-height:1.55">' + note + '</div>'
        + '<div style="display:flex;gap:22px;flex-wrap:wrap;margin:16px 0 0">'
        + stat((c.maturity == null ? '—' : c.maturity + '%'), T('cm.stat.maturity'))
        + stat(String(c.procN), T('cm.stat.processes'))
        + stat(String(c.riskN), T('cm.stat.risks'))
        + '<div><div style="font-size:13px;font-weight:600;color:var(--ink);padding-top:5px">' + provBadge(c.provider) + '</div><div style="font-size:11px;color:var(--muted);margin-top:4px">' + T(c.govern ? 'cm.evidencedby' : 'cm.deliveredby') + '</div></div>'
        + '</div>'
        + (c.cisIds.length || c.isoIds.length ? '<div style="margin-top:12px">' + idRow + '</div>' : '')
        + '</div>'
        + '<div style="padding:8px 22px 20px"><div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:14px 0 12px">' + T('cm.detail.processes') + ' <span style="font-family:var(--mono,ui-monospace);color:var(--ink);background:var(--line);border-radius:20px;padding:1px 8px;font-size:11px">' + c.procN + '</span></div>' + cards + '</div>';
    }
    // by process
    var pn = C5_CM_PSEL || (model.processes[0] && model.processes[0].name);
    var rows = model.controls.filter(function (c) { return c.procList.some(function (x) { return x.name === pn; }); });
    var proc = (model.processes.filter(function (p) { return p.name === pn; })[0]) || {};
    var cards2 = rows.map(function (c) {
      var pl = c.procList.filter(function (x) { return x.name === pn; })[0];
      return '<div style="border:1px solid var(--line);border-radius:12px;padding:13px 16px;margin-bottom:10px">'
        + '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' + fnChip(c.fn) + '<span style="font-family:var(--mono,ui-monospace);font-size:12.5px;font-weight:700;color:var(--blue)">' + esc(c.id) + '</span><span style="font-size:13.5px;font-weight:600;color:var(--ink)">' + esc(c.csfName || c.deliveredBy) + '</span><span style="margin-left:auto;flex:none">' + matBar(c.maturity) + '</span></div>'
        + '<div style="font-size:11.5px;color:var(--muted);margin:11px 0 7px">' + T('cm.mitigateshere') + '</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:7px">' + pl.risks.map(riskChip).join('') + '</div></div>';
    }).join('');
    var rset = {}; rows.forEach(function (c) { var pl = c.procList.filter(function (x) { return x.name === pn; })[0]; pl.risks.forEach(function (r) { rset[r.key] = 1; }); });
    return '<div style="padding:20px 22px 16px;border-bottom:1px solid var(--line)">'
      + '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap"><span style="font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#fff;background:var(--blue);border-radius:6px;padding:2px 8px">' + T('br.processes') + '</span>' + (proc.tier ? '<span style="font-family:var(--mono,ui-monospace);font-size:13px;color:var(--muted)">' + esc(proc.tier) + '</span>' : '') + '</div>'
      + '<div style="font-family:var(--serif,Georgia);font-weight:650;font-size:22px;margin:11px 0 0;color:var(--ink)">' + esc(pn) + '</div>'
      + '<div style="display:flex;gap:22px;flex-wrap:wrap;margin:16px 0 0">' + stat(String(rows.length), T('cm.stat.controls')) + stat(String(Object.keys(rset).length), T('cm.stat.risks')) + '</div></div>'
      + '<div style="padding:8px 22px 20px"><div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:14px 0 12px">' + T('cm.detail.controls') + '</div>' + cards2 + '</div>';
  }
  function stat(v, l) { return '<div><div style="font-family:var(--mono,ui-monospace);font-size:22px;font-weight:700;color:var(--ink);line-height:1;font-variant-numeric:tabular-nums">' + v + '</div><div style="font-size:11px;color:var(--muted);margin-top:4px">' + l + '</div></div>'; }

  function matrixHtml(model) {
    var procs = model.processes;
    var head = '<thead><tr><th style="text-align:left;padding:9px 10px;font-size:11px;font-weight:600;color:var(--ink-2);border-bottom:1px solid var(--line);border-right:1px solid var(--line);position:sticky;left:0;background:var(--surface)">' + T('cm.matrix.control') + '</th>'
      + procs.map(function (p) { return '<th style="text-align:center;padding:9px 10px;font-size:11px;font-weight:650;color:var(--ink);border-bottom:1px solid var(--line);white-space:nowrap">' + esc(p.name) + '<span style="display:block;font-weight:500;color:var(--muted);font-size:10px">' + esc(p.tier) + '</span></th>'; }).join('') + '</tr></thead>';
    var body = '<tbody>' + model.controls.map(function (c) {
      var on = c.id === C5_CM_SEL;
      var cells = procs.map(function (p) {
        var pl = c.procList.filter(function (x) { return x.name === p.name; })[0];
        if (!pl) return '<td style="padding:8px 10px;text-align:center;border-bottom:1px solid var(--line)"><span style="color:var(--line)">·</span></td>';
        var dots = pl.risks.map(function (r) { var s = sevOf(r); return '<span title="' + esc(r.name) + '" style="width:9px;height:9px;border-radius:2px;display:inline-block;background:' + sevColor(s) + '"></span>'; }).join('');
        return '<td style="padding:8px 10px;text-align:center;border-bottom:1px solid var(--line)"><span style="display:inline-flex;flex-wrap:wrap;gap:4px;justify-content:center;max-width:64px">' + dots + '</span></td>';
      }).join('');
      return '<tr class="cm-row" data-cid="' + esc(c.id) + '" style="cursor:pointer;background:' + (on ? 'color-mix(in srgb,var(--blue) 7%,transparent)' : 'transparent') + '">'
        + '<td style="padding:8px 10px;border-bottom:1px solid var(--line);border-right:1px solid var(--line);min-width:200px;position:sticky;left:0;background:' + (on ? 'color-mix(in srgb,var(--blue) 7%,var(--surface))' : 'var(--surface)') + '"><span style="font-family:var(--mono,ui-monospace);font-size:11.5px;font-weight:700;color:var(--blue);border-left:3px solid ' + (FN_COLOR[c.fn] || 'var(--muted)') + ';padding-left:8px">' + esc(c.id) + '</span><span style="display:block;font-size:11px;color:var(--ink-2);margin-top:2px;max-width:200px">' + esc(c.csfName || c.deliveredBy) + '</span></td>'
        + cells + '</tr>';
    }).join('') + '</tbody>';
    return '<table style="border-collapse:separate;border-spacing:0;min-width:680px;width:100%;font-size:12.5px">' + head + body + '</table>';
  }

  function c5ControlMap() {
    var host = document.getElementById('c5-controlmap'); if (!host) return;
    try { window.C5_SCOPE_FWKEY = 'csf'; if (typeof C5_ASSESS_FW !== 'undefined') C5_ASSESS_FW = 'csf'; } catch (_) {}
    var scope = (typeof c5Scope === 'function') ? c5Scope() : 'enterprise';
    var scopeLbl = (scope === 'enterprise') ? 'Enterprise' : ((typeof scopeLabel === 'function') ? scopeLabel(scope) : scope);
    var scB = '<b>' + esc(scopeLbl) + '</b>';
    var model; try { model = c5ControlMapModel(scope); } catch (e) { model = null; }

    var header = (typeof c5header === 'function') ? c5header() : '';
    var scopeNavHtml = ''; try { if (typeof scopeNav === 'function') { var sn = scopeNav(); if (sn) scopeNavHtml = '<div class="c5pa" style="margin:0 0 4px">' + sn + '</div>'; } } catch (_) {}
    var deckBtn = (typeof c5DeckBtnHtml === 'function') ? c5DeckBtnHtml('csf') : '';

    if (!model || !model.controls.length) {
      host.innerHTML = header + scopeNavHtml + '<div class="c5pa-eyebrow" style="margin-top:2px">' + T('cm.eyebrow', { scope: scB }) + '</div><div class="c5note" style="margin-top:10px">◐ ' + T('cm.empty') + '</div>';
      return;
    }
    if (!C5_CM_SEL || !model.controls.some(function (c) { return c.id === C5_CM_SEL; })) C5_CM_SEL = model.controls[0].id;
    if (!C5_CM_PSEL || !model.processes.some(function (p) { return p.name === C5_CM_PSEL; })) C5_CM_PSEL = model.processes[0] && model.processes[0].name;

    var hero = '<div class="c5pa" style="margin:0 0 14px;padding:16px 18px">'
      + '<div class="c5pa-eyebrow" style="margin:0 0 9px">' + T('cm.eyebrow', { scope: scB }) + deckBtn + '</div>'
      + '<div style="font-size:16px;font-weight:750;color:var(--ink);line-height:1.45">' + T('cm.finding', { scope: scB, n: model.nControls, p: model.nProc, m: model.mRisks, k: model.kPct }) + '</div>'
      + '<div style="font-size:12px;color:var(--ink-2);margin-top:9px;line-height:1.6;max-width:880px">' + T('cm.dek') + '</div>'
      + '</div>';

    var seg = '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:2px 0 12px">'
      + '<div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">' + T('cm.controls') + '</div>'
      + '<div style="margin-left:auto;display:inline-flex;background:var(--line);border-radius:10px;padding:3px">'
      + '<button class="cm-seg" data-mode="control" style="font-size:12px;font-weight:600;border:0;border-radius:7px;padding:6px 12px;cursor:pointer;background:' + (C5_CM_MODE === 'control' ? 'var(--surface)' : 'transparent') + ';color:' + (C5_CM_MODE === 'control' ? 'var(--ink)' : 'var(--muted)') + '">' + T('cm.by.control') + '</button>'
      + '<button class="cm-seg" data-mode="process" style="font-size:12px;font-weight:600;border:0;border-radius:7px;padding:6px 12px;cursor:pointer;background:' + (C5_CM_MODE === 'process' ? 'var(--surface)' : 'transparent') + ';color:' + (C5_CM_MODE === 'process' ? 'var(--ink)' : 'var(--muted)') + '">' + T('cm.by.process') + '</button>'
      + '</div></div>';

    var explorer = '<div style="display:grid;grid-template-columns:300px 1fr;gap:16px;align-items:start">'
      + '<div class="c5pa" style="padding:0;overflow:hidden">' + railHtml(model) + '</div>'
      + '<div class="c5pa" style="padding:0;overflow:hidden">' + detailHtml(model) + '</div></div>';

    var matrix = '<div class="c5pa" style="padding:0;overflow:hidden;margin-top:16px">'
      + '<div style="padding:16px 20px 4px"><div style="font-size:15px;font-weight:750;color:var(--ink)">' + T('cm.matrix.title') + '</div>'
      + '<div style="font-size:12.5px;color:var(--ink-2);margin-top:6px;line-height:1.5;max-width:74ch">' + T('cm.matrix.dek') + '</div></div>'
      + '<div style="overflow-x:auto;padding:8px 12px 16px">' + matrixHtml(model) + '</div></div>';

    host.innerHTML = header + scopeNavHtml + hero + seg + explorer + matrix + '<div class="c5foot">' + T('cm.foot') + '</div>';
    wire(host);
  }
  window.c5ControlMap = c5ControlMap;

  function wire(host) {
    host.querySelectorAll('.cm-seg[data-mode]').forEach(function (b) { b.onclick = function () { C5_CM_MODE = b.dataset.mode; c5ControlMap(); }; });
    host.querySelectorAll('.cm-item[data-cid]').forEach(function (b) { b.onclick = function () { C5_CM_SEL = b.dataset.cid; c5ControlMap(); }; });
    host.querySelectorAll('.cm-pitem[data-pn]').forEach(function (b) { b.onclick = function () { C5_CM_PSEL = b.dataset.pn; c5ControlMap(); }; });
    host.querySelectorAll('.cm-row[data-cid]').forEach(function (r) {
      r.onclick = function () { C5_CM_MODE = 'control'; C5_CM_SEL = r.dataset.cid; c5ControlMap(); var d = document.getElementById('c5-controlmap'); if (d) try { d.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {} };
    });
  }
})();
