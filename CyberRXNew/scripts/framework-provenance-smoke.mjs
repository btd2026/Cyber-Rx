// Guards three things the CISO Program-Health Classic View must do:
//  1. Go-live opens CISO › Program health › Classic View.
//  2. Every control's finding names its evidence source (which tool / which document).
//  3. A document-evidenced finding has a → arrow that jumps to that control's entry
//     in the document-review modal (anchored + wired).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, '..', 'public');
const ciso = fs.readFileSync(path.join(pub, 'ciso5.js'), 'utf8');
const cockpit = fs.readFileSync(path.join(pub, 'cockpit.html'), 'utf8');

let fail = 0, pass = 0;
const ok = (l, c) => { if (c) pass++; else { fail++; console.error('FAIL ' + l); } };

// 1. Go-live default.
ok('go-live forces the CISO seat', /type===.cyberrx-golive[\s\S]{0,400}saveLastSeat\('ciso'\)/.test(cockpit));
ok('go-live opens tab 0 (Program health)', /type===.cyberrx-golive[\s\S]{0,400}saveLastTab\('ciso',0\)/.test(cockpit));
ok('go-live selects Classic View', /type===.cyberrx-golive[\s\S]{0,400}C5_PH_TAB='classic'/.test(cockpit));
ok('Classic View is the default Program-Health tab', /C5_PH_DEFAULT='classic'/.test(ciso));

// 2. Provenance block.
ok('c5fwSource helper exists', /function c5fwSource\(node\)/.test(ciso));
ok('finding detail renders the source block', /h\+=c5fwSource\(node\);/.test(ciso));
ok('system source names the connected tool + live/demo', /node\.src==='system'[\s\S]{0,320}capSource\(tool\)/.test(ciso) && /live telemetry/.test(ciso) && /demo telemetry/.test(ciso));
ok('document source names the document', /node\.src==='document'[\s\S]{0,320}node\.doc&&node\.doc\.doc/.test(ciso));
ok('none source is honest (no evidence yet)', /No evidence on file yet/.test(ciso));

// 3. Jump-to-document arrow.
ok('document finding carries a → jump arrow', /data-c5docjump="'\+c5esc\(node\.id\)/.test(ciso));
ok('doc-review rows are anchored by control id', /id="c5doc-'\+c5esc\(r\.id\)/.test(ciso));
ok('c5OpenDocsReviewAt scrolls + highlights the control', /function c5OpenDocsReviewAt\(cid\)/.test(ciso) && /getElementById\('c5doc-'\+cid\)/.test(ciso) && /c5doc-flash/.test(ciso));
ok('jump arrow is wired in Classic View', /\[data-c5docjump\]/.test(ciso) && /c5OpenDocsReviewAt\(b\.getAttribute\('data-c5docjump'\)\)/.test(ciso));

if (fail) { console.error(`\nframework-provenance-smoke: ${pass} passed, ${fail} FAILED`); process.exit(1); }
console.log(`framework-provenance-smoke OK — ${pass} checks pass (go-live → CISO Classic View; every control names its source; document findings jump to the review).`);
