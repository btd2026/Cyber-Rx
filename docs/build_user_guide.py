#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Nerion User Guide — comprehensive edition.
Builds a detailed McKinsey-style .docx from the platform's real structure
(onboarding fields, all ten seats, connectors/signals, frameworks, decisions,
provenance, administration). Regenerate with:  python3 docs/build_user_guide.py
"""
import os, sys, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from guide_kit import *
from guide_kit import _field, psh, bdr
from docx.enum.text import WD_ALIGN_PARAGRAPH

K = Kit()
run, p, h1, h2, h3, bullet, steps, callout, table, fields = (
    K.run, K.p, K.h1, K.h2, K.h3, K.bullet, K.steps, K.callout, K.table, K.fields)

# ============================ COVER ============================
top = K.doc.add_paragraph(); top.paragraph_format.space_after = Pt(0); psh(top, NAVYHX); run(top, " ", size=2)
K.doc.add_paragraph()
lbl = K.doc.add_paragraph(); lbl.paragraph_format.space_after = Pt(2)
run(lbl, "NERION", size=13, bold=True, color=NAVY, font=HEAD, spacing=60)
sub = K.doc.add_paragraph(); sub.paragraph_format.space_after = Pt(40)
run(sub, "Cyber Business Operations Platform", size=11, color=BLUE, spacing=20)
t1 = K.doc.add_paragraph(); t1.paragraph_format.space_after = Pt(2)
run(t1, "User Guide", size=40, bold=True, color=NAVY, font=HEAD)
t2 = K.doc.add_paragraph(); t2.paragraph_format.space_after = Pt(22)
run(t2, "The complete reference — onboarding, cockpit, decisions, administration", size=15, italic=True, color=MUTE, font=HEAD)
rule = K.doc.add_paragraph(); rule.paragraph_format.space_after = Pt(18); bdr(rule, ['bottom'], sz=18, color=BLUEHX)
lede = K.doc.add_paragraph()
run(lede, "Give Nerion your business, and it returns your cyber position — in dollars, and only what is true. "
          "This guide documents every screen, field, seat, metric, connector and workflow, with the honesty "
          "principles that let a Fortune-100 buyer trust every number on the page.", size=11.5, color=INK)
for _ in range(7): K.doc.add_paragraph()
m1 = K.doc.add_paragraph(); m1.paragraph_format.space_after = Pt(1)
run(m1, "Prepared for platform users, executives and administrators", size=9.5, color=MUTE)
m2 = K.doc.add_paragraph(); m2.paragraph_format.space_after = Pt(1)
run(m2, "Version 2.0  ·  " + datetime.date.today().strftime("%B %Y"), size=9.5, color=MUTE)
conf = K.doc.add_paragraph()
run(conf, "CONFIDENTIAL — Distribution limited to licensed users", size=8.5, bold=True, color=BLUE, caps=True, spacing=20)
bot = K.doc.add_paragraph(); bot.paragraph_format.space_before = Pt(6); psh(bot, NAVYHX); run(bot, " ", size=2)

# ============================ TOC ============================
K.doc.add_page_break()
toch = K.doc.add_paragraph(); toch.paragraph_format.space_after = Pt(8)
run(toch, "Contents", size=20, bold=True, color=NAVY, font=HEAD); bdr(toch, ['bottom'], sz=10, color=NAVYHX)
tp = K.doc.add_paragraph(); _field(tp, r'TOC \o "1-2" \h \z \u')
hint = K.doc.add_paragraph()
run(hint, "To populate: right-click the contents above and choose “Update Field” (or press F9).", size=8.5, italic=True, color=MUTE)

sec = K.doc.sections[0]
fp = sec.footer.paragraphs[0]; fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
run(fp, "Nerion User Guide   ·   Confidential      ", size=8, color=MUTE); _field(fp, "PAGE")
hp = sec.header.paragraphs[0]; hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
run(hp, "NERION", size=8, bold=True, color=BLUE, spacing=30)

# ============================ 1 · CONCEPTS ============================
h1("The Nerion Model")
p("Nerion turns what your business is — its revenue processes, the systems that run them, its crown-jewel data, "
  "its vendors and its security tools — into your cyber position expressed the way the board and C-suite think: "
  "in dollars of exposure, in decisions, and in defensible evidence. This chapter explains the ideas the rest of "
  "the guide builds on.")

h2("One platform, ten executive lenses")
p("Nerion presents a single system through ten executive seats. Each seat is addressed to a named leader, speaks "
  "in that leader’s language, and shows the same underlying figures — the shared numbers match exactly across seats.")
table("The ten executive seats",
      ["Seat", "Key", "The question it answers"],
      [["CISO", "ciso", "Where is exposure, and are the controls actually working?"],
       ["CEO", "ceo", "Is cyber a tailwind or a risk to the strategy?"],
       ["CFO", "cfo", "What is the dollar exposure, the insurance gap, and the ROI?"],
       ["COO", "coo", "Can the business keep running through a cyber disruption?"],
       ["CTO", "cio", "Which systems carry the business, and how healthy is the stack?"],
       ["CPO", "cpo", "Does the product ship secure by design?"],
       ["CRO", "cro", "How does cyber sit beside our other principal risks?"],
       ["CLO", "clo", "Materiality, notification clocks, contracts, privacy — obligations surfaced."],
       ["Internal Audit", "audit", "Is control assurance evidence-based, not self-attested?"],
       ["Board", "board", "Oversight, disclosure readiness, and how we compare to peers."]],
      widths=[1.4, 0.9, 4.3])
callout("key", "You describe the business once during onboarding. Nerion maps process → system → crown jewel → risk → "
        "control, prices the exposure, and lights up all ten seats from that single description.")

h2("The provenance engine — how to read any number")
p("Every headline number in Nerion is backed by a provenance record. Tapping any tile, card or stat opens an "
  "inspection panel that shows exactly how the number was produced. This is what makes the platform defensible in "
  "front of an auditor or regulator — no figure is a black box.")
table("What the inspection panel shows, top to bottom",
      ["Section", "What it contains"],
      [["Claim + label", "The metric name and its provenance chip (live / computed / modeled / self-reported)."],
       ["Result", "The value, coloured by status; or an honest “Not connected”."],
       ["How it’s computed", "The formula — the exact arithmetic or rule."],
       ["Method", "A plain-language explanation, including thresholds and definitions."],
       ["Inputs", "A table of every input, its value and its source — ending in a “= result” row so the "
                  "number reconstructs from what you see."],
       ["Sources", "The tool · connector · field · last-refresh behind each input."],
       ["Why it matters", "One sentence of business context."]],
      widths=[1.7, 4.8])
callout("note", "Hover any box for a one-line explanation; tap it for the full trace above. Every computed number is "
        "designed to “stand alone” — its inputs, shown in the panel, reconstruct the displayed value.")

h2("The four provenance labels")
p("Every metric declares what kind of number it is. The label is the heart of the honesty system: a big precise "
  "figure means nothing unless you know whether it is a measurement, a model, or an input you provided.")
table("Provenance labels",
      ["Label", "Meaning", "Trust it because…"],
      [["LIVE", "A direct/continuous read from a connected tool", "it is your tool’s own number, refreshed on load."],
       ["COMPUTED", "Arithmetic derived from connected data", "every input is shown and traceable."],
       ["MODELED", "A simulation or estimate (e.g. ALE, tail VaR)", "it is a model, not a measurement; the panel shows how the model runs."],
       ["SELF-REPORTED", "A value you entered at onboarding", "it is your own input (e.g. board appetite, policy limit)."]],
      widths=[1.4, 3.0, 2.1])
callout("warn", "Until you connect tools and complete onboarding, many figures are MODELED defaults marked illustrative. "
        "They are labelled honestly rather than presented as your real position — connect your data to make them LIVE.")

h2("The status colours")
table("Status colours",
      ["Colour", "Tile label", "Capability scale (deployment %)"],
      [["Green", "Healthy", "≥ 90% strong · and “healthy” = ≥ 75%"],
       ["Blue", "Monitoring", "75–89%"],
       ["Amber", "At risk", "50–74%"],
       ["Red", "(critical)", "< 50%"],
       ["Grey", "Not connected", "no signal connected"]],
      widths=[1.2, 1.6, 3.7])

# ============================ 2 · GETTING STARTED ============================
h1("Getting Started")
h2("How Nerion is delivered")
p("Nerion ships as a self-contained virtual appliance that runs inside your own environment. Your data never "
  "leaves your network — there is no phone-home, and the platform (including its licence check and peer benchmark) "
  "operates fully offline. Your administrator receives the appliance image and a licence file; users then reach "
  "Nerion through a browser.")
table("Licence types",
      ["Plan", "Term", "Use"],
      [["Trial", "14 days", "Evaluation with your own data, full functionality."],
       ["Paid subscription", "365 days", "Production use; renews annually. A short grace period follows expiry."]],
      widths=[1.7, 1.3, 3.5])
h2("First login")
steps([("Open the platform", "Navigate to the address your administrator provides — any modern browser, no plug-in.",
        "The seat bar loads with CISO selected."),
       ("Choose your seat", "Select your executive lens from the top bar. Hover any seat to see its full title "
        "(e.g. CISO → Chief Information Security Officer).", "The cockpit re-addresses to that leader."),
       ("Complete onboarding, or land in the cockpit", "If your organization is not yet described, you enter the "
        "onboarding wizard (Chapter 3). If setup is complete, you land in your seat with live data.", None)])
callout("note", "Onboarding fields are optional and reversible. Provide what you know now; refine any input later and "
        "the cockpit recomputes. Nothing is locked.")

# ============================ 3 · ONBOARDING ============================
h1("Onboarding: Describing Your Business")
p("Onboarding is a guided single-page wizard organized into six top tabs. Its purpose is one sentence: give Nerion "
  "your business so it can return your cyber position in dollars. Each section you complete converts more of the "
  "cockpit from illustrative to live. None is mandatory except an organization name and either processes or systems.")
table("The onboarding tabs and their sections",
      ["Tab", "Sections it contains"],
      [["01 Organization", "Organization · Leadership · Operating regions"],
       ["02 Governance & AI", "Board governance & incident readiness · AI risk & governance · Strategic "
                              "initiatives · Strategic objectives · Policy & document evidence"],
       ["03 Financials", "Financials & appetite · Enterprise risk portfolio · Security as a growth engine · Cyber insurance"],
       ["04 Inventory", "Business processes · Systems & applications · Map applications → processes"],
       ["05 Risks & projects", "Risk register · Current cyber projects · Third-party vendors"],
       ["06 Connect tools", "Connect your tools"]],
      widths=[1.7, 4.8])

h2("Organization")
p("Sets the industry lens and the regulators/jurisdictions that apply.")
fields("Organization fields",
       [["Organization name", "text", "Your legal/brand name. Required to go live."],
        ["Industry", "dropdown", "Financial services · Banking · Insurance · Healthcare · Technology/SaaS · "
                                 "Manufacturing · Retail · Energy · Telecom · Transport · Government · Professional services · Other"],
        ["Reporting currency", "dropdown", "USD · EUR · GBP · CAD · AUD · SGD · JPY · CHF · INR (relabels every money field)"],
        ["Operating regions", "multi-select", "US · EU · UK · Canada · Singapore · Australia · APAC · Global — sets "
                                             "breach-notification clocks and penalty regimes"]])
p("Leadership — enter the named owner of each seat: CEO, CFO, CISO, COO, CTO, CPO, General Counsel (CLO), Chief Risk "
  "Officer, Chief Audit Executive. Each seat is addressed to its owner, and every decision is stamped with that "
  "leader’s name.")
callout("note", "Region drives real deadlines — it is used to compute notification countdowns and maximum penalties. "
        "Set every region in which you operate.")

h2("Governance, AI, strategy & policy evidence")
bullet("committee, cadence, CISO reporting line, board cyber-expertise, ERM integration, IR-plan test status, last "
       "tabletop, breach-counsel retainer, ransomware-payment policy, and compliance frameworks in scope. Powers the "
       "CEO/Board governance panel and SEC Item 106 readiness.", lead="Board governance & incident readiness:  ")
bullet("AI/LLM systems in production, customer-facing AI decisioning, governance framework (NIST AI RMF / ISO 42001), "
       "acceptable-use policy, EU AI Act scope, inventory status. Powers the CEO & CISO AI-risk panels.",
       lead="AI risk & governance:  ")
bullet("major moves in front of the board (acquisition, cloud migration, AI product, expansion) with value at stake "
       "and horizon — each gets a per-initiative go/no-go safety check.", lead="Strategic initiatives:  ")
bullet("enduring goals, each tagged with the cyber capability it leans on. The CEO cockpit reports how many "
       "objectives are cyber-safe.", lead="Strategic objectives:  ")
bullet("upload security policies (PDF/DOCX/TXT). Nerion reads each against the NIST control catalog and scores every "
       "control’s CMMI maturity from the policy language — the document-review evidence behind your framework scores.",
       lead="Policy & document evidence:  ")

h2("Financials, risk portfolio, growth & insurance")
p("All money fields take a number, a unit (B/M/K) and show a formatted equivalent.")
fields("Financials & appetite",
       [["Annual revenue / Operating / Net income", "money", "Drive %-of-revenue, EPS-impact and materiality."],
        ["Enterprise value / market cap", "money", "For %-of-enterprise-value framing."],
        ["Board cyber-risk appetite", "money", "The maximum annual cyber loss the board has approved."],
        ["Annual cyber budget", "money", "Program spend."],
        ["Shares outstanding / Records held", "count", "For EPS-impact and legal-liability sizing."]])
bullet("your other principal risks in dollars (credit/market, operational, third-party, compliance) so the CRO can "
       "place cyber on one comparable scale.", lead="Enterprise risk portfolio:  ")
bullet("pipeline in security review, review-cycle time, deals gated, trust reviews, certifications held. Powers the "
       "CISO growth view.", lead="Security as a growth engine:  ")
bullet("coverage limit, annual premium, renewal date. Powers the coverage-vs-tail gap and renewal position.",
       lead="Cyber insurance:  ")

h2("Inventory — processes, systems, crown jewels")
p("List your revenue-bearing processes (type, upload CSV, or connect a CMDB such as ServiceNow) and the systems/"
  "applications that run them (with hosting/exposure, data class, EOL, recovery, and transaction value). Nerion "
  "auto-maps applications to processes by shared data class and derives your crown jewels — the concentrations of "
  "value an attacker would target. A three-column visual map (processes → applications → crown jewels) lets you "
  "adjust the mapping.")
callout("key", "This is the most valuable section — it anchors the process → system → crown-jewel → risk → control "
        "chain that the entire platform is built on. Crown-jewel scoring uses data sensitivity × exposure × process "
        "criticality; the authoritative scoring runs on the engine at go-live.")

h2("Risks, projects & vendors")
bullet("upload open risks with dollar exposure — turns the crown-jewel map into a material-exposure figure and feeds "
       "the Monte-Carlo tail model.", lead="Risk register:  ")
bullet("upload in-flight cyber spend (cost, expected ROI, status) or pull from ticketing — managed alongside new "
       "decisions in the cockpit.", lead="Current cyber projects:  ")
bullet("capture tier-1/2 vendors (CSV or TPRM API). Your monitoring service then rates each live in the cockpit’s "
       "third-party panel.", lead="Third-party vendors:  ")

h2("Connect your tools")
p("Most of your evidence is pulled live from here. Nerion ships native connectors across the security and operations "
  "stack; connecting a tool turns modeled placeholders into live readings. An evidence-credibility meter shows how "
  "much of the cockpit is grounded in your data.")
callout("tip", "Demo mode connects all tools with simulated signals (clearly labelled “Demo”, never counted as real) so "
        "you can explore before wiring live API keys.")
p("Go live submits your description to the platform, which ingests it, runs the crown-jewel and economics engines, "
  "and builds the cockpit.")

# ============================ 4 · COCKPIT ============================
h1("The Cockpit")
h2("Layout")
p("The cockpit has three constants: the seat bar (top) switches lenses; the seat header shows whose cockpit you are "
  "in and an “as of” timestamp; and the tab bar organizes that seat’s content. Most seats have five tabs; the CISO "
  "has six.")
h2("Reading a metric")
p("Hover any box for a short explanation. Tap it to open the inspection panel (Chapter 1) — formula, method, inputs "
  "(ending in a “= result” row), sources and why-it-matters. A not-connected metric names the exact tool to connect "
  "and shows where the data will come from, rather than a placeholder number.")

# ============================ 5 · DECISIONS ============================
h1("Decisions")
p("A decision is the unit of action in Nerion. Every executive seat surfaces the cyber calls that need that leader — "
  "and each is a real, interactive decision, not a read-only note.")
h2("The decision lifecycle")
steps([("See the options", "Each decision presents its options with the recommended one marked. You always have "
        "alternatives (e.g. defer, or accept the risk with a rationale) — the recommendation never removes the choice.",
        "Pros and cons are shown per option, priced from your exposure model."),
       ("Choose & record", "Selecting an option records it, stamped with the seat leader’s name and the timestamp.",
        "The card shows “Decision by <name> (<SEAT>) · Option X · <time>”."),
       ("Edit within 24 hours", "For 24 hours the decision stays editable — pick a different option, or undo. After "
        "that it commits and locks.", "Header changes from “✓ Recorded” to “\U0001f512 Committed”."),
       ("Track to done", "Where you connected Jira / ServiceNow at onboarding, choosing auto-opens a tracked project. "
        "Its status is pulled back — on refresh and on a periodic poll — on a four-step track "
        "(Open → In review → In progress → Done).",
        "If no ticketing system is connected, it records in Nerion and prompts you to connect one.")])
callout("note", "Decisions are framed on your exposure model — your risk register × the control-value ledger — with no "
        "AI at run-time. Each committed decision also feeds the cyber-initiatives portfolio (cost, ROI, owner, status).")

# ============================ 6 · SEAT REFERENCE ============================
h1("Seat-by-Seat Reference")
p("Each seat draws from the same onboarding description and live signals; they differ in lens, not in underlying "
  "data. Tap any metric in-app for its full trace.")

def seat(title, subtitle, tabs_rows, note=None):
    h2(title); p(subtitle, italic=True, color=MUTE)
    table(title + " — tabs", ["Tab", "What it covers"], tabs_rows, widths=[1.7, 4.8], cap_kicker="TABS")
    if note: callout("note", note)

seat("CISO — Security",
     "Where is exposure, and are the controls actually working? The deepest seat — six tabs.",
     [["01 Program health", "Active-compromise status, capability & coverage (X of N defences ≥75% healthy), "
                            "third-party risk, and direction (claims “improving” only with ≥2 recorded quarters)."],
      ["02 Top exposure", "Modeled exposure decomposed into drivers (identity, patch, vendor, endpoint, email), each "
                          "priced and traceable to its controls."],
      ["03 Effectiveness", "Risk removed, security spend, return per dollar — with the per-control breakdown."],
      ["04 Threats", "Live attack status and kill-chain coverage from SIEM/EDR + threat-intel."],
      ["05 Peers", "Your maturity vs a published baseline (or live opted-in cohort), with your percentile."],
      ["06 Frameworks", "Control assessment across NIST CSF, 800-53, SOC 2, HIPAA, CIS — CMMI, crosswalk, PDF export."]])
seat("CEO — Chief Executive", "Is cyber a tailwind or a risk to the strategy?",
     [["01 Enterprise health", "Business health vs strategic objectives; how many are cyber-safe."],
      ["02 Strategic risk", "Cyber mapped to each objective."],
      ["03 Financial exposure", "Modeled exposure vs board appetite; largest driver, interruption, insurance."],
      ["04 Brand & trust", "Customer incidents, disclosures, trust signal."],
      ["05 Decisions", "Strategic cyber calls — interactive."]])
seat("CFO — Finance", "Dollar exposure, the insurance gap, and the ROI.",
     [["01 Financial exposure", "Total exposure, appetite, headroom; drivers, interruption, coverage."],
      ["02 Cyber ROI", "Risk removed ÷ spend, with return by budget area."],
      ["03 Insurance", "Cover vs 1-in-20-year tail, residual gap, renewal leverage."],
      ["04 Cost optimization", "Redeployable savings (retire / consolidate / right-size)."],
      ["05 Risk decisions", "Invest / transfer / accept — interactive."]])
seat("COO — Operations", "Can the business keep running through a disruption?",
     [["01 Resilience", "Continuity, processes protected, recovery readiness."],
      ["02 Processes", "Cyber status per critical process."],
      ["03 Supply chain", "Tier-1 vendors, single points of failure."],
      ["04 Recovery", "RTO/RPO vs target, backups, identity recovery."],
      ["05 Decisions", "Operational calls — interactive."]])
seat("CTO — Technology", "Which systems carry the business, and stack health.",
     [["01 Tech risk", "Platform health, known-exploitable vulns, technical debt, app-sec."],
      ["02 Reliability", "Availability/SLOs, service incidents."],
      ["03 AI risk", "AI inventory, governed %, data-access exposure."],
      ["04 Supply chain", "Dependency advisories, SBOM, build signing."],
      ["05 Decisions", "Patch / fund — interactive."]])
seat("CPO — Product", "Does the product ship secure by design?",
     [["01 Product security", "Verdict across every dimension (incidents, SCA, SAST); secure-by-design coverage "
                              "(evidenced ÷ 5 target practices); open product risks."],
      ["02 Customer trust", "MFA/feature adoption, customer-data protection, trust signal."],
      ["03 Velocity", "Security-gate pass rate, cycle time, recurring blocker."],
      ["04 Backlog", "Product-security backlog."],
      ["05 Decisions", "Product calls — interactive."]])
seat("CRO — Chief Risk", "How cyber sits beside the other principal risks.",
     [["01 One scale", "Cyber ranked on one residual scale beside credit/market, operational, third-party, compliance."],
      ["02 Appetite", "Residual vs limit by category."],
      ["03 Assurance", "Control families assured by evidence (X of N)."],
      ["04 Trend & ownership", "Residual trend and named owners."],
      ["05 Decisions", "Treat / monitor / accept — interactive."]])
seat("CLO — General Counsel", "Obligations surfaced, never a legal conclusion. Not legal advice.",
     [["01 Regulatory", "Obligations by jurisdiction with clocks and penalties; the tightest binding clock."],
      ["02 Notification", "Breach-notification readiness; the forensic gap."],
      ["03 Contracts", "Cyber warranties, platform-tied contracts, legal holds."],
      ["04 Privacy", "DSARs within SLA, records of processing, access hygiene."],
      ["05 Decisions", "One action reducing three legal exposures — interactive."]])
seat("Internal Audit — Chief Audit Executive", "Evidence-based control assurance, not self-attested.",
     [["Coverage / Testing / Findings / Evidence / Attention", "Audit plan, workpapers and assurance mapped to GRC, "
                                                              "with repeat-finding and coverage views."]])
seat("Board — Directors", "Oversight, disclosure readiness, and peer comparison.",
     [["Health / Material / Trend / Investment / Governance", "Board-level cyber health, materiality (Item 106), "
                                                            "residual trend, program ROI, oversight — printable Board Pack."]])

# ============================ 7 · CONNECTORS & SIGNALS ============================
h1("Connectors & Signals")
p("Connecting a tool streams live signals that replace modeled placeholders. Nerion scores ten security "
  "capabilities; a broader set of signals drives the executive panels.")
h2("The ten scored capabilities")
table("Capability → vendor tools → signal → what it drives",
      ["Capability", "Example tools", "Signal", "Drives"],
      [["Endpoint Detection & Response", "CrowdStrike / Defender", "edr_pct", "Controls coverage, risk-removed"],
       ["Multi-Factor Authentication", "Okta / Entra ID", "mfa_pct", "Identity exposure, fraud"],
       ["Privileged Access Management", "CyberArk / BeyondTrust", "pam_pct", "Identity exposure"],
       ["Vulnerability & Patch Mgmt", "Qualys / Tenable", "patch_pct", "Attack surface"],
       ["Security Awareness", "KnowBe4 / Proofpoint", "training_pct", "Phishing exposure"],
       ["SIEM / Detection", "Splunk / Sentinel", "siem_coverage_pct", "Detection coverage"],
       ["Data Loss Prevention", "Purview / Forcepoint", "(no live signal)", "Shown not-connected"],
       ["Network Segmentation", "Illumio / firewall", "(no live signal)", "Shown not-connected"],
       ["Backup & Recovery", "Rubrik / Veeam", "backup_immutable_pct", "DR readiness"],
       ["Cloud Security Posture", "Wiz / Prisma", "cspm_pct", "Cloud posture, GRC"]],
      widths=[2.0, 1.7, 1.4, 1.4])
callout("note", "A capability’s deployment % feeds the control-value ledger: each control carries a risk-removal "
        "weight from its NIST CSF/800-53 mapping × its live deployment. That ledger turns “60% PAM coverage” into a "
        "dollar figure in the exposure model.")
h2("The signal glossary (selected)")
table("Representative live signals",
      ["Signal", "Meaning", "From"],
      [["open_incidents", "Active security incidents", "Sentinel / Splunk"],
       ["mttd_hrs / mttr_hrs", "Mean time to detect / resolve", "SIEM"],
       ["edr_pct / mfa_pct / pam_pct", "Endpoint / MFA / privileged coverage", "EDR · IdP · PAM"],
       ["patch_pct / vuln_sla_pct", "Patched / remediated-within-SLA", "Tenable / Qualys"],
       ["phishing_pct / training_pct / bec_blocked", "Click rate / training / BEC blocked", "KnowBe4 · Proofpoint"],
       ["cspm_pct", "Cloud posture checks passing", "Wiz / Prisma / AWS / Azure / GCP"],
       ["backup_immutable_pct / dr_test_days / rpo_minutes", "Backups / DR-test age / RPO", "Rubrik"],
       ["sod_conflicts / change_pass_pct / payment_anomalies", "SoD / change control / anomalies", "SAP GRC"],
       ["dsar_open / dsar_overdue / legal_holds", "Privacy requests / overdue / holds", "OneTrust / TrustArc"],
       ["threat_actors_active / exploited_cves", "Sector actors / exploited CVEs", "Recorded Future · CISA KEV"],
       ["code_scanning_open / dependabot_critical", "SAST / critical dependency alerts", "GitHub"],
       ["audit_findings_open / _repeat", "Open / recurring audit findings", "ServiceNow GRC"]],
      widths=[2.3, 2.6, 1.6])
h2("Live vs demo vs not-connected")
bullet("read from a real connected tool right now — a green “● live · <vendor>” pill.", lead="Live:  ")
bullet("a demo-mode tool with no API key; values simulated, marked “◐ demo”. Never counted as real.", lead="Demo:  ")
bullet("no matching tool — the metric shows the honest not-connected state with the exact tool to connect.",
       lead="Not connected:  ")

# ============================ 8 · FRAMEWORKS & WORKFLOWS ============================
h1("Frameworks & Key Workflows")
h2("The Frameworks tab (CISO)")
table("Supported frameworks",
      ["Framework", "Structure", "Scale"],
      [["NIST CSF 2.0", "6 functions · 22 categories · 106 controls", "CMMI 0–5 per control"],
       ["NIST SP 800-53 Rev 5", "20 families · 322 controls", "CMMI 0–5"],
       ["CIS Controls v8", "18 controls · safeguards", "crosswalked to CSF"],
       ["SOC 2 (TSC)", "13 groups · 57 criteria", "crosswalk (readiness, not an opinion)"],
       ["HIPAA Security Rule", "5 sections · 22 specs", "crosswalk via NIST SP 800-66r2"]],
      widths=[1.9, 3.0, 1.6])
p("Each control’s maturity (CMMI 0–5) is the higher of a document-review score (policies analyzed at onboarding) and "
  "a live tool-coverage score (deployment % → CMMI). A provenance icon shows whether a control is evidenced by a "
  "document, a connected tool, or not yet. Point-in-time audit is replaced by continuous monitoring; selecting a "
  "control opens an auditor workpaper (methodology, findings, recommendation, evidence) exportable as a PDF.")
h2("Peer benchmark")
p("Compare your posture to published industry medians — no data sharing required. Your position (“Top X%”) is the "
  "standard-normal percentile of your CMMI vs the baseline; opt in to a k-anonymity-sufficient live cohort to "
  "supersede the published baseline.")
h2("Board Pack export")
p("The Board seat produces a printable board/regulator report — executive summary, the financial statement of cyber "
  "risk (ALE, VaR, %-revenue, materiality, insurance), governance & disclosure readiness (SEC Item 106), KRIs, "
  "decisions, trajectory and peer comparison — via the browser’s Save-as-PDF, with a live/demo/illustrative banner.")

# ============================ 9 · ADMINISTRATION ============================
h1("Administration")
h2("Licensing and renewal")
steps([("Read the machine fingerprint", "GET /api/license/fingerprint. A licence can be bound to it so it cannot be "
        "copied to another VM.", None),
       ("Install the licence", "Place the vendor-issued license.json into config. The platform validates it "
        "cryptographically (Ed25519) — it cannot be forged or edited.", None),
       ("Watch the countdown", "GET /api/license/status drives the banner; a renewal prompt appears as expiry nears, "
        "with a short grace period after.", None),
       ("Renew", "Install a fresh licence for the new term — extends the clock without reinstalling.", None)])
table("Licence states",
      ["State", "Meaning"],
      [["active / grace", "Operating (grace = shortly past expiry, banner-warned)."],
       ["expired", "Past expiry + grace — API gated."],
       ["wrong_machine", "Licence bound to a different VM."],
       ["clock_suspect", "System clock rolled back vs the anti-rollback high-water mark."],
       ["tampered / missing", "Signature invalid / no licence file."]],
      widths=[1.7, 4.8])
h2("Tamper protection")
callout("warn", "The appliance protects the vendor’s intellectual property, not your data. If the software itself is "
        "tampered with, it seals and crypto-shreds its own protected components — it never touches, encrypts or "
        "deletes your business data. An accidental lock is cleared by a vendor-signed recovery token in minutes "
        "(GET /api/license/seal → vendor issues token → POST /api/license/unseal).")
p("Enforcement is off by default and enabled only in the shipped image (LICENSE_ENFORCE, TAMPER_SEAL_ENFORCE, "
  "LICENSE_REQUIRE_NATIVE). All customer data stays inside the appliance for the life of the subscription.")

# ============================ 10 · FAQ ============================
h1("Troubleshooting & FAQ")
def faq(q, a):
    qp = K.doc.add_paragraph(); qp.paragraph_format.space_before = Pt(8); qp.paragraph_format.space_after = Pt(2)
    run(qp, "Q  ", size=11, bold=True, color=CYAN, font=HEAD); run(qp, q, size=11, bold=True, color=NAVY)
    ap = K.doc.add_paragraph(); ap.paragraph_format.left_indent = Inches(0.28); ap.paragraph_format.space_after = Pt(4)
    run(ap, a)
faq("A number is labelled MODELED / illustrative. Can I trust it?",
    "Treat it as a model estimate, not a measurement — that is exactly what the label tells you. Tap it to see how "
    "the model runs. Connect the relevant tools (and complete onboarding) to turn modeled defaults into LIVE readings.")
faq("A tile says “Not connected”. What do I connect?",
    "Tap it — the panel names the exact source and lists the tool · connector · field under “Where it will come from”.")
faq("Why does a computed number show a value I can’t reconstruct?",
    "It shouldn’t. Every computed metric’s inputs end in a “= result” row that reproduces the value. If one doesn’t, "
    "report it — that is a defect.")
faq("Where do my decisions go?",
    "Recorded against the seat leader’s name, committed after 24 hours, and — if you connected Jira / ServiceNow — "
    "opened as a tracked project whose status is pulled back on refresh.")
faq("Does any of our data leave the environment?",
    "No. The appliance is fully offline for operation, benchmarking and licensing.")
faq("The platform is locked after a change to the VM. What now?",
    "That is the tamper seal. Send your vendor the fingerprint and nonce shown; a signed recovery token clears it in "
    "minutes. Your data is untouched.")

# ============================ GLOSSARY ============================
h1("Glossary")
gl = [
    ("ALE", "Annualized Loss Expectancy — your modeled expected annual cyber loss (MODELED)."),
    ("Control-value ledger", "Each control’s risk-removal weight (from its NIST CSF/800-53 mapping) × its live "
                             "deployment; how coverage becomes dollars."),
    ("Crown jewel", "A concentration of business value an attacker would target, derived from your processes and systems."),
    ("CMMI", "Capability Maturity Model Integration — a 0–5 maturity score used for framework controls."),
    ("Provenance", "The inputs, calculation and source behind a number, shown in its inspection panel."),
    ("Tail / VaR₉₅", "The 95th-percentile (≈1-in-20-year) annual loss from the seeded Monte-Carlo simulation."),
    ("Materiality threshold", "The loss large enough to require disclosure (e.g. a % of net income)."),
    ("Machine fingerprint", "A one-way hash of the appliance’s hardware, used to bind a licence to one VM."),
]
table("", ["Term", "Definition"], [[a, b] for a, b in gl], widths=[1.7, 4.8], cap_kicker="")

end = K.doc.add_paragraph(); end.paragraph_format.space_before = Pt(16); bdr(end, ['bottom'], sz=10, color=NAVYHX)
e1 = K.doc.add_paragraph(); e1.alignment = WD_ALIGN_PARAGRAPH.CENTER
run(e1, "NERION  ·  Cyber Business Operations Platform", size=9, bold=True, color=BLUE, spacing=30)
e2 = K.doc.add_paragraph(); e2.alignment = WD_ALIGN_PARAGRAPH.CENTER
run(e2, "Confidential — Distribution limited to licensed users", size=8, italic=True, color=MUTE)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Nerion_User_Guide.docx")
K.save(OUT)
print("saved", OUT)
