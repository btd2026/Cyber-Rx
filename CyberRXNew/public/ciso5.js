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
    case 'cf_tail':{var t=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&Number(LIVE.economics.tail))||0;var conn=t>0;
      return c5obj({id:id,name:'Tail risk · 1-in-20 year',connected:conn,displayValue:conn?usd(t):'—',label:'modeled',color:conn?'warn':'muted',
        formula:'tail = 95th-percentile annual loss (VaR₉₅) from the Monte-Carlo loss simulation',
        inputs:[{name:'Worst-case tail (VaR 95%)',value:conn?usd(t):'—',source:'risk model · Monte-Carlo'}],
        sources:[{tool:'Nerion risk model',connector:'nerion',field:'economics.tail',lastRefresh:c5ago()}],
        note:'The severe-but-plausible bad year — what insurance and retained capital have to cover.',connectTool:'your risk register + financials'});}
    case 'cf_bi':{var rs=(typeof LIVE!=='undefined'&&LIVE&&LIVE.resilience)||{};var ph=Number(rs.top_downtime_per_hr)||0;var conn=ph>0;var day=ph*24;
      return c5obj({id:id,name:'Business interruption',connected:conn,displayValue:conn?(usd(day)+' / day'):'—',label:'modeled',color:conn?'warn':'muted',
        formula:'interruption = downtime cost per hour of the top revenue system × 24',
        inputs:[{name:'Downtime cost / hr',value:conn?(usd(ph)+' / hr'):'—',source:'resilience · top_downtime_per_hr'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'resilience.top_downtime_per_hr',lastRefresh:c5ago()}],
        note:'What a day of outage on the customer platform costs — the number finance sizes recovery against.',connectTool:'your systems & revenue (BIA)'});}
    case 'cf_ins_limit':{var ins=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&LIVE.economics.insurance)||{};var v=Number(ins.limit)||0;var conn=v>0;
      return c5obj({id:id,name:'Insured limit',connected:conn,displayValue:conn?usd(v):'—',label:'self-reported',color:'ink',
        formula:'insured limit = the coverage cap on your cyber policy',
        inputs:[{name:'Policy limit',value:conn?usd(v):'—',source:'policy record · limit'}],
        sources:[{tool:'Cyber-insurance policy',connector:'insurance',field:'limit',lastRefresh:c5ago()}],
        note:'The most your policy pays on a covered loss.',connectTool:'your policy record (onboarding)'});}
    case 'cf_ins_gap':{var ins2=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&LIVE.economics.insurance)||{};var lim=Number(ins2.limit)||0;var tail=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&Number(LIVE.economics.tail))||0;var gap=(ins2.gap!=null)?Number(ins2.gap):((tail>0&&lim>0)?Math.max(0,tail-lim):null);var conn=gap!=null&&tail>0;
      return c5obj({id:id,name:'Residual gap',connected:conn,displayValue:conn?usd(gap):'—',label:'computed',color:conn?(gap>0?'warn':'good'):'muted',
        formula:'residual gap = modeled tail − insured limit (the uninsured portion of the bad year)',
        inputs:[{name:'Modeled tail',value:tail?usd(tail):'—',source:'cf_tail'},{name:'Insured limit',value:lim?usd(lim):'—',source:'cf_ins_limit'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'tail_minus_limit',lastRefresh:c5ago()}],
        note:'The part of a severe year your policy would not cover — retained on the balance sheet.',connectTool:'your policy record + risk model'});}
    case 'cf_ins_cov':{var ins3=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&LIVE.economics.insurance)||{};var lim3=Number(ins3.limit)||0;var tail3=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&Number(LIVE.economics.tail))||0;var conn=lim3>0&&tail3>0;var covp=conn?Math.round(lim3/tail3*100):0;
      return c5obj({id:id,name:'Insurance coverage',connected:conn,displayValue:conn?(covp+'%'):'—',label:'computed',color:conn?(covp>=90?'good':'warn'):'muted',
        formula:'coverage = insured limit ÷ modeled tail',
        inputs:[{name:'Insured limit',value:lim3?usd(lim3):'—',source:'cf_ins_limit'},{name:'Modeled tail',value:tail3?usd(tail3):'—',source:'cf_tail'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'limit_over_tail',lastRefresh:c5ago()}],
        note:'How much of a severe year your policy actually transfers off the balance sheet.',connectTool:'your policy record + risk model'});}
    case 'cf_premium':{var ins4=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&LIVE.economics.insurance)||{};var v=Number(ins4.premium)||0;var conn=v>0;
      return c5obj({id:id,name:'Premium',connected:conn,displayValue:conn?(usd(v)+' / yr'):'—',label:'self-reported',color:'ink',
        formula:'premium = annual cost of your cyber policy',
        inputs:[{name:'Annual premium',value:conn?(usd(v)+' / yr'):'—',source:'policy record · premium'}],
        sources:[{tool:'Cyber-insurance policy',connector:'insurance',field:'premium',lastRefresh:c5ago()}],
        note:'Priced on last year’s posture — a lever at renewal as your posture improves.',connectTool:'your policy record (onboarding)'});}
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
    case 'ceo_objectives':{var O=c5Objectives();
      return c5obj({id:id,name:'Objectives protected',connected:true,displayValue:O.protected+' of '+O.total,label:'computed',color:O.atRisk>0?'warn':'good',
        formula:'objectives protected = total strategic objectives − those carrying a material cyber exposure',
        method:'An objective is flagged at-risk when a material exposure driver maps to it (e.g. the identity gap → the customer platform).',
        inputs:O.objs.map(function(o){return {name:o.name,value:o.status,source:o.map?('exposure driver: '+o.map):'no material driver'};}),
        sources:[{tool:O.fromInput?'Onboarding · strategy':'Sector default (labeled)',connector:'strategy',field:'objectives',lastRefresh:c5ago()}],
        note:'Cyber mapped to the strategy — how many objectives are cyber-safe, and which one needs attention.',connectTool:'your strategic objectives (onboarding)'});}
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
        inputs:A.fams.map(function(f){return {name:f.l,value:f.status+(f.deploy!=null?(' · '+f.deploy+'% deployed'):''),source:f.evidence};}),
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
        inputs:[{name:'Evidenced controls',value:conn?(s.evid+' of '+s.total):'—',source:'framework posture'}],
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
        inputs:P.list.map(function(p){return {name:p.name,value:p.status,source:'operations model · process_exposure'};}),
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
  }
  return c5obj({id:id,name:id,connected:false,displayValue:'—',color:'muted',note:'No metric definition.'});
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
  var stored=null;try{stored=JSON.parse(localStorage.getItem('cyberrx_objectives')||'null');}catch(_){}
  var base=(Array.isArray(stored)&&stored.length)?stored.map(function(x){return {name:(x.name||x),map:(x.map||'')};}):[
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
  var war='<div style="margin-top:18px"><div class="c5kick" style="color:var(--muted)">Live attack status · War Room</div><div id="cisoUnderAttack" style="margin-top:8px"></div><div id="cisoWarRoom" style="margin-top:14px"></div></div>';
  host.innerHTML=c5header()+
    c5shell('Program health · are we secure right now?','You’re secure, and improving.',(oi!=null&&oi>0)?'warn':null,'No active compromise this morning, and your program is stronger than it was last month. Three live reads below, then live attack status and the War Room — tap any tile for the exact formula and the source behind the number.')+
    c5legend([{c:'good',t:'Healthy'},{c:'warn',t:'At risk'},{c:'blue',t:'Monitoring'},{c:'line',t:'Not connected'}])+
    tiles+
    war+
    c5bl('Bottom line','Secure and improving — one decision on your desk.',null,blPara,{mid:'exp_identity',txt:blBtn})+
    '<div class="c5foot">Every square and number traces to its source.</div>';
  if(typeof renderUnderAttack==='function'){try{renderUnderAttack();}catch(_){}}
  if(typeof renderCisoWarRoom==='function'){try{renderCisoWarRoom();}catch(_){}}
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

/* ================= CFO seat — same engine, financial lens ================= */
/* Shared control-return rows (identical objects to the CISO Effectiveness tab). */
function c5ctlRankRows(){
  var ids=['ctl_identity','ctl_email','ctl_edr','ctl_vuln','ctl_dlp'];
  var ms=ids.map(function(id){return c5get(id);});
  var maxR=Math.max.apply(null,ms.map(function(m){return m.removed||0;}).concat([1]));
  var minM=null;ms.forEach(function(m){if(m.connected&&(minM==null||m.removed<minM.removed))minM=m;});
  return ms.map(function(m){var review=(minM&&m.id===minM.id&&ms.filter(function(x){return x.connected;}).length>1);var pf=maxR>0?Math.round((m.removed||0)/maxR*100):0;
    return '<div class="c5row" data-c5m="'+m.id+'"><div class="c5row-main"><div class="c5row-t">'+m.name+(review?'<span class="c5tag rev">Review</span>':'')+'</div><div class="c5row-s">'+(m.connected?(usd(m.removed)+' removed · return per dollar needs per-control spend'):'connect this control')+'</div><div class="c5retbar"><i class="'+(review?'a':'')+'" style="width:'+pf+'%"></i></div></div><div class="c5row-v">'+(m.connected?usd(m.removed):'—')+'</div></div>';
  }).join('');
}
/* Tab 01 — Financial exposure */
function c5cfExposure(){
  var host=document.getElementById('cf-exposure');if(!host)return;
  var hr=c5get('cf_headroom'),cov=c5get('cf_ins_cov'),ec=c5get('exp_identity');
  var alePill=hr.connected?(hr.value>=0||/^[^−-]/.test(hr.displayValue)?'g':'r'):'n';
  var aleTxt=hr.connected?'Within appetite':'—';
  var covGap=c5get('cf_ins_gap');
  host.innerHTML=c5header()+
    c5shell('Financial exposure · are we within appetite?','Cyber exposure is within appetite — and one move keeps it there.',null,'Your modeled cyber exposure sits against the board-approved appetite, with the headroom shown below. The largest driver is a single identity gap; funding its fix protects the headroom and trims your tail. Tap any figure for the model, its inputs, and its source.')+
    '<div class="c5cards">'+c5card('exp_total')+c5card('cf_appetite')+c5card('cf_headroom')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('exp_total',alePill,aleTxt,'Your modeled cyber loss this year')+
      c5tile('cf_tail','a','Watch',(covGap.connected?('Exceeds your insured limit by '+covGap.displayValue):'the severe-but-plausible bad year'))+
      c5tile('cf_bi','b','If down','If the customer platform is down')+
      c5tile('cf_ins_cov','a','Gap',(covGap.connected?('of the tail covered · '+covGap.displayValue+' residual gap'):'of the modeled tail covered'))+
    '</div>'+
    c5bl('Bottom line','One fix protects your headroom.',null,(ec.connected?('The identity gap drives '+ec.displayValue+' of your exposure — the CISO’s top ask, in your terms. Funding it keeps you comfortably within appetite and trims the tail.'):'Connect your identity controls and the top exposure driver — the CISO’s top ask — surfaces here in dollars.'),{mid:'exp_identity',txt:ec.connected?('Approve identity fix — removes '+ec.displayValue):'Approve identity fix'})+
    '<div class="c5foot">Exposure is modeled (ALE and tail); every input traces to its source.</div>';
}
/* Tab 02 — Cyber ROI */
function c5cfRoi(){
  var host=document.getElementById('cf-roi');if(!host)return;
  var st=(typeof ROI_STATE!=='undefined')?ROI_STATE:null;var haveReturn=!!(st&&st.invested>0&&st.riskRemoved>0);
  host.innerHTML=c5header()+
    c5shell('Cyber ROI · is the spend paying off?','Every dollar of cyber spend is removing risk — and you can prove it.',null,'The dollars each budget area removes — live from your control-value ledger — and your program-level return. Tap any figure for the risk-removed model and its inputs. Per-area return multiples light up once you attribute spend by area.')+
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
  var gap=c5get('cf_ins_gap'),ec=c5get('exp_identity');
  host.innerHTML=c5header()+
    c5shell('Insurance & risk transfer · are we covered efficiently?','Covered for the everyday — watch the tail.',null,'Your policy covers a limit against the modeled tail; any shortfall is retained on the balance sheet. Your premium is priced on last year’s posture, which has since improved. You can transfer more, or reduce the tail. Tap any figure for the model and your policy record.')+
    '<div class="c5cards">'+c5card('cf_tail')+c5card('cf_ins_limit')+c5card('cf_ins_gap')+'</div>'+
    c5covBar()+
    '<div class="c5tiles" style="margin-top:16px">'+
      c5tile('cf_premium','g','Renewal leverage','Priced on last year’s posture — now improved')+
      c5tile('exp_identity','a','Tail driver','Largest single contributor to the tail')+
    '</div>'+
    c5bl('Bottom line','Close the gap two ways — buy up, or reduce the tail.',null,(gap.connected?('Raise the limit by '+gap.displayValue+', or reduce the tail by closing the identity gap — its largest driver. Reducing the tail is cheaper than the extra premium, and it improves your renewal position.'):'Connect your policy record and risk model to size the gap; the cheapest close is usually reducing the tail by fixing its largest driver.'),{mid:'exp_identity',txt:'Reduce the tail — fund identity'},{mid:'cf_ins_gap',txt:'Model buying up cover'})+
    '<div class="c5foot">Cover vs. modeled tail; premium and limits from your policy record.</div>';
}
/* Tab 04 — Cost optimization */
function c5cfCost(){
  var host=document.getElementById('cf-cost');if(!host)return;
  var dlp=c5get('ctl_dlp');
  var candidate=dlp.connected?('<div class="c5rank"><div class="c5rank-h">What we can see today · from the control-value ledger</div><div class="c5row" data-c5m="ctl_dlp"><div class="c5row-main"><div class="c5row-t">'+dlp.name+'<span class="c5tag rev">Review</span></div><div class="c5row-s">Lowest risk removed of your controls — a retire / consolidate candidate. Attribute its spend to confirm it is underwater.</div></div><div class="c5row-v">'+dlp.displayValue+'</div></div></div>'):'';
  host.innerHTML=c5header()+
    c5shell('Cost optimization · where can we save?','Savings need your spend records — one candidate is already visible.',null,'Redeployable savings come from retiring underperforming or overlapping tools at near-zero added risk. Quantifying the dollars needs your tool inventory and spend records; until they connect, Nerion shows the honest not-connected state and surfaces the one candidate it can already see from the control-value ledger. Tap any item for the overlap and utilization model.')+
    '<div class="c5cards">'+c5card('cf_savings')+c5card('cf_savings')+c5card('cf_savings')+'</div>'+
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
  host.innerHTML=c5header()+
    c5shell('Risk decisions · what needs my sign-off?','Three decisions are waiting — one clear yes, one to weigh, one to accept.',null,'Nerion surfaces the cyber choices that need a financial call — each priced, each a clean invest, transfer, or accept. Here’s what’s on your desk. Tap any decision for the full economics and its source.')+
    '<div class="c5rank"><div class="c5rank-h">Decision queue · priced from your risk model + spend records</div>'+
      c5dqRow('Invest','b','Fund the identity fix','exp_identity',(ec.connected?('Removes '+ec.displayValue+' · keeps you within appetite'):'the CISO’s top ask, in dollars'),'Recommended','g')+
      c5dqRow('Transfer','b','Buy up tail cover','cf_ins_gap',(gap.connected?('Closes the insurance gap · weigh vs reducing the tail'):'closes the insurance gap'),'Weigh','a')+
      c5dqRow('Accept','n','Accept residual phishing risk','exp_email',(em.connected?('Modeled and falling · well within tolerance'):'well within tolerance'),'Reasonable','n')+
    '</div>'+
    c5bl('Bottom line','One clear yes today.',null,(ec.connected?('The identity fix is the highest-return decision on your desk — '+ec.displayValue+' removed, and it keeps you within appetite. The transfer and the acceptance can wait for the next review.'):'The identity fix is the highest-return decision on your desk once your controls connect. The transfer and the acceptance can wait for the next review.'),{mid:'exp_identity',txt:ec.connected?('Approve identity fix — removes '+ec.displayValue):'Approve identity fix'})+
    '<div class="c5foot">Each decision is priced from its risk model and your spend records.</div>';
}

/* ================= CEO seat — same engine, strategy & trust lens ================= */
/* Tab 01 — Enterprise cyber health */
function c5ceHealth(){
  var host=document.getElementById('ce-health');if(!host)return;
  var O=c5Objectives(),ec=c5get('exp_identity');
  var atPill=O.atRisk>0?'a':'g';var atTxt=O.atRisk>0?(O.atRisk+' at risk'):'All protected';
  var hr=c5get('cf_headroom');
  host.innerHTML=c5header()+
    c5shell('Enterprise cyber health · is cyber a tailwind or a risk?','Cyber is protecting growth, not slowing it.',null,'The enterprise is secure and improving. '+O.protected+' of your '+O.total+' strategic objectives are cyber-safe; the exception carries a single, funded exposure. Cyber isn’t a blocker this quarter. Tap any figure for its basis and source.')+
    '<div class="c5cards">'+c5card('ceo_health')+c5card('ceo_objectives')+c5card('direction')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('ceo_biz_health','g','Secure','No active compromise, program improving')+
      c5tile('ceo_objectives',atPill,atTxt,(O.atRisk>0?'One carries a funded action':'All objectives cyber-safe'))+
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
    c5shell('Strategic risk · which objectives are exposed?','Six of your seven objectives are cyber-safe — one needs attention.',null,'Cyber risk mapped to your strategic objectives. Only growing the customer platform carries real exposure — the identity gap threatens its uptime and the trust it runs on. Tap any objective for its drivers.')+
    '<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Strategic objectives · cyber status</div>'+rows+'</div>'+
    c5bl('Bottom line','Protect the objective that drives growth.',null,'Growing the customer platform is your #1 objective and your only at-risk one — the identity gap threatens its uptime and the trust it runs on. The fix is funded.',{mid:'exp_identity',txt:'Back the identity fix — protects growth'})+
    '<div class="c5foot">Objectives are mapped from your strategy inputs; cyber exposure traces to source.</div>';
}
/* Tab 03 — Financial exposure (shared objects with CFO/CISO) */
function c5ceFinancial(){
  var host=document.getElementById('ce-financial');if(!host)return;
  var ec=c5get('exp_identity'),hr=c5get('cf_headroom'),ap=c5get('cf_appetite');
  host.innerHTML=c5header()+
    c5shell('Financial exposure · what could this cost us?','Cyber could cost real money — comfortably within tolerance.',null,'The headline: your modeled annual cyber loss against the board’s appetite, with the severe-year tail. The single largest driver already has a funded fix. Tap any figure for the model and its inputs.')+
    '<div class="c5cards">'+c5card('exp_total')+c5card('cf_appetite')+c5card('cf_tail')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('exp_total','g','Within appetite',(ap.connected?('Within your '+ap.displayValue+' appetite'):'Your modeled cyber loss this year'))+
      c5tile('cf_tail','a','Tail','1-in-20-year loss')+
      c5tile('exp_identity','b','Funded','Funded fix underway · biggest single driver')+
    '</div>'+
    c5bl('Bottom line','The one number that moves the headline down.',null,(ec.connected?('A single identity gap drives '+ec.displayValue+' of the total — the largest single share. Funding its fix lowers both the everyday cost and the severe-year tail, and it’s already scoped.'):'Connect your controls and the single largest loss driver — an identity gap — surfaces here with its funded fix.'),{mid:'exp_identity',txt:ec.connected?('Back the identity fix — cuts '+ec.displayValue):'Back the identity fix'})+
    '<div class="c5foot">Loss figures are modeled (ALE and tail); every input traces to its source.</div>';
}
/* Tab 04 — Brand & customer trust */
function c5ceTrust(){
  var host=document.getElementById('ce-trust');if(!host)return;
  host.innerHTML=c5header()+
    c5shell('Brand & customer trust · are we protecting trust?','Customer trust is intact — one exposure could test it.',null,'Trust is your moat. This quarter: no customer-impacting incidents, no breach disclosures, signal steady. The one exposure that could dent trust is the customer-platform identity gap. Tap any figure for its source.')+
    '<div class="c5cards">'+c5card('ceo_cust_incidents')+c5card('ceo_disclosures')+c5card('ceo_trust_signal')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('ceo_customer_data','g','Protected','No customer data at risk this quarter')+
      c5tile('ceo_uptime','g','Healthy','Customer platform uptime · connect monitoring')+
      c5tile('ceo_disclosures','g','None','To customers or regulators')+
      c5tile('exp_identity','a','Watch','The one exposure to the customer platform')+
    '</div>'+
    c5bl('Bottom line','Protect the moat before it’s tested.',null,'Trust is intact today, but the identity gap is the one thing that could put customer data or platform uptime — and the trust that depends on them — at risk. The fix is funded.',{mid:'exp_identity',txt:'Back the identity fix — protects trust'})+
    '<div class="c5foot">Incident, availability, and disclosure data trace to source.</div>';
}
/* Tab 05 — Decisions for the CEO */
function c5ceDecisions(){
  var host=document.getElementById('ce-decisions');if(!host)return;
  var ec=c5get('exp_identity');
  var q='<div class="c5rank"><div class="c5rank-h">Decision queue · the strategic cyber calls that need you</div>'+
    '<div class="c5row" data-c5m="exp_identity"><div class="c5row-main"><div class="c5row-t"><span class="c5pill b" style="margin-right:8px">Act now</span>Back the identity fix</div><div class="c5row-s">Protects the customer platform — your #1 growth objective — and the trust it runs on</div></div><div class="c5row-v">'+(ec.connected?('−'+ec.displayValue+' risk'):'—')+'</div><span class="c5pill g" style="align-self:center">Recommended</span></div>'+
    '<div class="c5row" data-c5m="ceo_disclosures"><div class="c5row-main"><div class="c5row-t"><span class="c5pill n" style="margin-right:8px">For the board</span>Note: cyber isn’t material this quarter</div><div class="c5row-s">Ready for your board update — improving, nothing to disclose</div></div><div class="c5row-v">—</div><span class="c5pill n" style="align-self:center">Informational</span></div>'+
    '<div class="c5row" data-c5m="ceo_objectives"><div class="c5row-main"><div class="c5row-t"><span class="c5pill n" style="margin-right:8px">Optional</span>Sponsor the security-culture push</div><div class="c5row-s">Reinforces the talent &amp; workforce objective · can wait</div></div><div class="c5row-v">—</div><span class="c5pill n" style="align-self:center">Nice to have</span></div>'+
    '</div>';
  host.innerHTML=c5header()+
    c5shell('Decisions for the CEO · what needs your call?','One decision protects your top objective — the rest is on track.',null,'The strategic cyber calls that need you — no technical detail, just the business choice. Only one needs action now. Tap any item for the full picture.')+
    q+
    c5bl('Bottom line','One call, clearly worth making.',null,(ec.connected?('Backing the identity fix protects your #1 growth objective and your customer trust, at a fraction of the exposure it removes ('+ec.displayValue+'). Everything else is on track and can wait for the next review.'):'Backing the identity fix protects your #1 growth objective and your customer trust. Everything else is on track and can wait for the next review.'),{mid:'exp_identity',txt:'Back the identity fix'})+
    '<div class="c5foot">Each decision links to its underlying model and source.</div>';
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
    c5shell('Cyber on one scale · how does it compare to our other risks?','Cyber sits mid-pack among your principal risks — watch its direction.',null,'On one enterprise scale, cyber sits against market, credit, operational and compliance risk. Its direction — not just its size — is what the risk committee tracks; a single identity gap drives most of it. Tap any risk for its basis.')+
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
    c5shell('Risk appetite & acceptance · are we within tolerance?','Within appetite overall — but one category is over its limit.',null,'Cyber residual sits against the board’s appetite with headroom overall. By category, the largest driver is over its share of that appetite. Tap any category for its appetite basis and residual model.')+
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
    c5shell('Control assurance · are the controls working?','Controls are largely assured — with gaps where it matters.',null,'Assurance across your control families — evidenced from tests and telemetry, not self-attestation. Most are assured; identity and third-party carry a partial-assurance gap. Tap any family for its evidence and last test.')+
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
  host.innerHTML=c5header()+
    c5shell('Trend & ownership · are we improving, and who owns what?','The direction is good — with clear owners.',null,'Direction and accountability. Cyber residual’s quarter-over-quarter trend is below, and every top risk has a named owner and an action; one — identity — needs your governance push. Tap any item for detail.')+
    '<div class="c5cards">'+c5card('direction')+c5card('cr_consec')+c5card('cr_owned')+'</div>'+
    '<div class="c5rank" style="padding:12px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:0 0 8px">Residual risk, last 6 quarters</div>'+bars+'</div>'+
    '<div class="c5rank" style="padding:4px 15px;margin-top:14px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Top risks · owner and action</div>'+rows+'</div>'+
    c5bl('Bottom line','The trend is good — keep the one action moving.',null,'Every top risk is owned and moving. The identity action is funded but needs your governance push to land this quarter — it’s the biggest single reduction available.',{mid:'exp_identity',txt:'Sponsor the identity action'})+
    '<div class="c5foot">Trend from the residual-risk series; owners from your risk register.</div>';
}
/* Tab 05 — Decisions for the CRO */
function c5crDecisions(){
  var host=document.getElementById('cr-decisions');if(!host)return;
  var ec=c5get('exp_identity'),ev=c5get('exp_vendor'),em=c5get('exp_email');var V=c5vendors();var tvName=V.worst?V.worst.name:'top vendor';
  var q='<div class="c5rank"><div class="c5rank-h">Decision queue · each with residual, appetite and a recommendation</div>'+
    '<div class="c5row" data-c5m="exp_identity"><div class="c5row-main"><div class="c5row-t"><span class="c5pill b" style="margin-right:8px">Treat</span>Identity gap</div><div class="c5row-s">Over its category share of appetite · treating removes '+(ec.connected?ec.displayValue:'the residual')+'</div></div><div class="c5row-v">'+(ec.connected?('−'+ec.displayValue):'—')+'</div><span class="c5pill g" style="align-self:center">Recommended</span></div>'+
    '<div class="c5row" data-c5m="exp_vendor"><div class="c5row-main"><div class="c5row-t"><span class="c5pill a" style="margin-right:8px">Monitor</span>Third-party concentration — '+tvName+'</div><div class="c5row-s">Within limit but rating to watch · keep monitoring</div></div><div class="c5row-v">'+(ev.connected?ev.displayValue:'—')+'</div><span class="c5pill n" style="align-self:center">Watch</span></div>'+
    '<div class="c5row" data-c5m="exp_email"><div class="c5row-main"><div class="c5row-t"><span class="c5pill n" style="margin-right:8px">Accept</span>Residual phishing risk</div><div class="c5row-s">Modeled and falling · within tolerance</div></div><div class="c5row-v">'+(em.connected?em.displayValue:'—')+'</div><span class="c5pill n" style="align-self:center">Reasonable</span></div>'+
    '</div>';
  host.innerHTML=c5header()+
    c5shell('Decisions for the CRO · what needs your call?','Three risk decisions — one to treat, one to monitor, one to accept.',null,'The risk decisions on your desk, each with its residual, appetite, and a recommendation. Only one needs treating now. Tap any for the full risk picture and source.')+
    q+
    c5bl('Bottom line','One risk needs treating today.',null,(ec.connected?('The identity gap is the only principal-risk driver over its appetite share, and treating it is the single biggest reduction available ('+ec.displayValue+'). The other two are appropriately monitored or accepted.'):'The identity gap is the driver over its appetite share, and treating it is the biggest reduction available. The other two are appropriately monitored or accepted.'),{mid:'exp_identity',txt:ec.connected?('Treat the identity risk — removes '+ec.displayValue):'Treat the identity risk'})+
    '<div class="c5foot">Each decision carries its residual, appetite, and source.</div>';
}

/* ================= COO seat — same engine, operations & continuity lens ================= */
/* Tab 01 — Operational resilience */
function c5coResilience(){
  var host=document.getElementById('co-resilience');if(!host)return;
  var P=c5Processes(),ec=c5get('exp_identity'),tp=c5get('thirdparty_risk');var V=c5vendors();var tvName=V.worst?V.worst.name:'a vendor';
  var atPill=P.atRisk>0?'a':'g';
  host.innerHTML=c5header()+
    c5shell('Operational resilience · can we keep running?','Operations are resilient — one process carries the only real risk.',null,'Your critical operations are healthy and continuity-ready. Of your critical processes, most are fully protected; the customer platform carries a single cyber exposure — identity. Tap any figure for its basis and source.')+
    '<div class="c5cards">'+c5card('coo_resilience')+c5card('coo_processes')+c5card('coo_recovery_ready')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('coo_bc','g','Ready','Recovery plans tested this quarter')+
      c5tile('coo_processes',atPill,(P.atRisk>0?(P.atRisk+' at risk'):'All protected'),(P.atRisk>0?'One carries a cyber exposure':'All processes continuity-safe'))+
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
    c5shell('Critical process health · which processes are exposed?','Most critical processes are cyber-safe — one needs attention.',null,'Cyber risk mapped to your critical operational processes. Only the customer platform carries real exposure; a payments process is on watch through a vendor. Tap any process for its drivers and dependencies.')+
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
    c5shell('Supply chain & third parties · can a vendor stop us?','Your supply chain is steady — one Tier-1 vendor needs watching.',null,'Third-party risk to your operations. Among your Tier-1 vendors, the worst-rated is a single point of failure for a critical process. The rest are healthy. Tap any vendor for its rating and the processes it touches.')+
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
    c5shell('Recovery readiness · can we bounce back?','Recovery is tested — watch the identity path.',null,'Your recovery posture: RTO and RPO against target from the last test, backups verified. The one gap — restoring identity and access quickly — could slow a customer-platform restore. Tap any figure for the test evidence.')+
    '<div class="c5cards">'+c5card('coo_rto')+c5card('coo_rpo')+c5card('coo_last_test')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('coo_backups','g','Verified','Restore-tested this quarter')+
      c5tile('coo_rto','g','Recovery time','Slowest critical service, vs target')+
      c5tile('coo_rpo','g','Data-loss window','Backup cadence, vs target')+
      c5tile('coo_identity_recovery',(ir.connected&&ir.color==='warn')?'a':'g',(ir.connected&&ir.color==='warn')?'Gap':'Ready','Access recovery — often the weak link')+
    '</div>'+
    c5bl('Bottom line','Close the recovery gap in your critical path.',null,(ec.connected?('Recovery meets targets where measured, but slow identity restoration could delay a customer-platform recovery. The identity fix improves recovery too — resilient access means a faster restore.'):'Connect your identity tools and the recovery weak link — access restoration — surfaces here, tied to the funded identity fix.'),{mid:'exp_identity',txt:'Fund the identity fix — faster recovery'})+
    '<div class="c5foot">RTO/RPO and backup results from your last recovery test.</div>';
}
/* Tab 05 — Decisions for the COO */
function c5coDecisions(){
  var host=document.getElementById('co-decisions');if(!host)return;
  var ec=c5get('exp_identity'),tp=c5get('thirdparty_risk');
  var q='<div class="c5rank"><div class="c5rank-h">Decision queue · each tied to a critical process</div>'+
    '<div class="c5row" data-c5m="exp_identity"><div class="c5row-main"><div class="c5row-t"><span class="c5pill b" style="margin-right:8px">Fund</span>Fund the identity fix</div><div class="c5row-s">Protects customer-platform uptime and recovery — your most critical process</div></div><div class="c5row-v">'+(ec.connected?('−'+ec.displayValue):'—')+'</div><span class="c5pill g" style="align-self:center">Recommended</span></div>'+
    '<div class="c5row" data-c5m="thirdparty_risk"><div class="c5row-main"><div class="c5row-t"><span class="c5pill a" style="margin-right:8px">Mitigate</span>Reduce the vendor single point of failure</div><div class="c5row-s">Falling rating on a critical-process vendor · add resilience</div></div><div class="c5row-v">'+(tp.connected?tp.displayValue:'—')+'</div><span class="c5pill n" style="align-self:center">Advised</span></div>'+
    '<div class="c5row" data-c5m="coo_bc"><div class="c5row-main"><div class="c5row-t"><span class="c5pill n" style="margin-right:8px">Maintain</span>Continuity plans</div><div class="c5row-s">Tested and current · maintain the cadence</div></div><div class="c5row-v">—</div><span class="c5pill n" style="align-self:center">On track</span></div>'+
    '</div>';
  host.innerHTML=c5header()+
    c5shell('Decisions for the COO · what needs your call?','Two operational calls — one to fund, one to shore up.',null,'The operational cyber decisions on your desk, each tied to a critical process. Tap any for the full picture and source.')+
    q+
    c5bl('Bottom line','One call protects what can’t go down.',null,(ec.connected?('Funding the identity fix protects your most critical process — the customer platform — for both uptime and recovery ('+ec.displayValue+' removed). Shoring up the vendor dependency is the next priority.'):'Funding the identity fix protects your most critical process for both uptime and recovery. Shoring up the vendor dependency is the next priority.'),{mid:'exp_identity',txt:'Fund the identity fix — protects uptime'})+
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
    c5shell('Regulatory exposure · where are we exposed by jurisdiction?','Your obligations, by jurisdiction — with the exposure most likely to trigger a filing.',null,'Your cyber-regulatory obligations, by jurisdiction, each with its clock and penalty — surfaced, not judged (the compliance call is yours). The customer-platform identity gap is the exposure most likely to trigger a reportable event. Tap any regime for the obligation and evidence.')+
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
    c5shell('Breach-notification readiness · are the clocks and evidence ready?','You can meet the clocks — if the evidence is ready.',null,'If a breach hit today, could you notify in time and prove what happened? Your fastest clock is below. Runbooks are the readiness signal; identity is the one area where forensic readiness is thin. Tap any clock for the runbook and evidence.')+
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
    c5shell('Contractual & litigation risk · where is our liability?','Liability is contained — one cluster of contracts to watch.',null,'Your cyber-related contractual and litigation exposure. A cluster of enterprise contracts warrants customer-platform uptime and security; a falling-rated vendor’s indemnity is worth review. Contract counts need your CLM connected. Tap any item for the clause and exposure.')+
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
    c5shell('Privacy & DSAR · are we handling requests on time?','Privacy operations are running — access hygiene is the soft spot.',null,'Your privacy posture: data-subject requests against SLA, records of processing, consent. The one soft spot is access hygiene — over-permissioned or stale identities near personal data, part of the identity gap. Tap any figure for its source.')+
    '<div class="c5cards">'+c5card('cl_dsar_sla')+c5card('cl_ropa')+c5card('cl_access_pd')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('cl_dsar_sla','g','On SLA','Data-subject requests handled within the statutory clock')+
      c5tile('cl_ropa','n','Connect','Records of processing — connect your RoPA system')+
      c5tile('cl_litigation','g','Holds','Active cyber-related litigation holds')+
      c5tile('cl_access_pd',(ap.connected&&ap.color==='warn')?'a':'g',(ap.connected&&ap.color==='warn')?'Watch':'Clean','The identity gap touches access to personal data')+
    '</div>'+
    c5bl('Bottom line','Tighten access to personal data.',null,(ec.connected?('Over-permissioned or stale identities near personal data are a privacy risk and part of the identity gap. Closing it ('+ec.displayValue+') enforces least-privilege access — lower privacy exposure and cleaner audits.'):'Connect your identity tools and the access-hygiene soft spot near personal data surfaces here, tied to the funded identity fix.'),{mid:'exp_identity',txt:'Enforce least-privilege — fund the fix'})+
    '<div class="c5foot">Privacy operations from your DSAR and records-of-processing systems.</div>';
}
/* Tab 05 — Decisions for the CLO */
function c5clDecisions(){
  var host=document.getElementById('cl-decisions');if(!host)return;
  var ec=c5get('exp_identity'),tp=c5get('thirdparty_risk');
  var q='<div class="c5rank"><div class="c5rank-h">Decision queue · each linked to an obligation, contract or record</div>'+
    '<div class="c5row" data-c5m="exp_identity"><div class="c5row-main"><div class="c5row-t"><span class="c5pill b" style="margin-right:8px">Support</span>Support the identity fix</div><div class="c5row-s">Reduces your top disclosure trigger, protects platform warranties, and tightens access to personal data</div></div><div class="c5row-v">'+(ec.connected?('−'+ec.displayValue):'—')+'</div><span class="c5pill g" style="align-self:center">Recommended</span></div>'+
    '<div class="c5row" data-c5m="cl_binding_clock"><div class="c5row-main"><div class="c5row-t"><span class="c5pill n" style="margin-right:8px">Advise</span>Materiality view for the board</div><div class="c5row-s">Nothing currently flagged material · ready for disclosure counsel</div></div><div class="c5row-v">—</div><span class="c5pill n" style="align-self:center">Informational</span></div>'+
    '<div class="c5row" data-c5m="thirdparty_risk"><div class="c5row-main"><div class="c5row-t"><span class="c5pill a" style="margin-right:8px">Review</span>Vendor indemnity</div><div class="c5row-s">Falling-rated vendor · review the indemnity and exit terms</div></div><div class="c5row-v">'+(tp.connected?tp.displayValue:'—')+'</div><span class="c5pill n" style="align-self:center">Advised</span></div>'+
    '</div>';
  host.innerHTML=c5header()+
    c5shell('Decisions for the CLO · what needs your call?','One legal call ties them together — plus a materiality view for the board.',null,'The legal and disclosure decisions on your desk. One action reduces your top disclosure, contractual, and privacy exposures at once. Tap any for the full picture and source.')+
    q+
    c5bl('Bottom line','One action, three exposures reduced.',null,(ec.connected?('The identity fix reduces your most probable breach-notification trigger, protects the platform-tied warranties, and enforces least-privilege access to personal data ('+ec.displayValue+' removed). It’s the highest-leverage legal risk reducer on your desk.'):'The identity fix reduces your most probable breach-notification trigger, protects the platform-tied warranties, and enforces least-privilege access to personal data. It’s the highest-leverage legal risk reducer on your desk.'),{mid:'exp_identity',txt:'Support the identity fix'})+
    '<div class="c5foot">Each decision links to its obligation, contract, or record. Not legal advice.</div>';
}
