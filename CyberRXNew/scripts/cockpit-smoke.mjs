// Runtime smoke test for the cockpit's vanilla JS. Stubs a minimal DOM, loads
// cockpit-seats.js + the two inline <script> blocks from cockpit.html, then
// renders every seat with a realistic live payload and asserts no throws.
import fs from 'node:fs';
import vm from 'node:vm';

const ROOT = new URL('../public', import.meta.url).pathname;
const seats = fs.readFileSync(ROOT + '/cockpit-seats.js', 'utf8');
const html = fs.readFileSync(ROOT + '/cockpit.html', 'utf8');
const inline = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);

function makeEl() {
  const el = {
    innerHTML: '', textContent: '', value: '', className: '', id: '', disabled: false, checked: false,
    style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    addEventListener() {}, removeEventListener() {},
    appendChild() {}, removeChild() {}, remove() {}, insertBefore() {},
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    closest() { return makeEl(); },
    getBoundingClientRect() { return { left: 0, top: 0, right: 100, bottom: 50, width: 100, height: 50 }; },
    focus() {}, blur() {}, click() {}, scrollTo() {}, showPicker() {},
    getContext() { return null; }, cloneNode() { return makeEl(); },
    set onclick(v) {}, get onclick() { return null; },
  };
  return el;
}
const doc = {
  getElementById() { return makeEl(); },
  createElement() { return makeEl(); },
  querySelector() { return makeEl(); },
  querySelectorAll() { return []; },
  addEventListener() {}, removeEventListener() {},
  body: makeEl(), documentElement: makeEl(),
};
const store = {};
const localStorage = {
  getItem(k) { return k in store ? store[k] : null; },
  setItem(k, v) { store[k] = String(v); },
  removeItem(k) { delete store[k]; },
  key(i) { return Object.keys(store)[i] || null; },
  get length() { return Object.keys(store).length; },
};
function thenable() { const t = { then() { return t; }, catch() { return t; } }; return t; }
const sandbox = {
  console, JSON, Math, Date, Number, String, Boolean, Array, Object, RegExp, parseInt, parseFloat,
  isFinite, isNaN, encodeURIComponent, decodeURIComponent, setTimeout: () => 0, clearTimeout() {},
  setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0,
  performance: { now: () => 0 },
  document: doc, localStorage,
  CSS: { escape: (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&') },
  fetch: () => thenable(),
  SpeechSynthesisUtterance: function () {},
  AudioContext: function () { return { createOscillator: () => ({ connect() {}, start() {}, stop() {}, frequency: {} }), createGain: () => ({ connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }), destination: {}, currentTime: 0, state: 'running', resume() {} }; },
  window: null,
};
sandbox.window = { parent: { postMessage() {} }, addEventListener() {}, speechSynthesis: { cancel() {}, speak() {} }, location: { href: '' }, localStorage, scrollTo() {}, scrollBy() {}, AudioContext: sandbox.AudioContext, webkitAudioContext: sandbox.AudioContext, CYBERRX_API: '', CYBERRX_ORG_ID: 'org_test' };
sandbox.globalThis = sandbox;
const ctx = vm.createContext(sandbox);

const problems = [];
function run(label, code) { try { vm.runInContext(code, ctx, { filename: label }); } catch (e) { problems.push(`[load ${label}] ${e.message}`); } }

run('cockpit-seats.js', seats);
inline.forEach((code, i) => run(`inline#${i + 1}`, code));

// Realistic live payload exercising every branch.
const LIVE = {
  economics: { ale: 68e6, tail: 180e6, budget: 9e6,
    ratios: { pct_of_revenue: 0.008, pct_of_enterprise_value: 0.006, days_of_operating_income: 18 },
    appetite: { appetite: 120e6, within: true, tail_within: false },
    materiality: { value: 53e6, basis: '5% of net income' },
    insurance: { limit: 150e6, gap: 30e6, premium: 4.2e6, transfer_efficiency: 0.83, renewal: '2026-10-01' } },
  earnings: { expected_pct_of_earnings: 0.064, worst_case_pct_of_earnings: 0.17, eps_impact_worst: 0.36, eps_impact_expected: 0.14, revenue_at_risk_per_day: 55e6 },
  legal: { obligations: [{ flag: '🇺🇸', jurisdiction: 'United States', obligation: 'SEC 8-K', clock: '4 business days', clock_hours: 96, penalty: 'Disclosure' }], binding: { jurisdiction: 'United States', obligation: 'SEC 8-K', clock: '4 business days', clock_hours: 96, penalty: 'Disclosure' }, liability: { records: 2.4e6, cost_per_record: 165, class_action_exposure: 396e6, regulatory_ceiling: 'Up to 4% revenue' } },
  resilience: { has_data: true, top_downtime_per_hr: 2.3e6, worst_recovery_hours: 74, top_vendor_blast: { vendor: 'Cloud A', systems: ['Payments', 'Portal', 'Settlement'], per_hr: 3.8e6 }, tech_debt: { exposure: 12e6 }, systems: [{ name: 'Payments', per_hr: 2.3e6, recovery_hours: 74, crown_jewel: true, exposure_usd: 34e6 }] },
  governance: { committee: 'Audit Committee', cadence: 'Quarterly', boardExpertise: 'Yes', cisoReportsTo: 'CEO', ermIntegrated: 'Yes', ir: { tested: 'Yes — tabletop within 12 months', lastTabletop: '2026-03-01', retainer: 'Yes', ransomwarePolicy: 'Board-approved policy' } },
  stress: { target: 'ClaimsDB', scenario: 'Ransomware', worst_case_usd: 180e6, expected_usd: 34e6, recovery_hours: 74, binding_clock: '4 business days', binding_jurisdiction: 'United States', top_vendor: { vendor: 'Cloud A', systems: ['a', 'b'] } },
  portfolio: { has_data: true, cyber: 68e6, creditMarket: 210e6, operational: 140e6, thirdParty: 54e6, compliance: 30e6 },
  aiRisk: { governance: { systems: 3, decisioning: 'Yes', framework: 'NIST AI RMF', policy: 'Board-approved', euAiAct: 'Yes — high-risk system', inventory: 'Yes — inventoried' }, internet_facing_assets: 12, crown_jewels_internet_facing: 2, total_assets: 40, exposure_internet_facing: 20e6, window_base_days: 30, window_ai_days: 5 },
  process_exposure: [{ name: 'Claims', exposure_usd: 34e6, criticality: 'Critical', crown_jewel: true }, { name: 'Policy', exposure_usd: 18e6, criticality: 'High', crown_jewel: false }],
  crown_jewels: [{ name: 'ClaimsDB', tier: 'tier1', score: 83, rationale: 'ClaimsDB: holds PHI; SPOF; internet-facing.' }, { name: 'MemberWeb', tier: 'tier2', score: 76, rationale: 'MemberWeb: PII at scale.' }],
  material_exposure_items: [{ risk: 'Ransomware', asset_id: 'A1', exposure_usd: 34e6 }],
  trend: [{ date: '2026-05-01T00:00:00Z', ale: 96e6 }, { date: '2026-06-01T00:00:00Z', ale: 82e6 }, { date: '2026-07-01T00:00:00Z', ale: 68e6 }],
  counts: { crown_jewels: 2, processes: 4, assets: 40, risks: 7 },
};
const GRAPH = { nodes: [{ id: 'proc:P1', type: 'process', label: 'Claims', attrs: { criticality: 'Critical' } }, { id: 'asset:A1', type: 'asset', label: 'ClaimsDB', attrs: { crown_jewel_tier: 'tier1', score: 0.83 } }, { id: 'risk:R1', type: 'risk', label: 'Ransomware' }], edges: [{ source: 'proc:P1', target: 'asset:A1', type: 'supports' }, { source: 'risk:R1', target: 'asset:A1', type: 'threatens' }] };
const SIGNALS = { edr_pct: { value: 98 }, mfa_pct: { value: 96 }, pam_pct: { value: 60 }, phishing_pct: { value: 3 }, open_incidents: { value: 0 }, mttd_hrs: { value: 8 }, patch_pct: { value: 72 } };

vm.runInContext('this.LIVE = arguments0; this.GRAPH = arguments1; this.SIGNALS = arguments2;'.replace('arguments0', JSON.stringify(LIVE)).replace('arguments1', JSON.stringify(GRAPH)).replace('arguments2', JSON.stringify(SIGNALS)), ctx);

const seatIds = ['ceo', 'cfo', 'coo', 'clo', 'cro', 'cio', 'ciso'];
for (const s of seatIds) {
  try { vm.runInContext(`render(${JSON.stringify(s)});`, ctx); }
  catch (e) { problems.push(`[render ${s}] ${e.message}`); }
}
// Exercise the live-only renderers directly too.
for (const fn of ['applyLive', 'renderChain', 'renderProcBars', 'renderCioSystems', 'renderBoard', 'renderEarnings', 'renderCroPortfolio', 'renderRoi', 'renderSignals', 'renderAiRisk', 'renderTrend', 'renderInitiatives', 'renderOversight', 'renderMateriality']) {
  try { vm.runInContext(`typeof ${fn}==='function' && ${fn}();`, ctx); }
  catch (e) { problems.push(`[${fn}] ${e.message}`); }
}
// Exercise evidence panel for every EV key.
try {
  const keys = vm.runInContext('Object.keys(EV)', ctx);
  for (const k of keys) { try { vm.runInContext(`openEv(${JSON.stringify(k)})`, ctx); } catch (e) { problems.push(`[openEv ${k}] ${e.message}`); } }
} catch (e) { problems.push(`[EV keys] ${e.message}`); }

// ── Onboarding page: run its load-time wiring under a fresh stub ──────────────
try {
  const onboarding = fs.readFileSync(ROOT + '/onboarding.html', 'utf8');
  const obInline = [...onboarding.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const obStore = {};
  const obLocal = { getItem: (k) => (k in obStore ? obStore[k] : null), setItem: (k, v) => { obStore[k] = String(v); }, removeItem: (k) => { delete obStore[k]; }, key: (i) => Object.keys(obStore)[i] || null, get length() { return Object.keys(obStore).length; } };
  const obSandbox = { ...sandbox, localStorage: obLocal };
  obSandbox.window = { ...sandbox.window, localStorage: obLocal };
  obSandbox.globalThis = obSandbox;
  const obCtx = vm.createContext(obSandbox);
  obInline.forEach((code, i) => { try { vm.runInContext(code, obCtx, { filename: `onboarding#${i + 1}` }); } catch (e) { problems.push(`[onboarding load #${i + 1}] ${e.message}`); } });
} catch (e) { problems.push(`[onboarding] ${e.message}`); }

if (problems.length) { console.log('SMOKE FAILURES (' + problems.length + '):'); problems.forEach((p) => console.log(' - ' + p)); process.exit(1); }
else console.log('SMOKE OK — 6 cockpit seats + live renderers + evidence panels + onboarding load ran without throwing.');
