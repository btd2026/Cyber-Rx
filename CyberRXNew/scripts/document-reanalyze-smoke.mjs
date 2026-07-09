// Guards the "I uploaded everything but controls still show Non-existent" fix:
// documents are re-scorable against the CURRENT engine without re-upload.
//  - onboarding captures the server-extracted text at upload (cyberrx_doc_text);
//  - the backend exposes /analyze-text (stateless re-score) and /coverage (self-check);
//  - Recompute re-scores every stored document, then re-renders;
//  - the Frameworks view shows the evidence breakdown + a Re-score button.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, '..', 'public');
const onb = fs.readFileSync(path.join(pub, 'onboarding.html'), 'utf8');
const cockpit = fs.readFileSync(path.join(pub, 'cockpit.html'), 'utf8');
const ciso = fs.readFileSync(path.join(pub, 'ciso5.js'), 'utf8');
const docs = fs.readFileSync(path.join(__dirname, '..', '..', 'cyberrx-api', 'src', 'routes', 'documents.js'), 'utf8');

let fail = 0, pass = 0;
const ok = (l, c) => { if (c) pass++; else { fail++; console.error('FAIL ' + l); } };

// Backend
ok('/analyze returns the extracted text for later re-scoring', /result\.text = String\(text \|\| ''\)\.slice\(0, TEXT_STORE_CAP\)/.test(docs));
ok('backend exposes POST /analyze-text (stateless re-score)', /router\.post\('\/analyze-text'/.test(docs) && /analyzeDeep\(text, docType\)/.test(docs));
ok('backend exposes GET /coverage (deployment self-check)', /router\.get\('\/coverage'/.test(docs) && /csfControls/.test(docs));

// Onboarding capture
ok('onboarding stores the extracted text at upload', /localStorage\.setItem\('cyberrx_doc_text'/.test(onb) && /tx\[dt\]=\{text:res\.text/.test(onb));

// Cockpit recompute re-scores documents
ok('cockpit has reanalyzeStoredDocs', /function reanalyzeStoredDocs\(done\)/.test(cockpit));
ok('reanalyze posts stored text to /analyze-text', /\/api\/documents\/analyze-text/.test(cockpit) && /cyberrx_doc_text/.test(cockpit));
ok('reanalyze writes fresh per-control scores', /analyze-text[\s\S]{0,400}saveDocScore\(c\.id/.test(cockpit));
ok('Recompute runs reanalyze before re-render', /rb\.addEventListener[\s\S]{0,200}reanalyzeStoredDocs\(function/.test(cockpit));

// Frameworks view: breakdown + re-score button
ok('frameworks shows the evidence breakdown (doc/tool/none)', /c5fwSrcCounts\(T\)/.test(ciso) && /by document review/.test(ciso) && /not yet evidenced/.test(ciso));
ok('frameworks has a Re-score documents button wired', /id="c5reanalyzeBtn"/.test(ciso) && /window\.reanalyzeStoredDocs\(function/.test(ciso));

// The engine can actually score the full catalog (sanity — same as evidence smoke).
const cm = docs.match(/const CONTROL_MAP = \{[\s\S]*?\n\};/)[0];
const cov = docs.match(/const CSF_DOC_COVERAGE = \{[\s\S]*?\n\};/)[0];
const mg = docs.match(/for \(const dt of Object\.keys\(CSF_DOC_COVERAGE\)\) \{[\s\S]*?\n\}/)[0];
// eslint-disable-next-line no-new-func
const CONTROL_MAP = new Function(cm + '\n' + cov + '\n' + mg + '\nreturn CONTROL_MAP;')();
const csf = new Set();
for (const dt of Object.values(CONTROL_MAP)) dt.controls.forEach((c) => { if (/^[A-Z]{2}\.[A-Z]{2}-/.test(c.id)) csf.add(c.id); });
ok('backend map scores ~103 CSF controls', csf.size >= 100);
console.log(`  backend CSF coverage: ${csf.size} sub-categories`);

if (fail) { console.error(`\ndocument-reanalyze-smoke: ${pass} passed, ${fail} FAILED`); process.exit(1); }
console.log(`document-reanalyze-smoke OK — ${pass} checks pass (text captured at upload; /analyze-text + /coverage; Recompute re-scores stored docs; breakdown + re-score button).`);
