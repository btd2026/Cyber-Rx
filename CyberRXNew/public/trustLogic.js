/**
 * trustLogic.js — pure, testable decision logic for the CEO "Customer Trust" tab.
 *
 * These functions decide the CEO-facing WORDING from the evidence, and their whole
 * job is to NOT overstate: an unreadable source yields a muted "—", and
 * "No confirmed customer data exposure" is only ever returned when the evidence is
 * COMPLETE. The cockpit (ciso5.js) calls these; Jest tests import them directly.
 *
 * UMD: exports for Node/Jest, attaches window.TrustLogic in the browser.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TrustLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Allowed posture values, worst-last.
  var POSTURE = ['Stable', 'Stable — Watch', 'At Risk', 'Critical'];

  // Customer trust posture from evidence. Never green when we cannot read the
  // incident source. Worst-of the inputs wins.
  //   inp: { incidentsConnected, incidents, disclosures, identityMaterial }
  function trustPosture(inp) {
    inp = inp || {};
    if (!inp.incidentsConnected) return { label: '—', cls: 'n', connected: false };
    var inc = Number(inp.incidents) || 0;
    var disc = Number(inp.disclosures) || 0;
    if (disc > 0) return { label: 'Critical', cls: 'r', connected: true };
    if (inc > 0) return { label: 'At Risk', cls: 'r', connected: true };
    if (inp.identityMaterial) return { label: 'Stable — Watch', cls: 'a', connected: true };
    return { label: 'Stable', cls: 'g', connected: true };
  }

  // Customer-data exposure — SAFE wording. "No confirmed customer data exposure" is
  // returned ONLY when evidence is complete: incident data (SIEM) AND data-loss
  // monitoring (DLP) both connected, and no open incident touching customer data.
  // Otherwise the honest read is "Evidence incomplete" — never "No exposure".
  //   inp: { incidentsConnected, dlpConnected, incidentTouchingData }
  function customerDataExposure(inp) {
    inp = inp || {};
    if (!inp.incidentsConnected) return { label: 'Evidence incomplete', cls: 'n', connected: false, complete: false };
    if ((Number(inp.incidentTouchingData) || 0) > 0) return { label: 'Exposure under investigation', cls: 'r', connected: true, complete: true };
    if (inp.dlpConnected) return { label: 'No confirmed customer data exposure', cls: 'g', connected: true, complete: true };
    return { label: 'Evidence incomplete', cls: 'a', connected: true, complete: false };
  }

  // The one-line CEO answer sentence, composed from the same evidence.
  function trustAnswer(inp) {
    inp = inp || {};
    if (!inp.incidentsConnected) return 'Connect your SIEM to answer this — customer-impact evidence is not yet flowing.';
    var inc = Number(inp.incidents) || 0;
    var disc = Number(inp.disclosures) || 0;
    if (disc > 0 || inc > 0) {
      var parts = [];
      if (inc > 0) parts.push(inc + ' customer-impacting incident' + (inc > 1 ? 's' : ''));
      if (disc > 0) parts.push(disc + ' customer-notified breach/privacy event' + (disc > 1 ? 's' : ''));
      return 'No — ' + parts.join(' and ') + ' this quarter. Trust posture needs your attention now.';
    }
    var s = 'Yes — no confirmed customer impact.';
    if (inp.identityMaterial) s += ' One unresolved identity exposure in the customer platform remains under watch.';
    if (!inp.availabilityConnected) s += ' Availability evidence is incomplete.';
    return s;
  }

  // Decision-box headline — decision-oriented, and honest when customers ARE hit.
  function bottomLineHead(inp) {
    inp = inp || {};
    if (!inp.incidentsConnected) return 'Customer trust — evidence not yet flowing.';
    if ((Number(inp.incidents) || 0) > 0 || (Number(inp.disclosures) || 0) > 0) return 'Customers are impacted — act now.';
    return 'Customer trust is stable today.';
  }

  // Label that MUST accompany any dollar figure shown to the CEO — never a bare number.
  var EXPOSURE_LABEL = 'Estimated customer-platform exposure (modeled)';

  // Evidence-source status, mapped to a pill class. Statuses:
  //   Connected · Computed · Partially Connected · Stale · Not Enough Evidence · Not Connected
  function sourceStatus(o) {
    o = o || {};
    if (o.stale) return { label: 'Stale', cls: 'a' };
    if (o.connected && o.computed) return { label: 'Computed', cls: 'a' };
    if (o.connected && o.partial) return { label: 'Partially Connected', cls: 'a' };
    if (o.connected) return { label: 'Connected', cls: 'g' };
    if (o.someEvidence) return { label: 'Not Enough Evidence', cls: 'a' };
    return { label: 'Not Connected', cls: 'n' };
  }

  return {
    POSTURE: POSTURE,
    trustPosture: trustPosture,
    customerDataExposure: customerDataExposure,
    trustAnswer: trustAnswer,
    bottomLineHead: bottomLineHead,
    sourceStatus: sourceStatus,
    EXPOSURE_LABEL: EXPOSURE_LABEL,
  };
});
