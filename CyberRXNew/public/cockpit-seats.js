/* CyberRx cockpit — seat content + evidence, rendered by cockpit.html's helpers.
   Every claim (data-ev) has an EV entry: formula, inputs (value+source), math. */

var SEATS = {
 ceo:{
  eyebrow:'Executive summary · CEO / Board',
  verdict:'Cyber risk is <span class="em">managed and within the board’s approved tolerance.</span> The worst-case tail sits above appetite, and one funded decision this quarter brings it back in line.',
  sub:'Your cyber position in the same terms as every other enterprise risk. Every figure is clickable — open it to see the exact formula, the inputs used, and the math.',
  brief:'Here is where we stand. Cyber risk is a managed business risk, and today it is within the board’s approved tolerance. Our expected annual loss is about sixty-eight million dollars — under one percent of revenue. The one thing to watch is the worst-case tail, which sits above appetite; one funded decision this quarter brings it back in line. Every figure on the screen traces to your own data.',
  body:function(){return (
   sec('01','How much is at stake — and are we within the board’s limit?','Cyber risk in dollars, measured against the appetite the board approved. Every figure is computed from your financials and risk register.',
     tiles([
      {k:'Expected annual loss',v:'<span id="lvExpo">$68M</span>',ev:'ale',note:'<span class="pill good" id="lvAleWithin">Within appetite</span> &nbsp;<span class="claim" data-ev="pctrev"><span id="lvPctRev">≈0.8% of revenue</span> <span class="fx">ƒ</span></span>'},
      {k:'Worst-case tail (95%)',v:'<span id="lvTail">$180M</span>',cls:'warn',ev:'tail',note:'<span class="pill warn" id="lvTailWithin">Above appetite</span> &nbsp;vs appetite <span class="claim" data-ev="appetite"><span id="lvAppetite">$120M</span> <span class="fx">ƒ</span></span>'},
      {k:'Materiality threshold',v:'<span id="lvMateriality">$53M</span>',ev:'materiality',note:'<span id="lvMatBasis">the loss large enough to be financially material to disclose</span>'}]))
   +sec('02','Which business processes carry the risk?','Your key processes from onboarding, ranked by the dollars of exposure each carries. Click any process for the math.',
     '<div id="ceoProcBars">'+bars([
      {l:'Claims &amp; payments processing',ev:'proc-claims',v:'$34M',pct:100,cls:'hot'},
      {l:'Policy administration',ev:'proc-policy',v:'$18M',pct:53},
      {l:'Trading &amp; settlement',ev:'proc-settlement',v:'$11M',pct:32},
      {l:'Member portal &amp; servicing',ev:'proc-member',v:'$5M',pct:15}])+'</div>')
   +sec('03','What decisions need us — and what are the trade-offs?','Each decision is a plain-English choice with options, pros and cons. Choosing one records it to your ticketing system and tracks it to completion. Option costs and returns are modeled estimates your security team refines against these live exposure figures.',
     decisions([
      {n:1,q:'Should we close the privileged path into payments?',sit:'A few over-privileged IT accounts can reach the payments database directly — the single biggest reason exposure is $68M. Three ways to handle it:',
       opts:[
        {rec:true,tag:'A · Fund it now',on:'Option A · Fund it now',osum:'$1.4M · 3 weeks',pros:['Removes ~$52M of exposure (37× return)','Brings the worst case within appetite','Strengthens insurance renewal'],cons:['$1.4M this quarter','3 weeks of identity-team effort']},
        {tag:'B · Phase over 2 quarters',on:'Option B · Phase it',osum:'$1.4M spread',pros:['Spreads the $1.4M across two quarters','Less disruption to the identity team now'],cons:['~$26M of the $52M stays open for 6 months','Worst-case tail stays above the $120M appetite until done']},
        {tag:'C · Accept &amp; monitor',on:'Option C · Accept',osum:'$0 · formal acceptance',pros:['No capital spend this quarter'],cons:['Leaves the full $52M exposure open','Requires a documented board risk-acceptance (D&O exposure)','Insurer likely re-rates the payments path at renewal']}]},
      {n:2,q:'How fast should we be able to recover our revenue systems?',sit:'Our slowest revenue system takes ~3.1 days to recover, driving most of the tail. Three investment levels:',
       opts:[
        {rec:true,tag:'A · Full modernization',on:'Option A · Full',osum:'$3.2M · <6h recovery',pros:['Cuts worst case by ~$40M','Tail below appetite','Meets regulatory recovery expectations'],cons:['$3.2M capital','One-quarter program']},
        {tag:'B · Critical systems only',on:'Option B · Critical only',osum:'$1.6M',pros:['Protects the two highest-value systems','Half the cost'],cons:['Portal recovery stays slow','Removes ~$24M of $40M']},
        {tag:'C · Defer',on:'Option C · Defer',osum:'$0 this year',pros:['Zero capital this year'],cons:['Worst-case tail stays $180M — above the $120M appetite','Insurer likely raises premium at renewal']}]}]))
   +sec('04','Are we adequately insured against the worst case?','Whether your cyber-insurance coverage matches the modeled worst case — and the renewal position. From the policy you entered at onboarding.',
     '<div class="cols"><div class="card"><div class="ck">Answer</div><div class="cv" id="lvInsAnswer" style="font-size:20px;line-height:1.35">Mostly — <span class="warn">a $30M tail is uninsured</span></div><div style="display:flex;gap:24px;margin-top:14px"><div><div class="cv" style="font-size:20px" id="lvCoverage">$150M</div><div class="cn">coverage limit</div></div><div><div class="cv crit claim" data-ev="insgap" style="font-size:20px"><span id="lvGapCeo">$30M</span> <span class="fx">ƒ</span></div><div class="cn">uninsured tail</div></div><div><div class="cv" style="font-size:20px" id="lvPremium">$4.2M</div><div class="cn" id="lvRenewalNote">annual premium</div></div></div></div>'
     +kvcard('How much of the risk is transferred?',[{k:'Transfer efficiency',v:'<span id="lvTransfer">83%</span>',ev:'transfer'},{k:'Retained (uninsured) tail',v:'<span id="lvRetained">$30M</span>',cls:'crit'},{k:'Funding recovery',v:'narrows the gap',cls:'good'}])+'</div>')
   +sec('05','Are we getting better — quarter over quarter?','The board’s trend line: your expected loss over time. CyberRx records your position on every analysis, so this is your <b>real</b> history — it builds from your first go-live. Nothing here is back-filled.',
     '<div id="ceoTrend"></div><div class="card" style="margin-top:12px"><div class="ck">Peer benchmark</div><div class="cn" style="margin-top:6px">◐ <b>Opt-in.</b> Connect the anonymized peer benchmark to see your resilience percentile and avoidable-exposure gap versus peers at your revenue scale. Cohorts under 8 organizations are never shown, and only high-level figures leave your tenant. <b>Not yet enabled</b> — no percentile is fabricated.</div></div>')
   +sec('06','Our worst realistic day — and are we ready to respond and recover?','A concrete severe-but-plausible scenario in dollars and days, our steady-state response readiness, and where a single provider is a systemic point of failure.',
     '<div class="cols"><div class="card" id="ceoStress"><div class="ck">Severe-but-plausible scenario</div><div class="cn" style="margin-top:8px">◐ Illustrative until go-live — modeled from your top crown jewel, its largest open risk, worst-case recovery and your binding regulatory clock.</div></div>'
     +'<div class="card" id="ceoReadiness"><div class="ck">Response &amp; recovery readiness</div><div class="cn" style="margin-top:8px">◐ Add your incident-readiness answers in onboarding (IR plan tested, tabletop, retainer, ransomware policy).</div></div></div>'
     +'<div id="ceoThirdParty" style="margin-top:14px"></div>')
   +sec('07','Governance, oversight &amp; SEC disclosure readiness','How the board oversees cyber — the structure SEC Reg S-K Item 106 requires you to disclose — plus the evidenced decision log that is your D&amp;O defense.',
     '<div id="ceoGov"><div class="card"><div class="ck">Board oversight structure · SEC Item 106</div><div class="cn" style="margin-top:8px">◐ Add your board-governance answers in onboarding to make this filing-ready.</div></div></div>'
     +'<div id="ceoOversight" style="margin-top:14px">'+kvcard('Oversight &amp; decision record',[{k:'Funded decisions logged',v:'from your decisions',ev:'oversight'},{k:'Each carries',v:'leader · date · ticket',ev:'oversight'},{k:'Board-appetite reviewed',v:'this quarter',cls:'good'},{k:'Defensibility',v:'evidenced trail',cls:'good',ev:'oversight'}])+'</div>')
   +sec('08','AI risk — are we ready for AI-accelerated attacks, and is our own AI governed?','The board’s two AI questions: our exposure as frontier models (e.g. Anthropic’s <b>Mythos</b>) make attackers faster at finding and exploiting weaknesses, and whether the AI we run is governed and compliant (NIST AI RMF · ISO 42001 · EU AI Act).',
     '<div id="ceoAiRisk"><div class="card"><div class="cn">◐ Add your AI-governance answers in onboarding, and connect vulnerability management, to populate this from live data.</div></div></div>')
  );}
 },

 cfo:{
  eyebrow:'Financial view · CFO',
  verdict:'Cyber loss is <span class="em">quantified, insured, and returning ~9× on spend.</span> A $30M uninsured tail and $92M carried on deferred decisions are the open financial items.',
  sub:'Cyber as a line on the risk-adjusted balance sheet: expected loss, capital at risk, insurance economics, and the marginal return on the next dollar. Click any figure for the math.',
  brief:'From a finance view: our capital at risk is quantified — sixty-eight million expected, and a hundred and eighty million at the tail. Every dollar of security spend is returning about nine dollars of risk reduction. The two open items are a thirty-million uninsured tail, and ninety-two million of exposure we are carrying on decisions we have not funded yet. Funding the top decision returns thirty-seven to one.',
  body:function(){return (
   sec('01','What is our capital at risk — and is our spend working?','Capital at risk from your financials and risk register; return figures are modeled from your control data and refined with your team.',
     tiles([
      {k:'Expected annual loss',v:'<span id="lvExpoCfo">$68M</span>',ev:'ale',note:'<span id="lvCfoPctRev">≈0.8% of revenue</span> · provisioned'},
      {k:'Value-at-Risk (95%)',v:'<span id="lvTailCfo">$180M</span>',cls:'warn',ev:'tail',note:'<span id="lvCfoPctEV">0.6% of enterprise value</span>'},
      {k:'Return on security spend',v:'<span id="lvCfoRoiVal">$1 → $9</span>',ev:'roicfo',note:'<span id="lvCfoRoiNote"><span class="pill mod">modeled</span> risk reduced per dollar</span>'},
      {k:'Cost of inaction',v:'+$92M',cls:'warn',ev:'inaction',note:'<span class="pill mod">modeled</span> exposure on deferred decisions'}]))
   +sec('02','What would a bad year do to earnings?','Cyber loss in the terms only finance can put in front of the board — share of annual earnings, EPS impact, days of operating income, and revenue at risk per day of downtime. Computed from your net income, operating income, shares outstanding and downtime cost.',
     '<div id="cfoEarnings"><div class="card"><div class="cn">◐ Add net income, operating income (for days-of-operating-income) and shares outstanding (for EPS) in onboarding to translate cyber loss into earnings, days and EPS impact.</div></div></div>')
   +sec('03','Where does the next dollar work hardest, and are we insured?','Marginal return by program (modeled from your control effectiveness), and whether your insurance coverage matches the modeled tail.',
     '<div class="cols">'
     +bars([{l:'Privileged access',v:'37×',pct:100,cls:''},{l:'Recovery / DR',v:'13×',pct:52},{l:'Data protection',v:'8×',pct:34},{l:'Awareness training',v:'6×',pct:26},{l:'Endpoint (saturated)',v:'1.4×',pct:8}])
     +kvcard('Insurance economics',[{k:'Coverage limit',v:'<span id="lvCfoCoverage">$150M</span>'},{k:'Uninsured tail',v:'<span id="lvCfoGap">$30M</span>',cls:'crit',ev:'insgap'},{k:'Annual premium',v:'<span id="lvCfoPremium">$4.2M / yr</span>'},{k:'Transfer efficiency',v:'<span id="lvCfoTransfer">83%</span>',ev:'transfer'},{k:'Renewal',v:'<span id="lvCfoRenewal">92 days</span>'}])+'</div>')
   +sec('04','What if we change the budget — and is an incident material?','The two questions finance owns: the budget trade-off (a modeled scenario) and the disclosure threshold (computed from your financials).',
     lists([
      {c:'c',ic:'↓',t:'<span class="pill mod">modeled</span> Cut budget −20% → +$46M exposure, tail $214M, premium +18%',ev:'budgetcut',s:'Net of premium, the cut costs more than it saves.'},
      {c:'g',ic:'↑',t:'<span class="pill mod">modeled</span> Fund the top decision (+$1.4M) → exposure $16M, 37× return',ev:'roicfo',s:'Closes the payments driver; tail returns within appetite.'},
      {c:'w',ic:'§',t:'Materiality threshold <span id="lvCfoMateriality">$53M</span> — a crown-jewel event is reportable',ev:'materiality',s:'The 4-business-day SEC clock and a pre-staged 8-K keep the disclosure defensible.'}]))
   +sec('05','What decision needs the CFO — and what does it cost or buy?','A costed choice with options; choosing one records to your ticketing system and is tracked to completion.',
     decisions([{n:1,q:'How should we fund cyber-risk reduction this year?',sit:'Two funded decisions would remove $92M of exposure and strengthen the insurance renewal. How much do we commit this year?',opts:[
       {rec:true,tag:'A · Fund both ($4.6M)',on:'Option A · Fund both',osum:'$4.6M · 20× blended',pros:['Removes ~$92M of exposure','Brings the tail within appetite','Stronger insurance renewal position'],cons:['$4.6M capital this year']},
       {tag:'B · Highest-ROI only ($1.4M)',on:'Option B · Top driver only',osum:'$1.4M · 37×',pros:['37× return — closes the $52M payments driver','Only $1.4M of capital this year'],cons:['Leaves the $40M recovery tail over appetite','Insurance renewal position improves only partially']},
       {tag:'C · Hold flat',on:'Option C · Hold',osum:'$0 new',pros:['No new spend this year'],cons:['Carries the full $92M as open exposure','Likely 15–18% premium increase at renewal','Two known drivers stay unfunded']}]}]))
   +sec('06','Current cyber initiatives & their ROI','Every funded decision becomes a tracked project. This is the live portfolio of new cyber spend — cost, return, owner and status — that the CISO and CFO manage together.',
     '<div id="initiatives-panel"></div>')
  );}
 },

 clo:{
  eyebrow:'Legal & regulatory view · CLO / General Counsel',
  verdict:'The organization is <span class="em">defensible across all operating jurisdictions</span> today — no reportable events, evidence preserved. Two obligations have clocks to watch.',
  sub:'Cyber as legal exposure: disclosure standing, notification duties by country, and the modeled liability if an event occurs — with the clock on each.',
  brief:'Legally, we are defensible across every jurisdiction we operate in today — no reportable events, and evidence is preserved. The clocks to watch are the seventy-two-hour European deadline and the four-business-day S.E.C. rule. If an incident became material, the determination process and the draft filings are already pre-staged, which is what protects the directors.',
  body:function(){return (
   sec('01','Are we legally defensible right now?','Disclosure standing, notification readiness, and litigation posture — clocks and liability computed from your regions, data classes and record count.',
     tiles([
      {k:'Open notifications',v:'0',cls:'good',ev:'notifications',note:'<span id="lvCloNotif">no material incident open</span>'},
      {k:'Materiality standing',v:'No reportable event',cls:'good',ev:'materiality',note:'SEC clock not running until an event clears the threshold'},
      {k:'Class-action exposure',v:'<span id="lvCloLiability">$22M</span>',cls:'warn',ev:'liability',note:'<span id="lvCloLiabNote">records × per-record cost</span>'},
      {k:'Fastest clock',v:'<span id="lvClock">72 hours</span>',ev:'clock',note:'the binding notification deadline today'}]))
   +sec('02','Where are we exposed by jurisdiction — duty, clock, penalty?','Where we operate, the binding obligation, and the ceiling. Click a jurisdiction for the rule.',
     '<div id="cloJuris">'+jtable([
      {flag:'🇺🇸',c:'United States',ev:'juris-us',o:'SEC 8-K + 54 state breach laws',clock:'4 business days',cc:'warn',pen:'Disclosure + enforcement'},
      {flag:'🇪🇺',c:'European Union',ev:'juris-eu',o:'GDPR · NIS2 · DORA',clock:'72 hours',cc:'crit',pen:'Up to 4% of global revenue'},
      {flag:'🇬🇧',c:'United Kingdom',o:'UK GDPR / ICO',clock:'72 hours',cc:'crit',pen:'£17.5M or 4%'},
      {flag:'🇸🇬',c:'Singapore',o:'PDPA · MAS TRM',clock:'72h / 1h (MAS)',cc:'crit',pen:'Up to S$1M'},
      {flag:'🇦🇺',c:'Australia',o:'Privacy Act · APRA CPS 234',clock:'72 hours',cc:'warn',pen:'Up to A$50M'}])+'</div>')
   +sec('03','What decision needs the General Counsel?','How we run disclosure & notification. Choosing one records to your ticketing system.',
     decisions([{n:1,q:'How do we run the disclosure & notification process?',sit:'If an incident is material we face a 4-business-day SEC clock and a 72-hour GDPR clock. How do we prepare?',opts:[
       {rec:true,tag:'A · Standing disclosure committee',on:'Option A · Pre-authorize',osum:'committee + pre-drafted filings',pros:['Meets the 4-business-day SEC and 72-hour GDPR clocks','Defensible, documented materiality determination','Protects directors under D&amp;O'],cons:['Requires setup effort this quarter (charter + templates)']},
       {tag:'B · Ad-hoc at incident time',on:'Option B · Ad-hoc',osum:'no upfront work',pros:['No setup cost today'],cons:['High risk of missing the 4-day / 72-hour clock','Weaker legal defense on the materiality call','Filings drafted under time pressure']},
       {tag:'C · External breach counsel on retainer',on:'Option C · Retainer',osum:'counsel on call',pros:['Specialist breach counsel on demand','Privilege established before an incident'],cons:['Annual retainer cost','Slower first hours vs. a standing internal committee']}]}]))
   +sec('04','Is an incident material — and are we covered by contract?','The two calls the General Counsel owns beyond disclosure: the materiality determination (who signs, by when, on the record) and the contract/DPA obligations to customers.',
     '<div id="cloMateriality" style="margin-bottom:16px"></div><div class="cols">'
     +kvcard('Materiality determination',[{k:'Threshold (reportable at)',v:'<span id="lvCloMateriality">$53M</span>',ev:'materiality'},{k:'Sign-off',v:'CFO · GC · CISO · CIO'},{k:'SEC clock once material',v:'4 business days',ev:'clock'},{k:'Evidenced &amp; logged',v:'Yes — D&amp;O defense',cls:'good',ev:'oversight'}])
     +kvcard('Customer contract / DPA obligations',[{k:'Contracts with notice clauses',v:'—',ev:'contracts'},{k:'Tightest customer deadline',v:'often 24–72h',ev:'contracts'},{k:'Class-action exposure',v:'<span id="lvCloLiability2">$22M</span>',cls:'warn',ev:'liability'},{k:'Status',v:'Add DPAs to quantify',cls:'warn'}])+'</div>')
  );}
 },

 cro:{
  eyebrow:'Enterprise risk view · CRO',
  verdict:'Cyber is <span class="em">within appetite and fully quantified,</span> and now sits alongside your other principal risks on one scale. The watch item is correlation at the tail.',
  sub:'Cyber inside the enterprise risk portfolio: measured in the same currency as every other risk, tested for correlation and aggregation, tracked against appetite.',
  brief:'Cyber now sits on the same dollar scale as our other principal risks, and it is within appetite at sixty-eight million. The item to watch is correlation: a payments event couples with third-party and operational risk, and together they can breach appetite at the tail. Two decisions bring that back inside. Our emerging-risk radar flags A.I. decisioning and vendor concentration as the fastest movers.',
  body:function(){return (
   sec('01','Where does cyber sit against appetite and our other risks?','Cyber measured in the same dollars as every other principal risk — computed from your risk register and board appetite.',
     tiles([
      {k:'Cyber vs. appetite',v:'<span id="lvCroAle">$68M</span> / <span id="lvCroAppetite">$120M</span>',cls:'good',ev:'appetite',note:'<span id="lvCroAppetitePct">57% of allocated appetite</span>'},
      {k:'Concentration',v:'<span id="lvCroConc">50% in payments</span>',cls:'warn',ev:'procexpo',note:'one process carries most of the risk'},
      {k:'Correlation flag',v:'2 risks',cls:'warn',ev:'correlation',note:'<span class="pill mod">modeled</span> couples with third-party + operational'},
      {k:'Risk transferred',v:'<span id="lvCroTransfer">83%</span>',ev:'transfer',note:'of the tail, via insurance'}]))
   +sec('02','What could breach appetite, and what is rising fastest?','Cyber on one scale beside your other principal risks. Your <b>cyber</b> figure is live; the other principal-risk values are your ERM inputs — <span class="pill mod">illustrative</span> until entered.',
     '<div id="croPortfolio">'+bars([{l:'Credit / market',v:'$210M',pct:100},{l:'Operational',v:'$140M',pct:67},{l:'Cyber',v:'<span id="lvCroCyber">$68M</span>',pct:32,cls:'hot'},{l:'Third-party',v:'$54M',pct:26},{l:'Compliance',v:'$30M',pct:14}])+'</div>'
     +lists([
      {c:'c',ic:'▲',t:'<span class="pill mod">modeled</span> AI / automated decisioning — velocity high, adaptation forming',s:'Emerging-risk radar — refine with your risk team.'},
      {c:'w',ic:'▲',t:'<span class="pill mod">modeled</span> Third-party &amp; cloud concentration — velocity high',ev:'vendor',s:'A single provider underpins multiple revenue systems.'},
      {c:'b',ic:'◐',t:'<span class="pill mod">modeled</span> Quantum / crypto obsolescence — velocity medium, planned',s:'Long-dated data exposed; migration staged.'}]))
   +sec('03','What decision needs the CRO?','How we bring the correlated tail within appetite. Choosing one records to your ticketing system.',
     decisions([{n:1,q:'How do we bring the correlated tail within appetite?',sit:'A correlated payments + top-vendor event models at $205M — above the $180M enterprise tail. Three levers:',opts:[
       {rec:true,tag:'A · Reduce (fund PAM + DR)',on:'Option A · Reduce',osum:'$4.6M · removes $92M',pros:['Cuts likelihood and impact','De-correlates the payments path','Tail returns within appetite'],cons:['$4.6M capital']},
       {tag:'B · Transfer (raise insurance limit)',on:'Option B · Transfer',osum:'+$1.1M premium',pros:['Caps the financial tail via a higher limit','Fast to execute at renewal'],cons:['~$1.1M higher annual premium','Does not reduce likelihood or de-correlate the path','Coverage still excludes some tail scenarios']},
       {tag:'C · Accept the tail',on:'Option C · Accept',osum:'$0',pros:['No capital spend'],cons:['Correlated tail stays $205M — above the $180M enterprise limit','Requires a documented board risk-acceptance']}]}]))
  );}
 },

 cio:{
  eyebrow:'Operational resilience view · CIO',
  verdict:'Every revenue-critical system is <span class="em">operating and recoverable.</span> The slowest recovery is 3.1 days; one investment cuts it to hours. A single vendor underpins three systems.',
  sub:'Cyber and resilience for the systems that carry the business: what each is worth per hour, how fast it recovers, and where a single provider is a point of failure.',
  brief:'Operationally, every revenue system is running and recoverable. The slowest one recovers in about three days, and that drives most of our worst case — a single investment cuts it to under six hours. The concentration to fix is one cloud vendor that underpins three revenue systems; if it fails, all three degrade at roughly three point eight million dollars an hour.',
  body:function(){return (
   sec('01','Can the business keep operating — and recover fast enough?','Resilience in revenue terms, not RTO jargon.',
     tiles([
      {k:'What downtime costs',v:'<span id="lvDowntime">$2.3M / hr</span>',cls:'warn',ev:'downtime',note:'on the top revenue dependency'},
      {k:'Worst-case recovery',v:'<span id="lvRecovery">3.1 days</span>',cls:'warn',ev:'recovery',note:'target <6h (Decision 2)'},
      {k:'Vendor concentration',v:'<span id="lvVendor">1 vendor, 3 systems</span>',cls:'warn',ev:'vendor',note:'a single point of failure'},
      {k:'Tech-debt exposure',v:'<span id="lvTechDebt">$12M</span>',cls:'warn',ev:'techdebt',note:'end-of-life systems on revenue paths'}]))
   +sec('02','Which systems carry the business, and how fast do they recover?','These are your <b>crown-jewel systems</b> — ranked by what an hour of downtime costs. Recovery investment follows revenue.',
     '<div id="cioSystems">'+bars([{l:'Payments ($2.3M/hr)',v:'74 hrs',pct:100,cls:'hot',ev:'recovery'},{l:'Member portal ($0.6M/hr)',v:'40 hrs',pct:54},{l:'Settlement ($0.9M/hr)',v:'28 hrs',pct:38},{l:'Corporate IT (<$40K/hr)',v:'8 hrs',pct:11}])+'</div>')
   +sec('03','What decision needs the CIO?','How much recovery resilience we fund. Choosing one records to your ticketing system.',
     decisions([{n:1,q:'How much recovery resilience do we fund?',sit:'Our slowest revenue system recovers in ~3.1 days, driving most of the worst-case tail. Three levels:',opts:[
       {rec:true,tag:'A · Full modernization',on:'Option A · Full',osum:'$3.2M · <6h recovery',pros:['Cuts worst case by ~$40M','Meets regulatory recovery expectations','Removes the single-vendor risk (multi-region)'],cons:['$3.2M capital','One-quarter program']},
       {tag:'B · Critical systems only',on:'Option B · Critical only',osum:'$1.6M',pros:['Protects payments &amp; settlement (the top $/hr systems)','Half the capital of full modernization'],cons:['Member-portal recovery stays at ~40 hrs','Removes only ~$24M of the $40M tail driver']},
       {tag:'C · Defer',on:'Option C · Defer',osum:'$0 this year',pros:['Zero capital this year'],cons:['Worst-case recovery stays 3.1 days','Tail stays $180M — above the $120M appetite','Weakens the insurance renewal position']}]}]))
  );}
 },

 ciso:{
  eyebrow:'Security operating view · CISO',
  verdict:'<span class="em">No active compromise, and the program is improving.</span> The largest exposure driver has a funded decision ready; control effectiveness is measured as dollars of risk removed.',
  sub:'The operator’s seat — still in business terms: what drives exposure, which decisions close it, and control effectiveness as risk removed, not maturity scores. This number rolls up to the board.',
  brief:'No active compromise, and the program is improving. The biggest dollar driver is the privileged path into payments — fifty-two million — and it has a funded decision ready to close it. We measure our controls by the risk they remove, not by a maturity score, and this is the same number that rolls straight up to the board and the C.F.O.',
  body:function(){return (
   sec('01','Are we under attack right now?','The first question every morning — is anything on fire? This is your live operating picture: active incidents, the health of your security tools, how much of the attacker playbook (MITRE ATT&CK) you can see, and any key-vendor trouble — each with what the team is doing about it. If an incident is confirmed, the War Room opens here.',
     '<div id="cisoWarRoom" style="margin-bottom:14px"></div><div id="cisoOps"></div>')
   +sec('02','What are we protecting — and what is each worth?','Before controls or spend, the thing that matters: your crown jewels — the systems whose loss would hurt the business most. Each shows the transactions and dollars it carries every day, today’s open-risk exposure, how exposed it is to attack, and how fast it recovers — so exposure lives here, on the assets themselves.',
     '<div id="cjchain"></div>')
   +sec('03','How is security helping the business grow — and win deals?','Security is not only a cost that avoids loss — it is a sales accelerant. Here is the pipeline moving through security review, how fast we clear it, the certifications that are the price of admission in our market, and the trust we can sell. This is the growth side of the ledger.',
     '<div id="cisoGrowth"></div>')
   +sec('04','Are our controls actually working — and is the program improving?','Three questions the board actually asks: is our security spend working (the dollars of risk our controls have removed), are we getting better (expected loss over time), and how fast do we detect and respond. Then the live control gaps that still carry risk — each with the funded project closing it. Click any card for the math and the source.',
     '<div id="cisoControls"></div>')
   +sec('05','AI risk — two fronts: securing the AI we run, and using AI to defend','Two questions the board is asking about AI, both answered from your tools. <b>1 · Securing the AI we build & run</b> — the agents, generative-AI apps and AI coding assistants in production, and whether they are governed to the recognised frameworks (NIST AI RMF · ISO 42001 · OWASP LLM & Agentic Top 10 · MITRE ATLAS · EU AI Act). <b>2 · Using AI to strengthen our defences</b> — which of your security tools now run AI (Charlotte AI, Security Copilot, Purple AI…) and whether we are fast enough against AI-accelerated attackers.',
     '<div id="cisoAiRisk"><div class="card"><div class="cn">◐ Add AI-governance answers in onboarding and connect your security tools for live data.</div></div></div>')
   +sec('06','What decision needs you now?','Where the next security dollar goes — a plain-English, costed choice. Pick one and it records to your ticketing system as a tracked project, so the decision and its owner are on the record.',
     decisions([{n:1,q:'Which control gap do we close first?',sit:'The biggest dollar driver is the privileged path into payments. Where do we direct the next dollar?',opts:[
       {rec:true,tag:'A · Privileged access (PAM)',on:'Option A · PAM',osum:'$1.4M · 37×',pros:['Closes the $52M driver','Highest return available','Improves board posture immediately'],cons:['$1.4M','3 weeks of IAM effort']},
       {tag:'B · Prove recovery (DR test)',on:'Option B · DR',osum:'$3.2M · <6h recovery',pros:['Removes ~$40M of the recovery tail','Meets regulatory recovery expectations'],cons:['$3.2M — larger program than PAM','Leaves the #1 driver (the $52M privileged path) open']},
       {tag:'C · AI-decisioning governance',on:'Option C · AI governance',osum:'standard + oversight',pros:['Addresses the fastest-rising risk (+$8M/qtr)','Gets ahead of the AI board decision'],cons:['Does not touch the $52M top driver yet','Benefit is preventive, not immediate risk removed']}]}]))
   +sec('07','What are we spending — and what is the return?','The live portfolio of funded cyber projects you manage with the CFO: budget, target ROI, and delivered-to-date — tracked to completion in your ticketing system.',
     '<div id="initiatives-panel"></div>')
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
