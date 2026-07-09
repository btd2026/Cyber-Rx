// Verifies the ERM & security-as-growth sections accept a FILE UPLOAD (third
// source option) and that a CSV maps onto the same fields manual entry / the API
// pull populate. Runs the real parse helpers (parseDelim, moneyToM, rowLabelVal)
// pulled from onboarding.html against the HPE demo CSVs, and replays the exact
// label→field branch logic from the drop handlers.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, '..', 'public');
const html = fs.readFileSync(path.join(pub, 'onboarding.html'), 'utf8');
const demo = path.join(__dirname, '..', 'demo', 'HPE');

let fail = 0, pass = 0;
const ok = (l, c) => { if (c) pass++; else { fail++; console.error('FAIL ' + l); } };

// The UI must offer file upload as a third source on both sections.
ok('ERM section offers a file-upload option', /data-choice="erm" data-mode="file"/.test(html) && /id="dropErm"/.test(html));
ok('Growth section offers a file-upload option', /data-choice="growth" data-mode="file"/.test(html) && /id="dropGrowth"/.test(html));
ok('toggle keeps manual fields visible in file mode', /\(mode==='upload'\|\|mode==='file'\)/.test(html));

// Pull the real parse helpers.
const grab = (re, name) => { const m = html.match(re); if (!m) { console.error('MISSING ' + name); process.exit(1); } return m[0]; };
const parseDelim = grab(/function parseDelim\(text\)\{[\s\S]*?\n  \}/, 'parseDelim');
const moneyToM = grab(/function moneyToM\(s\)\{[\s\S]*?\n    return Math\.round\(n\*mult\*100\)\/100;\}/, 'moneyToM');
const rowLabelVal = grab(/function rowLabelVal\(p\)\{[\s\S]*?\}\);return out;\}/, 'rowLabelVal');
// eslint-disable-next-line no-new-func
const { parseDelim: pd, moneyToM: mm, rowLabelVal: rl } = new Function(parseDelim + '\n' + moneyToM + '\n' + rowLabelVal + '\nreturn {parseDelim,moneyToM,rowLabelVal};')();

// Replay the ERM drop handler's label→field mapping.
function loadErm(csv) {
  const out = {};
  rl(pd(csv)).forEach((r) => { const L = r.label, m = mm(r.val); if (m == null) return;
    if (/credit|market/.test(L)) out.ermCredit = m;
    else if (/oper/.test(L)) out.ermOps = m;
    else if (/third|vendor|tpr|supply/.test(L)) out.ermTP = m;
    else if (/compli|legal|regulat/.test(L)) out.ermComp = m; });
  return out;
}
// Replay the growth drop handler.
function loadGrowth(csv) {
  const out = { certs: [] };
  rl(pd(csv)).forEach((r) => { const L = r.label, val = r.val;
    if (/cert/.test(L)) { out.certs = String(val == null ? '' : val).split(/[;,|]/).map((x) => x.trim()).filter(Boolean); return; }
    if (/pipeline/.test(L)) { const m = mm(val); if (m != null) out.growthPipeline = m; return; }
    const num = parseFloat(String(val == null ? '' : val).replace(/[^0-9.\-]/g, '')); if (!isFinite(num)) return;
    if (/before|prior|\bwas\b/.test(L)) out.growthBefore = num;
    else if (/now|after|current/.test(L)) out.growthNow = num;
    else if (/deal/.test(L)) out.growthDeals = num;
    else if (/trust|review/.test(L)) out.growthTrust = num; });
  return out;
}

if (fs.existsSync(path.join(demo, '14_erm_portfolio.csv'))) {
  const e = loadErm(fs.readFileSync(path.join(demo, '14_erm_portfolio.csv'), 'utf8'));
  ok('ERM CSV → credit 210 / ops 140 / tp 54 / comp 30 ($M)', e.ermCredit === 210 && e.ermOps === 140 && e.ermTP === 54 && e.ermComp === 30);
  console.log('  ERM loaded:', JSON.stringify(e));
} else ok('demo ERM CSV present', false);

if (fs.existsSync(path.join(demo, '15_growth_signals.csv'))) {
  const g = loadGrowth(fs.readFileSync(path.join(demo, '15_growth_signals.csv'), 'utf8'));
  ok('Growth CSV → pipeline 48 / before 6 / now 2 / deals 11 / trust 34', g.growthPipeline === 48 && g.growthBefore === 6 && g.growthNow === 2 && g.growthDeals === 11 && g.growthTrust === 34);
  ok('Growth CSV → certifications parsed (SOC 2 + ISO 27001)', g.certs.length === 2 && /SOC 2/.test(g.certs[0]) && /ISO 27001/.test(g.certs[1]));
  console.log('  Growth loaded:', JSON.stringify(g));
} else ok('demo growth CSV present', false);

// Money parser edge cases.
ok('moneyToM: $3.1B → 3100', mm('$3.1B') === 3100);
ok('moneyToM: raw 54000000 → 54', mm('54000000') === 54);
ok('moneyToM: bare 210 → 210 ($M)', mm('210') === 210);

if (fail) { console.error(`\nonboarding-erm-growth-upload-smoke: ${pass} passed, ${fail} FAILED`); process.exit(1); }
console.log(`onboarding-erm-growth-upload-smoke OK — ${pass} checks pass (file upload wired on both sections; CSV maps to the same fields; demo CSVs load exactly).`);
