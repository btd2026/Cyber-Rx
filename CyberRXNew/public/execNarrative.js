/**
 * execNarrative.js — the central executive-cockpit narrative ENGINE.
 *
 * generateExecutiveNarrative(input) turns organization-specific structured data into a
 * seat/tab narrative — question, headline, subtext, bottom line, recommended action,
 * button, caveats and evidence-confidence line — using reusable TEMPLATES that are
 * POPULATED dynamically. Nothing is hard-coded to a client conclusion: change the top
 * driver / exposed process / evidence / demo flags and the narrative changes.
 *
 * Rules baked in (see the acceptance criteria):
 *  - No client-specific conclusion is hard-coded; every headline/bottom line derives from
 *    the passed context (topDrivers, top_exposed_process/asset/capability, metrics…).
 *  - If the top exposure driver changes, the headline changes.
 *  - If the evidence changes, the bottom line changes.
 *  - Low / Not Enough Evidence → cautious wording, never a confident verdict.
 *  - Demo / mock → visibly labelled.
 *  - Not connected / missing evidence → "Not enough evidence to conclude … Connect <sources>".
 *  - "No active issue detected in connected telemetry" — never "no issue exists".
 *  - Modeled → "modeled"; self-reported → "self-reported"; not connected → "not connected".
 *  - Banned overclaims ("removes risk", "fully protected", "no exposure", "guaranteed",
 *    "eliminates risk") are never emitted.
 *
 * UMD: exports for Node/Jest, attaches root.ExecNarrative in the browser.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ExecNarrative = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- the question each seat/tab answers -------------------------------------------
  var QUESTIONS = {
    'ceo|objectives': 'Which objectives are exposed?',
    'ceo|health': 'Is cyber a tailwind or a risk?',
    'ceo|trust': 'Are we protecting customer trust?',
    'ceo|financial': 'What could this cost us?',
    'ceo|decisions': 'What needs my sign-off?',
    'ciso|exposure': 'Where is the business most exposed?',
    'ciso|protection': 'How are our core business areas protected?',
    'ciso|controlvalue': 'Which controls reduce the most business exposure?',
    'ciso|effectiveness': 'Are our controls working?',
    'ciso|threats': 'Are we ready for the behaviors most likely to hit us?',
    'ciso|aisupply': 'Where are we exposed across AI and software supply chain?',
    'ciso|decisions': 'What needs my sign-off?',
    'cfo|appetite': 'Are we within the board’s appetite?',
    'cfo|roi': 'Is our security spend paying off?',
    'cfo|insurance': 'Are we insured efficiently?',
    'cfo|cost': 'Where can we save?',
    'cfo|decisions': 'What needs my sign-off?',
    'coo|resilience': 'Can the business keep running through a disruption?',
    'coo|recovery': 'Can we recover?',
    'coo|vendors': 'Which dependencies could take us down?',
    'coo|decisions': 'What needs my sign-off?',
    'cto|risk': 'Is our stack secure and modern?',
    'cto|reliability': 'Are our core services reliable and secure?',
    'cto|supplychain': 'What’s in our critical path from the software supply chain?',
    'cto|decisions': 'What needs my sign-off?',
    'cpo|trust': 'Is our product safe for customers?',
    'cpo|delivery': 'Is security slowing delivery?',
    'cpo|decisions': 'What needs my sign-off?',
    'cro|scale': 'How does cyber compare to our other risks?',
    'cro|appetite': 'Is cyber within risk appetite?',
    'cro|decisions': 'What needs my sign-off?',
    'clo|regulatory': 'Where are we exposed by jurisdiction?',
    'clo|forensic': 'Can we prove what happened?',
    'clo|contracts': 'Which contracts are at risk?',
    'clo|privacy': 'Are we handling requests on time?',
    'clo|decisions': 'What needs my sign-off?',
    'audit|coverage': 'Is the control environment effective?',
    'audit|findings': 'What are the open findings?',
    'board|oversight': 'What does the board need to note?'
  };

  // ---- phrases the product must never emit (overclaiming / false assurance) ----------
  var BANNED = [
    /\bremoves?\s+(all\s+)?(the\s+)?(cyber\s+)?(risk|exposure)\b/i,
    /\beliminat\w*\s+(all\s+)?(the\s+)?(risk|exposure)\b/i,
    /\bfully\s+protected\b/i,
    /\bfully\s+(insured|covered)\b/i,
    /\bno\s+exposure\b/i,
    /\bno\s+(active\s+)?(issue|attack|threat|risk)\s+exists\b/i,
    /\bguarantee\w*\b/i,
    /\bzero\s+risk\b/i
  ];

  function key(seat, tab) { return String(seat || '').toLowerCase() + '|' + String(tab || '').toLowerCase(); }
  function cap(s) { return s ? (String(s).charAt(0).toUpperCase() + String(s).slice(1)) : s; }
  function low(s) { return s == null ? '' : String(s).charAt(0).toLowerCase() + String(s).slice(1); }
  function firstDefined() { for (var i = 0; i < arguments.length; i++) { if (arguments[i] != null && arguments[i] !== '') return arguments[i]; } return ''; }
  function isArr(x) { return Object.prototype.toString.call(x) === '[object Array]'; }

  // Map a raw source hint to the exact permitted word.
  function sourceWord(s) {
    var t = String(s || '').toLowerCase();
    if (/not.?connect/.test(t)) return 'not connected';
    if (/self.?report|manual|attested/.test(t)) return 'self-reported';
    if (/comput/.test(t)) return 'computed';
    if (/measur|telemetr|validated/.test(t)) return 'measured';
    return 'modeled';
  }

  function cautious(level, demo) {
    return demo === true || level === 'Low' || level === 'Not Enough Evidence' || level === 'Demo';
  }

  // Join a list of names into readable prose: [a] → "a"; [a,b] → "a and b"; [a,b,c] → "a, b and c".
  function joinList(items) {
    var a = (items || []).filter(function (x) { return x != null && x !== ''; });
    if (!a.length) return '';
    if (a.length === 1) return a[0];
    if (a.length === 2) return a[0] + ' and ' + a[1];
    return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  }

  // Normalise the many input shapes into one structured context the templates consume.
  function normalize(o) {
    o = o || {};
    var org = o.organizationContext || {};
    var metrics = o.metrics || {};
    var drivers = (isArr(o.topDrivers) ? o.topDrivers : []).filter(Boolean).map(function (d) {
      if (typeof d === 'string') return { name: d };
      return d || {};
    });

    // evidence confidence may be a string or an object {level, missing|gaps}
    var ev = o.evidenceConfidence;
    var level = (ev && typeof ev === 'object') ? (ev.level || 'Not Enough Evidence') : (ev || 'Not Enough Evidence');
    var missing = (ev && typeof ev === 'object' && (ev.missing || ev.gaps)) || o.evidenceGaps || org.evidence_gaps || [];
    if (!isArr(missing)) missing = missing ? [missing] : [];

    var recActions = isArr(o.recommendedActions) ? o.recommendedActions : (o.recommendedActions ? [o.recommendedActions] : []);
    var rec0 = recActions[0];
    var recText = rec0 ? (typeof rec0 === 'string' ? rec0 : (rec0.text || rec0.action || '')) : '';
    var recOwner = (rec0 && rec0.owner) || o.actionOwner || org.action_owner || '';

    var demo = !!(o.isDemo || org.is_demo);
    var mock = !!(o.isMock || org.is_mock);
    var notConnected = !!(o.isNotConnected || org.is_not_connected);

    var top = drivers[0] || null;
    return {
      seat: o.seat, tab: o.tab,
      key: key(o.seat, o.tab),
      status: firstDefined(o.overallStatus, org.overall_status, ''),
      drivers: drivers,
      top: top,
      driverNames: drivers.map(function (d) { return d.name || d.short; }).filter(Boolean),
      topAsset: firstDefined(org.top_exposed_asset, metrics.top_exposed_asset),
      topProcess: firstDefined(org.top_exposed_process, metrics.top_exposed_process),
      topCapability: firstDefined(org.top_exposed_business_capability, metrics.top_exposed_business_capability),
      modeledExposure: firstDefined(o.modeledExposure, metrics.modeled_exposure, top && top.value),
      exposureBasis: firstDefined(o.exposureBasis, org.exposure_basis, metrics.exposure_basis),
      level: level,
      missing: missing,
      recText: recText,
      recOwner: recOwner,
      decisionRequired: firstDefined(o.decisionRequired, org.decision_required),
      sourceStatus: firstDefined(o.sourceStatus, top && top.sourceStatus, 'modeled'),
      demo: demo, mock: mock, notConnected: notConnected,
      soft: cautious(level, demo),
      hasActiveIssue: (o.hasActiveIssue != null) ? !!o.hasActiveIssue : (org.has_active_issue != null ? !!org.has_active_issue : null)
    };
  }

  // A dollar value never appears bare — it always carries a source/label word.
  function exposureClause(ctx) {
    if (!ctx.modeledExposure) return '';
    var w = sourceWord(ctx.sourceStatus);
    var demoWord = ctx.demo ? 'demo ' : ctx.mock ? 'mock ' : '';
    return ctx.modeledExposure + ' ' + demoWord + w + ' exposure';
  }

  function driverPhrase(ctx, i) {
    var d = ctx.drivers[i || 0];
    return d ? (d.name || d.short || 'the top driver') : '';
  }

  function shortOf(d) { return d ? (d.short || d.name) : 'the top driver'; }

  function evidenceConfidenceText(ctx) {
    var why = ctx.missing && ctx.missing.length
      ? ('missing: ' + joinList(ctx.missing) + '.')
      : 'derived from the connected sources; incomplete sources lower confidence.';
    return 'Evidence confidence: ' + ctx.level + ' — ' + why;
  }

  function caveatsFor(ctx) {
    var c = [];
    if (ctx.mock) c.push('Values are mock — not for reporting.');
    else if (ctx.demo) c.push('Values are demo — replace as your sources connect.');
    if (ctx.level === 'Low' || ctx.level === 'Not Enough Evidence') c.push('Evidence is incomplete — treat conclusions as provisional.');
    return c;
  }

  function hasBanned(text) {
    var s = String(text || '');
    for (var i = 0; i < BANNED.length; i++) { if (BANNED[i].test(s)) return true; }
    return false;
  }

  // The not-enough-evidence narrative (also used for not-connected / no top driver).
  function insufficient(ctx, q) {
    var connectList = ctx.missing && ctx.missing.length ? joinList(ctx.missing) : 'your data sources';
    var subject = ctx.tab ? String(ctx.tab).replace(/[-_]/g, ' ') : 'this';
    return {
      question: q,
      headline: 'Not enough evidence to conclude — connect ' + connectList + '.',
      subtext: 'Connect your data and the largest driver, its ' + sourceWord(ctx.sourceStatus) + ' value and the recommended action surface here.',
      statusSummary: ctx.notConnected ? 'Not connected' : 'Not Enough Evidence',
      bottomLineTitle: 'Bottom line',
      bottomLineBody: 'Not enough evidence to conclude on ' + subject + '. Connect ' + connectList + ' to assess it.',
      recommendedAction: 'Connect ' + connectList,
      buttonText: 'Connect data',
      caveats: caveatsFor(ctx),
      evidenceConfidenceText: evidenceConfidenceText(ctx)
    };
  }

  // ---- reusable templates. Each returns {headline, subtext, bottomLineBody,
  //      recommendedAction, buttonText}. Common fields are added by the engine. --------

  // Generic driver-centric template — the default for exposure/financial-style tabs.
  function driverTemplate(ctx) {
    var name = driverPhrase(ctx, 0);
    var val = exposureClause(ctx);
    var lead = name + (ctx.soft ? ' appears to be the largest driver' : ' is the largest driver');
    var drivers123 = joinList(ctx.driverNames.slice(0, 3));
    var rec = firstDefined(ctx.recText, 'Reduce the largest driver — ' + shortOf(ctx.top));
    return {
      headline: cap(lead) + (val ? (' (' + val + ')') : '') + '.',
      subtext: 'The largest driver is ' + name + (val ? (' at ' + val) : '') + '; ' +
        (ctx.soft ? 'confirm the evidence before acting.' : 'reducing it lowers the most modeled exposure.'),
      bottomLineBody: cap(name) + ' carries the largest modeled exposure' + (val ? (' (' + val + ')') : '') + '. ' +
        (ctx.driverNames.length > 1 ? ('The main drivers are ' + drivers123 + '. ') : '') +
        (ctx.soft ? 'Confirm the evidence, then reduce it before lower-priority work.'
                  : 'Recommended action: ' + low(rec) + (ctx.recOwner ? (' (owner: ' + ctx.recOwner + ')') : '') + '.'),
      recommendedAction: rec,
      buttonText: rec.length > 42 ? ('Reduce the top driver — ' + shortOf(ctx.top)) : rec
    };
  }

  // Process/operational-resilience template (COO). Uses the exact spec'd shape.
  function resilienceTemplate(ctx) {
    var proc = firstDefined(ctx.topProcess, ctx.topAsset, ctx.topCapability);
    var driverSummary = ctx.driverNames.length ? joinList(ctx.driverNames.slice(0, 3)) : '';
    var resilienceSummary = ctx.hasActiveIssue === false
      ? 'No active issue detected in connected telemetry'
      : (ctx.soft ? 'Operational resilience is not yet confirmed' : 'Core operations can keep running, with one exposure to watch');
    if (!proc) return driverTemplate(ctx);
    var rec = firstDefined(ctx.recText, 'Reduce the exposure on ' + proc);
    return {
      headline: resilienceSummary + '. ' + cap(proc) + ' is the critical process to watch' +
        (driverSummary ? (' because of ' + driverSummary) : '') + '.',
      subtext: 'Recovery readiness for ' + proc + ' — ' +
        (ctx.soft ? 'confirm the evidence before concluding.' : 'the main cyber-linked operational exposure sits here.'),
      bottomLineBody: cap(proc) + ' carries the largest cyber-linked operational exposure. ' +
        (driverSummary ? ('The main drivers are ' + driverSummary + '. ') : '') +
        (ctx.soft ? 'Confirm recovery evidence before concluding.'
                  : 'Recommended action: ' + low(rec) + (ctx.recOwner ? (' (owner: ' + ctx.recOwner + ')') : '') + '.'),
      recommendedAction: rec,
      buttonText: rec.length > 42 ? ('Protect ' + proc) : rec
    };
  }

  // Threat/telemetry template — never asserts "no issue exists".
  function threatTemplate(ctx) {
    var path = driverPhrase(ctx, 0) || firstDefined(ctx.topAsset, ctx.topProcess);
    var head = (ctx.hasActiveIssue === false)
      ? ('No active issue detected in connected telemetry' + (path ? ('; the attack path through ' + low(path) + ' is the highest exposure') : '') + '.')
      : (ctx.soft ? ('The most material threat path appears to run through ' + low(path) + '.')
                  : ('The most material threat path runs through ' + low(path) + '.'));
    var rec = firstDefined(ctx.recText, 'Close the ' + shortOf(ctx.top) + ' attack-path gaps');
    return {
      headline: head,
      subtext: 'Mapped to connected telemetry — ' + (ctx.soft ? 'evidence is partial; confirm before acting.' : 'the highest-signal path is shown.'),
      bottomLineBody: (path ? ('The most material threat path runs through ' + low(path) + '. ') : '') +
        'Recommended action: ' + low(rec) + '. This reduces the top exposure; residual cyber risk remains.',
      recommendedAction: rec,
      buttonText: rec.length > 42 ? ('Close the top path') : rec
    };
  }

  var TEMPLATES = {
    'coo|resilience': resilienceTemplate,
    'coo|recovery': resilienceTemplate,
    'ciso|threats': threatTemplate,
    'cto|reliability': resilienceTemplate
  };

  function generateExecutiveNarrative(input) {
    var ctx = normalize(input);
    var q = QUESTIONS[ctx.key] || 'Where do we stand?';

    // Not connected / no evidence / no driver → never a confident conclusion.
    if (ctx.notConnected || ctx.level === 'Not Enough Evidence' ||
        (!ctx.top && !ctx.topProcess && !ctx.topAsset && !ctx.topCapability)) {
      return insufficient(ctx, q);
    }

    var tmpl = TEMPLATES[ctx.key] || driverTemplate;
    var body = tmpl(ctx);
    var status = firstDefined(ctx.status, ctx.soft ? 'Watch' : 'Within appetite');

    return {
      question: q,
      headline: body.headline,
      subtext: body.subtext,
      statusSummary: status,
      bottomLineTitle: 'Bottom line',
      bottomLineBody: body.bottomLineBody,
      recommendedAction: body.recommendedAction,
      buttonText: body.buttonText,
      caveats: caveatsFor(ctx),
      evidenceConfidenceText: evidenceConfidenceText(ctx)
    };
  }

  return {
    generateExecutiveNarrative: generateExecutiveNarrative,
    QUESTIONS: QUESTIONS,
    BANNED: BANNED,
    hasBanned: hasBanned,
    sourceWord: sourceWord,
    joinList: joinList,
    _normalize: normalize,
    _cautious: cautious
  };
});
