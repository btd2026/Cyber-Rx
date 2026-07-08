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
wired('inline inventory reuses loadAiInv', /loadAiInv\('aiGovInvFile','aiGovInvMsg'\)/.test(html));
wired('inline docs reuse obAnalyzeDocFrom', /obAnalyzeDocFrom\('aiGovDocFile','aiGovDocType','aiGovDocMsg'\)/.test(html));
wired('AI doc types cover NIST/ISO/AUP', /d11.*NIST AI RMF/s.test(html) && /d12.*ISO\/IEC 42001/s.test(html) && /d13.*Acceptable-Use/s.test(html));

if (fail) { console.error(`\nonboarding-aigov-smoke: ${pass} passed, ${fail} FAILED`); process.exit(1); }
console.log(`onboarding-aigov-smoke OK — ${pass} checks pass (derivation empty→null / inventory·docs·regions; inline uploaders wired to shared engines).`);
