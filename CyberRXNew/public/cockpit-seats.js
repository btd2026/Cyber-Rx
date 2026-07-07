/* Nerion cockpit — seat content + evidence, rendered by cockpit.html's helpers.
   Every claim (data-ev) has an EV entry: formula, inputs (value+source), math. */

var SEATS = {
 board:{
  eyebrow:'Board · Executive cockpit',
  verdict:'Cyber as <span class="em">governance</span> — oversight, not operations. The board notes, confirms and endorses; management funds and fixes.',
  sub:'Every figure opens to its basis and source, reconciles across seats, and is traceable to SEC Item 106 — governance-grade, plain language.',
  brief:'Bottom line: cyber is a managed risk this quarter, and nothing crosses the disclosure threshold. Residual risk is trending down, the program returns more than it costs, and the one exposure that matters is already funded by management. The board’s job here isn’t to fix anything — it’s to confirm the materiality process is sound and that every above-appetite risk has a named owner. On both counts, it is: one item to note, nothing to approve.',
  body:function(){return (
   sec('01','Cyber health','','<div id="bd-health"></div>')
   +sec('02','Material risk','','<div id="bd-material"></div>')
   +sec('03','Trend','','<div id="bd-trend"></div>')
   +sec('04','Investment','','<div id="bd-investment"></div>')
   +sec('05','Governance','','<div id="bd-governance"></div>')
   +sec('06','Risk oversight','','<div id="delta-board"></div>')
  );}
 },

 ceo:{
  eyebrow:'CEO · Executive cockpit',
  verdict:'Cyber in the language you <span class="em">run the business</span> by — no jargon, every figure traceable to source.',
  sub:'Every figure opens to its basis, inputs and source, and the shared numbers reconcile exactly across seats.',
  brief:'In plain terms, cyber is protecting growth this quarter, not slowing it. Six of your seven strategic objectives are clear; only the customer platform carries a real exposure — an identity gap — and its fix is already scoped and funded. Modeled loss sits inside the board’s appetite, customer trust is intact, and one decision is worth your signature now. Every figure is your own data, and it reconciles with what your CISO and CFO see.',
  body:function(){return (
   sec('01','Enterprise health','','<div id="ce-health"></div>')
   +sec('02','Strategic risk','','<div id="ce-strategic"></div>')
   +sec('03','Financial exposure','','<div id="ce-financial"></div>')
   +sec('04','Brand & trust','','<div id="ce-trust"></div>')
   +sec('05','Decisions','','<div id="ce-decisions"></div>')
   +sec('06','Strategic dashboard','','<div id="delta-ceo"></div>')
  );}
 },

 cfo:{
  eyebrow:'CFO · Executive cockpit',
  verdict:'Cyber as <span class="em">money</span> — every figure priced against appetite, and traceable to its source.',
  sub:'Every figure opens to its model, inputs and sources — one source of truth across seats.',
  brief:'The financial read: your modeled cyber loss is within the board’s appetite, with headroom, and your security spend returns more than it costs. Your best dollar closes one identity gap — it removes the most risk per dollar and trims your insurance tail, which is where you’re thin. There’s redeployable spend to fund it, so this is close to self-funding. Three priced decisions are on your desk; one is a clear yes.',
  body:function(){return (
   sec('01','Financial exposure','','<div id="cf-exposure"></div>')
   +sec('02','Cyber ROI','','<div id="cf-roi"></div>')
   +sec('03','Insurance','','<div id="cf-insurance"></div>')
   +sec('04','Cost optimization','','<div id="cf-cost"></div>')
   +sec('05','Risk decisions','','<div id="cf-decisions"></div>')
   +sec('06','Financial dashboard','','<div id="delta-cfo"></div>')
  );}
 },

 clo:{
  eyebrow:'CLO · Executive cockpit',
  verdict:'Cyber as <span class="em">legal exposure</span> — obligations and evidence surfaced, never a legal conclusion asserted.',
  sub:'Every figure opens to its source system and evidence, and the shared identity, vendor and platform numbers reconcile across seats. Not legal advice.',
  brief:'From a legal standpoint your exposure is contained, but it concentrates in one place. If a breach hit today you could meet your notification clocks — provided the forensic evidence is ready, and identity is the thin spot there. A cluster of enterprise contracts warrant uptime an identity-driven outage could breach, and your privacy operations are on SLA with access hygiene the soft point. One action reduces your disclosure, contractual and privacy exposure at once. I’m surfacing obligations here, not making the legal call — that stays yours.',
  body:function(){return (
   sec('01','Regulatory','','<div id="cl-regulatory"></div>')
   +sec('02','Notification','','<div id="cl-notification"></div>')
   +sec('03','Contracts','','<div id="cl-contracts"></div>')
   +sec('04','Privacy','','<div id="cl-privacy"></div>')
   +sec('05','Decisions','','<div id="cl-decisions"></div>')
   +sec('06','Legal & regulatory exposure','','<div id="delta-clo"></div>')
  );}
 },

 cro:{
  eyebrow:'CRO · Executive cockpit',
  verdict:'Cyber inside the <span class="em">enterprise risk</span> portfolio — one scale against your other principal risks, every figure traceable to source.',
  sub:'Every figure opens to its basis, inputs and source, and the shared cyber numbers reconcile exactly across seats.',
  brief:'On one enterprise scale, cyber sits mid-pack among your principal risks — and its direction, not its size, is what to watch. You’re within appetite overall, but the identity category is over its share, and identity and third-party are where control assurance thins. Every top risk has a named owner; identity is the one that needs your governance push. Three calls: one risk to treat, one to monitor, one to accept.',
  body:function(){return (
   sec('01','One scale','','<div id="cr-scale"></div>')
   +sec('02','Appetite','','<div id="cr-appetite"></div>')
   +sec('03','Assurance','','<div id="cr-assurance"></div>')
   +sec('04','Trend & ownership','','<div id="cr-trend"></div>')
   +sec('05','Decisions','','<div id="cr-decisions"></div>')
   +sec('06','Enterprise risk posture','','<div id="delta-cro"></div>')
  );}
 },

 cio:{
  eyebrow:'CTO · Executive cockpit',
  verdict:'The <span class="em">technology estate</span> — stack risk, reliability, AI and the software supply chain, every figure traceable to its scanner, registry or record.',
  sub:'Every figure opens to its basis, inputs and source, and the shared identity, platform and vendor numbers reconcile across seats.',
  brief:'Your technology estate is largely secure and on its modernization path. The one architectural gap that matters is the customer platform’s identity and access model — it is your biggest reliability risk, your AI-data-access dependency, and the drag on your software supply chain, all at once. There is also a high-severity auth-library advisory on the critical path worth patching now. Two decisions: fund the identity fix, patch the library.',
  body:function(){return (
   sec('01','Tech risk','','<div id="ct-tech"></div>')
   +sec('02','Reliability','','<div id="ct-reliability"></div>')
   +sec('03','AI risk','','<div id="ct-ai"></div>')
   +sec('04','Supply chain','','<div id="ct-supply"></div>')
   +sec('05','Decisions','','<div id="ct-decisions"></div>')
   +sec('06','Technology dashboard','','<div id="delta-cio"></div>')
  );}
 },

 coo:{
  eyebrow:'COO · Executive cockpit',
  verdict:'Can the business keep <span class="em">running</span> through a cyber disruption? Resilience, recovery and the vendors that could stop us — every figure traceable to source.',
  sub:'Every figure opens to its basis, inputs and source, and the shared cyber and vendor numbers reconcile across seats.',
  brief:'Operationally, you’re resilient and continuity-ready. Of your critical processes, one — the customer platform — carries a real cyber exposure, and a payments process is on watch through a single Tier-1 vendor that is a point of failure. Recovery is tested and within targets, with one weak link: restoring identity and access quickly. Two calls: fund the resilience fix, shore up the vendor.',
  body:function(){return (
   sec('01','Resilience','','<div id="co-resilience"></div>')
   +sec('02','Processes','','<div id="co-processes"></div>')
   +sec('03','Supply chain','','<div id="co-supply"></div>')
   +sec('04','Recovery','','<div id="co-recovery"></div>')
   +sec('05','Decisions','','<div id="co-decisions"></div>')
   +sec('06','Operational dashboard','','<div id="delta-coo"></div>')
  );}
 },

 ciso:{
  eyebrow:'CISO · Executive cockpit',
  verdict:'The plain-language <span class="em">verdict</span> up top, the few things that matter in the middle, one <span class="em">funded decision</span> at the bottom — every number real and traceable to source.',
  sub:'Every figure opens to its exact formula, inputs, source tools and why it matters.',
  brief:'Here’s where the business is most exposed, priced and ranked. Your highest-risk crown jewel needs hardening before it becomes an incident — and your identity and access model is the common thread through your capability exposure, your likeliest attack scenarios, and your control gaps. The upside: the fix is scoped and funded, and it returns more risk-removed per dollar than anything else on the table. One decision closes your largest single exposure; it is worth your sign-off today.',
  body:function(){return (
   sec('01','Program health','','<div id="c5-health"></div>')
   +sec('02','Protection','','<div id="c5-exposure"></div>')
   +sec('03','Cyber operations','','<div id="c5-effect"></div>')
   +sec('04','Threats','','<div id="c5-threats"></div>')
   +sec('05','Peers','','<div id="c5-peers"></div>')
   +sec('06','Frameworks','','<div id="c5-frameworks"></div>')
   +sec('07','Assurance & operations','','<div id="delta-ciso"></div>')
  );}
 },

 cpo:{
  eyebrow:'CPO · Executive cockpit · Product',
  verdict:'Cyber through the <span class="em">product</span> lens — where the identity fix is a <span class="em">product opportunity</span>, not just a risk.',
  sub:'Every figure opens to its basis and source, and the shared identity, auth-library and platform numbers reconcile across seats.',
  brief:'On the product, it ships secure by design and customers trust it. The one real exposure is the customer-platform identity and access model — and it is three problems in one: a security gap, a source of user friction, and a recurring release blocker. Fix it once and you get all three back: safer, smoother, faster. It leads your backlog and it is funded — one decision lands it.',
  body:function(){return (
   sec('01','Product security','','<div id="cp-security"></div>')
   +sec('02','Customer trust','','<div id="cp-trust"></div>')
   +sec('03','Velocity','','<div id="cp-velocity"></div>')
   +sec('04','Backlog','','<div id="cp-backlog"></div>')
   +sec('05','Decisions','','<div id="cp-decisions"></div>')
   +sec('06','Engineering & cloud','','<div id="delta-cto"></div>')
  );}
 },

 audit:{
  eyebrow:'Internal Audit · Executive cockpit',
  verdict:'Independent <span class="em">assurance</span> — coverage, testing, findings and evidence readiness. Internal Audit assures; it does not fund or fix.',
  sub:'Every figure opens to its source system and evidence, and the shared cyber numbers reconcile exactly across seats.',
  brief:'Your cyber audit universe is well covered, with one area out of step: identity and access — simultaneously your overdue review, your outstanding test, a repeat finding, and an evidence gap. Internal Audit doesn’t fund or fix; it schedules, tests, escalates and assures. The action is to escalate identity for follow-up and give the board the assurance that the rest of the universe is sound.',
  body:function(){return (
   sec('01','Coverage','','<div id="ia-coverage"></div>')
   +sec('02','Testing','','<div id="ia-testing"></div>')
   +sec('03','Findings','','<div id="ia-findings"></div>')
   +sec('04','Evidence','','<div id="ia-evidence"></div>')
   +sec('05','Attention','','<div id="ia-attention"></div>')
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
