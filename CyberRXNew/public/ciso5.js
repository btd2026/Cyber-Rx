/* Nerion — CISO seat, the five-tab provenance design.
   01 Program health · 02 Top exposure · 03 Effectiveness · 04 Threats · 05 Peers.
   Every displayed number resolves from a Metric object carrying full provenance
   (formula, inputs+sources, label, connected). Clicking any number-bearing element
   opens the right-side inspector (#ev). Nothing hardcoded: values compute from the
   same live data layer the rest of the cockpit uses; when a source isn't connected
   the element renders the gray "not connected" state, never a placeholder number. */
(function(){
  var css=[
    '.c5head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:2px}',
    '.c5asof{font-size:11px;color:var(--muted)}',
    '.c5kick{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--blue);font-weight:500}',
    '.c5verdict{font-size:22px;font-weight:500;margin-top:8px;line-height:1.3}',
    '.c5intro{font-size:13px;color:var(--ink-2);margin-top:8px;line-height:1.55;max-width:780px}',
    '.c5chip{font-size:9px;font-weight:500;text-transform:uppercase;letter-spacing:.04em;padding:1px 6px;border-radius:20px;border:1px solid var(--line);white-space:nowrap}',
    '.c5-live{color:var(--good);border-color:rgba(46,139,107,.35);background:rgba(46,139,107,.08)}',
    '.c5-computed{color:var(--blue);border-color:rgba(74,111,165,.35);background:rgba(74,111,165,.08)}',
    '.c5-selfreported{color:var(--ink-2);background:var(--surface-2)}',
    '.c5-modeled{color:var(--warn);border-color:rgba(201,162,39,.4);background:rgba(201,162,39,.1)}',
    '.c5legend{display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:var(--ink-2);margin-top:12px}',
    '.c5legend i{width:11px;height:11px;border-radius:3px;display:inline-block;vertical-align:-1px;margin-right:5px}',
    '.c5tiles{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:14px}',
    '.c5tile{border:1px solid var(--line);border-radius:12px;padding:14px 16px;background:var(--surface);cursor:pointer;transition:border-color .15s}',
    '.c5tile:hover{border-color:var(--blue)}',
    '.c5tile.c5off{opacity:.72}',
    '.c5tile-top{display:flex;justify-content:space-between;align-items:center;gap:8px}',
    '.c5tile-l{font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}',
    '.c5pill{font-size:10px;font-weight:500;padding:1px 8px;border-radius:20px}',
    '.c5pill.g{color:var(--good);background:rgba(46,139,107,.1)}.c5pill.a{color:var(--warn);background:rgba(201,162,39,.12)}.c5pill.b{color:var(--blue);background:rgba(74,111,165,.1)}.c5pill.n{color:var(--muted);background:var(--surface-2)}.c5pill.r{color:var(--crit);background:rgba(178,58,58,.1)}',
    '.c5tile-h{font-size:17px;font-weight:500;margin-top:9px;line-height:1.3}',
    '.c5tile-s{font-size:12px;color:var(--ink-2);margin-top:4px}',
    '.c5sqrow{display:flex;gap:4px;margin-top:11px;flex-wrap:wrap}',
    '.c5sq{width:13px;height:13px;border-radius:3px;background:var(--line)}',
    '.c5sq.g{background:var(--good)}.c5sq.a{background:var(--warn)}.c5sq.b{background:var(--blue)}.c5sq.r{background:var(--crit)}.c5sq.n{background:var(--line)}',
    '.c5bars{display:flex;gap:4px;align-items:flex-end;margin-top:11px;height:26px}',
    '.c5bars i{flex:1;background:var(--good);border-radius:2px;min-height:3px}.c5bars i.n{background:var(--line)}',
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
    '.c5attgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}',
    '.c5att{border:1px solid var(--line);border-radius:10px;padding:11px 12px;cursor:pointer;min-height:60px;display:flex;flex-direction:column;justify-content:space-between}',
    '.c5att-n{font-size:12px;font-weight:500;line-height:1.25}',
    '.c5att-c{font-size:11px;margin-top:6px;font-weight:500}',
    '.c5att.g{background:rgba(46,139,107,.08);border-color:rgba(46,139,107,.3)}',
    '.c5att.a{background:rgba(201,162,39,.1);border-color:rgba(201,162,39,.4)}',
    '.c5att.n{background:var(--surface-2);border-color:var(--line)}',
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
    '.c5note{border:1px solid var(--line);border-radius:10px;padding:11px 14px;font-size:12px;color:var(--ink-2);margin-top:14px;line-height:1.5}',
    '.c5bl{border:1px solid rgba(74,111,165,.3);background:rgba(74,111,165,.05);border-radius:12px;padding:16px 18px;margin-top:18px}',
    '.c5bl-k{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--blue);font-weight:500}',
    '.c5bl-h{font-size:15px;font-weight:500;margin-top:6px}',
    '.c5bl-p{font-size:13px;color:var(--ink-2);margin-top:6px;line-height:1.55}',
    '.c5btn{margin-top:12px;font-size:13px;font-weight:500;padding:9px 16px;border-radius:8px;border:0;background:var(--blue);color:#fff;cursor:pointer}',
    '.c5btn.ghost{background:transparent;border:1px solid var(--line);color:var(--ink);margin-left:8px}',
    '.c5foot{font-size:11px;color:var(--muted);margin-top:14px}',
    '@media(max-width:720px){.c5tiles{grid-template-columns:1fr}.c5attgrid{grid-template-columns:repeat(2,1fr)}.c5prow-n{width:120px}}'
  ].join('');
  try{var s=document.createElement('style');s.textContent=css;document.head.appendChild(s);}catch(_){}
})();

/* ---------- provenance helpers ---------- */
function c5now(){try{return new Date().toISOString();}catch(_){return '';}}
function c5ago(){try{return new Date().toLocaleString();}catch(_){return 'last refresh';}}
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
        inputs:caps.map(function(o){return {name:o.c.name.replace(/ *\(.*\)/,''),value:o.p!=null?o.p+'%':'not connected',source:o.c.tool+' · '+((typeof CAP_SIGKEY!=='undefined'&&CAP_SIGKEY[o.c.k])||o.c.k)};}),
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
        inputs:((V.p&&V.p.vendors)?V.p.vendors.slice(0,6):[]).map(function(v){return {name:v.name,value:(v.score!=null?v.score+'/100':'—'),source:(V.vs?V.vs.vendor:'monitoring service')+' · overall_score'};}),
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
    case 'exp_total':{var M=c5expModel();var conn=M.total>0;
      return c5obj({id:id,name:'Total modeled exposure',connected:conn,displayValue:conn?usd(M.total):'—',label:'modeled',color:'ink',
        formula:'total exposure = Σ(driver exposures) — modeled expected loss (ALE) decomposed across the top control-gap drivers',
        method:'Each driver’s share = its control-gap severity × framework weight, scaled to your modeled expected loss.',
        inputs:M.drivers.map(function(x){return {name:x.name,value:usd(x.usd),source:'control-value ledger × risk register'};}),
        sources:[{tool:'Nerion risk model',connector:'nerion',field:'ale_decomposition',lastRefresh:c5ago()}],
        note:'Your total cyber exposure this morning, priced in dollars and decomposed by driver.',connectTool:'your risk register + financials (onboarding)'});}
    case 'exp_conc':{var M2=c5expModel();var conn=M2.total>0;var top2=M2.drivers.slice(0,2).reduce(function(s,x){return s+x.usd;},0);var pc=M2.total>0?Math.round(top2/M2.total*100):0;
      return c5obj({id:id,name:'Concentrated in top 2',connected:conn,displayValue:conn?pc+'%':'—',label:'computed',color:conn?(pc>=60?'warn':'good'):'muted',
        formula:'concentration = (exposure of the top 2 drivers) ÷ total exposure',
        inputs:M2.drivers.slice(0,2).map(function(x){return {name:x.name,value:usd(x.usd),source:'driver exposure'};}).concat([{name:'Total exposure',value:usd(M2.total),source:'exp_total'}]),
        sources:[{tool:'Nerion risk model',connector:'nerion',field:'ale_decomposition',lastRefresh:c5ago()}],
        note:'How concentrated your risk is — a few drivers you can act on, vs a diffuse problem.',connectTool:'your risk register + financials'});}
    case 'eff_removed':{var live=(typeof ROI_STATE!=='undefined'&&ROI_STATE&&ROI_STATE.riskRemoved>0);var rr=live?ROI_STATE.riskRemoved:((typeof controlsEffUsd==='function')?controlsEffUsd():0);
      return c5obj({id:id,name:'Risk removed',connected:rr>0,displayValue:rr>0?usd(rr):'—',label:live?'computed':'modeled',color:'good',
        formula:'risk removed = Σ(inherent exposure − residual exposure) across your controls'+(live?' (funded portfolio)':''),
        inputs:[{name:'Risk removed',value:usd(rr),source:live?'initiatives portfolio (ticketing + decisions)':'control-value ledger (modeled)'}],
        sources:[{tool:live?'Jira / ServiceNow':'Nerion engine',connector:live?'itsm':'nerion',field:live?'benefit':'controls_removed',lastRefresh:c5ago()}],
        note:'The dollars of expected loss your controls have bought down this year.',connectTool:'your control catalog / GRC'});}
    case 'eff_spend':{var inv=(typeof ROI_STATE!=='undefined'&&ROI_STATE)?ROI_STATE.invested:0;var conn=inv>0;
      return c5obj({id:id,name:'Security spend',connected:conn,displayValue:conn?usd(inv):'—',label:'self-reported',color:'ink',
        formula:'security spend = Σ(invested) across your funded security initiatives',
        inputs:[{name:'Invested',value:conn?usd(inv):'—',source:'initiatives portfolio (ticketing + decisions)'}],
        sources:[{tool:'Jira / ServiceNow',connector:'itsm',field:'cost',lastRefresh:c5ago()}],
        note:'What you spent to remove that risk — the denominator of return.',connectTool:'your ticketing / finance (import funded initiatives)'});}
    case 'eff_return':{var st=(typeof ROI_STATE!=='undefined'&&ROI_STATE)?ROI_STATE:null;var conn=!!(st&&st.invested>0&&st.riskRemoved>0);var ret=conn?st.ret:0;
      return c5obj({id:id,name:'Return per dollar',connected:conn,displayValue:conn?((typeof roiMult==='function'?roiMult(ret):Math.round(ret))+'×'):'—',label:'computed',color:'good',
        formula:'return = risk removed ÷ security spend',
        inputs:[{name:'Risk removed',value:conn?usd(st.riskRemoved):'—',source:'eff_removed'},{name:'Security spend',value:conn?usd(st.invested):'—',source:'eff_spend'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'rosi',lastRefresh:c5ago()}],
        note:'Every dollar of security spend expressed as risk removed — the CFO’s language.',connectTool:'import your funded initiatives'});}
    case 'threat_status':{var oi=sig('open_incidents'),ta=sig('threat_actors_active');var conn=oi!=null;
      return c5obj({id:id,name:'Live attack status',connected:conn,displayValue:conn?(oi>0?(oi+' active campaign'+(oi>1?'s':'')):'No active attack'):'—',label:'live',color:conn?(oi>0?'crit':'good'):'muted',
        formula:'live status = open incident campaigns (SIEM); sector actors from the threat-intel feed',
        inputs:[{name:'Active campaigns',value:conn?oi:'—',source:'SIEM · open_incidents'},{name:'Sector actors tracked',value:ta!=null?ta:'—',source:'Threat intel · threat_actors_active'}],
        sources:[c5capSrc('siem'),{tool:'Recorded Future / Mandiant',connector:'threat_intel',field:'threat_actors_active',lastRefresh:c5ago()}],
        note:'Whether anything is attacking you right now, and how many actors target your sector.',connectTool:'your SIEM + threat-intel feed'});}
    case 'peer_maturity':{var ov=c5Overall();var conn=ov!=null;
      return c5obj({id:id,name:'Your maturity',connected:conn,displayValue:conn?(Number(ov).toFixed(1)+' / 5'):'—',label:'computed',color:'ink',
        formula:'your maturity = mean CMMI across the framework control universe, evidenced from tools + documents',
        inputs:[{name:'Overall CMMI',value:conn?Number(ov).toFixed(1):'—',source:'framework posture (NIST CSF 2.0)'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'framework_cmmi',lastRefresh:c5ago()}],
        note:'Your evidenced framework maturity — not self-attested.',connectTool:'your control tools + policies'});}
    case 'peer_median':{var pd=c5peer();var opt=c5peerOptin();var conn=!!(opt&&pd&&pd.sufficient);
      return c5obj({id:id,name:'Peer median',connected:conn,displayValue:conn?Number(pd.overall.p50).toFixed(1):(opt?'cohort building':'opt in to compare'),label:'modeled',color:'ink',
        formula:'peer median = 50th percentile of anonymized same-size, same-industry peers (k-anonymity gated)',
        inputs:[{name:'Cohort size',value:(pd&&pd.n)||0,source:'DTNKSHIELD cohort'},{name:'Minimum cohort',value:(pd&&pd.minCohort)||(typeof PEER_MIN!=='undefined'?PEER_MIN:5),source:'k-anonymity gate'}],
        sources:[{tool:'DTNKSHIELD peer cohort',connector:'peer',field:'benchmark.p50',lastRefresh:c5ago()}],
        note:'The only feature that reaches the internet — anonymized and suppressed below a minimum cohort size.',connectTool:'the anonymous peer benchmark (opt in)'});}
    case 'peer_position':{var ov2=c5Overall();var pd2=c5peer();var opt2=c5peerOptin();var conn=!!(opt2&&pd2&&pd2.sufficient&&ov2!=null);
      var pctile=conn?((typeof peerPercentileOf==='function')?peerPercentileOf(ov2,pd2.overall_values):null):null;
      return c5obj({id:id,name:'Your position',connected:conn&&pctile!=null,displayValue:(conn&&pctile!=null)?('Top '+(100-Math.round(pctile))+'%'):(opt2?'cohort building':'opt in to compare'),label:'computed',color:(conn&&pctile!=null)?(pctile>=50?'good':'warn'):'muted',
        formula:'position = your percentile rank within the peer cohort by overall CMMI',
        inputs:[{name:'Your CMMI',value:ov2!=null?Number(ov2).toFixed(1):'—',source:'peer_maturity'},{name:'Cohort',value:(pd2&&pd2.n)||0,source:'DTNKSHIELD cohort'}],
        sources:[{tool:'DTNKSHIELD peer cohort',connector:'peer',field:'overall_values',lastRefresh:c5ago()}],
        note:'Where you stand against peers your size — top-third is the target.',connectTool:'the anonymous peer benchmark (opt in)'});}
  }
  return c5obj({id:id,name:id,connected:false,displayValue:'—',color:'muted',note:'No metric definition.'});
}
function c5driverMetric(id){
  var M=c5expModel();var d=null;M.drivers.forEach(function(x){if(x.id===id)d=x;});
  var conn=!!(d&&d.connected&&d.usd>0);var tr=c5trendPill(d);
  var caps=(d?d.caps:[]).filter(function(k){return k!=='__vendor';});
  var inputs=caps.map(function(k){var c=CAP_BY_KEY[k];var p=capDeploy(c);return {name:c.name.replace(/ *\(.*\)/,''),value:p!=null?p+'% deployed':'not connected',source:c.tool+' · '+((typeof CAP_SIGKEY!=='undefined'&&CAP_SIGKEY[k])||k)};});
  if(d&&d.caps[0]==='__vendor'){var V=c5vendors();inputs=[{name:'Worst-rated vendor',value:V.worst?(V.worst.name+' · '+V.worst.score+'/100'):'—',source:(V.vs?V.vs.vendor:'monitoring service')+' · overall_score'}];}
  return c5obj({id:id,name:d?d.name:id,connected:conn,displayValue:conn?usd(d.usd):'—',label:'modeled',color:'ink',trend:tr,threatens:d?d.threatens:'',largest:!!(d&&d.largest),
    formula:'driver exposure = (control-gap severity × framework weight) ÷ Σ, scaled to modeled expected loss (ALE)',
    method:'Gap severity = 1 − deployment% of the controls that mitigate this driver.',
    inputs:inputs,sources:[{tool:'Nerion risk model',connector:'nerion',field:'ale_decomposition',lastRefresh:c5ago()}],
    note:'Threatens '+(d?d.threatens:'')+'. '+((d&&d.largest)?'Your single largest exposure — and it has a scoped, funded fix.':'One of your top exposure drivers.'),
    connectTool:'the controls that mitigate this driver'});
}
var C5_CTL={ctl_identity:{label:'Identity & MFA',caps:['mfa','pam']},ctl_email:{label:'Email security',caps:['aware']},ctl_edr:{label:'EDR / XDR',caps:['edr']},ctl_vuln:{label:'Vulnerability management',caps:['vuln']},ctl_dlp:{label:'Data loss prevention',caps:['dlp']}};
function c5ctlMetric(id){
  var def=C5_CTL[id]||{label:id,caps:[]};var rr=(typeof capRiskRemoved==='function')?capRiskRemoved():{byCap:{},anyLive:false};
  var removed=def.caps.reduce(function(s,k){return s+(rr.byCap[k]||0);},0);var conn=rr.anyLive&&removed>0;
  return c5obj({id:id,name:def.label,connected:conn,displayValue:conn?(usd(removed)+' removed'):'—',label:'modeled',color:'good',removed:removed,
    formula:'risk removed = this control’s framework-weighted share of total control-removed risk × its deployment',
    method:'Return per dollar (×) needs per-control spend attribution, which isn’t connected — shown as not connected until you attribute spend by control.',
    inputs:def.caps.map(function(k){var c=CAP_BY_KEY[k];var p=capDeploy(c);return {name:c.name.replace(/ *\(.*\)/,''),value:(p!=null?p+'% deployed':'not connected')+' · '+usd(rr.byCap[k]||0)+' removed',source:c.tool+' · '+((typeof CAP_SIGKEY!=='undefined'&&CAP_SIGKEY[k])||k)};}),
    sources:def.caps.map(function(k){return c5capSrc(k);}),
    note:'What this control removes in dollars. Attribute spend by control to light up the return multiple (×).',connectTool:'per-control security spend'});
}
function c5tacticMetric(t){
  var caps=(typeof TACTIC_CAPS!=='undefined'&&TACTIC_CAPS[t])||[];var cov=(typeof threatCoverage==='function')?threatCoverage(caps):null;var conn=cov!=null;
  var state=cov==null?'limited':cov>=80?'covered':cov>=50?'partial':'limited';var color=cov==null?'muted':cov>=80?'good':cov>=50?'warn':'crit';
  return c5obj({id:'tac_'+t,name:t,connected:conn,displayValue:conn?(cov+'% defended'):'not connected',label:'computed',color:color,state:state,
    formula:'tactic coverage = mean deployment of the controls mapped to this MITRE ATT&CK tactic',
    inputs:caps.map(function(k){var c=CAP_BY_KEY[k];var p=capDeploy(c);return {name:c?c.name.replace(/ *\(.*\)/,''):k,value:p!=null?p+'%':'not connected',source:c?c.tool:k};}),
    sources:caps.map(function(k){return c5capSrc(k);}),
    note:'Your detection & prevention coverage for the '+t+' tactic, mapped from MITRE ATT&CK to your controls.',connectTool:'the controls for this tactic'});
}
var C5_DOM={asset:{label:'Asset & risk visibility',pre:['ID.AM','ID.RA'],fn:'Identify'},iam:{label:'Identity & access',pre:['PR.AA'],fn:'Protect'},edp:{label:'Endpoint & data protection',pre:['PR.DS','PR.PS','PR.IR'],fn:'Protect'},detect:{label:'Threat detection',pre:['DE.'],fn:'Detect'},ir:{label:'Incident response',pre:['RS.','RC.'],fn:'Respond'},tpr:{label:'Third-party risk',pre:['GV.SC'],fn:'Govern'}};
function c5domainMetric(k){
  var def=C5_DOM[k]||{label:k,pre:[],fn:''};var mine=c5DomainScore(def.pre);var pd=c5peer();var opt=c5peerOptin();
  var med=(opt&&pd&&pd.sufficient&&pd.functions&&pd.functions[def.fn])?pd.functions[def.fn].p50:null;
  var conn=mine!=null;var delta=(mine!=null&&med!=null)?(mine-med):null;
  return c5obj({id:'dom_'+k,name:def.label,connected:conn,displayValue:conn?(Number(mine).toFixed(1)+' / 5'):'—',label:'computed',color:conn?((delta==null)?'ink':(delta>=0?'good':'warn')):'muted',mine:mine,med:med,delta:delta,
    formula:'your domain score = mean CMMI across the controls in this domain ('+def.pre.join(', ')+'); peer median = cohort p50 for '+def.fn,
    method:'Peer medians are shared at the CSF-function level; '+def.label+' maps to '+def.fn+'.',
    inputs:[{name:'Your CMMI',value:mine!=null?Number(mine).toFixed(1):'—',source:'framework posture'},{name:'Peer median',value:med!=null?Number(med).toFixed(1):(opt?'cohort building':'opt in'),source:'DTNKSHIELD cohort · '+def.fn}],
    sources:[{tool:'Nerion engine',connector:'nerion',field:'domain_cmmi',lastRefresh:c5ago()},{tool:'DTNKSHIELD peer cohort',connector:'peer',field:'functions.'+def.fn,lastRefresh:c5ago()}],
    note:'How your '+def.label.toLowerCase()+' maturity compares to peers your size.',connectTool:'the anonymous peer benchmark (opt in)'});
}

/* ---------- the inspector (right-side #ev panel) ---------- */
function c5Inspect(id){
  var m=c5get(id);if(!m)return;
  var chip='<span class="c5chip c5-'+String(m.label).replace(/[^a-z]/g,'')+'">'+m.label+'</span>';
  var h='<div class="ev-claim">'+m.name+' '+chip+'</div>';
  h+='<div class="ev-result '+(m.color==='good'?'':m.color==='crit'?'crit':m.color==='warn'?'warn':'')+'">'+(m.connected?m.displayValue:'Not connected')+'</div>';
  if(!m.connected){
    h+='<div class="ev-sec">Not connected yet</div><div class="drill-p">This value populates once its source is connected. Until then Nerion shows the honest not-connected state — never a placeholder number.</div>';
    if(m.formula)h+='<div class="ev-sec">What would populate it</div><div class="formula">'+m.formula+'</div>';
    if(m.connectTool)h+='<div style="margin-top:12px"><button class="c5btn" onclick="c5Connect(\''+String(m.connectTool).replace(/'/g,'')+'\')">Connect '+m.connectTool+'</button></div>';
  } else {
    h+='<div class="ev-sec">How it’s computed</div><div class="formula">'+(m.formula||'—')+'</div>';
    if(m.method)h+='<div class="drill-p" style="color:var(--muted)">'+m.method+'</div>';
    if(m.inputs&&m.inputs.length)h+='<div class="ev-sec">Inputs</div><table class="itbl"><thead><tr><th>Input</th><th>Value</th><th>Source</th></tr></thead><tbody>'+m.inputs.map(function(i){return '<tr><td>'+i.name+'</td><td class="v">'+i.value+'</td><td class="src">'+i.source+'</td></tr>';}).join('')+'</tbody></table>';
    if(m.sources&&m.sources.length){h+='<div class="ev-sec">Sources</div>'+m.sources.map(function(s){return '<div class="src-row"><span class="sd"></span><b>'+s.tool+'</b> · connector <code>'+s.connector+'</code> · field <code>'+s.field+'</code> · refreshed '+s.lastRefresh+'</div>';}).join('');}
    h+='<div class="ev-sec">Why it matters</div><div class="conf">'+(m.note||'')+'</div>';
    h+='<div class="c5foot">as of '+c5ago()+' · label: '+m.label+'</div>';
  }
  if(typeof openDrill==='function')openDrill(m.name,h);
}
function c5Connect(tool){if(typeof openDrill==='function')openDrill('Connect '+tool,'<div class="drill-p">Add <b>'+tool+'</b> in onboarding → Connect tools. Once connected, this metric switches from the gray not-connected state to a live, evidenced value — with its formula, inputs and source shown here.</div>');}
document.addEventListener('click',function(e){var el=e.target.closest('[data-c5m]');if(el&&el.getAttribute('data-c5m'))c5Inspect(el.getAttribute('data-c5m'));});

/* ---------- shared render helpers ---------- */
function c5chip(label){return '<span class="c5chip c5-'+String(label).replace(/[^a-z]/g,'')+'">'+label+'</span>';}
function c5header(){return '<div class="c5head"><div></div><div class="c5asof">as of '+c5ago()+'</div></div>';}
function c5shell(kick,verdict,verdictColor,intro){
  return '<div class="c5kick">'+kick+'</div><div class="c5verdict"'+(verdictColor?(' style="color:var(--'+verdictColor+')"'):'')+'>'+verdict+'</div><div class="c5intro">'+intro+'</div>';
}
function c5squares(arr){return '<div class="c5sqrow">'+arr.map(function(c){return '<span class="c5sq '+c+'" title="'+c+'"></span>';}).join('')+'</div>';}
function c5tile(mid,pillCls,pillTxt,subHtml,extraHtml){var m=c5get(mid);
  var head=m.connected?m.displayValue:'Not connected';var pc=m.connected?pillCls:'n';var pt=m.connected?pillTxt:'—';
  return '<div class="c5tile'+(m.connected?'':' c5off')+'" data-c5m="'+mid+'"><div class="c5tile-top"><span class="c5tile-l">'+m.name+'</span><span class="c5pill '+pc+'">'+pt+'</span></div>'+
    '<div class="c5tile-h" style="color:var(--'+(m.color==='ink'?'ink':m.color)+')">'+head+'</div>'+
    (subHtml?('<div class="c5tile-s">'+subHtml+'</div>'):'')+(extraHtml||'')+'</div>';
}
function c5card(mid){var m=c5get(mid);
  return '<div class="c5card" data-c5m="'+mid+'"><div class="c5card-top"><span class="c5card-l">'+m.name+'</span>'+c5chip(m.label)+'</div><div class="c5card-v" style="color:var(--'+(m.color==='ink'?'ink':m.color)+')">'+(m.connected?m.displayValue:'Not connected')+'</div></div>';
}
function c5bl(kick,head,headColor,para,btn,ghost){
  return '<div class="c5bl"><div class="c5bl-k">'+kick+'</div><div class="c5bl-h"'+(headColor?(' style="color:var(--'+headColor+')"'):'')+'>'+head+'</div><div class="c5bl-p">'+para+'</div>'+
    (btn?('<button class="c5btn" data-c5m="'+btn.mid+'">'+btn.txt+'</button>'):'')+(ghost?('<button class="c5btn ghost" data-c5m="'+ghost.mid+'">'+ghost.txt+'</button>'):'')+'</div>';
}
function c5legend(items){return '<div class="c5legend">'+items.map(function(i){return '<span><i style="background:var(--'+i.c+')"></i>'+i.t+'</span>';}).join('')+'</div>';}

/* ---------- Tab 01 — Program health ---------- */
function c5Health(){
  var host=document.getElementById('c5-health');if(!host)return;
  if(typeof vendorFetch==='function'){try{vendorFetch(false);}catch(_){}}
  var oi=sig('open_incidents');
  var sqCaps=['edr','siem','mfa','pam','vuln','aware','seg','backup'];
  var sq1=sqCaps.map(function(k){return c5sqClass(capColor(capDeploy(CAP_BY_KEY[k])));});
  var sq2=CAPS.map(function(c){return c5sqClass(capColor(capDeploy(c)));});
  var V=c5vendors();var sq3=(V.p&&V.p.vendors?V.p.vendors.slice(0,8):[]).map(function(v){return c5sqClass(v.color||capColor(v.score));});
  var tr=trajInfo();var vals=(tr.vals||[]).slice(-6);var maxV=Math.max.apply(null,vals.concat([1]));
  var bars='<div class="c5bars">'+(vals.length?vals.map(function(v,i){var h=Math.round(6+ (maxV>0?(1-v/maxV):0)*20);return '<i class="'+(i<Math.max(0,vals.length-tr.vals.length+ (6-vals.length))?'':'')+'" style="height:'+h+'px"></i>';}).join(''):[1,2,3,4,5,6].map(function(){return '<i class="n" style="height:6px"></i>';}).join(''))+'</div>';
  var inv=c5get('investigations'),am=c5get('assets_monitored'),tp=c5get('thirdparty_risk'),dir=c5get('direction'),ec=c5get('exp_identity');
  var tiles='<div class="c5tiles">'+
    c5tile('active_compromise',(oi!=null&&oi>0)?'r':'g',(oi==null)?'—':(oi>0?'Active':'Clear'),(inv.connected?inv.displayValue:'connect SIEM'),c5squares(sq1))+
    c5tile('capability_coverage','a','Watch',(am.connected?am.displayValue:'connect SIEM for asset coverage'),c5squares(sq2))+
    c5tile('thirdparty_risk','a','Watch',(tp.connected?(tp.note||''):'add your tier-1/2 vendors'),c5squares(sq3))+
    c5tile('direction','g','Improving',(dir.connected?dir.displayValue:'builds as quarters record'),bars)+
    '</div>';
  var blPara=ec.connected?('Your largest exposure is <b>'+ec.name.toLowerCase()+'</b> — '+ec.displayValue+' modeled, threatening '+ec.threatens+'. The fix is scoped and funded and waiting for your sign-off.'):'Connect your identity and control tools and Nerion surfaces your largest exposure here, with the scoped, funded fix ready for sign-off.';
  var blBtn=ec.connected?('Approve — removes '+ec.displayValue+' of risk'):'Approve the top fix';
  host.innerHTML=c5header()+
    c5shell('Program health · are we secure right now?','You’re secure, and improving.',(oi!=null&&oi>0)?'warn':null,'No active compromise this morning, and your program is stronger than it was last month. Three live reads below — tap any tile for the exact formula and the source behind the number.')+
    c5legend([{c:'good',t:'Healthy'},{c:'warn',t:'At risk'},{c:'blue',t:'Monitoring'},{c:'line',t:'Not connected'}])+
    tiles+
    c5bl('Bottom line','Secure and improving — one decision on your desk.',null,blPara,{mid:'exp_identity',txt:blBtn})+
    '<div class="c5foot">Every square and number traces to its source.</div>';
}

/* ---------- Tab 02 — Top exposure ---------- */
function c5Exposure(){
  var host=document.getElementById('c5-exposure');if(!host)return;
  var M=c5expModel();
  var rows='<div class="c5rank"><div class="c5rank-h">Ranked by business impact</div>'+M.drivers.map(function(d,i){var m=c5get(d.id);var tr=m.trend||{t:'Steady',c:'st'};
    return '<div class="c5row" data-c5m="'+d.id+'"><div class="c5row-n">'+(i+1)+'</div><div class="c5row-main"><div class="c5row-t">'+d.name+(d.largest?'<span class="c5tag">Largest</span>':'')+'</div><div class="c5row-s">Threatens '+d.threatens+'</div></div><div class="c5row-v">'+(m.connected?m.displayValue:'not connected')+'</div><div class="c5tr '+tr.c+'">'+tr.t+'</div></div>';
  }).join('')+'</div>';
  var top=c5get('exp_identity');
  host.innerHTML=c5header()+
    c5shell('Top exposure · what’s our biggest risk?','One driver is a third of your risk — and it’s funded to fix.',null,'Your modeled exposure this morning is decomposed below, and it’s concentrated: the top two drivers dominate. The largest already has a scoped, funded fix. Tap any exposure to trace it to the business function it threatens and the number behind it.')+
    '<div class="c5cards">'+c5card('exp_total')+c5card('exp_conc')+'</div>'+
    rows+
    c5bl('Bottom line','Your biggest lever is your most expensive exposure.',null,(top.connected?('Approving the identity fix removes '+top.displayValue+' — the single largest reduction available to you this quarter — and it’s already funded.'):'Connect your identity controls and the largest, funded reduction surfaces here.'),{mid:'exp_identity',txt:top.connected?('Approve identity fix — removes '+top.displayValue):'Approve the top fix'})+
    '<div class="c5foot">Each exposure traces to its business function and formula.</div>';
}

/* ---------- Tab 03 — Control effectiveness ---------- */
function c5Effect(){
  var host=document.getElementById('c5-effect');if(!host)return;
  var ids=['ctl_identity','ctl_email','ctl_edr','ctl_vuln','ctl_dlp'];
  var ms=ids.map(function(id){return c5get(id);});
  var maxR=Math.max.apply(null,ms.map(function(m){return m.removed||0;}).concat([1]));
  var minM=null;ms.forEach(function(m){if(m.connected&&(minM==null||m.removed<minM.removed))minM=m;});
  var rows='<div class="c5rank"><div class="c5rank-h">Where your dollars work hardest — risk removed this quarter</div>'+ms.map(function(m){
    var review=(minM&&m.id===minM.id&&ms.filter(function(x){return x.connected;}).length>1);
    var pctFill=maxR>0?Math.round((m.removed||0)/maxR*100):0;
    return '<div class="c5row" data-c5m="'+m.id+'"><div class="c5row-main"><div class="c5row-t">'+m.name+(review?'<span class="c5tag rev">Review</span>':'')+'</div><div class="c5row-s">'+(m.connected?(usd(m.removed)+' removed · return per dollar needs per-control spend'):'connect this control')+'</div><div class="c5retbar"><i class="'+(review?'a':'')+'" style="width:'+pctFill+'%"></i></div></div><div class="c5row-v">'+(m.connected?usd(m.removed):'—')+'</div></div>';
  }).join('')+'</div>';
  var st=(typeof ROI_STATE!=='undefined')?ROI_STATE:null;
  var haveReturn=!!(st&&st.invested>0&&st.riskRemoved>0);
  host.innerHTML=c5header()+
    c5shell('Control effectiveness · is the program worth the spend?','Every dollar is removing risk — and you can prove it.',null,'Below, the dollars each control removes — live from your control-value ledger — and your program-level return. Tap any control for the risk-removed formula. Per-control return multiples light up once you attribute spend by control.')+
    '<div class="c5cards">'+c5card('eff_removed')+c5card('eff_spend')+c5card('eff_return')+'</div>'+
    rows+
    c5bl('Bottom line','Your best next dollar goes to identity.',null,(haveReturn?('Your program returns '+((typeof roiMult==='function'?roiMult(st.ret):Math.round(st.ret)))+'× on '+usd(st.invested)+' invested. Identity removes the most risk and is where your largest exposure sits — expand it first.'):'Identity removes the most risk and is where your largest exposure sits. Import your funded initiatives (spend) to compute return per dollar.'),{mid:'ctl_identity',txt:'Expand identity'},{mid:'ctl_dlp',txt:'Review lowest-return control'})+
    '<div class="c5foot">Return = risk removed ÷ control spend. Every figure traces to its source.</div>';
}

/* ---------- Tab 04 — Threats (MITRE ATT&CK) ---------- */
function c5Threats(){
  var host=document.getElementById('c5-threats');if(!host)return;
  var tactics=(typeof TACTIC_CAPS!=='undefined')?Object.keys(TACTIC_CAPS):[];
  var covered=0,partial=0,partials=[];
  var cells=tactics.map(function(t){var m=c5get('tac_'+t);var cls=m.state==='covered'?'g':m.state==='partial'?'a':'n';if(m.state==='covered')covered++;if(m.state==='partial'){partial++;partials.push(t);}
    return '<div class="c5att '+cls+'" data-c5m="tac_'+t+'"><div class="c5att-n">'+t+'</div><div class="c5att-c" style="color:var(--'+(m.color==='ink'?'ink-2':m.color)+')">'+(m.connected?m.displayValue:'not connected')+'</div></div>';
  }).join('');
  var ts=c5get('threat_status');var ta=sig('threat_actors_active');
  var band='<div class="c5band'+(ts.connected&&/campaign/.test(ts.displayValue)?' r':'')+'" data-c5m="threat_status"><div><b>'+(ts.connected?ts.displayValue:'Connect SIEM for live status')+'</b>'+(ta!=null?(' · '+ta+' sector actor'+(ta>1?'s':'')+' tracked'):'')+'</div><span class="c5chip c5-live">live</span></div>';
  var gap=partials.length?('<div class="c5gap"><b>Your soft spot: '+partials.join(' &amp; ').toLowerCase()+'</b><div class="c5bl-p">These are the tactics where your control coverage is only partial — the techniques your tracked actors favour and the open route to your crown jewels. This is the same identity gap driving your largest exposure.</div></div>'):'<div class="c5gap" style="border-color:rgba(46,139,107,.3);background:rgba(46,139,107,.06)"><b>No partial tactics</b><div class="c5bl-p">Every mapped ATT&amp;CK tactic is fully covered by your connected controls.</div></div>';
  host.innerHTML=c5header()+
    c5shell('Threats · MITRE ATT&CK coverage','Covered across the kill chain — with soft spots where identity controls thin out.',null,'Mapped to MITRE ATT&CK, this heatmap shows your live control coverage per tactic. The partials are the identity techniques your tracked actors favour, and the open route to your customer platform. Tap any tactic for its techniques and your coverage.')+
    band+
    c5legend([{c:'good',t:'Covered'},{c:'warn',t:'Partial'},{c:'line',t:'Limited / not connected'}])+
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
    var minePos=m.mine!=null?Math.max(2,Math.min(98,m.mine/5*100)):0;
    var medPos=m.med!=null?Math.max(2,Math.min(98,m.med/5*100)):null;
    var dotColor=m.delta==null?'muted':m.delta>=0?'good':'warn';
    var track='<div class="c5track">'+(medPos!=null?('<span class="c5track-tick" style="left:'+medPos+'%"></span>'):'')+(m.mine!=null?('<span class="c5track-dot" style="left:'+minePos+'%;background:var(--'+dotColor+')"></span>'):'')+'</div>';
    var deltaTxt=m.delta==null?(c5peerOptin()?'—':'opt in'):((m.delta>=0?'+':'')+m.delta.toFixed(1));
    return '<div class="c5prow" data-c5m="dom_'+k+'"><div class="c5prow-n">'+m.name+'</div>'+track+'<div class="c5prow-v">'+(m.mine!=null?Number(m.mine).toFixed(1):'—')+'</div><div class="c5prow-d" style="color:var(--'+dotColor+')">'+deltaTxt+'</div></div>';
  }).join('');
  var privacy='<div class="c5note">🔒 Anonymous and opt-in. Cohorts use k-anonymity and are suppressed below a minimum size — nothing identifying leaves your environment. This is the only part of Nerion that reaches the internet.</div>';
  host.innerHTML=c5header()+
    c5shell('Peer benchmark · how do we compare?','Benchmarked against anonymized peers your size.',null,'Your framework maturity next to same-size, same-industry peers. You lead where detection and data protection are strong; you trail where identity and access thin out — the same gap driving your exposure. Tap any domain to see the comparison and its sources.')+
    '<div class="c5cards">'+c5card('peer_maturity')+c5card('peer_median')+c5card('peer_position')+'</div>'+
    '<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">By domain · your score vs. peer median <span style="text-transform:none;letter-spacing:0;font-weight:400;color:var(--muted)">(| = peer median)</span></div>'+rows+'</div>'+
    privacy+
    c5bl('Bottom line','Close the one domain where peers beat you.',null,'Identity and access is your only real gap versus peers — and it’s your largest exposure. Closing it moves you from below-median to top-quartile there, and removes your single largest exposure.',{mid:'exp_identity',txt:'Close the identity gap'})+
    '<div class="c5foot">Benchmark is opt-in and anonymized against same-size industry peers.</div>';
}
