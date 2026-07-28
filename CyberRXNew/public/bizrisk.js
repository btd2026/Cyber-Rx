/* ============================================================================
   Business risk — Nerion's process → risk → control spine.
   ----------------------------------------------------------------------------
   The market starts from the framework: pick NIST CSF 2.0, walk the controls,
   score them. Nerion inverts that. It starts from the BUSINESS: each critical
   process (the crown-jewel estate), the cyber risks that process actually
   carries, and the controls — across NIST CSF, CIS and ISO 27002 at once —
   that genuinely mitigate each risk. One process has many risks; one risk has
   many controls. This view makes that relationship the primary experience.

   Everything reuses the existing spine so there is ONE model, never a second
   contradictory one:
     • processes      ← LIVE.crown_jewels (the critical-process estate)
     • non-adv risks  ← LIVE.crown_jewel_residual[].non_adversarial (lanes)
     • risk → control ← BR_ADV_CAPS / NEURON_XWALK[].lanes (the real mapping)
     • control → CSF  ← CAP_FRAMEWORK[cap].csf
     • control → CIS  ← NEURON_XWALK[cap].cis
     • control → ISO  ← NEURON_XWALK[cap].iso
     • maturity       ← capDeploy(cap) under THIS SCOPE's telemetry
     • operating model← capProvider(cap, scope) → common (inherited) / specific

   Scope-aware end to end (Enterprise = mean of regions = mean of entities) and
   centralized/decentralized-aware (a federated entity inherits no corporate
   common control, so every mitigating control shows entity-run). ==========  */
(function () {
  'use strict';
  function T(k, p) { return (typeof c5osT === 'function') ? c5osT(k, p) : ((typeof nt === 'function') ? nt(k, p) : k); }
  function esc(s) { return (typeof c5esc === 'function') ? c5esc(s) : String(s == null ? '' : s); }

  // ── The risk → control mapping is ASSET-CLASS-AWARE, not one-size-fits-all. A system's
  //    class (saas / iaas / server / endpoint / identity / data / network) determines the
  //    cyber risks it actually carries AND the controls that can genuinely mitigate them —
  //    from the platform's ASSET_RISK_MODEL (in ciso5.js). Every candidate control is then
  //    filtered through capAppliesTo(cap, class), so a SaaS app never shows host EDR or
  //    your-own-network segmentation, only SaaS-valid controls (SSPM, MFA, PAM, SIEM, DLP,
  //    SaaS backup). This is what the CISO expects: controls real and relevant to the type
  //    of system the risk affects.
  function CAPS_ARR() { return (typeof CAPS !== 'undefined' && CAPS) ? CAPS : []; }
  function XWALK() { return (typeof NEURON_XWALK !== 'undefined' && NEURON_XWALK) ? NEURON_XWALK : {}; }
  function CAPFW() { return (typeof CAP_FRAMEWORK !== 'undefined' && CAP_FRAMEWORK) ? CAP_FRAMEWORK : {}; }
  function ARM() { return (typeof ASSET_RISK_MODEL !== 'undefined' && ASSET_RISK_MODEL) ? ASSET_RISK_MODEL : {}; }
  function capApplies(k, cls) { return (typeof capAppliesTo === 'function') ? capAppliesTo(k, cls) : true; }

  function brSlug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
  // Normalize an uploaded crown-jewel to one of the seven asset classes the risk model
  // knows. Onboarding captures `class` per system, but real uploads are messy — a blank
  // or free-text class must still land on the right controls, so when the class field
  // isn't one of the seven we infer from the class text + system name + tool. This is
  // what makes the class-aware correction apply to EVERY system an org uploads, not just
  // cleanly-tagged ones. Order matters: SaaS/identity/cloud are checked before the
  // generic "server" fallback so a Salesforce or Okta row is never mis-typed as a host.
  function brNormClass(cj) {
    var c = String((cj && cj.class) || '').toLowerCase().trim();
    var known = ['saas', 'iaas', 'server', 'endpoint', 'identity', 'data', 'network'];
    if (known.indexOf(c) >= 0) return c;
    var s = (c + ' ' + ((cj && cj.name) || '') + ' ' + ((cj && cj.tool) || '')).toLowerCase();
    // Most specific first: identity providers and data stores are checked BEFORE the
    // generic saas/iaas keywords, so an Okta (identity, not just "SaaS") or an RDS Postgres
    // (the crown is the data, not just "cloud") lands on the class whose controls fit best.
    if (/identity|directory|\bidp\b|\bsso\b|\bokta\b|entra|active ?directory|azure ?ad\b|\bldap\b|ping ?(id|federate)|cyberark|sailpoint|forgerock/.test(s)) return 'identity';
    if (/database|\bdb\b|postgres|oracle|mysql|mongo|snowflake|redshift|\brds\b|dynamo|warehouse|data ?lake|\bbucket\b|\bs3\b|blob ?storage/.test(s)) return 'data';
    if (/\bsaas\b|salesforce|workday|servicenow|m365|office ?365|google ?workspace|zendesk|netsuite|\bzuora\b|successfactors|\bslack\b|\bbox\b|dropbox|hubspot|jira|confluence|coupa/.test(s)) return 'saas';
    if (/\biaas\b|\bpaas\b|\bcloud\b|\baws\b|azure|\bgcp\b|kubernetes|container|\bec2\b|lambda|terraform|openshift/.test(s)) return 'iaas';
    if (/endpoint|laptop|workstation|desktop|\bmobile\b|\bdevice/.test(s)) return 'endpoint';
    if (/firewall|\bvpn\b|router|\bswitch\b|network|segment|load ?balanc|\bwaf\b|\bcdn\b/.test(s)) return 'network';
    if (/server|\bhost\b|\bvm\b|linux|windows ?server|mainframe|on-?prem|\berp\b|\bsap\b/.test(s)) return 'server';
    return 'server';  // last-resort default: treat an unclassifiable system as a host
  }

  // Run `fn` with SIGNALS temporarily set to this scope's telemetry (its own
  // system-specific coverage + inherited corporate common, none if federated) —
  // the exact swap scopeAggTree uses, so capDeploy() reads THIS branch's tools.
  function brWithScope(scope, fn) {
    var hasS = (typeof SIGNALS !== 'undefined');
    if (!hasS) return fn();
    var saved = SIGNALS, savedSC = (typeof SCOPE !== 'undefined') ? SCOPE : undefined;
    try {
      if (typeof SCOPE !== 'undefined') SCOPE = scope;
      var vals = (typeof scopeSignalValues === 'function') ? scopeSignalValues(scope) : {};
      var base = (typeof SIGNALS_BASE !== 'undefined' && SIGNALS_BASE) ? SIGNALS_BASE : (SIGNALS || {});
      var s = JSON.parse(JSON.stringify(base));
      Object.keys(vals).forEach(function (k) { s[k] = { key: k, value: vals[k] }; });
      SIGNALS = s;
      return fn();
    } finally { SIGNALS = saved; if (savedSC !== undefined) SCOPE = savedSC; }
  }

  function band3(x) { return x >= 0.8 ? 'hi' : (x >= 0.55 ? 'med' : 'lo'); }

  // The whole scope-aware model: processes → risks → controls, computed once.
  function c5BizRiskModel(scope) {
    var live = (typeof LIVE !== 'undefined') ? LIVE : null;
    var jewels = (live && Array.isArray(live.crown_jewels)) ? live.crown_jewels : [];
    var residByName = {};
    if (live && Array.isArray(live.crown_jewel_residual)) live.crown_jewel_residual.forEach(function (r) { residByName[r.name] = r; });

    // Scope-aware maturity for every capability, in one SIGNALS swap.
    var mat = {};
    brWithScope(scope, function () {
      CAPS_ARR().forEach(function (c) { mat[c.k] = (typeof capDeploy === 'function') ? capDeploy(c) : null; });
    });
    function capMat(k) { return mat[k] == null ? null : mat[k]; }

    var xw = XWALK(), fwm = CAPFW(), byKey = (typeof CAP_BY_KEY !== 'undefined') ? CAP_BY_KEY : {};
    function ctrlObj(k) {
      var c = byKey[k]; if (!c) return null;
      var fw = fwm[k] || {}, x = xw[k] || {};
      return {
        k: k, name: (c.name || k).replace(/ *\(.*\)/, ''), tool: c.tool || '',
        csf: (fw.csf || []).slice(0, 3), cis: (x.cis || []).slice(0, 3), iso: (x.iso || []).slice(0, 3),
        maturity: capMat(k),
        provider: (typeof capProvider === 'function') ? capProvider(k, scope) : 'specific'
      };
    }

    // Build one risk from an ASSET_RISK_MODEL entry {r, adv, caps}, keeping ONLY the
    // controls that are real and relevant to this system's class (capAppliesTo).
    function mkRisk(rdef, cls, impactFrac) {
      var seen = {}, keys = [];
      (rdef.caps || []).forEach(function (k) { if (!seen[k] && byKey[k] && capApplies(k, cls)) { seen[k] = 1; keys.push(k); } });
      var ctrls = keys.map(ctrlObj).filter(Boolean);
      var measured = ctrls.filter(function (c) { return c.maturity != null; });
      var weakest = null;
      measured.forEach(function (c) { if (weakest == null || c.maturity < weakest.maturity) weakest = c; });
      var mitigation = weakest ? weakest.maturity : null;
      return {
        key: brSlug(rdef.r), adversarial: !!rdef.adv, name: rdef.r,
        likelihood: rdef.adv ? 'hi' : 'med', impact: band3(impactFrac),
        controls: ctrls, mitigation: mitigation, weakest: weakest
      };
    }

    var arm = ARM();
    var usedCaps = {}, totalRisks = 0;
    var processes = jewels.map(function (cj, i) {
      var cls = brNormClass(cj);
      var resid = residByName[cj.name];
      var impactFrac = resid && resid.impact != null ? Number(resid.impact) : (/crit/i.test(cj.tier || '') ? 0.9 : 0.68);
      // The cyber risks this system's CLASS actually carries, each with class-valid controls.
      var defs = arm[cls] || arm.server || [];
      var risks = defs.map(function (rd) { return mkRisk(rd, cls, rd.adv ? impactFrac : impactFrac * 0.85); });
      risks.forEach(function (r) { r.controls.forEach(function (c) { usedCaps[c.k] = 1; }); });
      totalRisks += risks.length;
      // Process residual = the weakest mitigating control across its risks (one gap opens the path).
      var mits = risks.map(function (r) { return r.mitigation; }).filter(function (v) { return v != null; });
      var weakMit = mits.length ? Math.min.apply(null, mits) : null;
      var residKey = weakMit == null ? 'high' : (weakMit >= 75 ? 'low' : (weakMit >= 50 ? 'elevated' : 'high'));
      var weakRisk = risks.slice().sort(function (a, b) { return (a.mitigation == null ? 999 : a.mitigation) - (b.mitigation == null ? 999 : b.mitigation); })[0];
      return {
        i: i, name: cj.name, tier: cj.tier || '', internet: !!cj.internet_facing, cls: cj.class || '',
        risks: risks, residKey: residKey, weakMit: weakMit, weakRisk: weakRisk
      };
    });

    // Portfolio finding: % of the distinct mitigating controls that are in place at this scope.
    var uk = Object.keys(usedCaps), inPlace = uk.map(function (k) { return capMat(k); }).filter(function (v) { return v != null; });
    var kPct = inPlace.length ? Math.round(inPlace.reduce(function (a, b) { return a + b; }, 0) / inPlace.length) : 0;

    return { scope: scope, processes: processes, nProc: processes.length, mRisks: totalRisks, kPct: kPct, distinctCtrls: uk.length };
  }
  window.c5BizRiskModel = c5BizRiskModel;

  // ── Rendering ──────────────────────────────────────────────────────────────
  var C5_BR_PROC = null;   // open process index
  var C5_BR_RISK = null;   // open risk key within the open process

  function residChip(residKey) {
    var col = residKey === 'low' ? 'good' : (residKey === 'elevated' ? 'warn' : 'crit');
    return '<span style="font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--' + col + ');background:color-mix(in srgb,var(--' + col + ') 12%,transparent);border:1px solid color-mix(in srgb,var(--' + col + ') 34%,transparent);border-radius:20px;padding:2px 9px">' + T('br.residual.' + residKey) + '</span>';
  }
  function matBar(p) {
    var col = (typeof capColor === 'function') ? capColor(p) : (p == null ? 'muted' : p >= 90 ? 'good' : p >= 75 ? 'blue' : p >= 50 ? 'warn' : 'crit');
    var w = p == null ? 0 : Math.max(0, Math.min(100, p));
    return '<div style="display:flex;align-items:center;gap:8px;min-width:120px"><div style="flex:1;height:6px;background:var(--line);border-radius:4px;overflow:hidden;min-width:56px"><i style="display:block;height:100%;width:' + w + '%;background:var(--' + col + ')"></i></div><span style="font-size:11px;font-weight:700;color:var(--' + col + ');font-variant-numeric:tabular-nums">' + (p == null ? '—' : p + '%') + '</span></div>';
  }
  function llChip(level) {
    var col = level === 'hi' ? 'crit' : (level === 'med' ? 'warn' : 'muted');
    return '<b style="color:var(--' + col + ')">' + T('br.' + level) + '</b>';
  }
  function fwids(arr, cls) {
    if (!arr || !arr.length) return '<span style="color:var(--muted)">—</span>';
    return arr.map(function (id) { return '<span class="fwid ' + cls + '" style="margin:0 3px 3px 0">' + esc(id) + '</span>'; }).join('');
  }
  function provBadge(provider) {
    var common = provider === 'common';
    var col = common ? 'blue' : 'ink-2';
    return '<span title="" style="font-size:10px;font-weight:700;color:var(--' + col + ');white-space:nowrap">' + (common ? '⬡ ' : '◈ ') + T(common ? 'br.ctrl.common' : 'br.ctrl.specific') + '</span>';
  }

  // The control table for one risk — the same control shown across CSF · CIS · ISO,
  // its scope maturity and whether it is corporate-common or entity-run.
  function ctrlTable(risk) {
    var head = '<div style="display:grid;grid-template-columns:1.6fr 1fr .7fr 1fr 1.1fr 1.2fr;gap:8px;padding:6px 10px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line)">'
      + '<span>' + T('br.ctrl.col.cap') + '</span><span>' + T('br.ctrl.col.csf') + '</span><span>' + T('br.ctrl.col.cis') + '</span><span>' + T('br.ctrl.col.iso') + '</span><span>' + T('br.ctrl.col.maturity') + '</span><span>' + T('br.ctrl.col.model') + '</span></div>';
    var rows = risk.controls.map(function (c) {
      var isWeak = risk.weakest && c.k === risk.weakest.k;
      return '<div class="br-ctrl" data-cap="' + c.k + '" style="display:grid;grid-template-columns:1.6fr 1fr .7fr 1fr 1.1fr 1.2fr;gap:8px;align-items:center;padding:9px 10px;border-bottom:1px solid var(--line);cursor:pointer' + (isWeak ? ';background:color-mix(in srgb,var(--crit) 5%,transparent)' : '') + '">'
        + '<span style="font-size:12px;color:var(--ink);font-weight:600">' + esc(c.name) + (isWeak ? ' <span style="font-size:9px;color:var(--crit);font-weight:800">⚠</span>' : '') + '<span style="display:block;font-size:10px;color:var(--muted);font-weight:500">' + esc(c.tool) + '</span></span>'
        + '<span style="font-size:11px">' + fwids(c.csf, 'csf') + '</span>'
        + '<span style="font-size:11px">' + fwids(c.cis, 'r53') + '</span>'
        + '<span style="font-size:11px">' + fwids(c.iso, 'csf') + '</span>'
        + '<span>' + matBar(c.maturity) + '</span>'
        + '<span>' + provBadge(c.provider) + '</span>'
        + '</div>';
    }).join('');
    var most = risk.weakest ? ('<div style="font-size:11px;color:var(--ink-2);padding:9px 10px;line-height:1.5">' + T('br.ctrl.mostreduces', { ctrl: '<b>' + esc(risk.weakest.name) + '</b>' }) + '</div>') : '';
    return '<div style="margin-top:8px;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--surface)">'
      + '<div style="padding:9px 12px;font-size:12px;font-weight:700;color:var(--ink);border-bottom:1px solid var(--line);background:var(--surface-2,var(--surface))">' + T('br.ctrl.title', { risk: '<b>' + esc(risk.name) + '</b>' }) + ' <span style="font-weight:500;color:var(--muted)">· ' + T('br.ctrl.across') + '</span></div>'
      + head + rows + most + '</div>';
  }

  // A risk row inside an open process — likelihood · impact · mitigation, and a
  // drill into the controls that mitigate it.
  function riskRow(risk, procIdx) {
    var open = (C5_BR_PROC === procIdx && C5_BR_RISK === risk.key);
    var mitCol = risk.mitigation == null ? 'muted' : (risk.mitigation >= 75 ? 'good' : (risk.mitigation >= 50 ? 'warn' : 'crit'));
    var head = '<div class="br-risk" data-risk="' + esc(risk.key) + '" data-proc="' + procIdx + '" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:11px 12px;cursor:pointer;border-radius:9px' + (open ? ';background:color-mix(in srgb,var(--blue) 5%,transparent)' : '') + '">'
      + '<span style="flex:1;min-width:180px;font-size:13px;font-weight:650;color:var(--ink)">' + (risk.adversarial ? '⚔ ' : '⚙ ') + esc(risk.name) + '</span>'
      + '<span style="font-size:11px;color:var(--ink-2)">' + T('br.risk.likelihood') + ' ' + llChip(risk.likelihood) + '</span>'
      + '<span style="font-size:11px;color:var(--ink-2)">' + T('br.risk.impact') + ' ' + llChip(risk.impact) + '</span>'
      + '<span style="font-size:11px;color:var(--ink-2);display:flex;align-items:center;gap:7px">' + T('br.risk.mitigation') + ' <b style="color:var(--' + mitCol + ');font-variant-numeric:tabular-nums">' + (risk.mitigation == null ? '—' : risk.mitigation + '%') + '</b></span>'
      + '<span style="font-size:11px;color:var(--blue);font-weight:700">' + T('br.risk.open') + '</span>'
      + '</div>';
    return '<div style="border-bottom:1px solid var(--line)">' + head + (open ? ('<div style="padding:0 12px 12px">' + ctrlTable(risk) + '</div>') : '') + '</div>';
  }

  function procCard(p) {
    var open = (C5_BR_PROC === p.i);
    var weakName = p.weakRisk ? p.weakRisk.name : '—';
    var head = '<div class="br-proc" data-proc="' + p.i + '" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:14px 16px;cursor:pointer">'
      + '<span style="flex:1;min-width:200px"><span style="font-size:15px;font-weight:750;color:var(--ink)">' + esc(p.name) + '</span>'
      + (p.tier ? ' <span style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em">· ' + esc(p.tier) + '</span>' : '')
      + '<span style="display:block;font-size:11px;color:var(--ink-2);margin-top:3px">' + T('br.card.risks', { n: p.risks.length }) + ' · ' + T('br.card.toprisk', { risk: esc(weakName) }) + '</span></span>'
      + residChip(p.residKey)
      + '<span style="width:132px;flex:none">' + matBar(p.weakMit) + '</span>'
      + '<span style="font-size:11px;color:var(--blue);font-weight:700;flex:none">' + T('br.card.open') + '</span>'
      + '</div>';
    var body = open ? ('<div style="border-top:1px solid var(--line)">'
      + '<div style="padding:10px 16px 4px;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)">' + T('br.risk.title') + '</div>'
      + p.risks.map(function (r) { return riskRow(r, p.i); }).join('') + '</div>') : '';
    return '<div style="border:1px solid var(--line);border-radius:13px;overflow:hidden;margin-bottom:10px;background:var(--surface)' + (open ? ';box-shadow:0 1px 0 color-mix(in srgb,var(--blue) 30%,transparent)' : '') + '">' + head + body + '</div>';
  }

  function c5BizRisk() {
    var host = document.getElementById('c5-bizrisk'); if (!host) return;
    try { window.C5_SCOPE_FWKEY = 'csf'; if (typeof C5_ASSESS_FW !== 'undefined') C5_ASSESS_FW = 'csf'; } catch (_) {}
    var scope = (typeof c5Scope === 'function') ? c5Scope() : 'enterprise';
    var scopeLbl = (scope === 'enterprise') ? 'Enterprise' : ((typeof scopeLabel === 'function') ? scopeLabel(scope) : scope);
    var scB = '<b>' + esc(scopeLbl) + '</b>';
    var model;
    try { model = c5BizRiskModel(scope); } catch (e) { model = null; }

    var scopeNavHtml = '';
    try { if (typeof scopeNav === 'function') { var sn = scopeNav(); if (sn) scopeNavHtml = '<div class="c5pa" style="margin:0 0 4px">' + sn + '</div>'; } } catch (_) {}

    var deckBtn = (typeof c5DeckBtnHtml === 'function') ? c5DeckBtnHtml('csf') : '';
    var header = (typeof c5header === 'function') ? c5header() : '';

    if (!model || !model.processes.length) {
      host.innerHTML = header + scopeNavHtml
        + '<div class="c5pa-eyebrow" style="margin-top:2px">' + T('br.eyebrow', { scope: scB }) + '</div>'
        + '<div class="c5note" style="margin-top:10px">◐ ' + T('br.empty') + '</div>';
      wire(host);
      return;
    }

    var hero = '<div class="c5pa" style="margin:0 0 14px;padding:16px 18px">'
      + '<div class="c5pa-eyebrow" style="margin:0 0 9px">' + T('br.eyebrow', { scope: scB }) + deckBtn + '</div>'
      + '<div style="font-size:16px;font-weight:750;color:var(--ink);line-height:1.45">' + T('br.finding', { n: model.nProc, m: model.mRisks, k: model.kPct, scope: scB }) + '</div>'
      + '<div style="font-size:12px;color:var(--ink-2);margin-top:9px;line-height:1.6;max-width:880px">' + T('br.dek') + '</div>'
      + '</div>';

    var cards = '<div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:2px 0 10px">' + T('br.processes') + '</div>'
      + model.processes.map(procCard).join('');

    host.innerHTML = header + scopeNavHtml + hero + cards;
    wire(host);
  }
  window.c5BizRisk = c5BizRisk;

  function wire(host) {
    host.querySelectorAll('.br-proc[data-proc]').forEach(function (el) {
      el.onclick = function () { var i = +el.dataset.proc; C5_BR_PROC = (C5_BR_PROC === i) ? null : i; C5_BR_RISK = null; c5BizRisk(); };
    });
    host.querySelectorAll('.br-risk[data-risk]').forEach(function (el) {
      el.onclick = function (ev) { ev.stopPropagation(); var k = el.dataset.risk; C5_BR_RISK = (C5_BR_RISK === k) ? null : k; c5BizRisk(); };
    });
    host.querySelectorAll('.br-ctrl[data-cap]').forEach(function (el) {
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
