// Smoke test for the DERIVED AI risk & governance model in onboarding.html.
//
// The AI risk & governance section is fully derived — never self-reported:
//   • systems / decisioning  ← the uploaded AI inventory (CMDB / CSV)
//   • framework / policy      ← the AI-governance documents the client uploads
//   • EU AI Act scope         ← operating regions + inventory
// Anything without a source stays null so the cockpit renders an honest empty
// state (no estimates). This test pulls aiGovModel() verbatim from the HTML and
// exercises the derivation across scenarios.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'onboarding.html'), 'utf8');

const m = html.match(/function aiGovModel\(\)\{[\s\S]*?\n {2}\}/);
if (!m) { console.error('FAIL — aiGovModel() not found in onboarding.html'); process.exit(1); }
const src = m[0];

function run(AI_INV, REGIONS, docs, boardApproved) {
  const window = { __aiPolicyBoardApproved: boardApproved };
  const obDocDocs = () => docs;
  // eslint-disable-next-line no-new-func
  const fn = new Function('AI_INV', 'REGIONS', 'obDocDocs', 'window', src + '; return aiGovModel();');
  return fn(AI_INV, REGIONS, obDocDocs, window);
}

const J = (o) => JSON.stringify(o);
let pass = 0, fail = 0;
const eq = (label, got, want) => {
  if (J(got) === J(want)) pass++;
  else { fail++; console.error(`FAIL ${label}\n  got  ${J(got)}\n  want ${J(want)}`); }
};

// 1) Nothing provided -> honest empty state (every field null).
const e = run({}, [], [], false);
eq('empty.systems', e.systems, null);
eq('empty.decisioning', e.decisioning, null);
eq('empty.framework', e.framework, null);
eq('empty.policy', e.policy, null);
eq('empty.euAiAct', e.euAiAct, null);
eq('empty.inventory', e.inventory, null);

// 2) Inventory loaded (12 AI systems), no customer-facing column, US only.
const a = run({ _loaded: true, ai_system: 12, customerFacingCol: false, customerFacing: false }, ['US'], [], false);
eq('loaded.systems', a.systems, 12);
eq('loaded.inventory', a.inventory, 'Yes — inventoried');
eq('loaded.decisioning-null-when-no-column', a.decisioning, null);
eq('loaded.euAiAct-not-in-scope-US', a.euAiAct, 'Not in scope');

// 3) Customer-facing column present + EU region -> high-risk.
const b = run({ _loaded: true, ai_system: 5, customerFacingCol: true, customerFacing: true }, ['EU'], [], false);
eq('cf.decisioning-yes', b.decisioning, 'Yes');
eq('cf.euAiAct-high-risk', b.euAiAct, 'Yes — high-risk system');

// 4) EU region but no customer-facing AI -> limited-risk.
const c = run({ _loaded: true, ai_system: 5, customerFacingCol: true, customerFacing: false }, ['EU'], [], false);
eq('eu.decisioning-no', c.decisioning, 'No');
eq('eu.euAiAct-limited', c.euAiAct, 'Yes — limited-risk');

// 5) Framework derived from uploaded governance documents.
eq('fw.nist', run({}, [], [{ type: 'AI Governance — NIST AI RMF' }], false).framework, 'NIST AI RMF');
eq('fw.iso', run({}, [], [{ type: 'AI Governance — ISO/IEC 42001' }], false).framework, 'ISO/IEC 42001');
eq('fw.both', run({}, [], [{ type: 'AI Governance — NIST AI RMF' }, { type: 'AI Governance — ISO/IEC 42001' }], false).framework, 'Both');

// 6) Acceptable-use policy from an uploaded doc; board-approval is the sole attestation.
eq('policy.drafted', run({}, [], [{ type: 'AI Acceptable-Use Policy', name: 'aup.pdf' }], false).policy, 'Drafted');
eq('policy.board-approved', run({}, [], [{ type: 'AI Acceptable-Use Policy', name: 'aup.pdf' }], true).policy, 'Board-approved');
eq('policy.null-no-doc', run({}, [], [], false).policy, null);

// 7) Inline uploaders present in the AI section, wired to the shared engines, so the
//    user acts right where the derived tiles are (not sent elsewhere).
const wired = (label, cond) => { if (cond) pass++; else { fail++; console.error('FAIL ' + label); } };
wired('inline AI inventory file input', html.includes('id="aiGovInvFile"'));
wired('inline AI inventory load button', html.includes('id="aiGovInvLoad"'));
wired('inline AI doc-type select', html.includes('id="aiGovDocType"'));
wired('inline AI doc file input', html.includes('id="aiGovDocFile"'));
wired('inline AI doc analyze button', html.includes('id="aiGovDocAnalyze"'));
wired('loadAiInv is parameterized', /function loadAiInv\(fileId,msgId\)/.test(html));
wired('shared doc engine obAnalyzeDocFrom', /function obAnalyzeDocFrom\(/.test(html));
wired('inline inventory loader wired', /runAiInvLoad\('aiGovInvSource','aiGovInvFile','aiGovInvCred','aiGovInvMsg'\)/.test(html));
wired('inline docs reuse obAnalyzeDocFrom', /obAnalyzeDocFrom\('aiGovDocFile','aiGovDocType','aiGovDocMsg'\)/.test(html));
// CMDB/connector sources ask for an API token (not just a file) on both loaders.
wired('inline loader has token field', html.includes('id="aiGovInvCred"'));
wired('supply loader has token field', html.includes('id="aiInvCred"'));
wired('connector detection helper', /function aiInvIsConnector\(/.test(html));
wired('source toggle wired for both loaders', /wireAiInvSource\('aiGovInvSource'/.test(html) && /wireAiInvSource\('aiInvSource'/.test(html));
wired('representative pull by industry', /var AIINV_PULL=\{/.test(html) && /function pullAiInv\(/.test(html));
wired('AI doc types cover NIST/ISO/AUP', /d17.*NIST AI RMF/s.test(html) && /d18.*ISO\/IEC 42001/s.test(html) && /d19.*Acceptable-Use/s.test(html));

// 8) Cross-file: the AI doc-type keys used in onboarding must exist in the backend
//    document-review CONTROL_MAP (and legacy keywords) so uploads are reviewed against
//    the AI frameworks — not silently scored against a colliding control set.
const apiDir = path.join(__dirname, '..', '..', 'cyberrx-api', 'src', 'routes');
let backendChecked = false;
try {
  const docsSrc = fs.readFileSync(path.join(apiDir, 'documents.js'), 'utf8');
  const kwSrc = fs.readFileSync(path.join(apiDir, 'documents-legacy-keywords.js'), 'utf8');
  backendChecked = true;
  // Onboarding AI doc-type keys (from OB_DOC_TYPES entries labelled "AI ...").
  const aiKeys = [...html.matchAll(/\{k:'(d\d+)',l:'AI [^']*'\}/g)].map((m) => m[1]);
  wired('onboarding declares 3 AI doc types', aiKeys.length === 3);
  aiKeys.forEach((k) => {
    wired('backend CONTROL_MAP has ' + k, new RegExp('\\b' + k + ':\\s*\\{').test(docsSrc));
    wired('backend legacy-keywords has ' + k, new RegExp('\\b' + k + ':\\s*\\[').test(kwSrc));
  });
  // The AI keys must NOT collide with the pre-existing crypto/privacy/soc2 mappings.
  ['d11', 'd12', 'd13'].forEach((k) => wired('AI keys avoid collision with ' + k, aiKeys.indexOf(k) < 0));
  // Backend AI mappings should reference the AI frameworks.
  wired('backend maps NIST AI RMF', /NIST AI RMF/.test(docsSrc));
  wired('backend maps ISO/IEC 42001', /ISO\/IEC 42001/.test(docsSrc));
  wired('backend maps AI Acceptable-Use Policy', /AI Acceptable-Use Policy/.test(docsSrc));
} catch (e) {
  // Backend not present in this checkout — skip cross-file checks rather than fail.
  console.warn('note: backend document routes not found, skipping cross-file checks (' + e.code + ')');
}

// Each AI document is kept + shown separately (uploading one must not hide the others).
wired('AI section has a persistent per-document list', /id="aiGovDocList"/.test(html) && /function renderAiGovDocList\(\)/.test(html));
wired('AI list derives its types from OB_DOC_TYPES (single source of truth)', /OB_DOC_TYPES.*\.filter\(function\(d\)\{return \/\^AI \/\.test\(d\.l\)/.test(html));
wired('AI list refreshes after each analyze', /renderAiGovDocList\(\);if\(typeof computeAiGov/.test(html));
wired('AI list renders on load (after its deps are defined)', /obRenderDocList\(\);renderAiGovDocList\(\);updateDocBadge/.test(html));

if (fail) { console.error(`\nonboarding-aigov-smoke: ${pass} passed, ${fail} FAILED`); process.exit(1); }
console.log(`onboarding-aigov-smoke OK — ${pass} checks pass (derivation; inline uploaders; ${backendChecked ? 'AI doc types wired to backend AI-control review' : 'backend not checked'}).`);
