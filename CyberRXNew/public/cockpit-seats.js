/* Nerion cockpit — seat content + evidence, rendered by cockpit.html's helpers.
   Every claim (data-ev) has an EV entry: formula, inputs (value+source), math. */

var SEATS = {
 board:{
  eyebrow:'Board oversight · Directors',
  verdict:'Cyber risk is <span class="em">a managed business risk under active board oversight</span> — within the appetite you approved. This is the director’s one-screen brief: material exposure, the worst realistic day, peer standing, and the decisions that are the board’s to make.',
  sub:'The board’s oversight lens — the six questions a Fortune-100 director asks, in your sector’s terms, each tracing to the evidence. Every figure is clickable.',
  brief:'Here is the board’s view. Cyber is a managed business risk, within the appetite you approved. I can show you the one event that would hurt us most, how we compare to our sector, and the few decisions that need the board. Every number traces to our own data.',
  body:function(){return (
   sec('01','Enterprise cyber business health','Your sector’s one-screen oversight brief: are we within the appetite the board approved, what single event would hurt us most, who regulates us, how we compare to peers, and the direction of travel — plus what is financially at stake.',
     '<div id="ceoBoardBrief"></div>'
     +'<div id="boardMode" style="margin-top:14px"></div>'
     +'<div>'+tiles([
      {k:'Expected annual loss',v:'<span id="lvExpo">$68M</span>',ev:'ale',note:'<span class="pill good" id="lvAleWithin">Within appetite</span> &nbsp;<span class="claim" data-ev="pctrev"><span id="lvPctRev">≈0.8% of revenue</span> <span class="fx">ƒ</span></span>'},
      {k:'Worst-case tail (95%)',v:'<span id="lvTail">$180M</span>',cls:'warn',ev:'tail',note:'<span class="pill warn" id="lvTailWithin">Above appetite</span> &nbsp;vs appetite <span class="claim" data-ev="appetite"><span id="lvAppetite">$120M</span> <span class="fx">ƒ</span></span>'},
      {k:'Materiality threshold',v:'<span id="lvMateriality">$53M</span>',ev:'materiality',note:'<span id="lvMatBasis">the loss large enough to be financially material to disclose</span>'}])+'</div>')
   +sec('02','Material risk','The single event that would hurt us most — the severe-but-plausible scenario for our sector, what it would cost, and the threshold at which it becomes financially material and reportable.',
     '<div class="card" id="ceoStress"><div class="ck">Severe-but-plausible scenario</div><div class="cn" style="margin-top:8px">◐ Illustrative until go-live — modeled from your top crown jewel, its largest open risk, worst-case recovery and your binding regulatory clock.</div></div>'
     +'<div class="cn" style="margin-top:12px">Reportable at the <b class="claim" data-ev="materiality" style="cursor:pointer">materiality threshold <span class="fx">ƒ</span></b> — an event modeled above it is presumptively material and starts the 4-business-day SEC disclosure clock. The board is briefed the moment a scenario clears this line.</div>')
   +sec('03','Trend over time','Are we getting better or worse? The direction of travel in expected loss across recorded analyses, and where we stand against our sector’s peers.',
     '<div id="ceoTrend"></div><div id="ceoPeer" style="margin-top:14px"></div>')
   +sec('04','Major incidents','Is anything material happening now? The current state of any incident material enough for the board to be aware of — and what happens when one is confirmed.',
     '<div id="ceoIncidents"></div>')
   +sec('05','Resilience posture','Could we survive the worst realistic day? Response &amp; recovery readiness — is the IR plan tested, is recovery fast enough — and where a single third-party is a systemic point of failure.',
     '<div id="ceoReadiness" class="card"><div class="ck">Response &amp; recovery readiness</div><div class="cn" style="margin-top:8px">◐ Add your incident-readiness answers in onboarding (IR plan tested, tabletop, retainer, ransomware policy).</div></div>'
     +'<div id="ceoThirdParty" style="margin-top:14px"></div>')
   +sec('06','Investment needs','What still needs funding to bring risk within appetite — the ranked portfolio of security investment by dollars of risk removed, and the cost of carrying the unfunded decisions.',
     '<div id="initiatives-panel"></div>')
   +sec('07','Decisions requiring board awareness','The calls that are the board’s to make — risk-acceptances above appetite, appetite reviews and major funding — plus the SEC Item 106 governance the board must disclose and the evidenced decision record that is your D&amp;O defense.',
     '<div id="ceoBoardDecisions"></div>'
     +'<div id="ceoGov" style="margin-top:14px"></div>'
     +'<div id="ceoOversight" style="margin-top:14px"></div>'
     +'<div class="card" style="margin-top:14px"><div class="ck">Board-ready report</div><div class="cn" style="margin-top:6px">A one-click board / regulator report — the financial statement of cyber risk, Item 106 governance readiness, the KRI board, decisions and trajectory — from the same live model, every figure carrying its provenance.</div><div style="margin-top:12px"><button class="bp-btn primary" onclick="openBoardPack()">Open the board pack →</button></div></div>')
  );}
 },

 ceo:{
  eyebrow:'CEO · Executive cockpit',
  verdict:'Cyber in the language you run the business by, in five tabs: <span class="em">enterprise health</span>, the risk to your <span class="em">strategy</span>, the money at stake, the <span class="em">customer trust</span> it protects, and the one decision that needs you — no jargon, every figure traceable to source.',
  sub:'Tap any card, tile, objective or decision to open the inspector — its basis, inputs and source. The same engine as the CISO and CFO seats; the shared figures match exactly.',
  brief:'Here is your read as CEO, in five tabs and plain business terms. Enterprise health: cyber is protecting growth, not slowing it — the company is secure and improving. Strategic risk: six of your seven objectives are cyber-safe; only the customer platform carries a funded exposure. Financial exposure: modeled cyber loss is within the board’s appetite, with the largest driver already funded. Brand & trust: customer trust is intact, with one exposure to watch. Decisions: one call worth making now. Every figure traces to our own data and matches the CISO and CFO seats exactly.',
  body:function(){return (
   sec('01','Enterprise health','','<div id="ce-health"></div>')
   +sec('02','Strategic risk','','<div id="ce-strategic"></div>')
   +sec('03','Financial exposure','','<div id="ce-financial"></div>')
   +sec('04','Brand & trust','','<div id="ce-trust"></div>')
   +sec('05','Decisions','','<div id="ce-decisions"></div>')
  );}
 },

 cfo:{
  eyebrow:'CFO · Executive cockpit',
  verdict:'Cyber as money, in five tabs: <span class="em">financial exposure</span> against appetite, the <span class="em">return</span> on the spend, insurance efficiency, where to save, and the priced decisions that need your sign-off — every figure traceable to its source.',
  sub:'Tap any card, tile, row, bar or decision to open the inspector — the model, its inputs and their sources. The same engine as the CISO seat; shared figures are one source of truth.',
  brief:'From the finance seat, in five tabs. Financial exposure: cyber loss is within the board’s appetite, with headroom, and one identity fix protects it. Cyber ROI: the spend returns more than it costs, and identity returns the most per dollar. Insurance: covered for the everyday, with a tail gap to close by buying up or reducing the tail. Cost optimization: spend you can free and redeploy. Risk decisions: three priced calls on your desk — one clear yes. Every number traces to its source, and the shared figures match the CISO seat exactly.',
  body:function(){return (
   sec('01','Financial exposure','','<div id="cf-exposure"></div>')
   +sec('02','Cyber ROI','','<div id="cf-roi"></div>')
   +sec('03','Insurance','','<div id="cf-insurance"></div>')
   +sec('04','Cost optimization','','<div id="cf-cost"></div>')
   +sec('05','Risk decisions','','<div id="cf-decisions"></div>')
  );}
 },

 clo:{
  eyebrow:'Legal & regulatory view · CLO / General Counsel',
  verdict:'The organization is <span class="em">defensible across all operating jurisdictions</span> today — no reportable events, evidence preserved. Two obligations have clocks to watch.',
  sub:'Cyber as legal exposure: disclosure standing, notification duties by country, and the modeled liability if an event occurs — with the clock on each.',
  brief:'Legally, we are defensible across every jurisdiction we operate in today — no reportable events, and evidence is preserved. The clocks to watch are the seventy-two-hour European deadline and the four-business-day S.E.C. rule. If an incident became material, the determination process and the draft filings are already pre-staged, which is what protects the directors.',
  body:function(){return (
   sec('01','Regulatory exposure','Where we are exposed by jurisdiction — the binding notification obligation, the clock and the penalty ceiling for each region we operate in, plus whether any event is currently reportable. Computed from your regions, data classes and record count.',
     tiles([
      {k:'Open notifications',v:'<span id="lvCloNotifCount">—</span>',cls:'good',ev:'notifications',note:'<span id="lvCloNotif">reportable incidents currently open · from your SIEM</span>'},
      {k:'Materiality standing',v:'<span id="lvCloMatStanding">Not yet determined</span>',cls:'',ev:'materiality',note:'set by the materiality workbench in §05; the SEC clock runs only once an event clears the threshold'},
      {k:'Class-action / notification exposure',v:'<span id="lvCloLiability">—</span>',cls:'warn',ev:'liability',note:'<span id="lvCloLiabNote">modeled liability from a breach of your record count (records × cost/record)</span>'},
      {k:'Fastest clock',v:'<span id="lvClock">72 hours</span>',ev:'clock',note:'the binding statutory notification deadline for your regions'}])
     +'<div id="cloJuris" style="margin-top:14px">'+jtable([
      {flag:'🇺🇸',c:'United States',ev:'juris-us',o:'SEC 8-K + 54 state breach laws',clock:'4 business days',cc:'warn',pen:'Disclosure + enforcement'},
      {flag:'🇪🇺',c:'European Union',ev:'juris-eu',o:'GDPR · NIS2 · DORA',clock:'72 hours',cc:'crit',pen:'Up to 4% of global revenue'},
      {flag:'🇬🇧',c:'United Kingdom',ev:'juris-uk',o:'UK GDPR / ICO',clock:'72 hours',cc:'crit',pen:'£17.5M or 4%'},
      {flag:'🇸🇬',c:'Singapore',ev:'juris-sg',o:'PDPA · MAS TRM',clock:'72h / 1h (MAS)',cc:'crit',pen:'Up to S$1M'},
      {flag:'🇦🇺',c:'Australia',ev:'juris-au',o:'Privacy Act · APRA CPS 234',clock:'72 hours',cc:'warn',pen:'Up to A$50M'}])+'</div>'
     +'<div class="cn" style="margin-top:8px"><span class="pill mod" style="font-size:8px">statutory</span> Obligations, clocks and penalty ceilings are the published jurisdiction rulesets — not your data. The row that binds <b>you</b> is set by the regions you operate in (from onboarding); click any row for the trigger, the deadline and the source.</div>')
   +sec('02','Contractual risk','The contractual cyber obligations statutory clocks miss — customer DPAs with breach-notification clauses, and your tightest contractual deadline (frequently 24–72h, ahead of the SEC and GDPR clocks). The first thing customer counsel invokes after an incident.',
     '<div id="cloContract"></div>')
   +sec('03','Breach-notification readiness','If an incident is material, are we ready to notify in time? The materiality determination — recorded, timed and evidenced — the live SEC and binding-jurisdiction countdowns, and the decision on how we run disclosure.',
     '<div class="cn" style="margin-bottom:12px">Reportable at <b class="claim" data-ev="materiality" style="cursor:pointer"><span id="lvCloMateriality">$53M</span> <span class="fx">ƒ</span></b> — a crown-jewel event above this threshold is material and starts the 4-business-day SEC clock. Record the determination below; it is timed, evidenced and logged for the D&amp;O defense.</div>'
     +'<div id="cloMateriality" style="margin-bottom:16px"></div>'
     +'<div id="cloDecision"></div>')
   +sec('04','Litigation exposure','If an event becomes litigation — the class-action / notification exposure from the records we hold, the litigation hold that preserves evidence, and the forensic chain-of-custody that protects the case.',
     '<div id="cloOps"></div>')
   +sec('05','Privacy risk','The exposure from the sensitive data we hold and our ability to meet data-subject rights inside the statutory clock — the privacy obligations that run continuously, not just after an incident.',
     '<div id="cloPrivacy"></div>')
   +sec('06','Evidence readiness','Can we produce the evidence — for a regulator, an auditor or a court — on demand? Compliance posture across the frameworks in scope, and the preserved, timestamped record behind every determination and decision.',
     '<div id="cisoCompliance"></div>'
     +'<div class="cn" style="margin-top:12px">Evidence readiness is the ability to show, on demand, that a control was in place and a determination was made properly. The compliance posture above is your framework evidence; every materiality determination and executive decision in Nerion is timestamped and logged as the contemporaneous record a court or regulator expects.</div>')
  );}
 },

 cro:{
  eyebrow:'CRO · Executive cockpit',
  verdict:'Cyber inside the enterprise risk portfolio, in five tabs: <span class="em">one scale</span> against your other principal risks, <span class="em">appetite</span> by category, evidence-based <span class="em">assurance</span>, the trend and who owns what, and the risk decisions that need your call — every figure traceable to source.',
  sub:'Tap any risk, category, control family or decision to open the inspector — its basis, inputs and source. The same engine as the CISO, CFO and CEO seats; the shared cyber figures match exactly.',
  brief:'From the risk seat, in five tabs. One scale: cyber sits among your principal risks on one normalized residual scale, with its direction the thing to watch. Appetite: cyber is within tolerance overall, but the identity category is over its share. Assurance: most control families are assured by evidence; identity and third-party carry a gap. Trend & ownership: the residual trend is falling and every top risk has a named owner — identity needs your governance push. Decisions: one risk to treat, one to monitor, one to accept. Every cyber figure matches the other seats exactly.',
  body:function(){return (
   sec('01','One scale','','<div id="cr-scale"></div>')
   +sec('02','Appetite','','<div id="cr-appetite"></div>')
   +sec('03','Assurance','','<div id="cr-assurance"></div>')
   +sec('04','Trend & ownership','','<div id="cr-trend"></div>')
   +sec('05','Decisions','','<div id="cr-decisions"></div>')
  );}
 },

 cio:{
  eyebrow:'Operational resilience view · CIO',
  verdict:'Every revenue-critical system is <span class="em">operating and recoverable.</span> The items to close are the slowest-recovering system on the worst-case tail and a single vendor that underpins multiple systems — both quantified below, each figure clickable to its math.',
  sub:'Cyber and resilience for the systems that carry the business: what each is worth per hour, how fast it recovers, and where a single provider is a point of failure.',
  brief:'Operationally, every revenue system is running and recoverable. Two items drive the resilience picture: the slowest-recovering system, which carries most of our worst-case tail, and a concentration where one provider underpins several revenue systems. Both are quantified on this seat in dollars per hour and recovery time, and each number is clickable to how it was calculated and where the data comes from.',
  body:function(){return (
   sec('01','Technology enablement of business objectives','Technology carries the business — here are the systems that run it, ranked by what an hour of downtime costs, so investment and protection follow revenue. This is where cyber either enables the objectives or blocks them.',
     '<div id="cioSystems"></div>'
     +'<div class="cn" style="margin-top:8px">These are your crown-jewel systems — the ones the strategy depends on. Recovery and security investment should follow the systems that carry the most revenue.</div>')
   +sec('02','Digital service reliability','The security posture of the cloud and applications your customers depend on — misconfiguration, public exposure and identity risk on the services they touch, plus any live disruption and what an outage costs.',
     '<div id="cioDigital"></div>')
   +sec('03','AI adoption readiness','Can we adopt AI into products and operations securely and at speed? AI systems already live, the governance framework, the acceptable-use policy and the inventory — the readiness to scale AI without scaling unmanaged risk.',
     '<div id="cioAi"></div>')
   +sec('04','Workforce productivity','How security affects the productivity of the people who run the business — access provisioned fast, low friction, and hours not lost to downtime or manual security steps.',
     '<div id="cioWorkforce"></div>')
   +sec('05','Application modernization risk','The exposure carried by end-of-life and unsupported systems still on revenue paths — they patch slower, recover slower, and drive the worst-case tail. Prioritized by revenue protected per dollar.',
     '<div id="cioModern"></div>')
   +sec('06','Service availability','Could the systems that carry the business keep running and recover fast enough? Immutable backups, recovery-point objective, last DR test, and where a single vendor failure leaves no failover.',
     '<div id="cioDr"></div>'
     +'<div id="cioDecision" style="margin-top:14px"></div>')
  );}
 },

 coo:{
  eyebrow:'Operational continuity view · COO',
  verdict:'Operations are <span class="em">running</span> — cyber is not disrupting service delivery today. The exposure is continuity: our slowest critical service recovers beyond tolerance, and a single vendor is a point of failure for three of them.',
  sub:'Can the business keep delivering through a cyber disruption? Your critical services, what an hour of downtime costs, how fast each recovers, and where a single point of failure could stop operations.',
  brief:'Operationally we are running, and no incident is disrupting service delivery right now. The continuity gap to close is recovery — our slowest critical service takes too long to restore, beyond tolerance, and one vendor is a single point of failure for three services. One resilience investment brings both inside tolerance and protects our service-delivery commitments.',
  body:function(){return (
   sec('01','Operational resilience','Are operations running, and could they keep running through a cyber disruption? Your live operating picture — incidents affecting business processes, how fast a disruption surfaces, and where a single point of failure could stop service delivery.',
     '<div id="cooStatus"></div>')
   +sec('02','Critical process health','The revenue- and service-critical processes ranked by what an hour of downtime costs, how fast each recovers, and whether that is inside your continuity tolerance.',
     '<div id="cooContinuity"></div>')
   +sec('03','Manufacturing / service continuity','The continuity that actually matters for your sector — the services whose disruption stops the business — framed in your industry’s terms, including operational-technology (OT) continuity where it applies.',
     '<div id="cooSector"></div>')
   +sec('04','Supply-chain reliability','Where a third-party or single provider is a point of failure for your operations — the vendor concentration that can stop multiple services at once, and the supplier risk to monitor.',
     '<div id="ceoThirdParty"></div>'
     +'<div id="cooSupply" style="margin-top:12px"></div>')
   +sec('05','Recovery readiness','Could we actually recover? Immutable backups that survive an attack, the recovery-point objective (how much data you would lose), the date of the last full DR test, and whether a single vendor failure leaves no failover.',
     '<div id="cioDr"></div>')
   +sec('06','Business continuity gaps','The specific gaps between where continuity is today and where board tolerance requires it — and the resilience decision that closes them.',
     '<div id="cooGaps"></div>'
     +'<div id="cooDecision" style="margin-top:14px"></div>')
  );}
 },

 ciso:{
  eyebrow:'CISO · Executive cockpit',
  verdict:'A story in five tabs: the plain-language <span class="em">verdict</span> up top, the few things that matter in the middle, and one <span class="em">funded decision</span> at the bottom — every number real and traceable to its source.',
  sub:'Tap any tile, row, square, ATT&CK cell, control or peer marker to open the inspector — the exact formula, inputs, source tools and why it matters.',
  brief:'Here is the CISO read in five tabs. Program health: no active compromise and the program is improving. Top exposure: one driver is a third of our risk, and it is funded to fix. Effectiveness: every dollar is removing risk and we can prove it. Threats: covered across the kill chain with a soft spot in identity. Peers: ahead overall, trailing on identity — the same gap driving our exposure. Every number is traceable to its source.',
  body:function(){return (
   sec('01','Program health','','<div id="c5-health"></div>')
   +sec('02','Top exposure','','<div id="c5-exposure"></div>')
   +sec('03','Effectiveness','','<div id="c5-effect"></div>')
   +sec('04','Threats','','<div id="c5-threats"></div>')
   +sec('05','Peers','','<div id="c5-peers"></div>')
  );}
 },

 cpo:{
  eyebrow:'Product &amp; engineering view · Chief Product Officer',
  verdict:'Product ships <span class="em">with security built in, not bolted on</span> — launches gated on secure-by-design, AI features governed, and supplier &amp; software dependencies watched. The open work is instrumenting launch readiness and secure-SDLC coverage from your pipeline.',
  sub:'Cyber through the product lens: launch readiness, innovation velocity, product-quality risk, AI-product readiness, secure-by-design adoption, and the software &amp; supplier dependencies your product ships on.',
  brief:'From the product seat: the goal is to ship fast with security built in — launches gated on secure-by-design, AI features governed before they reach customers, and our software and supplier dependencies watched. Connect the delivery pipeline and this fills with live launch-readiness and secure-SDLC coverage.',
  body:function(){return (
   sec('01','Product launch readiness','Are we clear to ship? Each release gated on secure-by-design checks — threat model, application-security review and no unresolved critical findings — so a launch does not carry avoidable risk to customers.',
     '<div id="cpoLaunch"></div>')
   +sec('02','Innovation velocity','Are we shipping fast without shipping risk? Delivery throughput — changes shipped per week and the review backlog — so security keeps pace with delivery rather than blocking it. Live from your CI/CD.',
     '<div id="cpoVelocity"></div>')
   +sec('03','Product quality risk','The security-quality of what we ship — open code-scanning (SAST) findings and critical dependency alerts in the product, and the exposure they create for customers. Live from your delivery pipeline.',
     '<div id="cpoQuality"></div>')
   +sec('04','AI product readiness','Are AI features in the product governed before they reach customers? AI systems live, the framework adopted, the acceptable-use policy and inventory — readiness to ship AI without shipping unmanaged risk.',
     '<div id="cioAi"></div>')
   +sec('05','Secure-by-design adoption','How deeply secure-by-design is adopted across engineering — threat-modeling coverage, secure-SDLC practices, and security embedded in the pipeline rather than a gate beside it. Plus the product-security investment decision the Chief Product Officer owns.',
     '<div id="cpoSbd"></div>'
     +'<div id="cpoDecision" style="margin-top:14px"></div>')
   +sec('06','Software &amp; supplier dependency risk','What the product ships on — the third-party components and suppliers a compromise of which reaches your customers, and the concentration to watch.',
     '<div id="ceoThirdParty"></div>'
     +'<div id="cpoSupply" style="margin-top:12px"></div>')
  );}
 },

 audit:{
  eyebrow:'Assurance view · Internal Audit',
  verdict:'The control environment is <span class="em">evidenced and testable</span> — audit readiness and evidence completeness are measured, control testing is scored from live telemetry and document review, and every management action is tracked to closure.',
  sub:'Cyber for assurance, in five reads: audit readiness, control assurance, management actions, compliance, and the calls internal audit brings to the committee.',
  brief:'From the assurance seat: the control environment is evidenced and testable. Audit readiness and evidence completeness are measured from live tool coverage and document review, not self-attestation; the controls that fail are flagged; open findings and remediation are tracked to closure; and the audit priorities and escalations for the committee are surfaced.',
  body:function(){return (
   sec('01','Audit Readiness','Are we ready for an audit and can we produce the evidence on demand — overall audit readiness, and how complete the evidence behind our controls is.',
     '<div id="auditReadiness"></div>'
     +'<div id="auditCoverage" style="margin-top:14px"></div>'
     +'<div id="cisoCoverage" style="margin-top:14px"></div>')
   +sec('02','Control Assurance','The tested state of every control, and the controls currently failing — not evidenced, or below a passing standard.',
     '<div id="auditFailed"></div>'
     +'<div id="cisoFrameworks" style="margin-top:14px"></div>')
   +sec('03','Management Actions','Open findings and how remediation is progressing — the management actions internal audit tracks to closure.',
     '<div id="auditRepeat"></div>'
     +'<div id="initiatives-panel" style="margin-top:14px"></div>')
   +sec('04','Compliance','Where we stand against each compliance framework in scope — audit-readiness per framework, evidenced live rather than self-attested.',
     '<div id="cisoCompliance"></div>')
   +sec('05','Executive Decisions','The calls internal audit brings to the committee — where to point the next audit, and the findings that need escalation.',
     '<div id="auditDecisions"></div>')
  );}
 }
};

/* ---------- Evidence: formula + inputs (value+source) + math + sources ---------- */
var EV = {
 ale:{claim:'Expected annual loss (material cyber exposure)',result:'$68M',cls:'',
  formula:'ALE  =  Σ ( open risk on a crown-jewel asset × its financial exposure )\n\n( FAIR form:  ALE = Σ  LEF × Loss Magnitude )',
  inputs:[['Ransomware → Payments','$34M','Risk register (uploaded)'],['Breach → Customer data','$18M','Risk register'],['Disruption → Settlement','$11M','Risk register'],['AI decisioning risk','$5M','Risk register (new)']],
  steps:[['1','Keep OPEN risks linked to a crown-jewel asset','4 of 7'],['2','Sum their financial exposure','34+18+11+5'],['T','Expected annual loss','$68M']],
  sources:['Your uploaded risk register','Crown-jewel mapping (from your inventory)'],conf:'Deterministic · recomputed on every ingest.'},
 tail:{claim:'Worst-case tail — Value-at-Risk (95th percentile)',result:'$180M',cls:'warn',
  formula:'Monte-Carlo simulation (20,000 iterations)\nfor each iteration:  annual_loss = Σ  freq × magnitude\n     freq, magnitude ~ Beta-PERT(min, mode, max) per risk\nVaR₉₅ = 95th percentile of the sorted distribution',
  inputs:[['Ransomware magnitude','$30M / $52M / $120M','Risk range'],['Data breach magnitude','$4M / $18M / $45M','Risk range'],['Iterations','20,000','Engine config'],['Percentile','95th','Engine config']],
  steps:[['1','Sample each risk’s freq × magnitude','per iteration'],['2','Sum to annual loss, repeat 20,000×','distribution'],['3','Sort; read 95th percentile','VaR₉₅'],['T','Worst-case tail','$180M']],
  sources:['Risk ranges (uploaded)','Industry loss priors where a range is missing'],conf:'Modeled · seeded so results are reproducible. Mean of the same distribution = the $68M expected loss.'},
 pctrev:{claim:'Expected loss as a share of revenue',result:'0.81%',cls:'',
  formula:'% of revenue  =  ALE  ÷  annual revenue',
  inputs:[['ALE','$68M','computed'],['Annual revenue','$8.4B','Onboarding — financials']],
  steps:[['1','68,000,000 ÷ 8,400,000,000','0.81%'],['T','Share of revenue','0.81%']],
  sources:['Onboarding financials','Risk register'],conf:'Deterministic ratio · also ≈18 days of operating income.'},
 appetite:{claim:'Position vs. board-approved appetite',result:'Within (tail over)',cls:'',
  formula:'within_appetite      =  ALE  ≤  appetite\ntail_within_appetite =  VaR₉₅ ≤ appetite',
  inputs:[['Appetite (board-set)','$120M','Onboarding — board input'],['ALE','$68M','computed'],['Tail (VaR₉₅)','$180M','computed']],
  steps:[['1','$68M ≤ $120M','expected: WITHIN'],['2','$180M ≤ $120M','tail: OVER by $60M'],['T','Verdict','within on expected; tail over']],
  sources:['Board-approved appetite statement','Engine (ALE, VaR)'],conf:'The tail breach is what Decisions 1–2 are sized to close.'},
 materiality:{claim:'SEC materiality threshold',result:'$53M',cls:'',
  formula:'materiality threshold  =  5%  ×  net income\n( fallback: 0.5% × revenue when net income is unavailable )',
  inputs:[['Net income','$1.06B','Onboarding — financials'],['Basis %','5%','Config (auditor convention)']],
  steps:[['1','0.05 × 1,060,000,000','$53M'],['T','Materiality threshold','$53M']],
  sources:['Onboarding financials','Materiality policy (configurable)'],conf:'An incident modeled above $53M is presumptively material → starts the 4-business-day SEC clock.'},
 'proc-claims':{claim:'Exposure carried by Claims & payments processing',result:'$34M',cls:'crit',
  formula:'process exposure  =  Σ open-risk exposure on the assets that support this process\n( assets linked to the process by the dependency map built from your inventory )',
  inputs:[['Supporting assets','ClaimsDB, PayGateway','Inventory → dependency map'],['Ransomware → ClaimsDB','$34M','Risk register']],
  steps:[['1','Assets supporting the process','2'],['2','Sum open-risk exposure','$34M'],['T','Process exposure','$34M (50% of total)']],
  sources:['Business processes (onboarding)','Risk register','Process→asset dependency map'],conf:'Half the total in one process — the highest-leverage place to invest.'},
 'proc-policy':{claim:'Exposure carried by Policy administration',result:'$18M',cls:'warn',
  formula:'process exposure  =  Σ open-risk exposure on supporting assets',
  inputs:[['Supporting assets','PolicyCore, CustomerDB','Dependency map'],['Data-breach → CustomerDB','$18M','Risk register']],
  steps:[['1','Assets supporting the process','2'],['2','Sum open-risk exposure','$18M'],['T','Process exposure','$18M']],
  sources:['Business processes','Risk register','Dependency map'],conf:'Driven by PII sensitivity on the customer database.'},
 'proc-settlement':{claim:'Exposure carried by Trading & settlement',result:'$11M',cls:'warn',
  formula:'process exposure  =  Σ open-risk exposure on supporting assets',
  inputs:[['Supporting assets','SettlementEngine','Dependency map'],['Disruption → SettlementEngine','$11M','Risk register']],
  steps:[['1','Assets supporting the process','1'],['2','Sum open-risk exposure','$11M'],['T','Process exposure','$11M']],
  sources:['Business processes','Risk register','Dependency map'],conf:'Time-critical process; availability/disruption risk.'},
 'proc-member':{claim:'Exposure carried by Member portal & servicing',result:'$5M',cls:'',
  formula:'process exposure  =  Σ open-risk exposure on supporting assets',
  inputs:[['Supporting assets','MemberWeb','Dependency map'],['Internet exposure → MemberWeb','$5M','Risk register']],
  steps:[['1','Assets supporting the process','1'],['2','Sum open-risk exposure','$5M'],['T','Process exposure','$5M']],
  sources:['Business processes','Risk register','Dependency map'],conf:'Internet-facing but lower-value data; smallest of the four.'},
 inslimit:{claim:'Cyber-insurance coverage limit',result:'$150M',cls:'',
  formula:'coverage limit  =  the aggregate policy limit purchased for cyber',
  inputs:[['Policy aggregate limit','$150M','Onboarding — insurance policy']],
  steps:[['1','Policy aggregate limit','$150M'],['T','Coverage limit','$150M']],
  sources:['Insurance policy (captured at onboarding)'],conf:'Compared against the modeled worst-case tail (VaR₉₅) to size the uninsured gap.'},
 inspremium:{claim:'Annual cyber-insurance premium',result:'$4.2M / yr',cls:'',
  formula:'premium  =  the annual premium payable for the cyber policy',
  inputs:[['Annual premium','$4.2M','Onboarding — insurance policy']],
  steps:[['1','Annual premium','$4.2M'],['T','Premium','$4.2M / yr']],
  sources:['Insurance policy (captured at onboarding)'],conf:'Read alongside transfer efficiency — premium per dollar of tail actually transferred.'},
 insgap:{claim:'Uninsured tail (insurance gap)',result:'$30M',cls:'crit',
  formula:'insurance gap  =  max( 0 ,  worst-case tail  −  coverage limit )',
  inputs:[['Worst-case tail (VaR₉₅)','$180M','computed'],['Coverage limit','$150M','Onboarding — insurance policy']],
  steps:[['1','$180M − $150M','$30M'],['T','Uninsured tail','$30M']],
  sources:['Insurance policy (uploaded)','Engine (VaR)'],conf:'Decision 2 lowers the tail below the limit, closing this gap.'},
 transfer:{claim:'Insurance transfer efficiency',result:'83%',cls:'',
  formula:'transfer efficiency  =  min(limit, tail)  ÷  tail',
  inputs:[['Coverage limit','$150M','Insurance policy'],['Worst-case tail','$180M','computed']],
  steps:[['1','min(150,180) ÷ 180','150 ÷ 180'],['T','Share of tail transferred','83%']],
  sources:['Insurance policy','Engine (VaR)'],conf:'The remaining 17% ($30M) is retained risk.'},
 roicfo:{claim:'Return on the top decision (privileged-access closure)',result:'37×',cls:'good',
  formula:'exposure removed  =  exposure(before)  −  exposure(after)\nreturn on spend  =  exposure removed  ÷  cost',
  inputs:[['Before (open path)','$52M','Risk register'],['After (path closed)','~$0','Control model'],['Cost','$1.4M','Decision estimate']],
  steps:[['1','$52M − ~$0','$52M removed'],['2','$52M ÷ $1.4M','≈37×'],['T','Return','37×']],
  sources:['Risk register','Control effectiveness model'],conf:'The single highest-return decision available.'},
 procexpo:{claim:'Exposure carried by a business process',result:'from your data',cls:'',
  formula:'process exposure  =  Σ open-risk exposure on the applications that support this process\n(applications come from the process→app map you drew at onboarding)',
  inputs:[['Applications supporting it','your process→app map','Onboarding'],['Open risks on those apps','risk register','Onboarding'],['Exposure per risk','$ impact','Risk register']],
  steps:[['1','Find the apps that run this process','process→app map'],['2','Sum the open-risk exposure on those apps','Σ'],['T','Exposure carried','ranked vs your other processes']],
  sources:['Your process→application map','Your risk register'],conf:'Ranked from your own inventory — a process with no quantified open risk shows no bar.'},
 controleff:{claim:'Control effectiveness — risk removed by the controls we run',result:'$210M removed',cls:'good',
  formula:'risk removed  =  Σ over each deployed control [ inherent exposure  −  residual exposure after the control ]\n(measured in dollars of expected loss, cumulative over the last 3 years)',
  inputs:[
    ['Privileged access (PAM)','−$78M','Risk register + CyberArk coverage'],
    ['Multi-factor auth (MFA)','−$46M','Identity (Okta) — 96% enrolled'],
    ['Endpoint detection (EDR)','−$38M','CrowdStrike — 98.1% of hosts'],
    ['Immutable backups / DR','−$28M','Backup telemetry — verified daily'],
    ['Network segmentation','−$12M','Firewall/WAF policy'],
    ['Security awareness','−$8M','KnowBe4 — phishing 9%→3%']],
  steps:[
    ['1','Sum each control’s risk bought down','$78M+$46M+$38M+$28M+$12M+$8M'],
    ['2','Cumulative expected-loss reduction (3 yr)','$210M'],
    ['T','Risk removed by controls','$210M']],
  sources:['Control effectiveness model (inherent → residual)','Risk register','Live control telemetry from connected tools (identity, EDR, backup, email)'],
  conf:'Effectiveness is measured as dollars of expected loss removed — not a maturity/CMMI score. Each control’s reduction is the modeled delta between inherent and residual exposure, cross-checked against live coverage from the connected tool.'},
 oversight:{claim:'Oversight & decision record (D&O / SEC defense)',result:'evidenced trail',cls:'good',
  formula:'oversight record  =  every funded decision  →  { deciding leader, option chosen, timestamp, ticket, status }\n(the same decision ledger the CFO and CISO manage — one source of truth)',
  inputs:[['Decisions logged','from the cockpit decision ledger','Your decisions'],['Attributes per decision','leader · date · option · ticket','Decision + ticketing'],['Board appetite review','recorded each quarter','Governance']],
  steps:[['1','Each executive decision is recorded by name','decision ledger'],['2','Pushed to ticketing as a tracked project','Jira / ServiceNow'],['T','A documented, timestamped oversight trail','the D&O / SEC-oversight defense']],
  sources:['Cockpit decision ledger','Connected ticketing system'],conf:'Regulators and plaintiffs test whether the board exercised oversight. This is the contemporaneous, evidenced record of the decisions it made.'},
 contracts:{claim:'Customer contract / DPA notification obligations',result:'add DPAs to quantify',cls:'warn',
  formula:'per-contract duty  =  min( notification window across your customer DPAs )\nliability outlook  =  Σ contractual + regulatory exposure on affected data',
  inputs:[['Contracts with breach-notice clauses','from your DPA register','Upload / legal system'],['Typical customer window','24–72 hours','Contract norms'],['Data under contract','PII / PHI held for customers','Your inventory']],
  steps:[['1','Collect DPAs with notification clauses','legal register'],['2','Take the tightest customer deadline','min()'],['T','Contractual notification duty','often tighter than regulation']],
  sources:['Customer DPAs / MSAs','Your data inventory'],conf:'Contractual clocks often run tighter than regulators’. Upload your DPA register to quantify the binding customer deadline and liability.'},
 inaction:{claim:'Cost of inaction (deferred decisions)',result:'+$92M',cls:'warn',
  formula:'cost of inaction  =  Σ exposure removed by decisions that are NOT yet funded',
  inputs:[['Decision 1 (unfunded)','$52M','Decision ledger'],['Decision 2 (unfunded)','$40M','Decision ledger']],
  steps:[['1','$52M + $40M','$92M'],['T','Exposure carried','+$92M']],
  sources:['Decision ledger','Engine'],conf:'The quantified price of waiting — carried until the decisions are funded.'},
 budgetcut:{claim:'Impact of cutting the cyber budget 20%',result:'+$46M',cls:'crit',
  formula:'new exposure  =  ALE ÷ (control coverage after cut)\npremium impact  =  f( residual exposure )',
  inputs:[['Current ALE','$68M','computed'],['Budget cut','−20% (−$1.8M)','scenario'],['Coverage elasticity','modeled','Engine config']],
  steps:[['1','Reduced coverage raises exposure','$68M → $114M'],['2','Tail rises','$180M → $214M'],['3','Insurer re-rates','premium +18%'],['T','Net effect','+$46M — false economy']],
  sources:['Engine (spend→coverage curve)','Insurance model'],conf:'Modeled · net of premium, the cut costs more than it saves.'},
 clock:{claim:'Fastest notification clock if an event occurred today',result:'72 hours',cls:'warn',
  formula:'binding clock  =  min( notification deadline )  over  { operating countries × data classes }',
  inputs:[['Operating regions','US, EU, UK, APAC','Onboarding'],['Data classes','PII, financial','Onboarding / inventory'],['Tightest rule','GDPR / UK 72h; MAS 1h','Jurisdiction ruleset']],
  steps:[['1','Map regions + data to regimes','GDPR, NIS2, MAS, SEC…'],['2','Take the minimum deadline','72h (1h for MAS notice)'],['T','Binding clock','72 hours']],
  sources:['Operating regions (onboarding)','Data classification','Jurisdiction ruleset (maintained)'],conf:'The incident runbook is timed to meet the tightest clock, not the average.'},
 'juris-us':{claim:'United States — cyber disclosure obligation',result:'4 business days',cls:'warn',
  formula:'trigger  =  material incident determined\ndeadline  =  4 business days to file Form 8-K (Item 1.05)',
  inputs:[['Regime','SEC cyber rule + state breach laws','Jurisdiction ruleset'],['Applies because','US-listed + US customers','Onboarding'],['Materiality line','$53M','computed']],
  steps:[['1','Determine materiality','≥ $53M → material'],['2','Start the clock','4 business days'],['T','File','Form 8-K Item 1.05']],
  sources:['Jurisdiction ruleset','Onboarding regions','Materiality engine'],conf:'SEC filings also trigger FTC / State AG / DOJ coordination.'},
 'juris-eu':{claim:'European Union — breach notification',result:'72 hours',cls:'crit',
  formula:'trigger  =  personal-data breach\ndeadline  =  72 hours to notify the lead supervisory authority (GDPR Art. 33)',
  inputs:[['Regime','GDPR · NIS2 · DORA','Jurisdiction ruleset'],['Applies because','EU data subjects','Onboarding'],['Max penalty','4% of global revenue','GDPR']],
  steps:[['1','Confirm personal-data breach','yes'],['2','Notify lead DPA','≤ 72 hours'],['3','Notify individuals','“without undue delay”'],['T','Max exposure','4% global revenue']],
  sources:['Jurisdiction ruleset','Onboarding regions + data classes'],conf:'DORA adds ICT-incident reporting for financial entities.'},
 'juris-uk':{claim:'United Kingdom — breach notification',result:'72 hours',cls:'crit',
  formula:'trigger  =  personal-data breach\ndeadline  =  72 hours to notify the ICO (UK GDPR / DPA 2018)',
  inputs:[['Regime','UK GDPR · DPA 2018 · ICO','Jurisdiction ruleset'],['Applies because','UK data subjects','Onboarding'],['Max penalty','£17.5M or 4% of global turnover','ICO']],
  steps:[['1','Confirm personal-data breach','yes'],['2','Notify the ICO','≤ 72 hours'],['3','Notify individuals if high risk','“without undue delay”'],['T','Max exposure','£17.5M / 4%']],
  sources:['Jurisdiction ruleset','Onboarding regions + data classes'],conf:'Statutory (UK GDPR / DPA 2018); the binding clock for you depends on the regions you operate in.'},
 'juris-sg':{claim:'Singapore — breach notification',result:'72h PDPC · 1h MAS',cls:'crit',
  formula:'PDPA  =  ≤ 3 days to notify the PDPC of a notifiable breach\nMAS  =  ≤ 1 hour to notify MAS of a relevant incident (Notice 655 / TRM)',
  inputs:[['Regime','PDPA · MAS TRM / Notice 655','Jurisdiction ruleset'],['Applies because','SG data subjects / MAS-regulated','Onboarding'],['Max penalty','S$1M or 10% of annual turnover (PDPA)','PDPC']],
  steps:[['1','Assess notifiability (≥500 individuals or significant harm)','—'],['2','Notify the PDPC','≤ 3 days'],['3','Financial institutions: notify MAS','≤ 1 hour'],['T','Max exposure','S$1M / 10%']],
  sources:['Jurisdiction ruleset','Onboarding regions + data classes'],conf:'Statutory (PDPA + MAS); the 1-hour MAS clock applies to regulated financial institutions.'},
 'juris-au':{claim:'Australia — breach notification',result:'72 hours (APRA)',cls:'warn',
  formula:'NDB  =  notify the OAIC “as soon as practicable” for eligible data breaches\nAPRA CPS 234  =  ≤ 72 hours to notify APRA of a material information-security incident',
  inputs:[['Regime','Privacy Act (NDB) · APRA CPS 234','Jurisdiction ruleset'],['Applies because','AU data subjects / APRA-regulated','Onboarding'],['Max penalty','Up to A$50M (Privacy Act, serious/repeated)','OAIC']],
  steps:[['1','Assess eligible data breach (likely serious harm)','—'],['2','Notify the OAIC + individuals','as soon as practicable'],['3','APRA-regulated: notify APRA','≤ 72 hours'],['T','Max exposure','A$50M']],
  sources:['Jurisdiction ruleset','Onboarding regions + data classes'],conf:'Statutory (Privacy Act 2022 amendment + APRA CPS 234).'},
 correlation:{claim:'Aggregation — correlated events that breach appetite',result:'$205M',cls:'crit',
  formula:'joint loss  =  L(payments outage)  +  L(top-vendor failure)   [correlated, not independent]',
  inputs:[['Payments outage','$140M scenario','Engine scenario'],['Top-vendor failure','$65M scenario','Dependency map'],['Appetite','$120M','Board input'],['Enterprise tail','$180M','ERM']],
  steps:[['1','Couple the two correlated events','$140M + $65M'],['2','Compare to enterprise tail','$205M > $180M'],['T','Verdict','breaches appetite — addressable by Decisions 1–2']],
  sources:['Dependency graph','ERM risk values','Engine scenarios'],conf:'Modeled with correlation, so the tail is real — not a sum of independent risks.'},
 downtime:{claim:'What one hour of payments downtime costs',result:'$2.3M / hr',cls:'warn',
  formula:'cost per hour  =  process revenue contribution  ÷  operating hours',
  inputs:[['Payments revenue','$20.1B / yr attributed','Onboarding / BIA'],['Operating hours','8,760 / yr','standard'],['Direct + downstream','included','BIA weighting']],
  steps:[['1','Attributed revenue ÷ hours','≈ $2.3M/hr'],['T','Cost of downtime','$2.3M / hr']],
  sources:['Business-process revenue (onboarding/BIA)','Dependency map'],conf:'Corporate IT, by contrast, is < $40K/hr.'},
 recovery:{claim:'Worst-case recovery time for revenue systems',result:'3.1 days',cls:'warn',
  formula:'worst-case recovery  =  max( actual RTO )  over revenue-critical systems',
  inputs:[['Payments recovery','74 hrs','DR capability (onboarding)'],['Portal recovery','40 hrs','DR capability'],['Target','< 6 hrs','Decision 2']],
  steps:[['1','Take the slowest revenue system','74 hrs'],['2','Convert to days','≈ 3.1 days'],['T','Worst-case recovery','3.1 days']],
  sources:['Per-system recovery capability (onboarding)','Revenue-system inventory'],conf:'Decision 2 brings this under 6 hours for revenue systems.'},
 vendor:{claim:'Single-vendor blast radius',result:'$3.8M / hr',cls:'crit',
  formula:'blast radius  =  Σ ( revenue/hr of every system that depends on this vendor )',
  inputs:[['Cloud provider “A” underpins','Payments, Portal, Settlement','Asset→vendor map'],['Combined revenue/hr','$3.8M','Downtime model']],
  steps:[['1','Find systems depending on vendor A','3'],['2','Sum their revenue/hr','$3.8M/hr'],['T','Blast radius','$3.8M/hr (≈$91M/day)']],
  sources:['Asset→vendor mapping (onboarding)','Downtime model'],conf:'Multi-region ($2.1M) removes the shared point of failure.'},
 notifications:{claim:'Open regulatory notifications',result:'0',cls:'good',
  formula:'open notifications  =  count( incidents where notice is required AND not yet filed )',
  inputs:[['Active material incidents','0','Incident register / SIEM'],['Jurisdictions in scope','US, EU, UK, APAC','Onboarding']],
  steps:[['1','No material incident is open','0 required'],['T','Open notifications','0']],
  sources:['Incident register','Jurisdiction ruleset'],conf:'Clean today; the moment an incident is material, the jurisdiction clocks start.'},
 liability:{claim:'Legal liability — class-action / notification exposure',result:'$22M',cls:'warn',
  formula:'class-action exposure  =  sensitive records held  ×  cost per record\nregulatory ceiling  =  the binding jurisdiction’s maximum penalty (shown separately)',
  inputs:[['Sensitive records held','from onboarding','Onboarding — data footprint'],['Cost per record','$165','IBM Cost of a Data Breach (benchmark)'],['Regulatory ceiling','from jurisdiction','Jurisdiction ruleset']],
  steps:[['1','records × $165 per record','class-action / notification cost'],['2','Add the binding regulatory penalty ceiling','+ regulatory'],['T','Liability exposure','records × $165 (+ fines)']],
  sources:['Your record count (onboarding)','IBM Cost of a Data Breach per-record benchmark','Jurisdiction ruleset'],conf:'The class-action/notification figure is computed from your own record count; regulatory fines are the statutory ceiling for your binding jurisdiction.'},
 airisk:{claim:'AI-accelerated expected loss',result:'modeled',cls:'warn',
  formula:'AI premium  =  internet-facing crown-jewel exposure  ×  Δ exploitation likelihood\nΔ likelihood  =  unpatched share  ×  ( 1  −  AI window ÷ baseline window )',
  inputs:[['Internet-facing crown-jewel exposure','from your inventory + risk register','Engine'],['Unpatched share','1 − patch coverage','Live vuln-mgmt signal (or 40% default)'],['Baseline exploit window','~30 days','Historical CVE weaponization'],['AI-compressed window','~5 days','Frontier-AI-assisted (modeled)']],
  steps:[['1','Exposure on internet-facing crown jewels','material exposure × internet-facing share'],['2','Δ likelihood from window compression','unpatched × (1 − 5/30)'],['T','AI-accelerated expected loss','exposure × Δ likelihood']],
  sources:['Your inventory (internet-facing crown jewels)','Live patch coverage from vuln management','Modeled exploit-window assumptions'],conf:'Modeled. The exploit-window compression is the assumption (frontier models like Mythos auto-generate working exploits); the exposure and patch coverage are your real data. Raising patch coverage or cutting internet-facing crown jewels lowers this directly.'},
 techdebt:{claim:'Tech-debt exposure (end-of-life systems)',result:'$12M',cls:'warn',
  formula:'tech-debt exposure  =  Σ open-risk exposure on EOL / unsupported assets',
  inputs:[['EOL / unsupported assets','from inventory','Onboarding — EOL column'],['Their open-risk exposure','summed','Risk register']],
  steps:[['1','Flag EOL/unsupported assets','n'],['2','Sum their open-risk exposure','$12M'],['T','Tech-debt exposure','$12M']],
  sources:['Systems inventory (EOL)','Risk register'],conf:'Prioritize modernization by revenue protected per dollar.'},
 threatstatus:{claim:'Live threat status',result:'No active compromise',cls:'good',
  formula:'status  =  correlate live events vs. compromise patterns; flag if any match',
  inputs:[['Events correlated (24h)','312,400','Connected SIEM'],['Compromise-pattern matches','0','Detection engine']],
  steps:[['1','Correlate live events','312,400'],['2','Match to compromise patterns','0 matched'],['T','Status','no active compromise']],
  sources:['Connected SIEM / EDR (live signals)'],conf:'Live from connected tools — real the moment a SIEM/EDR is connected.'},
 coverage:{claim:'Control coverage from connected tools',result:'99.4%',cls:'',
  formula:'coverage  =  covered in-scope assets  ÷  total in-scope assets  (across connected tools)',
  inputs:[['EDR coverage','98.1%','Connected EDR'],['MFA adoption','96%','Connected IdP'],['Named gaps','listed & costed','Signals']],
  steps:[['1','Aggregate per-tool coverage','weighted'],['T','Coverage','99.4%']],
  sources:['Connected security tools (live signals)'],conf:'Live once tools are connected; gaps are named and costed, never hidden.'}
};
