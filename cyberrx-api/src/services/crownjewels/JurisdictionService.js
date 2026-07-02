'use strict';

/**
 * JurisdictionService — derives the org's applicable cyber notification/disclosure
 * obligations from its operating regions + the data classes it holds + industry
 * (spec: Data & Formulas, §9 / Part B #16). Pure; no DB. Powers the CLO seat:
 * duty, clock, penalty per jurisdiction, and the single binding clock.
 */

const RULES = require('../../config/jurisdictions');

const norm = (s) => String(s || '').toLowerCase().trim();
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Whole-word containment — avoids substring false positives like 'us' matching
// 'aUStralia' or 'RUSsia'. A match requires the needle to appear on token
// boundaries within the haystack (or be exactly equal).
function wordHit(hay, needle) {
  if (!hay || !needle) return false;
  if (hay === needle) return true;
  return new RegExp('(^|[^a-z0-9])' + esc(needle) + '([^a-z0-9]|$)').test(hay);
}
function regionMatches(rule, regions) {
  const rs = regions.map(norm);
  // A rule matches a region when the region and matcher are equal, or either
  // contains the other as a whole word (e.g. region "north america" ⊇ matcher).
  return rule.matchers.some((m) => rs.some((r) => r === m || wordHit(r, m) || wordHit(m, r)));
}
function dataMatches(rule, dataClasses) {
  if (rule.appliesTo.includes('*')) return true;
  const ds = dataClasses.map(norm).join(' ');
  return rule.appliesTo.some((k) => ds.includes(k));
}
function industryMatches(rule, industry) {
  if (!rule.industry) return true; // no industry gate
  const i = norm(industry);
  return rule.industry.some((k) => i.includes(k));
}

/**
 * @param {object} input { regions:[], dataClasses:[], industry:'' }
 * @returns {{ obligations:[], binding:{...}|null, count:number }}
 */
function derive({ regions = [], dataClasses = [], industry = '' } = {}) {
  const regs = Array.isArray(regions) ? regions : (regions ? [regions] : []);
  const dcs = Array.isArray(dataClasses) ? dataClasses : (dataClasses ? [dataClasses] : []);
  if (!regs.length) return { obligations: [], binding: null, count: 0, note: 'operating regions required' };

  const obligations = RULES
    .filter((r) => regionMatches(r, regs) && dataMatches(r, dcs) && industryMatches(r, industry))
    .map((r) => ({
      code: r.code, jurisdiction: r.jurisdiction, flag: r.flag,
      obligation: r.obligation, clock: r.clock, clock_hours: r.clockHours, penalty: r.penalty,
    }))
    .sort((a, b) => a.clock_hours - b.clock_hours);

  return {
    obligations,
    binding: obligations[0] || null, // tightest clock = the constraint the runbook is timed to
    count: obligations.length,
  };
}

module.exports = { derive };
