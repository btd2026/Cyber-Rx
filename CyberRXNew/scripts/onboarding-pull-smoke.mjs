// Smoke test for the ERM (CRO) and CRM/compliance (growth) "Connect & pull" tables
// in onboarding.html. These give the last two self-reported sections a real source:
// principal-risk values pull from Archer / ServiceNow GRC; pipeline / review-cycle /
// certifications pull from Salesforce/HubSpot + Vanta/Drata. The pulled figures are
// representative until the live API syncs on go-live (same pattern as the CMDB pull).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'onboarding.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (label, cond) => { if (cond) pass++; else { fail++; console.error('FAIL ' + label); } };

// Extract the two literal tables and eval them in isolation.
function grab(name) {
  const m = html.match(new RegExp('var ' + name + '=\\{[\\s\\S]*?\\n  \\};'));
  if (!m) { fail++; console.error('FAIL — ' + name + ' not found'); return {}; }
  // eslint-disable-next-line no-new-func
  return new Function('return (' + m[0].replace('var ' + name + '=', '').replace(/;$/, '') + ')')();
}
const ERM = grab('ERM_PULL');
const GROWTH = grab('GROWTH_PULL');

const INDUSTRIES = ['health', 'tech', 'fin', 'retail', 'gov', 'mfg', 'energy'];

// 1) Every industry present in both tables.
INDUSTRIES.forEach((k) => {
  ok('ERM.' + k + ' present', !!ERM[k]);
  ok('GROWTH.' + k + ' present', !!GROWTH[k]);
});

// 2) ERM rows have all four principal-risk values, all positive numbers.
INDUSTRIES.forEach((k) => {
  const r = ERM[k] || {};
  ['credit', 'ops', 'tp', 'comp'].forEach((f) => ok('ERM.' + k + '.' + f + ' > 0', typeof r[f] === 'number' && r[f] > 0));
});

// 3) GROWTH rows have all signals, sane review-cycle (now <= before), non-empty certs.
INDUSTRIES.forEach((k) => {
  const g = GROWTH[k] || {};
  ['pipeline', 'before', 'now', 'deals', 'trust'].forEach((f) => ok('GROWTH.' + k + '.' + f + ' > 0', typeof g[f] === 'number' && g[f] > 0));
  ok('GROWTH.' + k + ' review improved (now<=before)', g.now <= g.before);
  ok('GROWTH.' + k + ' has certs', Array.isArray(g.certs) && g.certs.length > 0);
});

// 4) Wiring present: the pull handler and source-choice for both sections.
ok('erm connect button wired', /data-conn="erm"/.test(html));
ok('growth connect button wired', /data-conn="growth"/.test(html));
ok('erm source-choice present', /data-choice="erm"/.test(html));
ok('growth source-choice present', /data-choice="growth"/.test(html));
ok('handler fills ermCredit', /setNum\('ermCredit'/.test(html));
ok('handler fills growthPipeline', /setNum\('growthPipeline'/.test(html));
ok('handler checks certs from pull', /#growthCerts input\[type=checkbox\]/.test(html));

if (fail) { console.error(`\nonboarding-pull-smoke: ${pass} passed, ${fail} FAILED`); process.exit(1); }
console.log(`onboarding-pull-smoke OK — ${pass} checks pass (ERM + growth pull tables complete & wired).`);
