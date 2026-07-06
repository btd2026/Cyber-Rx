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
  value_chain: { method: { severity_impact: { critical: 1, high: 0.6, medium: 0.3, low: 0.15 }, operating_hours_per_year: 8760, note: 'modeled' },
    functions: [
      { name: 'Claims', annual_usd: 230e9, daily_usd: 630e6, process_count: 2, processes: [
        { id: 'P1', name: 'Claims processing', criticality: 'Critical', function: 'Claims', annual_usd: 200e9, daily_usd: 548e6, per_hr: 22.8e6, fraction_of_function: 0.87,
          assets: [ { id: 'A1', name: 'ClaimsDB', internet_facing: true, crown_jewel: true, tier: 'tier1', recovery_hours: 48,
            risks: [ { title: 'Ransomware on claims', severity: 'Critical', exposure_usd: 180e6, impact_fraction: 1, impact_hours: 48, process_stop_usd: 1095e6 } ] } ] },
        { id: 'P2', name: 'Provider payments', criticality: 'High', function: 'Claims', annual_usd: 30e9, daily_usd: 82e6, per_hr: 3.4e6, fraction_of_function: 0.13, assets: [] } ] },
    ] },
};
const GRAPH = { nodes: [{ id: 'proc:P1', type: 'process', label: 'Claims', attrs: { criticality: 'Critical' } }, { id: 'asset:A1', type: 'asset', label: 'ClaimsDB', attrs: { crown_jewel_tier: 'tier1', score: 0.83 } }, { id: 'risk:R1', type: 'risk', label: 'Ransomware' }], edges: [{ source: 'proc:P1', target: 'asset:A1', type: 'supports' }, { source: 'risk:R1', target: 'asset:A1', type: 'threatens' }] };
const SIGNALS = { edr_pct: { value: 98 }, mfa_pct: { value: 96 }, pam_pct: { value: 60 }, phishing_pct: { value: 3 }, open_incidents: { value: 0 }, mttd_hrs: { value: 8 }, patch_pct: { value: 72 }, code_scanning_open: { value: 7 }, dependabot_critical: { value: 2 }, changes_merged_wk: { value: 42 }, changes_in_review: { value: 11 }, audit_findings_open: { value: 14 }, audit_findings_repeat: { value: 3 } };

vm.runInContext('this.LIVE = arguments0; this.GRAPH = arguments1; this.SIGNALS = arguments2;'.replace('arguments0', JSON.stringify(LIVE)).replace('arguments1', JSON.stringify(GRAPH)).replace('arguments2', JSON.stringify(SIGNALS)), ctx);

const seatIds = ['board', 'ceo', 'cfo', 'coo', 'clo', 'cro', 'cio', 'ciso', 'crev', 'cpo', 'audit'];
for (const s of seatIds) {
  try { vm.runInContext(`render(${JSON.stringify(s)});`, ctx); }
  catch (e) { problems.push(`[render ${s}] ${e.message}`); }
}
// Exercise the live-only renderers directly too.
for (const fn of ['applyLive', 'renderChain', 'renderProcBars', 'renderCioSystems', 'renderUnderAttack', 'renderThreatMap', 'renderCjFlow', 'renderCpoQuality', 'renderCpoVelocity', 'renderAuditRepeat', 'renderValueChain', 'renderBoard', 'renderEarnings', 'renderCroPortfolio', 'renderRoi', 'renderSignals', 'renderAiRisk', 'renderTrend', 'renderInitiatives', 'renderOversight', 'renderMateriality', 'renderCfoFraud', 'renderCroKri', 'renderCloOps', 'renderThreatIntel', 'renderDrReadiness', 'renderPeerBench', 'renderPeerCompare', 'renderCisoVendors', 'renderCisoDecisions', 'renderAuditCoverage', 'renderCeoTopThreats', 'renderCeoTopIssues', 'renderCeoStrategyRisks', 'renderCeoCustomerProtect', 'renderCeoBoardKpis', 'renderCeoExecDecisions', 'renderBoardPack', 'openBoardPack', 'closeBoardPack']) {
  try { vm.runInContext(`typeof ${fn}==='function' && ${fn}();`, ctx); }
  catch (e) { problems.push(`[${fn}] ${e.message}`); }
}
// Exercise the value-chain by-control view + the control-$ calculation drill.
try { vm.runInContext("VC_VIEW='ctrl'; renderValueChain(); drillControlValue('backup'); drillControlValue('mfa'); vcProtectedBy('edr'); VC_VIEW='func';", ctx); }
catch (e) { problems.push(`[valueChain by-control/drill] ${e.message}`); }
// Exercise the crosswalk framework views (CIS / SOC 2 / HIPAA) + continuous-audit cadence.
try { vm.runInContext("['cis','soc2','hipaa','csf'].forEach(function(s){FW_SEL=s;renderFrameworks();}); localStorage.setItem('cyberrx_audit_cadence','weekly'); renderFrameworks();", ctx); }
catch (e) { problems.push(`[frameworks crosswalk/cadence] ${e.message}`); }
// Exercise the auditor-style control drill for framework controls (each FW_SEL) + AI RMF.
try { vm.runInContext("['csf','r53','cis','soc2','hipaa'].forEach(function(s){FW_SEL=s;drillFwControl('DE.CM-01','Continuous monitoring');drillFwControl('GV.OC-01','Organizational context');}); AI_FW_ORDER.forEach(function(k){AI_FW_SEL=k;renderAiFrameworks();AI_FW_CATALOG[k].groups.forEach(function(f){f.controls.forEach(function(c){drillAiControl(k,c.id);});});}); AI_FW_SEL='rmf'; typeof auditReport==='function'&&auditReport({id:'X',name:'Y',framework:'Z',cmmi:3,method:'m',findings:'f',rec:'r',auto:false,evidence:[['a','b']]});", ctx); }
catch (e) { problems.push(`[auditor drills + AI frameworks] ${e.message}`); }
// Exercise the crown-jewel threat map gap drill for every MITRE tactic.
try { vm.runInContext("renderThreatMap(); Object.keys(TACTIC_CAPS).forEach(function(t){ typeof tmGapDrill==='function'&&tmGapDrill(t); });", ctx); }
catch (e) { problems.push(`[threat map gap drill] ${e.message}`); }
// Exercise the CISO top-3 inline detail (telemetry + formula + FAQ) for each tile.
try { vm.runInContext("['caps','tactics','vendors',''].forEach(function(k){CISO_OPS_SEL=k;renderCisoOpsDetail(false);}); CISO_OPS_SEL='caps'; renderCisoOps(); renderCisoOpsDetail(true); typeof opsDetailCaps==='function'&&opsDetailCaps(); typeof opsDetailTactics==='function'&&opsDetailTactics(); typeof opsDetailVendors==='function'&&opsDetailVendors(); CAPS.forEach(function(c){ typeof capGreenDrill==='function'&&capGreenDrill(c.k); }); CISO_OPS_SEL='';", ctx); }
catch (e) { problems.push(`[ciso ops detail] ${e.message}`); }
// Exercise the DTNKSHIELD peer benchmark opt-in / opt-out + all render states.
try { vm.runInContext("renderFrameworks(); peerSetOptin(true); PEER_BUSY=false; PEER_DATA=null; renderPeerCompare(); PEER_DATA={sufficient:false,n:2,minCohort:5}; renderPeerCompare(); PEER_DATA={sufficient:true,n:8,overall:{p25:2.1,p50:3,p75:3.8,min:1,max:4.6},overall_values:[2,2.5,3,3.2,3.5,3.8,4,4.6],functions:{Govern:{p25:2,p50:2.9,p75:3.6,min:1.5,max:4},Protect:{p25:2.2,p50:3.1,p75:3.9,min:2,max:4.5}}}; renderPeerCompare(); PEER_DATA={error:true}; renderPeerCompare(); peerSetOptin(false); renderPeerCompare();", ctx); }
catch (e) { problems.push(`[peer benchmark] ${e.message}`); }
// Exercise the third-party vendor panel: onboarding seed, local + backend portfolio, refresh.
try { vm.runInContext("localStorage.setItem('cyberrx_vendors',JSON.stringify([{name:'Amazon Web Services',tier:'1',domain:'aws.amazon.com'},{name:'Okta',tier:'2',domain:'okta.com'},{name:'Weak Vendor',tier:'1',domain:'weak.com'}])); localStorage.setItem('cyberrx_vendor_monitor',JSON.stringify({vendor:'SecurityScorecard'})); renderCisoVendors(); var _vp=vendorLocalPortfolio(vendorSeed(),vendorService()); VENDOR_PORT=_vp; renderCisoVendors(); drillVendorAll(_vp,vendorService()); drillVendorRisk(_vp,vendorService()); drillVendorAvg(_vp,vendorService()); vendorFetch(true); renderCisoVendors(); VENDOR_SHOWCONNECT=true; renderCisoVendors(); vendorConnect('BitSight','test-key'); renderCisoVendors();", ctx); }
catch (e) { problems.push(`[vendor risk] ${e.message}`); }
// Exercise the sub-tab toggle mechanism.
try { vm.runInContext("typeof subtabs==='function' && subtabs([{key:'a',label:'A',on:true,html:'x'},{key:'b',label:'B',html:'y'}]);", ctx); }
catch (e) { problems.push(`[subtabs] ${e.message}`); }
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
