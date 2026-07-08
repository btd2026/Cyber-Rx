// Guards the platform's core promise: EVERY NIST CSF 2.0 sub-category the cockpit
// renders must be reachable by a real evidence source — document review
// (CONTROL_MAP after the CSF_DOC_COVERAGE merge) or connected-tool telemetry
// (CAP_FRAMEWORK). A control with no evidence path would show "Non-existent"
// forever, no matter what the customer uploads — that is the false promise we
// refuse to ship. Pure static check (no PDFs); the demo/HPE/_verify-docs.mjs
// harness proves the same end-to-end against the real sample documents.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsJs = fs.readFileSync(path.join(__dirname, '..', '..', 'cyberrx-api', 'src', 'routes', 'documents.js'), 'utf8');
const cockpit = fs.readFileSync(path.join(__dirname, '..', 'public', 'cockpit.html'), 'utf8');

let fail = 0, pass = 0;
const ok = (l, c) => { if (c) pass++; else { fail++; console.error('FAIL ' + l); } };

// The tag-aware maturity ceiling must exist — it's what stops "every control is a 5".
ok('doc maturity is tag-aware (docControlCMMI exists)', /function docControlCMMI\(attrResults\)/.test(docsJs));
ok('ceiling: measurement lifts to 4, +improvement to 5', /if \(hasM\) ceil = 4;/.test(docsJs) && /if \(hasM && hasI\) ceil = 5;/.test(docsJs));
ok('per-control scoring uses the ceiling', /const cmmi = docControlCMMI\(attrResults\);/.test(docsJs));
ok('full-catalog coverage table + additive merge exist', /const CSF_DOC_COVERAGE = \{/.test(docsJs) && /for \(const dt of Object\.keys\(CSF_DOC_COVERAGE\)\)/.test(docsJs));

// Build the merged doc-evidenced control-id set exactly as the server does.
const cmMatch = docsJs.match(/const CONTROL_MAP = \{[\s\S]*?\n\};/);
const covMatch = docsJs.match(/const CSF_DOC_COVERAGE = \{[\s\S]*?\n\};/);
const mergeMatch = docsJs.match(/for \(const dt of Object\.keys\(CSF_DOC_COVERAGE\)\) \{[\s\S]*?\n\}/);
// eslint-disable-next-line no-new-func
const CONTROL_MAP = new Function(cmMatch[0] + '\n' + covMatch[0] + '\n' + mergeMatch[0] + '\nreturn CONTROL_MAP;')();
const DOC_IDS = new Set();
for (const dt of Object.values(CONTROL_MAP)) dt.controls.forEach((c) => DOC_IDS.add(c.id));

// The full CSF catalog the cockpit renders.
const CSF_RAW = new Function(cockpit.match(/var CSF_RAW=\{[\s\S]*?\n\};/)[0] + '\nreturn CSF_RAW;')();
const CSF_IDS = [];
for (const fn of Object.values(CSF_RAW)) for (const cat of Object.values(fn)) for (const [id] of cat) if (!CSF_IDS.includes(id)) CSF_IDS.push(id);

// Control ids a connected tool can evidence.
const CAP_FRAMEWORK = new Function(cockpit.match(/var CAP_FRAMEWORK=\{[\s\S]*?\n\};/)[0] + '\nreturn CAP_FRAMEWORK;')();
const TOOL_IDS = new Set();
for (const fw of Object.values(CAP_FRAMEWORK)) (fw.csf || []).forEach((id) => TOOL_IDS.add(id));

const uncovered = CSF_IDS.filter((id) => !DOC_IDS.has(id) && !TOOL_IDS.has(id));
ok('CSF catalog is the full 2.0 set (>=106)', CSF_IDS.length >= 106);
ok('every CSF sub-category has an evidence path (doc or tool)', uncovered.length === 0);
if (uncovered.length) console.error('  uncovered: ' + uncovered.join(', '));

const docCovered = CSF_IDS.filter((id) => DOC_IDS.has(id)).length;
const toolOnly = CSF_IDS.filter((id) => !DOC_IDS.has(id) && TOOL_IDS.has(id)).length;
console.log(`coverage — ${CSF_IDS.length} CSF sub-categories · ${docCovered} document-evidenced · ${toolOnly} tool-only · ${uncovered.length} uncovered`);

// The cockpit must expose the recompute action (re-pull + recalc from real data).
ok('cockpit has a Recompute button', /id="recomputeBtn"/.test(cockpit));
ok('recompute re-pulls live + signals + re-renders', /getElementById\('recomputeBtn'\)/.test(cockpit) && /loadLive\(\);/.test(cockpit) && /loadSignals\(\);/.test(cockpit));

if (fail) { console.error(`\nframework-evidence-smoke: ${pass} passed, ${fail} FAILED`); process.exit(1); }
console.log(`framework-evidence-smoke OK — ${pass} checks pass (full CSF catalog is evidence-backed; tag-aware maturity ceiling in place; recompute wired).`);
