'use strict';

/**
 * Authoritative NIST SP 800-53 Rev5 parsers — turn the bundled OSCAL catalog +
 * the CPRT 800-53A export into the §4 control-corpus shape. No framework content
 * is invented; everything is read verbatim from resources/.
 *
 *   resources/NIST_SP-800-53_rev5_catalog.txt          OSCAL 5.2.0 catalog
 *   resources/cprt_SP_800_53_A_5_2_0_06-11-2026.json   800-53A determinations + methods
 *
 * Determinations are decomposed PER CONTROL (the walk stops at nested
 * control/control_enhancement boundaries), so AC-2's objectives don't bleed in
 * from AC-2(1)…(n). Judging determination statements is far more reliable than
 * judging a whole control (§2 step 1).
 */

const fs = require('fs');
const path = require('path');
const { deriveNature } = require('../controlNature');

const RES = path.join(__dirname, '../../../../resources');
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

// OSCAL id 'ac-2' / 'ac-2.1' -> native 'AC-2' / 'AC-2(1)'
function nativeId(oscalId) {
  const m = String(oscalId).match(/^([a-z]{2})-(\d+)(?:\.(\d+))?$/i);
  if (!m) return String(oscalId).toUpperCase();
  return m[3] ? `${m[1].toUpperCase()}-${+m[2]}(${+m[3]})` : `${m[1].toUpperCase()}-${+m[2]}`;
}
// CPRT id 'AC-02' / 'AC-04(21)' -> 'AC-2' / 'AC-4(21)'
function cprtNative(id) {
  const m = String(id).match(/^([A-Z]{2})-(\d+)(?:\((\d+)\))?$/);
  if (!m) return String(id);
  return m[3] ? `${m[1]}-${+m[2]}(${+m[3]})` : `${m[1]}-${+m[2]}`;
}

function prose(part) {
  if (!part) return '';
  let s = part.prose || '';
  (part.parts || []).forEach((p) => { s += (s ? ' ' : '') + prose(p); });
  return s.replace(/\{\{\s*insert:\s*param,\s*([\w.-]+)\s*\}\}/g, '[$1]').trim();
}

/**
 * Parse CPRT 800-53A into per-control determinations + method presence.
 * @returns {Object<string,{objectives:Array<{objective_id,determination_statement}>,methods:{examine:boolean,interview:boolean,test:boolean}}>}
 */
function parseCprt(cprtPath = path.join(RES, 'cprt_SP_800_53_A_5_2_0_06-11-2026.json')) {
  const d = J(cprtPath).response.elements;
  const byId = {}; d.elements.forEach((e) => { byId[e.element_identifier] = e; });
  const kids = {};
  d.relationships.filter((r) => r.relationship_identifier === 'projection')
    .forEach((r) => { (kids[r.source_element_identifier] = kids[r.source_element_identifier] || []).push(r.dest_element_identifier); });

  const isCtrl = (e) => e && (e.element_type === 'control' || e.element_type === 'control_enhancement');
  const out = {};
  d.elements.filter(isCtrl).forEach((ctrl) => {
    const native = cprtNative(ctrl.element_identifier);
    const objectives = []; const methods = { examine: false, interview: false, test: false };
    const seen = new Set();
    // Walk children but DO NOT descend into nested controls/enhancements.
    const stack = [...(kids[ctrl.element_identifier] || [])];
    while (stack.length) {
      const id = stack.pop(); if (seen.has(id)) continue; seen.add(id);
      const e = byId[id]; if (!e || isCtrl(e)) continue; // stop at enhancement boundary
      if (e.element_type === 'determination' && e.text) {
        objectives.push({ objective_id: String(e.element_identifier).replace(/^DS-/, ''), determination_statement: e.text.trim() });
      } else if (e.element_type === 'examine') methods.examine = true;
      else if (e.element_type === 'interview') methods.interview = true;
      else if (e.element_type === 'test') methods.test = true;
      (kids[id] || []).forEach((c) => stack.push(c));
    }
    // Determinations come out leaf-first; restore document order by identifier.
    objectives.sort((a, b) => a.objective_id.localeCompare(b.objective_id, undefined, { numeric: true }));
    out[native] = { objectives, methods };
  });
  return out;
}

/**
 * Parse the OSCAL catalog into per-control metadata.
 * @returns {Array<{control_id,family,title,requirement_text,parent_id,withdrawn,oscal_id}>}
 */
function parseCatalog(catalogPath = path.join(RES, 'NIST_SP-800-53_rev5_catalog.txt')) {
  const cat = J(catalogPath).catalog;
  const rows = [];
  const walk = (ctrl, family, parent) => {
    const native = nativeId(ctrl.id);
    const withdrawn = (ctrl.props || []).some((p) => p.name === 'status' && p.value === 'withdrawn');
    const stmt = (ctrl.parts || []).find((p) => p.name === 'statement');
    rows.push({
      control_id: native, family: family.toUpperCase(), title: (ctrl.title || '').trim(),
      requirement_text: prose(stmt), parent_id: parent, withdrawn, oscal_id: ctrl.id,
    });
    for (const enh of ctrl.controls || []) walk(enh, family, native);
  };
  for (const g of cat.groups || []) {
    const fam = (g.id || '').toLowerCase();
    for (const c of g.controls || []) walk(c, fam, null);
  }
  return rows;
}

/**
 * Build the §4 spine corpus records (without crosswalk — attached later from
 * requirement_crosswalks). Withdrawn controls are excluded (not assessable).
 * @returns {Array<corpusRecord>}
 */
function buildSpineCorpus({ catalogPath, cprtPath, framework, version } = {}) {
  const fw = framework || 'NIST_SP_800-53';
  const ver = version || '5.2.0';
  const cprt = parseCprt(cprtPath);
  return parseCatalog(catalogPath)
    .filter((c) => !c.withdrawn)
    .map((c) => {
      const a = cprt[c.control_id] || { objectives: [], methods: {} };
      return {
        control_id: c.control_id,
        framework: fw,
        framework_version: ver,
        family: c.family,
        title: c.title,
        requirement_text: c.requirement_text,
        control_nature: deriveNature(c.control_id, c.family, { hasTestMethod: !!a.methods.test }),
        assessment_objectives: a.objectives,
        crosswalk: {}, // attached from requirement_crosswalks at load time
      };
    });
}

module.exports = { nativeId, cprtNative, prose, parseCprt, parseCatalog, buildSpineCorpus, RES };
