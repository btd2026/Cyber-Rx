// Guards that the "business capabilities with highest exposure" tile shows BUSINESS
// capabilities: derived from the business functions (value chain) + live control
// posture by default, and only overridden by an uploaded capability map when it's
// genuinely business-oriented (a security-domain map is rejected).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ciso = fs.readFileSync(path.join(__dirname, '..', 'public', 'ciso5.js'), 'utf8');
let fail = 0, pass = 0; const ok = (l, c) => { if (c) pass++; else { fail++; console.error('FAIL ' + l); } };

ok('has a security-domain detector', /function c5CapIsSecurity\(name\)/.test(ciso) && /cloud security posture/.test(ciso));
ok('derives business capabilities from value-chain functions', /function c5BizCapAreas\(\)/.test(ciso) && /LIVE\.value_chain/.test(ciso) && /\.functions/.test(ciso));
ok('derived coverage comes from live control posture (controlCmmi)', /controlCmmi\(id,cov\)\.score/.test(ciso));
ok('c5CapSource derives by default, overrides only for a business map', /function c5CapSource\(\)/.test(ciso) && /!c5CapIsSecurity\(c\.name\)/.test(ciso) && /return derived\|\|raw/.test(ciso));
ok('exposure tile uses c5CapSource', /var caps=\(typeof c5CapSource==='function'\)\?c5CapSource\(\)/.test(ciso));
ok('capability drill uses c5CapSource', /var caps2=\(typeof c5CapSource==='function'\)\?c5CapSource\(\)/.test(ciso));
// The actual open risks are carried + named (so "N open risks" is legible to the CISO).
ok('derivation carries the actual register risks (open_risk = risk count)', /open_risk:risks\.length,risks:risks/.test(ciso));
ok('drill names each area’s open risks with severity + exposure', /c\.risks\.slice\(0,5\)\.map/.test(ciso) && /c5esc\(r\.title\)/.test(ciso) && /usd\(r\.exposure\)/.test(ciso));
ok('to-strengthen rows name the top open risks', /Open risks: '\+a\.risks\.slice\(0,3\)/.test(ciso));

// The detector must catch the demo's old security-domain names and pass business ones.
const det = new Function(ciso.match(/function c5CapIsSecurity\(name\)\{[\s\S]*?\n\}/)[0] + '\nreturn c5CapIsSecurity;')();
['Cloud Security Posture (GreenLake)', 'Identity & Access Management', 'Vulnerability & Patch Management', 'Endpoint & Threat Detection', 'Data Protection & Encryption', 'Third-Party / Supply-Chain Risk'].forEach((n) => ok('rejects security domain: ' + n, det(n) === true));
['Server order-to-cash', 'Cloud service delivery (GreenLake)', 'Global supply chain & manufacturing', 'Financial services & leasing', 'Storage & data services'].forEach((n) => ok('accepts business capability: ' + n, det(n) === false));

if (fail) { console.error(`\nbiz-capability-source-smoke: ${pass} passed, ${fail} FAILED`); process.exit(1); }
console.log(`biz-capability-source-smoke OK — ${pass} checks pass (business capabilities derived from functions; security-domain maps rejected).`);
