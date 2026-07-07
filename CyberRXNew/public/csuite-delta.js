/* csuite-delta.js — ADDITIVE renderer for the DELTA Board / CLO / CRO oversight
   tiles (DELTA_Board_CLO_CRO.md). Loads after ciso5.js in the cockpit. Renders into
   the delta-board / delta-clo / delta-cro containers that the board/clo/cro seats
   add; touches nothing in the six existing views. Tiles are gated by the backend
   /api/dashboards/:role (each tile carries satisfied/missing); an unmet tile shows
   "Needs: <input> · Set it up →" and deep-links back to onboarding. */
(function(){
  if(typeof document==='undefined')return;
  // Minimal styles (namespaced; independent of the c5 sheet).
  try{var css=[
    '.dlt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-top:6px}',
    '.dlt-tile{border:1px solid var(--line,#e5e9f0);border-radius:12px;padding:14px 16px;background:var(--surface,#fff)}',
    '.dlt-tile.needs{border-style:dashed;opacity:.92}',
    '.dlt-l{font-size:12.5px;color:var(--ink-2,#516074);font-weight:500;line-height:1.35}',
    '.dlt-h{font-size:16px;font-weight:600;margin-top:8px;color:var(--ink,#0d1b2a)}',
    '.dlt-h.good{color:var(--good,#0ca30c)}.dlt-h.warn{color:var(--warn,#c47a0a)}.dlt-h.crit{color:var(--crit,#c62828)}.dlt-h.muted{color:var(--muted,#8a93a1)}',
    '.dlt-d{font-size:11.5px;color:var(--muted,#8a93a1);margin-top:6px;line-height:1.45}',
    '.dlt-mock{display:inline-block;font-size:9px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--warn,#c47a0a);border:1px solid rgba(196,122,10,.4);border-radius:20px;padding:1px 6px;margin-left:6px}',
    '.dlt-needs{cursor:pointer;color:var(--blue,#2f6fed);font-size:12px}',
    '.dlt-head{font-family:inherit}.dlt-grp{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#8a93a1);margin:16px 0 2px}'
  ].join('');var s=document.createElement('style');s.textContent=css;document.head.appendChild(s);}catch(_){}

  // Board tiles group into the spec's three sub-tabs; clo/cro render flat.
  var GROUPS={board:[['Risk oversight',['board_posture','board_toprisks','board_trend']],['Material exposure & disclosure',['board_material','board_regexposure','board_insurance']],['Assurance & accountability',['board_assurance','board_accountability','board_investment']]]};

  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
  function tileHtml(t){
    if(!t.satisfied){
      return '<div class="dlt-tile needs"><div class="dlt-l">'+esc(t.label)+'</div>'+
        '<div class="dlt-h muted" style="font-size:13px">Needs data</div>'+
        '<div class="dlt-d"><span class="dlt-needs">Needs: '+esc((t.missing||[]).join(', '))+' · Set it up →</span></div></div>';
    }
    return '<div class="dlt-tile"><div class="dlt-l">'+esc(t.label)+(t.mocked?'<span class="dlt-mock">illustrative</span>':'')+'</div>'+
      '<div class="dlt-h '+(t.tone||'muted')+'">'+esc(t.headline||'')+'</div>'+
      (t.detail?'<div class="dlt-d">'+esc(t.detail)+'</div>':'')+'</div>';
  }
  function render(role,host,data){
    var byId={};(data.tiles||[]).forEach(function(t){byId[t.id]=t;});
    var html='';
    if(GROUPS[role]){
      GROUPS[role].forEach(function(g){
        html+='<div class="dlt-grp">'+esc(g[0])+'</div><div class="dlt-grid">'+g[1].map(function(id){return byId[id]?tileHtml(byId[id]):'';}).join('')+'</div>';
      });
    } else {
      html='<div class="dlt-grid">'+(data.tiles||[]).map(tileHtml).join('')+'</div>';
    }
    host.innerHTML=html;
    host.querySelectorAll('.dlt-needs').forEach(function(n){n.addEventListener('click',function(){try{window.parent&&window.parent.postMessage({type:'cyberrx-goto-onboarding'},'*');}catch(_){}});});
  }
  function base(){try{return (typeof apiBase==='function')?apiBase():(window.CYBERRX_API||'https://cyber-rx.onrender.com');}catch(_){return 'https://cyber-rx.onrender.com';}}
  function org(){try{return (typeof orgId==='function')?orgId():(window.CYBERRX_ORG_ID||'');}catch(_){return '';}}

  // Render whichever delta container is present (only the active seat's exists).
  window.renderDelta=function(){
    ['board','clo','cro'].forEach(function(role){
      var host=document.getElementById('delta-'+role);if(!host)return;
      var b=base(),o=org();
      if(!b||!o){host.innerHTML='<div class="dlt-d">Connect your org to populate the '+role.toUpperCase()+' oversight tiles.</div>';return;}
      try{fetch(b+'/api/dashboards/'+role+'?org_id='+encodeURIComponent(o),{headers:{'Accept':'application/json'}})
        .then(function(r){return r.ok?r.json():null;})
        .then(function(d){if(d&&d.tiles)render(role,host,d);})
        .catch(function(){});}catch(_){}
    });
  };
})();
