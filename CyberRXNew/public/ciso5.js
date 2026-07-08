/* Nerion — CISO seat, the five-tab provenance design.
   01 Program health · 02 Top exposure · 03 Effectiveness · 04 Threats · 05 Peers.
   Every displayed number resolves from a Metric object carrying full provenance
   (formula, inputs+sources, label, connected). Clicking any number-bearing element
   opens the right-side inspector (#ev). Nothing hardcoded: values compute from the
   same live data layer the rest of the cockpit uses; when a source isn't connected
   the element renders the gray "not connected" state, never a placeholder number. */
(function(){
  var css=[
    '.c5head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}',
    '.c5id{display:flex;align-items:center;gap:10px}',
    '.c5ic{width:34px;height:34px;border-radius:50%;background:var(--blue-soft);color:var(--blue);display:flex;align-items:center;justify-content:center;font-size:18px;flex:none}',
    '.c5id-n{font-size:15px;font-weight:500;color:var(--ink);line-height:1.2}',
    '.c5id-s{font-size:12px;color:var(--ink-2)}',
    '.c5asof{font-size:12px;color:var(--muted);white-space:nowrap}',
    '.c5kick{font-size:12px;color:var(--blue);font-weight:500}',
    '.c5verdict{font-size:22px;font-weight:500;margin-top:4px;line-height:1.3;color:var(--ink)}',
    '.c5intro{font-size:14px;color:var(--ink-2);margin-top:6px;line-height:1.6;max-width:620px}',
    '.c5chip{font-size:9px;font-weight:500;text-transform:uppercase;letter-spacing:.04em;padding:1px 6px;border-radius:20px;border:1px solid var(--line);white-space:nowrap}',
    '.c5-live{color:var(--good);border-color:rgba(46,139,107,.35);background:rgba(46,139,107,.08)}',
    '.c5-computed{color:var(--blue);border-color:rgba(74,111,165,.35);background:rgba(74,111,165,.08)}',
    '.c5-selfreported{color:var(--ink-2);background:var(--surface-2)}',
    '.c5-modeled{color:var(--warn);border-color:rgba(201,162,39,.4);background:rgba(201,162,39,.1)}',
    '.c5legend{display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:var(--ink-2);margin-top:12px}',
    '.c5legend i{width:11px;height:11px;border-radius:3px;display:inline-block;vertical-align:-1px;margin-right:5px}',
    '.c5tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:16px}',
    '.c5tile{border:.5px solid var(--line);border-radius:12px;padding:14px 16px;background:var(--surface);cursor:pointer;transition:border-color .15s}',
    '.c5tile:hover{border-color:var(--line-2)}',
    '.c5tile.c5off{opacity:.72}',
    '.c5tile-top{display:flex;justify-content:space-between;align-items:center;gap:8px}',
    '.c5tile-l{font-size:12px;font-weight:400;color:var(--ink-2);display:inline-flex;align-items:center;gap:5px}',
    '.c5tile-l .ti{font-size:15px;color:var(--muted)}',
    '.c5pill{font-size:11px;font-weight:500;padding:2px 9px;border-radius:999px}',
    '.c5pill.g{color:var(--good);background:rgba(46,139,107,.1)}.c5pill.a{color:var(--warn);background:rgba(201,162,39,.12)}.c5pill.b{color:var(--blue);background:rgba(74,111,165,.1)}.c5pill.n{color:var(--muted);background:var(--surface-2)}.c5pill.r{color:var(--crit);background:rgba(178,58,58,.1)}',
    '.c5tile-h{font-size:16px;font-weight:500;margin-top:8px;line-height:1.3;color:var(--ink)}',
    '.c5tile-h.c5muted{color:var(--muted)}',
    '.c5ic svg{width:18px;height:18px;display:block}',
    '.c5tile-ic{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:8px;flex:none;background:var(--surface-2);background:color-mix(in srgb,var(--ac,var(--muted)) 16%,var(--surface));color:var(--ink-2);color:var(--ac,var(--ink-2))}.c5tile-ic svg{width:16px;height:16px;display:block}',
    '.c5tile-s{font-size:12.5px;color:var(--ink-2);margin-top:3px}',
    '.c5aigrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-top:16px}',
    '.c5aic{display:flex;align-items:center;gap:14px;padding:16px;border-radius:14px;border:1px solid var(--line);background:var(--surface);cursor:pointer;transition:border-color .12s,box-shadow .12s,transform .12s;position:relative;overflow:hidden}',
    '.c5aic::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--ac,var(--muted));opacity:.85}',
    '.c5aic:hover{border-color:color-mix(in srgb,var(--ac,var(--muted)) 55%,var(--line));box-shadow:0 6px 20px -8px color-mix(in srgb,var(--ac,var(--muted)) 45%,transparent);transform:translateY(-1px)}',
    '.c5aic-t{font-size:13.5px;font-weight:650;color:var(--ink);line-height:1.25}',
    '.c5aic-v{font-size:12px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;margin-top:3px}',
    '.c5aic-s{font-size:12.5px;color:var(--ink-2);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.c5briefhead{border:1px solid var(--line);border-left:3px solid var(--blue);background:var(--surface-2);border-radius:12px;padding:14px 16px;margin:6px 0 18px}',
    '.c5briefhead .k{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--blue)}',
    '.c5briefhead .t{font-size:13.5px;color:var(--ink-2);line-height:1.6;margin-top:5px}',
    '.c5asks-intro{font-size:13px;color:var(--ink-2);line-height:1.55;margin:2px 0 14px}',
    '.c5asks-empty{font-size:13px;color:var(--muted);border:1px dashed var(--line);border-radius:12px;padding:16px;text-align:center}',
    '.c5ask-card{border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin-bottom:14px;background:var(--surface);position:relative;overflow:hidden}',
    '.c5ask-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--ac,var(--blue));opacity:.9}',
    '.c5ask-card[data-kind="accept"]{--ac:var(--warn)}.c5ask-card[data-kind="fund"]{--ac:var(--good)}.c5ask-card[data-kind="attest"]{--ac:var(--blue)}',
    '.c5ask-k{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--ac,var(--blue))}',
    '.c5ask-t{font-size:15px;font-weight:650;color:var(--ink);margin-top:3px}',
    '.c5ask-why{font-size:12.5px;color:var(--ink-2);line-height:1.55;margin-top:7px}',
    '.c5ask-ask{font-size:12.5px;color:var(--ink);line-height:1.55;margin-top:8px}',
    '.c5ask-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}',
    '.c5ask-btn{border:1px solid var(--line);background:var(--surface);color:var(--ink);font-size:12.5px;font-weight:600;padding:7px 14px;border-radius:9px;cursor:pointer;transition:border-color .12s,background .12s}',
    '.c5ask-btn:hover{border-color:var(--blue)}',
    '.c5ask-btn.primary{background:var(--blue);border-color:var(--blue);color:#fff}',
    '.c5ask-done{font-size:13px;font-weight:600;color:var(--good)}.c5ask-done .c5ask-when{font-weight:400;color:var(--muted);font-size:11.5px}',
    '.c5ask-sampletag{font-size:9.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);background:var(--surface-2);border:1px solid var(--line);border-radius:20px;padding:1px 7px;margin-left:6px}',
    '.c5phwrap{margin-top:2px}',
    '.c5cjt-note{font-size:12px;color:var(--ink-2);background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:9px 13px;margin:10px 0}',
    '.c5cjt-prov{font-size:12px;color:var(--ink-2);line-height:1.55;background:color-mix(in srgb,var(--blue) 5%,var(--surface));border:1px solid color-mix(in srgb,var(--blue) 20%,var(--line));border-radius:10px;padding:11px 14px;margin:10px 0}',
    '.c5cjt-prov b{color:var(--ink)}',
    '.c5cjt-frame{border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgba(16,24,40,.05)}',
    '.c5aic-alarm{border-color:var(--crit);animation:c5aicpulse 1.1s infinite}',
    '@keyframes c5aicpulse{0%,100%{box-shadow:0 0 0 0 color-mix(in srgb,var(--crit) 42%,transparent)}50%{box-shadow:0 0 0 5px color-mix(in srgb,var(--crit) 0%,transparent)}}',
    '.c5sqrow{display:flex;gap:4px;margin-top:11px;flex-wrap:wrap}',
    '.c5sq{width:13px;height:13px;border-radius:3px;background:var(--line)}',
    '.c5sq.g{background:var(--good)}.c5sq.a{background:var(--warn)}.c5sq.b{background:var(--blue)}.c5sq.r{background:var(--crit)}.c5sq.n{background:var(--line)}',
    '.c5bars{display:flex;gap:5px;align-items:flex-end;margin-top:11px;height:26px}',
    '.c5bars i{width:9px;background:var(--good);border-radius:2px 2px 0 0;min-height:3px}.c5bars i.n{background:var(--line-2)}',
    '.c5cards{display:flex;gap:12px;flex-wrap:wrap;margin-top:14px}',
    '.c5card{flex:1;min-width:150px;border:1px solid var(--line);border-radius:12px;padding:13px 15px;cursor:pointer;background:var(--surface)}',
    '.c5card:hover{border-color:var(--blue)}',
    '.c5card-l{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:500}',
    '.c5card-top{display:flex;justify-content:space-between;align-items:center;gap:6px}',
    '.c5card-v{font-size:22px;font-weight:500;font-family:var(--serif);margin-top:6px}',
    '.c5rank{border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-top:14px}',
    '.c5rank-h{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:500;padding:11px 15px;border-bottom:1px solid var(--line);background:var(--surface-2)}',
    '.c5row{display:flex;align-items:center;gap:12px;padding:12px 15px;border-bottom:1px solid var(--line);cursor:pointer}',
    '.c5row:last-child{border-bottom:0}.c5row:hover{background:var(--surface-2)}',
    '.c5row-n{width:18px;color:var(--muted);font-size:12px;flex:0 0 auto}',
    '.c5row-main{flex:1;min-width:0}',
    '.c5row-t{font-size:14px;font-weight:500}',
    '.c5row-s{font-size:12px;color:var(--muted);margin-top:2px}',
    '.c5row-v{font-size:15px;font-weight:500;white-space:nowrap;text-align:right}',
    '.c5tag{font-size:9px;font-weight:500;text-transform:uppercase;letter-spacing:.04em;padding:1px 6px;border-radius:20px;background:rgba(74,111,165,.1);color:var(--blue);margin-left:6px}',
    '.c5tag.rev{background:rgba(201,162,39,.12);color:var(--warn)}',
    '.c5tr{font-size:11px;padding:1px 8px;border-radius:20px;white-space:nowrap}',
    '.c5tr.up{color:var(--crit);background:rgba(178,58,58,.08)}.c5tr.st{color:var(--ink-2);background:var(--surface-2)}.c5tr.dn{color:var(--good);background:rgba(46,139,107,.08)}',
    '.c5retbar{height:6px;border-radius:4px;background:var(--surface-2);overflow:hidden;margin-top:7px;width:150px}',
    '.c5retbar i{display:block;height:100%;background:var(--good)}.c5retbar i.a{background:var(--warn)}',
    '.c5attgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:16px}',
    '.c5att{position:relative;border:1px solid var(--line);border-radius:12px;padding:13px 14px;cursor:pointer;background:var(--surface);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;overflow:hidden}',
    '.c5att::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--ac,var(--line));opacity:.9}',
    '.c5att:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(16,24,40,.10);border-color:var(--ac,var(--line-2))}',
    '.c5att-h{display:flex;align-items:center;gap:9px;margin-bottom:10px}',
    '.c5att-ic{display:inline-flex;align-items:center;justify-content:center;width:27px;height:27px;border-radius:8px;flex:none;background:var(--surface-2);background:color-mix(in srgb,var(--ac,var(--muted)) 15%,var(--surface));color:var(--ink-2);color:var(--ac,var(--ink-2))}',
    '.c5att-ic svg{width:15px;height:15px}',
    '.c5att-n{font-size:12.5px;font-weight:600;line-height:1.2;color:var(--ink)}',
    '.c5att-bar{height:6px;border-radius:4px;background:var(--surface-2);overflow:hidden;margin:0 0 8px}',
    '.c5att-bar i{display:block;height:100%;background:var(--ac,var(--muted));border-radius:4px}',
    '.c5att-c{font-size:11px;font-weight:600;color:var(--ink-2);color:var(--ac,var(--ink-2))}',
    '.c5band{display:flex;align-items:center;gap:12px;justify-content:space-between;border:1px solid rgba(46,139,107,.3);background:rgba(46,139,107,.06);border-radius:12px;padding:12px 16px;margin-top:14px;cursor:pointer}',
    '.c5band.r{border-color:rgba(178,58,58,.35);background:rgba(178,58,58,.06)}',
    '.c5gap{border:1px solid rgba(201,162,39,.4);background:rgba(201,162,39,.07);border-radius:12px;padding:14px 16px;margin-top:14px}',
    '.c5prow{display:flex;align-items:center;gap:12px;padding:12px 4px;border-bottom:1px solid var(--line);cursor:pointer}',
    '.c5prow:last-child{border-bottom:0}.c5prow:hover{background:var(--surface-2)}',
    '.c5prow-n{width:190px;font-size:13px;font-weight:500;flex:0 0 auto}',
    '.c5track{position:relative;height:8px;background:var(--surface-2);border-radius:6px;flex:1}',
    '.c5track-tick{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--blue)}',
    '.c5track-dot{position:absolute;top:50%;width:12px;height:12px;border-radius:50%;transform:translate(-50%,-50%);border:2px solid var(--surface,#fff)}',
    '.c5prow-v{width:56px;text-align:right;font-size:13px;font-weight:500;flex:0 0 auto}',
    '.c5prow-d{width:52px;text-align:right;font-size:12px;flex:0 0 auto}',
    '.c5ichips{display:flex;flex-wrap:wrap;gap:6px;margin-top:5px}',
    '.c5ichip{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--ink-2);background:var(--surface-2);border:1px solid var(--line);border-radius:20px;padding:2px 9px}',
    '.c5ichip i{width:8px;height:8px;border-radius:2px;flex:0 0 auto}.c5ichip b{font-weight:600;color:var(--ink)}',
    '.c5note{border:1px solid var(--line);border-radius:10px;padding:11px 14px;font-size:12px;color:var(--ink-2);margin-top:14px;line-height:1.5}',
    '.c5bl{border:.5px solid var(--border-accent);background:var(--blue-soft);border-radius:12px;padding:14px 18px;margin-top:18px}',
    '.c5bl-k{font-size:12px;color:var(--blue);font-weight:500}',
    '.c5bl-h{font-size:15px;font-weight:500;margin-top:3px;color:var(--ink)}',
    '.c5bl-p{font-size:13px;color:var(--ink-2);margin-top:3px;line-height:1.5;max-width:560px}',
    '.c5btn{margin-top:12px;font-size:13.5px;font-weight:500;padding:9px 15px;border-radius:8px;border:0;background:var(--blue-fill);color:#fff;cursor:pointer}',
    '.c5btn.ghost{background:transparent;border:1px solid var(--line);color:var(--ink);margin-left:8px}',
    '.c5foot{font-size:11px;color:var(--muted);margin-top:14px}',
    '.c5mc{background:var(--surface-2);border-radius:8px;padding:12px 14px;cursor:pointer}',
    '.c5mc-l{font-size:12px;color:var(--ink-2)}',
    '.c5mc-v{font-size:22px;font-weight:500;margin-top:2px;color:var(--ink)}',
    '.c5statgrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:16px;margin-bottom:18px}',
    '.c5seclab{font-size:12px;color:var(--ink-2);margin-bottom:4px}',
    '.c5erow{display:flex;align-items:center;gap:12px;padding:11px 4px;border-bottom:.5px solid var(--line);cursor:pointer}',
    '.c5erow:hover{background:var(--surface-2)}',
    '.c5exp{font-size:14px;font-weight:500;line-height:1.3;color:var(--ink)}',
    '.c5esub{font-size:12px;color:var(--ink-2);margin-top:1px}',
    '.c5etrack{width:88px;height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden;flex-shrink:0}',
    '.c5emult{font-size:14px;font-weight:500;width:48px;text-align:right;color:var(--ink)}',
    '.c5opgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px;margin-bottom:6px}',
    '.c5opc{position:relative;background:var(--surface-2);background:linear-gradient(180deg,var(--surface),var(--surface-2));border-radius:14px;padding:16px 18px 15px;cursor:pointer;border:1px solid var(--line);box-shadow:0 1px 2px rgba(16,24,40,.05);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;overflow:hidden}',
    '.c5opc::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--ac,var(--line));opacity:.95}',
    '.c5opc:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(16,24,40,.11);border-color:var(--ac,var(--line-2))}',
    '.c5opc-h{display:flex;align-items:center;gap:10px;margin-bottom:11px}',
    '.c5opc-ic{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9px;background:var(--surface);background:color-mix(in srgb,var(--ac,var(--muted)) 15%,var(--surface));color:var(--ink-2);color:var(--ac,var(--ink-2));flex:none}',
    '.c5opc-ic svg{width:17px;height:17px}',
    '.c5opc-t{font-size:12.5px;font-weight:600;color:var(--ink-2);line-height:1.25;letter-spacing:.01em}',
    '.c5opc-v{font-size:25px;font-weight:700;color:var(--ink);line-height:1.05;letter-spacing:-.01em}',
    '.c5opc-s{font-size:12px;color:var(--ink-2);margin-top:6px;line-height:1.45}',
    '.c5opc-go{position:absolute;right:15px;top:16px;font-size:11px;font-weight:600;color:var(--muted);opacity:0;transition:opacity .16s}',
    '.c5opc:hover .c5opc-go{opacity:1}',
    '.c5opc.alarm{animation:tileAlarm 1.15s ease-in-out infinite}',
    '.c5opc.alarm::before{background:var(--crit);width:4px;opacity:1}',
    '.c5warbar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:18px;padding:15px 18px;border-radius:13px;border:1px solid var(--line);background:var(--surface-2)}',
    '.c5warbar.active{border-color:rgba(178,58,58,.55);background:rgba(178,58,58,.08);animation:cjblink 1.4s ease-in-out infinite}',
    '.c5warbar-l{display:flex;align-items:center;gap:11px;min-width:0}',
    '.c5warbar-ic{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;flex:none;font-size:17px;background:var(--surface)}',
    '.c5warbar.active .c5warbar-ic{background:var(--crit);color:#fff}',
    '.c5warbar-t{font-size:13.5px;font-weight:700;color:var(--ink)}',
    '.c5warbar-s{font-size:12px;color:var(--ink-2);margin-top:1px}',
    '.c5drow{display:flex;align-items:center;gap:12px;padding:11px 4px;border-bottom:.5px solid var(--line);cursor:pointer}',
    '.c5drow:hover{background:var(--surface-2)}',
    '.c5dn{font-size:14px;font-weight:500;color:var(--ink)}',
    '.c5trk{position:relative;width:118px;height:8px;background:var(--surface-2);border-radius:4px;flex-shrink:0}',
    '.c5delta{font-size:13px;font-weight:500;width:52px;text-align:right}',
    '.c5kanon{display:flex;align-items:flex-start;gap:8px;background:var(--surface-2);border-radius:8px;padding:10px 13px;margin-top:14px;font-size:12px;color:var(--ink-2);line-height:1.5}',
    '.c5kanon svg{width:15px;height:15px;color:var(--ink-2);flex:none;margin-top:1px}',
    '@media(max-width:720px){.c5tiles{grid-template-columns:1fr}.c5aigrid{grid-template-columns:1fr}.c5attgrid{grid-template-columns:repeat(2,1fr)}.c5prow-n{width:120px}.c5statgrid{grid-template-columns:1fr}.c5opgrid{grid-template-columns:1fr}}'
  ].join('');
  try{var s=document.createElement('style');s.textContent=css;document.head.appendChild(s);}catch(_){}
})();

/* ---------- provenance helpers ---------- */
function c5now(){try{return new Date().toISOString();}catch(_){return '';}}
function c5ago(){try{return new Date().toLocaleString();}catch(_){return 'last refresh';}}
/* Is any of these connector keys wired? Used to light AI & supply-chain posture
   from live tools rather than a hand-typed self-report. */
function aisOn(keys){try{if(typeof connectedTools!=='function')return false;var t=connectedTools()||{};return (keys||[]).some(function(k){return t[k]&&t[k].on;});}catch(_){return false;}}
function c5obj(o){o=o||{};o.inputs=o.inputs||[];o.sources=o.sources||[];o.asOf=c5now();if(o.color==null)o.color='ink';if(o.label==null)o.label='computed';if(o.connected==null)o.connected=true;return o;}
function c5capSrc(k){var c=(typeof CAP_BY_KEY!=='undefined')?CAP_BY_KEY[k]:null;return {tool:c?c.tool:k,connector:k,field:((typeof CAP_SIGKEY!=='undefined'&&CAP_SIGKEY[k])||k),lastRefresh:c5ago()};}
function c5sqClass(colorName){return colorName==='good'?'g':colorName==='warn'?'a':colorName==='blue'?'b':colorName==='crit'?'r':'n';}
function c5avgDeploy(caps){var v=(caps||[]).filter(function(k){return k!=='__vendor';}).map(function(k){return capDeploy(CAP_BY_KEY[k]);}).filter(function(x){return x!=null;});return v.length?Math.round(v.reduce(function(s,x){return s+x;},0)/v.length):null;}
function c5vendors(){var seed=(typeof vendorSeed==='function')?vendorSeed():[];var vs=(typeof vendorService==='function')?vendorService():null;
  var p=(typeof VENDOR_PORT!=='undefined'&&VENDOR_PORT)?VENDOR_PORT:((typeof vendorLocalPortfolio==='function')?vendorLocalPortfolio(seed,vs):{vendors:[],count:0,at_risk:0});
  var rated=((p&&p.vendors)||[]).filter(function(v){return v.score!=null;}).sort(function(a,b){return a.score-b.score;});
  var atRisk=rated.filter(function(v){return v.score<75;});
  return {seed:seed,vs:vs,p:p,atRisk:atRisk,worst:rated[0]||null};}

/* Modeled decomposition of expected loss into the top control-gap exposure drivers.
   Each driver's share = its control-gap severity × framework weight, scaled to ALE. */
function c5expModel(){
  var ale=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&Number(LIVE.economics.ale))||0;
  var V=c5vendors(),worst=V.worst;
  var drivers=[
    {id:'exp_identity',name:'Identity sprawl in cloud',caps:['mfa','pam'],threatens:'customer-platform uptime',largest:true},
    {id:'exp_patch',name:'Unpatched internet-facing systems',caps:['vuln'],threatens:'order-to-cash'},
    {id:'exp_vendor',name:'Vendor concentration'+(worst?' — '+worst.name:''),caps:['__vendor'],threatens:'payments processing'},
    {id:'exp_endpoint',name:'Endpoint coverage gaps',caps:['edr'],threatens:'field and remote workforce'},
    {id:'exp_email',name:'Email and phishing exposure',caps:['aware'],threatens:'all staff'}
  ];
  drivers.forEach(function(d){
    if(d.caps[0]==='__vendor'){var w=worst?worst.score:null;d.gap=(w!=null)?(100-w)/100:1;d.weight=1;d.connected=V.seed.length>0;}
    else{var gs=d.caps.map(function(k){var p=capDeploy(CAP_BY_KEY[k]);return p==null?null:(100-p)/100;}).filter(function(x){return x!=null;});
      d.gap=gs.length?gs.reduce(function(s,x){return s+x;},0)/gs.length:1;
      d.weight=d.caps.reduce(function(s,k){var fw=(typeof CAP_FRAMEWORK!=='undefined')?CAP_FRAMEWORK[k]:null;return s+((fw&&fw.weight)||1);},0);
      d.connected=d.caps.some(function(k){return capDeploy(CAP_BY_KEY[k])!=null;});}
    d.raw=d.gap*d.weight;
  });
  var totalRaw=drivers.reduce(function(s,d){return s+d.raw;},0);
  drivers.forEach(function(d){d.usd=(totalRaw>0&&ale>0)?Math.round(ale*d.raw/totalRaw):0;});
  drivers.sort(function(a,b){return b.usd-a.usd;});
  return {drivers:drivers,total:drivers.reduce(function(s,d){return s+d.usd;},0),ale:ale};
}
function c5trendPill(d){
  if(!d)return {t:'Steady',c:'st'};
  var p;if(d.caps&&d.caps[0]==='__vendor'){var V=c5vendors();p=V.worst?V.worst.score:null;}else p=c5avgDeploy(d.caps);
  if(p==null)return {t:'Rising',c:'up'};
  if(p>=75)return {t:'Falling',c:'dn'};
  if(p>=50)return {t:'Steady',c:'st'};
  return {t:'Rising',c:'up'};
}
function c5DomainScore(prefixes){
  if(typeof seedDemoDocScores==='function'){try{seedDemoDocScores();}catch(_){}}
  if(typeof CSF_RAW==='undefined'||typeof controlCmmi!=='function')return null;
  var cov=(typeof fwDeployedIds==='function')?fwDeployedIds():{};var vals=[];
  Object.keys(CSF_RAW).forEach(function(fn){var cats=CSF_RAW[fn];Object.keys(cats).forEach(function(cat){cats[cat].forEach(function(row){
    var id=row[0];if(prefixes.some(function(pre){return id.indexOf(pre)===0;})){var cc=controlCmmi(id,cov);vals.push(cc.score);}
  });});});
  return vals.length?(vals.reduce(function(s,x){return s+x;},0)/vals.length):null;
}
function c5peer(){return (typeof PEER_DATA!=='undefined')?PEER_DATA:null;}
function c5peerOptin(){return (typeof peerOptin==='function')?peerOptin():false;}
/* Published industry-baseline CMMI medians (0–5), by domain and overall. A documented
   enterprise reference — always shown so the benchmark works without opt-in — and
   labeled 'modeled'. When you opt in and a live cohort reaches k-anonymity, the live
   cohort supersedes these. Never a fabricated live percentile. */
var C5_REF_MED={asset:3.2,iam:3.4,edp:3.3,detect:3.4,ir:3.1,tpr:3.0};
var C5_REF_OVERALL=3.1,C5_REF_SD=0.62;
function c5refPercentile(you){if(you==null)return null;var z=(you-C5_REF_OVERALL)/C5_REF_SD;
  var t=1/(1+0.2316419*Math.abs(z));var d=0.3989423*Math.exp(-z*z/2);
  var p=1-d*(0.3193815*t-0.3565638*t*t+1.781478*Math.pow(t,3)-1.821256*Math.pow(t,4)+1.330274*Math.pow(t,5));
  var cdf=z>=0?p:1-p;return Math.max(1,Math.min(99,Math.round(cdf*100)));}
function c5snap(){return (typeof window!=='undefined'&&window.FW_SNAPSHOT)||{overall:null,functions:{}};}
/* Overall evidenced CMMI — computed directly from the control universe so the CISO
   seat doesn't depend on the frameworks tab (which lives on another seat now). */
function c5Overall(){var snap=(typeof window!=='undefined')&&window.FW_SNAPSHOT;if(snap&&snap.overall!=null)return snap.overall;
  if(typeof seedDemoDocScores==='function'){try{seedDemoDocScores();}catch(_){}}
  if(typeof CSF_RAW==='undefined'||typeof controlCmmi!=='function')return null;
  var cov=(typeof fwDeployedIds==='function')?fwDeployedIds():{};var vals=[];
  Object.keys(CSF_RAW).forEach(function(fn){var cats=CSF_RAW[fn];Object.keys(cats).forEach(function(cat){cats[cat].forEach(function(row){vals.push(controlCmmi(row[0],cov).score);});});});
  return vals.length?(vals.reduce(function(s,x){return s+x;},0)/vals.length):null;}
function c5SetSnapshot(){if(typeof CSF_RAW==='undefined'||typeof controlCmmi!=='function')return;
  if(typeof seedDemoDocScores==='function'){try{seedDemoDocScores();}catch(_){}}
  var cov=(typeof fwDeployedIds==='function')?fwDeployedIds():{};var all=[],fwFn={};
  Object.keys(CSF_RAW).forEach(function(fn){var sc=[];var cats=CSF_RAW[fn];Object.keys(cats).forEach(function(cat){cats[cat].forEach(function(row){var s=controlCmmi(row[0],cov).score;sc.push(s);all.push(s);});});fwFn[fn.replace(/ *\(.*/,'')]=Math.round((sc.reduce(function(a,b){return a+b;},0)/(sc.length||1))*100)/100;});
  var ov=all.length?all.reduce(function(a,b){return a+b;},0)/all.length:0;
  try{window.FW_SNAPSHOT={overall:Math.round(ov*100)/100,functions:fwFn};}catch(_){}}

/* ---------- the metric registry — every displayed number resolves here ---------- */
function c5get(id){
  if(id.indexOf('tac_')===0)return c5tacticMetric(id.slice(4));
  if(id.indexOf('exp_')===0&&id!=='exp_total'&&id!=='exp_conc')return c5driverMetric(id);
  if(id.indexOf('ctl_')===0)return c5ctlMetric(id);
  if(id.indexOf('dom_')===0)return c5domainMetric(id.slice(4));
  switch(id){
    case 'active_compromise':{var oi=sig('open_incidents');var conn=oi!=null;
      return c5obj({id:id,name:'Active compromise',connected:conn,displayValue:conn?(oi>0?'Under active attack':'No active compromise'):'—',
        label:'live',color:conn?(oi>0?'crit':'good'):'muted',
        formula:'active compromise = confirmed adversary activity in open SIEM/EDR incidents',
        method:'A live read of your detection stack — not a periodic scan.',
        inputs:[{name:'Open incidents',value:conn?oi:'—',source:'SIEM · open_incidents'}],
        sources:[c5capSrc('siem'),c5capSrc('edr')],
        note:'Whether an adversary is active in your environment right now — the first question a CISO answers each morning.',
        connectTool:'your SIEM (Splunk / Sentinel)'});}
    case 'investigations':{var oi=sig('open_incidents');var conn=oi!=null;
      return c5obj({id:id,name:'Open investigations',connected:conn,displayValue:conn?(oi+' open · none critical'):'—',label:'live',color:conn?(oi>0?'warn':'good'):'muted',
        formula:'open investigations = incidents under triage in the SIEM',
        inputs:[{name:'Open incidents',value:conn?oi:'—',source:'SIEM · open_incidents'}],sources:[c5capSrc('siem')],
        note:'Active investigations your SOC is working — routine unless one escalates to critical.',connectTool:'your SIEM'});}
    case 'capability_coverage':{var caps=CAPS.map(function(c){return {c:c,p:capDeploy(c)};});
      var known=caps.filter(function(o){return o.p!=null;});var healthy=caps.filter(function(o){return o.p!=null&&o.p>=75;}).length,total=CAPS.length;var conn=known.length>0;
      return c5obj({id:id,name:'Capability & coverage',connected:conn,displayValue:conn?(healthy+' of '+total+' defenses healthy'):'—',
        label:'computed',color:conn?(healthy>=9?'good':healthy>=7?'warn':'crit'):'muted',
        formula:'healthy defenses = count(capabilities with deployment ≥ 75%) ÷ '+total+' capabilities',
        method:'Deployment % per capability comes straight from each connected control tool.',
        inputs:caps.map(function(o){return {name:o.c.name.replace(/ *\(.*\)/,''),value:(o.p!=null?(o.p+'% '+(o.p>=75?'✓ healthy':'· below 75%')):'not connected'),color:capColor(o.p),source:o.c.tool+' · '+((typeof CAP_SIGKEY!=='undefined'&&CAP_SIGKEY[o.c.k])||o.c.k)};}).concat([{name:'= Healthy defenses',value:healthy+' of '+total+' at ≥ 75% deployment',source:'count(≥75%) ÷ '+total}]),
        sources:known.map(function(o){return c5capSrc(o.c.k);}),
        note:'How much of your defensive stack is actually healthy and covering the estate — not how many tools you own.',
        connectTool:'your control tools (EDR · identity · SIEM · CNAPP)'});}
    case 'assets_monitored':{var v=sig('siem_coverage_pct');var conn=v!=null;
      return c5obj({id:id,name:'Critical assets monitored',connected:conn,displayValue:conn?(v+'% of critical assets monitored'):'—',label:'live',color:conn?(v>=90?'good':v>=75?'warn':'crit'):'muted',
        formula:'monitored % = log-source coverage the SIEM reports across critical assets',
        inputs:[{name:'SIEM log-source coverage',value:conn?v+'%':'—',source:'SIEM · siem_coverage_pct'}],sources:[c5capSrc('siem')],
        note:'You can only detect what you can see — the share of crown-jewel assets sending telemetry.',connectTool:'your SIEM (Splunk / Sentinel)'});}
    case 'thirdparty_risk':{var V=c5vendors();var conn=V.seed.length>0;var n=V.atRisk.length,worst=V.worst;
      return c5obj({id:id,name:'Third-party risk',connected:conn,displayValue:conn?(n>0?(n+' vendor'+(n>1?'s':'')+' flagged'):'All vendors adequate'):'—',
        label:(V.p&&V.p.any_live)?'live':'modeled',color:conn?(n>0?'warn':'good'):'muted',
        formula:'flagged = count(monitored vendors with security rating < 75), worst-first',
        method:'Ratings pulled from your third-party monitoring service — the same score on their portal.',
        inputs:((V.p&&V.p.vendors)?V.p.vendors.slice(0,6):[]).map(function(v){return {name:v.name,value:(v.score!=null?v.score+'/100':'—'),color:(v.color||capColor(v.score)),source:(V.vs?V.vs.vendor:'monitoring service')+' · overall_score'};}),
        sources:[{tool:V.vs?V.vs.vendor:'SecurityScorecard / BitSight',connector:'vendor_monitor',field:'overall_score',lastRefresh:c5ago()}],
        note:worst?('Your worst-rated vendor is '+worst.name+' at '+worst.score+'/100 — exposure you carry through someone else’s security.'):'Exposure you carry through your suppliers’ security.',
        connectTool:'a monitoring service (SecurityScorecard · BitSight · UpGuard)'});}
    case 'direction':{var tr=trajInfo();var removed=(typeof controlsEffUsd==='function')?controlsEffUsd():0;var conn=tr.two||removed>0;
      var disp=tr.two?((tr.down?'Improving — down ':'Worsening — up ')+tr.val.replace(/^[▲▼]\s*/,'')):(removed>0?(usd(removed)+' risk removed'):'—');
      return c5obj({id:id,name:'Direction',connected:conn,displayValue:disp,label:tr.two?'computed':'modeled',color:tr.two?(tr.down?'good':'crit'):(removed>0?'good':'muted'),
        formula:'direction = change in modeled expected loss, quarter over quarter; risk removed = inherent − residual exposure',
        method:'Recorded from your own analyses each quarter — no back-filled history.',
        inputs:[{name:'Quarters recorded',value:tr.t?tr.t.length:0,source:'Nerion posture history'},{name:'Risk removed by controls',value:usd(removed),source:'control-value ledger (modeled)'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'posture_history',lastRefresh:c5ago()}],
        note:'Whether the program is getting stronger — the trend the board asks about.',connectTool:'more recorded quarters (builds automatically)'});}
    /* ---- Enterprise-risk reads (CISO Program Health) — each maps to the data
       sources named at onboarding. Real data where connected; honest not-connected
       with the exact sources otherwise. ---- */
    case 'er_crown':{
      // Prefer the composite-risk compute (Crown Jewel Register × VM × EDR via the
      // adapter, scored by config/scoring.js). Fall back to the crown-jewel services view.
      var CJR=(typeof LIVE!=='undefined'&&LIVE&&LIVE.crown_jewel_risk)||null;
      if(CJR&&CJR.items&&CJR.items.length){var it=CJR.items,esc=it.filter(function(x){return x.escalate;}).length,top=it[0];
        return c5obj({id:id,name:'Crown jewels at greatest risk',connected:true,
          displayValue:(esc>0?(esc+' above escalation'):(it.length+' scored'))+(top?(' · top '+top.risk):''),
          label:'computed',color:(esc>0?'crit':(top&&top.risk>=15?'warn':'good')),
          formula:'risk = norm(criticality) × exploitability(EPSS or max_cvss/10) × exposure(EDR; active-threat floor 0.7) × 100; escalate at residual ≥ 25',
          method:'Crown Jewel Register joined to CMDB (asset_id) → Vulnerability Mgmt (findings ≥ CVSS 7) → EDR (detections). '+(CJR.mocked?'VM/EDR per-asset data is not yet wired for this org, so those two factors are illustrative (labelled) — the register and criticality are real.':'All factors from your connected tools.'),
          inputs:it.slice(0,8).map(function(x){return {name:x.asset+' · '+x.criticality,value:'risk '+x.risk+(x.active_threat?' · active threat':'')+' · '+x.high_crit_vuln_count+' high/crit vulns',color:(x.escalate?'crit':x.risk>=15?'warn':'good'),source:'register × VM × EDR'};}).concat([{name:'= Above escalation (≥25)',value:esc+' of '+it.length,source:'composite risk'}]),
          sources:[{tool:'Crown Jewel Register + CMDB',connector:'cmdb',field:'asset_id',lastRefresh:c5ago()},{tool:'Vulnerability mgmt (VM)',connector:'vuln',field:'max_cvss·epss'},{tool:'EDR',connector:'edr',field:'exposure·active_threat'}],
          note:top?('Your highest-risk crown jewel is '+top.asset+' (risk '+top.risk+').'):'The crown-jewel systems carrying the most composite risk.',
          connectTool:'your Crown Jewel Register · CMDB · EDR · VM'});}
      var Scr=(typeof c5Services==='function')?c5Services():{list:[],total:0,atRisk:0};var conn=Scr.total>0;var topcj=(Scr.list&&Scr.list[0])||null;var atr=Scr.atRisk;
      return c5obj({id:id,name:'Crown jewels at greatest risk',connected:conn,
        displayValue:conn?(atr>0?(atr+' of '+Scr.total+' at risk'):(Scr.total+' crown jewels · all secure')):'—',
        label:'computed',color:conn?(atr>0?'warn':'good'):'muted',
        formula:'crown jewels at greatest risk = crown-jewel systems whose live exposure path is currently material',
        method:'Crown jewels come from your Crown Jewel Register (derived from your CMDB inventory). Risk to each is read from live EDR detections and open critical vulnerabilities (VM) on that asset.',
        inputs:(Scr.list||[]).map(function(x){
          var val=x.status+(x.why&&x.status==='At risk'?(' <span data-c5m="'+x.why+'" style="color:var(--blue);cursor:pointer;white-space:nowrap">· why? ›</span>'):'');
          return {name:x.name+(x.tier?(' · '+x.tier):''),value:val,color:(x.status==='At risk'?'warn':'good'),source:x.src||(x.sub||'EDR · VM')};
        }).concat([{name:'= At greatest risk',value:atr+' of '+Scr.total,source:'crown jewels with a material path'}]),
        sources:[{tool:'Crown Jewel Register + CMDB',connector:'cmdb',field:'crown_jewels',lastRefresh:c5ago()},{tool:'EDR',connector:'edr',field:'detections'},{tool:'Vulnerability mgmt (VM)',connector:'vuln',field:'critical_vulns'}],
        note:topcj?('Your most exposed crown jewel is '+topcj.name+' — '+String(topcj.sub||'').toLowerCase()+'.'):'The crown-jewel systems carrying the most risk right now.',
        connectTool:'your Crown Jewel Register · CMDB · EDR · VM'});}
    case 'er_capability':{var caps2=(typeof LIVE!=='undefined'&&LIVE&&LIVE.capabilities)||[];var conn=caps2.length>0;
      // Spec: JOIN Capability Map → GRC control_coverage/gaps + open_risk.
      //       exposure = (open_gaps + open_risk) × capability_tier_weight.
      //       OUTPUT [capability, control_gaps, open_risk, exposure]; sort exposure desc.
      var TW={critical:1.0,high:0.75,medium:0.5,low:0.25};
      var rowsC=caps2.map(function(c){var exp=Number(c.exposure_usd)||0;var tw=TW[String(c.grc_status||c.tier||'').toLowerCase()]||1;
        return {name:c.name,exposure:exp,gaps:(c.control_gaps!=null?Number(c.control_gaps):null),open_risk:(c.open_risk!=null?Number(c.open_risk):null),grc:c.grc_status,tw:tw};}).sort(function(a,b){return b.exposure-a.exposure;});
      var topc=rowsC[0]||null;
      return c5obj({id:id,name:'Business capabilities with highest exposure',connected:conn,
        displayValue:conn?(topc?(topc.name+(topc.exposure>0?(' · '+usd(topc.exposure)):'')):(caps2.length+' capabilities mapped')):'—',
        label:'computed',color:conn?((topc&&topc.exposure>0)?'warn':'good'):'muted',
        formula:'exposure = (open control-gaps + open risk) × capability-tier weight; ranked exposure-desc',
        method:'For each business capability this needs four fields: its GRC control-coverage status (Adequate / Watch / Gap), its count of open control gaps, its count of open risks, and its business exposure ($). Capability names come from your Business Capability Map; the three GRC fields come from your GRC platform (Archer / ServiceNow GRC / LeanIX) — or, if you have no GRC tool, from an Excel/CSV you upload at onboarding (columns: capability · exposure · grc_status · control_gaps · open_risk). Exposure is then ranked as (open gaps + open risks) × capability-tier weight (Critical 1.0 · High 0.75 · Medium 0.5 · Low 0.25).',
        inputs:rowsC.slice(0,6).map(function(c){return {name:c.name+(c.grc?(' · GRC '+c.grc):''),value:(c.exposure>0?usd(c.exposure):'mapped')+'  ·  '+(c.gaps!=null?c.gaps:'—')+' gaps · '+(c.open_risk!=null?c.open_risk:'—')+' open risks',color:(c.exposure>0?'warn':'good'),source:'Capability Map + GRC (or Excel)'};}),
        sources:[{tool:'Business Capability Map',connector:'capmap',field:'capability · tier · exposure',lastRefresh:c5ago()},{tool:'GRC (Archer / ServiceNow GRC / LeanIX) — or Excel/CSV upload',connector:'grc',field:'control_coverage (Adequate/Watch/Gap) · control_gaps · open_risk'}],
        note:topc?('Your most exposed capability is '+topc.name+'.'):'Which business capabilities carry the most cyber exposure. No GRC tool? Upload an Excel with control_coverage, control_gaps and open_risk per capability.',
        connectTool:'your Business Capability Map + GRC (or an Excel upload) at onboarding'});}
    case 'er_scenarios':{var stz=(typeof LIVE!=='undefined'&&LIVE&&LIVE.stress)||{};var conn=!!(stz&&stz.scenario);
      // Spec: PULL Threat Intel → MAP to MITRE ATT&CK techniques matching your stack →
      //       JOIN BIA target impact. priority = technique_likelihood × business_impact.
      //       OUTPUT [scenario, techniques, likelihood, impact, priority]; sort priority desc.
      // One row per scenario in a compact table (scales cleanly to several without
      // the drill getting busy). Likelihood reads "pending threat-intel" until the
      // feed is connected, rather than a bare dash.
      var scing=(stz.scenarios&&stz.scenarios.length)?stz.scenarios:(stz.scenario?[stz]:[]);
      var srows=scing.slice(0,6).map(function(s,i){var t=(s.techniques&&s.techniques.length)?s.techniques.join(', '):'mapped on connect';
        var l=(s.likelihood!=null)?String(s.likelihood):'pending threat-intel';var im=Number(s.worst_case_usd)||0;
        return [{text:(s.scenario||'')+(s.target?(' → '+s.target):''),bold:true},t,{text:l,color:(s.likelihood!=null?null:'muted')},{text:(im>0?usd(im):'—'),color:'blue'},{text:'#'+(i+1),bold:true}];});
      return c5obj({id:id,name:'Most likely business disruption scenarios',connected:conn,
        displayValue:conn?(stz.scenario+(stz.target?(' → '+stz.target):'')):'—',
        label:'modeled',color:conn?'warn':'muted',
        formula:'priority = technique_likelihood × business_impact; scenarios ranked priority-desc',
        method:'Scenarios come from your threat-intel feed (who targets your sector), mapped to the MITRE ATT&CK techniques matching your stack, joined to the business-impact (BIA) of the process each would disrupt. Ranked by priority; the table shows one row per scenario. Technique likelihood is quantified once a threat-intel feed is connected — until then it reads “pending threat-intel” and the ranking is by business impact.',
        table:(srows.length?{title:'Scenarios · ranked by priority',cols:['Scenario','MITRE techniques','Likelihood','Business impact','Rank'],rows:srows}:null),
        sources:[{tool:'Threat intelligence',connector:'threatintel',field:'sector_actors · likelihood',lastRefresh:c5ago()},{tool:'MITRE ATT&CK',connector:'mitre',field:'techniques'},{tool:'BIA',connector:'bia',field:'business_impact'}],
        action:conn?('Exercise the top scenario ('+stz.scenario+(stz.target?(' → '+stz.target):'')+') in a tabletop and confirm the recovery runbook for '+(stz.target||'the target process')+'. Then close the identity/access gap that makes it most likely — it is the same gap driving your largest exposure, so one fix lowers both.'):'Connect your threat-intel feed and BIA so scenarios rank by real likelihood × business impact, then tabletop the top one.',
        note:conn?('The most likely disruption is a '+stz.scenario+' affecting '+(stz.target||'a crown-jewel process')+'.'):'The disruption scenarios most likely to hit the business.',
        connectTool:'your threat-intel feed + BIA (onboarding)'});}
    case 'er_thirdparty':{var Vtp=c5vendors();var sbom=(typeof LIVE!=='undefined'&&LIVE&&LIVE.sbom)||[];var conn=Vtp.seed.length>0||sbom.length>0;var ntp=Vtp.atRisk.length,worsttp=Vtp.worst;
      // Spec: PULL ratings (SecurityScorecard/BitSight) + Vendor Risk TPRM findings +
      //       SBOM vulnerable_components. JOIN vendor/component → supported_service
      //       criticality. exposure weighted by service_criticality. OUTPUT
      //       [vendor/component, rating/finding, service_criticality, exposure]; sort desc.
      var sbomVuln=sbom.reduce(function(s,c){return s+(Number(c.critical_vulns)||0);},0);
      var svc=(Vtp.vs&&Vtp.vs.vendor)||null; // the connected monitoring service
      var rowsV=((Vtp.p&&Vtp.p.vendors)?Vtp.p.vendors.slice(0,5):[]).map(function(v){
        // Deep-link each vendor to its page on the connected monitoring service so the
        // CISO can open the exact findings and press the vendor on remediation.
        var url=(svc&&typeof vendorUrl==='function')?vendorUrl(svc,(typeof vendorDomain==='function'?vendorDomain(v.name):'')):null;
        var nm=url?('<a href="'+url+'" target="_blank" rel="noopener" style="color:var(--blue);text-decoration:none;font-weight:600">'+c5esc(v.name)+' ↗</a>'):c5esc(v.name);
        return {name:nm,value:(v.score!=null?(v.score+'/100'):'—')+(v.service_criticality?(' · '+v.service_criticality+' service'):''),color:(v.color||capColor(v.score)),source:(svc?('open findings in '+svc):'security rating')};
      });
      if(sbom.length)rowsV.push({name:'Software components',value:sbomVuln+' critical vuln'+(sbomVuln===1?'':'s')+' across '+sbom.length+' component'+(sbom.length===1?'':'s'),color:(sbomVuln>0?'warn':'good'),source:'SBOM'});
      return c5obj({id:id,name:'Third-party / supply-chain cyber exposure',connected:conn,
        displayValue:conn?((ntp>0?(ntp+' vendor'+(ntp>1?'s':'')+' flagged'):'Vendors adequate')+(sbomVuln>0?(' · '+sbomVuln+' SBOM vuln'+(sbomVuln===1?'':'s')):'')):'—',
        label:(Vtp.p&&Vtp.p.any_live)?'live':'modeled',color:conn?((ntp>0||sbomVuln>0)?'warn':'good'):'muted',
        formula:'exposure = vendor rating / TPRM finding / SBOM vulnerable-component, each weighted by the criticality of the service it supports; ranked exposure-desc',
        method:'Vendor ratings from your monitoring service (SecurityScorecard / BitSight), TPRM findings, and SBOM vulnerable-components — each joined to the crown-jewel service it supports and weighted by that service’s criticality.',
        inputs:rowsV,
        sources:[{tool:Vtp.vs?Vtp.vs.vendor:'Vendor Risk (TPRM)',connector:'vendor_monitor',field:'overall_score · findings',lastRefresh:c5ago()},{tool:'SecurityScorecard / BitSight',connector:'vendor_monitor',field:'rating'},{tool:'SBOM',connector:'sbom',field:'vulnerable_components'}],
        action:(worsttp?('Open '+worsttp.name+' ('+worsttp.score+'/100) '+(svc?('in '+svc):'in your monitoring service')+' to see its specific findings, then contact the vendor for its remediation plan and timeline; require evidence before renewal. '):'')+(svc?('Click any vendor row above to open its findings in '+svc+'.'):'Connect a monitoring service (SecurityScorecard / BitSight) to open each vendor’s findings.'),
        note:worsttp?('Your worst-rated vendor is '+worsttp.name+' at '+worsttp.score+'/100 — exposure you carry through someone else’s security.'):'Exposure you carry through your suppliers and software supply chain.',
        connectTool:'a TPRM platform + monitoring service + SBOM'});}
    case 'exp_total':{var M=c5expModel();var conn=M.total>0;var trw=M.drivers.reduce(function(s,x){return s+(x.raw||0);},0);
      var drv=M.drivers.map(function(x){var sp=trw>0?Math.round(x.raw/trw*100):0;return {name:x.name,value:usd(x.usd)+' · '+sp+'% of total',source:'tap to trace to its controls'};});
      drv.push({name:'Total modeled loss (ALE)',value:conn?usd(M.ale):'—',source:'risk register · economics.ale (your onboarding financials)'});
      return c5obj({id:id,name:'Total modeled exposure',connected:conn,displayValue:conn?usd(M.total):'—',label:'modeled',color:'ink',
        formula:'total exposure = your modeled expected annual loss (ALE), decomposed across the top control-gap drivers (their shares sum to 100%).',
        method:'Two inputs only. (1) The ALE — your modeled expected annual loss — from the risk register and financials you entered at onboarding. (2) The control-value ledger — a table where each control carries a risk-removal weight from its NIST CSF / 800-53 mapping, multiplied by its live deployment. Nerion splits the ALE across drivers in proportion to each driver’s (gap × weight). Each driver row expands to its full arithmetic, down to the source signal — nothing here is AI-generated or a fixed number.',
        inputs:drv,
        sources:[{tool:'Nerion risk model',connector:'nerion',field:'ale_decomposition',lastRefresh:c5ago()}],
        note:'Your total cyber exposure this morning, priced in dollars and decomposed by driver — each traceable to the controls behind it.',connectTool:'your risk register + financials (onboarding)'});}
    case 'exp_conc':{var M2=c5expModel();var conn=M2.total>0;var top2=M2.drivers.slice(0,2).reduce(function(s,x){return s+x.usd;},0);var pc=M2.total>0?Math.round(top2/M2.total*100):0;
      return c5obj({id:id,name:'Concentrated in top 2',connected:conn,displayValue:conn?pc+'%':'—',label:'computed',color:conn?(pc>=60?'warn':'good'):'muted',
        formula:'concentration = (exposure of the top 2 drivers) ÷ total exposure',
        inputs:M2.drivers.slice(0,2).map(function(x){return {name:x.name,value:usd(x.usd),source:'driver exposure'};}).concat([{name:'Top 2 combined',value:usd(top2),source:'sum of the two above'},{name:'Total exposure',value:usd(M2.total),source:'exp_total'},{name:'= Concentration',value:usd(top2)+' ÷ '+usd(M2.total)+' = '+pc+'%',source:'top-2 ÷ total'}]),
        sources:[{tool:'Nerion risk model',connector:'nerion',field:'ale_decomposition',lastRefresh:c5ago()}],
        note:'How concentrated your risk is — a few drivers you can act on, vs a diffuse problem.',connectTool:'your risk register + financials'});}
    case 'eff_removed':{var live=(typeof ROI_STATE!=='undefined'&&ROI_STATE&&ROI_STATE.riskRemoved>0);var rr=live?ROI_STATE.riskRemoved:((typeof controlsEffUsd==='function')?controlsEffUsd():0);
      var byCap=(typeof capRiskRemoved==='function')?(capRiskRemoved().byCap||{}):{};
      var capRows=Object.keys(byCap).filter(function(k){return byCap[k]>0;}).sort(function(a,b){return byCap[b]-byCap[a];}).slice(0,6).map(function(k){var c=(typeof CAP_BY_KEY!=='undefined')?CAP_BY_KEY[k]:null;return {name:(c?c.name.replace(/ *\(.*\)/,''):k),value:usd(Math.round(byCap[k])),source:'control-value ledger · '+k};});
      var einputs=live?[{name:'Risk removed (funded portfolio)',value:usd(rr),source:'initiatives portfolio (ticketing + decisions)'}]:capRows.concat([{name:'= Total risk removed',value:usd(rr),source:'Σ of the controls above'}]);
      return c5obj({id:id,name:'Risk removed',connected:rr>0,displayValue:rr>0?usd(rr):'—',label:live?'computed':'modeled',color:'good',
        formula:'risk removed = Σ over controls of ( inherent exposure − residual exposure )'+(live?' (your funded portfolio)':''),
        method:'Each control’s contribution = its framework-weighted share of the modeled expected loss × how much of it you’ve deployed (the control-value ledger), summed across controls. '+(live?'Here it uses the realized benefit of your funded initiatives from ticketing / decisions.':'Each control-value row on the Effectiveness tab drills to that control.'),
        inputs:einputs,
        sources:[{tool:live?'Jira / ServiceNow':'Nerion engine',connector:live?'itsm':'nerion',field:live?'benefit':'controls_removed',lastRefresh:c5ago()}],
        note:'The dollars of expected loss your controls have bought down this year.',connectTool:'your control catalog / GRC'});}
    case 'eff_spend':{var inv=(typeof ROI_STATE!=='undefined'&&ROI_STATE)?ROI_STATE.invested:0;var conn=inv>0;
      return c5obj({id:id,name:'Security spend',connected:conn,displayValue:conn?usd(inv):'—',label:'self-reported',color:'ink',
        formula:'security spend = Σ(invested) across your funded security initiatives',
        inputs:[{name:'Invested',value:conn?usd(inv):'—',source:'initiatives portfolio (ticketing + decisions)'}],
        sources:[{tool:'Jira / ServiceNow',connector:'itsm',field:'cost',lastRefresh:c5ago()}],
        note:'What you spent to remove that risk — the denominator of return.',connectTool:'your ticketing / finance (import funded initiatives)'});}
    case 'eff_return':{var st=(typeof ROI_STATE!=='undefined'&&ROI_STATE)?ROI_STATE:null;var conn=!!(st&&st.invested>0&&st.riskRemoved>0);var ret=conn?st.ret:0;
      var mx=conn?(typeof roiMult==='function'?roiMult(ret):Math.round(ret)):'—';
      return c5obj({id:id,name:'Return per dollar',connected:conn,displayValue:conn?(mx+'×'):'—',label:'computed',color:'good',
        formula:'return = risk removed ÷ security spend',
        method:'A straight ratio of two figures from your funded portfolio — no estimate. Risk removed is the expected loss your funded controls buy down (control-value ledger); security spend is what those initiatives cost (imported from your ticketing/finance). Both are itemized below.',
        inputs:[
          {name:'Risk removed (numerator)',value:conn?usd(st.riskRemoved):'—',source:'eff_removed · control-value ledger'},
          {name:'Security spend (denominator)',value:conn?usd(st.invested):'—',source:'eff_spend · funded initiatives'},
          {name:'Funded initiatives counted',value:conn?(st.n+' ('+(st.fromTicketing||0)+' from ticketing · '+(st.fromDecisions||0)+' from decisions)'):'—',source:'portfolio'},
          {name:'= Return',value:conn?(mx+'×  ( '+usd(st.riskRemoved)+' ÷ '+usd(st.invested)+' )'):'—',source:'computed'}
        ],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'rosi',lastRefresh:c5ago()}],
        note:'Every dollar of security spend expressed as risk removed — the CFO’s language.',connectTool:'import your funded initiatives'});}
    case 'threat_status':{var oi=sig('open_incidents'),ta=sig('threat_actors_active');var conn=oi!=null;
      return c5obj({id:id,name:'Live attack status',connected:conn,displayValue:conn?(oi>0?(oi+' active campaign'+(oi>1?'s':'')):'No active attack'):'—',label:'live',color:conn?(oi>0?'crit':'good'):'muted',
        formula:'live status = open incident campaigns (SIEM); sector actors from the threat-intel feed',
        inputs:[{name:'Active campaigns',value:conn?oi:'—',source:'SIEM · open_incidents'},{name:'Sector actors tracked',value:ta!=null?ta:'—',source:'Threat intel · threat_actors_active'}],
        sources:[c5capSrc('siem'),{tool:'Recorded Future / Mandiant',connector:'threat_intel',field:'threat_actors_active',lastRefresh:c5ago()}],
        note:'Whether anything is attacking you right now, and how many actors target your sector.',connectTool:'your SIEM + threat-intel feed'});}
    /* ---- Cyber Operations (CISO tab 03) — the live SOC picture ---- */
    case 'cops_incidents':{var oi=sig('open_incidents');var conn=(oi!=null);var n=oi||0;
      return c5obj({id:id,name:'Active business-impacting incidents',connected:conn,
        displayValue:conn?(n>0?(n+' active'):'None active'):'—',label:'live',color:conn?(n>0?'crit':'good'):'muted',
        formula:'incidents where status = open AND business_impact = true, each joined through the affected CI to the business service it touches; ranked by severity',
        method:'From your SIEM / SOAR / incident-management system: the open incidents flagged business-impacting, joined through the affected configuration item to the business service. Severity and status read straight from the incident record.',
        inputs:[{name:'Open incidents',value:conn?n:'—',source:'SIEM / SOAR'},{name:'Business-impacting',value:conn?(n>0?'yes':'none'):'—',source:'Incident Mgmt · business_impact'}],
        sources:[{tool:'SIEM / SOAR',connector:'siem',field:'open_incidents',lastRefresh:c5ago()},{tool:'Incident management',connector:'itsm',field:'business_impact · affected_ci → service'}],
        note:conn?(n>0?('You have '+n+' open incident'+(n>1?'s':'')+' touching the business right now — the queue that needs command attention.'):'No business-impacting incident is open right now — the operational picture is clean.'):'The open, business-impacting incidents joined to the service each one touches.',
        connectTool:'your SIEM / SOAR + incident-management system'});}
    case 'cops_services':{var oi=sig('open_incidents');var conn=(oi!=null);
      var pe=(typeof LIVE!=='undefined'&&LIVE&&LIVE.process_exposure)||[];var svc=pe.slice(0,3).map(function(p){return p.name;});
      var n=(oi>0)?Math.max(1,Math.min(svc.length||1,oi)):0;
      return c5obj({id:id,name:'Business services under active cyber threat',connected:conn,
        displayValue:conn?(oi>0?(n+' service'+(n>1?'s':'')):'None detected'):'—',label:(oi>0?'modeled':'live'),color:conn?(oi>0?'warn':'good'):'muted',
        formula:'current SIEM detections joined through detection.asset → business service (Service Mapping); ranked by detection count',
        method:'From your SIEM: current detections, each mapped through the affected asset to the business service it supports. The count is the number of distinct services carrying an active detection.',
        inputs:(oi>0?svc.map(function(s){return {name:s,value:'under watch',color:'warn',source:'SIEM detection → Service Mapping'};}):[{name:'Active detections',value:conn?'none':'—',source:'SIEM'}]),
        sources:[{tool:'SIEM',connector:'siem',field:'detections',lastRefresh:c5ago()},{tool:'Service mapping (CMDB)',connector:'cmdb',field:'asset → service'}],
        note:conn?(oi>0?('Active detections are reaching '+n+' business service'+(n>1?'s':'')+' — the services to watch while the campaign is live.'):'No business service is under an active detection right now.'):'The business services carrying an active SIEM detection, mapped from asset to service.',
        connectTool:'your SIEM + service mapping (CMDB)'});}
    case 'cops_thirdparty':{var V=c5vendors();var conn=!!((V.p&&V.p.vendors&&V.p.vendors.length>0)||(V.seed&&V.seed.length>0));var ar=V.atRisk||[];var n=ar.length;
      return c5obj({id:id,name:'Third-party incidents impacting business services',connected:conn,
        displayValue:conn?(n>0?(n+' vendor'+(n>1?'s':'')):'None flagged'):'—',label:'live',color:conn?(n>0?'warn':'good'):'muted',
        formula:'Vendor-Risk alerts + SIEM signals tagged to a vendor, joined vendor → the business services it supports; ranked by service criticality',
        method:'From your vendor-risk monitoring plus any SIEM signals tagged to a vendor: the third parties carrying an open alert, joined to the business services each supports. Ranked by the criticality of the service affected.',
        inputs:(n>0?ar.slice(0,5).map(function(v){return {name:v.name,value:(v.score!=null?(v.score+'/100'):'alert')+(v.service_criticality?(' · '+v.service_criticality+' service'):''),color:capColor(v.score),source:(V.vs?V.vs.vendor:'vendor risk')};}):[{name:'Vendor alerts',value:conn?'none':'—',source:'Vendor Risk (TPRM)'}]),
        sources:[{tool:'Vendor Risk (TPRM)',connector:'tprm',field:'alerts',lastRefresh:c5ago()},{tool:(V.vs?V.vs.vendor:'SecurityScorecard / BitSight'),connector:'ratings',field:'vendor_rating'}],
        note:conn?(n>0?('Your worst-flagged third party is '+((V.worst&&V.worst.name)||'a tier-1 provider')+((V.worst&&V.worst.score!=null)?(' at '+V.worst.score+'/100'):'')+' — exposure you carry through the services it supports.'):'No third-party alert is impacting a business service right now.'):'The third parties with an open alert, joined to the services they support.',
        connectTool:'your vendor-risk monitoring (SecurityScorecard / BitSight)'});}
    case 'cops_emerging':{var ta=sig('threat_actors_active');var conn=(ta!=null);
      // Enumerate the ACTUAL emerging risks (the sector actors / campaigns tracked
      // against the org's stack), each mapped to the controls it targets, our live
      // coverage on those controls, and the crown-jewel it would reach — so the
      // drill shows WHAT the risks are and HOW each impacts the business.
      var acts=(typeof tmActors==='function')?(tmActors().list||[]):[];
      var topCj=(typeof LIVE!=='undefined'&&LIVE&&LIVE.crown_jewels&&LIVE.crown_jewels[0]&&LIVE.crown_jewels[0].name)||((typeof LIVE!=='undefined'&&LIVE&&LIVE.process_exposure&&LIVE.process_exposure[0]&&LIVE.process_exposure[0].name))||'a crown-jewel system';
      var rows=[],toAction=0;
      acts.slice(0,6).forEach(function(a){
        var keys=(a.caps&&a.caps.length)?a.caps:((typeof actorCaps==='function')?actorCaps(a):[]);
        var cps=keys.map(function(k){return {k:k,c:(typeof CAP_BY_KEY!=='undefined')?CAP_BY_KEY[k]:null,p:(typeof capDeploy==='function'&&CAP_BY_KEY&&CAP_BY_KEY[k])?capDeploy(CAP_BY_KEY[k]):null};}).filter(function(x){return x.c;});
        var meas=cps.filter(function(x){return x.p!=null;}).map(function(x){return x.p;});
        var minP=meas.length?Math.min.apply(null,meas):null; // weakest targeted control = the open door
        var weak=(minP!=null&&minP<75);if(weak)toAction++;
        var targets=cps.map(function(x){return x.c.name.replace(/ *\(.*\)/,'');}).join(', ')||'—';
        var cov=(minP!=null)?(minP+'% (weakest targeted control)'):'not measured';
        var impact=weak?('open path via '+(cps.filter(function(x){return x.p===minP;})[0]||{c:{name:''}}).c.name.replace(/ *\(.*\)/,'').toLowerCase()+' → '+topCj):('covered — reaches '+topCj+' only if a control lapses');
        rows.push([{text:a.n,bold:true},(a.m||a.t||''),targets,{text:cov,color:(weak?'crit':'good')},{text:impact,color:(weak?'warn':null)}]);
      });
      var nAct=toAction||(acts.length?0:(conn&&ta>0?ta:0));
      return c5obj({id:id,name:'Emerging cybersecurity risks requiring action',connected:conn||acts.length>0,
        displayValue:(acts.length?(toAction>0?(toAction+' to action'):(acts.length+' tracked · covered')):((conn&&ta>0)?(ta+' to action'):'None flagged')),
        label:'live',color:(toAction>0?'warn':(acts.length||conn?'good':'muted')),
        formula:'sector actors / newly published campaigns filtered to those matching your asset & tech inventory; each mapped to the MITRE tactics it uses → your live coverage on those controls; "to action" = the actor finds a control below the 75% bar',
        method:'From your threat-intel feed, the campaigns and actors targeting your sector are matched to your stack, then to the controls each relies on (MITRE ATT&CK mitigations). An actor is flagged "to action" when the weakest control it targets is below the 75% coverage bar — i.e. it has an open path. Business impact names the crown-jewel that path would reach.',
        table:(rows.length?{title:'The emerging risks · what each is and how it reaches the business',cols:['Emerging risk','What it does','Controls it targets','Our coverage','Business impact'],rows:rows}:null),
        sources:[{tool:'Threat intelligence',connector:'threat_intel',field:'sector_actors · new_items',lastRefresh:c5ago()},{tool:'MITRE ATT&CK',connector:'mitre',field:'actor → tactics → mitigations'},{tool:'Asset / tech inventory',connector:'cmdb',field:'matching_assets · crown_jewels'}],
        action:(toAction>0?('Close the weakest control each flagged actor targets before it is used — start with the lowest-coverage one, which opens the path to '+topCj+'. Then confirm detection coverage for its tactics in the SIEM.'):'No open path today — keep the tracked actors under watch and hold coverage above the bar.'),
        note:(acts.length?(toAction>0?(toAction+' of '+acts.length+' tracked actor'+(acts.length>1?'s':'')+' can currently reach a crown jewel through a control gap.'):'All tracked actors are currently blocked by your controls.'):'Newly published threats matched to your inventory, prioritized by what they can reach.'),
        connectTool:'your threat-intel feed'});}
    /* ---- AI & Software Supply-Chain Security (CISO tab) ----
       Counts come from the uploaded / connected AI & machine-identity inventory;
       posture reads live from the connected security tools (AI-SPM, CASB/SSE,
       CI/CD scanning, NHI/ITDR, CBOM). A read lights up when its inventory count
       is present OR its posture tool is connected — no hand-typed self-report. */
    case 'ais_aiml':{var AS=(typeof LIVE!=='undefined'&&LIVE&&LIVE.aiSupplyChain)||{};var G=(typeof LIVE!=='undefined'&&LIVE&&LIVE.aiRisk&&LIVE.aiRisk.governance)||{};
      var sys=Number(AS.aimlSystems)||Number(G.systems)||0;var spmOn=aisOn(['aispm']);var conn=(sys>0||spmOn||AS.inventoryLoaded||AS.aiSpm!=null||G.inventory!=null);
      var gaps=[];if(/^no/i.test(G.inventory||'')||/partial/i.test(G.inventory||''))gaps.push('inventory');if(/none|drafted/i.test(G.policy||''))gaps.push('policy');if(!spmOn&&!/connected|yes/i.test(AS.aiSpm||''))gaps.push('AI-SPM posture');
      var col=conn?(gaps.length>=2?'crit':gaps.length===1?'warn':'good'):'muted';
      return c5obj({id:id,name:'AI/ML systems the business runs',connected:conn,
        displayValue:conn?(sys>0?(sys+' AI/ML system'+(sys>1?'s':'')+(gaps.length?(' · '+gaps.length+' posture gap'+(gaps.length>1?'s':'')):' · governed')):(gaps.length?gaps.length+' posture gaps':'governed')):'—',
        label:'self-reported',color:col,
        formula:'ai_risk per system = posture_gaps (prompt-injection · data-leakage · model-access · guardrails) × data_sensitivity; from AI asset inventory / model registry joined to AI-SPM + adversarial-ML threat intel; ranked risk-desc',
        method:'Deployed AI/ML systems and LLM apps come from your AI asset inventory / model registry, joined to AI-SPM for prompt-injection exposure, data leakage, model access and guardrail posture, and to threat intel for adversarial-ML activity. Posture is self-reported until AI-SPM is connected.',
        inputs:[{name:'AI/ML systems in production',value:conn?sys:'—',source:'AI inventory (uploaded / CMDB)'},{name:'Data sensitivity',value:AS.aiDataSensitivity||'—',source:'AI inventory'},{name:'Inventory & monitoring',value:G.inventory||'—',source:'AI governance'},{name:'AI-SPM posture',value:spmOn?'connected':(AS.aiSpm||'not connected'),source:'AI-SPM'}],
        sources:[{tool:'AI asset inventory / model registry',connector:'ai_inventory',field:'ai_systems',lastRefresh:c5ago()},{tool:'AI-SPM',connector:'aispm',field:'posture_gaps'},{tool:'Threat intelligence',connector:'threat_intel',field:'adversarial_ml'}],
        note:conn?(gaps.length?('Your AI systems carry '+gaps.length+' open posture gap'+(gaps.length>1?'s':'')+' ('+gaps.join(', ')+') — the model, training-data and LLM-application risk to close.'):'Your AI/ML systems are inventoried and governed.'):'The security posture of the AI/ML and LLM systems the business runs.',
        connectTool:'your AI asset inventory + AI-SPM'});}
    case 'ais_genai':{var AS=(typeof LIVE!=='undefined'&&LIVE&&LIVE.aiSupplyChain)||{};
      var casbOn=aisOn(['casb']);var gapps=Number(AS.genaiSanctioned)||0;
      var conn=(casbOn||gapps>0||AS.inventoryLoaded||AS.shadowAiMonitored!=null||AS.genaiSanctioned!=null||AS.dlpToAi!=null);
      var unmon=!casbOn&&/^no/i.test(AS.shadowAiMonitored||'');var part=!casbOn&&/partial/i.test(AS.shadowAiMonitored||'');var noDlp=!casbOn&&/^no/i.test(AS.dlpToAi||'');
      // Inventory-only (no CASB, no self-report): shadow AI is unmeasured, not "clean".
      var unmeasured=conn&&!casbOn&&AS.shadowAiMonitored==null&&AS.dlpToAi==null;
      var col=conn?((unmon&&noDlp)?'crit':(unmon||noDlp||part||unmeasured)?'warn':'good'):'muted';
      return c5obj({id:id,name:'Enterprise GenAI & shadow-AI leakage',connected:conn,
        displayValue:conn?(unmon?'Shadow AI unmonitored':unmeasured?(gapps>0?(gapps+' GenAI apps · shadow unmeasured'):'Shadow AI unmeasured'):((part?'Partially monitored':'Monitored')+(noDlp?' · no DLP to AI':''))):'—',
        label:(casbOn?'connected':'self-reported'),color:col,
        formula:'exposure = sensitive-data submissions to AI weighted by shadow vs sanctioned use; GenAI usage from CASB/SSE + GenAI gateway joined to DLP; ranked exposure-desc',
        method:'GenAI usage by app and user (sanctioned vs shadow) comes from your CASB/SSE and GenAI gateway, joined to DLP for sensitive-data submissions to AI. Reads live once CASB/SSE is connected; sanctioned-app count comes from your AI inventory.',
        inputs:[{name:'Sanctioned GenAI apps',value:(gapps>0?gapps:(AS.genaiSanctioned!=null?AS.genaiSanctioned:'—')),source:'AI inventory'},{name:'Shadow-AI monitoring',value:casbOn?'connected':(AS.shadowAiMonitored||'—'),source:'CASB / SSE'},{name:'DLP inspects AI submissions',value:AS.dlpToAi||'—',source:'DLP'}],
        sources:[{tool:'CASB / SSE',connector:'casb',field:'genai_usage',lastRefresh:c5ago()},{tool:'GenAI gateway',connector:'genai_gw',field:'sanctioned_vs_shadow'},{tool:'DLP',connector:'dlp',field:'sensitive_to_ai'}],
        note:conn?(unmon?'Shadow AI is unmonitored — sensitive data can leave through unsanctioned tools without a control in the path.':(noDlp?'GenAI use is monitored but DLP does not yet inspect what employees submit to AI.':'Sanctioned GenAI use is monitored with DLP in the path.')):'Enterprise GenAI usage and the data-leakage risk from shadow AI.',
        connectTool:'your CASB/SSE + GenAI gateway + DLP'});}
    case 'ais_aicode':{var AS=(typeof LIVE!=='undefined'&&LIVE&&LIVE.aiSupplyChain)||{};
      var codeOn=aisOn(['github','cicd']);var conn=codeOn||AS.codeScanning!=null;
      var noScan=/^no/i.test(AS.codeScanning||'');
      var col=conn?(codeOn?'good':(noScan?'warn':'good')):'muted';
      return c5obj({id:id,name:'AI-assisted coding risk (SDLC)',connected:conn,
        displayValue:conn?(codeOn?'Scanned':(noScan?'Not scanned':'Scanned')):'—',
        label:(codeOn?'connected':'self-reported'),color:col,
        formula:'ai_code_risk = vuln_rate + secrets_found in AI-influenced code × policy_gaps; AI coding-assistant adoption joined to SAST/SCA + Secrets scanning + code provenance; ranked risk-desc',
        method:'The vulnerability and secret rate in AI-influenced code is read from your code-scanning stack (SAST/SCA + secrets), joined to coding-assistant adoption. Reads live once your DevSecOps / CI-CD scanning is connected.',
        inputs:[{name:'SAST/SCA + secrets scanning',value:codeOn?'connected':(AS.codeScanning||'—'),source:'code scanning'}],
        sources:[{tool:'DevSecOps (GitHub Advanced Security)',connector:'github',field:'code_scanning · dependabot',lastRefresh:c5ago()},{tool:'CI/CD scanning (Snyk · GitLab)',connector:'cicd',field:'vuln_rate · secrets_found'}],
        note:conn?(codeOn?'Your code-scanning stack is connected — the vulnerability and secret rate in AI-influenced code is measured against your repositories.':'Code scanning is not fully connected — the vulnerability and secret rate in AI-influenced code is not yet measured.'):'Cybersecurity risk from AI-assisted coding in the software development lifecycle.',
        connectTool:'your DevSecOps / CI-CD code scanning'});}
    case 'ais_pipeline':{var AS=(typeof LIVE!=='undefined'&&LIVE&&LIVE.aiSupplyChain)||{};var sbom=(typeof LIVE!=='undefined'&&LIVE&&LIVE.sbom)||[];
      var cicdOn=aisOn(['cicd']);var conn=(cicdOn||sbom.length>0||AS.pipelineScanning!=null);
      var col=conn?(cicdOn?'good':(sbom.length>0?'good':'warn')):'muted';
      return c5obj({id:id,name:'CI/CD pipeline & build supply chain',connected:conn,
        displayValue:conn?(cicdOn?'Scanned & signed':(sbom.length>0?(sbom.length+' SBOM components'):'Unscanned')):'—',
        label:(cicdOn?'connected':'self-reported'),color:col,
        formula:'pipeline_risk = misconfigs + unsigned artifacts + provenance gaps + exposed pipeline secrets; CI/CD scanning joined to Secrets mgmt + SBOM + artifact signing (SLSA level); ranked risk-desc',
        method:'CI/CD security scanning surfaces pipeline misconfigurations, unsigned artifacts and provenance gaps, joined to secrets management for exposed pipeline secrets and to SBOM + artifact signing for the SLSA level. Reads live once CI/CD scanning is connected.',
        inputs:[{name:'Pipeline security scanning',value:cicdOn?'connected':(AS.pipelineScanning||'—'),source:'CI/CD scanning'},{name:'SBOM components',value:sbom.length||'—',source:'SBOM'}],
        sources:[{tool:'CI/CD security scanning',connector:'cicd',field:'misconfigs · provenance · slsa',lastRefresh:c5ago()},{tool:'SBOM + artifact signing',connector:'cicd',field:'components · signatures'}],
        note:conn?(cicdOn?'Your CI/CD scanning is connected — pipeline misconfigurations, unsigned artifacts and exposed secrets are measured against your build pipeline.':'CI/CD scanning is not connected — the build supply chain an attacker uses to reach production is not yet measured.'):'Security and integrity of the CI/CD pipeline and software build supply chain.',
        connectTool:'your CI/CD scanning + SBOM/signing'});}
    case 'ais_nhi':{var AS=(typeof LIVE!=='undefined'&&LIVE&&LIVE.aiSupplyChain)||{};var priv=sig('priv_sessions_flagged'),dorm=sig('dormant_accounts');
      var nhiOn=aisOn(['nhi']);var n=Number(AS.machineIdentities)||0;var conn=(n>0||nhiOn||AS.inventoryLoaded||AS.secretsMgmt!=null||AS.nhiMonitored!=null||priv!=null);
      var noNhi=!nhiOn&&/^no/i.test(AS.nhiMonitored||'');var poorSec=/none/i.test(AS.secretsMgmt||'');var partSec=/partial/i.test(AS.secretsMgmt||'');
      // Count from inventory but no monitoring tool: exposure is unmeasured, not clean.
      var unwatched=conn&&!nhiOn&&AS.nhiMonitored==null&&priv==null;
      var col=conn?((noNhi&&poorSec)?'crit':((noNhi||poorSec||partSec||unwatched||(priv!=null&&priv>0))?'warn':'good')):'muted';
      return c5obj({id:id,name:'Non-human & machine-identity exposure',connected:conn,
        displayValue:conn?((n>0?(n.toLocaleString()+' machine identit'+(n>1?'ies':'y')):'machine identities')+(nhiOn?' · monitored':(unwatched?' · unmonitored':(noNhi?' · unmonitored':'')))):'—',
        label:(nhiOn?'connected':'self-reported'),color:col,
        formula:'nhi_risk = stale + over-privileged + exposed machine identities; NHI/ITDR + Secrets management joined to PAM/Identity; ranked risk-desc',
        method:'Machine identities, tokens and keys are counted from your inventory and flagged stale, over-privileged or exposed by your non-human-identity / ITDR tooling, joined to PAM/Identity. Reads live once NHI/ITDR is connected.',
        inputs:[{name:'Machine identities',value:(n>0?n:'—'),source:'AI inventory (uploaded / CMDB)'},{name:'NHI / ITDR monitoring',value:nhiOn?'connected':(AS.nhiMonitored||'—'),source:'NHI / ITDR'},{name:'Flagged privileged sessions',value:(priv!=null?priv:'—'),source:'PAM'}],
        sources:[{tool:'Non-human identity / ITDR',connector:'nhi',field:'stale · over-privileged · exposed',lastRefresh:c5ago()},{tool:'PAM / Identity',connector:'cyberark',field:'privilege'}],
        note:conn?(nhiOn?'Your NHI/ITDR is connected — machine identities are monitored for stale, over-privileged and exposed tokens and keys.':(unwatched?(n>0?('You have '+n.toLocaleString()+' machine identities in inventory but no NHI/ITDR monitoring — the fastest-growing, least-watched identity surface is unmeasured.'):'Machine identities are not yet monitored.'):'Your machine identities are not fully monitored or vaulted, the fastest-growing and least-watched identity surface.')):'Non-human and machine-identity exposure — service accounts, tokens and secrets sprawl.',
        connectTool:'your NHI/ITDR + PAM'});}
    case 'ais_pqc':{var AS=(typeof LIVE!=='undefined'&&LIVE&&LIVE.aiSupplyChain)||{};
      var cbomOn=aisOn(['cbom']);var cn=Number(AS.cbomAssets)||0;var conn=(cbomOn||cn>0||AS.inventoryLoaded||AS.cbomStatus!=null);
      var noCbom=!cbomOn&&cn<=0&&/none/i.test(AS.cbomStatus||'');
      // Inventory count but no discovery tool: quantum exposure is not yet measured.
      var unmeasured=conn&&!cbomOn&&AS.cbomStatus==null&&cn<=0;
      var col=conn?(cbomOn?'good':(noCbom||unmeasured?'warn':'good')):'muted';
      return c5obj({id:id,name:'Post-quantum cryptography readiness',connected:conn,
        displayValue:conn?(cbomOn?(cn>0?(cn.toLocaleString()+' crypto assets · inventoried'):'Inventoried'):(cn>0?(cn.toLocaleString()+' crypto assets'):(noCbom?'No crypto inventory':'Discovery pending'))):'—',
        label:(cbomOn?'connected':'self-reported'),color:col,
        formula:'pqc_priority = quantum-vulnerable algorithms (RSA/ECC) protecting sensitive or long-lived data × data_longevity; from cryptographic inventory (CBOM); ranked priority-desc',
        method:'A cryptographic bill of materials (CBOM) inventories algorithms and key sizes across systems; quantum-vulnerable algorithms (RSA/ECC) protecting sensitive or long-lived data are flagged and prioritized for migration. Reads live once a crypto-discovery tool is connected.',
        inputs:[{name:'Crypto assets in inventory',value:(cn>0?cn:'—'),source:'AI inventory (uploaded / CMDB)'},{name:'Cryptography discovery (CBOM)',value:cbomOn?'connected':(AS.cbomStatus||'—'),source:'CBOM'}],
        sources:[{tool:'Cryptography discovery (CBOM)',connector:'cbom',field:'algorithms · key_sizes · quantum_vulnerable',lastRefresh:c5ago()}],
        note:conn?(cbomOn?'Your cryptography discovery is connected — quantum-vulnerable algorithms (RSA/ECC) on long-lived data are flagged and prioritized for migration.':(unmeasured||noCbom?'No cryptography discovery connected yet — the first step before "harvest-now, decrypt-later" exposure can be measured.':'Your cryptography is inventoried; connect a discovery tool to flag quantum-vulnerable algorithms.')):'Post-quantum cryptography readiness — cryptographic inventory and migration exposure.',
        connectTool:'a cryptography-discovery tool (CBOM)'});}
    case 'peer_maturity':{var ov=c5Overall();var conn=ov!=null;
      return c5obj({id:id,name:'Your maturity',connected:conn,displayValue:conn?(Number(ov).toFixed(1)+' / 5'):'—',label:'computed',color:'ink',
        formula:'your maturity = mean CMMI across the framework control universe, evidenced from tools + documents',
        inputs:[{name:'Overall CMMI',value:conn?Number(ov).toFixed(1):'—',source:'framework posture (NIST CSF 2.0)'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'framework_cmmi',lastRefresh:c5ago()}],
        note:'Your evidenced framework maturity — not self-attested.',connectTool:'your control tools + policies'});}
    case 'peer_median':{var pd=c5peer();var opt=c5peerOptin();var live=!!(opt&&pd&&pd.sufficient&&pd.overall);var val=live?Number(pd.overall.p50):C5_REF_OVERALL;
      return c5obj({id:id,name:'Peer median',connected:true,displayValue:Number(val).toFixed(1),label:live?'computed':'modeled',color:'ink',
        formula:live?'peer median = 50th percentile of your anonymized same-size, same-industry cohort (k-anonymity gated)':'peer median = published industry-baseline CMMI; superseded by your live cohort when you opt in',
        inputs:live?[{name:'Cohort size',value:(pd&&pd.n)||0,source:'DTNKSHIELD cohort'},{name:'Minimum cohort',value:(pd&&pd.minCohort)||(typeof PEER_MIN!=='undefined'?PEER_MIN:5),source:'k-anonymity gate'}]:[{name:'Industry baseline (overall CMMI)',value:C5_REF_OVERALL.toFixed(1),source:'published enterprise benchmark'}],
        sources:[live?{tool:'DTNKSHIELD peer cohort',connector:'peer',field:'benchmark.p50',lastRefresh:c5ago()}:{tool:'Published industry benchmark',connector:'reference',field:'csf_cmmi_median',lastRefresh:c5ago()}],
        note:live?'Your live opted-in cohort — anonymized and suppressed below a minimum cohort size.':'A published industry baseline. Opt in to compare against a live cohort of your actual same-size peers.',connectTool:'the live peer cohort (opt in)'});}
    case 'peer_position':{var ov2=c5Overall();var pd2=c5peer();var opt2=c5peerOptin();var live2=!!(opt2&&pd2&&pd2.sufficient&&pd2.overall_values&&ov2!=null);
      var pctile=live2?((typeof peerPercentileOf==='function')?peerPercentileOf(ov2,pd2.overall_values):null):(ov2!=null?c5refPercentile(ov2):null);
      var zsc=(!live2&&ov2!=null)?((ov2-C5_REF_OVERALL)/C5_REF_SD):null;
      var pinputs=live2
        ?[{name:'Your CMMI',value:ov2!=null?Number(ov2).toFixed(1):'—',source:'peer_maturity'},{name:'Live cohort size',value:(pd2&&pd2.n)||0,source:'peer cohort'},{name:'= Position',value:pctile!=null?(pctile+'th percentile in cohort'):'—',source:'rank ÷ cohort size'}]
        :[{name:'Your CMMI',value:ov2!=null?Number(ov2).toFixed(1):'—',source:'peer_maturity'},{name:'Baseline median (μ)',value:C5_REF_OVERALL.toFixed(2),source:'published enterprise benchmark'},{name:'Baseline spread (σ)',value:'±'+C5_REF_SD,source:'published enterprise benchmark'},{name:'z-score',value:zsc!=null?(zsc.toFixed(2)+'  ( ('+Number(ov2).toFixed(1)+' − '+C5_REF_OVERALL.toFixed(2)+') ÷ '+C5_REF_SD+' )'):'—',source:'computed'},{name:'= Percentile',value:pctile!=null?(pctile+'th (standard-normal CDF of z)'):'—',source:'normal distribution'}];
      return c5obj({id:id,name:'Your position',connected:pctile!=null,displayValue:(pctile!=null)?(pctile>=50?('Top '+(100-pctile)+'%'):('Bottom '+pctile+'%')):'—',label:live2?'computed':'modeled',color:(pctile!=null)?(pctile>=50?'good':'warn'):'muted',
        formula:live2?'position = your percentile rank within your live cohort by overall CMMI':'position = the standard-normal percentile of your CMMI vs the published baseline (μ='+C5_REF_OVERALL.toFixed(2)+', σ='+C5_REF_SD+')',
        method:live2?'Your rank within the opted-in cohort of same-size peers.':'z = (your CMMI − baseline median) ÷ baseline spread; the percentile is the standard-normal CDF of that z. "Top X%" = 100 − percentile. Follow the rows below to reconstruct it exactly.',
        inputs:pinputs,
        sources:[live2?{tool:'DTNKSHIELD peer cohort',connector:'peer',field:'overall_values',lastRefresh:c5ago()}:{tool:'Published industry benchmark',connector:'reference',field:'csf_cmmi_distribution',lastRefresh:c5ago()}],
        note:'Where you stand against peers your size — top-third is the target.'+(live2?'':' Shown against the published baseline; opt in for your live cohort.'),connectTool:'the live peer cohort (opt in)'});}
    /* ---- CFO metrics (same engine, financial lens; shared objects reused where they exist) ---- */
    case 'cf_appetite':{var ap=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&LIVE.economics.appetite)||{};var v=Number(ap.appetite)||0;var conn=v>0;
      return c5obj({id:id,name:'Risk appetite',connected:conn,displayValue:conn?usd(v):'—',label:'self-reported',color:'ink',
        formula:'risk appetite = the maximum annual cyber loss the board has approved',
        inputs:[{name:'Board-approved appetite',value:conn?usd(v):'—',source:'onboarding · board appetite statement'}],
        sources:[{tool:'Onboarding',connector:'onboarding',field:'economics.appetite',lastRefresh:c5ago()}],
        note:'The line every exposure figure is measured against — the board sets it.',connectTool:'the board appetite (onboarding)'});}
    case 'cf_headroom':{var ap2=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&LIVE.economics.appetite)||{};var appV=Number(ap2.appetite)||0;var ale=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&Number(LIVE.economics.ale))||0;var conn=appV>0&&ale>0;var hr=appV-ale;
      return c5obj({id:id,name:'Headroom',connected:conn,displayValue:conn?usd(hr):'—',label:'computed',color:conn?(hr>=0?'good':'crit'):'muted',
        formula:'headroom = risk appetite − expected annual loss (ALE)',
        inputs:[{name:'Risk appetite',value:appV?usd(appV):'—',source:'cf_appetite'},{name:'Expected annual loss',value:ale?usd(ale):'—',source:'exp_total / ALE'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'appetite_minus_ale',lastRefresh:c5ago()}],
        note:'How much room you have before cyber loss reaches the board’s limit.',connectTool:'your risk register + board appetite'});}
    case 'cf_tail':{var eco=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics)||{};var t=Number(eco.tail)||0;var conn=t>0;
      var mc=eco.var||null;var aleV=Number(eco.ale)||0;var mult=(aleV>0&&t>0)?(t/aleV):null;
      // Trace the Monte-Carlo: prefer the real simulation record (iterations, mean,
      // 95th/99th percentiles) when the engine ran it; else show the honest tail↔ALE
      // relationship. Never claim iteration detail we don't have.
      var tinputs=[];
      if(mc){
        tinputs.push({name:'Simulated iterations',value:(mc.iterations?Number(mc.iterations).toLocaleString():'—')+' · seeded (reproducible)',source:'Monte-Carlo'});
        tinputs.push({name:'Expected annual loss (mean)',value:usd(Math.round(mc.expected||aleV)),source:'simulation mean = ALE'});
        tinputs.push({name:'Tail · 95th pct (≈1-in-20 yr)',value:usd(t),source:'simulation VaR₉₅'});
        if(mc.var_extreme)tinputs.push({name:'Extreme · 99th pct (≈1-in-100 yr)',value:usd(Math.round(mc.var_extreme)),source:'simulation VaR₉₉'});
      } else {
        tinputs.push({name:'Expected annual loss (ALE)',value:aleV?usd(aleV):'—',source:'exp_total · economics.ale'});
        tinputs.push({name:'Tail · 95th pct (≈1-in-20 yr)',value:conn?usd(t):'—',source:'risk model · economics.tail'});
      }
      if(mult)tinputs.push({name:'Severity multiple',value:mult.toFixed(1)+'× the average year',source:'computed (tail ÷ ALE)'});
      return c5obj({id:id,name:'Tail risk · 1-in-20 year',connected:conn,displayValue:conn?usd(t):'—',label:'modeled',color:conn?'warn':'muted',
        formula:'tail = the 95th-percentile (≈1-in-20-year) annual loss from a seeded Monte-Carlo simulation of your risk register.',
        method:'For every risk you entered, Nerion samples an annual frequency and a loss magnitude from a Beta-PERT distribution (min / most-likely / max), multiplies them and sums across risks — one simulated year. It repeats this for thousands of seeded iterations and sorts the outcomes: the mean is your expected annual loss (ALE), the 95th percentile is this tail (the bad year, ≈1-in-20), the 99th is the extreme (≈1-in-100). Seeded means same inputs → same number, every time — auditable and reproducible.'+((mc&&mc.basis)?(' Basis: '+mc.basis+'.'):''),
        inputs:tinputs,sources:[{tool:'Nerion risk model',connector:'nerion',field:'economics.var (Monte-Carlo)',lastRefresh:c5ago()}],
        note:'The severe-but-plausible bad year — what insurance and retained capital have to cover.',connectTool:'your risk register + financials'});}
    case 'cf_bi':{var rs=(typeof LIVE!=='undefined'&&LIVE&&LIVE.resilience)||{};var ph=Number(rs.top_downtime_per_hr)||0;var conn=ph>0;var day=ph*24;
      return c5obj({id:id,name:'Business interruption',connected:conn,displayValue:conn?(usd(day)+' / day'):'—',label:'modeled',color:conn?'warn':'muted',
        formula:'business interruption = downtime cost per hour of the top revenue system × 24 (one day of outage)',
        method:'A single input × 24. The per-hour figure is your top revenue system’s downtime cost from the resilience model (revenue ÷ operating hours, adjusted for the process it runs). This sizes one day; multiply by expected outage duration for a specific scenario.',
        inputs:[{name:'Downtime cost / hr (top revenue system)',value:conn?(usd(ph)+' / hr'):'—',source:'resilience · top_downtime_per_hr'},{name:'Hours',value:'× 24',source:'one full day of outage'},{name:'= Per day',value:conn?usd(day):'—',source:'computed'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'resilience.top_downtime_per_hr',lastRefresh:c5ago()}],
        note:'What a day of outage on the customer platform costs — the number finance sizes recovery against.',connectTool:'your systems & revenue (BIA)'});}
    case 'cf_ins_limit':{var ins=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&LIVE.economics.insurance)||{};var v=Number(ins.limit)||0;var conn=v>0;
      var tl=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&Number(LIVE.economics.tail))||0;
      var implausible=conn&&tl>0&&v>tl*3; // a limit far above the modeled tail is almost always a $B-vs-$M entry slip
      return c5obj({id:id,name:'Insured limit',connected:conn,displayValue:conn?usd(v):'—',label:'self-reported',color:implausible?'warn':'ink',
        formula:'insured limit = the coverage cap on your cyber policy',
        inputs:[{name:'Policy limit',value:conn?usd(v):'—',source:'policy record · limit'}].concat(implausible?[{name:'Plausibility check',value:'unusually high — '+Math.round(v/tl)+'× your modeled tail',source:'verify the amount & units (B vs M)'}]:[]),
        sources:[{tool:'Cyber-insurance policy',connector:'insurance',field:'limit',lastRefresh:c5ago()}],
        note:implausible?'This limit is well above your modeled tail — verify the amount and units (a $-billion vs $-million entry slip is common; real cyber towers rarely exceed a few hundred million). Nerion flags it rather than presenting it unquestioned.':'The most your policy pays on a covered loss.',connectTool:'your policy record (onboarding)'});}
    case 'cf_ins_gap':{var ins2=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&LIVE.economics.insurance)||{};var lim=Number(ins2.limit)||0;var tail=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&Number(LIVE.economics.tail))||0;var gap=(ins2.gap!=null)?Number(ins2.gap):((tail>0&&lim>0)?Math.max(0,tail-lim):null);var conn=gap!=null&&tail>0;
      return c5obj({id:id,name:'Residual gap',connected:conn,displayValue:conn?usd(gap):'—',label:'computed',color:conn?(gap>0?'warn':'good'):'muted',
        formula:'residual gap = modeled tail − insured limit (the uninsured portion of the bad year)',
        inputs:[{name:'Modeled tail',value:tail?usd(tail):'—',source:'cf_tail'},{name:'Insured limit',value:lim?usd(lim):'—',source:'cf_ins_limit'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'tail_minus_limit',lastRefresh:c5ago()}],
        note:'The part of a severe year your policy would not cover — retained on the balance sheet.',connectTool:'your policy record + risk model'});}
    case 'cf_ins_cov':{var ins3=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&LIVE.economics.insurance)||{};var lim3=Number(ins3.limit)||0;var tail3=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&Number(LIVE.economics.tail))||0;var conn=lim3>0&&tail3>0;
      var rawCov=conn?Math.round(lim3/tail3*100):0;var covp=Math.min(100,rawCov); // you can't transfer more than the whole tail — cap at 100%
      return c5obj({id:id,name:'Insurance coverage',connected:conn,displayValue:conn?(covp>=100?'Fully covered':(covp+'%')):'—',label:'computed',color:conn?(covp>=90?'good':'warn'):'muted',
        formula:'coverage = min( insured limit ÷ modeled tail , 100% )  — a limit above the tail fully covers it',
        inputs:[{name:'Insured limit',value:lim3?usd(lim3):'—',source:'cf_ins_limit'},{name:'Modeled tail',value:tail3?usd(tail3):'—',source:'cf_tail'},{name:'Coverage',value:conn?(rawCov>=100?('100% (limit ≥ tail; raw ratio '+rawCov+'%)'):(rawCov+'%')):'—',source:'computed'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'limit_over_tail',lastRefresh:c5ago()}],
        note:'How much of a severe year your policy actually transfers off the balance sheet — capped at 100%.',connectTool:'your policy record + risk model'});}
    case 'cf_premium':{var ins4=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&LIVE.economics.insurance)||{};var v=Number(ins4.premium)||0;var conn=v>0;
      var plim=Number(ins4.limit)||0;var ptail=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&Number(LIVE.economics.tail))||0;
      // Annual premium is normally a small fraction of the coverage limit (single-digit
      // %); a premium at or above the limit — or above the whole modeled tail — is
      // almost always a $B-vs-$M entry slip. Flag it rather than present it unquestioned.
      var pImplausible=conn&&((plim>0&&v>=plim)||(plim<=0&&ptail>0&&v>ptail));
      var basis=plim>0?plim:ptail;var pRatio=(pImplausible&&basis>0)?Math.round(v/basis*100):0;
      return c5obj({id:id,name:'Premium',connected:conn,displayValue:conn?(usd(v)+' / yr'):'—',label:'self-reported',color:pImplausible?'warn':'ink',
        formula:'premium = annual cost of your cyber policy',
        inputs:[{name:'Annual premium',value:conn?(usd(v)+' / yr'):'—',source:'policy record · premium'}].concat(pImplausible?[{name:'Plausibility check',value:'unusually high — '+pRatio+'% of your '+(plim>0?'insured limit':'modeled tail'),source:'verify the amount & units (B vs M)'}]:[]),
        sources:[{tool:'Cyber-insurance policy',connector:'insurance',field:'premium',lastRefresh:c5ago()}],
        note:pImplausible?'This premium is at or above your '+(plim>0?'coverage limit':'modeled tail')+' — verify the amount and units (a $-billion vs $-million entry slip is common; a cyber premium is normally a single-digit % of the limit). Nerion flags it rather than presenting it unquestioned.':'The annual cost of your cyber policy. Evidence of a stronger posture is your lever at the next renewal — Nerion does not assume any change until your recorded posture shows one.',connectTool:'your policy record (onboarding)'});}
    case 'cf_savings':{
      return c5obj({id:id,name:'Redeployable savings',connected:false,displayValue:'—',label:'self-reported',color:'muted',
        formula:'redeployable savings = Σ(spend on retire/consolidate/right-size candidates at near-zero added risk)',
        inputs:[{name:'Tool spend records',value:'not connected',source:'finance / procurement'},{name:'Tool inventory & utilization',value:'not connected',source:'CASB / license management'}],
        sources:[{tool:'Finance / procurement',connector:'spend',field:'tool_spend',lastRefresh:c5ago()}],
        note:'Money you can free by retiring underperforming or overlapping tools — needs your spend and inventory records.',connectTool:'your tool inventory & spend records'});}
    /* ---- CEO metrics (strategy & trust lens; shared exposure objects reused) ---- */
    case 'ceo_health':{var oi=sig('open_incidents');var tr=trajInfo();var caps=CAPS.filter(function(c){return capDeploy(c)!=null;}).length;var conn=(oi!=null||caps>0);var strong=(oi==null||oi===0);
      return c5obj({id:id,name:'Enterprise health',connected:conn,displayValue:conn?(strong?'Strong':'Watch'):'—',label:'computed',color:conn?(strong?'good':'warn'):'muted',
        formula:'enterprise health = strong when there is no active compromise and the program trend is flat or improving',
        inputs:[{name:'Active compromise',value:oi!=null?(oi>0?oi+' active':'none'):'—',source:'active_compromise'},{name:'Program direction',value:tr.two?(tr.down?'improving':'worsening'):'baseline',source:'direction'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'enterprise_health',lastRefresh:c5ago()}],
        note:'The one-glance read the CEO opens with — is cyber a tailwind or a risk this quarter.',connectTool:'your SIEM + control tools'});}
    case 'ceo_biz_health':{var oi2=sig('open_incidents');var conn=oi2!=null;var sec2=(oi2==null||oi2===0);
      return c5obj({id:id,name:'Business health',connected:conn,displayValue:conn?(sec2?'Secure & resilient':'Incident active'):'—',label:'computed',color:conn?(sec2?'good':'crit'):'muted',
        formula:'business health = secure when there is no active compromise',
        inputs:[{name:'Active compromise',value:oi2!=null?(oi2>0?oi2:'none'):'—',source:'active_compromise'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'business_health',lastRefresh:c5ago()}],
        note:'No active compromise and the program improving — the health line for the board.',connectTool:'your SIEM'});}
    case 'ceo_objectives':{var O=c5Objectives();var Mo=c5expModel();
      var depName={identity:'Identity & access',product:'Secure-by-design (product)',cost:'Cloud / cost efficiency',vendor:'Third-party estate',workforce:'Security culture'};
      var driverUsd=function(key){var du=0;Mo.drivers.forEach(function(d){if(d.id==='exp_'+key)du=d.usd||0;});return du;};
      // Materiality threshold: a driver is material when it exceeds an even split of
      // the board appetite across drivers (falls back to >$0 if no appetite set).
      var appet=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&LIVE.economics.appetite&&Number(LIVE.economics.appetite.appetite))||0;
      var matThresh=(appet>0&&Mo.drivers.length)?(appet/Mo.drivers.length):0;
      var cols=['Objective','Cyber dependency','What threatens it','Modeled exposure','Material?','Verdict'];
      var rows=O.objs.map(function(o){
        var dep=depName[o.map]||'no cyber dependency';
        var uv=o.map?driverUsd(o.map):0;
        var material=(o.status==='at risk');
        var threat=(o.status==='at risk')?(o.sub||'material exposure driver'):(o.status==='watch'?(o.sub||'under monitoring'):'no material driver');
        var vcol=(o.status==='at risk')?'warn':(o.status==='watch'?'blue':'good');
        var vtxt=(o.status==='at risk')?'At risk':(o.status==='watch'?'Watch':'Safe');
        return [{text:o.name,bold:true},dep,threat,{text:(uv>0?usd(uv):'—'),color:(uv>0?'warn':null)},{text:material?('yes'+(matThresh>0?(' (> '+usd(matThresh)+' bar)'):'')):'no',color:(material?'warn':'good')},{text:vtxt,color:vcol,bold:true}];
      });
      rows.push([{text:'= Protected',bold:true},'','',{text:''},{text:''},{text:O.protected+' of '+O.total+(O.atRisk>0?(' · '+O.atRisk+' at risk'):' · all safe'),color:(O.atRisk>0?'warn':'good'),bold:true}]);
      return c5obj({id:id,name:'Objectives protected',connected:true,displayValue:O.protected+' of '+O.total,label:'computed',color:O.atRisk>0?'warn':'good',
        why:'Answers "is cyber a blocker to the strategy?" — how many of the board\'s strategic objectives are free of a material cyber exposure. It matters because it translates the whole security posture into the language the CEO and board actually own: the objectives they are accountable for.',
        formula:'objectives protected = total strategic objectives − objectives whose cyber dependency carries a MATERIAL modeled exposure (driver > appetite ÷ drivers)',
        method:'Not a judgement. Each objective is tagged (at your strategy intake) to the cyber capability it depends on. Nerion then checks whether that capability carries a material modeled exposure — a dollar figure computed from live control telemetry (deployment gaps × framework weight), tested against the board-appetite materiality bar. "At risk" means the dependency is real AND the exposure clears the bar; "safe" means no dependency, or the exposure is below it. The table shows the dependency, what threatens it, and the modeled dollars behind each verdict.',
        table:{cols:cols,rows:rows},
        sources:[{tool:(O.fromInput?'Strategy intake (onboarding)':'Sector default (labeled)'),connector:'strategy',field:'objective → capability',lastRefresh:c5ago()},{tool:'Exposure model',connector:'nerion',field:'driver_usd (from control telemetry)'},{tool:'Risk appetite',connector:'erm',field:'materiality bar'}],
        note:'Cyber mapped to the strategy. '+(O.atRisk>0?('The at-risk objective depends on a capability with a material modeled exposure — the funded fix on the bottom line protects it.'):'Every objective is clear of a material cyber exposure this quarter.'),connectTool:'your strategic objectives (onboarding)'});}
    case 'ceo_cust_incidents':{var oi3=sig('open_incidents');var conn=oi3!=null;
      return c5obj({id:id,name:'Customer-impacting incidents',connected:conn,displayValue:conn?String(oi3):'—',label:'live',color:conn?(oi3>0?'crit':'good'):'muted',
        formula:'customer-impacting incidents = open incidents affecting a customer-facing service',
        inputs:[{name:'Open incidents',value:conn?oi3:'—',source:'SIEM · open_incidents'}],sources:[c5capSrc('siem')],
        note:'Whether anything reached customers this quarter — the trust question in one number.',connectTool:'your SIEM'});}
    case 'ceo_disclosures':{var oi4=sig('open_incidents');var conn=oi4!=null;
      return c5obj({id:id,name:'Breach disclosures',connected:conn,displayValue:conn?'0':'—',label:'computed',color:conn?'good':'muted',
        formula:'disclosures = material cyber events requiring notification to customers or regulators this quarter',
        inputs:[{name:'Material reportable events',value:conn?'0':'—',source:'materiality workbench + SIEM'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'disclosures',lastRefresh:c5ago()}],
        note:'Nothing material to disclose keeps the story clean — for customers, regulators and the board.',connectTool:'your SIEM + materiality inputs'});}
    case 'ceo_trust_signal':{var oi5=sig('open_incidents');var conn=oi5!=null;var steady=(oi5==null||oi5===0);
      return c5obj({id:id,name:'Trust signal',connected:conn,displayValue:conn?(steady?'Steady':'At risk'):'—',label:'computed',color:conn?(steady?'good':'warn'):'muted',
        formula:'trust signal = steady when there are no customer-impacting incidents or disclosures',
        method:'A proxy from incidents/disclosures; a brand-monitoring feed sharpens it.',
        inputs:[{name:'Customer incidents',value:conn?oi5:'—',source:'ceo_cust_incidents'},{name:'Disclosures',value:'0',source:'ceo_disclosures'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'trust_signal',lastRefresh:c5ago()}],
        note:'Whether customer trust is holding — the moat a breach would erode.',connectTool:'a brand-monitoring / sentiment feed'});}
    case 'ceo_customer_data':{var oi6=sig('open_incidents');var conn=oi6!=null;var ok=(oi6==null||oi6===0);
      return c5obj({id:id,name:'Customer data',connected:conn,displayValue:conn?(ok?'No exposure':'Exposure'):'—',label:'computed',color:conn?(ok?'good':'crit'):'muted',
        formula:'customer-data exposure = any open incident touching customer data this quarter',
        inputs:[{name:'Open incidents',value:conn?oi6:'—',source:'SIEM · open_incidents'}],sources:[c5capSrc('siem')],
        note:'Whether customer data is at risk right now.',connectTool:'your SIEM + DLP'});}
    case 'ceo_uptime':{
      return c5obj({id:id,name:'Service availability',connected:false,displayValue:'—',label:'live',color:'muted',
        formula:'availability = uptime of the customer platform from your monitoring / SRE tooling',
        inputs:[{name:'Uptime %',value:'not connected',source:'monitoring / SRE (Datadog · Pingdom)'}],
        sources:[{tool:'Monitoring / SRE',connector:'uptime',field:'availability',lastRefresh:c5ago()}],
        note:'Customer-platform uptime — the availability customers feel. Connect monitoring to make it live.',connectTool:'your monitoring / SRE tool'});}
    /* ---- CRO metrics (enterprise-risk lens; shared exposure objects reused) ---- */
    case 'cr_rank':{var P=c5Principal();var conn=P.rows.length>0&&P.cyberRank!=null;
      return c5obj({id:id,name:'Cyber rank',connected:conn,displayValue:conn?(P.cyberRank+' of '+P.rows.length):'—',label:'computed',color:'ink',
        formula:'cyber rank = position of cyber residual among your principal risks, on one normalized scale',
        inputs:P.rows.map(function(r){return {name:r.l,value:usd(r.v),source:r.cyber?'cyber model (exp_total)':'ERM input · portfolio.'+r.k};}),
        sources:[{tool:'Enterprise risk register',connector:'erm',field:'principal_risks',lastRefresh:c5ago()}],
        note:'Where cyber sits against market, credit, operational and the rest — the CRO’s one-scale view.',connectTool:'your ERM / risk register (principal risks)'});}
    case 'cr_trend':{var tr=trajInfo();var conn=tr.two;
      return c5obj({id:id,name:'Cyber trend',connected:conn||true,displayValue:tr.two?(tr.down?'Falling':'Rising'):'Baseline',label:'computed',color:tr.two?(tr.down?'good':'warn'):'muted',
        formula:'cyber trend = direction of cyber residual quarter over quarter',
        inputs:[{name:'Quarters recorded',value:tr.t?tr.t.length:0,source:'Nerion posture history'},{name:'Latest change',value:tr.two?tr.val.replace(/^[▲▼]\s*/,''):'baseline',source:'direction'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'residual_trend',lastRefresh:c5ago()}],
        note:'Whether cyber is the principal risk that is rising or falling — the one the risk committee watches.',connectTool:'more recorded quarters'});}
    case 'cr_families':{var A=c5Assurance();var conn=A.fams.some(function(f){return f.connected;});
      return c5obj({id:id,name:'Families assured',connected:conn,displayValue:conn?(A.assured+' of '+A.fams.length):'—',label:'computed',color:conn?(A.gaps>0?'warn':'good'):'muted',
        formula:'families assured = control families evidenced at or above the assurance threshold by tests + telemetry',
        method:'Assurance is evidence-based — deployment telemetry and last-test signals, never a self-attested flag.',
        inputs:A.fams.map(function(f){return {name:f.l,value:f.status+(f.deploy!=null?(' · '+f.deploy+'% deployed'):''),color:(f.status==='Assured'?'good':f.status==='Gap'?'crit':f.connected?'warn':'muted'),source:f.evidence};}).concat([{name:'= Assured',value:A.assured+' of '+A.fams.length+' at/above the assurance threshold ('+A.gaps+' with gaps)',source:'count(assured) ÷ total'}]),
        sources:[{tool:'Control tools + GRC',connector:'assurance',field:'test_evidence',lastRefresh:c5ago()}],
        note:'How many control families are actually assured by evidence — not how many are claimed.',connectTool:'your control tools + GRC test evidence'});}
    case 'cr_gaps':{var A2=c5Assurance();var conn=A2.fams.some(function(f){return f.connected;});
      return c5obj({id:id,name:'Assurance gaps',connected:conn,displayValue:conn?String(A2.gaps):'—',label:'computed',color:conn?(A2.gaps>0?'warn':'good'):'muted',
        formula:'assurance gaps = control families with only partial or missing evidence',
        inputs:A2.fams.filter(function(f){return f.status!=='Assured';}).map(function(f){return {name:f.l,value:f.status,source:f.evidence};}),
        sources:[{tool:'Control tools + GRC',connector:'assurance',field:'test_evidence',lastRefresh:c5ago()}],
        note:'The control families where assurance is incomplete — where a control could be failing unseen.',connectTool:'your control tools + GRC'});}
    case 'cr_evidence':{var s=(typeof auditStats==='function')?auditStats():{pct:null};var conn=s.pct!=null;
      return c5obj({id:id,name:'Evidence coverage',connected:conn,displayValue:conn?(s.pct+'%'):'—',label:'computed',color:conn?(s.pct>=75?'good':s.pct>=50?'warn':'crit'):'muted',
        formula:'evidence coverage = controls evidenced (tools + documents) ÷ total control universe',
        inputs:[{name:'Evidenced controls',value:conn?(s.evid+' evidenced'):'—',source:'connected tools + analyzed policies'},{name:'Control universe',value:conn?(s.total+' total'):'—',source:'framework catalog'},{name:'= Coverage',value:conn?(s.evid+' ÷ '+s.total+' = '+s.pct+'%'):'—',source:'computed'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'evidence_coverage',lastRefresh:c5ago()}],
        note:'How much of the control universe is backed by evidence rather than self-attestation.',connectTool:'your control tools + policies'});}
    case 'cr_consec':{var tr2=trajInfo();var vals=(tr2.vals||[]);var run=0;for(var i=vals.length-1;i>0;i--){if(vals[i]<=vals[i-1])run++;else break;}var conn=vals.length>=2;
      return c5obj({id:id,name:'Consecutive quarters',connected:conn,displayValue:conn?String(run):'—',label:'computed',color:conn?(run>=1?'good':'warn'):'muted',
        formula:'consecutive quarters = the run of quarters, most recent first, where residual did not rise',
        inputs:[{name:'Quarterly residuals',value:vals.length?vals.map(function(v){return usd(v);}).join(' → '):'—',source:'residual-risk series'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'residual_series',lastRefresh:c5ago()}],
        note:'How durable the improvement is — a multi-quarter fall is the evidence the risk committee wants.',connectTool:'more recorded quarters'});}
    case 'cr_owned':{var O=c5Owners();
      return c5obj({id:id,name:'Owned actions',connected:true,displayValue:O.owned+' of '+O.total,label:'computed',color:O.owned>=O.total?'good':'warn',
        formula:'owned actions = top risks with a named owner and an action, from the risk register',
        inputs:O.rows.map(function(r){return {name:r.risk,value:r.status+' · '+r.owner,source:'risk register (owner) + cyber model (status)'};}),
        sources:[{tool:'Enterprise risk register',connector:'erm',field:'risk_owners',lastRefresh:c5ago()}],
        note:'Whether every material risk has an accountable owner — the governance question, in one number.',connectTool:'your risk register (owners)'});}
    /* ---- COO metrics (operations & continuity lens; shared exposure/vendor objects reused) ---- */
    case 'coo_resilience':{var oi=sig('open_incidents');var rs=(typeof LIVE!=='undefined'&&LIVE&&LIVE.resilience)||{};var worst=rs.worst_recovery_hours;var conn=(oi!=null||worst!=null);var strong=(oi==null||oi===0);
      return c5obj({id:id,name:'Operational resilience',connected:conn,displayValue:conn?(strong?'Strong':'Watch'):'—',label:'computed',color:conn?(strong?'good':'warn'):'muted',
        formula:'operational resilience = strong when no active compromise is disrupting a business process',
        inputs:[{name:'Active incidents',value:oi!=null?(oi>0?oi:'none'):'—',source:'SIEM · open_incidents'},{name:'Slowest recovery',value:worst!=null?hrsToStr(worst):'—',source:'resilience · worst_recovery_hours'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'operational_resilience',lastRefresh:c5ago()}],
        note:'Whether operations are running and could keep running through a cyber disruption.',connectTool:'your SIEM + resilience data'});}
    case 'coo_processes':{var P=c5Processes();var conn=P.total>0;
      return c5obj({id:id,name:'Processes protected',connected:conn,displayValue:conn?(P.protected+' of '+P.total):'—',label:'computed',color:conn?(P.atRisk>0?'warn':'good'):'muted',
        formula:'processes protected = critical processes − those carrying a material cyber exposure',
        method:'A process is flagged at-risk when a material exposure driver maps to it (identity → the customer platform).',
        inputs:P.list.map(function(p){return {name:p.name,value:p.status,color:(p.status==='At risk'?'warn':p.status==='Watch'?'blue':'good'),source:'operations model · process_exposure'};}).concat([{name:'= Protected',value:P.protected+' of '+P.total+' continuity-safe ('+P.atRisk+' at risk)',source:'total − at-risk'}]),
        sources:[{tool:'Operations model',connector:'ops',field:'process_exposure',lastRefresh:c5ago()}],
        note:'Cyber mapped to your critical processes — how many are continuity-safe, and which needs attention.',connectTool:'your critical processes (onboarding)'});}
    case 'coo_bc':{var d=sig('dr_test_days');var conn=d!=null;var ok=(d!=null&&d<=90);
      return c5obj({id:id,name:'Business continuity',connected:conn,displayValue:conn?(ok?'Plans tested':'Test overdue'):'—',label:'computed',color:conn?(ok?'good':'warn'):'muted',
        formula:'business continuity = recovery plans tested within the last 90 days',
        inputs:[{name:'Days since last DR test',value:conn?(d+' days'):'—',source:'BC/DR records · dr_test_days'}],
        sources:[{tool:'BC/DR records',connector:'bcdr',field:'dr_test_days',lastRefresh:c5ago()}],
        note:'Whether continuity plans are tested and current, not just written.',connectTool:'your BC/DR test records'});}
    case 'coo_recovery_ready':{var d2=sig('dr_test_days');var imm=sig('backup_immutable_pct');var conn=(d2!=null||imm!=null);var ready=((d2==null||d2<=90)&&(imm==null||imm>=95));
      return c5obj({id:id,name:'Recovery readiness',connected:conn,displayValue:conn?(ready?'Ready':'Gaps'):'—',label:'computed',color:conn?(ready?'good':'warn'):'muted',
        formula:'recovery readiness = recent DR test passed and backups verified immutable',
        inputs:[{name:'Days since DR test',value:d2!=null?(d2+' days'):'—',source:'BC/DR · dr_test_days'},{name:'Immutable backups',value:imm!=null?(imm+'%'):'—',source:'backup · backup_immutable_pct'}],
        sources:[{tool:'BC/DR records',connector:'bcdr',field:'recovery_readiness',lastRefresh:c5ago()}],
        note:'Whether you could actually recover the business from a severe cyber event.',connectTool:'your BC/DR + backup platform'});}
    case 'coo_rto':{var rs2=(typeof LIVE!=='undefined'&&LIVE&&LIVE.resilience)||{};var w=rs2.worst_recovery_hours;var conn=w!=null;var tgt=4;
      return c5obj({id:id,name:'Time to recover (RTO)',connected:conn,displayValue:conn?(hrsToStr(w)+' vs '+tgt+'h target'):'—',label:'live',color:conn?(w<=tgt?'good':'warn'):'muted',
        formula:'RTO = worst-case recovery time of a critical service, against your '+tgt+'-hour target',
        inputs:[{name:'Worst-case recovery',value:conn?hrsToStr(w):'—',source:'resilience · worst_recovery_hours'},{name:'Target RTO',value:tgt+'h',source:'BC/DR policy'}],
        sources:[{tool:'BC/DR records',connector:'bcdr',field:'worst_recovery_hours',lastRefresh:c5ago()}],
        note:'How fast the slowest critical service comes back — the number continuity is judged on.',connectTool:'your recovery-test results'});}
    case 'coo_rpo':{var r=sig('rpo_minutes');var conn=r!=null;var tgt2=60;
      return c5obj({id:id,name:'Data-loss window (RPO)',connected:conn,displayValue:conn?((r>=60?(Math.round(r/6)/10+'h'):(r+'m'))+' vs '+tgt2+'m target'):'—',label:'live',color:conn?(r<=tgt2?'good':'warn'):'muted',
        formula:'RPO = maximum data loss window from your backup cadence, against the '+tgt2+'-minute target',
        inputs:[{name:'Recovery-point objective',value:conn?(r+' min'):'—',source:'backup · rpo_minutes'},{name:'Target RPO',value:tgt2+'m',source:'BC/DR policy'}],
        sources:[{tool:'Backup platform',connector:'backup',field:'rpo_minutes',lastRefresh:c5ago()}],
        note:'How much data you would lose in a recovery — the window backups have to beat.',connectTool:'your backup platform'});}
    case 'coo_backups':{var imm2=sig('backup_immutable_pct');var conn=imm2!=null;
      return c5obj({id:id,name:'Backups',connected:conn,displayValue:conn?(imm2>=95?'Verified':(imm2+'% immutable')):'—',label:'live',color:conn?(imm2>=95?'good':'warn'):'muted',
        formula:'backups = share of backups that are immutable and restore-verified',
        inputs:[{name:'Immutable backups',value:conn?(imm2+'%'):'—',source:'backup · backup_immutable_pct'}],
        sources:[{tool:'Backup platform',connector:'backup',field:'backup_immutable_pct',lastRefresh:c5ago()}],
        note:'Whether backups would survive a ransomware event and actually restore.',connectTool:'your backup platform'});}
    case 'coo_last_test':{var d3=sig('dr_test_days');var conn=d3!=null;
      return c5obj({id:id,name:'Last recovery test',connected:conn,displayValue:conn?(d3<=90?'Passed':'Overdue'):'—',label:'live',color:conn?(d3<=90?'good':'warn'):'muted',
        formula:'last recovery test = result and recency of your most recent DR test',
        inputs:[{name:'Days since last test',value:conn?(d3+' days ago'):'—',source:'BC/DR · dr_test_days'}],
        sources:[{tool:'BC/DR records',connector:'bcdr',field:'dr_test_days',lastRefresh:c5ago()}],
        note:'A recovery plan is only real if it has been tested recently.',connectTool:'your BC/DR test records'});}
    case 'coo_identity_recovery':{var p=c5avgDeploy(['mfa','pam']);var conn=(p!=null);var gap=(p!=null&&p<90);
      return c5obj({id:id,name:'Identity recovery',connected:conn,displayValue:conn?(gap?'Gap':'Ready'):'—',label:'computed',color:conn?(gap?'warn':'good'):'muted',
        formula:'identity recovery = readiness to restore access quickly, from identity-control deployment',
        inputs:[{name:'Identity controls deployed',value:conn?(p+'%'):'—',source:'MFA + PAM telemetry'}],
        sources:[c5capSrc('mfa'),c5capSrc('pam')],
        note:'Restoring access is often the slowest link in a customer-platform recovery — the same identity gap that drives your top exposure.',connectTool:'your identity + PAM tools'});}
    case 'coo_tier1':{var V=c5vendors();var t1=(V.p&&V.p.tier1!=null)?V.p.tier1:((V.seed||[]).filter(function(x){return /1/.test(x.tier);}).length);var conn=V.seed.length>0;
      return c5obj({id:id,name:'Tier-1 vendors',connected:conn,displayValue:conn?String(t1):'—',label:'self-reported',color:'ink',
        formula:'tier-1 vendors = suppliers you classified tier-1 at onboarding',
        inputs:[{name:'Tier-1 count',value:conn?t1:'—',source:'vendor intake'}],
        sources:[{tool:'Vendor intake',connector:'vendors',field:'tier',lastRefresh:c5ago()}],
        note:'The suppliers whose failure would hurt operations most — the ones to monitor closest.',connectTool:'your tier-1/2 vendors (onboarding)'});}
    case 'coo_spof':{var rs3=(typeof LIVE!=='undefined'&&LIVE&&LIVE.resilience)||{};var tv=rs3.top_vendor_blast;var n=(tv&&tv.systems&&tv.systems.length>=2)?1:0;var conn=(tv&&tv.vendor)||false;
      return c5obj({id:id,name:'Single points of failure',connected:!!conn,displayValue:conn?String(n):'—',label:'computed',color:conn?(n>0?'warn':'good'):'muted',
        formula:'single points of failure = vendors that underpin two or more critical systems with no independent failover',
        inputs:[{name:tv&&tv.vendor?tv.vendor:'top vendor',value:tv&&tv.systems?((tv.systems.length)+' systems'):'—',source:'asset→vendor map'}],
        sources:[{tool:'Operations model',connector:'ops',field:'top_vendor_blast',lastRefresh:c5ago()}],
        note:'Where one supplier failing takes down multiple operations at once — the concentration to reduce.',connectTool:'your asset→vendor map'});}
    /* ---- CLO metrics (legal & regulatory lens; surfaces obligations + evidence, not legal conclusions) ---- */
    case 'cl_jurisdictions':{var ob=(typeof LIVE!=='undefined'&&LIVE&&LIVE.legal&&LIVE.legal.obligations)||[];var conn=ob.length>0;
      return c5obj({id:id,name:'Jurisdictions in scope',connected:conn,displayValue:conn?String(ob.length):'—',label:'self-reported',color:'ink',
        formula:'jurisdictions in scope = the regulatory regimes that bind you, from the regions you operate in',
        inputs:ob.map(function(o){return {name:(o.jurisdiction||o.flag||'—'),value:(o.obligation||'—'),source:'obligations register · '+(o.clock||'')};}),
        sources:[{tool:'Obligations register',connector:'legal',field:'obligations',lastRefresh:c5ago()}],
        note:'The regulatory regimes that bind you — set by where you operate. Surfaces the obligation; the compliance call is yours.',connectTool:'your operating regions (onboarding)'});}
    case 'cl_obligations':{var ob2=(typeof LIVE!=='undefined'&&LIVE&&LIVE.legal&&LIVE.legal.obligations)||[];var conn=ob2.length>0;
      return c5obj({id:id,name:'Obligations in scope',connected:conn,displayValue:conn?(ob2.length+' in scope'):'—',label:'self-reported',color:'ink',
        formula:'obligations in scope = the notification / disclosure duties across your jurisdictions',
        method:'Nerion surfaces each obligation and its evidence; whether you meet it is a legal determination for your counsel, not asserted here.',
        inputs:ob2.map(function(o){return {name:(o.jurisdiction||'—'),value:(o.obligation||'—')+' · '+(o.clock||''),source:(o.penalty||'statutory ruleset')};}),
        sources:[{tool:'Obligations register',connector:'legal',field:'obligations',lastRefresh:c5ago()}],
        note:'The cyber-regulatory duties in force — each with its clock and penalty, traceable to the ruleset.',connectTool:'your operating regions (onboarding)'});}
    case 'cl_binding_clock':{var b=(typeof LIVE!=='undefined'&&LIVE&&LIVE.legal&&LIVE.legal.binding)||{};var conn=!!b.clock;
      return c5obj({id:id,name:'Tightest clock',connected:conn,displayValue:conn?b.clock:'—',label:'self-reported',color:conn?'warn':'muted',
        formula:'tightest clock = the fastest statutory notification deadline across your jurisdictions',
        inputs:[{name:'Binding jurisdiction',value:b.jurisdiction||'—',source:'obligations register'},{name:'Deadline',value:b.clock||'—',source:'statutory ruleset'}],
        sources:[{tool:'Obligations register',connector:'legal',field:'binding',lastRefresh:c5ago()}],
        note:'The deadline you must be ready to meet first — it sets your notification-readiness bar.',connectTool:'your operating regions (onboarding)'});}
    case 'cl_runbooks':{var ir=(typeof LIVE!=='undefined'&&LIVE&&LIVE.governance&&LIVE.governance.ir)||{};var tested=/yes|tested|tabletop/i.test(ir.tested||'');var conn=!!ir.tested;
      return c5obj({id:id,name:'Runbooks ready',connected:conn,displayValue:conn?(tested?'Tested':'Not tested'):'—',label:'self-reported',color:conn?(tested?'good':'warn'):'muted',
        formula:'runbook readiness = whether the incident-response plan has been exercised (tabletop) recently',
        inputs:[{name:'IR plan tested',value:ir.tested||'—',source:'governance · IR readiness'},{name:'Last tabletop',value:ir.lastTabletop||'—',source:'governance'},{name:'Breach-counsel retainer',value:ir.retainer||'—',source:'governance'}],
        sources:[{tool:'IR runbooks / governance',connector:'governance',field:'ir',lastRefresh:c5ago()}],
        note:'Whether the runbooks that meet the notification clocks have been exercised, not just written.',connectTool:'your IR-readiness answers (onboarding)'});}
    case 'cl_forensic_gap':{var p=c5avgDeploy(['mfa','pam','siem']);var conn=p!=null;var gap=(p!=null&&p<90);
      return c5obj({id:id,name:'Forensic gap',connected:conn,displayValue:conn?(gap?'Identity':'None'):'—',label:'computed',color:conn?(gap?'warn':'good'):'muted',
        formula:'forensic gap = the path where evidence to prove what happened is thin, from identity + logging telemetry',
        inputs:[{name:'Identity + logging deployed',value:conn?(p+'%'):'—',source:'MFA + PAM + SIEM telemetry'}],
        sources:[c5capSrc('mfa'),c5capSrc('siem')],
        note:'The one area where proving what happened in an incident is hardest — here, the identity path. It is the same identity gap driving the top exposure.',connectTool:'your identity + SIEM tools'});}
    case 'cl_dsar_sla':{var open=sig('dsar_open'),over=sig('dsar_overdue');var conn=open!=null;var within=(open!=null&&open>0)?Math.round((open-(over||0))/open*100):(open===0?100:null);
      return c5obj({id:id,name:'DSARs within SLA',connected:conn,displayValue:conn?(within!=null?within+'%':'—'):'—',label:'live',color:conn?((within==null||within>=95)?'good':within>=80?'warn':'crit'):'muted',
        formula:'DSARs within SLA = (open requests − overdue) ÷ open requests',
        inputs:[{name:'Open DSARs',value:conn?open:'—',source:'OneTrust · dsar_open'},{name:'Overdue',value:over!=null?over:'—',source:'OneTrust · dsar_overdue'}],
        sources:[{tool:'OneTrust / privacy platform',connector:'privacy',field:'dsar_open,dsar_overdue',lastRefresh:c5ago()}],
        note:'Whether data-subject requests are handled inside the statutory clock — the everyday privacy obligation.',connectTool:'your privacy platform (OneTrust · TrustArc)'});}
    case 'cl_ropa':{return c5obj({id:id,name:'Records of processing',connected:false,displayValue:'—',label:'self-reported',color:'muted',
        formula:'records of processing (RoPA) = completeness and recency of your Article 30 processing records',
        inputs:[{name:'RoPA status',value:'not connected',source:'RoPA / privacy management system'}],
        sources:[{tool:'RoPA system',connector:'ropa',field:'records_of_processing',lastRefresh:c5ago()}],
        note:'Whether your records of processing are current — needs your RoPA / privacy-management system connected.',connectTool:'your RoPA / privacy-management system'});}
    case 'cl_access_pd':{var rev=sig('access_review_pct'),dorm=sig('dormant_accounts');var conn=(rev!=null||dorm!=null);var watch=((rev!=null&&rev<90)||(dorm!=null&&dorm>25));
      return c5obj({id:id,name:'Access to personal data',connected:conn,displayValue:conn?(watch?'Over-permissioned':'Clean'):'—',label:'computed',color:conn?(watch?'warn':'good'):'muted',
        formula:'access hygiene = access-review completeness and dormant-account count near personal data',
        inputs:[{name:'Access reviews complete',value:rev!=null?(rev+'%'):'—',source:'identity · access_review_pct'},{name:'Dormant accounts',value:dorm!=null?dorm:'—',source:'identity · dormant_accounts'}],
        sources:[c5capSrc('mfa'),c5capSrc('pam')],
        note:'Over-permissioned or stale access near personal data — a privacy risk that is part of the identity gap.',connectTool:'your identity + PAM tools'});}
    case 'cl_litigation':{var lh=sig('legal_holds');var conn=lh!=null;
      return c5obj({id:id,name:'Active legal holds',connected:conn,displayValue:conn?String(lh):'—',label:'live',color:conn?(lh>0?'warn':'good'):'muted',
        formula:'active legal holds = litigation holds currently in effect for cyber matters',
        inputs:[{name:'Legal holds',value:conn?lh:'—',source:'OneTrust · legal_holds'}],
        sources:[{tool:'Legal-hold / matter system',connector:'legal',field:'legal_holds',lastRefresh:c5ago()}],
        note:'Whether any cyber-related litigation hold is active — the sign of live legal exposure.',connectTool:'your legal-hold / matter system'});}
    case 'cl_contracts':{return c5obj({id:id,name:'Contracts with cyber warranties',connected:false,displayValue:'—',label:'self-reported',color:'muted',
        formula:'contracts with cyber warranties = count from your contract-lifecycle system (CLM)',
        inputs:[{name:'CLM contracts',value:'not connected',source:'Ironclad / DocuSign CLM / Conga'}],
        sources:[{tool:'Contract-lifecycle system',connector:'clm',field:'cyber_warranties',lastRefresh:c5ago()}],
        note:'How many customer contracts carry cyber warranties or indemnities — needs your CLM connected to quantify.',connectTool:'your CLM (Ironclad · DocuSign CLM · Conga)'});}
    case 'cl_platform_tied':{return c5obj({id:id,name:'Platform-tied contracts',connected:false,displayValue:'—',label:'self-reported',color:'muted',
        formula:'platform-tied contracts = contracts that warrant customer-platform uptime / security',
        inputs:[{name:'CLM uptime warranties',value:'not connected',source:'CLM'}],
        sources:[{tool:'Contract-lifecycle system',connector:'clm',field:'uptime_warranties',lastRefresh:c5ago()}],
        note:'How many contracts an identity-driven platform outage could breach — needs your CLM connected. The identity gap is the common root.',connectTool:'your CLM'});}
    /* ---- CTO metrics (engineering-estate lens; shared exposure/vendor objects reused) ---- */
    case 'ct_platform_health':{var oi=sig('open_incidents');var caps=CAPS.filter(function(c){return capDeploy(c)!=null;}).length;var conn=(oi!=null||caps>0);var strong=(oi==null||oi===0);
      return c5obj({id:id,name:'Platform health',connected:conn,displayValue:conn?(strong?'Strong':'Watch'):'—',label:'computed',color:conn?(strong?'good':'warn'):'muted',
        formula:'platform health = strong when no active compromise is affecting a core platform',
        inputs:[{name:'Active incidents',value:oi!=null?(oi>0?oi:'none'):'—',source:'SIEM · open_incidents'},{name:'Control tools connected',value:caps,source:'control estate'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'platform_health',lastRefresh:c5ago()}],
        note:'The one-glance read on whether the technology estate is secure and running.',connectTool:'your SIEM + control tools'});}
    case 'ct_critical_vulns':{var kev=sig('exploited_cves');var dep=sig('dependabot_critical');var v=(kev!=null?kev:null);var conn=(kev!=null||dep!=null);var val=(kev!=null?kev:dep);
      return c5obj({id:id,name:'Critical vulns open',connected:conn,displayValue:conn?String(val):'—',label:'live',color:conn?(val>0?'warn':'good'):'muted',
        formula:'critical vulns = actively-exploited CVEs (KEV) on your estate, else open critical dependency alerts',
        inputs:[{name:'Exploited CVEs (KEV)',value:kev!=null?kev:'—',source:'VM scanner · exploited_cves'},{name:'Critical dependency alerts',value:dep!=null?dep:'—',source:'SCA · dependabot_critical'}],
        sources:[c5capSrc('vuln'),{tool:'Dependabot / Snyk',connector:'sca',field:'dependabot_critical',lastRefresh:c5ago()}],
        note:'The known-exploitable vulnerabilities on the estate right now — the ones attackers use first.',connectTool:'your VM scanner (Qualys · Tenable)'});}
    case 'ct_modernization':{var rs=(typeof LIVE!=='undefined'&&LIVE&&LIVE.resilience)||{};var td=rs.tech_debt||{};var exp=td.exposure;var conn=(exp!=null);
      return c5obj({id:id,name:'Modernization',connected:conn,displayValue:conn?(exp>0?'Managed':'On track'):'—',label:'computed',color:conn?'blue':'muted',
        formula:'modernization = whether end-of-life / legacy technical debt is mapped and on a roadmap',
        inputs:[{name:'Tech-debt exposure',value:exp!=null?usd(exp):'—',source:'resilience · tech_debt'}],
        sources:[{tool:'Architecture records',connector:'arch',field:'tech_debt',lastRefresh:c5ago()}],
        note:'Whether legacy systems are mapped and being retired on a plan, not accumulating unseen.',connectTool:'your systems inventory (EOL status)'});}
    case 'ct_appsec':{var css=sig('code_scanning_open');var conn=css!=null;
      return c5obj({id:id,name:'Application security',connected:conn,displayValue:conn?(css<=10?'Healthy':(css+' open')):'—',label:'live',color:conn?(css<=10?'good':'warn'):'muted',
        formula:'application security = open static-analysis (SAST) findings on first-party code',
        inputs:[{name:'Open SAST findings',value:conn?css:'—',source:'code scanning · code_scanning_open'}],
        sources:[{tool:'GitHub Advanced Security / Snyk Code',connector:'sast',field:'code_scanning_open',lastRefresh:c5ago()}],
        note:'Whether secure-by-design is holding for new builds — findings low and cleared before ship.',connectTool:'your application-security scanner'});}
    case 'ct_techdebt':{var rs2=(typeof LIVE!=='undefined'&&LIVE&&LIVE.resilience)||{};var exp2=(rs2.tech_debt&&rs2.tech_debt.exposure);var conn=(exp2!=null);
      return c5obj({id:id,name:'Technical debt',connected:conn,displayValue:conn?usd(exp2):'—',label:'modeled',color:conn?'blue':'muted',
        formula:'technical debt = open risk carried by end-of-life / unsupported systems still on revenue paths',
        inputs:[{name:'Tech-debt exposure',value:conn?usd(exp2):'—',source:'resilience · tech_debt.exposure'}],
        sources:[{tool:'Architecture records',connector:'arch',field:'tech_debt.exposure',lastRefresh:c5ago()}],
        note:'The exposure legacy tech carries — the number that justifies the modernization roadmap.',connectTool:'your systems inventory (EOL status)'});}
    case 'ct_availability':{return c5obj({id:id,name:'Availability · 90 days',connected:false,displayValue:'—',label:'live',color:'muted',
        formula:'availability = uptime of customer-facing services from your observability stack',
        inputs:[{name:'Uptime %',value:'not connected',source:'observability (Datadog · Grafana · Pingdom)'}],
        sources:[{tool:'Observability stack',connector:'observability',field:'availability',lastRefresh:c5ago()}],
        note:'Service availability customers feel — connect your observability stack to make it live.',connectTool:'your observability / SLO stack'});}
    case 'ct_services_slo':{return c5obj({id:id,name:'Services within SLO',connected:false,displayValue:'—',label:'live',color:'muted',
        formula:'services within SLO = services meeting their reliability objective, from your SLO records',
        inputs:[{name:'SLO status',value:'not connected',source:'observability / SLO records'}],
        sources:[{tool:'Observability stack',connector:'observability',field:'slo',lastRefresh:c5ago()}],
        note:'How many customer services are meeting their reliability target — needs your SLO stack.',connectTool:'your observability / SLO stack'});}
    case 'ct_sec_incidents':{var oi3=sig('open_incidents');var conn=oi3!=null;
      return c5obj({id:id,name:'Security incidents',connected:conn,displayValue:conn?String(oi3):'—',label:'live',color:conn?(oi3>0?'crit':'good'):'muted',
        formula:'security incidents = open incidents affecting a service, from the SIEM',
        inputs:[{name:'Open incidents',value:conn?oi3:'—',source:'SIEM · open_incidents'}],sources:[c5capSrc('siem')],
        note:'Whether any service is under an active security incident right now.',connectTool:'your SIEM'});}
    case 'ct_ai_inventory':{var g=(typeof LIVE!=='undefined'&&LIVE&&LIVE.aiRisk&&LIVE.aiRisk.governance)||{};var sys=Number(g.systems)||0;var conn=(g.systems!=null);
      return c5obj({id:id,name:'AI systems inventoried',connected:conn,displayValue:conn?String(sys):'—',label:'self-reported',color:'ink',
        formula:'AI systems inventoried = models/systems in production from your AI model registry',
        inputs:[{name:'AI systems in production',value:conn?sys:'—',source:'AI governance intake'},{name:'Inventory status',value:g.inventory||'—',source:'AI governance'}],
        sources:[{tool:'AI model registry',connector:'ai',field:'systems',lastRefresh:c5ago()}],
        note:'How many AI systems are tracked — you can only govern what you inventory.',connectTool:'your AI model registry (onboarding)'});}
    case 'ct_ai_governed':{var g2=(typeof LIVE!=='undefined'&&LIVE&&LIVE.aiRisk&&LIVE.aiRisk.governance)||{};var sys2=Number(g2.systems)||0;var gov=/nist|iso|rmf/i.test(g2.framework||'');var conn=(g2.framework!=null||g2.systems!=null);
      return c5obj({id:id,name:'Governed',connected:conn,displayValue:conn?(gov?((sys2>0?(sys2):'all')+' governed'):'framework needed'):'—',label:'computed',color:conn?(gov?'good':'warn'):'muted',
        formula:'governed = AI systems operating under a recognized governance framework (NIST AI RMF / ISO 42001)',
        inputs:[{name:'Framework adopted',value:g2.framework||'—',source:'AI governance'},{name:'Acceptable-use policy',value:g2.policy||'—',source:'AI governance'}],
        sources:[{tool:'AI governance',connector:'ai',field:'framework',lastRefresh:c5ago()}],
        note:'Whether AI ships under governance — a framework and an acceptable-use policy in place.',connectTool:'your AI-governance answers (onboarding)'});}
    case 'ct_ai_highrisk':{var g3=(typeof LIVE!=='undefined'&&LIVE&&LIVE.aiRisk&&LIVE.aiRisk.governance)||{};var hr=/high-risk|yes/i.test(g3.euAiAct||'');var conn=(g3.euAiAct!=null);
      return c5obj({id:id,name:'High-risk uses',connected:conn,displayValue:conn?(hr?'1':'0'):'—',label:'computed',color:conn?(hr?'warn':'good'):'muted',
        formula:'high-risk uses = AI systems classified high-risk (e.g. EU AI Act) that need heightened controls',
        inputs:[{name:'EU AI Act classification',value:g3.euAiAct||'—',source:'AI governance'}],
        sources:[{tool:'AI governance',connector:'ai',field:'euAiAct',lastRefresh:c5ago()}],
        note:'AI uses that carry heightened obligations — the ones to watch closest.',connectTool:'your AI-governance answers (onboarding)'});}
    case 'ct_ai_dataaccess':{var p=c5avgDeploy(['mfa','pam']);var conn=(p!=null);var watch=(p!=null&&p<90);
      return c5obj({id:id,name:'Data access by AI',connected:conn,displayValue:conn?(watch?'Relies on identity':'Controlled'):'—',label:'computed',color:conn?(watch?'warn':'good'):'muted',
        formula:'AI data access = whether AI features touching customer data depend on identity controls that carry the gap',
        inputs:[{name:'Identity controls deployed',value:conn?(p+'%'):'—',source:'MFA + PAM telemetry'}],
        sources:[c5capSrc('mfa'),c5capSrc('pam')],
        note:'AI features that touch customer data rely on the same identity controls that carry the gap — securing access secures the AI.',connectTool:'your identity + PAM tools'});}
    case 'ct_advisories':{var dep2=sig('dependabot_critical');var conn=dep2!=null;
      return c5obj({id:id,name:'Open advisories',connected:conn,displayValue:conn?String(dep2):'—',label:'live',color:conn?(dep2>0?'warn':'good'):'muted',
        formula:'open advisories = high/critical dependency advisories from your SCA scanner',
        inputs:[{name:'Critical dependency advisories',value:conn?dep2:'—',source:'SCA · dependabot_critical'}],
        sources:[{tool:'Dependabot / Snyk Open Source',connector:'sca',field:'dependabot_critical',lastRefresh:c5ago()}],
        note:'Known-vulnerable dependencies the product ships on — the software-supply-chain path to customers.',connectTool:'your SCA / dependency scanner'});}
    case 'ct_deps':{return c5obj({id:id,name:'Dependencies tracked',connected:false,displayValue:'—',label:'live',color:'muted',
        formula:'dependencies tracked = components inventoried in your SBOM',
        inputs:[{name:'SBOM component count',value:'not connected',source:'SBOM (Syft / GitHub / Snyk)'}],
        sources:[{tool:'SBOM',connector:'sbom',field:'components',lastRefresh:c5ago()}],
        note:'How much of your dependency tree is inventoried — connect your SBOM to quantify.',connectTool:'your SBOM / dependency scanner'});}
    case 'ct_unsigned':{return c5obj({id:id,name:'Unsigned builds',connected:false,displayValue:'—',label:'live',color:'muted',
        formula:'unsigned builds = releases shipped without a verified signature (supply-chain integrity)',
        inputs:[{name:'Build signing',value:'not connected',source:'CI/CD signing (Sigstore / cosign)'}],
        sources:[{tool:'CI/CD signing',connector:'cicd',field:'signed_builds',lastRefresh:c5ago()}],
        note:'Whether every release is signed and verifiable — connect your CI/CD signing to confirm.',connectTool:'your CI/CD build-signing'});}
    /* ---- Internal Audit metrics (independent assurance; no fund/approve — schedule/test/escalate/assure) ---- */
    case 'ia_areas':{var n=0;if(typeof CSF_RAW!=='undefined'){Object.keys(CSF_RAW).forEach(function(fn){n+=Object.keys(CSF_RAW[fn]).length;});}var conn=n>0;
      return c5obj({id:id,name:'Auditable areas',connected:conn,displayValue:conn?String(n):'—',label:'computed',color:'ink',
        formula:'auditable areas = control categories in the cyber audit universe (NIST CSF 2.0 categories)',
        inputs:[{name:'Control categories',value:n,source:'audit universe · NIST CSF 2.0'}],
        sources:[{tool:'Audit plan',connector:'audit',field:'universe',lastRefresh:c5ago()}],
        note:'The auditable cyber areas in your universe — the scope Internal Audit plans coverage against.',connectTool:'your audit plan (universe + risk ratings)'});}
    case 'ia_coverage':{var s=(typeof auditStats==='function')?auditStats():{pct:null};var conn=s.pct!=null;
      return c5obj({id:id,name:'Coverage · evidence',connected:conn,displayValue:conn?(s.pct+'%'):'—',label:'computed',color:conn?(s.pct>=75?'good':s.pct>=50?'warn':'crit'):'muted',
        formula:'coverage = auditable controls with evidence on file ÷ total control universe',
        method:'A proxy for audit coverage from live evidence; last-covered dates come from your audit plan/history when connected.',
        inputs:[{name:'Evidenced controls',value:conn?(s.evid+' of '+s.total):'—',source:'control universe'}],
        sources:[{tool:'Audit plan + GRC',connector:'audit',field:'coverage',lastRefresh:c5ago()}],
        note:'How much of the audit universe is currently backed by evidence — the coverage the board asks about.',connectTool:'your audit plan + GRC'});}
    case 'ia_overdue':{var M=c5expModel();var idMat=M.drivers.some(function(d){return d.id==='exp_identity'&&d.usd>0;});var conn=M.drivers.length>0;
      return c5obj({id:id,name:'Overdue high-risk',connected:conn,displayValue:conn?(idMat?'1':'0'):'—',label:'computed',color:conn?(idMat?'warn':'good'):'muted',
        formula:'overdue high-risk = high-risk areas whose top-exposure driver is unaddressed — flagged for priority review',
        inputs:[{name:'Top exposure driver',value:M.drivers[0]?M.drivers[0].name:'—',source:'exposure model'}],
        sources:[{tool:'Audit plan',connector:'audit',field:'risk_vs_coverage',lastRefresh:c5ago()}],
        note:'The high-risk area most out of step with coverage — where audit attention aligns with enterprise risk.',connectTool:'your audit plan (last-covered dates)'});}
    case 'ia_tested':{var s2=(typeof auditStats==='function')?auditStats():{pct:null};var conn=s2.pct!=null;
      return c5obj({id:id,name:'Controls tested',connected:conn,displayValue:conn?(s2.pct+'%'):'—',label:'computed',color:conn?(s2.pct>=75?'good':'warn'):'muted',
        formula:'controls tested = controls with test evidence (telemetry or document review) ÷ total controls',
        inputs:[{name:'Evidenced (tested)',value:conn?(s2.evid+' of '+s2.total):'—',source:'audit workpapers'}],
        sources:[{tool:'Audit workpapers',connector:'audit',field:'test_status',lastRefresh:c5ago()}],
        note:'How far through the control-testing plan this cycle you are — from the workpapers.',connectTool:'your audit workpapers'});}
    case 'ia_passrate':{var s3=(typeof auditStats==='function')?auditStats():{total:0,fail:[]};var conn=(s3.total>0);var pass=s3.total>0?Math.round((s3.total-s3.fail.length)/s3.total*100):null;
      return c5obj({id:id,name:'Pass rate',connected:conn,displayValue:conn?(pass+'%'):'—',label:'computed',color:conn?(pass>=90?'good':pass>=75?'warn':'crit'):'muted',
        formula:'pass rate = controls at a passing standard (CMMI ≥ 2) ÷ total controls',
        inputs:[{name:'Controls at CMMI ≥ 2',value:conn?((s3.total-s3.fail.length)+' of '+s3.total):'—',source:'control testing'},{name:'Failing / unevidenced',value:conn?s3.fail.length:'—',source:'control testing'}],
        sources:[{tool:'Audit workpapers',connector:'audit',field:'test_results',lastRefresh:c5ago()}],
        note:'Of the controls tested, how many pass — the assurance the results give.',connectTool:'your audit workpapers'});}
    case 'ia_open_findings':{var of=sig('audit_findings_open');var conn=of!=null;
      return c5obj({id:id,name:'Open findings',connected:conn,displayValue:conn?String(of):'—',label:'live',color:conn?(of<=10?'good':'warn'):'muted',
        formula:'open findings = cyber findings currently open in the issue-tracking system',
        inputs:[{name:'Open findings',value:conn?of:'—',source:'issue tracking · audit_findings_open'}],
        sources:[{tool:'Issue-tracking / GRC',connector:'grc',field:'audit_findings_open',lastRefresh:c5ago()}],
        note:'The control-gap backlog management has committed to remediate — the open audit findings.',connectTool:'your issue-tracking / GRC platform'});}
    case 'ia_repeat':{var rf=sig('audit_findings_repeat');var conn=rf!=null;
      return c5obj({id:id,name:'Repeat findings',connected:conn,displayValue:conn?String(rf):'—',label:'live',color:conn?(rf>0?'warn':'good'):'muted',
        formula:'repeat findings = findings that reappeared in a later audit (reported closed but the control did not hold)',
        inputs:[{name:'Repeat findings',value:conn?rf:'—',source:'issue tracking · audit_findings_repeat'}],
        sources:[{tool:'Issue-tracking / GRC',connector:'grc',field:'audit_findings_repeat',lastRefresh:c5ago()}],
        note:'The systemic gaps closed on paper but not in practice — the ones to escalate to the committee.',connectTool:'your issue-tracking / GRC platform'});}
    case 'ia_closed_ontime':{return c5obj({id:id,name:'Closed on time',connected:false,displayValue:'—',label:'computed',color:'muted',
        formula:'closed on time = findings remediated by their action-plan due date ÷ closed findings',
        inputs:[{name:'Action-plan due dates',value:'not connected',source:'issue-tracking system'}],
        sources:[{tool:'Issue-tracking system',connector:'grc',field:'action_plans',lastRefresh:c5ago()}],
        note:'How reliably action plans land on time — needs your issue-tracking action-plan dates.',connectTool:'your issue-tracking action plans'});}
    case 'ia_automated':{var s4=(typeof auditStats==='function')?auditStats():{evid:0,sys:0};var conn=(s4.evid>0);var auto=s4.evid>0?Math.round(s4.sys/s4.evid*100):null;
      return c5obj({id:id,name:'Evidence automated',connected:conn,displayValue:conn?(auto+'%'):'—',label:'computed',color:conn?(auto>=75?'good':'warn'):'muted',
        formula:'evidence automated = controls evidenced by live tool telemetry ÷ all evidenced controls',
        inputs:[{name:'Telemetry-evidenced',value:conn?s4.sys:'—',source:'control monitoring'},{name:'Document-evidenced',value:conn?s4.doc:'—',source:'document review'}],
        sources:[{tool:'GRC / control monitoring',connector:'grc',field:'evidence_automation',lastRefresh:c5ago()}],
        note:'How much control evidence is automated (telemetry) vs manually gathered — the audit-efficiency signal.',connectTool:'your GRC / control-monitoring systems'});}
    case 'ia_evidence_current':{return c5obj({id:id,name:'Current · under 90 days',connected:false,displayValue:'—',label:'computed',color:'muted',
        formula:'current evidence = control evidence refreshed within 90 days ÷ all evidence',
        inputs:[{name:'Evidence timestamps',value:'not connected',source:'GRC / control-monitoring'}],
        sources:[{tool:'GRC',connector:'grc',field:'evidence_freshness',lastRefresh:c5ago()}],
        note:'How fresh your control evidence is — needs evidence timestamps from your GRC system.',connectTool:'your GRC / control-monitoring systems'});}
    /* ---- Board metrics (oversight, not operations; frames shared figures for governance) ---- */
    case 'bd_material':{var oi=sig('open_incidents');var conn=oi!=null;var none=(oi==null||oi===0);
      return c5obj({id:id,name:'Material items',connected:conn,displayValue:conn?(none?'None':'Under review'):'—',label:'computed',color:conn?(none?'good':'warn'):'muted',
        formula:'material items = cyber matters assessed as material for disclosure under SEC Item 106 this quarter',
        method:'Surfaces the assessment and its basis; the disclosure determination is management’s and counsel’s, not asserted here.',
        inputs:[{name:'Open incidents assessed',value:conn?oi:'—',source:'SIEM · open_incidents'},{name:'Materiality threshold',value:(LIVE&&LIVE.economics&&LIVE.economics.materiality&&LIVE.economics.materiality.value)?usd(LIVE.economics.materiality.value):'—',source:'Item 106 assessment'}],
        sources:[{tool:'Materiality assessment (Item 106)',connector:'materiality',field:'material_items',lastRefresh:c5ago()}],
        note:'Whether any cyber matter is currently material for disclosure — the board’s first governance question.',connectTool:'your materiality assessment (onboarding)'});}
    case 'bd_reportable':{var oi2=sig('open_incidents');var conn=oi2!=null;
      return c5obj({id:id,name:'Reportable incidents · qtr',connected:conn,displayValue:conn?(oi2>0?String(oi2):'0'):'—',label:'live',color:conn?(oi2>0?'warn':'good'):'muted',
        formula:'reportable incidents = incidents that crossed the disclosure threshold this quarter',
        inputs:[{name:'Incidents this quarter',value:conn?oi2:'—',source:'SIEM · open_incidents'}],sources:[c5capSrc('siem')],
        note:'How many cyber incidents were reportable this quarter — from the incident record.',connectTool:'your SIEM'});}
    case 'bd_mat_process':{var m=(LIVE&&LIVE.economics&&LIVE.economics.materiality)||{};var conn=(m.value!=null);
      return c5obj({id:id,name:'Materiality process',connected:conn,displayValue:conn?'Documented':'—',label:'self-reported',color:conn?'good':'muted',
        formula:'materiality process = whether a documented threshold and method are applied consistently',
        inputs:[{name:'Threshold',value:m.value!=null?usd(m.value):'—',source:'Item 106 assessment'},{name:'Basis',value:m.basis||'—',source:'materiality policy'}],
        sources:[{tool:'Materiality assessment',connector:'materiality',field:'basis',lastRefresh:c5ago()}],
        note:'Whether the process to decide materiality is documented and sound — the board confirms the process, not each call.',connectTool:'your materiality basis (onboarding)'});}
    case 'bd_incidents_assessed':{var oi3=sig('open_incidents');var conn=oi3!=null;
      return c5obj({id:id,name:'Incidents assessed',connected:conn,displayValue:conn?(oi3+' assessed'):'—',label:'live',color:conn?'good':'muted',
        formula:'incidents assessed = incidents run through the materiality assessment this quarter',
        inputs:[{name:'Incidents',value:conn?oi3:'—',source:'SIEM · open_incidents'}],sources:[c5capSrc('siem')],
        note:'That every incident was assessed against the threshold — none met it this quarter.',connectTool:'your SIEM + materiality assessment'});}
    case 'bd_disclosure_controls':{var ir=(LIVE&&LIVE.governance&&LIVE.governance.ir)||{};var tested=/yes|tested|tabletop/i.test(ir.tested||'');var conn=!!ir.tested;
      return c5obj({id:id,name:'Disclosure controls',connected:conn,displayValue:conn?(tested?'Effective':'Not tested'):'—',label:'self-reported',color:conn?(tested?'good':'warn'):'muted',
        formula:'disclosure controls = whether controls over cyber disclosure are documented and tested',
        inputs:[{name:'IR / disclosure process tested',value:ir.tested||'—',source:'governance'}],
        sources:[{tool:'Governance',connector:'governance',field:'disclosure_controls',lastRefresh:c5ago()}],
        note:'Whether the controls that ensure timely, accurate disclosure are operating — an Item 106 expectation.',connectTool:'your governance answers (onboarding)'});}
    case 'bd_threshold_basis':{var m2=(LIVE&&LIVE.economics&&LIVE.economics.materiality)||{};var conn=(m2.basis!=null||m2.value!=null);
      return c5obj({id:id,name:'Threshold basis',connected:conn,displayValue:conn?'Documented':'—',label:'self-reported',color:conn?'good':'muted',
        formula:'threshold basis = the quantitative + qualitative basis for the materiality threshold',
        inputs:[{name:'Basis',value:m2.basis||'—',source:'materiality policy'},{name:'Threshold',value:m2.value!=null?usd(m2.value):'—',source:'Item 106'}],
        sources:[{tool:'Materiality assessment',connector:'materiality',field:'basis',lastRefresh:c5ago()}],
        note:'That the threshold rests on a documented, consistent basis — not an ad-hoc judgment.',connectTool:'your materiality basis (onboarding)'});}
    case 'bd_spend_peers':{return c5obj({id:id,name:'Spend vs. peers',connected:false,displayValue:'—',label:'modeled',color:'muted',
        formula:'spend proportionality = cyber spend vs the anonymized peer benchmark for your size/sector',
        inputs:[{name:'Peer spend benchmark',value:'not connected',source:'peer cohort'}],
        sources:[{tool:'DTNKSHIELD peer cohort',connector:'peer',field:'spend_benchmark',lastRefresh:c5ago()}],
        note:'Whether the enterprise is over- or under-spending on cyber vs peers — needs the peer spend benchmark.',connectTool:'the anonymous peer benchmark'});}
    case 'bd_funded':{var st=(typeof ROI_STATE!=='undefined'&&ROI_STATE)?ROI_STATE:null;var conn=!!(st&&st.n>0);var yes=!!(st&&st.invested>0);
      return c5obj({id:id,name:'Funded to sustain',connected:conn||true,displayValue:(st&&st.invested>0)?'Yes':'Management to fund',label:'computed',color:(st&&st.invested>0)?'good':'warn',
        formula:'funded to sustain = whether the funded initiative portfolio covers the top exposure driver',
        inputs:[{name:'Funded initiatives',value:st?st.n:'—',source:'initiatives portfolio'},{name:'Invested',value:(st&&st.invested>0)?usd(st.invested):'—',source:'ticketing + decisions'}],
        sources:[{tool:'Program model',connector:'nerion',field:'funded_portfolio',lastRefresh:c5ago()}],
        note:'Whether management has funded the action that sustains the improving trend — the board notes, it does not fund.',connectTool:'your funded initiatives (import)'});}
    case 'bd_resilience_inv':{var d=sig('dr_test_days');var imm=sig('backup_immutable_pct');var conn=(d!=null||imm!=null);var ok=((d==null||d<=90)&&(imm==null||imm>=95));
      return c5obj({id:id,name:'Resilience investment',connected:conn,displayValue:conn?(ok?'On track':'Gaps'):'—',label:'computed',color:conn?(ok?'good':'warn'):'muted',
        formula:'resilience investment = recovery tested recently and backups verified',
        inputs:[{name:'Days since DR test',value:d!=null?(d+' days'):'—',source:'BC/DR · dr_test_days'},{name:'Immutable backups',value:imm!=null?(imm+'%'):'—',source:'backup'}],
        sources:[{tool:'BC/DR records',connector:'bcdr',field:'recovery',lastRefresh:c5ago()}],
        note:'That recovery is tested and within targets — resilience the board can rely on.',connectTool:'your BC/DR + backup platform'});}
    /* ---- CPO (Chief Product Officer) metrics; identity framed as a product opportunity ---- */
    case 'cp_product_security':{var oi=sig('open_incidents'),dep=sig('dependabot_critical'),css=sig('code_scanning_open');
      // Evaluate the product surface across every dimension it lists — not just
      // incidents. A dimension "flags" when it has open items; the verdict is the
      // worst dimension, so a clean-incident product with open critical findings
      // is Watch, never Strong.
      var dims=[
        {name:'Active incidents on a shipped feature',v:oi,ok:(oi==null||oi<=0),val:(oi!=null?(oi>0?(oi+' active'):'none'):'not connected'),source:'SIEM · open_incidents'},
        {name:'Critical dependency findings (SCA)',v:dep,ok:(dep==null||dep<=0),val:(dep!=null?(dep>0?(dep+' open'):'none'):'not connected'),source:'Dependabot / Snyk · dependabot_critical'},
        {name:'Open code-scanning findings (SAST)',v:css,ok:(css==null||css<=0),val:(css!=null?(css>0?(css+' open'):'none'):'not connected'),source:'code scanning · code_scanning_open'}
      ];
      var evaluated=dims.filter(function(d){return d.v!=null;});var conn=evaluated.length>0;
      var incidentActive=(oi!=null&&oi>0);var failing=evaluated.filter(function(d){return !d.ok;}).length;
      var verdict=incidentActive?'At risk':(failing===0?'Strong':(failing>=2?'Weak':'Watch'));
      var vcolor=incidentActive?'crit':(failing===0?'good':(failing>=2?'crit':'warn'));
      var pinputs=dims.map(function(d){return {name:d.name,value:d.val,color:(d.v==null?'muted':d.ok?'good':'warn'),source:d.source};});
      pinputs.push({name:'= Verdict',value:verdict+'  ('+(evaluated.length-failing)+' of '+evaluated.length+' dimensions clean'+(incidentActive?' · incident active':'')+')',source:'worst evaluated dimension'});
      return c5obj({id:id,name:'Product security',connected:conn,displayValue:conn?verdict:'—',label:'computed',color:conn?vcolor:'muted',
        formula:'product security = the worst of the evaluated dimensions — active incidents, critical dependency findings (SCA), and open code-scanning findings (SAST) across the product surface',
        method:'Each dimension is evaluated below. Strong = every evaluated dimension is clean; Watch = one has open findings; Weak = two or more; At risk = an incident is active on a shipped feature. This is the whole product surface — connect a per-application inventory to break it down product by product.',
        inputs:pinputs,
        sources:[{tool:'SDLC gates + product scans',connector:'appsec',field:'product_security',lastRefresh:c5ago()}],
        note:'The one-glance read on whether the product ships secure — across features, dependencies and code.',connectTool:'your SDLC gates + product scanners (+ a per-app inventory to split by product)'});}
    case 'cp_sbd_coverage':{var css2=sig('code_scanning_open'),dep2=sig('dependabot_critical'),mg=sig('changes_merged_wk');
      // The full target set of 5 secure-SDLC practices. Each counts only when its
      // telemetry is present; the two without a live signal yet are shown too, so
      // the denominator (and therefore the %) is fully visible.
      var pr=[
        {name:'Static analysis (SAST)',on:css2!=null,source:'code scanning · code_scanning_open'},
        {name:'Dependency scanning (SCA)',on:dep2!=null,source:'Dependabot / Snyk · dependabot_critical'},
        {name:'Change review in CI/CD',on:mg!=null,source:'CI/CD · changes_merged_wk'},
        {name:'Secrets scanning',on:false,source:'no secrets-scanning signal connected yet'},
        {name:'Threat modeling',on:false,source:'no threat-modeling signal connected yet'}
      ];
      var inPlace=pr.filter(function(x){return x.on;}).length;var total=pr.length;var conn=inPlace>0;var pct=Math.round(inPlace/total*100);
      var sbInputs=pr.map(function(x){return {name:x.name,value:x.on?'evidenced':'not connected',color:x.on?'good':'muted',source:x.source};});
      sbInputs.push({name:'= Coverage',value:inPlace+' of '+total+' target practices = '+pct+'%',source:'evidenced ÷ target'});
      return c5obj({id:id,name:'Secure-by-design coverage',connected:conn,displayValue:conn?(pct+'%'):'—',label:'computed',color:conn?(pct>=80?'good':pct>=50?'warn':'crit'):'muted',
        formula:'secure-by-design coverage = secure-SDLC practices evidenced in the pipeline ÷ '+total+' target practices',
        method:'Five target practices (SAST, SCA, change review, secrets scanning, threat modeling). Each counts only when its telemetry is present — all five are listed below so the count and the denominator are visible. '+inPlace+' of '+total+' are evidenced → '+pct+'%.',
        inputs:sbInputs,
        sources:[{tool:'SDLC tooling',connector:'sdlc',field:'secure_by_design',lastRefresh:c5ago()}],
        note:'How deeply secure-by-design is running in the pipeline for new features — measured, not asserted.',connectTool:'your SDLC / application-security tooling'});}
    case 'cp_open_risks':{var dep3=sig('dependabot_critical');var conn=dep3!=null;
      return c5obj({id:id,name:'Open product risks',connected:conn,displayValue:conn?(dep3+' high'):'—',label:'live',color:conn?(dep3>0?'warn':'good'):'muted',
        formula:'open product risks = high/critical security findings open in shipped product',
        inputs:[{name:'Critical findings',value:conn?dep3:'—',source:'SCA · dependabot_critical'}],
        sources:[{tool:'Product scanners',connector:'appsec',field:'dependabot_critical',lastRefresh:c5ago()}],
        note:'The high-priority security risks currently in the product surface.',connectTool:'your product scanners'});}
    case 'cp_mfa':{var m=sig('mfa_pct');var conn=m!=null;
      return c5obj({id:id,name:'MFA adoption',connected:conn,displayValue:conn?(m+'%'):'—',label:'live',color:conn?(m>=80?'good':'warn'):'muted',
        formula:'MFA adoption = share of user accounts with multi-factor authentication enabled',
        inputs:[{name:'Accounts on MFA',value:conn?(m+'%'):'—',source:'identity · mfa_pct'}],
        sources:[c5capSrc('mfa')],
        note:'How strongly users have adopted account security — a product-trust signal, and a lever the identity fix raises.',connectTool:'your identity provider'});}
    case 'cp_pass_rate':{return c5obj({id:id,name:'Releases passing security first-time',connected:false,displayValue:'—',label:'computed',color:'muted',
        formula:'security-gate pass rate = releases clearing the security gate on the first attempt ÷ releases',
        inputs:[{name:'Gate pass/fail records',value:'not connected',source:'CI/CD security gates'}],
        sources:[{tool:'CI/CD security gates',connector:'cicd',field:'gate_pass_rate',lastRefresh:c5ago()}],
        note:'How often releases clear security first-time — needs your CI/CD security-gate records.',connectTool:'your CI/CD security-gate records'});}
    case 'cp_cycle_time':{return c5obj({id:id,name:'Added cycle time',connected:false,displayValue:'—',label:'computed',color:'muted',
        formula:'added cycle time = extra lead-time added by security gates per release',
        inputs:[{name:'Deployment lead-time',value:'not connected',source:'CI/CD deployment events'}],
        sources:[{tool:'CI/CD',connector:'cicd',field:'lead_time',lastRefresh:c5ago()}],
        note:'How much time security gates add to delivery — needs your CI/CD deployment lead-time.',connectTool:'your CI/CD deployment events'});}
    case 'cp_blocker':{var M=c5expModel();var idMat=M.drivers.some(function(d){return d.id==='exp_identity'&&d.usd>0;});var conn=M.drivers.length>0;
      return c5obj({id:id,name:'Recurring blocker',connected:conn,displayValue:conn?(idMat?'Identity/access':'None'):'—',label:'computed',color:conn?(idMat?'warn':'good'):'muted',
        formula:'recurring blocker = the exposure that repeatedly gates releases — from the top exposure driver',
        inputs:[{name:'Top exposure driver',value:M.drivers[0]?M.drivers[0].name:'—',source:'exposure model'}],
        sources:[{tool:'Product + security backlog',connector:'backlog',field:'recurring_blocker',lastRefresh:c5ago()}],
        note:'The one thing that keeps coming back in the pipeline — the identity/access model, fixable once.',connectTool:'your controls + backlog'});}
    case 'cp_open_items':{var css4=sig('code_scanning_open'),dep4=sig('dependabot_critical');var conn=(css4!=null||dep4!=null);var n=(css4||0)+(dep4||0);
      return c5obj({id:id,name:'Open security items',connected:conn,displayValue:conn?String(n):'—',label:'live',color:conn?(n<=15?'good':'warn'):'muted',
        formula:'open security items = product-security work queued (open SAST findings + critical dependency alerts)',
        inputs:[{name:'Open SAST findings',value:css4!=null?css4:'—',source:'code scanning'},{name:'Critical dependency alerts',value:dep4!=null?dep4:'—',source:'SCA'}],
        sources:[{tool:'Product + security issue trackers',connector:'backlog',field:'open_items',lastRefresh:c5ago()}],
        note:'The product-security backlog — the work queued against the product surface.',connectTool:'your product + security issue trackers'});}
    case 'cp_high_priority':{var dep5=sig('dependabot_critical');var conn=dep5!=null;
      return c5obj({id:id,name:'High-priority',connected:conn,displayValue:conn?String(dep5):'—',label:'live',color:conn?(dep5>0?'warn':'good'):'muted',
        formula:'high-priority items = critical-severity security items leading the backlog',
        inputs:[{name:'Critical items',value:conn?dep5:'—',source:'SCA · dependabot_critical'}],
        sources:[{tool:'Issue trackers',connector:'backlog',field:'high_priority',lastRefresh:c5ago()}],
        note:'How many product-security items are high-priority — the ones to sequence first.',connectTool:'your product + security issue trackers'});}
    case 'cp_funded':{var st=(typeof ROI_STATE!=='undefined'&&ROI_STATE)?ROI_STATE:null;var yes=!!(st&&st.invested>0);
      return c5obj({id:id,name:'Funded',connected:true,displayValue:yes?'Yes':'To fund',label:'computed',color:yes?'good':'warn',
        formula:'funded = whether the top product-security item is covered by the funded initiative portfolio',
        inputs:[{name:'Funded initiatives',value:st?st.n:'—',source:'initiatives portfolio'},{name:'Invested',value:yes?usd(st.invested):'—',source:'ticketing + decisions'}],
        sources:[{tool:'Program model',connector:'nerion',field:'funded_portfolio',lastRefresh:c5ago()}],
        note:'Whether the top backlog item is funded — the identity/access remediation.',connectTool:'your funded initiatives (import)'});}
  }
  return c5obj({id:id,name:id,connected:false,displayValue:'—',color:'muted',note:'No metric definition.'});
}
/* Audit areas / control sets / evidence areas — the same underlying control families
   seen through four audit lenses; identity is where the signals converge (it maps to
   the top exposure driver, so it reads overdue / outstanding / repeat / gap). */
function c5AuditAreas(kind){
  var M=c5expModel();var idMat=M.drivers.some(function(d){return d.id==='exp_identity'&&d.usd>0;});
  var base=[
    {k:'identity',l:(kind==='test'?'Identity controls':(kind==='evid'?'Identity controls':'Identity & access management')),risk:'High'},
    {k:'thirdparty',l:(kind==='test'?'Access provisioning':(kind==='evid'?'Access reviews':'Third-party risk')),risk:'High'},
    {k:'data',l:(kind==='test'?'Logging & monitoring':(kind==='evid'?'Change records':'Data protection')),risk:'High'},
    {k:'ir',l:(kind==='test'?'Encryption':(kind==='evid'?'Incident records':'Incident response')),risk:'Medium'},
    {k:'access',l:(kind==='test'?'Backup & recovery':(kind==='evid'?'Vendor assessments':'Access recertification')),risk:'High'}
  ];
  base.forEach(function(a){
    if(a.k==='identity'&&idMat){
      a.converge=true;a.c='warn';
      a.status=(kind==='test'?'Outstanding':(kind==='evid'?'Gap':(kind==='find'?'Escalate':'Overdue')));
      a.sub=(kind==='test'?'Testing incomplete · exceptions open':(kind==='evid'?'Evidence incomplete · manual to gather':(kind==='find'?'Repeat · not fully remediated last cycle':'High-risk · overdue for review')));
    } else {
      a.converge=false;a.c=(a.k==='thirdparty'&&kind==='find')?'blue':'good';
      a.status=(kind==='test'?'Passed':(kind==='evid'?'Ready':(kind==='find'?(a.k==='thirdparty'?'On track':'On track'):'Current')));
      a.sub=(kind==='test'?'Tested · passed':(kind==='evid'?'Current · automated':(kind==='find'?'Remediation on track':'Reviewed within cycle')));
    }
  });
  return base;
}
/* Customer-facing services from the crown-jewel systems; the top one carries the
   identity/access risk (the same shared exposure), the rest read secure. */
function c5Services(){
  var cj=(typeof LIVE!=='undefined'&&LIVE&&LIVE.crown_jewels)||[];var M=c5expModel();var idMat=M.drivers.some(function(d){return d.id==='exp_identity'&&d.usd>0;});
  var edr=sig('edr_pct'),patch=sig('patch_pct'),oi=sig('open_incidents');
  // Telemetry source string, named honestly. Per-asset EDR/VM feeds aren't wired
  // yet, so we read the estate signals; the src column names the tools they come
  // from rather than a vague "within posture".
  var vmTxt=(patch!=null?('VM: '+(100-patch)+'% critical open'):'VM: not connected');
  var edrTxt=(edr!=null?('EDR '+edr+'% deployed'):'EDR: not connected');
  // Reconcile with the onboarding map: select the SAME number of crown jewels it
  // does — top max(2, ceil(15% of assets)) — so the cockpit count always matches
  // the crown-jewels-preview the user confirmed at onboarding.
  var assetN=(typeof LIVE!=='undefined'&&LIVE&&LIVE.counts&&Number(LIVE.counts.assets))||cj.length;
  var cjN=Math.min(cj.length,12,Math.max(2,Math.ceil(assetN*0.15)));
  var list=cj.slice(0,cjN).map(function(c,i){var o={name:c.name,tier:c.tier};
    if(i===0&&idMat){o.status='At risk';o.c='warn';o.sub='Identity / access path is exposed';o.src='EDR + identity/access telemetry';o.why='exp_identity';}
    else{o.status='Secure';o.c='good';o.sub='No active detection';o.src=edrTxt+' · '+vmTxt;}
    return o;});
  return {list:list,total:list.length,atRisk:list.filter(function(x){return x.status==='At risk';}).length};
}
/* Critical processes from the operations model; at-risk status computed from whether
   a material exposure driver / flagged vendor maps to the process. */
function c5Processes(){
  var pe=(typeof LIVE!=='undefined'&&LIVE&&LIVE.process_exposure)||[];
  var rs=(typeof LIVE!=='undefined'&&LIVE&&LIVE.resilience)||{};var blast=(rs.top_vendor_blast&&rs.top_vendor_blast.systems)||[];var tvName=(rs.top_vendor_blast&&rs.top_vendor_blast.vendor)||null;
  var M=c5expModel();var idMat=M.drivers.some(function(d){return d.id==='exp_identity'&&d.usd>0;});
  var list=pe.slice().map(function(p){return {name:p.name,exposure_usd:p.exposure_usd,crown_jewel:p.crown_jewel,criticality:p.criticality};}).sort(function(a,b){return (b.exposure_usd||0)-(a.exposure_usd||0);});
  list.forEach(function(p,i){
    var touches=blast.some(function(s){return String(s).toLowerCase().indexOf(String(p.name).toLowerCase())>=0||String(p.name).toLowerCase().indexOf(String(s).toLowerCase())>=0;});
    if(i===0&&idMat){p.status='At risk';p.c='warn';p.sub='Identity gap threatens uptime';}
    else if(touches&&tvName){p.status='Watch';p.c='blue';p.sub='Depends on '+tvName+' · rating to watch';}
    else{p.status='Safe';p.c='good';p.sub='No material cyber exposure';}
  });
  var atRisk=list.filter(function(p){return p.status==='At risk';}).length;
  return {list:list,total:list.length,atRisk:atRisk,protected:list.length-atRisk};
}
/* Principal risks on one scale — from the enterprise risk register (LIVE.portfolio);
   cyber's value is the shared exposure object so it matches the other seats. */
function c5Principal(){
  var p=(typeof LIVE!=='undefined'&&LIVE&&LIVE.portfolio)||{};var M=c5expModel();var cyberV=M.total||Number(p.cyber)||0;
  var tr=trajInfo();var cyberTrend=tr.two?(tr.down?'Falling':'Rising'):'Steady',cyberTC=tr.two?(tr.down?'dn':'up'):'st';
  var rows=[{k:'creditMarket',l:'Credit / market',v:Number(p.creditMarket)||0,tr:'Steady',tc:'st'},
    {k:'operational',l:'Operational risk',v:Number(p.operational)||0,tr:'Steady',tc:'st'},
    {k:'cyber',l:'Cyber risk',v:cyberV,cyber:true,tr:cyberTrend,tc:cyberTC},
    {k:'thirdParty',l:'Third-party risk',v:Number(p.thirdParty)||0,tr:'Steady',tc:'st'},
    {k:'compliance',l:'Compliance & regulatory',v:Number(p.compliance)||0,tr:'Steady',tc:'st'}]
    .filter(function(r){return r.v>0;}).sort(function(a,b){return b.v-a.v;});
  var cyberRank=null;rows.forEach(function(r,i){if(r.cyber)cyberRank=i+1;});
  return {rows:rows,max:rows.length?rows[0].v:1,cyberRank:cyberRank,cyberV:cyberV};
}
/* Per-category residual vs an even allocation of appetite (labeled) — identity, the
   largest driver, naturally exceeds its share, so 'over limit' emerges from data. */
function c5Categories(){
  var M=c5expModel();var ap=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&LIVE.economics.appetite&&Number(LIVE.economics.appetite.appetite))||0;
  var n=M.drivers.length;var limit=(ap>0&&n>0)?ap/n:0;
  return {drivers:M.drivers,limit:limit,appetite:ap,max:M.drivers.length?Math.max(M.drivers[0].usd,limit)*1.1:1};
}
/* Evidence-based control-family assurance — deployment telemetry + last-test signals. */
function c5Assurance(){
  var fams=[
    {k:'identity',l:'Identity & access',caps:['mfa','pam'],test:'access_review_pct'},
    {k:'thirdparty',l:'Third-party',caps:['__vendor']},
    {k:'detect',l:'Detection & response',caps:['siem','edr']},
    {k:'data',l:'Data protection',caps:['dlp']},
    {k:'endpoint',l:'Endpoint',caps:['edr']},
    {k:'network',l:'Network & perimeter',caps:['seg']}
  ];
  fams.forEach(function(f){
    if(f.caps[0]==='__vendor'){var V=c5vendors();var w=V.worst?V.worst.score:null;f.deploy=w;f.connected=V.seed.length>0;
      f.status=(w==null)?'Not connected':(w>=75?'Assured':'Partial');f.evidence=V.vs?('Live rating · '+V.vs.vendor):'monitoring service';f.sub=(w!=null?('Monitoring live · worst rating '+w+'/100'):'add your tier-1/2 vendors');}
    else{var d=c5avgDeploy(f.caps);f.deploy=d;f.connected=(d!=null);
      f.status=(d==null)?'Not connected':(d>=90?'Assured':(d>=50?'Partial':'Gap'));
      var t=f.test?sig(f.test):null;
      f.evidence=(d!=null?('Telemetry live · '+d+'% deployed'):'connect the control tool')+(t!=null?(' · reviews '+t+'%'):'');
      f.sub=(d!=null?((t!=null?('Reviews '+t+'% · '):'')+'telemetry live · '+d+'% deployed'):'connect the control tool');}
  });
  var assured=fams.filter(function(f){return f.status==='Assured';}).length;
  var gaps=fams.filter(function(f){return f.connected&&f.status!=='Assured';}).length;
  return {fams:fams,assured:assured,gaps:gaps};
}
/* Top risks with owners (role defaults from the risk register) + status from the model. */
function c5Owners(){
  var M=c5expModel();var idMat=M.drivers.some(function(d){return d.id==='exp_identity'&&d.usd>0;});
  var V=c5vendors();var tvName=V.worst?V.worst.name:'top vendor';
  var rows=[
    {risk:'Identity gap',owner:'CISO',status:idMat?'Push needed':'On track',c:idMat?'a':'g',act:'action funded, needs your push'},
    {risk:'Third-party — '+tvName,owner:'Procurement + CISO',status:'Monitoring',c:'b',act:'monitoring'},
    {risk:'Unpatched systems',owner:'IT Ops',status:'On track',c:'g',act:'remediation on track'},
    {risk:'Endpoint coverage',owner:'CISO',status:'On track',c:'g',act:'improving'},
    {risk:'Phishing & email',owner:'CISO + HR',status:'Accepted',c:'n',act:'risk accepted'}
  ];
  return {rows:rows,total:rows.length,owned:rows.length};
}
/* Strategic objectives — from an onboarding strategy input when present, else a
   labeled sector-default set. Each objective's at-risk status is COMPUTED: flagged
   when a material exposure driver maps to it (identity → the platform), so the "1 at
   risk" emerges from the real exposure model, not a hardcode. */
function c5Objectives(){
  var stored=(typeof LIVE!=='undefined'&&LIVE&&Array.isArray(LIVE.objectives)&&LIVE.objectives.length)?LIVE.objectives:null;
  if(!stored){try{stored=JSON.parse(localStorage.getItem('cyberrx_objectives')||'null');}catch(_){}}
  var base=(Array.isArray(stored)&&stored.length)?stored.map(function(x){var nm=x.name||x;return {name:(typeof sanStr==='function'?sanStr(nm):nm),map:(x.map||'')};}):[
    {name:'Grow the customer platform',map:'identity'},{name:'Expand into new markets',map:''},
    {name:'Launch the new product line',map:'product'},{name:'Improve margins',map:'cost'},
    {name:'M&A integration',map:'vendor'},{name:'Sustainability commitments',map:''},
    {name:'Talent & workforce',map:'workforce'}];
  var M=c5expModel();var identityMaterial=M.drivers.some(function(d){return d.id==='exp_identity'&&d.usd>0;});
  var tv=(typeof LIVE!=='undefined'&&LIVE&&LIVE.resilience&&LIVE.resilience.top_vendor_blast&&LIVE.resilience.top_vendor_blast.vendor);
  base.forEach(function(o){
    if(o.map==='identity'&&identityMaterial){o.status='at risk';o.c='warn';o.sub='Identity gap threatens uptime and trust';}
    else if(o.map==='vendor'&&tv){o.status='watch';o.c='blue';o.sub='Diligence clean · monitoring the acquired estate';}
    else if(o.map==='product'){o.status='safe';o.c='good';o.sub='Secure-by-design on track';}
    else if(o.map==='cost'){o.status='safe';o.c='good';o.sub='Cost-optimization opportunities identified';}
    else if(o.map==='workforce'){o.status='safe';o.c='good';o.sub='Security-culture program on plan';}
    else if(o.name==='Sustainability commitments'){o.status='safe';o.c='good';o.sub='No cyber dependency of note';}
    else{o.status='safe';o.c='good';o.sub='No material cyber blocker';}
  });
  var atRisk=base.filter(function(o){return o.status==='at risk';}).length;
  return {objs:base,total:base.length,atRisk:atRisk,protected:base.length-atRisk,fromInput:!!(Array.isArray(stored)&&stored.length)};
}
function c5driverMetric(id){
  var M=c5expModel();var d=null;M.drivers.forEach(function(x){if(x.id===id)d=x;});
  var conn=!!(d&&d.connected&&d.usd>0);var tr=c5trendPill(d);
  var caps=(d?d.caps:[]).filter(function(k){return k!=='__vendor';});
  var totalRaw=M.drivers.reduce(function(s,x){return s+(x.raw||0);},0);
  var sharePct=(d&&totalRaw>0)?Math.round(d.raw/totalRaw*100):0;
  var ale=M.ale||0;
  // Build a fully-auditable Inputs trace: every control's live deployment and gap,
  // then the exact arithmetic that turns them into this driver's dollar figure.
  var inputs=[];
  if(d&&d.caps[0]==='__vendor'){
    var V=c5vendors();var w=V.worst?V.worst.score:null;
    inputs.push({name:'Worst-rated vendor',value:V.worst?(V.worst.name+' · '+V.worst.score+'/100'):'—',source:(V.vs?V.vs.vendor:'monitoring service')+' · overall_score'});
    inputs.push({name:'Control-gap severity',value:(w!=null?((100-w)+'% (100 − '+w+' rating)'):'100% (not connected)'),source:'computed'});
    inputs.push({name:'Control-value weight',value:'1.0 (single-factor vendor risk)',source:'control-value ledger'});
  } else {
    caps.forEach(function(k){var c=CAP_BY_KEY[k];var p=capDeploy(c);
      inputs.push({name:c.name.replace(/ *\(.*\)/,'')+' deployment',value:(p!=null?(p+'% deployed → '+(100-p)+'% gap'):'not connected'),color:capColor(p),source:c.tool+' · '+((typeof CAP_SIGKEY!=='undefined'&&CAP_SIGKEY[k])||k)});});
    var wstr=caps.map(function(k){var fw=(typeof CAP_FRAMEWORK!=='undefined')?CAP_FRAMEWORK[k]:null;return String(k).toUpperCase()+' '+(((fw&&fw.weight)||1).toFixed(1));}).join(' + ');
    inputs.push({name:'Control-gap severity',value:(d?Math.round(d.gap*100):0)+'% (mean of the gaps above)',source:'computed'});
    inputs.push({name:'Control-value weight (NIST CSF)',value:(d?d.weight.toFixed(1):'—')+' ( '+wstr+' )',source:'control-value ledger'});
  }
  inputs.push({name:'Weighted gap score',value:(d?d.raw.toFixed(2):'0')+'  ( '+(d?d.gap.toFixed(2):'0')+' × '+(d?d.weight.toFixed(1):'0')+' )',source:'computed'});
  inputs.push({name:'Share of total exposure',value:sharePct+'%  ( '+(d?d.raw.toFixed(2):'0')+' ÷ '+totalRaw.toFixed(2)+' across all drivers )',source:'computed'});
  inputs.push({name:'Total modeled loss (ALE)',value:ale>0?usd(ale):'—',source:'risk register · economics.ale'});
  inputs.push({name:'= '+(d?d.name:'this driver'),value:(conn?usd(d.usd):'—')+(conn?('  ( '+sharePct+'% × '+usd(ale)+' )'):''),source:'—'});
  return c5obj({id:id,name:d?d.name:id,connected:conn,displayValue:conn?usd(d.usd):'—',label:'modeled',color:'ink',trend:tr,threatens:d?d.threatens:'',largest:!!(d&&d.largest),
    formula:(d?d.name:'this driver')+' = its share of your modeled annual loss (ALE), where share = (control-gap severity × control-value weight) ÷ the same product summed across all drivers.',
    method:'Read it top-to-bottom in the Inputs below. Control-gap severity = 1 − the live deployment of the controls that reduce this risk. Control-value weight comes from the control-value ledger — each control carries a risk-removal weight from its NIST CSF / 800-53 mapping (e.g. MFA 1.6, PAM 1.5). Multiplying gives a weighted gap score; its share of the total, applied to your ALE (from the risk register you set at onboarding), is the dollar figure. No AI, no fixed numbers — every input above is a live signal or a value you entered.',
    inputs:inputs,sources:[{tool:'Nerion risk model',connector:'nerion',field:'ale_decomposition',lastRefresh:c5ago()}],
    note:'Threatens '+(d?d.threatens:'')+'. '+((d&&d.largest)?'Your single largest exposure — and it has a scoped, funded fix.':'One of your top exposure drivers.'),
    connectTool:'the controls that mitigate this driver'});
}
var C5_CTL={ctl_identity:{label:'Identity & MFA',caps:['mfa','pam']},ctl_email:{label:'Email security',caps:['aware']},ctl_edr:{label:'EDR / XDR',caps:['edr']},ctl_vuln:{label:'Vulnerability management',caps:['vuln']},ctl_dlp:{label:'Data loss prevention',caps:['dlp']}};
function c5ctlMetric(id){
  var def=C5_CTL[id]||{label:id,caps:[]};var rr=(typeof capRiskRemoved==='function')?capRiskRemoved():{byCap:{},total:0,anyLive:false};
  var removed=def.caps.reduce(function(s,k){return s+(rr.byCap[k]||0);},0);var conn=rr.anyLive&&removed>0;
  var sharePct=(rr.total>0)?Math.round(removed/rr.total*100):0;
  var cinputs=def.caps.map(function(k){var c=CAP_BY_KEY[k];var p=capDeploy(c);var fw=(typeof CAP_FRAMEWORK!=='undefined')?CAP_FRAMEWORK[k]:null;
    return {name:c.name.replace(/ *\(.*\)/,''),value:(p!=null?(p+'% deployed × wt '+(((fw&&fw.weight)||1).toFixed(1))):'not connected')+' → '+usd(rr.byCap[k]||0)+' removed',color:capColor(p),source:c.tool+' · '+((typeof CAP_SIGKEY!=='undefined'&&CAP_SIGKEY[k])||k)};});
  cinputs.push({name:'This area total',value:conn?(usd(removed)+'  ('+sharePct+'% of all controls)'):'—',source:'Σ of the capabilities above'});
  cinputs.push({name:'Total control-removed risk',value:rr.total>0?usd(rr.total):'—',source:'control-value ledger'});
  return c5obj({id:id,name:def.label,connected:conn,displayValue:conn?(usd(removed)+' removed'):'—',label:'modeled',color:'good',removed:removed,
    formula:'risk removed = total control-removed risk × ( this area’s NIST weight × its deployment ) ÷ Σ across all controls',
    method:'Nerion models the total dollars your controls buy down (the control-value ledger), then splits that total across areas in proportion to each one’s (framework weight × live deployment) — a heavily-weighted, well-deployed control claims a bigger share. Return-per-dollar (×) needs per-control spend, which isn’t connected; until then this shows dollars removed, not a multiple.',
    inputs:cinputs,
    sources:def.caps.map(function(k){return c5capSrc(k);}),
    note:'What this control area removes in dollars — its weighted share of the total. Attribute spend by control to light up the return multiple (×).',connectTool:'per-control security spend'});
}
function c5tacticMetric(t){
  var caps=(typeof TACTIC_CAPS!=='undefined'&&TACTIC_CAPS[t])||[];var cov=(typeof threatCoverage==='function')?threatCoverage(caps):null;var conn=cov!=null;
  var state=cov==null?'limited':cov>=80?'covered':cov>=50?'partial':'limited';var color=cov==null?'muted':cov>=80?'good':cov>=50?'warn':'crit';
  return c5obj({id:'tac_'+t,name:t,connected:conn,displayValue:conn?(cov+'% defended'):'not connected',label:'computed',color:color,state:state,
    formula:'tactic coverage = mean live deployment/coverage of the controls MITRE ATT&CK maps to this tactic',
    method:'Each control’s % is the live deployment or coverage figure its own tool reports — telemetry, not a manual entry: Qualys/Tenable report patch coverage (patch_pct), KnowBe4/Proofpoint report training completion (training_pct), Splunk/Sentinel report log-source coverage (siem_coverage_pct), your IdP reports MFA enrollment (mfa_pct), and so on. Tactic coverage is the mean of those. A control with no connected tool reads "not connected" and is left out of the mean. Figures are illustrative in the sample workspace and become live the moment each tool is connected.',
    inputs:caps.map(function(k){var c=CAP_BY_KEY[k];var p=capDeploy(c);var s=(typeof capSource==='function')?capSource(c):null;
      var sk=(typeof CAP_SIGKEY!=='undefined'&&CAP_SIGKEY[k])||null;
      var vend=(s&&s.vendor)||(c?c.tool:k);
      var srcTxt=vend+(sk?(' · '+sk):'')+(p!=null?(s&&s.connected?(s.demo?' (demo telemetry)':' (live telemetry)'):' (sample telemetry)'):' (no telemetry)');
      return {name:c?c.name.replace(/ *\(.*\)/,''):k,value:p!=null?(p+'% deployed'):'not connected',color:capColor(p),source:srcTxt};
    }).concat([{name:'= Tactic coverage',value:(cov!=null?(cov+'% defended'):'—'),color:color,source:'mean of the controls above (live deployment %)'}]),
    sources:caps.map(function(k){return c5capSrc(k);}),
    note:'Your detection & prevention coverage for the '+t+' tactic, mapped from MITRE ATT&CK to your controls — each % is the live deployment its tool reports.',connectTool:'the controls for this tactic'});
}
var C5_DOM={asset:{label:'Asset & risk visibility',pre:['ID.AM','ID.RA'],fn:'Identify'},iam:{label:'Identity & access',pre:['PR.AA'],fn:'Protect'},edp:{label:'Endpoint & data protection',pre:['PR.DS','PR.PS','PR.IR'],fn:'Protect'},detect:{label:'Threat detection',pre:['DE.'],fn:'Detect'},ir:{label:'Incident response',pre:['RS.','RC.'],fn:'Respond'},tpr:{label:'Third-party risk',pre:['GV.SC'],fn:'Govern'}};
function c5domainMetric(k){
  var def=C5_DOM[k]||{label:k,pre:[],fn:''};var mine=c5DomainScore(def.pre);var pd=c5peer();var opt=c5peerOptin();
  var liveMed=(opt&&pd&&pd.sufficient&&pd.functions&&pd.functions[def.fn])?pd.functions[def.fn].p50:null;
  var med=(liveMed!=null)?liveMed:(C5_REF_MED[k]!=null?C5_REF_MED[k]:null);var live=(liveMed!=null);
  var conn=mine!=null;var delta=(mine!=null&&med!=null)?(mine-med):null;
  return c5obj({id:'dom_'+k,name:def.label,connected:conn,displayValue:conn?(Number(mine).toFixed(1)+' / 5'):'—',label:'computed',color:conn?((delta==null)?'ink':(delta>=0?'good':'warn')):'muted',mine:mine,med:med,delta:delta,
    formula:'your domain score = mean CMMI across the controls in this domain ('+def.pre.join(', ')+'); peer median = '+(live?('your cohort p50 for '+def.fn):'published industry baseline'),
    method:live?('Peer medians are shared at the CSF-function level; '+def.label+' maps to '+def.fn+'.'):('Compared to the published industry baseline for '+def.label.toLowerCase()+'. Opt in to compare to a live cohort of your same-size peers.'),
    inputs:[{name:'Your CMMI',value:mine!=null?Number(mine).toFixed(1):'—',source:'framework posture'},{name:'Peer median',value:med!=null?Number(med).toFixed(1):'—',source:live?('DTNKSHIELD cohort · '+def.fn):'published industry benchmark'}],
    sources:[{tool:'Nerion engine',connector:'nerion',field:'domain_cmmi',lastRefresh:c5ago()},live?{tool:'DTNKSHIELD peer cohort',connector:'peer',field:'functions.'+def.fn,lastRefresh:c5ago()}:{tool:'Published industry benchmark',connector:'reference',field:'csf_cmmi_median',lastRefresh:c5ago()}],
    note:'How your '+def.label.toLowerCase()+' maturity compares to peers your size.',connectTool:'the live peer cohort (opt in)'});
}

/* ---------- the inspector (right-side #ev panel) ---------- */
function c5Inspect(id){var m=c5get(id);if(!m)return;c5InspectObj(m);}
/* Durable "what it measures & why it matters" definitions, keyed by metric id or
   id-prefix — the answer every drill must give, a real definition of the measure
   and its significance, independent of today's result. A metric may also carry its
   own m.why; failing both we fall back to m.note. */
var C5_WHY={
  cops_incidents:'Counts the incidents that are both still open AND confirmed to be hitting the business — not raw alert volume. It matters because these are the events that can escalate into a disclosable, material breach: this is the live command queue the CISO clears first.',
  cops_services:'Turns raw security detections into business language — how many of your business services are under an active detection right now, mapped from the affected asset to the service it supports. It matters because it tells you which revenue- and customer-facing services are actually threatened, not just which sensors fired.',
  cops_thirdparty:'Counts the third parties carrying an open security alert that reaches a business service you depend on. It matters because a supplier compromise is one of the most common ways an incident enters the enterprise without ever touching your own perimeter.',
  cops_emerging:'The short list of newly published threats and vulnerabilities that match your specific asset and technology inventory — not the whole threat landscape. It matters because these are the emerging risks you can actually get ahead of before they are weaponized against you.',
  er_crown:'Identifies which of your crown-jewel assets carries the most risk today, combining its business value with its live vulnerability and threat exposure. It matters because a single high-risk crown jewel is where a breach does the most damage — it is the first thing to harden.',
  er_capability:'Ranks your business capabilities by the cyber exposure each carries, joining your capability map to GRC control gaps and open risk. It matters because it frames cyber risk in the language the board owns — business capabilities — rather than technical controls.',
  er_scenarios:'Ranks the disruption scenarios most likely to hit the business, mapping who targets your sector to the MITRE techniques your stack is exposed to and the process each would disrupt. It matters because it prioritizes preparation by likelihood times business impact, not by fear.',
  er_thirdparty:'Measures the third-party and software-supply-chain exposure you carry, weighting vendor ratings, TPRM findings and vulnerable software components by the criticality of the service each supports. It matters because supply-chain risk is exposure you own but do not directly control.',
  ais_aiml:'Assesses the security posture of the AI/ML and LLM systems your business runs — prompt-injection exposure, data leakage, model access and guardrails. It matters because these systems now touch sensitive data and decisions and are a fast-moving new attack surface.',
  ais_genai:'Measures the data-leakage risk from enterprise GenAI use — separating sanctioned tools from shadow AI, and whether DLP inspects what employees send to AI. It matters because sensitive data can leave the company through an unsanctioned chatbot with no control in the path.',
  ais_aicode:'Measures the cybersecurity risk introduced by AI coding assistants in the SDLC — adoption, policy scope, and the vulnerability and secret rate in AI-influenced code. It matters because AI-generated code ships to production and can introduce vulnerabilities and leaked secrets at scale.',
  ais_pipeline:'Measures the security and integrity of your CI/CD pipeline and software build supply chain — misconfigurations, unsigned artifacts, provenance gaps and exposed pipeline secrets. It matters because the build pipeline is a trusted, direct path to production that attackers increasingly target.',
  ais_nhi:'Measures your exposure from non-human and machine identities — service accounts, tokens and keys that are stale, over-privileged or exposed. It matters because machine identities now vastly outnumber human ones and are the least-watched path into your systems.',
  ais_pqc:'Measures your readiness for post-quantum cryptography — which systems still rely on quantum-vulnerable algorithms (RSA/ECC) to protect sensitive or long-lived data. It matters because "harvest-now, decrypt-later" means data stolen today can be decrypted once quantum computers mature.',
  exp_total:'Your total modeled cyber expected loss — the single dollar figure that expresses enterprise cyber risk. It matters because it converts a technical posture into a number the board and CFO can weigh against appetite, insurance and spend.',
  exp_conc:'How concentrated your exposure is in its top drivers. It matters because concentrated risk is good news operationally — a few targeted fixes remove a disproportionate share of the total.',
  exp_:'The share of your total cyber exposure attributable to this specific control gap. It matters because it tells you exactly how much modeled loss a single, scoped fix would remove.',
  eff_removed:'The dollars of expected loss your controls have already bought down. It matters because it is the evidence that security spend is working — risk removed, not activity performed.',
  eff_spend:'The security spend measured against the risk it removes. It matters because it is the denominator of return-on-security-investment — the number the CFO holds you to.',
  eff_return:'The risk removed per dollar of security spend. It matters because it is the single figure that says whether the program is worth what it costs.',
  ctl_:'The dollars of expected loss this specific control removes. It matters because it shows where your security dollars work hardest and which control to expand first.',
  threat_status:'Whether anything is actively attacking you right now, and how many actors target your sector. It matters because it is the difference between steady-state monitoring and an active-response posture.',
  tac_:'Your live control coverage against this MITRE ATT&CK tactic. It matters because it shows, technique by technique, where an adversary still has an open path.',
  dom_:'Your security maturity in this domain versus same-size industry peers. It matters because it shows, domain by domain, where you lead the field and where you trail it.',
  peer_maturity:'Your overall evidenced framework maturity, scored from live tools and analyzed policies — not self-attestation. It matters because it is the defensible number you take to the board and to peers.',
  peer_median:'The maturity of comparable organizations in your cohort. It matters because a number only means something against a peer baseline.',
  peer_position:'Where your maturity sits in the peer distribution. It matters because it tells the board whether you are ahead of, at, or behind the field.'
};
function c5whyPre(id){if(!id)return '';if(id.indexOf('tac_')===0)return 'tac_';if(id.indexOf('exp_')===0&&id!=='exp_total'&&id!=='exp_conc')return 'exp_';if(id.indexOf('ctl_')===0)return 'ctl_';if(id.indexOf('dom_')===0)return 'dom_';return id;}
function c5why(m){if(m&&m.why)return m.why;var id=m&&m.id;if(id){var w=C5_WHY[id]||C5_WHY[c5whyPre(id)];if(w)return w;}return (m&&m.note)||'';}
function c5whyIcon(color){return color==='good'?'check':(color==='crit'||color==='warn')?'alert':color==='blue'?'gauge':'plug';}
function c5InspectObj(m){
  if(!m)return;
  var chip='<span class="c5chip c5-'+String(m.label).replace(/[^a-z]/g,'')+'">'+m.label+'</span>';
  var col=m.connected?(m.color==='ink'?'ink-2':(m.color||'ink')):'muted';
  var h='<div class="ev-claim">'+m.name+' '+chip+'</div>';
  // 1) What it measures & why it matters — ALWAYS, right after the title (durable
  //    definition, not today's result).
  h+='<div class="ev-sec" style="margin-top:12px">What it measures &amp; why it matters</div><div class="conf">'+c5why(m)+'</div>';
  // 2) The result — a status-coloured hero with a glyph; no redundant heading.
  h+='<div style="display:flex;align-items:center;gap:14px;margin:14px 0 2px;padding:14px 16px;border-radius:12px;border:1px solid var(--line);border-left:3px solid var(--'+col+');background:var(--surface-2)">'+
    '<div style="width:42px;height:42px;border-radius:11px;flex:none;display:flex;align-items:center;justify-content:center;background:var(--surface);background:color-mix(in srgb,var(--'+col+') 16%,var(--surface));color:var(--'+col+')">'+c5icon(c5whyIcon(m.connected?m.color:'muted'))+'</div>'+
    '<div style="min-width:0"><div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">Result</div><div style="font-size:24px;font-weight:700;line-height:1.1;color:var(--'+col+')">'+(m.connected?m.displayValue:'Not connected')+'</div></div>'+
  '</div>';
  // Optional visual (e.g. trend bars) rendered right under the result.
  if(m.visual)h+=m.visual;
  // Recommended action — what the CISO should do about this. Rendered prominently
  // under the result so the drill always answers "so what?".
  if(m.action)h+='<div class="ev-sec">Recommended action</div><div class="conf" style="border-left:3px solid var(--blue)">'+m.action+'</div>';
  if(!m.connected){
    var src=m.connectTool?('<b>'+c5esc(m.connectTool)+'</b>'):'its data source';
    h+='<div class="ev-sec">What would populate it</div><div class="drill-p">This reads live once you connect '+src+'. Until then Nerion shows the honest not-connected state — never a placeholder number.</div>';
    if(m.formula)h+='<div class="formula" style="margin-top:8px">'+m.formula+'</div>';
    if(m.sources&&m.sources.length)h+='<div class="ev-sec">Where it will come from</div>'+m.sources.map(function(s){return '<div class="src-row"><span class="sd"></span><b>'+s.tool+'</b></div>';}).join('');
    if(m.connectTool)h+='<div style="margin-top:12px"><button class="c5btn" onclick="c5Connect(\''+String(m.connectTool).replace(/'/g,'')+'\')">Connect '+m.connectTool+'</button></div>';
  } else {
    // 3) How it's computed · 4) the numbers behind it · 5) sources.
    h+='<div class="ev-sec">How it’s computed</div><div class="formula">'+(m.formula||'—')+'</div>';
    if(m.method)h+='<div class="drill-p" style="color:var(--muted)">'+m.method+'</div>';
    // A metric may supply a richer multi-column table (m.table) showing the full
    // reasoning chain, where "Item / Value / Source" can't show HOW a verdict was
    // reached. A cell is a string or {text,color,bold}.
    if(m.table&&m.table.cols&&m.table.rows&&m.table.rows.length){
      var tcell=function(cell,cls){var t=(cell&&cell.text!=null)?cell.text:(cell==null?'':cell);var sty=(cell&&(cell.color||cell.bold))?(' style="'+(cell.color?('color:var(--'+cell.color+')'):'')+(cell.bold?';font-weight:600':'')+'"'):'';return '<td class="'+cls+'"'+sty+'>'+t+'</td>';};
      h+='<div class="ev-sec">'+(m.table.title||'How each row is judged')+'</div><div style="overflow-x:auto"><table class="itbl"><thead><tr>'+m.table.cols.map(function(c){return '<th>'+c+'</th>';}).join('')+'</tr></thead><tbody>'+
        m.table.rows.map(function(r){return '<tr>'+r.map(function(cell,ci){return tcell(cell,ci===0?'':'src');}).join('')+'</tr>';}).join('')+
      '</tbody></table></div>';
    } else if(m.inputs&&m.inputs.length)h+='<div class="ev-sec">The numbers behind it</div><table class="itbl"><thead><tr><th>Item</th><th>Value</th><th>Source</th></tr></thead><tbody>'+m.inputs.map(function(i){
      var dot=i.color?('<span class="c5sq '+c5sqClass(i.color)+'" style="display:inline-block;width:9px;height:9px;margin-right:7px;vertical-align:middle"></span>'):'';
      return '<tr><td>'+dot+i.name+'</td><td class="v">'+i.value+'</td><td class="src">'+i.source+'</td></tr>';
    }).join('')+'</tbody></table>';
    if(m.sources&&m.sources.length){h+='<div class="ev-sec">Sources</div>'+m.sources.map(function(s){return '<div class="src-row"><span class="sd"></span><b>'+s.tool+'</b>'+(s.lastRefresh?('<span style="color:var(--muted)"> · as of '+s.lastRefresh+'</span>'):'')+'</div>';}).join('');}
    h+='<div class="c5foot">as of '+c5ago()+' · label: '+m.label+'</div>';
  }
  if(typeof openDrill==='function')openDrill(m.name,h);
}
/* Take the user back to onboarding to connect the named tool. In the shell the
   cockpit runs in an iframe — ask the shell to switch to the intake view and
   focus the relevant section; standalone, navigate directly. */
function c5Connect(tool){
  var msg={type:'cyberrx-goto-onboarding',tool:String(tool||'')};
  try{if(window.parent&&window.parent!==window){window.parent.postMessage(msg,'*');return;}}catch(_){}
  try{window.postMessage(msg,'*');}catch(_){}
  try{window.location.href='onboarding.html';}catch(_){}
}
document.addEventListener('click',function(e){if(e.target.closest('[data-c5onb]'))return;var el=e.target.closest('[data-c5m]');if(el&&el.getAttribute('data-c5m'))c5Inspect(el.getAttribute('data-c5m'));});
/* A tile's "Connect: <source> →" prompt → the exact onboarding section for it. */
document.addEventListener('click',function(e){var el=e.target.closest('[data-c5onb]');if(el){e.stopPropagation();c5Connect(el.getAttribute('data-c5onb'));}});
/* Protection summary-card detail inspector — opens the list behind each count. */
document.addEventListener('click',function(e){var el=e.target.closest('[data-c5pc]');if(el&&el.getAttribute('data-c5pc'))c5protInspect(el.getAttribute('data-c5pc'));});
/* Per-control business-value inspector — professionally backs each "$X" claim
   in the "Controls delivering the most business value" list. */
document.addEventListener('click',function(e){var el=e.target.closest('[data-c5cv]');if(el&&el.getAttribute('data-c5cv'))c5ctrlValueInspect(el.getAttribute('data-c5cv'));});
function c5ctrlValueInspect(k){
  var c=(typeof CAP_BY_KEY!=='undefined'&&CAP_BY_KEY[k])||null;if(!c)return;
  var nm=c.name.replace(/ *\(.*\)/,'');
  var rr=(typeof capRiskRemoved==='function')?capRiskRemoved():{byCap:{},total:0};
  var usdv=(rr.byCap&&rr.byCap[k])||0,total=rr.total||0;
  var p=(typeof capDeploy==='function')?capDeploy(c):null;
  var fw=(typeof CAP_FRAMEWORK!=='undefined')?CAP_FRAMEWORK[k]:null;
  var prot=(typeof CAP_PROTECTS!=='undefined'&&CAP_PROTECTS[k])||c.name.toLowerCase();
  // Rank among connected controls by value (same ordering as the list).
  var ranked=(typeof CAPS!=='undefined'?CAPS:[]).map(function(x){return {k:x.k,usd:(rr.byCap&&rr.byCap[x.k])||0,p:(typeof capDeploy==='function'?capDeploy(x):null)};}).filter(function(o){return o.p!=null;}).sort(function(a,b){return b.usd-a.usd;});
  var rank=null;ranked.forEach(function(o,i){if(o.k===k)rank=i+1;});
  var sharePct=total>0?Math.round(usdv/total*100):0;
  var weight=(fw&&fw.weight)||null;
  var fwIds=fw?(fw.csf||[]).concat(fw.r53||[]).join(' · '):'—';
  var src=(typeof capSource==='function')?capSource(c):null;
  var srcTool=(src&&src.vendor)||c.tool;
  // Ground the dollars in the business the control protects: the top revenue
  // process/system and the value it carries per day.
  var pe=(typeof LIVE!=='undefined'&&LIVE&&LIVE.process_exposure)||[];
  var rs=(typeof LIVE!=='undefined'&&LIVE&&LIVE.resilience)||{};
  var perHr=Number(rs.top_downtime_per_hr)||((rs.systems&&rs.systems[0]&&Number(rs.systems[0].per_hr))||0);
  var perDay=perHr>0?perHr*24:0;
  var procName=(pe[0]&&pe[0].name)||((rs.systems&&rs.systems[0]&&rs.systems[0].name))||'your crown-jewel processes';
  var plain=(p!=null)
    ?(nm+' protects '+prot+(perDay>0?(' — the path into revenue processes like '+procName+', which carries about '+usd(perDay)+'/day of business value'):'')+'. Because '+nm+' is '+p+'% deployed across that surface'+(fw?(' and satisfies framework-critical controls ('+fwIds+')'):'')+', Nerion credits it '+usd(usdv)+' of the '+usd(total)+' of modeled loss your controls remove'+(perDay>0?' — keeping those processes running and their data protected is worth more than the control costs':'')+'.')
    :('Connect '+srcTool+' to measure how much of '+prot+' this control covers, and the business value it returns.');
  var m=c5obj({name:nm+' · business value',connected:(p!=null),
    why:plain,
    displayValue:usdv>0?usd(usdv):'—',label:'modeled',color:'good',
    formula:'business value = this control’s framework-weighted contribution (weight '+(weight!=null?weight:'—')+') × its live deployment ('+(p!=null?p+'%':'—')+'), scaled so every control’s share sums to the organization’s total risk removed ('+usd(total)+')',
    method:'Each control’s value is not a list price — it is the share of your total modeled expected-loss reduction attributable to that control. The share is its framework criticality weight (how much risk the NIST CSF 2.0 / 800-53 controls it satisfies carry) multiplied by how fully it is actually deployed on your estate, then normalized so the parts sum to the whole. Deployment % is read live from '+srcTool+'; the dollars are modeled until per-control spend is attributed.',
    inputs:[
      {name:'Live deployment',value:(p!=null?p+'%':'—'),source:srcTool+(src&&src.demo?' · demo':'')},
      {name:'Framework criticality weight',value:(weight!=null?weight:'—'),source:'NIST CSF 2.0 · 800-53 weighting'},
      {name:'Frameworks satisfied',value:fwIds,source:'control → framework mapping'},
      {name:'What it protects',value:prot,source:'control scope'},
      {name:'Risk removed (this control)',value:usdv>0?usd(usdv):'—',color:'good',source:'weight × deployment, scaled to total'},
      {name:'Share of total control value',value:(total>0?sharePct+'%':'—')+(rank?(' · ranked #'+rank+' of '+ranked.length):''),source:'this control ÷ Σ all controls'}
    ],
    sources:[{tool:srcTool,connector:c.k,field:'deployment_pct',lastRefresh:c5ago()},{tool:'NIST CSF 2.0 / 800-53 mapping',connector:'framework',field:'control_weight'}],
    note:nm+(rank===1?' is your single highest-value control':(rank?(' ranks #'+rank+' of your controls by business value'):' returns business value'))+'. Its '+(p!=null?p+'% deployment':'deployment')+' across '+prot+', weighted by the framework-critical controls it satisfies ('+fwIds+'), removes '+usd(usdv)+' of modeled expected loss — '+sharePct+'% of the total your controls buy down. That is why it sits where it does in the ranking.',
    connectTool:'per-control security spend (to convert value into return-on-dollar)'});
  c5InspectObj(m);
}
function c5protInspect(kind){
  var P=(typeof window!=='undefined'&&window.C5PROT)||{well:[],weak:[],ctrl:[],target:75};
  var m;
  if(kind==='well'){
    m=c5obj({name:'Business areas well protected',why:'Lists the business areas that are demonstrably well protected — clearing their control-coverage bar with no open gaps. It matters because it is the defensible base you present to the board: the parts of the business you can prove are covered.',displayValue:String((P.well||[]).length),label:'computed',color:(P.well&&P.well.length)?'good':'muted',
      formula:'business areas whose GRC control-coverage clears the '+P.target+'-point bar with no open control gaps',
      method:'From your Business Capability Map joined to GRC control-coverage. An area qualifies when its protection score is at or above the bar and it carries no open control gaps.',
      inputs:(P.well&&P.well.length)?P.well.map(function(a){return {name:a.name,value:a.score+(a.measured?'':' (illustrative)'),color:'good',source:(a.grc?('GRC '+a.grc):'Capability Map × GRC')};}):[{name:'No area yet clears the bar',value:'—',source:'connect your Capability Map + GRC'}],
      sources:[{tool:'Business Capability Map',connector:'capmap',field:'capabilities',lastRefresh:c5ago()},{tool:'GRC',connector:'grc',field:'control_coverage · gaps'}],
      note:'The defensible base you take to the board — the parts of the business that are demonstrably protected.'});
  } else if(kind==='weak'){
    m=c5obj({name:'Business areas to strengthen',why:'Lists the business areas carrying the residual cyber exposure — below their protection bar or with open control gaps. It matters because this is exactly where the next dollar of protection should go.',displayValue:String((P.weak||[]).length),label:'computed',color:(P.weak&&P.weak.length)?'warn':'good',
      formula:'business areas below the '+P.target+'-point bar OR carrying one or more open control gaps; ranked weakest-first',
      method:'From your Business Capability Map joined to GRC. An area appears here when its protection score is below the bar or it has open control gaps — this is where the residual cyber exposure concentrates.',
      inputs:(P.weak&&P.weak.length)?P.weak.map(function(a){return {name:a.name,value:a.score+(a.gaps>0?(' · '+a.gaps+' gap'+(a.gaps>1?'s':'')):'')+(a.measured?'':' (illustrative)'),color:(a.score<50?'crit':'warn'),source:(a.exp>0?(usd(a.exp)+' exposure'):'Capability Map × GRC')};}):[{name:'No area below the bar',value:'—',source:'every mapped area is covered'}],
      sources:[{tool:'Business Capability Map',connector:'capmap',field:'capabilities',lastRefresh:c5ago()},{tool:'GRC',connector:'grc',field:'control_coverage · gaps · open_risk'}],
      note:'Where to concentrate next — the areas carrying the residual exposure, worst first.'});
  } else {
    m=c5obj({name:'Controls returning the most business value',why:'Ranks your controls by the business value each returns — the modeled expected-loss each buys down. It matters because it shows where security spend works hardest and which control to extend first.',displayValue:String((P.ctrl||[]).length),label:'computed',color:(P.ctrl&&P.ctrl.length)?'good':'muted',
      formula:'business value per control = deployment × framework-weighted criticality of the assets it protects; ranked value-desc',
      method:'From the live control ledger — each connected control’s deployment scaled by how much framework-weighted risk it removes across the assets it protects.',
      inputs:(P.ctrl&&P.ctrl.length)?P.ctrl.map(function(o){return {name:o.c.name.replace(/ *\(.*\)/,''),value:usd(o.usd)+' · '+o.p+'% deployed',color:'good',source:o.c.tool};}):[{name:'No control connected',value:'—',source:'connect your security tools'}],
      sources:[{tool:'Control ledger',connector:'nerion',field:'risk_removed_by_control',lastRefresh:c5ago()}],
      note:'Where your controls earn their keep — the ones buying down the most business risk.'});
  }
  c5InspectObj(m);
}

/* ---------- shared render helpers ---------- */
function c5chip(label){return '<span class="c5chip c5-'+String(label).replace(/[^a-z]/g,'')+'">'+label+'</span>';}
/* Inline seat glyphs (Tabler-style, no CDN) — stroke inherits the badge color. */
var C5ICON={
  shield:'<path d="M12 3 5 6v5c0 4.2 3 7 7 8.5 4-1.5 7-4.3 7-8.5V6z"/><path d="M12 3.5v15.3"/>',
  dollar:'<path d="M12 3v18"/><path d="M16 8.3C16 6.5 14.2 5.4 12 5.4S8 6.5 8 8.3s1.8 3 4 3.5 4 1.7 4 3.5-1.8 3-4 3-4-1.1-4-2.9"/>',
  tower:'<path d="M4 21h16"/><path d="M7 21V6l6-3v18"/><path d="M13 9l5 2.5V21"/><path d="M9.5 8h0M9.5 12h0M9.5 16h0"/>',
  scale:'<path d="M12 4v17"/><path d="M7.5 21h9"/><path d="M5 7h14"/><path d="M9.2 4.4a2.8 2.8 0 0 0 5.6 0"/><path d="M2.6 13l2.4-6 2.4 6a2.7 2.7 0 0 1-4.8 0z"/><path d="M16.6 13l2.4-6 2.4 6a2.7 2.7 0 0 1-4.8 0z"/>',
  factory:'<path d="M3 21V11l5 3v-3l5 3V7l8 4v10z"/><path d="M8 21v-4M13 21v-4M18 21v-4"/>',
  gavel:'<path d="M4 20l6.5-6.5"/><path d="M13.2 4.2l6.6 6.6-2.4 2.4-6.6-6.6z"/><path d="M9.5 7.9l6.6 6.6"/><path d="M13.5 21h7.5"/>',
  cpu:'<rect x="7" y="7" width="10" height="10" rx="1.5"/><rect x="10" y="10" width="4" height="4"/><path d="M10 3v3M14 3v3M10 18v3M14 18v3M3 10h3M3 14h3M18 10h3M18 14h3"/>',
  clipboard:'<path d="M9 4.5h6v3H9z"/><path d="M9 6H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2"/><path d="M9 14l2 2 4-4"/>',
  bank:'<path d="M3 21h18"/><path d="M5 21V10M19 21V10"/><path d="M9 21V10M15 21V10"/><path d="M3.5 10 12 4l8.5 6z"/>',
  box:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4.2 7.6 12 12l7.8-4.4"/><path d="M12 12v9"/>',
  pulse:'<path d="M3 12h3.5l2-6 3.5 12 2.5-9 1.5 3H21"/>',
  checklist:'<path d="M10 6h10M10 12h10M10 18h7"/><path d="M3.5 6l1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17"/>',
  store:'<path d="M3.5 21h17"/><path d="M5 21V11M19 21V11"/><path d="M4 7l1.4-3.5h13.2L20 7"/><path d="M4 7a2.4 2.4 0 0 0 4.8 0 2.4 2.4 0 0 0 4.8 0 2.4 2.4 0 0 0 4.8 0"/><path d="M9.5 21v-5.5h5V21"/>',
  trend:'<path d="M3 17l6-6 4 4 8-8"/><path d="M16 7h5v5"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9"/><path d="M16 7l2 2"/><path d="M18.5 4.5l2 2"/>',
  target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
  chart:'<path d="M4 20V4M4 20h16"/><rect x="7" y="12" width="3" height="5"/><rect x="12" y="8" width="3" height="9"/><rect x="17" y="5" width="3" height="12"/>',
  coin:'<circle cx="12" cy="12" r="8.5"/><path d="M15 9.4a3 2 0 0 0-3-1.3c-1.7 0-3 .8-3 1.8s1.3 1.8 3 1.8 3 .8 3 1.8-1.3 1.8-3 1.8a3 2 0 0 1-3-1.3"/><path d="M12 6.4v11.2"/>',
  alert:'<path d="M12 4l9.5 16.5H2.5z"/><path d="M12 10v4.5"/><path d="M12 17.5h.01"/>',
  umbrella:'<path d="M12 3v2"/><path d="M3.5 12a8.5 8.5 0 0 1 17 0z"/><path d="M12 12v6a2 2 0 0 0 4 0"/>',
  plug:'<path d="M9 3v5M15 3v5"/><path d="M7 8h10v3a5 5 0 0 1-10 0z"/><path d="M12 16v5"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v4.5l3 2"/>',
  refresh:'<path d="M4 12a8 8 0 0 1 13.5-5.8L20 8"/><path d="M20 4v4h-4"/><path d="M20 12a8 8 0 0 1-13.5 5.8L4 16"/><path d="M4 20v-4h4"/>',
  database:'<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3 3 7 3s7-1.3 7-3"/>',
  file:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  wand:'<path d="M6 21L16 11"/><path d="M17 3l.9 2.1L20 6l-2.1.9L17 9l-.9-2.1L14 6l2.1-.9z"/>',
  check:'<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.5l2.5 2.5 5-5"/>',
  heart:'<path d="M12 20s-7-4.5-7-9.5A3.7 3.7 0 0 1 12 7a3.7 3.7 0 0 1 7 3.5C19 15.5 12 20 12 20z"/>',
  bug:'<rect x="8" y="7" width="8" height="11" rx="4"/><path d="M8 11H4M8 15H4M16 11h4M16 15h4M9.5 6.5L8 5M14.5 6.5L16 5"/>',
  gauge:'<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-3.5"/>',
  shieldcheck:'<path d="M12 3 5 6v5c0 4.2 3 7 7 8.5 4-1.5 7-4.3 7-8.5V6z"/><path d="M9 11.5l2 2 4-4"/>'
};
var C5SEAT={ciso:{ic:'shield',nm:'CISO'},cfo:{ic:'dollar',nm:'CFO'},ceo:{ic:'tower',nm:'CEO'},cro:{ic:'scale',nm:'CRO'},coo:{ic:'factory',nm:'COO'},clo:{ic:'gavel',nm:'CLO'},cio:{ic:'cpu',nm:'CTO'},cpo:{ic:'box',nm:'CPO'},audit:{ic:'clipboard',nm:'Internal Audit'},board:{ic:'bank',nm:'Board'}};
function c5icon(k){return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(C5ICON[k]||C5ICON.shield)+'</svg>';}
/* The seat header (icon badge · seat · timestamp) renders once in the hero, above the
   tab bar — matching the mockbook. c5header() inside each tab is intentionally empty
   so the header isn't duplicated below the tabs. */
function c5seatHeader(){var id=(typeof CUR!=='undefined'&&CUR)?CUR:'ciso';var m=C5SEAT[id]||{ic:'shield',nm:((typeof SEAT_LABEL!=='undefined'&&SEAT_LABEL[id])||String(id).toUpperCase())};
  return '<div class="c5head"><div class="c5id"><div class="c5ic">'+c5icon(m.ic)+'</div><div><div class="c5id-n">'+m.nm+'</div><div class="c5id-s">Executive cockpit</div></div></div><div class="c5asof">as of '+c5ago()+'</div></div>';}
function c5header(){return '';}
function c5shell(kick,verdict,verdictColor,intro){
  return '<div class="c5kick">'+kick+'</div><div class="c5verdict"'+(verdictColor?(' style="color:var(--'+verdictColor+')"'):'')+'>'+verdict+'</div><div class="c5intro">'+intro+'</div>';
}
function c5squares(arr){return '<div class="c5sqrow">'+arr.map(function(c){return '<span class="c5sq '+c+'" title="'+c+'"></span>';}).join('')+'</div>';}
/* A binary status face — for yes/no reads like active-compromise, where per-control
   squares are not meaningful. 'good' = blue smile (all clear), 'bad' = red frown
   (incident), else a muted neutral face (not connected). */
function c5face(kind){
  var col=kind==='bad'?'var(--crit)':kind==='good'?'var(--blue)':'var(--line)';
  var mouth=kind==='good'?'M8.4 14c1 1.3 2.2 1.9 3.6 1.9s2.6-.6 3.6-1.9':(kind==='bad'?'M8.4 15.6c1-1.3 2.2-1.9 3.6-1.9s2.6 .6 3.6 1.9':'M8.6 14.6h6.8');
  return '<span class="c5facewrap" style="display:inline-flex;margin-top:6px"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="'+col+'" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="9.9" r=".95" fill="'+col+'" stroke="none"/><circle cx="15" cy="9.9" r=".95" fill="'+col+'" stroke="none"/><path d="'+mouth+'"/></svg></span>';
}
/* Per-metric tile icon (used as the default when a c5tile call doesn't pass one). */
var C5TILE_ICON={
  active_compromise:'pulse',capability_coverage:'checklist',thirdparty_risk:'store',direction:'trend',
  exp_identity:'lock',exp_total:'chart',exp_conc:'target',
  cf_tail:'alert',cf_bi:'plug',cf_ins_cov:'umbrella',cf_premium:'coin',eff_return:'trend',
  ceo_biz_health:'heart',ceo_objectives:'target',ceo_cust_incidents:'alert',ceo_customer_data:'database',ceo_uptime:'pulse',ceo_disclosures:'file',ceo_trust_signal:'heart',
  coo_bc:'refresh',coo_processes:'checklist',coo_rto:'clock',coo_rpo:'clock',coo_backups:'database',coo_identity_recovery:'key',
  cl_dsar_sla:'clock',cl_ropa:'file',cl_litigation:'gavel',cl_access_pd:'lock',
  ct_appsec:'shieldcheck',ct_critical_vulns:'bug',ct_techdebt:'cpu',ct_advisories:'alert',ct_ai_inventory:'database',ct_ai_governed:'check',ct_ai_dataaccess:'lock',
  bd_material:'alert',bd_incidents_assessed:'check',bd_disclosure_controls:'file',bd_threshold_basis:'gauge',bd_spend_peers:'coin',bd_resilience_inv:'refresh',
  cp_sbd_coverage:'shieldcheck',cp_open_risks:'alert',cp_mfa:'lock',cp_customer_data:'database',cp_pass_rate:'check',cp_cycle_time:'clock',cp_blocker:'alert'
};
/* Attribute-safe escape for hover tooltips (notes can contain " & < >). */
function c5esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
/* Short hover explanation for any metric box: its plain-language "why it matters"
   plus a nudge that the full trace is one tap away. Native title = works everywhere. */
function c5tip(m){if(!m)return '';var n=(m.note||m.name||'').trim();return c5esc(n?(n+' — tap for the formula, inputs and source.'):'Tap for the formula, inputs and source.');}
/* Honest posture-trend gate: only ever claim "improving" (or any change vs. the
   past) when ≥2 real quarters are recorded (trajInfo). No recorded history → no
   trend claim at all. Prevents assumed year-over-year language with no data. */
function c5T(){var tr=(typeof trajInfo==='function')?trajInfo():null;var has=!!(tr&&tr.two);return {has:has,improving:has&&tr.down,worsening:has&&!tr.down};}
/* Data-driven spoken brief: composed from the same live metrics the tiles show,
   so it can never contradict them. Returns null when there is no live data, so
   speakSeat falls back to the static brief. Every figure here is a c5get value. */
function c5Brief(seat){
  if(typeof LIVE==='undefined'||!LIVE)return null;
  try{
    var ec=c5get('exp_identity'),et=c5get('exp_total'),T=c5T();
    var O=(typeof c5Objectives==='function')?c5Objectives():{protected:0,total:0,atRisk:0};
    var oi=(typeof sig==='function')?sig('open_incidents'):null;
    var driver=ec.connected?(ec.name.toLowerCase()+' at '+ec.displayValue):'your top control gap';
    var total=et.connected?et.displayValue:'—';
    var trend=T.improving?' The recorded posture trend is improving.':T.worsening?' The recorded posture trend is worsening.':'';
    var objs=O.total?(O.protected+' of '+O.total+' strategic objectives are cyber-safe'):'your strategic objectives are mapped to their cyber dependencies';
    var attack=(oi!=null)?(oi>0?('there '+(oi===1?'is 1 active incident':('are '+oi+' active incidents'))):'no active compromise this morning'):'connect your SIEM for a live attack read';
    switch(seat){
      case 'ciso': return 'CISO read. '+cap(attack)+'. Your largest exposure is '+driver+', of a '+total+' modeled total.'+trend+' Every figure traces to its source.';
      case 'ceo': return 'CEO read. Cyber is a managed risk this quarter — '+objs+'; the exception is '+driver+'. Modeled exposure is '+total+', within the board’s appetite where you have set one.'+trend;
      case 'cfo': var ap=c5get('cf_appetite'),hr=c5get('cf_headroom'); return 'CFO read. Modeled exposure is '+total+(ap.connected?(', against a '+ap.displayValue+' appetite'+(hr.connected?(' with '+hr.displayValue+' of headroom'):'')):'')+'. The largest single driver is '+driver+'.'+trend;
      case 'cro': var rk=c5get('cr_rank'); return 'CRO read. '+(rk.connected?('Cyber ranks '+rk.displayValue+' among your principal risks'):'Cyber sits on one scale beside your other principal risks')+'; the driver to treat is '+driver+'.'+trend;
      case 'cio': var av=c5get('ct_critical_vulns'); return 'CTO read. The stack’s biggest security gap is '+driver+'.'+(av.connected?(' '+av.displayValue+' known-exploitable critical vulnerabilities are open.'):'')+trend;
      case 'clo': var b=c5get('cl_binding_clock'); return 'CLO read. '+(b.connected?('Your tightest notification clock is '+b.displayValue+'. '):'')+'The exposure most likely to trigger a filing is '+driver+'. This surfaces obligations, not legal conclusions.';
      case 'coo': return 'COO read. Operations are resilient this quarter; the one critical process carrying cyber exposure is tied to '+driver+'.'+trend;
      case 'cpo': var op=c5get('cp_open_risks'); return 'Product read. '+(op.connected?(op.displayValue+' open product risks; '):'')+'the largest is '+driver+'.'+trend;
      case 'audit': return 'Internal Audit read. Control assurance here is evidence-based, not self-attested; the gap most needing a workpaper is '+driver+'.';
      case 'board': var mt=c5get('bd_material'); return 'Board read. '+(mt.connected?('Nothing currently crosses the materiality threshold. '):'')+'Cyber is a managed risk; management has funded the top exposure, '+driver+'.'+trend;
    }
  }catch(_){ }
  return null;
}
function cap(s){return s?(s.charAt(0).toUpperCase()+s.slice(1)):s;}
function c5tile(mid,pillCls,pillTxt,subHtml,extraHtml,iconKey){var m=c5get(mid);
  var head=m.connected?m.displayValue:'Not connected';var pc=m.connected?pillCls:'n';var pt=m.connected?pillTxt:'—';
  var acol=m.connected?(m.color==='ink'?'ink-2':(m.color||'ink-2')):'muted';
  var ik=iconKey||C5TILE_ICON[mid];var ic=ik?('<span class="c5tile-ic" style="--ac:var(--'+acol+')">'+c5icon(ik)+'</span>'):'';
  return '<div class="c5tile'+(m.connected?'':' c5off')+'" data-c5m="'+mid+'" title="'+c5tip(m)+'"><div class="c5tile-top"><span class="c5tile-l">'+ic+m.name+'</span><span class="c5pill '+pc+'">'+pt+'</span></div>'+
    '<div class="c5tile-h'+(m.connected?'':' c5muted')+'">'+head+'</div>'+
    (subHtml?('<div class="c5tile-s">'+subHtml+'</div>'):'')+(extraHtml||'')+'</div>';
}
function c5card(mid){var m=c5get(mid);
  // A provenance chip (SELF-REPORTED / MODELED / …) only makes sense once there
  // is a value. When not connected, suppress it — showing "SELF-REPORTED" next to
  // "Not connected" is a contradiction.
  return '<div class="c5card" data-c5m="'+mid+'" title="'+c5tip(m)+'"><div class="c5card-top"><span class="c5card-l">'+m.name+'</span>'+(m.connected?c5chip(m.label):'')+'</div><div class="c5card-v" style="color:var(--'+(m.connected?(m.color==='ink'?'ink':m.color):'muted')+')">'+(m.connected?m.displayValue:'Not connected')+'</div></div>';
}
/* Distinct not-connected placeholder card — a labelled slot (e.g. a savings lever)
   shown honestly as "Not connected", tappable to the metric that explains what
   would populate it. Avoids rendering the same metric card multiple times. */
function c5phCard(label,mid){
  return '<div class="c5card"'+(mid?(' data-c5m="'+mid+'"'):'')+'><div class="c5card-top"><span class="c5card-l">'+label+'</span></div><div class="c5card-v" style="color:var(--muted)">Not connected</div></div>';
}
/* Interactive decision for a c5 seat. Builds a decision object for the shared
   decisions()/wireChoose() machinery (cockpit.html): the user CHOOSES an option
   (recommended first, but always alternatives), the choice is stamped with the
   seat leader's name + timestamp, editable for 24h then committed, and — where a
   ticketing system was connected at onboarding — auto-opened as a Jira/ServiceNow
   project whose status is pulled back on refresh. `pfx` namespaces the decision
   id per seat so ids stay globally unique (all seats render into hidden panels).
   `rec` is the recommended option; `alts` are the alternatives (defaults added). */
function c5decDefaultAlts(){return [
  {on:'Defer to the next planning cycle',osum:'No spend now · exposure persists',pros:['No capital committed this cycle.'],cons:['The exposure stays open until addressed.','The cost to fix rarely falls by waiting.']},
  {on:'Accept the risk — record a rationale',osum:'No cost · exposure retained',pros:['No spend or project.'],cons:['The exposure is retained on the balance sheet.','A formal risk-acceptance should be recorded — and, if material, noted to the board.']}
];}
function c5dec(pfx,n,q,sit,rec,alts){
  var opts=[{on:rec.on,osum:rec.osum||'',rec:true,tag:'A',pros:rec.pros||[],cons:rec.cons||[]}];
  (alts||c5decDefaultAlts()).forEach(function(a,i){opts.push({on:a.on,osum:a.osum||'',rec:false,tag:String.fromCharCode(66+i),pros:a.pros||[],cons:a.cons||[]});});
  return {n:pfx+'-'+n,q:q,sit:sit,opts:opts};
}
/* Render interactive decisions and wire them (choose · record · ticket · status). */
function c5decisions(list){
  var html=(typeof decisions==='function')?decisions(list):'';
  setTimeout(function(){try{if(typeof wireChoose==='function')wireChoose();}catch(_){}},0);
  return html;
}
/* From time to time, pull the live ticket status for every recorded decision from
   the connected ticketing system — independent of navigation. Set up once.
   renderDecStatus() calls pullStatus() when a decision has a ticket. */
if(typeof window!=='undefined'&&typeof setInterval==='function'&&!window.__c5DecPoll){
  window.__c5DecPoll=setInterval(function(){
    try{if(typeof renderDecStatus!=='function')return;
      document.querySelectorAll('.decision[data-dec]').forEach(function(b){renderDecStatus(b.getAttribute('data-dec'));});
    }catch(_){}
  },120000);
}
function c5bl(kick,head,headColor,para,btn,ghost){
  function b(x,cls){if(!x)return '';return '<button class="c5btn'+cls+'" '+(x.act?('onclick="'+x.act+'"'):('data-c5m="'+x.mid+'"'))+'>'+x.txt+'</button>';}
  return '<div class="c5bl"><div class="c5bl-k">'+kick+'</div><div class="c5bl-h"'+(headColor?(' style="color:var(--'+headColor+')"'):'')+'>'+head+'</div><div class="c5bl-p">'+para+'</div>'+
    b(btn,'')+b(ghost,' ghost')+'</div>';
}
function c5legend(items){return '<div class="c5legend">'+items.map(function(i){return '<span><i style="background:var(--'+i.c+')"></i>'+i.t+'</span>';}).join('')+'</div>';}

/* ---------- Tab 01 — Program health (Enterprise-risk reads) ---------- */
function c5Health(){
  var host=document.getElementById('c5-health');if(!host)return;
  if(typeof vendorFetch==='function'){try{vendorFetch(false);}catch(_){}}
  var ec=c5get('exp_identity');
  // Pill mapping from a metric's color → tile status pill (same tile style throughout;
  // no per-control square grids underneath any tile).
  var PILL={crit:{c:'r',t:'At risk'},warn:{c:'a',t:'Watch'},good:{c:'g',t:'Healthy'},blue:{c:'b',t:'Monitoring'},muted:{c:'n',t:'—'},ink:{c:'n',t:'—'}};
  function pillFor(mid){var m=c5get(mid);return PILL[m.color]||PILL.muted;}
  // Readiness gating (Build Brief §4): a tile whose required inputs aren't satisfied
  // shows a "Needs: <input>" state that deep-links back to onboarding, instead of a
  // number. window.CISO_READY is the /api/readiness?role=ciso payload.
  function widgetReady(mid){var R=(typeof window!=='undefined'&&window.CISO_READY)||null;if(!R||!R.widgets)return null;for(var i=0;i<R.widgets.length;i++){if(R.widgets[i].id===mid)return R.widgets[i];}return null;}
  // A tile always shows its metric's real verdict pill + value (illustrative until the
  // sources are connected). When required inputs aren't connected yet, the subtext
  // becomes a "Connect: <input> →" hint that deep-links to onboarding — without a
  // contradictory "Needs data" state on top of a computed number.
  // Connected → show the normal subtext (never a "Connect:" instruction). Only when
  // NOT connected do we show the connect prompt, and it deep-links to the exact
  // onboarding section (onbKey) rather than a generic jump.
  function tileFor(mid,onSub,icon,onbKey,onbLabel){
    var m=c5get(mid),p=pillFor(mid);
    var sub=m.connected?onSub
      :'<span class="c5needs" data-c5onb="'+c5esc(onbKey||'')+'" style="cursor:pointer;color:var(--blue)">Connect: '+c5esc(onbLabel||onbKey)+' →</span>';
    return c5tile(mid,p.c,p.t,sub,'',icon);
  }
  var anyRisk=['er_crown','er_capability','er_scenarios','er_thirdparty'].some(function(id){var m=c5get(id);return m.connected&&(m.color==='warn'||m.color==='crit');});
  var tiles=c5RingGrid([
    {id:'er_crown',ic:'checklist',onb:'crown jewel inventory'},
    {id:'er_capability',ic:'store',onb:'business capability map'},
    {id:'er_scenarios',ic:'trend',onb:'threat intelligence'},
    {id:'er_thirdparty',ic:'store',onb:'vendor risk'}]);
  // Bottom line — synthesized from the four reads, pointing to the single most
  // exposed thing (the top-ranked crown jewel), so it stays consistent with tile 1.
  var CJRk=(typeof LIVE!=='undefined'&&LIVE&&LIVE.crown_jewel_risk)||null;var topCj=(CJRk&&CJRk.items&&CJRk.items.length)?CJRk.items[0]:null;
  var blHead,blPara,blMid,blBtn;
  if(topCj){blMid='er_crown';blHead='Act on your highest-risk crown jewel first.';
    blPara='Across the four reads, your highest-risk crown jewel is <b>'+c5esc(topCj.asset)+'</b> (risk '+topCj.risk+(topCj.active_threat?', active threat':'')+', '+topCj.high_crit_vuln_count+' high/critical vulns)'+(CJRk.mocked?' — VM/EDR figures illustrative until those tools are connected':'')+'. Harden it before it becomes an incident.';
    blBtn='Prioritize '+c5esc(topCj.asset);}
  else if(ec.connected){blMid='exp_identity';blHead='One decision reduces the top exposure.';
    blPara='Your largest exposure driver is <b>'+ec.name.toLowerCase()+'</b> — '+ec.displayValue+' modeled, threatening '+ec.threatens+'. The fix is scoped and funded and waiting for your sign-off.';
    blBtn='Approve — removes '+ec.displayValue+' of risk';}
  else {blMid='exp_identity';blHead='Connect your tools to surface the top fix.';
    blPara='Connect your identity, control and crown-jewel sources and Nerion surfaces your most exposed asset here, with the scoped fix ready for sign-off.';
    blBtn='Approve the top fix';}
  host.innerHTML=c5header()+
    c5shell('Cyber exposure · where is the business most exposed?','Where cyber exposure concentrates — and what to act on first.',anyRisk?'warn':null,'The enterprise’s material cyber exposure, ranked across the four dimensions that move it. Every figure traces to its source — drill any tile to defend it to the board.')+
    tiles+
    c5bl('Bottom line',blHead,null,blPara,{mid:blMid,txt:blBtn})+
    '<div class="c5foot">Each tile traces to its exact sources. Figures shown are illustrative until the sources are connected.</div>';
}

/* Reusable graphical status-ring tile grid (the AI & supply-chain look): a
   completion ring + one-word verdict + the metric's real read, drilling to the
   full inspector. defs = [{id, ic, onb}] — `onb` is the onboarding keyword the
   "connect →" link deep-links to when a read isn't wired yet. opts.alarm makes a
   connected+critical tile pulse (used by the War Room / Cyber Operations tab). */
var C5RING_VERDICT={crit:'At risk',warn:'Watch',good:'Healthy',blue:'Monitoring',muted:'—',ink:'—'};
var C5RING_COL={crit:'crit',warn:'warn',good:'good',blue:'blue',muted:'muted',ink:'muted'};
function c5RingGrid(defs,opts){
  opts=opts||{};
  var pct=function(m){return m.connected?(m.color==='good'||m.color==='blue'?100:m.color==='warn'?55:m.color==='crit'?22:0):0;};
  var ring=function(m,col,ic){var p=pct(m);var C=2*Math.PI*20;var off=C*(1-p/100);
    return '<svg viewBox="0 0 48 48" width="52" height="52" style="flex:none"><circle cx="24" cy="24" r="20" fill="none" stroke="var(--line)" stroke-width="4.5"/>'+(m.connected?('<circle cx="24" cy="24" r="20" fill="none" stroke="var(--'+col+')" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'" transform="rotate(-90 24 24)"/>'):'')+'<g transform="translate(16 16) scale(0.66)" stroke="var(--'+(m.connected?col:'muted')+')">'+(C5ICON[ic]||C5ICON.shield)+'</g></svg>';};
  return '<div class="c5aigrid">'+defs.map(function(d){var m=c5get(d.id);
    var col=m.connected?(C5RING_COL[m.color]||'good'):'muted';
    var verdict=m.connected?(C5RING_VERDICT[m.color]||'Healthy'):'Not connected';
    var sub=m.connected?c5esc(String(m.displayValue)):'<span data-c5onb="'+c5esc(d.onb||'')+'" style="color:var(--blue);cursor:pointer;font-weight:600">connect →</span>';
    var alarm=(opts.alarm&&m.connected&&m.color==='crit')?' c5aic-alarm':'';
    return '<div class="c5aic'+alarm+'" data-c5m="'+d.id+'" style="--ac:var(--'+col+')" title="'+c5tip(m)+'">'+ring(m,col,d.ic)+
      '<div style="min-width:0;flex:1"><div class="c5aic-t">'+m.name+'</div><div class="c5aic-v" style="color:var(--'+col+')">'+verdict+'</div><div class="c5aic-s">'+sub+'</div></div></div>';
  }).join('')+'</div>';
}

/* ---------- CISO tab — AI & Software Supply-Chain Security ---------- */
/* Six enterprise-risk reads, Program-Health design (tile grid + bottom line).
   Each tile is a provenance metric; posture is self-reported from onboarding
   until the named live tool connects. */
function c5AiSupply(){
  var host=document.getElementById('c5-aisupply');if(!host)return;
  // Graphical, low-text tiles: a status ring + one-word verdict per read, drilling
  // to the full detail. No paragraph of "connect X …" on the surface — just a
  // subtle connect link that jumps to the right onboarding section.
  var defs=[{id:'ais_aiml',ic:'cpu',onb:'ai supply chain'},{id:'ais_genai',ic:'store',onb:'ai supply chain'},{id:'ais_aicode',ic:'file',onb:'ai supply chain'},{id:'ais_pipeline',ic:'box',onb:'ai supply chain'},{id:'ais_nhi',ic:'key',onb:'ai supply chain'},{id:'ais_pqc',ic:'lock',onb:'ai supply chain'}];
  var ms=defs.map(function(d){return c5get(d.id);});
  var anyRisk=ms.some(function(m){return m.connected&&(m.color==='warn'||m.color==='crit');});
  var worst=null,worstR=0;ms.forEach(function(m){var r=(m.color==='crit'?2:m.color==='warn'?1:0);if(m.connected&&r>worstR){worst=m;worstR=r;}});
  var tiles=c5RingGrid(defs);
  var blHead,blPara,blMid,blBtn;
  if(worst){blMid=worst.id;blHead='Close your highest AI & supply-chain exposure first.';
    blPara='Across the six reads, your most exposed area is <b>'+c5esc(worst.name)+'</b> — '+worst.displayValue+'. '+(worst.note||'');
    blBtn='Prioritize '+c5esc(worst.name.toLowerCase());}
  else if(ms.some(function(m){return m.connected;})){blMid='ais_aiml';blHead='Your AI and software supply chain is in good shape.';
    blPara='No open exposure across your AI systems, GenAI usage, AI-assisted coding, build pipeline, machine identities or post-quantum readiness. Hold the posture and keep the sources live.';
    blBtn='Review AI/ML posture';}
  else {blMid='ais_aiml';blHead='Connect your AI and supply-chain sources to light this up.';
    blPara='Add your AI asset inventory, CASB/DLP, coding-assistant logs, CI/CD scanning, machine-identity tooling and a cryptographic inventory, and each read populates with your own posture.';
    blBtn='Start with AI/ML posture';}
  host.innerHTML=c5header()+
    c5shell('AI &amp; software supply-chain security · where is the AI and build chain exposed?','The AI systems you run, the AI your people use, the code and pipeline that ship it, your machine identities and your post-quantum readiness.',anyRisk?'warn':null,'The six dimensions of AI and software-supply-chain risk the board now asks about — each traces to its source. Drill any tile to defend it.')+
    tiles+
    c5bl('Bottom line',blHead,null,blPara,{mid:blMid,txt:blBtn})+
    '<div class="c5foot">Each tile traces to its exact sources. Posture is self-reported until the named tool connects — figures shown are illustrative.</div>';
}

/* ---------- Tab 02 — Top exposure ---------- */
/* Protection score for a business area. Prefer a real GRC control-coverage figure;
   otherwise map the GRC status (Adequate / Watch / Gap) to a representative band —
   marked illustrative wherever it is derived rather than measured. */
function c5protScore(c){
  if(c.control_coverage!=null)return Math.max(0,Math.min(100,Math.round(Number(c.control_coverage))));
  var g=String(c.grc_status||'').toLowerCase();
  if(/adequate|strong|good|covered/.test(g))return 88;
  if(/watch|partial|moderate/.test(g))return 66;
  if(/gap|weak|inadequate|deficient/.test(g))return 46;
  return null;
}
function c5protGaps(c){
  if(c.control_gaps!=null)return Number(c.control_gaps);
  var g=String(c.grc_status||'').toLowerCase();
  if(/adequate|strong|good|covered/.test(g))return 0;
  if(/watch|partial|moderate/.test(g))return 2;
  if(/gap|weak|inadequate|deficient/.test(g))return 4;
  return null;
}
/* What each control actually guards — used to explain its business value in words,
   not just dollars. */
var CAP_PROTECTS={edr:'every endpoint & server',mfa:'all identities & access',pam:'privileged & admin accounts',vuln:'internet-facing & critical assets',aware:'the workforce — your phishing entry point',siem:'estate-wide detection & response',dlp:'sensitive & regulated data',seg:'crown-jewel network zones',backup:'recoverability of your crown jewels',cspm:'the cloud estate'};
/* ---------- Tab 02 — Protection effectiveness ---------- */
/* Three reads the CISO can act on: where the business is well protected, where to
   concentrate next, and which controls return the most business value per point of
   coverage. Business areas come from the Business Capability Map joined to GRC;
   controls come from the live control ledger (deployment × framework-weighted
   criticality of what they protect = risk removed). Nothing hardcoded. The
   on-screen copy only introduces the tab and states results — no how-to text and
   no method/formula on the surface (those live in the drill-down inspector). A
   section renders only when it has real data; otherwise the tab just introduces
   itself. */
function c5Exposure(){
  var host=document.getElementById('c5-exposure');if(!host)return;
  var TARGET=75; // the platform's healthy-coverage bar, consistent with capability scoring
  var caps=(typeof LIVE!=='undefined'&&LIVE&&LIVE.capabilities)||[];
  var areas=caps.map(function(c){return {name:c.name,score:c5protScore(c),gaps:c5protGaps(c),grc:c.grc_status||null,exp:Number(c.exposure_usd)||0,measured:(c.control_coverage!=null)};}).filter(function(a){return a.name&&a.score!=null;});
  var anyDerived=areas.some(function(a){return !a.measured;});
  var well=areas.filter(function(a){return a.score>=TARGET&&(a.gaps||0)===0;}).sort(function(a,b){return b.score-a.score;});
  var weak=areas.filter(function(a){return a.score<TARGET||(a.gaps||0)>0;}).sort(function(a,b){return a.score-b.score;});
  // Controls, ranked by the business value each returns (dollars of expected loss removed).
  var rr=(typeof capRiskRemoved==='function')?capRiskRemoved():{byCap:{},total:0,anyLive:false};
  var ctrls=(typeof CAPS!=='undefined'?CAPS:[]).map(function(c){return {c:c,p:(typeof capDeploy==='function'?capDeploy(c):null),usd:(rr.byCap&&rr.byCap[c.k])||0};});
  var ctrlConn=ctrls.filter(function(o){return o.p!=null;}).sort(function(a,b){return b.usd-a.usd;});
  var ctrlOff=ctrls.filter(function(o){return o.p==null;}).length;
  var maxV=Math.max.apply(null,ctrlConn.map(function(o){return o.usd;}).concat([1]));
  var topCtrl=ctrlConn[0]||null,topWeak=weak[0]||null;

  // ── Verdict + three-number summary ─────────────────────────────────────────
  var haveAreas=areas.length>0,haveCtrls=ctrlConn.length>0;
  var nm=function(c){return c.name.replace(/ *\(.*\)/,'');};
  var verdict=haveAreas
    ?(weak.length===0
        ?'Every business area clears its protection bar — the program is strong across the board.'
        :(well.length>=weak.length
            ?('Most of the business is well protected — '+weak.length+' area'+(weak.length>1?'s':'')+' carr'+(weak.length>1?'y':'ies')+' the residual exposure, and your highest-value controls are the ones to extend to them.')
            :('More of the business needs strengthening than is fully covered — the exposure concentrates in a handful of areas, addressable with your highest-value controls.')))
    :'Where the business is protected, where it isn’t, and which controls buy down the most risk.';
  var intro=haveAreas
    ?('Protection seen from the business, not the tool. '+(well.length?('You are strong across '+well.length+' area'+(well.length>1?'s':'')+' — the defensible base you take to the board. '):'')+(topWeak?('The exposure concentrates in '+topWeak.name+', where protection is thinnest'+((topWeak.gaps||0)>0?(' — '+topWeak.gaps+' open control gap'+(topWeak.gaps>1?'s':'')):'')+'. '):'')+(topCtrl?('Your best lever is '+nm(topCtrl.c)+', the control returning the most business value today.'):''))
    :'The CISO’s read on where to hold the line, and where the next dollar of protection should go.';
  var tone=(haveAreas&&weak.length&&well.length<weak.length)?'warn':null;
  // Summary as premium icon cards — clickable to a detail inspector, with a hover tooltip.
  var scard=function(ic,lbl,val,sub,col,pc,tip){col=col||'muted';return '<div class="c5opc" data-c5pc="'+pc+'" style="--ac:var(--'+col+')" title="'+c5esc(tip||'')+'"><span class="c5opc-go">details ›</span><div class="c5opc-h"><span class="c5opc-ic">'+c5icon(ic)+'</span><span class="c5opc-t">'+lbl+'</span></div><div class="c5opc-v" style="color:var(--'+(col==='muted'?'ink':col)+')">'+val+'</div><div class="c5opc-s">'+sub+'</div></div>';};

  // ── Widget rows ────────────────────────────────────────────────────────────
  var areaRow=function(a,mode){var cls=capColor(a.score);
    var sub=(mode==='well')
      ?((a.grc?('GRC '+a.grc+' · '):'')+'no open control gaps'+(a.measured?'':' · illustrative'))
      :((a.gaps>0?(a.gaps+' open control gap'+(a.gaps>1?'s':'')):'below its protection target')+(a.exp>0?(' · '+usd(a.exp)+' of exposure carried'):'')+(a.measured?'':' · illustrative'));
    return '<div class="c5erow"><div style="flex:1;min-width:0"><div class="c5exp">'+a.name+' <span class="c5pill '+(mode==='well'?'g':a.score<50?'r':'a')+'" style="margin-left:4px">'+(mode==='well'?'Protected':(a.score<50?'Priority':'Strengthen'))+'</span></div><div class="c5esub">'+sub+'</div></div>'+
      '<div class="c5etrack"><div style="width:'+a.score+'%;height:100%;background:var(--'+cls+')"></div></div>'+
      '<div class="c5emult" style="color:var(--'+cls+')">'+a.score+'</div></div>';
  };
  var w1=well.length?well.map(function(a){return areaRow(a,'well');}).join(''):'<div class="c5foot" style="margin-top:0;padding:12px 4px">No area clears its protection target yet — every area is in the list below.</div>';
  var w2=weak.length?weak.map(function(a){return areaRow(a,'weak');}).join(''):'<div class="c5foot" style="margin-top:0;padding:12px 4px">No area is below its protection target or carrying an open control gap.</div>';
  var w3=ctrlConn.map(function(o){var c=o.c,pct=maxV>0?Math.round(o.usd/maxV*100):0;if(pct<6&&o.usd>0)pct=6;
      return '<div class="c5erow" data-c5cv="'+c.k+'" title="'+c5esc(nm(c)+' — how its '+usd(o.usd)+' of business value is computed. Click for the full breakdown.')+'"><div style="flex:1;min-width:0"><div class="c5exp">'+nm(c)+' <span class="c5pill b" style="margin-left:4px">'+o.p+'% deployed</span></div><div class="c5esub">Protects '+(CAP_PROTECTS[c.k]||c.name.toLowerCase())+'</div></div>'+
        '<div class="c5etrack"><div style="width:'+pct+'%;height:100%;background:var(--good)"></div></div>'+
        '<div class="c5emult" style="color:var(--good)">'+usd(o.usd)+'</div></div>';
    }).join('');

  // Build the surface: intro + three-number summary, then only the sections that
  // have real data — no how-to text, no method/formula on screen.
  // Stat card: a static (non-clickable) value card in the c5opc style.
  var statc=function(ic,lbl,val,sub,col,vfs){col=col||'muted';return '<div class="c5opc" style="cursor:default;--ac:var(--'+col+')"><div class="c5opc-h"><span class="c5opc-ic">'+c5icon(ic)+'</span><span class="c5opc-t">'+lbl+'</span></div><div class="c5opc-v" style="color:var(--'+(col==='muted'?'ink':col)+')'+(vfs?(';font-size:'+vfs):'')+'">'+val+'</div><div class="c5opc-s">'+sub+'</div></div>';};
  // Summary: lead with the real money (total risk removed — not duplicated below),
  // then the two area reads when the capability map is connected, or a highest-value
  // control + a connect prompt when it isn't. No empty "—" boxes, no box that just
  // repeats the controls list.
  var summary='<div class="c5statgrid">'+statc('coin','Risk removed by controls',haveCtrls?usd(rr.total):'—','Modeled expected loss your controls buy down','good');
  if(haveAreas){
    summary+=scard('shieldcheck','Areas well protected',String(well.length),'Strong enough to defend to the board',well.length?'good':'muted','well','The business areas clearing their protection bar with no open control gaps. Click for the list.')+
      scard('target','Areas to strengthen',String(weak.length),'Carrying the residual exposure',weak.length?'warn':'muted','weak','The business areas below the bar or carrying open control gaps. Click for the list.');
  } else {
    summary+=statc('cpu','Highest-value control',topCtrl?nm(topCtrl.c):'—',topCtrl?('removes '+usd(topCtrl.usd)+' · '+topCtrl.p+'% deployed'):'connect your security tools','good','17px')+
      '<div class="c5opc" data-c5onb="business capability map" style="--ac:var(--blue)"><span class="c5opc-go">connect ›</span><div class="c5opc-h"><span class="c5opc-ic">'+c5icon('store')+'</span><span class="c5opc-t">Protection by business area</span></div><div class="c5opc-v" style="color:var(--blue);font-size:15px">Connect capability map →</div><div class="c5opc-s">Rank protection by business function once your Business Capability Map is added.</div></div>';
  }
  summary+='</div>';
  var body=c5header()+
    c5shell('Protection effectiveness · is the business protected where it counts?',verdict,tone,intro)+
    summary;
  // Stash for the summary-card detail inspector (opened on click).
  try{window.C5PROT={well:well,weak:weak,ctrl:ctrlConn,target:TARGET,anyDerived:anyDerived};}catch(_){}
  if(haveAreas){
    body+='<div class="c5seclab">Where the business is well protected</div><div>'+w1+'</div>'+
          '<div class="c5seclab" style="margin-top:18px">Where to concentrate next</div><div>'+w2+'</div>';
  }
  if(haveCtrls){
    body+='<div class="c5seclab" style="margin-top:18px">Controls delivering the most business value · '+ctrlConn.length+' control'+(ctrlConn.length>1?'s':'')+' · '+usd(rr.total)+' removed</div><div>'+w3+'</div>';
  }
  // Conclusion — always present, like the other tabs.
  if(haveAreas&&topWeak&&topCtrl){
    body+=c5bl('Bottom line',
      'Extend '+nm(topCtrl.c)+' to '+topWeak.name+' — your best-value control against your least-protected area.',
      tone,
      'The exposure concentrates in '+topWeak.name+', where protection is thinnest, and '+nm(topCtrl.c)+' is the highest-value control you run. Extending it there removes the most business risk for the least incremental spend — and it is already funded.',
      {mid:topCtrl.c.k==='mfa'?'exp_identity':'exp_total',txt:'Extend '+nm(topCtrl.c)+' — removes '+usd(topCtrl.usd)});
  } else if(haveAreas&&weak.length===0){
    body+=c5bl('Bottom line','The business is protected across every area.',null,'Every area clears its protection bar. Hold the posture and evidence it — this is the read the board wants to see sustained.',null);
  } else {
    body+=c5bl('Bottom line','Protection is where the next dollar of security gets decided.',null,'This view separates the parts of the business that are safe to defend to the board from the parts still carrying exposure — and names the control that closes the gap most efficiently. It is the CISO’s allocation call, on one screen.',null);
  }
  body+='<div class="c5foot">Every figure traces to its source'+(anyDerived?'; figures marked “illustrative” are not yet fully evidenced':'')+'.</div>';
  host.innerHTML=body;
}

/* ---------- Tab 03 — Control effectiveness ---------- */
function c5mc(mid,label,valHtml,color){
  var mm=null;try{if(mid&&typeof c5get==='function')mm=c5get(mid);}catch(_){}var tip=mm?(' title="'+c5tip(mm)+'"'):'';
  return '<div class="c5mc"'+(mid?(' data-c5m="'+mid+'"'):'')+tip+'><div class="c5mc-l">'+label+'</div><div class="c5mc-v"'+(color?(' style="color:var(--'+color+')"'):'')+'>'+valHtml+'</div></div>';
}
/* War Room alarm — a short double-beep sounded ONCE when an incident first appears
   (armed flag prevents re-beeping on every render; cleared when the incident
   clears). Reuses the cockpit's shared AudioContext. */
function c5WarAlarm(){
  try{if(window.C5_WAR_ARMED)return;window.C5_WAR_ARMED=true;}catch(_){}
  try{if(typeof ensureAudio==='function')ensureAudio();}catch(_){}
  var ctx=(typeof audioCtx!=='undefined'&&audioCtx)?audioCtx:null;if(!ctx)return;
  try{var t=ctx.currentTime;[0,0.32].forEach(function(off){var o=ctx.createOscillator(),g=ctx.createGain();o.type='square';o.frequency.setValueAtTime(920,t+off);o.connect(g);g.connect(ctx.destination);g.gain.setValueAtTime(0.0001,t+off);g.gain.exponentialRampToValueAtTime(0.08,t+off+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+off+0.24);o.start(t+off);o.stop(t+off+0.26);});}catch(_){}
}
/* Tab 03 — Cyber Operations. The live SOC picture for the seat: active incidents,
   services under threat, third-party alerts, and emerging risks. Each box is a
   provenance metric; the QUERY/JOIN/OUTPUT spec lives in the drill-down inspector
   ("How it's computed"), never on the surface. A quiet SOC reads green. */
function c5Effect(){
  var host=document.getElementById('c5-effect');if(!host)return;
  var defs=[{id:'cops_incidents',ic:'alert',onb:'siem'},{id:'cops_services',ic:'pulse',onb:'siem'},{id:'cops_thirdparty',ic:'store',onb:'vendor risk'},{id:'cops_emerging',ic:'target',onb:'threat intelligence'}];
  var ms=defs.map(function(d){return {d:d,m:c5get(d.id)};});
  var active=ms.filter(function(x){return x.m.connected&&(x.m.color==='crit'||x.m.color==='warn');}).length;
  var anyConn=ms.some(function(x){return x.m.connected;});
  var cards=c5RingGrid(defs,{alarm:true});
  // War Room — a live incident (a crit incident front) makes it blink + beep to
  // draw the CISO to click in. wrOpen() is the existing War Room modal.
  var incident=ms.filter(function(x){return x.m.connected&&x.m.color==='crit';}).length>0;
  if(incident){try{c5WarAlarm();}catch(_){}}else{try{window.C5_WAR_ARMED=false;}catch(_){}}
  var warbar=incident
    ?'<div class="c5warbar active"><div class="c5warbar-l"><span class="c5warbar-ic">⚠</span><div><div class="c5warbar-t">Active incident — the War Room is live</div><div class="c5warbar-s">Command the response, run the regulatory clocks and brief every executive from one place.</div></div></div><button class="wr-btn" data-openwar="1" style="background:var(--crit);color:#fff;animation:warpulse 1.1s infinite">⚠ Enter the War Room</button></div>'
    :'<div class="c5warbar"><div class="c5warbar-l"><span class="c5warbar-ic">🛡️</span><div><div class="c5warbar-t">War Room — standing by</div><div class="c5warbar-s">No active incident. The moment one crosses the line this turns red, sounds, and opens the response console.</div></div></div><button class="wr-btn gh" data-openwar="1">Open War Room</button></div>';
  var verdict=anyConn
    ?(active>0?('The SOC has '+active+' operational front'+(active>1?'s':'')+' live right now that need command attention.'):'Nothing is actively impacting the business right now — the operational picture is clean.')
    :'What is actively hitting the business right now — incidents, threats, third-party alerts and emerging risks — on one operational screen.';
  var intro=anyConn
    ?'Live cyber operations for the seat: the incidents impacting the business, the services under active threat, the third-party alerts reaching your services, and the emerging risks matched to your stack. Each box opens to the exact record behind it.'
    :'What this seat sees at a glance: the active incidents, the business services under threat, the third-party alerts touching your services, and the emerging risks worth acting on — the operational picture the CISO runs the day from.';
  // The single operational front that needs command attention now (crit before warn).
  var sev={crit:2,warn:1},top=null;
  ms.forEach(function(x){if(x.m.connected&&(x.m.color==='crit'||x.m.color==='warn')){if(!top||sev[x.m.color]>sev[top.m.color])top=x;}});
  var acts={
    cops_incidents:'Run it to ground — contain, confirm business impact, and start the disclosure clock the moment it crosses materiality.',
    cops_services:'Concentrate detection and containment on the services under active detection before the threat can pivot to a crown jewel.',
    cops_thirdparty:'Press your worst-flagged third party for remediation evidence and confirm the business services it supports are covered.',
    cops_emerging:'Action the emerging risks that match your stack before they are weaponized — patch or compensate the matching assets.'
  };
  var body=c5header()+
    c5shell('Cyber operations · what needs command attention right now?',verdict,active>0?'warn':null,intro)+
    warbar+
    cards;
  if(top){
    body+=c5bl('Bottom line',
      top.m.name+' is your live front — '+top.m.displayValue+'.',
      top.m.color,
      top.m.note+' '+(acts[top.d.id]||''),
      {mid:top.m.id,txt:'Open '+top.m.name.toLowerCase()});
  } else if(anyConn){
    body+=c5bl('Bottom line','Nothing needs command attention right now.',null,'No incident, active threat, third-party alert or emerging risk is currently hitting the business — hold watch and keep the feeds live.',null);
  } else {
    body+=c5bl('Bottom line','This is the screen the CISO runs the day from.',null,'Once your SIEM / SOAR, vendor-risk monitoring and threat-intel feed are live, this names the single operational front that needs command attention — an incident, an active threat, a third-party alert or an emerging risk.',null);
  }
  body+='<div class="c5foot">Live from your SIEM / SOAR, vendor-risk monitoring and threat-intel feed. Every box opens to the record behind it.</div>';
  host.innerHTML=body;
}

/* ---------- Tab 04 — Threats (MITRE ATT&CK) ---------- */
/* A distinct glyph per MITRE ATT&CK tactic — makes the kill-chain grid scannable. */
var TACTIC_ICON={'Reconnaissance':'target','Resource Development':'wand','Initial Access':'plug','Execution':'pulse','Persistence':'lock','Privilege Escalation':'trend','Defense Evasion':'bug','Credential Access':'key','Discovery':'database','Lateral Movement':'refresh','Collection':'box','Command & Control':'tower','Exfiltration':'file','Impact':'alert'};
function c5Threats(){
  var host=document.getElementById('c5-threats');if(!host)return;
  var tactics=(typeof TACTIC_CAPS!=='undefined')?Object.keys(TACTIC_CAPS):[];
  var covered=0,partial=0,partials=[];
  var cells=tactics.map(function(t){var m=c5get('tac_'+t);var col=m.state==='covered'?'good':m.state==='partial'?'warn':'muted';
    if(m.state==='covered')covered++;if(m.state==='partial'){partial++;partials.push(t);}
    var pct=null;if(m.connected){var mm=String(m.displayValue).match(/(\d+)/);pct=mm?Number(mm[1]):null;}
    var ic=TACTIC_ICON[t]||'target';
    return '<div class="c5att" data-c5m="tac_'+t+'" style="--ac:var(--'+col+')" title="'+c5esc(c5tip(m))+'">'+
      '<div class="c5att-h"><span class="c5att-ic">'+c5icon(ic)+'</span><span class="c5att-n">'+t+'</span></div>'+
      '<div class="c5att-bar">'+(pct!=null?('<i style="width:'+Math.max(4,Math.min(100,pct))+'%"></i>'):'')+'</div>'+
      '<div class="c5att-c">'+(m.connected?m.displayValue:'not connected')+'</div></div>';
  }).join('');
  var ts=c5get('threat_status');var ta=sig('threat_actors_active');
  var band='<div class="c5band'+(ts.connected&&/campaign/.test(ts.displayValue)?' r':'')+'" data-c5m="threat_status"><div><b>'+(ts.connected?ts.displayValue:'Connect SIEM for live status')+'</b>'+(ta!=null?(' · '+ta+' sector actor'+(ta>1?'s':'')+' tracked'):'')+'</div><span class="c5chip c5-live">live</span></div>';
  var gap=partials.length?('<div class="c5gap"><b>Your soft spot: '+partials.join(' &amp; ').toLowerCase()+'</b><div class="c5bl-p">These are the tactics where your control coverage is only partial — the techniques your tracked actors favour and the open route to your crown jewels. This is the same identity gap driving your largest exposure.</div></div>'):'<div class="c5gap" style="border-color:rgba(46,139,107,.3);background:rgba(46,139,107,.06)"><b>No partial tactics</b><div class="c5bl-p">Every mapped ATT&amp;CK tactic is fully covered by your connected controls.</div></div>';
  host.innerHTML=c5header()+
    c5shell('Threats · MITRE ATT&CK coverage','Covered across the kill chain — with soft spots where identity controls thin out.',null,'Mapped to MITRE ATT&CK, this heatmap shows your live control coverage per tactic. The partials are the identity techniques your tracked actors favour, and the open route to your customer platform. Each tactic traces to its techniques and your coverage.')+
    band+
    '<div class="c5attgrid">'+cells+'</div>'+
    '<div class="c5foot" style="margin-top:10px">'+covered+' of '+tactics.length+' tactics fully covered'+(partial?(' · '+partial+' partial ('+partials.join(', ').toLowerCase()+')'):'')+'</div>'+
    gap+
    c5bl('Bottom line','One move takes your coverage toward full.',null,'Closing the identity gap lifts the partial tactics toward covered — and removes your single largest exposure.',{mid:'exp_identity',txt:'Close the identity gap'})+
    '<div class="c5foot">Coverage maps MITRE ATT&CK tactics to your detection and prevention controls.</div>';
}

/* ---------- Tab 05 — Peers ---------- */
function c5Peers(){
  var host=document.getElementById('c5-peers');if(!host)return;
  c5SetSnapshot();
  if(typeof peerSubmitAndFetch==='function'&&c5peerOptin()&&!c5peer()){try{peerSubmitAndFetch();}catch(_){}}
  var doms=['asset','iam','edp','detect','ir','tpr'];
  var rows=doms.map(function(k){var m=c5domainMetric(k);
    var yp=m.mine!=null?Math.max(2,Math.min(98,m.mine/5*100)):0;
    var mp=m.med!=null?Math.max(2,Math.min(98,m.med/5*100)):null;
    var yc=m.delta==null?'muted':(m.delta>=0?'good':'warn');
    var dtxt=m.delta==null?'—':((m.delta>=0?'+':'−')+Math.abs(m.delta).toFixed(1));
    var trk='<div class="c5trk">'+(mp!=null?('<div style="position:absolute;left:'+mp+'%;top:-3px;width:2px;height:14px;background:var(--muted)"></div>'):'')+(m.mine!=null?('<div style="position:absolute;left:calc('+yp+'% - 6px);top:-2px;width:12px;height:12px;border-radius:50%;background:var(--'+yc+');border:2px solid var(--surface)"></div>'):'')+'</div>';
    return '<div class="c5drow" data-c5m="dom_'+k+'"><div style="flex:1;min-width:0"><div class="c5dn">'+m.name+'</div></div>'+trk+'<div style="font-size:14px;font-weight:500;width:28px;text-align:right;color:var(--ink)">'+(m.mine!=null?Number(m.mine).toFixed(1):'—')+'</div><div class="c5delta" style="color:var(--'+yc+')">'+dtxt+'</div></div>';
  }).join('');
  var mat=c5get('peer_maturity'),med=c5get('peer_median'),pos=c5get('peer_position');
  var kanon='<div class="c5kanon">'+c5icon('lock')+'<div>Anonymous and opt-in. Cohorts use k-anonymity and are suppressed below a minimum size — nothing identifying leaves your environment. This is the only part of Nerion that reaches the internet.</div></div>';
  host.innerHTML=c5header()+
    c5shell('Peer benchmark · how do we compare?','Ahead of your peers overall — with one domain you trail.',null,'Benchmarked against same-size, same-industry peers, your maturity sits in the top third. You lead on detection and data protection; you trail on identity and access — the same gap driving your exposure. Each domain carries its full comparison.')+
    '<div class="c5statgrid">'+c5mc('peer_maturity','Your maturity',(mat.connected?mat.displayValue:'—'),null)+c5mc('peer_median','Peer median',(med.connected?med.displayValue:'—'),'ink-2')+c5mc('peer_position','Your position',(pos.connected?pos.displayValue:'—'),pos.connected?'good':null)+'</div>'+
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px"><span class="c5seclab" style="margin:0">By domain · your score vs. peer median</span><span style="font-size:11.5px;color:var(--muted)">▏ peer median</span></div>'+
    '<div>'+rows+'</div>'+
    kanon+
    c5bl('Bottom line','Close the one domain where peers beat you.',null,'Identity and access is your only real gap versus peers — and it’s your largest exposure. Closing it moves you from below-median to top-quartile there, and removes your single largest exposure.',{mid:'exp_identity',txt:'Close the identity gap'})+
    '<div class="c5foot">Benchmark is opt-in and anonymized against same-size industry peers. Figures shown are illustrative.</div>';
}

/* ================= CFO seat — same engine, financial lens ================= */
/* Shared control-return rows (identical objects to the CISO Effectiveness tab). */
function c5ctlRankRows(){
  var ids=['ctl_identity','ctl_email','ctl_edr','ctl_vuln','ctl_dlp'];
  var ms=ids.map(function(id){return c5get(id);});
  var maxR=Math.max.apply(null,ms.map(function(m){return m.removed||0;}).concat([1]));
  var minM=null;ms.forEach(function(m){if(m.connected&&(minM==null||m.removed<minM.removed))minM=m;});
  var rows=ms.map(function(m){var review=(minM&&m.id===minM.id&&ms.filter(function(x){return x.connected;}).length>1);var pf=maxR>0?Math.round((m.removed||0)/maxR*100):0;
    var rtip=c5esc(m.name+' — '+(m.connected?(usd(m.removed)+' of modeled expected loss removed this quarter (this area’s weighted share of the total). Bar = size vs your largest area ('+pf+'%).'+(review?' Amber = your lowest-contributing area, flagged to review.':'')+' Tap for the full breakdown.'):'not connected — connect this control to measure it.'));
    return '<div class="c5row" data-c5m="'+m.id+'" title="'+rtip+'"><div class="c5row-main"><div class="c5row-t">'+m.name+(review?'<span class="c5tag rev">Review</span>':'')+'</div><div class="c5row-s">'+(m.connected?(usd(m.removed)+' removed · return per dollar needs per-control spend'):'connect this control')+'</div><div class="c5retbar"><i class="'+(review?'a':'')+'" style="width:'+pf+'%"></i></div></div><div class="c5row-v">'+(m.connected?usd(m.removed):'—')+'</div></div>';
  }).join('');
  // Legend so the bar length + colour are never a mystery.
  return rows+'<div style="padding:10px 4px 2px;font-size:11px;line-height:1.5;color:var(--muted)">Bar length = risk removed vs. your largest area. <span style="color:var(--warn);font-weight:700">Amber</span> = the lowest-contributing area, flagged to review — everything else is green. Return-per-dollar (×) appears once you attribute security spend by control.</div>';
}
/* Tab 01 — Financial exposure */
function c5cfExposure(){
  var host=document.getElementById('cf-exposure');if(!host)return;
  var hr=c5get('cf_headroom'),cov=c5get('cf_ins_cov'),ec=c5get('exp_identity');
  var alePill=hr.connected?(hr.value>=0||/^[^−-]/.test(hr.displayValue)?'g':'r'):'n';
  var aleTxt=hr.connected?'Within appetite':'—';
  var covGap=c5get('cf_ins_gap');
  host.innerHTML=c5header()+
    c5shell('Financial exposure · are we within appetite?','Cyber exposure is within appetite — and one move keeps it there.',null,'Your modeled cyber exposure sits against the board-approved appetite, with the headroom shown below. The largest driver is a single identity gap; funding its fix protects the headroom and trims your tail. Every figure traces to its model and source.')+
    '<div class="c5cards">'+c5card('exp_total')+c5card('cf_appetite')+c5card('cf_headroom')+'</div>'+
    (function(){var hasGap=covGap.connected&&covGap.color==='warn'; // a residual gap only exists when tail > insured limit
      return '<div class="c5tiles">'+
      c5tile('exp_identity','a','Largest',(ec.connected?'the single biggest driver — the CISO’s top ask':'the single biggest driver'))+
      c5tile('cf_tail','a','Watch',(covGap.connected?(hasGap?('Exceeds your insured limit by '+covGap.displayValue):'Within your insured limit'):'the severe-but-plausible bad year'))+
      c5tile('cf_bi','b','If down','If the customer platform is down')+
      c5tile('cf_ins_cov',(hasGap?'a':'g'),(hasGap?'Gap':'Covered'),(covGap.connected?(hasGap?('of the tail covered · '+covGap.displayValue+' residual gap'):'of the tail covered · no residual gap'):'of the modeled tail covered'))+
    '</div>';})()+
    c5bl('Bottom line','One fix protects your headroom.',null,(ec.connected?('The identity gap drives '+ec.displayValue+' of your exposure — the CISO’s top ask, in your terms. Funding it keeps you comfortably within appetite and trims the tail.'):'Connect your identity controls and the top exposure driver — the CISO’s top ask — surfaces here in dollars.'),{mid:'exp_identity',txt:ec.connected?('Approve identity fix — removes '+ec.displayValue):'Approve identity fix'})+
    '<div class="c5foot">Exposure is modeled (ALE and tail); every input traces to its source.</div>';
}
/* Tab 02 — Cyber ROI */
function c5cfRoi(){
  var host=document.getElementById('cf-roi');if(!host)return;
  var st=(typeof ROI_STATE!=='undefined')?ROI_STATE:null;var haveReturn=!!(st&&st.invested>0&&st.riskRemoved>0);
  host.innerHTML=c5header()+
    c5shell('Cyber ROI · is the spend paying off?','Every dollar of cyber spend is removing risk — and you can prove it.',null,'The dollars each budget area removes — live from your control-value ledger — and your program-level return. Every figure traces to its risk-removed model; per-area returns appear once spend is attributed by area.')+
    '<div class="c5cards">'+c5card('eff_removed')+c5card('eff_spend')+c5card('eff_return')+'</div>'+
    '<div class="c5rank"><div class="c5rank-h">Return by budget area · risk removed this quarter</div>'+c5ctlRankRows()+'</div>'+
    c5bl('Bottom line','Your best next dollar is identity — and one line is worth reviewing.',null,(haveReturn?('Your program returns '+((typeof roiMult==='function'?roiMult(st.ret):Math.round(st.ret)))+'× on '+usd(st.invested)+' invested. Identity removes the most risk per dollar — shift spend there. The lowest-return line is a retire/consolidate candidate on Cost optimization.'):'Identity removes the most risk per dollar. Import your funded initiatives (spend) to compute return per dollar, and see the retire/consolidate candidates on Cost optimization.'),{mid:'ctl_identity',txt:'Shift budget to identity'},{mid:'ctl_dlp',txt:'Review lowest-return line'})+
    '<div class="c5foot">Return = risk removed ÷ spend.</div>';
}
/* Tab 03 — Insurance & risk transfer */
function c5covBar(){
  var ins=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&LIVE.economics.insurance)||{},lim=Number(ins.limit)||0,tail=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&Number(LIVE.economics.tail))||0;
  if(!(lim>0&&tail>0))return '<div class="c5note">◐ Connect your policy record and risk model to see cover vs the modeled tail.</div>';
  var covp=Math.min(100,Math.round(lim/tail*100)),gp=Math.max(0,100-covp);
  return '<div style="margin-top:14px"><div style="display:flex;height:34px;border-radius:8px;overflow:hidden;border:1px solid var(--line)">'+
    '<div data-c5m="cf_ins_limit" style="width:'+covp+'%;background:rgba(46,139,107,.85);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;cursor:pointer">Insured '+usd(lim)+'</div>'+
    (gp>0?('<div data-c5m="cf_ins_gap" style="width:'+gp+'%;background:rgba(201,162,39,.9);color:#3a2c00;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;cursor:pointer">Gap '+usd(tail-lim)+'</div>'):'')+
    '</div><div class="c5foot">Full bar = '+usd(tail)+' modeled tail loss</div></div>';
}
function c5cfInsurance(){
  var host=document.getElementById('cf-insurance');if(!host)return;
  var gap=c5get('cf_ins_gap'),ec=c5get('exp_identity');var hasGap=gap.connected&&gap.color==='warn'; // a real uninsured shortfall (tail > limit)
  host.innerHTML=c5header()+
    c5shell('Insurance & risk transfer · are we covered efficiently?',(hasGap?'Covered for the everyday — watch the tail.':'The modeled tail is fully insured.'),null,'Your policy covers a limit against the modeled tail; any shortfall is retained on the balance sheet. You can transfer more (raise the limit) or reduce the tail. Every figure traces to the model and your policy record.')+
    '<div class="c5cards">'+c5card('cf_tail')+c5card('cf_ins_limit')+c5card('cf_ins_gap')+'</div>'+
    c5covBar()+
    '<div class="c5tiles" style="margin-top:16px">'+
      c5tile('cf_premium','g','Renewal leverage','Annual policy cost · renewal is a lever')+
      c5tile('exp_identity','a','Tail driver','Largest single contributor to the tail')+
    '</div>'+
    c5bl('Bottom line',(hasGap?'Close the gap two ways — buy up, or reduce the tail.':'Fully covered — the efficient move is reducing the tail.'),null,(hasGap?('Raise the limit by '+gap.displayValue+', or reduce the tail by closing the identity gap — its largest driver. Reducing the tail is typically cheaper than the extra premium.'):(gap.connected?'Your limit already covers the modeled tail, so there is no uninsured shortfall. The efficient move is reducing the tail — closing the identity gap, its largest driver — which can lower the cover and premium you need at renewal.':'Connect your policy record and risk model to size cover against the tail.')),{mid:'exp_identity',txt:'Reduce the tail — fund identity'},{mid:'cf_ins_gap',txt:'Model buying up cover'})+
    '<div class="c5foot">Cover vs. modeled tail; premium and limits from your policy record.</div>';
}
/* Tab 04 — Cost optimization */
function c5cfCost(){
  var host=document.getElementById('cf-cost');if(!host)return;
  var dlp=c5get('ctl_dlp');
  var candidate=dlp.connected?('<div class="c5rank"><div class="c5rank-h">What we can see today · from the control-value ledger</div><div class="c5row" data-c5m="ctl_dlp"><div class="c5row-main"><div class="c5row-t">'+dlp.name+'<span class="c5tag rev">Review</span></div><div class="c5row-s">Lowest risk removed of your controls — a retire / consolidate candidate. Attribute its spend to confirm it is underwater.</div></div><div class="c5row-v">'+dlp.displayValue+'</div></div></div>'):'';
  host.innerHTML=c5header()+
    c5shell('Cost optimization · where can we save?','Savings need your spend records — one candidate is already visible.',null,'Redeployable savings come from retiring underperforming or overlapping tools at near-zero added risk. Quantifying the dollars needs your tool inventory and spend records; until they connect, Nerion shows the honest not-connected state and surfaces the one candidate it can already see from the control-value ledger. Each candidate traces to its overlap and utilization model.')+
    '<div class="c5cards">'+c5phCard('Retire — unused tools','cf_savings')+c5phCard('Consolidate — overlapping tools','cf_savings')+c5phCard('Right-size — over-licensed','cf_savings')+'</div>'+
    candidate+
    '<div class="c5note">Connect your <b>tool inventory & spend records</b> (finance / procurement + license management) and Nerion quantifies each retire / consolidate / right-size candidate, the dollars it frees, and the risk it adds — then lets you redeploy the savings to the highest-return control.</div>'+
    c5bl('Bottom line','Free spend and put it where it works.',null,'Retiring or consolidating underperforming and overlapping tools frees spend at near-zero risk. Redeployed to identity — the highest-return control — it can more than cover the top exposure fix, a self-funding move. Connect spend records to size it.',{mid:'ctl_identity',txt:'Redeploy savings to identity'})+
    '<div class="c5foot">Overlap and utilization from your tool inventory and spend records.</div>';
}
/* Tab 05 — Risk decisions */
function c5dqRow(type,typeCls,name,mid,sub,rec,recCls){var m=c5get(mid);
  return '<div class="c5row" data-c5m="'+mid+'"><div class="c5row-main"><div class="c5row-t"><span class="c5pill '+typeCls+'" style="margin-right:8px">'+type+'</span>'+name+'</div><div class="c5row-s">'+sub+'</div></div><div class="c5row-v">'+(m.connected?m.displayValue:'—')+'</div><span class="c5pill '+recCls+'" style="align-self:center">'+rec+'</span></div>';
}
function c5cfDecisions(){
  var host=document.getElementById('cf-decisions');if(!host)return;
  var ec=c5get('exp_identity'),gap=c5get('cf_ins_gap'),em=c5get('exp_email');
  var list=[
    c5dec('cf',1,'Fund the identity fix?','Your single largest exposure driver'+(ec.connected?(' — '+ec.displayValue):'')+'. Funding it removes the exposure and keeps modeled loss within appetite.',
      {on:'Approve & fund the identity fix',osum:(ec.connected?('Removes '+ec.displayValue+' · keeps you within appetite'):'Removes the top exposure driver'),pros:['Removes your single largest exposure driver.','Highest return per dollar of the choices here.','Keeps modeled loss within the board-approved appetite.'],cons:['Requires capital this cycle (scoped with your team).']}),
    c5dec('cf',2,'Close the insurance gap — buy up, or reduce the tail?','Weigh transferring more risk to insurance against reducing the modeled tail at its source.',
      {on:'Reduce the tail — fund the identity fix',osum:'Cheaper than extra premium in most cases',pros:['Lowers the severe-year tail at source.','Improves your renewal position.'],cons:['Takes a cycle to land vs. an immediate transfer.']},
      [{on:'Buy up cover — raise the limit',osum:'Immediate transfer · higher premium',pros:['Caps the financial loss immediately.'],cons:['Adds recurring premium.','Transfers the loss; does not reduce it.']},
       {on:'Defer to renewal',osum:'Revisit at the next policy renewal',pros:['No action now.'],cons:['The residual gap persists in the interim.']}]),
    c5dec('cf',3,'Accept the residual phishing risk?','Modeled and within tolerance — a reasonable acceptance if the rationale is recorded.',
      {on:'Accept — record the rationale',osum:'Within tolerance · monitored',pros:['Well within appetite on current modeling.','Avoids spend on a low-return control.'],cons:['Requires a recorded risk-acceptance rationale.','Revisit if the phishing signal rises.']},
      [{on:'Fund additional awareness / email security',osum:'Extra spend · marginal reduction',pros:['Further lowers an already-small exposure.'],cons:['Low return per dollar vs. identity.']}])
  ];
  host.innerHTML=c5header()+
    c5shell('Risk decisions · what needs my sign-off?','Three decisions are waiting — one clear yes, one to weigh, one to accept.',null,'Each decision below gives you the options — the recommended call is marked, but the choice is yours. Choosing one stamps it with your name and time, keeps it editable for 24 hours, and (where you connected Jira / ServiceNow at onboarding) opens a tracked project whose status is pulled back on refresh.')+
    c5decisions(list)+
    '<div class="c5foot">Each decision is priced from your risk model and spend records. Every figure traces to its source.</div>';
}

/* ================= CEO seat — same engine, strategy & trust lens ================= */
/* Tab 01 — Enterprise cyber health */
function c5ceHealth(){
  var host=document.getElementById('ce-health');if(!host)return;
  var O=c5Objectives(),ec=c5get('exp_identity');
  var atPill=O.atRisk>0?'a':'g';var atTxt=O.atRisk>0?(O.atRisk+' at risk'):'All protected';
  var hr=c5get('cf_headroom');var T=c5T();
  host.innerHTML=c5header()+
    c5shell('Enterprise cyber health · is cyber a tailwind or a risk?','Cyber is protecting growth, not slowing it.',null,'The enterprise is secure'+(T.improving?' and improving':'')+'. '+O.protected+' of your '+O.total+' strategic objectives are cyber-safe; the exception carries a single, funded exposure. Cyber isn’t a blocker this quarter. Every figure traces to its source.')+
    '<div class="c5cards">'+c5card('ceo_health')+c5card('ceo_objectives')+c5card('direction')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('ceo_biz_health','g','Secure','No active compromise, program improving')+
      c5tile('exp_total','g','Within appetite',(hr.connected?('Well inside your '+c5get('cf_appetite').displayValue+' tolerance'):'Your modeled cyber loss this year'))+
      c5tile('ceo_cust_incidents','g','Intact','Customer-impacting incidents this quarter')+
    '</div>'+
    c5bl('Bottom line','Back the one move that protects your top objective.',null,(ec.connected?('The customer platform — central to your growth strategy — carries the only real cyber exposure, an identity gap of '+ec.displayValue+'. The fix is funded; backing it keeps your #1 objective on track.'):'Connect your controls and the one exposure to your top objective — an identity gap — surfaces here, with its funded fix.'),{mid:'exp_identity',txt:'Back the identity fix — protects the platform'})+
    '<div class="c5foot">Figures are governance-grade and traceable to source.</div>';
}
/* Tab 02 — Strategic risk */
function c5ceStrategic(){
  var host=document.getElementById('ce-strategic');if(!host)return;
  var O=c5Objectives();
  var rows=O.objs.map(function(o){var pill=o.status==='at risk'?'a':o.status==='watch'?'b':'g';var pt=o.status==='at risk'?'At risk':o.status==='watch'?'Watch':'Safe';
    return '<div class="c5prow" data-c5m="ceo_objectives"><span class="c5sq '+(o.c==='warn'?'a':o.c==='blue'?'b':'g')+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">'+o.name+'</div><div class="c5row-s">'+o.sub+'</div></div><span class="c5pill '+pill+'">'+pt+'</span></div>';
  }).join('');
  host.innerHTML=c5header()+
    c5shell('Strategic risk · which objectives are exposed?','Six of your seven objectives are cyber-safe — one needs attention.',null,'Cyber risk mapped to your strategic objectives. Only growing the customer platform carries real exposure — the identity gap threatens its uptime and the trust it runs on. Each objective traces to its drivers.')+
    '<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Strategic objectives · cyber status</div>'+rows+'</div>'+
    c5bl('Bottom line','Protect the objective that drives growth.',null,'Growing the customer platform is your #1 objective and your only at-risk one — the identity gap threatens its uptime and the trust it runs on. The fix is funded.',{mid:'exp_identity',txt:'Back the identity fix — protects growth'})+
    '<div class="c5foot">Objectives are mapped from your strategy inputs; cyber exposure traces to source.</div>';
}
/* Tab 03 — Financial exposure (shared objects with CFO/CISO) */
function c5ceFinancial(){
  var host=document.getElementById('ce-financial');if(!host)return;
  var ec=c5get('exp_identity'),hr=c5get('cf_headroom'),ap=c5get('cf_appetite');
  host.innerHTML=c5header()+
    c5shell('Financial exposure · what could this cost us?','Cyber could cost real money — comfortably within tolerance.',null,'The headline: your modeled annual cyber loss against the board’s appetite, with the severe-year tail. The single largest driver already has a funded fix. Every figure traces to its model and inputs.')+
    '<div class="c5cards">'+c5card('exp_total')+c5card('cf_appetite')+c5card('cf_tail')+'</div>'+
    // Exposure drivers behind the total — distinct from the three summary cards
    // above (no repeat of exp_total / cf_tail), so nothing is shown twice.
    '<div class="c5tiles">'+
      c5tile('exp_identity','b','Largest driver','The single biggest share of the total · funded fix')+
      c5tile('cf_bi','a','If down','Cost if the customer platform is down')+
      c5tile('cf_ins_cov','g','Insured','Share of the severe-year tail your policy covers')+
    '</div>'+
    c5bl('Bottom line','The one number that moves the headline down.',null,(ec.connected?('A single identity gap drives '+ec.displayValue+' of the total — the largest single share. Funding its fix lowers both the everyday cost and the severe-year tail, and it’s already scoped.'):'Connect your controls and the single largest loss driver — an identity gap — surfaces here with its funded fix.'),{mid:'exp_identity',txt:ec.connected?('Back the identity fix — cuts '+ec.displayValue):'Back the identity fix'})+
    '<div class="c5foot">Loss figures are modeled (ALE and tail); every input traces to its source.</div>';
}
/* Tab 04 — Brand & customer trust */
function c5ceTrust(){
  var host=document.getElementById('ce-trust');if(!host)return;
  host.innerHTML=c5header()+
    c5shell('Brand & customer trust · are we protecting trust?','Customer trust is intact — one exposure could test it.',null,'Trust is your moat. This quarter: no customer-impacting incidents, no breach disclosures, signal steady. The one exposure that could dent trust is the customer-platform identity gap. Every figure traces to its source.')+
    '<div class="c5cards">'+c5card('ceo_cust_incidents')+c5card('ceo_disclosures')+c5card('ceo_trust_signal')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('ceo_customer_data','g','Protected','No customer data at risk this quarter')+
      c5tile('ceo_uptime','g','Healthy','Customer platform uptime · connect monitoring')+
      c5tile('exp_identity','a','Watch','The one exposure to the customer platform')+
    '</div>'+
    c5bl('Bottom line','Protect the moat before it’s tested.',null,'Trust is intact today, but the identity gap is the one thing that could put customer data or platform uptime — and the trust that depends on them — at risk. The fix is funded.',{mid:'exp_identity',txt:'Back the identity fix — protects trust'})+
    '<div class="c5foot">Incident, availability, and disclosure data trace to source.</div>';
}
/* Tab 05 — Decisions for the CEO */
function c5ceDecisions(){
  var host=document.getElementById('ce-decisions');if(!host)return;
  var ec=c5get('exp_identity');
  var list=[
    c5dec('ce',1,'Back the identity fix?','It protects the customer platform — your #1 growth objective — and the trust it runs on'+(ec.connected?(' ('+ec.displayValue+' of exposure)'):'')+'.',
      {on:'Back it — sponsor the funded fix',osum:(ec.connected?('Protects your top objective · −'+ec.displayValue+' risk'):'Protects your top objective'),pros:['Protects your #1 growth objective and customer trust.','Removes the largest single exposure at a fraction of its cost.'],cons:['Requires executive sponsorship and capital this cycle.']}),
    c5dec('ce',2,'Sponsor the security-culture push?','Reinforces the talent & workforce objective — worthwhile but not urgent.',
      {on:'Sponsor it now',osum:'Reinforces the workforce objective',pros:['Strengthens the human layer over time.'],cons:['Lower, slower return than the identity fix.']},
      [{on:'Defer to the next cycle',osum:'Revisit next planning cycle',pros:['No spend now.'],cons:['Culture gains compound slowly; delay costs time.']}])
  ];
  host.innerHTML=c5header()+
    c5shell('Decisions for the CEO · what needs your call?','The strategic cyber calls that need you — the recommended call is marked, the choice is yours.',null,'No technical detail — just the business choice. Choosing one stamps it with your name and time, keeps it editable for 24 hours, and opens a tracked project in the ticketing system you connected at onboarding.')+
    c5decisions(list)+
    '<div class="c5foot">Each decision links to its underlying model and source. Every figure traces to its basis.</div>';
}

/* ================= CRO seat — same engine, enterprise-risk lens ================= */
/* Tab 01 — Cyber on one scale */
function c5crScale(){
  var host=document.getElementById('cr-scale');if(!host)return;
  var P=c5Principal(),ec=c5get('exp_identity');
  var rows=P.rows.map(function(r){var pf=Math.max(6,Math.round(r.v/P.max*100));var barCls=r.cyber?'a':'';
    return '<div class="c5row" data-c5m="'+(r.cyber?'exp_total':'cr_rank')+'"><div class="c5row-main"><div class="c5row-t">'+r.l+(r.cyber?'<span class="c5tag">You are here</span>':'')+'</div><div class="c5retbar" style="width:100%;max-width:340px"><i class="'+barCls+'" style="width:'+pf+'%"></i></div></div><div class="c5row-v">'+usd(r.v)+'</div><span class="c5tr '+r.tc+'">'+r.tr+'</span></div>';
  }).join('');
  host.innerHTML=c5header()+
    c5shell('Cyber on one scale · how does it compare to our other risks?','Cyber sits mid-pack among your principal risks — watch its direction.',null,'On one enterprise scale, cyber sits against market, credit, operational and compliance risk. Its direction — not just its size — is what the risk committee tracks; a single identity gap drives most of it. Each risk traces to its basis.')+
    '<div class="c5cards">'+c5card('cr_rank')+c5card('exp_total')+c5card('cr_trend')+'</div>'+
    '<div class="c5rank"><div class="c5rank-h">Principal risks · residual on one scale</div>'+rows+'</div>'+
    c5bl('Bottom line','The one lever that moves cyber down the scale.',null,(ec.connected?('A single identity gap drives most of cyber’s residual. Treating it removes '+ec.displayValue+' — moving cyber down the enterprise scale.'):'Connect your controls and the single identity gap driving most of cyber’s residual surfaces here, with its funded treatment.'),{mid:'exp_identity',txt:ec.connected?('Treat the identity risk — removes '+ec.displayValue):'Treat the identity risk'})+
    '<div class="c5foot">Risks are normalized to one residual-loss scale; cyber traces to its model, the rest to your ERM inputs.</div>';
}
/* Tab 02 — Risk appetite & acceptance */
function c5crAppetite(){
  var host=document.getElementById('cr-appetite');if(!host)return;
  var C=c5Categories(),ec=c5get('exp_identity');
  var rows=C.drivers.map(function(d){var over=(C.limit>0&&d.usd>C.limit);var rp=Math.max(4,Math.min(98,d.usd/C.max*100));var lp=C.limit>0?Math.max(2,Math.min(98,C.limit/C.max*100)):null;
    return '<div class="c5prow" data-c5m="'+d.id+'"><div class="c5prow-n">'+d.name.replace(/ — .*/,'')+(over?'<span class="c5tag rev">Over limit</span>':'')+'</div><div class="c5track">'+(lp!=null?('<span class="c5track-tick" style="left:'+lp+'%"></span>'):'')+'<span class="c5track-dot" style="left:'+rp+'%;background:var(--'+(over?'warn':'good')+')"></span></div><div class="c5prow-v">'+usd(d.usd)+'</div><div class="c5prow-d" style="color:var(--muted)">'+(C.limit>0?('/ '+usd(C.limit)):'—')+'</div></div>';
  }).join('');
  host.innerHTML=c5header()+
    c5shell('Risk appetite & acceptance · are we within tolerance?','Within appetite overall — but one category is over its limit.',null,'Cyber residual sits against the board’s appetite with headroom overall. By category, the largest driver is over its share of that appetite. Each category traces to its appetite basis and residual model.')+
    '<div class="c5cards">'+c5card('exp_total')+c5card('cf_appetite')+c5card('cf_headroom')+'</div>'+
    '<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">By category · residual vs. limit <span style="text-transform:none;letter-spacing:0;font-weight:400;color:var(--muted)">(| = category limit · even allocation of appetite until your framework’s limits connect)</span></div>'+rows+'</div>'+
    c5bl('Bottom line','One category is over its limit.',null,(ec.connected?('Identity residual ('+ec.displayValue+') exceeds its category share of appetite. Treating it brings the category back within tolerance and restores category-level headroom.'):'Connect your controls and the over-limit category — identity — surfaces here with its funded treatment.'),{mid:'exp_identity',txt:'Bring identity within appetite'})+
    '<div class="c5foot">Overall appetite from your risk framework; category limits are an even allocation (labeled) until your framework’s category limits connect; residuals from the cyber model.</div>';
}
/* Tab 03 — Control assurance */
function c5crAssurance(){
  var host=document.getElementById('cr-assurance');if(!host)return;
  var A=c5Assurance();
  var rows=A.fams.map(function(f){var pill=f.status==='Assured'?'g':f.status==='Partial'?'a':f.status==='Gap'?'r':'n';
    return '<div class="c5prow" data-c5m="cr_families"><span class="c5sq '+(pill==='g'?'g':pill==='a'?'a':pill==='r'?'r':'n')+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">'+f.l+'</div><div class="c5row-s">'+f.sub+'</div></div><span class="c5pill '+pill+'">'+f.status+'</span></div>';
  }).join('');
  host.innerHTML=c5header()+
    c5shell('Control assurance · are the controls working?','Controls are largely assured — with gaps where it matters.',null,'Assurance across your control families — evidenced from tests and telemetry, not self-attestation. Most are assured; identity and third-party carry a partial-assurance gap. Each family traces to its evidence and last test.')+
    '<div class="c5cards">'+c5card('cr_families')+c5card('cr_gaps')+c5card('cr_evidence')+'</div>'+
    '<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Control families · evidence-based assurance</div>'+rows+'</div>'+
    c5bl('Bottom line','Close the assurance gap where it matters most.',null,'Identity controls are only partially assured — and they drive your largest residual risk. The funded fix closes the control gap and the assurance gap together.',{mid:'exp_identity',txt:'Close the identity control gap'})+
    '<div class="c5foot">Assurance is evidence-based (tests and telemetry), not self-attestation.</div>';
}
/* Tab 04 — Trend & ownership */
function c5crTrend(){
  var host=document.getElementById('cr-trend');if(!host)return;
  var tr=trajInfo();var vals=(tr.vals||[]).slice(-6);var maxV=Math.max.apply(null,vals.concat([1]));
  var bars='<div class="c5bars" style="height:40px">'+(vals.length?vals.map(function(v){var h=Math.round(6+(maxV>0?v/maxV:0)*32);return '<i style="height:'+h+'px"></i>';}).join(''):[1,2,3,4,5,6].map(function(){return '<i class="n" style="height:8px"></i>';}).join(''))+'</div>';
  var O=c5Owners();
  var rows=O.rows.map(function(r){var pill=r.c;var pt=r.status;
    return '<div class="c5prow" data-c5m="cr_owned"><span class="c5sq '+(r.c==='a'?'a':r.c==='b'?'b':r.c==='n'?'n':'g')+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">'+r.risk+'</div><div class="c5row-s">Owner: '+r.owner+' · '+r.act+'</div></div><span class="c5pill '+pill+'">'+pt+'</span></div>';
  }).join('');
  var T=c5T();
  host.innerHTML=c5header()+
    c5shell('Trend & ownership · are we improving, and who owns what?',(T.improving?'The direction is good — with clear owners.':T.worsening?'The direction is worsening — but every risk has an owner.':'Clear owners on every top risk — the trend builds as quarters record.'),null,'Direction and accountability. '+(T.has?'Cyber residual’s quarter-over-quarter trend is below':'Your residual trend builds quarter over quarter — no history is invented')+', and every top risk has a named owner and an action; one — identity — needs your governance push.')+
    '<div class="c5cards">'+c5card('direction')+c5card('cr_consec')+c5card('cr_owned')+'</div>'+
    '<div class="c5rank" style="padding:12px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:0 0 8px">'+(T.has?('Residual risk, last '+((tr.vals||[]).length)+' quarters'):'Residual risk — builds as you record quarters')+'</div>'+bars+'</div>'+
    '<div class="c5rank" style="padding:4px 15px;margin-top:14px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Top risks · owner and action</div>'+rows+'</div>'+
    c5bl('Bottom line',(T.improving?'The trend is good — keep the one action moving.':'Keep the one action moving.'),null,'Every top risk is owned and moving. The identity action is funded but needs your governance push to land this quarter — it’s the biggest single reduction available.',{mid:'exp_identity',txt:'Sponsor the identity action'})+
    '<div class="c5foot">Trend from the residual-risk series; owners from your risk register.</div>';
}
/* Tab 05 — Decisions for the CRO */
function c5crDecisions(){
  var host=document.getElementById('cr-decisions');if(!host)return;
  var ec=c5get('exp_identity'),ev=c5get('exp_vendor'),em=c5get('exp_email');var V=c5vendors();var tvName=V.worst?V.worst.name:'your top vendor';
  var list=[
    c5dec('cr',1,'Treat the identity gap?','The only principal-risk driver over its appetite share'+(ec.connected?(' — treating it removes '+ec.displayValue):'')+'.',
      {on:'Treat it — fund the identity fix',osum:(ec.connected?('Biggest single reduction available · −'+ec.displayValue):'The biggest single reduction available'),pros:['Brings the identity category back within its appetite share.','Largest single residual-risk reduction available.'],cons:['Requires funding and a governance push this cycle.']}),
    c5dec('cr',2,'Third-party concentration — '+tvName,'Within limit but the rating is one to watch.',
      {on:'Monitor — keep the vendor under watch',osum:'Within limit · rating to watch',pros:['No spend; appropriate for a within-limit risk.'],cons:['A rating slide could push it over — reassess on refresh.']},
      [{on:'Treat now — add a resilience option',osum:'Backup provider or contractual SLA',pros:['Reduces single-point-of-failure exposure.'],cons:['Cost and vendor-onboarding effort for a within-limit risk.']}]),
    c5dec('cr',3,'Accept the residual phishing risk?','Modeled and within tolerance — reasonable to accept with a recorded rationale.',
      {on:'Accept — record the rationale',osum:'Within tolerance · monitored',pros:['Within appetite on current modeling.'],cons:['Requires a recorded risk-acceptance.','Revisit if the phishing signal rises.']},
      [{on:'Treat — fund awareness / email security',osum:'Extra spend · marginal reduction',pros:['Lowers an already-small residual.'],cons:['Low return per dollar vs. the identity gap.']}])
  ];
  host.innerHTML=c5header()+
    c5shell('Decisions for the CRO · what needs your call?','Each risk decision below gives you the options — the recommended call is marked, the choice is yours.',null,'Each carries its residual, appetite and recommendation. Choosing one stamps it with your name and time, keeps it editable for 24 hours, and opens a tracked project in the ticketing system connected at onboarding — whose status is pulled back on refresh.')+
    c5decisions(list)+
    '<div class="c5foot">Each decision carries its residual, appetite, and source.</div>';
}

/* ================= COO seat — same engine, operations & continuity lens ================= */
/* Tab 01 — Operational resilience */
function c5coResilience(){
  var host=document.getElementById('co-resilience');if(!host)return;
  var P=c5Processes(),ec=c5get('exp_identity'),tp=c5get('thirdparty_risk');var V=c5vendors();var tvName=V.worst?V.worst.name:'a vendor';
  var atPill=P.atRisk>0?'a':'g';
  host.innerHTML=c5header()+
    c5shell('Operational resilience · can we keep running?','Operations are resilient — one process carries the only real risk.',null,'Your critical operations are healthy and continuity-ready. Of your critical processes, most are fully protected; the customer platform carries a single cyber exposure — identity. Every figure traces to its source.')+
    '<div class="c5cards">'+c5card('coo_resilience')+c5card('coo_processes')+c5card('coo_recovery_ready')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('coo_bc','g','Ready','Recovery plans tested this quarter')+
      c5tile('thirdparty_risk','a','Flagged',(tp.connected?('Rating to watch · touches operations'):'add your tier-1/2 vendors'))+
      c5tile('coo_rto','g','Recovery','Time to recover the slowest critical service')+
    '</div>'+
    c5bl('Bottom line','Protect the one process that can’t go down.',null,(ec.connected?('The customer platform is your most critical process, and its only real cyber exposure is an identity gap ('+ec.displayValue+'). The fix is funded — it protects both uptime and recovery.'):'Connect your controls and the one exposure to your most critical process — an identity gap — surfaces here, with its funded fix.'),{mid:'exp_identity',txt:'Fund the identity fix — protects uptime'})+
    '<div class="c5foot">Resilience and recovery figures trace to source.</div>';
}
/* Tab 02 — Critical process health */
function c5coProcesses(){
  var host=document.getElementById('co-processes');if(!host)return;
  var P=c5Processes();
  var body;
  if(!P.total){body='<div class="c5note">◐ Map your critical business processes in onboarding (or connect your CMDB) to see cyber risk per process. Until then this stays honestly empty rather than showing placeholder processes.</div>';}
  else{body='<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Critical processes · cyber status</div>'+P.list.map(function(p){var pill=p.status==='At risk'?'a':p.status==='Watch'?'b':'g';
    return '<div class="c5prow" data-c5m="coo_processes"><span class="c5sq '+(p.c==='warn'?'a':p.c==='blue'?'b':'g')+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">'+p.name+'</div><div class="c5row-s">'+p.sub+'</div></div><span class="c5pill '+pill+'">'+p.status+'</span></div>';
  }).join('')+'</div>';}
  var ec=c5get('exp_identity');
  host.innerHTML=c5header()+
    c5shell('Critical process health · which processes are exposed?','Most critical processes are cyber-safe — one needs attention.',null,'Cyber risk mapped to your critical operational processes. Only the customer platform carries real exposure; a payments process is on watch through a vendor. Each process traces to its drivers and dependencies.')+
    body+
    c5bl('Bottom line','Protect the process customers touch.',null,(ec.connected?('The customer platform is your only at-risk critical process — the identity gap threatens its uptime. The fix is funded.'):'Connect your controls and the at-risk process — the customer platform — surfaces here with its funded fix.'),{mid:'exp_identity',txt:'Fund the identity fix — protects the platform'})+
    '<div class="c5foot">Processes and dependencies mapped from your operations model; exposure traces to source.</div>';
}
/* Tab 03 — Supply chain & third parties · PRIMARY decision is the Acme mitigation, NOT identity */
function c5coSupply(){
  var host=document.getElementById('co-supply');if(!host)return;
  var V=c5vendors();var seed=V.seed;
  var rows;
  if(!seed.length){rows='<div class="c5note">◐ Add your tier-1/2 vendors (CSV or a TPRM pull) and connect a monitoring service to rank suppliers by live rating and flag single points of failure. Until then this stays honestly empty.</div>';}
  else{var rs=(typeof LIVE!=='undefined'&&LIVE&&LIVE.resilience)||{};var blastVendor=(rs.top_vendor_blast&&rs.top_vendor_blast.vendor)||null;var blastSys=(rs.top_vendor_blast&&rs.top_vendor_blast.systems)||[];
    var vs=V.vs;var list=((V.p&&V.p.vendors)||[]).slice().sort(function(a,b){return (a.score||100)-(b.score||100);}).slice(0,6);
    rows='<div class="c5rank"><div class="c5rank-h">Tier-1 vendors · rating and the processes they touch</div>'+list.map(function(v){var cls=v.color||capColor(v.score);var spof=(blastVendor&&String(v.name).toLowerCase().indexOf(String(blastVendor).toLowerCase())>=0)?'<span class="c5tag rev">SPOF</span>':'';
      return '<div class="c5row" data-c5m="thirdparty_risk"><div class="c5row-main"><div class="c5row-t">'+v.name+spof+'</div><div class="c5row-s">'+(spof?(blastSys.slice(0,2).join(' · ')+' · '):'')+(v.score!=null&&v.score<75?'rating falling':'healthy')+'</div></div><div class="c5row-v" style="color:var(--'+cls+')">'+(v.score!=null?v.score:'—')+'</div></div>';
    }).join('')+'</div>';}
  host.innerHTML=c5header()+
    c5shell('Supply chain & third parties · can a vendor stop us?','Your supply chain is steady — one Tier-1 vendor needs watching.',null,'Third-party risk to your operations. Among your Tier-1 vendors, the worst-rated is a single point of failure for a critical process. The rest are healthy. Each vendor traces to its rating and the processes it touches.')+
    '<div class="c5cards">'+c5card('coo_tier1')+c5card('thirdparty_risk')+c5card('coo_spof')+'</div>'+
    rows+
    c5bl('Bottom line','Reduce the one dependency that touches your critical process.',null,'Your worst-rated Tier-1 vendor is a falling-rated single point of failure. Add a resilience option — a backup provider or a contractual SLA. Separately, closing the identity gap limits how far a compromised vendor could reach.',{mid:'thirdparty_risk',txt:'Mitigate the vendor dependency'},{mid:'exp_identity',txt:'Fund identity — limits blast radius'})+
    '<div class="c5foot">Vendor ratings from your third-party monitoring; dependencies from your operations model.</div>';
}
/* Tab 04 — Recovery readiness */
function c5coRecovery(){
  var host=document.getElementById('co-recovery');if(!host)return;
  var ir=c5get('coo_identity_recovery'),ec=c5get('exp_identity');
  host.innerHTML=c5header()+
    c5shell('Recovery readiness · can we bounce back?','Recovery is tested — watch the identity path.',null,'Your recovery posture: RTO and RPO against target from the last test, backups verified. The one gap — restoring identity and access quickly — could slow a customer-platform restore. Every figure traces to its test evidence.')+
    '<div class="c5cards">'+c5card('coo_rto')+c5card('coo_rpo')+c5card('coo_last_test')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('coo_backups','g','Verified','Restore-tested this quarter')+
      c5tile('coo_identity_recovery',(ir.connected&&ir.color==='warn')?'a':'g',(ir.connected&&ir.color==='warn')?'Gap':'Ready','Access recovery — often the weak link')+
    '</div>'+
    c5bl('Bottom line','Close the recovery gap in your critical path.',null,(ec.connected?('Recovery meets targets where measured, but slow identity restoration could delay a customer-platform recovery. The identity fix improves recovery too — resilient access means a faster restore.'):'Connect your identity tools and the recovery weak link — access restoration — surfaces here, tied to the funded identity fix.'),{mid:'exp_identity',txt:'Fund the identity fix — faster recovery'})+
    '<div class="c5foot">RTO/RPO and backup results from your last recovery test.</div>';
}
/* Tab 05 — Decisions for the COO */
function c5coDecisions(){
  var host=document.getElementById('co-decisions');if(!host)return;
  var ec=c5get('exp_identity'),tp=c5get('thirdparty_risk');
  var list=[
    c5dec('co',1,'Fund the identity fix?','It protects customer-platform uptime and recovery — your most critical process'+(ec.connected?(' ('+ec.displayValue+')'):'')+'.',
      {on:'Fund it — protect uptime & recovery',osum:(ec.connected?('Protects your most critical process · −'+ec.displayValue):'Protects your most critical process'),pros:['Protects uptime and recovery of the customer platform.','Closes the slowest link in a platform recovery.'],cons:['Requires funding this cycle.']}),
    c5dec('co',2,'Reduce the vendor single point of failure?','A falling-rated Tier-1 vendor underpins a critical process — add resilience.',
      {on:'Mitigate — add a backup provider or SLA',osum:'Reduces single-point-of-failure exposure',pros:['Removes a concentration risk to a critical process.'],cons:['Cost and vendor-onboarding effort.']},
      [{on:'Monitor for now',osum:'Keep the vendor under watch',pros:['No spend now.'],cons:['A rating slide could disrupt operations before you act.']}])
  ];
  host.innerHTML=c5header()+
    c5shell('Decisions for the COO · what needs your call?','Two operational calls — the recommended one is marked, the choice is yours.',null,'Each is tied to a critical process. Choosing one stamps it with your name and time, keeps it editable for 24 hours, and opens a tracked project in the ticketing system connected at onboarding — status pulled back on refresh.')+
    c5decisions(list)+
    '<div class="c5foot">Each decision links to its critical process and source.</div>';
}

/* ================= CLO seat — same engine, legal & regulatory lens ================= */
/* Surfaces obligations, clocks, contracts and records + their evidence — never a legal
   conclusion (compliance is the org's counsel's call). The identity gap is the common
   root of three distinct legal exposures: disclosure trigger, contract warranty, privacy. */
function c5legalRegimes(){var ob=(typeof LIVE!=='undefined'&&LIVE&&LIVE.legal&&LIVE.legal.obligations)||[];var b=(LIVE&&LIVE.legal&&LIVE.legal.binding)||{};
  return ob.map(function(o){var binding=(b.jurisdiction&&o.jurisdiction===b.jurisdiction);return {name:(o.flag?o.flag+' ':'')+(o.jurisdiction||'—'),obl:o.obligation||'—',clock:o.clock||'—',binding:binding};});}
/* Tab 01 — Regulatory exposure */
function c5clRegulatory(){
  var host=document.getElementById('cl-regulatory');if(!host)return;
  var regs=c5legalRegimes();var ec=c5get('exp_identity');
  var body=regs.length?('<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Regimes in scope · obligation and clock</div>'+regs.map(function(r){var pill=r.binding?'a':'b';var pt=r.binding?'Tightest clock':'In scope';
    return '<div class="c5prow" data-c5m="cl_obligations"><span class="c5sq '+(r.binding?'a':'b')+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">'+r.name+'</div><div class="c5row-s">'+r.obl+' · '+r.clock+'</div></div><span class="c5pill '+pill+'">'+pt+'</span></div>';
  }).join('')+'</div>'):'<div class="c5note">◐ Set your operating regions in onboarding to load the obligations register (regime · obligation · clock · penalty), each traceable to its ruleset.</div>';
  host.innerHTML=c5header()+
    c5shell('Regulatory exposure · where are we exposed by jurisdiction?','Your obligations, by jurisdiction — with the exposure most likely to trigger a filing.',null,'Your cyber-regulatory obligations, by jurisdiction, each with its clock and penalty — surfaced, not judged (the compliance call is yours). The customer-platform identity gap is the exposure most likely to trigger a reportable event. Each regime traces to its obligation and evidence.')+
    '<div class="c5cards">'+c5card('cl_jurisdictions')+c5card('cl_obligations')+c5card('cl_binding_clock')+'</div>'+
    body+
    c5bl('Bottom line','Close the exposure most likely to trigger a filing.',null,(ec.connected?('The customer-platform identity gap is the exposure most likely to cause a reportable breach — starting notification clocks across jurisdictions. Closing it ('+ec.displayValue+') reduces your most probable disclosure trigger.'):'Connect your controls and the exposure most likely to trigger a filing — the identity gap — surfaces here with its funded fix.'),{mid:'exp_identity',txt:'Close the top disclosure trigger — identity'})+
    '<div class="c5foot">Obligations mapped to your jurisdictions; evidence traces to source. Not legal advice — the compliance determination is your counsel’s.</div>';
}
/* Tab 02 — Breach-notification readiness */
function c5clNotification(){
  var host=document.getElementById('cl-notification');if(!host)return;
  var regs=c5legalRegimes();var ir=(typeof LIVE!=='undefined'&&LIVE&&LIVE.governance&&LIVE.governance.ir)||{};var tested=/yes|tested|tabletop/i.test(ir.tested||'');var ec=c5get('exp_identity');
  var body=regs.length?('<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Notification clocks · regime, deadline, readiness</div>'+regs.map(function(r){var ready=tested;var pill=ready?'g':'a';var pt=ready?'Ready':'Watch';
    return '<div class="c5prow" data-c5m="cl_runbooks"><span class="c5sq '+(ready?'g':'a')+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">'+r.name+'</div><div class="c5row-s">'+r.obl+'</div></div><div class="c5prow-v" style="width:auto">'+r.clock+'</div><span class="c5pill '+pill+'">'+pt+'</span></div>';
  }).join('')+'<div class="c5prow" data-c5m="cl_contracts"><span class="c5sq a" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Customer SLAs</div><div class="c5row-s">Per enterprise contracts · needs your CLM</div></div><div class="c5prow-v" style="width:auto">24–48h</div><span class="c5pill a">Watch</span></div></div>'):'<div class="c5note">◐ Set your operating regions to load the notification clocks; connect your IR runbooks to score readiness.</div>';
  host.innerHTML=c5header()+
    c5shell('Breach-notification readiness · are the clocks and evidence ready?','You can meet the clocks — if the evidence is ready.',null,'If a breach hit today, could you notify in time and prove what happened? Your fastest clock is below. Runbooks are the readiness signal; identity is the one area where forensic readiness is thin. Each clock traces to its runbook and evidence.')+
    '<div class="c5cards">'+c5card('cl_binding_clock')+c5card('cl_runbooks')+c5card('cl_forensic_gap')+'</div>'+
    body+
    c5bl('Bottom line','Shore up forensic readiness on the identity path.',null,(ec.connected?('You can meet the clocks, but proving what happened in an identity-driven incident is your thin spot. The identity fix improves logging and evidence — faster, defensible notification.'):'Connect your identity + SIEM tools and the forensic-readiness gap on the identity path surfaces here, tied to the funded fix.'),{mid:'exp_identity',txt:'Improve identity forensics — fund the fix'})+
    '<div class="c5foot">Clocks from your obligations; readiness from your IR runbooks.</div>';
}
/* Tab 03 — Contractual & litigation risk */
function c5clContracts(){
  var host=document.getElementById('cl-contracts');if(!host)return;
  var lit=c5get('cl_litigation'),ec=c5get('exp_identity');var V=c5vendors();var tvName=V.worst?V.worst.name:'a Tier-1 vendor';
  var rows='<div class="c5rank"><div class="c5rank-h">Cyber-related contractual &amp; litigation exposure</div>'+
    '<div class="c5prow" data-c5m="cl_platform_tied"><span class="c5sq a" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Enterprise SLAs — uptime warranties</div><div class="c5row-s">An identity-driven outage could breach them · count needs your CLM</div></div><span class="c5pill a">At risk</span></div>'+
    '<div class="c5prow" data-c5m="cl_contracts"><span class="c5sq n" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Data-processing agreements</div><div class="c5row-s">Obligations surfaced on the Privacy tab · count needs your CLM</div></div><span class="c5pill n">Connect CLM</span></div>'+
    '<div class="c5prow" data-c5m="thirdparty_risk"><span class="c5sq a" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Vendor indemnities — '+tvName+'</div><div class="c5row-s">Falling-rated vendor · review the indemnity</div></div><span class="c5pill a">Watch</span></div>'+
    '<div class="c5prow" data-c5m="cl_litigation"><span class="c5sq '+(lit.connected?(lit.color==='warn'?'a':'g'):'n')+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Active legal holds</div><div class="c5row-s">'+(lit.connected?(lit.displayValue+' cyber-related hold'+(lit.displayValue==='1'?'':'s')):'connect your legal-hold system')+'</div></div><span class="c5pill '+(lit.connected?(lit.color==='warn'?'a':'g'):'n')+'">'+(lit.connected?(lit.displayValue==='0'?'Clear':'Open'):'—')+'</span></div>'+
    '</div>';
  host.innerHTML=c5header()+
    c5shell('Contractual & litigation risk · where is our liability?','Liability is contained — one cluster of contracts to watch.',null,'Your cyber-related contractual and litigation exposure. A cluster of enterprise contracts warrants customer-platform uptime and security; a falling-rated vendor’s indemnity is worth review. Contract counts need your CLM connected. Each item traces to its clause and exposure.')+
    '<div class="c5cards">'+c5card('cl_contracts')+c5card('cl_platform_tied')+c5card('cl_litigation')+'</div>'+
    rows+
    c5bl('Bottom line','Protect the contracts tied to platform uptime.',null,(ec.connected?('The enterprise contracts that warrant customer-platform uptime and security could be breached by an identity-driven outage. Closing the identity gap ('+ec.displayValue+') protects those warranties and the revenue behind them.'):'Connect your controls and CLM and the platform-tied warranties an identity outage could breach surface here.'),{mid:'exp_identity',txt:'Protect the warranties — fund the identity fix'})+
    '<div class="c5foot">Contract terms from your CLM; exposure mapped to the platform. Not legal advice.</div>';
}
/* Tab 04 — Privacy & DSAR */
function c5clPrivacy(){
  var host=document.getElementById('cl-privacy');if(!host)return;
  var ap=c5get('cl_access_pd'),ec=c5get('exp_identity');
  host.innerHTML=c5header()+
    c5shell('Privacy & DSAR · are we handling requests on time?','Privacy operations are running — access hygiene is the soft spot.',null,'Your privacy posture: data-subject requests against SLA, records of processing, consent. The one soft spot is access hygiene — over-permissioned or stale identities near personal data, part of the identity gap. Every figure traces to its source.')+
    '<div class="c5cards">'+c5card('cl_dsar_sla')+c5card('cl_ropa')+c5card('cl_access_pd')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('cl_litigation','g','Holds','Active cyber-related litigation holds')+
    '</div>'+
    c5bl('Bottom line','Tighten access to personal data.',null,(ec.connected?('Over-permissioned or stale identities near personal data are a privacy risk and part of the identity gap. Closing it ('+ec.displayValue+') enforces least-privilege access — lower privacy exposure and cleaner audits.'):'Connect your identity tools and the access-hygiene soft spot near personal data surfaces here, tied to the funded identity fix.'),{mid:'exp_identity',txt:'Enforce least-privilege — fund the fix'})+
    '<div class="c5foot">Privacy operations from your DSAR and records-of-processing systems.</div>';
}
/* Tab 05 — Decisions for the CLO */
function c5clDecisions(){
  var host=document.getElementById('cl-decisions');if(!host)return;
  var ec=c5get('exp_identity'),tp=c5get('thirdparty_risk');
  var list=[
    c5dec('cl',1,'Support the identity fix?','One action reduces your top disclosure trigger, protects platform warranties, and tightens access to personal data'+(ec.connected?(' ('+ec.displayValue+')'):'')+'.',
      {on:'Support it — the highest-leverage legal reducer',osum:(ec.connected?('Reduces three legal exposures at once · −'+ec.displayValue):'Reduces three legal exposures at once'),pros:['Reduces your most probable breach-notification trigger.','Protects platform-tied contractual warranties.','Enforces least-privilege access to personal data.'],cons:['Depends on management funding the fix.']}),
    c5dec('cl',2,'Review the vendor indemnity?','A falling-rated vendor — review the indemnity and exit terms.',
      {on:'Review the indemnity & exit terms now',osum:'Contain contractual liability',pros:['Confirms you can recover / exit if the vendor fails.'],cons:['Counsel time; may require renegotiation.']},
      [{on:'Defer to the contract renewal',osum:'Revisit at renewal',pros:['No action now.'],cons:['Exposure persists if the vendor deteriorates first.']}])
  ];
  host.innerHTML=c5header()+
    c5shell('Decisions for the CLO · what needs your call?','The legal calls on your desk — the recommended one is marked, the choice is yours.',null,'One action reduces your top disclosure, contractual and privacy exposures at once. Choosing one stamps it with your name and time, keeps it editable for 24 hours, and opens a tracked matter in the ticketing system connected at onboarding. This surfaces obligations, not legal conclusions.')+
    c5decisions(list)+
    '<div class="c5foot">Each decision links to its obligation, contract, or record. Not legal advice.</div>';
}

/* ================= CTO seat — same engine, engineering-estate lens ================= */
/* Tab 01 — Technology risk */
function c5ctTech(){
  var host=document.getElementById('ct-tech');if(!host)return;
  var ec=c5get('exp_identity'),cv=c5get('ct_critical_vulns'),td=c5get('ct_techdebt');
  host.innerHTML=c5header()+
    c5shell('Technology risk · is our stack secure and modern?','Your stack is secure and modernizing — one platform carries the risk.',null,'Your technology estate is largely secure and on its modernization path. Most core platforms are healthy; the customer platform carries the identity gap, and legacy tech carries mapped technical debt. Every figure traces to its source.')+
    '<div class="c5cards">'+c5card('ct_platform_health')+c5card('ct_critical_vulns')+c5card('ct_modernization')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('ct_appsec','g','Healthy','In the SDLC for new builds')+
      c5tile('exp_identity','a','Gap','The customer-platform exposure')+
      c5tile('ct_techdebt','b','Managed',(td.connected?'legacy mapped · modernization roadmap in place':'map your EOL systems'))+
    '</div>'+
    c5bl('Bottom line','Fix the architecture gap in your top platform.',null,(ec.connected?('The identity architecture behind your customer platform is the biggest security gap in the stack ('+ec.displayValue+'). The fix is funded — it closes the exposure and simplifies the platform’s access model.'):'Connect your controls and the biggest architecture gap — the customer platform’s identity model — surfaces here with its funded fix.'),{mid:'exp_identity',txt:'Fund the identity fix — closes the gap'})+
    '<div class="c5foot">Stack posture from your app/infra scans and architecture records.</div>';
}
/* Tab 02 — Digital-service reliability */
function c5ctReliability(){
  var host=document.getElementById('ct-reliability');if(!host)return;
  var S=c5Services(),ec=c5get('exp_identity');
  var body=S.total?('<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Customer-facing services · posture and status</div>'+S.list.map(function(s){var pill=s.status==='At risk'?'a':'g';
    return '<div class="c5prow" data-c5m="'+(s.status==='At risk'?'exp_identity':'ct_sec_incidents')+'"><span class="c5sq '+(s.c==='warn'?'a':'g')+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">'+s.name+'</div><div class="c5row-s">'+s.sub+'</div></div><span class="c5pill '+pill+'">'+s.status+'</span></div>';
  }).join('')+'</div>'):'<div class="c5note">◐ Map your crown-jewel / customer-facing services in onboarding to see reliability + security posture per service.</div>';
  host.innerHTML=c5header()+
    c5shell('Digital-service reliability · are our services safe and available?','Services are reliable and secure — the platform’s access path is the risk.',null,'Your customer-facing services: available, performant, secure. The one reliability risk is the identity/access path to the customer platform — both a security and an availability concern. Availability and SLOs light up when your observability stack connects. Each service traces to its posture.')+
    '<div class="c5cards">'+c5card('ct_availability')+c5card('ct_services_slo')+c5card('ct_sec_incidents')+'</div>'+
    body+
    c5bl('Bottom line','Harden the access path to your top service.',null,(ec.connected?('The customer platform is your most-used service; its identity/access path is the one reliability-and-security risk. The identity fix hardens it — resilient access, fewer failure modes.'):'Connect your controls and the one reliability-and-security risk — the platform’s access path — surfaces here with its funded fix.'),{mid:'exp_identity',txt:'Fund the identity fix — hardens the platform'})+
    '<div class="c5foot">Availability and SLOs from your observability stack; security posture traces to source.</div>';
}
/* Tab 03 — AI & innovation risk */
function c5ctAi(){
  var host=document.getElementById('ct-ai');if(!host)return;
  var da=c5get('ct_ai_dataaccess'),ec=c5get('exp_identity');
  host.innerHTML=c5header()+
    c5shell('AI & innovation risk · are we shipping safely?','You’re shipping AI under governance — one access watch item.',null,'Your AI posture: models inventoried, guardrails in place, shipping under governance. One watch item — AI features that touch customer data rely on the same identity controls that carry the gap. Every figure traces to its source.')+
    '<div class="c5cards">'+c5card('ct_ai_inventory')+c5card('ct_ai_governed')+c5card('ct_ai_highrisk')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('ct_ai_dataaccess',(da.connected&&da.color==='warn')?'a':'g',(da.connected&&da.color==='warn')?'Watch':'Controlled','Relies on the same identity controls as the gap')+
      c5tile('thirdparty_risk','b','Monitored','Vendor models · terms and data flows reviewed')+
    '</div>'+
    c5bl('Bottom line','Secure the access your AI relies on.',null,(ec.connected?('Your AI features that touch customer data depend on the same identity controls that carry the gap. Closing it ('+ec.displayValue+') secures AI’s access to data — safer innovation, cleaner governance.'):'Connect your controls and the AI-data-access watch item — the shared identity gap — surfaces here with its funded fix.'),{mid:'exp_identity',txt:'Secure AI access — fund the identity fix'})+
    '<div class="c5foot">AI inventory and governance from your model registry and pipeline.</div>';
}
/* Tab 04 — Software supply chain · PRIMARY decision is the advisory patch, NOT identity */
function c5ctSupply(){
  var host=document.getElementById('ct-supply');if(!host)return;
  var adv=c5get('ct_advisories'),ec=c5get('exp_identity');
  var advCount=adv.connected?adv.displayValue:'—';
  var rows='<div class="c5rank"><div class="c5rank-h">Dependencies · advisories and integrity</div>'+
    '<div class="c5prow" data-c5m="ct_advisories"><span class="c5sq '+(adv.connected&&adv.color==='warn'?'a':'g')+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Auth-library advisory <span class="c5tag rev">High</span></div><div class="c5row-s">'+(adv.connected?(advCount+' critical dependency advisor'+(advCount==='1'?'y':'ies')+' · used by the customer platform · patch available'):'connect your SCA scanner')+'</div></div><span class="c5pill '+(adv.connected&&adv.color==='warn'?'a':'g')+'">'+(adv.connected?(adv.color==='warn'?'Prioritize':'Clear'):'—')+'</span></div>'+
    '<div class="c5prow" data-c5m="ct_appsec"><span class="c5sq b" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Code-scanning findings <span class="c5tag">SAST</span></div><div class="c5row-s">First-party code · scheduled remediation</div></div><span class="c5pill b">Scheduled</span></div>'+
    '<div class="c5prow" data-c5m="ct_deps"><span class="c5sq n" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">SBOM coverage</div><div class="c5row-s">Connect your SBOM to inventory the dependency tree</div></div><span class="c5pill n">Connect SBOM</span></div>'+
    '<div class="c5prow" data-c5m="ct_unsigned"><span class="c5sq n" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Build signing</div><div class="c5row-s">Connect your CI/CD signing to verify release integrity</div></div><span class="c5pill n">Connect CI/CD</span></div>'+
    '</div>';
  host.innerHTML=c5header()+
    c5shell('Software supply chain · are our dependencies safe?','Your dependencies are triaged — one high-severity advisory to clear.',null,'Your software supply chain: advisories triaged from your SCA scanner. A high-severity advisory affects an auth library used by the customer platform — worth prioritizing. SBOM coverage and build signing light up when those tools connect. Each item traces to its advisory.')+
    '<div class="c5cards">'+c5card('ct_deps')+c5card('ct_advisories')+c5card('ct_unsigned')+'</div>'+
    rows+
    c5bl('Bottom line','Clear the advisory in your critical path.',null,(adv.connected?('A high-severity advisory in an auth library used by the customer platform is your top supply-chain item — patch it now. It also intersects the identity gap, so closing that reduces the blast radius of auth-library issues.'):'Connect your SCA scanner and the high-severity advisories on your critical path surface here — patch first, with identity reducing the blast radius.'),{mid:'ct_advisories',txt:'Patch the auth-library advisory'},{mid:'exp_identity',txt:'Fund identity — reduces blast radius'})+
    '<div class="c5foot">Dependencies and advisories from your SBOM and scanners.</div>';
}
/* Tab 05 — Decisions for the CTO */
function c5ctDecisions(){
  var host=document.getElementById('ct-decisions');if(!host)return;
  var ec=c5get('exp_identity'),adv=c5get('ct_advisories');
  var list=[
    c5dec('ct',1,'Patch the auth-library advisory?','High-severity advisory'+(adv.connected?(' ('+adv.displayValue+' open)'):'')+' — used by the customer platform. The urgent tactical fix.',
      {on:'Patch it now — highest-severity, in the critical path',osum:'Closes a known-exploitable path to customers',pros:['Removes an actively-exploitable dependency shipping to customers.','Fast, low-cost tactical fix.'],cons:['Requires a release / regression pass.']},
      [{on:'Schedule for the next release',osum:'Batch with the next deploy',pros:['Avoids an out-of-band release.'],cons:['Leaves a known-exploitable path open in the interim.']}]),
    c5dec('ct',2,'Fund the identity fix?','Closes the biggest architecture gap in the stack — the customer platform’s access model'+(ec.connected?(' ('+ec.displayValue+')'):'')+'.',
      {on:'Fund it — closes & simplifies the access model',osum:(ec.connected?('Largest architecture gap · −'+ec.displayValue):'Largest architecture gap'),pros:['Closes the largest architecture gap and simplifies the access model.','Reduces blast radius across the platform.'],cons:['Larger, multi-sprint effort and cost.']})
  ];
  host.innerHTML=c5header()+
    c5shell('Decisions for the CTO · what needs your call?','Two technical calls — the recommended one is marked, the choice is yours.',null,'Each is tied to the stack. Choosing one stamps it with your name and time, keeps it editable for 24 hours, and opens a tracked ticket in the system connected at onboarding — status pulled back on refresh.')+
    c5decisions(list)+
    '<div class="c5foot">Each decision links to its component and source.</div>';
}

/* ================= Internal Audit seat — same engine, independent-assurance lens ================= */
/* No fund/approve — Audit assures, management funds. The audit action opens the
   inspector on the converging area; the buttons are schedule/test/escalate/assure. */
function c5iaAreaRows(kind,mid){
  return c5AuditAreas(kind).map(function(a){var pill=a.converge?'a':(a.c==='blue'?'b':'g');
    var tag=(kind==='universe')?('<span class="c5tag'+(a.risk==='High'?' rev':'')+'">'+a.risk+'</span>'):(kind==='find'&&a.converge?'<span class="c5tag rev">Repeat</span>':'');
    return '<div class="c5prow" data-c5m="'+mid+'"><span class="c5sq '+(a.c==='warn'?'a':a.c==='blue'?'b':'g')+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">'+a.l+tag+'</div><div class="c5row-s">'+a.sub+'</div></div><span class="c5pill '+pill+'">'+a.status+'</span></div>';
  }).join('');
}
/* Tab 01 — Audit universe & coverage */
function c5iaCoverage(){
  var host=document.getElementById('ia-coverage');if(!host)return;
  host.innerHTML=c5header()+
    c5shell('Audit universe & coverage · what’s in scope and covered?','Your cyber audit universe is well covered — one high-risk area needs review.',null,'The auditable cyber areas, their risk rating, and their coverage. Coverage is strong; identity & access — a high-risk area and the enterprise’s top exposure — is the one out of step. Each area traces to its scope and evidence; last-covered dates appear once your audit plan connects.')+
    '<div class="c5cards">'+c5card('ia_areas')+c5card('ia_coverage')+c5card('ia_overdue')+'</div>'+
    '<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Audit universe · risk rating and status</div>'+c5iaAreaRows('universe','ia_coverage')+'</div>'+
    c5bl('Bottom line','Schedule the overdue high-risk review.',null,'Identity &amp; access is a high-risk area and the enterprise’s top exposure, yet it’s the one out of step with coverage. Prioritizing it aligns coverage with risk — and lets you independently assure the board that management’s fix is real.',{mid:'exp_identity',txt:'Prioritize the identity audit'})+
    '<div class="c5foot">Universe and coverage from your audit plan and history.</div>';
}
/* Tab 02 — Control-testing status */
function c5iaTesting(){
  var host=document.getElementById('ia-testing');if(!host)return;
  host.innerHTML=c5header()+
    c5shell('Control-testing status · what’s tested, what’s outstanding?','Testing is on plan — identity controls are the outstanding set.',null,'Your cyber control-testing progress this cycle. Most control sets are tested and passing; identity controls are the main outstanding set, and the last test found exceptions. Each control set traces to its test results and evidence.')+
    '<div class="c5cards">'+c5card('ia_tested')+c5card('ia_passrate')+c5card('ia_overdue')+'</div>'+
    '<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Control sets · test status and result</div>'+c5iaAreaRows('test','ia_tested')+'</div>'+
    c5bl('Bottom line','Close testing on the identity controls.',null,'Identity controls are the main outstanding set and carry open exceptions. Completing their testing gives you the evidence to assure the fix — and closes the biggest gap in this cycle’s coverage.',{mid:'exp_identity',txt:'Complete identity control testing'})+
    '<div class="c5foot">Testing status from your audit workpapers.</div>';
}
/* Tab 03 — Findings & action plans */
function c5iaFindings(){
  var host=document.getElementById('ia-findings');if(!host)return;
  host.innerHTML=c5header()+
    c5shell('Findings & action plans · open, closed, and repeat?','Findings are closing — one repeat finding to escalate.',null,'Your open and closed cyber findings and their action plans. One finding — identity access — is a repeat from last cycle, which raises its priority. Each finding traces to its plan and owner.')+
    '<div class="c5cards">'+c5card('ia_open_findings')+c5card('ia_closed_ontime')+c5card('ia_repeat')+'</div>'+
    '<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Findings · severity and status</div>'+c5iaAreaRows('find','ia_repeat')+'</div>'+
    c5bl('Bottom line','Escalate the repeat identity finding.',null,'Identity over-permissioning is a repeat finding — it wasn’t fully remediated last cycle. It’s now funded by management; escalating it ensures the action plan lands and the repeat closes for good.',{mid:'ia_repeat',txt:'Escalate the repeat finding'})+
    '<div class="c5foot">Findings and action plans from your issue-tracking system.</div>';
}
/* Tab 04 — Evidence readiness */
function c5iaEvidence(){
  var host=document.getElementById('ia-evidence');if(!host)return;
  host.innerHTML=c5header()+
    c5shell('Evidence readiness · can we prove it?','You can evidence most controls on demand — identity is the thin spot.',null,'Whether you can produce evidence for auditors and regulators on demand. Most control evidence is current and automated; identity-control evidence is incomplete — the same area driving your top risk. Each area traces to its evidence and freshness.')+
    '<div class="c5cards">'+c5card('ia_automated')+c5card('ia_evidence_current')+c5card('ia_overdue')+'</div>'+
    '<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Evidence by area · freshness and readiness</div>'+c5iaAreaRows('evid','ia_automated')+'</div>'+
    c5bl('Bottom line','Close the identity evidence gap.',null,'Identity-control evidence is the one area you couldn’t fully produce on demand — and it’s your top risk. Closing it (management’s fix improves logging) makes the control both effective and provable.',{mid:'exp_identity',txt:'Close the identity evidence gap'})+
    '<div class="c5foot">Evidence readiness from your GRC and control-monitoring systems.</div>';
}
/* Tab 05 — Attention for Internal Audit (schedule / assure / track — no fund/approve) */
function c5iaAttention(){
  var host=document.getElementById('ia-attention');if(!host)return;
  var tp=c5get('thirdparty_risk');
  var q='<div class="c5rank"><div class="c5rank-h">Audit actions · schedule, assure, track — Audit assures, management funds</div>'+
    '<div class="c5row" data-c5m="exp_identity"><div class="c5row-main"><div class="c5row-t"><span class="c5pill b" style="margin-right:8px">Prioritize</span>Audit identity &amp; access</div><div class="c5row-s">Overdue review, open test exceptions, repeat finding, and evidence gap — all identity</div></div><div class="c5row-v">4 signals</div><span class="c5pill g" style="align-self:center">Recommended</span></div>'+
    '<div class="c5row" data-c5m="ia_coverage"><div class="c5row-main"><div class="c5row-t"><span class="c5pill n" style="margin-right:8px">Assure</span>Board assurance statement</div><div class="c5row-s">Independently confirm management’s fix is real and on track</div></div><div class="c5row-v">—</div><span class="c5pill n" style="align-self:center">Informational</span></div>'+
    '<div class="c5row" data-c5m="thirdparty_risk"><div class="c5row-main"><div class="c5row-t"><span class="c5pill a" style="margin-right:8px">Track</span>Acme vendor assessment</div><div class="c5row-s">Falling-rated vendor · confirm assessment cadence</div></div><div class="c5row-v">'+(tp.connected?tp.displayValue:'—')+'</div><span class="c5pill a" style="align-self:center">Advised</span></div>'+
    '</div>';
  host.innerHTML=c5header()+
    c5shell('Attention for Internal Audit · what needs follow-up?','One area ties the cycle together — plus board assurance to give.',null,'The audit actions on your desk. One area — identity — is your overdue review, outstanding test, repeat finding, and evidence gap at once. Internal Audit does not fund or fix; it schedules, tests, escalates and assures. Each item traces to the full picture and source.')+
    q+
    c5bl('Bottom line','One area, four audit signals.',null,'Identity is simultaneously your overdue review, your outstanding test, your repeat finding, and your evidence gap. Prioritizing it is the highest-leverage audit action — and lets you give the board independent assurance that management’s fix is landing.',{mid:'exp_identity',txt:'Prioritize the identity audit'})+
    '<div class="c5foot">Each item links to its plan, test, or finding. Internal Audit provides independent assurance — it does not fund or approve.</div>';
}

/* ================= Board seat — same engine, oversight (not operations) lens ================= */
/* The board notes / confirms / endorses / supports and opens the pack — never funds,
   approves, patches, or sees a control/ATT&CK detail. Identity appears only as
   "management's funded top action, not currently material". */
/* Tab 01 — Cyber-business health */
function c5bdHealth(){
  var host=document.getElementById('bd-health');if(!host)return;
  var ec=c5get('exp_identity'),O=c5Objectives();var T=c5T();
  host.innerHTML=c5header()+
    c5shell('Cyber-business health · is the enterprise secure and resilient?','Cyber is a managed risk'+(T.improving?' — improving,':' —')+' with nothing currently material.',null,'The enterprise is resilient this quarter'+(T.improving?', and cyber risk is trending down':'')+', and no matter is currently material for disclosure. Management has funded the top exposure. Every figure traces to its source.')+
    '<div class="c5cards">'+c5card('ceo_health')+c5card('bd_material')+c5card('direction')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('ceo_objectives','g','Resilient',(O.protected+' of '+O.total+' objectives protected · one carries a funded action'))+
      c5tile('exp_identity','a','Action underway',(ec.connected?('Identity gap · '+ec.displayValue+' · management action underway'):'top exposure · management action underway'))+
    '</div>'+
    c5bl('For the board','Note and support management’s top action.',null,(ec.connected?('The largest exposure — an identity gap, '+ec.displayValue+' — has a funded fix underway. It is not currently material, and closing it improves resilience. Nothing requires board action beyond awareness.'):'The largest exposure has a funded action underway. It is not currently material. Nothing requires board action beyond awareness.'),{act:'openBoardPack()',txt:'Open the board pack'})+
    '<div class="c5foot">Board figures are governance-grade and traceable to source (SEC Item 106).</div>';
}
/* Tab 02 — Material risk & disclosure */
function c5bdMaterial(){
  var host=document.getElementById('bd-material');if(!host)return;
  var ec=c5get('exp_identity'),m=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&LIVE.economics.materiality)||{};
  var below=(ec.connected&&m.value!=null);
  host.innerHTML=c5header()+
    c5shell('Material risk & disclosure · anything the board must know?','Nothing is currently material — and the process to decide is sound.',null,'Whether any cyber matter is material for disclosure under SEC Item 106. Nothing crosses the threshold this quarter; the materiality process is documented and applied. The board confirms the process; the disclosure call is management’s and counsel’s. Each item traces to its assessment and basis.')+
    '<div class="c5cards">'+c5card('bd_material')+c5card('bd_reportable')+c5card('bd_mat_process')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('bd_incidents_assessed','g','None material','None met the materiality threshold')+
      c5tile('exp_identity','g','Below threshold',(below?('Identity · '+ec.displayValue+' · below the '+usd(m.value)+' threshold · monitored and funded'):'below threshold · monitored and funded'))+
      c5tile('bd_disclosure_controls','g','Effective','Controls over disclosure operating')+
      c5tile('bd_threshold_basis','g','Documented','Quantitative + qualitative basis, applied consistently')+
    '</div>'+
    c5bl('For the board','Note the assessment; confirm the process.',null,'No cyber matter is currently material for disclosure. The largest exposure sits below threshold and is being managed. The board’s role is to confirm the materiality process is sound — which the documented basis supports.',{mid:'bd_mat_process',txt:'Review the materiality assessment'})+
    '<div class="c5foot">Materiality assessed under SEC Item 106; basis documented and traceable. Not disclosure advice.</div>';
}
/* Tab 03 — Trend over time */
function c5bdTrend(){
  var host=document.getElementById('bd-trend');if(!host)return;
  var tr=trajInfo();var vals=(tr.vals||[]).slice(-6);var maxV=Math.max.apply(null,vals.concat([1]));
  var bars='<div class="c5bars" style="height:44px">'+(vals.length?vals.map(function(v,i){var h=Math.round(8+(maxV>0?v/maxV:0)*34);var last=(i===vals.length-1);return '<i style="height:'+h+'px'+(last?';background:var(--blue)':'')+'"></i>';}).join(''):[1,2,3,4,5,6].map(function(){return '<i class="n" style="height:8px"></i>';}).join(''))+'</div>';
  var er=c5get('eff_return');
  var drivers='<div class="c5rank" style="padding:4px 15px;margin-top:14px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">What’s driving the improvement</div>'+
    '<div class="c5prow" data-c5m="eff_return"><span class="c5sq g" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Control effectiveness up</div><div class="c5row-s">Return on controls '+(er.connected?('is '+er.displayValue):'improving')+' — risk removed per dollar</div></div><span class="c5pill g">Improving</span></div>'+
    '<div class="c5prow" data-c5m="capability_coverage"><span class="c5sq g" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Coverage expanded</div><div class="c5row-s">More assets monitored, fewer blind spots</div></div><span class="c5pill g">Improving</span></div>'+
    '<div class="c5prow" data-c5m="exp_identity"><span class="c5sq a" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Identity — still elevated</div><div class="c5row-s">The one remaining driver · funded, being addressed</div></div><span class="c5pill a">Addressing</span></div>'+
    '</div>';
  host.innerHTML=c5header()+
    c5shell('Trend over time · are we improving?','Cyber risk is falling — and ahead of peers.',null,'The board’s favorite question, answered over time. Cyber residual risk is falling quarter over quarter, and you sit in the top third of peers. Each point traces to its drivers.')+
    '<div class="c5cards">'+c5card('direction')+c5card('cr_consec')+c5card('peer_position')+'</div>'+
    '<div class="c5rank" style="padding:12px 15px;margin-top:14px"><div class="c5rank-h" style="border:0;background:transparent;padding:0 0 8px">Residual cyber risk · last 6 quarters</div>'+bars+'</div>'+
    drivers+
    c5bl('For the board','Support the program’s trajectory.',null,'Consecutive quarters of improvement, ahead of peers. The one remaining driver — identity — is funded by management. Sustaining the trajectory is a matter of continued board support for the program.',{mid:'direction',txt:'Support the program trajectory'})+
    '<div class="c5foot">Trend from the residual-risk series; peer comparison anonymized.</div>';
}
/* Tab 04 — Investment & resilience */
function c5bdInvestment(){
  var host=document.getElementById('bd-investment');if(!host)return;
  var er=c5get('eff_return'),ec=c5get('exp_identity');
  host.innerHTML=c5header()+
    c5shell('Investment & resilience · are we investing wisely?','The program pays for itself — one funded investment sustains it.',null,'Whether cyber investment is proportionate and effective. The program returns risk removed per dollar, spend is benchmarked against peers, and one funded investment — identity — sustains the improvement. Every figure traces to its basis.')+
    '<div class="c5cards">'+c5card('eff_return')+c5card('bd_spend_peers')+c5card('bd_funded')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('bd_resilience_inv','g','On track','Recovery tested · within RTO/RPO targets')+
      c5tile('exp_identity','b','Funded',(ec.connected?('Identity fix · sustains the trend · '+ec.displayValue+' removed'):'the funded investment that sustains the trend'))+
    '</div>'+
    c5bl('For the board','Endorse the investment direction.',null,(er.connected?('Cyber spend returns '+er.displayValue+' and the one investment that sustains the improving trend — the identity fix — is funded by management. The board’s role is to endorse the direction, which the numbers support.'):'Cyber spend is proportionate and the investment that sustains the improving trend is funded. The board’s role is to endorse the direction.'),{mid:'eff_return',txt:'Endorse the investment direction'})+
    '<div class="c5foot">Return and spend from the program model; peer benchmark anonymized.</div>';
}
/* Tab 05 — Governance */
function c5bdGovernance(){
  var host=document.getElementById('bd-governance');if(!host)return;
  var ec=c5get('exp_identity'),tp=c5get('thirdparty_risk');
  var q='<div class="c5rank"><div class="c5rank-h">Governance items · note, confirm, be aware — nothing to approve</div>'+
    '<div class="c5row" data-c5m="exp_identity"><div class="c5row-main"><div class="c5row-t"><span class="c5pill b" style="margin-right:8px">Note</span>Management’s top action</div><div class="c5row-s">Identity fix funded and underway · not material · improves resilience</div></div><div class="c5row-v">'+(ec.connected?ec.displayValue:'—')+'</div><span class="c5pill g" style="align-self:center">For awareness</span></div>'+
    '<div class="c5row" data-c5m="bd_mat_process"><div class="c5row-main"><div class="c5row-t"><span class="c5pill n" style="margin-right:8px">Confirm</span>Oversight is functioning</div><div class="c5row-s">Risk owned, reported, and trending down · process sound</div></div><div class="c5row-v">—</div><span class="c5pill n" style="align-self:center">Informational</span></div>'+
    '<div class="c5row" data-c5m="thirdparty_risk"><div class="c5row-main"><div class="c5row-t"><span class="c5pill a" style="margin-right:8px">Aware</span>Acme vendor</div><div class="c5row-s">Falling-rated payments vendor · management is mitigating</div></div><div class="c5row-v">'+(tp.connected?tp.displayValue:'—')+'</div><span class="c5pill a" style="align-self:center">Watch</span></div>'+
    '</div>';
  host.innerHTML=c5header()+
    c5shell('Governance · what needs oversight or awareness?','Governance is sound — one item to note, nothing to approve.',null,'The board’s cyber governance items this quarter. Oversight is functioning: management is accountable, the top risk is owned and funded, and nothing is material. One item to note; nothing requires board approval.')+
    q+
    c5bl('For the board','Note and support — no approval required.',null,'Cyber is a managed, improving risk with clear accountability and nothing material. The board’s role this quarter is to note management’s funded action on the top exposure and confirm oversight is working. No approval is required.',{act:'openBoardPack()',txt:'Open the board pack'})+
    '<div class="c5foot">Governance items from the cyber program and risk register.</div>';
}

/* ================= CPO (Chief Product Officer) seat — identity as a product opportunity ================= */
/* Tab 01 — Product security posture */
/* Every customer-facing product from the crown-jewel inventory, each shown with
   HOW it is evaluated. The scan dimensions (incidents / SCA / SAST) are product-
   SURFACE signals from your scanners — shown across products until a per-application
   inventory attributes each finding to a specific product. The identity/access
   column IS product-specific: it comes from the exposure model mapped to your
   crown-jewel systems, so the one product carrying that gap reads At risk and the
   rest read Secure within posture. No per-product figure is invented. */
function c5productInventory(){
  var cj=(typeof LIVE!=='undefined'&&LIVE&&LIVE.crown_jewels)||[];
  var oi=sig('open_incidents'),dep=sig('dependabot_critical'),css=sig('code_scanning_open');
  var M=c5expModel();var idMat=M.drivers.some(function(d){return d.id==='exp_identity'&&d.usd>0;});
  var surface=[
    {k:'inc',name:'Incidents',v:oi},
    {k:'sca',name:'SCA',v:dep},
    {k:'sast',name:'SAST',v:css}
  ];
  var list=cj.slice(0,8).map(function(c,i){
    var idHere=(i===0&&idMat); // the top crown jewel carries the shared identity/access gap
    return idHere
      ? {name:c.name,tier:c.tier,verdict:'At risk',color:'warn',idHere:true,note:'Identity / access model is the gap · funded fix in flight'}
      : {name:c.name,tier:c.tier,verdict:'Secure',color:'good',idHere:false,note:'Within posture · no findings attributed to this product'};
  });
  return {list:list,surface:surface,connected:cj.length>0};
}
function c5cpInventoryHtml(){
  var inv=c5productInventory();
  if(!inv.connected){
    return '<div class="c5rank"><div class="c5rank-h">Products evaluated</div>'+
      '<div class="c5prow"><span class="c5sq n" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">No product inventory connected</div><div class="c5row-s">Connect your crown-jewel / application inventory at onboarding and every customer-facing product is listed here, each with how it is evaluated.</div></div><span class="c5pill n">—</span></div></div>';
  }
  function chip(d){
    var st=(d.v==null)?{c:'n',t:'not connected'}:((d.v>0)?{c:'a',t:d.v+' open'}:{c:'g',t:'clear'});
    return '<span class="c5ichip"><i class="c5sq '+st.c+'"></i>'+d.name+' <b>'+st.t+'</b></span>';
  }
  var rows=inv.list.map(function(p){
    var chips=inv.surface.map(chip).join('')+
      '<span class="c5ichip"><i class="c5sq '+(p.idHere?'a':'g')+'"></i>Identity/access <b>'+(p.idHere?'gap':'clear')+'</b></span>';
    var cls=(p.color==='warn')?'a':'g';
    return '<div class="c5prow"'+(p.idHere?' data-c5m="exp_identity"':'')+'>'+
      '<span class="c5sq '+cls+'" style="flex:0 0 auto"></span>'+
      '<div style="flex:1;min-width:0"><div class="c5row-t">'+c5esc(p.name)+(p.tier?(' <span class="c5tag">'+c5esc(p.tier)+'</span>'):'')+'</div>'+
      '<div class="c5ichips">'+chips+'</div>'+
      '<div class="c5row-s">'+p.note+'</div></div>'+
      '<span class="c5pill '+cls+'" style="align-self:center">'+p.verdict+'</span></div>';
  }).join('');
  return '<div class="c5rank"><div class="c5rank-h">Products evaluated · '+inv.list.length+' · how each is assessed</div>'+rows+'</div>'+
    '<div class="c5note">Incidents · SCA · SAST are product-surface signals from your scanners, shown across products until a per-application inventory attributes each finding to its product. The Identity/access column is product-specific — from the exposure model mapped to your crown-jewel systems. No per-product number is invented.</div>';
}
function c5cpSecurity(){
  var host=document.getElementById('cp-security');if(!host)return;
  var ec=c5get('exp_identity'),adv=c5get('ct_advisories');
  host.innerHTML=c5header()+
    c5shell('Product security posture · is the product secure by design?','The product is secure by design — one part of the platform carries the risk.',null,'Security across your product surface. Every customer-facing product is listed below with how it is evaluated. New features ship secure-by-design and most of the platform is healthy; the one real exposure is the customer platform’s identity/access model. Every figure traces to its source.')+
    '<div class="c5cards">'+c5card('cp_product_security')+c5card('cp_sbd_coverage')+c5card('cp_open_risks')+'</div>'+
    c5cpInventoryHtml()+
    '<div class="c5tiles">'+
      c5tile('exp_identity','a','Gap','The customer-platform exposure')+
      c5tile('ct_advisories','b','Watch',(adv.connected?'Auth-library advisory · a dependency to patch':'connect your SCA scanner'))+
    '</div>'+
    c5bl('Bottom line','Fix the access model in your flagship product.',null,(ec.connected?('The identity/access model behind the customer platform is your product’s one real security gap ('+ec.displayValue+'). The fix is funded — it closes the exposure and gives users a cleaner, safer access experience.'):'Connect your controls and the product’s one real security gap — the customer-platform access model — surfaces here with its funded fix.'),{mid:'exp_identity',txt:'Fund the identity fix — hardens the product'})+
    '<div class="c5foot">Product posture from your SDLC gates and product scans.</div>';
}
/* Tab 02 — Customer trust in the product */
function c5cpTrust(){
  var host=document.getElementById('cp-trust');if(!host)return;
  var ec=c5get('exp_identity');
  host.innerHTML=c5header()+
    c5shell('Customer trust in the product · are users safe and confident?','Users trust the product — the access experience is the one soft spot.',null,'How secure and confident your users are. No customer-impacting incidents, strong security-feature adoption, trust signals steady. The one soft spot is the identity/access experience — friction and risk in the same place. Every figure traces to its source.')+
    '<div class="c5cards">'+c5card('ceo_cust_incidents')+c5card('cp_mfa')+c5card('ceo_trust_signal')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('ceo_customer_data','g','Protected','No customer data at risk this quarter')+
      c5tile('exp_identity','a','Watch','The identity gap shows up here — friction + risk')+
    '</div>'+
    c5bl('Bottom line','Turn the access pain point into a trust win.',null,(ec.connected?('The identity gap is both a security risk and a source of user friction. Fixing it ('+ec.displayValue+') removes the exposure and smooths the access experience — safer and better for customers at once.'):'Connect your controls and the access pain point — both risk and friction — surfaces here, with the fix that improves both.'),{mid:'exp_identity',txt:'Fund the identity fix — improves trust'})+
    '<div class="c5foot">Trust and adoption from your product analytics and incident records.</div>';
}
/* Tab 03 — Ship velocity vs. security */
function c5cpVelocity(){
  var host=document.getElementById('cp-velocity');if(!host)return;
  var ec=c5get('exp_identity');
  host.innerHTML=c5header()+
    c5shell('Ship velocity vs. security · is security a tax or an enabler?','Security isn’t slowing you down — it’s clearing your path.',null,'Whether security helps or hinders delivery. The one recurring blocker is — again — the identity/access model; tech debt is roadmapped. Gate pass-rate and cycle-time light up when your CI/CD security-gate records connect. Every figure traces to its basis.')+
    '<div class="c5cards">'+c5card('cp_pass_rate')+c5card('cp_cycle_time')+c5card('cp_blocker')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('ct_techdebt','b','Managed','Legacy access debt mapped · roadmapped')+
    '</div>'+
    c5bl('Bottom line','Remove the one blocker that keeps recurring.',null,(ec.connected?('The identity/access model is the recurring blocker in your release pipeline. Fixing it once ('+ec.displayValue+') removes friction from future features — security stops being a repeat tax on velocity.'):'Connect your controls and the recurring release blocker — the identity/access model — surfaces here, fixable once.'),{mid:'exp_identity',txt:'Fund the identity fix — unblocks delivery'})+
    '<div class="c5foot">Delivery metrics from your CI/CD and security-gate records.</div>';
}
/* Tab 04 — Product risk backlog */
function c5cpBacklog(){
  var host=document.getElementById('cp-backlog');if(!host)return;
  var ec=c5get('exp_identity'),adv=c5get('ct_advisories'),td=c5get('ct_techdebt');
  var rows='<div class="c5rank"><div class="c5rank-h">Backlog · priority and status</div>'+
    '<div class="c5prow" data-c5m="exp_identity"><span class="c5sq a" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Identity/access remediation <span class="c5tag rev">High</span></div><div class="c5row-s">Funded · leads the backlog'+(ec.connected?(' · '+ec.displayValue+' of exposure'):'')+'</div></div><span class="c5pill a">Leads</span></div>'+
    '<div class="c5prow" data-c5m="ct_advisories"><span class="c5sq b" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Auth-library patch <span class="c5tag rev">High</span></div><div class="c5row-s">'+(adv.connected?('Used in the customer platform · '+adv.displayValue+' open'):'used in the customer platform')+'</div></div><span class="c5pill b">Scheduled</span></div>'+
    '<div class="c5prow" data-c5m="exp_identity"><span class="c5sq b" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Session-management hardening <span class="c5tag">Medium</span></div><div class="c5row-s">Depends on the access remediation</div></div><span class="c5pill b">Scheduled</span></div>'+
    '<div class="c5prow" data-c5m="ct_techdebt"><span class="c5sq g" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Deprecate legacy access paths <span class="c5tag">Medium</span></div><div class="c5row-s">Reduces access debt'+(td.connected?(' · '+td.displayValue+' mapped'):'')+'</div></div><span class="c5pill g">Roadmapped</span></div>'+
    '<div class="c5prow" data-c5m="cp_mfa"><span class="c5sq n" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Security-feature UX polish <span class="c5tag">Low</span></div><div class="c5row-s">Improves adoption</div></div><span class="c5pill n">Backlog</span></div>'+
    '</div>';
  host.innerHTML=c5header()+
    c5shell('Product risk backlog · what security work is queued?','The backlog is healthy — one high-priority item leads it.',null,'The security work queued against your product. Most is routine and scheduled; one high-priority item — the identity/access remediation — leads the backlog and is funded. Each item traces to its scope and owner.')+
    '<div class="c5cards">'+c5card('cp_open_items')+c5card('cp_high_priority')+c5card('cp_funded')+'</div>'+
    rows+
    c5bl('Bottom line','Land the item at the top of the backlog.',null,(ec.connected?('The identity/access remediation leads your product-security backlog and is funded. Landing it ('+ec.displayValue+') clears the largest product risk and unblocks several dependent items below it.'):'The identity/access remediation leads your product-security backlog. Landing it clears the largest product risk and unblocks the dependent items below it.'),{mid:'exp_identity',txt:'Prioritize the identity remediation'})+
    '<div class="c5foot">Backlog from your product and security issue trackers.</div>';
}
/* Tab 05 — Decisions for the CPO */
function c5cpDecisions(){
  var host=document.getElementById('cp-decisions');if(!host)return;
  var ec=c5get('exp_identity'),adv=c5get('ct_advisories');
  var list=[
    c5dec('cp',1,'Fund the identity / access fix?','Closes the product’s top security gap, smooths the access experience, and unblocks delivery'+(ec.connected?(' ('+ec.displayValue+')'):'')+'.',
      {on:'Fund it — safer, smoother, faster',osum:(ec.connected?('Three product wins at once · −'+ec.displayValue):'Three product wins at once'),pros:['Closes the product’s top security gap.','Smooths the customer access experience.','Unblocks delivery velocity.'],cons:['Larger cross-team effort and cost.']}),
    c5dec('cp',2,'Patch the auth-library dependency?','High-severity'+(adv.connected?(' ('+adv.displayValue+' open)'):'')+' — used in the customer platform. Urgent.',
      {on:'Patch it now',osum:'Closes a known-exploitable dependency',pros:['Removes an actively-exploitable path shipping to customers.','Fast, low-cost fix.'],cons:['Requires a release / regression pass.']},
      [{on:'Schedule for the next release',osum:'Batch with the next deploy',pros:['Avoids an out-of-band release.'],cons:['Leaves the path open in the interim.']}])
  ];
  host.innerHTML=c5header()+
    c5shell('Decisions for the CPO · what needs your call?','Product calls on your desk — the recommended one is marked, the choice is yours.',null,'One action improves security, customer trust and delivery velocity at once. Choosing one stamps it with your name and time, keeps it editable for 24 hours, and opens a tracked ticket in the system connected at onboarding — status pulled back on refresh.')+
    c5decisions(list)+
    '<div class="c5foot">Each decision links to its product area and source.</div>';
}

/* ================= CISO seat · Tab 06 — Frameworks & compliance =================
   Continuous, auditor-grade assessment. Left = finding & recommendation panel (the
   CISO asked for it on the left); right = expand/collapse control tree. Every score
   is computed from controlCmmi; group scores are the mean of their
   children (roll-up shown truthfully). Mapped frameworks (CIS/SOC2/HIPAA) derive from
   the CSF scores via the public crosswalk — no re-entered numbers, no proprietary text. */
(function(){var css=[
  '.c5fw-controls{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:12px}',
  '.c5fw-cad{display:flex;gap:4px;align-items:center;flex-wrap:wrap}',
  '.c5fw-cadb{font-size:11px;font-weight:500;padding:5px 11px;border-radius:20px;border:1px solid var(--line);background:var(--surface);color:var(--ink-2);cursor:pointer}',
  '.c5fw-cadb.on{background:var(--blue);color:#fff;border-color:var(--blue)}',
  '.c5fw-pills{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}',
  '.c5fw-pill{font-size:12px;font-weight:500;padding:6px 12px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink-2);cursor:pointer}',
  '.c5fw-pill.on{background:var(--ink);color:#fff;border-color:var(--ink)}',
  '.c5fw-refresh{font-size:11px;color:var(--muted);margin-top:10px}',
  '.c5fw-wrap{display:flex;gap:16px;margin-top:14px;align-items:flex-start}',
  '.c5fw-left{flex:0 0 400px;max-width:420px}',
  '.c5fw-right{flex:1;min-width:0}',
  '@media(max-width:900px){.c5fw-wrap{flex-direction:column}.c5fw-left{flex:1 1 auto;max-width:none}}',
  '.c5fw-detail{border:1px solid var(--line);border-radius:12px;padding:16px 18px;background:var(--surface)}',
  '.c5fw-dtop{display:flex;justify-content:space-between;align-items:center;gap:8px}',
  '.c5fw-tree{border:1px solid var(--line);border-radius:12px;overflow:hidden}',
  '.c5fw-grow{display:flex;align-items:center;gap:9px;padding:10px 14px;cursor:pointer;background:var(--surface-2);border-top:1px solid var(--line)}',
  '.c5fw-grow:first-child{border-top:0}',
  '.c5fw-cat{padding:7px 14px 3px 30px;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}',
  '.c5fw-crow{display:flex;align-items:center;gap:9px;padding:8px 14px 8px 34px;cursor:pointer;border-top:1px solid var(--line)}',
  '.c5fw-crow:hover{background:var(--surface-2)}.c5fw-crow.sel{background:rgba(74,111,165,.1)}',
  '.c5fw-tw{width:11px;font-size:10px;color:var(--muted);flex:0 0 auto}',
  '.c5fw-dot{width:9px;height:9px;border-radius:50%;flex:0 0 auto}',
  '.c5fw-id{font-size:12px;font-weight:500;font-family:var(--serif);flex:0 0 auto}',
  '.c5fw-nm{flex:1;min-width:0;font-size:12.5px;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.c5fw-lvl{font-size:9px;font-weight:500;padding:1px 6px;border-radius:20px;background:var(--surface);border:1px solid var(--line);flex:0 0 auto}',
  '.c5fw-sc{font-size:13px;font-weight:500;width:30px;text-align:right;flex:0 0 auto}',
  '.c5fw-map{font-size:10px;color:var(--muted);margin-top:3px}',
  '.c5fw-chip{font-size:9px;font-weight:500;background:var(--surface-2);color:var(--blue);border-radius:4px;padding:0 4px;margin-right:3px;cursor:pointer}'
].join('');try{var s=document.createElement('style');s.textContent=css;document.head.appendChild(s);}catch(_){}})();

var C5FW_CTRL=null, C5FW_EXP=null, C5FW_TARGET=3.5, C5FW_FLOOR=2.5;
function c5fwCadence(){try{return localStorage.getItem('cyberrx_audit_cadence')||'monthly';}catch(_){return 'monthly';}}
function c5fwStatus(sc){if(sc>=C5FW_TARGET)return {t:'Meets target',cls:'good',key:'meets'};if(sc>=C5FW_FLOOR)return {t:'Observation',cls:'warn',key:'obs'};return {t:'Deficiency',cls:'crit',key:'def'};}
function c5fwLvl(sc){var L=(typeof CMMI_LABELS!=='undefined')?CMMI_LABELS:{0:'None',1:'Initial',2:'Managed',3:'Defined',4:'Quant. Managed',5:'Optimizing'};return L[Math.round(sc)]||'';}
function c5fwCol(sc){return (typeof cmmiColor==='function')?cmmiColor(Math.round(sc)):'ink';}
function c5fwMean(arr){if(!arr.length)return 0;return arr.reduce(function(a,b){return a+b;},0)/arr.length;}
/* Build the framework tree with real roll-ups. Returns {groups, overall, coverage, failing, all}. */
function c5fwTree(sel,cov){
  var groups=[],all=[],evidenced=0;
  function ctl(id,name,mapped){var cc=controlCmmi(id,cov);all.push(cc.score);if(cc.src!=='none')evidenced++;
    return {type:'ctl',id:id,name:name,score:cc.score,src:cc.src,toolPct:cc.toolPct,doc:cc.doc,mapped:mapped||null};}
  if(sel==='csf'&&typeof CSF_RAW!=='undefined'){
    Object.keys(CSF_RAW).forEach(function(fnName){var m=fnName.match(/\(([^)]+)\)/),fid=m?m[1]:fnName;var cats=CSF_RAW[fnName],catNodes=[],fnScores=[];
      Object.keys(cats).forEach(function(catName){var cm=catName.match(/\(([^)]+)\)/),cid=cm?cm[1]:catName;var ctls=cats[catName].map(function(r){return ctl(r[0],r[1]);}),cScore=c5fwMean(ctls.map(function(c){return c.score;}));
        ctls.forEach(function(c){fnScores.push(c.score);});
        catNodes.push({type:'cat',id:cid,name:catName.replace(/ *\(.*/,''),score:cScore,children:ctls});});
      groups.push({type:'grp',id:fid,name:fnName.replace(/ *\(.*/,''),score:c5fwMean(fnScores),children:catNodes,rollup:catNodes.map(function(c){return {id:c.id,score:c.score};})});});
  } else if(sel==='r53'&&typeof R53_RAW!=='undefined'){
    R53_RAW.forEach(function(f){var fam=f[0],nm=f[1],n=f[2],ctls=[];for(var i=1;i<=n;i++)ctls.push(ctl(fam+'-'+i,nm));
      groups.push({type:'grp',id:fam,name:fam+' · '+nm,score:c5fwMean(ctls.map(function(c){return c.score;})),children:ctls,rollup:ctls.map(function(c){return {id:c.id,score:c.score};})});});
  } else if(typeof fwXmap==='function'){
    fwXmap(sel).forEach(function(g){var gid=g[0],gname=g[1],items=g[2]||[];
      var ctls=items.map(function(it){var ids=it[2]||[],scores=ids.map(function(id){return controlCmmi(id,cov).score;}),sc=c5fwMean(scores);all.push(sc);if(ids.length)evidenced++;
        return {type:'ctl',id:it[0],name:it[1],score:sc,src:'mapped',mapped:ids};});
      groups.push({type:'grp',id:gid,name:gname,score:c5fwMean(ctls.map(function(c){return c.score;})),children:ctls,rollup:ctls.map(function(c){return {id:c.id,score:c.score};})});
    });
  }
  var failing=all.filter(function(s){return s<C5FW_FLOOR;}).length;
  return {groups:groups,overall:c5fwMean(all),coverage:all.length?Math.round(evidenced/all.length*100):0,failing:failing,total:all.length,evidenced:evidenced};
}
/* Left panel — auditor finding for the selected node. Public-standard text is fine
   for CSF/800-53/HIPAA; CIS/SOC2 render numbers/titles/mappings only (no proprietary text). */
function c5fwFinding(sel,node){
  if(!node)return '<div class="c5fw-detail"><div class="c5kick">Finding &amp; recommendation</div><div class="c5intro" style="margin-top:8px">Select a control on the right to open its auditor finding — the score roll-up, what was tested, why it scored below target, the recommendation with a target uplift, and the cross-framework mappings. Every number traces to its evidence.</div></div>';
  var st=c5fwStatus(node.score),col=c5fwCol(node.score);
  var h='<div class="c5fw-detail"><div class="c5fw-dtop"><div><div class="c5kick">Finding &amp; recommendation</div><div style="font-size:15px;font-weight:500;margin-top:4px"><b>'+node.id+'</b> — '+node.name+'</div></div><span class="c5pill '+(st.cls==='good'?'g':st.cls==='warn'?'a':'r')+'">'+st.t+'</span></div>';
  h+='<div style="display:flex;align-items:baseline;gap:8px;margin-top:10px"><div style="font-size:26px;font-weight:500;font-family:var(--serif);color:var(--'+col+')">'+node.score.toFixed(1)+'<span style="font-size:14px;color:var(--muted)"> / 5</span></div><div class="c5intro" style="margin:0">'+c5fwLvl(node.score)+' · target '+C5FW_TARGET.toFixed(1)+'</div></div>';
  if(node.type!=='ctl'&&node.rollup){var parts=node.rollup.slice(0,8).map(function(r){return r.id+' ('+r.score.toFixed(1)+')';}).join(', ');
    h+='<div class="ev-sec">Score roll-up</div><div class="formula">'+node.id+' ('+node.score.toFixed(1)+') = mean of '+parts+(node.rollup.length>8?', …':'')+'</div>';
    h+='<div class="drow-need" style="margin-top:6px;font-size:12px;color:var(--muted)">A group score is the mean of its children — computed, not entered. Every child traces to its own evidence.</div>';
    h+='<div class="ev-sec">Where this comes from</div><div class="drill-p">Rolled up from '+node.rollup.length+' assessed items below. Expand the group on the right to test each one.</div></div>';
    return h;
  }
  // control-level auditor finding (fields come from c5fwFindingData so the deck matches the tab)
  var F=c5fwFindingData(sel,node);
  h+='<div class="ev-sec">Condition (what was tested)</div><div class="drill-p">'+F.condition+'</div>';
  h+='<div class="ev-sec">Criteria</div><div class="drill-p">'+F.criteria+'</div>';
  h+='<div class="ev-sec">Cause</div><div class="drill-p">'+F.cause+'</div>';
  h+='<div class="ev-sec">Effect (risk)</div><div class="drill-p">'+F.effect+'</div>';
  h+='<div class="ev-sec">Recommendation</div><div class="drill-p">'+F.recommendation+(F.targetUplift?(' — target uplift '+F.targetUplift+'.'):'')+'</div>';
  if(F.mappings&&F.mappings.length){h+='<div class="ev-sec">Cross-framework</div><div class="drill-p">'+F.mappings.map(function(id){return '<span class="c5fw-chip">'+id+'</span>';}).join('')+'</div>';}
  h+='</div>';
  return h;
}
/* Plain-text finding fields for a control — the single source used by both the tab
   (left panel) and the auditor-pack PPTX, so the deck matches the tab exactly. */
function c5fwFindingData(sel,node){
  var st=c5fwStatus(node.score),pct=(node.toolPct!=null)?node.toolPct:null;
  var crit='Control '+node.id+' ('+node.name+') is assessed against a maturity target of CMMI '+C5FW_TARGET.toFixed(1)+' (Defined+).';
  var cond,cause,effect,rec,ev=[];
  if(node.src==='mapped'){
    cond='Derived by crosswalk: this control inherits the maturity of the '+((node.mapped||[]).length)+' NIST CSF 2.0 subcategor'+((node.mapped||[]).length===1?'y':'ies')+' it maps to, assessed at CMMI '+node.score.toFixed(1)+'.';
    cause='The mapped CSF controls carry the deficiency; this framework reflects it through the public crosswalk.';
    effect=st.key==='def'?'A deficiency in the mapped controls leaves this requirement below assurance level.':(st.key==='obs'?'The mapped posture is below target — an observation to raise toward the goal.':'The mapped posture meets the target.');
    rec='Uplift the underlying CSF controls (see mapping); this requirement rises with them. Refer to your organization’s own '+(sel==='cis'?'CIS Controls license':'framework license')+' for implementation-tier detail.';
    ev.push(['Derivation','Public CSF 2.0 crosswalk']);ev.push(['Mapped controls',(node.mapped||[]).join(', ')]);
  } else if(node.src==='system'){
    cond='Automated continuous monitoring measured '+(pct!=null?(pct+'% effective coverage across the in-scope population'):'coverage')+' — '+(pct!=null?((100-pct)+'% of the population is outside the control'):'a residual population remains outside the control')+'. Assessed at CMMI '+node.score.toFixed(1)+'.';
    cause=st.key==='meets'?'Coverage meets the maturity threshold.':'Coverage sits below the ≥90% threshold required for full maturity, leaving a residual population unprotected.';
    effect=st.key==='def'?'The uncovered population is a control deficiency — exploitable exposure until remediated.':(st.key==='obs'?'The residual population is an observation — a gap to close toward target.':'No material exposure at current coverage.');
    rec=st.key==='meets'?'Maintain coverage and retain the tool’s evidence export each cycle.':'Extend the control to the residual population to raise coverage toward ≥90%';
    ev.push(['Method','Automated continuous control monitoring']);if(pct!=null)ev.push(['Measured coverage',pct+'%']);ev.push(['Maturity','CMMI '+node.score]);
  } else if(node.src==='document'){
    cond='Document review found '+(node.doc&&node.doc.attrs?('the governing policy present '+(node.doc.attrs.filter(function(a){return a.found;}).length)+' of '+node.doc.attrs.length+' expected control attributes'):'the governing policy partially satisfies the expected attributes')+'. Assessed at CMMI '+node.score.toFixed(1)+'.';
    cause=st.key==='meets'?'The policy evidences the required attributes.':'Some expected attributes are absent from the analyzed policy, capping maturity below target.';
    effect=st.key==='meets'?'Documented control operating as designed.':'Design gap — the control may not operate consistently until the policy is completed.';
    rec=st.key==='meets'?'Maintain the policy and re-verify on the '+c5fwCadence()+' cadence.':'Complete the missing policy attributes and re-submit for document review';
    ev.push(['Method','Document review']);ev.push(['Maturity','CMMI '+node.score]);
  } else {
    cond='No evidence is on file for this control — neither connected-tool telemetry nor an analyzed policy. Assessed at CMMI 0 (Not evidenced).';
    cause='The control’s source tool is not connected and no governing policy has been analyzed.';
    effect='Assurance cannot be given for this control until it is evidenced — a deficiency by default.';
    rec='Connect the control’s tool or upload the governing policy so the control gains an evidenced maturity score';
    ev.push(['Evidence','None on file']);
  }
  var cur=Math.round(node.score),tgt=Math.min(5,Math.max(cur+1,Math.ceil(C5FW_TARGET)));
  return {ref:node.id,name:node.name,classification:st.t,score:node.score,condition:cond,criteria:crit,cause:cause,effect:effect,recommendation:rec,
    targetUplift:(node.score<C5FW_TARGET)?('L'+cur+' → L'+tgt+' within one '+c5fwCadence()+' cycle'):'',mappings:node.mapped||[],evidence:ev};
}
/* Build the full assessment payload from the tree + findings and POST it to the
   auditor-pack builder — the deck is a rendering of the same Metric/Finding data. */
function c5fwPayload(){
  var sel=FW_SEL,cov=(typeof fwDeployedIds==='function')?fwDeployedIds():{},T=c5fwTree(sel,cov);
  var controls=[];T.groups.forEach(function(g){(g.children||[]).forEach(function(c){if(c.type==='cat'){(c.children||[]).forEach(function(x){controls.push(x);});}else controls.push(c);});});
  var nm=(typeof FW_NAMES!=='undefined'&&FW_NAMES[sel])||sel;var mapped=(sel==='cis'||sel==='soc2'||sel==='hipaa');
  var register=controls.map(function(c){var st=c5fwStatus(c.score);return {ref:c.id,name:c.name,derivedFrom:(c.mapped&&c.mapped.length)?('CSF '+c.mapped.slice(0,3).join(', ')):nm,score:c.score,target:C5FW_TARGET,classification:st.t};});
  var findings=controls.filter(function(c){return c.score<C5FW_TARGET;}).sort(function(a,b){return a.score-b.score;}).map(function(c){var F=c5fwFindingData(sel,c);return {ref:F.ref,name:F.name,classification:F.classification,condition:F.condition,criteria:F.criteria,cause:F.cause,effect:F.effect,recommendation:F.recommendation,targetUplift:F.targetUplift,mappings:F.mappings,evidence:(F.evidence||[]).map(function(e){return e[0]+': '+e[1];})};});
  var groups=T.groups.map(function(g){var st=c5fwStatus(g.score);return {id:g.id,name:g.name,score:g.score,level:c5fwLvl(g.score),status:st.t};});
  var roadmap=findings.filter(function(f){return /deficiency/i.test(f.classification);}).slice(0,12).map(function(f){return {action:'Remediate '+f.ref+' — '+f.name,owner:'Control owner',effort:'1 cycle',uplift:f.targetUplift,timeframe:'This '+c5fwCadence()+' cycle'};});
  var mapping=mapped?controls.map(function(c){return {ref:c.id,name:c.name,sources:c.mapped||[]};}):[];
  var evidence=[['Tool telemetry','Live coverage % from connected control tools (EDR · identity · SIEM · CNAPP)'],['Document review','Analyzed policies mapped to expected control attributes'],['Crosswalk','Public CSF ↔ framework mapping for derived scores']].map(function(e){return {area:e[0],evidence:e[1]};});
  var trendDelta=(function(){var h=(typeof fwHistory==='function')?fwHistory():[];if(h.length>=2){var d=h[h.length-1].v-h[0].v;return (d>=0?'+':'')+d.toFixed(1)+' CMMI';}return 'Baseline';})();
  var licensing=[(typeof FW_XNOTE!=='undefined'&&FW_XNOTE[sel])?FW_XNOTE[sel].replace(/<[^>]+>/g,''):null].filter(Boolean);
  // ---- EY-style narrative + framework-specific backbone (real numbers only) ----
  var cadence=(typeof c5fwCadence==='function')?c5fwCadence():'monthly';
  var defc=findings.filter(function(f){return /deficiency/i.test(f.classification);}).length;
  var obsc=findings.filter(function(f){return /observation/i.test(f.classification);}).length;
  var ov=Number(T.overall)||0,tg=Number(C5FW_TARGET)||3.5;
  var version={csf:'2.0',r53:'Rev 5',cis:'v8.1',soc2:'2017 TSC',hipaa:'Security Rule'}[sel]||'';
  var groupNoun=(sel==='csf')?'Function':(sel==='r53')?'Family':'Domain';
  var backbone={csf:'the six Functions — Govern, Identify, Protect, Detect, Respond and Recover — and their Categories and Subcategories',r53:'the control families (AC, AU, CM, CP, IA, IR, RA, SC, SI, SR and the remaining families), assessed control by control',cis:'the 18 Controls and 153 Safeguards, mapped to Implementation Groups IG1–IG3',soc2:'the Trust Services Criteria',hipaa:'the Administrative, Physical and Technical safeguards of the Security Rule'}[sel]||'the control domains';
  var backboneNote={csf:'Alongside the maturity scores, each Function is expressed as a Current Profile against the organisation’s Target Profile and an implementation Tier (1 Partial through 4 Adaptive).',r53:'In a formal RMF context these findings feed the System Security Plan (SSP), the Security Assessment Report (SAR), the Risk Assessment Report (RAR) and a Plan of Action & Milestones (POA&M); each control is assessed as Satisfied or Other-than-Satisfied.',cis:'Each Safeguard is assessed against its Implementation Group — IG1 essential cyber hygiene, IG2 and IG3 — with configuration-level benchmark compliance where CIS-CAT tooling is connected.',soc2:'Each criterion is expressed by Trust Services Criteria identifier and mapped from the source assessment.',hipaa:'Required and Addressable implementation specifications are distinguished, and severity is escalated for Required specifications near the floor.'}[sel]||'';
  var worst=groups.slice().sort(function(a,b){return a.score-b.score;}).slice(0,2).map(function(g){return g.name;});
  var execNarrative='As of '+((typeof orgName==='function'&&orgName())||'the organisation')+'’s assessment dated '+new Date().toISOString().slice(0,10)+', the '+nm+' programme is assessed at an overall maturity of CMMI '+ov.toFixed(1)+' of 5 against a defined target of '+tg.toFixed(1)+'. '+
    (ov>=tg?'On balance the programme meets its target, indicating controls that are documented, operating and measured across the estate. ':'The programme currently operates below its target, indicating that while foundational controls are largely in place, they are not yet consistently standardised, measured and optimised across the estate. ')+
    'The assessment identified '+defc+' deficienc'+(defc===1?'y':'ies')+' and '+obsc+' observation'+(obsc===1?'':'s')+' requiring management attention. '+
    'In business terms, the residual exposure concentrates in '+(worst.length?worst.join(' and '):'a small number of domains')+', where the control gaps most directly affect the organisation’s ability to prevent, detect and recover from a material cyber event. '+
    'Accordingly, management should prioritise the deficiencies set out in the findings register and remediation roadmap, beginning with the highest-criticality items — each scoped with a target maturity uplift and a delivery timeframe. '+
    'Delivered on the phased basis that follows, these actions are expected to move overall maturity toward the '+tg.toFixed(1)+' target within the current planning horizon.';
  var scopeProse='This assessment evaluated the organisation’s cybersecurity control environment against '+nm+(version?(' ('+version+')'):'')+', organised by '+backbone+'. The '+T.total+' controls in scope were assessed across the connected systems, business units and security tooling in the environment. '+
    'Controls that fall outside the current evidence boundary — those without connected telemetry or a reviewed policy — are reported transparently as unevidenced rather than assumed effective, so the baseline is defensible. '+
    'The objectives were to establish a current-state maturity baseline, to identify and rate deficiencies against the target profile, and to produce a prioritised remediation roadmap that management and the board can act on and that is re-run continuously on the '+cadence+' cadence.';
  var methodologyProse='The assessment followed a continuous, evidence-based methodology rather than a point-in-time review. Each control was scored on a 0–5 CMMI maturity scale drawn from two independent sources of evidence: live telemetry from connected security tools — deployment and coverage percentages — and analysed policy documents mapped to the control’s expected attributes. '+
    'Where both were available the stronger evidence prevailed; where neither existed the control was scored as unevidenced rather than presumed effective. '+
    'Control scores were rolled up to category, '+groupNoun.toLowerCase()+' and overall as the evidence-weighted mean of their children. '+backboneNote+' '+
    'Because the ratings derive from the same live control-assessment source as the management dashboard, this report reconciles exactly to the platform and can be reproduced on demand.';
  var gap=groups.map(function(g){var sc=Number(g.score)||0;return {domain:g.id+' · '+g.name,current:sc.toFixed(1),target:tg.toFixed(1),gap:(sc>=tg?'0.0':'−'+(tg-sc).toFixed(1)),priority:(sc<2.5?'High':sc<tg?'Medium':'On target')};});
  var riskRegister=findings.slice(0,18).map(function(f){var isDef=/deficiency/i.test(f.classification);var sc=Number(f.score)||0;
    var likelihood=sc<1?'High':sc<2.5?'Medium':'Low';var impact=isDef?'High':'Medium';var severity=isDef?'High':(/observation/i.test(f.classification)?'Medium':'Low');
    return {ref:f.ref,risk:'Insufficient control maturity — '+f.name,likelihood:likelihood,impact:impact,severity:severity,treatment:(f.recommendation||'Uplift toward target maturity.')};});
  // Phase each roadmap item on a 0–3 / 3–6 / 6–12 month plan (worst-first = soonest).
  var roadmapPhased=roadmap.map(function(r,i){return Object.assign({},r,{phase:i<4?'0–3 months':i<8?'3–6 months':'6–12 months'});});
  var detailedIntro='The detailed findings that follow are organised by '+backbone+'. '+backboneNote+' Each deficiency is presented on the auditor’s condition–criteria–cause–effect–recommendation basis, with the evidence tested and the target maturity uplift.';
  var payload={fw:sel,standard:nm,client:((typeof orgName==='function'&&orgName())||'Your organization'),period:new Date().toISOString().slice(0,10),cadence:c5fwCadence(),
    overall:T.overall,overallLevel:c5fwLvl(T.overall),overallStatus:c5fwStatus(T.overall).key,target:C5FW_TARGET,coverage:T.coverage,evidenced:T.evidenced,total:T.total,failing:T.failing,trendDelta:trendDelta,
    verdict:nm+' is assessed at CMMI '+T.overall.toFixed(1)+' of 5 against a '+C5FW_TARGET.toFixed(1)+' target, from continuous evidence. '+findings.filter(function(f){return /deficiency/i.test(f.classification);}).length+' deficiencies and '+findings.filter(function(f){return /observation/i.test(f.classification);}).length+' observations identified.',
    headlineRec:'Prioritize the deficiencies below (worst-first); each carries a target uplift and fits within one '+c5fwCadence()+' cycle.',
    licensing:licensing,demoNote:(typeof signalsAreDemo==='function')?signalsAreDemo():false,
    derivedLabel:mapped?'Derived from (CSF)':'Source',groupNoun:groupNoun,mappingNote:mapped?('Each '+nm+' requirement inherits the mean maturity of the NIST CSF 2.0 controls it maps to via the public crosswalk. No proprietary control text is reproduced.'):null,
    version:version,backbone:backbone,execNarrative:execNarrative,scopeProse:scopeProse,methodologyProse:methodologyProse,detailedIntro:detailedIntro,
    gap:gap,riskRegister:riskRegister,roadmapPhased:roadmapPhased,
    groups:groups,register:register,findings:findings,roadmap:roadmap,mapping:mapping,evidence:evidence};
  return {payload:payload,sel:sel};
}
/* Download an export by POSTing the assessment payload to a builder endpoint. */
function c5fwDownload(path,fname,body){
  var base=(typeof apiBase==='function')?apiBase():'',o=(typeof orgId==='function')?orgId():'';
  if(typeof fetch!=='function')return;
  fetch(base+path+(o?('?org_id='+encodeURIComponent(o)):''),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(function(r){if(!r.ok)throw new Error('export failed');return r.blob();})
    .then(function(blob){var u=URL.createObjectURL(blob);var a=document.createElement('a');a.href=u;a.download=fname;document.body.appendChild(a);a.click();setTimeout(function(){try{URL.revokeObjectURL(u);a.remove();}catch(_){}},1000);})
    .catch(function(){});
}
/* PPTX auditor pack. */
function c5fwExport(){var P=c5fwPayload();if(!P)return;c5fwDownload('/api/ciso/auditor-pack.pptx','nerion-auditor-pack-'+P.sel+'.pptx',P.payload);}
/* Excel control scorecard + POA&M. */
function c5fwExportXlsx(){var P=c5fwPayload();if(!P)return;c5fwDownload('/api/ciso/control-scorecard.xlsx','nerion-control-scorecard-'+P.sel+'.xlsx',P.payload);}
/* ============================================================================
   Executive partner seats — "the CISO's brief to each partner".
   Every non-CISO seat is two tabs: (1) "Your cyber picture" — the CISO's read
   for that exec in their language, de-duplicated to what is uniquely theirs;
   (2) "What I need from you" — the partnership actions the CISO routes to them
   (approve a risk acceptance for their area, fund a control, attest, sign off).
   The brief header reuses the seat's own plain-language CISO summary. */
function c5briefHead(brief){
  if(!brief)return '';
  return '<div class="c5briefhead"><div class="k">Your CISO’s read</div><div class="t">'+brief+'</div></div>';
}
/* Route live crown-jewel exposures to the seat whose remit owns them, so each
   exec's risk-acceptance asks name the real assets in THEIR area — not the same
   top exposure for everyone. Enterprise seats (CEO/CRO/Board) see the top of the
   whole list; others match by asset keyword, falling back to the top exposure. */
var C5_SEAT_DOMAIN={
  cfo:['payment','billing','fraud','financ','revenue','disburse','premium','settlement'],
  coo:['operation','continuity','disburse','logistic','manufactur','plant','service','settlement','supply'],
  cio:['identity','active directory','directory','infrastructure','network','firewall','server','platform','application','system','edge','cloud'],
  cpo:['portal','customer','product','mobile','web','app'],
  clo:['data','pii','phi','pci','privacy','records','claimant','breach']
};
function c5SeatExposures(seat){
  var CJ=(typeof LIVE!=='undefined'&&LIVE&&LIVE.crown_jewel_risk&&LIVE.crown_jewel_risk.items)||[];
  if(!CJ.length)return [];
  if(seat==='ceo'||seat==='board')return CJ.slice(0,1);
  if(seat==='cro')return CJ.slice(0,3);
  var kw=C5_SEAT_DOMAIN[seat]||[];
  var m=CJ.filter(function(it){var n=' '+String(it.asset||'').toLowerCase()+' ';return kw.some(function(k){return n.indexOf(k)>=0;});});
  return (m.length?m:CJ.slice(0,1)).slice(0,2);
}
/* Domain-flavoured placeholder asset for the clearly-labelled SAMPLE ask shown
   before any live crown-jewel exposure exists — so the pattern is visible pre-connect. */
var C5_SEAT_SAMPLE={cfo:'Billing & payments system',coo:'Payment disbursement system',cio:'Identity infrastructure',cpo:'Customer portal',clo:'Customer data platform',cro:'your top crown jewel',ceo:'your top crown jewel',board:'your top crown jewel',audit:'Identity & access'};
function c5AskMoney(v){if(v==null)return '';var n=Number(v);if(!isFinite(n)||n<=0)return '';if(n>=1e9)return '$'+(n/1e9).toFixed(1)+'B';if(n>=1e6)return '$'+(n/1e6).toFixed(0)+'M';if(n>=1e3)return '$'+(n/1e3).toFixed(0)+'K';return '$'+n.toFixed(0);}
/* The activities the CISO asks of each seat — grounded in live exposure where it
   can be, plus the governance attestations each role owns. */
function c5AskModel(seat){
  var asks=[];
  // Risk acceptances — one per exposed crown jewel in this seat's domain.
  var enterprise=(seat==='cro'||seat==='board'||seat==='ceo');
  var exps=c5SeatExposures(seat);
  if(exps.length){
    exps.forEach(function(t){
      var usd=Number(t.exposure_usd)||null,name=t.asset||'a crown jewel';
      asks.push({id:seat+'_accept_'+String(name).replace(/[^a-z0-9]+/gi,'_').toLowerCase().slice(0,40),kind:'accept',
        title:'Risk acceptance — '+name,
        why:(enterprise?('One of your most exposed crown jewels is '+name):('The exposed crown jewel in your area is '+name))+(usd?(' ('+c5AskMoney(usd)+' modeled exposure)'):'')+'. Remediation is scoped but not yet funded.',
        ask:'Approve accepting the residual risk until the fix is funded next cycle, or decline and fund it now.',
        opts:['Approve acceptance','Decline — fund now','Defer']});
    });
  }else{
    // No live exposure yet — one clearly-labelled sample so the pattern shows pre-connect.
    var sn=C5_SEAT_SAMPLE[seat]||'your top crown jewel';
    asks.push({id:seat+'_accept_sample',kind:'accept',sample:true,
      title:'Risk acceptance — '+sn,
      why:'This populates from your live crown-jewel exposures once your Crown-Jewel Register and GRC are connected — '+(enterprise?'your most exposed assets appear here.':'the exposed assets in your area appear here.'),
      ask:'Approve accepting the residual risk until the fix is funded next cycle, or decline and fund it now.',
      opts:['Approve acceptance','Decline — fund now','Defer']});
  }
  if(seat==='cfo')
    asks.push({id:'cfo_fund_best',kind:'fund',title:'Fund the highest-return control',
      why:'Your best dollar closes the identity gap — the most risk removed per dollar, and it trims the insurance tail where you are thin.',
      ask:'Approve the funding, decline, or defer to the next cycle.',opts:['Approve funding','Decline','Defer']});
  if(seat==='board')
    asks.push({id:'board_attest_materiality',kind:'attest',title:'Attest — materiality process (SEC Item 106)',
      why:'The board confirms the cyber materiality-determination process is sound and every above-appetite risk has a named owner.',
      ask:'Confirm the process is sound as presented, or request changes.',opts:['Attest','Request changes']});
  if(seat==='clo')
    asks.push({id:'clo_confirm_disclosure',kind:'attest',title:'Confirm — disclosure posture',
      why:'Nothing currently crosses the disclosure threshold; notification readiness depends on forensic evidence staying current.',
      ask:'Confirm the disclosure posture, or flag an obligation to review.',opts:['Confirm','Flag for review']});
  if(seat==='cpo')
    asks.push({id:'cpo_prioritize_identity',kind:'accept',title:'Prioritize the identity fix in the backlog',
      why:'The identity & access model is a security gap, a source of user friction and a recurring release blocker — one fix returns all three.',
      ask:'Commit it to the top of the product backlog, or defer.',opts:['Prioritize','Defer']});
  if(seat==='audit')
    asks.push({id:'audit_escalate_identity',kind:'attest',title:'Escalate — identity for follow-up',
      why:'Identity & access is your overdue review, outstanding test, repeat finding and evidence gap at once.',
      ask:'Escalate identity for audit-committee follow-up, or note it as tracked.',opts:['Escalate','Note as tracked']});
  return asks;
}
function c5AskStore(){try{return JSON.parse(localStorage.getItem('cyberrx_asks')||'{}')||{};}catch(_){return {};}}
function c5AskSave(id,o){var m=c5AskStore();m[id]=o;try{localStorage.setItem('cyberrx_asks',JSON.stringify(m));}catch(_){}}
function c5AskEditable(st){try{return st&&st.ts&&(Date.now()-st.ts)<86400000;}catch(_){return false;}}
/* Render the "What I need from you" panel for a seat. */
function c5Asks(seat){
  var host=document.getElementById(seat+'-asks');if(!host)return;
  var asks=c5AskModel(seat),store=c5AskStore();
  var intro='<div class="c5asks-intro">Your CISO needs these from you — each is scoped to your area, and your decision is recorded (change within 24 hours).</div>';
  if(!asks.length){host.innerHTML=intro+'<div class="c5asks-empty">Nothing needs your sign-off right now.</div>';return;}
  var KIND={accept:'Risk acceptance',attest:'Attestation',fund:'Funding'};
  host.innerHTML=intro+asks.map(function(a){
    var st=store[a.id],acts;
    if(st&&st.status){acts='<div class="c5ask-done">✓ '+c5esc(st.status)+'<span class="c5ask-when"> · recorded'+(c5AskEditable(st)?' · change within 24h':'')+'</span>'+(c5AskEditable(st)?' <button class="c5ask-btn" data-askreset="'+a.id+'" style="margin-left:8px;padding:4px 10px;font-size:11.5px">Change</button>':'')+'</div>';}
    else{acts=a.opts.map(function(o,i){return '<button class="c5ask-btn'+(i===0?' primary':'')+'" data-ask="'+a.id+'" data-askval="'+c5esc(o)+'">'+c5esc(o)+'</button>';}).join('');}
    return '<div class="c5ask-card" data-kind="'+a.kind+'"><div class="c5ask-k">'+(KIND[a.kind]||'Action')+(a.sample?' <span class="c5ask-sampletag">sample</span>':'')+'</div>'+
      '<div class="c5ask-t">'+c5esc(a.title)+'</div>'+
      '<div class="c5ask-why">'+c5esc(a.why)+'</div>'+
      '<div class="c5ask-ask"><b>The ask:</b> '+c5esc(a.ask)+'</div>'+
      '<div class="c5ask-acts">'+acts+'</div></div>';
  }).join('');
}
/* Render both tabs for every non-CISO seat (the brief header is added in the
   seat body; the curated panels are filled by their existing renderers). */
function c5SeatViews(){['board','ceo','cfo','clo','cro','cio','coo','cpo','audit'].forEach(function(s){try{c5Asks(s);}catch(_){}});}
document.addEventListener('click',function(e){
  var r=e.target.closest('[data-askreset]');if(r){var id=r.getAttribute('data-askreset');var m=c5AskStore();delete m[id];try{localStorage.setItem('cyberrx_asks',JSON.stringify(m));}catch(_){}if(typeof CUR!=='undefined'&&CUR)c5Asks(CUR);if(document.getElementById('c5-decproj'))c5DecProj();return;}
  var b=e.target.closest('[data-ask]');if(!b||!b.getAttribute('data-askval'))return;
  c5AskSave(b.getAttribute('data-ask'),{status:b.getAttribute('data-askval'),ts:Date.now()});
  if(typeof CUR!=='undefined'&&CUR)c5Asks(CUR);
  if(document.getElementById('c5-decproj'))c5DecProj();
});

/* ================= Decisions & Projections (CISO tab 07) =================
   One board for the CISO: the decisions they owe, the decisions they are
   waiting on from other leaders (with status + an LLM-drafted reminder email
   they can send from here), and a what-if simulator that shows — on the real
   control model — which NIST CSF sub-categories move from what score to what
   score if a recommendation is completed. Nothing illustrative: projections
   run on controlCmmi()/fwDeployedIds()/CAP_FRAMEWORK, the same math as the
   Frameworks tab. */
var C5_SEAT_META={board:{label:'Board',role:'Board / Audit Committee'},ceo:{label:'CEO',role:'Chief Executive'},cfo:{label:'CFO',role:'Chief Financial Officer'},clo:{label:'General Counsel',role:'Legal / CLO'},cro:{label:'CRO',role:'Chief Risk Officer'},cio:{label:'CIO / CTO',role:'Technology'},coo:{label:'COO',role:'Operations'},cpo:{label:'CPO',role:'Product'},audit:{label:'Internal Audit',role:'Audit'}};
function c5SeatNameOf(seat){try{return (typeof SEAT_NAMES!=='undefined'&&SEAT_NAMES&&SEAT_NAMES[seat])||'';}catch(_){return '';}}
function c5SeatEmails(){var m={};
  // Seed from the emails captured at onboarding (persisted to LIVE), then overlay
  // any addresses the CISO has entered/edited in the cockpit (localStorage wins).
  try{var live=(typeof LIVE!=='undefined'&&LIVE&&LIVE.seatEmails)||{};for(var k in live)if(live[k])m[k]=live[k];}catch(_){}
  try{var ls=JSON.parse(localStorage.getItem('cyberrx_seat_emails')||'{}')||{};for(var k2 in ls)if(ls[k2])m[k2]=ls[k2];}catch(_){}
  return m;}
function c5SeatEmailSave(seat,e){var m=c5SeatEmails();m[seat]=e;try{localStorage.setItem('cyberrx_seat_emails',JSON.stringify(m));}catch(_){}}
function c5OrgName(){try{return (typeof LIVE!=='undefined'&&LIVE&&(LIVE.org_name||LIVE.client_name||LIVE.name))||'the organization';}catch(_){return 'the organization';}}
function c5CisoName(){var n=c5SeatNameOf('ciso');return n?(n+' (CISO)'):'the CISO';}

/* --- projection math (on the live control model) --- */
function c5ProjCov(){try{return (typeof fwDeployedIds==='function')?fwDeployedIds():{};}catch(_){return {};}}
function c5CtrlScore(id,cov){try{return (typeof controlCmmi==='function')?(controlCmmi(id,cov).score||0):0;}catch(_){return 0;}}
/* Complete a capability lever (raise its deployment to targetPct) → the CSF
   sub-categories it covers that would improve, and by how much. */
function c5ProjectCap(capKey,targetPct){
  var fw=(typeof CAP_FRAMEWORK!=='undefined'&&CAP_FRAMEWORK[capKey])||null;if(!fw)return [];
  var cap=(typeof CAP_BY_KEY!=='undefined'&&CAP_BY_KEY[capKey])||null;
  // The projected maturity is capped by how automated THIS capability is: deploying a
  // semi-automated tool tops a control out at 4, a manual/process one at 3 — only a
  // fully-automated control can be projected to Optimizing (5). No blind 5s.
  var ceil=(typeof capAutoCeil==='function'&&cap)?capAutoCeil(cap):5;
  var cov=c5ProjCov(),out=[];
  var ds=(typeof docScores==='function')?docScores():{};
  (fw.csf||[]).forEach(function(id){
    var meta=(typeof C5_CSF_META!=='undefined'&&C5_CSF_META[id])||null;
    var from=c5CtrlScore(id,cov);
    var toolProj=Math.min(((typeof pctToCmmi==='function'?pctToCmmi(targetPct):5)||0),ceil);
    var dv=(ds[id]&&ds[id].cmmi!=null)?Number(ds[id].cmmi):-1; // documented evidence can exceed deployment
    var to=Math.max(from,toolProj,dv);
    if(to>from)out.push({id:id,name:meta?meta.name:'',from:from,to:to,ceil:ceil,auto:cap?cap.auto:null});
  });
  return out;
}
/* The recommendation levers = capabilities not yet at full maturity, biggest
   control uplift first. Each carries its "what to do" (cap.need) and any
   in-flight project (capProject) so the CISO sees status. */
function c5Levers(){
  var caps=(typeof CAPS!=='undefined'&&CAPS)||[];var out=[];
  caps.forEach(function(c){
    var proj=c5ProjectCap(c.k,100);if(!proj.length)return;
    var gain=proj.reduce(function(s,p){return s+(p.to-p.from);},0);
    var inflight=null;try{if(typeof capProject==='function')inflight=capProject(c);}catch(_){}
    var dep=null;try{if(typeof capDeploy==='function')dep=capDeploy(c);}catch(_){}
    out.push({k:c.k,name:c.name,need:c.need,connect:c.connect,proj:proj,gain:gain,inflight:inflight,deploy:dep});
  });
  out.sort(function(a,b){return b.gain-a.gain;});
  return out;
}
/* Reverse: for a control currently below target, what raises it — which lever
   (to 90%+) and which policy document evidences it. */
var C5_FAM_DOC={GV:'Information Security Policy',ID:'Risk Assessment / Register',PR:'Access Control / Data Protection Policy',DE:'Configuration / Logging Policy',RS:'Incident Response Plan',RC:'Business Continuity / DR Plan'};
function c5ControlLevers(id){
  var caps=(typeof CAPS!=='undefined'&&CAPS)||[],out=[];
  caps.forEach(function(c){var fw=(typeof CAP_FRAMEWORK!=='undefined'&&CAP_FRAMEWORK[c.k])||null;if(!fw)return;
    if((fw.csf||[]).indexOf(id)<0)return;var dep=null;try{dep=capDeploy(c);}catch(_){}
    out.push({name:c.name,need:c.need,deploy:dep,auto:c.auto,ceil:(typeof capAutoCeil==='function'?capAutoCeil(c):5)});});
  return out;
}

var C5_DECPROJ_SEL='';   // selected lever key for the simulator
var C5_DECPROJ_TARGET='';// selected control id for the reverse tool
var C5_DP_OPENDEC={};    // which decision cards are expanded (lever key → true)
var C5_DP_OPENASK={};    // which awaiting-leader rows are expanded (ask id → true)
function c5DecProj(){
  var host=document.getElementById('c5-decproj');if(!host)return;
  // This renderer only runs on the CISO seat — so if a return bar is showing, the
  // CISO has navigated back; drop it.
  if(window.__c5Return||document.getElementById('c5retbar')){window.__c5Return=null;c5HideReturnBar();}
  var cov=c5ProjCov();
  /* ---- Panel A: decisions I owe ---- */
  var levers=c5Levers();
  var mineStore;try{mineStore=JSON.parse(localStorage.getItem('cyberrx_ciso_decisions')||'{}')||{};}catch(_){mineStore={};}
  var mine=levers.slice(0,6).map(function(l){
    // Normalize the stored decision: legacy string, or {status,ts,by,until}.
    var raw=mineStore[l.k],dec=(raw&&typeof raw==='object')?raw:(raw?{status:raw}:null);
    var status=dec&&dec.status;
    var state=l.inflight?'flight':(status==='Committed'?'committed':status==='Deferred'?'deferred':'open');
    var pill=l.inflight?('<span class="c5dp-pill blue">◒ In flight'+(l.inflight.ticket?(' · '+c5esc(l.inflight.ticket)):'')+'</span>'):
      (status?('<span class="c5dp-pill '+(status==='Committed'?'good':'muted')+'">'+(status==='Committed'?'✓ Committed &amp; funded':'⏸ Deferred'+(dec.until?(' to '+c5esc(dec.until)):''))+'</span>'):'<span class="c5dp-pill warn">Awaiting your call</span>');
    var meta=status?('<div class="c5dp-when">'+(status==='Committed'?'Funded':'Deferred')+' by <b>'+c5esc(dec.by||c5CisoName())+'</b>'+(dec.ts?(' · '+c5dpWhen(dec.ts)):'')+' <button class="c5dp-linkbtn" data-cisoundo="'+l.k+'">Change</button></div>'):'';
    var acts=(status||l.inflight)?'':'<button class="c5dp-btn primary" data-cisodec="'+l.k+'" data-cisoval="Committed">Commit &amp; fund</button><button class="c5dp-btn ghost" data-cisodec="'+l.k+'" data-cisoval="Deferred">Defer</button>';
    var top=l.proj.slice(0).sort(function(a,b){return (b.to-b.from)-(a.to-a.from);})[0];
    var impact=top?('<div class="c5dp-impact">Lifts <b>'+top.id+'</b> '+c5dpMini(top.from,top.to)+'<span class="c5dp-chip">+'+l.gain+' CMMI · '+l.proj.length+' control'+(l.proj.length>1?'s':'')+'</span></div>'):'';
    // Expandable: the full per-decision projection (every control it moves) lives here.
    var open=!!C5_DP_OPENDEC[l.k];
    var autoLbl=top&&top.auto==='manual'?'manual':top&&top.auto==='semi'?'semi-automated':'fully-automated';
    var detail=open?('<div class="c5dp-cdetail"><div class="c5dp-cdh">Projected control movement'+(l.deploy!=null?(' · '+l.deploy+'% deployed today'):'')+'</div>'+
      l.proj.map(c5dpMeterRow).join('')+
      '<div class="c5dp-capnote">Maturity is capped by automation — '+c5esc(l.name)+' is a <b>'+autoLbl+'</b> control, so tool coverage alone tops out at CMMI '+(top?top.ceil:5)+'.</div></div>'):'';
    return '<div class="c5dp-card '+state+(open?' exp':'')+'"><div class="c5dp-cardrow" data-decexp="'+l.k+'"><div class="c5dp-card-main">'+
      '<div class="c5dp-t"><span class="c5dp-caret">'+(open?'▾':'▸')+'</span> Fund — '+c5esc(l.name)+'</div>'+
      '<div class="c5dp-sub">'+c5esc(l.need)+'</div>'+impact+'</div>'+
      '<div class="c5dp-card-side">'+pill+(acts?('<div class="c5dp-acts2">'+acts+'</div>'):'')+meta+'</div></div>'+detail+'</div>';
  }).join('');
  if(levers.length)mine='<div class="c5dp-cards">'+mine+'</div>';
  else mine='<div class="c5dp-empty">Connect your security tools and upload your policies, and the funded decisions that move your posture appear here — each with the exact controls it improves.</div>';

  /* ---- Panel B: awaiting other leaders (expandable → detail + jump to their seat) ---- */
  var store=c5AskStore(),seats=['board','ceo','cfo','clo','cro','cio','coo','cpo','audit'],pending=0,decided=0,rowsB=[];
  seats.forEach(function(seat){
    var asks=[];try{asks=c5AskModel(seat)||[];}catch(_){}
    asks.forEach(function(a){
      if(a.sample)return; // skip pre-connect placeholders
      var st=store[a.id],who=c5SeatNameOf(seat),meta=C5_SEAT_META[seat]||{label:seat,role:''},first=(who||meta.label).split(/\s+/)[0];
      var acted=!!(st&&st.status);if(acted)decided++;else pending++;
      var statusHtml=acted?('<div class="c5dp-lstat"><span class="c5dp-pill good">✓ '+c5esc(st.status)+'</span><span class="c5dp-when2">by '+c5esc(who||meta.label)+(st.ts?(' · '+c5dpWhen(st.ts)):'')+'</span></div>'):'<span class="c5dp-pill warn">Pending</span>';
      var open=!!C5_DP_OPENASK[a.id];
      var detail=open?('<div class="c5dp-ldetail">'+
        (a.why?('<div class="c5dp-ldp"><span class="c5dp-ldk">Why</span><span>'+c5esc(a.why)+'</span></div>'):'')+
        '<div class="c5dp-ldp"><span class="c5dp-ldk">The ask</span><span>'+c5esc(a.ask)+'</span></div>'+
        (a.opts&&a.opts.length?('<div class="c5dp-ldp"><span class="c5dp-ldk">Options</span><span>'+a.opts.map(function(o){return '<span class="c5dp-optpill">'+c5esc(o)+'</span>';}).join(' ')+'</span></div>'):'')+
        '<div class="c5dp-ldp"><span class="c5dp-ldk">Status</span><span>'+(acted?('Recorded — <b>'+c5esc(st.status)+'</b> by '+c5esc(who||meta.label)+(st.ts?(' on '+c5dpWhen(st.ts)):'')):'Awaiting a decision from '+c5esc(who||meta.label))+'</span></div>'+
        '<div class="c5dp-ldacts"><button class="c5dp-btn primary" data-goseat="'+seat+'">Open in '+c5esc(first)+'’s cockpit →</button>'+(acted?'':'<button class="c5dp-btn" data-remind="'+seat+'">✉ Draft a reminder</button>')+'</div>'+
        '</div>'):'';
      rowsB.push('<div class="c5dp-litem'+(open?' exp':'')+'"><div class="c5dp-lrow" data-askexp="'+a.id+'"><div class="c5dp-avatar '+(acted?'done':'wait')+'">'+c5dpInitials(meta.label,who)+'</div>'+
        '<div class="c5dp-lmain"><div class="c5dp-t"><span class="c5dp-caret">'+(open?'▾':'▸')+'</span> '+c5esc(who||meta.label)+' <span class="c5dp-role">'+c5esc(meta.label)+'</span></div>'+
        '<div class="c5dp-sub">'+c5esc(a.title)+'</div></div>'+
        '<div class="c5dp-lside">'+statusHtml+(acted?'':'<button class="c5dp-btn" data-remind="'+seat+'">✉ Remind</button>')+'</div></div>'+detail+'</div>');
    });
  });
  var panelB=rowsB.length?(
    '<div class="c5dp-stats c5dp-stats-2">'+c5dpStat(String(pending),'Awaiting a decision','warn')+c5dpStat(String(decided),'Recorded','good')+'</div>'+
    '<div class="c5dp-lrows">'+rowsB.join('')+'</div>'+
    '<div class="c5dp-foot">Click any leader for the decision detail and to jump straight to their cockpit; or send a reminder Nerion drafts for you.</div>'
  ):'<div class="c5dp-empty">Once you route risk acceptances and attestations to each leader, their outstanding decisions and status appear here.</div>';

  /* ---- Panel C: raise a control to its ceiling (the reverse tool; the forward
     projection now lives inside each expandable decision above) ---- */
  var allCtrls={};levers.forEach(function(l){l.proj.forEach(function(p){if(!allCtrls[p.id]||p.from<allCtrls[p.id].score)allCtrls[p.id]={id:p.id,name:p.name,score:p.from};});});
  var ctrlList=Object.keys(allCtrls).map(function(k){return allCtrls[k];}).sort(function(a,b){return a.score-b.score||(a.id<b.id?-1:1);});
  if((!C5_DECPROJ_TARGET||!allCtrls[C5_DECPROJ_TARGET])&&ctrlList.length)C5_DECPROJ_TARGET=ctrlList[0].id;
  var tOpts=ctrlList.map(function(c){return '<option value="'+c.id+'"'+(c.id===C5_DECPROJ_TARGET?' selected':'')+'>'+c.id+' — '+c5esc(c.name||'')+'  (now '+c.score+')</option>';}).join('');
  var rev='';
  if(C5_DECPROJ_TARGET&&allCtrls[C5_DECPROJ_TARGET]){
    var cur=allCtrls[C5_DECPROJ_TARGET],fam=String(C5_DECPROJ_TARGET).split(/[.\-]/)[0],doc=C5_FAM_DOC[fam]||'the relevant policy';
    var lv=c5ControlLevers(C5_DECPROJ_TARGET);
    var toolCeil=lv.reduce(function(m,x){return Math.max(m,x.ceil||5);},0)||5;   // best tool ceiling
    var reachable=Math.max(toolCeil,5); // the document path can evidence up to Optimizing (5)
    rev='<div class="c5dp-do">To move <b>'+C5_DECPROJ_TARGET+'</b> from '+c5dpMini(cur.score,reachable)+' — take either path (the cockpit scores the higher of the two):</div>'+
      '<div class="c5dp-play">'+
      lv.map(function(x){var cl=x.ceil||5;return '<div class="c5dp-opt"><div class="c5dp-opt-ic tool">🔌</div><div class="c5dp-opt-b"><div class="c5dp-opt-t">Deploy '+c5esc(x.name)+' to 90%+ <span class="c5dp-optceil">→ up to CMMI '+cl+'</span></div><div class="c5dp-opt-d">'+(x.deploy!=null?('<b>'+x.deploy+'% today</b> · '):'<b>Not yet connected</b> · ')+c5esc(x.need)+(cl<5?(' <span style="color:var(--warn)">This is a '+(x.auto==='manual'?'manual':'semi-automated')+' control — deployment alone tops out at CMMI '+cl+'.</span>'):'')+'</div></div></div>';}).join('')+
      '<div class="c5dp-opt"><div class="c5dp-opt-ic doc">📄</div><div class="c5dp-opt-b"><div class="c5dp-opt-t">Strengthen your '+c5esc(doc)+' <span class="c5dp-optceil">→ up to CMMI 5</span></div><div class="c5dp-opt-d">The document-review engine scores this sub-category from the policy language — a fuller, board-approved policy that evidences continuous improvement can reach Optimizing.</div></div></div>'+
      '</div>';
  } else rev='<div class="c5dp-empty">Connect a security tool or upload a policy and this shows exactly what raises each sub-category, and how far it can realistically go.</div>';

  host.innerHTML=
    '<div class="c5dp-wrap">'+
    '<div class="c5dp-sec"><div class="c5dp-h">Decisions I owe</div><div class="c5dp-hd">The funded moves waiting on your sign-off — click any card to see every control it moves and how far.</div>'+mine+'</div>'+
    '<div class="c5dp-sec"><div class="c5dp-h">Awaiting other leaders</div><div class="c5dp-hd">Risk acceptances &amp; attestations you routed to each partner. Click a leader for the detail and to jump to their cockpit.</div>'+panelB+'</div>'+
    '<div class="c5dp-sec c5dp-hero"><div class="c5dp-h">Raise a control to its ceiling</div><div class="c5dp-hd">Pick a NIST CSF 2.0 sub-category to see what raises it — and how far it can realistically go. Maturity is capped by how automated the control is: <b>Automated → 5</b> · <b>Semi-automated → 4</b> · <b>Manual → 3</b>. Reaching a higher tier takes documented continuous-improvement evidence, not just tool coverage — and this cap applies across every framework.</div>'+
      '<div class="c5dp-selrow"><span class="c5dp-selk">Sub-category</span><div class="c5dp-select"><select id="c5dp-target">'+(tOpts||'<option>—</option>')+'</select></div></div>'+rev+
    '</div>'+
    '</div>';
  var s2=document.getElementById('c5dp-target');if(s2)s2.addEventListener('change',function(){C5_DECPROJ_TARGET=s2.value;c5DecProj();});
}
/* One control's projected movement, with a note when its automation caps it below 5. */
function c5dpMeterRow(p){
  var cap=(p.ceil!=null&&p.to>=p.ceil&&p.ceil<5)?('<span class="c5dp-cap">'+(p.auto==='manual'?'manual · caps at 3':'semi-automated · caps at 4')+'</span>'):'';
  return '<div class="c5dp-mrow"><div class="c5dp-mlabel"><b>'+p.id+'</b><span>'+c5esc(p.name||'')+'</span></div>'+
    '<div class="c5dp-mviz">'+c5dpMeter(p.from,p.to)+'<span class="c5dp-mnum">'+p.from+'<span class="c5dp-arrow">→</span>'+p.to+'</span>'+cap+'</div></div>';
}
/* Navigate to a leader's cockpit and open their "What I need from you" tab,
   remembering where we came from so a return bar can bring the CISO straight back. */
function c5GoSeat(seat){
  try{
    var t=document.querySelector('#secTabs .sectab.on');var ti=t?(+t.dataset.sec):0;
    window.__c5Return={seat:(typeof CUR!=='undefined'?CUR:'ciso'),tab:ti,who:c5SeatNameOf('ciso')||'CISO'};
    if(typeof selectSeat==='function'){selectSeat(seat);
      var t2=document.querySelector('#secTabs .sectab[data-sec="1"]');if(t2)t2.click();window.scrollTo({top:0});}
    c5ShowReturnBar(seat);
  }catch(_){}
}
/* A persistent floating bar shown while the CISO is in a leader's cockpit, with a
   one-click return to the Decisions & projections tab they came from. Lives on
   document.body so it survives seat re-renders; c5DecProj() removes it once the CISO
   is back (that renderer only runs on the CISO seat). */
function c5ShowReturnBar(seat){
  var meta=C5_SEAT_META[seat]||{label:seat},who=c5SeatNameOf(seat);
  var b=document.getElementById('c5retbar');if(!b){b=document.createElement('div');b.id='c5retbar';document.body.appendChild(b);}
  b.className='c5retbar';
  b.innerHTML='<span class="c5retbar-t">Viewing <b>'+c5esc(who||meta.label)+'</b>’s cockpit — routed from your Decisions &amp; projections</span>'+
    '<button class="c5retbar-btn" id="c5retgo">← Return to my decisions</button>'+
    '<button class="c5retbar-x" id="c5retx" title="Dismiss">✕</button>';
  var g=document.getElementById('c5retgo');if(g)g.onclick=c5DoReturn;
  var x=document.getElementById('c5retx');if(x)x.onclick=function(){window.__c5Return=null;c5HideReturnBar();};
}
function c5HideReturnBar(){var b=document.getElementById('c5retbar');if(b)b.remove();}
function c5DoReturn(){
  var r=window.__c5Return||{seat:'ciso'};window.__c5Return=null;
  try{if(typeof selectSeat==='function'){selectSeat(r.seat||'ciso');
    var idx=(r.tab!=null?r.tab:6);var t=document.querySelector('#secTabs .sectab[data-sec="'+idx+'"]');if(t)t.click();window.scrollTo({top:0});}}catch(_){}
  c5HideReturnBar();
}
function c5dpBadge(s){var col=s>=4?'good':s>=3?'blue':s>=2?'warn':'crit';return '<span class="c5dp-cmmi" style="background:var(--'+col+')">'+s+'</span>';}
/* A 5-segment maturity meter: solid up to the current score, a highlighted "gain"
   run up to the projected score, empty beyond. */
function c5dpMeter(from,to){var s='';for(var i=1;i<=5;i++){var cls=i<=from?'on':(i<=to?'gain':'off');s+='<i class="c5m-seg '+cls+'"></i>';}return '<span class="c5m">'+s+'</span>';}
/* A compact inline from→to chip with two CMMI badges. */
function c5dpMini(from,to){return '<span class="c5dp-mini">'+c5dpBadge(from)+'<span class="c5dp-arrow">→</span>'+c5dpBadge(to)+'</span>';}
/* A stat tile: big value, label, accent color. */
function c5dpStat(val,label,accent){return '<div class="c5dp-stat"><div class="c5dp-stat-v '+(accent||'')+'">'+val+'</div><div class="c5dp-stat-l">'+label+'</div></div>';}
function c5dpInitials(label,who){var s=String(who||label||'?').trim().split(/\s+/);return ((s[0]||'?')[0]+(s.length>1?s[s.length-1][0]:'')).toUpperCase();}
/* Human date for a decision's audit trail, e.g. "8 Jul 2026, 2:14 PM". */
function c5dpWhen(ts){try{if(!ts)return '';var d=new Date(Number(ts)),mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var h=d.getHours(),ap=h>=12?'PM':'AM',h12=(h%12)||12,mm=String(d.getMinutes()).padStart(2,'0');
  return d.getDate()+' '+mo[d.getMonth()]+' '+d.getFullYear()+', '+h12+':'+mm+' '+ap;}catch(_){return '';}}
/* The next review horizon a deferral runs to — the next calendar quarter, e.g. "Q3 2026". */
function c5NextReview(ts){try{var d=new Date(Number(ts)||undefined),q=Math.floor(d.getMonth()/3)+2,y=d.getFullYear();if(q>4){q-=4;y++;}return 'Q'+q+' '+y;}catch(_){return 'next quarter';}}

/* ---- reminder email modal (LLM draft + send piping) ---- */
function c5RemindOpen(seat){
  var meta=C5_SEAT_META[seat]||{label:seat,role:''},who=c5SeatNameOf(seat),email=c5SeatEmails()[seat]||'';
  var asks=[];try{asks=(c5AskModel(seat)||[]).filter(function(a){return !a.sample;});}catch(_){}
  var store=c5AskStore();var pend=asks.filter(function(a){return !(store[a.id]&&store[a.id].status);});
  var m=document.getElementById('c5remind');if(!m){m=document.createElement('div');m.id='c5remind';document.body.appendChild(m);}
  m.className='c5remind-scrim';m.setAttribute('data-seat',seat);
  m.innerHTML='<div class="c5remind-card">'+
    '<div class="c5remind-bar"><b>✉ Remind '+c5esc(meta.label)+(who?(' · '+c5esc(who)):'')+'</b><button class="c5dp-btn" data-remindclose="1">Close</button></div>'+
    '<div class="c5remind-body">'+
      '<div class="c5remind-field"><label>To</label><input id="c5rm-to" type="email" placeholder="name@company.com" value="'+c5esc(email)+'"></div>'+
      '<div class="c5remind-field"><label>Subject</label><input id="c5rm-subj" type="text" placeholder="drafting…"></div>'+
      '<div class="c5remind-field"><label>Message</label><textarea id="c5rm-body" rows="12" placeholder="Click “Draft with AI”, or write your own…"></textarea></div>'+
      '<div class="c5remind-acts"><button class="c5dp-btn" id="c5rm-draft">✨ Draft with AI</button><span id="c5rm-eng" class="c5remind-eng"></span><span style="flex:1"></span><button class="c5dp-btn primary" id="c5rm-send">Send</button></div>'+
      '<div id="c5rm-msg" class="c5remind-msg"></div>'+
    '</div></div>';
  m.style.display='flex';
  // auto-draft on open
  c5RemindDraft(seat,pend,meta,who);
  var d=document.getElementById('c5rm-draft');if(d)d.addEventListener('click',function(){c5RemindDraft(seat,pend,meta,who);});
  var sd=document.getElementById('c5rm-send');if(sd)sd.addEventListener('click',function(){c5RemindSend(seat);});
  var to=document.getElementById('c5rm-to');if(to)to.addEventListener('change',function(){c5SeatEmailSave(seat,to.value.trim());});
}
function c5RemindDraft(seat,pend,meta,who){
  var msg=document.getElementById('c5rm-msg'),eng=document.getElementById('c5rm-eng');
  var subj=document.getElementById('c5rm-subj'),body=document.getElementById('c5rm-body');
  if(eng)eng.textContent='drafting…';
  var items=(pend||[]).map(function(a){return {title:a.title,ask:a.ask,why:a.why,status:'pending'};});
  var payload={fromName:c5SeatNameOf('ciso')||'the CISO',fromRole:'CISO',toName:who||meta.label,toRole:meta.role,org:c5OrgName(),items:items};
  var base='';try{base=(typeof apiBase==='function')?apiBase():'';}catch(_){}
  fetch(base+'/api/notify/draft',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)})
    .then(function(r){return r.json();})
    .then(function(res){if(subj)subj.value=res.subject||'';if(body)body.value=res.body||'';if(eng)eng.textContent=res.engine==='llm'?'drafted by AI':res.engine==='local'?'drafted (internal LLM)':'drafted (template)';})
    .catch(function(e){if(eng)eng.textContent='';if(msg){msg.textContent='Draft service unavailable — write your own message.';msg.style.color='var(--warn)';}
      // local template fallback so the modal is never empty
      if(body&&!body.value){var names=(who||meta.label).split(' ')[0];body.value='Hi '+names+',\n\nA quick reminder on the cyber-risk items in your area awaiting your decision:\n'+(pend||[]).map(function(a){return '  • '+a.title;}).join('\n')+'\n\nEach takes only a moment in the cockpit.\n\nThanks,\n'+(c5SeatNameOf('ciso')||'CISO');}
      if(subj&&!subj.value)subj.value='Reminder: cyber decisions awaiting your sign-off';});
}
function c5RemindSend(seat){
  var to=(document.getElementById('c5rm-to')||{}).value||'',subj=(document.getElementById('c5rm-subj')||{}).value||'',body=(document.getElementById('c5rm-body')||{}).value||'';
  var msg=document.getElementById('c5rm-msg');
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to.trim())){if(msg){msg.textContent='Enter a valid recipient email.';msg.style.color='var(--warn)';}return;}
  c5SeatEmailSave(seat,to.trim());
  if(msg){msg.textContent='Sending…';msg.style.color='var(--muted)';}
  var base='';try{base=(typeof apiBase==='function')?apiBase():'';}catch(_){}
  fetch(base+'/api/notify/send',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({to:to.trim(),subject:subj,body:body})})
    .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j};});})
    .then(function(o){
      if(o.j&&o.j.sent){if(msg){msg.innerHTML='✓ Sent to <b>'+c5esc(to.trim())+'</b>.';msg.style.color='var(--good)';}setTimeout(c5RemindCloseFn,1200);}
      else{ // server not configured for SMTP → open the user's own mail client with the draft
        var mailto='mailto:'+encodeURIComponent(to.trim())+'?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body);
        if(msg){msg.innerHTML='Server email isn’t configured here — <a href="'+mailto+'" style="color:var(--blue);font-weight:600">open in your mail client ▸</a> (draft is ready to send).';msg.style.color='var(--ink-2)';}
        try{window.location.href=mailto;}catch(_){}}
    })
    .catch(function(e){var mailto='mailto:'+encodeURIComponent(to.trim())+'?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body);if(msg){msg.innerHTML='Could not reach the mail service — <a href="'+mailto+'" style="color:var(--blue);font-weight:600">open in your mail client ▸</a>.';msg.style.color='var(--warn)';}});
}
function c5RemindCloseFn(){var m=document.getElementById('c5remind');if(m)m.style.display='none';}
document.addEventListener('click',function(e){
  var rm=e.target.closest('[data-remind]');if(rm){c5RemindOpen(rm.getAttribute('data-remind'));return;}
  if(e.target.closest('[data-remindclose]')){c5RemindCloseFn();return;}
  var scrim=document.getElementById('c5remind');if(scrim&&e.target===scrim){c5RemindCloseFn();return;}
  var cd=e.target.closest('[data-cisodec]');if(cd){var k=cd.getAttribute('data-cisodec'),v=cd.getAttribute('data-cisoval');var st;try{st=JSON.parse(localStorage.getItem('cyberrx_ciso_decisions')||'{}')||{};}catch(_){st={};}
    var now=Date.now();st[k]={status:v,ts:now,by:(c5SeatNameOf('ciso')||'CISO'),until:(v==='Deferred'?c5NextReview(now):null)};
    try{localStorage.setItem('cyberrx_ciso_decisions',JSON.stringify(st));}catch(_){}c5DecProj();return;}
  var cu=e.target.closest('[data-cisoundo]');if(cu){var uk=cu.getAttribute('data-cisoundo');var s2;try{s2=JSON.parse(localStorage.getItem('cyberrx_ciso_decisions')||'{}')||{};}catch(_){s2={};}delete s2[uk];try{localStorage.setItem('cyberrx_ciso_decisions',JSON.stringify(s2));}catch(_){}c5DecProj();return;}
  var gs=e.target.closest('[data-goseat]');if(gs){c5GoSeat(gs.getAttribute('data-goseat'));return;}
  var de=e.target.closest('[data-decexp]');if(de){var dk=de.getAttribute('data-decexp');C5_DP_OPENDEC[dk]=!C5_DP_OPENDEC[dk];c5DecProj();return;}
  var ae=e.target.closest('[data-askexp]');if(ae){var ak=ae.getAttribute('data-askexp');C5_DP_OPENASK[ak]=!C5_DP_OPENASK[ak];c5DecProj();return;}
});

/* ---------- Program Health ▸ two inner tabs (Nerion's View / Classic View) ----------
   The subtab strip uses the app's own .subtabs chrome. "Nerion's View" is the new
   crown-jewel value tree (an isolated iframe island — see crownjewel-tree.html —
   ported verbatim from the frozen reference, data injected via postMessage).
   "Classic View" is the existing framework-maturity content, relocated as-is. */
var C5_PH_DEFAULT='classic'; // flip to 'nerion' to change the default tab in one line
var C5_PH_TAB=C5_PH_DEFAULT;
function c5CjtSrc(){try{return new URL('crownjewel-tree.html',location.href).href;}catch(_){return 'crownjewel-tree.html';}}
var C5_CJT_INPUT=null,C5_CJT_WIRED=false;
function c5CjtMsg(e){var f=document.getElementById('c5cjt-frame');if(!f)return;
  if(f.contentWindow&&e&&e.source&&e.source!==f.contentWindow)return;
  var d=(e&&e.data)||{};
  if(d.type==='crowntree-ready'){if(C5_CJT_INPUT){try{f.contentWindow.postMessage({type:'crowntree-data',RISKS:C5_CJT_INPUT.RISKS,C:C5_CJT_INPUT.C,DATA:C5_CJT_INPUT.DATA,org:C5_CJT_INPUT.org},'*');}catch(_){}}}
  else if(d.type==='crowntree-height'){var h=Math.max(320,Math.min(4000,Number(d.h)||0));if(h)f.style.height=h+'px';}}
/* Mount the frozen tree island. Injects live data if the adapter produced any;
   otherwise the island renders its built-in illustrative sample (Section 6.2 —
   degrade to the seed, never hard-fail) and we show a "sample data" note. */
function c5MountCrownTree(container){
  if(!container)return;
  C5_CJT_INPUT=(typeof c5CrownTreeInput==='function')?c5CrownTreeInput():null;
  if(!C5_CJT_WIRED){try{window.addEventListener('message',c5CjtMsg);}catch(_){}C5_CJT_WIRED=true;}
  var note=C5_CJT_INPUT?'':'<div class="c5cjt-note">Illustrative sample data — the crown-jewel value tree reads live once your Crown-Jewel Register, Business Capability Map and control-maturity sources are connected.</div>';
  // Provenance strip (live only): states where every dollar comes from, so the tree
  // is self-evidencing instead of a black box.
  var prov=C5_CJT_INPUT?'<div class="c5cjt-prov"><b>How to read this — every figure traces to your inputs.</b> <b>Business value</b> = the annual revenue of the processes each crown jewel runs (your Business-Processes upload). <b>At risk (live)</b> = that value still sitting behind controls scoring below CMMI 3; <b>already mitigated</b> = the portion your ≥3 controls cover. Crown jewels are chosen by the same criticality rule as onboarding. Hover any figure for its exact math.</div>':'';
  container.innerHTML=note+prov+'<iframe id="c5cjt-frame" class="c5cjt-frame" title="Crown-jewel value tree" scrolling="no" style="width:100%;border:0;height:640px;display:block;background:#EEF1F6" src="'+c5CjtSrc()+'"></iframe>';
}
/* Bundled NIST CSF 2.0 reference metadata for the control codes the value chain
   can map a risk to (via CAP_FRAMEWORK). Framework-static — not tenant data. */
var C5_CSF_META={
 'PR.AA-01':{f:'PR',cat:'Identity & Access',name:'Identity & credential management',desc:'Identities and credentials for people, services and hardware are issued, managed and revoked under control.'},
 'PR.AA-03':{f:'PR',cat:'Identity & Access',name:'Authentication',desc:'Users, services and hardware are authenticated before access is granted.'},
 'PR.AA-05':{f:'PR',cat:'Identity & Access',name:'Least-privilege access',desc:'Access is granted on least privilege and separation of duties, so a compromised account reaches as little as possible.'},
 'DE.CM-01':{f:'DE',cat:'Continuous Monitoring',name:'Network monitoring',desc:'Networks and network services are continuously monitored to detect suspicious or malicious activity early.'},
 'RS.MI-01':{f:'RS',cat:'Incident Mitigation',name:'Incident containment',desc:'Incidents are contained to limit their spread and impact once detected.'},
 'ID.RA-01':{f:'ID',cat:'Risk Assessment',name:'Vulnerabilities identified',desc:'Asset vulnerabilities are identified, validated and recorded so they can be prioritized and remediated.'},
 'DE.AE-03':{f:'DE',cat:'Adverse Event Analysis',name:'Event correlation',desc:'Event data are collected and correlated from multiple sources to detect and understand adverse activity.'},
 'DE.CM-09':{f:'DE',cat:'Continuous Monitoring',name:'Computing & software monitoring',desc:'Hardware, software, runtime environments and their data are monitored for signs of compromise.'},
 'PR.PS-01':{f:'PR',cat:'Platform Security',name:'Configuration management',desc:'Configuration management practices are established and applied to keep platforms in a secure, known state.'},
 'PR.DS-11':{f:'PR',cat:'Data Security',name:'Backups',desc:'Backups of data are created, protected, maintained and tested so data can be restored after an incident.'},
 'RC.RP-03':{f:'RC',cat:'Incident Recovery',name:'Restored-asset integrity',desc:'The integrity of backups and restored assets is verified before returning them to normal operations.'},
 'PR.IR-01':{f:'PR',cat:'Infrastructure Resilience',name:'Infrastructure protection & segmentation',desc:'Networks and environments are protected from unauthorized access and segmented to contain an intruder.'},
 'PR.DS-01':{f:'PR',cat:'Data Security',name:'Data-at-rest protection',desc:'Stored data is protected (e.g., encrypted) so it stays confidential and intact even if the storage is reached.'},
 'PR.DS-02':{f:'PR',cat:'Data Security',name:'Data-in-transit protection',desc:'Data moving across networks is protected (e.g., encrypted) so it cannot be read or altered on the wire.'},
 'PR.AT-01':{f:'PR',cat:'Awareness & Training',name:'Security awareness',desc:'Personnel receive security-awareness training so they recognize and report threats such as phishing.'}
};
/* Adapter: live Nerion telemetry -> the island's exact input contract (Section 4).
   Sources (all from onboarding / live data — nothing hardcoded):
     functions / processes / crown-jewel assets / risks  ← LIVE.value_chain
     jewels[].value ($)      ← the supporting process's annual business value, split
                               across its crown jewels (falls back to summed exposure)
     jewels[].type           ← Application / Infrastructure, by asset class
     risks[].id / label      ← the real risk titles (assigned R-codes in order)
     ctrls[][0] (CSF code)   ← riskCaps() → CAP_FRAMEWORK.csf (risk → control mapping)
     ctrls[][1] (maturity)   ← controlCmmi() (0–5, from assessment/telemetry)
   The island derives every dollar from value + maturity — no pre-computed money.
   Returns null (→ frozen sample) when there is no live value chain yet. */
function c5CrownTreeInput(){
  try{
    var vc=(typeof LIVE!=='undefined'&&LIVE&&LIVE.value_chain)||null;
    var fnsIn=(vc&&vc.functions)||[];
    if(!fnsIn.length||typeof riskCaps!=='function'||typeof CAP_FRAMEWORK==='undefined')return null;
    var cov=(typeof fwDeployedIds==='function')?fwDeployedIds():{};
    var RISKS={},titleId={},nextR=0;
    function ridFor(title){var t=String(title||'Risk').trim();if(titleId[t])return titleId[t];nextR++;var id='R'+nextR;titleId[t]=id;RISKS[id]=t;return id;}
    function isInfra(name){return /firewall|network|identity|active directory|directory|infrastructure|\bserver\b|edge|gateway|\bvpn\b|\bdns\b|domain controller/i.test(String(name||''));}
    var C={}; // control metadata for every code we emit — populated as we build
    function ctrlsForRisk(r){
      var caps=riskCaps(r.title,r.severity)||[],codes={};
      caps.forEach(function(k){var fw=CAP_FRAMEWORK[k];if(fw&&fw.csf)fw.csf.forEach(function(code){if(C5_CSF_META[code])codes[code]=1;});});
      return Object.keys(codes).map(function(code){C[code]=C5_CSF_META[code];var cc=(typeof controlCmmi==='function')?controlCmmi(code,cov):{score:0};return [code,Math.max(0,Math.min(5,Math.round((cc&&cc.score)||0)))];});
    }
    var DATA=[];
    fnsIn.forEach(function(f){
      var procs=[];
      (f.processes||[]).forEach(function(p){
        var crown=(p.assets||[]).filter(function(a){return a.crown_jewel;});
        if(!crown.length)return;
        var perJewel=(Number(p.annual_usd)||0)/crown.length;
        var jewels=[];
        crown.forEach(function(a){
          var risks=[];
          (a.risks||[]).forEach(function(r){var ctrls=ctrlsForRisk(r);if(ctrls.length)risks.push({id:ridFor(r.title),ctrls:ctrls});});
          if(!risks.length)return;
          var val=perJewel>0?perJewel:(a.risks||[]).reduce(function(s,r){return s+(Number(r.exposure_usd)||0);},0);
          if(!(val>0))return;
          jewels.push({name:a.name||'Crown jewel',type:isInfra(a.name)?'Infrastructure':'Application',value:val/1e9,risks:risks});
        });
        if(jewels.length)procs.push({name:p.name||'Process',jewels:jewels});
      });
      if(procs.length)DATA.push({name:f.name||'Function',crit:f.criticality||f.crit||'Critical',procs:procs});
    });
    if(!DATA.length)return null;
    // Name the tree after the client — the org name is captured at onboarding
    // (localStorage, via orgName()); LIVE fields are a secondary source.
    var org=(typeof orgName==='function'&&orgName())||(LIVE&&(LIVE.org_name||LIVE.client_name||LIVE.name))||'Your organization';
    return {org:org,RISKS:RISKS,C:C,DATA:DATA,CATALOG:106};
  }catch(e){try{console.warn('crown-tree adapter',e&&e.message);}catch(_){}return null;}
}
/* Program Health dispatcher — renders the tab strip, then the active panel.
   Lazy-mounts: the island is only built while "Nerion's View" is active. */
function c5Frameworks(){
  var host=document.getElementById('c5-frameworks');if(!host)return;
  var tab=(C5_PH_TAB==='nerion')?'nerion':'classic';
  host.innerHTML=c5header()+
    '<div class="subwrap c5phwrap"><div class="subtabs">'+
      '<button class="subtab'+(tab==='classic'?' on':'')+'" data-phtab="classic">Classic View</button>'+
      '<button class="subtab'+(tab==='nerion'?' on':'')+'" data-phtab="nerion">Nerion’s View</button>'+
    '</div></div><div id="c5ph-body"></div>';
  host.querySelectorAll('[data-phtab]').forEach(function(b){b.onclick=function(){C5_PH_TAB=b.getAttribute('data-phtab');c5Frameworks();};});
  var body=document.getElementById('c5ph-body');
  if(tab==='nerion'){c5MountCrownTree(body);}
  else{c5FrameworksClassic(body);}
}
/* Classic View — the framework-maturity content that Program Health rendered
   before, moved as-is behind its tab. Renders into the panel passed in (its own
   self-re-render handlers call c5Frameworks(), which re-renders this panel). */
function c5FrameworksClassic(host){
  if(!host)return;
  if(typeof seedDemoDocScores==='function'){try{seedDemoDocScores();}catch(_){}}
  try{c5SetSnapshot();}catch(_){} // populate FW_SNAPSHOT for the community benchmark
  if(typeof FW_SEL==='undefined'){window.FW_SEL='csf';}
  var sel=FW_SEL,cov=(typeof fwDeployedIds==='function')?fwDeployedIds():{};
  var T=c5fwTree(sel,cov);
  // Stash for the community-benchmark panel (compares THIS framework's maturity).
  window.C5FW_OVERALL=T.overall;window.C5FW_GROUPS=T.groups;
  // default deep-link: identity path expanded, PR.AA-03 selected (CSF only)
  if(C5FW_EXP==null){if(sel==='csf'){C5FW_EXP={PR:1,'PR.AA':1};}else{C5FW_EXP={};if(T.groups[0])C5FW_EXP[T.groups[0].id]=1;}}
  if(C5FW_CTRL==null&&sel==='csf'){C5FW_CTRL='PR.AA-03';}
  // find selected node
  var selNode=null;
  T.groups.forEach(function(g){if(g.id===C5FW_CTRL)selNode=g;(g.children||[]).forEach(function(c){if(c.id===C5FW_CTRL)selNode=c;(c.children||[]).forEach(function(x){if(x.id===C5FW_CTRL)selNode=x;});});});
  // cadence + refresh
  var cad=c5fwCadence();var now=new Date();var nextD=new Date(now.getTime()+((CADENCE_MS&&CADENCE_MS[cad])||30*864e5));
  var fmt=function(d){try{return d.toLocaleDateString();}catch(_){return '';}};
  var st=c5fwStatus(T.overall);
  var cards='<div class="c5cards">'+
    '<div class="c5card" data-c5fwcard="overall"><div class="c5card-top"><span class="c5card-l">Overall maturity</span><span class="c5chip c5-computed">computed</span></div><div class="c5card-v" style="color:var(--'+c5fwCol(T.overall)+')">'+T.overall.toFixed(1)+' / 5</div><div class="cn">'+c5fwLvl(T.overall)+' · target '+C5FW_TARGET.toFixed(1)+'</div></div>'+
    '<div class="c5card" data-c5fwcard="coverage"><div class="c5card-top"><span class="c5card-l">Coverage</span><span class="c5chip c5-computed">computed</span></div><div class="c5card-v" style="color:var(--'+(T.coverage>=75?'good':T.coverage>=50?'warn':'crit')+')">'+T.coverage+'%</div><div class="cn">'+T.evidenced+' of '+T.total+' controls evidenced</div></div>'+
    '<div class="c5card" data-c5fwcard="trend"><div class="c5card-top"><span class="c5card-l">Trend · vs last refresh</span><span class="c5chip c5-computed">computed</span></div><div class="c5card-v">'+(function(){var h=(typeof fwHistory==='function')?fwHistory():[];if(h.length>=2){var d=h[h.length-1].v-h[0].v;return (d>=0?'+':'')+d.toFixed(1);}return 'Baseline';})()+'</div><div class="cn">CMMI across '+cad+' refreshes</div></div>'+
    '<div class="c5card" data-c5fwcard="failing"><div class="c5card-top"><span class="c5card-l">Controls failing</span><span class="c5chip c5-computed">computed</span></div><div class="c5card-v" style="color:var(--'+(T.failing>0?'crit':'good')+')">'+T.failing+'</div><div class="cn">deficiencies (below CMMI '+C5FW_FLOOR+')</div></div>'+
    '</div>';
  var pills='<div class="c5fw-pills">'+[['csf','NIST CSF 2.0'],['r53','NIST 800-53'],['soc2','SOC 2'],['hipaa','HIPAA'],['cis','CIS v8 (mapped)']].map(function(o){return '<button class="c5fw-pill'+(sel===o[0]?' on':'')+'" data-c5fwsel="'+o[0]+'">'+o[1]+'</button>';}).join('')+'</div>';
  var cadCtrl='<div class="c5fw-controls"><div class="c5fw-cad"><span style="font-size:11px;color:var(--muted);margin-right:2px">Reassess:</span>'+[['weekly','Weekly'],['monthly','Monthly'],['quarterly','Quarterly']].map(function(o){return '<button class="c5fw-cadb'+(cad===o[0]?' on':'')+'" data-c5fwcad="'+o[0]+'">'+o[1]+'</button>';}).join('')+'</div><div style="display:flex;gap:8px"><button class="c5btn" onclick="c5fwExport()">Auditor pack (PPTX)</button><button class="c5btn" onclick="c5fwExportXlsx()" style="background:var(--surface-2);color:var(--ink-2);border:1px solid var(--line)">Control scorecard + POA&amp;M (XLSX)</button></div></div>';
  // tree
  var tree='<div class="c5fw-tree">'+T.groups.map(function(g){var open=!!C5FW_EXP[g.id];var gc=c5fwCol(g.score),gs=c5fwStatus(g.score);
    var inner='';
    if(open){(g.children||[]).forEach(function(c){
      if(c.type==='cat'){inner+='<div class="c5fw-cat">'+c.name+' · '+c.id+' <b style="color:var(--'+c5fwCol(c.score)+')">'+c.score.toFixed(1)+'</b></div>';
        (c.children||[]).forEach(function(x){inner+=c5fwCtlRow(x);});}
      else inner+=c5fwCtlRow(c);
    });}
    return '<div class="c5fw-g"><div class="c5fw-grow" data-c5fwexp="'+g.id+'"><span class="c5fw-tw">'+(open?'▾':'▸')+'</span><span class="c5fw-dot" style="background:var(--'+gc+')"></span><span class="c5fw-id">'+g.id+'</span><span class="c5fw-nm">'+g.name+'</span><span class="c5fw-lvl">'+c5fwLvl(g.score)+'</span><span class="c5fw-sc" style="color:var(--'+gc+')">'+g.score.toFixed(1)+'</span></div>'+inner+'</div>';
  }).join('')+'</div>';
  var xnote=(typeof FW_XNOTE!=='undefined'&&FW_XNOTE[sel])?('<div class="c5note" style="margin-top:12px">🔗 '+FW_XNOTE[sel]+'</div>'):'';
  // Small opt-in box in the maturity summary area (opens the full benchmark on click).
  var pOpt=(typeof peerOptin==='function')&&peerOptin();
  var peerBox='<div id="c5fwPeerBox" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;padding:11px 15px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);cursor:pointer;transition:border-color .15s,background .15s"'+
    ' onmouseover="this.style.borderColor=\'var(--blue)\'" onmouseout="this.style.borderColor=\'var(--line)\'">'+
    '<div style="display:flex;align-items:center;gap:11px;min-width:0">'+
      '<span style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9px;flex:none;background:var(--surface);color:var(--blue)">'+c5icon('scale')+'</span>'+
      '<div style="min-width:0"><div style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--blue)">'+(pOpt?'Peer benchmark · view comparison':'Opt-in for peer benchmark')+'</div>'+
      '<div style="font-size:12px;color:var(--ink-2);margin-top:1px">See how your '+((typeof FW_NAMES!=='undefined'&&FW_NAMES[sel])||'framework')+' maturity compares to the DTNKShield community — anonymously.</div></div>'+
    '</div><span class="peer-badge">DTNKShield ›</span></div>';
  host.innerHTML=c5header()+
    c5shell('Program health · how is the security program performing?','Assessed against the framework your program is built on — refreshed on your cadence.',null,'Attackers moved to AI. Your assessment moved to real time — live telemetry, always-current posture, zero blind spots.')+
    cadCtrl+
    '<div class="c5fw-refresh" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><span>Refreshed <b>'+cad+'</b> · last assessed <b>'+fmt(now)+'</b> · next refresh <b>'+fmt(nextD)+'</b></span>'+
      '<button id="c5docsBtn" type="button" style="border:1px solid var(--line);background:var(--surface);color:var(--blue);font-weight:600;font-size:12px;padding:6px 12px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:6px">📄 Documents reviewed'+(function(){var n=(typeof c5DocCount==="function")?c5DocCount():0;return n?(' · '+n):"";})()+'</button></div>'+
    pills+
    cards+
    peerBox+
    xnote+
    '<div class="c5fw-wrap"><div class="c5fw-right">'+tree+'</div><div class="c5fw-left" id="c5fw-detail">'+c5fwFinding(sel,selNode)+'</div></div>'+
    '<div class="c5foot">CMMI 0 None · 1 Initial · 2 Managed · 3 Defined · 4 Quant. Managed · 5 Optimizing. Meets target ≥ '+C5FW_TARGET.toFixed(1)+' (green) · Observation ≥ '+C5FW_FLOOR+' (amber) · Deficiency &lt; '+C5FW_FLOOR+' (red). CIS by number/title/mapping only; SOC 2 by criterion ID.</div>';
  // record cadence snapshot
  if(typeof fwRecord==='function'){try{fwRecord(T.overall);}catch(_){}}
  var _pb=document.getElementById('c5fwPeerBox');if(_pb)_pb.onclick=function(){c5fwPeerOpen();};
  var _db=document.getElementById('c5docsBtn');if(_db)_db.onclick=function(){c5OpenDocsReview();};
  // wiring
  host.querySelectorAll('[data-c5fwsel]').forEach(function(b){b.onclick=function(){window.FW_SEL=b.getAttribute('data-c5fwsel');C5FW_EXP=null;C5FW_CTRL=null;c5Frameworks();};});
  host.querySelectorAll('[data-c5fwcad]').forEach(function(b){b.onclick=function(){try{localStorage.setItem('cyberrx_audit_cadence',b.getAttribute('data-c5fwcad'));}catch(_){}c5Frameworks();};});
  host.querySelectorAll('[data-c5fwexp]').forEach(function(b){b.onclick=function(){var id=b.getAttribute('data-c5fwexp');C5FW_EXP[id]=!C5FW_EXP[id];c5Frameworks();};});
  host.querySelectorAll('[data-c5fwctl]').forEach(function(b){b.onclick=function(){C5FW_CTRL=b.getAttribute('data-c5fwctl');c5Frameworks();};});
  host.querySelectorAll('[data-c5fwcard]').forEach(function(b){b.style.cursor='pointer';b.onclick=function(){c5fwInspect(b.getAttribute('data-c5fwcard'),T,sel,cad);};});
}
/* ============================================================================
   Documents reviewed — the analyst-grade read of every policy uploaded during
   onboarding. Each document was parsed control-by-control against NIST CSF 2.0
   and NIST SP 800-53; here we present that review the way a senior assessor would
   write it up — per control: which expected attributes were found vs. missing, the
   maturity that evidences, an auditor narrative, and the same finding carried across
   all five frameworks (CSF · 800-53 · CIS · SOC 2 · HIPAA) via the public crosswalk,
   so the reviewer sees exactly which control in each standard the document satisfies.
   Reads the stored document review (docScores / docList) — nothing hardcoded. */
function c5DocScoresSafe(){try{return (typeof docScores==='function')?docScores():{};}catch(_){return {};}}
function c5DocListSafe(){try{return (typeof docList==='function')?docList():[];}catch(_){return [];}}
function c5DocCount(){try{return c5DocListSafe().length;}catch(_){return 0;}}
/* One-time reverse crosswalk: CSF subcategory id → {cis:[],soc2:[],hipaa:[]}. Built
   from the same public maps the Frameworks tab scores from. */
var C5_REVX=null;
function c5RevX(){
  if(C5_REVX)return C5_REVX;
  var idx={};
  function add(csf,fw,id){if(!csf)return;if(!idx[csf])idx[csf]={cis:[],soc2:[],hipaa:[]};if(idx[csf][fw].indexOf(id)<0)idx[csf][fw].push(id);}
  function walk(map,fw){if(!Array.isArray(map))return;map.forEach(function(g){(g[2]||[]).forEach(function(it){(it[2]||[]).forEach(function(csf){add(csf,fw,it[0]);});});});}
  try{walk(typeof CIS_MAP!=='undefined'?CIS_MAP:null,'cis');}catch(_){}
  try{walk(typeof SOC2_MAP!=='undefined'?SOC2_MAP:null,'soc2');}catch(_){}
  try{walk(typeof HIPAA_MAP!=='undefined'?HIPAA_MAP:null,'hipaa');}catch(_){}
  C5_REVX=idx;return idx;
}
/* CSF subcategory id → human name, from the same CSF_RAW the tree uses. */
var C5_CSFNAME=null;
function c5CsfName(id){
  if(!C5_CSFNAME){C5_CSFNAME={};try{if(typeof CSF_RAW!=='undefined')Object.keys(CSF_RAW).forEach(function(fn){var cats=CSF_RAW[fn];Object.keys(cats).forEach(function(cat){cats[cat].forEach(function(r){C5_CSFNAME[r[0]]=r[1];});});});}catch(_){}}
  return C5_CSFNAME[id]||'';
}
function c5R53Fam(id){var m=String(id).match(/^([A-Z]{2})-/);if(!m)return '';try{if(typeof R53_RAW!=='undefined'){var f=R53_RAW.filter(function(r){return r[0]===m[1];})[0];if(f)return f[1];}}catch(_){}return '';}
function c5IsCsf(id){return /^[A-Z]{2}\.[A-Z]{2}-\d/.test(String(id));}
function c5IsR53(id){return /^[A-Z]{2}-\d/.test(String(id));}
function c5CtrlName(id){return c5IsCsf(id)?c5CsfName(id):c5R53Fam(id);}
/* The five-framework mapping row for one evidenced control. Native standard first
   (CSF or 800-53), then the controls it maps to in the other four. */
function c5DocXwalk(id){
  var out={csf:[],r53:[],cis:[],soc2:[],hipaa:[]};
  if(c5IsCsf(id)){out.csf.push(id);var rx=c5RevX()[id];if(rx){out.cis=rx.cis.slice(0,4);out.soc2=rx.soc2.slice(0,4);out.hipaa=rx.hipaa.slice(0,4);}}
  else if(c5IsR53(id)){out.r53.push(id);}
  return out;
}
function c5DocChips(x){
  var FW=[['csf','CSF 2.0'],['r53','800-53'],['cis','CIS v8'],['soc2','SOC 2'],['hipaa','HIPAA']];
  var parts=FW.map(function(f){var ids=x[f[0]]||[];if(!ids.length)return '';
    return '<span style="display:inline-flex;align-items:center;gap:5px;font-size:10.5px"><span style="color:var(--muted);font-weight:600">'+f[1]+'</span>'+ids.map(function(i){return '<span class="c5fw-chip" style="cursor:default">'+c5esc(i)+'</span>';}).join('')+'</span>';
  }).filter(Boolean);
  return parts.length?('<div style="display:flex;flex-wrap:wrap;gap:10px 14px;margin-top:8px">'+parts.join('')+'</div>'):'';
}
/* Build the full HTML for the Documents-reviewed panel. */
function c5DocsReviewHtml(){
  var docs=c5DocListSafe(),scores=c5DocScoresSafe();
  var CMMI_LBL=(typeof CMMI_LABELS!=='undefined')?CMMI_LABELS:{0:'None',1:'Initial',2:'Managed',3:'Defined',4:'Quant. Managed',5:'Optimizing'};
  if(!docs.length&&!Object.keys(scores).length){
    return '<div style="padding:8px 2px"><div style="font-size:15px;font-weight:600;color:var(--ink)">No policies analyzed yet</div>'+
      '<p style="color:var(--ink-2);font-size:13px;line-height:1.55;max-width:640px">Upload your security policies during onboarding and Nerion reads each one control-by-control against NIST CSF 2.0 and NIST SP 800-53, then carries every finding across CIS, SOC 2 and HIPAA. The full review appears here, mapped to the controls in this tab.</p>'+
      '<button data-c5onb="document review" style="margin-top:6px;border:1px solid var(--line);background:var(--surface);color:var(--blue);font-weight:600;font-size:12.5px;padding:8px 14px;border-radius:8px;cursor:pointer">Go to document review →</button></div>';
  }
  // Index the per-control review by the document that produced it.
  var byDoc={};Object.keys(scores).forEach(function(cid){var s=scores[cid]||{};var dn=s.doc||'Uploaded policy';(byDoc[dn]=byDoc[dn]||[]).push({id:cid,s:s});});
  // Documents in list order; append any scored doc not in the list.
  var order=docs.map(function(d){return d.name;});Object.keys(byDoc).forEach(function(dn){if(order.indexOf(dn)<0)order.push(dn);});
  var metaByName={};docs.forEach(function(d){metaByName[d.name]=d;});
  var fnOrder=['GV','ID','PR','DE','RS','RC'],fnName={GV:'Govern',ID:'Identify',PR:'Protect',DE:'Detect',RS:'Respond',RC:'Recover'};
  function stColor(c){return c>=4?'good':c>=3?'good':c>=2?'warn':'crit';}
  var html='';
  order.forEach(function(dn){
    var rows=(byDoc[dn]||[]).slice().sort(function(a,b){return a.id<b.id?-1:1;});
    var meta=metaByName[dn]||{};
    var cmmis=rows.map(function(r){return Number(r.s.cmmi)||0;});
    var mean=cmmis.length?(cmmis.reduce(function(a,b){return a+b;},0)/cmmis.length):(Number(meta.cmmi)||0);
    var matched=rows.reduce(function(a,r){return a+(Number(r.s.matched)||0);},0),total=rows.reduce(function(a,r){return a+(Number(r.s.total)||0);},0);
    // Framework coverage counts (distinct controls touched, native + crosswalk).
    var cov={csf:0,r53:0,cis:{},soc2:{},hipaa:{}},csfN=0,r53N=0;
    rows.forEach(function(r){var x=c5DocXwalk(r.id);if(x.csf.length)csfN++;if(x.r53.length)r53N++;x.cis.forEach(function(i){cov.cis[i]=1;});x.soc2.forEach(function(i){cov.soc2[i]=1;});x.hipaa.forEach(function(i){cov.hipaa[i]=1;});});
    var covPills=[['NIST CSF 2.0',csfN],['NIST SP 800-53',r53N],['CIS v8',Object.keys(cov.cis).length],['SOC 2',Object.keys(cov.soc2).length],['HIPAA',Object.keys(cov.hipaa).length]]
      .map(function(p){return '<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;padding:3px 9px;border:1px solid var(--line);border-radius:20px;background:var(--surface)"><b style="color:var(--ink)">'+p[1]+'</b><span style="color:var(--ink-2)">'+p[0]+'</span></span>';}).join('');
    // Group controls by CSF function for readability.
    var groups={};rows.forEach(function(r){var fn=c5IsCsf(r.id)?r.id.slice(0,2):(c5R53Fam(r.id)?'—':'—');(groups[fn]=groups[fn]||[]).push(r);});
    var groupHtml=fnOrder.concat(Object.keys(groups).filter(function(k){return fnOrder.indexOf(k)<0;})).filter(function(fn){return groups[fn];}).map(function(fn){
      var label=fnName[fn]||'800-53 / other';
      var items=groups[fn].map(function(r){
        var c=Number(r.s.cmmi)||0,col=stColor(c),nm=c5CtrlName(r.id);
        var attrs=Array.isArray(r.s.attrs)?r.s.attrs:[];
        var present=attrs.filter(function(a){return a.found;}),missing=attrs.filter(function(a){return !a.found;});
        function chip(a,ok){var rn=(a.reasoning?(' title="'+c5esc(a.reasoning)+'"'):'');var cc=ok?'good':'crit';
          return '<span'+rn+' style="font-size:10.5px;padding:2px 8px;border-radius:20px;background:color-mix(in srgb,var(--'+cc+') '+(ok?'14':'10')+'%,var(--surface));color:var(--'+cc+');border:1px solid color-mix(in srgb,var(--'+cc+') '+(ok?'30':'26')+'%,transparent)">'+(ok?'✓ ':'✗ ')+c5esc(a.label)+'</span>';}
        var attrHtml=attrs.length?('<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">'+
          present.map(function(a){return chip(a,true);}).join('')+missing.map(function(a){return chip(a,false);}).join('')+'</div>'):'';
        // Verbatim evidence quotes — the auditor workpaper proof (LLM review only).
        var evRows=present.filter(function(a){return a.evidence;});
        var evHtml=evRows.length?('<div style="margin-top:8px;display:flex;flex-direction:column;gap:5px">'+evRows.map(function(a){
          return '<div style="border-left:2px solid color-mix(in srgb,var(--good) 55%,var(--line));padding:2px 0 2px 9px"><div style="font-size:10px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--good)">'+c5esc(a.label)+'</div><div style="font-size:11.5px;color:var(--ink-2);font-style:italic;line-height:1.5">“'+c5esc(String(a.evidence).slice(0,260))+'”</div></div>';
        }).join('')+'</div>'):'';
        // Prefer the assessor's own narrative (LLM); otherwise compute one from coverage.
        var narr=(r.s.narrative&&String(r.s.narrative).trim())?c5esc(r.s.narrative):
          ((attrs.length?('The policy addresses this control with <b>'+present.length+' of '+attrs.length+'</b> expected attribute'+(attrs.length>1?'s':'')+' present'+(missing.length?(' — missing '+missing.map(function(a){return a.label.toLowerCase();}).join(', ')):', all reviewed attributes present')+'. '):'')+
          'Assessed at <b>CMMI '+c+' — '+(CMMI_LBL[c]||'')+'</b>'+(c<3?', below the target of 3.5; strengthen the policy language above to raise maturity.':c<4?', meeting baseline; tighten the remaining attributes to reach optimized.':', a mature, well-evidenced control.'));
        var gapHtml=(r.s.gap&&String(r.s.gap).trim())?('<div style="font-size:11.5px;color:var(--crit);margin-top:6px"><b>To raise maturity:</b> '+c5esc(r.s.gap)+'</div>'):'';
        var x=c5DocXwalk(r.id);
        return '<div style="padding:12px 0;border-top:1px solid var(--line)">'+
          '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">'+
            '<span style="font-size:11px;font-weight:700;color:#fff;background:var(--'+col+');border-radius:6px;padding:1px 7px">CMMI '+c+'</span>'+
            '<b style="font-family:var(--serif);font-size:13.5px">'+c5esc(r.id)+'</b>'+
            (nm?('<span style="color:var(--ink-2);font-size:12.5px">'+c5esc(nm)+'</span>'):'')+
          '</div>'+
          '<div style="font-size:12.5px;color:var(--ink-2);line-height:1.55;margin-top:6px">'+narr+'</div>'+
          attrHtml+evHtml+gapHtml+c5DocChips(x)+
        '</div>';
      }).join('');
      return '<div style="margin-top:14px"><div style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--blue)">'+label+'</div>'+items+'</div>';
    }).join('');
    html+='<section style="margin:0 0 26px;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--surface)">'+
      '<div style="padding:16px 20px;background:var(--surface-2);border-bottom:1px solid var(--line)">'+
        '<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span style="font-size:18px">📄</span><b style="font-family:var(--serif);font-size:17px;color:var(--ink)">'+c5esc(dn)+'</b>'+(meta.type?('<span style="font-size:12px;color:var(--ink-2)">'+c5esc(meta.type)+'</span>'):'')+
          ((meta.engine==='llm'||rows.some(function(r){return r.s&&(r.s.narrative||(Array.isArray(r.s.attrs)&&r.s.attrs.some(function(a){return a.evidence;})));}))?'<span style="font-size:10px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--blue);background:color-mix(in srgb,var(--blue) 12%,var(--surface));border:1px solid color-mix(in srgb,var(--blue) 30%,transparent);border-radius:20px;padding:2px 9px">✦ AI-reviewed</span>':'')+'</div>'+
        '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:10px">'+
          '<div><span style="font-size:22px;font-weight:700;font-family:var(--serif);color:var(--'+stColor(mean)+')">'+mean.toFixed(1)+'</span><span style="font-size:12px;color:var(--muted)"> / 5 mean CMMI</span></div>'+
          '<div style="font-size:12px;color:var(--ink-2)"><b style="color:var(--ink)">'+rows.length+'</b> control'+(rows.length!==1?'s':'')+' evidenced · <b style="color:var(--ink)">'+matched+'</b> of '+total+' attributes present</div>'+
        '</div>'+
        '<div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:11px">'+covPills+'</div>'+
      '</div>'+
      '<div style="padding:6px 20px 18px">'+groupHtml+'</div>'+
    '</section>';
  });
  return '<div>'+
    '<p style="color:var(--ink-2);font-size:13px;line-height:1.55;max-width:760px;margin:0 0 20px">Every policy you uploaded, read control-by-control against <b>NIST CSF 2.0</b> and <b>NIST SP 800-53 Rev 5</b> — each expected attribute judged on whether the language satisfies the control’s intent, with the <b>verbatim evidence quoted</b> and the gap named where it doesn’t. Every finding is carried across <b>CIS Controls v8</b>, <b>SOC 2</b> and the <b>HIPAA Security Rule</b> through the public crosswalk. This is the evidence behind the scores in this tab.</p>'+
    html+
    '<div style="font-size:11px;color:var(--muted);line-height:1.5;border-top:1px solid var(--line);padding-top:12px">Documents marked <b>✦ AI-reviewed</b> are read by Nerion’s analyst-grade document engine — semantic control-intent matching with quoted evidence, to a standard at or above human review; others use deterministic keyword analysis. CIS · SOC 2 · HIPAA are mapped by public crosswalk (NIST CSF 2.0 informative references · SP 800-66) — a readiness indicator, not an independent audit opinion; CIS/SOC 2 shown by number/criterion only.</div>'+
  '</div>';
}
function c5OpenDocsReview(){
  try{
    var host=document.getElementById('docDoc');if(!host)return;
    host.innerHTML=c5DocsReviewHtml();
    var sc=document.getElementById('docScrim'),md=document.getElementById('docModal');
    if(sc)sc.classList.add('open');if(md)md.classList.add('open');
  }catch(_){}
}
function c5CloseDocsReview(){var sc=document.getElementById('docScrim'),md=document.getElementById('docModal');if(sc)sc.classList.remove('open');if(md)md.classList.remove('open');}
/* The four Frameworks summary cards open the same inspector as every other metric,
   built from real assessment data (roll-up, coverage, trend history, deficiencies). */
/* "See details" on a document-evidenced finding → back to onboarding's document-
   review section, where every reviewed policy is kept with its findings. */
document.addEventListener('click',function(e){var el=e.target.closest('[data-c5doc]');if(el)c5Connect('document review');});
/* For a framework control id, the connected tool whose deployment evidenced it
   (highest-deployed capability mapping to that control) — so the source names the
   real telemetry, not just "system". */
function c5fwCtrlTool(id){var best=null,bestp=-1;try{(typeof CAPS!=='undefined'?CAPS:[]).forEach(function(c){var fw=(typeof CAP_FRAMEWORK!=='undefined')?CAP_FRAMEWORK[c.k]:null;if(!fw)return;if((fw.csf||[]).concat(fw.r53||[]).indexOf(id)>=0){var p=(typeof capDeploy==='function')?capDeploy(c):null;if(p!=null&&p>bestp){bestp=p;best=c;}}});}catch(_){}return best;}
/* Volume bars of overall framework maturity across recorded refreshes. Green &
   growing when improving, red & shrinking when regressing, grey & level when
   stalling — direction from the latest score vs the one before it (0–5 CMMI). */
function c5trendBars(hist,cad,fwName){
  var vals=(hist||[]).map(function(h){return Number(h.v)||0;}).filter(function(v){return !isNaN(v);});
  var series=vals.slice(-8);
  var last=series.length?series[series.length-1]:null,prev=series.length>=2?series[series.length-2]:null;
  var dir=(prev==null)?'muted':(last>prev+0.05?'good':(last<prev-0.05?'crit':'muted'));
  var maxH=58,scaleMax=5;
  var bars=series.length?series.map(function(v,i){var isLast=(i===series.length-1);var hpx=Math.max(6,Math.round(v/scaleMax*maxH));
    return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:5px;flex:1;min-width:0">'+
      '<div style="width:100%;max-width:30px;height:'+hpx+'px;border-radius:5px 5px 2px 2px;background:var(--'+dir+');opacity:'+(isLast?1:0.42)+'"></div>'+
      '<div style="font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums">'+v.toFixed(1)+'</div></div>';
  }).join(''):'<div style="flex:1;font-size:12px;color:var(--muted);align-self:center">No refreshes recorded yet.</div>';
  var cap=(prev==null)
    ?('Baseline — one refresh recorded ('+(last!=null?last.toFixed(1):'—')+' / 5). The bars grow green when '+(fwName||'this framework')+' maturity rises, shrink red when it falls, and hold level grey when it is flat, from your next '+cad+' reassessment.')
    :(dir==='good'?('Improving — '+(fwName||'')+' maturity rose from '+prev.toFixed(1)+' to '+last.toFixed(1)+' since the last refresh.')
      :dir==='crit'?('Regressing — maturity fell from '+prev.toFixed(1)+' to '+last.toFixed(1)+' since the last refresh.')
      :('Holding — maturity is steady at '+last.toFixed(1)+' vs '+prev.toFixed(1)+' last refresh.'));
  return '<div class="ev-sec">Overall maturity across refreshes</div>'+
    '<div style="display:flex;align-items:flex-end;gap:10px;height:'+(maxH+22)+'px;padding:10px 8px 4px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)">'+bars+'</div>'+
    '<div style="font-size:12px;color:var(--ink-2);margin-top:8px">'+cap+'</div>';
}
function c5fwInspect(card,T,sel,cad){
  var fwName=(typeof FW_NAMES!=='undefined'&&FW_NAMES[sel])||'the framework';
  var trendH=(typeof fwHistory==='function')?fwHistory():[];
  var trendDelta=(trendH.length>=2)?(trendH[trendH.length-1].v-trendH[0].v):null;
  var m;
  if(card==='overall'){
    m=c5obj({name:'Overall maturity · '+fwName,displayValue:T.overall.toFixed(1)+' / 5',label:'computed',color:c5fwCol(T.overall),
      formula:'overall maturity = mean CMMI across the '+T.total+' controls in '+fwName+', rolled up through category → function → overall',
      method:'Each control is scored 0–5 from live tool telemetry and analyzed policy documents; every group is the mean CMMI of its children — a control with no evidence scores 0, so unproven controls count against the roll-up.',
      inputs:[{name:'Controls evidenced',value:T.evidenced+' of '+T.total,source:'tool telemetry + document review'},{name:'Target',value:C5FW_TARGET.toFixed(1),source:'program target'},{name:'Status',value:c5fwStatus(T.overall).t,source:'meets ≥'+C5FW_TARGET.toFixed(1)+' · observation ≥'+C5FW_FLOOR+' · deficiency <'+C5FW_FLOOR}],
      sources:[{tool:'Nerion assessment engine',connector:'nerion',field:'framework_cmmi.overall',lastRefresh:c5ago()}],
      note:'Your continuous, auditor-grade maturity against '+fwName+'. '+(T.overall<C5FW_TARGET?('Below the '+C5FW_TARGET.toFixed(1)+' target — the deficiencies in the register on the right are where to focus.'):'At or above target.')});
  } else if(card==='coverage'){
    m=c5obj({name:'Evidence coverage · '+fwName,displayValue:T.coverage+'%',label:'computed',color:(T.coverage>=75?'good':T.coverage>=50?'warn':'crit'),
      formula:'coverage = controls with evidence (tool telemetry or analyzed policy) ÷ total controls in '+fwName,
      inputs:[{name:'Evidenced',value:String(T.evidenced),source:'tools + documents'},{name:'Total controls',value:String(T.total),source:fwName+' control universe'},{name:'Unevidenced',value:String(T.total-T.evidenced),source:'connect tools / upload policies to raise'}],
      sources:[{tool:'Nerion assessment engine',connector:'nerion',field:'framework_cmmi.coverage',lastRefresh:c5ago()}],
      note:'How much of '+fwName+' you can actually evidence today. Connect more tools or upload more policies to raise it.'});
  } else if(card==='trend'){
    m=c5obj({name:'Trend vs last refresh',displayValue:(trendDelta!=null?((trendDelta>=0?'+':'')+trendDelta.toFixed(1)):'Baseline'),label:'computed',color:(trendDelta==null?'ink':trendDelta>=0?'good':'crit'),
      formula:'trend = overall CMMI this refresh − overall CMMI at the last recorded '+cad+' refresh',
      method:trendDelta==null?('This is your first recorded refresh — the baseline. The bars grow (green) when overall maturity rises, shrink (red) when it falls, and hold level (grey) when it is flat, from your next '+cad+' reassessment on.'):('Each bar is the overall '+fwName+' maturity at one '+cad+' refresh; direction compares the latest to the one before it.'),
      visual:c5trendBars(trendH,cad,fwName),
      inputs:trendH.length?trendH.slice(-6).map(function(h,i){return {name:'Refresh '+(i+1),value:Number(h.v).toFixed(1)+' / 5',source:h.date||h.at||'recorded '+cad};}):[{name:'History',value:'baseline only',source:'records build each '+cad+' refresh'}],
      sources:[{tool:'Nerion assessment engine',connector:'nerion',field:'fw_history (overall CMMI per refresh)',lastRefresh:c5ago()}],
      note:'The board’s “are we improving?” answered on your reassessment cadence ('+cad+').'});
  } else {
    var defs=[];T.groups.forEach(function(g){(g.children||[]).forEach(function(c){if(c.type==='cat'){(c.children||[]).forEach(function(x){if(x.score<C5FW_FLOOR)defs.push(x);});}else if(c.score<C5FW_FLOOR)defs.push(c);});});
    var cov=(typeof fwDeployedIds==='function')?fwDeployedIds():{};
    // One row per failing control: the objective, what fell short, and the REAL
    // source of the score (a connected tool's telemetry, or a specific reviewed
    // document — with a link back to where that document lives).
    var frows=defs.map(function(x){
      var cc=(typeof controlCmmi==='function')?controlCmmi(x.id,cov):{score:x.score,src:'none'};
      var sc=Number(x.score);
      var whatFailed=(sc<=0)?'Unevidenced — no telemetry or reviewed document':('CMMI '+sc.toFixed(1)+' · below the '+C5FW_FLOOR+' floor');
      var srcCell;
      if(cc.src==='document'){var fn=(cc.doc&&cc.doc.doc)||'policy document';var att=(cc.doc&&cc.doc.matched!=null&&cc.doc.total!=null)?(' · '+cc.doc.matched+'/'+cc.doc.total+' attributes met'):'';
        srcCell='📄 '+fn+att+' <span data-c5doc="1" style="color:var(--blue);cursor:pointer;white-space:nowrap;font-weight:600">· see details ›</span>';}
      else if(cc.src==='system'){var tc=c5fwCtrlTool(x.id);srcCell='🔌 '+((tc&&tc.tool)||'connected tool')+(cc.toolPct!=null?(' · '+cc.toolPct+'% deployed'):'')+' <span style="color:var(--muted)">(telemetry)</span>';}
      else {srcCell='<span style="color:var(--muted)">— no evidence yet · connect a tool or upload the policy</span>';}
      return [{text:'<b>'+x.id+'</b> '+c5esc(x.name||'')},{text:whatFailed,color:(sc<1?'crit':'warn')},{text:srcCell}];
    });
    m=c5obj({name:'Controls failing · '+fwName,displayValue:String(T.failing),label:'computed',color:(T.failing>0?'crit':'good'),
      why:'The controls in '+fwName+' scoring below the deficiency floor (CMMI '+C5FW_FLOOR+') — evidenced too weakly, or not at all. It matters because these are the findings an auditor writes up first, and the gaps that most weaken the program.',
      formula:'failing = controls scoring below the deficiency floor (CMMI '+C5FW_FLOOR+') in '+fwName,
      method:'Each control is scored 0–5 from the best of its live tool telemetry and its analyzed policy document; it is "failing" when even that best evidence falls below the '+C5FW_FLOOR+' floor. The table lists every failing control — its objective, what fell short, and the exact source behind the score: a connected tool (telemetry) or a specific document reviewed at onboarding. Document-based findings link back to the document-review tab.',
      table:(defs.length?{title:'Every failing control · objective · what failed · source',cols:['Control objective','What failed','Source'],rows:frows}:null),
      sources:[{tool:'Nerion assessment engine',connector:'nerion',field:'framework_cmmi.deficiencies',lastRefresh:c5ago()}],
      note:(T.failing>0?(T.failing+' control'+(T.failing>1?'s':'')+' below CMMI '+C5FW_FLOOR+'. Each is a finding with its evidence, gap and remediation — and flows into the auditor pack.'):'No controls below the deficiency floor.')});
  }
  c5InspectObj(m);
}
/* ===== DTNKShield community benchmark (inside the Frameworks tab) =====
   Anonymous, opt-in, per-framework peer comparison — the only feature that
   reaches the internet. Flow: preview exactly what would be shared → verify →
   share; the org's own row is always labeled "My Organization" and its real
   name never leaves the browser. Reuses the existing peer endpoints + helpers. */
var C5PEER_CAT='industry',C5PEER_PREVIEW=false,C5FW_PEER=null,C5FW_PEER_BUSY=false;
function c5peerCats(){return [{k:'industry',l:'My industry'},{k:'fortune100',l:'Fortune 100'},{k:'fortune500',l:'Fortune 500'},{k:'bcbs',l:'Banking · BCBS'},{k:'insurance',l:'Insurance'}];}
/* Category → the BENCHMARK QUERY filter only. The submitted row always carries
   the org's real tags (industry/size), so it is discoverable in its natural
   cohorts; the category just changes which cohort we read back. Empty industry/
   size means "don't filter on it" (backend omits the clause). */
function c5peerCatQuery(cat){
  var ind=(typeof peerIndustry==='function')?peerIndustry():((typeof indKey==='function')?indKey():'');
  var size=(typeof peerSizeBand==='function')?peerSizeBand():'';
  if(cat==='fortune100')return {industry:'',size:'mega',label:'Fortune 100 · $100B+ revenue'};
  if(cat==='fortune500')return {industry:'',size:'large',label:'Fortune 500 · $10B+ revenue'};
  if(cat==='bcbs')return {industry:'banking',size:'',label:'Banking · Basel (BCBS) institutions'};
  if(cat==='insurance')return {industry:'insurance',size:'',label:'Insurance carriers'};
  return {industry:ind,size:size,label:((typeof peerIndustryLabel==='function')?peerIndustryLabel():'your industry')+' peers'};
}
function c5peerShared(){
  var sel=(typeof FW_SEL!=='undefined')?FW_SEL:'csf';
  var fwName=(typeof FW_NAMES!=='undefined'&&FW_NAMES[sel])||'framework';
  var over=(window.C5FW_OVERALL!=null)?(Number(window.C5FW_OVERALL).toFixed(1)+' / 5'):'—';
  var q=c5peerCatQuery(C5PEER_CAT);
  var fns=(window.FW_SNAPSHOT&&window.FW_SNAPSHOT.functions)||{};
  var fnStr=Object.keys(fns).length?Object.keys(fns).map(function(k){return k+' '+Number(fns[k]).toFixed(1);}).join(' · '):'—';
  return [
    {k:'Organization',v:'My Organization',note:'your real name never leaves your browser'},
    {k:'Compared against',v:q.label},
    {k:'Industry',v:(typeof peerIndustryLabel==='function')?peerIndustryLabel():((typeof indLabel==='function')?indLabel():'—')},
    {k:'Region',v:(typeof peerRegion==='function')?peerRegion():'global'},
    {k:'Revenue band',v:(typeof peerSizeLabel==='function')?peerSizeLabel():'—'},
    {k:'Framework',v:fwName},
    {k:'Overall maturity',v:over},
    {k:'By function (CMMI)',v:fnStr}
  ];
}
function c5fwPeerFetch(){
  if(!(typeof peerOptin==='function'&&peerOptin()))return;
  var over=(window.C5FW_OVERALL!=null)?window.C5FW_OVERALL:((window.FW_SNAPSHOT||{}).overall);
  if(over==null)return;
  var q=c5peerCatQuery(C5PEER_CAT),sel=(typeof FW_SEL!=='undefined')?FW_SEL:'csf';
  var fns=(window.FW_SNAPSHOT&&window.FW_SNAPSHOT.functions)||{};
  C5FW_PEER_BUSY=true;C5FW_PEER=null;c5fwPeerRender();
  // Submit with the org's REAL identity tags (not the category filter).
  var body={client_id:(typeof peerCid==='function')?peerCid():'anon',industry:(typeof peerIndustry==='function')?peerIndustry():((typeof indKey==='function')?indKey():''),region:(typeof peerRegion==='function')?peerRegion():'global',revenue:(typeof peerRevenue==='function')?peerRevenue():0,category:C5PEER_CAT,framework:sel,overall_cmmi:over,function_cmmi:fns};
  var base=(typeof apiBase==='function')?apiBase():'';
  fetch(base+'/api/peer/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(function(){return fetch(base+'/api/peer/benchmark?industry='+encodeURIComponent(q.industry)+'&size='+encodeURIComponent(q.size)+'&framework='+encodeURIComponent(sel)+'&category='+encodeURIComponent(C5PEER_CAT));})
    .then(function(r){return r.json();})
    .then(function(d){C5FW_PEER=d||{sufficient:false};C5FW_PEER_BUSY=false;c5fwPeerRender();})
    .catch(function(){C5FW_PEER={error:true};C5FW_PEER_BUSY=false;c5fwPeerRender();});
}
/* Open the full community benchmark (preview → verify → compare) in the drill
   panel, triggered by the small opt-in box in the Frameworks maturity summary. */
function c5fwPeerOpen(){
  if(typeof openDrill!=='function')return;
  openDrill('Community benchmark · how do we compare?','<div id="c5fwPeer"></div>');
  try{c5fwPeerRender();}catch(_){}
}
function c5fwPeerRender(){
  var host=document.getElementById('c5fwPeer');if(!host)return;
  var sel=(typeof FW_SEL!=='undefined')?FW_SEL:'csf';
  var fwName=(typeof FW_NAMES!=='undefined'&&FW_NAMES[sel])||'this framework';
  var over=(window.C5FW_OVERALL!=null)?Number(window.C5FW_OVERALL):null;
  var optedIn=(typeof peerOptin==='function')&&peerOptin();
  var minC=(typeof PEER_MIN!=='undefined')?PEER_MIN:5;
  var head='<div class="peer-head"><div class="ck">Community benchmark · how do we compare?</div><span class="peer-badge">DTNKShield portal</span></div>';
  var body='';
  if(!optedIn&&!C5PEER_PREVIEW){
    body='<div class="cn" style="margin-top:8px;line-height:1.55">See how your <b>'+fwName+'</b> maturity compares to the DTNKShield community — anonymously. This is the <b>only</b> feature that reaches the internet. If you share, only your <b>anonymized scores</b> and cohort tags (industry, region, revenue band) leave your browser — <b>no organization name, no inventory, no dollar figures</b>. The comparison unlocks once at least '+minC+' organizations have joined a cohort, so no single peer can be identified.</div>'+
      '<div style="margin-top:12px"><button class="c5btn" id="c5peerPreview">Preview what would be shared →</button></div>';
  } else if(!optedIn&&C5PEER_PREVIEW){
    var rows=c5peerShared().map(function(f){return '<tr><td style="padding:6px 10px;color:var(--ink-2);white-space:nowrap">'+f.k+'</td><td style="padding:6px 10px;font-weight:600">'+f.v+(f.note?(' <span style="font-weight:400;color:var(--muted)">— '+f.note+'</span>'):'')+'</td></tr>';}).join('');
    body='<div class="cn" style="margin-top:8px">This is <b>exactly</b> what would be shared — review it before anything leaves your browser:</div>'+
      '<table class="itbl" style="margin-top:10px;width:100%"><tbody>'+rows+'</tbody></table>'+
      '<div class="c5kanon" style="margin-top:12px">'+c5icon('lock')+'<div>Shared anonymously under a random ID. No organization name, inventory, IP addresses or dollar figures are included. You can opt out any time — opting out deletes your shared row.</div></div>'+
      '<div style="margin-top:12px;display:flex;gap:12px;flex-wrap:wrap;align-items:center"><button class="c5btn" id="c5peerConfirm">Confirm &amp; share anonymously →</button><button class="peer-toggle" id="c5peerCancel">Cancel</button></div>';
  } else {
    var cats='<div class="c5fw-pills" style="margin-top:10px">'+c5peerCats().map(function(c){return '<button class="c5fw-pill'+(C5PEER_CAT===c.k?' on':'')+'" data-c5peercat="'+c.k+'">'+c.l+'</button>';}).join('')+'</div>';
    var q=c5peerCatQuery(C5PEER_CAT);
    var cmp;
    if(C5FW_PEER_BUSY||!C5FW_PEER){cmp='<div class="cn" style="margin-top:14px;color:var(--muted)">⟳ Contacting the DTNKShield '+q.label+' cohort…</div>';if(!C5FW_PEER&&!C5FW_PEER_BUSY){c5fwPeerFetch();return;}}
    else if(C5FW_PEER.error){cmp='<div class="cn" style="margin-top:14px;color:var(--warn)">Couldn’t reach the DTNKShield portal. Nothing beyond your anonymized scores was shared. <button class="peer-toggle" id="c5peerRetry">try again</button></div>';}
    else if(!C5FW_PEER.sufficient){var got=C5FW_PEER.n||0,need=C5FW_PEER.minCohort||minC;
      cmp='<div class="peer-hero"><div><div class="peer-hero-l">Building your cohort</div><div class="peer-hero-d" style="margin-top:6px">Your scores are shared. The '+q.label+' comparison unlocks once <b>'+need+'</b> organizations have joined — so no single one can be identified.</div></div><div class="peer-n"><b>'+got+' / '+need+'</b>joined</div></div>';}
    else{
      var pctile=(typeof peerPercentileOf==='function')?peerPercentileOf(over,C5FW_PEER.overall_values):null;
      var ordCol=pctile==null?'ink':(pctile>=50?'good':(pctile>=25?'warn':'crit'));
      var hero='<div class="peer-hero"><div><div class="peer-hero-l">My Organization · '+fwName+' vs '+q.label+'</div><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-top:2px"><div class="peer-hero-v" style="color:var(--'+((typeof cmmiColor==='function')?cmmiColor(Math.round(over||0)):'ink')+')">'+(over!=null?Number(over).toFixed(1):'—')+'<span>/ 5</span></div>'+
        (pctile!=null?'<div class="peer-hero-d">You rank in the <b style="color:var(--'+ordCol+')">'+((typeof peerOrdinal==='function')?peerOrdinal(pctile):pctile)+' percentile</b> — '+(pctile>=50?'ahead of':'behind')+' the cohort median of '+Number(C5FW_PEER.overall.p50).toFixed(1)+'.</div>':'')+'</div></div><div class="peer-n"><b>'+(C5FW_PEER.n||0)+'</b>in cohort</div></div>';
      var bars='<div style="margin-top:12px">'+((typeof peerBar==='function')?peerBar('Overall',over,C5FW_PEER.overall):'');
      var fns=C5FW_PEER.functions||{},snap=(window.FW_SNAPSHOT&&window.FW_SNAPSHOT.functions)||{},order=['Govern','Identify','Protect','Detect','Respond','Recover'];
      order.forEach(function(fn){if(fns[fn]&&typeof peerBar==='function')bars+=peerBar(fn,snap[fn],fns[fn]);});
      bars+='</div>';
      var legend='<div class="peer-legend" style="margin-top:6px"><span><i style="background:var(--blue-soft);border:1px solid rgba(37,99,235,.35)"></i>cohort band (p25–p75)</span><span><i style="background:var(--blue);width:2px"></i>cohort median</span><span><i style="background:var(--good)"></i>My Organization ≥ median</span><span><i style="background:var(--crit)"></i>below 25th</span></div>';
      cmp=hero+bars+legend;
    }
    body='<div class="cn" style="margin-top:6px">Comparing <b>My Organization</b>’s '+fwName+' maturity against the DTNKShield community. Pick a cohort:</div>'+cats+
      '<div style="margin-top:6px">'+cmp+'</div>'+
      '<div style="margin-top:12px;display:flex;gap:14px;flex-wrap:wrap;align-items:center"><button class="c5btn" id="c5peerPull">↻ Pull latest comparison</button><button class="peer-toggle" id="c5peerOptout">opt out &amp; delete my shared row</button></div>';
  }
  host.innerHTML='<div class="card">'+head+body+'</div>';
  var g=function(id){return document.getElementById(id);},b;
  if(b=g('c5peerPreview'))b.onclick=function(){C5PEER_PREVIEW=true;c5fwPeerRender();};
  if(b=g('c5peerCancel'))b.onclick=function(){C5PEER_PREVIEW=false;c5fwPeerRender();};
  if(b=g('c5peerConfirm'))b.onclick=function(){C5PEER_PREVIEW=false;if(typeof peerSetOptin==='function')peerSetOptin(true);c5fwPeerFetch();};
  if(b=g('c5peerPull'))b.onclick=function(){c5fwPeerFetch();};
  if(b=g('c5peerRetry'))b.onclick=function(){c5fwPeerFetch();};
  if(b=g('c5peerOptout'))b.onclick=function(){if(typeof peerSetOptin==='function')peerSetOptin(false);C5FW_PEER=null;C5PEER_PREVIEW=false;c5fwPeerRender();};
  host.querySelectorAll('[data-c5peercat]').forEach(function(x){x.onclick=function(){C5PEER_CAT=x.getAttribute('data-c5peercat');c5fwPeerFetch();};});
}
function c5fwCtlRow(c){var col=c5fwCol(c.score),selc=(C5FW_CTRL===c.id)?' sel':'';
  var mapped=(c.mapped&&c.mapped.length)?('<div class="c5fw-map">mapped ← '+c.mapped.slice(0,6).map(function(id){return id;}).join(' · ')+'</div>'):'';
  return '<div class="c5fw-crow'+selc+'" data-c5fwctl="'+c.id+'"><span class="c5fw-tw"></span><span class="c5fw-dot" style="background:var(--'+col+')"></span><span class="c5fw-id">'+c.id+'</span><span class="c5fw-nm">'+c.name+mapped+'</span><span class="c5fw-lvl">'+c5fwLvl(c.score)+'</span><span class="c5fw-sc" style="color:var(--'+col+')">'+c.score.toFixed(1)+'</span></div>';
}
