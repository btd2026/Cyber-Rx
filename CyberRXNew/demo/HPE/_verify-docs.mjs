// Verifies each HPE policy doc scores real CMMI maturity against the backend's own
// document-review CONTROL_MAP (the keyword/attr engine behind /api/documents/analyze),
// so every uploaded policy evidences controls instead of falling back to "Initial".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsJs = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'cyberrx-api', 'src', 'routes', 'documents.js'), 'utf8');

// Extract the CONTROL_MAP object literal and scoreCMMI verbatim from the backend.
const cmMatch = docsJs.match(/const CONTROL_MAP = \{[\s\S]*?\n\};/);
const scMatch = docsJs.match(/function scoreCMMI\(matched, total\)\{?[\s\S]*?\n\}/) || docsJs.match(/function scoreCMMI[\s\S]*?\n\}/);
if (!cmMatch || !scMatch) { console.error('could not extract CONTROL_MAP / scoreCMMI'); process.exit(1); }
// eslint-disable-next-line no-new-func
const { CONTROL_MAP, scoreCMMI } = new Function(cmMatch[0] + '\n' + scMatch[0] + '\nreturn {CONTROL_MAP,scoreCMMI};')();

// Re-implement analyzeDeep's scoring (matched attrs / total attrs -> CMMI), same as backend.
function analyze(text, docType) {
  const lower = text.toLowerCase();
  const mapping = CONTROL_MAP[docType];
  if (!mapping) return { cmmi: 1, matched: 0, total: 0, controls: 0 };
  let totalAttrs = 0, totalMatched = 0;
  mapping.controls.forEach((c) => {
    c.attrs.forEach((a) => { totalAttrs++; if (new RegExp(a.pat, 'i').test(lower)) totalMatched++; });
  });
  return { cmmi: scoreCMMI(totalMatched, totalAttrs), matched: totalMatched, total: totalAttrs, controls: mapping.controls.length, framework: mapping.framework };
}

const FILES = [
  ['d1', 'd1_information_security_policy.md'], ['d2', 'd2_risk_assessment.md'],
  ['d3', 'd3_third_party_supply_chain_policy.md'], ['d4', 'd4_access_control_policy.md'],
  ['d5', 'd5_identity_authentication_policy.md'], ['d6', 'd6_incident_response_plan.md'],
  ['d7', 'd7_business_continuity_dr_plan.md'], ['d8', 'd8_change_management_policy.md'],
  ['d9', 'd9_configuration_management_policy.md'], ['d10', 'd10_data_protection_policy.md'],
  ['d17', 'd17_ai_governance_nist_rmf.md'], ['d18', 'd18_ai_governance_iso42001.md'],
  ['d19', 'd19_ai_acceptable_use_policy.md'],
];
const LBL = { 0: 'None', 1: 'Initial', 2: 'Managed', 3: 'Defined', 4: 'Quant.Managed', 5: 'Optimizing' };
let low = 0;
FILES.forEach(([dt, f]) => {
  const text = fs.readFileSync(path.join(__dirname, f), 'utf8');
  const r = analyze(text, dt);
  const ok = r.cmmi >= 3;
  if (!ok) low++;
  console.log(`${ok ? 'OK ' : 'XX '} ${dt.padEnd(4)} ${f.padEnd(38)} CMMI ${r.cmmi} (${LBL[r.cmmi]})  ${r.matched}/${r.total} attrs · ${r.controls} controls · ${r.framework}`);
});
console.log(low ? `\n${low} doc(s) below CMMI 3 (Defined) — strengthen wording.` : '\nALL POLICY DOCS score CMMI 3+ (Defined or better) — every upload evidences real control maturity.');
process.exit(low ? 1 : 0);
