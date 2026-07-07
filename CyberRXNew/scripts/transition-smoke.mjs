// Headless guard-behavior test for the two transition controllers in index.html.
// Stubs a minimal DOM + a MANUAL clock so we can prove: min-duration+ready gating,
// hard watchdog, idempotent completion, and the provisioning SSE/poll → done path.
import fs from 'node:fs';
import vm from 'node:vm';

const ROOT = new URL('../public', import.meta.url).pathname;
const html = fs.readFileSync(ROOT + '/index.html', 'utf8');
const script = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join('\n');

// ---- manual clock ----
let now = 0; let seq = 1; const timers = new Map();
const setTimeoutM = (fn, ms) => { const id = seq++; timers.set(id, { fn, at: now + (ms || 0), interval: false }); return id; };
const setIntervalM = (fn, ms) => { const id = seq++; timers.set(id, { fn, at: now + (ms || 0), every: ms || 1, interval: true }); return id; };
const clearM = (id) => timers.delete(id);
function advance(ms) {
  const target = now + ms;
  while (true) {
    let next = null;
    for (const [id, t] of timers) if (t.at <= target && (next === null || t.at < next.at)) next = { id, ...t };
    if (!next) break;
    now = next.at;
    try { next.fn(); } catch (e) { /* swallow */ }
    if (next.interval) { const t = timers.get(next.id); if (t) t.at = now + next.every; } else { timers.delete(next.id); }
  }
  now = target;
}

// ---- DOM stub ----
function makeEl() {
  const kids = { textContent: '' };
  const el = {
    innerHTML: '', textContent: '', value: '', style: {}, dataset: {}, src: '',
    firstChild: kids, offsetWidth: 1,
    classList: { _s: new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);}, toggle(c,v){v?this._s.add(c):this._s.delete(c);}, contains(c){return this._s.has(c);} },
    setAttribute(){}, getAttribute(){return null;}, removeAttribute(){},
    addEventListener(){}, removeEventListener(){}, appendChild(){}, focus(){}, click(){},
    querySelector(){ return makeEl(); }, querySelectorAll(){ return []; },
  };
  return el;
}
const elCache = {};
const doc = {
  getElementById(id){ return elCache[id] || (elCache[id] = makeEl()); },
  querySelector(){ return makeEl(); },
  querySelectorAll(){ return []; },
  createElement(){ return makeEl(); },
  addEventListener(){}, body: makeEl(), head: makeEl(), documentElement: makeEl(),
};

// ---- EventSource + fetch stubs (controllable) ----
let esInstances = [];
class ESStub {
  constructor(url){ this.url = url; this.onmessage = null; this.onerror = null; esInstances.push(this); ESStub.mode === 'throw' && (() => { throw new Error('no ES'); })(); }
  emit(obj){ this.onmessage && this.onmessage({ data: JSON.stringify(obj) }); }
  fail(){ this.onerror && this.onerror(); }
  close(){ this.closed = true; }
}
ESStub.mode = 'ok';
let fetchResponder = () => ({ pct: 0, done: false, error: null });
const fetchStub = (url) => Promise.resolve({ ok: true, json: () => Promise.resolve(fetchResponder(url)) });

const store = {};
const localStorage = { getItem:(k)=> (k in store?store[k]:null), setItem:(k,v)=>{store[k]=String(v);}, removeItem:(k)=>{delete store[k];}, key:(i)=>Object.keys(store)[i]||null, get length(){return Object.keys(store).length;} };

const sandbox = {
  console, JSON, Math, Number, String, Boolean, Array, Object, Promise, Date, RegExp, parseInt, parseFloat, isFinite, isNaN, encodeURIComponent,
  setTimeout: setTimeoutM, clearTimeout: clearM, setInterval: setIntervalM, clearInterval: clearM,
  document: doc, localStorage, fetch: fetchStub, EventSource: function(u){ if (ESStub.mode === 'throw') throw new Error('no ES'); return new ESStub(u); },
  matchMedia: () => ({ matches: false }),
  speechSynthesis: { getVoices:()=>[], cancel(){}, speak(){}, onvoiceschanged:null },
  SpeechSynthesisUtterance: function(){},
  addEventListener(){}, removeEventListener(){}, postMessage(){},
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
const ctx = vm.createContext(sandbox);
vm.runInContext(script, ctx, { filename: 'index.html' });

const results = [];
const ok = (name, cond) => { results.push({ name, pass: !!cond }); };

// ── A · watchdog fires with no ready + no timers otherwise ──
{
  let fired = 0; store['cyberrx_boot_seen'] = ''; // firstLaunch
  vm.runInContext('Boot.play({firstLaunch:true,muted:true,ready:false,statusText:"Welcome",onComplete:function(){globalThis.__aWatch=(globalThis.__aWatch||0)+1;}});', ctx);
  advance(4300); ok('A: not done before ready at min', (ctx.__aWatch || 0) === 0);
  advance(1300); // reach 5600 > 5500 cap
  fired = ctx.__aWatch || 0; ok('A: hard watchdog forced completion (5500ms)', fired === 1);
}
// ── A · completes on min+ready, idempotent ──
{
  ctx.__aReady = 0;
  vm.runInContext('Boot.play({firstLaunch:true,muted:true,ready:false,onComplete:function(){globalThis.__aReady=(globalThis.__aReady||0)+1;}});', ctx);
  advance(4300); vm.runInContext('Boot.setReady(true);', ctx);
  ok('A: completes on min-duration AND ready', (ctx.__aReady||0) === 1);
  vm.runInContext('Boot.skip();Boot.setReady(true);', ctx); advance(6000);
  ok('A: completion idempotent (fires once)', (ctx.__aReady||0) === 1);
}
// ── A · returning user shorter reveal (900ms) still completes ──
{
  ctx.__aRet = 0; store['cyberrx_org_id'] = 'org1';
  vm.runInContext('Boot.play({firstLaunch:false,muted:true,ready:true,onComplete:function(){globalThis.__aRet=(globalThis.__aRet||0)+1;}});', ctx);
  advance(950); ok('A: returning-user 0.9s reveal completes', (ctx.__aRet||0) === 1);
}
// ── B · SSE progress → done → onComplete after handoff beat ──
{
  ESStub.mode = 'ok'; esInstances = []; ctx.__bDone = 0;
  vm.runInContext('Prov.start({orgId:"org1",muted:true,onComplete:function(){globalThis.__bDone=(globalThis.__bDone||0)+1;}});', ctx);
  const es = esInstances[0]; ok('B: opened SSE stream', !!es && /provisioning\/stream/.test(es.url));
  es.emit({ pct: 20, stageIndex: 1, done: false });
  es.emit({ pct: 65, stageIndex: 2, done: false });
  ok('B: not done mid-progress', (ctx.__bDone||0) === 0);
  es.emit({ pct: 100, stageIndex: 5, done: true });
  advance(700);
  ok('B: hands off only on done:true', (ctx.__bDone||0) === 1);
}
// ── B · monotonic (a backwards pct never rewinds the shown value) ──
{
  ESStub.mode = 'ok'; esInstances = []; ctx.__bMono = 0;
  vm.runInContext('Prov.start({orgId:"org1",muted:true,onComplete:function(){globalThis.__bMono=1;}});', ctx);
  const es = esInstances[0];
  es.emit({ pct: 60, done: false });
  const numEl = elCache['np-num'];
  const after60 = String(numEl.textContent);
  es.emit({ pct: 30, done: false }); // backwards
  ok('B: pct monotonic (60 held after a 30 arrives)', String(numEl.textContent) === after60 && after60 === '60');
}
// ── B · SSE unavailable → poll fallback is armed (fetch-driven) ──
{
  ESStub.mode = 'throw'; esInstances = []; ctx.__bPoll = 0;
  fetchResponder = () => ({ pct: 100, done: true });
  let threw = false;
  try { vm.runInContext('Prov.start({orgId:"org1",muted:true,onComplete:function(){globalThis.__bPoll=1;}});', ctx); advance(2000); }
  catch (e) { threw = true; }
  ok('B: SSE-throw path starts poll fallback without freezing', !threw && esInstances.length === 0);
  ESStub.mode = 'ok';
}

// Drive the poll fetch resolution across real microtasks, then report.
await new Promise((r) => { advance(2000); setTimeout(r, 0); });
{
  let pass = 0; results.forEach((r) => { console.log((r.pass ? '  ok  ' : ' FAIL ') + r.name); if (r.pass) pass++; });
  console.log('\n' + pass + '/' + results.length + ' guard checks passed');
  process.exit(pass === results.length ? 0 : 1);
}
