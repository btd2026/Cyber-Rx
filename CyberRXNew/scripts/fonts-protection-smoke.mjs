// Guards: (1) Inter is self-hosted and set as the primary UI font on every page —
// no stray real-serif (Georgia/Cambria/Times) left in the UI; (2) the CISO Protection
// section is split into two question tabs; (3) the "well protected" drill ranks all
// business areas (top of the list = best protected), not just the ones that pass.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, '..', 'public');
const rd = (f) => fs.readFileSync(path.join(pub, f), 'utf8');
const cockpit = rd('cockpit.html'), onb = rd('onboarding.html'), tree = rd('crownjewel-tree.html'), ciso = rd('ciso5.js'), seats = rd('cockpit-seats.js');
let fail = 0, pass = 0; const ok = (l, c) => { if (c) pass++; else { fail++; console.error('FAIL ' + l); } };

// 1. Inter self-hosted + primary, on every page.
ok('Inter woff2 is committed', fs.existsSync(path.join(pub, 'fonts', 'inter-var.woff2')));
['cockpit.html', 'onboarding.html', 'crownjewel-tree.html'].forEach((f) => {
  const s = rd(f);
  ok(f + ': @font-face Inter (self-hosted woff2)', /@font-face\{font-family:'Inter'[\s\S]*inter-var\.woff2/.test(s));
  ok(f + ': Inter is the primary body font', /font-family:('Inter'|var\(--sans\))/.test(s) && /'Inter'/.test(s));
});
// No real serif left in the live UI stacks (Board-pack print may use a sans system stack; none should reference Georgia/Cambria as a UI font var).
ok('no real-serif font var in cockpit/onboarding', !/--serif:[^;]*(Georgia|Cambria|Times)/.test(cockpit) && !/--serif:[^;]*(Georgia|Cambria|Times)/.test(onb));
ok('crown-jewel tree has no Georgia serif left', !/Georgia/.test(tree));

// 2. Protection split into two question tabs.
ok('CISO seat splits Protection into two tabs', /Where are we protected\?[\s\S]*c5-exposure[\s\S]*Which controls buy down the most risk\?[\s\S]*c5-exposure2/.test(seats));
ok('c5Exposure renders into a second host (control value)', /getElementById\('c5-exposure2'\)/.test(ciso) && /Control value · which controls buy down/.test(ciso));
ok('Protection tab chips are labelled', /'Where are we protected\?':'Protection'/.test(cockpit) && /'Which controls buy down the most risk\?':'Control value'/.test(cockpit));

// 3. Ranked business-areas drill.
ok('C5PROT carries all areas ranked by score', /all:areas\.slice\(\)\.sort\(function\(a,b\)\{return b\.score-a\.score/.test(ciso));
ok('well drill ranks the areas (top N, #rank)', /Business areas ranked by protection/.test(ciso) && /'#'\+\(i\+1\)/.test(ciso) && /allA\.slice\(0,10\)/.test(ciso));

if (fail) { console.error(`\nfonts-protection-smoke: ${pass} passed, ${fail} FAILED`); process.exit(1); }
console.log(`fonts-protection-smoke OK — ${pass} checks pass (Inter everywhere; Protection split; ranked business areas).`);
