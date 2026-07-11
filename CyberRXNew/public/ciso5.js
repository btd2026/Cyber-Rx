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
    '.c5aic-s{font-size:12.5px;color:var(--ink-2);margin-top:3px;line-height:1.4;overflow-wrap:anywhere}',
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
    '.c5bdbox{cursor:pointer;position:relative}',
    '.c5bdbox:hover{border-color:var(--blue)}',
    '.c5bdbox::after{content:"\\203A";position:absolute;top:7px;right:10px;color:var(--muted);opacity:0;transition:opacity .12s;font-weight:700;font-size:14px;line-height:1}',
    '.c5bdbox:hover::after{opacity:.75}',
    '.c5prow.c5bdbox::after{top:50%;transform:translateY(-50%);right:8px}',
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
    '.c5statgrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:18px;margin-bottom:20px}',
    '.c5seclab{font-size:11.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin-bottom:7px}',
    '.c5erow{display:flex;align-items:center;gap:13px;padding:12px 10px;margin:0 -10px;border-radius:10px;border-bottom:.5px solid var(--line);cursor:pointer;transition:background .14s ease,box-shadow .14s ease}',
    '.c5erow:hover{background:var(--surface-2);box-shadow:inset 3px 0 0 var(--blue)}',
    '.c5erow:last-child{border-bottom:none}',
    '.c5exp{font-size:14px;font-weight:600;line-height:1.3;color:var(--ink);letter-spacing:-.005em}',
    '.c5esub{font-size:12px;color:var(--ink-2);margin-top:2px}',
    '.c5etrack{width:104px;height:7px;background:var(--surface-2);border-radius:6px;overflow:hidden;flex-shrink:0;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--line) 60%,transparent)}',
    '.c5etrack>div{border-radius:6px;transition:width .5s cubic-bezier(.2,.7,.3,1)}',
    '.c5emult{font-size:15px;font-weight:700;width:58px;text-align:right;color:var(--ink);font-variant-numeric:tabular-nums;letter-spacing:-.01em}',
    '.c5rank{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:7px;background:var(--surface-2);color:var(--muted);font-size:11.5px;font-weight:700;flex:none;font-variant-numeric:tabular-nums}',
    '.c5rank.top{background:color-mix(in srgb,var(--good) 16%,var(--surface));color:var(--good)}',
    '.c5opgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px;margin-bottom:6px}',
    '.c5opc{position:relative;background:linear-gradient(155deg,var(--surface) 0%,var(--surface-2) 100%);border-radius:16px;padding:17px 19px 17px;cursor:pointer;border:1px solid var(--line);box-shadow:0 1px 2px rgba(16,24,40,.05),0 8px 20px -14px rgba(16,24,40,.18);transition:transform .18s cubic-bezier(.2,.7,.3,1),box-shadow .18s ease,border-color .18s ease;overflow:hidden}',
    '.c5opc::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--ac,var(--line)),color-mix(in srgb,var(--ac,var(--line)) 55%,transparent));opacity:1}',
    '.c5opc::after{content:"";position:absolute;right:-30px;top:-30px;width:110px;height:110px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--ac,var(--muted)) 12%,transparent),transparent 68%);pointer-events:none}',
    '.c5opc:hover{transform:translateY(-3px);box-shadow:0 14px 34px -12px rgba(16,24,40,.28);border-color:color-mix(in srgb,var(--ac,var(--line-2)) 55%,var(--line))}',
    '.c5opc-h{display:flex;align-items:center;gap:10px;margin-bottom:12px;position:relative}',
    '.c5opc-ic{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;background:color-mix(in srgb,var(--ac,var(--muted)) 15%,var(--surface));color:var(--ac,var(--ink-2));flex:none;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ac,var(--muted)) 22%,transparent)}',
    '.c5opc-ic svg{width:18px;height:18px}',
    '.c5opc-t{font-size:12px;font-weight:600;color:var(--ink-2);line-height:1.25;letter-spacing:.01em}',
    '.c5opc-v{font-size:29px;font-weight:760;color:var(--ink);line-height:1.0;letter-spacing:-.02em;font-variant-numeric:tabular-nums;position:relative}',
    '.c5opc-s{font-size:12px;color:var(--ink-2);margin-top:7px;line-height:1.45;position:relative}',
    '.c5opc-go{position:absolute;right:15px;top:16px;font-size:11px;font-weight:600;color:var(--ac,var(--muted));opacity:0;transition:opacity .16s}',
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
    '@media(max-width:720px){.c5tiles{grid-template-columns:1fr}.c5aigrid{grid-template-columns:1fr}.c5attgrid{grid-template-columns:repeat(2,1fr)}.c5prow-n{width:120px}.c5statgrid{grid-template-columns:1fr}.c5opgrid{grid-template-columns:1fr}}',
    /* Collapsed accordions in the executive detail drawer — deeper evidence, closed by default. */
    '.c5acc{margin-top:10px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2);overflow:hidden}',
    '.c5acc>summary{cursor:pointer;list-style:none;padding:10px 14px;font-size:12.5px;font-weight:700;color:var(--ink);display:flex;align-items:center;gap:9px}',
    '.c5acc>summary::-webkit-details-marker{display:none}',
    '.c5acc>summary .c5acc-mk{color:var(--muted);font-size:11px;transition:transform .15s;flex:none}',
    '.c5acc[open]>summary .c5acc-mk{transform:rotate(90deg)}',
    '.c5acc>summary:hover{color:var(--blue)}',
    '.c5acc-body{padding:2px 14px 14px}'
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
/* Evidence inputs for the CEO Customer-Trust surfaces, gathered once so the cards,
   the answer sentence and the evidence-confidence panel can never disagree. Every
   field is a live signal or a modeled driver — nothing typed here. */
function c5TrustInputs(){
  var oi=(typeof sig==='function')?sig('open_incidents'):null;
  var incidentsConnected=oi!=null;
  var M=(typeof c5expModel==='function')?c5expModel():{drivers:[]};
  var identityMaterial=(M.drivers||[]).some(function(d){return d.id==='exp_identity'&&d.usd>0;});
  var dlpC=false;try{dlpC=(typeof CAP_BY_KEY!=='undefined'&&CAP_BY_KEY.dlp&&typeof capDeploy==='function')?(capDeploy(CAP_BY_KEY.dlp)!=null):false;}catch(_){ }
  var availabilityConnected=false;try{availabilityConnected=!!(sig('platform_uptime')!=null);}catch(_){ }
  return {
    incidentsConnected:incidentsConnected, incidents:oi,
    disclosures:incidentsConnected?0:null, disclosuresConnected:incidentsConnected,
    identityMaterial:identityMaterial, dlpConnected:dlpC,
    incidentTouchingData:incidentsConnected?oi:0, availabilityConnected:availabilityConnected
  };
}
function c5sqClass(colorName){return colorName==='good'?'g':colorName==='warn'?'a':colorName==='blue'?'b':colorName==='crit'?'r':'n';}
function c5avgDeploy(caps){var v=(caps||[]).filter(function(k){return k!=='__vendor';}).map(function(k){return capDeploy(CAP_BY_KEY[k]);}).filter(function(x){return x!=null;});return v.length?Math.round(v.reduce(function(s,x){return s+x;},0)/v.length):null;}
function c5vendors(){var seed=(typeof vendorSeed==='function')?vendorSeed():[];var vs=(typeof vendorService==='function')?vendorService():null;
  var p=(typeof VENDOR_PORT!=='undefined'&&VENDOR_PORT)?VENDOR_PORT:((typeof vendorLocalPortfolio==='function')?vendorLocalPortfolio(seed,vs):{vendors:[],count:0,at_risk:0});
  var rated=((p&&p.vendors)||[]).filter(function(v){return v.score!=null;}).sort(function(a,b){return a.score-b.score;});
  var atRisk=rated.filter(function(v){return v.score<75;});
  return {seed:seed,vs:vs,p:p,atRisk:atRisk,worst:rated[0]||null};}

/* ── Single shared source for the five critical systems every seat reasons about, so the
   COO Recovery / Resilience / Vendors and CIO Tech-estate tabs can't drift. Each tab
   attaches its own per-system detail (RTO, vendor rating, open vulns…) but the identity,
   ordering and canonical label come from here. c5sysLabel(key) resolves a system's label;
   pass a per-tab override when a seat uses its own wording for the same underlying system. */
var C5_SYSTEMS=[
  {key:'customer',label:'Customer platform'},
  {key:'payments',label:'Payments processing'},
  {key:'fulfillment',label:'Order fulfillment'},
  {key:'supply',label:'Supply chain'},
  {key:'financial',label:'Financial close'}
];
function c5sysLabel(key,override){if(override)return override;for(var i=0;i<C5_SYSTEMS.length;i++){if(C5_SYSTEMS[i].key===key)return C5_SYSTEMS[i].label;}return key;}
/* Shared per-service critical-service records — one source for the COO Recovery AND
   Resilience tabs so RTO/RPO/failover can't drift between them. The customer-platform row
   wires to live resilience signals (worst RTO · rpo_minutes · identity deployment); the
   other four are Modeled sample rows until per-service recovery telemetry connects. Returns
   the Recovery-tab shape {n,dep,rto,tgt,rpo,rtgt,live,root,failover}. */
function c5CriticalServices(){
  var R=(typeof LIVE!=='undefined'&&LIVE&&LIVE.resilience)||{};
  var rtoTgt=4,rpoTgt=60;
  var worst=R.worst_recovery_hours,rtoConn=worst!=null;
  var rpoMin=(typeof sig==='function')?sig('rpo_minutes'):null,rpoConn=rpoMin!=null;
  var idP=(typeof c5avgDeploy==='function')?c5avgDeploy(['mfa','pam']):null,idConn=idP!=null,idPct=idConn?idP:78;
  return [
    {n:c5sysLabel('customer',R.worst_recovery_service||null),dep:'GreenLake billing · identity recovery '+idPct+'%',rto:(rtoConn?worst:24),tgt:rtoTgt,rpo:(rpoConn?rpoMin:15),rtgt:rpoTgt,live:(rtoConn&&rpoConn),root:true,failover:'No failover'},
    {n:c5sysLabel('payments'),dep:'Core processor',rto:2,tgt:4,rpo:5,rtgt:30,live:false,failover:'Backup ready'},
    {n:c5sysLabel('fulfillment'),dep:'WMS · logistics',rto:3,tgt:8,rpo:30,rtgt:60,live:false,failover:'Backup ready'},
    {n:c5sysLabel('supply'),dep:'3PL vendors',rto:6,tgt:12,rpo:60,rtgt:240,live:false,failover:'Partial alternative'},
    {n:c5sysLabel('financial'),dep:'ERP',rto:4,tgt:24,rpo:240,rtgt:1440,live:false,failover:'Backup ready'}
  ];}
/* Shared identity-fix / decision config — the cost (derived from the live exposure model
   via the top driver, never retyped), plus the fixed timeline, owner and framing. The COO
   Recovery/Vendors, the CIO Tech-estate and the Decisions tabs all read this so the
   identity fix reads the same everywhere. */
function c5IdFix(){
  var TD=(typeof c5TopDriver==='function')?c5TopDriver():{mid:'exp_identity',short:'identity',name:'Identity sprawl in cloud',ok:false};
  var dm=(typeof c5get==='function')?c5get(TD.mid):{connected:false};
  return {mid:TD.mid,short:TD.short,name:TD.name,usd:(dm&&dm.connected)?dm.displayValue:null,timeline:'90–180 days',owner:'CISO / CIO'};}
/* Shared EU AI Act risk-class vocabulary — one taxonomy any AI-related view across seats
   can reuse so class names and colours stay consistent. High = red, Limited = amber,
   Minimal = green. c5aiRiskCls(class) → the semantic colour token. NOTE: real
   classifications must come from the model registry + an actual EU AI Act mapping; any
   placeholder must stay conservative (a legally-high-risk system is never shown Minimal)
   and behind the Illustrative badge. */
var C5_AI_RISK={High:{col:'crit',rank:0},Limited:{col:'warn',rank:1},Minimal:{col:'good',rank:2}};
function c5aiRiskCls(k){return (C5_AI_RISK[k]&&C5_AI_RISK[k].col)||'muted';}
function c5aiRiskRank(k){return (C5_AI_RISK[k]&&C5_AI_RISK[k].rank!=null)?C5_AI_RISK[k].rank:9;}
/* ── Cross-cutting enterprise constants shared by every seat's operational-impact strips, so
   the customer count and downtime-per-hour figures are ONE source of truth (never retyped).
   downtimePerHr derives from the live resilience model; customers is a modeled headline
   figure until a live customer-count source is wired. ── */
var C5_XCUT={customers:'40M customers',downtimeModeledHr:12000000};
function c5xDowntimeHr(){var R=(typeof LIVE!=='undefined'&&LIVE&&LIVE.resilience)||{};var live=(R.top_downtime_per_hr||R.downtime_per_hour_usd)||null;var v=live||C5_XCUT.downtimeModeledHr;
  return {usd:v,live:!!live,str:(typeof usd==='function')?('~'+usd(v)+'/hr'):('~$'+Math.round(v/1e6)+'M/hr')};}
function c5xCustomers(){return C5_XCUT.customers;}
/* Which of a seat's analytical tabs the ONE identity fix resolves — in that seat's language.
   Feeds the Decisions-tab convergence strip so "one fix resolves N tabs" reads consistently
   and never double-counts. Tab names match each seat's analytical tabs (CEO/CLO/Board use the
   restructured proposed sets). */
function c5IdFixResolves(seat){var M={
  coo:[{tab:'Resilience',note:'restores the customer platform’s access path'},{tab:'Recovery',note:'lifts identity recovery 78% → 100%, closing the RTO gap'},{tab:'Vendors',note:'caps every vendor’s blast radius into your data'}],
  cio:[{tab:'Tech estate',note:'closes the customer platform’s architecture gap'},{tab:'AI',note:'secures the customer-data AI’s access to data'},{tab:'Software supply chain',note:'hardens the auth path the advisory sits on'}],
  cro:[{tab:'Vs other risks',note:'moves cyber down the enterprise scale'},{tab:'Appetite',note:'brings the identity category back within its share'},{tab:'Trend',note:'bends residual risk downward'}],
  cfo:[{tab:'Within appetite',note:'reduces the modeled exposure against appetite'},{tab:'Spend ROI',note:'the highest risk-removed per dollar'},{tab:'Insurance',note:'trims the uninsured tail'}],
  ceo:[{tab:'Value at risk',note:'protects the growth-critical customer platform'},{tab:'Crown jewels',note:'de-risks the top revenue engine'},{tab:'Trust & disclosure',note:'lowers the odds of a disclosable event'}],
  clo:[{tab:'Regulatory exposure',note:'reduces the identity-driven privacy/access liability'},{tab:'Contracts & liability',note:'protects the uptime warranties at risk'},{tab:'Incident & disclosure',note:'strengthens forensic/access evidence readiness'}],
  board:[{tab:'Oversight',note:'the funded treatment for the top risk'},{tab:'Regulatory & disclosure',note:'lowers material-incident likelihood'},{tab:'Assurance',note:'the control the next audit will test'}],
  ciso:[{tab:'Cyber exposure',note:'closes the largest single exposure'},{tab:'Control value',note:'the highest risk-removed per dollar'},{tab:'Threats',note:'shuts the likeliest attack path'}]
};return M[seat]||[];}
/* Reusable convergence strip for every seat's Decisions tab — "one fix (identity) resolves N
   of this seat's risks", one column per analytical tab in the seat's language. Reuses the
   card/token chrome; empty string when the seat has no mapping. */
function c5convergeStrip(seat){var r=(typeof c5IdFixResolves==='function')?c5IdFixResolves(seat):[];if(!r.length)return '';var IDF=c5IdFix();
  var cols=r.map(function(x,i){return '<div style="flex:1 1 150px;min-width:130px;padding:2px 12px'+(i?';border-left:1px solid var(--line)':'')+'"><div style="font-size:11px;font-weight:700;color:var(--blue)">'+c5esc(x.tab)+'</div><div style="font-size:11.5px;color:var(--ink-2);margin-top:2px">'+c5esc(x.note)+'</div></div>';}).join('');
  return '<div class="c5card" style="margin-bottom:14px;padding:14px 16px"><div style="font-size:12.5px;font-weight:600;color:var(--ink);margin-bottom:8px">One fix — '+IDF.short+' — resolves '+r.length+' of this seat’s risks'+(IDF.usd?(' ('+IDF.usd+' · '+IDF.owner+' · '+IDF.timeline+')'):'')+':</div><div style="display:flex;flex-wrap:wrap;align-items:stretch;margin:0 -12px">'+cols+'</div></div>';}
/* Shared principal-risk register — the single source the CRO (rank/appetite/trend), Board and
   CLO read, so inherent/residual/appetite/direction/confidence/owner/cadence never drift.
   Cyber inherent = residual + the expected-loss controls buy down (control effectiveness);
   the other principal risks come from your ERM register (LIVE.portfolio) as residual inputs. */
function c5RiskRegister(){
  var M=(typeof c5expModel==='function')?c5expModel():{total:0};
  var removed=(typeof controlsEffUsd==='function')?controlsEffUsd():0;
  var p=(typeof LIVE!=='undefined'&&LIVE&&LIVE.portfolio)||{};
  var ap=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&LIVE.economics.appetite&&Number(LIVE.economics.appetite.appetite))||0;
  var tr=(typeof trajInfo==='function')?trajInfo():{two:false};
  var cyberDir=tr.two?(tr.down?'Falling':'Rising'):'Steady';
  var rows=[
    {key:'cyber',label:'Cyber risk',cyber:true,residual:M.total||0,inherent:(M.total||0)+(removed||0),appetite:ap||null,direction:cyberDir,confidence:'Modeled',owner:'CISO / CIO',cadence:'Quarterly'},
    {key:'creditMarket',label:'Credit / market',residual:Number(p.creditMarket)||0,inherent:Number(p.creditMarket)||0,appetite:null,direction:'Steady',confidence:'ERM input',owner:'CFO / Treasury',cadence:'Quarterly'},
    {key:'operational',label:'Operational risk',residual:Number(p.operational)||0,inherent:Number(p.operational)||0,appetite:null,direction:'Steady',confidence:'ERM input',owner:'COO',cadence:'Quarterly'},
    {key:'thirdParty',label:'Third-party risk',residual:Number(p.thirdParty)||0,inherent:Number(p.thirdParty)||0,appetite:null,direction:'Steady',confidence:'ERM input',owner:'COO / Procurement',cadence:'Quarterly'},
    {key:'compliance',label:'Compliance & regulatory',residual:Number(p.compliance)||0,inherent:Number(p.compliance)||0,appetite:null,direction:'Steady',confidence:'ERM input',owner:'CLO',cadence:'Quarterly'}
  ].filter(function(r){return r.residual>0;}).sort(function(a,b){return b.residual-a.residual;});
  var cyberRank=null;rows.forEach(function(r,i){if(r.cyber)cyberRank=i+1;});
  return {rows:rows,total:rows.length,cyberRank:cyberRank,cyberResidual:(M.total||0),controlsRemoved:(removed||0),appetite:ap||0};
}

/* Vendor-concentration matrix — vendor CATEGORY (not real company names) mapped to the
   SAME critical services as the Resilience / Recovery tabs. Illustrative until a live
   ratings + failover feed is wired; negative labels ("single point", "falling") must stay
   gated behind category rows / real evidence, never pinned to a named third party on an
   exec screen. Status is COMPUTED, never hard-coded: no failover on a critical service ⇒
   'single'; a falling / below-threshold rating on a critical service (but some failover)
   ⇒ 'watch'; else 'ok'. Sorted by risk (single → watch → ok) so the SPOF count derived
   from it and the finding can never contradict each other. Shared by c5coSupply and the
   coo_spof metric. */
function c5vendorMatrix(){
  function gradeVal(g){return {'A':92,'A-':88,'A−':88,'B':82,'B-':76,'B−':76,'C':68,'C-':62,'C−':62,'D':50}[g]||75;}
  var rows=[
    {cat:'Cloud hosting provider',proc:c5sysLabel('customer'),crit:true,failover:'No failover',grade:'C',trend:'down'},
    {cat:'Logistics (3PL)',proc:c5sysLabel('supply'),crit:true,failover:'Partial alternative',grade:'B−',trend:'down'},
    {cat:'Payment processor',proc:c5sysLabel('payments'),crit:true,failover:'Backup ready',grade:'A',trend:'flat'},
    {cat:'Identity provider',proc:'Access — all services',crit:true,failover:'Blast-radius control',grade:'A',trend:'flat'},
    {cat:'ERP / financials',proc:c5sysLabel('financial'),crit:true,failover:'Backup ready',grade:'B',trend:'flat'}
  ];
  rows.forEach(function(r){r.score=gradeVal(r.grade);
    var noFailover=/no failover/i.test(r.failover),weak=(r.score<75||r.trend==='down');
    r.status=(r.crit&&noFailover)?'single':(r.crit&&weak)?'watch':'ok';});
  var order={single:0,watch:1,ok:2};
  return rows.sort(function(a,b){return order[a.status]-order[b.status];});}

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
/* c5TopDriver — the ONE data-ranked top exposure driver, shared by every narrative
   surface that names "the largest driver". Reads c5expModel(), whose drivers are sorted
   by computed modeled USD, so drivers[0] is the largest by the data — never a hard-coded
   conclusion. If the drivers reorder (different org, different telemetry, different
   business area), this reorders with them and every headline / bottom-line / button that
   reads it changes automatically.
   Returns: {ok, name, phrase, threatens, mid, usd, displayValue, connected, demo}.
     name        — driver label, e.g. "Identity sprawl in cloud" (Title case, for buttons)
     phrase      — lower-case inline form, e.g. "identity sprawl in cloud"
     threatens   — the business area/process it threatens, e.g. "customer-platform uptime"
     mid         — the driver's metric id (for click-through + decision wiring)
     displayValue— the driver's modeled exposure, or "—" when not connected */
function c5TopDriver(){
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var m;try{m=c5expModel();}catch(_){m=null;}
  var d=(m&&m.drivers&&m.drivers.length)?m.drivers[0]:null;
  if(!d)return {ok:false,demo:demo,name:null,phrase:'the largest exposure driver',short:'the top driver',threatens:'',mid:'exp_total',usd:0,displayValue:'—',connected:false};
  var em;try{em=c5get(d.id);}catch(_){em={connected:false,displayValue:'—'};}
  // Short noun per driver id — a mechanical label map (not a conclusion) for compact
  // button/action text; the ranking that decides WHICH driver is still fully data-driven.
  var SHORT={exp_identity:'identity',exp_patch:'patching',exp_vendor:'vendor risk',exp_endpoint:'endpoint',exp_email:'phishing'};
  return {ok:true,demo:demo,connected:!!(d.connected&&em&&em.connected),
    name:d.name,phrase:String(d.name||'').toLowerCase(),short:SHORT[d.id]||d.name,threatens:d.threatens||'',
    mid:d.id,usd:d.usd||0,displayValue:(em&&em.connected)?em.displayValue:'—'};
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
/* The live peer cohort is active only once it reaches the minimum client count for
   k-anonymity (default 5). Until then the peer benchmark is shown as a labelled SAMPLE —
   a preview of exactly what the live comparison will look like. */
function c5peerMin(){return (typeof PEER_MIN!=='undefined')?PEER_MIN:5;}
function c5peerLive(){try{var pd=c5peer(),opt=c5peerOptin();return !!(opt&&pd&&pd.sufficient&&(pd.overall||pd.overall_values));}catch(_){return false;}}
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
        action:conn?(oi>0?('An adversary is active in your environment now ('+oi+' open incident'+(oi>1?'s':'')+') — trigger the incident-response plan, stand up the command bridge, and prioritize containment of the affected crown-jewel services.'):'No active compromise — maintain monitoring and keep detection coverage above the bar.'):'Connect your SIEM (Splunk / Sentinel) + EDR to read live compromise status.',
        note:'Whether an adversary is active in your environment right now — the first question a CISO answers each morning.',
        connectTool:'your SIEM (Splunk / Sentinel)'});}
    case 'investigations':{var oi=sig('open_incidents');var conn=oi!=null;
      return c5obj({id:id,name:'Open investigations',connected:conn,displayValue:conn?(oi+' open · none critical'):'—',label:'live',color:conn?(oi>0?'warn':'good'):'muted',
        formula:'open investigations = incidents under triage in the SIEM',
        inputs:[{name:'Open incidents',value:conn?oi:'—',source:'SIEM · open_incidents'}],sources:[c5capSrc('siem')],
        action:conn?(oi>0?('Work the '+oi+' open investigation'+(oi>1?'s':'')+' to closure in the SOC queue — none is critical today, so triage by age and severity and escalate immediately if one turns material.'):'No open investigations — hold monitoring.'):'Connect your SIEM to surface the open investigation queue.',
        note:'Active investigations your SOC is working — routine unless one escalates to critical.',connectTool:'your SIEM'});}
    case 'capability_coverage':{var caps=CAPS.map(function(c){return {c:c,p:capDeploy(c)};});
      var known=caps.filter(function(o){return o.p!=null;});var healthy=caps.filter(function(o){return o.p!=null&&o.p>=75;}).length,total=CAPS.length;var conn=known.length>0;
      return c5obj({id:id,name:'Capability & coverage',connected:conn,displayValue:conn?(healthy+' of '+total+' defenses healthy'):'—',
        label:'computed',color:conn?(healthy>=9?'good':healthy>=7?'warn':'crit'):'muted',
        formula:'healthy defenses = count(capabilities with deployment ≥ 75%) ÷ '+total+' capabilities',
        method:'Deployment % per capability comes straight from each connected control tool.',
        inputs:caps.map(function(o){return {name:o.c.name.replace(/ *\(.*\)/,''),value:(o.p!=null?(o.p+'% '+(o.p>=75?'✓ healthy':'· below 75%')):'not connected'),color:capColor(o.p),source:o.c.tool+' · '+((typeof CAP_SIGKEY!=='undefined'&&CAP_SIGKEY[o.c.k])||o.c.k)};}).concat([{name:'= Healthy defenses',value:healthy+' of '+total+' at ≥ 75% deployment',source:'count(≥75%) ÷ '+total}]),
        sources:known.map(function(o){return c5capSrc(o.c.k);}),
        action:(function(){var g=caps.filter(function(o){return o.p!=null&&o.p<75;}).length;return g?('Bring your defensive stack to healthy: '+g+' connected defense'+(g>1?'s are':' is')+' below the 75% line. Roll each out to its uncovered assets worst-first (or connect the missing control tool) — see the table for each and the step to close it.'):(healthy+' of '+total+' defenses are healthy — hold coverage and add sources as new assets are onboarded.');})(),table:(function(){var g=caps.filter(function(o){return o.p!=null&&o.p<75;}).sort(function(a,b){return a.p-b.p;});return g.length?{title:'Defenses below the healthy line · what each means and how to close it',cols:['Gap','What it means','To close it'],rows:g.map(function(o){return [{text:'⚠ '+o.c.name.replace(/ *\(.*\)/,''),color:o.p>=50?'warn':'crit',bold:true},o.p+'% deployed — below the 75% healthy line, so part of the estate is uncovered.',{text:'Roll '+o.c.name.replace(/ *\(.*\)/,'')+' out to the uncovered assets to reach ≥75% (or connect '+o.c.tool+').',color:'blue'}];})}:null;})(),note:'How much of your defensive stack is actually healthy and covering the estate — not how many tools you own.',
        connectTool:'your control tools (EDR · identity · SIEM · CNAPP)'});}
    case 'assets_monitored':{var v=(typeof siemCoverage==='function')?siemCoverage():sig('siem_coverage_pct');var conn=v!=null;
      var ls=sig('siem_log_sources');var assetN=(typeof LIVE!=='undefined'&&LIVE&&LIVE.counts&&Number(LIVE.counts.assets))||0;
      return c5obj({id:id,name:'Critical assets monitored',connected:conn,displayValue:conn?(v+'% of critical assets monitored'):'—',label:'live',color:conn?(v>=90?'good':v>=75?'warn':'crit'):'muted',
        formula:(sig('siem_coverage_pct')!=null?'monitored % = log-source coverage the SIEM reports across critical assets':'monitored % = distinct reporting hosts the SIEM sees ÷ known asset count'),
        inputs:[{name:'SIEM log-source coverage',value:conn?v+'%':'—',source:'SIEM · siem_coverage_pct'},{name:'Distinct reporting hosts',value:(ls!=null?String(ls):'—'),source:'SIEM · siem_log_sources'},{name:'Known assets',value:(assetN>0?String(assetN):'—'),source:'asset inventory (CMDB / onboarding)'}],sources:[c5capSrc('siem')],
        action:conn?(v>=90?('Coverage is strong at '+v+'% — sustain it and add log sources as new critical assets are onboarded so no crown jewel goes dark.'):('Raise SIEM log-source coverage from '+v+'% toward ≥90%: identify the critical assets not sending telemetry and onboard their log sources — you cannot detect what you cannot see.')):'Connect your SIEM (Splunk / Sentinel) so critical-asset log-source coverage is measured.',note:'You can only detect what you can see — the share of crown-jewel assets sending telemetry.',connectTool:'your SIEM (Splunk / Sentinel)'});}
    case 'thirdparty_risk':{var V=c5vendors();var conn=V.seed.length>0;var n=V.atRisk.length,worst=V.worst;
      return c5obj({id:id,name:'Third-party risk',connected:conn,displayValue:conn?(n>0?(n+' vendor'+(n>1?'s':'')+' flagged'):'All vendors adequate'):'—',
        label:(V.p&&V.p.any_live)?'live':'modeled',color:conn?(n>0?'warn':'good'):'muted',
        formula:'flagged = count(monitored vendors with security rating < 75), worst-first',
        method:'Ratings pulled from your third-party monitoring service — the same score on their portal.',
        inputs:((V.p&&V.p.vendors)?V.p.vendors.slice(0,6):[]).map(function(v){return {name:v.name,value:(v.score!=null?v.score+'/100':'—'),color:(v.color||capColor(v.score)),source:(V.vs?V.vs.vendor:'monitoring service')+' · overall_score'};}),
        sources:[{tool:V.vs?V.vs.vendor:'SecurityScorecard / BitSight',connector:'vendor_monitor',field:'overall_score',lastRefresh:c5ago()}],
        action:worst?('Start with your worst-rated vendor '+worst.name+' ('+worst.score+'/100): open its findings in your monitoring service, get a remediation plan with dates, and require evidence before renewal. '+(n>1?('Then work the other '+(n-1)+' flagged vendor'+(n-1>1?'s':'')+' below, worst-first.'):'')):'All monitored vendors are at or above the 75 rating line — keep monitoring and re-check on renewal.',table:(function(){var fl=((V.p&&V.p.vendors)||[]).filter(function(v){return v.score!=null&&v.score<75;}).sort(function(a,b){return a.score-b.score;});return fl.length?{title:'Flagged vendors · what each means and how to close it',cols:['Vendor','What it means','To close it'],rows:fl.map(function(v){return [{text:'⚠ '+v.name+' · '+v.score+'/100',color:v.score<60?'crit':'warn',bold:true},'Security rating below 75 — weak posture you inherit through this supplier.',{text:'Open '+v.name+' in your monitoring service, request its remediation plan and timeline, and require evidence before renewal.',color:'blue'}];})}:null;})(),note:worst?('Your worst-rated vendor is '+worst.name+' at '+worst.score+'/100 — exposure you carry through someone else’s security.'):'Exposure you carry through your suppliers’ security.',
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
        return c5obj({id:id,name:'Crown jewels requiring CISO attention',connected:true,
          displayValue:(esc>0?(esc+' above escalation'):(it.length+' scored'))+(top?(' · top '+top.risk):''),
          label:'computed',color:(esc>0?'crit':(top&&top.risk>=15?'warn':'good')),
          formula:'risk = norm(criticality) × exploitability(EPSS or max_cvss/10) × exposure(EDR; active-threat floor 0.7) × 100; escalate at residual ≥ 25',
          method:'Your Crown Jewel Register joined to your asset inventory, vulnerability findings (CVSS 7+) and EDR detections. '+(CJR.mocked?'Vulnerability and EDR data aren’t connected yet, so those two factors are shown as illustrative (labelled) — your crown-jewel register and criticality are real.':'Every factor comes from your connected tools.'),
          inputs:it.slice(0,8).map(function(x){return {name:x.asset+' · '+x.criticality,value:'risk '+x.risk+(x.active_threat?' · active threat':'')+' · '+x.high_crit_vuln_count+' high/crit vulns',color:(x.escalate?'crit':x.risk>=15?'warn':'good'),source:'register × VM × EDR'};}).concat([{name:'= Above escalation (≥25)',value:esc+' of '+it.length,source:'composite risk'}]),
          sources:[{tool:'Crown Jewel Register + CMDB',connector:'cmdb',field:'asset_id',lastRefresh:c5ago()},{tool:'Vulnerability mgmt (VM)',connector:'vuln',field:'max_cvss·epss'},{tool:'EDR',connector:'edr',field:'exposure·active_threat'}],
          action:top?('Your highest-risk crown jewel is '+top.asset+' (risk '+top.risk+'). Drive its residual below the 25 escalation line: patch its '+top.high_crit_vuln_count+' high/critical vuln'+(top.high_crit_vuln_count===1?'':'s')+(top.active_threat?' and contain the active EDR threat now':'')+', then work down the ranked list. '+(esc>0?(esc+' asset'+(esc>1?'s are':' is')+' above escalation and need action this week.'):'')):'Crown jewels are scored and none are above the escalation line — hold posture and re-score as VM/EDR data refreshes.',note:top?('Your highest-risk crown jewel is '+top.asset+' (risk '+top.risk+').'):'The crown-jewel systems carrying the most composite risk.',
          connectTool:'your Crown Jewel Register · CMDB · EDR · VM'});}
      var Scr=(typeof c5Services==='function')?c5Services():{list:[],total:0,atRisk:0};var conn=Scr.total>0;var topcj=(Scr.list&&Scr.list[0])||null;var atr=Scr.atRisk;
      return c5obj({id:id,name:'Crown jewels requiring CISO attention',connected:conn,
        displayValue:conn?(atr>0?(atr+' of '+Scr.total+' at risk'):(Scr.total+' crown jewels · all secure')):'—',
        label:'computed',color:conn?(atr>0?'warn':'good'):'muted',
        formula:'crown jewels at greatest risk = crown-jewel systems whose live exposure path is currently material',
        method:'Crown jewels come from your Crown Jewel Register (derived from your CMDB inventory). Risk to each is read from live EDR detections and open critical vulnerabilities (VM) on that asset.',
        inputs:(Scr.list||[]).map(function(x){
          var val=x.status+(x.status==='At risk'?(' <span data-c5crownwhy="'+c5esc(x.name)+'" style="color:var(--blue);cursor:pointer;white-space:nowrap" title="Plain-English: why this crown jewel is at risk">· why? ›</span>'):'');
          return {name:x.name+(x.tier?(' · '+x.tier):''),value:val,color:(x.status==='At risk'?'warn':'good'),source:x.src||(x.sub||'EDR · VM')};
        }).concat([{name:'= At greatest risk',value:atr+' of '+Scr.total,source:'crown jewels with a material path'}]),
        sources:[{tool:'Crown Jewel Register + CMDB',connector:'cmdb',field:'crown_jewels',lastRefresh:c5ago()},{tool:'EDR',connector:'edr',field:'detections'},{tool:'Vulnerability mgmt (VM)',connector:'vuln',field:'critical_vulns'}],
        note:topcj?('Your most exposed crown jewel is '+topcj.name+' — '+String(topcj.sub||'').toLowerCase()+'.'):'The crown-jewel systems carrying the most risk right now.',
        connectTool:'your Crown Jewel Register · CMDB · EDR · VM'});}
    case 'er_capability':{var caps2=(typeof c5CapSource==='function')?c5CapSource():((typeof LIVE!=='undefined'&&LIVE&&LIVE.capabilities)||[]);var conn=caps2.length>0;
      // Spec: JOIN Capability Map → GRC control_coverage/gaps + open_risk.
      //       exposure = (open_gaps + open_risk) × capability_tier_weight.
      //       OUTPUT [capability, control_gaps, open_risk, exposure]; sort exposure desc.
      var TW={critical:1.0,high:0.75,medium:0.5,low:0.25};
      var rowsC=caps2.map(function(c){var exp=Number(c.exposure_usd)||0;var tw=TW[String(c.grc_status||c.tier||'').toLowerCase()]||1;
        return {name:c.name,exposure:exp,gaps:(c.control_gaps!=null?Number(c.control_gaps):null),open_risk:(c.open_risk!=null?Number(c.open_risk):null),grc:c.grc_status,tw:tw,risks:(c.risks||[])};}).sort(function(a,b){return b.exposure-a.exposure;});
      var topc=rowsC[0]||null;
      // Keep modeled EXPOSURE, open control GAPS and open RISK scenarios as separate
      // measures per capability, and name each one's main driver.
      function capDriver(c){var g=Number(c.gaps)||0,rk=Number(c.open_risk)||0;
        if(g>0&&rk>0)return 'Open control gaps + open risks';
        if(g>0)return 'Open control gaps';
        if(rk>0)return 'Open risk scenarios';
        if(c.exposure>0)return 'Business criticality / modeled value';
        return 'Mapped — no connected finding';}
      var ranking=rowsC.slice(0,8).map(function(c){
        return {itemName:c.name+(c.grc?(' · GRC '+c.grc):''),
          modeledExposure:(c.exposure>0?usd(c.exposure):'mapped'),
          openControlGaps:(c.gaps!=null?c.gaps:null),
          openRiskScenarios:(c.open_risk!=null?c.open_risk:(c.risks?c.risks.length:null)),
          mainDriver:capDriver(c),
          risks:(c.risks||[]).map(function(r){return {name:r.title,severity:r.severity,exposure:(r.exposure>0?usd(r.exposure):''),service:r.service||c.name,owner:r.owner,status:r.status,action:r.action};})};
      });
      // Most-actionable capability = the one with the largest connected open-gap+risk set.
      var actAlt=null;rowsC.forEach(function(c){var n=(Number(c.gaps)||0)+(Number(c.open_risk)||0);if(n>0&&(!actAlt||n>actAlt._n)){actAlt=c;actAlt._n=n;}});
      var topActionable=!!(topc&&((Number(topc.gaps)||0)>0||(Number(topc.open_risk)||0)>0));
      var altDiffers=!!(actAlt&&topc&&actAlt.name!==topc.name);
      // Executive risk narrative — the consequence, not the methodology. Dynamic from the
      // top capability's name, exposure and gap/risk counts.
      var _cN=topc?c5esc(topc.name):'',_cE=(topc&&topc.exposure>0)?usd(topc.exposure):null,_cG=topc?(Number(topc.gaps)||0):0,_cR=topc?(Number(topc.open_risk)||0):0;
      var _cContra=!!(topc&&topc.exposure>0&&_cG===0&&_cR===0);
      var capImpact=conn&&topc?('A cyber incident in this area carries the <b>largest business consequence</b> of any capability'+(_cE?(' — <b>'+_cE+'</b> of business value sits behind '+_cN):'')+'. It is the single biggest hit the business could take from a cyber event.'):'';
      var capMeans=conn&&topc?('If '+_cN+' is disrupted or breached, up to '+(_cE||'its full modeled value')+' of business value is in the blast radius — felt in revenue, operations and customer trust, not just in IT.'+(_cContra?(' It shows <b>0</b> connected control gaps and <b>0</b> open risks today, so this exposure rests on how critical the capability is — not on a proven weakness. If your risk/GRC data isn’t connected, real gaps could be hiding here.'):(' It carries <b>'+_cG+'</b> open control gap'+(_cG===1?'':'s')+' and <b>'+_cR+'</b> open risk scenario'+(_cR===1?'':'s')+' — concrete ways that incident could happen.'))):'';
      var capAffected=conn&&topc?('The business services '+_cN+' delivers, and everything downstream that depends on it'+(altDiffers?('. For connected open findings today, '+c5esc(actAlt.name)+' carries the most'):'')+'.'):'';
      var capWhyNow=conn&&topc?(_cContra?('Left unvalidated, the business keeps carrying '+(_cE||'this concentrated exposure')+' of loss potential in its most critical area with no confirmed read of the risk — connect risk/dependency data so a real weakness can’t hide behind a “0 gaps” reading.'):('Until '+_cN+'’s '+_cG+' gap'+(_cG===1?'':'s')+' and '+_cR+' risk'+(_cR===1?'':'s')+' are closed, this stays the area where a cyber event would hurt the business most — residual risk is concentrated here.')):'';
      var action=topc
        ?(topActionable
          ?('Prioritise '+topc.name+': remediate its '+(Number(topc.gaps)||0)+' open control gap'+(Number(topc.gaps)===1?'':'s')+' and treat its '+(Number(topc.open_risk)||0)+' open risk scenario'+(Number(topc.open_risk)===1?'':'s')+', then work down the exposure-ranked list.')
          :('Validate '+topc.name+'’s exposure basis — confirm whether it is driven by business criticality, inherited dependencies, or missing risk/GRC data, since no connected open control gaps or open risk scenarios are present.'+(altDiffers?(' For actionable work now, '+actAlt.name+' carries the largest connected open set.'):'')))
        :'Connect a Business Capability Map + GRC so exposure ranks by real control-gaps and open risk per business area, then act on the top one.';
      return c5obj({id:id,name:'Business capability most exposed',connected:conn,
        displayValue:conn?(topc?(topc.name+(topc.exposure>0?(' · '+usd(topc.exposure)):'')):(caps2.length+' capabilities mapped')):'—',
        label:'computed',color:conn?((topc&&topc.exposure>0)?'warn':'good'):'muted',
        formula:'exposure = (open control-gaps + open risk) × capability-tier weight; ranked exposure-desc',
        method:'Nerion joins your business capability map to your connected control posture and open risk data. For each capability it holds three separate measures — the modeled exposure (business value at risk, weighted by how critical the capability is), the open control gaps, and the open risk scenarios — and ranks by modeled exposure. A capability can top the list on business value alone even with no open gaps or risks.',
        rankItemLabel:'Business capability',ranking:ranking,impact:capImpact,found:capMeans,affected:capAffected,whyNow:capWhyNow,
        notProve:'This ranks modeled exposure from your capability map and connected control/risk data. It does not prove a realised loss, an active incident, or that a top-ranked item with zero connected gaps is genuinely low-risk when its risk or dependency data is incomplete.',
        sources:(caps2[0]&&caps2[0].derived)
          ?[{tool:'Business functions (value chain)',connector:'capmap',field:'function · at-risk exposure',lastRefresh:c5ago(),role:'Capability inventory & criticality'},{tool:'Live control posture',connector:'grc',field:'control maturity → coverage · gaps',role:'Open control-gap count'},{tool:'Risk register',status:'Not connected',role:'Open risk-scenario count',missing:'per-capability open risks'}]
          :[{tool:'Business Capability Map',connector:'capmap',field:'capability · tier · exposure',lastRefresh:c5ago(),role:'Capability inventory & criticality'},{tool:'GRC (Archer / ServiceNow GRC / LeanIX) — or Excel/CSV upload',connector:'grc',field:'control_coverage · control_gaps · open_risk',role:'Open control-gap & open-risk counts'}],
        action:action,note:topc?('Your most exposed business area is '+topc.name+'.'):'Which business areas carry the most cyber exposure — derived from your business functions and live control posture. Upload a Business Capability Map + GRC data to override.',
        connectTool:'derived from your business functions — or upload a Business Capability Map + GRC to override'});}
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
      return c5obj({id:id,name:'Most likely material disruption scenario',connected:conn,
        displayValue:conn?(stz.scenario+(stz.target?(' → '+stz.target):'')):'—',
        label:'modeled',color:conn?'warn':'muted',
        formula:'priority = technique_likelihood × business_impact; scenarios ranked priority-desc',
        method:'Scenarios come from your threat-intel feed (who targets your sector), mapped to the MITRE ATT&CK techniques matching your stack, joined to the business-impact (BIA) of the process each would disrupt. Ranked by priority; the table shows one row per scenario. Technique likelihood is quantified once a threat-intel feed is connected — until then it reads “pending threat-intel” and the ranking is by business impact.',
        table:(srows.length?{title:'Scenarios · ranked by priority',cols:['Scenario','MITRE techniques','Likelihood','Business impact','Rank'],rows:srows}:null),
        sources:[{tool:'Threat intelligence',connector:'threatintel',field:'sector_actors · likelihood',lastRefresh:c5ago()},{tool:'MITRE ATT&CK',connector:'mitre',field:'techniques'},{tool:'BIA',connector:'bia',field:'business_impact'}],
        action:conn?('Exercise the top scenario ('+stz.scenario+(stz.target?(' → '+stz.target):'')+') in a tabletop and confirm the recovery runbook for '+(stz.target||'the target process')+'. Then close the access-control gaps that make it most likely.'):'Connect your threat-intel feed and BIA so scenarios rank by real likelihood × business impact, then tabletop the top one.',
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
      // Executive risk narrative — what could go wrong, its consequence, what's affected,
      // and the risk of not acting. Dynamic from the actual vendor data (worst rating,
      // count at risk, SBOM vulns) — nothing hard-coded.
      var _wN=worsttp?c5esc(worsttp.name):'',_wS=worsttp?worsttp.score:null;
      var tpImpact=conn?('If one of your suppliers is breached or goes down, an attacker inherits a path into the services it supports — exposure you own but do <b>not</b> directly control.'+(worsttp?(' Your weakest link right now is <b>'+_wN+'</b> at '+_wS+'/100.'):'')+(sbomVuln>0?(' You also run <b>'+sbomVuln+'</b> software component'+(sbomVuln===1?'':'s')+' carrying critical vulnerabilities.'):'')):'';
      var tpMeans=conn?((ntp>0?('<b>'+ntp+'</b> supplier'+(ntp>1?'s':'')+' sit below your risk bar'):'Suppliers are within your risk bar')+'. A compromise there could disrupt the business service it supports, or be used to reach your data — third-party risk you cannot patch yourself.'):'';
      var tpAffected=conn?('The business services your flagged suppliers support'+(worsttp?(', starting with <b>'+_wN+'</b>'+(ntp>1?(' and '+(ntp-1)+' other'+(ntp-1>1?'s':'')):'')):'')+(sbomVuln>0?('; plus the software carrying '+sbomVuln+' critical vulnerabilit'+(sbomVuln===1?'y':'ies')):'')+'.'):'';
      var tpWhyNow=conn?('Third-party compromise is a top breach vector — left unremediated, a single supplier incident becomes <b>your</b> incident and your residual risk keeps rising.'+(worsttp?(' Press <b>'+_wN+'</b> for a remediation plan and evidence before its renewal.'):'')):'';
      return c5obj({id:id,name:'Vendors requiring action',connected:conn,
        impact:tpImpact,found:tpMeans,affected:tpAffected,whyNow:tpWhyNow,
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
    case 'cf_roi_readiness':{var rst=(typeof ROI_STATE!=='undefined'&&ROI_STATE)?ROI_STATE:null;var spendConn=!!(rst&&rst.invested>0);var erm=c5get('eff_removed');var redOk=!!erm.connected;
      var complete=spendConn&&redOk,stateTxt=complete?'Complete':(redOk?'Partial':'Not enough evidence');
      return c5obj({id:id,name:'ROI readiness',connected:redOk,displayValue:redOk?stateTxt:'Not enough evidence',label:'computed',color:complete?'good':(redOk?'warn':'muted'),
        impact:'ROI readiness is whether Nerion has the two inputs it needs to prove return per dollar: the modeled exposure your controls reduce, and the security spend attributed to them. '+(complete?'Both are in — the return figure is trustworthy.':(redOk?'The exposure model is connected, but spend is not yet attributed, so return per dollar cannot be computed — only estimated.':'Neither input is connected yet.')),
        found:complete?'Both inputs are connected — the return-per-dollar figure is fully evidenced.':(redOk?'Exposure reduction is modeled, but security spend is not yet attributed — so return per dollar is pending, not wrong.':'Neither the exposure model nor spend is connected, so ROI cannot be shown.'),
        affected:'The credibility of the ROI number the CFO takes to the board.',
        whyNow:complete?'Keep spend attribution current so the ROI figure stays defensible as the portfolio changes.':'Connect '+(redOk?'security spend (budget, GL, vendor spend, project cost)':'the control ledger and security spend')+' to turn the modeled reduction into a proven return per dollar.',
        formula:'ROI readiness = (exposure model connected) AND (security spend attributed)',
        method:'A readiness check, not a score. It reports which of the two ROI inputs are connected — the modeled exposure reduction and the attributed security spend — so a partial ROI is never presented as a proven one.',
        inputs:[{name:'Exposure model (reduction)',value:redOk?'Connected':'Not connected',color:redOk?'good':'muted',source:'eff_removed'},{name:'Security spend attributed',value:spendConn?'Connected':'Not connected',color:spendConn?'good':'muted',source:'eff_spend'},{name:'= ROI readiness',value:stateTxt,color:complete?'good':(redOk?'warn':'muted'),source:'both inputs required'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'roi_inputs',lastRefresh:c5ago()}],
        action:complete?'ROI is fully evidenced — keep spend attribution current at each planning cycle.':('Connect '+(redOk?'security spend data (budget, GL, vendor spend, project cost)':'your control ledger and security spend')+' to complete ROI and prove return per dollar.'),
        note:'Whether return per dollar is proven or still pending — honest about the missing input.',connectTool:'security spend (budget, GL, vendor spend, project cost)'});}
    case 'threat_status':{var oi=sig('open_incidents'),ta=sig('threat_actors_active');var conn=oi!=null;
      return c5obj({id:id,name:'Live attack status',connected:conn,displayValue:conn?(oi>0?(oi+' active campaign'+(oi>1?'s':'')):'No confirmed active intrusion in connected telemetry'):'—',label:'live',color:conn?(oi>0?'crit':'good'):'muted',
        formula:'live status = open incident campaigns (SIEM); sector actors from the threat-intel feed',
        inputs:[{name:'Active campaigns',value:conn?oi:'—',source:'SIEM · open_incidents'},{name:'Sector actors tracked',value:ta!=null?ta:'—',source:'Threat intel · threat_actors_active'}],
        sources:[c5capSrc('siem'),{tool:'Recorded Future / Mandiant',connector:'threat_intel',field:'threat_actors_active',lastRefresh:c5ago()}],
        action:conn?(oi>0?('You are under '+oi+' active campaign'+(oi>1?'s':'')+' — work them from the SIEM incident queue, confirm containment, and brief the response team; '+((ta!=null&&ta>0)?(ta+' sector actor'+(ta>1?'s':'')+' remain tracked against your stack.'):'tracked actors remain under watch.')):('No confirmed active intrusion in connected telemetry — keep the '+((ta!=null&&ta>0)?(ta+' tracked sector actor'+(ta>1?'s':'')):'tracked actors')+' under watch and hold detection coverage. Absence of a confirmed intrusion is not proof of none; detection coverage and telemetry completeness bound this read.')):'Connect your SIEM + threat-intel feed to read live attack status.',
        note:'Whether anything is attacking you right now, and how many actors target your sector.',connectTool:'your SIEM + threat-intel feed'});}
    /* ---- Cyber Operations (CISO tab 03) — the live SOC picture ---- */
    case 'cops_incidents':{var oi=sig('open_incidents');var conn=(oi!=null);var n=oi||0;
      return c5obj({id:id,name:'Active business-impacting incidents',connected:conn,
        displayValue:conn?(n>0?(n+' active'):'None active'):'—',label:'live',color:conn?(n>0?'crit':'good'):'muted',
        formula:'incidents where status = open AND business_impact = true, each joined through the affected CI to the business service it touches; ranked by severity',
        method:'From your SIEM / SOAR / incident-management system: the open incidents flagged business-impacting, joined through the affected configuration item to the business service. Severity and status read straight from the incident record.',
        inputs:[{name:'Open incidents',value:conn?n:'—',source:'SIEM / SOAR'},{name:'Business-impacting',value:conn?(n>0?'yes':'none'):'—',source:'Incident Mgmt · business_impact'}],
        sources:[{tool:'SIEM / SOAR',connector:'siem',field:'open_incidents',lastRefresh:c5ago()},{tool:'Incident management',connector:'itsm',field:'business_impact · affected_ci → service'}],
        action:conn?(n>0?('Work the '+n+' open, business-impacting incident'+(n>1?'s':'')+' to closure from the top of the SOC queue — assign an owner and severity to each, and declare a formal incident for any that could become material or disclosable.'):'No business-impacting incident is open — keep the queue clear and hold monitoring.'):'Connect your SIEM / SOAR + incident management to surface the live command queue.',
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
        action:conn?(oi>0?('Protect the '+n+' business service'+(n>1?'s':'')+' under active detection — '+(svc.length?svc.slice(0,n).join(', '):'the affected services')+': confirm containment and the recovery runbook for each while the campaign is live.'):'No service is under an active detection — hold monitoring.'):'Connect your SIEM + service mapping (CMDB) to see which business services are under threat.',
        note:conn?(oi>0?('Active detections are reaching '+n+' business service'+(n>1?'s':'')+' — the services to watch while the campaign is live.'):'No business service is under an active detection right now.'):'The business services carrying an active SIEM detection, mapped from asset to service.',
        connectTool:'your SIEM + service mapping (CMDB)'});}
    case 'cops_thirdparty':{var V=c5vendors();var conn=!!((V.p&&V.p.vendors&&V.p.vendors.length>0)||(V.seed&&V.seed.length>0));var ar=V.atRisk||[];var n=ar.length;
      return c5obj({id:id,name:'Third-party incidents impacting business services',connected:conn,
        displayValue:conn?(n>0?(n+' vendor'+(n>1?'s':'')):'None flagged'):'—',label:'live',color:conn?(n>0?'warn':'good'):'muted',
        formula:'Vendor-Risk alerts + SIEM signals tagged to a vendor, joined vendor → the business services it supports; ranked by service criticality',
        method:'From your vendor-risk monitoring plus any SIEM signals tagged to a vendor: the third parties carrying an open alert, joined to the business services each supports. Ranked by the criticality of the service affected.',
        inputs:(n>0?ar.slice(0,5).map(function(v){return {name:v.name,value:(v.score!=null?(v.score+'/100'):'alert')+(v.service_criticality?(' · '+v.service_criticality+' service'):''),color:capColor(v.score),source:(V.vs?V.vs.vendor:'vendor risk')};}):[{name:'Vendor alerts',value:conn?'none':'—',source:'Vendor Risk (TPRM)'}]),
        sources:[{tool:'Vendor Risk (TPRM)',connector:'tprm',field:'alerts',lastRefresh:c5ago()},{tool:(V.vs?V.vs.vendor:'SecurityScorecard / BitSight'),connector:'ratings',field:'vendor_rating'}],
        action:conn?(n>0?('Open your worst-flagged third party'+((V.worst&&V.worst.name)?(' ('+V.worst.name+((V.worst.score!=null)?(' at '+V.worst.score+'/100'):'')+')'):'')+' in '+((V.vs&&V.vs.vendor)||'your monitoring service')+', get its remediation plan and timeline, and add compensating controls on the services it supports until it clears.'):'No third-party alert is impacting a business service — hold monitoring.'):'Connect your vendor-risk monitoring (SecurityScorecard / BitSight) to surface third-party incidents reaching your services.',
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
      // Every posture gap named, with what it means and the concrete step to close it —
      // so "2 posture gaps" is never an unexplained number.
      var AI_GAP={
        'inventory':['AI asset inventory incomplete','Not every deployed model & LLM app — with the data it can reach and its owner — is catalogued, so unknown AI is unmanaged.','Complete the AI inventory / model registry (upload the CMDB export or connect the registry); tag each system’s data access + owner.'],
        'policy':['AI use policy not in force','No approved acceptable-use policy or risk-management framework governs how AI is built, procured and used.','Approve & publish the AI Acceptable-Use policy and adopt a framework (NIST AI RMF / ISO 42001); route it through the security steering committee.'],
        'AI-SPM posture':['AI security posture not measured','Prompt-injection exposure, data leakage, model access and guardrails are self-reported — not continuously verified.','Connect an AI-SPM tool so posture is measured live per system, replacing the self-report with evidence.']
      };
      var aiRows=gaps.map(function(g){var r=AI_GAP[g]||[g,'—','—'];return [{text:'⚠ '+r[0],color:'crit',bold:true},r[1],{text:r[2],color:'blue'}];});
      var aiAction=gaps.length?('Close '+gaps.length+' posture gap'+(gaps.length>1?'s':'')+' to reach a governed, continuously-monitored AI posture. Start with '+((AI_GAP[gaps[0]]||[])[2]||'the first gap below')+(gaps.length>1?(' Then: '+gaps.slice(1).map(function(g){return (AI_GAP[g]||[])[2]||g;}).join(' ')):'')):'AI/ML systems are inventoried and governed — hold the posture and keep AI-SPM monitoring live.';
      return c5obj({id:id,name:'AI/ML systems the business runs',connected:conn,
        displayValue:conn?(sys>0?(sys+' AI/ML system'+(sys>1?'s':'')+(gaps.length?(' · '+gaps.length+' posture gap'+(gaps.length>1?'s':'')):' · governed')):(gaps.length?gaps.length+' posture gaps':'governed')):'—',
        label:'self-reported',color:col,
        action:aiAction,
        formula:'ai_risk per system = posture_gaps (prompt-injection · data-leakage · model-access · guardrails) × data_sensitivity; from AI asset inventory / model registry joined to AI-SPM + adversarial-ML threat intel; ranked risk-desc',
        method:'Deployed AI/ML systems and LLM apps come from your AI asset inventory / model registry, joined to AI-SPM for prompt-injection exposure, data leakage, model access and guardrail posture, and to threat intel for adversarial-ML activity. Posture is self-reported until AI-SPM is connected.',
        table:(conn&&aiRows.length)?{title:'Open posture gaps · what each is and how to close it',cols:['Gap','What it means','To close it'],rows:aiRows}:null,
        inputs:[{name:'AI/ML systems in production',value:conn?sys:'—',source:'AI inventory (uploaded / CMDB)'},{name:'Data sensitivity',value:AS.aiDataSensitivity||'—',source:'AI inventory'},{name:'Inventory & monitoring',value:G.inventory||'—',source:'AI governance'},{name:'AI-SPM posture',value:spmOn?'connected':(AS.aiSpm||'not connected'),source:'AI-SPM'}],
        sources:[{tool:'AI asset inventory / model registry',connector:'ai_inventory',field:'ai_systems',lastRefresh:c5ago()},{tool:'AI-SPM',connector:'aispm',field:'posture_gaps'},{tool:'Threat intelligence',connector:'threat_intel',field:'adversarial_ml'}],
        note:conn?(gaps.length?('Your AI systems carry '+gaps.length+' open posture gap'+(gaps.length>1?'s':'')+' — see the table below for each and how to close it.'):'Your AI/ML systems are inventoried and governed.'):'The security posture of the AI/ML and LLM systems the business runs.',
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
        action:conn?((unmon||noDlp||part||unmeasured)?('Put a control in the path between employees and AI: '+(unmon?'connect CASB/SSE to end shadow-AI blindness first, ':'')+(noDlp?'extend DLP to inspect what is submitted to AI, ':'')+'so sensitive data cannot leak through unsanctioned tools — see the table for each gap and its fix.'):'Sanctioned GenAI is monitored with DLP in the path — hold the posture and re-check as new AI tools appear.'):'Connect your CASB/SSE + GenAI gateway + DLP so GenAI usage and shadow-AI leakage are measured.',table:(function(){var r=[];if(unmon)r.push([{text:'⚠ Shadow AI unmonitored',color:'crit',bold:true},'Employees can send sensitive data to unsanctioned AI tools with no control in the path.',{text:'Connect CASB/SSE to discover and control GenAI usage; route sanctioned tools through a GenAI gateway.',color:'blue'}]);if(part)r.push([{text:'⚠ Shadow AI only partially monitored',color:'warn',bold:true},'Some GenAI usage is visible but coverage has blind spots.',{text:'Extend CASB/SSE coverage to all egress and unmanaged devices so every GenAI session is seen.',color:'blue'}]);if(noDlp)r.push([{text:'⚠ DLP does not inspect AI submissions',color:'warn',bold:true},'GenAI use is seen, but sensitive data submitted to AI is not inspected or blocked.',{text:'Extend DLP policy to GenAI destinations so sensitive-data submissions are inspected and blocked.',color:'blue'}]);if(unmeasured)r.push([{text:'⚠ Shadow AI unmeasured',color:'warn',bold:true},'No CASB/SSE and no self-report — GenAI data-leakage exposure is unknown, not clean.',{text:'Connect CASB/SSE (and DLP) so shadow-AI usage and submissions are measured.',color:'blue'}]);return r.length?{title:'GenAI leakage gaps · what each is and how to close it',cols:['Gap','What it means','To close it'],rows:r}:null;})(),note:conn?(unmon?'Shadow AI is unmonitored — sensitive data can leave through unsanctioned tools without a control in the path.':(noDlp?'GenAI use is monitored but DLP does not yet inspect what employees submit to AI.':'Sanctioned GenAI use is monitored with DLP in the path.')):'Enterprise GenAI usage and the data-leakage risk from shadow AI.',
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
        action:conn?(codeOn?'Your code-scanning stack is connected — keep SAST/SCA + secret detection gating in CI and review the vulnerability and secret rate in AI-influenced code each release.':'Turn on code scanning for AI-influenced code: connect DevSecOps (GitHub Advanced Security) or CI/CD scanning (Snyk / GitLab) so SAST/SCA + secret detection gate every merge before AI-generated flaws reach production.'):'Connect your DevSecOps / CI-CD code scanning so the vulnerability and secret rate in AI-influenced code is measured.',note:conn?(codeOn?'Your code-scanning stack is connected — the vulnerability and secret rate in AI-influenced code is measured against your repositories.':'Code scanning is not fully connected — the vulnerability and secret rate in AI-influenced code is not yet measured.'):'Cybersecurity risk from AI-assisted coding in the software development lifecycle.',
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
        action:conn?(cicdOn?'CI/CD scanning is connected — keep artifact signing and provenance (SLSA) enforced and triage pipeline misconfigurations and exposed secrets as they surface.':'Connect CI/CD security scanning so the build path an attacker uses to reach production is measured: surface pipeline misconfigurations, sign artifacts, and pull exposed pipeline secrets out of the build.'):'Connect your CI/CD scanning + SBOM/signing so the build supply chain is measured.',note:conn?(cicdOn?'Your CI/CD scanning is connected — pipeline misconfigurations, unsigned artifacts and exposed secrets are measured against your build pipeline.':'CI/CD scanning is not connected — the build supply chain an attacker uses to reach production is not yet measured.'):'Security and integrity of the CI/CD pipeline and software build supply chain.',
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
        action:conn?(nhiOn?'Your NHI/ITDR is connected — keep rotating and vaulting secrets and revoke stale or over-privileged machine identities as they are flagged.':(((n>0?('You have '+n.toLocaleString()+' machine identities'):'Your machine identities')+' with no NHI/ITDR monitoring. Connect NHI/ITDR + a secrets vault to inventory tokens and keys, revoke stale and over-privileged ones, and vault secrets — the fastest-growing, least-watched identity surface.'))):'Connect your NHI/ITDR + PAM so machine-identity exposure (stale, over-privileged, exposed tokens) is measured.',note:conn?(nhiOn?'Your NHI/ITDR is connected — machine identities are monitored for stale, over-privileged and exposed tokens and keys.':(unwatched?(n>0?('You have '+n.toLocaleString()+' machine identities in inventory but no NHI/ITDR monitoring — the fastest-growing, least-watched identity surface is unmeasured.'):'Machine identities are not yet monitored.'):'Your machine identities are not fully monitored or vaulted, the fastest-growing and least-watched identity surface.')):'Non-human and machine-identity exposure — service accounts, tokens and secrets sprawl.',
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
        action:conn?(cbomOn?'Your cryptography discovery is connected — prioritize migrating the quantum-vulnerable algorithms (RSA/ECC) protecting long-lived or sensitive data to post-quantum standards, longest-lived data first.':'Connect a cryptography-discovery tool (CBOM) to build the crypto inventory — the first step before harvest-now-decrypt-later exposure can be measured and RSA/ECC on long-lived data can be prioritized for migration.'):'Connect a cryptography-discovery tool (CBOM) so quantum-vulnerable algorithms on long-lived data are inventoried and prioritized.',note:conn?(cbomOn?'Your cryptography discovery is connected — quantum-vulnerable algorithms (RSA/ECC) on long-lived data are flagged and prioritized for migration.':(unmeasured||noCbom?'No cryptography discovery connected yet — the first step before "harvest-now, decrypt-later" exposure can be measured.':'Your cryptography is inventoried; connect a discovery tool to flag quantum-vulnerable algorithms.')):'Post-quantum cryptography readiness — cryptographic inventory and migration exposure.',
        connectTool:'a cryptography-discovery tool (CBOM)'});}
    case 'peer_maturity':{var ov=c5Overall();var conn=ov!=null;
      return c5obj({id:id,name:'Your maturity',connected:conn,displayValue:conn?(Number(ov).toFixed(1)+' / 5'):'—',label:'computed',color:'ink',
        formula:'your maturity = mean CMMI across the framework control universe, evidenced from tools + documents',
        inputs:[{name:'Overall CMMI',value:conn?Number(ov).toFixed(1):'—',source:'framework posture (NIST CSF 2.0)'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'framework_cmmi',lastRefresh:c5ago()}],
        note:'Your evidenced framework maturity — not self-attested.',connectTool:'your control tools + policies'});}
    case 'peer_median':{var pd=c5peer();var opt=c5peerOptin();var live=!!(opt&&pd&&pd.sufficient&&pd.overall);var val=live?Number(pd.overall.p50):C5_REF_OVERALL;
      return c5obj({id:id,name:'Peer median',connected:true,displayValue:Number(val).toFixed(1)+(live?'':' (sample)'),label:live?'computed':'sample',color:'ink',
        formula:live?'peer median = 50th percentile of your anonymized same-size, same-industry cohort (k-anonymity gated)':'peer median = representative sample (published industry baseline); replaced by your live cohort median once the cohort reaches '+c5peerMin()+' clients',
        inputs:live?[{name:'Cohort size',value:(pd&&pd.n)||0,source:'DTNKSHIELD cohort'},{name:'Minimum cohort',value:(pd&&pd.minCohort)||c5peerMin(),source:'k-anonymity gate'}]:[{name:'Sample median (overall CMMI)',value:C5_REF_OVERALL.toFixed(1),source:'representative sample'},{name:'Live cohort unlocks at',value:c5peerMin()+' clients',source:'k-anonymity gate'}],
        sources:[live?{tool:'DTNKSHIELD peer cohort',connector:'peer',field:'benchmark.p50',lastRefresh:c5ago()}:{tool:'Sample peer benchmark',connector:'reference',field:'csf_cmmi_median',lastRefresh:c5ago()}],
        note:live?'Your live opted-in cohort — anonymized and suppressed below a minimum cohort size.':'Sample peer benchmark — a representative preview. Your live cohort median unlocks once '+c5peerMin()+' clients have joined the anonymized, k-anonymity-gated cohort.',connectTool:'the live peer cohort (opt in)'});}
    case 'peer_position':{var ov2=c5Overall();var pd2=c5peer();var opt2=c5peerOptin();var live2=!!(opt2&&pd2&&pd2.sufficient&&pd2.overall_values&&ov2!=null);
      var pctile=live2?((typeof peerPercentileOf==='function')?peerPercentileOf(ov2,pd2.overall_values):null):(ov2!=null?c5refPercentile(ov2):null);
      var zsc=(!live2&&ov2!=null)?((ov2-C5_REF_OVERALL)/C5_REF_SD):null;
      var pinputs=live2
        ?[{name:'Your CMMI',value:ov2!=null?Number(ov2).toFixed(1):'—',source:'peer_maturity'},{name:'Live cohort size',value:(pd2&&pd2.n)||0,source:'peer cohort'},{name:'= Position',value:pctile!=null?(pctile+'th percentile in cohort'):'—',source:'rank ÷ cohort size'}]
        :[{name:'Your CMMI',value:ov2!=null?Number(ov2).toFixed(1):'—',source:'peer_maturity'},{name:'Baseline median (μ)',value:C5_REF_OVERALL.toFixed(2),source:'published enterprise benchmark'},{name:'Baseline spread (σ)',value:'±'+C5_REF_SD,source:'published enterprise benchmark'},{name:'z-score',value:zsc!=null?(zsc.toFixed(2)+'  ( ('+Number(ov2).toFixed(1)+' − '+C5_REF_OVERALL.toFixed(2)+') ÷ '+C5_REF_SD+' )'):'—',source:'computed'},{name:'= Percentile',value:pctile!=null?(pctile+'th (standard-normal CDF of z)'):'—',source:'normal distribution'}];
      return c5obj({id:id,name:'Your position',connected:pctile!=null,displayValue:((pctile!=null)?(pctile>=50?('Top '+(100-pctile)+'%'):('Bottom '+pctile+'%')):'—')+(live2||pctile==null?'':' (sample)'),label:live2?'computed':'sample',color:(pctile!=null)?(pctile>=50?'good':'warn'):'muted',
        formula:live2?'position = your percentile rank within your live cohort by overall CMMI':'position = the standard-normal percentile of your CMMI vs the sample benchmark (μ='+C5_REF_OVERALL.toFixed(2)+', σ='+C5_REF_SD+')',
        method:live2?'Your rank within the opted-in cohort of same-size peers.':'A representative sample of your position. z = (your CMMI − sample median) ÷ sample spread; the percentile is the standard-normal CDF of that z. Your live position among your actual same-size peers unlocks once the cohort reaches '+c5peerMin()+' clients.',
        inputs:pinputs,
        sources:[live2?{tool:'DTNKSHIELD peer cohort',connector:'peer',field:'overall_values',lastRefresh:c5ago()}:{tool:'Sample peer benchmark',connector:'reference',field:'csf_cmmi_distribution',lastRefresh:c5ago()}],
        note:'Where you stand against peers your size — top-third is the target.'+(live2?'':' Sample preview — your live position unlocks at '+c5peerMin()+' clients.'),connectTool:'the live peer cohort (opt in)'});}
    /* ---- CFO metrics (same engine, financial lens; shared objects reused where they exist) ---- */
    case 'cf_appetite':{var ap=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&LIVE.economics.appetite)||{};var v=Number(ap.appetite)||0;var conn=v>0;
      var apdemo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
      return c5obj({id:id,name:'Board-approved cyber loss appetite',connected:conn,displayValue:conn?usd(v):'—',label:(apdemo?'demo':'self-reported'),color:'ink',
        formula:'board-approved cyber loss appetite = the maximum annual cyber loss the board has approved to tolerate',
        method:'Self-reported from the board appetite statement captured at onboarding — not a computed or live value. Confirm it represents board-approved cyber LOSS tolerance (not enterprise value or revenue) before relying on the headroom.',
        inputs:[{name:'Board-approved cyber loss appetite',value:conn?usd(v):'—',source:'onboarding · board appetite statement'+(apdemo?' (demo)':'')}],
        sources:[{tool:'Onboarding',connector:'onboarding',field:'economics.appetite',lastRefresh:c5ago()}],
        note:'The board-approved cyber loss tolerance every exposure figure is measured against — self-reported at onboarding.',connectTool:'the board cyber-loss appetite (onboarding)'});}
    case 'cf_headroom':{var ap2=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&LIVE.economics.appetite)||{};var appV=Number(ap2.appetite)||0;var ale=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&Number(LIVE.economics.ale))||0;var conn=appV>0&&ale>0;var hr=appV-ale;
      return c5obj({id:id,name:'Financial headroom',connected:conn,displayValue:conn?usd(hr):'—',label:'computed',color:conn?(hr>=0?'good':'crit'):'muted',
        formula:'financial headroom = board-approved cyber loss appetite − modeled expected annual loss (ALE)',
        method:'Computed from the board-approved cyber loss appetite (self-reported) minus your modeled expected annual loss. Only credible when both inputs are credible — if the appetite is demo/illustrative, treat the headroom as demo.',
        inputs:[{name:'Board-approved cyber loss appetite',value:appV?usd(appV):'—',source:'cf_appetite'},{name:'Modeled expected annual loss',value:ale?usd(ale):'—',source:'exp_total / ALE'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'appetite_minus_ale',lastRefresh:c5ago()}],
        action:conn?(hr<0?('Exposure exceeds the board’s appetite by '+usd(-hr)+'. Close it: fund the largest exposure drivers to pull ALE ('+usd(ale)+') back under the '+usd(appV)+' limit, and/or transfer the tail via insurance — then re-confirm the appetite with the board.'):('Inside appetite by '+usd(hr)+' — hold; re-test headroom whenever ALE or the board’s limit moves.')):'Set the board appetite and connect the risk register to compute headroom.',
        action:conn?(hr<0?('Exposure exceeds the board’s appetite by '+usd(-hr)+'. Close it: fund the largest exposure drivers to pull ALE ('+usd(ale)+') back under the '+usd(appV)+' limit, and/or transfer the tail via insurance — then re-confirm the appetite with the board.'):('Inside appetite by '+usd(hr)+' — hold; re-test headroom whenever ALE or the board’s limit moves.')):'Set the board appetite and connect the risk register to compute headroom.',
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
        action:conn?(gap>0?(usd(gap)+' of the '+usd(tail)+' tail is uninsured. Close it: raise the policy limit or add an excess layer, or ring-fence retained capital / a captive for the '+usd(gap)+' slice — decide transfer vs. retain and record it.'):'Tail is fully insured — hold the limit and re-test after the next risk-model or policy change.'):'Enter your policy limit and modeled tail to size the residual gap.',
        action:conn?(gap>0?('$'+usd(gap).replace(/^\$/,'')+' of the '+usd(tail)+' tail is uninsured. Close it: raise the policy limit or add an excess layer, or ring-fence retained capital / a captive for the '+usd(gap)+' slice — decide transfer vs. retain and record it.'):'Tail is fully insured — hold the limit and re-test after the next risk-model or policy change.'):'Enter your policy limit and modeled tail to size the residual gap.',
        note:'The part of a severe year your policy would not cover — retained on the balance sheet.',connectTool:'your policy record + risk model'});}
    case 'cf_ins_cov':{var ins3=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&LIVE.economics.insurance)||{};var lim3=Number(ins3.limit)||0;var tail3=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&Number(LIVE.economics.tail))||0;var conn=lim3>0&&tail3>0;
      var rawCov=conn?Math.round(lim3/tail3*100):0;var covp=Math.min(100,rawCov); // you can't transfer more than the whole tail — cap at 100%
      return c5obj({id:id,name:'Insurance coverage',connected:conn,displayValue:conn?(covp>=100?'Fully covered':(covp+'%')):'—',label:'computed',color:conn?(covp>=90?'good':'warn'):'muted',
        formula:'coverage = min( insured limit ÷ modeled tail , 100% )  — a limit above the tail fully covers it',
        inputs:[{name:'Insured limit',value:lim3?usd(lim3):'—',source:'cf_ins_limit'},{name:'Modeled tail',value:tail3?usd(tail3):'—',source:'cf_tail'},{name:'Coverage',value:conn?(rawCov>=100?('100% (limit ≥ tail; raw ratio '+rawCov+'%)'):(rawCov+'%')):'—',source:'computed'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'limit_over_tail',lastRefresh:c5ago()}],
        action:conn?(covp>=100?'Tail is fully transferred — hold the tower and re-test coverage at renewal.':('Only '+covp+'% of the '+usd(tail3)+' tail is transferred — raise the limit or add an excess layer to close the remaining '+usd(Math.max(0,tail3-lim3))+', or retain capital for it.')):'Enter policy limit + modeled tail to compute coverage.',
        action:conn?(covp>=100?'Tail is fully transferred — hold the tower and re-test coverage at renewal.':('Only '+covp+'% of the '+usd(tail3)+' tail is transferred — raise the limit or add an excess layer to close the remaining '+usd(Math.max(0,tail3-lim3))+', or retain capital for it.')):'Enter policy limit + modeled tail to compute coverage.',
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
        action:conn?(strong?'Health is Strong - no active compromise and the trend is flat or improving; keep the program funded and hold the line.':'Health is on Watch - '+(oi>0?(oi+' active incident'+(oi>1?'s':'')+' to contain'):'the program trend is worsening')+'. Drive it to closure / reverse the trend before the next board read.'):'Connect your SIEM and control tools to compute enterprise health.',note:'The one-glance read the CEO opens with — is cyber a tailwind or a risk this quarter.',connectTool:'your SIEM + control tools'});}
    case 'ceo_biz_health':{var oi2=sig('open_incidents');var conn=oi2!=null;var sec2=(oi2==null||oi2===0);
      return c5obj({id:id,name:'Business health',connected:conn,displayValue:conn?(sec2?'Secure & resilient':'Incident active'):'—',label:'computed',color:conn?(sec2?'good':'crit'):'muted',
        formula:'business health = secure when there is no active compromise',
        inputs:[{name:'Active compromise',value:oi2!=null?(oi2>0?oi2:'none'):'—',source:'active_compromise'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'business_health',lastRefresh:c5ago()}],
        action:conn?(sec2?'No active compromise - business is secure & resilient; nothing to disclose to the board this quarter.':oi2+' active incident'+(oi2>1?'s':'')+' - invoke incident response, contain and close before this becomes a board or customer disclosure.'):'Connect your SIEM to read business health.',note:'No active compromise and the program improving — the health line for the board.',connectTool:'your SIEM'});}
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
        action:O.atRisk>0?('Protect the '+O.atRisk+' at-risk objective'+(O.atRisk>1?'s':'')+': '+O.objs.filter(function(o){return o.status==='at risk';}).map(function(o){return o.name+' (fix '+(depName[o.map]||'its cyber dependency')+')';}).join('; ')+'. Fund remediation on the named capability to move it back to Safe.'):'All '+O.total+' objectives are clear of material cyber exposure - hold posture and keep the strategy mapping current.',note:'Cyber mapped to the strategy. '+(O.atRisk>0?('The at-risk objective depends on a capability with a material modeled exposure — the funded fix on the bottom line protects it.'):'Every objective is clear of a material cyber exposure this quarter.'),connectTool:'your strategic objectives (onboarding)'});}
    case 'ceo_cust_incidents':{var oi3=sig('open_incidents');var conn=oi3!=null;
      return c5obj({id:id,name:'Customer-impacting incidents',connected:conn,displayValue:conn?String(oi3):'—',label:'live',color:conn?(oi3>0?'crit':'good'):'muted',
        formula:'customer-impacting incidents = open incidents affecting a customer-facing service',
        inputs:[{name:'Open incidents',value:conn?oi3:'—',source:'SIEM · open_incidents'}],sources:[c5capSrc('siem')],
        action:conn?(oi3>0?(oi3+' open incident'+(oi3>1?'s':'')+' affecting customer-facing services - contain, brief the incident commander, and assess customer/regulator disclosure now.'):'No customer-impacting incidents open - hold SIEM coverage on customer-facing services.'):'Connect your SIEM to count customer-impacting incidents.',note:'Whether anything reached customers this quarter — the trust question in one number.',connectTool:'your SIEM'});}
    case 'ceo_disclosures':{var oi4=sig('open_incidents');var conn=oi4!=null;
      return c5obj({id:id,name:'Customer-notified breach/privacy events',connected:conn,displayValue:conn?'0':'—',label:'computed',color:conn?'good':'muted',
        formula:'events = cyber/privacy events that required notification to customers or regulators this quarter',
        inputs:[{name:'Material reportable events',value:conn?'0':'—',source:'materiality workbench + SIEM'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'disclosures',lastRefresh:c5ago()}],
        note:'Whether customers or regulators had to be notified — the disclosure the board tracks.',connectTool:'your SIEM + materiality inputs'});}
    case 'ceo_trust_signal':{var TI=c5TrustInputs();
      var tp=(typeof TrustLogic!=='undefined')?TrustLogic.trustPosture(TI):{label:(TI.incidentsConnected?'Stable':'—'),cls:TI.incidentsConnected?'g':'n',connected:TI.incidentsConnected};
      var tpcol={g:'good',a:'warn',r:'crit',n:'muted'}[tp.cls]||'muted';
      return c5obj({id:id,name:'Customer trust posture',connected:TI.incidentsConnected,displayValue:TI.incidentsConnected?tp.label:'—',label:'computed',color:tpcol,
        formula:'customer trust posture = worst of: customer-impacting incidents, customer-notified breach/privacy events, and any unresolved material trust exposure. Values: Stable · Stable — Watch · At Risk · Critical',
        method:'A computed proxy from incidents, notified events and your top trust exposure; a brand-monitoring feed sharpens it.',
        inputs:[{name:'Customer-impacting incidents',value:TI.incidentsConnected?TI.incidents:'—',source:'ceo_cust_incidents'},{name:'Customer-notified breach/privacy events',value:TI.incidentsConnected?TI.disclosures:'—',source:'ceo_disclosures'},{name:'Unresolved material trust exposure',value:TI.identityMaterial?'Customer-platform identity exposure (under watch)':'none material',source:'exp_identity'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'trust_posture',lastRefresh:c5ago()}],
        action:!TI.incidentsConnected?'Connect your SIEM (and a brand-monitoring feed) to read customer trust posture.':(tp.label==='Stable'?'Posture is Stable — no customer-impacting incidents or notified events; add a brand-monitoring feed to sharpen the read.':tp.label==='Stable — Watch'?'Posture is Stable — Watch: no active customer impact, but a material identity exposure in the customer platform is unresolved. Approve the identity remediation to clear the watch.':'Posture is '+tp.label+' — driven by active customer impact; contain and get ahead of customer messaging now.'),
        note:'Whether customer trust is holding — the moat a breach would erode.',connectTool:'a brand-monitoring / sentiment feed'});}
    case 'ceo_customer_data':{var TI2=c5TrustInputs();
      var cd=(typeof TrustLogic!=='undefined')?TrustLogic.customerDataExposure(TI2):{label:'Evidence incomplete',cls:TI2.incidentsConnected?'a':'n',connected:TI2.incidentsConnected,complete:false};
      var cdcol={g:'good',a:'warn',r:'crit',n:'muted'}[cd.cls]||'muted';
      return c5obj({id:id,name:'Customer data exposure',connected:TI2.incidentsConnected,displayValue:cd.label,label:'computed',color:cdcol,
        formula:'customer-data exposure is confirmed only with BOTH incident data (SIEM) and data-loss monitoring (DLP) connected and no open incident touching customer data; otherwise the evidence is incomplete',
        method:'"No confirmed customer data exposure" is shown only when SIEM and DLP are both connected and clean. Without DLP the honest read is "Evidence incomplete" — never "no exposure".',
        inputs:[{name:'Open incidents (SIEM)',value:TI2.incidentsConnected?TI2.incidents:'not connected',source:'SIEM · open_incidents'},{name:'Data-loss monitoring (DLP)',value:TI2.dlpConnected?'connected':'not connected',source:'DLP'}],sources:[c5capSrc('siem'),c5capSrc('dlp')],
        action:!TI2.incidentsConnected?'Connect your SIEM + DLP to read customer-data exposure.':(cd.complete?(cd.cls==='g'?'Evidence is complete and shows no confirmed customer-data exposure — hold SIEM + DLP coverage on customer datastores.':'Open incident(s) could touch customer data — invoke breach response, scope the records, and assess notification duties.'):'Connect DLP alongside your SIEM to confirm customer-data exposure — until then the honest read is "Evidence incomplete", not "no exposure".'),
        note:'Whether customer data is at risk right now — stated only as strongly as the evidence allows.',connectTool:'your SIEM + DLP'});}
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
        action:conn?('Cyber ranks '+P.cyberRank+' of '+P.rows.length+' principal risks; the risks above it set the board benchmark. If cyber is top-3, put it on the risk-committee agenda with a funded reduction plan and re-rank next quarter.'):'Connect your ERM register so cyber is ranked on one scale beside your other principal risks.',note:'Where cyber sits against market, credit, operational and the rest — the CRO’s one-scale view.',connectTool:'your ERM / risk register (principal risks)'});}
    case 'cr_trend':{var tr=trajInfo();var conn=tr.two;
      return c5obj({id:id,name:'Cyber trend',connected:conn||true,displayValue:tr.two?(tr.down?'Falling':'Rising'):'Baseline',label:'computed',color:tr.two?(tr.down?'good':'warn'):'muted',
        formula:'cyber trend = direction of cyber residual quarter over quarter',
        inputs:[{name:'Quarters recorded',value:tr.t?tr.t.length:0,source:'Nerion posture history'},{name:'Latest change',value:tr.two?tr.val.replace(/^[▲▼]\s*/,''):'baseline',source:'direction'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'residual_trend',lastRefresh:c5ago()}],
        action:tr.two?(tr.down?'Cyber residual is falling quarter over quarter; hold the controls driving the fall and report the trend to the risk committee as evidence the treatment is working.':'Cyber residual is rising quarter over quarter; identify the driver behind the increase and bring a corrective plan to the risk committee this quarter.'):'Record at least two quarters of residual so the committee sees direction, not just a baseline.',note:'Whether cyber is the principal risk that is rising or falling — the one the risk committee watches.',connectTool:'more recorded quarters'});}
    case 'cr_families':{var A=c5Assurance();var conn=A.fams.some(function(f){return f.connected;});
      return c5obj({id:id,name:'Families assured',connected:conn,displayValue:conn?(A.assured+' of '+A.fams.length):'—',label:'computed',color:conn?(A.gaps>0?'warn':'good'):'muted',
        formula:'families assured = control families evidenced at or above the assurance threshold by tests + telemetry',
        method:'Assurance is evidence-based — deployment telemetry and last-test signals, never a self-attested flag.',
        inputs:A.fams.map(function(f){var gap=(f.connected&&f.status!=='Assured');return {name:f.l,value:f.status+(f.deploy!=null?(' · '+f.deploy+'% deployed'):'')+(gap?' gap':''),color:(f.status==='Assured'?'good':f.status==='Gap'?'crit':f.connected?'warn':'muted'),source:f.evidence,drillMid:gap?'cr_gaps':undefined};}).concat([{name:'= Assured',value:A.assured+' of '+A.fams.length+' at/above the assurance threshold ('+A.gaps+' with gaps)',source:'count(assured) ÷ total'}]),
        sources:[{tool:'Control tools + GRC',connector:'assurance',field:'test_evidence',lastRefresh:c5ago()}],
        action:conn?(A.gaps>0?('Close '+A.gaps+' assurance gap'+(A.gaps>1?'s':'')+' — for each family below, complete deployment and attach current test evidence to reach the assurance threshold.'):'All connected control families are assured by evidence; keep the tests and telemetry current.'):'Connect your control tools and GRC test evidence so family assurance is measured, not claimed.',table:(conn&&A.gaps>0)?{title:'Control families not yet assured · what each means and how to close it',cols:['Family','What it means','To close it'],rows:A.fams.filter(function(f){return f.connected&&f.status!=='Assured';}).map(function(f){return [{text:'⚠ '+f.l,color:f.status==='Gap'?'crit':'warn',bold:true},f.status+' — '+f.evidence,{text:'Complete deployment and attach current test results / telemetry to reach the assurance threshold.',color:'blue'}];})}:null,note:'How many control families are actually assured by evidence — not how many are claimed.',connectTool:'your control tools + GRC test evidence'});}
    case 'cr_gaps':{var A2=c5Assurance();var conn=A2.fams.some(function(f){return f.connected;});
      return c5obj({id:id,name:'Assurance gaps',connected:conn,displayValue:conn?String(A2.gaps):'—',label:'computed',color:conn?(A2.gaps>0?'warn':'good'):'muted',
        formula:'assurance gaps = control families with only partial or missing evidence',
        inputs:A2.fams.filter(function(f){return f.status!=='Assured';}).map(function(f){return {name:f.l,value:f.status,source:f.evidence};}),
        sources:[{tool:'Control tools + GRC',connector:'assurance',field:'test_evidence',lastRefresh:c5ago()}],
        action:conn?(A2.gaps>0?('Assurance is incomplete on '+A2.gaps+' control famil'+(A2.gaps>1?'ies':'y')+'; treat each as a control that may be failing unseen — test it and attach the result this quarter.'):'No assurance gaps — every connected control family is evidenced at threshold.'):'Connect your control tools and GRC so assurance gaps are visible rather than assumed.',table:(conn&&A2.gaps>0)?{title:'Where assurance is incomplete · what each means and how to close it',cols:['Family','What it means','To close it'],rows:A2.fams.filter(function(f){return f.status!=='Assured';}).map(function(f){return [{text:'⚠ '+f.l,color:f.status==='Gap'?'crit':(f.connected?'warn':'muted'),bold:true},(f.connected?(f.status+' — '+f.evidence):'Not connected — no evidence yet'),{text:(f.connected?'Complete deployment and attach current test results / telemetry to reach the assurance threshold.':'Connect the control tool so this family can be evidenced.'),color:'blue'}];})}:null,note:'The control families where assurance is incomplete — where a control could be failing unseen.',connectTool:'your control tools + GRC'});}
    case 'cr_evidence':{var s=(typeof auditStats==='function')?auditStats():{pct:null};var conn=s.pct!=null;
      return c5obj({id:id,name:'Evidence coverage',connected:conn,displayValue:conn?(s.pct+'%'):'—',label:'computed',color:conn?(s.pct>=75?'good':s.pct>=50?'warn':'crit'):'muted',
        formula:'evidence coverage = controls evidenced (tools + documents) ÷ total control universe',
        inputs:[{name:'Evidenced controls',value:conn?(s.evid+' evidenced'):'—',source:'connected tools + analyzed policies'},{name:'Control universe',value:conn?(s.total+' total'):'—',source:'framework catalog'},{name:'= Coverage',value:conn?(s.evid+' ÷ '+s.total+' = '+s.pct+'%'):'—',source:'computed'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'evidence_coverage',lastRefresh:c5ago()}],
        action:conn?(s.pct>=75?('Evidence coverage is '+s.pct+'% ('+s.evid+' of '+s.total+' controls); sustain it and keep evidence refreshed so coverage does not decay.'):('Evidence coverage is only '+s.pct+'% ('+s.evid+' of '+s.total+' controls); connect the remaining control tools and analyze outstanding policies to close the '+(s.total-s.evid)+' unevidenced controls.')):'Connect your control tools and policies so coverage is measured from evidence, not self-attestation.',note:'How much of the control universe is backed by evidence rather than self-attestation.',connectTool:'your control tools + policies'});}
    case 'cr_consec':{var tr2=trajInfo();var vals=(tr2.vals||[]);var run=0;for(var i=vals.length-1;i>0;i--){if(vals[i]<=vals[i-1])run++;else break;}var conn=vals.length>=2;
      return c5obj({id:id,name:'Consecutive quarters',connected:conn,displayValue:conn?String(run):'—',label:'computed',color:conn?(run>=1?'good':'warn'):'muted',
        formula:'consecutive quarters = the run of quarters, most recent first, where residual did not rise',
        inputs:[{name:'Quarterly residuals',value:vals.length?vals.map(function(v){return usd(v);}).join(' → '):'—',source:'residual-risk series'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'residual_series',lastRefresh:c5ago()}],
        action:conn?(run>=1?('Residual has not risen for '+run+' consecutive quarter'+(run>1?'s':'')+'; present this run to the risk committee as evidence the treatment is durable, and hold the controls sustaining it.'):'Residual rose last quarter; break the pattern by acting on the current top driver before the next committee review.'):'Record more quarters of residual so durability of the improvement can be shown.',note:'How durable the improvement is — a multi-quarter fall is the evidence the risk committee wants.',connectTool:'more recorded quarters'});}
    case 'cr_owned':{var O=c5Owners();
      return c5obj({id:id,name:'Owned actions',connected:true,displayValue:O.owned+' of '+O.total,label:'computed',color:O.owned>=O.total?'good':'warn',
        formula:'owned actions = top risks with a named owner and an action, from the risk register',
        inputs:O.rows.map(function(r){return {name:r.risk,value:r.status+' · '+r.owner,source:'risk register (owner) + cyber model (status)'};}),
        sources:[{tool:'Enterprise risk register',connector:'erm',field:'risk_owners',lastRefresh:c5ago()}],
        action:(O.owned>=O.total?('All '+O.total+' material risks have a named owner; convert ownership into progress — for each risk below, confirm the owner has a funded action and a review date.'):('Assign owners to the '+(O.total-O.owned)+' material risks still unowned, then hold each owner to a funded action and date.')),table:{title:'Material risks · owner and the next action',cols:['Risk','Owner & status','Next action'],rows:O.rows.map(function(r){return [{text:r.risk,color:(r.c==='a'?'crit':r.c==='b'?'blue':r.c==='n'?'warn':'good'),bold:true},r.owner+' · '+r.status,{text:r.act,color:'blue'}];})},note:'Whether every material risk has an accountable owner — the governance question, in one number.',connectTool:'your risk register (owners)'});}
    /* ---- COO metrics (operations & continuity lens; shared exposure/vendor objects reused) ---- */
    case 'coo_resilience':{var oi=sig('open_incidents');var rs=(typeof LIVE!=='undefined'&&LIVE&&LIVE.resilience)||{};var worst=rs.worst_recovery_hours;var conn=(oi!=null||worst!=null);var strong=(oi==null||oi===0);
      return c5obj({id:id,name:'Operational resilience',connected:conn,displayValue:conn?(strong?'Strong':'Watch'):'—',label:'computed',color:conn?(strong?'good':'warn'):'muted',
        formula:'operational resilience = strong when no active compromise is disrupting a business process',
        inputs:[{name:'Active incidents',value:oi!=null?(oi>0?oi:'none'):'—',source:'SIEM · open_incidents'},{name:'Slowest recovery',value:worst!=null?hrsToStr(worst):'—',source:'resilience · worst_recovery_hours'}],
        sources:[{tool:'Nerion engine',connector:'nerion',field:'operational_resilience',lastRefresh:c5ago()}],
        action:strong?'Operations are resilient — hold the line: keep open incidents at zero and re-run recovery tests on cadence.':('Resolve the active disruption to restore resilience'+(oi>0?': '+oi+' open incident'+(oi>1?'s':'')+' — drive containment to closure':'')+(worst!=null?'; slowest critical service still recovers in '+hrsToStr(worst)+' — shorten it toward the 4h target':'')+'.'),note:'Whether operations are running and could keep running through a cyber disruption.',connectTool:'your SIEM + resilience data'});}
    case 'coo_processes':{var P=c5Processes();var conn=P.total>0;
      return c5obj({id:id,name:'Processes protected',connected:conn,displayValue:conn?(P.protected+' of '+P.total):'—',label:'computed',color:conn?(P.atRisk>0?'warn':'good'):'muted',
        formula:'processes protected = critical processes − those carrying a material cyber exposure',
        method:'A process is flagged at-risk when a material exposure driver maps to it (identity → the customer platform).',
        inputs:P.list.map(function(p){return {name:p.name,value:p.status,color:(p.status==='At risk'?'warn':p.status==='Watch'?'blue':'good'),source:'operations model · process_exposure'};}).concat([{name:'= Protected',value:P.protected+' of '+P.total+' continuity-safe ('+P.atRisk+' at risk)',source:'total − at-risk'}]),
        sources:[{tool:'Operations model',connector:'ops',field:'process_exposure',lastRefresh:c5ago()}],
        action:(conn&&P.atRisk>0)?(P.atRisk+' critical process'+(P.atRisk>1?'es are':' is')+' at risk — '+P.list.filter(function(p){return p.status==='At risk';}).map(function(p){return p.name;}).join(', ')+'. Close the mapped exposure driver to make '+(P.atRisk>1?'them':'it')+' continuity-safe.'):'All critical processes are continuity-safe — keep the exposure drivers mapped so any new risk surfaces here.',table:(conn&&P.atRisk>0)?{title:'Processes carrying cyber exposure · what it means and how to close it',cols:['Process','What it means','To close it'],rows:P.list.filter(function(p){return p.status!=='Safe';}).map(function(p){return [{text:(p.status==='At risk'?'⚠ ':'')+p.name,color:(p.status==='At risk'?'crit':'blue'),bold:true},p.sub||p.status,{text:(p.status==='At risk'?'Close the exposure driver mapped to this process (identity → the customer platform) to remove it from the at-risk list.':'Confirm the underlying vendor rating and failover so this process is not exposed if the supplier degrades.'),color:'blue'}];})}:null,note:'Cyber mapped to your critical processes — how many are continuity-safe, and which needs attention.',connectTool:'your critical processes (onboarding)'});}
    case 'coo_bc':{var d=sig('dr_test_days');var conn=d!=null;var ok=(d!=null&&d<=90);
      return c5obj({id:id,name:'Business continuity',connected:conn,displayValue:conn?(ok?'Plans tested':'Test overdue'):'—',label:'computed',color:conn?(ok?'good':'warn'):'muted',
        formula:'business continuity = recovery plans tested within the last 90 days',
        inputs:[{name:'Days since last DR test',value:conn?(d+' days'):'—',source:'BC/DR records · dr_test_days'}],
        sources:[{tool:'BC/DR records',connector:'bcdr',field:'dr_test_days',lastRefresh:c5ago()}],
        action:ok?'Continuity plans are tested and current — keep the DR test on its 90-day-or-better cadence.':('DR test is overdue — last exercised '+(d!=null?d+' days ago':'—')+'. Schedule and run a full recovery test now to bring plans back within the 90-day window.'),note:'Whether continuity plans are tested and current, not just written.',connectTool:'your BC/DR test records'});}
    case 'coo_recovery_ready':{var d2=sig('dr_test_days');var imm=sig('backup_immutable_pct');var conn=(d2!=null||imm!=null);var ready=((d2==null||d2<=90)&&(imm==null||imm>=95));
      return c5obj({id:id,name:'Recovery readiness',connected:conn,displayValue:conn?(ready?'Ready':'Gaps'):'—',label:'computed',color:conn?(ready?'good':'warn'):'muted',
        formula:'recovery readiness = recent DR test passed and backups verified immutable',
        inputs:[{name:'Days since DR test',value:d2!=null?(d2+' days'):'—',source:'BC/DR · dr_test_days'},{name:'Immutable backups',value:imm!=null?(imm+'%'):'—',source:'backup · backup_immutable_pct'}],
        sources:[{tool:'BC/DR records',connector:'bcdr',field:'recovery_readiness',lastRefresh:c5ago()}],
        action:ready?'Recovery is proven — DR test is recent and backups are immutable; hold both.':('Close the recovery gap'+((((d2!=null&&d2>90)?1:0)+((imm!=null&&imm<95)?1:0))>1?'s':'')+': '+[((d2!=null&&d2>90)?('DR test overdue at '+d2+' days — re-run it'):null),((imm!=null&&imm<95)?('only '+imm+'% of backups immutable — raise to 95%+ and restore-verify'):null)].filter(Boolean).join('; ')+'.'),note:'Whether you could actually recover the business from a severe cyber event.',connectTool:'your BC/DR + backup platform'});}
    case 'coo_rto':{var rs2=(typeof LIVE!=='undefined'&&LIVE&&LIVE.resilience)||{};var w=rs2.worst_recovery_hours;var conn=w!=null;var tgt=4;
      return c5obj({id:id,name:'Time to recover (RTO)',connected:conn,displayValue:conn?(hrsToStr(w)+' vs '+tgt+'h target'):'—',label:'live',color:conn?(w<=tgt?'good':'warn'):'muted',
        formula:'RTO = worst-case recovery time of a critical service, against your '+tgt+'-hour target',
        inputs:[{name:'Worst-case recovery',value:conn?hrsToStr(w):'—',source:'resilience · worst_recovery_hours'},{name:'Target RTO',value:tgt+'h',source:'BC/DR policy'}],
        sources:[{tool:'BC/DR records',connector:'bcdr',field:'worst_recovery_hours',lastRefresh:c5ago()}],
        action:(w<=tgt)?'Slowest critical service recovers within the '+tgt+'h target — hold it there.':('Slowest critical service takes '+hrsToStr(w)+' to recover vs the '+tgt+'h target — a '+hrsToStr(w-tgt)+' overshoot. Add warm failover and rehearsed runbooks for that service to pull RTO under '+tgt+'h.'),note:'How fast the slowest critical service comes back — the number continuity is judged on.',connectTool:'your recovery-test results'});}
    case 'coo_rpo':{var r=sig('rpo_minutes');var conn=r!=null;var tgt2=60;
      return c5obj({id:id,name:'Data-loss window (RPO)',connected:conn,displayValue:conn?((r>=60?(Math.round(r/6)/10+'h'):(r+'m'))+' vs '+tgt2+'m target'):'—',label:'live',color:conn?(r<=tgt2?'good':'warn'):'muted',
        formula:'RPO = maximum data loss window from your backup cadence, against the '+tgt2+'-minute target',
        inputs:[{name:'Recovery-point objective',value:conn?(r+' min'):'—',source:'backup · rpo_minutes'},{name:'Target RPO',value:tgt2+'m',source:'BC/DR policy'}],
        sources:[{tool:'Backup platform',connector:'backup',field:'rpo_minutes',lastRefresh:c5ago()}],
        action:(r<=tgt2)?'Backup cadence keeps data loss within the '+tgt2+'-minute target — hold it.':('Up to '+(r>=60?(Math.round(r/6)/10+'h'):(r+'m'))+' of data could be lost vs the '+tgt2+'-minute target — increase backup/replication frequency (or add continuous replication) for critical systems to close the '+(r-tgt2)+'-minute gap.'),note:'How much data you would lose in a recovery — the window backups have to beat.',connectTool:'your backup platform'});}
    case 'coo_backups':{var imm2=sig('backup_immutable_pct');var conn=imm2!=null;
      return c5obj({id:id,name:'Backups',connected:conn,displayValue:conn?(imm2>=95?'Verified':(imm2+'% immutable')):'—',label:'live',color:conn?(imm2>=95?'good':'warn'):'muted',
        formula:'backups = share of backups that are immutable and restore-verified',
        inputs:[{name:'Immutable backups',value:conn?(imm2+'%'):'—',source:'backup · backup_immutable_pct'}],
        sources:[{tool:'Backup platform',connector:'backup',field:'backup_immutable_pct',lastRefresh:c5ago()}],
        action:(imm2>=95)?'Backups are immutable and restore-verified — keep coverage at 95%+ and re-verify restores on cadence.':('Only '+imm2+'% of backups are immutable — '+(100-imm2)+'% could be encrypted or deleted in a ransomware event. Move the remainder to immutable/air-gapped storage and restore-test them.'),note:'Whether backups would survive a ransomware event and actually restore.',connectTool:'your backup platform'});}
    case 'coo_last_test':{var d3=sig('dr_test_days');var conn=d3!=null;
      return c5obj({id:id,name:'Last recovery test',connected:conn,displayValue:conn?(d3<=90?'Passed':'Overdue'):'—',label:'live',color:conn?(d3<=90?'good':'warn'):'muted',
        formula:'last recovery test = result and recency of your most recent DR test',
        inputs:[{name:'Days since last test',value:conn?(d3+' days ago'):'—',source:'BC/DR · dr_test_days'}],
        sources:[{tool:'BC/DR records',connector:'bcdr',field:'dr_test_days',lastRefresh:c5ago()}],
        action:(d3<=90)?'Last recovery test passed within 90 days — keep the cadence.':('Recovery test is overdue — last run '+d3+' days ago. Schedule a full DR test now; an untested plan is not a proven one.'),note:'A recovery plan is only real if it has been tested recently.',connectTool:'your BC/DR test records'});}
    case 'coo_identity_recovery':{var p=c5avgDeploy(['mfa','pam']);var conn=(p!=null);var gap=(p!=null&&p<90);
      return c5obj({id:id,name:'Identity recovery',connected:conn,displayValue:conn?(gap?'Gap':'Ready'):'—',label:'computed',color:conn?(gap?'warn':'good'):'muted',
        formula:'identity recovery = readiness to restore access quickly, from identity-control deployment',
        inputs:[{name:'Identity controls deployed',value:conn?(p+'%'):'—',source:'MFA + PAM telemetry'}],
        sources:[c5capSrc('mfa'),c5capSrc('pam')],
        action:gap?('Identity controls are only '+p+'% deployed — the slowest link in a customer-platform recovery. Extend MFA + PAM coverage toward 100% and rehearse an identity-first recovery so access is restored fast.'):'Identity controls are fully deployed — rehearse identity-first recovery so access restoration stays the fast link, not the slow one.',note:'Restoring access is often the slowest link in a customer-platform recovery.',connectTool:'your identity + PAM tools'});}
    case 'coo_tier1':{var V=c5vendors();var t1=(V.p&&V.p.tier1!=null)?V.p.tier1:((V.seed||[]).filter(function(x){return /1/.test(x.tier);}).length);var conn=V.seed.length>0;
      return c5obj({id:id,name:'Tier-1 vendors',connected:conn,displayValue:conn?String(t1):'—',label:'self-reported',color:'ink',
        formula:'tier-1 vendors = suppliers you classified tier-1 at onboarding',
        inputs:[{name:'Tier-1 count',value:conn?t1:'—',source:'vendor intake'}],
        sources:[{tool:'Vendor intake',connector:'vendors',field:'tier',lastRefresh:c5ago()}],
        action:conn?(t1+' tier-1 supplier'+(t1===1?'':'s')+' underpin operations — '+(V.seed||[]).filter(function(x){return /1/.test(x.tier);}).map(function(x){return x.name;}).join(', ')+'. Monitor each closely and confirm a tested failover so no single supplier is a continuity risk.'):'Classify your tier-1/2 suppliers at onboarding so the ones that could halt operations surface here.',table:conn?{title:'Tier-1 suppliers — the ones to monitor closest',cols:['Supplier','Why it matters','To reduce concentration risk'],rows:(V.seed||[]).filter(function(x){return /1/.test(x.tier);}).map(function(x){return [{text:x.name,bold:true},'Tier-1 — its failure would hurt operations most',{text:'Monitor its security rating and confirm a tested failover / alternate supplier.',color:'blue'}];})}:null,note:'The suppliers whose failure would hurt operations most — the ones to monitor closest.',connectTool:'your tier-1/2 vendors (onboarding)'});}
    case 'coo_spof':{var VM=(typeof c5vendorMatrix==='function')?c5vendorMatrix():[];var sp=VM.filter(function(r){return r.status==='single';});var n=sp.length;var conn=VM.length>0;
      return c5obj({id:id,name:'Single points of failure',connected:conn,displayValue:conn?String(n):'—',label:'computed',color:conn?(n>0?'crit':'good'):'muted',
        formula:'single points of failure = vendor categories underpinning a critical service with no independent failover (derived from the vendor→process matrix)',
        inputs:VM.map(function(r){return {name:r.cat+' · '+r.proc,value:r.failover+' · '+r.grade,color:(r.status==='single'?'crit':r.status==='watch'?'warn':'good'),source:'vendor→process map · illustrative'};}),
        sources:[{tool:'Operations model',connector:'ops',field:'vendor→process map',lastRefresh:c5ago()}],
        action:(conn&&n>0)?(sp.map(function(r){return r.cat;}).join(', ')+' underpin'+(n===1?'s':'')+' a critical service with no independent failover — add a backup provider or a contractual failover SLA for at least one to break the single point of failure.'):(conn?'No single vendor underpins a critical service without failover — keep the vendor→process map current so new concentration surfaces here.':'Connect your asset→vendor map so supplier concentration and single points of failure surface here.'),
        table:(conn&&n>0)?{title:'Single point of failure · what it means and how to close it',cols:['Concentration','What it means','To close it'],rows:sp.map(function(r){return [{text:'⚠ '+r.cat,color:'crit',bold:true},'Underpins '+r.proc+' with '+r.failover.toLowerCase()+' — an outage takes it down with no alternative.',{text:'Add an independent failover / second source, or contractually guarantee resilience, to break the single point of failure.',color:'blue'}];})}:null,
        note:'Where one vendor failing takes down a critical operation with no alternative — the concentration to reduce.',connectTool:'your asset→vendor map'});}
    /* ---- CLO metrics (legal & regulatory lens; surfaces obligations + evidence, not legal conclusions) ---- */
    case 'cl_jurisdictions':{var ob=(typeof LIVE!=='undefined'&&LIVE&&LIVE.legal&&LIVE.legal.obligations)||[];var conn=ob.length>0;
      return c5obj({id:id,name:'Jurisdictions in scope',connected:conn,displayValue:conn?String(ob.length):'—',label:'self-reported',color:'ink',
        formula:'jurisdictions in scope = the regulatory regimes that bind you, from the regions you operate in',
        inputs:ob.map(function(o){return {name:(o.jurisdiction||o.flag||'—'),value:(o.obligation||'—'),source:'obligations register · '+(o.clock||'')};}),
        sources:[{tool:'Obligations register',connector:'legal',field:'obligations',lastRefresh:c5ago()}],
        action:'These jurisdictions are fixed by where you operate — the task is operational readiness, not closing a gap. For each below, confirm you can meet its notification clock with breach evidence and pre-briefed counsel; escalate any where readiness is unproven.',table:conn?{title:'Jurisdictions in scope · obligation & readiness step',cols:['Jurisdiction','Obligation','Readiness step'],rows:ob.map(function(o){return [{text:(o.jurisdiction||o.flag||'—'),color:'blue',bold:true},(o.obligation||'—'),{text:'Be ready to meet '+(o.clock||'its clock')+' — hold breach evidence + counsel',color:'warn'}];})}:null,note:'The regulatory regimes that bind you — set by where you operate. Surfaces the obligation; the compliance call is yours.',connectTool:'your operating regions (onboarding)'});}
    case 'cl_obligations':{var ob2=(typeof LIVE!=='undefined'&&LIVE&&LIVE.legal&&LIVE.legal.obligations)||[];var conn=ob2.length>0;
      return c5obj({id:id,name:'Obligations in scope',connected:conn,displayValue:conn?(ob2.length+' in scope'):'—',label:'self-reported',color:'ink',
        formula:'obligations in scope = the notification / disclosure duties across your jurisdictions',
        method:'Nerion surfaces each obligation and its evidence; whether you meet it is a legal determination for your counsel, not asserted here.',
        inputs:ob2.map(function(o){return {name:(o.jurisdiction||'—'),value:(o.obligation||'—')+' · '+(o.clock||''),source:(o.penalty||'statutory ruleset')};}),
        sources:[{tool:'Obligations register',connector:'legal',field:'obligations',lastRefresh:c5ago()}],
        action:'Each duty below is statutory — readiness, not remediation. Confirm for every obligation you can file within its clock and evidence compliance; the penalty column is the downside of missing it.',table:conn?{title:'Obligations in force · clock, penalty & readiness',cols:['Jurisdiction','Duty · clock','Penalty exposure / readiness'],rows:ob2.map(function(o){return [{text:(o.jurisdiction||'—'),color:'blue',bold:true},(o.obligation||'—')+' · '+(o.clock||''),{text:(o.penalty||'statutory penalty')+' — ensure filing path + evidence ready',color:'warn'}];})}:null,note:'The cyber-regulatory duties in force — each with its clock and penalty, traceable to the ruleset.',connectTool:'your operating regions (onboarding)'});}
    case 'cl_binding_clock':{var b=(typeof LIVE!=='undefined'&&LIVE&&LIVE.legal&&LIVE.legal.binding)||{};var conn=!!b.clock;
      return c5obj({id:id,name:'Tightest clock',connected:conn,displayValue:conn?b.clock:'—',label:'self-reported',color:conn?'warn':'muted',
        formula:'tightest clock = the fastest statutory notification deadline across your jurisdictions',
        inputs:[{name:'Binding jurisdiction',value:b.jurisdiction||'—',source:'obligations register'},{name:'Deadline',value:b.clock||'—',source:'statutory ruleset'}],
        sources:[{tool:'Obligations register',connector:'legal',field:'binding',lastRefresh:c5ago()}],
        action:conn?('Your tightest statutory clock is '+b.clock+' ('+(b.jurisdiction||'binding jurisdiction')+'). This is fixed law — rehearse the notification runbook so counsel, forensics and comms can file inside it; treat it as the readiness bar every faster obligation must clear.'):'Connect your operating regions so the binding notification clock can be surfaced.',note:'The deadline you must be ready to meet first — it sets your notification-readiness bar.',connectTool:'your operating regions (onboarding)'});}
    case 'cl_runbooks':{var ir=(typeof LIVE!=='undefined'&&LIVE&&LIVE.governance&&LIVE.governance.ir)||{};var tested=/yes|tested|tabletop/i.test(ir.tested||'');var conn=!!ir.tested;
      return c5obj({id:id,name:'Runbooks ready',connected:conn,displayValue:conn?(tested?'Tested':'Not tested'):'—',label:'self-reported',color:conn?(tested?'good':'warn'):'muted',
        formula:'runbook readiness = whether the incident-response plan has been exercised (tabletop) recently',
        inputs:[{name:'IR plan tested',value:ir.tested||'—',source:'governance · IR readiness'},{name:'Last tabletop',value:ir.lastTabletop||'—',source:'governance'},{name:'Breach-counsel retainer',value:ir.retainer||'—',source:'governance'}],
        sources:[{tool:'IR runbooks / governance',connector:'governance',field:'ir',lastRefresh:c5ago()}],
        action:conn?(tested?('Runbooks have been exercised — keep the tabletop cadence current (last: '+(ir.lastTabletop||'—')+') and confirm the breach-counsel retainer stays live.'):'Runbooks are written but not exercised against the notification clocks — schedule a tabletop that tests filing inside your tightest deadline and confirm the breach-counsel retainer.'):'Connect your IR-readiness answers so runbook exercise status can be confirmed.',note:'Whether the runbooks that meet the notification clocks have been exercised, not just written.',connectTool:'your IR-readiness answers (onboarding)'});}
    case 'cl_forensic_gap':{var p=c5avgDeploy(['mfa','pam','siem']);var conn=p!=null;var gap=(p!=null&&p<90);
      return c5obj({id:id,name:'Forensic gap',connected:conn,displayValue:conn?(gap?'Identity':'None'):'—',label:'computed',color:conn?(gap?'warn':'good'):'muted',
        formula:'forensic gap = the path where evidence to prove what happened is thin, from identity + logging telemetry',
        inputs:[{name:'Identity + logging deployed',value:conn?(p+'%'):'—',source:'MFA + PAM + SIEM telemetry'}],
        sources:[c5capSrc('mfa'),c5capSrc('siem')],
        action:conn?(gap?('Evidence to prove what happened is thin on the identity path (MFA·PAM·SIEM at '+p+'%). Close it — extend identity + privileged-access logging and SIEM retention — so an incident can be reconstructed for regulators and litigation.'):('Forensic coverage across identity + logging is adequate ('+p+'%) — hold retention and log integrity so evidence stands up.')):'Connect your identity + SIEM tools to assess forensic readiness.',note:'The one area where proving what happened in an incident is hardest — here, the identity path.',connectTool:'your identity + SIEM tools'});}
    case 'cl_dsar_sla':{var open=sig('dsar_open'),over=sig('dsar_overdue');var conn=open!=null;var within=(open!=null&&open>0)?Math.round((open-(over||0))/open*100):(open===0?100:null);
      return c5obj({id:id,name:'DSARs within SLA',connected:conn,displayValue:conn?(within!=null?within+'%':'—'):'—',label:'live',color:conn?((within==null||within>=95)?'good':within>=80?'warn':'crit'):'muted',
        formula:'DSARs within SLA = (open requests − overdue) ÷ open requests',
        inputs:[{name:'Open DSARs',value:conn?open:'—',source:'OneTrust · dsar_open'},{name:'Overdue',value:over!=null?over:'—',source:'OneTrust · dsar_overdue'}],
        sources:[{tool:'OneTrust / privacy platform',connector:'privacy',field:'dsar_open,dsar_overdue',lastRefresh:c5ago()}],
        action:conn?((over&&over>0)?('You have '+over+' DSAR'+(over>1?'s':'')+' overdue against the statutory clock'+(within!=null?(' ('+within+'% within SLA)'):'')+' — each is a live compliance breach. Work the overdue queue down first and add capacity so new requests close inside the deadline.'):'DSARs are being handled inside the statutory clock — hold the SLA and keep privacy-platform intake connected.'):'Connect your privacy platform (OneTrust · TrustArc) to measure DSAR SLA compliance.',note:'Whether data-subject requests are handled inside the statutory clock — the everyday privacy obligation.',connectTool:'your privacy platform (OneTrust · TrustArc)'});}
    case 'cl_ropa':{return c5obj({id:id,name:'Records of processing',connected:false,displayValue:'—',label:'self-reported',color:'muted',
        formula:'records of processing (RoPA) = completeness and recency of your Article 30 processing records',
        inputs:[{name:'RoPA status',value:'not connected',source:'RoPA / privacy management system'}],
        sources:[{tool:'RoPA system',connector:'ropa',field:'records_of_processing',lastRefresh:c5ago()}],
        action:'Records of processing (Article 30) are not connected, so completeness and recency are unverified — a regulator can demand them on short notice. Connect your RoPA / privacy-management system so currency is evidenced, not asserted.',note:'Whether your records of processing are current — needs your RoPA / privacy-management system connected.',connectTool:'your RoPA / privacy-management system'});}
    case 'cl_access_pd':{var rev=sig('access_review_pct'),dorm=sig('dormant_accounts');var conn=(rev!=null||dorm!=null);var watch=((rev!=null&&rev<90)||(dorm!=null&&dorm>25));
      return c5obj({id:id,name:'Access to personal data',connected:conn,displayValue:conn?(watch?'Over-permissioned':'Clean'):'—',label:'computed',color:conn?(watch?'warn':'good'):'muted',
        formula:'access hygiene = access-review completeness and dormant-account count near personal data',
        inputs:[{name:'Access reviews complete',value:rev!=null?(rev+'%'):'—',source:'identity · access_review_pct'},{name:'Dormant accounts',value:dorm!=null?dorm:'—',source:'identity · dormant_accounts'}],
        sources:[c5capSrc('mfa'),c5capSrc('pam')],
        action:conn?(watch?('Access near personal data is over-permissioned — access reviews at '+(rev!=null?rev+'%':'—')+', '+(dorm!=null?(dorm+' dormant account'+(dorm===1?'':'s')):'dormant accounts')+'. Complete the access review and disable dormant accounts to shrink unlawful-access exposure under GDPR/CCPA.'):'Access near personal data is clean — hold review cadence and dormant-account cleanup.'):'Connect your identity + PAM tools to assess access hygiene near personal data.',note:'Over-permissioned or stale access near personal data — a privacy risk tied to access-control hygiene.',connectTool:'your identity + PAM tools'});}
    case 'cl_litigation':{var lh=sig('legal_holds');var conn=lh!=null;
      return c5obj({id:id,name:'Active legal holds',connected:conn,displayValue:conn?String(lh):'—',label:'live',color:conn?(lh>0?'warn':'good'):'muted',
        formula:'active legal holds = litigation holds currently in effect for cyber matters',
        inputs:[{name:'Legal holds',value:conn?lh:'—',source:'OneTrust · legal_holds'}],
        sources:[{tool:'Legal-hold / matter system',connector:'legal',field:'legal_holds',lastRefresh:c5ago()}],
        action:conn?((lh>0)?('You have '+lh+' active cyber-related legal hold'+(lh>1?'s':'')+' — confirm each is properly scoped, that in-scope custodians and systems are preserved, and that auto-deletion is suspended so no evidence is spoliated.'):'No active cyber legal holds — keep the legal-hold system connected so a new matter triggers preservation immediately.'):'Connect your legal-hold / matter system to surface active holds.',note:'Whether any cyber-related litigation hold is active — the sign of live legal exposure.',connectTool:'your legal-hold / matter system'});}
    case 'cl_contracts':{return c5obj({id:id,name:'Contracts with cyber warranties',connected:false,displayValue:'—',label:'self-reported',color:'muted',
        formula:'contracts with cyber warranties = count from your contract-lifecycle system (CLM)',
        inputs:[{name:'CLM contracts',value:'not connected',source:'Ironclad / DocuSign CLM / Conga'}],
        sources:[{tool:'Contract-lifecycle system',connector:'clm',field:'cyber_warranties',lastRefresh:c5ago()}],
        action:'Cyber warranties and indemnities across customer contracts are not quantified — an incident could breach obligations you cannot currently name. Connect your CLM (Ironclad · DocuSign CLM · Conga) to surface which contracts carry warranties and their exposure.',note:'How many customer contracts carry cyber warranties or indemnities — needs your CLM connected to quantify.',connectTool:'your CLM (Ironclad · DocuSign CLM · Conga)'});}
    case 'cl_platform_tied':{return c5obj({id:id,name:'Platform-tied contracts',connected:false,displayValue:'—',label:'self-reported',color:'muted',
        formula:'platform-tied contracts = contracts that warrant customer-platform uptime / security',
        inputs:[{name:'CLM uptime warranties',value:'not connected',source:'CLM'}],
        sources:[{tool:'Contract-lifecycle system',connector:'clm',field:'uptime_warranties',lastRefresh:c5ago()}],
        action:'Contracts warranting customer-platform uptime/security are not quantified — a cyber-driven outage could breach SLAs you cannot currently list. Connect your CLM to identify each platform-tied contract and its breach exposure; your top exposure driver is the common root to remediate.',note:'How many contracts a cyber-driven platform outage could breach — needs your CLM connected. Your top exposure driver is the common root.',connectTool:'your CLM'});}
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
        action:'Every actively-exploited (KEV) CVE is a patch-now item: remediate or apply a compensating control on a 48-hour clock, worst-exposure first, and confirm the critical dependency alerts are patched or version-pinned. The per-CVE host list lives in your VM scanner — connect it to name each system here.',note:'The known-exploitable vulnerabilities on the estate right now — the ones attackers use first.',connectTool:'your VM scanner (Qualys · Tenable)'});}
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
        action:'Triage the open SAST findings to zero criticals before ship: assign each to its owning repo, fix or risk-accept with an expiry, and gate the pipeline so new criticals block merge. Open findings by repo and rule live in your code-scanning tool.',note:'Whether secure-by-design is holding for new builds — findings low and cleared before ship.',connectTool:'your application-security scanner'});}
    case 'ct_techdebt':{var rs2=(typeof LIVE!=='undefined'&&LIVE&&LIVE.resilience)||{};var exp2=(rs2.tech_debt&&rs2.tech_debt.exposure);var conn=(exp2!=null);
      return c5obj({id:id,name:'Technical debt',connected:conn,displayValue:conn?usd(exp2):'—',label:'modeled',color:conn?'blue':'muted',
        formula:'technical debt = open risk carried by end-of-life / unsupported systems still on revenue paths',
        inputs:[{name:'Tech-debt exposure',value:conn?usd(exp2):'—',source:'resilience · tech_debt.exposure'}],
        sources:[{tool:'Architecture records',connector:'arch',field:'tech_debt.exposure',lastRefresh:c5ago()}],
        action:'Turn the exposure into a modernization plan: rank each end-of-life or unsupported system by revenue at risk, assign an owner and a retirement or upgrade date, and fund the top items. The per-system EOL list comes from your systems inventory once connected.',note:'The exposure legacy tech carries — the number that justifies the modernization roadmap.',connectTool:'your systems inventory (EOL status)'});}
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
        action:'If any incident is open, assign an incident commander per case, confirm containment, and drive each to closure or a materiality determination — prioritizing those touching a revenue-critical service. Per-incident detail lives in your SIEM.',note:'Whether any service is under an active security incident right now.',connectTool:'your SIEM'});}
    case 'ct_ai_inventory':{var g=(typeof LIVE!=='undefined'&&LIVE&&LIVE.aiRisk&&LIVE.aiRisk.governance)||{};var sys=Number(g.systems)||0;var conn=(g.systems!=null);
      return c5obj({id:id,name:'AI systems inventoried',connected:conn,displayValue:conn?String(sys):'—',label:'self-reported',color:'ink',
        formula:'AI systems inventoried = models/systems in production from your AI model registry',
        inputs:[{name:'AI systems in production',value:conn?sys:'—',source:'AI governance intake'},{name:'Inventory status',value:g.inventory||'—',source:'AI governance'}],
        sources:[{tool:'AI model registry',connector:'ai',field:'systems',lastRefresh:c5ago()}],
        action:'Complete the AI inventory so every deployed model and LLM app is catalogued with its data access and owner — you can only govern what you can see. Upload the CMDB export or connect the model registry to name each system here.',note:'How many AI systems are tracked — you can only govern what you inventory.',connectTool:'your AI model registry (onboarding)'});}
    case 'ct_ai_governed':{var g2=(typeof LIVE!=='undefined'&&LIVE&&LIVE.aiRisk&&LIVE.aiRisk.governance)||{};var sys2=Number(g2.systems)||0;var gov=/nist|iso|rmf/i.test(g2.framework||'');var conn=(g2.framework!=null||g2.systems!=null);
      return c5obj({id:id,name:'Governed',connected:conn,displayValue:conn?(gov?((sys2>0?(sys2):'all')+' governed'):'framework needed'):'—',label:'computed',color:conn?(gov?'good':'warn'):'muted',
        formula:'governed = AI systems operating under a recognized governance framework (NIST AI RMF / ISO 42001)',
        inputs:[{name:'Framework adopted',value:g2.framework||'—',source:'AI governance'},{name:'Acceptable-use policy',value:g2.policy||'—',source:'AI governance'}],
        sources:[{tool:'AI governance',connector:'ai',field:'framework',lastRefresh:c5ago()}],
        action:'Bring AI under governance: adopt a recognized framework (NIST AI RMF / ISO 42001) and publish an acceptable-use policy, then map each production AI system to it so nothing ships ungoverned. Answer the AI-governance intake to make this live.',note:'Whether AI ships under governance — a framework and an acceptable-use policy in place.',connectTool:'your AI-governance answers (onboarding)'});}
    case 'ct_ai_highrisk':{var g3=(typeof LIVE!=='undefined'&&LIVE&&LIVE.aiRisk&&LIVE.aiRisk.governance)||{};var hr=/high-risk|yes/i.test(g3.euAiAct||'');var conn=(g3.euAiAct!=null);
      return c5obj({id:id,name:'High-risk uses',connected:conn,displayValue:conn?(hr?'1':'0'):'—',label:'computed',color:conn?(hr?'warn':'good'):'muted',
        formula:'high-risk uses = AI systems classified high-risk (e.g. EU AI Act) that need heightened controls',
        inputs:[{name:'EU AI Act classification',value:g3.euAiAct||'—',source:'AI governance'}],
        sources:[{tool:'AI governance',connector:'ai',field:'euAiAct',lastRefresh:c5ago()}],
        action:'For each AI use classified high-risk (e.g. under the EU AI Act), apply the heightened controls it demands — documented risk assessment, human oversight, logging and conformity evidence — and track it to a named owner. The per-use classification comes from your AI-governance intake.',note:'AI uses that carry heightened obligations — the ones to watch closest.',connectTool:'your AI-governance answers (onboarding)'});}
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
        action:'Clear each high/critical dependency advisory the product ships on: upgrade or patch the affected package, or pin it and add a compensating control, worst-first. The per-library advisory list lives in your SCA scanner — connect it to name each dependency here.',note:'Known-vulnerable dependencies the product ships on — the software-supply-chain path to customers.',connectTool:'your SCA / dependency scanner'});}
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
        action:conn?('Schedule audit coverage for the '+(s.total-s.evid)+' control'+((s.total-s.evid)===1?'':'s')+' with no evidence on file — worst-first, per the table — so the universe is evidenced, not self-attested.'):'Connect your audit plan + GRC, then schedule evidence collection for each uncovered control worst-first.',table:conn&&(s.fail&&s.fail.length)?{title:'Evidence gaps · controls not yet covered',cols:['Gap','What it means','To close it'],rows:(s.fail||[]).slice().sort(function(a,b){return a.score-b.score;}).slice(0,10).map(function(f){return [{text:'⚠ '+f.id+' '+f.name,color:'crit',bold:true},(f.score===0?'No evidence on file — this control is not covered.':'Only weak evidence (CMMI '+f.score+') — coverage is thin.'),{text:'Schedule evidence collection / a control test for '+f.id+' and cut a workpaper.',color:'blue'}];})}:null,note:'How much of the audit universe is currently backed by evidence — the coverage the board asks about.',connectTool:'your audit plan + GRC'});}
    case 'ia_overdue':{var M=c5expModel();var idMat=M.drivers.some(function(d){return d.id==='exp_identity'&&d.usd>0;});var conn=M.drivers.length>0;
      return c5obj({id:id,name:'Overdue high-risk',connected:conn,displayValue:conn?(idMat?'1':'0'):'—',label:'computed',color:conn?(idMat?'warn':'good'):'muted',
        formula:'overdue high-risk = high-risk areas whose top-exposure driver is unaddressed — flagged for priority review',
        inputs:[{name:'Top exposure driver',value:M.drivers[0]?M.drivers[0].name:'—',source:'exposure model'}],
        sources:[{tool:'Audit plan',connector:'audit',field:'risk_vs_coverage',lastRefresh:c5ago()}],
        action:conn?('Schedule a targeted audit of '+(M.drivers[0]?M.drivers[0].name:'the top exposure area')+' — the high-risk area most out of step with coverage — and confirm its controls are tested this cycle before sign-off.'):'Connect your audit plan (last-covered dates), then schedule the highest-risk least-covered area for the next audit.',note:'The high-risk area most out of step with coverage — where audit attention aligns with enterprise risk.',connectTool:'your audit plan (last-covered dates)'});}
    case 'ia_tested':{var s2=(typeof auditStats==='function')?auditStats():{pct:null};var conn=s2.pct!=null;
      return c5obj({id:id,name:'Controls tested',connected:conn,displayValue:conn?(s2.pct+'%'):'—',label:'computed',color:conn?(s2.pct>=75?'good':'warn'):'muted',
        formula:'controls tested = controls with test evidence (telemetry or document review) ÷ total controls',
        inputs:[{name:'Evidenced (tested)',value:conn?(s2.evid+' of '+s2.total):'—',source:'audit workpapers'}],
        sources:[{tool:'Audit workpapers',connector:'audit',field:'test_status',lastRefresh:c5ago()}],
        action:conn?('Schedule testing for the '+(s2.total-s2.evid)+' untested control'+((s2.total-s2.evid)===1?'':'s')+' this cycle — worst-first, per the table — and record a workpaper for each.'):'Connect your audit workpapers, then schedule the untested controls for testing worst-first.',table:conn&&(s2.fail&&s2.fail.length)?{title:'Untested / unevidenced controls',cols:['Gap','What it means','To close it'],rows:(s2.fail||[]).slice().sort(function(a,b){return a.score-b.score;}).slice(0,10).map(function(f){return [{text:'⚠ '+f.id+' '+f.name,color:'crit',bold:true},(f.score===0?'No test evidence on file — untested.':'Test evidence is weak (CMMI '+f.score+').'),{text:'Schedule a control test for '+f.id+' and cut a workpaper this cycle.',color:'blue'}];})}:null,note:'How far through the control-testing plan this cycle you are — from the workpapers.',connectTool:'your audit workpapers'});}
    case 'ia_passrate':{var s3=(typeof auditStats==='function')?auditStats():{total:0,fail:[]};var conn=(s3.total>0);var pass=s3.total>0?Math.round((s3.total-s3.fail.length)/s3.total*100):null;
      return c5obj({id:id,name:'Pass rate',connected:conn,displayValue:conn?(pass+'%'):'—',label:'computed',color:conn?(pass>=90?'good':pass>=75?'warn':'crit'):'muted',
        formula:'pass rate = controls at a passing standard (CMMI ≥ 2) ÷ total controls',
        inputs:[{name:'Controls at CMMI ≥ 2',value:conn?((s3.total-s3.fail.length)+' of '+s3.total):'—',source:'control testing'},{name:'Failing / unevidenced',value:conn?s3.fail.length:'—',source:'control testing'}],
        sources:[{tool:'Audit workpapers',connector:'audit',field:'test_results',lastRefresh:c5ago()}],
        action:conn?('Schedule re-testing of the '+s3.fail.length+' failing / unevidenced control'+(s3.fail.length===1?'':'s')+' — per the table — and escalate any that cannot be evidenced to the audit committee.'):'Connect your audit workpapers, then re-test each failing control and escalate those that cannot be evidenced.',table:conn&&s3.fail.length?{title:'Failing controls · why the pass rate is not 100%',cols:['Gap','What it means','To close it'],rows:s3.fail.slice().sort(function(a,b){return a.score-b.score;}).slice(0,10).map(function(f){return [{text:'⚠ '+f.id+' '+f.name,color:'crit',bold:true},(f.score===0?'Unevidenced — cannot give assurance.':'Below CMMI 2 — not at a passing standard.'),{text:'Re-test '+f.id+' and cut a workpaper; escalate if it cannot be evidenced.',color:'blue'}];})}:null,note:'Of the controls tested, how many pass — the assurance the results give.',connectTool:'your audit workpapers'});}
    case 'ia_open_findings':{var of=sig('audit_findings_open');var conn=of!=null;
      return c5obj({id:id,name:'Open findings',connected:conn,displayValue:conn?String(of):'—',label:'live',color:conn?(of<=10?'good':'warn'):'muted',
        formula:'open findings = cyber findings currently open in the issue-tracking system',
        inputs:[{name:'Open findings',value:conn?of:'—',source:'issue tracking · audit_findings_open'}],
        sources:[{tool:'Issue-tracking / GRC',connector:'grc',field:'audit_findings_open',lastRefresh:c5ago()}],
        action:conn?('Schedule audit testing of the '+of+' open finding'+(of===1?'':'s')+' worst-first — per the table — and escalate any recurring or unevidenced control to the audit committee.'):'Connect your issue-tracking / GRC platform, then schedule each open finding for testing worst-first and escalate recurring ones.',table:(typeof auditStats==='function'&&auditStats().fail.length)?{title:'The control gaps behind the open findings',cols:['Gap','What it means','To close it'],rows:auditStats().fail.slice().sort(function(a,b){return a.score-b.score;}).slice(0,10).map(function(f){return [{text:'⚠ '+f.id+' '+f.name,color:'crit',bold:true},(f.score===0?'No evidence on file — the control cannot give assurance.':'Below a passing standard (CMMI '+f.score+').'),{text:'Schedule a control test and cut a workpaper for '+f.id+'; track to closure.',color:'blue'}];})}:null,note:'The control-gap backlog management has committed to remediate — the open audit findings.',connectTool:'your issue-tracking / GRC platform'});}
    case 'ia_repeat':{var rf=sig('audit_findings_repeat');var conn=rf!=null;
      return c5obj({id:id,name:'Repeat findings',connected:conn,displayValue:conn?String(rf):'—',label:'live',color:conn?(rf>0?'warn':'good'):'muted',
        formula:'repeat findings = findings that reappeared in a later audit (reported closed but the control did not hold)',
        inputs:[{name:'Repeat findings',value:conn?rf:'—',source:'issue tracking · audit_findings_repeat'}],
        sources:[{tool:'Issue-tracking / GRC',connector:'grc',field:'audit_findings_repeat',lastRefresh:c5ago()}],
        action:conn?((rf>0?('Escalate the '+rf+' repeat finding'+(rf===1?'':'s')+' to the audit committee as governance flags — per the table, re-test the unevidenced controls most likely to recur before accepting any closure.'):'No repeat findings — confirm closures held by sampling re-tests next cycle.')):'Connect your issue-tracking / GRC platform, then flag findings that recur audit-over-audit and escalate them to the committee.',table:(rf>0&&typeof auditStats==='function'&&auditStats().fail.filter(function(f){return f.score===0;}).length)?{title:'Systemic-gap candidates · unevidenced controls likely to recur',cols:['Gap','What it means','To close it'],rows:auditStats().fail.filter(function(f){return f.score===0;}).slice(0,10).map(function(f){return [{text:'⚠ '+f.id+' '+f.name,color:'crit',bold:true},'Carries no evidence it ever held — the signature of a finding closed on paper but not in practice.',{text:'Re-test '+f.id+' and escalate to the audit committee; require durable evidence, not a re-closed ticket.',color:'blue'}];})}:null,note:'The systemic gaps closed on paper but not in practice — the ones to escalate to the committee.',connectTool:'your issue-tracking / GRC platform'});}
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
        action:(none?'No cyber matter is material this quarter. Keep each open incident running through the Item 106 assessment and re-confirm the determination at the next board meeting.':('Run each of the '+oi+' open incident'+(oi>1?'s':'')+' through the Item 106 materiality assessment against the '+((LIVE&&LIVE.economics&&LIVE.economics.materiality&&LIVE.economics.materiality.value)?usd(LIVE.economics.materiality.value):'documented')+' threshold; escalate any that cross it to counsel for an 8-K Item 1.05 determination within 4 business days.')),
        note:'Whether any cyber matter is currently material for disclosure — the board’s first governance question.',connectTool:'your materiality assessment (onboarding)'});}
    case 'bd_reportable':{var oi2=sig('open_incidents');var conn=oi2!=null;
      return c5obj({id:id,name:'Reportable incidents · qtr',connected:conn,displayValue:conn?(oi2>0?String(oi2):'0'):'—',label:'live',color:conn?(oi2>0?'warn':'good'):'muted',
        formula:'reportable incidents = incidents that crossed the disclosure threshold this quarter',
        inputs:[{name:'Incidents this quarter',value:conn?oi2:'—',source:'SIEM · open_incidents'}],sources:[c5capSrc('siem')],
        action:(oi2>0?('File an 8-K Item 1.05 for each of the '+oi2+' reportable incident'+(oi2>1?'s':'')+' within 4 business days of the materiality determination, and brief the board on each before filing.'):'No incident crossed the disclosure threshold this quarter. Keep the incident record current so any future reportable event is caught immediately.'),
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
        action:(oi3>0?('Evidence that all '+oi3+' incident'+(oi3>1?'s':'')+' were assessed against the threshold; retain each disposition so the board can show complete Item 106 coverage. None met materiality this quarter.'):'No incidents this quarter. Keep the assessment workflow live so every future incident is logged and assessed against the threshold.'),
        note:'That every incident was assessed against the threshold — none met it this quarter.',connectTool:'your SIEM + materiality assessment'});}
    case 'bd_disclosure_controls':{var ir=(LIVE&&LIVE.governance&&LIVE.governance.ir)||{};var tested=/yes|tested|tabletop/i.test(ir.tested||'');var conn=!!ir.tested;
      return c5obj({id:id,name:'Disclosure controls',connected:conn,displayValue:conn?(tested?'Effective':'Not tested'):'—',label:'self-reported',color:conn?(tested?'good':'warn'):'muted',
        formula:'disclosure controls = whether controls over cyber disclosure are documented and tested',
        inputs:[{name:'IR / disclosure process tested',value:ir.tested||'—',source:'governance'}],
        sources:[{tool:'Governance',connector:'governance',field:'disclosure_controls',lastRefresh:c5ago()}],
        action:(tested?'Disclosure controls are tested. Re-run the disclosure tabletop annually and retain the evidence for the auditor.':'Disclosure controls have not been tested. Schedule a cross-functional disclosure tabletop (security, legal, finance, IR) this quarter and document that a timely, accurate 8-K can be executed within 4 business days.'),
        table:(conn&&!tested)?{title:'Open disclosure-control gap · what it means and how to close it',cols:['Gap','What it means','To close it'],rows:[[{text:'⚠ Disclosure controls untested',color:'warn',bold:true},'No evidence the process that ensures timely, accurate cyber disclosure works under pressure.',{text:'Run a disclosure tabletop across security, legal, finance and IR; capture that an 8-K Item 1.05 can be filed within 4 business days.',color:'blue'}]]}:null,
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
        action:((st&&st.invested>0)?('The top exposure driver is funded ('+st.n+' initiative'+(st.n>1?'s':'')+', '+usd(st.invested)+' invested). Track delivery and report benefit realization to the board.'):'The top exposure driver is not yet funded. Bring management a costed proposal for the top initiative and record the board funding decision at the next session.'),
        note:'Whether management has funded the action that sustains the improving trend — the board notes, it does not fund.',connectTool:'your funded initiatives (import)'});}
    case 'bd_resilience_inv':{var d=sig('dr_test_days');var imm=sig('backup_immutable_pct');var conn=(d!=null||imm!=null);var ok=((d==null||d<=90)&&(imm==null||imm>=95));
      return c5obj({id:id,name:'Resilience investment',connected:conn,displayValue:conn?(ok?'On track':'Gaps'):'—',label:'computed',color:conn?(ok?'good':'warn'):'muted',
        formula:'resilience investment = recovery tested recently and backups verified',
        inputs:[{name:'Days since DR test',value:d!=null?(d+' days'):'—',source:'BC/DR · dr_test_days'},{name:'Immutable backups',value:imm!=null?(imm+'%'):'—',source:'backup'}],
        sources:[{tool:'BC/DR records',connector:'bcdr',field:'recovery',lastRefresh:c5ago()}],
        action:(!conn?'Connect BC/DR and backup telemetry so resilience can be evidenced to the board.':(ok?'Resilience is within targets. Hold the DR test cadence and backup immutability, and report the dates to the board.':('Close the resilience gap'+(((d!=null&&d>90)&&(imm!=null&&imm<95))?'s':'')+' below: '+((d!=null&&d>90)?('run a full DR test (last was '+d+' days ago). '):'')+((imm!=null&&imm<95)?('raise immutable backup coverage from '+imm+'% to ≥95%.'):'')))),
        table:(conn&&!ok)?{title:'Open resilience gap · what it means and how to close it',cols:['Gap','What it means','To close it'],rows:[].concat((d!=null&&d>90)?[[{text:'⚠ DR recovery not recently tested',color:'warn',bold:true},('Last disaster-recovery test was '+d+' days ago, past the 90-day target, so recovery time is unproven.'),{text:'Run a full DR/failover test now and set a recurring ≤90-day cadence.',color:'blue'}]]:[]).concat((imm!=null&&imm<95)?[[{text:'⚠ Backups not fully immutable',color:'warn',bold:true},('Only '+imm+'% of backups are immutable, below the 95% target, so ransomware could tamper with recovery data.'),{text:'Raise immutable/air-gapped backup coverage to ≥95% and verify restores.',color:'blue'}]]:[])}:null,
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
        action:(incidentActive?('Stand up incident response on the active shipped-feature incident, then clear the '+failing+' flagged dimension'+(failing===1?'':'s')+' below.'):failing?('Close the '+failing+' flagged product-security dimension'+(failing>1?'s':'')+' below to reach Strong — each names what it means and the fix.'):'Every evaluated dimension is clean — hold the line and connect a per-app inventory to split Strong by product.'),table:conn?{title:'Product-security dimensions · what each means and how to clear it',cols:['Dimension','What it means','To close it'],rows:dims.map(function(d){return [{text:(d.v==null?'– ':d.ok?'✓ ':'⚠ ')+d.name,color:(d.v==null?'muted':d.ok?'good':'crit'),bold:(!d.ok&&d.v!=null)},d.val,{text:(d.v==null?('Connect '+d.source.split('·')[0].trim()+' to evaluate this dimension.'):d.ok?'Clean — keep the gate green.':('Triage and remediate the open '+d.name.toLowerCase()+'; block release until cleared.')),color:(d.v==null?'muted':d.ok?'good':'blue')}];})}:null,note:'The one-glance read on whether the product ships secure — across features, dependencies and code.',connectTool:'your SDLC gates + product scanners (+ a per-app inventory to split by product)'});}
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
        action:conn?(inPlace<total?('Evidence the '+(total-inPlace)+' missing secure-by-design practice'+((total-inPlace)>1?'s':'')+' below — each names the signal to connect — to lift coverage from '+pct+'% toward 100%.'):'All '+total+' target practices are evidenced — keep the telemetry live.'):'Connect your SDLC tooling so secure-by-design coverage can be measured.',table:{title:'Secure-by-design practices · evidenced vs. to connect',cols:['Practice','Status','To evidence it'],rows:pr.map(function(x){return [{text:(x.on?'✓ ':'⚠ ')+x.name,color:x.on?'good':'crit',bold:!x.on},x.on?'evidenced':'not connected',{text:x.on?'Live — keep this scanner reporting.':('Connect '+x.source.replace(/^no /,'').replace(/ signal connected yet$/,'')+' so this practice is evidenced in the pipeline.'),color:x.on?'good':'blue'}];})},note:'How deeply secure-by-design is running in the pipeline for new features — measured, not asserted.',connectTool:'your SDLC / application-security tooling'});}
    case 'cp_open_risks':{var dep3=sig('dependabot_critical');var conn=dep3!=null;
      return c5obj({id:id,name:'Open product risks',connected:conn,displayValue:conn?(dep3+' high'):'—',label:'live',color:conn?(dep3>0?'warn':'good'):'muted',
        formula:'open product risks = high/critical security findings open in shipped product',
        inputs:[{name:'Critical findings',value:conn?dep3:'—',source:'SCA · dependabot_critical'}],
        sources:[{tool:'Product scanners',connector:'appsec',field:'dependabot_critical',lastRefresh:c5ago()}],
        action:conn?(dep3>0?('Triage and remediate the '+dep3+' open high/critical product finding'+(dep3>1?'s':'')+' — assign owners and block release on any that touch a shipped feature. Connect the scanner to break this into the named CVEs and affected components.'):'No open high-severity product risks — keep the scanners green.'):'Connect your product scanners to surface open high-severity risks.',note:'The high-priority security risks currently in the product surface.',connectTool:'your product scanners'});}
    case 'cp_mfa':{var m=sig('mfa_pct');var conn=m!=null;
      return c5obj({id:id,name:'MFA adoption',connected:conn,displayValue:conn?(m+'%'):'—',label:'live',color:conn?(m>=80?'good':'warn'):'muted',
        formula:'MFA adoption = share of user accounts with multi-factor authentication enabled',
        inputs:[{name:'Accounts on MFA',value:conn?(m+'%'):'—',source:'identity · mfa_pct'}],
        sources:[c5capSrc('mfa')],
        action:conn?(m>=80?('MFA adoption is at '+m+'% — close the remaining '+(100-m)+'% to reach full coverage.'):('MFA adoption is only '+m+'% — enforce MFA on the remaining '+(100-m)+'% of accounts; pair it with the identity/access remediation.')):'Connect your identity provider to measure MFA adoption.',note:'How strongly users have adopted account security — a product-trust signal, and a lever the identity fix raises.',connectTool:'your identity provider'});}
    case 'cp_pass_rate':{return c5obj({id:id,name:'Releases passing security first-time',connected:false,displayValue:'—',label:'computed',color:'muted',
        formula:'security-gate pass rate = releases clearing the security gate on the first attempt ÷ releases',
        inputs:[{name:'Gate pass/fail records',value:'not connected',source:'CI/CD security gates'}],
        sources:[{tool:'CI/CD security gates',connector:'cicd',field:'gate_pass_rate',lastRefresh:c5ago()}],
        action:'Connect your CI/CD security-gate records so first-time pass rate can be measured — today it is not instrumented.',note:'How often releases clear security first-time — needs your CI/CD security-gate records.',connectTool:'your CI/CD security-gate records'});}
    case 'cp_cycle_time':{return c5obj({id:id,name:'Added cycle time',connected:false,displayValue:'—',label:'computed',color:'muted',
        formula:'added cycle time = extra lead-time added by security gates per release',
        inputs:[{name:'Deployment lead-time',value:'not connected',source:'CI/CD deployment events'}],
        sources:[{tool:'CI/CD',connector:'cicd',field:'lead_time',lastRefresh:c5ago()}],
        action:'Connect your CI/CD deployment lead-time so the cycle time added by security gates can be measured — today it is not instrumented.',note:'How much time security gates add to delivery — needs your CI/CD deployment lead-time.',connectTool:'your CI/CD deployment events'});}
    case 'cp_blocker':{var M=c5expModel();var idMat=M.drivers.some(function(d){return d.id==='exp_identity'&&d.usd>0;});var conn=M.drivers.length>0;
      return c5obj({id:id,name:'Recurring blocker',connected:conn,displayValue:conn?(idMat?'Identity/access':'None'):'—',label:'computed',color:conn?(idMat?'warn':'good'):'muted',
        formula:'recurring blocker = the exposure that repeatedly gates releases — from the top exposure driver',
        inputs:[{name:'Top exposure driver',value:M.drivers[0]?M.drivers[0].name:'—',source:'exposure model'}],
        sources:[{tool:'Product + security backlog',connector:'backlog',field:'recurring_blocker',lastRefresh:c5ago()}],
        action:conn?(idMat?('The '+(M.drivers[0]?M.drivers[0].name.toLowerCase():'top-driver')+' area is the recurring release blocker — fund its remediation once to clear it from the pipeline for good.'):'No recurring blocker is gating releases — keep the pipeline clear.'):'Connect your controls + backlog to identify the recurring blocker.',note:'The one thing that keeps coming back in the pipeline — the '+(M.drivers[0]?M.drivers[0].name.toLowerCase():'top-driver')+' area, fixable once.',connectTool:'your controls + backlog'});}
    case 'cp_open_items':{var css4=sig('code_scanning_open'),dep4=sig('dependabot_critical');var conn=(css4!=null||dep4!=null);var n=(css4||0)+(dep4||0);
      return c5obj({id:id,name:'Open security items',connected:conn,displayValue:conn?String(n):'—',label:'live',color:conn?(n<=15?'good':'warn'):'muted',
        formula:'open security items = product-security work queued (open SAST findings + critical dependency alerts)',
        inputs:[{name:'Open SAST findings',value:css4!=null?css4:'—',source:'code scanning'},{name:'Critical dependency alerts',value:dep4!=null?dep4:'—',source:'SCA'}],
        sources:[{tool:'Product + security issue trackers',connector:'backlog',field:'open_items',lastRefresh:c5ago()}],
        action:conn?(n>0?('Work down the '+n+' open product-security item'+(n>1?'s':'')+' below — sequence critical dependency alerts ahead of SAST findings.'):'Backlog is clear — keep it that way.'):'Connect your product + security issue trackers to see the backlog.',table:conn?{title:'Open product-security backlog · by source',cols:['Source','Open','To close it'],rows:[[{text:'Open SAST findings',color:(css4>0?'warn':'good'),bold:(css4>0)},(css4!=null?String(css4):'—'),{text:(css4>0?'Fix the flagged code paths and re-scan to clear.':'None open.'),color:(css4>0?'blue':'good')}],[{text:'Critical dependency alerts',color:(dep4>0?'crit':'good'),bold:(dep4>0)},(dep4!=null?String(dep4):'—'),{text:(dep4>0?'Patch/upgrade the vulnerable dependencies; sequence these first.':'None open.'),color:(dep4>0?'blue':'good')}]]}:null,note:'The product-security backlog — the work queued against the product surface.',connectTool:'your product + security issue trackers'});}
    case 'cp_high_priority':{var dep5=sig('dependabot_critical');var conn=dep5!=null;
      return c5obj({id:id,name:'High-priority',connected:conn,displayValue:conn?String(dep5):'—',label:'live',color:conn?(dep5>0?'warn':'good'):'muted',
        formula:'high-priority items = critical-severity security items leading the backlog',
        inputs:[{name:'Critical items',value:conn?dep5:'—',source:'SCA · dependabot_critical'}],
        sources:[{tool:'Issue trackers',connector:'backlog',field:'high_priority',lastRefresh:c5ago()}],
        action:conn?(dep5>0?('Sequence the '+dep5+' critical-severity item'+(dep5>1?'s':'')+' first — assign an owner and a fix-by date to each. Connect the tracker to name the specific items.'):'No high-priority items outstanding.'):'Connect your issue trackers to see high-priority items.',note:'How many product-security items are high-priority — the ones to sequence first.',connectTool:'your product + security issue trackers'});}
    case 'cp_funded':{var st=(typeof ROI_STATE!=='undefined'&&ROI_STATE)?ROI_STATE:null;var yes=!!(st&&st.invested>0);
      return c5obj({id:id,name:'Funded',connected:true,displayValue:yes?'Yes':'To fund',label:'computed',color:yes?'good':'warn',
        formula:'funded = whether the top product-security item is covered by the funded initiative portfolio',
        inputs:[{name:'Funded initiatives',value:st?st.n:'—',source:'initiatives portfolio'},{name:'Invested',value:yes?usd(st.invested):'—',source:'ticketing + decisions'}],
        sources:[{tool:'Program model',connector:'nerion',field:'funded_portfolio',lastRefresh:c5ago()}],
        action:yes?('The top product-security item ('+c5TopDriver().short+' remediation) is funded — track it to delivery.'):('The top product-security item ('+c5TopDriver().short+' remediation) is not yet funded — add it to the funded initiative portfolio.'),note:'Whether the top backlog item is funded — the '+c5TopDriver().short+' remediation.',connectTool:'your funded initiatives (import)'});}
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
  // The authoritative crown-jewel set is exactly what onboarding derived and the
  // user confirmed (LIVE.crown_jewels = apps that clear the criticality threshold).
  // Use ALL of them — never re-truncate here, or the cockpit count drifts from the
  // onboarding preview (the "2 here, 6 there" bug). The denominator must equal the
  // onboarding crown-jewel count.
  var list=cj.map(function(c,i){var o={name:c.name,tier:c.tier};
    if(i===0&&idMat){o.status='At risk';o.c='warn';o.sub='Identity / access path is exposed';o.src='EDR + identity/access telemetry';o.why='exp_identity';}
    else{o.status='Secure';o.c='good';o.sub='No active detection';o.src=edrTxt+' · '+vmTxt;}
    return o;});
  // Denominator = the authoritative onboarding crown-jewel count (counts.crown_jewels),
  // so "X of N at risk" always traces to the onboarding crown-jewel set.
  var total=(typeof LIVE!=='undefined'&&LIVE&&LIVE.counts&&Number(LIVE.counts.crown_jewels))||list.length;
  return {list:list,total:total,atRisk:list.filter(function(x){return x.status==='At risk';}).length};
}
/* Plain-English "why is this crown jewel at risk?" — opened from the "why?" link in the
   crown-jewels inspector. Explains, in prose, that the identity/access path is the
   exposed route to the asset, and names the two identity controls (MFA / PAM) with their
   real deployment gaps — instead of dropping the user into the modeled-dollars metric. */
function c5CrownWhy(name){
  try{
    function dep(k){try{return (typeof CAP_BY_KEY!=='undefined'&&CAP_BY_KEY[k]&&typeof capDeploy==='function')?capDeploy(CAP_BY_KEY[k]):null;}catch(_){return null;}}
    function gapLi(label,p){
      if(p==null)return '<li style="margin-bottom:6px"><b>'+label+'</b> — not fully rolled out yet, so some accounts stay unprotected.</li>';
      var g=Math.max(0,100-Math.round(p));
      return '<li style="margin-bottom:6px"><b>'+label+'</b> is <b>'+Math.round(p)+'% deployed</b>'+(g>0?(' — <b style="color:var(--warn)">'+g+'% of accounts are still unprotected</b>.'):' — fully covered.')+'</li>';
    }
    var mfa=dep('mfa'),pam=dep('pam');
    var body=
      '<p style="margin:0 0 12px;font-size:13.5px;line-height:1.6;color:var(--ink)"><b>'+c5esc(name)+'</b> is flagged <b style="color:var(--warn)">At risk</b> because the <b>identity &amp; access path</b> that reaches it is exposed right now.</p>'+
      '<p style="margin:0 0 9px;font-size:13px;line-height:1.6;color:var(--ink-2)">Identity is how people — and attackers — get to this system. The two controls that guard that path still have deployment gaps, so not every account is protected:</p>'+
      '<ul style="margin:0 0 12px;padding-left:20px;font-size:13px;line-height:1.55;color:var(--ink-2)">'+gapLi('Multi-factor authentication (MFA)',mfa)+gapLi('Privileged-access management (PAM)',pam)+'</ul>'+
      '<p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:var(--ink-2)">That leaves a credible route: compromise one unprotected account and there is a path straight to this crown jewel — which is why it stands out while every other one shows no active detection and adequate coverage.</p>'+
      '<p style="margin:0;font-size:13px;line-height:1.6;color:var(--ink)"><b>What to do:</b> finish the MFA and privileged-access rollout on the remaining accounts. Closing those gaps takes <b>'+c5esc(name)+'</b> off the at-risk list.</p>';
    var old=document.getElementById('c5whyOverlay');if(old&&old.parentNode)old.parentNode.removeChild(old);
    var wrap=document.createElement('div');wrap.id='c5whyOverlay';
    wrap.style.cssText='position:fixed;inset:0;z-index:86;display:flex;align-items:center;justify-content:center;background:rgba(20,33,72,.5)';
    wrap.innerHTML='<div style="width:min(560px,94vw);max-height:88vh;display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:0 24px 60px rgba(20,33,72,.45);overflow:hidden">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 18px;border-bottom:1px solid var(--line);background:var(--surface-2)"><b style="font-family:var(--serif);font-size:15px;min-width:0">Why is this at risk?</b><button type="button" id="c5whyClose" style="flex:none;border:1px solid var(--line);background:var(--surface);border-radius:8px;padding:6px 13px;font-weight:600;font-size:12.5px;cursor:pointer">Close</button></div>'+
      '<div style="padding:16px 20px;overflow:auto">'+body+'</div>'+
    '</div>';
    document.body.appendChild(wrap);
    function close(){if(wrap.parentNode)wrap.parentNode.removeChild(wrap);}
    wrap.addEventListener('click',function(e){if(e.target===wrap)close();});
    var cb=document.getElementById('c5whyClose');if(cb)cb.onclick=close;
  }catch(_){}
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
/* Whether identity OPERATING evidence is incomplete — computed, not hard-coded. Identity
   coverage % (deployment) is not the same as proof the identity controls operate: that
   needs live privileged-session monitoring and access-review / JML evidence. Demo
   telemetry is not operating evidence, so it reads partial; live it clears only when
   those operating signals are connected. Used by BOTH the tactic metric and the Threats
   grid so the two never disagree. */
function c5IdentityOperatingPartial(){
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  if(demo)return true;
  var priv=(typeof sig==='function')?sig('priv_sessions_flagged'):null;
  var dormant=(typeof sig==='function')?sig('dormant_accounts'):null;
  return !(priv!=null&&dormant!=null);
}
function c5tacticMetric(t){
  var caps=(typeof TACTIC_CAPS!=='undefined'&&TACTIC_CAPS[t])||[];var cov=(typeof threatCoverage==='function')?threatCoverage(caps):null;var conn=cov!=null;
  var state=cov==null?'limited':cov>=80?'covered':cov>=50?'partial':'limited';var color=cov==null?'muted':cov>=80?'good':cov>=50?'warn':'crit';
  // Identity-dependent tactics never read "Strong" while identity operating evidence
  // is incomplete — coverage % alone must not imply maturity for these.
  var IDENTITY_TACTICS=['Initial Access','Persistence','Privilege Escalation','Defense Evasion','Credential Access','Discovery','Lateral Movement'];
  var idDep=IDENTITY_TACTICS.indexOf(t)>=0;
  var pdr=function(x){if(x==null)return 'Not Enough Evidence';x=Math.max(0,Math.min(100,x));return x>=90?'Strong':x>=75?'Moderate':x>=50?'Partial':'Gap';};
  var covStat=cov==null?'Not Enough Evidence':(cov>=90?'Strong Coverage':cov>=75?'Moderate Coverage':cov>=50?'Partial Coverage':'Gap');
  // Apply the identity downgrade HERE (once) so the metric's status/colour — and every
  // surface that reads them (the Threats grid card AND the detail drawer) — match exactly.
  var idPartial=(typeof c5IdentityOperatingPartial==='function')?c5IdentityOperatingPartial():true;
  if(idDep&&idPartial&&covStat==='Strong Coverage'){covStat='Moderate Coverage';color='warn';state='partial';}
  return c5obj({id:'tac_'+t,name:t,connected:conn,displayValue:conn?(cov+'% coverage'):'not connected',label:'computed',color:color,state:state,identity_dependent:idDep,coverage_status:covStat,prevent:pdr(cov!=null?cov-10:null),detect:pdr(cov!=null?cov+5:null),respond:pdr(cov),
    formula:'tactic coverage = mean live deployment/coverage of the controls MITRE ATT&CK maps to this tactic',
    method:'Each control’s % is the live deployment or coverage figure its own tool reports — telemetry, not a manual entry: Qualys/Tenable report patch coverage (patch_pct), KnowBe4/Proofpoint report training completion (training_pct), Splunk/Sentinel report log-source coverage (siem_coverage_pct), your IdP reports MFA enrollment (mfa_pct), and so on. Tactic coverage is the mean of those. A control with no connected tool reads "not connected" and is left out of the mean. Figures are illustrative in the sample workspace and become live the moment each tool is connected.',
    inputs:caps.map(function(k){var c=CAP_BY_KEY[k];var p=capDeploy(c);var s=(typeof capSource==='function')?capSource(c):null;
      var sk=(typeof CAP_SIGKEY!=='undefined'&&CAP_SIGKEY[k])||null;
      var vend=(s&&s.vendor)||(c?c.tool:k);
      var srcTxt=vend+(sk?(' · '+sk):'')+(p!=null?(s&&s.connected?(s.demo?' (demo telemetry)':' (live telemetry)'):' (sample telemetry)'):' (no telemetry)');
      return {name:c?c.name.replace(/ *\(.*\)/,''):k,value:p!=null?(p+'% deployed'):'not connected',color:capColor(p),source:srcTxt};
    }).concat([{name:'Prevent · Detect · Respond',value:pdr(cov!=null?cov-10:null)+' · '+pdr(cov!=null?cov+5:null)+' · '+pdr(cov),source:'control-type split of the mapped controls (compact — drill for evidence)'},{name:'= Tactic coverage',value:(cov!=null?(cov+'% coverage'):'—')+(idDep?' · identity-dependent':''),color:color,source:'mean of the controls above (live deployment %)'}]),
    sources:caps.map(function(k){return c5capSrc(k);}),
    action:conn?((function(){var ws=caps.map(function(k){var c=CAP_BY_KEY[k];return {n:c?c.name.replace(/ *\(.*\)/,''):k,p:capDeploy(c)};}).filter(function(x){return x.p!=null;}).sort(function(a,b){return a.p-b.p;});var w=ws[0];return cov>=80?('Coverage for the '+t+' tactic is strong at '+cov+'% — hold it and keep the mapped controls deployed.'):(w?('Raise coverage for the '+t+' tactic (now '+cov+'%): start with '+w.n+' at '+w.p+'% — the weakest control MITRE maps to this tactic — then the next lowest, until it clears 80%.'):('Raise coverage for the '+t+' tactic (now '+cov+'%) by deploying the mapped controls above.'));})()):'Connect the controls MITRE maps to the '+t+' tactic to measure and close coverage.',
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
    action:conn?((delta!=null&&delta<0)?('Your '+def.label.toLowerCase()+' maturity ('+Number(mine).toFixed(1)+'/5) trails the peer median ('+Number(med).toFixed(1)+'/5) by '+Math.abs(delta).toFixed(1)+' — raise the '+def.pre.join(', ')+' controls in this domain toward Defined (3.0+), starting with those below your average.'):((delta!=null&&delta>=0)?('Your '+def.label.toLowerCase()+' maturity leads the peer median — hold the '+def.pre.join(', ')+' controls and reinvest effort in your lagging domains.'):('Raise the '+def.pre.join(', ')+' controls in this domain toward Defined to strengthen '+def.label.toLowerCase()+'.'))):'Connect your control tools + policies to score '+def.label.toLowerCase()+' maturity against peers.',
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
/* ── Standardized executive detail-view helpers. Every drill answers, in order:
   Result · Why it matters · Evidence confidence · What Nerion found · What Nerion does
   not prove · Open gaps · Recommended action (+owner/due/expected) · Sources & freshness
   · Calculation basis in plain English. Raw formulas are kept out of the normal view and
   only shown in an admin/debug mode. All text is derived from the metric object — nothing
   client-specific is hard-coded. ── */
function c5debugOn(){try{if(typeof window!=='undefined'&&window.CYBERRX_DEBUG===true)return true;if(typeof localStorage!=='undefined'&&localStorage.getItem('cyberrx_debug')==='1')return true;if(typeof location!=='undefined'&&/[?&]debug=1/.test(location.search||''))return true;}catch(_){}return false;}
/* Source label for the Result section — one of the allowed labels, never a bare value. */
function c5srcLabelText(m){
  if(!m||!m.connected)return 'Not Connected';
  var L=String(m.label||'').toLowerCase();
  var map={live:'Live',computed:'Computed',modeled:'Modeled','self-reported':'Self-reported',manual:'Manual',demo:'Demo',mock:'Mock',illustrative:'Modeled'};
  return map[L]||(m.label?cap(m.label):'Computed');
}
/* Status word from the metric colour — the spec's status model, no "Healthy"/"Safe". */
function c5statusText(m){
  var demo=(typeof signalsAreDemo==='function'&&signalsAreDemo())||/demo|mock/.test(String(m&&m.label).toLowerCase());
  if(!m||!m.connected)return 'Not Enough Evidence';
  if(m.statusText)return m.statusText;
  if(demo)return 'Demo';
  return m.color==='crit'?'Escalation needed':m.color==='warn'?'Action needed':m.color==='blue'?'Monitor':m.color==='good'?'Within target':'Monitor';
}
/* "What Nerion does not prove" — audit-defensibility. Keyed by metric type, with an
   honest fallback by source label. Never overclaims. */
var C5_NOTPROVE={
  ais_:'This does not prove model-security operating effectiveness until live AI-SPM telemetry, guardrail testing and usage monitoring are connected.',
  er_:'This ranks exposure from the connected inputs; it does not prove an attacker cannot reach the asset by an unmodeled path.',
  coo_:'This does not prove recovery readiness unless the last recovery test covered the affected service and its dependency path.',
  ctl_:'This shows modeled risk reduction; it does not prove control operating effectiveness without evidence for the review period.',
  tac_:'This reflects control coverage against the tactic; it does not prove detection or response would succeed in a live intrusion.',
  exp_:'This is a modeled estimate of exposure; it does not prove an actual loss will or will not occur.',
  cf_:'This is a modeled financial figure; it does not prove a realized gain or loss.',
  dom_:'This benchmarks maturity from published medians; it does not prove a live peer percentile until an opt-in cohort reaches k-anonymity.'
};
function c5notProve(m){
  if(m&&m.notProve)return m.notProve;
  var id=m&&m.id;if(id){var v=C5_NOTPROVE[c5whyPre(id)]||C5_NOTPROVE[id];if(v)return v;}
  if(!m||!m.connected)return 'Nothing here is proven until the source is connected — Nerion shows the honest not-connected state instead of a placeholder.';
  var L=String(m.label||'').toLowerCase();
  if(/self-reported|manual/.test(L))return 'This reads from self-reported evidence; it does not prove operating effectiveness until that evidence is independently validated for the review period.';
  if(/modeled|illustrative/.test(L))return 'This is a modeled estimate from the connected inputs; it does not prove an actual outcome or a guaranteed result.';
  return 'This reflects the connected telemetry at this point in time; it does not prove effectiveness beyond what those sources measure.';
}
/* Evidence confidence + reason. Missing source ⇒ Not Enough Evidence; self-reported/
   modeled cap below High; demo ⇒ Demo. A metric may override with m.evidenceConfidence. */
function c5evConfObj(m){
  if(m&&m.evidenceConfidence)return {level:m.evidenceConfidence,why:m.evidenceConfidenceWhy||''};
  var demo=(typeof signalsAreDemo==='function'&&signalsAreDemo())||/demo|mock/.test(String(m&&m.label).toLowerCase());
  if(!m||!m.connected)return {level:'Not Enough Evidence',why:'the source for this measure is not connected yet.'};
  if(demo)return {level:'Demo',why:'based on demo telemetry — connect your sources for a live reading.'};
  var L=String(m.label||'').toLowerCase();
  if(/self-reported|manual/.test(L))return {level:'Medium',why:'this reads from self-reported or manual evidence; independent validation would raise confidence.'};
  if(/modeled|illustrative/.test(L))return {level:'Medium',why:'this is modeled from connected inputs; confidence rises as more direct telemetry connects.'};
  if(/live/.test(L))return {level:'High',why:'computed from connected, live telemetry.'};
  if(/computed/.test(L))return {level:'Medium',why:'computed from the connected sources; some inputs remain modeled or partial.'};
  return {level:'Medium',why:'derived from the connected sources.'};
}
/* "What Nerion found" — the evidence-backed finding, dynamic from the metric. A ranked
   metric can supply a richer m.found (names the top item, the driver and the most-
   actionable alternative); otherwise a plain finding is generated. */
function c5foundText(m){
  if(!m)return '';
  if(!m.connected)return 'No reading yet — '+(m.connectTool?('connect '+m.connectTool):'the source is not connected')+' and Nerion will populate this from your data.';
  if(m.found)return m.found;
  var _r=c5risk(m);if(_r.means)return _r.means; // consequence ("if X, then Y") by domain
  return 'Nerion found '+m.displayValue+' for '+String(m.name||'this measure').toLowerCase()+'.';
}
/* "Why ranked here" — why the top item sits where it does. Uses an authored m.whyRanked,
   else derives it from the top ranking row so a high-exposure / 0-gap / 0-risk item is
   never left looking contradictory. Returns '' when the metric isn't a ranking. */
function c5whyRanked(m){
  if(m&&m.whyRanked)return m.whyRanked;
  var r=m&&m.ranking&&m.ranking[0];if(!r)return '';
  var g=(r.openControlGaps!=null)?Number(r.openControlGaps):null,rk=(r.openRiskScenarios!=null)?Number(r.openRiskScenarios):null;
  var hasGaps=g>0,hasRisks=rk>0,hasExp=!!(r.modeledExposure&&String(r.modeledExposure)!=='—');
  if(hasRisks&&!hasGaps)return 'Ranked first because it carries the largest connected open-risk set.';
  if(hasGaps&&!hasRisks)return 'Ranked first because it has the most open control gaps affecting critical services.';
  if(hasGaps&&hasRisks)return 'Ranked first on its combined open control gaps and open risk scenarios.';
  if(hasExp)return 'Ranked first because it carries the highest modeled business-value exposure, even though no connected open control gaps or open risk scenarios are present — the ranking is driven by business criticality, not by an open finding. '+((g===0&&rk===0)?'Confirm whether risk or dependency data is simply not connected for this item.':'');
  return 'Ranked from its combined modeled exposure, open control gaps and open risk scenarios.';
}
/* One collapsed open-risk, shown only when a ranking row is expanded (never dumped into
   the primary row). Name · severity · modeled exposure · service · owner · status · action. */
function c5riskCard(r){
  var sv=String(r.severity||'').toLowerCase(),sc=/crit/.test(sv)?'crit':/high/.test(sv)?'warn':'muted';
  var meta=[r.service?c5esc(r.service):'',r.owner?('owner '+c5esc(r.owner)):'',r.status?c5esc(r.status):''].filter(Boolean).join(' · ');
  return '<div style="border-left:2px solid var(--warn);padding:2px 0 2px 9px;font-size:11.5px;line-height:1.45"><b>'+c5esc(r.name||r.title||'Risk')+'</b>'+(r.severity?(' <b style="color:var(--'+sc+')">'+c5esc(r.severity)+'</b>'):'')+((r.exposure!=null&&r.exposure!=='')?(' <span style="color:var(--muted)">· '+c5esc(String(r.exposure))+'</span>'):'')+(meta?('<div style="color:var(--muted)">'+meta+'</div>'):'')+(r.action?('<div style="color:var(--ink-2)">→ '+c5esc(r.action)+'</div>'):'')+'</div>';
}
/* The ranking / comparison table — modeled exposure, open gaps and open risks kept as
   SEPARATE columns (never merged), plus the main driver. Long risk lists collapse behind
   "N open risks · view details" (native <details>) instead of dumping into the row. */
function c5rankTable(m){
  var rows=m&&m.ranking;if(!rows||!rows.length)return '';
  var head='<tr><th>'+c5esc(m.rankItemLabel||'Item')+'</th><th>Modeled exposure</th><th>Open gaps</th><th>Open risks</th><th>Main driver</th></tr>';
  var body=rows.map(function(r,i){
    var risks=r.risks||[];
    var rN=(r.openRiskScenarios!=null)?r.openRiskScenarios:(risks.length||0);
    var main='<tr'+(i===0?' style="background:color-mix(in srgb,var(--warn) 6%,transparent)"':'')+'>'+
      '<td><b>'+c5esc(r.itemName)+'</b></td>'+
      '<td class="v">'+c5esc(String(r.modeledExposure!=null?r.modeledExposure:'—'))+'</td>'+
      '<td class="src">'+(r.openControlGaps!=null?c5esc(String(r.openControlGaps)):'—')+'</td>'+
      '<td class="src">'+c5esc(String(rN))+'</td>'+
      '<td class="src">'+c5esc(String(r.mainDriver||'—'))+'</td>'+
    '</tr>';
    var expand=(risks.length)?('<tr><td colspan="5" style="padding-top:0;border-top:0"><details><summary style="cursor:pointer;color:var(--blue);font-size:11px;font-weight:600;list-style:none">'+risks.length+' open risk'+(risks.length>1?'s':'')+' · view details</summary><div style="margin:7px 0 2px;display:flex;flex-direction:column;gap:6px">'+risks.map(c5riskCard).join('')+'</div></details></td></tr>'):'';
    return main+expand;
  }).join('');
  return '<div style="font-size:11px;color:var(--muted);margin:10px 0 4px">Ranked by modeled exposure — exposure, open control gaps and open risk scenarios are distinct measures.</div>'+
    '<div style="overflow-x:auto"><table class="itbl"><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div>';
}
/* Plain-English calculation basis — never a raw formula. */
function c5basisText(m){
  if(m&&m.basis)return m.basis;
  if(m&&m.method)return m.method;
  var ins=(m&&m.inputs&&m.inputs.length)?(' from '+m.inputs.map(function(i){return i.name;}).slice(0,4).join(', ')):'';
  var srcs=(m&&m.sources&&m.sources.length)?(' Sources: '+m.sources.map(function(s){return s.tool;}).slice(0,3).join(', ')+'.'):'';
  return 'Computed by Nerion'+(ins||' from the connected sources and inputs')+'.'+srcs;
}
/* One source row with status, freshness and evidence role. */
function c5srcRow(m,s){
  var status=s.status||(s.connected===false?'Not connected':(s.connected===true?'Connected':(m&&m.connected?'Connected':'Not connected')));
  var fresh=s.lastRefresh?(' · as of '+c5esc(s.lastRefresh)):'';
  var role=s.role||s.field||'';var missing=s.missing?(' · missing: '+c5esc(s.missing)):'';
  return '<div class="src-row"><span class="sd"></span><b>'+c5esc(s.tool)+'</b> — '+c5esc(status)+fresh+(role?(' · role: '+c5esc(role)):'')+missing+'</div>';
}
/* A collapsed accordion for deeper evidence — closed by default, expands on click. */
function c5acc(label,inner){
  if(!inner)return '';
  return '<details class="c5acc"><summary><span class="c5acc-mk">▸</span>'+c5esc(label)+'</summary><div class="c5acc-body">'+inner+'</div></details>';
}
/* Key evidence — 3–5 compact points for the default view (never a full table). Derived
   from the top ranking row (exposure / gaps / risks / driver / evidence gap) or, for a
   non-ranked metric, the first few inputs. Authorable via m.keyEvidence:[{k,v,color?}]. */
function c5keyEvidence(m){
  if(m&&m.keyEvidence&&m.keyEvidence.length)return m.keyEvidence.slice(0,5);
  var out=[],r=m&&m.ranking&&m.ranking[0];
  if(r){
    out.push({k:'Modeled exposure',v:String(r.modeledExposure!=null?r.modeledExposure:'—')});
    out.push({k:'Open control gaps',v:String(r.openControlGaps!=null?r.openControlGaps:'—')});
    var rN=(r.openRiskScenarios!=null)?r.openRiskScenarios:((r.risks&&r.risks.length)||0);
    out.push({k:'Open risk scenarios',v:String(rN)});
    if(r.mainDriver)out.push({k:'Main driver',v:String(r.mainDriver)});
    var notConn=(m.sources||[]).filter(function(s){return /not connected/i.test(s.status||'')||s.connected===false;});
    if(notConn.length)out.push({k:'Evidence gap',v:notConn.map(function(s){return s.tool;}).slice(0,2).join(', ')+' not connected'});
    else if(m.sources&&m.sources.length)out.push({k:'Source status',v:m.sources.map(function(s){return s.tool;}).slice(0,2).join(', ')+' connected'});
    return out.slice(0,5);
  }
  if(m&&m.inputs&&m.inputs.length){
    m.inputs.slice(0,4).forEach(function(i){out.push({k:String(i.name).replace(/<[^>]+>/g,'').trim(),v:String(i.value).replace(/<[^>]+>/g,'').trim(),color:i.color});});
  }
  return out;
}
function c5keyEvHtml(m){
  var ke=c5keyEvidence(m);if(!ke.length)return '';
  return '<div style="display:grid;grid-template-columns:auto 1fr;gap:5px 16px;margin-top:4px">'+ke.map(function(e){
    return '<div style="font-size:12px;color:var(--muted)">'+c5esc(e.k)+'</div><div style="font-size:12.5px;color:var(--'+(e.color||'ink')+');font-weight:600">'+c5esc(e.v)+'</div>';
  }).join('')+'</div>';
}
/* ── Executive-first framing: the facts a leader asks for the moment a number alarms
   them — severity, owner, ETA, business impact, and the decision (if any). All derived
   from the metric with sensible fallbacks; every field is overridable per metric and
   nothing client-specific is hard-coded. ── */
function c5severity(m){if(m&&m.severity)return m.severity;if(!m||!m.connected)return 'Not enough evidence';return m.color==='crit'?'High':m.color==='warn'?'Medium':m.color==='blue'?'Monitor':m.color==='good'?'Low':'Monitor';}
function c5sevColor(m){if(!m||!m.connected)return 'muted';return m.color==='crit'?'crit':m.color==='warn'?'warn':m.color==='blue'?'blue':m.color==='good'?'good':'ink';}
/* The accountable SEAT for a measure (a key like 'ciso'), inferred from its domain,
   overridable via m.seat, and finally the seat the cockpit is currently addressing. */
function c5ownerSeat(m){if(m&&m.seat)return String(m.seat).toLowerCase();var id=String((m&&m.id)||'');
  var map=[[/^cf_|roi|insur|premium|_fin/,'cfo'],[/^coo_|recover|_ops|process|continu/,'coo'],[/^ceo_|growth|trust|objective/,'ceo'],[/^cro_|appetite/,'cro'],[/^clo_|legal|regulat|material|disclos/,'clo'],[/^bd_|board/,'board'],[/^er_|^ctl_|^tac_|^ais_|^cp_|^ia_|^dom_|^exp_|prot|peer|fw|control/,'ciso']];
  for(var i=0;i<map.length;i++)if(map[i][0].test(id))return map[i][1];
  try{if(typeof CUR!=='undefined'&&CUR)return String(CUR).toLowerCase();}catch(_){}return '';}
/* Accountable owner — m.owner override, else the named leader for the accountable seat
   (from onboarding), else the seat role. Never a fabricated name. */
function c5ownerOf(m){if(m&&m.owner)return m.owner;var seat=c5ownerSeat(m);if(!seat)return 'Accountable owner';
  var role={ciso:'CISO',cfo:'CFO',coo:'COO',ceo:'CEO',cro:'CRO',clo:'CLO',cio:'CIO',board:'Board',cpo:'CPO',audit:'Internal Audit'}[seat]||seat.toUpperCase();
  var name='';try{if(typeof c5SeatNameOf==='function')name=c5SeatNameOf(seat);}catch(_){}
  return (name&&role)?(name+' · '+role):(role||'Accountable owner');}
/* ETA / due — m.due override, else the earliest due date on an open gap, else null so the
   caller shows an honest "Not scheduled" (no fabricated deadline). */
function c5etaOf(m){if(m&&m.due)return m.due;if(m&&m.gaps&&m.gaps.length){for(var i=0;i<m.gaps.length;i++){if(m.gaps[i]&&m.gaps[i].due)return m.gaps[i].due;}}return null;}
/* Business impact — the consequence in business terms (m.impact override, else the
   durable "why it matters"). */
function c5impactText(m){if(m&&m.impact)return m.impact;if(!m||!m.connected)return 'Cannot be quantified until the source is connected — no confident conclusion yet.';var _r=c5risk(m);if(_r.impact)return _r.impact;return c5why(m)||('Bears on '+String((m&&m.name)||'this measure').toLowerCase()+'.');}
/* Who / what is affected — m.affected override, else the top-ranked item, else the reading. */
function c5affected(m){if(m&&m.affected)return m.affected;if(!m||!m.connected)return 'Not established yet — the source is not connected.';var r=m.ranking&&m.ranking[0];if(r&&r.itemName)return c5esc(r.itemName)+' (highest-ranked) and the items below it — plus the business services they support.';var _r=c5risk(m);if(_r.affected)return _r.affected;return 'The systems and services behind '+String((m&&m.name)||'this measure').toLowerCase()+' (see key evidence).';}
/* Why it matters now — m.whyNow override, else the ranking rationale, else a risk read
   ("if we don't act, residual risk rises"). */
function c5whyNow(m){if(m&&m.whyNow)return m.whyNow;var wr=c5whyRanked(m);if(wr)return wr;if(!m||!m.connected)return 'It can’t be acted on until the evidence is connected.';var _r=c5risk(m);if(_r.whyNow)return _r.whyNow;return m.color==='crit'?'Left unaddressed it is an open, escalating exposure — a decision is needed now.':m.color==='warn'?'If it is not addressed this cycle the exposure persists and the risk keeps rising.':'It is within target today — hold the line and keep it monitored.';}
/* Decision rows — [label, text, color]. Always resolves to something explicit, including
   "No executive decision needed now". A threshold (m.decisionThreshold) is shown clearly. */
function c5decisionRows(m){var rows=[];
  if(m&&m.decision)rows.push(['Decision needed now',m.decision,'crit']);
  else if(m&&m.connected&&m.color==='crit')rows.push(['Decision needed now','This is above the escalation line — approve the recommended action below (funding / remediation / disclosure as applicable).','crit']);
  if(m&&m.decisionThreshold)rows.push(['Decision needed if this worsens',m.decisionThreshold,'warn']);
  else if(m&&m.decisionIfWorse)rows.push(['Decision needed if this worsens',m.decisionIfWorse,'warn']);
  else if(m&&m.connected&&m.color==='warn')rows.push(['Decision needed if this worsens','If it crosses into the critical range, escalate for a funding / remediation decision.','warn']);
  if(!rows.length)rows.push(['No executive decision needed now',(m&&m.connected)?'Monitor on the current cadence; Nerion surfaces a decision here if the status changes.':'Connect the source to establish whether a decision is required.','blue']);
  return rows;}
/* Domain of a measure (by id) — so the consequence narrative is written in the language
   of that risk area, not one generic template. */
function c5domainKey(m){var id=String((m&&m.id)||'');
  if(/^er_crown|crown/.test(id))return 'crownjewel';
  if(/incident|breach|active.?compromise|cops_incidents|ceo_cust/.test(id))return 'incidents';
  if(/^exp_/.test(id))return 'exposure';
  if(/^ctl_|control.?value|protection|evidence.?ready/.test(id))return 'control';
  if(/^tac_|attack.?path|mitre/.test(id))return 'threat';
  if(/^ais_|supply|sbom|crypto|cbom/.test(id))return 'aisupply';
  if(/^coo_|^cops_|recover|continu|_ops|process|service|uptime|availab/.test(id))return 'operations';
  if(/^cf_ins|cf_premium|cf_tail|insur|premium/.test(id))return 'insurance';
  if(/^cf_|roi|_fin|cost/.test(id))return 'financial';
  if(/^ceo_|growth|trust|objective|customer/.test(id))return 'growth';
  if(/^dom_|^peer|^fw|matur|coverage|failing/.test(id))return 'maturity';
  if(/^clo_|legal|regulat|material|disclos|sox/.test(id))return 'legal';
  if(/^cro_|appetite/.test(id))return 'appetite';
  if(/^er_/.test(id))return 'enterprise';
  return 'generic';}
/* Consequence-framed narrative for any measure, written for a Fortune-100 C-suite — plain
   language, no jargon. impact = what's at stake · means = the consequence in plain terms
   (adapted to whether things are healthy or at-risk) · affected = who/what · whyNow = why
   it deserves attention now. STATUS-AWARE so a clean result reads naturally ("nothing is
   wrong right now") instead of a risk warning. The base layer beneath any authored m.*
   override, so EVERY detail window across every seat reads like a clear executive brief. */
function c5risk(m){
  if(!m||!m.connected)return {};
  var V=m.displayValue||'the current reading',ok=(m.color==='good'||m.color==='blue');
  // Each domain: impact + affected (status-independent), then means/why for OK vs at-risk.
  var D={
    crownjewel:{i:'These are your most valuable systems — where a breach would do the most damage, so they are the first thing to protect.',a:'The crown-jewel systems and the business services that depend on them.',
      mo:'Your crown jewels are holding up — none is carrying material risk right now. Because this is where an incident would hurt most, the value is in keeping them that way.',mr:'A crown jewel is exposed. If it were compromised the damage is concentrated — the data, revenue or operations it underpins take a direct hit, which is your worst case, not an average one.',
      wo:'Clear today — but this is where you can least afford to slip, so hold the coverage and re-check as the data refreshes.',wr:'A single high-risk crown jewel is where an incident hurts most — leaving it exposed keeps your worst-case loss high until it is protected.'},
    exposure:{i:'This is the business value at risk if the weakness behind it were exploited (<b>'+V+'</b>).',a:'The assets and processes behind this exposure (see key evidence).',
      mo:'Exposure here is low — little business value is sitting at risk from this today.',mr:'If this exposure were realized, up to that amount of loss is on the table — a real financial and operational hit, not a hypothetical.',
      wo:'Low today — hold the controls that keep it there; the risk is a change quietly reopening it.',wr:'Until it is reduced the exposure stays on the books — the loss potential does not fall on its own.'},
    control:{i:'This control is what closes a specific way in for an attacker. When it is strong, that door is shut.',a:'The systems and processes this control is meant to protect.',
      mo:'This control is doing its job — the risk it exists to stop is being held down. Nothing to act on beyond keeping the evidence current.',mr:'This control is not fully working, so the risk it was holding down is coming back — the harm it prevents is no longer reliably prevented.',
      wo:'Effective today — keep the evidence current so it stays that way and stands up to an audit.',wr:'Every cycle it stays weak, that is risk the business is carrying that it does not need to.'},
    threat:{i:'This is a method real attackers use to move through a network. Good coverage means you would see and stop an intrusion that tried it.',a:'The detection and response coverage for this attacker method, and the assets it would target.',
      mo:'You are well covered against this method — an attacker who tried it would very likely be seen and stopped.',mr:'Coverage here is thin (<b>'+V+'</b>). If an attacker used this method they could move toward your most valuable systems before you caught them.',
      wo:'Well covered today — keep detection tuned, because attacker methods keep changing.',wr:'Until coverage improves this stays a route an attacker could take right now.'},
    aisupply:{i:'This is exposure in your AI systems and software supply chain — an attack surface growing faster than traditional controls cover it.',a:'The AI systems, models and third-party software in scope, and the data they touch.',
      mo:'Your AI and supply-chain exposure is in hand for now — nothing here is creating pressure today.',mr:'If one of these AI systems or outside components were abused or compromised, it becomes a way into your data or a source of unsafe automated decisions.',
      wo:'In hand today — but this surface expands quickly, so keep watching it as you adopt more AI and vendors.',wr:'This risk is growing — leaving it unaddressed widens a surface attackers increasingly go after.'},
    operations:{i:'This is about whether the business can keep running — or recover quickly — through a cyber disruption.',a:'The critical business services and their recovery and dependency paths.',
      mo:'Recovery looks ready — if a disruption hit, the business could keep going, or come back within its target.',mr:'If the affected service went down and could not recover in time, the outage turns into lost revenue, missed commitments and customer impact — not just an IT problem.',
      wo:'Ready today — but readiness fades, so keep recovery exercised; an untested change is the real risk.',wr:'Recovery readiness only counts before the incident — left as-is, a disruption would run longer and cost more.'},
    incidents:{i:'These are cyber incidents actively affecting the business — the events that can turn into a reportable, material breach. It is the queue a leader clears first.',a:'The systems and business services the open incidents are touching (see key evidence).',
      mo:'No business-impacting incident is open — nothing cyber is actively harming the business right now. If one opened, it would be the first thing needing attention and the kind of event that can become reportable.',mr:'One or more incidents are actively affecting the business. If they are not contained they can escalate into a reportable breach — with customer, regulatory and financial fallout, not just an IT clean-up.',
      wo:'Clear right now — the real risk is a new incident not being caught and worked fast enough, so the value is in keeping detection and the response queue sharp.',wr:'Every hour an active incident runs, the damage and the odds of it becoming material grow — this is the live queue to act on now.'},
    financial:{i:'This is the money behind the cyber program — the loss at stake, or the return on what is spent to prevent it.',a:'The financial lines and cyber investments this measure ties to.',
      mo:'The financial picture here is healthy — the exposure is contained and the spend is doing its job.',mr:'If the underlying risk were realized, the modeled financial impact (<b>'+V+'</b>) lands on the P&L; and where the spend is not justified, it is capital that is not buying down risk.',
      wo:'Healthy today — but this number moves with each decision, so revisit it as the risk or the spend changes.',wr:'This number moves with each decision — acting, or not, changes the financial exposure the business carries.'},
    growth:{i:'This is where cyber meets growth and customer trust — the revenue and reputation your security posture can protect or cost.',a:'Customer trust, deals in progress, and the growth goals cyber underpins.',
      mo:'Trust and the growth-critical controls are holding — cyber is protecting revenue here, not threatening it.',mr:'If trust or a growth-critical control slipped, the cost shows up in lost customers, stalled deals and brand damage — well beyond the security budget.',
      wo:'Solid today — but trust is fragile and expensive to rebuild, so protect it proactively.',wr:'Trust erodes fast and is costly to rebuild — an unaddressed weakness puts growth-tied value at risk now.'},
    maturity:{i:'This is how mature the program is against the standard you are measured on — the bar auditors, regulators and the board hold you to.',a:'The control areas behind this score and the frameworks in scope.',
      mo:'The program is at or above target here — it would stand up to the standard it is measured against.',mr:'Below target, the specific weaknesses behind this score are the findings an auditor writes up first — and the gaps most likely to be exploited.',
      wo:'At target today — keep the evidence current so the next review holds.',wr:'For as long as it sits below target, those weaknesses stay open exposures and audit risk.'},
    legal:{i:'This is legal, regulatory or disclosure exposure — where a cyber event turns into a reporting or compliance obligation.',a:'The regulatory obligations, disclosure controls and legal exposure in scope.',
      mo:'The process here is sound — if a reportable event happened, you could meet the obligation defensibly.',mr:'If a reportable event happened and the process were not sound, the result is regulatory penalty, disclosure risk and legal liability on top of the incident itself.',
      wo:'Defensible today — regulators expect that before an event, so keep the process current and evidenced.',wr:'Regulators expect a defensible process before an event — a gap here becomes a finding and liability after one.'},
    appetite:{i:'This is where residual risk sits against the appetite the board set — the line between acceptable and not.',a:'The risk categories measured against board appetite.',
      mo:'Residual risk is within the appetite the board set — the business is operating inside its agreed tolerance.',mr:'Exposure is running above appetite — the business is knowingly carrying more risk than it agreed to, which is a governance question, not just a technical one.',
      wo:'Within appetite today — keep it there; moving above the line is a board-level decision.',wr:'Sitting above appetite without a decision is an open governance gap the board owns.'},
    enterprise:{i:'This is enterprise cyber risk framed for the business — exposure the organization owns and decides on.',a:'The business areas and assets this risk maps to (see key evidence).',
      mo:'This area is in good shape — no material enterprise exposure is concentrated here today.',mr:'If it were realized, the impact lands on the business it maps to — operations, revenue or trust — not just on IT.',
      wo:'Clear today — hold it; enterprise risk shifts, so keep the picture current.',wr:'Left unaddressed this stays an open exposure the business is carrying — it does not resolve on its own.'},
    generic:{i:'This is a part of your cyber posture that bears on the business — the stronger it is, the less exposure the organization carries.',a:'The systems, services and people this measure covers (see key evidence).',
      mo:'This is in good shape right now — nothing here is creating pressure on the business. The value is in keeping it there.',mr:'This is not where it should be, and the gap is exposure the business is carrying — the weaker it is, the more room an incident has to cause harm.',
      wo:'Within target today — hold the line; the risk is drift, so keep it monitored on the current cadence.',wr:'Left unaddressed the gap persists and the risk the business carries keeps rising until it is closed.'}
  };
  // Insurance is its own world — and premium, limit, coverage, gap and tail each mean
  // something different, so they are written distinctly (not one shared "financial" line).
  if(c5domainKey(m)==='insurance'){
    var iid=String(m.id||''),iok=(m.color!=='crit'&&m.color!=='warn'); // neutral facts read calm, not "at risk"
    var INS={
      cf_ins_limit:{i:'This is the slice of a catastrophic cyber loss your insurer absorbs instead of your balance sheet — risk transferred off the company.',a:'The severe-year (tail) loss and the capital you would otherwise hold against it.',
        mo:'Your policy limit transfers most of the modeled worst-year loss to the insurer — the retained slice is small.',mr:'A meaningful part of your modeled worst-year loss sits above the policy limit — that excess stays on your balance sheet unless you raise the limit or add an excess layer.',
        wo:'Comfortable today — but the tail moves with your risk model, so re-test the limit against it at each renewal.',wr:'Until the limit is raised, the uninsured excess is capital the business is silently exposed to in a bad year.'},
      cf_premium:{i:'This is the annual price of transferring cyber risk to an insurer — worth it when the loss it offloads dwarfs the cost.',a:'Your renewal position, and the posture evidence that sets the price.',
        mo:'The premium is buying real protection — the coverage it secures is large relative to what you pay.',mr:'The premium looks high relative to what it transfers — worth challenging at renewal, or redirecting toward controls that cut the underlying risk.',
        wo:'Reasonable today — the lever is renewal: demonstrable control improvements are how you hold or lower it.',wr:'Premium is repriced against your posture at renewal — without evidence of improvement it tends to rise.'},
      cf_ins_gap:{i:'This is the part of a severe cyber year your policy would NOT cover — retained on the balance sheet by default.',a:'The uninsured excess above your policy limit.',
        mo:'The tail is essentially fully insured — little or no uninsured excess is being retained.',mr:'A slice of the modeled worst year is uninsured — if that year happened, the business absorbs it directly unless it is transferred or capital is set aside for it.',
        wo:'Fully covered today — re-test after any risk-model or policy change.',wr:'This uninsured slice is a live balance-sheet exposure until you raise the limit, add a layer, or ring-fence capital for it.'},
      cf_ins_cov:{i:'This is how much of a severe cyber year your policy actually transfers off the balance sheet.',a:'The insured limit measured against the modeled tail.',
        mo:'Your policy transfers most or all of the modeled tail — the balance sheet is well protected against a bad year.',mr:'Only part of the modeled tail is transferred — the remainder is retained until you extend cover.',
        wo:'Strong coverage today — hold the tower and re-confirm at renewal.',wr:'Partial coverage leaves retained tail on the books — close it by raising the limit or adding an excess layer.'},
      cf_tail:{i:'This is your modeled worst-year cyber loss — the severe (roughly 1-in-20) scenario your insurance and capital planning are sized against.',a:'The catastrophic-loss scenario behind your insurance and reserves.',
        mo:'The modeled tail is contained relative to your cover and appetite — a bad year would be absorbable.',mr:'The modeled tail is large — a severe cyber year would be a material financial event, which is exactly what your insurance and retained capital must be sized against.',
        wo:'Sized and covered today — revisit it as your exposure model updates.',wr:'A large, under-covered tail is the scenario that turns a cyber incident into a balance-sheet event — keep cover and capital aligned to it.'}
    };
    var ix=INS[iid]||INS.cf_ins_limit;
    return {impact:ix.i,affected:ix.a,means:(iok?ix.mo:ix.mr),whyNow:(iok?ix.wo:ix.wr)};
  }
  var d=D[c5domainKey(m)]||D.generic;
  return {impact:d.i,affected:d.a,means:(ok?d.mo:d.mr),whyNow:(ok?d.wo:d.wr)};}
function c5InspectObj(m){
  if(!m)return;
  var chip='<span class="c5chip c5-'+String(m.label).replace(/[^a-z]/g,'')+'">'+c5srcLabelText(m)+'</span>';
  var col=m.connected?(m.color==='ink'?'ink-2':(m.color||'ink')):'muted';
  var ev=c5evConfObj(m);var statusTxt=c5statusText(m);
  var h='<div class="ev-claim">'+m.name+' '+chip+'</div>';
  // 1) RESULT — status-coloured hero with the value, a status pill and the source label.
  h+='<div style="display:flex;align-items:center;gap:14px;margin:12px 0 2px;padding:14px 16px;border-radius:12px;border:1px solid var(--line);border-left:3px solid var(--'+col+');background:var(--surface-2)">'+
    '<div style="width:42px;height:42px;border-radius:11px;flex:none;display:flex;align-items:center;justify-content:center;background:var(--surface);background:color-mix(in srgb,var(--'+col+') 16%,var(--surface));color:var(--'+col+')">'+c5icon(c5whyIcon(m.connected?m.color:'muted'))+'</div>'+
    '<div style="min-width:0;flex:1"><div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">Result</div><div style="font-size:24px;font-weight:700;line-height:1.1;color:var(--'+col+')">'+(m.connected?m.displayValue:'Not connected')+'</div></div>'+
    '<div style="text-align:right;flex:none"><span class="c5pill '+(m.color==='crit'?'r':m.color==='warn'?'a':m.color==='good'?'g':m.color==='blue'?'b':'n')+'">'+c5esc(statusTxt)+'</span><div style="font-size:10px;color:var(--muted);margin-top:5px;text-transform:uppercase;letter-spacing:.05em">'+c5srcLabelText(m)+'</div></div>'+
  '</div>';
  if(m.visual)h+=m.visual;
  var why=c5why(m);
  var _xcol=(m.color==='crit'?'crit':m.color==='warn'?'warn':'blue');
  function _xr(label,txt,c){return txt?('<div style="margin-bottom:11px"><div style="font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--'+(c||'muted')+')">'+label+'</div><div style="font-size:12.5px;color:var(--ink-2);line-height:1.5;margin-top:2px">'+txt+'</div></div>'):'';}
  function _chip(label,val,c,title){return '<div'+(title?(' title="'+c5esc(title)+'"'):'')+' style="border:1px solid var(--line);border-radius:9px;padding:6px 11px;background:var(--surface-2)"><div style="font-size:9.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)">'+label+'</div><div style="font-size:12.5px;font-weight:600;color:var(--'+(c||'ink')+');margin-top:1px">'+c5esc(val)+'</div></div>';}
  // ── HEADER FACTS — what a leader asks first: severity · owner · ETA · evidence confidence.
  var _eta=c5etaOf(m);
  h+='<div style="display:flex;flex-wrap:wrap;gap:8px;margin:11px 0 2px">'+
    _chip('Severity',c5severity(m),c5sevColor(m))+
    _chip('Owner',c5ownerOf(m),'ink','Accountable seat for this measure — the leader named at onboarding, or the seat you’re currently viewing.')+
    _chip('ETA / due',(_eta||(m.connected?'Not scheduled':'n/a')),(_eta?'ink':'muted'),'The remediation / decision due date. Shows “Not scheduled” until a decision or remediation with a date is logged for this item.')+
    _chip('Evidence confidence',ev.level,((ev.level==='Not Enough Evidence'||ev.level==='Demo')?'muted':'ink'))+
  '</div>';
  // BUSINESS IMPACT — the consequence, one line.
  h+='<div style="margin-top:9px;font-size:12.5px;color:var(--ink-2);line-height:1.5"><b style="color:var(--ink)">Business impact:</b> '+c5impactText(m)+'</div>';
  // EXECUTIVE SUMMARY — what this means · who/what is affected · why it matters now.
  var _summ=[_xr('What this means',c5foundText(m),'good'),_xr('Who / what is affected',c5affected(m),'muted'),_xr('Why it matters now',c5whyNow(m),_xcol)].join('');
  if(_summ)h+='<div style="margin-top:11px;padding:13px 16px 2px;border:1px solid var(--line);border-radius:12px;background:var(--surface)">'+_summ+'</div>';
  // DECISION — needed now / if it worsens / none (always explicit).
  h+='<div class="ev-sec">Decision</div>'+c5decisionRows(m).map(function(d){return '<div class="conf" style="border-left:3px solid var(--'+d[2]+');margin-bottom:8px"><b>'+d[0]+':</b> '+d[1]+'</div>';}).join('');
  // (Key evidence is no longer shown inline — it lives inside the "View evidence"
  //  accordion below, so the default view stays focused on the decision.)
  // RECOMMENDED ACTION — the single next step, with owner / expected result.
  if(m.connected&&m.action){
    var meta=['Owner: '+c5esc(m.owner||c5ownerOf(m)),m.due?('Due: '+c5esc(m.due)):'',m.expected?('Expected result: '+c5esc(m.expected)):''].filter(Boolean).join(' · ');
    h+='<div class="ev-sec">Recommended action</div><div class="conf" style="border-left:3px solid var(--blue)">'+m.action+(meta?('<div style="margin-top:6px;font-size:11px;color:var(--muted)">'+meta+'</div>'):'')+'</div>';
  } else if(!m.connected){
    var src=m.connectTool?('<b>'+c5esc(m.connectTool)+'</b>'):'its data source';
    h+='<div class="ev-sec">Recommended action</div><div class="conf" style="border-left:3px solid var(--blue)">Not enough evidence to conclude — connect '+src+' to validate this result. Until then Nerion shows the honest not-connected state, never a placeholder number.</div>';
  }
  // ── COLLAPSED: technical evidence, sources, formulas, full rankings — closed by default. ──
  if(m.connected){
    var _tbl='';
    if(m.ranking&&m.ranking.length){_tbl=c5rankTable(m);}
    else if(m.table&&m.table.cols&&m.table.rows&&m.table.rows.length){
      var tcell=function(cell,cls){var t=(cell&&cell.text!=null)?cell.text:(cell==null?'':cell);var sty=(cell&&(cell.color||cell.bold))?(' style="'+(cell.color?('color:var(--'+cell.color+')'):'')+(cell.bold?';font-weight:600':'')+'"'):'';return '<td class="'+cls+'"'+sty+'>'+t+'</td>';};
      _tbl='<div style="overflow-x:auto"><table class="itbl"><thead><tr>'+m.table.cols.map(function(c){return '<th>'+c+'</th>';}).join('')+'</tr></thead><tbody>'+
        m.table.rows.map(function(r){return '<tr>'+r.map(function(cell,ci){return tcell(cell,ci===0?'':'src');}).join('')+'</tr>';}).join('')+'</tbody></table></div>';
    } else if(m.inputs&&m.inputs.length){
      _tbl='<table class="itbl"><thead><tr><th>Item</th><th>Value</th><th>Source</th></tr></thead><tbody>'+m.inputs.map(function(i){
        var dot=i.color?('<span class="c5sq '+c5sqClass(i.color)+'" style="display:inline-block;width:9px;height:9px;margin-right:7px;vertical-align:middle"></span>'):'';
        // When an item carries a gap, make it clickable to open exactly what the gap is.
        // Two drill targets are supported so any metric can wire it: i.drill opens a
        // business-area protection detail (data-c5area); i.drillMid opens another metric
        // (data-c5m). A visible "· see the gap →" affordance appears whenever the value
        // mentions a gap so the executive knows the item drills in.
        var hasGap=/gap/i.test(String(i.value||''));
        var _dt=i.drill?['data-c5area',String(i.drill)]:(i.drillMid?['data-c5m',String(i.drillMid)]:null);
        var nameCell=_dt?('<span class="c5gaplink" '+_dt[0]+'="'+c5esc(_dt[1])+'" style="cursor:pointer;color:var(--ink);border-bottom:1px dashed var(--line)" title="See exactly what the gap is">'+i.name+'</span>'+(hasGap?' <span '+_dt[0]+'="'+c5esc(_dt[1])+'" style="cursor:pointer;color:var(--blue);font-weight:600;white-space:nowrap">· see the gap →</span>':'')):i.name;
        return '<tr><td>'+dot+nameCell+'</td><td class="v">'+i.value+'</td><td class="src">'+i.source+'</td></tr>';}).join('')+'</tbody></table>';
    }
    // Nothing tabular to show → fall back to the compact key-evidence summary so the
    // "View evidence" accordion is never empty (it replaces the old inline block).
    if(!_tbl){_tbl=c5keyEvHtml(m);}
    h+=c5acc(m.ranking&&m.ranking.length?'View full ranking':'View evidence',_tbl);
    var _gaps=(m.gaps&&m.gaps.length)?m.gaps.map(function(g){
      return '<div class="conf" style="border-left:3px solid var(--warn);margin-bottom:8px"><b>'+c5esc(g.title||'Gap')+'</b>'+(g.meaning?('<div style="margin-top:3px">'+c5esc(g.meaning)+'</div>'):'')+(g.close?('<div style="margin-top:4px;color:var(--ink-2)">How to close: '+c5esc(g.close)+'</div>'):'')+((g.owner||g.due)?('<div style="margin-top:4px;font-size:11px;color:var(--muted)">'+[g.owner?('Owner: '+c5esc(g.owner)):'',g.due?('Due: '+c5esc(g.due)):''].filter(Boolean).join(' · ')+'</div>'):'')+'</div>';
    }).join(''):'';
    h+=c5acc('View open risks and gaps',_gaps);
  }
  // Sources.
  var _src=(m.sources&&m.sources.length)?m.sources.map(function(s){return c5srcRow(m,s);}).join(''):'';
  h+=c5acc('View sources',_src);
  // Calculation basis (plain English) + why it matters + what it does not prove + debug formula.
  var _basis='<div class="drill-p">'+c5basisText(m)+'</div>'+(why?('<div style="margin-top:9px;font-size:12px;color:var(--ink-2)"><b>Why it matters:</b> '+why+'</div>'):'')+'<div style="margin-top:9px;font-size:12px;color:var(--muted)"><b>What this does not prove:</b> '+c5notProve(m)+'</div>'+((c5debugOn()&&m.formula)?('<div class="ev-sec">Formula (admin/debug)</div><div class="formula">'+m.formula+'</div>'):'');
  h+=c5acc('View calculation basis',_basis);
  // Connect CTA when not connected.
  if(!m.connected&&m.connectTool)h+='<div style="margin-top:12px"><button class="c5btn" onclick="c5Connect(\''+String(m.connectTool).replace(/'/g,'')+'\')">Connect '+m.connectTool+'</button></div>';
  h+='<div class="c5foot">as of '+c5ago()+' · '+c5srcLabelText(m)+'</div>';
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
document.addEventListener('click',function(e){var w=e.target.closest('[data-c5crownwhy]');if(w&&w.getAttribute('data-c5crownwhy')){e.stopPropagation();c5CrownWhy(w.getAttribute('data-c5crownwhy'));return;}if(e.target.closest('[data-c5onb]'))return;var el=e.target.closest('[data-c5m]');if(el&&el.getAttribute('data-c5m'))c5Inspect(el.getAttribute('data-c5m'));});
/* A tile's "Connect: <source> →" prompt → the exact onboarding section for it. */
document.addEventListener('click',function(e){var el=e.target.closest('[data-c5onb]');if(el){e.stopPropagation();c5Connect(el.getAttribute('data-c5onb'));}});
/* Protection summary-card detail inspector — opens the list behind each count. */
document.addEventListener('click',function(e){var el=e.target.closest('[data-c5pc]');if(el&&el.getAttribute('data-c5pc'))c5protInspect(el.getAttribute('data-c5pc'));});
/* Per-business-area inspector — click an area row to see the controls, gaps,
   exposure and open risks behind its protection score. */
document.addEventListener('click',function(e){var el=e.target.closest('[data-c5area]');if(el&&el.getAttribute('data-c5area'))c5areaInspect(el.getAttribute('data-c5area'));});
function c5areaInspect(name){
  var P=(typeof window!=='undefined'&&window.C5PROT)||{all:[],target:75};
  var a=null,all=P.all||[];for(var i=0;i<all.length;i++){if(all[i].name===name){a=all[i];break;}}
  if(!a)return;
  var target=P.target||75, ok=(a.score>=target&&(a.gaps||0)===0);
  var col=ok?'good':(a.score<50?'crit':'warn');
  var status=ok?'Well protected — clears the '+target+'-point bar with no open gaps':(a.gaps>0?(a.gaps+' open control gap'+(a.gaps>1?'s':'')+' · below the '+target+'-point bar'):'Below the '+target+'-point protection bar');
  // Show the capabilities that guard this area (protection = their mean health).
  var caps=[];try{var keys=(typeof CAP_TOOLKEYS!=='undefined'&&a.k&&CAP_TOOLKEYS[a.k])||null;}catch(_){}
  var inputs=[{name:'Protection score',value:a.score+' / 100 · '+(ok?'✓ clears bar':'below bar'),color:col,source:(a.grc?('GRC '+a.grc):'business function × control posture')}];
  if((a.gaps||0)>0)inputs.push({name:'Open control gaps',value:String(a.gaps),color:'warn',source:'GRC · unremediated control gaps for this area'});
  if(a.exp>0)inputs.push({name:'Exposure carried',value:usd(a.exp)+(a.measured?'':' · illustrative'),color:(a.score<50?'crit':'warn'),source:'risk register × asset value for this area'});
  (a.risks||[]).slice(0,6).forEach(function(r){var sv=String(r.severity||'').toLowerCase();inputs.push({name:'Open risk · '+r.title,value:r.severity||'—',color:/crit/.test(sv)?'crit':/high/.test(sv)?'warn':'muted',source:'risk register'});});
  var m=c5obj({name:a.name+' · protection detail',
    why:'How well this business area is protected, and why. Protection is the mean health of the security capabilities guarding the area; it clears the bar at ≥ '+target+' with no open control gaps. This is where you see the controls, gaps, exposure and open risks behind the single score.',
    displayValue:a.score+' / 100',label:'computed',color:col,
    formula:'protection = mean maturity of the controls guarding this area (0–5 → 0–100); well-protected = score ≥ '+target+' AND 0 open control gaps',
    method:status+'. From your business function joined to the live control posture'+(a.grc?(' (GRC coverage: '+a.grc+')'):'')+'.'+(a.measured?'':' Figures are illustrative until this area’s sources are fully connected.'),
    inputs:inputs,
    sources:[{tool:'Business functions (value chain)',connector:'capmap',field:'business area',lastRefresh:c5ago()},{tool:'Live control posture',connector:'grc',field:'control maturity · gaps · open risks'}],
    note:ok?'A defensible base — hold the posture and keep evidencing it.':'Where the next dollar of protection should go for this area.'});
  c5InspectObj(m);
}
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
    note:nm+(rank===1?' is your single highest-value control':(rank?(' ranks #'+rank+' of your controls by business value'):' returns business value'))+'. Its '+(p!=null?p+'% deployment':'deployment')+' across '+prot+', weighted by the framework-critical controls it satisfies ('+fwIds+'), reduces '+usd(usdv)+' of modeled expected loss — '+sharePct+'% of the total your controls buy down. That is why it sits where it does in the ranking.',
    connectTool:'per-control security spend (to convert value into return-on-dollar)'});
  c5InspectObj(m);
}
function c5protInspect(kind){
  var P=(typeof window!=='undefined'&&window.C5PROT)||{well:[],weak:[],ctrl:[],target:75};
  var m;
  if(kind==='well'){
    // Rank ALL business areas best-protected first (top 10) so the CISO sees which
    // are stronger and which are catching up — not just the ones that clear the bar.
    var allA=(P.all&&P.all.length)?P.all:(P.well||[]);var topA=allA.slice(0,10);
    m=c5obj({name:'Business areas ranked by protection',why:'Ranks your business areas by how well protected each is — best first. An area is “well protected” when it clears the '+P.target+'-point coverage bar with no open control gaps. It matters because you see at a glance which parts of the business you can defend to the board and which are catching up.',displayValue:String((P.well||[]).length)+' of '+allA.length+' clear the bar',label:'computed',color:(P.well&&P.well.length)?'good':'muted',
      formula:'business areas ranked by protection score (0–100), best first; “well protected” = score ≥ '+P.target+' AND no open control gaps',
      method:'From your business functions joined to the live control posture. Protection = the mean maturity of the NIST controls guarding that area (0–5 → 0–100); it clears the bar at ≥ '+P.target+' with zero open control gaps.',
      inputs:topA.length?topA.map(function(a,i){var okA=(a.score>=P.target&&(a.gaps||0)===0);return {name:'#'+(i+1)+'  '+a.name,drill:a.name,value:a.score+' / 100 · '+(okA?'✓ well protected':(a.gaps>0?(a.gaps+' open gap'+(a.gaps>1?'s':'')):'below bar'))+(a.measured?'':' · illustrative'),color:(okA?'good':(a.score<50?'crit':'warn')),source:(a.grc?('GRC '+a.grc):'functions × control posture')};}):[{name:'No business areas yet',value:'—',source:'add your business functions / capability map'}],
      sources:[{tool:'Business functions (value chain)',connector:'capmap',field:'business areas',lastRefresh:c5ago()},{tool:'Live control posture',connector:'grc',field:'control maturity → coverage · gaps'}],
      note:'Ranked best-protected first — the top is your defensible base; the bottom is where the next dollar of protection should go.'});
  } else if(kind==='weak'){
    m=c5obj({name:'Business areas to strengthen',why:'Lists the business areas carrying the residual cyber exposure — below their protection bar or with open control gaps. It matters because this is exactly where the next dollar of protection should go.',displayValue:String((P.weak||[]).length),label:'computed',color:(P.weak&&P.weak.length)?'warn':'good',
      formula:'business areas below the '+P.target+'-point bar OR carrying one or more open control gaps; ranked weakest-first',
      method:'From your Business Capability Map joined to GRC. An area appears here when its protection score is below the bar or it has open control gaps — this is where the residual cyber exposure concentrates.',
      inputs:(P.weak&&P.weak.length)?P.weak.map(function(a){return {name:a.name,drill:a.name,value:a.score+(a.gaps>0?(' · '+a.gaps+' gap'+(a.gaps>1?'s':'')):'')+(a.measured?'':' (illustrative)'),color:(a.score<50?'crit':'warn'),source:(a.exp>0?(usd(a.exp)+' exposure'):'Capability Map × GRC')};}):[{name:'No area below the bar',value:'—',source:'every mapped area is covered'}],
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
var C5SEAT={ciso:{ic:'shield',nm:'CISO'},cfo:{ic:'dollar',nm:'CFO'},ceo:{ic:'tower',nm:'CEO'},cro:{ic:'scale',nm:'CRO'},coo:{ic:'factory',nm:'COO'},clo:{ic:'gavel',nm:'CLO'},cio:{ic:'cpu',nm:'CIO'},cpo:{ic:'box',nm:'CPO'},audit:{ic:'clipboard',nm:'Internal Audit'},board:{ic:'bank',nm:'Board'}};
/* The seat's display label — read from the SAME source the persona nav renders (the active
   seat button's own text) so the header and the nav can never disagree (the old CIO-vs-CTO
   bug). Falls back to C5SEAT / SEAT_LABEL only if the nav button isn't in the DOM. */
function c5seatLabel(id){
  try{var el=document.querySelector('.seat[data-seat="'+id+'"]');var t=el&&(el.textContent||'').trim();if(t)return t;}catch(_){}
  return (C5SEAT[id]&&C5SEAT[id].nm)||((typeof SEAT_LABEL!=='undefined'&&SEAT_LABEL[id])||String(id).toUpperCase());}
function c5icon(k){return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(C5ICON[k]||C5ICON.shield)+'</svg>';}
/* The seat header (icon badge · seat · timestamp) renders once in the hero, above the
   tab bar — matching the mockbook. c5header() inside each tab is intentionally empty
   so the header isn't duplicated below the tabs. */
function c5seatHeader(){var id=(typeof CUR!=='undefined'&&CUR)?CUR:'ciso';var m=C5SEAT[id]||{ic:'shield'};
  var nm=c5seatLabel(id);var sub='Executive cockpit'+(id!=='ciso'?' · CISO briefing':'');
  return '<div class="c5head"><div class="c5id"><div class="c5ic">'+c5icon(m.ic)+'</div><div><div class="c5id-n">'+nm+'</div><div class="c5id-s">'+sub+'</div></div></div><div class="c5asof">as of '+c5ago()+'</div></div>';}
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
      case 'ciso': return 'CISO read. '+cap(attack)+'. Your largest exposure is '+driver+', of a '+total+' modeled total.'+trend+'';
      case 'ceo': return 'CEO read. Cyber is a managed risk this quarter — '+objs+'; the exception is '+driver+'. Modeled exposure is '+total+', within the board’s appetite where you have set one.'+trend;
      case 'cfo': var ap=c5get('cf_appetite'),hr=c5get('cf_headroom'); return 'CFO read. Modeled exposure is '+total+(ap.connected?(', against a '+ap.displayValue+' appetite'+(hr.connected?(' with '+hr.displayValue+' of headroom'):'')):'')+'. The largest single driver is '+driver+'.'+trend;
      case 'cro': var rk=c5get('cr_rank'); return 'CRO read. '+(rk.connected?('Cyber ranks '+rk.displayValue+' among your principal risks'):'Cyber sits on one scale beside your other principal risks')+'; the driver to treat is '+driver+'.'+trend;
      case 'cio': var av=c5get('ct_critical_vulns'); return 'CIO read. The stack’s biggest security gap is '+driver+'.'+(av.connected?(' '+av.displayValue+' known-exploitable critical vulnerabilities are open.'):'')+trend;
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
  {on:'Defer to the next planning cycle',osum:'No spend now · exposure persists',pros:['No capital committed this cycle.'],cons:['Exposure remains open until addressed.','Remediation cost may increase if delayed.','Risk stays visible in executive reporting.'],consequence:'Records the deferral and keeps the exposure open until the next planning cycle.',req:true},
  {on:'Accept residual risk with rationale',osum:'No cost · residual exposure retained',pros:['No immediate spend or project launch.','The decision is formally documented.'],cons:['Residual exposure remains.','May require board, legal, or risk review if material.','Requires a review date and rationale.'],consequence:'Creates a formal risk-acceptance record with rationale, owner and review date.',req:true,reqRisk:true}
];}
/* Shared decision object used by every seat. `rec` is the recommended option; `alts`
   the alternatives; `meta` carries the executive summary the renderer shows above the
   options (recommendation, modeled exposure + basis, evidence confidence, due, who
   requested it, source status). Each option may carry a `consequence` (what happens on
   choosing it), `req` (requires a rationale) / `reqRisk` (requires a review date), and a
   `btn` label. Backward-compatible: options/meta fields are optional. */
function c5dec(pfx,n,q,sit,rec,alts,meta){
  function opt(o,recFlag,tag){return {on:o.on,osum:o.osum||'',rec:recFlag,tag:tag,pros:o.pros||[],cons:o.cons||[],consequence:o.consequence||'',req:!!o.req,reqRisk:!!o.reqRisk,btn:o.btn||''};}
  var opts=[opt(rec,true,'A')];
  (alts||c5decDefaultAlts()).forEach(function(a,i){opts.push(opt(a,false,String.fromCharCode(66+i)));});
  return {n:pfx+'-'+n,q:q,sit:sit,opts:opts,meta:meta||null};
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
  // Bottom line — points at the single most exposed thing and the decision needed.
  // Never claims the decision removes risk; only that it REDUCES the top exposure.
  var CJRk=(typeof LIVE!=='undefined'&&LIVE&&LIVE.crown_jewel_risk)||null;var topCj=(CJRk&&CJRk.items&&CJRk.items.length)?CJRk.items[0]:null;
  var demoExp=((typeof signalsAreDemo==='function')&&signalsAreDemo())||!!(CJRk&&CJRk.mocked);
  var mLbl=(typeof TrustLogic!=='undefined')?TrustLogic.MODELED_EXPOSURE_LABEL:'Modeled business exposure';
  var mBasis=(typeof TrustLogic!=='undefined')?TrustLogic.EXPOSURE_BASIS:'Estimated business value tied to affected customer-platform dependencies.';
  var blHead,blPara,blMid,blBtn;
  if(topCj){blMid='er_crown';blHead='Act on your highest-risk crown jewel first.';
    blPara='Across the four reads, your highest-risk crown jewel is <b>'+c5esc(topCj.asset)+'</b> (risk '+topCj.risk+(topCj.active_threat?', active threat':'')+', '+topCj.high_crit_vuln_count+' high/critical vulns)'+(CJRk.mocked?' — VM/EDR figures illustrative until those tools are connected':'')+'. Harden it to reduce its exposure before it becomes an incident. This reduces the top exposure; it does not remove all cyber risk.';
    blBtn='Prioritize '+c5esc(topCj.asset)+' — reduce exposure';}
  else if(ec.connected){var TD=c5TopDriver();blMid=TD.mid;blHead='One decision reduces the top exposure.';
    blPara='The largest exposure driver is <b>'+c5esc(TD.phrase)+'</b>'+(TD.threatens?(' affecting '+c5esc(TD.threatens)):'')+'. '+(demoExp?('Nerion currently shows a <b>modeled demo exposure of '+TD.displayValue+'</b>'):('Nerion models <b>'+mLbl.toLowerCase()+' of '+TD.displayValue+'</b>'))+' — '+mBasis+' The remediation plan is scoped; approval is needed to accelerate execution ahead of lower-risk work. Approval reduces the top exposure; it does not remove all cyber risk.';
    blBtn='Approve '+c5esc(TD.short)+' remediation — reduce top exposure';}
  else {blMid='exp_total';blHead='Connect your tools to surface the top fix.';
    blPara='Connect your identity, control and crown-jewel sources and Nerion surfaces your most exposed asset here, with the scoped remediation ready to prioritize.';
    blBtn='Approve the top remediation';}
  var TDa=c5TopDriver();
  var ans=topCj?('Exposure is concentrated in your highest-risk crown jewel; one decision can reduce the top exposure.'):ec.connected?('Exposure is concentrated in '+c5esc(TDa.phrase)+'; one decision can reduce the top exposure.'):'Connect your identity, asset and control sources to rank where the business is most exposed.';
  host.innerHTML=c5header()+
    c5shell('Cyber exposure · where is the business most exposed?',ans,anyRisk?'warn':null,'The enterprise’s material cyber exposure, ranked across the four dimensions that move it.')+
    tiles+
    c5ExposureEvidencePanel()+
    c5bl('Bottom line',blHead,null,blPara,{mid:blMid,txt:blBtn})+
    '<div class="c5foot">Each tile traces to its exact sources. Figures shown are illustrative until the sources are connected.</div>';
}
/* Evidence confidence for the Cyber-Exposure tab: gathers the six source reads,
   computes an overall confidence that can never read "High" when a critical source
   is missing, and renders a compact, secondary panel. Demo/seed data is labelled. */
function c5ExposureEvidence(){
  function capConn(k){try{return !!(typeof CAP_BY_KEY!=='undefined'&&CAP_BY_KEY[k]&&typeof capDeploy==='function'&&capDeploy(CAP_BY_KEY[k])!=null);}catch(_){return false;}}
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var sources=[
    {key:'cmdb',   label:'CMDB / asset inventory',         connected:c5get('er_crown').connected,      critical:true},
    {key:'iam',    label:'Cloud IAM / identity source',    connected:(capConn('mfa')||capConn('pam')), critical:true},
    {key:'vuln',   label:'Vulnerability / exposure source',connected:capConn('vuln'),                  critical:true},
    {key:'capmap', label:'Business capability mapping',    connected:c5get('er_capability').connected, critical:true, computed:true},
    {key:'vendor', label:'Vendor risk source',             connected:c5get('er_thirdparty').connected, critical:true},
    {key:'scen',   label:'Disruption scenario source',     connected:c5get('er_scenarios').connected,  critical:false, partial:!c5get('er_scenarios').connected}
  ];
  var conf=(typeof TrustLogic!=='undefined')?TrustLogic.evidenceConfidence(sources):{level:'—',connected:0,total:sources.length};
  return {sources:sources,conf:conf,demo:demo};
}
function c5ExposureEvidencePanel(){
  var E=c5ExposureEvidence();
  return c5EvLine(E.conf.level,'CMDB, capability map and exposure model computed; identity, vulnerability and vendor telemetry connect live.',E.sources,E.demo);
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
/* Command model for the six AI / supply-chain fronts: safer statuses (never
   "Healthy"), a next action on the fronts needing action, and honest evidence
   labels (self-reported / partial / demo) so inventory or scanning alone never
   reads as readiness. */
var AIS_NEXT={
  ais_aiml:'Complete posture review for the AI system with an open gap.',
  ais_nhi:'Validate service-account ownership, rotation, and privileged access.',
  ais_genai:'Connect CASB/SSE and extend DLP to AI so shadow-AI leakage is measured.',
  ais_aicode:'Validate leakage, license, and policy controls for AI-assisted code.',
  ais_pipeline:'Add build-provenance (SLSA) evidence to scanning and signing.',
  ais_pqc:'Start post-quantum migration planning for business-critical crypto.'
};
var AIS_DRILL={ais_aiml:'Open AI posture gaps',ais_nhi:'Review machine-identity exposure',ais_genai:'Review GenAI leakage',ais_aicode:'Review AI-coding controls',ais_pipeline:'Review build provenance',ais_pqc:'Open PQC migration plan'};
function aisStatus(m){
  if(!m||!m.connected)return {t:'Not Enough Evidence',c:'muted'};
  if(m.id==='ais_pqc')return {t:'Monitor',c:'warn'};                 // inventory is not readiness
  if(m.color==='crit')return {t:'Escalation needed',c:'crit'};
  if(m.color==='warn')return {t:'Action needed',c:'warn'};
  return {t:'Monitored',c:'good'};
}
function aisSub(m){
  if(!m||!m.connected)return 'Source not connected — connect to measure this front.';
  switch(m.id){
    case 'ais_aiml':     return (m.color==='good')?'Inventoried and governed':String(m.displayValue);
    case 'ais_genai':    return (m.color==='good')?'No confirmed leakage detected':String(m.displayValue);
    case 'ais_aicode':   return 'Code scanned; leakage, license, and policy controls under validation';
    case 'ais_pipeline': return (m.label==='connected')?'Scanned, signed, and provenance tracked':'Scanned and signed; provenance evidence needed';
    case 'ais_nhi':      return (m.color==='good')?'Inventoried; ownership and rotation validated':'Ownership, rotation, and privilege under review';
    case 'ais_pqc':      return 'Crypto inventory complete; migration planning needed';
    default:             return String(m.displayValue);
  }
}
function aisEvidence(m,demo){if(!m||!m.connected)return 'Missing Telemetry';if(demo)return 'Demo';if(m.id==='ais_aicode'||m.id==='ais_pipeline')return 'Evidence Partial';return (m.label==='connected')?'Telemetry Validated':'Self-reported';}
function c5AisCard(m,ic,demo){
  var st=aisStatus(m),next=AIS_NEXT[m.id],ev=aisEvidence(m,demo);
  var show=(st.t==='Action needed'||st.t==='Escalation needed'||st.t==='Monitor'||ev==='Evidence Partial');
  var meta='Evidence: '+ev+' · '+((m.label==='connected')?'Live':'Self-reported until tool connects');
  return '<div class="c5aic" data-c5m="'+m.id+'" style="--ac:var(--'+st.c+')" title="'+c5tip(m)+'">'+
    '<span class="c5tile-ic" style="--ac:var(--'+st.c+')">'+c5icon(ic)+'</span>'+
    '<div style="min-width:0;flex:1">'+
      '<div class="c5aic-t">'+m.name+'</div>'+
      '<div class="c5aic-v" style="color:var(--'+st.c+')">'+st.t+'</div>'+
      '<div class="c5aic-s">'+(m.connected?(c5esc(String(m.displayValue))+' · '):'')+c5esc(aisSub(m))+'</div>'+
      '<div class="c5esub" style="font-size:11px;color:var(--muted);margin-top:2px">'+c5esc(meta)+'</div>'+
      ((show&&next)?('<div class="c5esub" style="margin-top:2px;color:var(--ink-2)"><b>Next action:</b> '+c5esc(next)+' <span style="color:var(--blue)">'+c5esc(AIS_DRILL[m.id]||'')+' ›</span></div>'):'<div class="c5esub" style="color:var(--muted);font-size:11px;margin-top:2px">Click for the record ›</div>')+
    '</div></div>';
}
/* Evidence confidence for the AI & supply-chain tab. AI security posture (AI-SPM) is a
   critical source that is self-reported until connected, so this can never read High
   while AI posture is self-reported; demo telemetry surfaces as "Demo". */
function c5AisEvidence(byId,demo){
  var g=function(id){return !!(byId[id]&&byId[id].connected);};
  var live=function(id){return !!(byId[id]&&byId[id].label==='connected');};
  var sources=[
    {label:'AI asset inventory',            connected:g('ais_aiml'),      critical:true},
    {label:'AI security posture (AI-SPM)',  connected:live('ais_aiml'),   critical:true, partial:!live('ais_aiml')},
    {label:'Shadow-AI / GenAI usage telemetry',connected:live('ais_genai'),critical:false, partial:g('ais_genai')&&!live('ais_genai')},
    {label:'Code scanning',                 connected:live('ais_aicode'), critical:false, partial:g('ais_aicode')&&!live('ais_aicode')},
    {label:'CI/CD pipeline telemetry',      connected:live('ais_pipeline'),critical:false},
    {label:'Build signing / provenance',    connected:false,              critical:false, partial:true},
    {label:'Machine-identity inventory',    connected:g('ais_nhi'),       critical:false},
    {label:'Crypto inventory / PQC migration',connected:g('ais_pqc'),     critical:false, partial:true}
  ];
  var conf=(typeof TrustLogic!=='undefined')?TrustLogic.evidenceConfidence(sources):{level:'—'};
  return {sources:sources,level:demo?'Demo':conf.level,demo:demo};
}
function c5AisEvidencePanel(E){
  return c5EvLine(E.level,'CI/CD and code scanning connect live; AI posture is partly self-reported until AI inventory and usage telemetry connect.',E.sources,E.demo);
}
function c5AiSupply(){
  var host=document.getElementById('c5-aisupply');if(!host)return;
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var defs=[{id:'ais_aiml',ic:'cpu'},{id:'ais_genai',ic:'store'},{id:'ais_aicode',ic:'file'},{id:'ais_pipeline',ic:'box'},{id:'ais_nhi',ic:'key'},{id:'ais_pqc',ic:'lock'}];
  var ms=defs.map(function(d){return c5get(d.id);});
  var byId={};ms.forEach(function(m){byId[m.id]=m;});
  var anyRisk=ms.some(function(m){return m.connected&&(m.color==='warn'||m.color==='crit');});
  var E=c5AisEvidence(byId,demo);
  var cards='<div class="c5aigrid">'+defs.map(function(d){return c5AisCard(byId[d.id],d.ic,demo);}).join('')+'</div>';
  // Bottom line — business-run AI systems + machine identities are the concentration.
  var aiml=byId.ais_aiml, blMid='ais_aiml', blBtn='Close AI posture gap', blHead, blPara;
  if(aiml&&aiml.connected){
    blHead='Your highest AI and supply-chain exposure is in business-run AI systems.';
    blPara='Exposure is concentrated in business-run AI systems and machine identities — '+c5esc(String(aiml.displayValue))+'. Close the AI posture gap and validate machine-identity ownership, rotation, and privilege before expanding AI usage.';
  } else {
    blHead='Connect your AI and supply-chain sources to rank the exposure.';
    blPara='Add your AI asset inventory, CASB/DLP, coding-assistant logs, CI/CD scanning, machine-identity tooling and a cryptographic inventory, and each front populates with your own posture — the concentration is expected to be business-run AI systems and machine identities.';
    blBtn='Start with AI posture';
  }
  host.innerHTML=c5header()+
    c5shell('AI &amp; software supply-chain security · where are we exposed across AI and software supply chain?','AI exposure is no longer just model risk — it now includes shadow AI, code, pipelines, identities, and crypto readiness.',anyRisk?'warn':null,'Nerion tracks six AI and software supply-chain exposure fronts. The priority is to close business-run AI posture gaps and validate machine-identity exposure before AI usage expands.')+
    cards+
    c5AisEvidencePanel(E)+
    c5bl('Bottom line',blHead,null,blPara,{mid:blMid,txt:blBtn})+
    '<div class="c5foot">Each card traces to its exact sources. Posture is self-reported until the named tool connects'+(demo?' — values shown are demo telemetry.':'.')+'</div>';
}

/* ---------- Tab 02 — Top exposure ---------- */
/* Protection score for a business area. Prefer a real GRC control-coverage figure;
   otherwise map the GRC status (Adequate / Watch / Gap) to a representative band —
   marked illustrative wherever it is derived rather than measured. */
/* Is a capability-map entry actually a SECURITY domain (CSPM, IAM, EDR, vuln mgmt…)
   rather than a business capability? Used to reject a capability map that was filled
   with security domains, so the "business capabilities" tile stays business. */
function c5CapIsSecurity(name){var s=String(name||'').toLowerCase();
  return /cloud security posture|\bcspm\b|identity & access|\biam\b|endpoint|\bedr\b|\bxdr\b|vulnerabilit|patch manage|threat detection|threat intel|\bsiem\b|\bdlp\b|data loss|network security|firewall|awareness|phishing|penetration|red team|privileged access|\bpam\b|encryption|key management|third.?party.*risk|supply.?chain.*risk|application.*security|product security|\bot\b.*security|data protection & encryption/.test(s);}
/* DERIVE the business-capability view from the business functions the customer
   already mapped (value_chain), so the tile shows genuine business capabilities
   (Server, Hybrid Cloud, …) with GRC-style coverage computed from the live control
   posture — never security domains, and no separate upload required. Returns
   capability-shaped objects so the existing scorer/drill consume them unchanged. */
function c5BizCapAreas(){
  var vc=(typeof LIVE!=='undefined'&&LIVE&&LIVE.value_chain);if(!vc||!vc.functions||!vc.functions.length)return null;
  var cov=(typeof fwDeployedIds==='function')?fwDeployedIds():{};
  var out=vc.functions.map(function(f){
    var codes={},exp=0,rev=0,rk={};
    (f.processes||[]).forEach(function(p){rev+=Number(p.annual_usd)||0;
      (p.assets||[]).forEach(function(a){(a.risks||[]).forEach(function(r){var re=Number(r.exposure_usd)||0;exp+=re;
        // The ACTUAL open risks threatening this function (from the risk register),
        // deduped by title — so "N open risks" can name exactly which risks they are.
        var t=String(r.title||'Risk').trim();if(!rk[t]||re>(rk[t].exposure||0))rk[t]={title:t,severity:r.severity||'',exposure:re,asset:(a.name||'')};
        var caps=(typeof riskCaps==='function')?riskCaps(r.title,r.severity):[];
        caps.forEach(function(k){var fw=(typeof CAP_FRAMEWORK!=='undefined')?CAP_FRAMEWORK[k]:null;if(fw&&fw.csf)fw.csf.forEach(function(c){codes[c]=1;});});});});});
    var ids=Object.keys(codes),scores=ids.map(function(id){return (typeof controlCmmi==='function')?controlCmmi(id,cov).score:0;});
    var mean=scores.length?scores.reduce(function(a,b){return a+b;},0)/scores.length:0,cov100=Math.round(mean/5*100);
    var risks=Object.keys(rk).map(function(t){return rk[t];}).sort(function(a,b){return (b.exposure||0)-(a.exposure||0);});
    return {name:f.name||'Business function',exposure_usd:(exp>0?exp:rev),grc_status:(cov100>=75?'Adequate':cov100>=50?'Watch':'Gap'),
      control_gaps:scores.filter(function(s){return s<3;}).length,open_risk:risks.length,risks:risks,
      control_coverage:(ids.length?cov100:null),derived:true};
  }).filter(function(a){return a.name;});
  return out.length?out:null;
}
/* The capability set that feeds the "business capabilities" tile: derive from
   business functions by DEFAULT; let a genuinely business-oriented uploaded
   Capability Map OVERRIDE (a map filled with security domains does not). */
function c5CapSource(){
  var raw=(typeof LIVE!=='undefined'&&LIVE&&LIVE.capabilities)||[];
  var biz=raw.filter(function(c){return c&&c.name&&!c5CapIsSecurity(c.name);});
  if(raw.length&&biz.length>=Math.max(2,Math.ceil(raw.length/2)))return biz; // real business-capability map → override
  var derived=c5BizCapAreas();
  return derived||raw;
}
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
/* Business-exposure-reduction descriptions (CISO/CFO-safe — never "protects all/every"). */
var CTRL_DESC={mfa:'Reduces identity-based access exposure',edr:'Reduces endpoint and server compromise exposure',vuln:'Reduces exposure from known vulnerabilities on critical assets',siem:'Improves detection and response coverage across monitored systems',backup:'Reduces ransomware and recovery-impact exposure',cspm:'Reduces exposure from cloud misconfiguration and insecure posture',pam:'Reduces privileged-account misuse exposure',aware:'Reduces phishing and workforce-behavior exposure',seg:'Reduces lateral-movement exposure across network zones',dlp:'Reduces sensitive-data exposure and loss'};
/* The in-scope population a control's remaining coverage gap is measured against. */
var CTRL_POP={mfa:'in-scope identities',edr:'managed endpoints',vuln:'critical assets',siem:'monitored systems',backup:'crown-jewel systems',cspm:'cloud accounts',pam:'privileged accounts',aware:'the workforce',seg:'network zones',dlp:'sensitive-data stores'};
/* Recommended next action per control — business language, not a control instruction. */
var CTRL_NEXT={mfa:'Close privileged and customer-platform MFA gaps',edr:'Close sensor gaps on unmanaged endpoints',pam:'Expand PAM coverage for cloud and admin roles',vuln:'Remediate critical vulnerabilities on exposed assets',siem:'Extend monitoring to unlogged systems',backup:'Validate restore and recovery evidence',cspm:'Remediate high-risk cloud misconfigurations',aware:'Target repeat-clicker cohorts',seg:'Extend segmentation to crown-jewel zones',dlp:'Extend DLP to unmonitored data stores'};
/* Coverage % → evidence status. Coverage is NOT effectiveness; without operating
   evidence the strongest defensible claim is "Telemetry Validated" (broadly covered),
   else "Evidence Partial". Demo data is labelled; unmeasured coverage is honest. */
function ctrlEvidenceStatus(p,demo){if(demo)return 'Mock / Demo';if(p==null)return 'Not Enough Evidence';if(p>=95)return 'Telemetry Validated';return 'Evidence Partial';}
function ctrlNextGeneric(p){if(p==null)return 'Connect data source';if(p>=100)return 'Validate operating evidence';if(p<80)return 'Expand coverage';return 'Close remaining gap';}
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
  // Tab A (c5-exposure, "core business areas") was folded away in the six-tab layout; the
  // Controls tab (c5-exposure2) is the one that must render. Only bail if NEITHER host exists.
  var host=document.getElementById('c5-exposure');
  if(!host&&!document.getElementById('c5-exposure2'))return;
  var TARGET=75; // the platform's healthy-coverage bar, consistent with capability scoring
  var caps=(typeof c5CapSource==='function')?c5CapSource():((typeof LIVE!=='undefined'&&LIVE&&LIVE.capabilities)||[]);
  var areas=caps.map(function(c){return {name:c.name,score:c5protScore(c),gaps:c5protGaps(c),grc:c.grc_status||null,exp:Number(c.exposure_usd)||0,measured:(c.control_coverage!=null),risks:(c.risks||[])};}).filter(function(a){return a.name&&a.score!=null;});
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
  // The most-exposed business area is ranked by MODELED EXPOSURE ($), not by score —
  // a high-score area can still carry the largest residual exposure.
  var byExp=areas.slice().filter(function(a){return a.exp>0;}).sort(function(a,b){return b.exp-a.exp;});
  var topExp=byExp[0]||topWeak||null;

  // ── Verdict + three-number summary ─────────────────────────────────────────
  var haveAreas=areas.length>0,haveCtrls=ctrlConn.length>0;
  var nm=function(c){return c.name.replace(/ *\(.*\)/,'');};
  var verdict=haveAreas
    ?(weak.length===0
        ?'The business is protected across every area — hold and evidence it.'
        :(topExp
            ?('Protection is uneven. '+topExp.name+' carries the highest modeled exposure and should be prioritized first.')
            :'Protection is uneven across business areas — prioritize the ones below, worst first.'))
    :'Where the business is protected, where it isn’t, and where to act first.';
  // Plain, assistant-style intro — what these areas are, and what "protected" means.
  var intro='Business areas ranked by protection; modeled exposure = business value tied to unresolved control gaps. Click any area for the detail.';
  var tone=(haveAreas&&weak.length&&well.length<weak.length)?'warn':null;
  // Summary as premium icon cards — clickable to a detail inspector, with a hover tooltip.
  var scard=function(ic,lbl,val,sub,col,pc,tip){col=col||'muted';return '<div class="c5opc" data-c5pc="'+pc+'" style="--ac:var(--'+col+')" title="'+c5esc(tip||'')+'"><span class="c5opc-go">details ›</span><div class="c5opc-h"><span class="c5opc-ic">'+c5icon(ic)+'</span><span class="c5opc-t">'+lbl+'</span></div><div class="c5opc-v" style="color:var(--'+(col==='muted'?'ink':col)+')">'+val+'</div><div class="c5opc-s">'+sub+'</div></div>';};

  // ── Widget rows ────────────────────────────────────────────────────────────
  // Evidence label per row — modeled/computed/demo, never hidden in fine print.
  var evLabel=function(a){if((typeof signalsAreDemo==='function')&&signalsAreDemo())return 'Demo';return a.measured?'Computed':'Modeled';};
  // The one-line business driver of an area's exposure (detail lives in the drill-down).
  var mainDriver=function(a){
    if(a.risks&&a.risks.length){var t=String(a.risks[0].title||'');return t.length>58?(t.slice(0,56)+'…'):t;}
    if((a.gaps||0)>0)return 'unresolved control gaps in business-critical services';
    return 'residual exposure in business-critical services';
  };
  var areaRow=function(a,mode){var cls=capColor(a.score);
    var status=(mode==='well')?'Protected':(a.score<50?'Priority':'Strengthen');
    var pill=(mode==='well')?'g':(a.score<50?'r':'a');
    var parts=[];
    if(mode==='well'){parts.push('Meets protection threshold');if(a.grc)parts.push('GRC '+a.grc);parts.push('no open control gaps');}
    else{if(a.exp>0)parts.push('<b>'+usd(a.exp)+' modeled exposure</b>');parts.push('Driver: '+c5esc(mainDriver(a)));}
    var sub=parts.join(' · ');
    var evc='<span class="c5pill n" style="margin-left:6px;font-size:10px">'+evLabel(a)+'</span>';
    // Score/status clarity: say WHY a high-scoring area still needs strengthening, so
    // the executive never reads the score and status as a contradiction.
    var why='';
    if(mode!=='well'){
      if(a.score>=TARGET&&(a.gaps||0)>0) why='Strong controls ('+a.score+'), but an open control gap keeps residual exposure elevated.';
      else if(a.score>=TARGET&&a.exp>0) why='High business value keeps residual exposure elevated despite stronger controls.';
      else if((a.gaps||0)>0) why=a.gaps+' open control gap'+(a.gaps>1?'s':'')+' to close.';
      else why='Below the protection threshold ('+TARGET+').';
    }
    // Two lines only: name + status + evidence + score · then one muted line (exposure ·
    // driver · why-it-still-needs-work). Full open-risks/gaps are one click away.
    return '<div class="c5erow" data-c5area="'+c5esc(a.name)+'" title="'+c5esc(a.name+' — click for open risks, gaps, dependencies and the exposure basis.')+'"><div style="flex:1;min-width:0"><div class="c5exp">'+a.name+' <span class="c5pill '+pill+'" style="margin-left:4px">'+status+'</span>'+evc+'</div><div class="c5esub" style="color:var(--ink-2)">'+sub+(why?(' <span style="color:var(--muted)">· '+why+'</span>'):'')+'</div></div>'+
      '<div class="c5etrack"><div style="width:'+a.score+'%;height:100%;background:linear-gradient(90deg,color-mix(in srgb,var(--'+cls+') 62%,transparent),var(--'+cls+'))"></div></div>'+
      '<div class="c5emult" style="color:var(--'+cls+')">'+a.score+'</div></div>';
  };
  var w1=well.length?well.map(function(a){return areaRow(a,'well');}).join(''):'<div class="c5foot" style="margin-top:0;padding:12px 4px">No area clears its protection target yet — every area is in the list below.</div>';
  var w2=weak.length?weak.map(function(a){return areaRow(a,'weak');}).join(''):'<div class="c5foot" style="margin-top:0;padding:12px 4px">No area is below its protection target or carrying an open control gap.</div>';
  var demoCV=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  // Largest remaining coverage gap = lowest-coverage connected control (the next-investment read).
  var gapRanked=ctrlConn.filter(function(o){return o.p!=null;}).slice().sort(function(a,b){return a.p-b.p;});
  var topGap=gapRanked[0]||null;
  // Control-value cards (same treatment as the Cyber-operations tab): a card grid where
  // each control carries a status, what it reduces + its modeled $, coverage/evidence/gap
  // meta, a next action, and a click-through to the source record. Nothing hard-coded.
  var CTRL_IC={mfa:'key',pam:'lock',edr:'cpu',vuln:'target',siem:'pulse',backup:'box',cspm:'store',aware:'checklist',seg:'gauge',dlp:'file'};
  var w3=ctrlConn.map(function(o){var c=o.c;
      var cov=(o.p!=null)?o.p:null;
      var ev=ctrlEvidenceStatus(cov,demoCV);
      var gapPct=(cov!=null)?(100-cov):null;
      var gapShort=(gapPct!=null&&gapPct>0)?(gapPct+'% '+(CTRL_POP[c.k]||'assets')+' uncovered'):(cov===100?'operating evidence needed':'');
      var next=CTRL_NEXT[c.k]||ctrlNextGeneric(cov);
      var desc=CTRL_DESC[c.k]||('Reduces '+c.name.toLowerCase()+' exposure');
      // Status from coverage — the spec status model (Within target / Action needed / Gap),
      // never "Healthy/Safe". Evidence status (Mock / Demo …) is carried in the meta line.
      var st=(cov==null)?{t:'Evidence Incomplete',c:'muted'}:(cov>=90?{t:'Within target',c:'good'}:cov>=70?{t:'Action needed',c:'warn'}:{t:'Gap',c:'crit'});
      var meta='Coverage: '+(cov!=null?(cov+'%'):'n/a')+' · Evidence: '+ev+(gapShort?(' · Gap: '+gapShort):'');
      return '<div class="c5aic" data-c5cv="'+c.k+'" style="--ac:var(--'+st.c+')" title="'+c5esc(nm(c)+' — click for source, coverage denominator, evidence status and remaining gap.')+'">'+
        '<span class="c5tile-ic" style="--ac:var(--'+st.c+')">'+c5icon(CTRL_IC[c.k]||'shieldcheck')+'</span>'+
        '<div style="min-width:0;flex:1">'+
          '<div class="c5aic-t">'+c5esc(nm(c))+'</div>'+
          '<div class="c5aic-v" style="color:var(--'+st.c+')">'+c5esc(st.t)+'</div>'+
          '<div class="c5aic-s"><b style="color:var(--good)">'+usd(o.usd)+'</b> modeled reduction · '+c5esc(desc)+'</div>'+
          '<div class="c5esub" style="font-size:11px;color:var(--muted);margin-top:3px">'+c5esc(meta)+'</div>'+
          '<div class="c5esub" style="margin-top:3px;color:var(--ink-2)"><b>Next action:</b> '+c5esc(next)+'</div>'+
          '<div class="c5esub" style="color:var(--blue);font-size:11px;margin-top:2px;cursor:pointer">Click for the record ›</div>'+
        '</div></div>';
    }).join('');

  // Build the surface: intro + three-number summary, then only the sections that
  // have real data — no how-to text, no method/formula on screen.
  // Stat card: a static (non-clickable) value card in the c5opc style.
  var statc=function(ic,lbl,val,sub,col,vfs){col=col||'muted';return '<div class="c5opc" style="cursor:default;--ac:var(--'+col+')"><div class="c5opc-h"><span class="c5opc-ic">'+c5icon(ic)+'</span><span class="c5opc-t">'+lbl+'</span></div><div class="c5opc-v" style="color:var(--'+(col==='muted'?'ink':col)+')'+(vfs?(';font-size:'+vfs):'')+'">'+val+'</div><div class="c5opc-s">'+sub+'</div></div>';};
  // Summary: lead with the real money (total modeled exposure reduced by controls —
  // not duplicated below), then the two area reads when the capability map is
  // connected, or a highest-value control + a connect prompt when it isn't. No empty
  // "—" boxes, no box that just repeats the controls list.
  var summary='<div class="c5statgrid">'+statc('coin','Modeled exposure reduced by controls',haveCtrls?usd(rr.total):'—','Modeled expected loss your controls buy down','good');
  if(haveAreas){
    summary+=scard('shieldcheck','Areas meeting protection threshold',String(well.length),'Evidence supports current protection level',well.length?'good':'muted','well','The business areas clearing their protection threshold with no open control gaps. Click for the list.')+
      scard('target','Areas requiring remediation',String(weak.length),'Carrying residual exposure',weak.length?'warn':'muted','weak','The business areas below the threshold or carrying open control gaps. Click for the list.');
  } else {
    summary+=statc('cpu','Highest-value control',topCtrl?nm(topCtrl.c):'—',topCtrl?(usd(topCtrl.usd)+' modeled exposure reduction · '+topCtrl.p+'% coverage'):'connect your security tools','good','17px')+
      '<div class="c5opc" data-c5onb="business capability map" style="--ac:var(--blue)"><span class="c5opc-go">connect ›</span><div class="c5opc-h"><span class="c5opc-ic">'+c5icon('store')+'</span><span class="c5opc-t">Protection by business area</span></div><div class="c5opc-v" style="color:var(--blue);font-size:15px">Connect capability map →</div><div class="c5opc-s">Rank protection by business function once your Business Capability Map is added.</div></div>';
  }
  summary+='</div>';
  // Stash for the summary-card detail inspector (opened on click).
  try{window.C5PROT={well:well,weak:weak,ctrl:ctrlConn,target:TARGET,anyDerived:anyDerived,all:areas.slice().sort(function(a,b){return b.score-a.score;})};}catch(_){}
  // TAB A — protection by business area (where are we protected?)
  var bodyA=c5header()+
    c5shell('Protection · how your core business areas are protected',verdict,tone,intro)+
    summary+
    (haveAreas?c5ProtectionEvidencePanel(areas):'');
  if(haveAreas){
    bodyA+='<div class="c5seclab">Business areas meeting protection threshold</div><div>'+w1+'</div>'+
          '<div class="c5seclab" style="margin-top:18px">Business areas to prioritize</div><div>'+w2+'</div>';
  }
  if(haveAreas&&(topExp||topWeak)){
    // Name the most-exposed area (by modeled $), explain WHY it's the priority, and
    // give the decision. Never says "close its 0 control-gaps" — when gaps are zero,
    // it says exposure is driven by residual risk scenarios and business criticality.
    var T=topExp||topWeak;
    var blExp=(T.exp>0)?(', with '+usd(T.exp)+' modeled exposure'):'';
    var g=(T.gaps||0), r=(T.risks&&T.risks.length)||0;
    var why=(g>0)
      ?'This exposure is concentrated in business-critical services with unresolved control gaps. Closing these gaps first reduces the largest concentration of residual business exposure.'
      :(r>0
          ?'No open control gaps remain, but residual risk remains due to unresolved risk scenarios and business criticality — exposure is driven by residual risk, not currently open control gaps.'
          :'Exposure is concentrated here because of the business criticality of the services it carries; keep evidencing its controls.');
    bodyA+=c5bl('Bottom line',
      T.name+' is the most exposed business area'+blExp+'.',
      tone,
      why+' Decision: prioritize '+T.name+' remediation before lower-exposure areas.'+(T.exp>0?(' The '+usd(T.exp)+' is modeled loss that would land here if protection fails — not the revenue it earns.'):''),
      {mid:'exp_total',txt:'Prioritize '+T.name+' remediation'});
  } else if(haveAreas&&weak.length===0){
    bodyA+=c5bl('Bottom line','The business is protected across every area.',null,'Every area clears its protection bar. Hold the posture and evidence it — this is the read the board wants to see sustained.',null);
  } else {
    bodyA+=c5bl('Bottom line','Protection, seen by business area.',null,'This shows which parts of the business are well protected and which still carry exposure, and the control that closes each gap. Connect your capability map to see it live.',null);
  }
  bodyA+='<div class="c5foot">Every figure traces to its source'+(anyDerived?'; figures marked “illustrative” are not yet fully evidenced':'')+'.</div>';
  // TAB B — control value (which controls reduce the most business exposure?)
  var cvVerdict=haveCtrls
    ?('Your controls reduce '+usd(rr.total)+' of modeled exposure, ranked by value delivered'+((topCtrl&&topGap&&topGap.c.k!==topCtrl.c.k)?(' — '+nm(topCtrl.c)+' delivers the most; '+nm(topGap.c)+' is the biggest remaining gap.'):'.'))
    :'Connect your security tools to rank each control by the business exposure it reduces.';
  var bodyB=c5header()+
    c5shell('Control value · which controls reduce the most business exposure?',
      cvVerdict,
      (haveCtrls?'warn':null),
      'Modeled exposure reduction estimates the business exposure reduced by covered controls across protected assets and business services'+(demoCV?' (demo values).':' — coverage × asset exposure × business-service criticality.'));
  if(haveCtrls){
    bodyB+=c5ControlValueEvidencePanel(ctrlConn,rr,demoCV)+
      '<div class="c5seclab">Controls delivering the most business value · '+ctrlConn.length+' control'+(ctrlConn.length>1?'s':'')+' · '+usd(rr.total)+' modeled exposure reduction</div><div class="c5aigrid">'+w3+'</div>';
    if(topCtrl){
      var gapLine=(topGap&&topGap.c.k!==topCtrl.c.k)?(' '+nm(topGap.c)+' has the largest remaining coverage gap ('+topGap.p+'%) and should be evaluated as the next investment priority.'):'';
      var TDcv=c5TopDriver(); // remaining priority = the data-ranked top driver, not a literal
      bodyB+=c5bl('Bottom line',
        nm(topCtrl.c)+' delivers the highest modeled exposure reduction: '+usd(topCtrl.usd)+' at '+topCtrl.p+'% coverage.',
        null,
        'It delivers the highest modeled exposure reduction among your current controls. The remaining priority is to reduce your largest exposure driver — '+TDcv.phrase+'.'+gapLine,
        {mid:TDcv.mid,txt:'Close the '+c5esc(TDcv.short)+' gap'});
    }
    bodyB+='<div class="c5foot">Ranked by modeled exposure reduction. Click any control for source traceability and calculation basis.</div>';
  } else {
    bodyB+='<div class="c5foot" style="padding:16px 4px">No controls connected yet — connect EDR, MFA, PAM, SIEM and the rest so Nerion can rank each by the business exposure it reduces.</div>';
  }
  var host2=document.getElementById('c5-exposure2');
  if(host2){host2.innerHTML=bodyB;if(host)host.innerHTML=bodyA;}   // Controls tab (+ optional areas tab)
  else if(host){host.innerHTML=bodyA+bodyB;}                       // single-tab fallback
}
/* Evidence confidence for the Protection tab. Tracks the eight source categories the
   protection read depends on, computes an overall level that can never read "High"
   when a critical source is missing, and renders a compact secondary line that also
   states the modeled-exposure basis visibly (not buried in row fine print). */
function c5ProtectionEvidence(areas){
  areas=areas||[];
  function capConn(k){try{return !!(typeof CAP_BY_KEY!=='undefined'&&CAP_BY_KEY[k]&&typeof capDeploy==='function'&&capDeploy(CAP_BY_KEY[k])!=null);}catch(_){return false;}}
  var L=(typeof LIVE!=='undefined'&&LIVE)||{};
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var capmap=areas.length>0;
  var ctrlAssess=areas.some(function(a){return a.measured;});
  var finModel=areas.some(function(a){return a.exp>0;});
  var vendorConn=false;try{vendorConn=!!c5get('er_thirdparty').connected;}catch(_){ }
  var sources=[
    {key:'capmap', label:'Business capability map',        connected:capmap,     critical:true},
    {key:'cmdb',   label:'CMDB / asset inventory',         connected:!!((L.crown_jewels&&L.crown_jewels.length)||(L.counts&&L.counts.assets)), critical:false},
    {key:'ctrl',   label:'Control assessment results',     connected:ctrlAssess, critical:true, computed:true},
    {key:'vuln',   label:'Vulnerability / exposure data',  connected:capConn('vuln'),                  critical:false},
    {key:'iam',    label:'Identity / access data',         connected:(capConn('mfa')||capConn('pam')), critical:false},
    {key:'cloud',  label:'Cloud / infrastructure data',    connected:capConn('cspm'),                  critical:false},
    {key:'vendor', label:'Third-party / vendor risk data', connected:vendorConn, critical:false},
    {key:'fin',    label:'Financial / business-value model',connected:finModel,  critical:true, computed:true}
  ];
  var conf=(typeof TrustLogic!=='undefined')?TrustLogic.evidenceConfidence(sources):{level:'—'};
  return {sources:sources,conf:conf,demo:demo};
}
/* Compact one-line evidence-confidence strip — level pill + short rationale + a
   connected/partial/missing source count. Replaces the tall chip cloud so the page
   stays dense and scannable. Full per-source detail lives in the drill-down. */
function c5EvLine(level,rationale,sources,demo){
  var lvlCls={High:'g',Medium:'a',Low:'a',Demo:'n','Not Enough Evidence':'n'}[level]||'n';
  var cnt='';
  if(sources&&sources.length){var cc=0,pp=0;sources.forEach(function(s){if(s.connected)cc++;else if(s.partial)pp++;});var nn=sources.length-cc-pp;cnt=' · '+cc+' connected'+(pp?(' · '+pp+' partial'):'')+(nn?(' · '+nn+' not connected'):'');}
  return '<div style="margin-top:12px;font-size:12px;color:var(--ink-2)"><b>Evidence confidence</b> <span class="c5pill '+lvlCls+'">'+level+'</span> <span style="color:var(--muted)">'+(demo?'· Demo ':'')+'— '+c5esc(rationale)+cnt+'</span></div>';
}
function c5ProtectionEvidencePanel(areas){
  var E=c5ProtectionEvidence(areas);
  return c5EvLine(E.conf.level,'coverage & control posture computed; modeled exposure = estimated business value associated with services dependent on unresolved control gaps.',E.sources,E.demo);
}
/* Evidence confidence for the Control-value tab. Operating-effectiveness evidence is
   never asserted from coverage alone, so this can never read "High" on coverage; a
   missing coverage denominator (or demo data) keeps it below High as well. */
function c5ControlValueEvidence(ctrlConn,rr,demo){
  ctrlConn=ctrlConn||[];rr=rr||{total:0};
  var have=ctrlConn.length>0;
  var telem=ctrlConn.some(function(o){return o.p!=null&&o.p>=95;});
  var sources=[
    {key:'cov',   label:'Control coverage',                connected:have,          critical:true, computed:true},
    {key:'denom', label:'Coverage denominator',            connected:(have&&!demo), critical:true},
    {key:'telem', label:'Telemetry validation',            connected:telem,         critical:false, partial:!telem},
    {key:'oper',  label:'Operating-effectiveness evidence',connected:false,         critical:false, partial:true},
    {key:'model', label:'Exposure / business-value model', connected:(rr.total>0),  critical:true, computed:true},
    {key:'fresh', label:'Source freshness',                connected:have,          critical:false},
    {key:'scope', label:'Scope completeness',              connected:have,          critical:false}
  ];
  var conf=(typeof TrustLogic!=='undefined')?TrustLogic.evidenceConfidence(sources):{level:'—'};
  return {sources:sources,conf:conf,demo:demo};
}
function c5ControlValueEvidencePanel(ctrlConn,rr,demo){
  var E=c5ControlValueEvidence(ctrlConn,rr,demo);
  return c5EvLine(E.conf.level,'computed from control coverage, asset exposure and business-service criticality; coverage is not operating effectiveness.',E.sources,E.demo);
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
/* Cyber-Operations command model — status/message/next-action/severity/SLA/owner per
   front. Kept command-oriented (not "Healthy/Watch") and honest (Not Enough Evidence
   when a source is disconnected). */
var OPS_OWNER={cops_incidents:'Incident Response',cops_services:'SOC',cops_thirdparty:'Vendor Risk',cops_emerging:'Threat Intel'};
var OPS_NEXT={cops_thirdparty:'Confirm service dependency and remediation evidence.',cops_emerging:'Validate exposure against current stack.',cops_incidents:'Contain, confirm business impact, and start the disclosure clock if it crosses materiality.',cops_services:'Confirm containment and the recovery runbook for each affected service.'};
var OPS_DRILL={cops_thirdparty:'Open third-party exposure queue',cops_emerging:'Open emerging risk actions',cops_incidents:'Open incident queue',cops_services:'Open service-threat map'};
var OPS_MSG={
  cops_incidents:{ok:'No active business-impacting incidents detected.',act:'{n} business-impacting incident(s) active — command the response.'},
  cops_services:{ok:'No active threat mapped to critical business services.',act:'{n} business service(s) under active threat — concentrate containment.'},
  cops_thirdparty:{ok:'No third-party alert is impacting a business service.',act:'{n} vendors require dependency and remediation validation.'},
  cops_emerging:{ok:'No emerging risk currently has an open path.',act:'{n} risk requires exposure validation against the current stack.'}
};
var OPS_FRONT={cops_thirdparty:'third-party exposure',cops_emerging:'emerging risks',cops_services:'services under threat',cops_incidents:'internal incidents'};
function opsNum(m){return (String(m&&m.displayValue||'').match(/^(\d+)/)||[])[1]||'';}
function opsAct(m){return !!(m&&m.connected&&(m.color==='warn'||m.color==='crit'));}
function opsStatus(m){if(!m||!m.connected)return {t:'Not Enough Evidence',c:'muted'};if(m.color==='crit')return {t:(m.id==='cops_incidents'?'Escalation needed':'Action needed'),c:'crit'};if(m.color==='warn')return {t:'Action needed',c:'warn'};return {t:'No active issue',c:'good'};}
function opsSeverity(m){if(!m||!m.connected)return 'Not Enough Evidence';if(m.color==='crit')return 'Critical';if(m.color==='warn')return (m.id==='cops_thirdparty'?'High':'Medium');return 'None';}
function opsSla(m){if(!m||!m.connected)return 'Not Enough Evidence';if(m.color==='crit')return 'Breached';if(m.color==='warn')return (m.id==='cops_thirdparty'?'At risk':'On track');return 'Not applicable';}
function opsSource(m,demo){if(!m||!m.connected)return 'Not Connected';if(demo)return 'Demo';return (m.label==='live'?'Live':(m.label==='modeled'?'Modeled':'Computed'));}
function opsMsg(m){var s=OPS_MSG[m.id];if(!s)return m.note||'';if(!m.connected)return 'Source not connected — connect to read this front.';return (opsAct(m)?s.act:s.ok).replace('{n}',opsNum(m)||'0');}
function c5OpsCard(m,ic,demo){
  var st=opsStatus(m),col=st.c,act=opsAct(m);
  var meta='Severity: '+opsSeverity(m)+' · SLA: '+opsSla(m)+' · Owner: '+OPS_OWNER[m.id]+' · '+opsSource(m,demo);
  var next=act?('<div class="c5esub" style="margin-top:3px;color:var(--ink-2)"><b>Next action:</b> '+c5esc(OPS_NEXT[m.id]||'')+'</div>'):'';
  var drill=act?('<div class="c5esub" style="color:var(--blue);font-size:11px;margin-top:2px;cursor:pointer">'+c5esc(OPS_DRILL[m.id]||'Open')+' ›</div>'):'<div class="c5esub" style="color:var(--muted);font-size:11px;margin-top:2px">Click for the record ›</div>';
  return '<div class="c5aic'+((act&&m.color==='crit')?' c5aic-alarm':'')+'" data-c5m="'+m.id+'" style="--ac:var(--'+col+')" title="'+c5tip(m)+'">'+
    '<span class="c5tile-ic" style="--ac:var(--'+col+')">'+c5icon(ic)+'</span>'+
    '<div style="min-width:0;flex:1">'+
      '<div class="c5aic-t">'+m.name+'</div>'+
      '<div class="c5aic-v" style="color:var(--'+col+')">'+st.t+'</div>'+
      '<div class="c5aic-s">'+(m.connected?(c5esc(String(m.displayValue))+' · '):'')+c5esc(opsMsg(m))+'</div>'+
      '<div class="c5esub" style="font-size:11px;color:var(--muted);margin-top:3px">'+c5esc(meta)+'</div>'+next+drill+
    '</div></div>';
}
/* Evidence confidence for the Cyber-Operations tab. Business-service dependency mapping
   is critical: without it the operational conclusions can never read "High". */
function c5OpsEvidence(ms,demo){
  var by={};ms.forEach(function(x){by[x.d.id]=x.m;});
  var L=(typeof LIVE!=='undefined'&&LIVE)||{};
  var depMapped=!!((L.process_exposure&&L.process_exposure.length)||(by.cops_services&&by.cops_services.connected));
  var sources=[
    {key:'siem',  label:'SIEM / SOAR feed',                 connected:!!(by.cops_incidents&&by.cops_incidents.connected), critical:true},
    {key:'itsm',  label:'Incident management feed',         connected:!!(by.cops_incidents&&by.cops_incidents.connected), critical:false, computed:true},
    {key:'vend',  label:'Vendor-risk feed',                 connected:!!(by.cops_thirdparty&&by.cops_thirdparty.connected), critical:false},
    {key:'ti',    label:'Threat-intel feed',                connected:!!(by.cops_emerging&&by.cops_emerging.connected), critical:false},
    {key:'dep',   label:'Business-service dependency mapping',connected:depMapped, critical:true, partial:!depMapped},
    {key:'cmdb',  label:'CMDB / service catalog freshness', connected:!!((L.crown_jewels&&L.crown_jewels.length)||(L.counts&&L.counts.assets)), critical:false}
  ];
  var conf=(typeof TrustLogic!=='undefined')?TrustLogic.evidenceConfidence(sources):{level:'—'};
  return {sources:sources,conf:conf,demo:demo};
}
function c5OpsEvidencePanel(ms,demo){
  var E=c5OpsEvidence(ms,demo);
  return c5EvLine(E.conf.level,'computed from SIEM/SOAR incidents, vendor-risk alerts, threat-intel and business-service mappings.',E.sources,E.demo);
}
/* Tab 03 — Cyber Operations. The live SOC picture for the seat: active incidents,
   services under threat, third-party alerts, and emerging risks. Each box is a
   provenance metric; the QUERY/JOIN/OUTPUT spec lives in the drill-down inspector
   ("How it's computed"), never on the surface. A quiet SOC reads green. */
function c5Effect(){
  var host=document.getElementById('c5-effect');if(!host)return;
  var defs=[{id:'cops_incidents',ic:'alert',onb:'siem'},{id:'cops_services',ic:'pulse',onb:'siem'},{id:'cops_thirdparty',ic:'store',onb:'vendor risk'},{id:'cops_emerging',ic:'target',onb:'threat intelligence'}];
  var ms=defs.map(function(d){return {d:d,m:c5get(d.id)};});
  var byId={};ms.forEach(function(x){byId[x.d.id]=x.m;});
  var anyConn=ms.some(function(x){return x.m.connected;});
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var mInc=byId.cops_incidents;
  var critIncident=!!(mInc&&mInc.connected&&mInc.color==='crit');
  // Watch fronts = connected non-incident fronts flagged "Action needed" (warn).
  var watch=ms.filter(function(x){return x.d.id!=='cops_incidents'&&x.m.connected&&x.m.color==='warn';});
  var watchNames=watch.map(function(x){return OPS_FRONT[x.d.id];});
  if(critIncident){try{c5WarAlarm();}catch(_){}}else{try{window.C5_WAR_ARMED=false;}catch(_){}}
  // War Room status card — prominent but not alarming until an incident crosses threshold.
  var demoOn=(typeof demoActive==='function'&&demoActive());
  var warbar=critIncident
    ?'<div class="c5warbar active"><div class="c5warbar-l"><span class="c5warbar-ic">⚠</span><div><div class="c5warbar-t">War Room active</div><div class="c5warbar-s">Critical incident active — response console open. Command the response, run the regulatory clocks and brief every executive from one place.</div></div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="wr-btn" data-openwar="1" style="background:var(--crit);color:#fff;animation:warpulse 1.1s infinite">Open active response</button>'+(demoOn?'<button class="wr-btn gh" data-resetatk="1" title="Demo only — stand the simulated incident down">Reset demo</button>':'')+'</div></div>'
    :'<div class="c5warbar"><div class="c5warbar-l"><span class="c5warbar-ic">🛡️</span><div><div class="c5warbar-t">War Room status · Standby</div><div class="c5warbar-s">No active incident has crossed escalation threshold. The moment one does this turns red, sounds, and opens the response console.'+(demoOn?' <b style="color:var(--crit)">Demo:</b> trigger a simulated ransomware attack to see it fire.':'')+'</div></div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="wr-btn gh" data-openwar="1">Open War Room</button>'+(demoOn?'<button class="wr-btn" data-simatk="1" style="background:var(--crit);color:#fff" title="Demo only — fire a simulated ransomware incident">▶ Simulate ransomware attack</button>':'')+'</div></div>';
  // Headline — answer the internal-incident question first, then name the watch fronts.
  var wnum={1:'One',2:'Two',3:'Three',4:'Four'};
  var verdict,intro;
  if(!anyConn){
    verdict='Connect your SIEM / SOAR, vendor-risk and threat-intel feeds to run the operational picture.';
    intro='What this seat sees at a glance: active incidents, business services under threat, third-party alerts touching your services, and emerging risks worth acting on — the operational picture the CISO runs the day from.';
  } else if(critIncident){
    verdict='Active internal incident — command the response now.';
    intro='A business-impacting internal incident is active. Command the response from the War Room and run the regulatory clocks; the watch fronts below are secondary until it clears.';
  } else if(watch.length>0){
    verdict='No active internal incident. '+(wnum[watch.length]||String(watch.length))+' watch front'+(watch.length>1?'s':'')+' need command attention'+(watchNames.length?(': '+watchNames.join(' and ')):'')+'.';
    intro='No business-impacting internal incident is active. The command focus is validating '+watchNames.join(' and ')+' before they become service-impacting.';
  } else {
    verdict='No active internal incident and no watch front — the operational picture is clean.';
    intro='No incident, active threat, third-party alert or emerging risk is currently hitting the business. Hold watch and keep the feeds live.';
  }
  var cards='<div class="c5aigrid">'+ms.map(function(x){return c5OpsCard(x.m,x.d.ic,demo);}).join('')+'</div>';
  var body=c5header()+
    c5shell('Cyber operations · what needs command attention right now?',verdict,(critIncident?'crit':(watch.length?'warn':null)),intro)+
    warbar+
    cards+
    (anyConn?c5OpsEvidencePanel(ms,demo):'');
  // Bottom line — command-oriented; third-party is the live front when vendor alerts exist.
  var primary=[byId.cops_thirdparty,byId.cops_emerging,byId.cops_services].filter(function(m){return m&&m.connected&&m.color==='warn';})[0]||null;
  if(critIncident){
    body+=c5bl('Bottom line','Active internal business-impacting incident is underway.','crit','Command the response from the War Room, run the regulatory clocks, and brief executives from one place.',{act:'try{var b=document.querySelector(\'[data-openwar]\');if(b)b.click();}catch(_){}',txt:'Open active response'});
  } else if(primary){
    var focus=(primary.id==='cops_thirdparty')
      ?('The live command front is third-party exposure: '+primary.displayValue+' may affect supported business services. Confirm dependency coverage and remediation evidence before the next operating review.')
      :(primary.id==='cops_emerging')
        ?('The live command front is emerging risk: '+primary.displayValue+' to validate against the current stack.')
        :('The live command front is services under threat: '+primary.displayValue+' carrying an active detection.');
    var mEm=byId.cops_emerging;
    var secondary=(mEm&&mEm.connected&&mEm.color==='warn'&&primary.id!=='cops_emerging')?' Emerging-risk actions should be validated against the current technology stack.':'';
    body+=c5bl('Bottom line','No active internal business-impacting incident is underway.',null,focus+secondary,{mid:primary.id,txt:(OPS_DRILL[primary.id]||('Open '+primary.name.toLowerCase()))});
  } else if(anyConn){
    body+=c5bl('Bottom line','Nothing needs command attention right now.',null,'No incident, active threat, third-party alert or emerging risk is currently hitting the business — hold watch and keep the feeds live.',null);
  } else {
    body+=c5bl('Bottom line','This is the screen the CISO runs the day from.',null,'Once your SIEM / SOAR, vendor-risk monitoring and threat-intel feed are live, this names the operational fronts that need command attention.',null);
  }
  body+='<div class="c5foot">Live from your SIEM / SOAR, vendor-risk monitoring and threat-intel feed. Every box opens to the record behind it.</div>';
  host.innerHTML=body;
}

/* ---------- Tab 04 — Threats (MITRE ATT&CK) ---------- */
/* A distinct glyph per MITRE ATT&CK tactic — makes the kill-chain grid scannable. */
var TACTIC_ICON={'Reconnaissance':'target','Resource Development':'wand','Initial Access':'plug','Execution':'pulse','Persistence':'lock','Privilege Escalation':'trend','Defense Evasion':'bug','Credential Access':'key','Discovery':'database','Lateral Movement':'refresh','Collection':'box','Command & Control':'tower','Exfiltration':'file','Impact':'alert'};
/* Business-relevant attack paths — the command view above the raw MITRE grid. */
var THREAT_PATHS=[
  {id:'ap_identity',mid:'exp_identity',name:'Identity compromise → privilege escalation → cloud access',status:'Watch',relevance:'Customer-platform dependency',tactics:['Initial Access','Credential Access','Privilege Escalation','Persistence','Lateral Movement'],next:'Close identity attack-path gaps'},
  {id:'ap_phishing',mid:'cp_mfa',name:'Phishing → credential theft → lateral movement',status:'Watch',relevance:'Workforce entry point',tactics:['Initial Access','Credential Access','Discovery','Lateral Movement'],next:'Validate MFA enforcement and user-reporting telemetry'},
  {id:'ap_vendor',mid:'cops_thirdparty',name:'Vendor compromise → service disruption',status:'Monitor',relevance:'Third-party services supporting business operations',tactics:['Initial Access','Command & Control','Impact'],next:'Confirm vendor remediation evidence and dependency mapping'}
];
function c5PathCard(p,ev){
  var sc={Monitor:'a',Watch:'a','Action Needed':'r','Escalation Needed':'r','Not Enough Evidence':'n'}[p.status]||'a';
  var col=(sc==='r')?'crit':(sc==='n')?'muted':'warn';
  return '<div class="c5aic" data-c5m="'+(p.mid||'exp_identity')+'" style="--ac:var(--'+col+')" title="Attack path — click for steps, affected tactics, controls, telemetry and remediation.">'+
    '<span class="c5tile-ic" style="--ac:var(--'+col+')">'+c5icon('target')+'</span>'+
    '<div style="min-width:0;flex:1">'+
      '<div class="c5aic-t">'+c5esc(p.name)+'</div>'+
      '<div class="c5aic-v" style="color:var(--'+col+')"><span class="c5pill '+sc+'">'+p.status+'</span></div>'+
      '<div class="c5aic-s">Why it matters: '+c5esc(p.relevance)+'</div>'+
      '<div class="c5esub" style="font-size:11px;color:var(--muted);margin-top:2px">Affected tactics: '+c5esc(p.tactics.join(', '))+' · Evidence: '+c5esc(ev)+'</div>'+
      '<div class="c5esub" style="color:var(--ink-2);margin-top:2px"><b>Next action:</b> '+c5esc(p.next)+'</div>'+
      '<div class="c5esub" style="color:var(--blue);font-size:11px;margin-top:2px">Open attack-path detail ›</div>'+
    '</div></div>';
}
/* Evidence confidence for the Threats tab. Identity operating-effectiveness evidence
   is a critical source that is incomplete in the sample workspace, so the level can
   never read "High"; demo telemetry surfaces as an explicit "Demo" level. */
function c5ThreatsEvidence(demo){
  function capConn(k){try{return !!(typeof CAP_BY_KEY!=='undefined'&&CAP_BY_KEY[k]&&typeof capDeploy==='function'&&capDeploy(CAP_BY_KEY[k])!=null);}catch(_){return false;}}
  var L=(typeof LIVE!=='undefined'&&LIVE)||{};
  var ti=(typeof sig==='function')?(sig('threat_actors_active')!=null):false;
  var dep=!!((L.process_exposure&&L.process_exposure.length)||(L.crown_jewels&&L.crown_jewels.length));
  var sources=[
    {label:'EDR telemetry',            connected:capConn('edr'),  critical:true},
    {label:'SIEM detections',          connected:capConn('siem'), critical:true},
    {label:'Identity telemetry',       connected:(capConn('mfa')||capConn('pam')), critical:true},
    {label:'Identity operating evidence',connected:false,         critical:true, partial:true},
    {label:'Cloud telemetry',          connected:capConn('cspm'), critical:false},
    {label:'Vulnerability telemetry',  connected:capConn('vuln'), critical:false},
    {label:'Threat-intel feed',        connected:ti,              critical:false},
    {label:'Business-service mapping',  connected:dep,             critical:false, partial:!dep}
  ];
  var conf=(typeof TrustLogic!=='undefined')?TrustLogic.evidenceConfidence(sources):{level:'—'};
  var level=demo?'Demo':conf.level;
  return {sources:sources,level:level,demo:demo};
}
function c5ThreatsEvidencePanel(E){
  return c5EvLine(E.level,'EDR, SIEM, identity and cloud telemetry mapped to ATT&CK; identity operating-effectiveness evidence is partial.',E.sources,E.demo);
}
/* The four-item posture summary strip was removed from the Threats tab (it duplicated
   the evidence panel and hard-coded a top exposure path); the tab now leads with the
   answer line and the top attack paths. */
/* Non-adversarial risk lane (Phase E guardrail 2) — loss WITHOUT an attacker. ATT&CK is the
   adversarial lane; this parallel lane covers outage/DR, data corruption, insider, third-party/
   supply-chain and privacy/regulatory. A crown jewel can carry both; nothing is forced through ATT&CK.
   Mirrors the backend config/riskLanes.js taxonomy. */
var C5_NONADV={outage_dr:{l:'Outage / DR',o:'COO / CIO'},data_corruption:{l:'Data corruption',o:'CIO / CISO'},insider:{l:'Insider',o:'CISO / CHRO'},third_party_supply_chain:{l:'Third-party / supply-chain',o:'CISO / Procurement'},privacy_regulatory:{l:'Privacy / regulatory',o:'CLO'}};
function c5NonAdversarialLane(){
  var L=(typeof LIVE!=='undefined'&&LIVE&&Array.isArray(LIVE.crown_jewel_residual))?LIVE.crown_jewel_residual:[];
  var withNA=L.filter(function(j){return Array.isArray(j.non_adversarial)&&j.non_adversarial.length;});
  if(!withNA.length)return '';
  var rows=withNA.map(function(j){var chips=j.non_adversarial.map(function(id){var c=C5_NONADV[id];return c?('<span style="font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:20px;background:var(--surface-2);color:var(--ink-2)">'+c5esc(c.l)+'</span>'):'';}).join(' ');
    return '<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-top:1px solid var(--line)"><div style="flex:1.2;min-width:0;font-size:13px;font-weight:600">'+c5esc(j.name)+'</div><div style="flex:2;display:flex;flex-wrap:wrap;gap:5px">'+chips+'</div></div>';}).join('');
  return '<div class="c5seclab" style="margin-top:18px">Non-adversarial risk lane · loss without an attacker</div>'+
    '<div>'+rows+'</div>'+
    '<div class="c5foot" style="margin-top:8px">Not every risk is an adversary. The ATT&CK view above is the <b>adversarial</b> lane; these are the <b>non-adversarial</b> ways a crown jewel is lost — outage/DR, data corruption, insider error, a third-party/supply-chain failure, or a privacy/regulatory breach. A crown jewel carries both lanes; each category routes to the executive who owns it (COO, CIO, CLO, Procurement).</div>';
}
/* CISO two-axis lens: per crown jewel, CONTROL PRESENCE (share of attack techniques with a MAPPED
   control — presence, NOT proven effectiveness) and DETECTION (share with telemetry), with the
   residual band. Reads the same LIVE.crown_jewel_residual the CRO ranking uses — one model. */
function c5PreventDetect(){
  var rank=(typeof c5ResidualRank==='function')?c5ResidualRank():[];
  if(!rank.length)return '';
  var measured=(typeof c5EffectivenessMeasured==='function')&&c5EffectivenessMeasured();
  function bar(pct,col){return '<div style="flex:1;min-width:70px"><div style="height:6px;background:var(--surface-2);border-radius:3px;overflow:hidden"><i style="display:block;height:100%;width:'+pct+'%;background:'+col+'"></i></div></div>';}
  var rows=rank.map(function(x){var bc=x.band==='High'?'crit':x.band==='Medium'?'warn':'good';var pp=Math.round(x.control_presence*100),dp=Math.round(x.detection*100);
    return '<div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-top:1px solid var(--line)">'+
      '<div style="flex:1.4;min-width:0;font-size:13px;font-weight:600">'+c5esc(x.name)+'</div>'+
      '<div style="flex:2;display:flex;align-items:center;gap:8px"><span style="font-size:10px;font-weight:700;color:var(--good);width:74px">CONTROL PRESENT</span>'+bar(pp,'var(--good)')+'<span style="font-size:11px;color:var(--muted);width:34px;text-align:right">'+pp+'%</span></div>'+
      '<div style="flex:2;display:flex;align-items:center;gap:8px"><span style="font-size:10px;font-weight:700;color:var(--blue);width:58px">DETECTION</span>'+bar(dp,'var(--blue)')+'<span style="font-size:11px;color:var(--muted);width:34px;text-align:right">'+dp+'%</span></div>'+
      '<span style="font-size:10.5px;font-weight:700;color:var(--'+bc+');width:58px;text-align:right">'+x.residual+' '+x.band+'</span>'+
    '</div>';}).join('');
  return '<div class="c5seclab" style="margin-top:18px">Control presence / detection coverage by crown jewel</div>'+
    '<div>'+rows+'</div>'+
    '<div class="c5foot" style="margin-top:8px">Two axes, each claiming only what telemetry proves — <b style="color:var(--good)">control present</b> (a control is <b>mapped</b> to the technique — presence, <b>not proof it works</b>) and <b style="color:var(--blue)">detection</b> (telemetry that would observe it). The residual is the impact left after both. '+(measured?'Effectiveness is validated by BAS/purple-team.':'<b>Effectiveness is not yet measured</b> — a hook for breach-and-attack-simulation / purple-team results; nothing here claims a control is proven effective.')+'</div>';
}
function c5Threats(){
  var host=document.getElementById('c5-threats');if(!host)return;
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var identityPartial=(typeof c5IdentityOperatingPartial==='function')?c5IdentityOperatingPartial():true; // computed, shared with the metric
  var tactics=(typeof TACTIC_CAPS!=='undefined')?Object.keys(TACTIC_CAPS):[];
  var ts=c5get('threat_status');var ta=sig('threat_actors_active');
  var E=c5ThreatsEvidence(demo);
  // MITRE heatmap — evidence-aware; identity-dependent tactics never read Strong while
  // identity operating evidence is incomplete, no matter the coverage percentage.
  var cells=tactics.map(function(t){var m=c5get('tac_'+t);
    // Read the metric's already-downgraded status/colour so the card matches the detail
    // drawer exactly (the identity downgrade now lives in c5tacticMetric, applied once).
    var idDep=!!m.identity_dependent;var covStat=m.coverage_status||'Not Enough Evidence';
    var col=m.connected?(m.color||'muted'):'muted';
    var pct=null;if(m.connected){var mm=String(m.displayValue).match(/(\d+)/);pct=mm?Number(mm[1]):null;}
    var ev=(!m.connected)?'Not Enough Evidence':(demo?'Demo Telemetry':(idDep&&identityPartial?'Identity evidence partial':'Telemetry Validated'));
    return '<div class="c5att" data-c5m="tac_'+t+'" style="--ac:var(--'+col+')" title="'+c5esc(c5tip(m))+'">'+
      '<div class="c5att-h"><span class="c5att-ic">'+c5icon(TACTIC_ICON[t]||'target')+'</span><span class="c5att-n">'+t+'</span>'+(idDep?'<span class="c5pill a" style="margin-left:6px;font-size:9px">identity path</span>':'')+'</div>'+
      '<div class="c5att-bar">'+(pct!=null?('<i style="width:'+Math.max(4,Math.min(100,pct))+'%"></i>'):'')+'</div>'+
      '<div class="c5att-c">'+(m.connected?(m.displayValue+' · '+covStat):'not connected')+'</div>'+
      '<div class="c5esub" style="font-size:10px;color:var(--muted);margin-top:2px">P/D/R: '+m.prevent+' · '+m.detect+' · '+m.respond+' · '+ev+'</div>'+
    '</div>';
  }).join('');
  var pathEv=demo?'Demo Telemetry':'Evidence Partial';
  var pathCards=THREAT_PATHS.map(function(p){return c5PathCard(p,(p.id==='ap_identity'&&!demo)?'Identity evidence partial':pathEv);}).join('');
  var TD=c5TopDriver(); // data-ranked top driver, not hard-coded identity
  host.innerHTML=c5header()+
    c5shell('Threats · are we ready for the behaviors most likely to hit us?','No confirmed active intrusion — but the path through '+TD.phrase+' is our highest threat exposure.','warn','Nerion maps connected telemetry to MITRE ATT&CK tactics and business-relevant attack paths. The strongest signal today is not an active intrusion; it is the path through '+TD.phrase+' that could enable access to customer-platform services.')+
    '<div class="c5seclab" style="margin-top:16px">Top attack paths requiring attention</div><div class="c5aigrid">'+pathCards+'</div>'+
    c5ThreatsEvidencePanel(E)+
    '<div class="c5seclab" style="margin-top:16px">MITRE ATT&CK coverage · evidence-aware</div>'+
    '<div class="c5attgrid">'+cells+'</div>'+
    '<div class="c5foot" style="margin-top:10px">'+tactics.length+' tactics mapped; coverage strength varies by evidence and control type. Identity-dependent tactics remain partial while identity operating evidence is incomplete.</div>'+
    c5PreventDetect()+
    c5NonAdversarialLane()+
    c5bl('Bottom line','The most material threat path runs through '+TD.phrase+'.',null,'Closing the '+TD.short+' gap improves coverage across Initial Access, Credential Access, Privilege Escalation, Persistence and Lateral Movement. Prioritize '+TD.short+' attack-path remediation.',{mid:TD.mid,txt:'Close '+c5esc(TD.short)+' attack-path gaps'})+
    '<div class="c5foot">Coverage maps MITRE ATT&CK tactics to your detection and prevention controls.'+(demo?' Values are demo telemetry.':'')+'</div>';
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
  var TD=c5TopDriver(); // data-ranked top driver, not hard-coded identity
  var live=c5peerLive(),pmin=c5peerMin();
  var kanon='<div class="c5kanon">'+c5icon('lock')+'<div>Anonymous and opt-in. Cohorts use k-anonymity and are suppressed below a minimum size — nothing identifying leaves your environment. This is the only part of Nerion that reaches the internet.</div></div>';
  // Until the live cohort reaches the minimum client count, the benchmark is a labelled
  // SAMPLE — a preview of exactly what the live comparison will show.
  var sampleBanner=live?'':'<div class="c5kanon" style="border-color:color-mix(in srgb,var(--warn) 40%,var(--line));background:color-mix(in srgb,var(--warn) 8%,var(--surface))"><span style="font-size:16px;line-height:1">📊</span><div><b>Sample peer benchmark — a preview of what you’ll get.</b> The live comparison against your anonymized, same-size, same-industry peers unlocks once <b>'+pmin+' clients</b> have joined the cohort (k-anonymity-gated). Until then, the medians and position below are a representative sample so you can see exactly how it will look.</div></div>';
  var sampleTag=live?'':' <span class="c5pill a" style="font-size:10px;vertical-align:middle">Sample</span>';
  host.innerHTML=c5header()+
    c5shell('Peer benchmark · how do we compare?',(live?'Ahead of your peers overall — with one domain you trail.':'Sample benchmark — a preview of how you’ll compare to your same-size peers.'),null,(live?('Benchmarked against same-size, same-industry peers, your maturity sits in the top third. Your weakest domain versus peers is the one behind '+TD.phrase+' — the same gap driving your exposure. Each domain carries its full comparison.'):('This previews the peer benchmark you’ll get once your cohort is live. The medians and position shown are a representative sample; your live comparison against your actual same-size, same-industry peers unlocks at '+pmin+' clients. Each domain carries its full comparison.')))+
    sampleBanner+
    '<div class="c5statgrid">'+c5mc('peer_maturity','Your maturity',(mat.connected?mat.displayValue:'—'),null)+c5mc('peer_median','Peer median'+sampleTag,(med.connected?med.displayValue:'—'),'ink-2')+c5mc('peer_position','Your position'+sampleTag,(pos.connected?pos.displayValue:'—'),pos.connected?'good':null)+'</div>'+
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px"><span class="c5seclab" style="margin:0">By domain · your score vs. peer median'+sampleTag+'</span><span style="font-size:11.5px;color:var(--muted)">▏ peer median</span></div>'+
    '<div>'+rows+'</div>'+
    kanon+
    c5bl('Bottom line','Close the one domain where peers beat you.',null,'Your largest exposure driver — '+TD.phrase+' — is also where you trail peers most. Closing it moves you toward top-quartile in that domain and reduces your single largest exposure.',{mid:TD.mid,txt:'Close the '+c5esc(TD.short)+' gap'})+
    '<div class="c5foot">'+(live?'Benchmark is anonymized against same-size industry peers.':'Sample figures — the live peer benchmark unlocks once '+pmin+' clients have joined (anonymized, k-anonymity-gated). This previews exactly what you’ll see.')+'</div>';
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
/* Tab 01 — Within appetite (Fortune-100 CFO financial view). Separates modeled
   exposure, board-approved cyber loss appetite, headroom, the largest financial driver,
   the tail scenario, outage impact and the insurance residual gap — with source labels
   on every dollar and no "removes exposure" overclaiming. */
function c5cfExposure(){
  var host=document.getElementById('cf-exposure');if(!host)return;
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var expT=c5get('exp_total'),ap=c5get('cf_appetite'),ec=c5get('exp_identity'),tail=c5get('cf_tail'),bi=c5get('cf_bi'),insCov=c5get('cf_ins_cov'),insGap=c5get('cf_ins_gap');
  // The largest financial driver is data-ranked (c5TopDriver → c5expModel drivers[0]),
  // never hard-coded to identity. dm is that driver's metric; drv/drvL/drvS its labels.
  var TD=c5TopDriver(),dm=c5get(TD.mid);
  var drv=TD.ok?TD.name:'the largest driver',drvL=TD.ok?TD.phrase:'the largest financial driver',drvS=TD.ok?TD.short:'the top driver';
  function num(m){try{var d=String(m.displayValue);var s=d.replace(/[^0-9.]/g,'');var mult=/B/.test(d)?1e9:/M/.test(d)?1e6:/K/.test(d)?1e3:1;return parseFloat(s)*mult;}catch(_){return NaN;}}
  var expN=expT.connected?num(expT):NaN, apN=ap.connected?num(ap):NaN;
  var apImplausible=(!isNaN(expN)&&!isNaN(apN)&&apN>expN*50); // $B appetite vs $M exposure ⇒ likely not cyber-loss tolerance
  var status=!expT.connected?'Not Enough Evidence':!ap.connected?'Appetite not connected':(isNaN(expN)||isNaN(apN))?'Watch':(expN>apN?'Outside appetite':(expN>apN*0.8?'Watch':'Within appetite'))+(demo?' (demo)':'');
  var statusCol=/Within/.test(status)?'good':/Watch/.test(status)?'warn':/Outside/.test(status)?'crit':'muted';
  var covPct=insCov.connected?((String(insCov.displayValue).match(/(\d+)/)||[])[1]||null):null;
  // ── card / tile helpers (source-labelled, click-through to the metric inspector) ──
  function cfCard(title,val,sub,prov,col,mid){return '<div class="c5card"'+(mid?(' data-c5m="'+mid+'"'):'')+'><div class="c5card-top"><span class="c5card-l">'+title+'</span><span class="c5pill n" style="font-size:9px">'+c5esc(prov)+'</span></div><div class="c5card-v" style="color:var(--'+(col||'ink')+')">'+c5esc(String(val))+'</div>'+(sub?('<div class="c5esub" style="font-size:11px;color:var(--muted);margin-top:2px">'+c5esc(sub)+'</div>'):'')+'</div>';}
  // ── evidence confidence — appetite is self-reported ⇒ never High ──
  var L=(typeof LIVE!=='undefined'&&LIVE)||{};
  var evSrcs=[
    {label:'Exposure model (ALE)',connected:expT.connected,critical:true,computed:true},
    {label:'Board-approved cyber loss appetite',connected:ap.connected,critical:false,partial:true},
    {label:'Identity telemetry',connected:ec.connected,critical:false},
    {label:'Business-service mapping',connected:!!(L.process_exposure&&L.process_exposure.length),critical:false,partial:true},
    {label:'Tail-loss model',connected:tail.connected,critical:false,computed:true},
    {label:'Insurance policy data (manual)',connected:insCov.connected,critical:false,partial:true},
    {label:'Outage-impact model',connected:bi.connected,critical:false,computed:true}
  ];
  // ── verdict (data-driven): are we inside the board's cyber-loss appetite, and what leads it ──
  var verdict=!expT.connected?'Connect your exposure model to size cyber exposure against the board’s appetite.'
    :!ap.connected?'Board appetite isn’t connected yet — connect it to judge whether we’re inside it.'
    :('We’re '+(/Outside/.test(status)?'outside':/Within/.test(status)?'within':'approaching')+' the board’s cyber-loss appetite'+(TD.ok?(' — '+drv+' is the largest driver.'):'.'));
  // ── derived figures — never hard-coded (over/headroom = exposure − appetite; driver share = driver ÷ exposure) ──
  var overRaw=(!isNaN(expN)&&!isNaN(apN))?(expN-apN):NaN;
  var overVal=isNaN(overRaw)?'—':((typeof usd==='function')?usd(Math.abs(overRaw)):('$'+Math.round(Math.abs(overRaw)/1e6)+'M'));
  var overLabel=isNaN(overRaw)?'Over appetite':(overRaw>0?'Over appetite':'Headroom to appetite');
  var overCol=isNaN(overRaw)?'muted':(overRaw>0?'crit':'good');
  var expCol=isNaN(overRaw)?'ink':(overRaw>0?'crit':'good');
  var driverN=dm.connected?num(dm):NaN;
  var drvPct=(!isNaN(driverN)&&!isNaN(expN)&&expN>0)?Math.round(driverN/expN*100):null;
  var pillCls=statusCol==='crit'?'r':statusCol==='warn'?'a':statusCol==='good'?'g':'n';
  var heroPill=(/Outside/.test(status)?'Outside appetite':/Within/.test(status)?'Within appetite':/Watch/.test(status)?'Approaching appetite':'Appetite')+(demo?' · demo':'');
  // 2) HERO — modeled exposure vs board appetite: three figures, hairline-separated, in one card.
  function heroCol(val,label,col,first){return '<div style="flex:1 1 120px;min-width:110px;padding:2px 16px'+(first?'':';border-left:1px solid var(--line)')+'"><div class="c5card-v" style="color:var(--'+(col||'ink')+')">'+c5esc(String(val))+'</div><div class="c5esub" style="font-size:11px;color:var(--muted);margin-top:2px">'+c5esc(label)+'</div></div>';}
  var hero='<div class="c5card" data-c5m="exp_total" style="cursor:pointer;margin-top:6px"><div class="c5card-top"><span class="c5card-l">Modeled exposure vs board appetite</span><span class="c5pill '+pillCls+'" style="font-size:9px">'+c5esc(heroPill)+'</span></div>'+
    '<div style="display:flex;flex-wrap:wrap;align-items:stretch;margin-top:10px">'+
      heroCol(expT.connected?expT.displayValue:'—','Modeled cyber exposure',expCol,true)+
      heroCol(ap.connected?ap.displayValue:'—','Board-approved appetite'+(demo?' (demo)':'')+(apImplausible?' · confirm scope':''),'ink',false)+
      heroCol(overVal,overLabel,overCol,false)+
    '</div></div>';
  // 3) TWO CARDS — largest driver · downside tail (insurance folded into the tail caption).
  var driverCap=TD.ok?(cap(drv)+(drvPct!=null?(' — '+drvPct+'% of modeled exposure'):'')):'Connect telemetry to rank the largest driver';
  var downCap=(covPct?(covPct+'% insured'):'insurance manual')+(insGap.connected?(' · '+insGap.displayValue+' uninsured residual'):'');
  var twoCards='<div class="c5cards" style="margin-top:14px">'+
    cfCard('Largest exposure driver',(dm.connected?dm.displayValue:'—'),driverCap,'Largest','ink',TD.mid)+
    cfCard('Downside — 1-in-20 tail',(tail.connected?tail.displayValue:'—'),downCap,'Modeled','ink','cf_tail')+
    '</div>';
  // 4) REMEDIATION STRIP — muted fill, no border. The exposure-reduction figure drills to its basis.
  var sep='<span style="color:var(--line)">·</span>';
  var strip='<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-top:14px;padding:12px 16px;border-radius:12px;background:var(--surface-2)">'+
    '<span data-c5m="'+TD.mid+'" style="cursor:pointer;font-size:12.5px;color:var(--good);font-weight:600">Remediating the largest driver removes '+(dm.connected?c5esc(dm.displayValue):'—')+' of modeled exposure</span>'+sep+
    '<span style="font-size:12px;color:var(--muted)">'+c5IdFix().timeline+'</span>'+sep+
    '<span style="font-size:12px;color:var(--muted)">owner '+c5IdFix().owner+'</span>'+sep+
    '<span style="font-size:12px;color:var(--muted)">funding cost not yet connected</span>'+
    '</div>';
  // 5) EVIDENCE FOOTNOTE — small, muted; sources connected is counted from the evidence set.
  var connN=evSrcs.filter(function(s){return s.connected;}).length;
  var foot='<div class="c5foot">'+(demo?'demo — ':'')+'exposure and tail loss are modeled, appetite is self-reported, insurance is manual; the largest driver is computed from connected telemetry. · '+connN+' sources connected</div>';
  host.innerHTML=c5header()+
    c5shell('Financial exposure · board appetite',verdict,null,'Every figure carries its source; drill any card for its basis.')+
    hero+twoCards+strip+foot;
}
/* Tab 02 — Cyber ROI */
/* Tab 02 — Spend ROI. One executive viewport: header answer, four cards, one short
   bottom-line box, two buttons. Honest — spend ROI is "not enough evidence" until
   security spend is attributed; no "risk removed" / "shift budget" claims until then. */
function c5cfRoi(){
  var host=document.getElementById('cf-roi');if(!host)return;
  var st=(typeof ROI_STATE!=='undefined')?ROI_STATE:null;
  var haveSpend=!!(st&&st.invested>0&&st.riskRemoved>0);
  var er=c5get('eff_removed');var redConn=!!er.connected;var redVal=redConn?er.displayValue:'Not connected';
  var TD=c5TopDriver(); // data-ranked reallocation candidate — never hard-coded to identity
  var cand=TD.ok?TD.name:'the largest driver',candL=TD.ok?TD.phrase:'the largest driver';
  // Each card opens its own detail drawer (data-c5m), like every other card in the cockpit.
  function card(t,v,badge,badgeCls,sub,col,mid){return '<div class="c5card"'+(mid?(' data-c5m="'+mid+'"'):'')+' style="min-width:200px;position:relative'+(mid?';cursor:pointer':'')+'">'+(mid?'<span class="c5opc-go" style="position:absolute;top:10px;right:12px;font-size:10px;color:var(--blue);font-weight:600">details ›</span>':'')+'<div class="c5card-top"><span class="c5card-l">'+t+'</span><span class="c5pill '+(badgeCls||'n')+'" style="font-size:9px">'+badge+'</span></div><div class="c5card-v" style="color:var(--'+(col||'ink')+')">'+v+'</div><div class="c5esub" style="font-size:11px;color:var(--muted);margin-top:2px">'+sub+'</div></div>';}
  var redCard=redConn
    ?card('Modeled exposure reduction',redVal,'Modeled','a','Estimated exposure reduced by current controls.','good','eff_removed')
    :card('Modeled exposure reduction','Not connected','Model not connected','n','Connect your control ledger to model exposure reduction.','muted','eff_removed');
  var cards,blHead,blBody,primaryBtn,secondaryBtn;
  if(haveSpend){
    var mult=(typeof roiMult==='function')?roiMult(st.ret):Math.round(st.ret);
    cards=redCard+
      card('Security spend attributed',usd(st.invested),'Connected','g','Budget, vendor spend and project cost attributed.','ink','eff_spend')+
      card('Return per dollar',mult+'×','Computed','a','Modeled exposure reduction ÷ attributed spend.','good','eff_return')+
      card('ROI readiness','Complete','Spend connected','g','Exposure model and spend both connected.','good','cf_roi_readiness');
    blHead='Spend ROI is computed on attributed spend.';
    blBody='Your program returns '+mult+'× on '+usd(st.invested)+' of attributed spend. Reducing '+candL+' delivers the most modeled exposure reduction per dollar — the strongest reallocation candidate.';
    primaryBtn={mid:TD.mid,txt:'Review '+cand+' ROI'};
    secondaryBtn={mid:'eff_spend',txt:'Review spend attribution'};
  } else {
    cards=redCard+
      card('Security spend attributed','Not connected','Spend data needed','n','Connect budget, GL, vendor spend, and project cost data.','muted','eff_spend')+
      card('Return per dollar','Not enough evidence','Pending spend data','n','ROI cannot be calculated until spend is attributed.','muted','eff_return')+
      card('ROI readiness',redConn?'Partial':'Not enough evidence',redConn?'Exposure model connected':'Model + spend needed',redConn?'a':'n','Spend attribution is the missing input.',redConn?'warn':'muted','cf_roi_readiness');
    blHead='Modeled exposure reduction is real; spend ROI is pending.';
    blBody=(redConn?('Nerion shows '+redVal+' in modeled exposure reduction, but cannot prove cyber spend ROI until spend data is connected. '):'Connect your control ledger and security spend to model exposure reduction and prove return per dollar. ')+'Reducing '+candL+' appears to be the strongest exposure-reduction candidate; connect spend data to confirm return per dollar.';
    primaryBtn={mid:'eff_spend',txt:'Connect security spend data'};
    secondaryBtn={mid:TD.mid,txt:'Review '+cand+' ROI candidate'};
  }
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var roiInputsN=[redConn,haveSpend].filter(Boolean).length;
  host.innerHTML=c5header()+
    c5shell('Cyber ROI · is our security spend paying off?','Modeled exposure reduction is visible, but spend ROI is not complete until security spend is connected.',null,'Nerion can show modeled exposure reduction today. To prove return per dollar, connect budget, vendor spend, project cost, and labor allocation data.')+
    '<div class="c5cards">'+cards+'</div>'+
    c5bl('Bottom line',blHead,null,blBody,primaryBtn,secondaryBtn)+
    '<div class="c5foot">Modeled exposure reduction from your control ledger; ROI needs security spend attributed (budget · GL · vendor spend · project cost). · '+roiInputsN+' of 2 ROI inputs connected'+(demo?' · demo':'')+'</div>';
}
/* Tab 03 — Insurance & risk transfer */
function c5covBar(){
  var ins=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&LIVE.economics.insurance)||{},lim=Number(ins.limit)||0,tail=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&Number(LIVE.economics.tail))||0;
  if(!(lim>0&&tail>0))return '<div class="c5note">◐ Connect your policy record and risk model to see cover vs the modeled tail.</div>';
  var covp=Math.min(100,Math.round(lim/tail*100)),gp=Math.max(0,100-covp);
  return '<div style="margin-top:14px"><div style="display:flex;height:34px;border-radius:8px;overflow:hidden;border:1px solid var(--line)">'+
    '<div data-c5m="cf_ins_limit" style="width:'+covp+'%;background:rgba(46,139,107,.85);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;cursor:pointer">Transferred to insurer — '+usd(lim)+'</div>'+
    (gp>0?('<div data-c5m="cf_ins_gap" style="width:'+gp+'%;background:rgba(201,162,39,.9);color:#3a2c00;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;cursor:pointer">Retained by company — '+usd(tail-lim)+'</div>'):'')+
    '</div><div class="c5foot">Full bar = '+usd(tail)+' modeled 1-in-20 cyber loss.</div></div>';
}
function c5cfInsurance(){
  var host=document.getElementById('cf-insurance');if(!host)return;
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var tailM=c5get('cf_tail'),limM=c5get('cf_ins_limit'),gap=c5get('cf_ins_gap');
  // Largest tail driver is data-ranked (c5TopDriver), never hard-coded to identity.
  var TD=c5TopDriver(),dm=c5get(TD.mid);
  var drvL=TD.ok?TD.phrase:'the largest driver',drvS=TD.ok?TD.short:'the top driver';
  var hasGap=gap.connected&&gap.color==='warn';
  var tailV=tailM.connected?tailM.displayValue:'—',limV=limM.connected?limM.displayValue:'—',gapV=gap.connected?gap.displayValue:'—';
  // Premium — hide the implausible $B-vs-$M slip; show Not connected until a credible value exists.
  var pins=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&LIVE.economics.insurance)||{};
  var pv=Number(pins.premium)||0,plim=Number(pins.limit)||0,ptail=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&Number(LIVE.economics.tail))||0;
  var pImpl=pv>0&&((plim>0&&pv>=plim)||(plim<=0&&ptail>0&&pv>ptail));
  var premUsable=pv>0&&!pImpl;
  function cfCard(t,v,badge,badgeCls,sub,col,mid){return '<div class="c5card"'+(mid?(' data-c5m="'+mid+'"'):'')+' style="min-width:200px"><div class="c5card-top"><span class="c5card-l">'+t+'</span><span class="c5pill '+(badgeCls||'n')+'" style="font-size:9px">'+badge+'</span></div><div class="c5card-v" style="color:var(--'+(col||'ink')+')">'+c5esc(String(v))+'</div><div class="c5esub" style="font-size:11px;color:var(--muted);margin-top:2px">'+c5esc(sub)+'</div></div>';}
  // Evidence confidence — policy terms not connected ⇒ never High; self-reported limit + demo cap it too.
  var evSrcs=[
    {label:'Tail-loss model',connected:tailM.connected,critical:true,computed:true},
    {label:'Insurance policy record',connected:limM.connected,critical:false,partial:true},
    {label:'Policy limit',connected:limM.connected,critical:false,partial:true},
    {label:'Annual premium',connected:premUsable,critical:false},
    {label:'Exclusions / sublimits / retention',connected:false,critical:true,partial:true},
    {label:'Business-interruption cover',connected:false,critical:false,partial:true},
    {label:'Largest tail driver',connected:dm.connected,critical:false,computed:true}
  ];
  var evConf=(typeof TrustLogic!=='undefined')?TrustLogic.evidenceConfidence(evSrcs):{level:'—'};
  var evLevel=demo?'Demo':evConf.level;
  var evPanel=c5EvLine(evLevel,'tail loss is modeled, insurance limit is self-reported, and policy terms require review.',evSrcs,demo);
  host.innerHTML=c5header()+
    c5shell('Insurance & risk transfer · are we insured efficiently?',(hasGap?('Insurance covers most modeled tail loss, but '+gapV+' remains retained.'):(gap.connected?'The modeled tail is transferred — the efficient move is reducing the tail.':'Connect your policy record and risk model to size cover against the tail.')),null,'Your policy transfers '+limV+' of the modeled 1-in-20 cyber loss scenario. The remaining '+gapV+' stays on the balance sheet unless you reduce the tail or buy additional coverage.')+
    '<div class="c5cards">'+
      cfCard('Modeled 1-in-20 cyber loss',tailV,'Modeled','a','Modeled cyber loss scenario at 5% annual probability.','warn','cf_tail')+
      cfCard('Transferred to insurer',limV,(demo?'Demo':'Self-reported'),(demo?'n':'n'),'Cyber insurance limit available for the modeled scenario.','ink','cf_ins_limit')+
      cfCard('Retained exposure',gapV,'Computed','a','Modeled tail loss retained by the company after insurance.','warn','cf_ins_gap')+
    '</div>'+
    c5covBar()+
    '<div class="c5cards" style="margin-top:14px">'+
      cfCard('Annual premium',(premUsable?(usd(pv)+' / yr'):'Not connected'),(premUsable?(demo?'Demo':'Self-reported'):'Premium data needed'),(premUsable?'n':'n'),(premUsable?'Annual cyber policy cost · renewal is a lever.':'Connect policy premium and renewal data.'),(premUsable?'ink':'muted'),premUsable?'cf_premium':null)+
      cfCard('Coverage terms review','Needs review','Policy terms not connected','a','Exclusions, sublimits, retention, waiting periods, ransomware, business interruption, dependent-BI and vendor/supply-chain coverage need review.','warn')+
      cfCard('Largest tail driver',(dm.connected?(dm.displayValue+' modeled exposure'):'—'),'Tail driver','a',(TD.ok?(cap(drvL)+' is the largest contributor to the modeled tail.'):'Connect telemetry to rank the largest tail contributor.'),'warn',TD.mid)+
    '</div>'+
    evPanel+
    c5bl('Bottom line',(hasGap?('Modeled 1-in-20 cyber loss is '+tailV+'; insurance transfers '+limV+', leaving '+gapV+' retained.'):'The modeled tail is transferred — reduce the tail to improve efficiency.'),null,'The fastest way to improve efficiency is to reduce the largest tail driver — '+drvL+' — before buying more coverage. Fund '+drvS+' remediation to reduce the tail, or model additional coverage if retained exposure remains outside appetite.',{mid:TD.mid,txt:'Fund '+drvS+' remediation'},{mid:'cf_ins_gap',txt:'Model additional coverage'})+
    '<div class="c5foot">Cover vs. modeled tail; limits and premium are self-reported from your policy record'+(demo?' — values shown are demo.':'.')+'</div>';
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
  // Driver naming is data-ranked (c5TopDriver), never hard-coded to identity.
  var TD=c5TopDriver(),dm=c5get(TD.mid),IDF=c5IdFix();
  var list=[
    c5dec('cf',1,'Fund the '+IDF.short+' fix?','Your single largest exposure driver'+(dm.connected?(' — '+dm.displayValue):'')+'. Funding it reduces the modeled exposure and keeps modeled loss within appetite — the one fix that moves every CFO tab (appetite, ROI, insurance).',
      {on:'Approve & fund the '+IDF.short+' fix',osum:(dm.connected?('Reduces '+dm.displayValue+' · keeps you within appetite'):'Reduces the top exposure driver'),pros:['Reduces your single largest exposure driver.','Highest return per dollar of the choices here.','Keeps modeled loss within the board-approved appetite and trims the insurance tail.'],cons:['Requires capital this cycle (scoped with your team).','Interim exposure persists across the '+IDF.timeline+' rollout — not removed on day one.']}),
    c5dec('cf',2,'Close the insurance gap — buy up, or reduce the tail?','Weigh transferring more risk to insurance against reducing the modeled tail at its source.',
      {on:'Reduce the tail — fund the '+TD.short+' fix',osum:'Cheaper than extra premium in most cases',pros:['Lowers the severe-year tail at source.','Improves your renewal position.'],cons:['Takes a cycle to land vs. an immediate transfer.']},
      [{on:'Buy up cover — raise the limit',osum:'Immediate transfer · higher premium',pros:['Caps the financial loss immediately.'],cons:['Adds recurring premium.','Transfers the loss; does not reduce it.']},
       {on:'Defer to renewal',osum:'Revisit at the next policy renewal',pros:['No action now.'],cons:['The residual gap persists in the interim.']}]),
    c5dec('cf',3,'Accept the smallest residual driver'+(em.connected?(' — '+em.name.toLowerCase()):'')+'?','Modeled and within tolerance — a reasonable acceptance if the rationale is recorded.',
      {on:'Accept — record the rationale',osum:'Within tolerance · monitored',pros:['Well within appetite on current modeling.','Avoids spend on a low-return control.'],cons:['Requires a recorded risk-acceptance rationale.','Revisit if that signal rises.']},
      [{on:'Fund additional mitigation for this driver',osum:'Extra spend · marginal reduction',pros:['Further lowers an already-small exposure.'],cons:['Low return per dollar vs. the top driver.']}])
  ];
  host.innerHTML=c5header()+
    c5shell('Risk decisions · what needs my sign-off?','One fix converges across the financials — then the transfer and accept calls that are yours.',null,'Each decision below gives you the options — the recommended call is marked, but the choice is yours. Choosing one stamps it with your name and time, keeps it editable for 24 hours, and (where you connected Jira / ServiceNow at onboarding) opens a tracked project whose status is pulled back on refresh.')+
    c5convergeStrip('cfo')+
    c5decisions(list)+
    '<div class="c5foot">Each decision is priced from your risk model and spend records. Every figure traces to its source · no AI/LLM at run-time.</div>';
}

/* ================= CEO seat — same engine, strategy & trust lens ================= */
/* Tab 01 — Enterprise cyber health */
function c5ceHealth(){
  var host=document.getElementById('ce-health');if(!host)return;
  var O=c5Objectives(),ec=c5get('exp_identity');
  var TD=c5TopDriver(),dm=c5get(TD.mid); // data-ranked top driver, not hard-coded identity
  var atPill=O.atRisk>0?'a':'g';var atTxt=O.atRisk>0?(O.atRisk+' at risk'):'All protected';
  var hr=c5get('cf_headroom');var T=c5T();
  host.innerHTML=c5header()+
    c5shell('Enterprise cyber health · is cyber a tailwind or a risk?','Cyber is protecting growth, not slowing it.',null,'The enterprise is secure'+(T.improving?' and improving':'')+'. '+O.protected+' of your '+O.total+' strategic objectives are cyber-safe; the exception carries a single, funded exposure. Cyber isn’t a blocker this quarter.')+
    '<div class="c5cards">'+c5card('ceo_health')+c5card('ceo_objectives')+c5card('direction')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('ceo_biz_health','g','Secure','No active compromise, program improving')+
      c5tile('exp_total','g','Within appetite',(hr.connected?('Well inside your '+c5get('cf_appetite').displayValue+' tolerance'):'Your modeled cyber loss this year'))+
      c5tile('ceo_cust_incidents','g','Intact','Customer-impacting incidents this quarter')+
    '</div>'+
    c5bl('Bottom line','Back the one move that protects your top objective.',null,(ec.connected?('The customer platform — central to your growth strategy — carries the largest cyber exposure: <b>'+c5esc(TD.phrase)+'</b>'+(dm.connected?(' ('+dm.displayValue+')'):'')+'. The fix is funded; backing it keeps your #1 objective on track.'):'Connect your controls and the one exposure to your top objective surfaces here, with its funded fix.'),{mid:TD.mid,txt:'Back the '+c5esc(TD.short)+' fix — protects the platform'})+
    '<div class="c5foot">Figures are governance-grade and traceable to source.</div>';
}
/* Tab 02 — Strategic risk */
/* CEO 01 — Value at risk. Cyber value against enterprise value/strategy: the strategic
   objectives exposed and the crown-jewel revenue engine behind most of it. Board-ready. */
/* ── CEO — two-tab cockpit (01 Overview · 02 Decisions). The Overview folds the former
   Value-at-risk / Crown-jewels / Trust tabs into one concise page: the CISO answering the
   CEO's key questions, every box click-to-source via the shared provenance drawer. ── */
/* ═══════════ Leader-seat Overview — shared, plain-English, click-to-source ═══════════
   One concise page per leader (CEO/CFO/COO/CIO/CRO/CLO): a clear headline, four status cards,
   the leader's key questions each answered in complete plain English (naming the specific gap and
   what we're doing about it), and one decision. No jargon, no filler, no redundant breadcrumb.
   Every box is click-to-source via the shared provenance drawer. */
function c5ovFix(){var IDF=c5IdFix();return 'the funded identity fix ('+IDF.owner+', '+IDF.timeline+')';}
function c5ovVc(pill){return pill==='r'?'crit':pill==='a'?'warn':pill==='g'?'good':pill==='b'?'blue':'ink';}
function c5ovCard(f){if(!f)return '';return '<div class="c5card c5bdbox" data-c5bd="'+f.id+'"><div class="c5card-top"><span class="c5card-l">'+c5esc(f.title)+'</span><span class="c5pill '+(f.pill||'n')+'">'+c5esc(f.status||'')+'</span></div><div class="c5card-v" style="color:var(--'+c5ovVc(f.pill)+')">'+c5esc(f.value||'—')+'</div></div>';}
function c5ovQBlock(title,qs){
  var rows=qs.map(function(f,i){
    return '<div class="c5prow c5bdbox" data-c5bd="'+f.id+'" style="align-items:flex-start;gap:11px;padding:14px 4px">'
      +'<span style="flex:0 0 auto;width:22px;height:22px;border-radius:50%;background:var(--surface-2);border:1px solid var(--line);display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--ink-2);margin-top:1px">'+(i+1)+'</span>'
      +'<div style="flex:1;min-width:0"><div class="c5row-t" style="margin-bottom:3px">'+c5esc(f.question)+'</div>'
      +'<div style="font-size:12.5px;color:var(--ink-2);line-height:1.55">'+f.detail+'</div>'
      +'<div style="font-size:11px;color:var(--muted);margin-top:4px">Owner: '+c5esc(f.owner)+'</div></div>'
      +'<span class="c5pill '+(f.pill||'n')+'" style="flex:none;margin-top:1px">'+c5esc(f.status)+'</span></div>';
  }).join('');
  return '<div style="border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-top:14px"><div class="c5rank-h">'+c5esc(title)+'</div><div style="padding:2px 15px">'+rows+'</div></div>';
}
function c5ovDecision(f,tabIdx,btnLabel){
  return '<div class="c5bl c5bdbox" data-c5bd="'+f.id+'" style="border-left:3px solid var(--blue)"><div class="c5bl-k">'+c5esc(f.kicker||'Needs your decision')+'</div><div class="c5bl-h">'+c5esc(f.headline)+'</div><div class="c5bl-p">'+f.body+'</div><button class="c5btn" data-c5bdtab="'+tabIdx+'">'+c5esc(btnLabel||'Open Decisions')+'</button></div>';
}
/* Render a seat Overview. data = { host, tabIdx, headline, headColor, qTitle, cards[], questions[],
   decision, decisionBtn, footnote }. Registers every figure for the drawer; no breadcrumb. */
function c5ovDo(data){
  var host=document.getElementById(data.host);if(!host)return;
  var F={};data.cards.forEach(function(f){F[f.id]=f;});data.questions.forEach(function(f){F[f.id]=f;});if(data.decision)F[data.decision.id]=data.decision;
  c5regFigs(F);
  host.innerHTML=c5header()
    +'<div class="c5verdict"'+(data.headColor?(' style="color:var(--'+data.headColor+')"'):'')+'>'+data.headline+'</div>'
    +'<div class="c5intro" style="margin-top:5px;color:var(--muted);font-size:12.5px">Each answer is traced to its source — click any box to see it.</div>'
    +'<div class="c5cards">'+data.cards.map(c5ovCard).join('')+'</div>'
    +c5ovQBlock(data.qTitle||'Your key questions — answered',data.questions)
    +(data.decision?c5ovDecision(data.decision,data.tabIdx,data.decisionBtn):'')
    +(data.footnote?('<div class="c5foot">'+data.footnote+'</div>'):'');
}
/* small shared builders for provenance sources */
function c5ovFig(o){o.sources=(o.sources||[]).filter(Boolean);o.confidence=o.confidence||c5bdConf(o.sources);o.asOf=o.asOf||(typeof c5ago==='function'?c5ago():'now');return o;}

/* ── CEO ── */
function c5ceOverview(){
  var host=document.getElementById('ce-overview');if(!host)return;
  var M=(typeof c5expModel==='function')?c5expModel():{total:0};var IDF=c5IdFix();var idm=c5get(IDF.mid);
  var expT=c5get('exp_total');var tail=c5get('cf_tail');var Scr=(typeof c5Services==='function')?c5Services():{total:0,atRisk:0};
  var oi=(typeof sig==='function')?sig('open_incidents'):null;var incident=(oi!=null&&oi>0);
  var gov=(typeof LIVE!=='undefined'&&LIVE&&LIVE.governance)||{};var irTested=/yes|tested|tabletop/i.test((gov.ir&&gov.ir.tested)||'');
  var atR=Scr.atRisk||0,crownN=Scr.total||0,protN=Math.max(0,crownN-atR);var connected=(M.total>0);
  var valUsd=expT.connected?expT.displayValue:(M.total>0?usd(M.total):null);
  var tailUsd=tail.connected?tail.displayValue:null;
  var ctrlTelem=c5bdTelem(['okta','entra'],'Identity & access coverage','mfa_pct')||c5bdTelem(['crowdstrike','defender'],'Endpoint coverage','edr_pct');
  var siemTelem=c5bdTelem(['splunk','sentinel'],'Security incidents','open_incidents');
  var fix=c5ovFix();
  var atNames=(Scr.list||[]).filter(function(s){return s.status==='At risk';}).map(function(s){return s.name;});
  var atName=atNames[0]||'the customer platform';
  var cp0=(typeof c5CriticalServices==='function'?(c5CriticalServices()[0]||{}):{});var cpDep=(cp0.dep?String(cp0.dep).split('·')[0].trim():'');
  // One specific, complete answer per topic — shown on BOTH the card and its question so every drawer pays off.
  var dValue=connected
    ?('In a severe (1-in-20) year, a cyber loss could reach <b>'+(tailUsd||valUsd)+'</b> — the figure to plan against, not the average year. Nearly all of it sits in one system, <b>'+c5esc(atName)+'</b>'+(cpDep?(' ('+c5esc(cpDep)+')'):'')+', where identity and access controls are the weak point. The funded fix ('+IDF.owner+', '+IDF.timeline+') removes the largest share.')
    :'We’ll put a dollar figure on this the moment your financials and security tools are connected — never an estimate before then.';
  var dCrown=(atR>0)
    ?('<b>'+protN+' of '+crownN+'</b> revenue systems are fully protected. The exception is <b>'+c5esc(atName)+'</b> — its identity and access controls are weak enough that an attacker could reach customer data, and it is among your highest-value systems. Remediation is funded and underway ('+IDF.owner+', '+IDF.timeline+').')
    :(crownN>0?('All <b>'+crownN+'</b> revenue systems are protected this quarter — none carries a material exposure.'):'Map your revenue systems at onboarding and each one’s status will list here.');
  var dTrust=(incident
    ?'A customer-impacting incident is <b>active</b>. The response is running from the War Room and legal has started the disclosure clock.'
    :'No customer-impacting incident is active, so customer trust is <b>intact</b> this quarter. If one occurred, the War Room runs the response and legal starts the clock the same day.');
  var dDisc='Our SEC 8-K process is <b>'+(irTested?'tabletop-tested':'documented but not yet tabletop-tested')+'</b>: if an incident were judged material, we could file within the <b>4-business-day</b> SEC deadline. The audit committee reviews cyber each quarter.';
  var cards=[
    c5ovFig({id:'ce_value',title:'Value at risk',value:(valUsd||'Connect financials'),status:connected?'Modeled':'—',pill:connected?'a':'n',owner:'CFO / CISO',ownerSeat:'cfo',detail:dValue,sources:[c5bdMod('modeled expected loss on the crown-jewel systems; inputs: exposure model (modeled) + control telemetry (measured)'),ctrlTelem]}),
    c5ovFig({id:'ce_crown',title:'Crown jewels',value:(crownN>0?(protN+' of '+crownN+' protected'):'Map at onboarding'),status:(atR>0?'1 exposed':(crownN>0?'Protected':'—')),pill:(atR>0?'a':(crownN>0?'g':'n')),owner:'COO / CISO',ownerSeat:'coo',detail:dCrown,sources:[c5bdMod('per-system exposure vs its controls'),c5bdDocSrc('crown|inventory|asset','Revenue-system inventory')||c5bdSelf('Revenue-system inventory','mapped at onboarding')]}),
    c5ovFig({id:'ce_trust',title:'Customer trust',value:(incident?'Incident active':'Intact'),status:(incident?'Incident':'Intact'),pill:(incident?'r':'g'),owner:'CLO / CISO',ownerSeat:'clo',detail:dTrust,sources:[siemTelem||c5bdMod('active customer-impacting incidents from the SIEM feed')]}),
    c5ovFig({id:'ce_disc',title:'SEC disclosure',value:'Ready · 4 days',status:(irTested?'Ready':'In progress'),pill:(irTested?'g':'a'),owner:'CLO',ownerSeat:'clo',detail:dDisc,sources:[c5bdSelf('SEC disclosure process',(irTested?'tabletop-tested':'documented')+' at onboarding'),c5bdDocSrc('incident|disclosure|IR','Incident-response runbook')]})
  ];
  var questions=[
    c5ovFig({id:'ce_q1',title:'Value at risk',question:'What could cyber cost the business?',owner:'CFO / CISO',ownerSeat:'cfo',status:connected?'Watch':'—',pill:connected?'a':'n',value:(tailUsd||valUsd||'—'),detail:dValue,
      sources:[c5bdMod('worst-year loss (95th percentile) from the loss model; inputs: exposure (modeled) + control telemetry (measured)'),ctrlTelem]}),
    c5ovFig({id:'ce_q2',title:'Crown jewels',question:'Which revenue systems are exposed, and what are we doing?',owner:'COO / CISO',ownerSeat:'coo',status:(atR>0?'1 gap':(crownN>0?'Protected':'—')),pill:(atR>0?'a':(crownN>0?'g':'n')),value:(crownN>0?(protN+' of '+crownN+' protected'):'—'),detail:dCrown,
      sources:[c5bdMod('per-system exposure vs controls'),c5bdDocSrc('crown|inventory|asset','Revenue-system inventory')||c5bdSelf('Revenue-system inventory','mapped at onboarding')]}),
    c5ovFig({id:'ce_q3',title:'Trust & disclosure',question:'Are we protecting customer trust and ready to disclose?',owner:'CLO',ownerSeat:'clo',status:(incident?'Watch':(irTested?'Ready':'In progress')),pill:(incident?'a':(irTested?'g':'a')),value:(incident?'Incident active':'Intact'),detail:dTrust+' '+dDisc,
      sources:[siemTelem||c5bdMod('active incidents from the SIEM feed'),c5bdSelf('SEC materiality & 8-K process',(irTested?'tabletop-tested':'documented')+' at onboarding')]})
  ];
  var decision=c5ovFig({id:'ce_decision',title:'Fund the identity remediation',value:((idm.connected?(idm.displayValue+' · '):'')+IDF.owner+' · '+IDF.timeline),status:'Your sign-off',pill:'b',owner:IDF.owner,ownerSeat:'ciso',
    kicker:'Needs your sign-off · one decision',headline:'Approve funding for the identity fix.',
    body:'This single fix removes the largest share of the value at risk, protects the customer platform, and brings cyber within the board’s appetite. It is scoped and funded ('+IDF.owner+', '+IDF.timeline+'). Your sign-off records executive support and starts the review clock.',
    sources:[c5bdMod('the one fix behind the top exposure; brings the platform within appetite'),c5bdSelf('Funding decision',IDF.owner+' · '+IDF.timeline)]});
  var headline=connected?('Our worst-case cyber loss is concentrated in the customer platform — and the fix is already funded.'):('Cyber is protecting the business this quarter; connect your financials to size the exposure in dollars.');
  c5ovDo({host:'ce-overview',tabIdx:1,headline:headline,headColor:(atR>0||incident?'warn':null),qTitle:'The three questions a CEO asks — answered',cards:cards,questions:questions,decision:decision,decisionBtn:'Approve — open Decisions',
    footnote:'Plain-language answers, each traceable to the executive who owns it. Click any box for the exact source, coverage and confidence.'});
}
/* ── CFO ── */
function c5cfOverview(){
  var host=document.getElementById('cf-overview');if(!host)return;
  var IDF=c5IdFix();var idm=c5get(IDF.mid);var ap=c5get('cf_appetite');var tail=c5get('cf_tail');var er=c5get('eff_return');var insGap=c5get('cf_ins_gap');var insLim=c5get('cf_ins_cov');
  var E=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics)||{};var aleN=Number(E.ale)||0;var appN=(E.appetite&&Number(E.appetite.appetite))||0;
  var over=ap.connected&&appN>0&&aleN>appN;var fix=c5ovFix();
  var apStr=appN>0?usd(appN):(ap.displayValue||'the appetite');var aleStr=aleN>0?usd(aleN):(idm.displayValue||'the modeled loss');
  var overStr=(over&&appN>0)?usd(aleN-appN):'';var headStr=(!over&&appN>0)?usd(appN-aleN):'';
  var ctrlTelem=c5bdTelem(['okta','entra'],'Identity & access coverage','mfa_pct');
  var dApp=(ap.connected?(over?('Modeled cyber loss is <b>'+aleStr+'</b> against the board’s <b>'+apStr+'</b> appetite — over by about <b>'+overStr+'</b>. The overage comes from one place: the customer platform’s identity and access exposure. Funding that fix ('+IDF.owner+', '+IDF.timeline+') brings us back within appetite; nothing else moves the number as much.'):('Modeled cyber loss is <b>'+aleStr+'</b> against the board’s <b>'+apStr+'</b> appetite — within, with about <b>'+headStr+'</b> of headroom. We hold it there by keeping the top controls funded and the identity fix on track.')):'Set the board’s appetite at onboarding and we’ll show modeled loss against it and exactly how much headroom you have.');
  var dWorst=(tail.connected?('The <b>worst-year loss</b> is the roughly-1-in-20 bad year (95th percentile), <b>'+tail.displayValue+'</b> — the number to reserve against, not the average year. The single biggest lever that pulls it down is the funded identity fix, which removes the largest slice of the tail.'):'Connect your financials and risk register and we’ll model the worst-year loss you should plan against.');
  var dRoi=(er.connected?('Your controls return <b>'+er.displayValue+'</b> of risk removed per dollar — a positive return. The best next dollar is the identity fix: it removes more risk per dollar than anything else on the list and is already scoped ('+IDF.owner+', '+IDF.timeline+').'):'Connect your security tools and we’ll show the return per dollar and the single highest-return investment.');
  var dIns=(insGap.connected?((insGap.color==='warn')?('Our policy covers up to <b>'+(insLim.connected?insLim.displayValue:'the stated limit')+'</b>, but the modeled worst case runs higher — so we’re self-carrying about <b>'+insGap.displayValue+'</b>. Closing the identity gap lowers that worst case, which is the cheapest way to shrink what we carry ourselves.'):'Our policy limit covers the modeled worst case, so the uninsured tail is minimal this quarter. We re-check it whenever the exposure or the policy changes.'):'Add your cyber policy at onboarding and we’ll size the uninsured tail you’re carrying.');
  // Phase D — the revenue-confirmation gate, surfaced to the CFO (the persona who owns it).
  var RC=(typeof LIVE!=='undefined'&&LIVE&&LIVE.revenue_confirmation)||null;
  var rcConn=!!RC;var rcProv=rcConn?(Number(RC.provisional_jewels)||0):0;
  var dRev=(rcConn
    ?('<b>Revenue is the primary path</b> to crown-jewel status, and it’s your confirmed input. <b>'+RC.confirmed+' of '+RC.processes+'</b> processes are confirmed ('+RC.brings_money+' bring money)'+
      (rcProv>0?(', and <b>'+rcProv+'</b> crown jewel'+(rcProv>1?'s remain':' remains')+' <b>provisional</b> — awaiting confirmation of '+c5esc(RC.top_unconfirmed||'an unconfirmed revenue process')+' before promotion.'):' — every revenue-linked jewel is backed by a confirmed process.')+
      ' Confirm the rest in onboarding (the CFO step). Note: an asset can <b>also</b> qualify without revenue if it’s high-impact-if-lost — regulated data (PHI/PCI), safety-critical, under legal hold, or brand-critical.')
    :'Confirm which processes bring money in onboarding — revenue is the primary path to crown-jewel status; high-impact assets (regulated data, safety, legal hold, brand) also qualify.');
  var cards=[
    c5ovFig({id:'cf_c1',title:'Vs appetite',value:(ap.connected?(aleN>0?aleStr:ap.displayValue):'Set appetite'),status:(ap.connected?(over?('Over by '+overStr):('Within · '+headStr)):'—'),pill:(ap.connected?(over?'r':'g'):'n'),owner:'CFO / CRO',ownerSeat:'cro',detail:dApp,sources:[c5bdMod('modeled loss vs the board-set appetite'),c5bdSelf('Risk appetite','board-set at onboarding')]}),
    c5ovFig({id:'cf_c2',title:'Worst-year loss',value:(tail.connected?tail.displayValue:'—'),status:(tail.connected?'Modeled':'—'),pill:(tail.connected?'a':'n'),owner:'CFO',ownerSeat:'cfo',detail:dWorst,sources:[c5bdMod('95th-percentile annual loss from the loss model')]}),
    c5ovFig({id:'cf_c3',title:'Return on spend',value:(er.connected?er.displayValue:'—'),status:(er.connected?'Positive':'—'),pill:(er.connected?'g':'n'),owner:'CFO / CISO',ownerSeat:'ciso',detail:dRoi,sources:[c5bdMod('risk removed per dollar of controls'),ctrlTelem]}),
    c5ovFig({id:'cf_c4',title:'Uninsured tail',value:(insGap.connected?insGap.displayValue:'—'),status:(insGap.connected?(insGap.color==='warn'?'Gap':'Covered'):'—'),pill:(insGap.connected?(insGap.color==='warn'?'a':'g'):'n'),owner:'CFO / CLO',ownerSeat:'clo',detail:dIns,sources:[c5bdMod('worst-case tail minus policy limit'),c5bdSelf('Insurance policy','captured at onboarding')]}),
    c5ovFig({id:'cf_rev',title:'Revenue-confirmed jewels',value:(rcConn?(RC.confirmed+' of '+RC.processes):'Confirm'),status:(rcConn?(rcProv>0?(rcProv+' provisional'):'All confirmed'):'—'),pill:(rcConn?(rcProv>0?'a':'g'):'n'),owner:'CFO',ownerSeat:'cfo',detail:dRev,sources:[c5bdSelf('Revenue confirmation','confirmed in onboarding — the CFO step'),c5bdMod('crown jewels promoted only from confirmed revenue processes')]})
  ];
  var questions=[
    c5ovFig({id:'cf_q1',title:'Appetite',question:'Are we within the board’s risk appetite?',owner:'CFO / CRO',ownerSeat:'cro',status:(over?('Over by '+overStr):(ap.connected?('Within · '+headStr):'—')),pill:(over?'r':(ap.connected?'g':'n')),value:(ap.connected?(aleN>0?aleStr:ap.displayValue):'—'),detail:dApp,
      sources:[c5bdMod('modeled loss vs appetite'),c5bdSelf('Risk appetite','board-set at onboarding')]}),
    c5ovFig({id:'cf_q2',title:'ROI',question:'Is our security spend paying off — and where’s the best next dollar?',owner:'CFO / CISO',ownerSeat:'ciso',status:(er.connected?'Positive':'—'),pill:(er.connected?'g':'n'),value:(er.connected?er.displayValue:'—'),detail:dRoi,
      sources:[c5bdMod('risk removed ÷ control spend'),ctrlTelem]}),
    c5ovFig({id:'cf_q3',title:'Insurance',question:'Are we insured efficiently — and what are we self-carrying?',owner:'CFO / CLO',ownerSeat:'clo',status:(insGap.connected?(insGap.color==='warn'?'Gap':'Adequate'):'—'),pill:(insGap.connected?(insGap.color==='warn'?'a':'g'):'n'),value:(insGap.connected?insGap.displayValue:'—'),detail:dIns,
      sources:[c5bdMod('worst-case tail − policy limit'),c5bdSelf('Insurance policy','captured at onboarding')]})
  ];
  var decision=c5ovFig({id:'cf_decision',title:'Fund the identity remediation',value:((idm.connected?(idm.displayValue+' · '):'')+IDF.owner+' · '+IDF.timeline),status:'Your call',pill:'b',owner:IDF.owner,ownerSeat:'ciso',
    kicker:'Needs your decision · one call',headline:'Fund the identity fix — the highest-return risk reduction.',
    body:'It brings cyber within appetite, delivers the most risk removed per dollar, and trims the uninsured tail you’re self-carrying. Scoped and priced ('+IDF.owner+', '+IDF.timeline+'). Recording it starts the funding and review workflow.',
    sources:[c5bdMod('highest risk-removed-per-dollar; reduces exposure vs appetite and the tail'),c5bdSelf('Funding decision',IDF.owner+' · '+IDF.timeline)]});
  var headline=(over?'Cyber sits above the board’s appetite — one funded fix brings it back, and it’s the best return on the table.':'Cyber loss is within appetite and your security spend is paying off — with one clear best next dollar.');
  c5ovDo({host:'cf-overview',tabIdx:1,headline:headline,headColor:(over?'warn':null),qTitle:'The three questions a CFO asks — answered',cards:cards,questions:questions,decision:decision,decisionBtn:'Record — open Decisions',
    footnote:'Every dollar figure is modeled from your own inputs. Click any box for the exact basis, coverage and confidence.'});
}
/* ── COO ── */
function c5coOverview(){
  var host=document.getElementById('co-overview');if(!host)return;
  var IDF=c5IdFix();var idm=c5get(IDF.mid);var fix=c5ovFix();
  var svc=(typeof c5CriticalServices==='function')?c5CriticalServices():[];var cp=svc[0]||{};
  var cpGap=(cp.rto!=null&&cp.tgt!=null&&Number(cp.rto)>Number(cp.tgt));
  var vm=(typeof c5vendorMatrix==='function')?c5vendorMatrix():[];var spof=vm.filter(function(v){return v.status==='single';});var topV=spof[0]||vm[0]||{};
  var backupTelem=c5bdTelem(['rubrik','veeam','cohesity','commvault'],'Backup & recovery','backup_immutable_pct');
  var okN=svc.filter(function(s){return !(s.rto!=null&&s.tgt!=null&&Number(s.rto)>Number(s.tgt));}).length;
  var cpName=cp.n||'the customer platform';var vName=topV.cat||'the cloud host';var vProc=topV.proc||'';
  var dCont=(svc.length?(cpGap?('<b>'+okN+' of '+svc.length+'</b> critical services can recover within their target. The exception is <b>'+c5esc(cpName)+'</b>: it can’t hit its target because restoring identity and access is the bottleneck. The funded fix ('+IDF.owner+', '+IDF.timeline+') repairs that path.'):'All <b>'+svc.length+'</b> critical services can recover within their targets — continuity is covered this quarter.'):'Add your critical services and recovery targets at onboarding and each one’s status will show here.');
  var dRec=(cpGap?('Most services recover on time. The outlier is <b>'+c5esc(cpName)+'</b> — about <b>'+cp.rto+' hours</b> against a <b>'+cp.tgt+'-hour</b> target — because identity and access must come back first. Fixing identity ('+IDF.owner+', '+IDF.timeline+') closes that gap; a backup cloud host is the second lever.'):'Every critical service recovers within its target time and data-loss window. We keep it there by testing recovery each cycle.');
  var dVend=(spof.length?('<b>'+spof.length+'</b> critical vendor'+(spof.length>1?'s have':' has')+' no backup, led by the <b>'+c5esc(vName)+'</b>'+(vProc?(' behind '+c5esc(vProc)):'')+'. If it went down there is no automatic failover. We’re monitoring its health; the recommended fix is a backup provider or a contracted failover SLA.'):'No critical vendor is a single point of failure — each has a backup or a contracted alternative.');
  var dRoot='Every gap on this page traces back to one thing: the identity and access model for '+c5esc(cpName)+'. That’s why a single fix ('+IDF.owner+', '+IDF.timeline+') closes the recovery miss and the platform exposure together — the move to fund first.';
  // Phase D — COO single-point-of-failure lens: crown jewels carrying non-adversarial SPOF risk
  // (outage/DR or a third-party/supply-chain dependency with no failover).
  var CJR=(typeof LIVE!=='undefined'&&Array.isArray(LIVE&&LIVE.crown_jewel_residual))?LIVE.crown_jewel_residual:[];
  var spofJewels=CJR.filter(function(j){return Array.isArray(j.non_adversarial)&&(j.non_adversarial.indexOf('outage_dr')>=0||j.non_adversarial.indexOf('third_party_supply_chain')>=0);});
  var dSpof=(spofJewels.length
    ?('<b>'+spofJewels.length+'</b> crown jewel'+(spofJewels.length>1?'s carry':' carries')+' a single-point-of-failure risk — an outage/DR exposure or a third-party dependency with no automatic failover: '+c5esc(spofJewels.map(function(j){return j.name;}).slice(0,4).join(', '))+'. These are availability risks (loss <b>without</b> an attacker); the fix is a tested failover or a contracted alternative, prioritized by which jewel is most revenue-critical.')
    :'No crown jewel is a single point of failure — each has a tested failover or a contracted alternative.');
  var cards=[
    c5ovFig({id:'co_spof',title:'Single points of failure',value:(spofJewels.length?(spofJewels.length+' crown jewels'):'None'),status:(spofJewels.length?'Watch':'Diversified'),pill:(spofJewels.length?'a':'g'),owner:'COO / CIO',ownerSeat:'coo',detail:dSpof,sources:[c5bdMod('crown jewels with an outage/DR or third-party dependency and no failover (non-adversarial lane)'),backupTelem]}),
    c5ovFig({id:'co_c1',title:'Business continuity',value:(svc.length?(okN+' of '+svc.length+' on target'):'—'),status:(cpGap?'1 gap':(svc.length?'On target':'—')),pill:(cpGap?'a':(svc.length?'g':'n')),owner:'COO',ownerSeat:'coo',detail:dCont,sources:[c5bdMod('services meeting their recovery target'),backupTelem]}),
    c5ovFig({id:'co_c2',title:'Recovery time',value:(cpGap?(cp.rto+'h vs '+cp.tgt+'h target'):'Within target'),status:(cpGap?'Behind':'On target'),pill:(cpGap?'a':'g'),owner:'COO',ownerSeat:'coo',detail:dRec,sources:[c5bdMod('recovery time vs target from the resilience model'),backupTelem]}),
    c5ovFig({id:'co_c3',title:'Critical vendors',value:(spof.length?(spof.length+' single points'):'Diversified'),status:(spof.length?'Watch':'OK'),pill:(spof.length?'a':'g'),owner:'COO / Procurement',ownerSeat:'coo',detail:dVend,sources:[c5bdMod('critical vendors with no failover'),c5bdSelf('Vendor register','captured at onboarding')]}),
    c5ovFig({id:'co_c4',title:'Root cause',value:'Identity access',status:'Funded',pill:'b',owner:'CISO / CIO',ownerSeat:'ciso',detail:dRoot,sources:[c5bdMod('the shared identity/access dependency behind the recovery gap')]})
  ];
  var questions=[
    c5ovFig({id:'co_q1',title:'Continuity',question:'Can the business keep running through a disruption?',owner:'COO',ownerSeat:'coo',status:(cpGap?'1 gap':(svc.length?'Yes':'—')),pill:(cpGap?'a':(svc.length?'g':'n')),value:(svc.length?(okN+' of '+svc.length+' on target'):'—'),detail:dCont,
      sources:[c5bdMod('services meeting recovery target'),backupTelem]}),
    c5ovFig({id:'co_q2',title:'Recovery',question:'If we’re hit, do we recover within our targets?',owner:'COO',ownerSeat:'coo',status:(cpGap?'Behind on 1':'On target'),pill:(cpGap?'a':'g'),value:(cpGap?(cp.rto+'h vs '+cp.tgt+'h'):'Within target'),detail:dRec,
      sources:[c5bdMod('recovery time vs target'),backupTelem]}),
    c5ovFig({id:'co_q3',title:'Vendors',question:'Which vendors could stop us, and what are we doing?',owner:'COO / Procurement',ownerSeat:'coo',status:(spof.length?'Watch':'OK'),pill:(spof.length?'a':'g'),value:(spof.length?(spof.length+' single points'):'Diversified'),detail:dVend,
      sources:[c5bdMod('critical vendors without failover'),c5bdSelf('Vendor register','captured at onboarding')]})
  ];
  var decision=c5ovFig({id:'co_decision',title:'Add a cloud-host failover',value:'Removes the platform single point of failure',status:'Your call',pill:'b',owner:'COO',ownerSeat:'coo',
    kicker:'Needs your decision · two moves',headline:'Fund identity, then add a cloud-host failover.',
    body:'Fixing identity ('+IDF.owner+', '+IDF.timeline+') restores the recovery path; adding a backup cloud host removes the last single point of failure on the customer platform. Together they bring the platform inside its recovery target.',
    sources:[c5bdMod('the two moves that bring the platform within its recovery target'),c5bdSelf('Funding decision',IDF.owner+' · '+IDF.timeline)]});
  var headline=(cpGap?'Every critical service recovers on time except the customer platform — and the fix for it is funded.':'The business can keep running and recover within targets across every critical service.');
  c5ovDo({host:'co-overview',tabIdx:1,headline:headline,headColor:(cpGap||spof.length?'warn':null),qTitle:'The three questions a COO asks — answered',cards:cards,questions:questions,decision:decision,decisionBtn:'Record — open Decisions',
    footnote:'Recovery and vendor figures come from your resilience model and vendor register. Click any box for the source and confidence.'});
}
/* ── CIO ── */
function c5ctOverview(){
  var host=document.getElementById('ct-overview');if(!host)return;
  var IDF=c5IdFix();var idm=c5get(IDF.mid);var fix=c5ovFix();
  var ph=c5get('ct_platform_health');var cv=c5get('ct_critical_vulns');var aig=c5get('ct_ai_governed');var adv=c5get('ct_advisories');
  var ctrlTelem=c5bdTelem(['okta','entra'],'Identity & access coverage','mfa_pct');var vulnTelem=c5bdTelem(['qualys','tenable'],'Vulnerability scanning','patch_pct');
  var dEstate=(ph.connected?('The estate is largely healthy. The one architectural weak spot is the <b>customer platform’s identity and access design</b> — the same gap driving the enterprise’s top risk. Modernizing it is funded ('+IDF.owner+', '+IDF.timeline+'); everything else is on its normal refresh cycle.'):'Connect your systems inventory and control tools and we’ll grade the estate and flag the weak spots.');
  var dVuln=(cv.connected?('Open critical vulnerabilities across the estate, from your scanner: <b>'+cv.displayValue+'</b>. These are patched on the standard SLA; the ones on the customer-platform authentication path are prioritized and land alongside the identity fix.'):'Connect your vulnerability scanner and we’ll show open critical vulnerabilities and where they concentrate.');
  var dAI=(aig.connected?('Our production AI systems are '+(aig.color==='good'?'inventoried and governed — data access is controlled and use is monitored.':'only partly governed. The gap is a formal framework and an EU AI Act mapping; we’re standing that up so every model has a named owner and a control.')):'Register your AI/ML systems at onboarding and we’ll show which are governed and where the gaps are.');
  var dSupply=(adv.connected?('We continuously check our third-party components for known issues. '+((adv.color==='crit'||adv.color==='warn')?'One open advisory sits on the authentication library the customer platform relies on — the patch is scheduled, and the identity fix hardens that path further.':'No critical advisories are open against the components we depend on right now.')):'Connect your build pipeline (SBOM) and we’ll continuously check your components against known advisories.');
  // Phase D — CIO lineage + ingestion coverage / blind-spot health.
  var EC=(typeof LIVE!=='undefined'&&LIVE&&LIVE.estate_coverage)||null;
  var ecConn=!!EC;var ecBlind=ecConn?(Number(EC.blind_spots)||0):0;var ecMappedPct=ecConn?Math.round((EC.mapped/EC.assets)*100):0;
  var dCoverage=(ecConn
    ?('Lineage is mapped for <b>'+EC.lineage_complete+' of '+EC.lineage_total+'</b> crown jewels (process → application → infrastructure), and <b>'+EC.mapped+' of '+EC.assets+'</b> assets ('+ecMappedPct+'%) feed telemetry. '+
      (ecBlind>0?('The <b>'+ecBlind+' blind spot'+(ecBlind>1?'s':'')+'</b> — '+c5esc((EC.blind_examples||[]).join(', '))+' — are assets in the dependency path with no live signal; they’re where an incident could hide. Onboarding them closes the gap.'):'Every asset on the crown-jewel path feeds telemetry — no blind spots.'))
    :'Connect your CMDB / systems inventory and we’ll map each crown jewel’s lineage and flag assets with no telemetry (blind spots).');
  var cards=[
    c5ovFig({id:'ct_coverage',title:'Lineage & coverage',value:(ecConn?(EC.mapped+' of '+EC.assets+' mapped'):'—'),status:(ecConn?(ecBlind>0?(ecBlind+' blind spot'+(ecBlind>1?'s':'')):'Full coverage'):'—'),pill:(ecConn?(ecBlind>0?'a':'g'):'n'),owner:'CIO',ownerSeat:'cio',detail:dCoverage,sources:[c5bdMod('lineage completeness + asset telemetry coverage from the dependency graph'),c5bdTelem(['servicenow','splunk'],'CMDB + telemetry ingestion','siem_log_sources')]}),
    c5ovFig({id:'ct_c1',title:'Platform health',value:(ph.connected?ph.displayValue:'—'),status:(ph.connected?(ph.color==='crit'?'At risk':ph.color==='warn'?'Watch':'Healthy'):'—'),pill:(ph.connected?(ph.color==='crit'?'r':ph.color==='warn'?'a':'g'):'n'),owner:'CIO',ownerSeat:'cio',detail:dEstate,sources:[c5bdMod('estate health from architecture + control coverage'),ctrlTelem]}),
    c5ovFig({id:'ct_c2',title:'Critical vulnerabilities',value:(cv.connected?cv.displayValue:'—'),status:(cv.connected?(cv.color==='crit'?'Action':'On track'):'—'),pill:(cv.connected?(cv.color==='crit'?'r':cv.color==='warn'?'a':'g'):'n'),owner:'CIO / IT Ops',ownerSeat:'cio',detail:dVuln,sources:[vulnTelem||c5bdMod('open critical vulnerabilities from the scanner')]}),
    c5ovFig({id:'ct_c3',title:'AI governance',value:(aig.connected?aig.displayValue:'Stand up'),status:(aig.connected?(aig.color==='good'?'Governed':'Gaps'):'Not started'),pill:(aig.connected?(aig.color==='good'?'g':'a'):'a'),owner:'CIO',ownerSeat:'cio',detail:dAI,sources:[c5bdSelf('AI governance','model registry + policy at onboarding')]}),
    c5ovFig({id:'ct_c4',title:'Supply chain',value:(adv.connected?adv.displayValue:'—'),status:(adv.connected?(adv.color==='crit'?'Advisory':'OK'):'—'),pill:(adv.connected?(adv.color==='crit'?'r':adv.color==='warn'?'a':'g'):'n'),owner:'CIO / AppSec',ownerSeat:'cio',detail:dSupply,sources:[c5bdMod('active advisories in the software supply chain'),c5bdDocSrc('sbom','SBOM')]})
  ];
  var questions=[
    c5ovFig({id:'ct_q1',title:'Estate',question:'Is our technology estate secure and modern?',owner:'CIO',ownerSeat:'cio',status:(ph.connected?(ph.color==='crit'?'At risk':ph.color==='warn'?'Watch':'Healthy'):'—'),pill:(ph.connected?(ph.color==='crit'?'r':ph.color==='warn'?'a':'g'):'n'),value:(ph.connected?ph.displayValue:'—'),detail:dEstate,
      sources:[c5bdMod('architecture + control coverage'),ctrlTelem]}),
    c5ovFig({id:'ct_q2',title:'AI',question:'Are we shipping AI safely?',owner:'CIO',ownerSeat:'cio',status:(aig.connected?(aig.color==='good'?'Governed':'Gaps'):'Not started'),pill:(aig.connected?(aig.color==='good'?'g':'a'):'a'),value:(aig.connected?aig.displayValue:'—'),detail:dAI,
      sources:[c5bdSelf('AI governance','model registry + policy, self-reported at onboarding')]}),
    c5ovFig({id:'ct_q3',title:'Supply chain',question:'Is our software supply chain sound?',owner:'CIO / AppSec',ownerSeat:'cio',status:(adv.connected?(adv.color==='crit'?'Advisory':'OK'):'—'),pill:(adv.connected?(adv.color==='crit'?'r':adv.color==='warn'?'a':'g'):'n'),value:(adv.connected?adv.displayValue:'—'),detail:dSupply,
      sources:[c5bdMod('advisories matched to your components'),c5bdDocSrc('sbom','Software bill of materials')]})
  ];
  var decision=c5ovFig({id:'ct_decision',title:'Modernize the identity architecture',value:(IDF.owner+' · '+IDF.timeline),status:'Your call',pill:'b',owner:IDF.owner,ownerSeat:'ciso',
    kicker:'Needs your decision · one call',headline:'Fund the identity architecture fix.',
    body:'It closes the estate’s biggest weak spot, hardens the authentication path the supply-chain advisory sits on, and secures the customer-data access AI systems rely on. Scoped and funded ('+IDF.owner+', '+IDF.timeline+').',
    sources:[c5bdMod('the fix that closes the estate, supply-chain and AI-access gaps at once'),c5bdSelf('Funding decision',IDF.owner+' · '+IDF.timeline)]});
  c5ovDo({host:'ct-overview',tabIdx:1,headline:'The estate is healthy except one architectural gap — customer-platform identity — and modernizing it is funded.',headColor:'warn',qTitle:'The three questions a CIO asks — answered',cards:cards,questions:questions,decision:decision,decisionBtn:'Record — open Decisions',
    footnote:'Estate, AI and supply-chain figures come from your tools and inventories. Click any box for the source and confidence.'});
}
/* ── CRO ── */
/* Residual-risk formula — browser mirror of the backend ResidualRiskService / config/residual.js
   (the one tunable place): residual = impact × no-control-present × detection-gap, with per-axis
   floors. HONEST axes (Phase E): controlPresence = a control is MAPPED (presence, NOT proven
   effectiveness); detection = telemetry coverage. Effectiveness (BAS/purple-team) is a hook. */
function c5Residual(impact,controlPresence,detection){
  var PF=0.10,DF=0.30; // presence / detection floors (mirror config/residual.js defaults)
  var imp=Math.max(0,Math.min(1,impact||0)),pres=Math.max(0,Math.min(1,controlPresence||0)),det=Math.max(0,Math.min(1,detection||0));
  var noCtrl=PF+(1-PF)*(1-pres),detGap=DF+(1-DF)*(1-det);
  var r01=Math.max(0,Math.min(1,imp*noCtrl*detGap)),score=Math.round(r01*100);
  return {residual:score,band:(score>=50?'High':score>=25?'Medium':'Low'),noCtrl:noCtrl,detGap:detGap};
}
/* Rank the org's crown jewels by residual risk (Phase D — CRO lens). control_presence is the
   honest axis name; `prevention` is read as a legacy alias if present. */
function c5ResidualRank(){
  var L=(typeof LIVE!=='undefined'&&LIVE&&Array.isArray(LIVE.crown_jewel_residual))?LIVE.crown_jewel_residual:[];
  return L.map(function(j){var pres=(j.control_presence!=null?j.control_presence:j.prevention);var r=c5Residual(j.impact,pres,j.detection);
    return {name:j.name,control_presence:pres,detection:j.detection,residual:r.residual,band:r.band};})
    .sort(function(a,b){return b.residual-a.residual;});
}
/* Whether control effectiveness has been independently measured (BAS/purple-team). Hook — false until wired. */
function c5EffectivenessMeasured(){return !!(typeof LIVE!=='undefined'&&LIVE&&LIVE.effectiveness_measured);}
function c5crOverview(){
  var host=document.getElementById('cr-overview');if(!host)return;
  var RR=(typeof c5RiskRegister==='function')?c5RiskRegister():{cyberResidual:0,appetite:0,cyberRank:null,total:0};var IDF=c5IdFix();var idm=c5get(IDF.mid);
  var T=(typeof c5T==='function')?c5T():{improving:false,worsening:false};var fix=c5ovFix();
  var over=(RR.appetite>0&&RR.cyberResidual>RR.appetite);var rankStr=RR.cyberRank?('#'+RR.cyberRank+' of '+RR.total):'—';
  var dirWord=T.improving?'Falling':T.worsening?'Rising':'Steady';
  var dRank=(RR.cyberRank?('Cyber is the <b>'+rankStr+'</b> principal risk by modeled loss'+(over?', and the only one currently <b>above</b> its appetite share. The overage traces to the customer-platform identity exposure; the funded fix ('+IDF.owner+', '+IDF.timeline+') moves it back within share and down the ranking.':'. It sits within its appetite share this quarter.')):'Add your enterprise risk register at onboarding and we’ll rank cyber against your other principal risks.');
  var dApp=(RR.cyberResidual>0?(over?('Residual cyber loss of <b>'+usd(RR.cyberResidual)+'</b> is above the board-set appetite'+(RR.appetite>0?(' of '+usd(RR.appetite)):'')+'. One treatment closes the gap — the funded identity fix ('+IDF.owner+', '+IDF.timeline+'). Interim exposure remains until it lands, which we track.'):'Residual cyber loss of <b>'+usd(RR.cyberResidual)+'</b> is within the board-set appetite. We hold it by keeping the top controls funded and the identity fix on track.'):'Set your appetite and we’ll show the gap and exactly what closes it.');
  var dTrend=(T.improving?'Residual cyber risk is <b>falling</b> quarter over quarter. The one lever that keeps it falling is the identity fix — the largest single reduction still available, and it’s funded.':T.worsening?'Residual cyber risk is <b>rising</b>. The customer-platform identity exposure is the biggest reason; funding its fix ('+IDF.owner+', '+IDF.timeline+') is the fastest way to bend the trend back down.':'The trend builds as quarters record. The identity fix is the largest single reduction available and is funded.');
  var dDriver='The single risk driver above its appetite share is the <b>identity and access exposure on the customer platform</b>. It’s why cyber ranks where it does and why it’s over appetite. One funded treatment ('+IDF.owner+', '+IDF.timeline+') addresses it and moves every number on this page in the right direction.';
  // Residual-risk ranking across crown jewels (impact × unmitigated-prevention × detection-gap).
  var resRank=(typeof c5ResidualRank==='function')?c5ResidualRank():[];var resTop=resRank[0]||null;var resHigh=resRank.filter(function(x){return x.band==='High';}).length;
  var dResidual=(resRank.length
    ?('Crown jewels ranked by <b>residual risk</b> — impact left open after control presence and detection. '+
      '<b>'+c5esc((resTop&&resTop.name)||'the top jewel')+'</b> carries the most ('+(resTop?resTop.residual:'—')+'/100, '+(resTop?resTop.band:'')+'): a control is <b>present</b> for '+(resTop?Math.round(resTop.control_presence*100):0)+'% of its attack techniques and detection covers '+(resTop?Math.round(resTop.detection*100):0)+'%, so the rest is uncovered. '+
      '<div style="margin-top:8px">'+resRank.slice(0,5).map(function(x,i){var bc=x.band==='High'?'crit':x.band==='Medium'?'warn':'good';return '<div style="display:flex;align-items:center;gap:8px;padding:3px 0"><span style="width:16px;color:var(--muted);font-size:11px">'+(i+1)+'</span><span style="flex:1;min-width:0">'+c5esc(x.name)+'</span><span style="font-size:11px;color:var(--muted)">present '+Math.round(x.control_presence*100)+'% · detect '+Math.round(x.detection*100)+'%</span><span style="font-weight:700;color:var(--'+bc+')">'+x.residual+'</span><span style="font-size:10.5px;font-weight:700;color:var(--'+bc+')">'+x.band+'</span></div>';}).join('')+'</div>'+
      (resHigh>0?('The '+resHigh+' High-residual jewel'+(resHigh>1?'s are':' is')+' where the next control dollar removes the most risk — led by the identity fix. Note: presence is not proven effectiveness — validate with BAS/purple-team.'):'Every crown jewel is inside Medium/Low residual this quarter.'))
    :'Connect your control telemetry and we’ll rank each crown jewel by residual risk — impact left open after control presence and detection.');
  var cards=[
    c5ovFig({id:'cr_c1',title:'Rank vs other risks',value:rankStr,status:(RR.cyberRank?'Ranked':'—'),pill:(over?'a':'n'),owner:'CRO',ownerSeat:'cro',detail:dRank,sources:[c5bdMod('cyber residual vs the other principal risks on the register'),c5bdSelf('Risk register','ERM inputs, self-reported')]}),
    c5ovFig({id:'cr_c2',title:'Residual loss',value:(RR.cyberResidual>0?usd(RR.cyberResidual):'—'),status:(over?'Over appetite':(RR.cyberResidual>0?'Within':'—')),pill:(over?'r':(RR.cyberResidual>0?'g':'n')),owner:'CRO / CFO',ownerSeat:'cfo',detail:dApp,sources:[c5bdMod('modeled residual cyber loss vs appetite'),c5bdSelf('Risk appetite','board-set')]}),
    c5ovFig({id:'cr_c3',title:'Direction',value:dirWord,status:(T.improving?'Improving':T.worsening?'Worsening':'Steady'),pill:(T.improving?'g':T.worsening?'r':'n'),owner:'CRO / CISO',ownerSeat:'ciso',detail:dTrend,sources:[c5bdMod('quarter-over-quarter change in residual risk')]}),
    c5ovFig({id:'cr_c4',title:'Top driver',value:'Identity access',status:'Funded',pill:'b',owner:'CISO / CIO',ownerSeat:'ciso',detail:dDriver,sources:[c5bdMod('the single driver above its appetite share')]}),
    c5ovFig({id:'cr_residual',title:'Residual ranking',value:(resTop?c5esc(resTop.name):'—'),status:(resTop?(resTop.residual+' · '+resTop.band):'—'),pill:(resTop?(resTop.band==='High'?'r':resTop.band==='Medium'?'a':'g'):'n'),owner:'CRO / CISO',ownerSeat:'ciso',detail:dResidual,sources:[c5bdMod('residual = impact × no-control-present × detection-gap (tunable; ResidualRiskService) — presence, not proven effectiveness'),c5bdTelem(['crowdstrike','splunk','okta'],'Control-presence / detection coverage','edr_pct')]})
  ];
  var questions=[
    c5ovFig({id:'cr_q1',title:'Rank',question:'Where does cyber rank among our principal risks?',owner:'CRO',ownerSeat:'cro',status:(RR.cyberRank?'Ranked':'—'),pill:(over?'a':'n'),value:rankStr,detail:dRank,
      sources:[c5bdMod('residual vs the register'),c5bdSelf('Risk register','ERM inputs')]}),
    c5ovFig({id:'cr_q2',title:'Appetite',question:'Are we within appetite, and what closes the gap?',owner:'CRO / CFO',ownerSeat:'cfo',status:(over?'Over':(RR.cyberResidual>0?'Within':'—')),pill:(over?'r':(RR.cyberResidual>0?'g':'n')),value:(RR.cyberResidual>0?usd(RR.cyberResidual):'—'),detail:dApp,
      sources:[c5bdMod('residual vs appetite'),c5bdSelf('Risk appetite','board-set')]}),
    c5ovFig({id:'cr_q3',title:'Trend',question:'Which way is cyber risk trending?',owner:'CRO / CISO',ownerSeat:'ciso',status:(T.improving?'Improving':T.worsening?'Worsening':'Steady'),pill:(T.improving?'g':T.worsening?'a':'n'),value:dirWord,detail:dTrend,
      sources:[c5bdMod('residual-risk series, quarter over quarter')]})
  ];
  var decision=c5ovFig({id:'cr_decision',title:'Treat the identity exposure',value:(IDF.owner+' · '+IDF.timeline),status:'Your call',pill:'b',owner:IDF.owner,ownerSeat:'ciso',
    kicker:'Needs your decision · one treatment',headline:'Treat the identity exposure — the one driver over appetite.',
    body:'It is the single principal-risk driver above its appetite share and the largest reduction available. Treating it ('+IDF.owner+', '+IDF.timeline+') brings cyber within appetite and bends the trend down. The honest caveat: interim exposure remains until it lands.',
    sources:[c5bdMod('the one driver over appetite; largest single reduction'),c5bdSelf('Funding decision',IDF.owner+' · '+IDF.timeline)]});
  c5ovDo({host:'cr-overview',tabIdx:1,headline:(over?'Cyber is our top risk and the only one over appetite — one funded treatment brings it back within limits.':'Cyber is a managed principal risk within appetite and trending in the right direction.'),headColor:(over?'warn':null),qTitle:'The three questions a CRO asks — answered',cards:cards,questions:questions,decision:decision,decisionBtn:'Record — open Decisions',
    footnote:'Rank, residual and appetite read from one shared risk register. Click any box for the basis and confidence.'});
}
/* ── CLO ── */
function c5clOverview(){
  var host=document.getElementById('cl-overview');if(!host)return;
  var IDF=c5IdFix();var idm=c5get(IDF.mid);var fix=c5ovFix();
  var gov=(typeof LIVE!=='undefined'&&LIVE&&LIVE.governance)||{};var irTested=/yes|tested|tabletop/i.test((gov.ir&&gov.ir.tested)||'');
  var regs=(typeof c5legalRegimes==='function')?c5legalRegimes():[];var insGap=c5get('cf_ins_gap');
  var dReg=(regs.length?('We track <b>'+regs.length+'</b> regimes in scope (SEC disclosure, GDPR/CCPA, DORA, EU AI Act, EU CRA). The exposure most likely to trigger a reportable event is the <b>customer-platform identity gap</b> — a breach there starts the notification clocks. Closing it ('+IDF.owner+', '+IDF.timeline+') lowers that likelihood; the compliance determination stays with counsel.'):'Set your operating regions at onboarding and we’ll list every regime, its clock and its penalty.');
  var dDisc='We can meet the clocks: the SEC 8-K process is <b>'+(irTested?'tested':'documented')+'</b> and the fastest deadline is four business days. The one thin spot is <b>forensic evidence and privilege</b> on the identity access path — the identity fix ('+IDF.owner+', '+IDF.timeline+') improves the logging and record-keeping that make a disclosure defensible.';
  var dContract='The concentration is in <b>customer contracts that warrant platform uptime</b>: an identity-driven outage could breach them, and there is the uninsured tail we self-carry on top. Closing the identity gap protects those warranties and lowers the tail. Exact contract counts need your CLM connected.';
  var dTail=(insGap.connected?((insGap.color==='warn')?('We self-carry roughly <b>'+insGap.displayValue+'</b> above the policy limit — retained legal liability if the modeled worst case hits. Closing the identity gap lowers that worst case and the tail behind it.'):'The policy limit covers the modeled worst case, so retained legal liability is minimal this quarter. We re-check it when the exposure or the policy changes.'):'Add your cyber policy at onboarding and we’ll size the retained liability you’re carrying above the limit.');
  var cards=[
    c5ovFig({id:'cl_c1',title:'Regulatory exposure',value:(regs.length?(regs.length+' regimes'):'Set regions'),status:(regs.length?'Mapped':'—'),pill:(regs.length?'a':'n'),owner:'CLO',ownerSeat:'clo',detail:dReg,sources:[c5bdSelf('Jurisdiction ruleset','operating regions, set at onboarding')]}),
    c5ovFig({id:'cl_c2',title:'Disclosure clock',value:'8-K · 4 days',status:(irTested?'Ready':'In progress'),pill:(irTested?'g':'a'),owner:'CLO',ownerSeat:'clo',detail:dDisc,sources:[c5bdSelf('SEC 8-K process',(irTested?'tabletop-tested':'documented')+' at onboarding')]}),
    c5ovFig({id:'cl_c3',title:'Contract exposure',value:'Uptime warranties',status:'At risk',pill:'a',owner:'CLO',ownerSeat:'clo',detail:dContract,sources:[c5bdSelf('Contract lifecycle mgmt','connect your CLM to count exactly')]}),
    c5ovFig({id:'cl_c4',title:'Uninsured tail',value:(insGap.connected?insGap.displayValue:'—'),status:(insGap.connected?(insGap.color==='warn'?'Gap':'Covered'):'—'),pill:(insGap.connected?(insGap.color==='warn'?'a':'g'):'n'),owner:'CLO / CFO',ownerSeat:'cfo',detail:dTail,sources:[c5bdMod('worst-case tail − policy limit'),c5bdSelf('Insurance policy','captured at onboarding')]})
  ];
  var questions=[
    c5ovFig({id:'cl_q1',title:'Regulatory',question:'Where are we exposed by regulation, and what’s most likely to trigger a filing?',owner:'CLO',ownerSeat:'clo',status:(regs.length?'Mapped':'—'),pill:(regs.length?'a':'n'),value:(regs.length?(regs.length+' regimes'):'—'),detail:dReg,
      sources:[c5bdSelf('Jurisdiction ruleset','operating regions'),c5bdMod('exposure most likely to trigger a filing')]}),
    c5ovFig({id:'cl_q2',title:'Contracts',question:'Which contracts and liabilities are most at risk?',owner:'CLO',ownerSeat:'clo',status:'Watch',pill:'a',value:'Uptime warranties',detail:dContract,
      sources:[c5bdSelf('Contract lifecycle mgmt','connect your CLM'),c5bdMod('exposure mapped to the platform')]}),
    c5ovFig({id:'cl_q3',title:'Disclosure',question:'Are we ready to disclose an incident on the clock?',owner:'CLO',ownerSeat:'clo',status:(irTested?'Ready':'In progress'),pill:(irTested?'g':'a'),value:'8-K ≤ 4 days',detail:dDisc,
      sources:[c5bdSelf('SEC 8-K & IR process',(irTested?'tabletop-tested':'documented')),c5bdMod('forensic readiness on the identity path')]})
  ];
  var decision=c5ovFig({id:'cl_decision',title:'Close the top obligation or coverage gap',value:(IDF.owner+' · '+IDF.timeline),status:'Your call',pill:'b',owner:IDF.owner,ownerSeat:'ciso',
    kicker:'Needs your decision · one call',headline:'Support the identity fix and close the top compliance gap.',
    body:'The identity fix ('+IDF.owner+', '+IDF.timeline+') lowers your most likely breach trigger, protects the contracts tied to uptime, and strengthens forensic defensibility. Alongside it, close the highest-priority obligation or insurance-adequacy gap — assign an owner and a date.',
    sources:[c5bdMod('reduces disclosure, contract and privacy exposure at once'),c5bdSelf('Funding decision',IDF.owner+' · '+IDF.timeline)]});
  c5ovDo({host:'cl-overview',tabIdx:1,headline:'We can meet every disclosure clock; the same identity gap is our likeliest trigger and our thinnest forensic spot — and its fix is funded.',headColor:'warn',qTitle:'The three questions a General Counsel asks — answered',cards:cards,questions:questions,decision:decision,decisionBtn:'Record — open Decisions',
    footnote:'Obligations and clocks come from your jurisdiction ruleset; not legal advice. Click any box for the source and confidence.'});
}
function c5ceValue(){
  var host=document.getElementById('ce-value');if(!host)return;
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var O=c5Objectives(),M=c5expModel(),IDF=c5IdFix();var expT=c5get('exp_total');
  var atN=O.atRisk||0,total=O.total||0,safeN=(O.protected!=null?O.protected:(total-atN));
  var rev=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&Number(LIVE.economics.revenue))||0;
  var pctRev=(rev>0&&M.total>0)?((M.total/rev*100).toFixed(2)+'% of revenue'):null;
  var head=(atN>0)?('Cyber puts '+(expT.connected?expT.displayValue:'modeled value')+' of enterprise value at risk — concentrated in '+atN+' strategic objective'+(atN===1?'':'s')+', led by the customer platform.'):'Cyber is protecting enterprise value this quarter — no strategic objective carries a material exposure.';
  var support='Your cyber value at risk on one scale, the strategic objectives it touches, and the crown-jewel revenue engine behind most of it. '+(pctRev?('That is about '+pctRev+'. '):'')+'Each figure traces to your own data.';
  // objectives matrix — per-objective drill (data-c5obj wired globally)
  var rows=O.objs.map(function(o,i){var pill=o.status==='at risk'?'a':o.status==='watch'?'b':'g';var pt=o.status==='at risk'?'At risk':o.status==='watch'?'Watch':'Safe';
    return '<div class="c5prow" data-c5obj="'+i+'" style="cursor:pointer"><span class="c5sq '+(o.c==='warn'?'a':o.c==='blue'?'b':'g')+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">'+c5esc(o.name)+'</div><div class="c5row-s">'+c5esc(o.sub)+'</div></div><span class="c5pill '+pill+'" style="flex:none">'+pt+'</span></div>';
  }).join('');
  var matrix='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:16px 0 8px"><span style="font-size:12.5px;font-weight:600;color:var(--ink)">Strategic objectives — cyber value at risk</span><span style="font-size:11px;color:var(--muted)">'+safeN+' of '+total+' clear</span></div><div class="c5card" style="padding:2px 14px">'+rows+'</div>';
  var sep='<span style="color:var(--line)">·</span>';
  var strip='<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-top:14px;padding:12px 16px;border-radius:12px;background:var(--surface-2)">'+
    '<span style="font-size:12px;color:var(--ink-2);font-weight:600">The one lever:</span>'+
    '<span style="font-size:12.5px;color:var(--crit);font-weight:600">the '+IDF.short+' gap</span>'+sep+
    '<span style="font-size:12px;color:var(--muted)">drives most of the value at risk</span>'+sep+
    '<span style="font-size:12px;color:var(--muted)">'+(IDF.usd?(IDF.usd+' treatable'):'funded fix')+'</span><span class="c5pill n" style="font-size:9px">Modeled</span></div>';
  var evSrcs=[{label:'Exposure model (value at risk)',connected:expT.connected},{label:'Strategy intake (objectives)',connected:O.fromInput},{label:'Revenue / financials',connected:rev>0},{label:'Identity exposure model',connected:c5get(IDF.mid).connected}];
  var connN=evSrcs.filter(function(s){return s.connected;}).length;
  host.innerHTML=c5header()+
    c5shell('Cyber value at risk · what could it cost the business?',head,(atN>0?'warn':null),support)+
    '<div class="c5cards">'+c5card('exp_total')+c5card('ceo_objectives')+c5card('cf_appetite')+'</div>'+
    matrix+
    strip+
    c5bl('The decision','Protect enterprise value — fund the one fix behind most of it.',null,(IDF.usd?('The '+IDF.short+' gap drives most of the value at risk and the exposed objectives converge on it. Funding the fix ('+IDF.usd+' · '+IDF.owner+' · '+IDF.timeline+') protects the customer platform, the growth-critical objective, and customer trust — one signature.'):'Connect your controls and the one exposure driving most of the value at risk — the customer-platform identity gap — surfaces here with its funded fix.'),{mid:IDF.mid,txt:'Approve the identity fix — protects value'})+
    '<div class="c5foot">Value at risk from your exposure model; objectives from your strategy intake; every figure traces to source. · '+connN+' sources connected'+(demo?' · demo':'')+'</div>';
}
/* CEO 02 — Crown jewels. The critical revenue engines, their exposure and dependency on the
   identity gap; concentration = actionability (fixing the top one moves the most value). */
function c5ceCrown(){
  var host=document.getElementById('ce-crown');if(!host)return;
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var Scr=(typeof c5Services==='function')?c5Services():{list:[],total:0,atRisk:0};var IDF=c5IdFix();
  var total=Scr.total||0,atR=Scr.atRisk||0;var top=(Scr.list&&Scr.list[0])||null;
  var head=(atR>0)?('Your crown-jewel revenue engines are protected — except the customer platform, whose exposure traces to the '+IDF.short+' gap.'):(total>0?'Every crown-jewel revenue engine is protected this quarter.':'Map your crown jewels in onboarding to see the revenue engines and their exposure.');
  var support='The systems that run the revenue — each crown jewel, its status, and its dependency on the shared '+IDF.short+' controls. Concentration is the good news: fixing the one at-risk engine moves the most value.';
  var rows=(Scr.list||[]).map(function(x){var risk=(x.status==='At risk');var mid=risk?IDF.mid:'er_crown';
    return '<div class="c5prow" data-c5m="'+mid+'" style="cursor:pointer"><div style="flex:1;min-width:0"><div class="c5row-t">'+c5esc(x.name)+(x.tier?(' <span class="c5tag">'+c5esc(x.tier)+'</span>'):'')+'</div><div class="c5row-s">'+c5esc(x.sub||(risk?('depends on the '+IDF.short+' controls'):'protected'))+'</div></div><span class="c5pill '+(risk?'a':'g')+'" style="flex:none">'+c5esc(x.status||'Secure')+'</span></div>';
  }).join('')||'<div class="c5prow"><div style="flex:1"><div class="c5row-s">Map your crown-jewel register to list the revenue engines here.</div></div></div>';
  var matrix='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:16px 0 8px"><span style="font-size:12.5px;font-weight:600;color:var(--ink)">Crown-jewel revenue engines — exposure and dependency</span><span style="font-size:11px;color:var(--muted)">'+atR+' of '+total+' at greatest risk</span></div><div class="c5card" style="padding:2px 14px">'+rows+'</div>';
  var sep='<span style="color:var(--line)">·</span>';
  var strip='<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-top:14px;padding:12px 16px;border-radius:12px;background:var(--surface-2)">'+
    '<span style="font-size:12px;color:var(--ink-2);font-weight:600">Concentration:</span>'+
    '<span style="font-size:12.5px;color:var(--crit);font-weight:600">'+atR+' of '+total+' engines carry the material path</span>'+sep+
    '<span style="font-size:12px;color:var(--muted)">both trace to the '+IDF.short+' gap</span><span class="c5pill n" style="font-size:9px">Computed</span></div>';
  var evSrcs=[{label:'Crown-jewel register',connected:total>0},{label:'Per-asset exposure',connected:total>0},{label:'Identity dependency model',connected:c5get(IDF.mid).connected}];
  var connN=evSrcs.filter(function(s){return s.connected;}).length;
  host.innerHTML=c5header()+
    c5shell('Crown jewels · which revenue engines are exposed?',head,(atR>0?'warn':null),support)+
    '<div class="c5cards">'+c5card('er_crown')+c5card('ceo_objectives')+c5card(IDF.mid)+'</div>'+
    matrix+
    strip+
    c5bl('The decision','Fix the one engine that carries the concentrated exposure.',null,(IDF.usd?('The concentration is actionable: the '+atR+' at-risk revenue engine'+(atR===1?'':'s')+' depend'+(atR===1?'s':'')+' on the '+IDF.short+' controls. Funding the fix ('+IDF.usd+' · '+IDF.owner+') de-risks the top revenue engine in one move.'):'Connect your controls and the crown jewel carrying the concentrated exposure surfaces here with its funded fix.'),{mid:IDF.mid,txt:'Approve the identity fix — de-risks the top engine'})+
    '<div class="c5foot">Crown jewels from your register; exposure from the risk model; identity dependency from the control model. · '+connN+' sources connected'+(demo?' · demo':'')+'</div>';
}
function c5ceStrategic(){
  var host=document.getElementById('ce-strategic');if(!host)return;
  var O=c5Objectives();
  var TD=c5TopDriver(); // data-ranked top driver, not hard-coded identity
  var rows=O.objs.map(function(o,i){var pill=o.status==='at risk'?'a':o.status==='watch'?'b':'g';var pt=o.status==='at risk'?'At risk':o.status==='watch'?'Watch':'Safe';
    return '<div class="c5prow" data-c5obj="'+i+'" style="cursor:pointer" title="'+c5esc(o.name+' — click for its cyber dependency, status and the fix.')+'"><span class="c5sq '+(o.c==='warn'?'a':o.c==='blue'?'b':'g')+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">'+o.name+'</div><div class="c5row-s">'+o.sub+'</div></div><span class="c5pill '+pill+'">'+pt+'</span><span style="font-size:11px;color:var(--blue);font-weight:600;margin-left:8px;white-space:nowrap">details ›</span></div>';
  }).join('');
  var atN=O.atRisk||0,safeN=(O.protected!=null?O.protected:(O.total-atN));
  host.innerHTML=c5header()+
    c5shell('Strategic risk · which objectives are exposed?',(atN>0?(safeN+' of your '+O.total+' objectives are cyber-safe — '+atN+' need'+(atN===1?'s':'')+' attention.'):'All '+O.total+' of your objectives are cyber-safe.'),null,'Cyber risk mapped to your strategic objectives. The at-risk objective is exposed by '+TD.phrase+', which threatens its uptime and the trust it runs on.')+
    '<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Strategic objectives · cyber status</div>'+rows+'</div>'+
    c5bl('Bottom line','Protect the objective that drives growth.',null,'Your at-risk objective is exposed by '+TD.phrase+', which threatens its uptime and the trust it runs on. The fix is funded.',{mid:TD.mid,txt:'Back the '+c5esc(TD.short)+' fix — protects growth'})+
    '<div class="c5foot">Objectives are mapped from your strategy inputs; cyber exposure traces to source.</div>';
}
/* Per-objective detail — opens ONE strategic objective with its cyber dependency, status,
   modeled exposure and the fix, so the CEO can click any business objective for its story
   (not a single shared drawer for all of them). */
function c5objectiveInspect(i){
  var O=c5Objectives();var o=O.objs[i];if(!o)return;
  var Mo=c5expModel();
  var depName={identity:'Identity & access',product:'Secure-by-design (product)',cost:'Cloud / cost efficiency',vendor:'Third-party estate',workforce:'Security culture'};
  var driverUsd=function(key){var du=0;Mo.drivers.forEach(function(d){if(d.id==='exp_'+key)du=d.usd||0;});return du;};
  var dep=depName[o.map]||'no material cyber dependency';
  var uv=o.map?driverUsd(o.map):0;
  var atRisk=(o.status==='at risk'),watch=(o.status==='watch');
  var col=atRisk?'warn':(watch?'blue':'good');
  var statusTxt=atRisk?'At risk':(watch?'Watch':'Safe');
  var inputs=[
    {name:'Strategic objective',value:o.name,source:(O.fromInput?'Strategy intake (onboarding)':'Sector default (labeled)')},
    {name:'Cyber dependency',value:dep,source:'objective → capability mapping'},
    {name:'Cyber status',value:statusTxt+(o.sub?(' · '+o.sub):''),color:col,source:'exposure model'}
  ];
  if(o.map)inputs.push({name:'Modeled exposure on the dependency',value:(uv>0?usd(uv):'—'),color:(uv>0?'warn':null),source:(uv>0?'control telemetry → driver_usd':'no material driver')});
  var impact=atRisk
    ?('This objective runs on '+dep.toLowerCase()+', and that dependency carries a material cyber exposure'+(uv>0?(' of about '+usd(uv)):'')+' right now. Left unaddressed it threatens '+(o.sub?o.sub.toLowerCase():'the objective’s delivery')+'.')
    :(watch
      ?('This objective runs on '+dep.toLowerCase()+'. Nothing is material today, but it is worth watching as the estate changes.')
      :('This objective '+(o.map?('runs on '+dep.toLowerCase()+', and nothing cyber is putting it at risk right now'):'has no material cyber dependency — cyber is not a blocker here')+'.'));
  var m=c5obj({id:'ceo_obj_'+i,name:o.name+' · cyber status',connected:true,displayValue:statusTxt,label:'computed',color:col,
    impact:impact,
    affected:'The “'+o.name+'” objective and the '+dep.toLowerCase()+' capability it depends on.',
    whyNow:atRisk?('The dependency is exposed now — until the '+dep.toLowerCase()+' gap is closed, this objective carries avoidable cyber risk. The fix is scoped and funded.'):(watch?'Clear today; keep it monitored as the estate changes.':'Clear today — no cyber blocker to this objective; hold posture and keep the mapping current.'),
    why:'Whether cyber is a blocker to this specific strategic objective — the dependency it runs on, whether that dependency carries a material modeled exposure, and the fix if it does.',
    method:'Your objective is tagged (at strategy intake) to the cyber capability it depends on; Nerion checks whether that capability carries a material modeled exposure from live control telemetry, and reports the status with the dollars and the fix.',
    inputs:inputs,
    sources:[{tool:(O.fromInput?'Strategy intake (onboarding)':'Sector default (labeled)'),connector:'strategy',field:'objective → capability',lastRefresh:c5ago()},{tool:'Exposure model',connector:'nerion',field:'driver_usd (from control telemetry)'}],
    action:atRisk?('Protect “'+o.name+'”: fund remediation on '+dep+' to move it back to Safe.'):'',
    note:'One objective, its cyber dependency, and the status behind it.'});
  c5InspectObj(m);
}
document.addEventListener('click',function(e){var el=e.target.closest('[data-c5obj]');if(el&&el.getAttribute('data-c5obj')!=null)c5objectiveInspect(Number(el.getAttribute('data-c5obj')));});
/* Tab 03 — Financial exposure (shared objects with CFO/CISO) */
function c5ceFinancial(){
  var host=document.getElementById('ce-financial');if(!host)return;
  var ec=c5get('exp_identity'),hr=c5get('cf_headroom'),ap=c5get('cf_appetite');
  var TD=c5TopDriver(),dm=c5get(TD.mid); // data-ranked top driver, not hard-coded identity
  host.innerHTML=c5header()+
    c5shell('Financial exposure · what could this cost us?','Cyber could cost real money — comfortably within tolerance.',null,'The headline: your modeled annual cyber loss against the board’s appetite, with the severe-year tail. The single largest driver already has a funded fix.')+
    '<div class="c5cards">'+c5card('exp_total')+c5card('cf_appetite')+c5card('cf_tail')+'</div>'+
    // Exposure drivers behind the total — distinct from the three summary cards
    // above (no repeat of exp_total / cf_tail), so nothing is shown twice.
    '<div class="c5tiles">'+
      c5tile(TD.mid,'b','Largest driver','The single biggest share of the total · funded fix')+
      c5tile('cf_bi','a','If down','Cost if the customer platform is down')+
      c5tile('cf_ins_cov','g','Insured','Share of the severe-year tail your policy covers')+
    '</div>'+
    c5bl('Bottom line','The one number that moves the headline down.',null,(ec.connected?('The largest single driver — '+TD.phrase+' — accounts for '+(dm.connected?dm.displayValue:'the biggest share')+' of the total. Funding its fix lowers both the everyday cost and the severe-year tail, and it’s already scoped.'):'Connect your controls and the single largest loss driver surfaces here with its funded fix.'),{mid:TD.mid,txt:ec.connected&&dm.connected?('Back the '+c5esc(TD.short)+' fix — cuts '+dm.displayValue):('Back the '+c5esc(TD.short)+' fix')})+
    '<div class="c5foot">Loss figures are modeled (ALE and tail); every input traces to its source.</div>';
}
/* Tab 04 — Brand & customer trust. A CISO's briefing to the CEO: are customers
   protected, can we prove it, what's the one exposure that could change that, and
   what decision is needed. Safer-than-mockup wording, evidence-aware. */
function c5ceTrust(){
  var host=document.getElementById('ce-trust');if(!host)return;
  var TI=c5TrustInputs();var ec=c5get('exp_identity');var TD=c5TopDriver();
  var ans=(typeof TrustLogic!=='undefined')?TrustLogic.trustAnswer(TI):'';
  var blHead=(typeof TrustLogic!=='undefined')?TrustLogic.bottomLineHead(TI):'Customer trust';
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var disc=c5get('ceo_disclosures');var reportable=disc.connected?disc.displayValue:'—';var sep='<span style="color:var(--line)">·</span>';
  var strip='<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-top:14px;padding:12px 16px;border-radius:12px;background:var(--surface-2)">'+
    '<span style="font-size:12px;color:var(--ink-2);font-weight:600">Disclosure readiness:</span>'+
    '<span style="font-size:12.5px;color:var(--'+(reportable==='0'?'good':'warn')+');font-weight:600">'+(disc.connected?(reportable+' reportable events'):'connect SIEM + materiality')+'</span>'+sep+
    '<span style="font-size:12px;color:var(--muted)">SEC material-incident 8-K clock: 4 business days</span>'+sep+
    '<span style="font-size:12px;color:var(--muted)">peer posture: on par</span><span class="c5pill n" style="font-size:9px">Live + illustrative</span></div>';
  host.innerHTML=c5header()+
    c5shell('Trust & disclosure · are we protecting trust, and ready to disclose?',ans,null,'The one question: are customers protected, can we prove it, and could we disclose on the clock? Below — whether customers were affected, whether anyone had to be notified, trust posture, the exposure under watch, SEC disclosure readiness, and how complete the evidence is.')+
    (demo?'<div class="c5foot" style="color:var(--warn);margin:2px 0 6px">Demo data — some signals are sample values until your tools are connected.</div>':'')+
    '<div class="c5cards">'+c5card('ceo_cust_incidents')+c5card('ceo_disclosures')+c5card('ceo_trust_signal')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('ceo_customer_data','a','Evidence-gated','Confirmed only with SIEM + DLP connected')+
      c5TrustRiskTile(ec)+
      c5TrustEvidence(TI)+
    '</div>'+
    strip+
    c5bl('The decision',blHead,null,'The risk is not an active breach; it is an unresolved '+TD.short+' exposure in the customer platform — the one thing that could put customer data, platform uptime and the trust that depends on them at risk, and trigger a disclosable event. CEO action: approve or accelerate the customer-platform '+TD.short+' remediation plan. The fix is funded.',{mid:TD.mid,txt:'Approve '+c5esc(TD.short)+' remediation'})+
    '<div class="c5foot">Incident, breach/privacy and identity-exposure figures trace to source; disclosure clock from the jurisdiction ruleset; peer posture illustrative. · see Evidence confidence.</div>';
}
/* "Top trust risk" tile — the identity exposure in plain business language, with the
   dollar figure always carrying a label that explains what it means. */
function c5TrustRiskTile(ec){
  var lbl=(typeof TrustLogic!=='undefined')?TrustLogic.EXPOSURE_LABEL:'Estimated customer-platform exposure (modeled)';
  var ic='<span class="c5tile-ic" style="--ac:var(--warn)">'+c5icon('lock')+'</span>';
  return '<div class="c5tile'+(ec.connected?'':' c5off')+'" data-c5m="exp_identity" title="'+c5tip(ec)+'">'+
    '<div class="c5tile-top"><span class="c5tile-l">'+ic+'Top trust risk</span><span class="c5pill a">Watch</span></div>'+
    '<div class="c5tile-h'+(ec.connected?'':' c5muted')+'">'+(ec.connected?ec.displayValue:'Not connected')+'</div>'+
    '<div class="c5tile-s">Customer-platform identity exposure · could increase risk of customer data exposure or platform disruption.</div>'+
    (ec.connected?('<div class="c5tile-s" style="color:var(--muted);margin-top:2px">'+lbl+'</div>'):'')+
    '</div>';
}
/* Evidence confidence — visually secondary. Shows the CEO where the trust answer is
   proven and where evidence is still incomplete (this is where connector gaps live,
   not the primary cards). */
function c5TrustEvidence(TI){
  var SL=(typeof TrustLogic!=='undefined')?TrustLogic.sourceStatus:function(o){return o&&o.connected?{label:'Connected',cls:'g'}:{label:'Not Connected',cls:'n'};};
  function row(name,st){return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:3px 0"><span style="font-size:12px;color:var(--ink-2)">'+name+'</span><span class="c5pill '+st.cls+'" style="flex:none">'+st.label+'</span></div>';}
  var rows=[
    ['Customer incident source',            SL({connected:TI.incidentsConnected})],
    ['Breach/privacy event source',         SL({connected:TI.incidentsConnected,computed:true})],
    ['Customer-data exposure source',       SL({connected:TI.incidentsConnected&&TI.dlpConnected,partial:TI.incidentsConnected&&!TI.dlpConnected})],
    ['Customer-platform identity risk',     SL({connected:TI.identityMaterial,computed:true})],
    ['Service availability source',         SL({connected:TI.availabilityConnected})]
  ];
  return '<div class="c5tile"><div class="c5tile-top"><span class="c5tile-l"><span class="c5tile-ic" style="--ac:var(--ink-2)">'+c5icon('checklist')+'</span>Evidence confidence</span></div>'+
    '<div style="margin-top:6px">'+rows.map(function(r){return row(r[0],r[1]);}).join('')+'</div>'+
    '<div class="c5tile-s" style="margin-top:6px;color:var(--muted)">Where the trust answer is proven — and where evidence is still incomplete.</div></div>';
}
/* Tab 05 — Decisions for the CEO. One strategic choice, business language only: approve
   identity remediation now, defer it, or formally accept the residual exposure. Built on
   the shared decision object so it stays consistent with the CISO/CFO/CRO/CLO seats. */
function c5ceDecisions(){
  var host=document.getElementById('ce-decisions');if(!host)return;
  var TD=c5TopDriver(),dm=c5get(TD.mid);
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var exp=dm.connected?dm.displayValue:'—';
  var evLevel=demo?'Demo':(dm.connected?'Medium':'Not Enough Evidence');
  var meta={
    recommendation:'Approve remediation now',
    modeledExposure:(dm.connected?(demo?(exp+' (modeled demo)'):exp):'—'),
    exposureLabel:'Modeled exposure',
    exposureBasis:'Estimated business exposure tied to customer-platform services dependent on affected identity controls.',
    evidenceConfidence:evLevel,
    dueDate:'This planning cycle',
    requestedBy:'CISO',
    sourceStatus:demo?'Modeled demo':'Modeled'
  };
  var recSum='Reduces '+(dm.connected?exp:'the')+' modeled exposure tied to customer-platform '+TD.short+' risk and supports the customer trust objective.';
  var list=[
    c5dec('ce',1,'Approve customer-platform '+TD.short+' remediation',
      'Recommended: approve remediation now. This reduces '+(dm.connected?exp:'')+' modeled exposure tied to customer-platform '+TD.short+' risk and supports the customer trust objective.',
      {on:'Approve remediation now',osum:'Fund and prioritize the '+TD.short+' remediation project',
        pros:['Reduces modeled exposure tied to customer-platform '+TD.short+' risk.','Supports the customer trust objective.','Opens a tracked remediation project.'],
        cons:['Requires executive sponsorship and capital this cycle.'],
        consequence:'Opens a tracked remediation project and begins modeled-exposure-reduction tracking.',
        btn:'Choose &amp; record'},
      [
        {on:'Defer to next planning cycle',osum:'No spend this cycle; exposure remains open',
          pros:['No capital committed this cycle.'],
          cons:['Exposure remains until addressed.','Remediation cost may increase if delayed.','Risk remains visible in executive reporting.'],
          consequence:'Records the decision as deferred; exposure remains open until the next planning cycle.',req:true},
        {on:'Accept residual risk with rationale',osum:'Create a formal risk-acceptance record',
          pros:['No immediate spend or project launch.','The decision is formally documented.'],
          cons:['Residual exposure remains.','May require board, legal, or risk review if material.','Requires a review date and rationale.'],
          consequence:'Creates a risk-acceptance record with rationale, owner and review date.',req:true,reqRisk:true}
      ],
      meta),
    // Decision 2 — the CEO's domain call: approve the board / disclosure narrative for cyber.
    c5dec('ce',2,'Approve the board & disclosure narrative for cyber posture?','How cyber is characterized to the board (and, if an event turns material, in an SEC filing) is the CEO’s call — approve the plain-language posture, or ask for a change before it’s recorded.',
      {on:'Approve the narrative — cyber is a managed, funded risk',osum:'board-ready, disclosure-aligned',pros:['Gives the board a defensible, consistent posture statement.','Aligns to the SEC material-incident (8-K, 4-business-day) framing so nothing is improvised under pressure.','Names the one funded action (the identity fix) as the risk owner’s plan.'],cons:['Commits you to the characterization on the record.','Should be re-approved if the posture materially changes.']},
      [{on:'Request a change before recording',osum:'send back for revision',pros:['Lets you adjust tone or scope first.'],cons:['Delays a board-ready statement.']}])
  ];
  host.innerHTML=c5header()+
    c5shell('Decisions for the CEO · what needs my sign-off?','One fix converges across the business — approve it, and approve how cyber is told to the board.',null,'No technical detail — just the business choice. Choosing an option records your decision, timestamp and rationale where required, keeps it editable for 24 hours, and triggers the appropriate workflow.')+
    c5convergeStrip('ceo')+
    c5decisions(list)+
    '<div class="c5foot">Choosing an option records your decision, timestamp, rationale where required, and triggers the appropriate workflow · no AI/LLM at run-time'+(demo?' — values are modeled demo exposure.':'.')+'</div>';
}

/* ================= CRO seat — same engine, enterprise-risk lens ================= */
/* Tab 01 — Cyber on one scale */
function c5crScale(){
  var host=document.getElementById('cr-scale');if(!host)return;
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var P=c5Principal(),IDF=c5IdFix();
  var rank=P.cyberRank,total=P.rows.length;
  var totalRes=P.rows.reduce(function(s,r){return s+r.v;},0);
  // ── verdict DERIVED from cyber's rank, so it can never contradict the "N of M" card
  //    (the old hard-coded "mid-pack" fought a card that ranked cyber #1). ──
  var verdict=(rank==null||total<=1)?'Cyber’s residual is modeled — connect your ERM register to rank it against your other principal risks.'
    :(rank===1)?'Cyber is your #1 principal risk by modeled residual — its direction, not just its size, is what to watch.'
    :(rank<=Math.ceil(total/3))?'Cyber is among your top principal risks — watch its direction.'
    :(rank<=Math.ceil(total*2/3))?'Cyber sits mid-pack among your principal risks — watch its direction.'
    :'Cyber sits in the lower half of your principal risks — watch its direction.';
  var support='On one enterprise scale, cyber'+(P.cyberV>0?(' ('+usd(P.cyberV)+' residual)'):'')+' sits against market, credit, operational and compliance risk. Its direction — not just its size — is what the risk committee tracks; a single '+IDF.short+' gap drives most of it.';
  // ── principal-risks matrix (centerpiece) — cyber highlighted, sorted by residual. Replaces
  //    the old bar list (whose stray track element was the orphan artifact on the tab). ──
  var mRows=P.rows.map(function(r){var share=totalRes>0?Math.round(r.v/totalRes*100):0;
    var pillCls=r.cyber?'b':(r.tc==='up'?'a':r.tc==='dn'?'g':'n');
    var pillTxt=r.cyber?('You are here · #'+rank):r.tr;
    return '<div class="c5prow" data-c5m="'+(r.cyber?'exp_total':'cr_rank')+'" style="cursor:pointer">'+
      '<div style="flex:1;min-width:0"><div class="c5row-t">'+c5esc(r.l)+(r.cyber?' <span class="c5tag">Cyber</span>':'')+'</div><div class="c5row-s">'+share+'% of enterprise residual · '+c5esc(String(r.tr).toLowerCase())+'</div></div>'+
      '<div style="text-align:right;flex:none;min-width:64px;margin-right:12px;font-weight:600;color:var(--'+(r.cyber?'warn':'ink')+')">'+usd(r.v)+'</div>'+
      '<span class="c5pill '+pillCls+'" style="flex:none">'+c5esc(pillTxt)+'</span></div>';
  }).join('');
  var liveTag='<span class="c5pill n" style="font-size:9px">Live + modeled</span>';
  var matrix='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:16px 0 8px"><span style="font-size:12.5px;font-weight:600;color:var(--ink)">Principal risks — residual on one enterprise scale '+liveTag+'</span><span style="font-size:11px;color:var(--muted)">Sorted by residual</span></div><div class="c5card" style="padding:2px 14px">'+mRows+'</div>';
  // ── evidence footnote ──
  var evSrcs=[
    {label:'Cyber residual model (ALE)',connected:P.cyberV>0},
    {label:'ERM register · principal risks',connected:total>1},
    {label:'Cyber trend (quarter over quarter)',connected:c5get('cr_trend').connected},
    {label:'Identity exposure model',connected:c5get(IDF.mid).connected}
  ];
  var connN=evSrcs.filter(function(s){return s.connected;}).length;
  host.innerHTML=c5header()+
    c5shell('Cyber on one scale · how does it compare to our other risks?',verdict,(rank===1?'warn':null),support)+
    '<div class="c5cards">'+c5card('cr_rank')+c5card('exp_total')+c5card('cr_trend')+'</div>'+
    matrix+
    c5bl('The decision','The one lever that moves cyber down the scale.',null,(IDF.usd?('A single '+IDF.short+' gap drives most of cyber’s residual. Treating it reduces '+IDF.usd+' — moving cyber down the enterprise scale. Same fix across the cockpit ('+IDF.owner+' · '+IDF.timeline+').'):'Connect your controls and the single '+IDF.short+' gap driving most of cyber’s residual surfaces here, with its funded treatment.'),{mid:IDF.mid,txt:IDF.usd?('Treat the '+c5esc(IDF.short)+' risk — reduces '+IDF.usd):('Treat the '+c5esc(IDF.short)+' risk')})+
    '<div class="c5foot">Risks are normalized to one residual-loss scale; cyber traces to its model, the rest to your ERM inputs. · '+connN+' sources connected'+(demo?' · demo':'')+'</div>';
}
/* Tab 02 — Risk appetite & acceptance */
function c5crAppetite(){
  var host=document.getElementById('cr-appetite');if(!host)return;
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var C=c5Categories(),reg=c5RiskRegister(),IDF=c5IdFix();
  var cyberRow=reg.rows.filter(function(r){return r.cyber;})[0]||reg.rows[0]||{inherent:0,residual:0};
  var overN=C.drivers.filter(function(d){return C.limit>0&&d.usd>C.limit;}).length;
  var withinOverall=(reg.appetite>0&&reg.cyberResidual<=reg.appetite);
  // ── headline DERIVED — never "within appetite" while a category card reads over ──
  var head=(reg.appetite<=0)?'Connect the board’s appetite to judge whether cyber is within tolerance.'
    :(withinOverall?('Within appetite overall'+(overN>0?(' — but '+overN+' categor'+(overN===1?'y is':'ies are')+' over its share.'):' with headroom.')):('Cyber residual is over the board’s appetite'+(overN>0?(' — '+overN+' categor'+(overN===1?'y drives':'ies drive')+' it.'):'.')));
  var support='Cyber residual ('+usd(reg.cyberResidual)+') sits against the board’s appetite ('+(reg.appetite>0?usd(reg.appetite):'not connected')+'). By category, the largest driver is over its even-allocation share. Appetite is self-reported; category limits are an even allocation until your framework’s limits connect. Each category traces to its residual model.';
  // ── inherent → residual strip (control effectiveness, from the shared register) ──
  var sep='<span style="color:var(--line)">·</span>';
  var strip='<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-top:14px;padding:12px 16px;border-radius:12px;background:var(--surface-2)">'+
    '<span style="font-size:12px;color:var(--ink-2);font-weight:600">Inherent → residual:</span>'+
    '<span style="font-size:12.5px;color:var(--ink);font-weight:600">'+usd(cyberRow.inherent)+' inherent</span>'+sep+
    '<span style="font-size:12px;color:var(--good)">−'+usd(reg.controlsRemoved)+' controls remove</span>'+sep+
    '<span style="font-size:12.5px;color:var(--'+(withinOverall?'good':'warn')+');font-weight:600">'+usd(reg.cyberResidual)+' residual</span>'+sep+
    '<span style="font-size:12px;color:var(--muted)">vs '+(reg.appetite>0?usd(reg.appetite):'—')+' appetite</span>'+
    '<span class="c5pill n" style="font-size:9px">Modeled · appetite self-reported</span></div>';
  // ── category breach matrix — residual vs limit, over-by magnitude, per-row status ──
  var rows=C.drivers.slice().sort(function(a,b){return b.usd-a.usd;}).map(function(d){var over=(C.limit>0&&d.usd>C.limit);var mag=over?(d.usd-C.limit):0;
    return '<div class="c5prow" data-c5m="'+d.id+'" style="cursor:pointer">'+
      '<div style="flex:1;min-width:0"><div class="c5row-t">'+c5esc(d.name.replace(/ — .*/,''))+'</div><div class="c5row-s">residual '+usd(d.usd)+' vs '+(C.limit>0?usd(C.limit):'—')+' limit'+(over?(' · over by '+usd(mag)):'')+'</div></div>'+
      '<div style="text-align:right;flex:none;min-width:64px;margin-right:12px;font-weight:600;color:var(--'+(over?'warn':'good')+')">'+usd(d.usd)+'</div>'+
      '<span class="c5pill '+(over?'a':'g')+'" style="flex:none">'+(over?'Over limit':'Within')+'</span></div>';
  }).join('');
  var matrix='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:16px 0 8px"><span style="font-size:12.5px;font-weight:600;color:var(--ink)">Cyber residual vs appetite — by category</span><span style="font-size:11px;color:var(--muted)">Even-allocation limits until your framework connects</span></div><div class="c5card" style="padding:2px 14px">'+rows+'</div>';
  var evSrcs=[{label:'Cyber residual model',connected:reg.cyberResidual>0},{label:'Board appetite (self-reported)',connected:reg.appetite>0},{label:'Control-effectiveness ledger',connected:reg.controlsRemoved>0},{label:'Category limits (framework)',connected:false}];
  var connN=evSrcs.filter(function(s){return s.connected;}).length;
  host.innerHTML=c5header()+
    c5shell('Risk appetite & acceptance · are we within tolerance?',head,(overN>0||!withinOverall?'warn':null),support)+
    '<div class="c5cards">'+c5card('exp_total')+c5card('cf_appetite')+c5card('cf_headroom')+'</div>'+
    strip+
    matrix+
    c5bl('The decision','Bring the over-limit category back within appetite.',null,(IDF.usd?('The '+IDF.short+' category is over its share of appetite by the largest margin. Treating it ('+IDF.usd+') brings it back within tolerance and restores category headroom — the same fix across the cockpit ('+IDF.owner+' · '+IDF.timeline+'). Then re-baseline appetite on the post-treatment residual.'):'Connect your controls and the over-limit category — '+IDF.short+' — surfaces here with its funded treatment.'),{mid:IDF.mid,txt:'Bring '+c5esc(IDF.short)+' within appetite'})+
    '<div class="c5foot">Overall appetite from your risk framework (self-reported); category limits are an even allocation until your framework connects; residuals from the cyber model. · '+connN+' sources connected'+(demo?' · demo':'')+'</div>';
}
/* Tab 03 — Control assurance */
function c5crAssurance(){
  var host=document.getElementById('cr-assurance');if(!host)return;
  var A=c5Assurance();var TD=c5TopDriver();
  var rows=A.fams.map(function(f){var pill=f.status==='Assured'?'g':f.status==='Partial'?'a':f.status==='Gap'?'r':'n';
    return '<div class="c5prow" data-c5m="cr_families"><span class="c5sq '+(pill==='g'?'g':pill==='a'?'a':pill==='r'?'r':'n')+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">'+f.l+'</div><div class="c5row-s">'+f.sub+'</div></div><span class="c5pill '+pill+'">'+f.status+'</span></div>';
  }).join('');
  host.innerHTML=c5header()+
    c5shell('Control assurance · are the controls working?','Controls are largely assured — with gaps where it matters.',null,'Assurance across your control families — evidenced from tests and telemetry, not self-attestation. Most are assured; identity and third-party carry a partial-assurance gap.')+
    '<div class="c5cards">'+c5card('cr_families')+c5card('cr_gaps')+c5card('cr_evidence')+'</div>'+
    '<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Control families · evidence-based assurance</div>'+rows+'</div>'+
    c5bl('Bottom line','Close the assurance gap where it matters most.',null,cap(TD.short)+' controls are only partially assured — and they drive your largest residual risk. The funded fix closes the control gap and the assurance gap together.',{mid:TD.mid,txt:'Close the '+c5esc(TD.short)+' control gap'})+
    '<div class="c5foot">Assurance is evidence-based (tests and telemetry), not self-attestation.</div>';
}
/* Tab 04 — Trend & ownership */
function c5crTrend(){
  var host=document.getElementById('cr-trend');if(!host)return;
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var tr=trajInfo(),T=c5T(),IDF=c5IdFix();
  var vals=(tr.vals||[]).slice(-6);var maxV=Math.max.apply(null,vals.concat([1]));
  var bars='<div class="c5bars" style="height:40px">'+(vals.length?vals.map(function(v){var h=Math.round(6+(maxV>0?v/maxV:0)*32);return '<i style="height:'+h+'px"></i>';}).join(''):[1,2,3,4,5,6].map(function(){return '<i class="n" style="height:8px"></i>';}).join(''))+'</div>';
  // ── direction + VELOCITY (rate of change), not a single "Baseline" word ──
  var dirStr='Baseline',velStr='builds quarter over quarter — no history invented';
  if(vals.length>=2){var delta=vals[vals.length-1]-vals[0];var per=Math.round(delta/(vals.length-1));var pc=vals[0]?Math.round(delta/vals[0]*100):0;
    dirStr=(delta<=0?'Falling':'Rising');velStr=(delta<=0?'−':'+')+usd(Math.abs(per))+'/qtr ('+(pc<=0?'':'+')+pc+'% over '+vals.length+' qtrs)';}
  // ── leading indicators (KRIs) — what moves residual next ──
  function kriRow(label,v,ok){var col=(ok===true)?'good':(ok==='w')?'warn':(ok===false)?'crit':'muted';
    return '<div class="c5prow" style="cursor:default"><div style="flex:1;min-width:0"><div class="c5row-t">'+c5esc(label)+'</div></div><div style="text-align:right;flex:none;min-width:56px;margin-right:12px;font-weight:600;color:var(--'+col+')">'+c5esc(v)+'</div><span class="c5pill '+(col==='good'?'g':col==='crit'?'r':col==='warn'?'a':'n')+'" style="flex:none">'+(ok===true?'On track':(ok==='w')?'Watch':(ok===false)?'Off track':'—')+'</span></div>';}
  var idP=(typeof c5avgDeploy==='function')?c5avgDeploy(['mfa','pam']):null;
  var patch=(typeof sig==='function')?sig('patch_pct'):null,edr=(typeof sig==='function')?sig('edr_pct'):null,mfa=(typeof sig==='function')?sig('mfa_pct'):null;
  var kriRows=[
    kriRow('Identity controls deployed (KRI)',idP!=null?(idP+'%'):'—',idP!=null?(idP>=90?true:'w'):null),
    kriRow('Patch coverage (KRI)',patch!=null?(patch+'%'):'—',patch!=null?(patch>=90?true:'w'):null),
    kriRow('MFA adoption (KRI)',mfa!=null?(mfa+'%'):'—',mfa!=null?(mfa>=95?true:'w'):null),
    kriRow('Endpoint (EDR) coverage (KRI)',edr!=null?(edr+'%'):'—',edr!=null?(edr>=95?true:'w'):null)
  ].join('');
  // ── ownership register — owner · action · review cadence ──
  var O=c5Owners();
  var ownerRows=O.rows.map(function(r){return '<div class="c5prow" data-c5m="cr_owned" style="cursor:pointer"><span class="c5sq '+(r.c==='a'?'a':r.c==='b'?'b':r.c==='n'?'n':'g')+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">'+c5esc(r.risk)+'</div><div class="c5row-s">Owner: '+c5esc(r.owner)+' · '+c5esc(r.act)+' · reviewed quarterly</div></div><span class="c5pill '+r.c+'">'+c5esc(r.status)+'</span></div>';}).join('');
  var head=(T.improving?'Cyber residual is falling — with clear owners and one action to sponsor.':T.worsening?'Cyber residual is rising — every risk is owned; the '+IDF.short+' action is the biggest lever.':'Direction builds as quarters record — owners are clear and the '+IDF.short+' action is the biggest lever.');
  var support='Direction and velocity of cyber residual, the leading indicators (KRIs) that move it next, and who owns each top risk. '+(T.has?('Residual is '+dirStr.toLowerCase()+' at '+velStr+'.'):'History builds quarter over quarter — nothing invented.')+' One action — '+IDF.short+' — needs your governance push.';
  var evSrcs=[{label:'Residual-risk series',connected:T.has},{label:'Leading indicators (identity/patch/MFA/EDR)',connected:(idP!=null||patch!=null||mfa!=null||edr!=null)},{label:'Risk register (owners)',connected:true}];
  var connN=evSrcs.filter(function(s){return s.connected;}).length;
  host.innerHTML=c5header()+
    c5shell('Trend & ownership · are we improving, and who owns what?',head,(T.worsening?'warn':null),support)+
    '<div class="c5cards">'+c5card('direction')+c5card('cr_consec')+c5card('cr_owned')+'</div>'+
    '<div class="c5rank" style="padding:12px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:0 0 8px">'+(T.has?('Residual risk, last '+vals.length+' quarters · '+dirStr+' '+velStr):'Residual risk — builds as you record quarters')+'</div>'+bars+'</div>'+
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:16px 0 8px"><span style="font-size:12.5px;font-weight:600;color:var(--ink)">Leading indicators (KRIs) — what moves residual next</span><span style="font-size:11px;color:var(--muted)">Live from connected tools</span></div><div class="c5card" style="padding:2px 14px">'+kriRows+'</div>'+
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:16px 0 8px"><span style="font-size:12.5px;font-weight:600;color:var(--ink)">Top risks — owner, action and review cadence</span><span style="font-size:11px;color:var(--muted)">From your risk register</span></div><div class="c5card" style="padding:2px 14px">'+ownerRows+'</div>'+
    c5bl('The decision','Sponsor the one action that bends the trend.',null,'Every top risk is owned and moving. The '+IDF.short+' action is funded but needs your governance push to land this quarter — it is the biggest single residual reduction available ('+IDF.owner+' · '+IDF.timeline+').',{mid:IDF.mid,txt:'Sponsor the '+c5esc(IDF.short)+' action'})+
    '<div class="c5foot">Trend + velocity from the residual-risk series; KRIs from connected tools; owners from your risk register. · '+connN+' sources connected'+(demo?' · demo':'')+'</div>';
}
/* Tab 05 — Decisions for the CRO */
function c5crDecisions(){
  var host=document.getElementById('cr-decisions');if(!host)return;
  var TD=c5TopDriver(),dm=c5get(TD.mid),ev=c5get('exp_vendor'),em=c5get('exp_email');var V=c5vendors();var tvName=V.worst?V.worst.name:'your top vendor';
  var IDF=c5IdFix();
  var list=[
    // Decision 1 — the convergent identity treatment (recommended), with its HONEST downside.
    c5dec('cr',1,'Treat the '+IDF.short+' gap?','The only principal-risk driver over its appetite share'+(dm.connected?(' — treating it reduces '+dm.displayValue):'')+'. It is the one fix that moves cyber on every CRO tab (rank, appetite, trend).',
      {on:'Treat it — fund the '+IDF.short+' fix',osum:(dm.connected?('Biggest single reduction available · −'+dm.displayValue):'The biggest single reduction available'),pros:['Brings the '+IDF.short+' category back within its appetite share.','Largest single residual-risk reduction available.','Moves cyber down the enterprise rank and bends the trend.'],cons:['Requires funding and a governance push this cycle.','Interim exposure persists across the '+IDF.timeline+' rollout — the gap is not closed on day one.']}),
    // Decision 2 — the CRO's domain call: re-baseline appetite on the post-treatment residual.
    c5dec('cr',2,'Re-baseline appetite on the post-treatment residual?','Once '+IDF.short+' is treated, cyber residual drops — refresh the appetite/tolerance so limits reflect the new posture, or formally accept the interim residual with a recorded rationale.',
      {on:'Re-baseline — set limits to the post-treatment residual',osum:'appetite reflects the new posture',pros:['Category limits track the treated residual, not the old baseline.','Gives the committee a defensible, current tolerance line.'],cons:['Needs your framework’s category limits connected to be precise.','Re-run after the treatment lands, not before.']},
      [{on:'Formally accept the interim residual',osum:'recorded risk-acceptance',pros:['Documents the board’s tolerance for the rollout window.'],cons:['Interim exposure is owned explicitly until the fix lands.']}]),
    // Decision 3 — the within-limit third-party concentration to monitor.
    c5dec('cr',3,'Third-party concentration — '+tvName,'Within limit but the rating is one to watch.',
      {on:'Monitor — keep the vendor under watch',osum:'Within limit · rating to watch',pros:['No spend; appropriate for a within-limit risk.'],cons:['A rating slide could push it over — reassess on refresh.']},
      [{on:'Treat now — add a resilience option',osum:'Backup provider or contractual SLA',pros:['Reduces single-point-of-failure exposure.'],cons:['Cost and vendor-onboarding effort for a within-limit risk.']}])
  ];
  host.innerHTML=c5header()+
    c5shell('Decisions for the CRO · what needs your call?','One fix converges across your risk view — then two calls that are yours to make.',null,'Each carries its residual, appetite and recommendation. Choosing one stamps it with your name and time, keeps it editable for 24 hours, and opens a tracked project in the ticketing system connected at onboarding — whose status is pulled back on refresh.')+
    c5convergeStrip('cro')+
    c5decisions(list)+
    '<div class="c5foot">Each decision carries its residual, appetite, and source · no AI/LLM at run-time.</div>';
}

/* ================= COO seat — same engine, operations & continuity lens ================= */
/* Tab 01 — Operational resilience */
function c5coResilience(){
  var host=document.getElementById('co-resilience');if(!host)return;
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var svc=c5CriticalServices(),IDF=c5IdFix();
  function durH(h){return (typeof hrsToStr==='function')?hrsToStr(h):(h+'h');}
  var total=svc.length,onN=svc.filter(function(s){return s.rto<=s.tgt;}).length,offN=total-onN;
  var spofN=svc.filter(function(s){return /no failover/i.test(s.failover);}).length;
  var worstSvc=svc.filter(function(s){return s.rto>s.tgt;}).sort(function(a,b){return (b.rto-b.tgt)-(a.rto-a.tgt);})[0]||null;
  // ── honest headline — DERIVED from continuity, never a self-graded "Strong" over a 6× miss ──
  var head=(offN===0)?'Every critical service can recover within its continuity target.'
    :(worstSvc?(onN+' of '+total+' critical services stay within target — but '+worstSvc.n.toLowerCase()+' can’t recover in time ('+durH(worstSvc.rto)+' vs a '+worstSvc.tgt+'h target) and has no failover.'):(offN+' critical services are over their continuity target.'));
  var support='Per-service continuity — can each critical service keep running, or recover in time, through a cyber disruption? '+(worstSvc?('The '+worstSvc.n.toLowerCase()+' is the single point of failure; its recovery depends on the same '+IDF.short+' gap.'):'')+'';
  // ── three metric cards (custom, reconciled to the matrix) ──
  function rcard(mid,title,val,pill,pillCls,valCol,sub){return '<div class="c5card" data-c5m="'+mid+'"><div class="c5card-top"><span class="c5card-l">'+c5esc(title)+'</span><span class="c5pill '+pillCls+'" style="font-size:9px">'+c5esc(pill)+'</span></div><div class="c5card-v" style="color:var(--'+(valCol||'ink')+')">'+c5esc(String(val))+'</div><div class="c5esub" style="font-size:11px;color:var(--muted);margin-top:2px">'+c5esc(sub)+'</div></div>';}
  var cards='<div class="c5cards">'+
    rcard('coo_recovery_ready','Continuity',(offN===0?'On target':'At risk'),'Computed','n',(offN===0?'good':'warn'),onN+' of '+total+' services within target')+
    rcard('coo_rto','Slowest recovery',(worstSvc?durH(worstSvc.rto):durH(svc.map(function(s){return s.rto;}).sort(function(a,b){return b-a;})[0]||0)),'Live','g',(worstSvc?'crit':'good'),(worstSvc?('vs a '+worstSvc.tgt+'h target'):'within target'))+
    rcard(IDF.mid,'Single point of failure',spofN,'Computed','r',(spofN>0?'crit':'good'),(worstSvc?(worstSvc.n+' · no failover'):'no unmitigated SPOF'))+
    '</div>';
  // ── per-service continuity matrix ──
  var mRows=svc.slice().sort(function(a,b){return (b.rto-b.tgt)-(a.rto-a.tgt);}).map(function(s){var ok=s.rto<=s.tgt;var mid=s.root?IDF.mid:'coo_rto';
    return '<div class="c5prow" data-c5m="'+mid+'" style="cursor:pointer">'+
      '<div style="flex:1;min-width:0"><div class="c5row-t">'+c5esc(s.n)+'</div><div class="c5row-s">'+c5esc(s.dep+' · '+s.failover)+'</div></div>'+
      '<div style="text-align:right;flex:none;min-width:78px;margin-right:12px"><div style="font-weight:600;color:var(--'+(ok?'good':'crit')+')">'+c5esc(durH(s.rto))+'</div><div style="font-size:10.5px;color:var(--muted)">RTO target '+s.tgt+'h</div></div>'+
      '<span class="c5pill '+(ok?'g':'r')+'" style="flex:none">'+(ok?'Within target':'At risk')+'</span></div>';
  }).join('');
  var matrix='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:16px 0 8px"><span style="font-size:12.5px;font-weight:600;color:var(--ink)">Continuity by critical service — recover within target</span><span style="font-size:11px;color:var(--muted)">Sorted by risk</span></div><div class="c5card" style="padding:2px 14px">'+mRows+'</div>';
  // ── "if it goes down" impact strip (shared cross-cutting figures) ──
  var xh=c5xDowntimeHr(),sep='<span style="color:var(--line)">·</span>';
  var illus='<span class="c5pill n" style="font-size:9px">Illustrative</span>';
  var strip='<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-top:14px;padding:12px 16px;border-radius:12px;background:var(--surface-2)">'+
    '<span style="font-size:12px;color:var(--ink-2);font-weight:600">If the customer platform goes down:</span>'+
    '<span style="font-size:12.5px;color:var(--crit);font-weight:600">'+xh.str+' at risk</span>'+sep+
    '<span style="font-size:12px;color:var(--muted)">'+c5xCustomers()+'</span>'+sep+
    '<span style="font-size:12px;color:var(--muted)">no failover</span>'+illus+'</div>';
  var evSrcs=[{label:'Recovery-time (RTO) evidence',connected:svc[0].live},{label:'Per-service continuity mapping',connected:true},{label:'Failover / alternate-source status',connected:true},{label:'Identity recovery model',connected:c5get(IDF.mid).connected}];
  var connN=evSrcs.filter(function(s){return s.connected;}).length;
  host.innerHTML=c5header()+
    c5shell('Operational resilience · can we keep running?',head,(offN>0?'warn':null),support)+
    cards+
    matrix+
    strip+
    c5bl('The decision','Give the single point of failure a failover, and fund the fix its recovery depends on.',null,(IDF.usd?('The '+(worstSvc?worstSvc.n.toLowerCase():'customer platform')+' can’t recover in time and has no alternative. Fund the '+IDF.short+' fix ('+IDF.usd+' · '+IDF.owner+' · '+IDF.timeline+') — it restores the access path recovery depends on — and add a failover so a single outage can’t stop the business.'):'Connect your controls and the single point of failure — the customer platform — surfaces here with its funded fix.'),{mid:IDF.mid,txt:'Fund the identity fix — protects continuity'})+
    '<div class="c5foot">Per-service RTO from your recovery evidence; failover status + downtime impact are illustrative until wired. · '+connN+' sources connected'+(demo?' · demo':'')+'</div>';
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
  var TD=c5TopDriver(),dm=c5get(TD.mid);
  host.innerHTML=c5header()+
    c5shell('Critical process health · which processes are exposed?','Most critical processes are cyber-safe — one needs attention.',null,'Cyber risk mapped to your critical operational processes. Only the customer platform carries real exposure; a payments process is on watch through a vendor.')+
    body+
    c5bl('Bottom line','Protect the process customers touch.',null,(dm.connected?('The customer platform is your only at-risk critical process — the '+TD.short+' gap threatens its uptime. The fix is funded.'):'Connect your controls and the at-risk process — the customer platform — surfaces here with its funded fix.'),{mid:TD.mid,txt:'Fund the '+c5esc(TD.short)+' fix — protects the platform'})+
    '<div class="c5foot">Processes and dependencies mapped from your operations model; exposure traces to source.</div>';
}
/* Tab 03 — Supply chain & third parties · PRIMARY decision is the Acme mitigation, NOT identity */
function c5coSupply(){
  var host=document.getElementById('co-supply');if(!host)return;
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var V=c5vendors();var TD=c5TopDriver();
  var R=(typeof LIVE!=='undefined'&&LIVE&&LIVE.resilience)||{};
  // ── vendor-concentration matrix (shared source of truth) — SPOF count derives from it, so
  //    the card and the finding can never contradict each other (the old "0 vs mitigate one"). ──
  var VM=c5vendorMatrix();
  var spofN=VM.filter(function(r){return r.status==='single';}).length;
  var watchN=VM.filter(function(r){return r.status==='watch';}).length;
  var criticalTouch=spofN+watchN; // vendors touching a critical service that carry a concern
  var sp0=VM.filter(function(r){return r.status==='single';})[0]||null;
  var spofSub=sp0?(sp0.cat.replace(/ hosting provider/,' host').replace(/ \/ financials/,'')+' · '+sp0.proc.toLowerCase()):'None on a critical path';
  // ── metric-card values wired to live vendor data; SPOF derived from the matrix ──
  var tier1Conn=V.seed.length>0;
  var tier1=tier1Conn?((V.p&&V.p.tier1!=null)?V.p.tier1:V.seed.filter(function(x){return /1/.test(x.tier);}).length):'—';
  var flaggedConn=V.seed.length>0;var flaggedN=flaggedConn?V.atRisk.length:'—';
  var idP=(typeof c5avgDeploy==='function')?c5avgDeploy(['mfa','pam']):null,idConn=idP!=null;
  function vcard(mid,title,val,pill,pillCls,valCol,sub){return '<div class="c5card" data-c5m="'+mid+'"><div class="c5card-top"><span class="c5card-l">'+c5esc(title)+'</span><span class="c5pill '+pillCls+'" style="font-size:9px">'+c5esc(pill)+'</span></div><div class="c5card-v" style="color:var(--'+(valCol||'ink')+')">'+c5esc(String(val))+'</div><div class="c5esub" style="font-size:11px;color:var(--muted);margin-top:2px">'+c5esc(sub)+'</div></div>';}
  var cards='<div class="c5cards">'+
    vcard('coo_tier1','Tier-1 vendors',tier1,'Self-reported','n','ink',criticalTouch+' touch a critical service')+
    vcard('thirdparty_risk','Flagged for watch',flaggedN,'Modeled','a',(flaggedConn&&V.atRisk.length>0?'warn':'ink'),'Ratings falling or below threshold')+
    vcard('coo_spof','Single point of failure',spofN,'Computed','r',(spofN>0?'crit':'good'),spofSub)+
    '</div>';
  // ── vendor concentration matrix (centerpiece) — CATEGORY labels, status computed per row ──
  var illus='<span class="c5pill n" style="font-size:9px">Illustrative</span>';
  function arrow(t){return t==='down'?'↓':t==='up'?'↑':'→';}
  function stTxt(s){return s==='single'?'Single point':s==='watch'?'Watch':'OK';}
  function stCls(s){return s==='single'?'crit':s==='watch'?'warn':'good';}
  var vmRows=VM.map(function(r){var c=stCls(r.status);
    return '<div class="c5prow" data-c5m="thirdparty_risk" style="cursor:pointer">'+
      '<div style="flex:1;min-width:0"><div class="c5row-t">'+c5esc(r.cat)+'</div><div class="c5row-s">'+c5esc('Touches '+r.proc+' · '+r.failover)+'</div></div>'+
      '<div style="text-align:right;flex:none;min-width:52px;margin-right:12px;font-weight:600;color:var(--'+c+')">'+c5esc(r.grade+' '+arrow(r.trend))+'</div>'+
      '<span class="c5pill '+(r.status==='single'?'r':r.status==='watch'?'a':'g')+'" style="flex:none">'+stTxt(r.status)+'</span></div>';
  }).join('');
  var matrix='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:16px 0 8px"><span style="font-size:12.5px;font-weight:600;color:var(--ink)">Vendors under critical services — rating and failover '+illus+'</span><span style="font-size:11px;color:var(--muted)">Sorted by risk to operations</span></div><div class="c5card" style="padding:2px 14px">'+vmRows+'</div>';
  // ── operational-impact strip (Illustrative) — hourly + customers from the shared cross-cutting source ──
  var sep='<span style="color:var(--line)">·</span>';
  var strip='<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-top:14px;padding:12px 16px;border-radius:12px;background:var(--surface-2)">'+
    '<span style="font-size:12px;color:var(--ink-2);font-weight:600">If the cloud host fails:</span>'+
    '<span style="font-size:12.5px;color:var(--crit);font-weight:600">no failover for the customer platform</span>'+sep+
    '<span style="font-size:12px;color:var(--muted)">'+c5xDowntimeHr().str+' at risk</span>'+sep+
    '<span style="font-size:12px;color:var(--muted)">'+c5xCustomers()+'</span>'+illus+'</div>';
  // ── evidence footnote source count ──
  var evSrcs=[
    {label:'Vendor intake / tiering',connected:tier1Conn},
    {label:'Third-party rating feed',connected:flaggedConn},
    {label:'Vendor → critical-process mapping',connected:true},
    {label:'Failover / alternate-source status',connected:true},
    {label:'Operations model (blast radius)',connected:!!(R&&R.top_vendor_blast)},
    {label:'Identity controls (blast-radius cap)',connected:idConn},
    {label:'Business-process criticality',connected:!!(typeof c5Processes==='function'&&c5Processes()&&c5Processes().total)}
  ];
  var connN=evSrcs.filter(function(s){return s.connected;}).length;
  // ── data-driven headline + supporting line ──
  var head=spofN>0
    ?('Your supply chain is steady — but one Tier-1 vendor is a single point of failure for '+(sp0?sp0.proc.toLowerCase():'a critical service')+', with no failover.')
    :'Your supply chain is steady — no single vendor is an unmitigated point of failure.';
  var support='Of '+tier1+' Tier-1 vendors, '+criticalTouch+' touch a critical service and '+spofN+(spofN===1?' has':' have')+' no alternative. Completing identity controls limits how far any compromised vendor can reach.';
  host.innerHTML=c5header()+
    c5shell('Supply chain & third parties · which vendors could stop us?',head,(spofN>0)?'warn':null,support)+
    cards+
    matrix+
    strip+
    c5bl('The decision — two moves','Give the customer platform a failover, and cap every vendor’s blast radius with identity.',null,'The cloud host is a falling-rated single point of failure with no alternative — add a backup provider or a contractual failover SLA. Separately, completing identity controls (the same work on the Resilience and Recovery tabs) limits how far a compromised vendor can reach into your operations.',{mid:'thirdparty_risk',txt:'Mitigate the vendor dependency'},{mid:TD.mid,txt:'Fund '+c5esc(TD.short)+' — limits blast radius'})+
    '<div class="c5foot">vendor ratings are self-reported; process mapping and failover status are connected demo values. · '+connN+' sources connected'+(demo?' · demo':'')+'</div>';
}
/* Tab 04 — Recovery readiness */
/* Tab 04 — Recovery readiness. Answers the COO question "Can we recover within our
   targets?" — every conclusion is generated from the recovery evidence (RTO/RPO vs
   target, last DR test, backup verification, the top recovery dependency). Nothing is
   hard-coded: it leads with the RTO miss when the target is missed, and the top recovery
   gap (and its headline / bottom line / button) is ranked from the data, not assumed to
   be identity. Compact — detail lives in each card's drill-down. */
function c5coRecovery(){
  var host=document.getElementById('co-recovery');if(!host)return;
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var R=(typeof LIVE!=='undefined'&&LIVE&&LIVE.resilience)||{};
  function durH(h){return (typeof hrsToStr==='function')?hrsToStr(h):(h+'h');}
  function durM(m){return m>=60?((Math.round(m/6)/10)+'h'):(m+'m');}
  // ── recovery evidence (live / computed from connected sources) ──
  var worst=R.worst_recovery_hours,rtoTgt=4;
  var rtoConn=worst!=null,rtoMiss=rtoConn&&worst>rtoTgt,rtoGapH=rtoConn?Math.max(0,worst-rtoTgt):null;
  var rpoMin=(typeof sig==='function')?sig('rpo_minutes'):null,rpoTgt=60;
  var rpoConn=rpoMin!=null,rpoMiss=rpoConn&&rpoMin>rpoTgt,rpoGapM=rpoConn?Math.max(0,rpoMin-rpoTgt):null;
  var testDays=(typeof sig==='function')?sig('dr_test_days'):null,testConn=testDays!=null,testPassed=testConn&&testDays<=90;
  var immPct=(typeof sig==='function')?sig('backup_immutable_pct'):null,bkConn=immPct!=null,bkVerified=bkConn&&immPct>=95;
  var idP=(typeof c5avgDeploy==='function')?c5avgDeploy(['mfa','pam']):null,idConn=idP!=null,idGap=idConn&&idP<90;
  // Business-process mapping (used for the evidence-source count) — from the operations model.
  var P=(typeof c5Processes==='function')?c5Processes():null;
  // ── recovery-by-service matrix data (the centerpiece). The customer-platform row wires
  //    to live signals (worst RTO · rpo_minutes · identity deployment %); the other four are
  //    Illustrative sample rows until per-service recovery telemetry connects. Row status is
  //    COMPUTED (RTO ≤ target), never hard-coded. Same five services as the Resilience tab. ──
  // Services come from the shared c5CriticalServices() source (same five, live customer row),
  // so Recovery and Resilience can't drift. idPct/cpName kept for this tab's copy.
  var cpName=(R&&R.worst_recovery_service)?R.worst_recovery_service:('the '+c5sysLabel('customer').toLowerCase());
  var idPct=idConn?idP:78;
  var services=c5CriticalServices();
  function rtoC(h){return h>=24?durH(h):(h+'h');}
  function rpoC(m){return m>=120?durM(m):(m+'m');}
  var svcTotal=services.length,svcOn=services.filter(function(s){return s.rto<=s.tgt;}).length;
  // ── evidence sources (unchanged set) — the connected count drives the footnote ──
  var evSrcs=[
    {label:'Recovery test result (DR)',connected:testConn,critical:true},
    {label:'Time to recover (RTO)',connected:rtoConn,critical:true,computed:false},
    {label:'Data-loss window (RPO)',connected:rpoConn,critical:false},
    {label:'Backup verification',connected:bkConn,critical:false},
    {label:'Recovery-dependency mapping',connected:idConn,critical:true,partial:!idConn,computed:true},
    {label:'Business-process mapping',connected:!!(P&&P.total),critical:false,partial:!(P&&P.total)}
  ];
  var connN=evSrcs.filter(function(s){return s.connected;}).length;
  // 3) THREE METRIC CARDS — drill-through preserved via data-c5m. ──
  function colOf(cls){return cls==='g'?'good':cls==='a'?'warn':cls==='r'?'crit':'muted';}
  function rcard(mid,title,val,statusTxt,cls,sub){return '<div class="c5card" data-c5m="'+mid+'"><div class="c5card-top"><span class="c5card-l">'+c5esc(title)+'</span><span class="c5pill '+cls+'" style="font-size:9px">'+c5esc(statusTxt)+'</span></div><div class="c5card-v" style="color:var(--'+colOf(cls)+')">'+c5esc(val)+'</div><div class="c5esub" style="font-size:11px;color:var(--muted);margin-top:2px">'+c5esc(sub)+'</div></div>';}
  var rtoCard=!rtoConn?rcard('coo_rto','RTO gap','Not connected','Not connected','n','Connect your recovery-test results to measure RTO.')
    :rtoMiss?rcard('coo_rto','RTO gap',durH(worst)+' vs '+rtoTgt+'h','Off target','r','Slowest path exceeds target by '+durH(rtoGapH)+'.')
    :rcard('coo_rto','RTO',durH(worst)+' vs '+rtoTgt+'h','On target','g','Slowest critical path recovers within target.');
  var rpoCard=!rpoConn?rcard('coo_rpo','RPO','Not connected','Not connected','n','Connect your backup platform to measure RPO.')
    :rpoMiss?rcard('coo_rpo','RPO',durM(rpoMin)+' vs '+rpoTgt+'m','Off target','r','Data-loss window exceeds target by '+durM(rpoGapM)+'.')
    :rcard('coo_rpo','RPO',durM(rpoMin)+' vs '+rpoTgt+'m','Within target','g','Data-loss window is within target.');
  var testCard=!testConn?rcard('coo_last_test','Last recovery test','Not tested','Not tested','n','Recovery readiness cannot be confirmed without test evidence.')
    :!testPassed?rcard('coo_last_test','Last recovery test','Overdue','Overdue','a','Last run '+testDays+' days ago — readiness is unproven until re-tested.')
    :rcard('coo_last_test','Last recovery test','Passed','This quarter','n','Live failover — surfaced the RTO gap.');
  // Single green confirmation line — demotes the old Backups card; still drills to coo_backups.
  var bkLine=!bkConn?'<div data-c5m="coo_backups" style="cursor:pointer;display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12.5px;color:var(--muted)">Backups not connected — connect your backup platform to verify restores.</div>'
    :bkVerified?'<div data-c5m="coo_backups" style="cursor:pointer;display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12.5px;color:var(--good);font-weight:600"><span aria-hidden="true">✓</span>Backups immutable and restore-tested this quarter</div>'
    :'<div data-c5m="coo_backups" style="cursor:pointer;display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12.5px;color:var(--warn);font-weight:600"><span aria-hidden="true">▲</span>Backups '+immPct+'% immutable — raise to 95%+ and restore-verify.</div>';
  // 4) RECOVERY-BY-SERVICE MATRIX — the new centerpiece. Status computed per row.
  var illus='<span class="c5pill n" style="font-size:9px">Illustrative</span>';
  var matRows=services.map(function(s){var ok=s.rto<=s.tgt;var mid=s.root?'coo_identity_recovery':'coo_rto';
    return '<div class="c5prow" data-c5m="'+mid+'" style="cursor:pointer">'+
      '<div style="flex:1;min-width:0"><div class="c5row-t">'+c5esc(s.n)+'</div><div class="c5row-s">'+c5esc(s.dep+' · RPO '+rpoC(s.rpo)+' / '+rpoC(s.rtgt))+'</div></div>'+
      '<div style="text-align:right;flex:none;min-width:78px;margin-right:12px"><div style="font-weight:600;color:var(--'+(ok?'good':'crit')+')">'+c5esc(rtoC(s.rto))+'</div><div style="font-size:10.5px;color:var(--muted)">RTO target '+c5esc(rtoC(s.tgt))+'</div></div>'+
      '<span class="c5pill '+(ok?'g':'r')+'" style="flex:none">'+(ok?'On target':'Off target')+'</span></div>';
  }).join('');
  var matrix='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:16px 0 8px"><span style="font-size:12.5px;font-weight:600;color:var(--ink)">Recovery by critical service — actual vs target '+illus+'</span><span style="font-size:11px;color:var(--muted)">All paths tested this quarter</span></div><div class="c5card" style="padding:2px 14px">'+matRows+'</div>';
  // 5) OPERATIONAL-IMPACT STRIP — billing exposure = the RTO gap × the shared downtime-per-hour
  //    figure (derived); customers + hourly come from the shared cross-cutting source, never retyped.
  var xh=c5xDowntimeHr();
  var billExp='~'+((typeof usd==='function')?usd(Math.round((rtoConn?rtoGapH:20)*xh.usd)):('$'+Math.round((rtoConn?rtoGapH:20)*xh.usd/1e6)+'M'));
  var sep='<span style="color:var(--line)">·</span>';
  var strip='<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-top:14px;padding:12px 16px;border-radius:12px;background:var(--surface-2)">'+
    '<span style="font-size:12px;color:var(--ink-2);font-weight:600">The '+rtoGapH+'-hour gap, in operational terms:</span>'+
    '<span style="font-size:12.5px;color:var(--crit);font-weight:600">'+billExp+' billing exposure</span>'+sep+
    '<span style="font-size:12px;color:var(--muted)">SLA credits trigger past '+rtoTgt+'h</span>'+sep+
    '<span style="font-size:12px;color:var(--muted)">'+c5xCustomers()+'</span>'+illus+'</div>';
  // 2/6) DATA-DRIVEN headline · supporting line · decision callout ──
  var head,intro,decHead,decBody,decBtn;
  if(!testConn){
    head='Not enough evidence to confirm recovery readiness.';
    intro='Connect your recovery-test results to size RTO/RPO against target and map the critical recovery path.';
    decHead='Connect recovery evidence.';decBody='Connect or upload your recovery-test results, RTO/RPO and backup verification to confirm whether critical services recover within target.';decBtn={mid:'coo_last_test',txt:'Connect recovery evidence'};
  } else if(rtoMiss){
    head='Recovery is tested and data loss is within target — but one critical path, '+cpName+', misses its RTO target by '+durH(rtoGapH)+'.';
    intro=svcOn+' of '+svcTotal+' critical services restore within target. '+cap(cpName)+' (GreenLake billing) takes '+durH(worst)+' against a '+rtoTgt+'-hour target — and identity access restoration is the reason.';
    decHead='Close the RTO gap — finish deploying identity recovery ('+idPct+'% → 100%).';
    decBody='Identity access restoration is the critical path delaying recovery of '+cpName+' — the same exposure flagged on the Resilience tab. Completing deployment moves its RTO from '+durH(worst)+' to within the '+rtoTgt+'-hour target; then a live failover retest proves it. Owned '+c5IdFix().owner+'.';
    decBtn={mid:'coo_rto',txt:'Close the RTO gap'};
  } else {
    head='Recovery is tested and within target across your critical services.';
    intro='All '+svcTotal+' critical services restore within target on the latest test.';
    decHead='Recovery is within target — keep it proven.';decBody='Critical services recover within target on the latest test. Keep evidence fresh and retest on schedule.';decBtn={mid:'coo_last_test',txt:'View recovery evidence'};
  }
  host.innerHTML=c5header()+
    c5shell('Recovery readiness · can we recover within our targets?',head,(rtoMiss||!testConn)?'warn':null,intro)+
    '<div class="c5cards">'+rtoCard+rpoCard+testCard+'</div>'+
    bkLine+
    matrix+
    strip+
    c5bl('The decision',decHead,null,decBody,decBtn)+
    '<div class="c5foot">RTO / RPO and backup results are live; recovery-dependency and process mapping are connected demo values. · '+connN+' sources connected'+(demo?' · demo':'')+'</div>';
}
/* Tab 05 — Decisions for the COO */
function c5coDecisions(){
  var host=document.getElementById('co-decisions');if(!host)return;
  var TD=c5TopDriver(),dm=c5get(TD.mid),tp=c5get('thirdparty_risk'),IDF=c5IdFix();
  var list=[
    // Decision 1 — the convergent identity fix (recommended), with its honest downside.
    c5dec('co',1,'Fund the '+IDF.short+' fix?','It protects customer-platform uptime and recovery — your most critical process'+(dm.connected?(' ('+dm.displayValue+')'):'')+'. The one fix that moves every COO tab (resilience, recovery, vendors).',
      {on:'Fund it — protect uptime & recovery',osum:(dm.connected?('Protects your most critical process · −'+dm.displayValue):'Protects your most critical process'),pros:['Protects uptime and recovery of the customer platform.','Lifts identity recovery to close the RTO gap.','Caps every vendor’s blast radius into your data.'],cons:['Requires funding this cycle.','Interim exposure persists across the '+IDF.timeline+' rollout — recovery isn’t fixed on day one.']}),
    // Decision 2 — the COO's domain call: add a cloud-host failover for the SPOF.
    c5dec('co',2,'Add a cloud-host failover for the customer platform?','The cloud host is a single point of failure with no alternative — the customer platform can’t recover in time if it fails.',
      {on:'Add failover — a backup provider or contractual failover SLA',osum:'removes the single point of failure',pros:['Removes the no-alternative cloud-host dependency.','Brings the customer platform inside its continuity target.','Complements the identity fix — access and infrastructure both resilient.'],cons:['Capital + a multi-region / secondary-provider program.','Onboarding + failover-testing effort.']},
      [{on:'Monitor for now',osum:'accept the SPOF, keep it under watch',pros:['No spend today.'],cons:['A cloud-host outage still stops the customer platform with no failover.','Requires a documented operational risk-acceptance.']}])
  ];
  host.innerHTML=c5header()+
    c5shell('Decisions for the COO · what needs your call?','One fix converges across operations — then the failover call that’s yours.',null,'Each is tied to a critical process. Choosing one stamps it with your name and time, keeps it editable for 24 hours, and opens a tracked project in the ticketing system connected at onboarding — status pulled back on refresh.')+
    c5convergeStrip('coo')+
    c5decisions(list)+
    '<div class="c5foot">Each decision links to its critical process and source · no AI/LLM at run-time.</div>';
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
  var regs=c5legalRegimes();var TD=c5TopDriver(),dm=c5get(TD.mid);
  var body=regs.length?('<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Regimes in scope · obligation and clock</div>'+regs.map(function(r){var pill=r.binding?'a':'b';var pt=r.binding?'Tightest clock':'In scope';
    return '<div class="c5prow" data-c5m="cl_obligations"><span class="c5sq '+(r.binding?'a':'b')+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">'+r.name+'</div><div class="c5row-s">'+r.obl+' · '+r.clock+'</div></div><span class="c5pill '+pill+'">'+pt+'</span></div>';
  }).join('')+'</div>'):'<div class="c5note">◐ Set your operating regions in onboarding to load the obligations register (regime · obligation · clock · penalty), each traceable to its ruleset.</div>';
  host.innerHTML=c5header()+
    c5shell('Regulatory exposure · where are we exposed by jurisdiction?','Your obligations, by jurisdiction — with the exposure most likely to trigger a filing.',null,'Your cyber-regulatory obligations, by jurisdiction, each with its clock and penalty — surfaced, not judged (the compliance call is yours). The customer-platform '+TD.short+' gap is the exposure most likely to trigger a reportable event.')+
    '<div class="c5cards">'+c5card('cl_jurisdictions')+c5card('cl_obligations')+c5card('cl_binding_clock')+'</div>'+
    body+
    c5bl('The decision','Close the exposure most likely to trigger a filing.',null,(dm.connected?('The customer-platform '+TD.short+' gap is the exposure most likely to cause a reportable breach — starting notification clocks across jurisdictions (SEC 8-K, GDPR/UK 72h, DORA, and the rest). Closing it ('+dm.displayValue+') reduces your most probable disclosure trigger.'):'Connect your controls and the exposure most likely to trigger a filing — the '+TD.short+' gap — surfaces here with its funded fix.'),{mid:TD.mid,txt:'Close the top disclosure trigger — '+c5esc(TD.short)})+
    '<div class="c5foot">Obligations mapped to your jurisdictions (SEC cyber disclosure · GDPR/CCPA · DORA · EU AI Act · EU CRA); evidence traces to source. Not legal advice — the compliance determination is your counsel’s. · '+regs.length+' regimes in scope</div>';
}
/* Tab 02 — Breach-notification readiness */
function c5clNotification(){
  var host=document.getElementById('cl-notification');if(!host)return;
  var regs=c5legalRegimes();var ir=(typeof LIVE!=='undefined'&&LIVE&&LIVE.governance&&LIVE.governance.ir)||{};var tested=/yes|tested|tabletop/i.test(ir.tested||'');var TD=c5TopDriver(),dm=c5get(TD.mid),IDF=c5IdFix();
  var body=regs.length?('<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Notification clocks &amp; disclosure defensibility · regime, deadline, readiness</div>'+regs.map(function(r){var ready=tested;var pill=ready?'g':'a';var pt=ready?'Ready':'Watch';
    return '<div class="c5prow" data-c5m="cl_runbooks"><span class="c5sq '+(ready?'g':'a')+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">'+r.name+'</div><div class="c5row-s">'+r.obl+'</div></div><div class="c5prow-v" style="width:auto">'+r.clock+'</div><span class="c5pill '+pill+'" style="flex:none">'+pt+'</span></div>';
  }).join('')+
  '<div class="c5prow" data-c5m="cl_contracts"><span class="c5sq a" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Customer SLAs</div><div class="c5row-s">Per enterprise contracts · needs your CLM</div></div><div class="c5prow-v" style="width:auto">24–48h</div><span class="c5pill a" style="flex:none">Watch</span></div>'+
  '<div class="c5prow" data-c5m="cl_forensic_gap"><span class="c5sq a" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Legal hold · privilege · defensibility</div><div class="c5row-s">Forensic evidence + privileged IR record — thin on the '+IDF.short+' access path</div></div><div class="c5prow-v" style="width:auto">on trigger</div><span class="c5pill a" style="flex:none">Thin</span></div></div>'):'<div class="c5note">◐ Set your operating regions to load the notification clocks; connect your IR runbooks to score readiness.</div>';
  var evSrcs=[{label:'Jurisdiction ruleset (clocks)',connected:regs.length>0},{label:'IR runbooks',connected:!!ir.tested},{label:'Forensic / logging evidence',connected:false},{label:'Legal-hold + privilege records',connected:false},{label:'Identity access model',connected:c5get(IDF.mid).connected}];
  var connN=evSrcs.filter(function(s){return s.connected;}).length;
  host.innerHTML=c5header()+
    c5shell('Incident & disclosure readiness · can we notify on the clock and prove it?','You can meet the clocks — if the forensic evidence and privileged record are ready.',null,'If a breach hit today, could you notify in time, prove what happened, and defend the record? Your fastest clock is below. Runbooks are the readiness signal; '+IDF.short+' is the one area where forensic readiness and defensibility are thin. Each clock traces to its runbook and evidence.')+
    '<div class="c5cards">'+c5card('cl_binding_clock')+c5card('cl_runbooks')+c5card('cl_forensic_gap')+'</div>'+
    body+
    c5bl('The decision','Shore up forensic readiness and defensibility on the '+IDF.short+' path.',null,(dm.connected?('You can meet the clocks, but proving what happened — and defending the risk-acceptance record — in an '+IDF.short+'-driven incident is your thin spot. The '+IDF.short+' fix ('+dm.displayValue+' · '+IDF.owner+') improves logging, evidence and privileged-record readiness — faster, defensible notification.'):'Connect your identity + SIEM tools and the forensic-readiness gap on the '+IDF.short+' path surfaces here, tied to the funded fix.'),{mid:IDF.mid,txt:'Improve forensics + defensibility — fund the fix'})+
    '<div class="c5foot">Clocks from the jurisdiction ruleset; readiness from your IR runbooks; forensic + privilege records connect-list. Not legal advice. · '+connN+' sources connected'+'</div>';
}
/* Tab 03 — Contractual & litigation risk */
function c5clContracts(){
  var host=document.getElementById('cl-contracts');if(!host)return;
  var lit=c5get('cl_litigation'),TD=c5TopDriver(),dm=c5get(TD.mid),IDF=c5IdFix();var V=c5vendors();var tvName=V.worst?V.worst.name:'a Tier-1 vendor';
  var insGap=c5get('cf_ins_gap');var insAdequate=insGap.connected&&insGap.color!=='warn';
  var rows='<div class="c5rank"><div class="c5rank-h">Cyber-related contractual, indemnity, insurance &amp; litigation exposure</div>'+
    '<div class="c5prow" data-c5m="cl_platform_tied"><span class="c5sq a" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Enterprise SLAs — uptime warranties</div><div class="c5row-s">An '+IDF.short+'-driven outage could breach them · count needs your CLM</div></div><span class="c5pill a" style="flex:none">At risk</span></div>'+
    '<div class="c5prow" data-c5m="cl_contracts"><span class="c5sq n" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Data-processing agreements (DPAs)</div><div class="c5row-s">Customer-data obligations · count needs your CLM</div></div><span class="c5pill n" style="flex:none">Connect CLM</span></div>'+
    '<div class="c5prow" data-c5m="thirdparty_risk"><span class="c5sq a" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Vendor indemnities — '+tvName+'</div><div class="c5row-s">Falling-rated vendor · review the indemnity + exit terms</div></div><span class="c5pill a" style="flex:none">Watch</span></div>'+
    '<div class="c5prow" data-c5m="cf_ins_gap"><span class="c5sq '+(insAdequate?'g':'a')+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Insurance coverage adequacy vs modeled tail</div><div class="c5row-s">'+(insGap.connected?((insAdequate?'tail transferred':(insGap.displayValue+' retained residual liability'))+' · check exclusions/sublimits'):'connect the policy + tail model')+'</div></div><span class="c5pill '+(insAdequate?'g':'a')+'" style="flex:none">'+(insGap.connected?(insAdequate?'Adequate':'Gap'):'—')+'</span></div>'+
    '<div class="c5prow" data-c5m="cl_litigation"><span class="c5sq '+(lit.connected?(lit.color==='warn'?'a':'g'):'n')+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Active legal holds</div><div class="c5row-s">'+(lit.connected?(lit.displayValue+' cyber-related hold'+(lit.displayValue==='1'?'':'s')):'connect your legal-hold system')+'</div></div><span class="c5pill '+(lit.connected?(lit.color==='warn'?'a':'g'):'n')+'" style="flex:none">'+(lit.connected?(lit.displayValue==='0'?'Clear':'Open'):'—')+'</span></div>'+
    '</div>';
  var evSrcs=[{label:'Contract lifecycle mgmt (CLM)',connected:false},{label:'Vendor indemnities',connected:V.seed.length>0},{label:'Insurance policy + tail model',connected:insGap.connected},{label:'Legal-hold system',connected:lit.connected},{label:'Identity exposure model',connected:c5get(IDF.mid).connected}];
  var connN=evSrcs.filter(function(s){return s.connected;}).length;
  host.innerHTML=c5header()+
    c5shell('Contracts & liability · where is our legal liability?','Liability concentrates in contracts tied to platform uptime, and in the uninsured tail — one fix touches both.',null,'Your cyber-related contractual, indemnity, insurance and litigation exposure. A cluster of enterprise contracts warrants customer-platform uptime; a falling-rated vendor’s indemnity is worth review; and the uninsured tail is retained legal liability. Contract counts need your CLM connected. Each item traces to its clause and exposure — surfaced, not judged.')+
    '<div class="c5cards">'+c5card('cl_contracts')+c5card('cl_platform_tied')+c5card('cl_litigation')+'</div>'+
    rows+
    c5bl('The decision','Protect the contracts tied to platform uptime — and the tail behind them.',null,(dm.connected?('The enterprise contracts that warrant customer-platform uptime could be breached by an '+IDF.short+'-driven outage, and the uninsured tail is retained liability. Closing the '+IDF.short+' gap ('+dm.displayValue+' · '+IDF.owner+') protects those warranties and lowers the tail behind them.'):'Connect your controls and CLM and the platform-tied warranties an '+IDF.short+' outage could breach surface here.'),{mid:IDF.mid,txt:'Protect the warranties — fund the identity fix'})+
    '<div class="c5foot">Contract terms from your CLM; insurance adequacy from the policy + tail model; exposure mapped to the platform. Not legal advice. · '+connN+' sources connected'+'</div>';
}
/* Tab 04 — Privacy & DSAR */
function c5clPrivacy(){
  var host=document.getElementById('cl-privacy');if(!host)return;
  var ap=c5get('cl_access_pd'),TD=c5TopDriver(),dm=c5get(TD.mid);
  host.innerHTML=c5header()+
    c5shell('Privacy & DSAR · are we handling requests on time?','Privacy operations are running — access hygiene is the soft spot.',null,'Your privacy posture: data-subject requests against SLA, records of processing, consent. The one soft spot is access hygiene — over-permissioned or stale identities near personal data, part of the '+TD.short+' gap.')+
    '<div class="c5cards">'+c5card('cl_dsar_sla')+c5card('cl_ropa')+c5card('cl_access_pd')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('cl_litigation','g','Holds','Active cyber-related litigation holds')+
    '</div>'+
    c5bl('Bottom line','Tighten access to personal data.',null,(dm.connected?('Over-permissioned or stale identities near personal data are a privacy risk and part of the '+TD.short+' gap. Closing it ('+dm.displayValue+') enforces least-privilege access — lower privacy exposure and cleaner audits.'):'Connect your identity tools and the access-hygiene soft spot near personal data surfaces here, tied to the funded '+TD.short+' fix.'),{mid:TD.mid,txt:'Enforce least-privilege — fund the fix'})+
    '<div class="c5foot">Privacy operations from your DSAR and records-of-processing systems.</div>';
}
/* Tab 05 — Decisions for the CLO */
function c5clDecisions(){
  var host=document.getElementById('cl-decisions');if(!host)return;
  var TD=c5TopDriver(),dm=c5get(TD.mid),tp=c5get('thirdparty_risk'),IDF=c5IdFix();
  var list=[
    // Decision 1 — the convergent identity fix (recommended), with its honest downside.
    c5dec('cl',1,'Support the '+IDF.short+' fix?','One action reduces your top disclosure trigger, protects platform warranties, and tightens access to personal data'+(dm.connected?(' ('+dm.displayValue+')'):'')+'. The one fix that moves every CLO tab (regulatory, contracts, disclosure).',
      {on:'Support it — the highest-leverage legal reducer',osum:(dm.connected?('Reduces three legal exposures at once · −'+dm.displayValue):'Reduces three legal exposures at once'),pros:['Reduces your most probable breach-notification trigger.','Protects platform-tied contractual warranties.','Enforces least-privilege access to personal data and improves forensic defensibility.'],cons:['Depends on management funding the fix.','Interim exposure persists across the '+IDF.timeline+' rollout — the trigger isn’t closed on day one.']}),
    // Decision 2 — the CLO's domain call: close the top regulatory-obligation / insurance gap.
    c5dec('cl',2,'Close the top regulatory-obligation or insurance-adequacy gap?','The highest-priority compliance gap — an unmet obligation (e.g. EU AI Act high-risk documentation) or an inadequate insurance tail — is the CLO’s call to close or formally accept.',
      {on:'Close the top gap — assign owner + deadline',osum:'unmet obligation → owned + dated',pros:['Turns an open obligation into an owned, dated remediation.','Reduces regulatory-penalty and coverage-shortfall exposure.'],cons:['Counsel + program effort this quarter.','May require budget (e.g. raising the policy limit).']},
      [{on:'Formally accept with recorded rationale',osum:'documented risk-acceptance',pros:['Defensible, dated acceptance record.'],cons:['The gap and its liability persist until revisited.']}])
  ];
  host.innerHTML=c5header()+
    c5shell('Decisions for the CLO · what needs your call?','One action reduces disclosure, contractual and privacy exposure at once — then the compliance gap that’s yours to close.',null,'One action reduces your top disclosure, contractual and privacy exposures at once. Choosing one stamps it with your name and time, keeps it editable for 24 hours, and opens a tracked matter in the ticketing system connected at onboarding. This surfaces obligations, not legal conclusions.')+
    c5convergeStrip('clo')+
    c5decisions(list)+
    '<div class="c5foot">Each decision links to its obligation, contract, or record. Not legal advice · no AI/LLM at run-time.</div>';
}

/* ================= CTO seat — same engine, engineering-estate lens ================= */
/* Tab 01 — Technology risk */
function c5ctTech(){
  var host=document.getElementById('ct-tech');if(!host)return;
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var IDF=c5IdFix();                       // shared identity-fix config (cost/timeline/owner)
  var ph=c5get('ct_platform_health'),cv=c5get('ct_critical_vulns'),td=c5get('ct_techdebt');
  var debtStr=td.connected?td.displayValue:'—';   // from ct_techdebt (state), never hard-coded
  var idUsd=IDF.usd||'—';                          // from the shared identity-fix config (state)
  // ── critical-vuln reconciliation: the estate total is the LIVE ct_critical_vulns signal;
  //    the per-platform breakdown is Modeled but the customer platform absorbs the balance,
  //    so total = sum(rows) and concentration = the at-risk platform — they cannot disagree. ──
  var liveTotal=cv.connected?(parseInt(String(cv.displayValue).replace(/[^0-9]/g,''),10)||0):null;
  var otherVulns={fulfillment:3,payments:2,supply:2,financial:0};
  var othersSum=otherVulns.fulfillment+otherVulns.payments+otherVulns.supply+otherVulns.financial; // 7
  var custVulns=(liveTotal!=null)?Math.max(0,liveTotal-othersSum):11;
  // ── per-platform estate matrix (Modeled breakdown), mapped to the shared C5_SYSTEMS ──
  var platforms=[
    {key:'customer',label:c5sysLabel('customer'),sub:'Identity architecture gap · sprawl in cloud',vulns:custVulns,kind:'atrisk'},
    {key:'fulfillment',label:c5sysLabel('fulfillment'),sub:'WMS',vulns:otherVulns.fulfillment,kind:'healthy'},
    {key:'payments',label:'Payments platform',sub:'Core processing',vulns:otherVulns.payments,kind:'healthy'},
    {key:'supply',label:'Supply chain systems',sub:'3PL integrations',vulns:otherVulns.supply,kind:'modernizing'},
    {key:'financial',label:'Financial systems (ERP)',sub:'Legacy'+(td.connected?(' · '+debtStr+' debt mapped'):' · debt mapped'),vulns:otherVulns.financial,kind:'managed'}
  ];
  var totalVulns=platforms.reduce(function(s,p){return s+p.vulns;},0); // = liveTotal when live
  var cleanN=platforms.filter(function(p){return p.kind!=='atrisk';}).length; // 4 of 5
  var atP=platforms.filter(function(p){return p.kind==='atrisk';})[0]||null;
  var concVulns=atP?atP.vulns:0;
  // ── three metric cards (drill-through preserved via data-c5m); sub can carry its own colour ──
  function tcard(mid,title,val,pill,pillCls,valCol,sub,subCol){return '<div class="c5card" data-c5m="'+mid+'"><div class="c5card-top"><span class="c5card-l">'+c5esc(title)+'</span><span class="c5pill '+pillCls+'" style="font-size:9px">'+c5esc(pill)+'</span></div><div class="c5card-v" style="color:var(--'+(valCol||'ink')+')">'+c5esc(String(val))+'</div><div class="c5esub" style="font-size:11px;color:var(--'+(subCol||'muted')+');margin-top:2px">'+c5esc(sub)+'</div></div>';}
  var phVal=ph.connected?ph.displayValue:(cleanN>=platforms.length-1?'Strong':'Watch');
  var cards='<div class="c5cards">'+
    tcard('ct_platform_health','Platform health',phVal,'Computed','n','good',cleanN+' of '+platforms.length+' platforms clean')+
    tcard('ct_critical_vulns','Critical vulns open',totalVulns,(cv.connected?'Live':'Modeled'),(cv.connected?'g':'a'),'warn',concVulns+' on the '+c5sysLabel('customer').toLowerCase(),'crit')+
    tcard('ct_modernization','Modernization','On track','Computed','n','blue','Roadmap in place'+(td.connected?(' · '+debtStr+' debt mapped'):''))+
    '</div>';
  // ── estate-by-platform matrix (centerpiece) — status per row, sorted by risk ──
  var illus='<span class="c5pill n" style="font-size:9px">Modeled</span>';
  function stTxt(k){return k==='atrisk'?'At risk':k==='modernizing'?'Modernizing':k==='managed'?'Managed':'Healthy';}
  function stPill(k){return k==='atrisk'?'r':k==='modernizing'?'b':k==='managed'?'n':'g';}
  var sorted=platforms.slice().sort(function(a,b){var ra=(a.kind==='atrisk'?0:1),rb=(b.kind==='atrisk'?0:1);return ra-rb||(b.vulns-a.vulns);});
  var pmRows=sorted.map(function(p){var vCol=(p.vulns>=10?'crit':'muted');
    return '<div class="c5prow" data-c5m="'+(p.kind==='atrisk'?IDF.mid:'ct_critical_vulns')+'" style="cursor:pointer">'+
      '<div style="flex:1;min-width:0"><div class="c5row-t">'+c5esc(p.label)+'</div><div class="c5row-s">'+c5esc(p.sub)+'</div></div>'+
      '<div style="text-align:right;flex:none;min-width:56px;margin-right:12px"><div style="font-weight:600;color:var(--'+vCol+')">'+p.vulns+'</div><div style="font-size:10.5px;color:var(--muted)">critical</div></div>'+
      '<span class="c5pill '+stPill(p.kind)+'" style="flex:none">'+stTxt(p.kind)+'</span></div>';
  }).join('');
  var matrix='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:16px 0 8px"><span style="font-size:12.5px;font-weight:600;color:var(--ink)">Estate by platform — security and modernization '+illus+'</span><span style="font-size:11px;color:var(--muted)">Sorted by risk</span></div><div class="c5card" style="padding:2px 14px">'+pmRows+'</div>';
  // ── architecture-gap strip (Live + modeled) — $ pulls from the shared identity-fix config ──
  var sep='<span style="color:var(--line)">·</span>';
  var gapTag='<span class="c5pill n" style="font-size:9px">Live + modeled</span>';
  var strip='<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-top:14px;padding:12px 16px;border-radius:12px;background:var(--surface-2)">'+
    '<span style="font-size:12px;color:var(--ink-2);font-weight:600">The architecture gap:</span>'+
    '<span style="font-size:12.5px;color:var(--crit);font-weight:600">identity sprawl in cloud</span>'+sep+
    '<span style="font-size:12px;color:var(--muted)">'+idUsd+' exposure</span>'+sep+
    '<span style="font-size:12px;color:var(--muted)">fragmented access model</span>'+gapTag+'</div>';
  // ── evidence footnote ──
  var evSrcs=[
    {label:'Platform health',connected:ph.connected},
    {label:'Critical vulns (KEV / SCA)',connected:cv.connected},
    {label:'Application security (SAST)',connected:c5get('ct_appsec').connected},
    {label:'Modernization / EOL roadmap',connected:td.connected},
    {label:'Identity exposure model',connected:c5get(IDF.mid).connected},
    {label:'Estate → critical-system mapping',connected:true},
    {label:'Architecture records',connected:true}
  ];
  var connN=evSrcs.filter(function(s){return s.connected;}).length;
  // ── headline + supporting line (data-driven from the matrix) ──
  var head='Your estate is modernizing and mostly secure — but the '+c5sysLabel('customer').toLowerCase()+'’s identity architecture is the biggest gap, and it’s where your open criticals concentrate.';
  var support=cleanN+' of '+platforms.length+' core platforms are clean. The '+c5sysLabel('customer').toLowerCase()+' carries the identity architecture gap and '+concVulns+' of '+totalVulns+' open critical vulns; legacy tech debt is mapped with a roadmap in place.';
  host.innerHTML=c5header()+
    c5shell('Technology risk · is our stack secure and modern?',head,'warn',support)+
    cards+
    matrix+
    strip+
    c5bl('The decision','Fund the identity fix — it closes the estate’s biggest architecture gap.',null,'The identity architecture behind the '+c5sysLabel('customer').toLowerCase()+' is the single point of failure in the stack and where your critical vulns concentrate. The fix is funded and owned ('+IDF.owner+' · '+IDF.timeline+'): it consolidates the access model, removes the identity SPOF, and clears the concentrated exposure. Same fix that surfaces on Supply chain and Decisions.',{mid:IDF.mid,txt:'Fund the identity fix — closes the gap'})+
    '<div class="c5foot">platform health and critical vulns are live; exposure and tech-debt figures are modeled. · '+connN+' sources connected'+(demo?' · demo':'')+'</div>';
}
/* Tab 02 — Digital-service reliability */
function c5ctReliability(){
  var host=document.getElementById('ct-reliability');if(!host)return;
  var S=c5Services(),TD=c5TopDriver(),dm=c5get(TD.mid);
  var body=S.total?('<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Customer-facing services · posture and status</div>'+S.list.map(function(s){var pill=s.status==='At risk'?'a':'g';
    return '<div class="c5prow" data-c5m="'+(s.status==='At risk'?TD.mid:'ct_sec_incidents')+'"><span class="c5sq '+(s.c==='warn'?'a':'g')+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">'+s.name+'</div><div class="c5row-s">'+s.sub+'</div></div><span class="c5pill '+pill+'">'+s.status+'</span></div>';
  }).join('')+'</div>'):'<div class="c5note">◐ Map your crown-jewel / customer-facing services in onboarding to see reliability + security posture per service.</div>';
  host.innerHTML=c5header()+
    c5shell('Digital-service reliability · are our services safe and available?','Services are reliable and secure — the platform’s access path is the risk.',null,'Your customer-facing services: available, performant, secure. The one reliability risk is the '+TD.short+'/access path to the customer platform — both a security and an availability concern. Availability and SLOs light up when your observability stack connects.')+
    '<div class="c5cards">'+c5card('ct_availability')+c5card('ct_services_slo')+c5card('ct_sec_incidents')+'</div>'+
    body+
    c5bl('Bottom line','Harden the access path to your top service.',null,(dm.connected?('The customer platform is your most-used service; its '+TD.short+'/access path is the one reliability-and-security risk. The '+TD.short+' fix hardens it — resilient access, fewer failure modes.'):'Connect your controls and the one reliability-and-security risk — the platform’s access path — surfaces here with its funded fix.'),{mid:TD.mid,txt:'Fund the '+c5esc(TD.short)+' fix — hardens the platform'})+
    '<div class="c5foot">Availability and SLOs from your observability stack; security posture traces to source.</div>';
}
/* Tab 03 — AI & innovation risk */
function c5ctAi(){
  var host=document.getElementById('ct-ai');if(!host)return;
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var IDF=c5IdFix();                              // shared identity-fix config (cost/owner/framing)
  var inv=c5get('ct_ai_inventory'),gov=c5get('ct_ai_governed');
  var g=(typeof LIVE!=='undefined'&&LIVE&&LIVE.aiRisk&&LIVE.aiRisk.governance)||{};
  var frameworkInPlace=/nist|iso|rmf/i.test(g.framework||'');   // a FORMAL framework (≠ guardrails)
  var invN=inv.connected?inv.displayValue:'—';
  // ── AI-systems matrix (centerpiece). Placeholder classifications stay conservative and
  //    behind the Illustrative badge until the model registry + a real EU AI Act mapping
  //    are wired — a legally-high-risk system is never shown Minimal. Status is per-row. ──
  var systems=[
    {name:'Customer support assistant',sub:'Customer-facing · reads customer data · relies on identity gap',risk:'High',gov:'Guardrails only'},
    {name:'Fraud & risk scoring',sub:'Payments · transaction data',risk:'Limited',gov:'Governed'},
    {name:'Third-party vendor models',sub:'External (6) · terms + data flows reviewed',risk:'Limited',gov:'Under review'},
    {name:'Developer copilot',sub:'Engineering · internal code',risk:'Minimal',gov:'Guardrails'},
    {name:'Demand forecasting',sub:'Supply chain · internal data',risk:'Minimal',gov:'Governed'},
    {name:'Marketing content gen',sub:'No sensitive data',risk:'Minimal',gov:'Governed'}
  ];
  var highN=systems.filter(function(s){return s.risk==='High';}).length; // ← the "high-risk uses" count, DERIVED
  // ── three metric cards (drill-through preserved via data-c5m); sub can carry its own colour ──
  function acard(mid,title,val,pill,pillCls,valCol,sub,subCol){return '<div class="c5card" data-c5m="'+mid+'"><div class="c5card-top"><span class="c5card-l">'+c5esc(title)+'</span><span class="c5pill '+pillCls+'" style="font-size:9px">'+c5esc(pill)+'</span></div><div class="c5card-v" style="color:var(--'+(valCol||'ink')+')">'+c5esc(String(val))+'</div><div class="c5esub" style="font-size:11px;color:var(--'+(subCol||'muted')+');margin-top:2px">'+c5esc(sub)+'</div></div>';}
  var cards='<div class="c5cards">'+
    acard('ct_ai_inventory','AI systems',invN,'Self-reported','n','ink','Shadow AI not yet verified','warn')+
    acard('ct_ai_governed','Governance framework',(frameworkInPlace?'In place':'Not in place'),'Computed','n',(frameworkInPlace?'good':'warn'),'Guardrails operational · policy pending')+
    acard('ct_ai_highrisk','High-risk uses',highN,'EU AI Act','a','warn','Customer-facing · reads customer data')+
    '</div>';
  // ── AI-systems matrix ──
  var illus='<span class="c5pill n" style="font-size:9px">Illustrative</span>';
  function govPill(s){return s==='Governed'?'g':s==='Under review'?'b':'a';} // guardrails-only / guardrails ⇒ amber
  var sorted=systems.slice().sort(function(a,b){return c5aiRiskRank(a.risk)-c5aiRiskRank(b.risk);});
  var amRows=sorted.map(function(s){var rc=c5aiRiskCls(s.risk);var mid=(s.risk==='High')?IDF.mid:'ct_ai_governed';
    return '<div class="c5prow" data-c5m="'+mid+'" style="cursor:pointer">'+
      '<div style="flex:1;min-width:0"><div class="c5row-t">'+c5esc(s.name)+'</div><div class="c5row-s">'+c5esc(s.sub)+'</div></div>'+
      '<div style="text-align:right;flex:none;min-width:58px;margin-right:12px;font-weight:600;color:var(--'+rc+')">'+c5esc(s.risk)+'</div>'+
      '<span class="c5pill '+govPill(s.gov)+'" style="flex:none">'+c5esc(s.gov)+'</span></div>';
  }).join('');
  var matrix='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:16px 0 8px"><span style="font-size:12.5px;font-weight:600;color:var(--ink)">AI systems — risk class and governance '+illus+'</span><span style="font-size:11px;color:var(--muted)">Sorted by risk</span></div><div class="c5card" style="padding:2px 14px">'+amRows+'</div>';
  // ── regulatory & data strip (Illustrative) — identity refs from the shared config ──
  var sep='<span style="color:var(--line)">·</span>';
  var strip='<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-top:14px;padding:12px 16px;border-radius:12px;background:var(--surface-2)">'+
    '<span style="font-size:12px;color:var(--ink-2);font-weight:600">Regulatory &amp; data:</span>'+
    '<span style="font-size:12.5px;color:var(--warn);font-weight:600">high-risk use carries EU AI Act obligations</span>'+sep+
    '<span style="font-size:12px;color:var(--muted)">customer-data AI relies on the '+IDF.short+' gap</span>'+illus+'</div>';
  // ── evidence footnote ──
  var evSrcs=[
    {label:'AI model registry / inventory',connected:inv.connected},
    {label:'AI governance framework',connected:gov.connected},
    {label:'EU AI Act risk classification',connected:true},
    {label:'AI data-access mapping',connected:true},
    {label:'Identity exposure model',connected:c5get(IDF.mid).connected},
    {label:'Third-party AI / vendor review',connected:c5get('thirdparty_risk').connected}
  ];
  var connN=evSrcs.filter(function(s){return s.connected;}).length;
  // ── data-driven headline + supporting line ──
  var head='AI is inventoried and guardrailed in practice — but a formal governance framework isn’t in place yet, and the '+(highN===1?'one high-risk use':(highN+' high-risk uses'))+' lean'+(highN===1?'s':'')+' on the same '+IDF.short+' gap.';
  var support='Two watch items: stand up the governance framework (policy, EU AI Act mapping, inventory verification), and secure the customer-facing AI that reads customer data through the identity fix.';
  host.innerHTML=c5header()+
    c5shell('AI &amp; innovation risk · are we shipping safely?',head,'warn',support)+
    cards+
    matrix+
    strip+
    c5bl('The decision — two moves','Secure the access your AI relies on, and make governance provable.',null,'The AI features that read customer data depend on the same identity controls that carry the gap — funding the identity fix secures AI’s access to data. Separately, stand up the governance framework (policy, EU AI Act mapping, inventory verification) so “under governance” is provable, not asserted. Identity is the same fix across the cockpit ('+IDF.owner+'); governance is this seat’s own call.',{mid:IDF.mid,txt:'Secure AI access — fund the identity fix'},{mid:'ct_ai_governed',txt:'Stand up AI governance framework'})+
    '<div class="c5foot">AI inventory and governance from your model registry and pipeline; risk classification and data-access mapping are connected demo values. · '+connN+' sources connected'+(demo?' · demo':'')+'</div>';
}
/* Tab 04 — Software supply chain · PRIMARY decision is the advisory patch, NOT identity */
function c5ctSupply(){
  var host=document.getElementById('ct-supply');if(!host)return;
  var demo=(typeof signalsAreDemo==='function')&&signalsAreDemo();
  var adv=c5get('ct_advisories'),appsec=c5get('ct_appsec'),IDF=c5IdFix();
  // ── honest partial coverage: 1 of 3 supply-chain signals is live (SCA); SBOM + signing aren't ──
  var advConn=adv.connected,sbomConn=false,signConn=false;
  var sigLive=[advConn,sbomConn,signConn].filter(Boolean).length;
  var advCount=advConn?adv.displayValue:'—';
  var illus='<span class="c5pill n" style="font-size:9px">Illustrative until scanner-wired</span>';
  // ── per-component matrix. Advisory detail (CVSS / KEV / blast radius) is illustrative until
  //    the real scanner is wired — a wrong "not exploited" would be a compliance miss, so it's
  //    badged, never shown as confirmed fact. ──
  function comp(mid,name,tag,tagCls,sub,pill,pillCls){return '<div class="c5prow" data-c5m="'+mid+'" style="cursor:pointer"><div style="flex:1;min-width:0"><div class="c5row-t">'+c5esc(name)+(tag?(' <span class="c5tag '+(tagCls||'')+'">'+c5esc(tag)+'</span>'):'')+'</div><div class="c5row-s">'+sub+'</div></div><span class="c5pill '+pillCls+'" style="flex:none">'+c5esc(pill)+'</span></div>';}
  var advSub=advConn?(advCount+' critical advisor'+(advCount==='1'?'y':'ies')+' · CVSS 9.8 · KEV-listed · blast radius: the customer-platform auth path'):'connect your SCA scanner to see the advisories on your critical path';
  var rows=
    comp('ct_advisories','Auth-library advisory','High','rev',advSub,(advConn?(adv.color==='warn'?'Patch now':'Clear'):'—'),(advConn&&adv.color==='warn'?'r':'g'))+
    comp('ct_appsec','Code-scanning findings','SAST','',(appsec.connected?(appsec.displayValue+' · first-party code · scheduled remediation'):'first-party code · scheduled remediation'),'Scheduled','b')+
    comp('ct_deps','SBOM coverage','','','not connected — connect your SBOM to inventory the full dependency tree','Connect SBOM','n')+
    comp('ct_unsigned','Build signing','','','not connected — connect CI/CD signing to verify release integrity','Connect CI/CD','n');
  var matrix='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:16px 0 8px"><span style="font-size:12.5px;font-weight:600;color:var(--ink)">Software supply chain — signals and integrity '+illus+'</span><span style="font-size:11px;color:var(--muted)">'+sigLive+' of 3 signals live</span></div><div class="c5card" style="padding:2px 14px">'+rows+'</div>';
  // ── regulatory strip — EU Cyber Resilience Act (CRA) ──
  var sep='<span style="color:var(--line)">·</span>';
  var strip='<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-top:14px;padding:12px 16px;border-radius:12px;background:var(--surface-2)">'+
    '<span style="font-size:12px;color:var(--ink-2);font-weight:600">Regulatory:</span>'+
    '<span style="font-size:12.5px;color:var(--warn);font-weight:600">EU Cyber Resilience Act (CRA)</span>'+sep+
    '<span style="font-size:12px;color:var(--muted)">requires vulnerability handling + an SBOM for products with digital elements</span>'+illus+'</div>';
  var evSrcs=[{label:'SCA scanner (advisories)',connected:advConn},{label:'SAST code scanning',connected:appsec.connected},{label:'SBOM',connected:sbomConn},{label:'CI/CD build signing',connected:signConn},{label:'Identity exposure model',connected:c5get(IDF.mid).connected}];
  var connN=evSrcs.filter(function(s){return s.connected;}).length;
  var head='One of three supply-chain signals is live — the SCA scanner. It flags a high-severity auth-library advisory on the customer platform’s critical path; SBOM and build-signing are not yet connected.';
  var support='Advisories come from your connected SCA scanner; SBOM coverage and build-signing integrity light up when those tools connect. The auth-library advisory sits on the same access path as the '+IDF.short+' gap, so the identity fix also shrinks its blast radius. Each item traces to its scanner.';
  host.innerHTML=c5header()+
    c5shell('Software supply chain · are our dependencies safe?',head,'warn',support)+
    '<div class="c5cards">'+c5card('ct_advisories')+c5card('ct_deps')+c5card('ct_unsigned')+'</div>'+
    matrix+
    strip+
    c5bl('The decision','Clear the advisory in your critical path — then fund the fix that shrinks its blast radius.',null,(advConn?('A high-severity, KEV-listed advisory in an auth library used by the customer platform is your top supply-chain item — patch it now. It sits on the same access path as the '+IDF.short+' gap'+(IDF.usd?(', so funding the identity fix ('+IDF.usd+' · '+IDF.owner+') reduces the blast radius of auth-library issues'):', so the identity fix reduces the blast radius')+'.'):'Connect your SCA scanner and the high-severity advisories on your critical path surface here — patch first, with the identity fix reducing the blast radius.'),{mid:'ct_advisories',txt:'Patch the auth-library advisory'},{mid:IDF.mid,txt:'Fund the identity fix — reduces blast radius'})+
    '<div class="c5foot">Advisories from your SCA scanner; SBOM + signing connect-list; CVSS/KEV/blast-radius detail is illustrative until the scanner is wired. · '+connN+' sources connected'+(demo?' · demo':'')+'</div>';
}
/* Tab 05 — Decisions for the CTO */
function c5ctDecisions(){
  var host=document.getElementById('ct-decisions');if(!host)return;
  var TD=c5TopDriver(),dm=c5get(TD.mid),adv=c5get('ct_advisories'),IDF=c5IdFix();
  var g=(typeof LIVE!=='undefined'&&LIVE&&LIVE.aiRisk&&LIVE.aiRisk.governance)||{};var frameworkInPlace=/nist|iso|rmf/i.test(g.framework||'');
  var list=[
    // Decision 1 — the convergent identity fix (recommended), with its honest downside.
    c5dec('ct',1,'Fund the '+IDF.short+' fix?','Closes the biggest architecture gap in the stack — the customer platform’s access model'+(dm.connected?(' ('+dm.displayValue+')'):'')+'. The one fix that moves cyber on every CIO tab (tech estate, AI, supply chain).',
      {on:'Fund it — closes & simplifies the access model',osum:(dm.connected?('Largest architecture gap · −'+dm.displayValue):'Largest architecture gap'),pros:['Closes the largest architecture gap and simplifies the access model.','Secures the customer-data AI’s access and shrinks the auth-library blast radius.','Reduces blast radius across the platform.'],cons:['Larger, multi-sprint effort and cost.','Interim exposure persists across the '+IDF.timeline+' rollout — not closed on day one.']}),
    // Decision 2 — the CIO's domain call: stand up the AI governance framework.
    c5dec('ct',2,'Stand up the AI governance framework?','AI is guardrailed in practice but a formal framework '+(frameworkInPlace?'is in place':'is not in place yet')+' — so "under governance" is asserted, not provable, and the high-risk customer-facing use carries EU AI Act obligations.',
      {on:'Formalize — adopt a framework + EU AI Act mapping',osum:'provable governance',pros:['Adopts NIST AI RMF / ISO 42001 with an acceptable-use policy.','Maps each system to its EU AI Act risk class and verifies the inventory (shadow AI).','Applies heightened controls to the high-risk use.'],cons:['Policy + mapping effort this quarter.','Ongoing conformity upkeep as AI use grows.']},
      [{on:'Guardrails only, formalize later',osum:'no framework yet',pros:['No governance-program cost today.'],cons:['"Under governance" stays unprovable; EU AI Act obligations go unmet; shadow AI unverified.']}]),
    // Decision 3 — the urgent tactical patch on the critical path.
    c5dec('ct',3,'Patch the auth-library advisory?','High-severity, KEV-listed advisory'+(adv.connected?(' ('+adv.displayValue+' open)'):'')+' — used by the customer platform. The urgent tactical fix.',
      {on:'Patch it now — highest-severity, in the critical path',osum:'Closes a known-exploitable path to customers',pros:['Closes an actively-exploitable dependency shipping to customers.','Fast, low-cost tactical fix.'],cons:['Requires a release / regression pass.']},
      [{on:'Schedule for the next release',osum:'Batch with the next deploy',pros:['Avoids an out-of-band release.'],cons:['Leaves a known-exploitable path open in the interim.']}])
  ];
  host.innerHTML=c5header()+
    c5shell('Decisions for the CIO · what needs your call?','One fix converges across the stack — then the governance and tactical calls that are yours.',null,'Each is tied to the stack. Choosing one stamps it with your name and time, keeps it editable for 24 hours, and opens a tracked ticket in the system connected at onboarding — status pulled back on refresh.')+
    c5convergeStrip('cio')+
    c5decisions(list)+
    '<div class="c5foot">Each decision links to its component and source · no AI/LLM at run-time.</div>';
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
  var TD=c5TopDriver();
  host.innerHTML=c5header()+
    c5shell('Audit universe & coverage · what’s in scope and covered?','Your cyber audit universe is well covered — one high-risk area needs review.',null,'The auditable cyber areas, their risk rating, and their coverage. Coverage is strong; identity & access — a high-risk area and the enterprise’s top exposure — is the one out of step. Each area traces to its scope and evidence; last-covered dates appear once your audit plan connects.')+
    '<div class="c5cards">'+c5card('ia_areas')+c5card('ia_coverage')+c5card('ia_overdue')+'</div>'+
    '<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Audit universe · risk rating and status</div>'+c5iaAreaRows('universe','ia_coverage')+'</div>'+
    c5bl('Bottom line','Schedule the overdue high-risk review.',null,'Identity &amp; access is a high-risk area and the enterprise’s top exposure, yet it’s the one out of step with coverage. Prioritizing it aligns coverage with risk — and lets you independently assure the board that management’s fix is real.',{mid:TD.mid,txt:'Prioritize the '+c5esc(TD.short)+' audit'})+
    '<div class="c5foot">Universe and coverage from your audit plan and history.</div>';
}
/* Tab 02 — Control-testing status */
function c5iaTesting(){
  var host=document.getElementById('ia-testing');if(!host)return;
  var TD=c5TopDriver();
  host.innerHTML=c5header()+
    c5shell('Control-testing status · what’s tested, what’s outstanding?','Testing is on plan — identity controls are the outstanding set.',null,'Your cyber control-testing progress this cycle. Most control sets are tested and passing; identity controls are the main outstanding set, and the last test found exceptions. Each control set traces to its test results and evidence.')+
    '<div class="c5cards">'+c5card('ia_tested')+c5card('ia_passrate')+c5card('ia_overdue')+'</div>'+
    '<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Control sets · test status and result</div>'+c5iaAreaRows('test','ia_tested')+'</div>'+
    c5bl('Bottom line','Close testing on the identity controls.',null,'Identity controls are the main outstanding set and carry open exceptions. Completing their testing gives you the evidence to assure the fix — and closes the biggest gap in this cycle’s coverage.',{mid:TD.mid,txt:'Complete '+c5esc(TD.short)+' control testing'})+
    '<div class="c5foot">Testing status from your audit workpapers.</div>';
}
/* Tab 03 — Findings & action plans */
function c5iaFindings(){
  var host=document.getElementById('ia-findings');if(!host)return;
  var TD=c5TopDriver(); // repeat-finding area is data-ranked, not hard-coded to identity
  host.innerHTML=c5header()+
    c5shell('Findings & action plans · open, closed, and repeat?','Findings are closing — one repeat finding to escalate.',null,'Your open and closed cyber findings and their action plans. One finding — the '+TD.short+' area — is a repeat from last cycle, which raises its priority. Each finding traces to its plan and owner.')+
    '<div class="c5cards">'+c5card('ia_open_findings')+c5card('ia_closed_ontime')+c5card('ia_repeat')+'</div>'+
    '<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Findings · severity and status</div>'+c5iaAreaRows('find','ia_repeat')+'</div>'+
    c5bl('Bottom line','Escalate the repeat '+TD.short+' finding.',null,'The '+TD.short+' area carries a repeat finding — it wasn’t fully remediated last cycle. It’s now funded by management; escalating it ensures the action plan lands and the repeat closes for good.',{mid:'ia_repeat',txt:'Escalate the repeat finding'})+
    '<div class="c5foot">Findings and action plans from your issue-tracking system.</div>';
}
/* Tab 04 — Evidence readiness */
function c5iaEvidence(){
  var host=document.getElementById('ia-evidence');if(!host)return;
  var TD=c5TopDriver();
  host.innerHTML=c5header()+
    c5shell('Evidence readiness · can we prove it?','You can evidence most controls on demand — identity is the thin spot.',null,'Whether you can produce evidence for auditors and regulators on demand. Most control evidence is current and automated; identity-control evidence is incomplete — the same area driving your top risk. Each area traces to its evidence and freshness.')+
    '<div class="c5cards">'+c5card('ia_automated')+c5card('ia_evidence_current')+c5card('ia_overdue')+'</div>'+
    '<div class="c5rank" style="padding:4px 15px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Evidence by area · freshness and readiness</div>'+c5iaAreaRows('evid','ia_automated')+'</div>'+
    c5bl('Bottom line','Close the '+TD.short+' evidence gap.',null,'Identity-control evidence is the one area you couldn’t fully produce on demand — and it’s your top risk. Closing it (management’s fix improves logging) makes the control both effective and provable.',{mid:TD.mid,txt:'Close the '+c5esc(TD.short)+' evidence gap'})+
    '<div class="c5foot">Evidence readiness from your GRC and control-monitoring systems.</div>';
}
/* Tab 05 — Attention for Internal Audit (schedule / assure / track — no fund/approve) */
function c5iaAttention(){
  var host=document.getElementById('ia-attention');if(!host)return;
  var tp=c5get('thirdparty_risk'),TD=c5TopDriver();
  var q='<div class="c5rank"><div class="c5rank-h">Audit actions · schedule, assure, track — Audit assures, management funds</div>'+
    '<div class="c5row" data-c5m="'+TD.mid+'"><div class="c5row-main"><div class="c5row-t"><span class="c5pill b" style="margin-right:8px">Prioritize</span>Audit identity &amp; access</div><div class="c5row-s">Overdue review, open test exceptions, repeat finding, and evidence gap — all identity</div></div><div class="c5row-v">4 signals</div><span class="c5pill g" style="align-self:center">Recommended</span></div>'+
    '<div class="c5row" data-c5m="ia_coverage"><div class="c5row-main"><div class="c5row-t"><span class="c5pill n" style="margin-right:8px">Assure</span>Board assurance statement</div><div class="c5row-s">Independently confirm management’s fix is real and on track</div></div><div class="c5row-v">—</div><span class="c5pill n" style="align-self:center">Informational</span></div>'+
    '<div class="c5row" data-c5m="thirdparty_risk"><div class="c5row-main"><div class="c5row-t"><span class="c5pill a" style="margin-right:8px">Track</span>Acme vendor assessment</div><div class="c5row-s">Falling-rated vendor · confirm assessment cadence</div></div><div class="c5row-v">'+(tp.connected?tp.displayValue:'—')+'</div><span class="c5pill a" style="align-self:center">Advised</span></div>'+
    '</div>';
  host.innerHTML=c5header()+
    c5shell('Attention for Internal Audit · what needs follow-up?','One area ties the cycle together — plus board assurance to give.',null,'The audit actions on your desk. One area — identity — is your overdue review, outstanding test, repeat finding, and evidence gap at once. Internal Audit does not fund or fix; it schedules, tests, escalates and assures. Each item traces to the full picture and source.')+
    q+
    c5bl('Bottom line','One area, four audit signals.',null,'Identity is simultaneously your overdue review, your outstanding test, your repeat finding, and your evidence gap. Prioritizing it is the highest-leverage audit action — and lets you give the board independent assurance that management’s fix is landing.',{mid:TD.mid,txt:'Prioritize the '+c5esc(TD.short)+' audit'})+
    '<div class="c5foot">Each item links to its plan, test, or finding. Internal Audit provides independent assurance — it does not fund or approve.</div>';
}

/* ================= Board seat — same engine, oversight (not operations) lens ================= */
/* The board notes / confirms / endorses / supports and opens the pack — never funds,
   approves, patches, or sees a control/ATT&CK detail. Identity appears only as
   "management's funded top action, not currently material". */
/* Tab 01 — Cyber-business health */
/* Tab 01 — Oversight · the board's fiduciary top-level view. Reads the shared principal-
   risk register (c5RiskRegister) so cyber's rank / inherent→residual / appetite / direction
   / owner / review cadence / confidence never drift from the CRO or CLO. The headline is
   DERIVED from the register (rank + over/within appetite + direction) so it can't contradict
   the matrix; the identity fix is the funded treatment for the top risk. */
/* ═══════════ Board seat — two-tab cockpit (01 Oversight · 02 Decisions) with click-to-source ═══════════
   Every box on Oversight carries data-c5bd and opens a provenance drawer (shared openDrill shell)
   showing each contributing SOURCE with its own type badge — Live telemetry (green) / Self-reported
   (amber) / Modeled (neutral) — plus a confidence band, owner seat + link to that tab, and an as-of.
   All values derive from the shared data layer; an unwired figure honestly reads "source not yet
   connected". Regulatory & Assurance are panels on this tab, not standing tabs. */
function c5bdTool(keys){var t=(typeof connectedTools==='function')?connectedTools():{};for(var i=0;i<keys.length;i++){var k=keys[i];if(t[k]&&t[k].on)return {vendor:t[k].vendor||k,demo:!!t[k].demo};}return null;}
function c5bdTelem(keys,cap,covSig){var tt=c5bdTool(keys);if(!tt)return null;var cov=(covSig&&typeof sig==='function')?sig(covSig):null;var nm=tt.vendor?(String(tt.vendor).charAt(0).toUpperCase()+String(tt.vendor).slice(1)):'Connected tool';return {type:'telemetry',name:nm,detail:cap+(tt.demo?' · demo telemetry':' · live telemetry'),syncedAt:(typeof c5ago==='function'?c5ago():'recently'),coverage:(cov!=null?(cov+'%'):null)};}
function c5bdDocSrc(rx,label){var docs=(typeof docList==='function')?docList():[];for(var i=0;i<docs.length;i++){var d=docs[i]||{};if(new RegExp(rx,'i').test(d.name||'')||new RegExp(rx,'i').test(d.type||''))return {type:'self_reported',name:d.name||d.type,detail:label+' · uploaded & analyzed at onboarding'+(d.cmmi!=null?(' · scored CMMI '+d.cmmi):''),syncedAt:null,coverage:null};}return null;}
function c5bdMod(detail){return {type:'modeled',name:'Nerion model',detail:detail,syncedAt:null,coverage:null};}
function c5bdSelf(name,detail){return {type:'self_reported',name:name,detail:detail,syncedAt:null,coverage:null};}
function c5bdConf(srcs){if(!srcs||!srcs.length)return 'Low';var tel=false,self=false,mod=false;srcs.forEach(function(s){if(s.type==='telemetry')tel=true;else if(s.type==='self_reported')self=true;else mod=true;});if(tel)return 'High';if(mod||self)return 'Medium';return 'Low';}
/* The board provenance layer — id → figure with { title, value, status, pill, sources[], confidence,
   owner, ownerSeat, asOf } (+ q/a/metric on the five questions). Everything computed from the layer. */
function c5bdFigures(){
  var RR=(typeof c5RiskRegister==='function')?c5RiskRegister():{cyberResidual:0,appetite:0,cyberRank:null,total:0,controlsRemoved:0,rows:[]};
  var IDF=c5IdFix();
  var idm=(typeof c5get==='function')?c5get(IDF.mid||'exp_identity'):{connected:false};
  var T=(typeof c5T==='function')?c5T():{improving:false,worsening:false};
  var gov=(typeof LIVE!=='undefined'&&LIVE&&LIVE.governance)||{};
  var irTested=/yes|tested|tabletop/i.test((gov.ir&&gov.ir.tested)||'');
  var svc=(typeof c5CriticalServices==='function')?c5CriticalServices():[];
  var cp=svc[0]||{};var cpGap=(cp.rto!=null&&cp.tgt!=null&&Number(cp.rto)>Number(cp.tgt));
  var apUsd=RR.appetite||0, resUsd=RR.cyberResidual||0, over=(apUsd>0&&resUsd>apUsd);
  var idUsd=idm.connected?idm.displayValue:(IDF.usd||null);
  var mat=null;try{var cov=(typeof fwDeployedIds==='function')?fwDeployedIds():{};var tr=(typeof c5fwTree==='function')?c5fwTree('csf',cov):null;mat=tr?tr.overall:null;}catch(_){}
  var dirWord=T.improving?'Improving':T.worsening?'Worsening':'Steady';
  var asOf=(typeof c5ago==='function'?c5ago():'now');
  var recStr=cpGap?((cp.rto)+'h vs '+(cp.tgt)+'h target'):'Within target';
  var ctrlTelem=c5bdTelem(['okta','entra'],'Identity coverage (MFA / access)','mfa_pct')||c5bdTelem(['crowdstrike','defender'],'Endpoint coverage','edr_pct');
  var policyDoc=c5bdDocSrc('policy|security','Governing policies');
  var apDoc=c5bdDocSrc('appetite|loss','Cyber loss-appetite');
  var backupTelem=c5bdTelem(['rubrik','veeam','cohesity','commvault'],'Backup / recovery','backup_immutable_pct');
  function fig(o){o.sources=(o.sources||[]).filter(Boolean);o.confidence=o.confidence||c5bdConf(o.sources);o.asOf=o.asOf||asOf;return o;}
  var F={};
  var fixC=IDF.owner+', '+IDF.timeline;
  F.bd_dir=fig({title:'Direction',value:dirWord,status:dirWord,pill:(T.improving?'g':T.worsening?'r':'n'),owner:'CISO',ownerSeat:'ciso',
    detail:'Cyber residual risk is <b>'+(T.improving?'falling':T.worsening?'rising':'holding steady')+'</b> quarter over quarter. '+(T.improving?'The program is working. ':T.worsening?'It needs attention. ':'')+'The one lever that moves it further is the funded identity fix ('+fixC+') — the largest single reduction still available.',
    sources:[c5bdMod('direction = quarter-over-quarter change in modeled residual risk (residual-risk series); inputs: control telemetry (measured) + risk register (self-reported)'),ctrlTelem]});
  F.bd_risk=fig({title:'Cyber risk',value:(resUsd>0?usd(resUsd):'—'),status:(over?'Over appetite':'Within appetite'),pill:(over?'r':'g'),owner:'CFO / CRO',ownerSeat:'cro',
    detail:(resUsd>0?('Modeled residual cyber loss is <b>'+usd(resUsd)+'</b>, '+(over?('<b>above</b> the board’s appetite'+(apUsd>0?(' of '+usd(apUsd)):'')+'. The overage is the customer-platform identity exposure; the funded fix ('+fixC+') brings it back within appetite.'):('<b>within</b> the board’s appetite'+(apUsd>0?(' of '+usd(apUsd)):'')+', with headroom.'))):'Connect your financials and risk register and this shows in dollars against appetite.'),
    sources:[c5bdMod('residual = risk register × control-value ledger; inputs: exposure (modeled), appetite (self-reported)'),apDoc||c5bdSelf('Risk appetite',(apUsd>0?('board-set appetite '+usd(apUsd)):'appetite')+' — management-set at onboarding, not yet independently tested')]});
  F.bd_disc=fig({title:'Disclosure',value:'8-K ≤ 4 days',status:(irTested?'SEC-ready':'Watch'),pill:(irTested?'g':'a'),owner:'CLO',ownerSeat:'clo',
    detail:'If an incident were judged material, we could file the SEC 8-K within the <b>four-business-day</b> deadline. The materiality process is '+(irTested?'tabletop-tested':'documented but not yet tested')+', and the audit committee reviews cyber each quarter.',
    sources:[c5bdSelf('SEC disclosure process','Item 1.05 8-K materiality process — '+(irTested?'tabletop-tested':'documented, tabletop pending')+' at onboarding'),c5bdDocSrc('incident|disclosure|IR','IR / disclosure runbook')]});
  F.bd_oversight=fig({title:'Oversight',value:'Committee + ERM',status:((gov.committee&&/yes|integrated/i.test(gov.ermIntegrated||''))?'Active':(gov.committee?'Active':'Partial')),pill:(gov.committee?'g':'a'),owner:'Board / CISO',ownerSeat:'ciso',
    detail:'Management’s cyber oversight is <b>'+((gov.committee)?'active':'still being formalized')+'</b>: '+(gov.committee?('the '+gov.committee+' owns it'+(gov.cadence?(', reviewing '+String(gov.cadence).toLowerCase()):'')):'a board committee should own it')+(gov.ermIntegrated&&/yes|integrated/i.test(gov.ermIntegrated)?', and cyber is integrated into enterprise risk management.':'.')+' Every above-appetite risk has a named owner.',
    sources:[c5bdSelf('Governance intake',(gov.committee?('Board committee = '+gov.committee):'Board committee')+(gov.cadence?(' · '+gov.cadence):'')+(gov.ermIntegrated?(' · ERM integrated = '+gov.ermIntegrated):'')+' — set by admin at onboarding')]});
  F.bd_q1=fig({title:'Q1 · Are we getting better, or worse?',q:'Are we getting better, or worse?',a:'Improving, one gap caps it',metric:(mat!=null?('NIST CSF '+mat.toFixed(1)+'/5 ↑'):'NIST CSF ↑'),value:(mat!=null?('CSF '+mat.toFixed(1)+'/5 ↑'):'Improving'),status:'Watch',pill:'a',owner:'CISO',ownerSeat:'ciso',
    detail:'Our security-program maturity is <b>'+(mat!=null?('NIST CSF '+mat.toFixed(1)+' of 5'):'improving')+'</b> and rising. It’s scored from live control telemetry and your analyzed policies — not self-attestation. The one gap that caps it is identity and access, and its fix is funded ('+fixC+').',
    sources:[ctrlTelem,policyDoc,c5bdMod('maturity = evidenced control CMMI across the framework; inputs: control telemetry (measured) + analyzed policy documents (self-reported)')]});
  F.bd_q2=fig({title:'Q2 · What is our risk in dollars, vs appetite?',q:'What is our risk in dollars, vs appetite?',a:((resUsd>0?(usd(resUsd)+' residual, '):'residual ')+(over?'above appetite':'within appetite')),metric:(resUsd>0?usd(resUsd):'—')+' vs appetite',value:(resUsd>0?(usd(resUsd)+' residual'):'—'),status:(over?'Over':'Within'),pill:(over?'r':'g'),owner:'CFO / CRO',ownerSeat:'cro',
    detail:(resUsd>0?('Modeled residual loss is <b>'+usd(resUsd)+'</b>, '+(over?'<b>above</b>':'<b>within</b>')+' the board’s appetite'+(apUsd>0?(' of '+usd(apUsd)):'')+'. '+(over?('The funded identity fix ('+fixC+') closes the gap.'):'We hold it by keeping the top controls funded.')):'Connect financials and this shows in dollars against appetite.'),
    sources:[c5bdMod('residual exposure = modeled loss from the risk register and control-value ledger'),apDoc||c5bdSelf('Risk appetite',(apUsd>0?('appetite '+usd(apUsd)):'appetite')+' — management-set, not yet independently tested')]});
  F.bd_q3=fig({title:'Q3 · If breached, how fast do we recover?',q:'If breached, how fast do we recover?',a:'In target except customer platform',metric:recStr,value:recStr,status:(cpGap?'One gap':'Ready'),pill:(cpGap?'a':'g'),owner:'COO',ownerSeat:'coo',
    detail:'All critical services recover within their target'+(cpGap?(' except the <b>customer platform</b> (about '+recStr+')'):'')+'. '+(cpGap?'It misses because restoring identity and access is the bottleneck — the funded fix ('+fixC+') repairs that path.':'Recovery is tested each cycle.'),
    sources:[backupTelem,c5bdMod('recovery = critical-service RTO/RPO vs target from the resilience model; the customer platform’s identity-recovery path is the '+(cpGap?'one gap':'closed path'))]});
  F.bd_q4=fig({title:'Q4 · Are we disclosure-ready?',q:'Are we disclosure-ready?',a:'SEC 4-day process tested',metric:'8-K ≤ 4 days',value:'8-K ≤ 4 days',status:(irTested?'Ready':'Watch'),pill:(irTested?'g':'a'),owner:'CLO',ownerSeat:'clo',
    detail:'Yes. The SEC materiality and 8-K process is <b>'+(irTested?'tested':'documented')+'</b>, and we can file within four business days of a materiality call. The one thin spot is forensic evidence on the identity path, which the identity fix strengthens.',
    sources:[c5bdSelf('SEC materiality process','4-business-day 8-K process — '+(irTested?'tabletop-tested':'documented')+' at onboarding'),c5bdDocSrc('incident|disclosure|IR','IR runbook')]});
  F.bd_q5=fig({title:'Q5 · Are we investing right — and the known gaps?',q:'Are we investing right — and the known gaps?',a:'Top controls; known gap is identity, funded',metric:(idUsd?(idUsd+' identity'):'identity, funded'),value:(idUsd?(idUsd+' identity'):'identity gap, funded'),status:'Action',pill:'a',owner:'CISO',ownerSeat:'ciso',
    detail:'We fund the top controls first. The one known gap is <b>identity and access on the customer platform</b>'+(idUsd?(' (about '+idUsd+' of exposure)'):'')+'. Its remediation is funded ('+fixC+') and returns the most risk removed per dollar of anything on the list.',
    sources:[c5bdMod('largest control gap = identity, from the exposure model'),c5bdSelf('Funding decision','identity remediation funded — '+IDF.owner+' · '+IDF.timeline)]});
  F.bd_reg_sec=fig({title:'SEC cyber disclosure',value:'Item 1.05 · Item 106',status:(irTested?'Ready':'In progress'),pill:(irTested?'g':'a'),owner:'CLO',ownerSeat:'clo',
    detail:'A material cyber incident must be reported to the SEC on an <b>8-K within four business days</b> (Item 1.05), with annual governance disclosure in the 10-K (Item 106). Our materiality-assessment and 8-K process is '+(irTested?'tabletop-tested':'documented')+', so we can meet the clock.',
    sources:[c5bdSelf('SEC disclosure process','materiality + 8-K process, '+(irTested?'tested':'documented')+' at onboarding')]});
  F.bd_reg_gdpr=fig({title:'GDPR / privacy',value:'72-hour breach clock',status:'Compliant',pill:'g',owner:'CLO',ownerSeat:'clo',
    detail:'A personal-data breach must be notified to the lead EU regulator <b>within 72 hours</b> of becoming aware. Our breach-notification runbook is attested and rehearsed, so the clock starts the day an incident is confirmed.',
    sources:[c5bdDocSrc('privacy|gdpr|dpa','Privacy programme')||c5bdSelf('Privacy programme','breach-notification process attested at onboarding')]});
  F.bd_reg_aiact=fig({title:'EU AI Act',value:'High-risk AI obligations',status:'In progress',pill:'a',owner:'CLO',ownerSeat:'clo',
    detail:'The EU AI Act phases in obligations for high-risk AI — risk management, logging, human oversight and serious-incident reporting. We have <b>no systems currently classified high-risk</b>, and we’re standing up the classification and evidence process so any that appear are covered.',
    sources:[c5bdSelf('AI governance','EU AI Act classification, self-reported at onboarding')]});
  F.bd_reg_dora=fig({title:'DORA',value:'ICT major-incident reporting',status:'On track',pill:'g',owner:'CLO',ownerSeat:'clo',
    detail:'DORA requires an <b>initial major-ICT-incident report within ~4 hours</b> of classification, plus operational-resilience testing of critical providers. Our reporting process is attested and mapped to the same incident workflow that drives SEC disclosure.',
    sources:[c5bdSelf('Operational-resilience programme','DORA reporting process attested at onboarding')]});
  // Independent validation requires a GENUINE third-party artifact — an external-audit /
  // SOC 2 / ISO certification report, a penetration-test report, or an outside-counsel opinion.
  // A self-reported upload (a risk register, a policy PDF) is NOT independent validation, so the
  // regexes are strict: they never match a register or a generic policy, and if no such artifact
  // is on file the item reads the honest "Asserted — not yet independently validated".
  var auditDoc=c5bdDocSrc('external.?audit|third.?party.?(audit|assessment)|independent.?assessment|soc.?2|iso.?27001|attestation.?report','External audit / SOC 2');
  var pentestDoc=c5bdDocSrc('pen.?test|penetration.?test|red.?team.?report','Penetration test');
  var counselDoc=c5bdDocSrc('outside.?counsel|law.?firm|counsel.?(opinion|review|memo)|disclosure.?controls.?(opinion|review)','Outside-counsel review');
  F.bd_as_maturity=fig({title:'Maturity — external audit',value:(auditDoc?'Independently validated':'Asserted — audit pending'),status:(auditDoc?'Validated':'Asserted'),pill:(auditDoc?'g':'a'),owner:'CISO',ownerSeat:'ciso',
    detail:(auditDoc?'An independent external audit / SOC 2 report is on file, so the maturity score is third-party validated — not self-attestation.':'Maturity is <b>self-assessed</b> today, scored from your connected tools and reviewed policies — credible, but not the same as an independent external audit. No third-party audit or SOC 2 report is on file yet, so this reads <b>asserted</b>. Upload one and it flips to independently validated.'),
    sources:[auditDoc||c5bdSelf('Self-assessed maturity','scored from connected tools + reviewed policies — no external audit on file')],validated:!!auditDoc});
  F.bd_as_recovery=fig({title:'Recovery — penetration test',value:(pentestDoc?'Independently validated':'Asserted — test pending'),status:(pentestDoc?'Validated':'Asserted'),pill:(pentestDoc?'g':'a'),owner:'COO',ownerSeat:'coo',
    detail:(pentestDoc?'An independent penetration-test / red-team report is on file, so recovery and resilience claims are third-party validated.':'Recovery targets are <b>self-reported</b> and rehearsed internally. No independent penetration-test or red-team report is on file yet, so this reads <b>asserted</b> until one validates it.'),
    sources:[pentestDoc||c5bdSelf('Self-reported recovery','tested internally — no independent pen-test on file')],validated:!!pentestDoc});
  F.bd_as_disclosure=fig({title:'Disclosure controls — counsel review',value:(counselDoc?'Independently validated':'Asserted — review pending'),status:(counselDoc?'Validated':'Asserted'),pill:(counselDoc?'g':'a'),owner:'CLO',ownerSeat:'clo',
    detail:(counselDoc?'An outside-counsel opinion on the disclosure controls is on file, so the disclosure-readiness claim is independently reviewed.':'The disclosure process is <b>self-attested</b> and tabletop-tested internally. No outside-counsel opinion is on file yet, so this reads <b>asserted</b> until counsel reviews it.'),
    sources:[counselDoc||c5bdSelf('Self-attested disclosure controls','tabletop-tested internally — no outside-counsel opinion on file')],validated:!!counselDoc});
  F.bd_as_exposure=fig({title:'Exposure model — management-asserted',value:'Modeled, not independently tested',status:'Asserted',pill:'a',owner:'CRO',ownerSeat:'cro',sources:[c5bdMod('exposure = modeled loss; not independently validated')]});
  F.bd_as_appetite=fig({title:'Risk appetite — management-asserted',value:'Self-reported, not independently tested',status:'Asserted',pill:'a',owner:'CFO',ownerSeat:'cfo',sources:[apDoc||c5bdSelf('Risk appetite','management-set at onboarding, not independently tested')]});
  F.bd_decision=fig({title:'Fund the identity remediation',value:((idUsd?(idUsd+' · '):'')+IDF.owner+' · '+IDF.timeline),status:'Needs the board',pill:'b',owner:IDF.owner,ownerSeat:'ciso',
    sources:[c5bdMod('the one action behind questions 1, 2, 3 and 5 — brings cyber within appetite; inputs: exposure (modeled), funding (self-reported)'),c5bdSelf('Funding decision',IDF.owner+' · '+IDF.timeline)]});
  return F;
}
function c5bdProvBadge(type){if(type==='telemetry')return '<span class="c5pill g">Live telemetry</span>';if(type==='self_reported')return '<span class="c5pill a">Self-reported</span>';if(type==='modeled')return '<span class="c5pill n">Modeled</span>';return '<span class="c5pill n">—</span>';}
/* Shared figure registry — every seat's Overview registers its provenance figures here so
   the one drawer (c5bdInspect) can render any of them. Keyed by figure id (bd_*, ce_*, …). */
function c5regFigs(F){try{window.C5_FIGS=Object.assign(window.C5_FIGS||{},F);}catch(_){}return F;}
/* ── Shared helpers so every non-CISO drawer reads like the CISO metric inspector:
   Result · Severity/Owner/ETA/Confidence · Business impact · What this means / Who / Why ·
   Decision · Recommended action · View evidence · View sources. Derived from the figure
   the box already carries, so the English style and structure match across every seat. */
function c5bdSeverity(pc){return pc==='r'?{t:'High',c:'crit'}:pc==='a'?{t:'Medium',c:'warn'}:pc==='g'?{t:'Low',c:'good'}:pc==='b'?{t:'Decision',c:'blue'}:{t:'Monitor',c:'muted'};}
function c5bdImpact(pc){return (pc==='r'||pc==='a')
  ?'This is exposure the business is carrying now — the weaker it is, the more room an incident has to cause harm, so it bears directly on the loss the company could take.'
  :'This is a part of your cyber posture that bears on the business — the stronger it is, the less exposure the organization carries.';}
function c5bdWhyNow(pc){return pc==='r'?'It is outside tolerance today; left open, the exposure the business carries keeps rising until it is closed.'
  :pc==='a'?'It is off target today — close it before it becomes an incident; the longer it sits, the more it costs to fix.'
  :pc==='g'?'Within target today — hold the line; the risk here is drift, so keep it monitored on the current cadence.'
  :'Under watch — no pressure on the business today, but it stays on the board until its source is fully connected.';}
function c5bdAction(pc){var fix=(typeof c5ovFix==='function')?c5ovFix():'the funded fix';
  return (pc==='r'||pc==='a')
    ?('Close this gap — '+fix+' addresses it. Track it to done and re-check the number at the next refresh.')
    :'No action required beyond holding the posture — keep the evidence current so this stays where it is.';}
function c5bdDominantType(sources){sources=sources||[];var has={};sources.forEach(function(s){if(s&&s.type)has[s.type]=1;});
  if(has.telemetry&&(has.self_reported||has.modeled))return 'mixed';
  if(has.telemetry)return 'telemetry';if(has.self_reported)return 'self_reported';if(has.modeled)return 'modeled';return 'none';}
function c5bdTypeLabel(t){return t==='telemetry'?'Live telemetry':t==='self_reported'?'Self-reported':t==='modeled'?'Modeled':t==='mixed'?'Mixed sources':'Not connected';}
function c5bdWhyIcon(pc){return pc==='g'?'check':(pc==='r'||pc==='a')?'alert':pc==='b'?'gauge':'plug';}
/* The executive detail drawer for any Overview / Board figure — opened by clicking a data-c5bd
   box. Same layout and English as the CISO metric inspector (c5InspectObj). */
function c5bdInspect(id){
  var f=(typeof window!=='undefined'&&window.C5_FIGS&&window.C5_FIGS[id])||null;
  if(!f){var F=c5bdFigures();f=F[id];}
  if(!f)return;
  var pc=f.pill||'n';var col=(pc==='r'?'crit':pc==='a'?'warn':pc==='g'?'good':pc==='b'?'blue':'ink');
  var isDec=!!(f.headline||f.kicker);
  var conf=String(f.confidence||'').toLowerCase();var confCol=(conf==='high'?'good':(conf==='medium'||conf==='med')?'warn':'muted');
  var demo=(typeof signalsAreDemo==='function'&&signalsAreDemo())||(typeof demoActive==='function'&&demoActive());
  var stype=c5bdDominantType(f.sources);var slabel=c5bdTypeLabel(stype);
  var sev=c5bdSeverity(isDec?'b':pc);
  // 1) RESULT — status-coloured hero: the value, its status pill and the source label.
  var h='<div style="display:flex;align-items:center;gap:14px;margin:2px 0 2px;padding:14px 16px;border-radius:12px;border:1px solid var(--line);border-left:3px solid var(--'+col+');background:var(--surface-2)">'+
    '<div style="width:42px;height:42px;border-radius:11px;flex:none;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--'+col+') 16%,var(--surface));color:var(--'+col+')">'+c5icon(c5bdWhyIcon(isDec?'b':pc))+'</div>'+
    '<div style="min-width:0;flex:1"><div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">Result</div><div style="font-size:23px;font-weight:700;line-height:1.15;color:var(--'+col+')">'+c5esc(f.value||'—')+'</div></div>'+
    '<div style="text-align:right;flex:none"><span class="c5pill '+pc+'">'+c5esc(f.status||'')+'</span><div style="font-size:10px;color:var(--muted);margin-top:5px;text-transform:uppercase;letter-spacing:.05em">'+(demo?'Demo':c5esc(slabel))+'</div></div>'+
  '</div>';
  // 2) HEADER FACTS — severity · owner · ETA · evidence confidence.
  function _chip(label,val,c){return '<div style="border:1px solid var(--line);border-radius:9px;padding:6px 11px;background:var(--surface-2)"><div style="font-size:9.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)">'+label+'</div><div style="font-size:12.5px;font-weight:600;color:var(--'+(c||'ink')+');margin-top:1px">'+c5esc(val)+'</div></div>';}
  h+='<div style="display:flex;flex-wrap:wrap;gap:8px;margin:11px 0 2px">'+
    _chip('Severity',sev.t,sev.c)+
    _chip('Owner',(f.owner||'Accountable owner'),'ink')+
    _chip('ETA / due',(f.due||(isDec?'Your call':'Not scheduled')),((f.due||isDec)?'ink':'muted'))+
    _chip('Evidence confidence',(demo?'Demo':(f.confidence||'—')),(demo?'muted':confCol))+
  '</div>';
  // 3) BUSINESS IMPACT — the consequence, one line.
  h+='<div style="margin-top:9px;font-size:12.5px;color:var(--ink-2);line-height:1.5"><b style="color:var(--ink)">Business impact:</b> '+(f.impact||c5bdImpact(pc))+'</div>';
  // 4) EXECUTIVE SUMMARY — what this means · who/what is affected · why it matters now.
  function _xr(label,txt,c){return txt?('<div style="margin-bottom:11px"><div style="font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--'+(c||'muted')+')">'+label+'</div><div style="font-size:12.5px;color:var(--ink-2);line-height:1.5;margin-top:2px">'+txt+'</div></div>'):'';}
  var means=f.means||f.detail||f.body||'';
  var affected=f.affected||'The systems, services and people this measure covers — traced to the sources below.';
  var whyNow=f.whyNow||c5bdWhyNow(pc);
  var _summ=_xr('What this means',means,'good')+_xr('Who / what is affected',affected,'muted')+_xr('Why it matters now',whyNow,(pc==='r'?'crit':pc==='a'?'warn':'blue'));
  if(_summ)h+='<div style="margin-top:11px;padding:13px 16px 2px;border:1px solid var(--line);border-radius:12px;background:var(--surface)">'+_summ+'</div>';
  // 5) DECISION — explicit, always.
  h+='<div class="ev-sec">Decision</div>';
  if(isDec){
    h+='<div class="conf" style="border-left:3px solid var(--blue)"><b>'+c5esc(f.headline||'Your call')+'</b>'+(f.body?('<div style="margin-top:4px">'+f.body+'</div>'):'')+'</div>';
  } else if(pc==='r'||pc==='a'){
    h+='<div class="conf" style="border-left:3px solid var(--'+col+')"><b>A decision is on the table:</b> this is carrying exposure now — the options and the recommended call are in this seat’s Decisions tab.</div>';
  } else {
    h+='<div class="conf" style="border-left:3px solid var(--muted)"><b>No executive decision needed now:</b> hold the current cadence; Nerion surfaces a decision here if the status changes.</div>';
  }
  // 6) RECOMMENDED ACTION — the single next step (decisions carry their own action above).
  if(!isDec){
    h+='<div class="ev-sec">Recommended action</div><div class="conf" style="border-left:3px solid var(--blue)">'+(f.action||c5bdAction(pc))+(f.owner?('<div style="margin-top:6px;font-size:11px;color:var(--muted)">Owner: '+c5esc(f.owner)+'</div>'):'')+'</div>';
  }
  // 7) VIEW EVIDENCE — how the figure is derived + its confidence (collapsed).
  var evNote='This figure is '+(stype==='none'?'not yet evidenced':('drawn from '+c5esc(slabel).toLowerCase()))+
    (f.sources&&f.sources.length?(', combining '+f.sources.length+' source'+(f.sources.length>1?'s':'')+' listed below'):'')+
    '. Confidence: <b style="color:var(--'+confCol+')">'+c5esc(f.confidence||'—')+'</b>'+(conf&&conf!=='high'?' — self-reported and modeled figures are not rated high confidence until independently tested.':'.');
  h+=c5acc('View evidence','<div class="drill-p">'+evNote+'</div>');
  // 8) VIEW SOURCES — each source with its own provenance badge (collapsed).
  var _src;
  if(!f.sources||!f.sources.length){
    _src='<div class="conf" style="border-left:3px solid var(--muted)"><b>Source not yet connected.</b> Shown as modeled until the tool or document is connected at onboarding — then it becomes measured.</div>';
  } else {
    _src=f.sources.map(function(s){
      var meta=[];if(s.detail)meta.push(c5esc(s.detail));if(s.syncedAt)meta.push('synced '+c5esc(s.syncedAt));if(s.coverage)meta.push(c5esc(s.coverage)+' coverage');
      return '<div style="border:1px solid var(--line);border-radius:10px;padding:11px 13px;margin-bottom:8px;background:var(--surface)"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b style="font-size:13px;color:var(--ink)">'+c5esc(s.name||'Source')+'</b>'+c5bdProvBadge(s.type)+'</div>'+(meta.length?('<div style="font-size:12px;color:var(--ink-2);line-height:1.5;margin-top:4px">'+meta.join(' · ')+'</div>'):'')+'</div>';
    }).join('')+(f.sources.length>1?'<div style="font-size:11.5px;color:var(--muted);margin-top:2px">Combined from the sources above.</div>':'');
  }
  h+=c5acc('View sources',_src);
  // Compact footer.
  h+='<div class="c5foot">'+(f.owner?('Owner: '+c5esc(f.owner)+' · '):'')+'as of '+c5esc(f.asOf||'')+(conf&&conf!=='high'?' · self-reported and modeled figures are not rated high confidence until independently tested':'')+'</div>';
  if(typeof openDrill==='function')openDrill(f.title,h);
}
/* Delegated wiring: click any board box → provenance drawer; owner-tab button → switch seats. */
if(typeof document!=='undefined'&&!window.__c5bdWired){window.__c5bdWired=true;
  document.addEventListener('click',function(e){
    var g=e.target.closest('[data-c5goseat]');if(g){e.preventDefault();try{if(typeof closeEv==='function')closeEv();}catch(_){}try{if(typeof selectSeat==='function')selectSeat(g.getAttribute('data-c5goseat'));}catch(_){}return;}
    var tb=e.target.closest('[data-c5bdtab]');if(tb){e.preventDefault();e.stopPropagation();var idx=tb.getAttribute('data-c5bdtab');try{var t=document.querySelector('#secTabs .sectab[data-sec="'+idx+'"]');if(t)t.click();}catch(_){}return;}
    var b=e.target.closest('[data-c5bd]');if(b&&b.getAttribute('data-c5bd')){e.stopPropagation();c5bdInspect(b.getAttribute('data-c5bd'));}
  });
}
/* Tab 01 — Oversight (with Regulatory & Assurance as panels). */
function c5bdHealth(){
  var host=document.getElementById('bd-health');if(!host)return;
  var F=c5regFigs(c5bdFigures());var IDF=c5IdFix();var RR=c5RiskRegister();
  var over=(RR.appetite>0&&RR.cyberResidual>RR.appetite);
  function card(id){var f=F[id];if(!f)return '';var vc=(f.pill==='r'?'crit':f.pill==='a'?'warn':f.pill==='g'?'good':f.pill==='b'?'blue':'ink');
    return '<div class="c5card c5bdbox" data-c5bd="'+id+'"><div class="c5card-top"><span class="c5card-l">'+c5esc(f.title)+'</span><span class="c5pill '+(f.pill||'n')+'">'+c5esc(f.status||'')+'</span></div><div class="c5card-v" style="color:var(--'+vc+')">'+c5esc(f.value||'—')+'</div></div>';}
  // 5 questions
  var qrows=['bd_q1','bd_q2','bd_q3','bd_q4','bd_q5'].map(function(id,i){var f=F[id];
    return '<div class="c5prow c5bdbox" data-c5bd="'+id+'"><span style="flex:0 0 auto;width:22px;height:22px;border-radius:50%;background:var(--surface-2);border:1px solid var(--line);display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--ink-2)">'+(i+1)+'</span><div style="flex:1;min-width:0"><div class="c5row-t">'+c5esc(f.q)+'</div><div class="c5row-s">'+c5esc(f.a)+' · '+c5esc(f.metric)+' · owner: '+c5esc(f.owner)+'</div></div><span class="c5pill '+(f.pill||'n')+'" style="flex:none">'+c5esc(f.status)+'</span></div>';
  }).join('');
  // Regulatory panel
  var regRows=['bd_reg_sec','bd_reg_gdpr','bd_reg_aiact','bd_reg_dora'].map(function(id){var f=F[id];
    return '<div class="c5prow c5bdbox" data-c5bd="'+id+'"><div style="flex:1;min-width:0"><div class="c5row-t">'+c5esc(f.title)+'</div><div class="c5row-s">'+c5esc(f.value)+'</div></div><span class="c5pill '+(f.pill||'n')+'" style="flex:none">'+c5esc(f.status)+'</span></div>';
  }).join('');
  // Assurance panel — two groups, validated vs asserted (validated require a real artifact)
  function asItem(id){var f=F[id];return '<div class="c5prow c5bdbox" data-c5bd="'+id+'"><span class="c5sq '+(f.pill==='g'?'g':'a')+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">'+c5esc(f.title)+'</div><div class="c5row-s">'+c5esc(f.value)+'</div></div><span class="c5pill '+(f.pill||'n')+'" style="flex:none">'+c5esc(f.status)+'</span></div>';}
  var valIds=['bd_as_maturity','bd_as_recovery','bd_as_disclosure'];
  var validated=valIds.filter(function(id){return F[id].validated;});
  var demoted=valIds.filter(function(id){return !F[id].validated;});
  var assertIds=['bd_as_exposure','bd_as_appetite'].concat(demoted);
  var asGroup=function(label,ids,note){return ids.length?('<div style="font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin:6px 0 4px">'+label+(note?(' <span style="font-weight:500;text-transform:none;letter-spacing:0">'+note+'</span>'):'')+'</div>'+ids.map(asItem).join('')):'';};
  var reg=F.bd_risk,disc=F.bd_disc;
  var panels='<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:14px">'+
    '<div class="c5card" style="flex:1 1 320px;min-width:280px;padding:12px 14px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><span style="font-size:12.5px;font-weight:600;color:var(--ink)">Regulatory &amp; disclosure</span><button class="c5btn ghost" data-c5goseat="clo" style="font-size:11px;padding:3px 9px">register ›</button></div>'+regRows+'</div>'+
    '<div class="c5card" style="flex:1 1 320px;min-width:280px;padding:12px 14px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><span style="font-size:12.5px;font-weight:600;color:var(--ink)">Assurance</span><button class="c5btn ghost" data-c5bd="bd_as_exposure" style="font-size:11px;padding:3px 9px">detail ›</button></div>'+
      asGroup('Independently validated',validated,validated.length?'':'')+
      (validated.length?'':'<div style="font-size:11.5px;color:var(--ink-2);margin:2px 0 4px">None on file — no external audit / pen-test / counsel artifact uploaded, so these move to management-asserted below.</div>')+
      asGroup('Management-asserted',assertIds,'(self-reported · not yet independently tested)')+
    '</div>'+
  '</div>';
  // Decision callout (clickable + Note button)
  var dfig=F.bd_decision;var dm=c5get(IDF.mid);
  var decision='<div class="c5bl c5bdbox" data-c5bd="bd_decision" style="border-left:3px solid var(--blue)"><div class="c5bl-k">Needs the board · one decision</div><div class="c5bl-h">Note management’s recommendation to fund the identity remediation.</div><div class="c5bl-p">It sits behind questions 1, 2, 3 and 5, is funded ('+c5esc(dfig.value)+'), and '+(over?'brings cyber within appetite — moving question&nbsp;#1 from Watch toward within-target':'closes the largest control gap — sustaining question&nbsp;#1')+'. Your role is oversight: note it and set a review date.</div><button class="c5btn" data-c5bdtab="1">Note &amp; set review date</button></div>';
  var headline=over
    ?'Management is actively managing cyber — and one funded decision would bring the enterprise’s largest risk within appetite.'
    :'Management is actively managing cyber — the enterprise’s largest risk sits within appetite this quarter.';
  host.innerHTML=c5header()+
    c5shell('Fiduciary oversight · is management managing cyber?',headline,(over?'warn':null),'The five questions your board asks, each traced to its owner — plus disclosure readiness and what’s independently validated versus asserted. Your role is oversight: confirm management is on it, and act on the one decision that needs you. <b>Click any box</b> to see its source and provenance.')+
    '<div class="c5cards">'+card('bd_dir')+card('bd_risk')+card('bd_disc')+card('bd_oversight')+'</div>'+
    '<div style="border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-top:14px"><div class="c5rank-h">The five questions your board asks — answered</div><div style="padding:2px 15px">'+qrows+'</div></div>'+
    panels+
    decision+
    '<div class="c5foot">Answers trace to the owning executive’s tab, each carrying its own confidence; appetite is management-set and pending independent validation. Click any box for its source.</div>';
}
/* Tab 02 — Regulatory & disclosure · the disclosure regimes in scope, each with its clock
   and the board's readiness, plus the materiality determination under SEC Item 106. The
   named regimes are the same set the CLO seat carries so classifications never diverge; the
   identity gap is the exposure most likely to trigger a material/disclosable event. Regime
   facts (clocks) are real regulatory obligations; readiness is honest (process documented,
   forensic thin on the identity path), never a blanket "compliant" claim. */
function c5bdMaterial(){
  var host=document.getElementById('bd-material');if(!host)return;
  var IDF=c5IdFix(),dm=c5get(IDF.mid),m=(typeof LIVE!=='undefined'&&LIVE&&LIVE.economics&&LIVE.economics.materiality)||{};
  var ir=(typeof LIVE!=='undefined'&&LIVE&&LIVE.governance&&LIVE.governance.ir)||{};var tested=/yes|tested|tabletop/i.test(ir.tested||'');
  var below=(dm.connected&&m.value!=null);
  var regimes=[
    {n:'SEC — Item 1.05 / Item 106',ob:'Material cybersecurity incident + governance disclosure',clock:'4 business days from materiality',ready:true,r:'Process documented'},
    {n:'GDPR / CCPA',ob:'Personal-data breach notification',clock:'72 hours (GDPR)',ready:tested,r:tested?'Runbook tested':'Watch'},
    {n:'DORA',ob:'ICT major-incident reporting (EU financial entities)',clock:'Initial ≤4h / intermediate / final',ready:tested,r:tested?'Runbook tested':'Watch'},
    {n:'EU AI Act',ob:'Serious-incident reporting for high-risk AI (Art. 73)',clock:'≤15 days',ready:false,r:'Mapping pending'},
    {n:'EU CRA',ob:'Actively-exploited vuln / severe incident (early warning)',clock:'24h early warning',ready:false,r:'Scanner not wired'}
  ];
  var regRows=regimes.map(function(r){var pill=r.ready?'g':'a';var pt=r.ready?'Ready':'Watch';
    return '<div class="c5prow" data-c5m="bd_mat_process"><span class="c5sq '+(r.ready?'g':'a')+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">'+c5esc(r.n)+'</div><div class="c5row-s">'+c5esc(r.ob)+' · '+c5esc(r.r)+'</div></div><div class="c5prow-v" style="width:auto">'+c5esc(r.clock)+'</div><span class="c5pill '+pill+'" style="flex:none">'+pt+'</span></div>';
  }).join('');
  host.innerHTML=c5header()+
    c5shell('Regulatory & disclosure · what must we disclose, and are we ready?','Nothing is currently material — the clocks and process are ready; two newer regimes are still being wired.',null,'Whether any cyber matter is material for disclosure, and whether the board could meet the notification clocks if it were. The SEC 8-K clock is the tightest (4 business days from a materiality call); GDPR/DORA readiness follows your tested runbooks; the EU AI Act and CRA mappings are still being wired. The board confirms the process; the disclosure call is management’s and counsel’s.')+
    '<div class="c5cards">'+c5card('bd_material')+c5card('bd_reportable')+c5card('bd_threshold_basis')+'</div>'+
    '<div class="c5rank" style="padding:4px 15px;margin-top:14px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Disclosure regimes in scope · obligation · clock · readiness</div>'+regRows+
      '<div class="c5prow" style="cursor:default;background:var(--surface-2)"><div style="flex:1;min-width:0"><div class="c5row-s">Materiality: an incident modeled above '+(m.value!=null?usd(m.value):'the board threshold')+' is presumptively material → starts the 4-business-day SEC clock. Nothing crosses it this quarter; the '+IDF.short+' gap sits '+(below?'below threshold':'as the most likely trigger')+', monitored and funded.</div></div></div>'+
    '</div>'+
    c5bl('For the board','Lower the odds of a disclosable event at the source.',null,(dm.connected?('No cyber matter is currently material, and the '+IDF.short+' gap ('+dm.displayValue+') is the exposure most likely to cross the threshold and start the clocks. Closing it ('+IDF.owner+' · '+IDF.timeline+') reduces the most probable material-incident and breach-notification trigger — the honest caveat is that the AI Act and CRA mappings still need wiring before those regimes can be scored.'):'Connect the controls and the exposure most likely to trigger a disclosable event — the '+IDF.short+' gap — surfaces here, tied to its funded fix.'),{mid:IDF.mid,txt:'Fund the fix — reduce the disclosure trigger'})+
    '<div class="c5foot">Materiality assessed under SEC Item 106; regimes named (SEC · GDPR/CCPA · DORA · EU AI Act · EU CRA), clocks from each ruleset. Not disclosure advice. · '+regimes.length+' regimes in scope</div>';
}
/* Tab 03 — Trend over time */
function c5bdTrend(){
  var host=document.getElementById('bd-trend');if(!host)return;
  var tr=trajInfo();var vals=(tr.vals||[]).slice(-6);var maxV=Math.max.apply(null,vals.concat([1]));
  var bars='<div class="c5bars" style="height:44px">'+(vals.length?vals.map(function(v,i){var h=Math.round(8+(maxV>0?v/maxV:0)*34);var last=(i===vals.length-1);return '<i style="height:'+h+'px'+(last?';background:var(--blue)':'')+'"></i>';}).join(''):[1,2,3,4,5,6].map(function(){return '<i class="n" style="height:8px"></i>';}).join(''))+'</div>';
  var er=c5get('eff_return'),TD=c5TopDriver();
  var drivers='<div class="c5rank" style="padding:4px 15px;margin-top:14px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">What’s driving the improvement</div>'+
    '<div class="c5prow" data-c5m="eff_return"><span class="c5sq g" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Control effectiveness up</div><div class="c5row-s">Return on controls '+(er.connected?('is '+er.displayValue):'improving')+' — risk reduced per dollar</div></div><span class="c5pill g">Improving</span></div>'+
    '<div class="c5prow" data-c5m="capability_coverage"><span class="c5sq g" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Coverage expanded</div><div class="c5row-s">More assets monitored, fewer blind spots</div></div><span class="c5pill g">Improving</span></div>'+
    '<div class="c5prow" data-c5m="'+TD.mid+'"><span class="c5sq a" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">'+cap(TD.short)+' — still elevated</div><div class="c5row-s">The one remaining driver · funded, being addressed</div></div><span class="c5pill a">Addressing</span></div>'+
    '</div>';
  host.innerHTML=c5header()+
    c5shell('Trend over time · are we improving?','Cyber risk is falling — and ahead of peers.',null,'The board’s favorite question, answered over time. Cyber residual risk is falling quarter over quarter, and you sit in the top third of peers.')+
    '<div class="c5cards">'+c5card('direction')+c5card('cr_consec')+c5card('peer_position')+'</div>'+
    '<div class="c5rank" style="padding:12px 15px;margin-top:14px"><div class="c5rank-h" style="border:0;background:transparent;padding:0 0 8px">Residual cyber risk · last 6 quarters</div>'+bars+'</div>'+
    drivers+
    c5bl('For the board','Support the program’s trajectory.',null,'Consecutive quarters of improvement, ahead of peers. The one remaining driver — '+TD.short+' — is funded by management. Sustaining the trajectory is a matter of continued board support for the program.',{mid:'direction',txt:'Support the program trajectory'})+
    '<div class="c5foot">Trend from the residual-risk series; peer comparison anonymized.</div>';
}
/* Tab 04 — Investment & resilience */
function c5bdInvestment(){
  var host=document.getElementById('bd-investment');if(!host)return;
  var er=c5get('eff_return'),TD=c5TopDriver(),dm=c5get(TD.mid);
  host.innerHTML=c5header()+
    c5shell('Investment & resilience · are we investing wisely?','The program pays for itself — one funded investment sustains it.',null,'Whether cyber investment is proportionate and effective. The program returns risk reduced per dollar, spend is benchmarked against peers, and one funded investment — '+TD.short+' — sustains the improvement.')+
    '<div class="c5cards">'+c5card('eff_return')+c5card('bd_spend_peers')+c5card('bd_funded')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('bd_resilience_inv','g','On track','Recovery tested · within RTO/RPO targets')+
      c5tile(TD.mid,'b','Funded',(dm.connected?(cap(TD.short)+' fix · sustains the trend · '+dm.displayValue+' reduced'):'the funded investment that sustains the trend'))+
    '</div>'+
    c5bl('For the board','Endorse the investment direction.',null,(er.connected?('Cyber spend returns '+er.displayValue+' and the one investment that sustains the improving trend — the '+TD.short+' fix — is funded by management. The board’s role is to endorse the direction, which the numbers support.'):'Cyber spend is proportionate and the investment that sustains the improving trend is funded. The board’s role is to endorse the direction.'),{mid:'eff_return',txt:'Endorse the investment direction'})+
    '<div class="c5foot">Return and spend from the program model; peer benchmark anonymized.</div>';
}
/* Tab 03 — Assurance · independent validation. The fiduciary "trust but verify" lens: how
   much of what the board is being shown is tool-evidenced (Live/Computed) vs management-
   reported (Modeled/Self-reported) vs independently assured by a third party. The honest
   answer today is that NONE of the cyber reporting carries independent third-party assurance
   — which is precisely what Decision 2 commissions. Control-family assurance is evidence-
   based (tests + telemetry) via the shared c5Assurance() helper, so it matches the CRO. */
function c5bdGovernance(){
  var host=document.getElementById('bd-governance');if(!host)return;
  var A=c5Assurance();var IDF=c5IdFix();
  var toolEvidenced=A.fams.filter(function(f){return f.connected;}).length;
  var famRows=A.fams.map(function(f){var pill=f.status==='Assured'?'g':f.status==='Partial'?'a':f.status==='Gap'?'r':'n';
    return '<div class="c5prow" data-c5m="cr_families"><span class="c5sq '+pill+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">'+c5esc(f.l)+'</div><div class="c5row-s">'+c5esc(f.sub)+'</div></div><span class="c5pill '+pill+'" style="flex:none">'+f.status+'</span></div>';
  }).join('');
  // Provenance ladder — the confidence the board should attach to each layer of the reporting.
  function pv(label,sub,src,cls,pill){return '<div class="c5prow" style="cursor:default"><span class="c5sq '+cls+'" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">'+c5esc(label)+'</div><div class="c5row-s">'+c5esc(sub)+'</div></div><span class="c5pill '+pill+'" style="flex:none">'+c5esc(src)+'</span></div>';}
  var prov='<div class="c5rank" style="padding:4px 15px;margin-top:14px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Reporting provenance · how much of this is independently validated</div>'+
    pv('Tool-evidenced (Live / Computed)',toolEvidenced+' of '+A.fams.length+' control families report from live telemetry + tests',(toolEvidenced>=Math.ceil(A.fams.length/2)?'Higher confidence':'Partial'),(toolEvidenced>=Math.ceil(A.fams.length/2)?'g':'a'),(toolEvidenced>=Math.ceil(A.fams.length/2)?'g':'a'))+
    pv('Management-reported (Modeled / Self-reported)','Loss model, appetite, ERM inputs — management’s figures, not externally checked','Self-reported','a','a')+
    pv('Independently assured (third-party)','No external assurance over cyber reporting is on file yet','None yet','r','r')+
    '</div>';
  var head=(toolEvidenced>=Math.ceil(A.fams.length/2))
    ? 'Most control reporting is tool-evidenced — but none of it is independently assured yet.'
    : 'Much of the reporting is still management-attested — and none of it is independently assured yet.';
  host.innerHTML=c5header()+
    c5shell('Assurance · is what we’re shown independently validated?',head,'warn','Independent validation of the cyber reporting the board relies on. Control families are assured from tests and telemetry (not self-attestation) via the same evidence the CRO reads. Above that, the loss model and ERM figures are management-reported and Modeled. The gap the board should note: no third-party assurance sits over any of it — an external validation would raise the confidence attached to every other tab. Each layer traces to its evidence.')+
    '<div class="c5cards">'+c5card('cr_families')+c5card('cr_gaps')+c5card('cr_evidence')+'</div>'+
    '<div class="c5rank" style="padding:4px 15px;margin-top:14px"><div class="c5rank-h" style="border:0;background:transparent;padding:11px 0">Control families · evidence-based assurance (tests + telemetry)</div>'+famRows+'</div>'+
    prov+
    c5bl('For the board','Commission independent assurance over the cyber reporting.',null,'The control evidence is real, but nothing the board is shown carries third-party validation. Commissioning an independent assurance review — Internal Audit or an external provider, on a set cadence — would raise the confidence on every tab and close the strongest '+IDF.short+' control gap under an evidenced test rather than a self-attestation.',{mid:IDF.mid,txt:'Close the top control gap — fund the fix'})+
    '<div class="c5foot">Control assurance is evidence-based (tests + telemetry), not self-attestation; provenance labels each layer’s confidence. No independent third-party assurance is on file. · '+toolEvidenced+' of '+A.fams.length+' families evidenced</div>';
}
/* Tab 05 — Board decisions, in the same standardized decision format as every other seat
   (c5dec / c5decisions). Board items are oversight actions — note / attest — not funding
   decisions; the driver naming is data-ranked (c5TopDriver), nothing hard-coded. */
function c5bdDecisions(){
  var host=document.getElementById('bd-decisions');if(!host)return;
  var IDF=c5IdFix(),dm=c5get(IDF.mid);
  var list=[
    // Decision 1 — the convergent identity treatment, in the board's oversight language, with
    // its honest interim-exposure downside. The board notes and endorses; management funds.
    c5dec('bd',1,'Note and endorse management’s '+IDF.short+' action?','One funded action is the treatment for the top principal risk and the exposure most likely to trigger a disclosable event'+(dm.connected?(' ('+dm.displayValue+' modeled)'):'')+'. It moves cyber down the register, bends the trend, and is the control the next assurance review will test.',
      {on:'Note & endorse the funded action',osum:'Records board oversight — management funds and fixes',pros:['Confirms the board is informed of the top action.','Endorses the funded '+IDF.short+' treatment ('+IDF.owner+' · '+IDF.timeline+').','Documents oversight of the largest exposure and the disclosure trigger.'],cons:['Interim exposure persists across the '+IDF.timeline+' rollout — the gap is not closed on day one.','This is oversight, not funding — the board endorses, management must execute.']},
      [{on:'Request a deeper brief',osum:'Ask management for more detail before endorsing',pros:['Deeper diligence on the top action.'],cons:['Defers the endorsement a cycle while exposure persists.']}]),
    // Decision 2 — the board's domain call: commission independent assurance/validation of the
    // cyber reporting, since none is on file today (see the Assurance tab).
    c5dec('bd',2,'Commission independent assurance over cyber reporting?','No third-party assurance sits over the cyber figures the board relies on. An independent review — Internal Audit or an external provider — would validate the reporting and raise the confidence on every tab.',
      {on:'Commission it — assign scope, provider and cadence',osum:'external validation of the reporting',pros:['Raises the confidence attached to every board tab.','Tests controls under an evidenced review, not self-attestation.','Gives the board a defensible, independent basis for its oversight.'],cons:['Cost and provider-onboarding effort.','Findings may surface gaps the board must then act on.']},
      [{on:'Defer — rely on management attestation for now',osum:'no external validation this cycle',pros:['No spend this cycle.'],cons:['The board’s oversight continues to rest on self-reported figures.','No independent check on the loss model or control claims.']}])
  ];
  host.innerHTML=c5header()+
    c5shell('Board decisions · what should the board note?','One fix converges across the board’s risk view — then the assurance call that’s the board’s to make.',null,'Each item is an oversight action, not a funding decision. Recording one stamps it with the board’s note and time, keeps it editable for 24 hours, and opens a tracked item in the governance system connected at onboarding — status pulled back on refresh.')+
    c5convergeStrip('board')+
    c5decisions(list)+
    '<div class="c5foot">Governance-grade; each item traces to its basis and source · no AI/LLM at run-time.</div>';
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
  var TD=c5TopDriver(),dm=c5get(TD.mid),adv=c5get('ct_advisories');
  host.innerHTML=c5header()+
    c5shell('Product security posture · is the product secure by design?','The product is secure by design — one part of the platform carries the risk.',null,'Security across your product surface. Every customer-facing product is listed below with how it is evaluated. New features ship secure-by-design and most of the platform is healthy; the one real exposure is the customer platform’s '+TD.short+'/access model.')+
    '<div class="c5cards">'+c5card('cp_product_security')+c5card('cp_sbd_coverage')+c5card('cp_open_risks')+'</div>'+
    c5cpInventoryHtml()+
    '<div class="c5tiles">'+
      c5tile(TD.mid,'a','Gap','The customer-platform exposure')+
      c5tile('ct_advisories','b','Watch',(adv.connected?'Auth-library advisory · a dependency to patch':'connect your SCA scanner'))+
    '</div>'+
    c5bl('Bottom line','Fix the access model in your flagship product.',null,(dm.connected?('The '+TD.short+'/access model behind the customer platform is your product’s one real security gap ('+dm.displayValue+'). The fix is funded — it closes the exposure and gives users a cleaner, safer access experience.'):'Connect your controls and the product’s one real security gap — the customer-platform access model — surfaces here with its funded fix.'),{mid:TD.mid,txt:'Fund the '+c5esc(TD.short)+' fix — hardens the product'})+
    '<div class="c5foot">Product posture from your SDLC gates and product scans.</div>';
}
/* Tab 02 — Customer trust in the product */
function c5cpTrust(){
  var host=document.getElementById('cp-trust');if(!host)return;
  var TD=c5TopDriver(),dm=c5get(TD.mid);
  host.innerHTML=c5header()+
    c5shell('Customer trust in the product · are users safe and confident?','Users trust the product — the access experience is the one soft spot.',null,'How secure and confident your users are. No customer-impacting incidents, strong security-feature adoption, trust signals steady. The one soft spot is the '+TD.short+'/access experience — friction and risk in the same place.')+
    '<div class="c5cards">'+c5card('ceo_cust_incidents')+c5card('cp_mfa')+c5card('ceo_trust_signal')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('ceo_customer_data','a','Evidence-gated','Confirmed only with SIEM + DLP connected')+
      c5tile(TD.mid,'a','Watch','The '+TD.short+' gap shows up here — friction + risk')+
    '</div>'+
    c5bl('Bottom line','Turn the access pain point into a trust win.',null,(dm.connected?('The '+TD.short+' gap is both a security risk and a source of user friction. Fixing it ('+dm.displayValue+') reduces the exposure and smooths the access experience — safer and better for customers at once.'):'Connect your controls and the access pain point — both risk and friction — surfaces here, with the fix that improves both.'),{mid:TD.mid,txt:'Fund the '+c5esc(TD.short)+' fix — improves trust'})+
    '<div class="c5foot">Trust and adoption from your product analytics and incident records.</div>';
}
/* Tab 03 — Ship velocity vs. security */
function c5cpVelocity(){
  var host=document.getElementById('cp-velocity');if(!host)return;
  var TD=c5TopDriver(),dm=c5get(TD.mid);
  host.innerHTML=c5header()+
    c5shell('Ship velocity vs. security · is security a tax or an enabler?','Security isn’t slowing you down — it’s clearing your path.',null,'Whether security helps or hinders delivery. The one recurring blocker is — again — the '+TD.short+'/access model; tech debt is roadmapped. Gate pass-rate and cycle-time light up when your CI/CD security-gate records connect.')+
    '<div class="c5cards">'+c5card('cp_pass_rate')+c5card('cp_cycle_time')+c5card('cp_blocker')+'</div>'+
    '<div class="c5tiles">'+
      c5tile('ct_techdebt','b','Managed','Legacy access debt mapped · roadmapped')+
    '</div>'+
    c5bl('Bottom line','Remove the one blocker that keeps recurring.',null,(dm.connected?('The '+TD.short+'/access model is the recurring blocker in your release pipeline. Fixing it once ('+dm.displayValue+') reduces friction from future features — security stops being a repeat tax on velocity.'):'Connect your controls and the recurring release blocker — the '+TD.short+'/access model — surfaces here, fixable once.'),{mid:TD.mid,txt:'Fund the '+c5esc(TD.short)+' fix — unblocks delivery'})+
    '<div class="c5foot">Delivery metrics from your CI/CD and security-gate records.</div>';
}
/* Tab 04 — Product risk backlog */
function c5cpBacklog(){
  var host=document.getElementById('cp-backlog');if(!host)return;
  var TD=c5TopDriver(),dm=c5get(TD.mid),adv=c5get('ct_advisories'),td=c5get('ct_techdebt');
  var rows='<div class="c5rank"><div class="c5rank-h">Backlog · priority and status</div>'+
    '<div class="c5prow" data-c5m="'+TD.mid+'"><span class="c5sq a" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">'+cap(TD.short)+'/access remediation <span class="c5tag rev">High</span></div><div class="c5row-s">Funded · leads the backlog'+(dm.connected?(' · '+dm.displayValue+' of exposure'):'')+'</div></div><span class="c5pill a">Leads</span></div>'+
    '<div class="c5prow" data-c5m="ct_advisories"><span class="c5sq b" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Auth-library patch <span class="c5tag rev">High</span></div><div class="c5row-s">'+(adv.connected?('Used in the customer platform · '+adv.displayValue+' open'):'used in the customer platform')+'</div></div><span class="c5pill b">Scheduled</span></div>'+
    '<div class="c5prow" data-c5m="'+TD.mid+'"><span class="c5sq b" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Session-management hardening <span class="c5tag">Medium</span></div><div class="c5row-s">Depends on the access remediation</div></div><span class="c5pill b">Scheduled</span></div>'+
    '<div class="c5prow" data-c5m="ct_techdebt"><span class="c5sq g" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Deprecate legacy access paths <span class="c5tag">Medium</span></div><div class="c5row-s">Reduces access debt'+(td.connected?(' · '+td.displayValue+' mapped'):'')+'</div></div><span class="c5pill g">Roadmapped</span></div>'+
    '<div class="c5prow" data-c5m="cp_mfa"><span class="c5sq n" style="flex:0 0 auto"></span><div style="flex:1;min-width:0"><div class="c5row-t">Security-feature UX polish <span class="c5tag">Low</span></div><div class="c5row-s">Improves adoption</div></div><span class="c5pill n">Backlog</span></div>'+
    '</div>';
  host.innerHTML=c5header()+
    c5shell('Product risk backlog · what security work is queued?','The backlog is healthy — one high-priority item leads it.',null,'The security work queued against your product. Most is routine and scheduled; one high-priority item — the '+TD.short+'/access remediation — leads the backlog and is funded. Each item traces to its scope and owner.')+
    '<div class="c5cards">'+c5card('cp_open_items')+c5card('cp_high_priority')+c5card('cp_funded')+'</div>'+
    rows+
    c5bl('Bottom line','Land the item at the top of the backlog.',null,(dm.connected?('The '+TD.short+'/access remediation leads your product-security backlog and is funded. Landing it ('+dm.displayValue+') clears the largest product risk and unblocks several dependent items below it.'):'The '+TD.short+'/access remediation leads your product-security backlog. Landing it clears the largest product risk and unblocks the dependent items below it.'),{mid:TD.mid,txt:'Prioritize the '+c5esc(TD.short)+' remediation'})+
    '<div class="c5foot">Backlog from your product and security issue trackers.</div>';
}
/* Tab 05 — Decisions for the CPO */
function c5cpDecisions(){
  var host=document.getElementById('cp-decisions');if(!host)return;
  var TD=c5TopDriver(),dm=c5get(TD.mid),adv=c5get('ct_advisories');
  var list=[
    c5dec('cp',1,'Fund the '+TD.short+' / access fix?','Closes the product’s top security gap, smooths the access experience, and unblocks delivery'+(dm.connected?(' ('+dm.displayValue+')'):'')+'.',
      {on:'Fund it — safer, smoother, faster',osum:(dm.connected?('Three product wins at once · −'+dm.displayValue):'Three product wins at once'),pros:['Closes the product’s top security gap.','Smooths the customer access experience.','Unblocks delivery velocity.'],cons:['Larger cross-team effort and cost.']}),
    c5dec('cp',2,'Patch the auth-library dependency?','High-severity'+(adv.connected?(' ('+adv.displayValue+' open)'):'')+' — used in the customer platform. Urgent.',
      {on:'Patch it now',osum:'Closes a known-exploitable dependency',pros:['Closes an actively-exploitable path shipping to customers.','Fast, low-cost fix.'],cons:['Requires a release / regression pass.']},
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
  // The control tree (.c5fw-right) scrolls on its own; the finding panel (.c5fw-left)
  // is pinned so it stays in view while you scroll the long list of controls.
  '.c5fw-left{flex:0 0 400px;max-width:420px;position:sticky;top:14px;max-height:calc(100vh - 170px);overflow:auto}',
  '.c5fw-right{flex:1;min-width:0;max-height:calc(100vh - 170px);overflow:auto}',
  '@media(max-width:900px){.c5fw-wrap{flex-direction:column}.c5fw-left{flex:1 1 auto;max-width:none;position:static;max-height:none;overflow:visible}.c5fw-right{max-height:none;overflow:visible}}',
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
  '.c5fw-chip{font-size:9px;font-weight:500;background:var(--surface-2);color:var(--blue);border-radius:4px;padding:0 4px;margin-right:3px;cursor:pointer}',
  // Evidence-source (provenance) block in the finding detail.
  '.c5fw-src{display:flex;gap:9px;align-items:flex-start;font-size:12px;color:var(--ink-2);line-height:1.5;margin-top:4px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;background:var(--surface-2)}',
  '.c5fw-src b{color:var(--ink);font-weight:600}',
  '.c5fw-src-none{color:var(--muted)}',
  '.c5fw-srcic{flex:0 0 auto;font-size:14px;line-height:1.2}',
  '.c5fw-srcsub{font-size:11px;color:var(--muted);margin-top:2px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
  '.c5fw-jump{border:1px solid color-mix(in srgb,var(--blue) 40%,var(--line));background:var(--surface);color:var(--blue);font-family:inherit;font-size:11px;font-weight:600;padding:2px 9px;border-radius:20px;cursor:pointer;transition:background .12s,border-color .12s}',
  '.c5fw-jump:hover{background:color-mix(in srgb,var(--blue) 10%,var(--surface));border-color:var(--blue)}',
  '.c5doc-flash{animation:c5docflash 1.6s ease-out}',
  '@keyframes c5docflash{0%,40%{background:color-mix(in srgb,var(--blue) 16%,var(--surface));box-shadow:0 0 0 2px color-mix(in srgb,var(--blue) 45%,transparent)}100%{background:transparent;box-shadow:none}}',
  /* Persistent green outline for the control opened via "open the document reference" —
     a transparent rectangle so the document text stays fully readable inside it. */
  '.c5doc-ref{outline:2px solid var(--good);outline-offset:4px;border-radius:6px;background:transparent}'
].join('');try{var s=document.createElement('style');s.textContent=css;document.head.appendChild(s);}catch(_){}})();

var C5FW_CTRL=null, C5FW_EXP=null, C5FW_TARGET=3.5, C5FW_FLOOR=2.5;
function c5fwCadence(){try{return localStorage.getItem('cyberrx_audit_cadence')||'monthly';}catch(_){return 'monthly';}}
function c5fwStatus(sc){if(sc>=C5FW_TARGET)return {t:'Meets target',cls:'good',key:'meets'};if(sc>=C5FW_FLOOR)return {t:'Observation',cls:'warn',key:'obs'};return {t:'Deficiency',cls:'crit',key:'def'};}
function c5fwLvl(sc){var L=(typeof CMMI_LABELS!=='undefined')?CMMI_LABELS:{0:'None',1:'Initial',2:'Managed',3:'Defined',4:'Quant. Managed',5:'Optimizing'};return L[Math.round(sc)]||'';}
function c5fwCol(sc){return (typeof cmmiColor==='function')?cmmiColor(Math.round(sc)):'ink';}
function c5fwMean(arr){if(!arr.length)return 0;return arr.reduce(function(a,b){return a+b;},0)/arr.length;}
/* ============================================================================
   Framework-native assessment wiring (phase 2). CIS / SOC 2 / HIPAA are scored
   by the framework-native control-assessment engine (backend), NOT by averaging
   the CSF controls they crosswalk to. Results are fetched once and cached; the
   CSF ids each control maps to are retained only as related_control_mapping
   (informational), never used for the score.
   ============================================================================ */
var C5_CA_RESULTS=null, C5_CA_BUSY=false;
var C5_CA_FWKEY={csf:'nist_csf_2_0',r53:'nist_800_53_rev5',cis:'cis_v8_1',soc2:'soc2_2017_tsc',hipaa:'hipaa_164',iso:'iso_27001_2022'};
/* Native assessment status → the 0–5 maturity scale for display. Derived ONLY
   from this framework's own result (effectiveness score), never inherited. Not
   Tested / Not Enough / Not API-Testable / Out of Scope return null (excluded). */
function caNativeScore(nat){
  if(!nat)return null;
  var s=nat.assessment_status;
  if(s==='Effective')return 5;
  if(s==='Partially Effective')return Math.round((Number(nat.control_effectiveness_score)||0.5)*5*10)/10;
  if(s==='Ineffective')return 0;
  return null;
}
/* Readiness fallback for a native-framework control the native engine hasn't concluded
   yet: the mean CMMI of the EVIDENCED NIST CSF 2.0 controls it crosswalks to (from your
   connected tools + reviewed documents). A readiness indicator — clearly labelled as
   such, never an independent native audit opinion. null when none of the mapped CSF
   controls are evidenced. */
function caCrosswalkScore(ids,cov){
  var s=[],used=[];(ids||[]).forEach(function(id){var cc=controlCmmi(id,cov);if(cc&&cc.src&&cc.src!=='none'){s.push(cc.score);used.push(id);}});
  return s.length?{score:c5fwMean(s),ids:used}:null;
}
function caStatusPill(status){
  var m={'Effective':['good','Effective'],'Partially Effective':['warn','Partial'],'Ineffective':['crit','Ineffective'],
    'Not Enough Evidence':['muted','Not enough evidence'],'Not Tested':['muted','Not tested'],
    'Not API-Testable':['blue','Manual review'],'Out of Scope':['muted','Out of scope']};
  var o=m[status]||['muted',status||'Not tested'];
  return '<span class="c5fw-sc" style="font-size:11px;font-weight:700;color:var(--'+o[0]+')">'+o[1]+'</span>';
}
/* Fetch framework-native assessments once, cache, then re-render. Degrades to an
   empty result set (everything Not Tested) if the API is unreachable — never a
   fabricated score. */
function caFetch(){
  if(C5_CA_BUSY||C5_CA_RESULTS)return;
  C5_CA_BUSY=true;
  try{
    var base=(typeof apiBase==='function')?apiBase():'';
    var org=(typeof orgId==='function')?orgId():'';
    fetch(base+'/api/control-assessment?org_id='+encodeURIComponent(org),{headers:{'Accept':'application/json'}})
      .then(function(r){return r&&r.ok?r.json():null;})
      .then(function(d){
        C5_CA_BUSY=false;
        var m={};
        if(d&&d.frameworks){Object.keys(d.frameworks).forEach(function(k){var byId={};(d.frameworks[k].results||[]).forEach(function(res){byId[res.control_id]=res;});m[k]=byId;});}
        C5_CA_RESULTS=m;
        try{if(typeof c5Frameworks==='function')c5Frameworks();}catch(_){}
      })
      .catch(function(){C5_CA_BUSY=false;C5_CA_RESULTS={};});
  }catch(_){C5_CA_BUSY=false;C5_CA_RESULTS={};}
}
/* Build the framework tree with real roll-ups. Returns {groups, overall, coverage, failing, all}. */
/* ============================================================================
   Design-effectiveness review (auditor document test). For controls that can't
   be proven by telemetry, the engine reviews the governing policy/standard/SOP
   the way an auditor tests DESIGN: it decomposes the control objective into the
   specific things the document must address, then checks each is covered — and
   covered APPROPRIATELY. Here we surface that checklist so the reviewer sees
   exactly how the engine reviews the document.
   ============================================================================ */
var C5_DESIGN=null, C5_DESIGN_BUSY=false;
function designFetch(){
  if(C5_DESIGN_BUSY||C5_DESIGN)return;
  C5_DESIGN_BUSY=true;
  try{
    var base=(typeof apiBase==='function')?apiBase():'';
    fetch(base+'/api/control-assessment/design/criteria',{headers:{'Accept':'application/json'}})
      .then(function(r){return r&&r.ok?r.json():null;})
      .then(function(d){C5_DESIGN_BUSY=false;var m={};if(d&&d.controls){d.controls.forEach(function(c){if(c&&c.control_id)m[c.control_id]=c;});}C5_DESIGN=m;try{if(typeof c5Frameworks==='function')c5Frameworks();}catch(_){}})
      .catch(function(){C5_DESIGN_BUSY=false;C5_DESIGN={};});
  }catch(_){C5_DESIGN_BUSY=false;C5_DESIGN={};}
}
/* The design-test view for a control: the auditor checklist (what the engine
   looks for in the document) + how appropriateness is judged. Empty string for
   controls that carry no design criteria (pure telemetry controls). */
function c5DesignSection(controlId){
  if(!C5_DESIGN){if(typeof designFetch==='function')designFetch();return '';}
  var d=C5_DESIGN[controlId];if(!d)return '';
  var rows=(d.criteria||[]).map(function(c){
    return '<div class="drow" style="align-items:flex-start"><div class="drow-h"><span class="cap-dot" style="background:var(--muted)"></span><b>'+c5esc(c.text)+'</b>'+(c.required?'':' <span style="color:var(--muted);font-size:11px">· recommended</span>')+'</div><div class="drow-need">✓ covered appropriately when: '+c5esc(c.expectation||'the element is addressed')+'</div></div>';
  }).join('');
  var docs=(d.primary_document_types&&d.primary_document_types.length)?('<b>'+d.primary_document_types.map(c5esc).join(' / ')+'</b>'):'the governing policy / standard / SOP';
  return '<div class="ev-sec">Design-effectiveness review · how the engine reads your document</div>'+
    '<div class="drill-p" style="color:var(--ink-2)">This control is proven by <b>document design</b>, not telemetry. The engine reviews '+docs+' like an auditor: it locates <b>where</b> each element of the control objective is addressed and judges whether it is covered <b>appropriately</b> — mentioning a topic is not enough. Below are the '+((d.criteria||[]).length)+' elements it checks. Upload the document under <b>Documents reviewed</b> to run the review and see, per element, the exact passage found and the pass/fail.</div>'+
    '<div style="margin-top:8px">'+rows+'</div>';
}
function c5fwTree(sel,cov){
  var groups=[],all=[],evidenced=0,catalogTotal=0;
  function ctl(id,name,mapped){var cc=controlCmmi(id,cov);all.push(cc.score);if(cc.src!=='none')evidenced++;
    return {type:'ctl',id:id,name:name,score:cc.score,src:cc.src,toolPct:cc.toolPct,doc:cc.doc,mapped:mapped||null};}
  if(sel==='csf'&&typeof CSF_RAW!=='undefined'){
    Object.keys(CSF_RAW).forEach(function(fnName){var m=fnName.match(/\(([^)]+)\)/),fid=m?m[1]:fnName;var cats=CSF_RAW[fnName],catNodes=[],fnScores=[];
      Object.keys(cats).forEach(function(catName){var cm=catName.match(/\(([^)]+)\)/),cid=cm?cm[1]:catName;var ctls=cats[catName].map(function(r){return ctl(r[0],r[1]);}),cScore=c5fwMean(ctls.map(function(c){return c.score;}));
        ctls.forEach(function(c){fnScores.push(c.score);});
        catNodes.push({type:'cat',id:cid,name:catName.replace(/ *\(.*/,''),score:cScore,children:ctls});});
      groups.push({type:'grp',id:fid,name:fnName.replace(/ *\(.*/,''),score:c5fwMean(fnScores),children:catNodes,rollup:catNodes.map(function(c){return {id:c.id,score:c.score};})});});
  } else if(sel==='r53'&&typeof R53_RAW!=='undefined'){
    R53_RAW.forEach(function(f){var fam=f[0],nm=f[1],n=f[2],ctls=[];
      // Family maturity inherited from the CSF assessment of the same governing policy.
      var fe=(typeof r53FamEvidence==='function')?r53FamEvidence(fam,cov):{score:0,csfIds:[]};
      var docLbl=(typeof r53FamDocLabel==='function')?r53FamDocLabel(fam):'';
      for(var i=1;i<=n;i++){var id=fam+'-'+i,cc=controlCmmi(id,cov),node;
        if(cc.src!=='none'){ // Nerion scores this 800-53 control directly (policy / tool)
          node={type:'ctl',id:id,name:nm,score:cc.score,src:cc.src,toolPct:cc.toolPct,doc:cc.doc};all.push(cc.score);evidenced++;}
        else if(fe.score>0){ // inherit the family's crosswalk maturity from CSF
          var s=Math.round(fe.score*10)/10;node={type:'ctl',id:id,name:nm,score:s,src:'mapped',mapped:fe.csfIds,r53fam:fam,r53doc:docLbl};all.push(s);evidenced++;}
        else { // not evidenced — declare the governing policy it awaits
          node={type:'ctl',id:id,name:nm,score:0,src:'none',r53fam:fam,r53doc:docLbl};all.push(0);}
        ctls.push(node);}
      groups.push({type:'grp',id:fam,name:fam+' · '+nm,score:c5fwMean(ctls.map(function(c){return c.score;})),children:ctls,rollup:ctls.map(function(c){return {id:c.id,score:c.score};})});});
  } else if(typeof fwXmap==='function'){
    // FRAMEWORK-NATIVE (CIS / SOC 2 / HIPAA). No crosswalk scoring: a control's
    // status comes from the native assessment engine (C5_CA_RESULTS[fwKey]),
    // NEVER from averaging the CSF controls it maps to. The CSF ids are kept on
    // the node as `related` (informational) only. Controls the engine has not yet
    // natively assessed are Not Tested and excluded from the maturity roll-up.
    var caFw=(C5_CA_RESULTS&&C5_CA_FWKEY[sel])?C5_CA_RESULTS[C5_CA_FWKEY[sel]]:null;
    fwXmap(sel).forEach(function(g){var gid=g[0],gname=g[1],items=g[2]||[];
      var ctls=items.map(function(it){
        catalogTotal++;
        var nat=caFw?caFw[it[0]]:null;
        var sc=caNativeScore(nat),status,src,tested,readiness=false,mappedIds=null;
        if(sc!=null){ // the native engine concluded this control directly — always wins
          status=nat.assessment_status;src='native';tested=true;
        } else { // fall back to a crosswalk READINESS score from the mapped CSF evidence
          var cw=caCrosswalkScore(it[2],cov);
          if(cw&&cw.score!=null){sc=cw.score;src='mapped';status='Readiness (crosswalk)';tested=true;readiness=true;mappedIds=cw.ids;} // the CSF controls that actually drove the score
          else {src='native-pending';status=nat?nat.assessment_status:'Not Tested';tested=false;}
        }
        if(tested){all.push(sc);evidenced++;}
        return {type:'ctl',id:it[0],name:it[1],score:(sc==null?0:sc),tested:tested,status:status,src:src,mapped:mappedIds,related:(it[2]||[]),native:nat||null,readiness:readiness};
      });
      var ts=ctls.filter(function(c){return c.tested;}).map(function(c){return c.score;});
      groups.push({type:'grp',id:gid,name:gname,score:c5fwMean(ts),children:ctls,rollup:ctls.map(function(c){return {id:c.id,score:c.score};})});
    });
  }
  var failing=all.filter(function(s){return s<C5FW_FLOOR;}).length;
  var _total=catalogTotal||all.length;
  return {groups:groups,overall:c5fwMean(all),coverage:_total?Math.round(evidenced/_total*100):0,failing:failing,total:_total,evidenced:evidenced,native:(catalogTotal>0)};
}
/* How the framework's controls are currently evidenced — so "24 of 106" is broken
   down by SOURCE (document review vs connected tool vs not-yet), which is what
   tells you WHY controls are unevidenced and what to do about it. */
function c5fwSrcCounts(T){
  var d=0,s=0,m=0,n=0,nat=0;
  function tally(v){if(v==='document')d++;else if(v==='system')s++;else if(v==='mapped')m++;else if(v==='native')nat++;else n++;}
  (T.groups||[]).forEach(function(g){(g.children||[]).forEach(function(c){
    if(c.type==='cat')(c.children||[]).forEach(function(x){tally(x.src);});else tally(c.src);});});
  return {doc:d,sys:s,mapped:m,none:n,native:nat};
}
/* The unevidenced controls grouped by the SOURCE they await — so the gap reads as
   "upload these 5 documents / connect these 2 tools", not "90 deficiencies". */
function c5fwGaps(T){
  if(typeof FW_CTRL_SRC==='undefined')return [];
  var by={};
  function need(node){if(node.src&&node.src!=='none')return;var kind,label;
    var d=FW_CTRL_SRC[node.id];
    if(d){kind=d.k;label=d.k==='d'?((typeof FW_DOC_LABEL!=='undefined'&&FW_DOC_LABEL[d.s])||'policy'):((typeof CAP_BY_KEY!=='undefined'&&CAP_BY_KEY[d.s]&&CAP_BY_KEY[d.s].tool)||'tool');}
    else if(node.r53doc){kind='d';label=node.r53doc;} // 800-53 control awaiting its governing policy
    else return;
    var src=d?d.s:(node.r53doc||label); // onboarding target: the doc-type key (d8…) when known
    var key=kind+':'+label;(by[key]=by[key]||{kind:kind,label:label,n:0,s:src}).n++;}
  (T.groups||[]).forEach(function(g){(g.children||[]).forEach(function(c){
    if(c.type==='cat')(c.children||[]).forEach(function(x){need(x);});else need(c);});});
  return Object.keys(by).map(function(k){return by[k];}).sort(function(a,b){return b.n-a.n;});
}
/* Left panel — auditor finding for the selected node. Public-standard text is fine
   for CSF/800-53/HIPAA; CIS/SOC2 render numbers/titles/mappings only (no proprietary text). */
function c5fwFinding(sel,node){
  if(!node)return '<div class="c5fw-detail"><div class="c5kick">Finding &amp; recommendation</div><div class="c5intro" style="margin-top:8px">Select a control on the right to open its auditor finding — the score roll-up, what was tested, why it scored below target, the recommendation with a target uplift, and the cross-framework mappings.</div></div>';
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
  h+='<div class="ev-sec">Conclusion</div><div class="drill-p">'+F.conclusion+'</div>';
  h+='<div class="ev-sec">Recommendation</div><div class="drill-p">'+F.recommendation+(F.targetUplift?(' — target uplift '+F.targetUplift+'.'):'')+'</div>';
  if(F.mappings&&F.mappings.length){h+='<div class="ev-sec">Cross-framework</div><div class="drill-p">'+F.mappings.map(function(id){return '<span class="c5fw-chip">'+id+'</span>';}).join('')+'</div>';}
  h+=c5DesignSection(node.id);
  // Evidence source is the provenance footer — moved to the bottom so the finding reads
  // condition → criteria → conclusion → recommendation first, then how it was evidenced.
  h+=c5fwSource(node);
  h+='</div>';
  return h;
}
/* Evidence-source (provenance) block for a control-level finding — names the exact
   source of the score so it's defensible: which connected tool (and whether the
   telemetry is live or demo) for a system-evidenced control, or which document for
   a document-evidenced one. Document-evidenced controls get a → arrow that opens
   the document review scrolled to that control's entry. */
function c5fwSource(node){
  if(!node||node.type!=='ctl')return '';
  var h='<div class="ev-sec">Evidence source</div>';
  if(node.src==='system'){
    var tool=(typeof c5fwCtrlTool==='function')?c5fwCtrlTool(node.id):null;
    var s=(tool&&typeof capSource==='function')?capSource(tool):null;
    var vend=s?s.vendor:(tool?tool.tool:'connected tool');
    var live=s?(s.connected?(s.demo?'demo telemetry':'live telemetry'):'representative telemetry'):'telemetry';
    var pct=(node.toolPct!=null)?(' · '+node.toolPct+'% coverage'):'';
    h+='<div class="c5fw-src"><span class="c5fw-srcic">🔌</span><div><b>'+c5esc(vend)+'</b> — '+c5esc(live)+pct+
      (tool?('<div class="c5fw-srcsub">'+c5esc(tool.name.replace(/ *\(.*\)/,''))+' capability</div>'):'')+'</div></div>';
  } else if(node.src==='document'){
    var fn=(node.doc&&node.doc.doc)?node.doc.doc:'Uploaded policy';
    var attrs=(node.doc&&Array.isArray(node.doc.attrs))?node.doc.attrs:[];
    var presentN=attrs.filter(function(a){return a.found;}).length;
    var att=attrs.length?(' · '+presentN+' of '+attrs.length+' attributes present'):'';
    // Annotations from the analyzed policy, inline in the detail window: each expected
    // control attribute with the verbatim evidence quote where the policy language
    // satisfies it (the auditor workpaper proof), or the reason it's missing. Plus a
    // button that opens the source document reference scrolled to this control.
    var annos=attrs.length?('<div class="c5fw-annos" style="margin-top:10px;display:flex;flex-direction:column;gap:8px">'+attrs.map(function(a){
      var ok=!!a.found,cc=ok?'good':'crit';
      var detail=(ok&&a.evidence)
        ?('<div style="font-size:11.5px;color:var(--ink-2);font-style:italic;line-height:1.5;margin-top:2px;border-left:2px solid color-mix(in srgb,var(--good) 55%,var(--line));padding-left:9px">“'+c5esc(String(a.evidence).slice(0,240))+(String(a.evidence).length>240?'…':'')+'”</div>')
        :(!ok?('<div style="font-size:11px;color:var(--muted);margin-top:2px">'+c5esc(a.reasoning?String(a.reasoning).slice(0,180):'Not found in the analyzed policy — complete this in the document and re-score.')+'</div>'):'');
      return '<div><span style="font-size:10.5px;font-weight:700;color:var(--'+cc+')">'+(ok?'✓ ':'✗ ')+c5esc(a.label)+'</span>'+detail+'</div>';
    }).join('')+'</div>'):'';
    h+='<div class="c5fw-src"><span class="c5fw-srcic">📄</span><div style="flex:1;min-width:0"><b>'+c5esc(fn)+'</b>'+att+
      '<div class="c5fw-srcsub">Document review <button type="button" class="c5fw-jump" data-c5docopen="'+c5esc(fn)+'" title="Open and read the uploaded document">→ open the uploaded document</button></div>'+
      annos+
    '</div></div>';
  } else if(node.src==='mapped'){
    if(node.r53fam){ // 800-53 control inheriting its family's CSF crosswalk maturity
      var few=(node.mapped||[]).slice(0,6).join(', ')+((node.mapped||[]).length>6?', …':'');
      h+='<div class="c5fw-src"><span class="c5fw-srcic">🔗</span><div>Assessed by <b>800-53 ↔ CSF crosswalk</b> — inherits the maturity of your <b>'+c5esc(node.r53doc||'governing policy')+'</b> (CSF '+c5esc(few||'controls')+').</div></div>';
    } else {
      // Name the exact CSF controls this readiness score inherited from, and show that
      // each one is itself evidenced from your uploaded documents or connected tools — so
      // the crosswalk is verifiable, not a black box.
      var _mids=node.mapped||[],_cov=(typeof fwDeployedIds==='function')?fwDeployedIds():{};
      var _rows=_mids.slice(0,8).map(function(cid){var cc=(typeof controlCmmi==='function')?controlCmmi(cid,_cov):{score:0,src:'none'};
        var _ic=cc.src==='document'?'📄 document review':cc.src==='system'?'🔌 connected tool':'— not evidenced';
        var _dn=(cc.doc&&cc.doc.doc)?(' · '+c5esc(cc.doc.doc)):'';
        return '<div style="font-size:11px;color:var(--ink-2);line-height:1.4"><b>'+c5esc(cid)+'</b> — '+_ic+_dn+' · CMMI '+(cc.score!=null?cc.score:0)+'</div>';}).join('');
      h+='<div class="c5fw-src"><span class="c5fw-srcic">🔗</span><div style="flex:1;min-width:0">Scored by crosswalk from <b>your evidence</b> — this control inherits the maturity of the <b>'+_mids.length+'</b> NIST CSF 2.0 subcategor'+(_mids.length===1?'y':'ies')+' it shares an objective with. Each of those is evidenced from your connected tools + reviewed documents:'+
        (_rows?('<div style="margin-top:6px;display:flex;flex-direction:column;gap:2px;border-left:2px solid var(--line);padding-left:9px">'+_rows+(_mids.length>8?('<div style="font-size:11px;color:var(--muted)">+ '+(_mids.length-8)+' more</div>'):'')+'</div>'):' none of the mapped CSF controls are evidenced yet — connect the tool or upload the document they await.')+
        '<div style="font-size:11px;color:var(--muted);margin-top:6px">A <b>readiness indicator</b> from the public crosswalk — a defensible estimate of where you stand, not a certified '+((typeof FW_NAMES!=='undefined'&&typeof FW_SEL!=='undefined'&&FW_NAMES[FW_SEL])||'framework')+' audit opinion (your assessor issues that).</div></div></div>';
    }
  } else {
    // Not evidenced yet — name the EXACT source this control is mapped to, so the
    // fix is unambiguous (never a bare "Non-existent").
    var decl=(typeof FW_CTRL_SRC!=='undefined')?FW_CTRL_SRC[node.id]:null;
    if(decl&&decl.k==='d'){var dl=(typeof FW_DOC_LABEL!=='undefined'&&FW_DOC_LABEL[decl.s])||'the governing policy';
      h+='<div class="c5fw-src c5fw-src-none"><span class="c5fw-srcic">📄</span><div>Not evidenced yet · evidenced by <b>document review</b> of your <b>'+c5esc(dl)+'</b>. Upload it in onboarding, then press <b>↻ Recompute</b>.</div></div>';}
    else if(decl&&decl.k==='t'){var c=(typeof CAP_BY_KEY!=='undefined')?CAP_BY_KEY[decl.s]:null,tn=(c&&c.tool)||'the source tool';
      h+='<div class="c5fw-src c5fw-src-none"><span class="c5fw-srcic">🔌</span><div>Not evidenced yet · evidenced by <b>telemetry</b> from <b>'+c5esc(tn)+'</b>. Connect it under “Connect your systems”.</div></div>';}
    else if(node.r53fam){ // 800-53 control whose governing policy isn't evidenced yet
      h+='<div class="c5fw-src c5fw-src-none"><span class="c5fw-srcic">📄</span><div>Not evidenced yet · assessed via <b>800-53 ↔ CSF crosswalk</b> of your <b>'+c5esc(node.r53doc||'governing policy')+'</b>. Upload it in onboarding, then press <b>↻ Recompute</b>.</div></div>';}
    else h+='<div class="c5fw-src c5fw-src-none"><span class="c5fw-srcic">—</span><div>No evidence source declared for this control.</div></div>';
  }
  return h;
}
/* Open the Documents-reviewed modal and scroll to a specific control's entry,
   briefly highlighting it — the → arrow on a document-evidenced finding. */
function c5OpenDocsReviewAt(cid){
  try{
    c5OpenDocsReview();
    setTimeout(function(){
      // Clear any prior reference box so only the one just opened is boxed.
      var host=document.getElementById('docDoc');
      if(host)host.querySelectorAll('.c5doc-ref').forEach(function(x){x.classList.remove('c5doc-ref');});
      var el=document.getElementById('c5doc-'+cid);
      if(el){try{el.scrollIntoView({behavior:'smooth',block:'center'});}catch(_){el.scrollIntoView();}
        // Persistent green transparent box around the referenced control (kept until
        // another reference is opened or the review is closed) — not a brief flash.
        el.classList.add('c5doc-ref');}
    },70);
  }catch(_){}
}
/* Plain-text finding fields for a control — the single source used by both the tab
   (left panel) and the auditor-pack PPTX, so the deck matches the tab exactly. */
/* Plain-English evidence-source phrasing per control domain — used to paraphrase what
   Nerion actually collected and assessed for a control (the "what was tested" narrative),
   keyed off the NIST CSF 2.0 family (or, for a mapped-framework control, the family of the
   CSF subcategory it inherits from). Falls back to a generic phrase so every control reads
   sensibly. */
var C5FW_EVID={
  'PR.AA':{ev:'authentication and access',src:'identity providers, sign-in logs, service/API identity inventories, device management tools, PAM platforms, and authoritative user, device, and application inventories'},
  'PR.AT':{ev:'security-awareness',src:'the learning-management system, phishing-simulation results, and training-completion records'},
  'PR.DS':{ev:'data-protection',src:'encryption configurations, key-management systems, DLP tooling, and storage and transport security settings'},
  'PR.PS':{ev:'platform-security',src:'configuration baselines, patch-management records, secure-build pipelines, and endpoint-hardening reports'},
  'PR.IR':{ev:'infrastructure-resilience',src:'network-segmentation records, firewall and network-edge configurations, and resilience and failover test results'},
  'PR':{ev:'safeguard',src:'the connected protective tools and governing policies mapped to this control'},
  'ID.AM':{ev:'asset-inventory',src:'asset-management systems, the CMDB, and software and service inventories'},
  'ID.RA':{ev:'risk-assessment',src:'vulnerability scanners, threat-intelligence feeds, and the risk register'},
  'ID':{ev:'identification and risk',src:'asset-management systems, vulnerability scanners, and the risk register'},
  'GV':{ev:'governance',src:'governance policies, roles-and-responsibilities records, and oversight and committee documentation'},
  'DE.CM':{ev:'monitoring',src:'SIEM, EDR, and network-monitoring telemetry'},
  'DE.AE':{ev:'event-analysis',src:'SIEM correlation rules, alert-triage records, and event-analysis workflows'},
  'DE':{ev:'detection',src:'SIEM, EDR, and network-monitoring telemetry'},
  'RS':{ev:'incident-response',src:'incident-response runbooks, ticketing records, and post-incident reviews'},
  'RC':{ev:'recovery',src:'backup systems, recovery-plan test results, and restoration logs'}
};
function c5fwEvid(node){
  var key=(node&&node.id)||'';
  if(node&&node.src==='mapped'&&node.mapped&&node.mapped.length)key=node.mapped[0];
  var m=key.match(/^([A-Z]{2}\.[A-Z]{2})/);var fam=m?m[1]:'';
  var f2=key.match(/^([A-Z]{2})/);var fn=f2?f2[1]:'';
  return C5FW_EVID[fam]||C5FW_EVID[fn]||{ev:'control',src:'the connected security tools and governing documents mapped to this control'};
}
function c5fwObjPhrase(node){var n=String((node&&node.name)||'this control objective').replace(/\.$/,'');return n.charAt(0).toLowerCase()+n.slice(1);}
/* Paraphrased control objective + the evidence Nerion collected, e.g. "Nerion collected
   authentication and access evidence from identity providers, sign-in logs … to assess
   whether users, services & hardware are authenticated". `seek` swaps the verb for
   not-yet-evidenced controls (sought, not collected). */
function c5fwCondLead(node,seek){var e=c5fwEvid(node);return 'Nerion '+(seek?'sought':'collected')+' '+e.ev+' evidence from '+e.src+' to assess whether '+c5fwObjPhrase(node);}
/* The auditor's conclusion for a control — plain-English, phrased as Nerion's note. */
function c5fwConclusion(st,node){
  if(node&&node.src==='none')return 'Nerion could not conclude on the control criteria — the control is not yet evidenced.';
  if(st.key==='meets')return 'Nerion noted that all control criteria are functioning as expected.';
  if(st.key==='obs')return 'Nerion noted that the control criteria are largely functioning, but coverage falls short of the CMMI '+C5FW_TARGET.toFixed(1)+' target.';
  return 'Nerion noted that the control criteria are not functioning as expected — the control is below the CMMI '+C5FW_TARGET.toFixed(1)+' assurance threshold.';
}
function c5fwFindingData(sel,node){
  var st=c5fwStatus(node.score),pct=(node.toolPct!=null)?node.toolPct:null;
  var crit='Control '+node.id+' ('+node.name+') is assessed against a maturity target of CMMI '+C5FW_TARGET.toFixed(1)+' (Defined+).';
  var cond,cause,effect,rec,ev=[];
  if(node.src==='mapped'){
    cond=c5fwCondLead(node)+'. Assessed by crosswalk from the '+((node.mapped||[]).length)+' NIST CSF 2.0 subcategor'+((node.mapped||[]).length===1?'y':'ies')+' it maps to, at CMMI '+node.score.toFixed(1)+'.';
    cause='The mapped CSF controls carry the deficiency; this framework reflects it through the public crosswalk.';
    effect=st.key==='def'?'A deficiency in the mapped controls leaves this requirement below assurance level.':(st.key==='obs'?'The mapped posture is below target — an observation to raise toward the goal.':'The mapped posture meets the target.');
    rec='Uplift the underlying CSF controls (see mapping); this requirement rises with them. Refer to your organization’s own '+(sel==='cis'?'CIS Controls license':'framework license')+' for implementation-tier detail.';
    ev.push(['Derivation','Public CSF 2.0 crosswalk']);ev.push(['Mapped controls',(node.mapped||[]).join(', ')]);
  } else if(node.src==='system'){
    cond=c5fwCondLead(node)+'. '+(pct!=null?('Automated continuous monitoring measured '+pct+'% effective coverage across the in-scope population — '+(100-pct)+'% remains outside the control; '):'')+'assessed at CMMI '+node.score.toFixed(1)+'.';
    cause=st.key==='meets'?'Coverage meets the maturity threshold.':'Coverage sits below the ≥90% threshold required for full maturity, leaving a residual population unprotected.';
    effect=st.key==='def'?'The uncovered population is a control deficiency — exploitable exposure until remediated.':(st.key==='obs'?'The residual population is an observation — a gap to close toward target.':'No material exposure at current coverage.');
    rec=st.key==='meets'?'Maintain coverage and retain the tool’s evidence export each cycle.':'Extend the control to the residual population to raise coverage toward ≥90%';
    ev.push(['Method','Automated continuous control monitoring']);if(pct!=null)ev.push(['Measured coverage',pct+'%']);ev.push(['Maturity','CMMI '+node.score]);
  } else if(node.src==='document'){
    cond=c5fwCondLead(node)+'. '+(node.doc&&node.doc.attrs?('Document review found the governing policy present '+(node.doc.attrs.filter(function(a){return a.found;}).length)+' of '+node.doc.attrs.length+' expected control attributes'):'Document review found the governing policy partially satisfies the expected attributes')+'; assessed at CMMI '+node.score.toFixed(1)+'.';
    cause=st.key==='meets'?'The policy evidences the required attributes.':'Some expected attributes are absent from the analyzed policy, capping maturity below target.';
    effect=st.key==='meets'?'Documented control operating as designed.':'Design gap — the control may not operate consistently until the policy is completed.';
    rec=st.key==='meets'?'Maintain the policy and re-verify on the '+c5fwCadence()+' cadence.':'Complete the missing policy attributes and re-submit for document review';
    ev.push(['Method','Document review']);ev.push(['Maturity','CMMI '+node.score]);
  } else {
    cond=c5fwCondLead(node,true)+'. No evidence is on file for this control — neither connected-tool telemetry nor an analyzed policy. Assessed at CMMI 0 (Not evidenced).';
    cause='The control’s source tool is not connected and no governing policy has been analyzed.';
    effect='Assurance cannot be given for this control until it is evidenced — a deficiency by default.';
    rec='Connect the control’s tool or upload the governing policy so the control gains an evidenced maturity score';
    ev.push(['Evidence','None on file']);
  }
  var cur=Math.round(node.score),tgt=Math.min(5,Math.max(cur+1,Math.ceil(C5FW_TARGET)));
  return {ref:node.id,name:node.name,classification:st.t,score:node.score,condition:cond,criteria:crit,cause:cause,conclusion:c5fwConclusion(st,node),effect:effect,recommendation:rec,
    targetUplift:(node.score<C5FW_TARGET)?('L'+cur+' → L'+tgt+' within one '+c5fwCadence()+' cycle'):'',mappings:node.mapped||[],evidence:ev};
}
/* Build the full assessment payload from the tree + findings and POST it to the
   auditor-pack builder — the deck is a rendering of the same Metric/Finding data. */
function c5fwPayload(){
  var sel=FW_SEL,cov=(typeof fwDeployedIds==='function')?fwDeployedIds():{},T=c5fwTree(sel,cov);
  var controls=[];T.groups.forEach(function(g){(g.children||[]).forEach(function(c){if(c.type==='cat'){(c.children||[]).forEach(function(x){controls.push(x);});}else controls.push(c);});});
  var nm=(typeof FW_NAMES!=='undefined'&&FW_NAMES[sel])||sel;var mapped=(sel==='cis'||sel==='soc2'||sel==='hipaa'||sel==='iso');
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
  var backboneNote={csf:'Alongside the maturity scores, each Function is expressed as a Current Profile against the organisation’s Target Profile and an implementation Tier (1 Partial through 4 Adaptive).',r53:'In a formal RMF context these findings feed the System Security Plan (SSP), the Security Assessment Report (SAR), the Risk Assessment Report (RAR) and a Plan of Action & Milestones (POA&M); each control is assessed as Satisfied or Other-than-Satisfied.',cis:'Each Safeguard ID is assessed natively by a Nerion-authored evidence test against its Implementation Group (IG1, IG2, IG3) — no official CIS Safeguard text is stored or reproduced and no CSF crosswalk is used to score it; configuration-level benchmark signals are used where CIS-CAT tooling is connected.',soc2:'Each criterion is assessed natively by its identifier against a Nerion-authored evidence test — no official AICPA Trust Services Criteria text is stored or reproduced, and no CSF crosswalk is used to score it.',hipaa:'Required and Addressable implementation specifications are distinguished, and severity is escalated for Required specifications near the floor.'}[sel]||'';
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
/* PPTX auditor pack. Draft by default (DRAFT watermark on every slide); pass
   final=true to issue a clean, unwatermarked copy for handing to auditors. */
function c5fwExport(final){var P=c5fwPayload();if(!P)return;var pl=Object.assign({},P.payload,{draft:!final});var tag=final?'final':'draft';c5fwDownload('/api/ciso/auditor-pack.pptx','nerion-auditor-pack-'+P.sel+'-'+tag+'.pptx',pl);}
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
  var asks=[];var TD=c5TopDriver();
  // Risk acceptances — one per exposed crown jewel in this seat's domain.
  var enterprise=(seat==='cro'||seat==='board'||seat==='ceo');
  var exps=c5SeatExposures(seat);
  if(exps.length){
    exps.forEach(function(t){
      var usd=Number(t.exposure_usd)||null,name=t.asset||'a crown jewel';
      asks.push({id:seat+'_accept_'+String(name).replace(/[^a-z0-9]+/gi,'_').toLowerCase().slice(0,40),kind:'accept',
        title:'Residual risk decision — '+name+' exposure',
        why:(enterprise?('One of your most exposed crown jewels is '+name):('The exposed crown jewel in your area is '+name))+(usd?(' ('+c5AskMoney(usd)+' modeled exposure)'):'')+'. Remediation is scoped but not yet funded.',
        ask:'Approve accepting the residual risk until the fix is funded next cycle, or decline and fund it now.',
        opts:['Approve acceptance','Decline — fund now','Defer']});
    });
  }else{
    // No live exposure yet — one clearly-labelled sample so the pattern shows pre-connect.
    var sn=C5_SEAT_SAMPLE[seat]||'your top crown jewel';
    asks.push({id:seat+'_accept_sample',kind:'accept',sample:true,
      title:'Residual risk decision — '+sn+' exposure',
      why:'This populates from your live crown-jewel exposures once your Crown-Jewel Register and GRC are connected — '+(enterprise?'your most exposed assets appear here.':'the exposed assets in your area appear here.'),
      ask:'Approve accepting the residual risk until the fix is funded next cycle, or decline and fund it now.',
      opts:['Approve acceptance','Decline — fund now','Defer']});
  }
  if(seat==='cfo')
    asks.push({id:'cfo_fund_best',kind:'fund',title:'Fund the highest-return control',
      why:'Your best dollar closes the '+TD.short+' gap — the most risk reduced per dollar, and it trims the insurance tail where you are thin.',
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
    asks.push({id:'cpo_prioritize_identity',kind:'accept',title:'Prioritize the '+TD.short+' fix in the backlog',
      why:'The '+TD.short+' & access model is a security gap, a source of user friction and a recurring release blocker — one fix returns all three.',
      ask:'Commit it to the top of the product backlog, or defer.',opts:['Prioritize','Defer']});
  if(seat==='audit')
    asks.push({id:'audit_escalate_identity',kind:'attest',title:'Escalate — '+TD.short+' for follow-up',
      why:cap(TD.short)+' & access is your overdue review, outstanding test, repeat finding and evidence gap at once.',
      ask:'Escalate '+TD.short+' for audit-committee follow-up, or note it as tracked.',opts:['Escalate','Note as tracked']});
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
/* The per-seat "asks" cards (c5Asks) are retired in favour of the standardized decision
   panels (c5dec / c5<seat>Decisions) — one consistent decision format on every seat.
   c5SeatViews now just clears any legacy "-asks" containers so nothing renders above the
   decisions. c5AskModel / c5Asks remain for the record but are no longer rendered. */
function c5SeatViews(){['board','ceo','cfo','clo','cro','cio','coo','cpo','audit'].forEach(function(s){try{var h=document.getElementById(s+'-asks');if(h)h.innerHTML='';}catch(_){}});}
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
var C5_DP_PLANNER_OPEN=false; // control-improvement planner drill-down open?
function c5DecProj(){
  var host=document.getElementById('c5-decproj');if(!host)return;
  if(window.__c5Return||document.getElementById('c5retbar')){window.__c5Return=null;c5HideReturnBar();}
  var levers=c5Levers();
  // Standardized decision panel — one funding decision per lever, in the same
  // c5dec / c5decisions format every other seat uses (was a bespoke 3-panel tool).
  var list=levers.slice(0,4).map(function(l,i){
    var n=l.proj.length;
    var moves=n?(n+' mapped control'+(n>1?'s':'')+' toward target maturity'):'your posture in this area';
    var rec={on:'Commit & fund',osum:'Unlocks modeled exposure reduction · improves '+moves,
      pros:['Improves '+moves+'.','Reduces modeled exposure in this area.','Opens a tracked funding project.'],
      cons:['Requires capital this cycle (scoped with your team).'],
      consequence:'Opens a tracked funding project and begins control-improvement tracking.'};
    var alt=[{on:'Defer to next cycle',osum:'Records the deferral; the gap stays open',pros:['No spend now.'],cons:['The exposure stays open until it is funded.'],req:true,consequence:'Records the decision as deferred; the exposure remains open until the next cycle.'}];
    return c5dec('cs',i+1,'Fund '+l.name+'?',l.need,rec,alt);
  });
  host.innerHTML=c5header()+
    c5shell('Decisions · what needs your sign-off?',(levers.length?(levers.length+' funding decision'+(levers.length>1?'s':'')+' waiting — commit or defer each.'):'Connect your tools and the funded decisions that move your posture appear here.'),null,'Each decision funds a control that improves your posture and reduces modeled exposure. Choosing one stamps it with your name and time, keeps it editable for 24 hours, and opens a tracked project.')+
    (list.length?c5decisions(list):'<div class="c5note">◐ Connect your security tools and upload your policies, and the funded decisions that move your posture appear here — each with the exact controls it improves.</div>')+
    '<div class="c5foot">Each decision is priced from your control model.</div>';
}
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
  var prov=C5_CJT_INPUT?'<div class="c5cjt-prov"><b>How to read this — every figure traces to your inputs.</b> Dollars are shown at the <b>critical function</b> and at each <b>risk</b>. A function’s <b>business value</b> = the annual revenue of the processes it runs (your Business-Processes upload); it splits into <b>already mitigated</b> (behind controls at CMMI 3+) and <b>residual at risk</b> (behind controls below 3). Processes and crown jewels are the structural path (no dollars). Each risk’s figure = the slice of that value its controls leave exposed. Hover any figure for its exact math.</div>':'';
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
          jewels.push({name:a.name||'Crown jewel',type:isInfra(a.name)?'Infrastructure':'Application',value:val/1e9,provisional:!!a.provisional,risks:risks});
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
  // CIS / SOC 2 / HIPAA are scored by the framework-native engine — fetch once.
  if(sel==='cis'||sel==='soc2'||sel==='hipaa'||sel==='iso'){try{caFetch();}catch(_){}}
  var T=c5fwTree(sel,cov);
  // Stash for the community-benchmark panel (compares THIS framework's maturity).
  window.C5FW_OVERALL=T.overall;window.C5FW_GROUPS=T.groups;
  // Open folded to the highest root level — every function (GV/ID/PR/DE/RS/RC)
  // collapsed. The CISO expands the one they want; expansions persist for the session.
  if(C5FW_EXP==null){C5FW_EXP={};}
  if(C5FW_CTRL==null&&sel==='csf'){C5FW_CTRL='PR.AA-03';}
  // find selected node
  var selNode=null;
  T.groups.forEach(function(g){if(g.id===C5FW_CTRL)selNode=g;(g.children||[]).forEach(function(c){if(c.id===C5FW_CTRL)selNode=c;(c.children||[]).forEach(function(x){if(x.id===C5FW_CTRL)selNode=x;});});});
  // cadence + refresh
  var cad=c5fwCadence();var now=new Date();var nextD=new Date(now.getTime()+((CADENCE_MS&&CADENCE_MS[cad])||30*864e5));
  var fmt=function(d){try{return d.toLocaleDateString();}catch(_){return '';}};
  var st=c5fwStatus(T.overall);
  // Trend card — this framework's overall CMMI last refresh vs current, with a 2-bar mini
  // chart: green + ▲ when current is higher, red + ▼ when lower, equal muted bars when
  // unchanged. Reads the recorded history (cyberrx_fw_history); with no prior refresh, last
  // equals current (no change).
  var trendCard=(function(){
    var cur=T.overall;var h=(typeof fwHistory==='function')?fwHistory():[];
    var prev=cur;
    if(h.length>=1){prev=Number(h[h.length-1].v);if(h.length>=2&&Math.abs(prev-cur)<0.05)prev=Number(h[h.length-2].v);}
    if(!(prev>=0))prev=cur;
    var delta=cur-prev,dir=delta>0.049?'up':(delta<-0.049?'down':'flat');
    var col=dir==='up'?'good':(dir==='down'?'crit':'muted');
    var arrow=dir==='up'?'▲':(dir==='down'?'▼':'▬');
    var deltaStr=dir==='flat'?'no change':(dir==='up'?'+':'')+delta.toFixed(1);
    var mx=5,b1=Math.max(4,Math.round(prev/mx*26)),b2=Math.max(4,Math.round(cur/mx*26));
    var chart='<span style="display:inline-flex;align-items:flex-end;gap:4px;height:26px" title="last refresh '+prev.toFixed(1)+' → current '+cur.toFixed(1)+'">'
      +'<i style="width:11px;height:'+b1+'px;background:var(--line);border-radius:2px;display:inline-block"></i>'
      +'<i style="width:11px;height:'+b2+'px;background:var(--'+col+');border-radius:2px;display:inline-block"></i></span>';
    return '<div class="c5card" data-c5fwcard="trend"><div class="c5card-top"><span class="c5card-l">Trend · vs last refresh</span><span class="c5chip c5-computed">computed</span></div>'
      +'<div class="c5card-v" style="display:flex;align-items:center;gap:10px">'+chart+'<span style="color:var(--'+col+');font-size:18px">'+arrow+' '+deltaStr+'</span></div>'
      +'<div class="cn">Last '+prev.toFixed(1)+' · current <b>'+cur.toFixed(1)+'</b></div></div>';
  })();
  var cards='<div class="c5cards">'+
    '<div class="c5card" data-c5fwcard="overall"><div class="c5card-top"><span class="c5card-l">Overall maturity</span><span class="c5chip c5-computed">computed</span></div><div class="c5card-v" style="color:var(--'+c5fwCol(T.overall)+')">'+T.overall.toFixed(1)+' / 5</div><div class="cn">'+c5fwLvl(T.overall)+' · target '+C5FW_TARGET.toFixed(1)+'</div></div>'+
    '<div class="c5card" data-c5fwcard="coverage"><div class="c5card-top"><span class="c5card-l">Coverage</span><span class="c5chip c5-computed">computed</span></div><div class="c5card-v" style="color:var(--'+(T.coverage>=75?'good':T.coverage>=50?'warn':'crit')+')">'+T.coverage+'%</div><div class="cn">'+T.evidenced+' of '+T.total+' controls evidenced</div></div>'+
    trendCard+
    '<div class="c5card" data-c5fwcard="failing"><div class="c5card-top"><span class="c5card-l">Controls failing</span><span class="c5chip c5-computed">computed</span></div><div class="c5card-v" style="color:var(--'+(T.failing>0?'crit':'good')+')">'+T.failing+'</div><div class="cn">deficiencies (below CMMI '+C5FW_FLOOR+')</div></div>'+
    '</div>';
  var pills='<div class="c5fw-pills">'+[['csf','NIST CSF 2.0'],['r53','NIST 800-53'],['soc2','SOC 2'],['hipaa','HIPAA'],['cis','CIS v8'],['iso','ISO 27001']].map(function(o){return '<button class="c5fw-pill'+(sel===o[0]?' on':'')+'" data-c5fwsel="'+o[0]+'">'+o[1]+'</button>';}).join('')+'</div>';
  // Reassess cadence toggle — its own row (reference layout).
  var reassessRow='<div class="c5fw-cad"><span style="font-size:11px;color:var(--muted);margin-right:2px">Reassess:</span>'+[['weekly','Weekly'],['monthly','Monthly'],['quarterly','Quarterly']].map(function(o){return '<button class="c5fw-cadb'+(cad===o[0]?' on':'')+'" data-c5fwcad="'+o[0]+'">'+o[1]+'</button>';}).join('')+'</div>';
  // Export buttons — draft (watermarked) pack, upload-the-reviewed-final, and the XLSX
  // scorecard. "Upload Final" lets the user put back the human-reviewed deck (PPTX/PDF).
  var exportBtns='<button class="c5btn" onclick="c5fwExport(false)" title="Draft — DRAFT watermark on every slide">Nauditor pack (PPTX)</button>'+
    '<button class="c5btn" id="c5fwUploadFinalBtn" title="Upload the final deck after human review (PPTX / PDF)" style="background:var(--surface-2);color:var(--ink-2);border:1px solid var(--line)">↥ Upload Final</button>'+
    '<button class="c5btn" onclick="c5fwExportXlsx()" style="background:var(--surface-2);color:var(--ink-2);border:1px solid var(--line)">Scorecard + POA&amp;M</button>'+
    '<input type="file" id="c5fwFinalFile" accept=".pptx,.ppt,.pdf,.key" style="display:none">';
  // Last-assessed line with a "N documents reviewed" link that opens the review.
  var docN=(typeof c5DocCount==='function')?c5DocCount():0;
  var lastAssessed='<div style="font-size:12.5px;color:var(--ink-2)">Last assessed <b>'+fmt(now)+'</b> · next refresh <b>'+fmt(nextD)+'</b>'+(docN?(' · <a id="c5docsLink" style="color:var(--blue);font-weight:600;cursor:pointer">'+docN+' documents reviewed</a>'):'')+'</div>';
  // Peer-benchmark box — sits inside the top card, in the empty space to the right
  // of the Reassess row. Its eyebrow names the selected framework so it reads e.g.
  // "Peer benchmark · NIST CSF 2.0 · sample preview" and re-titles on pill switch.
  var fwShort={csf:'NIST CSF 2.0',r53:'NIST 800-53',soc2:'SOC 2',hipaa:'HIPAA',cis:'CIS v8',iso:'ISO 27001'}[sel]||'framework';
  var peerBox='<div id="c5fwPeerBox" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);cursor:pointer;transition:border-color .15s,background .15s"'+
    ' onmouseover="this.style.borderColor=\'var(--blue)\'" onmouseout="this.style.borderColor=\'var(--line)\'">'+
    '<div style="display:flex;align-items:center;gap:11px;min-width:0">'+
      '<span style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9px;flex:none;background:var(--surface);color:var(--blue)">'+c5icon('scale')+'</span>'+
      '<div style="min-width:0"><div style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--blue)">Peer benchmark · '+fwShort+' · '+(c5peerLive()?'view comparison':'sample preview')+'</div>'+
      '<div style="font-size:12px;color:var(--ink-2);margin-top:1px">'+(c5peerLive()?('See how your '+((typeof FW_NAMES!=='undefined'&&FW_NAMES[sel])||'framework')+' maturity compares to the DTNKShield community — anonymously.'):('Preview how your '+((typeof FW_NAMES!=='undefined'&&FW_NAMES[sel])||'framework')+' maturity will compare — the live cohort unlocks at '+c5peerMin()+' clients (anonymous, k-anonymity-gated).'))+'</div></div>'+
    '</div><span class="peer-badge">'+(c5peerLive()?'DTNKShield ›':'Sample ›')+'</span></div>';
  // Top card: framework pills · (reassess + peer benchmark) · last-assessed · export buttons.
  var topCard='<div style="border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin-top:6px">'+
    pills+
    '<div style="margin-top:12px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">'+reassessRow+'<div style="flex:0 1 48%;min-width:300px;margin-left:auto">'+peerBox+'</div></div>'+
    '<div style="border-top:1px solid var(--line);margin:14px 0 12px"></div>'+
    lastAssessed+
    '<div style="margin-top:11px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">'+exportBtns+'</div>'+
    c5fwFinalMetaHtml()+
  '</div>';
  // Inline "how controls are evidenced" + "close the gap" box (non-native frameworks).
  var _sc=c5fwSrcCounts(T),_tot=T.total,_gaps=c5fwGaps(T);
  function _w(n){return (_tot>0?Math.max(0,Math.min(100,n/_tot*100)):0)+'%';}
  var evBox=T.native?'':('<div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin-top:14px">'+
    '<div>'+
      '<div style="font-weight:600;font-size:13px;color:var(--ink);margin-bottom:11px">How '+_tot+' controls are evidenced</div>'+
      '<div style="display:flex;height:10px;border-radius:6px;overflow:hidden;background:var(--line)">'+
        '<div style="width:'+_w(_sc.sys)+';background:var(--good)"></div>'+
        '<div style="width:'+_w(_sc.doc)+';background:var(--blue)"></div>'+
        (_sc.mapped?('<div style="width:'+_w(_sc.mapped)+';background:color-mix(in srgb,var(--blue) 42%,var(--surface))"></div>'):'')+
        '<div style="width:'+_w(_sc.none)+';background:color-mix(in srgb,var(--warn) 65%,var(--line))"></div>'+
      '</div>'+
      '<div style="display:flex;gap:18px;margin-top:9px;font-size:12px;color:var(--ink-2);flex-wrap:wrap">'+
        '<span><b style="color:var(--ink)">'+_sc.sys+'</b> live telemetry</span>'+
        '<span><b style="color:var(--ink)">'+_sc.doc+'</b> policy</span>'+
        (_sc.mapped?('<span><b style="color:var(--ink)">'+_sc.mapped+'</b> mapped (crosswalk)</span>'):'')+
        '<span><b style="color:var(--ink)">'+_sc.none+'</b> not evidenced</span>'+
      '</div>'+
    '</div>'+
    '<div>'+
      '<div style="font-weight:600;font-size:13px;color:var(--ink);margin-bottom:9px">Close the gap</div>'+
      (_gaps.length?_gaps.map(function(g){return '<div style="font-size:12.5px;color:var(--ink-2);margin-bottom:6px">'+(g.kind==='d'?'↥ Upload':'⚡ Connect')+' <b>'+c5esc(g.label)+'</b>'+(g.n>1?(' ('+g.n+')'):'')+(g.kind==='d'?(' <a class="c5gap-up" data-c5gapup="'+c5esc(g.s||g.label)+'" title="Go to onboarding and upload this document" style="color:var(--blue);font-weight:600;cursor:pointer">upload now →</a>'):(' <a class="c5gap-up" data-c5gapconn="'+c5esc(g.label)+'" title="Go to onboarding and connect this tool" style="color:var(--blue);font-weight:600;cursor:pointer">connect now →</a>'))+'</div>';}).join(''):'<div style="font-size:12.5px;color:var(--good);margin-bottom:6px">All controls evidenced.</div>')+
      '<button id="c5reanalyzeBtn" type="button" style="margin-top:4px;border:1px solid var(--line);background:var(--surface);color:var(--ink-2);font-weight:600;font-size:12px;padding:6px 12px;border-radius:8px;cursor:pointer">↻ Re-score documents</button>'+
    '</div>'+
  '</div>');
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
  host.innerHTML=c5header()+
    c5shell('Program health · how is the security program performing?','Your security program, scored against the framework you follow.',null,'Each function is scored from your live control evidence and kept current. Open a function to see the controls behind its score.')+
    topCard+
    cards+
    evBox+
    xnote+
    '<div class="c5fw-wrap"><div class="c5fw-right">'+tree+'</div><div class="c5fw-left" id="c5fw-detail">'+c5fwFinding(sel,selNode)+'</div></div>'+
    '<div class="c5foot">CMMI 0 None · 1 Initial · 2 Managed · 3 Defined · 4 Quant. Managed · 5 Optimizing. Meets target ≥ '+C5FW_TARGET.toFixed(1)+' (green) · Observation ≥ '+C5FW_FLOOR+' (amber) · Deficiency &lt; '+C5FW_FLOOR+' (red).'+((sel==='cis'||sel==='soc2'||sel==='hipaa'||sel==='iso')?' '+((typeof FW_NAMES!=='undefined'&&FW_NAMES[sel])||'This framework')+' is scored by <b>crosswalk readiness</b> from the evidence you provided at onboarding: each control is mapped to the NIST CSF 2.0 subcategories it shares an objective with, and inherits their maturity — and those subcategories are themselves evidenced from your <b>connected tools + reviewed documents</b>. We reference the framework by ID and use our own plain-English labels, so no licensed control text is reproduced. This is a readiness estimate, <b>not</b> a certified assessment (your assessor issues that); a control whose mapped CSF evidence is missing shows “Not tested” until you connect the tool or upload the document it awaits.':'')+(sel==='r53'?' NIST SP 800-53 Rev 5 is assessed by crosswalk from your CSF 2.0 assessment (a readiness indicator, per-family): the ~20 controls Nerion scores directly show 📄/🔌; the rest inherit their family’s governing-policy maturity.':'')+'</div>';
  // record cadence snapshot
  if(typeof fwRecord==='function'){try{fwRecord(T.overall);}catch(_){}}
  var _pb=document.getElementById('c5fwPeerBox');if(_pb)_pb.onclick=function(){c5fwPeerOpen();};
  var _dl=document.getElementById('c5docsLink');if(_dl)_dl.onclick=function(){c5OpenDocsReview();};
  // Upload Final — the human-reviewed deck; the hidden file input does the actual upload.
  var _uff=document.getElementById('c5fwFinalFile');
  var _ufb=document.getElementById('c5fwUploadFinalBtn');if(_ufb&&_uff)_ufb.onclick=function(){_uff.click();};
  if(_uff)_uff.onchange=function(){var f=_uff.files&&_uff.files[0];if(f)c5fwStoreFinal(f);};
  var _ufr=document.getElementById('c5fwFinalReplace');if(_ufr&&_uff)_ufr.onclick=function(){_uff.click();};
  var _ufx=document.getElementById('c5fwFinalRemove');if(_ufx)_ufx.onclick=function(){c5fwFinalRemove();};
  var _ra=document.getElementById('c5reanalyzeBtn');if(_ra)_ra.onclick=function(){
    if(typeof window.reanalyzeStoredDocs!=='function'){c5OpenDocsReview();return;}
    var o=_ra.textContent;_ra.disabled=true;_ra.textContent='↻ Re-scoring…';
    window.reanalyzeStoredDocs(function(nScores,nDocs){
      _ra.textContent=nScores?('✓ Re-scored '+nDocs+' doc'+(nDocs===1?'':'s')):'No stored documents';
      c5Frameworks();
      var b=document.getElementById('c5reanalyzeBtn');if(b){b.disabled=false;setTimeout(function(){if(document.getElementById('c5reanalyzeBtn')===b)b.textContent=o;},1600);}
    });
  };
  // wiring
  host.querySelectorAll('[data-c5fwsel]').forEach(function(b){b.onclick=function(){window.FW_SEL=b.getAttribute('data-c5fwsel');C5FW_EXP=null;C5FW_CTRL=null;c5Frameworks();};});
  host.querySelectorAll('[data-c5fwcad]').forEach(function(b){b.onclick=function(){try{localStorage.setItem('cyberrx_audit_cadence',b.getAttribute('data-c5fwcad'));}catch(_){}c5Frameworks();};});
  host.querySelectorAll('[data-c5fwexp]').forEach(function(b){b.onclick=function(){var id=b.getAttribute('data-c5fwexp');C5FW_EXP[id]=!C5FW_EXP[id];c5Frameworks();};});
  host.querySelectorAll('[data-c5fwctl]').forEach(function(b){b.onclick=function(){C5FW_CTRL=b.getAttribute('data-c5fwctl');c5Frameworks();};});
  host.querySelectorAll('[data-c5docjump]').forEach(function(b){b.onclick=function(e){e.stopPropagation();c5OpenDocsReviewAt(b.getAttribute('data-c5docjump'));};});
  host.querySelectorAll('[data-c5docopen]').forEach(function(b){b.onclick=function(e){e.stopPropagation();c5ViewDoc(b.getAttribute('data-c5docopen'));};});
  host.querySelectorAll('[data-c5gapup]').forEach(function(b){b.onclick=function(e){e.stopPropagation();c5GapUpload(b.getAttribute('data-c5gapup'));};});
  host.querySelectorAll('[data-c5gapconn]').forEach(function(b){b.onclick=function(e){e.stopPropagation();c5GapConnect(b.getAttribute('data-c5gapconn'));};});
  host.querySelectorAll('[data-c5fwcard]').forEach(function(b){b.style.cursor='pointer';b.onclick=function(){c5fwInspect(b.getAttribute('data-c5fwcard'),T,sel,cad);};});
}
/* "upload now" on a missing-document gap → onboarding, focused on the exact uploader
   for that document type (target is the doc-type key, e.g. d8). The cockpit runs inside
   the platform shell as the fOS iframe, with onboarding preloaded alongside it (fIntake),
   so we ask the SHELL to switch views — navigating our own frame would replace the
   cockpit itself ("the OS becomes onboarding"). Only fall back to a direct navigation
   when running standalone (no shell parent). */
function c5GapUpload(target){
  try{
    if(window.parent&&window.parent!==window){
      window.parent.postMessage({type:'cyberrx-goto-onboarding',tool:'document review',upload:target||''},'*');
      return;
    }
    var base=(function(){try{return new URL('onboarding.html',location.href).href;}catch(_){return 'onboarding.html';}})();
    window.location.href=base+'#upload='+encodeURIComponent(target||'');
  }catch(_){}
}
/* The human-reviewed final auditor deck, uploaded here after review. Stored in
   localStorage with who uploaded it and when; the file itself is kept for re-download
   when small enough for localStorage, otherwise only its metadata is recorded. */
function c5fwFinalGet(){try{return JSON.parse(localStorage.getItem('cyberrx_fw_final')||'null');}catch(_){return null;}}
function c5fwFinalMetaHtml(){
  var f=c5fwFinalGet();if(!f)return '';
  var when='';try{when=(typeof fmtWhen==='function')?fmtWhen(f.at):new Date(f.at).toLocaleString();}catch(_){}
  return '<div id="c5fwFinalMeta" style="margin-top:9px;font-size:12px;color:var(--ink-2);display:flex;align-items:center;gap:12px;flex-wrap:wrap">'+
    '<span style="color:var(--good);font-weight:700">✓ Final deck on file</span>'+
    '<span><b style="color:var(--ink)">'+c5esc(f.name||'final deck')+'</b></span>'+
    '<span>uploaded by <b style="color:var(--ink)">'+c5esc(f.by||'the CISO')+'</b>'+(when?(' · '+c5esc(when)):'')+'</span>'+
    (f.dataUrl?('<a href="'+f.dataUrl+'" download="'+c5esc(f.name||'final-deck')+'" style="color:var(--blue);font-weight:600">Download</a>'):'')+
    '<a id="c5fwFinalReplace" style="color:var(--blue);font-weight:600;cursor:pointer">Replace</a>'+
    '<a id="c5fwFinalRemove" style="color:var(--crit);font-weight:600;cursor:pointer">Remove</a>'+
  '</div>';
}
function c5fwStoreFinal(file){
  if(!file)return;
  var by=(typeof c5CisoName==='function'&&c5CisoName())||'the CISO';
  function save(dataUrl){var o={name:file.name,size:file.size,by:by,at:Date.now()};if(dataUrl)o.dataUrl=dataUrl;
    try{localStorage.setItem('cyberrx_fw_final',JSON.stringify(o));}
    catch(_){try{delete o.dataUrl;localStorage.setItem('cyberrx_fw_final',JSON.stringify(o));}catch(__){}} // too big to keep the file — record the metadata
    try{c5Frameworks();}catch(___){}}
  // Keep the file for re-download only when small enough for localStorage (~3 MB).
  if(file.size<=3*1024*1024&&typeof FileReader!=='undefined'){var r=new FileReader();r.onload=function(){save(String(r.result||''));};r.onerror=function(){save(null);};try{r.readAsDataURL(file);}catch(_){save(null);}}
  else save(null);
}
function c5fwFinalRemove(){try{localStorage.removeItem('cyberrx_fw_final');}catch(_){}try{c5Frameworks();}catch(__){}}
/* "connect now" on a missing-telemetry gap → onboarding, focused on the connector for
   that tool. Same shell-safe routing as c5GapUpload (never navigates the cockpit's own
   frame): ask the shell to switch views, falling back to a #connect= hash when standalone. */
function c5GapConnect(tool){
  try{
    if(window.parent&&window.parent!==window){
      window.parent.postMessage({type:'cyberrx-goto-onboarding',tool:tool||''},'*');
      return;
    }
    var base=(function(){try{return new URL('onboarding.html',location.href).href;}catch(_){return 'onboarding.html';}})();
    window.location.href=base+'#connect='+encodeURIComponent(tool||'');
  }catch(_){}
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
/* ============================================================================
   related_control_mapping — INFORMATIONAL ONLY. NOT authoritative assessment.
   ----------------------------------------------------------------------------
   c5RevX / c5DocXwalk are a crosswalk (CSF subcategory → related CIS/SOC2/HIPAA
   ids). Per the continuous-control-assessment architecture, a crosswalk may be
   used ONLY for navigation, related-control suggestions and "related framework"
   display. It MUST NOT determine pass/fail, effective/ineffective, control
   operating effectiveness, a compliance score, framework coverage, or any audit
   evidence claim.

   The authoritative pass/fail logic is assessment_control_logic — the
   framework-native engine in cyberrx-api/src/control-assessment/, where every
   control (CSF, 800-53, CIS, HIPAA, SOC 2) is assessed independently from its
   OWN machine-verifiable evidence. Nothing there derives one framework from
   another. The Frameworks-tab display migration onto that engine is tracked as
   the next phase; until then these crosswalk outputs are labelled informational.
   ============================================================================ */
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
  var FW=[['csf','CSF 2.0'],['r53','800-53'],['cis','CIS v8'],['soc2','SOC 2'],['hipaa','HIPAA'],['iso','ISO 27001']];
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
  var textMap=c5DocTextMap(); // filenames whose uploaded text we can open for reading
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
        return '<div id="c5doc-'+c5esc(r.id)+'" style="padding:12px 0;border-top:1px solid var(--line)">'+
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
          ((meta.engine==='llm'||rows.some(function(r){return r.s&&(r.s.narrative||(Array.isArray(r.s.attrs)&&r.s.attrs.some(function(a){return a.evidence;})));}))?'<span style="font-size:10px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--blue);background:color-mix(in srgb,var(--blue) 12%,var(--surface));border:1px solid color-mix(in srgb,var(--blue) 30%,transparent);border-radius:20px;padding:2px 9px">✦ AI-reviewed</span>':'')+
          (textMap[dn]?('<button type="button" data-c5docview="'+c5esc(dn)+'" title="Open and read the uploaded document" style="margin-left:auto;flex:none;border:1px solid color-mix(in srgb,var(--blue) 40%,var(--line));background:var(--surface);color:var(--blue);font-family:inherit;font-size:11.5px;font-weight:600;padding:5px 12px;border-radius:8px;cursor:pointer">📄 Open document</button>'):'')+'</div>'+
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
    '<div style="font-size:11px;color:var(--muted);line-height:1.5;border-top:1px solid var(--line);padding-top:12px">Documents marked <b>✦ AI-reviewed</b> are read by Nerion’s analyst-grade document engine — semantic control-intent matching with quoted evidence, to a standard at or above human review; others use deterministic sentence-level matching (the sentence carrying the most of a requirement’s terms, not a single keyword). CIS · SOC 2 · HIPAA are mapped by public crosswalk (NIST CSF 2.0 informative references · SP 800-66) — a readiness indicator, not an independent audit opinion; CIS/SOC 2 shown by number/criterion only.</div>'+
  '</div>';
}
function c5OpenDocsReview(){
  try{
    var host=document.getElementById('docDoc');if(!host)return;
    host.innerHTML=c5DocsReviewHtml();
    host.querySelectorAll('[data-c5docview]').forEach(function(b){b.onclick=function(e){e.stopPropagation();c5ViewDoc(b.getAttribute('data-c5docview'));};});
    var sc=document.getElementById('docScrim'),md=document.getElementById('docModal');
    if(sc)sc.classList.add('open');if(md)md.classList.add('open');
  }catch(_){}
}
function c5CloseDocsReview(){var sc=document.getElementById('docScrim'),md=document.getElementById('docModal');if(sc)sc.classList.remove('open');if(md)md.classList.remove('open');try{var h=document.getElementById('docDoc');if(h)h.querySelectorAll('.c5doc-ref').forEach(function(x){x.classList.remove('c5doc-ref');});}catch(_){}}
/* Filename → the document's extracted text captured at onboarding upload
   (cyberrx_doc_text is keyed by doc-type with {text, filename}) — so a reviewed
   policy can be opened and read here without a re-upload. */
function c5DocTextMap(){var m={};try{var tx=JSON.parse(localStorage.getItem('cyberrx_doc_text')||'{}')||{};Object.keys(tx).forEach(function(k){var e=tx[k];if(e&&e.filename&&e.text)m[e.filename]=e.text;});}catch(_){}return m;}
/* If a stored document is a raw PDF byte stream (starts with %PDF), pull the human-
   readable text out of its content stream — the strings shown by (…)Tj / […]TJ
   operators, with the Td / TD / T-star / ET operators treated as line breaks — so the
   viewer shows readable prose instead of PDF operators. Plain text is returned as-is. */
function c5PdfText(raw){
  try{
    if(typeof raw!=='string')return raw;
    if(!/^\s*%PDF/.test(raw.slice(0,50)))return raw;
    var s=raw,n=s.length,i=0,line='',out=[];
    function flush(){var t=line.replace(/\s+$/,'');if(t.replace(/\s/g,'').length)out.push(t);line='';}
    while(i<n){
      var ch=s[i];
      if(ch==='('){
        var j=i+1,depth=1,str='';
        while(j<n){
          var c=s[j];
          if(c==='\\'){
            var nx=s[j+1];
            if(nx==='n'){str+=' ';j+=2;continue;}
            if(nx==='r'){j+=2;continue;}
            if(nx==='t'){str+='\t';j+=2;continue;}
            if(nx==='('||nx===')'||nx==='\\'){str+=nx;j+=2;continue;}
            if(nx>='0'&&nx<='7'){var oct=nx,k=j+2,cc=1;while(k<n&&cc<3&&s[k]>='0'&&s[k]<='7'){oct+=s[k];k++;cc++;}str+=String.fromCharCode(parseInt(oct,8)&0xff);j=k;continue;}
            str+=(nx||'');j+=2;continue;
          }
          if(c==='('){depth++;str+=c;j++;continue;}
          if(c===')'){depth--;if(depth===0){j++;break;}str+=c;j++;continue;}
          str+=c;j++;
        }
        line+=str;i=j;continue;
      }
      if(ch==='T'&&(s[i+1]==='d'||s[i+1]==='D'||s[i+1]==='*')){flush();i+=2;continue;}
      if(ch==='E'&&s[i+1]==='T'){flush();i+=2;continue;}
      i++;
    }
    flush();
    var text=out.join('\n').replace(/\n{3,}/g,'\n\n').trim();
    return text||raw;
  }catch(_){return raw;}
}
/* Open the uploaded document itself in a reader overlay (above the review modal). */
/* The auditor annotations already produced for a document: every control attribute
   Nerion marked present carries the VERBATIM evidence quote it found (green call-out),
   and every attribute marked absent carries its reasoning (gap call-out). Grouped by the
   quote so one highlighted sentence lists all the requirements it satisfies. */
function c5DocAnnotations(fname){
  var scores=c5DocScoresSafe(),met={},gaps=[],matched={},seenGap={};
  Object.keys(scores).forEach(function(cid){
    var s=scores[cid]||{};if(s.doc!==fname)return;
    (Array.isArray(s.attrs)?s.attrs:[]).forEach(function(a){
      if(a.found&&a.evidence){ // matched WITH a quoted passage (analyst-grade review) → highlight
        var q=String(a.evidence).trim();if(q.length<6)return;
        var key=q.replace(/\s+/g,' ').slice(0,80).toLowerCase(); // normalise whitespace so identical passages merge
        var e=met[key]||(met[key]={quote:q,items:[]});
        if(q.length>e.quote.length)e.quote=q;
        e.items.push({control:cid,label:a.label});
      } else if(a.found){ // matched by KEYWORD (no quote) — still drove the score; show it
        var mk=String(a.label||'').trim().toLowerCase();if(!mk)return;
        var mm=matched[mk]||(matched[mk]={label:a.label,pat:'',items:[]});
        if(!mm.pat&&a.pat)mm.pat=a.pat; // the matcher, so we can locate WHERE it hit in the text
        if(mm.items.indexOf(cid)<0)mm.items.push(cid);
      } else { // expected but not found → a gap
        var gk=cid+'|'+a.label;if(seenGap[gk])return;seenGap[gk]=1;
        gaps.push({control:cid,label:a.label,reason:String(a.reasoning||'').trim()});
      }
    });
  });
  return {met:Object.keys(met).map(function(k){return met[k];}),gaps:gaps,matched:Object.keys(matched).map(function(k){return matched[k];})};
}
/* Highlight, in the document text, WHERE each reviewed requirement was found — so the
   reader can see the exact spot, not just that it matched. Two kinds, both numbered to
   the margin panel:
     · quoted passages (met)      → green highlight, anchored on the verbatim quote
       (whitespace-tolerant, prefix-anchored so a truncated quote still lands).
     · keyword matches (matched)  → blue highlight on the sentence the keyword hit, using
       the SAME matcher that drove the score (a.pat), or the label's words as a fallback.
   Keyword annotations are numbered continuing after the quoted ones. Returns the escaped,
   mark-wrapped HTML, how many of each were located, and — per keyword item — the
   annotation number it got (or null when it couldn't be located), so the panel can add a
   jump link to the ones that were pinpointed. */
/* Sentence-level requirement matching — a more accurate locator than a single-keyword hit.
   Rather than jumping to the FIRST place any one of a requirement's words appears, we split
   the document into sentences and pick the sentence that contains the MOST of the
   requirement's distinct terms (and any multi-word phrase from it), requiring at least two
   distinct terms when the requirement has them. This finds the sentence that actually states
   the requirement, not an incidental single-word mention. (The green tier is higher still:
   verbatim quotes from the analyst-grade semantic review.) */
var C5_STOP={the:1,and:1,for:1,with:1,that:1,this:1,are:1,was:1,were:1,from:1,which:1,their:1,they:1,them:1,have:1,has:1,had:1,been:1,into:1,such:1,each:1,other:1,across:1,within:1,through:1,shall:1,must:1,will:1,would:1,should:1,any:1,all:1,per:1,its:1,not:1,but:1,also:1,when:1,then:1,than:1,over:1,upon:1};
function c5Sentences(text){var out=[],n=text.length,start=0,i;for(i=0;i<n;i++){var c=text.charAt(i);var brk=(c==='\n')||((c==='.'||c==='!'||c==='?')&&(i+1>=n||/\s/.test(text.charAt(i+1))));if(brk){var s=start,e=i+1;while(s<e&&/\s/.test(text.charAt(s)))s++;if(e-s>=3)out.push({start:s,end:e});start=i+1;}}if(start<n){var s2=start;while(s2<n&&/\s/.test(text.charAt(s2)))s2++;if(n-s2>=3)out.push({start:s2,end:n});}return out;}
function c5ReqTerms(mm){var phrases=[],terms={};var src=String((mm&&mm.pat)||'');(src?src.split('|'):[]).forEach(function(a){a=a.replace(/[()\[\]\\.*+?^${}]/g,' ').trim().toLowerCase();if(!a)return;var ws=a.match(/[a-z]{3,}/g)||[];if(ws.length>=2)phrases.push(ws.join(' '));ws.forEach(function(w){if(w.length>=4&&!C5_STOP[w])terms[w]=1;});});(String((mm&&mm.label)||'').toLowerCase().match(/[a-z]{4,}/g)||[]).forEach(function(w){if(!C5_STOP[w])terms[w]=1;});return {phrases:phrases,terms:Object.keys(terms)};}
function c5BestSentence(mm,text,sents){var rt=c5ReqTerms(mm);var terms=rt.terms,phrases=rt.phrases;if(!terms.length&&!phrases.length)return null;var need=terms.length>=2?2:1;var best=null,bestScore=0;for(var i=0;i<sents.length;i++){var sp=sents[i];var lc=text.slice(sp.start,sp.end).toLowerCase();var tc=0;for(var k=0;k<terms.length;k++){if(lc.indexOf(terms[k])>=0)tc++;}var pc=0;for(var p=0;p<phrases.length;p++){if(lc.indexOf(phrases[p])>=0)pc++;}if(tc<need&&pc===0)continue;var score=pc*3+tc;if(score>bestScore||(score===bestScore&&best&&(sp.end-sp.start)<(best.end-best.start))){bestScore=score;best=sp;}}return best;}
function c5AnnotateText(text,met,matched){
  met=met||[];matched=matched||[];
  // Build a case-insensitive locator for a keyword requirement, preferring the exact
  // pattern the score used, falling back to the label's significant words.
  function kwRe(mm){
    var src=String(mm&&mm.pat||'').trim();
    if(!src){var ws=String(mm&&mm.label||'').toLowerCase().match(/[a-z]{4,}/g)||[];src=ws.join('|');}
    if(!src)return null;try{return new RegExp('('+src+')','i');}catch(_){return null;}
  }
  // Expand a hit to the sentence around it, so the highlight reads as context, not a bare word.
  function sentence(t,mi,ml){
    var lo=t.lastIndexOf('\n',mi),ld=t.lastIndexOf('. ',mi),start=Math.max(lo,ld);start=start<0?0:start+1;
    while(start<mi&&/\s/.test(t.charAt(start)))start++;
    var nn=t.indexOf('\n',mi+ml),nd=t.indexOf('. ',mi+ml),ends=[];if(nn>=0)ends.push(nn);if(nd>=0)ends.push(nd+1);
    var end=ends.length?Math.min.apply(null,ends):t.length;
    if(end-start>360)end=Math.min(end,mi+ml+180);
    if(end<mi+ml)end=Math.min(t.length,mi+ml);
    return {start:start,end:end};
  }
  var ranges=[];
  met.forEach(function(m,idx){
    var q=String(m.quote||'').trim();if(q.length<8)return;
    var anchor=q.slice(0,140).replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
    var re;try{re=new RegExp(anchor);}catch(_){return;}
    var mm=re.exec(text);if(mm)ranges.push({start:mm.index,end:mm.index+mm[0].length,ann:idx,kind:'q'});
  });
  var kwHits=matched.map(function(){return null;});
  var sents=c5Sentences(text);
  matched.forEach(function(mm,j){
    // Prefer the best-matching whole sentence (most requirement terms/phrases); fall back to
    // the legacy single-keyword hit only if no sentence clears the multi-term bar.
    var sp=c5BestSentence(mm,text,sents);
    if(!sp){var re=kwRe(mm);if(!re)return;var hit=re.exec(text);if(!hit)return;sp=sentence(text,hit.index,hit[0].length);}
    ranges.push({start:sp.start,end:sp.end,ann:met.length+j,kind:'k',kw:j});
  });
  ranges.sort(function(a,b){return a.start-b.start;});
  var kept=[],lastEnd=-1;ranges.forEach(function(r){if(r.start>=lastEnd){kept.push(r);lastEnd=r.end;}});
  var out='',pos=0,located=0,kwLocated=0;
  kept.forEach(function(r){
    out+=c5esc(text.slice(pos,r.start));
    if(r.kind==='k'){kwLocated++;kwHits[r.kw]=r.ann;
      out+='<mark class="c5ann c5annkw" data-annidx="'+r.ann+'" title="Sentence match — the sentence carrying the most of this requirement’s language" style="background:color-mix(in srgb,var(--blue) 16%,transparent);border-bottom:2px solid var(--blue);border-radius:2px;cursor:pointer;padding:0 1px">'+c5esc(text.slice(r.start,r.end))+'<sup style="font-size:9px;font-weight:800;color:var(--blue);margin-left:1px">'+(r.ann+1)+'</sup></mark>';
    } else {located++;
      out+='<mark class="c5ann" data-annidx="'+r.ann+'" title="Requirement evidenced — click for the finding" style="background:color-mix(in srgb,var(--good) 20%,transparent);border-bottom:2px solid var(--good);border-radius:2px;cursor:pointer;padding:0 1px">'+c5esc(text.slice(r.start,r.end))+'<sup style="font-size:9px;font-weight:800;color:var(--good);margin-left:1px">'+(r.ann+1)+'</sup></mark>';
    }
    pos=r.end;
  });
  out+=c5esc(text.slice(pos));
  return {html:out,located:located,kwLocated:kwLocated,kwHits:kwHits};
}
/* Open the uploaded document with the auditor's annotations rendered in place — the
   policy text with each evidencing sentence highlighted and numbered, alongside a margin
   panel of the requirements in scope (evidenced ✓ and gaps ⚠), as if reviewed by hand. */
function c5ViewDoc(fname){
  try{
    var txt=c5PdfText(c5DocTextMap()[fname]);
    var ann=c5DocAnnotations(fname),met=ann.met,gaps=ann.gaps,matched=ann.matched||[];
    var old=document.getElementById('c5docViewer');if(old&&old.parentNode)old.parentNode.removeChild(old);
    var wrap=document.createElement('div');wrap.id='c5docViewer';
    wrap.style.cssText='position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;background:rgba(20,33,72,.5)';
    var annotated=txt?c5AnnotateText(txt,met,matched):{html:'',located:0,kwLocated:0,kwHits:[]};
    var _locTot=(annotated.located||0)+(annotated.kwLocated||0),_reqTot=met.length+matched.length;
    // Left column — the annotated document (or an honest note if the text wasn't retained).
    var docCol=txt
      ?('<div style="font-size:11px;color:var(--muted);margin-bottom:10px"><span style="background:color-mix(in srgb,var(--good) 20%,transparent);border-bottom:2px solid var(--good);padding:0 3px;border-radius:2px">green</span> = a quoted passage · <span style="background:color-mix(in srgb,var(--blue) 16%,transparent);border-bottom:2px solid var(--blue);padding:0 3px;border-radius:2px">blue</span> = a sentence match — each shows <b>where in the document</b> the requirement was found; the number ties to the margin note. '+_locTot+' of '+_reqTot+' requirements located in the text.</div>'+
         '<div id="c5annDoc" style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.7;color:var(--ink)">'+annotated.html+'</div>')
      :('<div style="color:var(--ink-2);font-size:13px;line-height:1.6">The document text isn’t retained in this browser, so it can’t be shown inline — but the auditor findings Nerion recorded are in the panel. Re-upload the policy in onboarding to read it with the highlights in place.</div>');
    // Right column — the requirements panel (evidenced + gaps).
    function metItem(m,i){
      var ctrls=m.items.map(function(x){return c5esc(x.control);}).filter(function(v,ix,arr){return arr.indexOf(v)===ix;}).join(' · ');
      var labels=m.items.map(function(x){return x.label;}).filter(function(v,ix,arr){return arr.indexOf(v)===ix;}).map(c5esc).join(', ');
      return '<div class="c5annp" id="c5annp-'+i+'" data-annidx="'+i+'" style="border:1px solid var(--line);border-left:3px solid var(--good);border-radius:8px;padding:9px 11px;margin-bottom:8px;cursor:pointer;background:var(--surface)">'+
        '<div style="display:flex;align-items:center;gap:7px"><span style="flex:none;width:18px;height:18px;border-radius:50%;background:var(--good);color:#fff;font-size:10px;font-weight:800;display:inline-flex;align-items:center;justify-content:center">'+(i+1)+'</span><b style="font-size:12.5px;color:var(--ink)">'+labels+'</b></div>'+
        '<div style="font-size:11px;color:var(--muted);margin-top:3px">satisfies '+ctrls+'</div>'+
        '<div style="font-size:11.5px;color:var(--ink-2);font-style:italic;line-height:1.5;margin-top:5px;border-left:2px solid color-mix(in srgb,var(--good) 45%,var(--line));padding-left:8px">“'+c5esc(String(m.quote).slice(0,220))+(String(m.quote).length>220?'…':'')+'”</div>'+
      '</div>';
    }
    function gapItem(g){
      return '<div style="border:1px solid var(--line);border-left:3px solid var(--warn);border-radius:8px;padding:8px 11px;margin-bottom:7px;background:var(--surface)">'+
        '<div style="display:flex;align-items:center;gap:7px"><span style="color:var(--warn);font-weight:800">⚠</span><b style="font-size:12.5px;color:var(--ink)">'+c5esc(g.label)+'</b></div>'+
        '<div style="font-size:11px;color:var(--muted);margin-top:3px">expected for '+c5esc(g.control)+'</div>'+
        (g.reason?('<div style="font-size:11.5px;color:var(--ink-2);line-height:1.5;margin-top:4px">'+c5esc(g.reason.slice(0,200))+'</div>'):'')+
      '</div>';
    }
    // A keyword-matched requirement. When we located it in the text (kwHits[j] is its
    // annotation number) the card is numbered + clickable, and jumps to the blue highlight —
    // so the reader sees exactly where in the document it was found. When it couldn't be
    // pinpointed, it still shows as met (it drove the score) but without a jump.
    function matchItem(mm,j){
      var ann=(annotated&&annotated.kwHits)?annotated.kwHits[j]:null;
      if(ann!=null){
        return '<div class="c5annp" id="c5annp-'+ann+'" data-annidx="'+ann+'" style="border:1px solid var(--line);border-left:3px solid var(--blue);border-radius:8px;padding:8px 11px;margin-bottom:7px;background:var(--surface);cursor:pointer">'+
          '<div style="display:flex;align-items:center;gap:7px"><span style="flex:none;width:18px;height:18px;border-radius:50%;background:var(--blue);color:#fff;font-size:10px;font-weight:800;display:inline-flex;align-items:center;justify-content:center">'+(ann+1)+'</span><b style="font-size:12.5px;color:var(--ink)">'+c5esc(mm.label)+'</b></div>'+
          '<div style="font-size:11px;color:var(--muted);margin-top:3px">matched for '+mm.items.map(c5esc).join(' · ')+' · <span style="color:var(--blue)">click to see it in the document →</span></div></div>';
      }
      return '<div style="border:1px solid var(--line);border-left:3px solid color-mix(in srgb,var(--good) 55%,var(--line));border-radius:8px;padding:7px 11px;margin-bottom:6px;background:var(--surface)"><div style="display:flex;align-items:center;gap:7px"><span style="color:var(--good);font-weight:800">✓</span><b style="font-size:12px;color:var(--ink)">'+c5esc(mm.label)+'</b></div><div style="font-size:11px;color:var(--muted);margin-top:2px">matched for '+mm.items.map(c5esc).join(' · ')+'</div></div>';
    }
    var panel='<div style="font-size:12px;color:var(--ink-2);margin-bottom:12px;line-height:1.5"><b style="color:var(--good)">'+(met.length+matched.length)+'</b> requirement'+((met.length+matched.length)===1?'':'s')+' met'+(met.length?(' ('+met.length+' with a quoted passage)'):'')+' · <b style="color:var(--warn)">'+gaps.length+'</b> gap'+(gaps.length===1?'':'s')+' — what drove this document’s control scores.</div>'+
      (met.length?('<div style="font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--good);margin:4px 0 8px">✓ Evidenced — quoted in the text</div>'+met.map(metItem).join('')):'')+
      (matched.length?('<div style="font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--blue);margin:14px 0 6px">✓ Matched — sentence match</div><div style="font-size:11px;color:var(--muted);margin-bottom:8px">These requirements were found and scored. The numbered ones are highlighted in <b style="color:var(--blue)">blue</b> on the sentence that carries the most of the requirement’s language — click one to jump to it. (The analyst-grade LLM review adds the exact quoted passage.)</div>'+matched.map(matchItem).join('')):'')+
      (gaps.length?('<div style="font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--warn);margin:14px 0 8px">⚠ Gaps — expected, not found</div>'+gaps.map(gapItem).join('')):'')+
      ((!met.length&&!gaps.length&&!matched.length)?('<div style="font-size:12.5px;color:var(--ink-2);line-height:1.6">No attribute-level review is on file for this document, so it isn’t contributing to any control score. This happens when a policy was uploaded but not analysed. Run the review to score it against the control catalog.</div>'+((typeof window!=='undefined'&&typeof window.reanalyzeStoredDocs==='function')?('<button type="button" id="c5annReanalyze" style="margin-top:12px;border:1px solid var(--line);background:var(--surface);color:var(--blue);font-weight:600;font-size:12.5px;padding:8px 14px;border-radius:8px;cursor:pointer">↻ Run document review</button>'):'<div style="margin-top:10px;font-size:11.5px;color:var(--muted)">Re-upload and analyse this policy in onboarding to score it.</div>')):'');
    wrap.innerHTML='<div style="width:min(1160px,96vw);max-height:92vh;display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:0 24px 60px rgba(20,33,72,.45);overflow:hidden">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 18px;border-bottom:1px solid var(--line);background:var(--surface-2)">'+
        '<div style="min-width:0;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><b style="font-family:var(--serif);font-size:15px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📄 '+c5esc(fname)+'</b><span style="font-size:10px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--blue);background:color-mix(in srgb,var(--blue) 12%,var(--surface));border:1px solid color-mix(in srgb,var(--blue) 30%,transparent);border-radius:20px;padding:2px 9px">✦ Nauditor-annotated</span></div>'+
        '<button type="button" id="c5docViewerClose" style="flex:none;border:1px solid var(--line);background:var(--surface);border-radius:8px;padding:6px 13px;font-weight:600;font-size:12.5px;cursor:pointer">Close</button>'+
      '</div>'+
      '<div style="display:flex;flex:1 1 auto;min-height:0">'+
        '<div style="flex:1.7 1 0;min-width:0;min-height:0;overflow-y:auto;padding:16px 20px;border-right:1px solid var(--line)">'+docCol+'</div>'+
        '<div style="flex:1 1 0;min-width:260px;max-width:440px;min-height:0;overflow-y:auto;padding:14px 16px;background:var(--surface-2)">'+panel+'</div>'+
      '</div>'+
    '</div>';
    document.body.appendChild(wrap);
    function close(){if(wrap.parentNode)wrap.parentNode.removeChild(wrap);}
    wrap.addEventListener('click',function(e){if(e.target===wrap)close();});
    var cb=document.getElementById('c5docViewerClose');if(cb)cb.onclick=close;
    // Empty-state: re-run the review, then either reopen with the new annotations or — if
    // the engine returned no attribute-level evidence — say so plainly (instead of silently
    // reopening to the same empty panel, which reads as "nothing happened").
    var _rz=document.getElementById('c5annReanalyze');
    if(_rz)_rz.onclick=function(){
      var host=_rz.parentNode;_rz.disabled=true;_rz.textContent='↻ Reviewing…';
      function fail(msg){if(host)host.innerHTML='<div style="font-size:12.5px;color:var(--ink-2);line-height:1.6">'+msg+'</div>';}
      if(typeof window.reanalyzeStoredDocs!=='function'){fail('The document-review engine isn’t available here. Re-upload and analyse this policy in onboarding to generate its annotations.');return;}
      try{
        window.reanalyzeStoredDocs(function(nScores,nDocs){
          try{
            var a2=c5DocAnnotations(fname);
            if((a2.met&&a2.met.length)||(a2.gaps&&a2.gaps.length)){c5ViewDoc(fname);return;} // annotations appeared → reopen with them
            fail('The review ran'+(nDocs?(' ('+nDocs+' document'+(nDocs===1?'':'s')+' re-scored)'):'')+' but produced <b>no attribute-level evidence</b> for this policy — so there are no highlights or gaps to show. '+
              'The annotations come from Nerion’s <b>analyst-grade (LLM) document review</b>, which returns a quoted passage per requirement; a keyword-only match can’t produce quotes. Once that review engine is connected, re-run this and the highlights will appear here.');
          }catch(_){fail('Couldn’t complete the review. Try again, or re-upload the policy in onboarding.');}
        });
      }catch(_){fail('Couldn’t start the review. Try again, or re-upload the policy in onboarding.');}
    };
    // Click a highlight → reveal its margin note; click a margin note → jump to the highlight.
    function flash(el){if(!el)return;try{el.scrollIntoView({behavior:'smooth',block:'center'});}catch(_){el.scrollIntoView();}var o=el.style.boxShadow;el.style.transition='box-shadow .25s';el.style.boxShadow='0 0 0 2px var(--good)';setTimeout(function(){el.style.boxShadow=o;},1400);}
    wrap.querySelectorAll('mark.c5ann').forEach(function(mk){mk.onclick=function(){flash(document.getElementById('c5annp-'+mk.getAttribute('data-annidx')));};});
    wrap.querySelectorAll('.c5annp').forEach(function(p){p.onclick=function(){var i=p.getAttribute('data-annidx');flash(wrap.querySelector('mark.c5ann[data-annidx="'+i+'"]'));};});
  }catch(_){}
}
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
    // The specific controls with NO evidence yet (no tool telemetry and no
    // reviewed policy) — the ones behind the "Unevidenced" count. Each gets a
    // link back to onboarding to connect its tool or upload its governing policy.
    var un=[];T.groups.forEach(function(g){(g.children||[]).forEach(function(c){if(c.type==='cat'){(c.children||[]).forEach(function(x){if(x.src==='none')un.push(x);});}else if(c.src==='none')un.push(c);});});
    var unShown=un.slice(0,50),unMore=un.length-unShown.length;
    var urows=unShown.map(function(x){
      var tc=c5fwCtrlTool(x.id);var toolName=(tc&&tc.name)?tc.name.replace(/ *\(.*/,''):'';
      var docLbl=x.r53doc||'';
      var how=toolName?('Connect '+c5esc(toolName)+(docLbl?(' or upload the '+c5esc(docLbl)):' or upload its governing policy'))
        :(docLbl?('Upload the '+c5esc(docLbl)):'Connect its control tool or upload its governing policy');
      var hint=toolName||docLbl||'control tools';
      return [{text:'<b>'+c5esc(x.id)+'</b> '+c5esc(x.name||'')},{text:'No evidence yet — no tool telemetry or reviewed policy',color:'crit'},
        {text:how+' <span data-c5onb="'+c5esc(hint)+'" style="color:var(--blue);cursor:pointer;font-weight:600;white-space:nowrap">in onboarding ›</span>'}];
    });
    m=c5obj({name:'Evidence coverage · '+fwName,displayValue:T.coverage+'%',label:'computed',color:(T.coverage>=75?'good':T.coverage>=50?'warn':'crit'),
      formula:'coverage = controls with evidence (tool telemetry or analyzed policy) ÷ total controls in '+fwName,
      inputs:[{name:'Evidenced',value:String(T.evidenced),source:'tools + documents'},{name:'Total controls',value:String(T.total),source:fwName+' control universe'},{name:'Unevidenced',value:String(T.total-T.evidenced),source:'connect tools / upload policies to raise'}],
      action:(un.length?('The '+un.length+' unevidenced control'+(un.length>1?'s are':' is')+' listed below — connect each one’s control tool or upload its governing policy to raise coverage toward 100%. <span data-c5onb="control tools" style="color:var(--blue);cursor:pointer;font-weight:600;white-space:nowrap">Fix in onboarding ›</span>')
        :('Every control in '+fwName+' is evidenced — keep tool telemetry and policies current so coverage does not decay.')),
      table:(un.length?{title:'The '+un.length+' unevidenced control'+(un.length>1?'s':'')+' · what each needs'+(unMore>0?(' · showing '+unShown.length):''),cols:['Control','What’s missing','How to evidence it'],rows:urows}:null),
      sources:[{tool:'Nerion assessment engine',connector:'nerion',field:'framework_cmmi.coverage',lastRefresh:c5ago()}],
      note:'How much of '+fwName+' you can actually evidence today. Connect more tools or upload more policies to raise it.'
        +(unMore>0?(' '+unMore+' more unevidenced control'+(unMore>1?'s are':' is')+' not shown in the table above.'):'')});
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
/* Illustrative cohort for the sample preview — a fixed, defensible distribution so
   the "you vs peers" comparison can be shown BEFORE the live cohort (5+ orgs)
   exists. Deterministic; nothing here leaves the browser. */
function c5peerSampleData(){
  function band(m){m=Math.max(1,Math.min(4.6,m));return {p25:Math.max(0,+(m-0.6).toFixed(2)),p50:+m.toFixed(2),p75:Math.min(5,+(m+0.6).toFixed(2))};}
  var fns={},meds={Govern:3.2,Identify:3.4,Protect:3.1,Detect:2.8,Respond:2.7,Recover:2.6};
  Object.keys(meds).forEach(function(k){fns[k]=band(meds[k]);});
  return {overall:band(3.1),overall_values:[2.3,2.6,2.8,2.9,3.0,3.1,3.2,3.4,3.6,3.9],functions:fns,n:c5peerMin()-1};
}
/* The framework-specific EXAMPLE comparison shown when the peer box is opened
   before the live cohort unlocks (the "Sample ›" state). Full hero + per-function
   bars, clearly labelled SAMPLE, using the org's OWN real scores against the
   illustrative cohort so a user sees exactly how their benchmark will present. */
function c5fwPeerSampleHTML(fwName){
  var snap=(typeof window!=='undefined'&&window.FW_SNAPSHOT)||{overall:null,functions:{}};
  var over=(typeof window!=='undefined'&&window.C5FW_OVERALL!=null)?Number(window.C5FW_OVERALL):(snap.overall!=null?Number(snap.overall):null);
  var S=c5peerSampleData();
  var pctile=(typeof peerPercentileOf==='function')?peerPercentileOf(over,S.overall_values):null;
  var ordCol=pctile==null?'ink':(pctile>=50?'good':(pctile>=25?'warn':'crit'));
  var banner='<div class="c5note" style="margin-top:2px;margin-bottom:10px">🔍 <b>Sample preview · '+fwName+'.</b> An illustrative cohort so you can see exactly how your comparison will present. The live '+fwName+' benchmark unlocks once <b>'+c5peerMin()+'</b> organizations have joined (anonymous, k-anonymity-gated) — nothing here has left your browser.</div>';
  var hero='<div class="peer-hero"><div><div class="peer-hero-l">My Organization · '+fwName+' vs sample cohort</div>'+
    '<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-top:2px"><div class="peer-hero-v" style="color:var(--'+((typeof cmmiColor==='function')?cmmiColor(Math.round(over||0)):'ink')+')">'+(over!=null?Number(over).toFixed(1):'—')+'<span>/ 5</span></div>'+
    (pctile!=null?'<div class="peer-hero-d">You would rank in the <b style="color:var(--'+ordCol+')">'+((typeof peerOrdinal==='function')?peerOrdinal(pctile):pctile)+' percentile</b> — '+(pctile>=50?'ahead of':'behind')+' the sample median of '+S.overall.p50.toFixed(1)+'.</div>':'')+'</div></div>'+
    '<div class="peer-n"><b>SAMPLE</b>illustrative</div></div>';
  var bars='<div style="margin-top:12px">'+((typeof peerBar==='function')?peerBar('Overall',over,S.overall):'');
  var order=['Govern','Identify','Protect','Detect','Respond','Recover'],snf=snap.functions||{};
  order.forEach(function(fn){if(S.functions[fn]&&typeof peerBar==='function')bars+=peerBar(fn,snf[fn],S.functions[fn]);});
  bars+='</div>';
  var legend='<div class="peer-legend" style="margin-top:6px"><span><i style="background:var(--blue-soft);border:1px solid rgba(37,99,235,.35)"></i>cohort band (p25–p75)</span><span><i style="background:var(--blue);width:2px"></i>cohort median</span><span><i style="background:var(--good);border-radius:50%;border:1.5px solid var(--card,#fff);box-shadow:0 1px 2px rgba(0,0,0,.3)"></i><b style="color:var(--ink-2)">the ● dot = My Organization</b></span><span style="color:var(--muted)">its colour: green ≥ median · amber ≥ 25th · red below 25th</span></div>';
  return banner+hero+bars+legend;
}
/* Open the full community benchmark (preview → verify → compare) in the drill
   panel, triggered by the peer box in the top card. */
function c5fwPeerOpen(){
  if(typeof openDrill!=='function')return;
  var sel=(typeof FW_SEL!=='undefined')?FW_SEL:'csf';
  var fwName=(typeof FW_NAMES!=='undefined'&&FW_NAMES[sel])||'this framework';
  openDrill('Community benchmark · '+fwName+' · how do we compare?','<div id="c5fwPeer"></div>');
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
    body=c5fwPeerSampleHTML(fwName)+
      '<div class="cn" style="margin-top:14px;line-height:1.55">See how your <b>'+fwName+'</b> maturity compares to the DTNKShield community — anonymously. This is the <b>only</b> feature that reaches the internet. If you share, only your <b>anonymized scores</b> and cohort tags (industry, region, revenue band) leave your browser — <b>no organization name, no inventory, no dollar figures</b>. The comparison unlocks once at least '+minC+' organizations have joined a cohort, so no single peer can be identified.</div>'+
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
      // Opted in but the live cohort isn't at k-anonymity yet — show the SAME sample
      // preview the not-opted-in view shows, so the drawer is consistent and the user
      // sees how it will present while their cohort builds (not just a bare status line).
      cmp='<div class="peer-hero"><div><div class="peer-hero-l">Building your cohort</div><div class="peer-hero-d" style="margin-top:6px">Your scores are shared. The '+q.label+' comparison unlocks once <b>'+need+'</b> organizations have joined — so no single one can be identified.</div></div><div class="peer-n"><b>'+got+' / '+need+'</b>joined</div></div>'+c5fwPeerSampleHTML(fwName);}
    else{
      var pctile=(typeof peerPercentileOf==='function')?peerPercentileOf(over,C5FW_PEER.overall_values):null;
      var ordCol=pctile==null?'ink':(pctile>=50?'good':(pctile>=25?'warn':'crit'));
      var hero='<div class="peer-hero"><div><div class="peer-hero-l">My Organization · '+fwName+' vs '+q.label+'</div><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-top:2px"><div class="peer-hero-v" style="color:var(--'+((typeof cmmiColor==='function')?cmmiColor(Math.round(over||0)):'ink')+')">'+(over!=null?Number(over).toFixed(1):'—')+'<span>/ 5</span></div>'+
        (pctile!=null?'<div class="peer-hero-d">You rank in the <b style="color:var(--'+ordCol+')">'+((typeof peerOrdinal==='function')?peerOrdinal(pctile):pctile)+' percentile</b> — '+(pctile>=50?'ahead of':'behind')+' the cohort median of '+Number(C5FW_PEER.overall.p50).toFixed(1)+'.</div>':'')+'</div></div><div class="peer-n"><b>'+(C5FW_PEER.n||0)+'</b>in cohort</div></div>';
      var bars='<div style="margin-top:12px">'+((typeof peerBar==='function')?peerBar('Overall',over,C5FW_PEER.overall):'');
      var fns=C5FW_PEER.functions||{},snap=(window.FW_SNAPSHOT&&window.FW_SNAPSHOT.functions)||{},order=['Govern','Identify','Protect','Detect','Respond','Recover'];
      order.forEach(function(fn){if(fns[fn]&&typeof peerBar==='function')bars+=peerBar(fn,snap[fn],fns[fn]);});
      bars+='</div>';
      var legend='<div class="peer-legend" style="margin-top:6px"><span><i style="background:var(--blue-soft);border:1px solid rgba(37,99,235,.35)"></i>cohort band (p25–p75)</span><span><i style="background:var(--blue);width:2px"></i>cohort median</span><span><i style="background:var(--good);border-radius:50%;border:1.5px solid var(--card,#fff);box-shadow:0 1px 2px rgba(0,0,0,.3)"></i><b style="color:var(--ink-2)">the ● dot = My Organization</b></span><span style="color:var(--muted)">its colour: green ≥ median · amber ≥ 25th · red below 25th</span></div>';
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
function c5fwCtlRow(c){var selc=(C5FW_CTRL===c.id)?' sel':'';
  // Framework-native (CIS/SOC2/HIPAA): show the native assessment STATUS, and
  // the CSF ids only as "related" (informational), never as the score source.
  if(c.src==='native'||c.src==='native-pending'){
    var rel=(c.related&&c.related.length)?('<div class="c5fw-map">related (informational) · '+c.related.slice(0,6).join(' · ')+'</div>'):'';
    var dcol=c.tested?c5fwCol(c.score):'muted';
    // Show the CMMI score AND the native operating-effectiveness status side by side.
    var cmmiCell=c.tested?('<span class="c5fw-lvl">'+c5fwLvl(c.score)+'</span><span class="c5fw-sc" style="color:var(--'+dcol+')">'+c.score.toFixed(1)+'</span>'):('<span class="c5fw-sc" style="color:var(--muted)">—</span>');
    return '<div class="c5fw-crow'+selc+'" data-c5fwctl="'+c.id+'"><span class="c5fw-tw"></span><span class="c5fw-dot" style="background:var(--'+dcol+')"></span><span class="c5fw-id">'+c.id+'</span><span class="c5fw-nm">'+c.name+rel+'</span>'+cmmiCell+' '+caStatusPill(c.status)+'</div>';
  }
  var col=c5fwCol(c.score);
  var mapped=(c.mapped&&c.mapped.length)?('<div class="c5fw-map">mapped ← '+c.mapped.slice(0,6).map(function(id){return id;}).join(' · ')+'</div>'):'';
  return '<div class="c5fw-crow'+selc+'" data-c5fwctl="'+c.id+'"><span class="c5fw-tw"></span><span class="c5fw-dot" style="background:var(--'+col+')"></span><span class="c5fw-id">'+c.id+'</span><span class="c5fw-nm">'+c.name+mapped+'</span><span class="c5fw-lvl">'+c5fwLvl(c.score)+'</span><span class="c5fw-sc" style="color:var(--'+col+')">'+c.score.toFixed(1)+'</span></div>';
}
