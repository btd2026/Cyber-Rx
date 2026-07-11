/*
 * Nerion FAIR cyber-risk engine — a shared, versioned computation module the value-decomposition
 * tree and the cockpit both read from. UMD: works as a browser global (window.FairEngine) and as
 * a CommonJS require() in Node (for the test suite).
 *
 * Design promise: accuracy + traceability. Every number is DERIVED from typed inputs and
 * reproducible (seeded Monte-Carlo); nothing is hardcoded or silently estimated. Every computed
 * figure carries { value, distribution, sources, confidence, asOf } so provenance travels with it.
 *
 * This module does COMPUTATION and the DATA MODEL only — rendering is a separate task.
 */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FairEngine = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var VERSION = '1.0.0';

  var CONFIG = {
    iters: 10000,          // Monte-Carlo iterations (≥10k per spec)
    seed: 1337,            // fixed RNG seed → deterministic, testable
    varPct: 0.95,          // tail percentile (1-in-20 year)
    corr: 0.6,             // co-movement strength for risks sharing a correlation group (0..1)
    attribution: 'remainder', // 'remainder' (report interaction line) | 'normalize' (scale to Mitigated)
    pointLowMult: 0.4,     // when only a point value is given, spread it into a range …
    pointHighMult: 3.0     // … so the tail is still modeled (tagged 'modeled — sector default')
  };

  // ───────────────────────── seeded RNG + hashing ─────────────────────────
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    s = String(s == null ? '' : s);
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function num(v) { var n = Number(v); return Number.isFinite(n) ? n : 0; }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  // ───────────────────────── distributions ─────────────────────────
  // Normalize an input into { min, mostLikely, max, dist, point }. A bare number is exact telemetry
  // (a point value). Objects are ranges {min, mostLikely|mode, max, dist:'pert'|'triangular'|'lognormal'}.
  function asDist(x) {
    if (x == null) return null;
    if (typeof x === 'number') {
      if (!Number.isFinite(x)) return null;
      return { min: x, mostLikely: x, max: x, dist: 'point', point: true };
    }
    var ml = num(x.mostLikely != null ? x.mostLikely : x.mode);
    var min = (x.min != null) ? num(x.min) : ml;
    var max = (x.max != null) ? num(x.max) : ml;
    if (min > max) { var t = min; min = max; max = t; }
    if (ml < min) ml = min; if (ml > max) ml = max;
    var dist = x.dist || 'pert';
    if (min === ml && ml === max) return { min: ml, mostLikely: ml, max: ml, dist: 'point', point: true };
    return { min: min, mostLikely: ml, max: max, dist: dist, point: false };
  }
  // Spread a point value into a range (labeled modeled) so a tail can be computed from it.
  function spreadPoint(v, tag) {
    var p = num(v);
    return { min: p * CONFIG.pointLowMult, mostLikely: p, max: p * CONFIG.pointHighMult, dist: 'pert', point: false, sectorDefault: !!tag };
  }
  // Inverse standard-normal (Acklam) — for lognormal sampling.
  function invNorm(p) {
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    var pl = 0.02425, q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p <= 1 - pl) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  // Sample a distribution at uniform u∈[0,1].
  function sampleDist(d, u) {
    if (!d) return 0;
    if (d.point || !(d.max > d.min)) return d.mostLikely;
    var min = d.min, mode = d.mostLikely, max = d.max;
    if (d.dist === 'lognormal') {
      // mostLikely ≈ median; max ≈ p95 → derive σ. Guards keep it finite.
      var med = mode > 0 ? mode : (max > 0 ? max / 3 : 1);
      var sigma = (max > med) ? (Math.log(max / med) / 1.645) : 0.25;
      return med * Math.exp(sigma * invNorm(u));
    }
    // 'pert' and 'triangular' both use the triangular quantile (a proven, mean-preserving PERT proxy).
    var c = (mode - min) / (max - min);
    return u < c
      ? min + Math.sqrt(u * (max - min) * (mode - min))
      : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }
  function percentile(sortedAsc, p) {
    var n = sortedAsc.length; if (!n) return 0;
    return sortedAsc[Math.min(n - 1, Math.max(0, Math.floor(p * n)))];
  }
  function mean(arr) { var s = 0, n = arr.length; for (var i = 0; i < n; i++) s += arr[i]; return n ? s / n : 0; }

  // ───────────────────────── provenance + confidence ─────────────────────────
  var CONF_RANK = { high: 3, med: 2, low: 1 };
  function normConf(c) { c = String(c || '').toLowerCase(); return CONF_RANK[c] ? c : 'low'; }
  // A figure's confidence = the WORST of its inputs' confidences.
  function worstConfidence(sources) {
    if (!sources || !sources.length) return 'low';
    var w = 'high';
    for (var i = 0; i < sources.length; i++) {
      var c = normConf(sources[i] && sources[i].confidence);
      if (CONF_RANK[c] < CONF_RANK[w]) w = c;
    }
    return w;
  }
  // A figure's confidence = worst of its inputs' confidences, AND capped: a figure with NO telemetry
  // input (self-reported / modeled only) can never be 'high' — the spec's non-negotiable rule.
  function figureConfidence(sources) {
    var w = worstConfidence(sources);
    var hasTelemetry = (sources || []).some(function (s) { return s && s.type === 'telemetry'; });
    if (!hasTelemetry && CONF_RANK[w] > CONF_RANK.med) return 'med';
    return w;
  }
  // The distinct source-type badges a figure carries (mixed provenance shows more than one).
  function sourceBadges(sources) {
    var seen = {}, out = [];
    (sources || []).forEach(function (s) { var t = s && s.type; if (t && !seen[t]) { seen[t] = 1; out.push(t); } });
    return out;
  }
  function normSource(s) {
    if (!s) return null;
    return {
      type: (s.type === 'telemetry' || s.type === 'self_reported' || s.type === 'modeled') ? s.type : 'modeled',
      name: s.name || 'source',
      syncedAt: s.syncedAt || null,
      coverage: (s.coverage != null) ? s.coverage : null,
      confidence: normConf(s.confidence)
    };
  }
  function nowIso(opts) { return (opts && opts.asOf) || null; } // caller stamps time (Date.now is non-deterministic)

  // Wrap a computed scalar with its provenance so the number is self-describing.
  function figure(value, distribution, sources, opts, extra) {
    var srcs = (sources || []).map(normSource).filter(Boolean);
    var f = {
      value: value,
      distribution: distribution || null,
      sources: srcs,
      sourceTypes: sourceBadges(srcs),
      confidence: figureConfidence(srcs),
      asOf: nowIso(opts)
    };
    if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) f[k] = extra[k];
    return f;
  }

  // ───────────────────────── control factors ─────────────────────────
  // A control reduces either event FREQUENCY (preventive → cuts vulnerability) or loss MAGNITUDE
  // (detective/responsive → cuts loss). effectiveness is MEASURED 0..1 with a source.
  function ctrlEff(c) { return clamp01(num(c && c.effectiveness)); }
  function isFreqCtrl(c) { return c && c.factor === 'frequency'; }
  function isMagCtrl(c) { return c && c.factor === 'magnitude'; }
  function complementProduct(controls) {
    // Π(1 − eff_i): controls layer, they do not add.
    var p = 1;
    for (var i = 0; i < controls.length; i++) p *= (1 - ctrlEff(controls[i]));
    return p;
  }

  // ───────────────────────── the per-risk FAIR computation ─────────────────────────
  // risk = {
  //   id, appId?, businessValue?,
  //   threatEventFrequency: Distribution,       // TEF, events/yr
  //   vulnerability_inherent: Distribution,     // P(attempt succeeds), controls off
  //   lossMagnitude: { primary: Distribution, secondary: Distribution },
  //   correlationGroupIds: string[],
  //   controls: [Control]
  // }
  // opts = { iters, seed, varPct, corr, attribution, commonCache }
  // Returns a rich result incl. inherent/residual scenarios, control attribution, reconciliation,
  // provenance, bound-check and (for roll-up) the residual per-iteration sample array.
  function computeRisk(risk, opts) {
    opts = opts || {};
    var iters = opts.iters || CONFIG.iters;
    var seed = (opts.seed != null) ? opts.seed : CONFIG.seed;
    var corr = (opts.corr != null) ? opts.corr : CONFIG.corr;
    var attrMode = opts.attribution || CONFIG.attribution;

    var missing = [];
    var inputSources = [];
    function req(distRaw, label, srcs, sectorTag) {
      var d = asDist(distRaw);
      if (!d) {
        missing.push(label);
        // sector default (clearly modeled) so a value exists but is visibly NOT the customer's data.
        d = null;
      }
      if (srcs) srcs.forEach(function (s) { inputSources.push(s); });
      return d;
    }

    var tefD = req(risk.threatEventFrequency, 'threatEventFrequency', risk.tefSources);
    var vulnD = req(risk.vulnerability_inherent, 'vulnerability_inherent', risk.vulnSources);
    var lm = risk.lossMagnitude || {};
    var primD = req(lm.primary, 'lossMagnitude.primary', risk.lmSources);
    var secD = lm.secondary != null ? asDist(lm.secondary) : { min: 0, mostLikely: 0, max: 0, dist: 'point', point: true };

    // Fallback sector-default ranges (tagged modeled) so an unquantified risk still computes a tail,
    // never a fabricated point. Confidence for the figure drops to 'low' and missingInputs is set.
    var usedSectorDefault = false;
    if (!tefD) { tefD = { min: 0.5, mostLikely: 1, max: 4, dist: 'pert', point: false, sectorDefault: true }; usedSectorDefault = true; }
    if (!vulnD) { vulnD = { min: 0.1, mostLikely: 0.3, max: 0.7, dist: 'pert', point: false, sectorDefault: true }; usedSectorDefault = true; }
    if (!primD) { primD = spreadPoint(num(risk.financialExposure) || 0, true); usedSectorDefault = true; }
    if (usedSectorDefault) inputSources.push({ type: 'modeled', name: 'sector default range', confidence: 'low' });

    var freqCtrls = (risk.controls || []).filter(isFreqCtrl);
    var magCtrls = (risk.controls || []).filter(isMagCtrl);
    var freqFactor = complementProduct(freqCtrls);   // vulnerability_residual multiplier
    var magFactor = complementProduct(magCtrls);      // LM_residual multiplier

    // ── correlated Monte-Carlo ──
    // Each risk samples from its own seeded stream; risks that share a correlationGroup blend a
    // common per-iteration shock into their TEF uniform so they CO-OCCUR (positive correlation).
    var rng = mulberry32((seed ^ hashStr(risk.id || 'risk')) >>> 0);
    var groups = risk.correlationGroupIds || [];
    var commons = groups.map(function (g) { return getCommon(g, iters, seed, opts.commonCache); });

    var inhSamples = new Array(iters);
    var resSamples = new Array(iters);
    for (var i = 0; i < iters; i++) {
      var uTefOwn = rng();
      var uTef = uTefOwn;
      if (commons.length) {
        // average the group commons, then blend with own draw by the correlation strength
        var cSum = 0; for (var g = 0; g < commons.length; g++) cSum += commons[g][i];
        var cAvg = cSum / commons.length;
        uTef = clamp01(corr * cAvg + (1 - corr) * uTefOwn);
      }
      var tef = sampleDist(tefD, uTef);
      var vuln = sampleDist(vulnD, rng());
      var prim = sampleDist(primD, rng());
      var sec = sampleDist(secD, rng());
      var lmInh = prim + sec;

      var lefInh = tef * vuln;
      var lossInh = lefInh * lmInh;

      var vulnRes = vuln * freqFactor;
      var lmRes = lmInh * magFactor;
      var lefRes = tef * vulnRes;
      var lossRes = lefRes * lmRes;

      inhSamples[i] = lossInh;
      resSamples[i] = lossRes;
    }

    var EAL_inh = mean(inhSamples);
    var EAL_res = mean(resSamples);
    var mitigated = EAL_inh - EAL_res;

    var inhSorted = inhSamples.slice().sort(function (a, b) { return a - b; });
    var resSorted = resSamples.slice().sort(function (a, b) { return a - b; });
    var varPct = opts.varPct || CONFIG.varPct;

    // ── control-level attribution ──
    // Marginal $ of control k = residual EAL recomputed with k's effectiveness set to 0, minus the
    // all-controls-on residual EAL. Because EAL scales linearly with the residual vuln/LM multiplier,
    // turning control k off scales residual EAL by 1/(1−eff_k) — exact, deterministic, no re-sim.
    var attribution = (risk.controls || []).map(function (c) {
      var eff = ctrlEff(c);
      var lossReductionRaw = (eff < 1) ? (EAL_res * eff / (1 - eff)) : (EAL_inh - EAL_res);
      var cs = normSource(c.effectivenessSource || { type: 'modeled', name: 'control effectiveness', confidence: 'low' });
      return {
        id: c.id, name: c.name || c.id, nistFunction: c.nistFunction || null, factor: c.factor,
        effectiveness: eff,
        lossReduction: lossReductionRaw,
        lossLeftOpen: EAL_res,               // what this control (with others) still leaves exposed
        sources: [cs], sourceTypes: sourceBadges([cs]), confidence: figureConfidence([cs])
      };
    });
    var sumMarginals = attribution.reduce(function (s, a) { return s + a.lossReduction; }, 0);
    var interactionRemainder = mitigated - sumMarginals;
    if (attrMode === 'normalize' && sumMarginals > 0) {
      var scale = mitigated / sumMarginals;
      attribution.forEach(function (a) { a.lossReduction *= scale; a.normalized = true; });
      interactionRemainder = 0;
    }

    // ── business-value ceiling (context, not arithmetic): a risk can't lose more than the asset. ──
    var bv = (risk.businessValue != null) ? num(risk.businessValue) : null;
    var lmInhMax = (primD ? primD.max : 0) + (secD ? secD.max : 0);
    var boundViolation = (bv != null && lmInhMax > bv)
      ? { flagged: true, lmInherentMax: lmInhMax, businessValue: bv, message: 'inherent LM exceeds asset business value' }
      : { flagged: false };

    // ── provenance for the figures ──
    var ctrlSources = (risk.controls || []).map(function (c) { return c.effectivenessSource; }).filter(Boolean);
    var allSources = inputSources.concat(ctrlSources).map(normSource).filter(Boolean);
    var confidence = figureConfidence(allSources);
    if (missing.length) confidence = 'low';

    var asOf = nowIso(opts);
    function scen(sortedSamples, EAL, tef, vulnMul, lmMul) {
      return {
        EAL: figure(EAL, { p50: percentile(sortedSamples, 0.50), p90: percentile(sortedSamples, 0.90), p95: percentile(sortedSamples, 0.95), p99: percentile(sortedSamples, 0.99) }, allSources, opts),
        tail: percentile(sortedSamples, varPct),
        p50: percentile(sortedSamples, 0.50), p90: percentile(sortedSamples, 0.90), p99: percentile(sortedSamples, 0.99)
      };
    }

    return {
      id: risk.id, type: 'risk', appId: risk.appId || null,
      inherent: scen(inhSorted, EAL_inh),
      residual: scen(resSorted, EAL_res),
      mitigated: mitigated,
      controls: attribution,
      attributionMode: attrMode,
      interactionRemainder: interactionRemainder,
      reconciliation: {
        controlsPlusRemainderEqualsMitigated: Math.abs((sumMarginals + interactionRemainder) - mitigated) < 1e-6 * (Math.abs(mitigated) + 1),
        mitigatedPlusResidualEqualsInherent: Math.abs((mitigated + EAL_res) - EAL_inh) < 1e-6 * (Math.abs(EAL_inh) + 1),
        sumMarginals: sumMarginals, mitigated: mitigated, residualEAL: EAL_res, inherentEAL: EAL_inh
      },
      sources: allSources, sourceTypes: sourceBadges(allSources), confidence: confidence,
      missingInputs: missing, usedSectorDefault: usedSectorDefault,
      boundViolation: boundViolation, asOf: asOf,
      _resSamples: resSamples, _iters: iters // aligned per-iteration residual losses (for roll-up)
    };
  }

  // Shared per-group "common shock" arrays so correlated risks co-move across iterations.
  function getCommon(group, iters, seed, cache) {
    cache = cache || getCommon._cache || (getCommon._cache = {});
    var key = group + '|' + iters + '|' + seed;
    if (cache[key]) return cache[key];
    var rng = mulberry32((seed ^ hashStr('grp:' + group)) >>> 0);
    var arr = new Array(iters);
    for (var i = 0; i < iters; i++) arr[i] = rng();
    cache[key] = arr;
    return arr;
  }

  // ───────────────────────── roll-up ─────────────────────────
  // Expected loss IS additive (linearity of expectation): node.EAL = Σ child.EAL, computed by
  // simple summation regardless of correlation. The TAIL is NOT additive: aggregate child residual
  // DISTRIBUTIONS via Monte-Carlo (element-wise sum of the aligned, correlation-carrying per-iteration
  // samples) and take the 95th percentile of the aggregate. Summing child tails would overstate it.
  function rollupResidual(children, opts) {
    opts = opts || {};
    var varPct = opts.varPct || CONFIG.varPct;
    var kids = (children || []).filter(Boolean);
    if (!kids.length) return { EAL: 0, tail: 0, p50: 0, p90: 0, p99: 0, _resSamples: [] };
    var iters = kids[0]._resSamples ? kids[0]._resSamples.length : (opts.iters || CONFIG.iters);
    var agg = new Array(iters);
    for (var i = 0; i < iters; i++) agg[i] = 0;
    var EAL = 0;
    kids.forEach(function (k) {
      // additive EAL — exact, taken from each child's own residual EAL
      EAL += (k.residual && k.residual.EAL) ? k.residual.EAL.value : (k.EAL || 0);
      var s = k._resSamples || [];
      for (var i = 0; i < iters; i++) agg[i] += (s[i] || 0);
    });
    var sorted = agg.slice().sort(function (a, b) { return a - b; });
    return {
      EAL: EAL,                                  // Σ child EAL, exact
      tail: percentile(sorted, varPct),          // correlation-aware, from the aggregated distribution
      p50: percentile(sorted, 0.50), p90: percentile(sorted, 0.90), p99: percentile(sorted, 0.99),
      _resSamples: agg
    };
  }

  // ───────────────────────── tree auto-generation ─────────────────────────
  // Build function→process→app nodes + parent links from inventory + dependency (service-map) edges.
  // No manual tree drawing. crownJewel is flagged where customer_facing and revenue-dependency are high.
  // inventory: { functions:[{id,name}], processes:[{id,name,functionId,businessValue?}],
  //              apps:[{id,name,processId?,customerFacing?,revenueDependency?,businessValue?}] }
  // edges (optional): [{from:appId, to:processId}] service-map dependencies (override processId).
  function buildTree(inventory, edges) {
    inventory = inventory || {};
    var nodes = [];
    (inventory.functions || []).forEach(function (f) {
      nodes.push({ id: f.id, type: 'function', parentId: null, name: f.name, businessValue: (f.businessValue != null ? num(f.businessValue) : null), crownJewel: false });
    });
    (inventory.processes || []).forEach(function (p) {
      nodes.push({ id: p.id, type: 'process', parentId: p.functionId || null, name: p.name, businessValue: (p.businessValue != null ? num(p.businessValue) : null), crownJewel: false });
    });
    // service-map edges (app → process) take precedence over an inline processId
    var appToProc = {};
    (edges || []).forEach(function (e) { if (e && e.from && e.to) appToProc[e.from] = e.to; });
    (inventory.apps || []).forEach(function (a) {
      var parent = appToProc[a.id] || a.processId || null;
      var crown = !!(a.customerFacing) && (num(a.revenueDependency) >= (inventory.crownRevenueThreshold != null ? inventory.crownRevenueThreshold : 0.5));
      nodes.push({ id: a.id, type: 'app', parentId: parent, name: a.name, businessValue: (a.businessValue != null ? num(a.businessValue) : null), crownJewel: crown, customerFacing: !!a.customerFacing, revenueDependency: (a.revenueDependency != null ? num(a.revenueDependency) : null) });
    });
    return nodes;
  }

  // Attach risks from a threat library keyed by asset type; controls from a catalog. Returns risk nodes.
  // threatLibrary: { <assetType>: [ { id, name, correlationGroupIds, tef?, vulnerability_inherent?, lossMagnitude? } ] }
  // Each produced risk node carries parentId = appId and inherits the app's businessValue as its ceiling.
  function attachRisks(appNode, assetType, threatLibrary, opts) {
    var lib = (threatLibrary && threatLibrary[assetType]) || [];
    return lib.map(function (t, ix) {
      return {
        id: (appNode.id + ':' + (t.id || ('risk' + ix))),
        type: 'risk', parentId: appNode.id, name: t.name || t.id, appId: appNode.id,
        businessValue: appNode.businessValue,
        threatEventFrequency: t.tef || t.threatEventFrequency || null,
        vulnerability_inherent: t.vulnerability_inherent || null,
        lossMagnitude: t.lossMagnitude || null,
        correlationGroupIds: t.correlationGroupIds || [],
        controls: [],
        tefSources: t.tefSources, vulnSources: t.vulnSources, lmSources: t.lmSources
      };
    });
  }

  // ───────────────────────── whole-tree compute + memoized refresh ─────────────────────────
  // nodes: flat list from buildTree + risk nodes (parentId links). Risk nodes must carry FAIR inputs.
  // Returns { byId, roots, version }. Each node gets { EAL, tail, p50, p90, p99, confidence, sources,
  // asOf } plus (risks) the full computeRisk result. Post-order so children compute first.
  function computeTree(nodes, opts) {
    opts = opts || {};
    opts.commonCache = opts.commonCache || {}; // share the correlation commons across the whole tree
    var byId = {}; var childrenOf = {};
    nodes.forEach(function (n) { byId[n.id] = Object.assign({}, n); });
    nodes.forEach(function (n) { if (n.parentId) (childrenOf[n.parentId] = childrenOf[n.parentId] || []).push(n.id); });

    var memo = {};
    function compute(id) {
      if (memo[id]) return byId[id];
      memo[id] = true;
      var node = byId[id];
      if (node.type === 'risk') {
        var r = computeRisk(node, opts);
        node.result = r;
        node.EAL = r.residual.EAL.value;
        node.inherentEAL = r.inherent.EAL.value;
        node.tail = r.residual.tail;
        node.mitigated = r.mitigated;
        node.p50 = r.residual.p50; node.p90 = r.residual.p90; node.p99 = r.residual.p99;
        node.confidence = r.confidence; node.sources = r.sources; node.sourceTypes = r.sourceTypes;
        node.missingInputs = r.missingInputs; node.boundViolation = r.boundViolation; node.asOf = r.asOf;
        node._resSamples = r._resSamples;
        return node;
      }
      var kidIds = childrenOf[id] || [];
      var kids = kidIds.map(function (k) { return compute(k); });
      var roll = rollupResidual(kids, opts);
      node.EAL = roll.EAL;                        // Σ child EAL (exact)
      node.inherentEAL = kids.reduce(function (s, k) { return s + (k.inherentEAL || 0); }, 0);
      node.tail = roll.tail;                       // correlation-aware aggregate p95
      node.mitigated = node.inherentEAL - node.EAL;
      node.p50 = roll.p50; node.p90 = roll.p90; node.p99 = roll.p99;
      node._resSamples = roll._resSamples;
      // provenance rolls up: union of child sources, confidence = worst child confidence
      var srcs = []; var childConfs = [];
      kids.forEach(function (k) { (k.sources || []).forEach(function (s) { srcs.push(s); }); if (k.confidence) childConfs.push({ confidence: k.confidence }); });
      node.sources = srcs; node.sourceTypes = sourceBadges(srcs);
      node.confidence = worstConfidence(childConfs.length ? childConfs : srcs);
      node.sumChildTails = kids.reduce(function (s, k) { return s + (k.tail || 0); }, 0); // for the ≤ check
      node.asOf = nowIso(opts);
      return node;
    }
    var roots = nodes.filter(function (n) { return !n.parentId; }).map(function (n) { return n.id; });
    nodes.forEach(function (n) { compute(n.id); });

    // Reactive refresh: recompute only the path from a changed node up to the root (memoized subtrees
    // unchanged). Returns the set of ids recomputed.
    function refreshFrom(changedId, mutate) {
      if (mutate && byId[changedId]) mutate(byId[changedId]);
      var recomputed = [];
      var cur = changedId;
      // clear memo along the ancestor path, then recompute it
      var path = []; var c = changedId;
      while (c) { path.push(c); c = byId[c] ? byId[c].parentId : null; }
      path.forEach(function (pid) { delete memo[pid]; });
      path.forEach(function (pid) { compute(pid); recomputed.push(pid); });
      return recomputed;
    }

    return { byId: byId, roots: roots, refreshFrom: refreshFrom, version: VERSION };
  }

  // ───────────────────────── public API ─────────────────────────
  return {
    VERSION: VERSION,
    CONFIG: CONFIG,
    // primitives (exposed for reuse/testing)
    mulberry32: mulberry32, hashStr: hashStr, asDist: asDist, sampleDist: sampleDist,
    percentile: percentile, mean: mean, invNorm: invNorm,
    // provenance
    figure: figure, worstConfidence: worstConfidence, sourceBadges: sourceBadges, normSource: normSource,
    // FAIR
    computeRisk: computeRisk, rollupResidual: rollupResidual,
    // tree
    buildTree: buildTree, attachRisks: attachRisks, computeTree: computeTree
  };
}));
