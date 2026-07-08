// Verifies each HPE policy PDF scores real CMMI against the backend's own
// document-review pipeline — using the ACTUAL extractText() (the crude
// printable-ASCII byte-scan the server uses for PDFs) + CONTROL_MAP + scoreCMMI.
// This proves the uploaded PDFs are readable and evidence their controls, not
// that a nicely-formatted .md would.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsJs = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'cyberrx-api', 'src', 'routes', 'documents.js'), 'utf8');

const cmMatch = docsJs.match(/const CONTROL_MAP = \{[\s\S]*?\n\};/);
const scMatch = docsJs.match(/function scoreCMMI\(matched, total\)[\s\S]*?\n\}/);
const exMatch = docsJs.match(/function extractText\(buffer, filename\)[\s\S]*?\n\}/);
if (!cmMatch || !scMatch || !exMatch) { console.error('could not extract CONTROL_MAP / scoreCMMI / extractText'); process.exit(1); }
// eslint-disable-next-line no-new-func
const { CONTROL_MAP, scoreCMMI, extractText } = new Function(cmMatch[0] + '\n' + scMatch[0] + '\n' + exMatch[0] + '\nreturn {CONTROL_MAP,scoreCMMI,extractText};')();

function analyze(text, docType) {
  const lower = String(text || '').toLowerCase();
  const mapping = CONTROL_MAP[docType];
  if (!mapping) return { cmmi: 1, matched: 0, total: 0 };
  let totalAttrs = 0, totalMatched = 0;
  mapping.controls.forEach((c) => c.attrs.forEach((a) => { totalAttrs++; if (new RegExp(a.pat, 'i').test(lower)) totalMatched++; }));
  return { cmmi: scoreCMMI(totalMatched, totalAttrs), matched: totalMatched, total: totalAttrs, framework: mapping.framework };
}

const FILES = [
  ['d1', 'd1_information_security_policy.pdf'], ['d2', 'd2_risk_assessment.pdf'],
  ['d3', 'd3_third_party_supply_chain_policy.pdf'], ['d4', 'd4_access_control_policy.pdf'],
  ['d5', 'd5_identity_authentication_policy.pdf'], ['d6', 'd6_incident_response_plan.pdf'],
  ['d7', 'd7_business_continuity_dr_plan.pdf'], ['d8', 'd8_change_management_policy.pdf'],
  ['d9', 'd9_configuration_management_policy.pdf'], ['d10', 'd10_data_protection_policy.pdf'],
  ['d17', 'd17_ai_governance_nist_rmf.pdf'], ['d18', 'd18_ai_governance_iso42001.pdf'],
  ['d19', 'd19_ai_acceptable_use_policy.pdf'],
];
const LBL = { 0: 'None', 1: 'Initial', 2: 'Managed', 3: 'Defined', 4: 'Quant.Managed', 5: 'Optimizing' };
let low = 0;
FILES.forEach(([dt, f]) => {
  const buf = fs.readFileSync(path.join(__dirname, f));
  const text = extractText(buf, f);        // the real server-side PDF extraction
  const r = analyze(text, dt);
  const ok = r.cmmi >= 3;
  if (!ok) low++;
  console.log(`${ok ? 'OK ' : 'XX '} ${dt.padEnd(4)} ${f.padEnd(40)} CMMI ${r.cmmi} (${LBL[r.cmmi]})  ${r.matched}/${r.total} attrs · ${r.framework}`);
});
console.log(low ? `\n${low} PDF(s) below CMMI 3 — extraction or wording issue.` : '\nALL POLICY PDFs extract cleanly and score CMMI 3+ (Defined or better) via the real server PDF path.');
process.exit(low ? 1 : 0);
