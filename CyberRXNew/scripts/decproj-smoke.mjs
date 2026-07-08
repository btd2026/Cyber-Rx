// Smoke test for the CISO "Decisions & projections" tab (07): the tab is wired,
// the renderer + projection math + reminder-email piping exist, and the render
// loop calls it. Static-source assertions (the projection math itself runs on
// cockpit globals and is exercised in-browser).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, '..', 'public');
const read = (f) => fs.readFileSync(path.join(pub, f), 'utf8');
const seats = read('cockpit-seats.js'), ciso = read('ciso5.js'), cockpit = read('cockpit.html');

let fail = 0;
const ok = (label, cond) => { if (cond) pass(); else { fail++; console.error('FAIL ' + label); } };
let passed = 0; function pass() { passed++; }

// Tab present in the CISO seat.
ok('CISO tab 07 exists', /sec\('07','Decisions &amp; projections','','<div id="c5-decproj">/.test(seats));
// Renderer + projection helpers exist.
ok('c5DecProj renderer', /function c5DecProj\(\)/.test(ciso));
ok('c5ProjectCap projection', /function c5ProjectCap\(capKey,targetPct\)/.test(ciso));
ok('c5Levers recommendation levers', /function c5Levers\(\)/.test(ciso));
ok('c5ControlLevers reverse tool', /function c5ControlLevers\(id\)/.test(ciso));
ok('projection uses controlCmmi', /controlCmmi\(id,cov\)/.test(ciso));
ok('projection uses fwDeployedIds', /fwDeployedIds\(\)/.test(ciso));
ok('projection uses CAP_FRAMEWORK', /CAP_FRAMEWORK\[capKey\]/.test(ciso));
// Reminder email piping.
ok('reminder modal opener', /function c5RemindOpen\(seat\)/.test(ciso));
ok('draft calls /api/notify/draft', /\/api\/notify\/draft/.test(ciso));
ok('send calls /api/notify/send', /\/api\/notify\/send/.test(ciso));
ok('mailto fallback present', /mailto:/.test(ciso));
ok('remind buttons wired', /data-remind=/.test(ciso));
ok('ciso own-decision buttons wired', /data-cisodec=/.test(ciso));
// Render loop calls the renderer (both the main render and loadLive path).
ok('render loop calls c5DecProj', (cockpit.match(/typeof c5DecProj==='function'\)c5DecProj\(\)/g) || []).length >= 2);
// Styling present.
ok('decproj styles present', /\.c5dp-wrap\{/.test(cockpit) && /\.c5remind-scrim\{/.test(cockpit));

if (fail) { console.error(`\ndecproj-smoke: ${passed} passed, ${fail} FAILED`); process.exit(1); }
console.log(`decproj-smoke OK — ${passed} checks pass (tab wired · projection on live control model · reminder-email piping · render loop).`);
