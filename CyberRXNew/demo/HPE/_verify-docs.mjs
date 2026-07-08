// End-to-end proof that EVERY NIST CSF 2.0 sub-category the cockpit renders is
// actually reachable by real evidence — document review OR connected-tool
// telemetry — with NO control left structurally stuck at "Non-existent".
//
// It runs the ACTUAL server pipeline: the real extractText() (the crude
// printable-ASCII byte-scan used for PDFs), the real CONTROL_MAP *after* the
// CSF_DOC_COVERAGE merge, and the real scoreCMMI(). It uploads every HPE demo
// policy PDF exactly as the browser would, records the per-control CMMI the
// cockpit would store, then reconciles that against the full CSF_RAW catalog
// and the CAP_FRAMEWORK tool map — both read live from cockpit.html.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsJs = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'cyberrx-api', 'src', 'routes', 'documents.js'), 'utf8');
const cockpit = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'cockpit.html'), 'utf8');

// --- Extract the REAL scoring engine (map + merge + scorers) from documents.js ---
const cmMatch = docsJs.match(/const CONTROL_MAP = \{[\s\S]*?\n\};/);
const covMatch = docsJs.match(/const CSF_DOC_COVERAGE = \{[\s\S]*?\n\};/);
const mergeMatch = docsJs.match(/for \(const dt of Object\.keys\(CSF_DOC_COVERAGE\)\) \{[\s\S]*?\n\}/);
const scMatch = docsJs.match(/function scoreCMMI\(matched, total\)[\s\S]*?\n\}/);
const dcMatch = docsJs.match(/function docControlCMMI\(attrResults\)[\s\S]*?\n\}/);
const exMatch = docsJs.match(/function extractText\(buffer, filename\)[\s\S]*?\n\}/);
if (!cmMatch || !covMatch || !mergeMatch || !scMatch || !dcMatch || !exMatch) {
  console.error('could not extract CONTROL_MAP / CSF_DOC_COVERAGE / merge / scoreCMMI / docControlCMMI / extractText'); process.exit(1);
}
// eslint-disable-next-line no-new-func
const { CONTROL_MAP, docControlCMMI, extractText } = new Function(
  cmMatch[0] + '\n' + covMatch[0] + '\n' + mergeMatch[0] + '\n' + scMatch[0] + '\n' + dcMatch[0] + '\n' + exMatch[0] +
  '\nreturn {CONTROL_MAP,docControlCMMI,extractText};')();

// --- The full CSF 2.0 catalog the cockpit renders (CSF_RAW) ---
const rawMatch = cockpit.match(/var CSF_RAW=\{[\s\S]*?\n\};/);
if (!rawMatch) { console.error('could not extract CSF_RAW'); process.exit(1); }
// eslint-disable-next-line no-new-func
const CSF_RAW = new Function(rawMatch[0] + '\nreturn CSF_RAW;')();
const CSF_IDS = [];
for (const fn of Object.values(CSF_RAW)) for (const cat of Object.values(fn)) for (const [id] of cat) if (!CSF_IDS.includes(id)) CSF_IDS.push(id);

// --- Control IDs a connected tool can evidence (CAP_FRAMEWORK) ---
const capMatch = cockpit.match(/var CAP_FRAMEWORK=\{[\s\S]*?\n\};/);
// eslint-disable-next-line no-new-func
const CAP_FRAMEWORK = new Function(capMatch[0] + '\nreturn CAP_FRAMEWORK;')();
const TOOL_IDS = new Set();
for (const fw of Object.values(CAP_FRAMEWORK)) (fw.csf || []).forEach((id) => TOOL_IDS.add(id));

// --- Per-control analysis, exactly like analyzeDeep() (proportion of attrs matched) ---
function perControl(text, docType) {
  const lower = String(text || '').toLowerCase();
  const mapping = CONTROL_MAP[docType];
  const out = {};
  if (!mapping) return out;
  mapping.controls.forEach((c) => {
    const attrResults = c.attrs.map((a) => ({ tag: a.tag, found: new RegExp(a.pat, 'i').test(lower) }));
    const m = attrResults.filter((a) => a.found).length;
    out[c.id] = { cmmi: docControlCMMI(attrResults), matched: m, total: c.attrs.length };
  });
  return out;
}

const FILES = [
  ['d1', 'd1_information_security_policy.pdf'], ['d2', 'd2_risk_assessment.pdf'],
  ['d3', 'd3_third_party_supply_chain_policy.pdf'], ['d4', 'd4_access_control_policy.pdf'],
  ['d5', 'd5_identity_authentication_policy.pdf'], ['d6', 'd6_incident_response_plan.pdf'],
  ['d7', 'd7_business_continuity_dr_plan.pdf'], ['d8', 'd8_change_management_policy.pdf'],
  ['d9', 'd9_configuration_management_policy.pdf'], ['d10', 'd10_data_protection_policy.pdf'],
];
const LBL = { 0: 'None', 1: 'Initial', 2: 'Managed', 3: 'Defined', 4: 'Quant.Managed', 5: 'Optimizing' };

// Simulate uploading every demo policy → the cockpit's docScores map (keyed by control id).
const docScores = {};
console.log('=== Per-document review (real server PDF path) ===');
FILES.forEach(([dt, f]) => {
  const buf = fs.readFileSync(path.join(__dirname, f));
  const pc = perControl(extractText(buf, f), dt);
  const ids = Object.keys(pc);
  const scored = ids.filter((id) => pc[id].cmmi >= 3).length;
  ids.forEach((id) => { const s = pc[id].cmmi; if (docScores[id] == null || s > docScores[id]) docScores[id] = s; });
  console.log(`  ${dt.padEnd(4)} ${f.padEnd(40)} ${ids.length} controls · ${scored} at Defined(3)+`);
});

// Reconcile the full CSF catalog against both evidence sources.
const byDoc = [], byTool = [], byNone = [];
CSF_IDS.forEach((id) => {
  const doc = docScores[id] != null && docScores[id] >= 1;
  const tool = TOOL_IDS.has(id);
  if (doc) byDoc.push(id); else if (tool) byTool.push(id); else byNone.push(id);
});

console.log(`\n=== Full NIST CSF 2.0 catalog coverage (${CSF_IDS.length} sub-categories) ===`);
console.log(`  📄 document review : ${byDoc.length}`);
console.log(`  🔌 tool telemetry  : ${byTool.length}  (${byTool.join(', ')})`);
console.log(`  — no evidence path : ${byNone.length}${byNone.length ? '  (' + byNone.join(', ') + ')' : ''}`);

// Honesty check: show the document CMMI distribution so a low score is visible, not hidden.
const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
byDoc.forEach((id) => { dist[docScores[id]]++; });
console.log(`\n  document CMMI spread — Initial ${dist[1]} · Managed ${dist[2]} · Defined ${dist[3]} · Quant ${dist[4]} · Optimizing ${dist[5]}`);
const gaps = byDoc.filter((id) => docScores[id] <= 2);
if (gaps.length) console.log(`  honest gaps (doc found, control immature): ${gaps.map((id) => id + '=' + LBL[docScores[id]]).join(', ')}`);

if (byNone.length) {
  console.error(`\nFAIL — ${byNone.length} CSF sub-categories have NO evidence path (neither document nor tool). These would show "Non-existent" even with everything uploaded.`);
  process.exit(1);
}
console.log(`\nOK — every one of the ${CSF_IDS.length} CSF 2.0 sub-categories is reachable by real evidence (document review or connected-tool telemetry). Nothing is structurally stuck at Non-existent.`);
process.exit(0);
