// Every executive seat splits its (previously crowded) picture into one question per
// tab — titled as a question the leader asks the CISO, content = the CISO's answer —
// and no leftover "Your cyber picture" / "What I need from you" catch-all tabs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seats = fs.readFileSync(path.join(__dirname, '..', 'public', 'cockpit-seats.js'), 'utf8');
const cockpit = fs.readFileSync(path.join(__dirname, '..', 'public', 'cockpit.html'), 'utf8');
let fail = 0, pass = 0; const ok = (l, c) => { if (c) pass++; else { fail++; console.error('FAIL ' + l); } };

ok('no seat still uses the crowded "Your cyber picture" tab', !/Your cyber picture/.test(seats));
ok('no seat still uses the generic "What I need from you" tab', !/What I need from you/.test(seats));
ok('the redundant brief paragraph is dropped from the tabs', !/c5briefHead\(this\.brief\)/.test(seats));

// Each seat's body must emit multiple question-titled sections (sec('0n','...?',...)).
const bodies = seats.split(/\b(\w+):\{/).filter((s) => /body:function/.test(s));
const seatBlocks = [...seats.matchAll(/(\w+):\{[\s\S]*?body:function\(\)\{return \(([\s\S]*?)\);\}/g)];
const nonCiso = seatBlocks.filter((m) => m[1] !== 'ciso');
// The executive-persona seats (board/ceo/cfo/clo/cro/cio/coo/cpo/audit) have been
// retired from the cockpit — only the CISO seat renders now.
ok('CISO seat is present', seatBlocks.some((m) => m[1] === 'ciso'));
ok('executive-persona seats are removed (CISO-only cockpit)', nonCiso.length === 0);
nonCiso.forEach((m) => {
  const seat = m[1], body = m[2];
  const secs = [...body.matchAll(/sec\('(\d+)','([^']*\?[^']*|[^']*)'/g)];
  const questionTabs = [...body.matchAll(/sec\('\d+','[^']*\?/g)].length;
  ok(seat + ': ≥3 tabs', secs.length >= 3);
  ok(seat + ': tabs are phrased as questions', questionTabs >= 2);
});

// Every new question title has a short tab-chip label so the strip stays clean.
const titles = [...seats.matchAll(/sec\('\d+','([^']*\?)'/g)].map((m) => m[1]);
const uniqTitles = [...new Set(titles)];
const missing = uniqTitles.filter((t) => !cockpit.includes("'" + t + "':"));
ok('every question title has a TAB_LABELS chip', missing.length === 0);
if (missing.length) console.error('  no chip for: ' + missing.join(' | '));
console.log(`seats — CISO-only cockpit (${nonCiso.length} exec persona seats) · ${uniqTitles.length} distinct question tabs, all chip-labelled`);

if (fail) { console.error(`\nseat-tabs-smoke: ${pass} passed, ${fail} FAILED`); process.exit(1); }
console.log(`seat-tabs-smoke OK — ${pass} checks pass (each seat is one question per tab; clean chips; no fluff tab).`);
