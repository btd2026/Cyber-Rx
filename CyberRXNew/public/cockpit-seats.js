/* CyberRx cockpit — seat content + evidence, rendered by cockpit.html's helpers.
   Every claim (data-ev) has an EV entry: formula, inputs (value+source), math. */

var SEATS = {
 ceo:{
  eyebrow:'Executive summary · CEO / Board',
  verdict:'Cyber risk is <span class="em">managed and within the board’s approved tolerance.</span> The worst-case tail sits above appetite, and one funded decision this quarter brings it back in line.',
  sub:'Your cyber position in the same terms as every other enterprise risk. Every figure is clickable — open it to see the exact formula, the inputs used, and the math.',
  body:function(){return (
   sec('01','How much is at stake — and are we within the board’s limit?','Cyber risk in dollars, measured against the appetite the board approved.',
     tiles([
      {k:'Expected annual loss',v:'<span id="lvExpo">$68M</span>',ev:'ale',note:'<span class="pill good">Within appetite</span> &nbsp;<span class="claim" data-ev="pctrev">≈0.8% of revenue <span class="fx">ƒ</span></span>'},
      {k:'Worst-case tail (95%)',v:'<span id="lvTail">$180M</span>',cls:'warn',ev:'tail',note:'<span class="pill warn">Above appetite</span> &nbsp;vs appetite <span class="claim" data-ev="appetite">$120M <span class="fx">ƒ</span></span>'},
      {k:'Materiality threshold',v:'$53M',ev:'materiality',note:'a payments-path event clears it; corporate-IT does not'}]))
   +sec('02','Which business processes carry the risk?','Your key processes from onboarding, ranked by the dollars of exposure each carries. Click any process for the math.',
     bars([
      {l:'Claims &amp; payments processing',ev:'proc-claims',v:'$34M',pct:100,cls:'hot'},
      {l:'Policy administration',ev:'proc-policy',v:'$18M',pct:53},
      {l:'Trading &amp; settlement',ev:'proc-settlement',v:'$11M',pct:32},
      {l:'Member portal &amp; servicing',ev:'proc-member',v:'$5M',pct:15}]))
   +sec('03','What decisions need us — and what are the trade-offs?','Each decision is a plain-English choice with options, pros and cons. Choose one and it’s recorded to your ticketing system and tracked to completion.',
     decisions([
      {n:1,q:'Should we close the privileged path into payments?',sit:'A few over-privileged IT accounts can reach the payments database directly — the single biggest reason exposure is $68M. Three ways to handle it:',
       opts:[
        {rec:true,tag:'A · Fund it now',on:'Option A · Fund it now',osum:'$1.4M · 3 weeks',pros:['Removes ~$52M of exposure (37× return)','Brings the worst case within appetite','Strengthens insurance renewal'],cons:['$1.4M this quarter','3 weeks of identity-team effort']},
        {tag:'B · Phase over 2 quarters',on:'Option B · Phase it',osum:'$1.4M spread',pros:['Spreads cost and effort','Less disruption now'],cons:['~$26M stays open for 6 months','Tail stays over appetite meanwhile']},
        {tag:'C · Accept &amp; monitor',on:'Option C · Accept',osum:'$0 · formal acceptance',pros:['No spend this quarter'],cons:['$52M exposure remains','Requires documented board risk-acceptance']}]},
      {n:2,q:'How fast should we be able to recover our revenue systems?',sit:'Our slowest revenue system takes ~3.1 days to recover, driving most of the tail. Three investment levels:',
       opts:[
        {rec:true,tag:'A · Full modernization',on:'Option A · Full',osum:'$3.2M · <6h recovery',pros:['Cuts worst case by ~$40M','Tail below appetite','Meets regulatory recovery expectations'],cons:['$3.2M capital','One-quarter program']},
        {tag:'B · Critical systems only',on:'Option B · Critical only',osum:'$1.6M',pros:['Protects the two highest-value systems','Half the cost'],cons:['Portal recovery stays slow','Removes ~$24M of $40M']},
        {tag:'C · Defer',on:'Option C · Defer',osum:'$0 this year',pros:['No spend now'],cons:['Tail stays $180M','Weaker insurance renewal']}]}]))
   +sec('04','Are we adequately insured against the worst case?','Whether our cyber-insurance coverage matches the modeled worst case — and the renewal position.',
     '<div class="cols"><div class="card"><div class="ck">Answer</div><div class="cv" style="font-size:20px;line-height:1.35">Mostly — <span class="warn">a $30M tail is uninsured</span></div><div style="display:flex;gap:24px;margin-top:14px"><div><div class="cv" style="font-size:20px">$150M</div><div class="cn">coverage limit</div></div><div><div class="cv crit claim" data-ev="insgap" style="font-size:20px"><span id="lvGapCeo">$30M</span> <span class="fx">ƒ</span></div><div class="cn">uninsured tail</div></div><div><div class="cv" style="font-size:20px">$4.2M</div><div class="cn">premium · renews 92d</div></div></div></div>'
     +kvcard('How much of the risk is transferred?',[{k:'Transfer efficiency',v:'83%',ev:'transfer'},{k:'Retained tail',v:'$30M',cls:'crit'},{k:'Decision 2 impact',v:'closes the gap',cls:'good'}])+'</div>')
   +sec('05','Are we getting better — quarter over quarter?','The trend the board tracks: exposure and posture across the last four quarters, with what drove each move.',
     '<div class="qoq"><div class="card"><div class="ck">Expected loss by quarter</div><svg width="100%" height="120" viewBox="0 0 340 120" preserveAspectRatio="none" style="margin-top:8px"><polyline points="10,30 120,42 230,58 330,86" fill="none" stroke="#0ca30c" stroke-width="2.5"/><circle cx="10" cy="30" r="3.5" fill="#0ca30c"/><circle cx="120" cy="42" r="3.5" fill="#0ca30c"/><circle cx="230" cy="58" r="3.5" fill="#0ca30c"/><circle cx="330" cy="86" r="4.5" fill="#0ca30c"/><text x="10" y="108" fill="#898781" font-size="10">Q3’25</text><text x="112" y="108" fill="#898781" font-size="10">Q4’25</text><text x="222" y="108" fill="#898781" font-size="10">Q1’26</text><text x="316" y="108" fill="#898781" font-size="10">Q2’26</text></svg><div class="cn">Exposure down $96M → $68M over four quarters (−29%).</div></div>'
     +'<div class="card"><table class="qtbl"><thead><tr><th>Quarter</th><th>Expected loss</th><th>Posture</th><th>Key change</th></tr></thead><tbody><tr><td>Q3’25</td><td>$96M</td><td>74</td><td>baseline</td></tr><tr><td>Q4’25</td><td>$88M</td><td>77</td><td>MFA rollout</td></tr><tr><td>Q1’26</td><td>$82M</td><td>79</td><td>EDR coverage ↑</td></tr><tr><td>Q2’26</td><td class="up">$68M</td><td class="up">82</td><td>PAM + training</td></tr></tbody></table></div></div>'
     +lists([
       {c:'g',ic:'↓',t:'Exposure fell $14M this quarter',s:'Privileged-access rollout reached 88%; phishing-failure rate 9% → 3%.'},
       {c:'w',ic:'✦',t:'New risk: AI decisioning on customer data (+$8M, rising)',s:'Now a board decision — govern in-house or transfer to the insurer.'},
       {c:'b',ic:'◑',t:'More resilient than 72% of peers at your revenue scale',ev:'peer',s:'Closing the gap to the top quartile ≈ $22M of avoidable exposure.'}]))
  );}
 },

 cfo:{
  eyebrow:'Financial view · CFO',
  verdict:'Cyber loss is <span class="em">quantified, insured, and returning ~9× on spend.</span> A $30M uninsured tail and $92M carried on deferred decisions are the open financial items.',
  sub:'Cyber as a line on the risk-adjusted balance sheet: expected loss, capital at risk, insurance economics, and the marginal return on the next dollar. Click any figure for the math.',
  body:function(){return (
   sec('01','What is our capital at risk — and is our spend working?','The dollars, and the return on what we invest in security.',
     tiles([
      {k:'Expected annual loss',v:'<span id="lvExpoCfo">$68M</span>',ev:'ale',note:'≈0.8% of revenue · provisioned'},
      {k:'Value-at-Risk (95%)',v:'<span id="lvTailCfo">$180M</span>',cls:'warn',ev:'tail',note:'0.6% of enterprise value'},
      {k:'Return on security spend',v:'$1 → $9',ev:'roicfo',note:'next funded decision returns 37×'},
      {k:'Cost of inaction',v:'+$92M',cls:'warn',ev:'inaction',note:'exposure carried on deferred decisions'}]))
   +sec('02','Where does the next dollar work hardest, and are we insured?','Marginal return by program, and whether coverage matches the tail.',
     '<div class="cols">'
     +bars([{l:'Privileged access',v:'37×',pct:100,cls:''},{l:'Recovery / DR',v:'13×',pct:52},{l:'Data protection',v:'8×',pct:34},{l:'Awareness training',v:'6×',pct:26},{l:'Endpoint (saturated)',v:'1.4×',pct:8}])
     +kvcard('Insurance economics',[{k:'Coverage limit',v:'$150M'},{k:'Uninsured tail',v:'$30M',cls:'crit',ev:'insgap'},{k:'Premium',v:'$4.2M / yr'},{k:'Loss ratio (3-yr)',v:'11% — favorable',cls:'good'},{k:'Renewal',v:'92 days'}])+'</div>')
   +sec('03','What if we change the budget — and is an incident material?','The two questions finance owns: the budget trade-off, and disclosure.',
     lists([
      {c:'c',ic:'↓',t:'Cut budget −20% → +$46M exposure, tail $214M, premium +18%',ev:'budgetcut',s:'Net of premium, the cut costs more than it saves.'},
      {c:'g',ic:'↑',t:'Fund the top decision (+$1.4M) → exposure $16M, 37× return',ev:'roicfo',s:'Closes the payments driver; tail returns within appetite.'},
      {c:'w',ic:'§',t:'Materiality threshold $53M — a payments-path event is reportable',ev:'materiality',s:'The 4-business-day SEC clock and draft 8-K are pre-staged.'}]))
  );}
 },

 clo:{
  eyebrow:'Legal & regulatory view · CLO / General Counsel',
  verdict:'The organization is <span class="em">defensible across all operating jurisdictions</span> today — no reportable events, evidence preserved. Two obligations have clocks to watch.',
  sub:'Cyber as legal exposure: disclosure standing, notification duties by country, and the modeled liability if an event occurs — with the clock on each.',
  body:function(){return (
   sec('01','Are we legally defensible right now?','Disclosure standing, notification readiness, and litigation posture.',
     tiles([
      {k:'Open notifications',v:'0',cls:'good',note:'across US, EU, UK, APAC'},
      {k:'Materiality standing',v:'No reportable event',cls:'good',ev:'materiality',note:'SEC clock not running; 8-K pre-staged'},
      {k:'Modeled liability',v:'$22M',cls:'warn',note:'class-action + regulatory, modeled'},
      {k:'Fastest clock',v:'72 hours',ev:'clock',note:'EU/UK GDPR if an event occurred today'}]))
   +sec('02','Where are we exposed by jurisdiction — duty, clock, penalty?','Where we operate, the binding obligation, and the ceiling. Click a jurisdiction for the rule.',
     jtable([
      {flag:'🇺🇸',c:'United States',ev:'juris-us',o:'SEC 8-K + 54 state breach laws',clock:'4 business days',cc:'warn',pen:'Disclosure + enforcement'},
      {flag:'🇪🇺',c:'European Union',ev:'juris-eu',o:'GDPR · NIS2 · DORA',clock:'72 hours',cc:'crit',pen:'Up to 4% of global revenue'},
      {flag:'🇬🇧',c:'United Kingdom',o:'UK GDPR / ICO',clock:'72 hours',cc:'crit',pen:'£17.5M or 4%'},
      {flag:'🇸🇬',c:'Singapore',o:'PDPA · MAS TRM',clock:'72h / 1h (MAS)',cc:'crit',pen:'Up to S$1M'},
      {flag:'🇦🇺',c:'Australia',o:'Privacy Act · APRA CPS 234',clock:'72 hours',cc:'warn',pen:'Up to A$50M'}]))
  );}
 },

 cro:{
  eyebrow:'Enterprise risk view · CRO',
  verdict:'Cyber is <span class="em">within appetite and fully quantified,</span> and now sits alongside your other principal risks on one scale. The watch item is correlation at the tail.',
  sub:'Cyber inside the enterprise risk portfolio: measured in the same currency as every other risk, tested for correlation and aggregation, tracked against appetite.',
  body:function(){return (
   sec('01','Where does cyber sit against appetite and our other risks?','One dollar scale for every principal risk.',
     tiles([
      {k:'Cyber vs. appetite',v:'$68M / $120M',cls:'good',ev:'appetite',note:'57% of allocated appetite'},
      {k:'Concentration',v:'50% in payments',cls:'warn',ev:'proc-claims',note:'one process carries half the risk'},
      {k:'Correlation flag',v:'2 risks',cls:'warn',ev:'correlation',note:'couples with third-party + operational'},
      {k:'Risk transferred',v:'83%',ev:'transfer',note:'of the tail, via insurance'}]))
   +sec('02','What could breach appetite, and what is rising fastest?','Aggregation at the tail, and an emerging-risk radar by velocity.',
     bars([{l:'Credit / market',v:'$210M',pct:100},{l:'Operational',v:'$140M',pct:67},{l:'Cyber',v:'$68M',pct:32,cls:'hot'},{l:'Third-party',v:'$54M',pct:26},{l:'Compliance',v:'$30M',pct:14}])
     +lists([
      {c:'c',ic:'▲',t:'AI / automated decisioning — velocity high, adaptation forming',s:'+$8M this quarter and accelerating.'},
      {c:'w',ic:'▲',t:'Third-party & cloud concentration — velocity high, adaptation partial',ev:'correlation',s:'One provider underpins three revenue systems.'},
      {c:'b',ic:'◐',t:'Quantum / crypto obsolescence — velocity medium, planned',s:'Long-dated data exposed; migration staged.'}]))
  );}
 },

 cio:{
  eyebrow:'Operational resilience view · CIO',
  verdict:'Every revenue-critical system is <span class="em">operating and recoverable.</span> The slowest recovery is 3.1 days; one investment cuts it to hours. A single vendor underpins three systems.',
  sub:'Cyber and resilience for the systems that carry the business: what each is worth per hour, how fast it recovers, and where a single provider is a point of failure.',
  body:function(){return (
   sec('01','Can the business keep operating — and recover fast enough?','Resilience in revenue terms, not RTO jargon.',
     tiles([
      {k:'What downtime costs',v:'$2.3M / hr',cls:'warn',ev:'downtime',note:'on payments — the top dependency'},
      {k:'Worst-case recovery',v:'3.1 days',cls:'warn',ev:'recovery',note:'target <6h (Decision 2)'},
      {k:'Vendor concentration',v:'1 vendor, 3 systems',cls:'warn',ev:'vendor',note:'a single point of failure'},
      {k:'Tech-debt exposure',v:'$12M',cls:'warn',note:'4 end-of-life systems on revenue paths'}]))
   +sec('02','Which systems carry the business, and how fast do they recover?','Ranked by value at risk — recovery investment follows revenue.',
     bars([{l:'Payments ($2.3M/hr)',v:'74 hrs',pct:100,cls:'hot'},{l:'Member portal ($0.6M/hr)',v:'40 hrs',pct:54},{l:'Settlement ($0.9M/hr)',v:'28 hrs',pct:38},{l:'Corporate IT (<$40K/hr)',v:'8 hrs',pct:11}]))
  );}
 },

 ciso:{
  eyebrow:'Security operating view · CISO',
  verdict:'<span class="em">No active compromise, and the program is improving.</span> The largest exposure driver has a funded decision ready; control effectiveness is measured as dollars of risk removed.',
  sub:'The operator’s seat — still in business terms: what drives exposure, which decisions close it, and control effectiveness as risk removed, not maturity scores. This number rolls up to the board.',
  body:function(){return (
   sec('01','Are we compromised — and what is driving our exposure?','Live status, and the dollar drivers each with a fix.',
     tiles([
      {k:'Live threat status',v:'No active compromise',cls:'good',note:'312,400 events correlated · 0 matches'},
      {k:'Top exposure driver',v:'$52M',cls:'crit',ev:'proc-claims',note:'privileged path to payments'},
      {k:'Controls effectiveness',v:'$210M removed',ev:'roicfo',note:'risk bought down over 3 yrs (not CMMI)'},
      {k:'Coverage from tools',v:'99.4%',note:'live signals; gaps named &amp; costed'}]))
   +sec('02','What is driving the $68M — and how good is our coverage?','Each driver carries a funded decision, so the list is a plan, not a backlog.',
     bars([{l:'Privileged path → payments',v:'$52M',pct:100,cls:'hot',ev:'roicfo'},{l:'Recovery not yet proven',v:'$40M',pct:77,cls:'hot',ev:'recovery'},{l:'AI decisioning (new)',v:'$8M',pct:15},{l:'Third-party concentration',v:'$6M',pct:12,ev:'vendor'}])
     +kvcard('Coverage from connected tools (live signals)',[{k:'Endpoint detection (EDR)',v:'98.1%',cls:'good'},{k:'Multi-factor (MFA)',v:'96% — 4% legacy',cls:'warn'},{k:'Privileged accounts managed',v:'60% — the driver',cls:'crit'},{k:'Phishing-prone rate',v:'3% (was 9%)',cls:'good'}]))
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
 peer:{claim:'Resilience vs. peers',result:'72nd percentile',cls:'',
  formula:'percentile  =  rank of your normalized exposure within the peer cohort\ngap to top-quartile  =  your exposure  −  p25 cohort exposure',
  inputs:[['Peer cohort','Financial services · $5–10B','Benchmark dataset (opt-in)'],['Your normalized exposure','0.81% of revenue','computed'],['Cohort size','34 orgs','Benchmark (k-anonymous ≥8)']],
  steps:[['1','Rank your exposure in cohort','above 72%'],['2','Distance to top quartile','≈ $22M'],['T','Position','72nd percentile']],
  sources:['Reciprocal peer benchmark (anonymized)','Your computed exposure'],conf:'Only high-level figures leave your tenant; cohorts under 8 are never shown.'},
 roicfo:{claim:'Return on the top decision (privileged-access closure)',result:'37×',cls:'good',
  formula:'exposure removed  =  exposure(before)  −  exposure(after)\nreturn on spend  =  exposure removed  ÷  cost',
  inputs:[['Before (open path)','$52M','Risk register'],['After (path closed)','~$0','Control model'],['Cost','$1.4M','Decision estimate']],
  steps:[['1','$52M − ~$0','$52M removed'],['2','$52M ÷ $1.4M','≈37×'],['T','Return','37×']],
  sources:['Risk register','Control effectiveness model'],conf:'The single highest-return decision available.'},
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
  sources:['Asset→vendor mapping (onboarding)','Downtime model'],conf:'Multi-region ($2.1M) removes the shared point of failure.'}
};
