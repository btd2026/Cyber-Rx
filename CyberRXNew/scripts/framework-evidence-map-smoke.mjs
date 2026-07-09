// The heart of the platform: EVERY NIST CSF 2.0 sub-category must be mapped to an
// explicit evidence source — a policy document or a telemetry capability — so the
// cockpit can always name where a control's score comes from, and tell you exactly
// what to upload/connect for the ones not yet evidenced (never a bare "Non-existent").
// This guards that the frontend registry (FW_CTRL_SRC) is COMPLETE and stays in sync
// with the backend's own document coverage + CAP_FRAMEWORK.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, '..', 'public');
const cockpit = fs.readFileSync(path.join(pub, 'cockpit.html'), 'utf8');
const ciso = fs.readFileSync(path.join(pub, 'ciso5.js'), 'utf8');
const docs = fs.readFileSync(path.join(__dirname, '..', '..', 'cyberrx-api', 'src', 'routes', 'documents.js'), 'utf8');

let fail = 0, pass = 0;
const ok = (l, c) => { if (c) pass++; else { fail++; console.error('FAIL ' + l); } };

// Frontend registry + resolver exist.
ok('cockpit declares FW_CTRL_SRC (control→source registry)', /var FW_CTRL_SRC=\{/.test(cockpit));
ok('cockpit has controlEvidence() resolver', /function controlEvidence\(id,cov\)/.test(cockpit));
ok('finding names the awaited document/tool when unevidenced', /Not evidenced yet · evidenced by <b>document review<\/b>/.test(ciso) && /Not evidenced yet · evidenced by <b>telemetry<\/b>/.test(ciso));
ok('coverage gap groups by source (c5fwGaps)', /function c5fwGaps\(T\)/.test(ciso) && /To close the gap:/.test(ciso));

// COMPLETENESS: every CSF_RAW sub-category is in FW_CTRL_SRC.
const CSF = new Function(cockpit.match(/var CSF_RAW=\{[\s\S]*?\n\};/)[0] + '\nreturn CSF_RAW;')();
const ids = [];
for (const fn of Object.values(CSF)) for (const cat of Object.values(fn)) for (const [id] of cat) if (!ids.includes(id)) ids.push(id);
const SRC = new Function(cockpit.match(/var FW_CTRL_SRC=\{[\s\S]*?\n\};/)[0] + '\nreturn FW_CTRL_SRC;')();
const missing = ids.filter((id) => !SRC[id]);
ok('every CSF sub-category has a declared evidence source', missing.length === 0);
if (missing.length) console.error('  missing: ' + missing.join(', '));

// SYNC: a document-declared control must actually be document-scoreable on the backend,
// and a telemetry-declared control must actually be covered by CAP_FRAMEWORK.
const cm = docs.match(/const CONTROL_MAP = \{[\s\S]*?\n\};/)[0];
const cov = docs.match(/const CSF_DOC_COVERAGE = \{[\s\S]*?\n\};/)[0];
const mg = docs.match(/for \(const dt of Object\.keys\(CSF_DOC_COVERAGE\)\) \{[\s\S]*?\n\}/)[0];
const CONTROL_MAP = new Function(cm + '\n' + cov + '\n' + mg + '\nreturn CONTROL_MAP;')();
const backendDocIds = new Set();
for (const dt of Object.values(CONTROL_MAP)) dt.controls.forEach((c) => { if (/^[A-Z]{2}\.[A-Z]{2}-/.test(c.id)) backendDocIds.add(c.id); });
const CAP = new Function(cockpit.match(/var CAP_FRAMEWORK=\{[\s\S]*?\n\};/)[0] + '\nreturn CAP_FRAMEWORK;')();
const toolIds = new Set();
for (const fw of Object.values(CAP)) (fw.csf || []).forEach((id) => toolIds.add(id));

const docMismatch = ids.filter((id) => SRC[id].k === 'd' && !backendDocIds.has(id));
const toolMismatch = ids.filter((id) => SRC[id].k === 't' && !toolIds.has(id));
ok('every document-declared control is backend-scoreable', docMismatch.length === 0);
if (docMismatch.length) console.error('  doc-declared but not on backend: ' + docMismatch.join(', '));
ok('every telemetry-declared control is in CAP_FRAMEWORK', toolMismatch.length === 0);
if (toolMismatch.length) console.error('  tool-declared but not in CAP_FRAMEWORK: ' + toolMismatch.join(', '));

const nd = ids.filter((id) => SRC[id].k === 'd').length, nt = ids.filter((id) => SRC[id].k === 't').length;
console.log(`mapping — ${ids.length} controls · ${nd} document-sourced · ${nt} telemetry-sourced · 0 orphan`);

if (fail) { console.error(`\nframework-evidence-map-smoke: ${pass} passed, ${fail} FAILED`); process.exit(1); }
console.log(`framework-evidence-map-smoke OK — ${pass} checks pass (every control mapped to a real source; frontend registry in sync with backend).`);
