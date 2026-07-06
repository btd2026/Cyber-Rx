/* Nerion cockpit — seat content + evidence, rendered by cockpit.html's helpers.
   Every claim (data-ev) has an EV entry: formula, inputs (value+source), math. */

var SEATS = {
 board:{
  eyebrow:'Board · Executive cockpit',
  verdict:'Cyber as governance, in five tabs: enterprise <span class="em">cyber health</span>, what is <span class="em">material</span> for disclosure, the <span class="em">trend</span> over time, whether investment is proportionate, and the <span class="em">governance</span> items to note — oversight, not operations. The board notes, confirms and endorses; management funds and fixes.',
  sub:'Tap any figure to open the inspector — its basis and source. The same engine as the other seats; the shared figures match exactly. Governance-grade, plain language, traceable to Item 106.',
  brief:'Here is the board’s view, in five tabs and governance-grade plain language. Cyber health: a managed risk, improving, with nothing currently material. Material risk: no matter crosses the disclosure threshold this quarter, and the process to decide is sound. Trend: cyber residual risk is falling quarter over quarter and ahead of peers. Investment: the program pays for itself, and the one investment that sustains the trend is funded by management. Governance: oversight is functioning — the board’s role is to note management’s funded action and confirm the process, nothing to approve. Every number traces to source.',
  body:function(){return (
   sec('01','Cyber health','','<div id="bd-health"></div>')
   +sec('02','Material risk','','<div id="bd-material"></div>')
   +sec('03','Trend','','<div id="bd-trend"></div>')
   +sec('04','Investment','','<div id="bd-investment"></div>')
   +sec('05','Governance','','<div id="bd-governance"></div>')
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
  eyebrow:'CLO · Executive cockpit',
  verdict:'Cyber as legal exposure, in five tabs: your <span class="em">regulatory</span> obligations by jurisdiction, breach-<span class="em">notification</span> readiness, <span class="em">contractual</span> &amp; litigation liability, <span class="em">privacy</span> &amp; DSAR, and the legal calls that need you — obligations and evidence surfaced, never a legal conclusion asserted.',
  sub:'Tap any regime, clock, contract or record to open the inspector — its source system and evidence. The same engine as the other seats; the identity, vendor and platform figures match exactly. Not legal advice.',
  brief:'From the legal seat, in five tabs. Regulatory: your obligations by jurisdiction, each with its clock and penalty — surfaced, not judged. Notification: you can meet the clocks if the evidence is ready; identity is the thin forensic spot. Contracts: enterprise uptime warranties an identity-driven outage could breach — counts need your CLM. Privacy: DSARs on SLA, with access hygiene the soft spot. Decisions: one action reduces your disclosure, contractual and privacy exposures at once. The shared figures match the other seats exactly.',
  body:function(){return (
   sec('01','Regulatory','','<div id="cl-regulatory"></div>')
   +sec('02','Notification','','<div id="cl-notification"></div>')
   +sec('03','Contracts','','<div id="cl-contracts"></div>')
   +sec('04','Privacy','','<div id="cl-privacy"></div>')
   +sec('05','Decisions','','<div id="cl-decisions"></div>')
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
  eyebrow:'CTO · Executive cockpit',
  verdict:'The technology estate, in five tabs: <span class="em">tech risk</span> across the stack, digital-service <span class="em">reliability</span>, <span class="em">AI</span> &amp; innovation risk, the software <span class="em">supply chain</span>, and the engineering calls that need you — every figure traceable to its scanner, registry or record.',
  sub:'Tap any tile, service, model or dependency to open the inspector — its basis, inputs and source. The same engine as the other seats; the shared identity, platform and vendor figures match exactly.',
  brief:'From the technology seat, in five tabs. Tech risk: the stack is largely secure and modernizing, with the customer-platform identity architecture the biggest gap. Reliability: services are available and secure, with the platform’s access path the one risk. AI risk: models inventoried and shipping under governance, with AI data access relying on the identity controls that carry the gap. Supply chain: a high-severity auth-library advisory to patch on the critical path. Decisions: one to fund, one to patch. The shared figures match the other seats exactly.',
  body:function(){return (
   sec('01','Tech risk','','<div id="ct-tech"></div>')
   +sec('02','Reliability','','<div id="ct-reliability"></div>')
   +sec('03','AI risk','','<div id="ct-ai"></div>')
   +sec('04','Supply chain','','<div id="ct-supply"></div>')
   +sec('05','Decisions','','<div id="ct-decisions"></div>')
  );}
 },

 coo:{
  eyebrow:'COO · Executive cockpit',
  verdict:'Can the business keep running through a cyber disruption? Five tabs: <span class="em">resilience</span> at a glance, cyber risk by critical <span class="em">process</span>, the <span class="em">supply chain</span> that could stop us, <span class="em">recovery</span> readiness, and the operational calls that need you — every figure traceable to source.',
  sub:'Tap any tile, process, vendor or decision to open the inspector — its basis, inputs and source. The same engine as the other seats; the shared cyber and vendor figures match exactly.',
  brief:'From the operations seat, in five tabs. Resilience: operations are healthy and continuity-ready, with one critical process — the customer platform — carrying an identity exposure. Processes: most critical processes are cyber-safe; one is at risk and one on watch through a vendor. Supply chain: your worst-rated Tier-1 vendor is a single point of failure to reduce. Recovery: RTO/RPO against target from the last test, with identity restoration the weak link. Decisions: one to fund, one to shore up. The shared figures match the other seats exactly.',
  body:function(){return (
   sec('01','Resilience','','<div id="co-resilience"></div>')
   +sec('02','Processes','','<div id="co-processes"></div>')
   +sec('03','Supply chain','','<div id="co-supply"></div>')
   +sec('04','Recovery','','<div id="co-recovery"></div>')
   +sec('05','Decisions','','<div id="co-decisions"></div>')
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
   +sec('06','Frameworks','','<div id="c5-frameworks"></div>')
  );}
 },

 cpo:{
  eyebrow:'CPO · Executive cockpit · Product',
  verdict:'Cyber through the product lens, in five tabs: product-<span class="em">security</span> posture, customer <span class="em">trust</span>, ship <span class="em">velocity</span> vs security, the product-risk <span class="em">backlog</span>, and the calls that need you — where the identity fix is a <span class="em">product opportunity</span>, not just a risk.',
  sub:'Tap any tile, item or decision to open the inspector — its basis and source. The same engine as the other seats; the identity, auth-library and platform figures match exactly.',
  brief:'From the product seat, in five tabs. Product security: the product ships secure-by-design, with the customer-platform identity/access model the one real gap. Customer trust: users are safe and confident, with the access experience the one soft spot. Velocity: security clears the path more than it taxes it; the recurring blocker is identity. Backlog: healthy, with the identity/access remediation leading and funded. Decisions: one product call does triple duty — safer, smoother, faster. Identity is three faces of one issue — a security gap, access friction, and a release blocker — and the same funded fix closes all three.',
  body:function(){return (
   sec('01','Product security','','<div id="cp-security"></div>')
   +sec('02','Customer trust','','<div id="cp-trust"></div>')
   +sec('03','Velocity','','<div id="cp-velocity"></div>')
   +sec('04','Backlog','','<div id="cp-backlog"></div>')
   +sec('05','Decisions','','<div id="cp-decisions"></div>')
  );}
 },

 audit:{
  eyebrow:'Internal Audit · Executive cockpit',
  verdict:'Independent assurance, in five tabs: audit universe &amp; <span class="em">coverage</span>, control-<span class="em">testing</span> status, <span class="em">findings</span> &amp; action plans, <span class="em">evidence</span> readiness, and where the cycle needs attention — Internal Audit assures, it does not fund or fix.',
  sub:'Tap any area, control set, finding or evidence item to open the inspector — its source system and evidence. The same engine as the other seats; the shared cyber figures match exactly.',
  brief:'From the assurance seat, in five tabs. Coverage: the audit universe is well covered, with identity &amp; access the high-risk area out of step. Testing: on plan, with identity controls the outstanding set. Findings: closing on track, with one repeat identity finding to escalate. Evidence: most controls evidenced on demand, identity the thin spot. Attention: identity is your overdue review, outstanding test, repeat finding and evidence gap at once — the highest-leverage audit action, and the basis for independent board assurance. Audit assures; management funds.',
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
