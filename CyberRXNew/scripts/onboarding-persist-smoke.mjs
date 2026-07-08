// Verifies (a) onboarding persists + restores the user's work so nothing is re-entered,
// and (b) the crown-jewel value tree drops the "illustrative" label once real data arrives.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, '..', 'public');
const onb = fs.readFileSync(path.join(pub, 'onboarding.html'), 'utf8');
const tree = fs.readFileSync(path.join(pub, 'crownjewel-tree.html'), 'utf8');

let fail = 0, pass = 0;
const ok = (l, c) => { if (c) pass++; else { fail++; console.error('FAIL ' + l); } };

// Persistence
ok('snapshot collector exists', /function obCollectState\(\)/.test(onb));
ok('save + restore functions exist', /function obSaveState\(\)/.test(onb) && /function obRestoreState\(\)/.test(onb));
ok('snapshots the big uploads (proc/app/risk/aiInv)', /proc:PROC,app:APP,risk:RISK/.test(onb) && /aiInv:/.test(onb));
ok('snapshots exec names + emails', /seatN:seatN,seatE:seatE/.test(onb));
ok('autosaves on change + periodic backstop', /addEventListener\('input',obSaveSoon\)/.test(onb) && /setInterval\(obSaveState/.test(onb));
ok('restores on load', /try\{obRestoreState\(\);\}catch/.test(onb));
ok('restore guarded so it does not re-save mid-restore', /OB_RESTORING/.test(onb));
ok('uses a dedicated storage key', /cyberrx_ob_state/.test(onb));

// Live label on the value tree
ok('tree subtitle has an id to update', /id="brandSub"/.test(tree));
ok('LIVEMODE flips on real data', /LIVEMODE=true;/.test(tree) && /crowntree-data/.test(tree));
ok('subtitle swaps illustrative → live', /LIVEMODE\?'live from your data':'illustrative'/.test(tree));

if (fail) { console.error(`\nonboarding-persist-smoke: ${pass} passed, ${fail} FAILED`); process.exit(1); }
console.log(`onboarding-persist-smoke OK — ${pass} checks pass (autosave+restore; value-tree label goes live on real data).`);
