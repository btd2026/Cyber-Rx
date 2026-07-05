# HANDOFF — Nerion (changes since last session + how to continue)

This is the narrative companion to `CLAUDE.md`. Read `CLAUDE.md` first for the rules and the
architecture map; this file is the **what changed**, **why**, and **what to do first**.

---

## A. What changed since yesterday

All changes are in `cyberrx-ciso-os.html` (then rebuilt into `cyberrx-platform.html` via `build.js`).

1. **Every download now offers PowerPoint + PDF, generated from LIVE results.**
   - Added `dlPPTX` / `dlPDF` (branded: navy title slide, United-blue section slides; PDF with blue header rule).
   - Content is pulled from `frameworkResults()` (the live assessment for the selected framework) — not placeholder text. CSV export (`evidenceCSVlive`) emits real per-control rows.
   - Five export points: Board pack, Auditor report, Evidence package (+ raw CSV), Audit trail, Decision ledger. Each has `data-dl="pptx|pdf"` + `data-doc="…"`; one delegated handler dispatches via `DOC_BUILDERS`.
   - Download trigger uses `output('blob')` / `write({outputType:'blob'})` + a manual anchor (`_blobDL`) — the libraries' own `save()`/`writeFile()` were silently blocked in the iframe/local-file context.

2. **Libraries bundled as base64 `data:` URIs (this was a bug fix, twice over).**
   - First we loaded jsPDF + PptxGenJS from a CDN → failed when the file is opened locally → downloads fell back to `.txt`.
   - Then we inlined them as raw `<script>` → the PptxGenJS bundle's internal `</script>` (in a CDN usage example) closed the tag early and **dumped raw JS onto the page** (symptom: voice plays, UI is replaced by minified code).
   - Final fix: embed each library as `<script src="data:text/javascript;base64,…"></script>`. Base64 can't contain `</script>`, so it can't break out. **This is now a hard rule — see the LANDMINE section in `CLAUDE.md`.**

3. **Benchmark is now explicitly per-framework.**
   - The engine already compared you only against peers on the *same* framework (`drawBench` reads `curFwKey`); the UI now makes it unmistakable: the button and modal name the active framework and re-point on tab switch (`syncBenchFw`). Added the missing MITRE peer cohort to `COHORT`.

4. **War Room expanded** with five live-from-the-stack panels (live-incident view): Automated containment (what EDR/SOAR/identity already did), Recovery & resilience (RPO/RTO/last clean backup), Threat intelligence & attribution (actor, IOCs, **live MITRE ATT&CK techniques observed**), Regulatory exposure clocks (SEC/HIPAA/state/insurer countdowns), Incident bridge (IC, IR retainer, forensics/legal hold, counsel, law enforcement). Standby view gained a Response-readiness panel.

5. **Items 1–3 from the gap analysis, shipped as new top-bar panels:**
   - **Live data / data trust** (click the "LIVE · streaming" pill): 9 connectors with status, last sync, signal counts, coverage %, and what each feed drives (CyberArk shown *degraded 60%* so the lineage explains the open-path gap).
   - **Risk model** (`📐 Risk model`): FAIR + Monte-Carlo methodology behind $94M / $156M VaR — evidenced input ranges, loss-driver bars, sensitivity, model governance.
   - **Remediation & closure** (`✓ Remediation`): decision → owned action → due → **dollar exposure removed** → **re-test that proves it closed**, with status pills and ROI summary.

Earlier in the program (prior sessions): the universal 45-industry adaptation system, per-seat structural packs, MITRE ATT&CK as a first-class framework, and the United Airlines re-skin. See `CLAUDE.md` §5 for where each lives.

---

## B. The gap analysis (why the roadmap is ordered this way)

Honest verdict: as a **spec** it's exceptional and clearly differentiated. As a **$600K–$1M
product** the gap is the *"is it real and defensible"* layer. The mock demonstrates the
**executive layer** beautifully but assumes the **data layer** and the **action layer**. A
$1M buyer pays for trust and outcomes, not screens. That's why the roadmap leads with making
data real (P0) before adding more surface area.

The roadmap (P0–P4) is in `CLAUDE.md` §7. Items 1–3 (P0) are now *shaped* in the mock; the
real work is wiring them to live integrations and a real quantification/scoring engine.

Differentiation guardrail: stay out of GRC. Lead with exposure → decision → defense → incident
command. Frameworks are *evidence that feeds decisions*, not the product's front door.

---

## C. First task for Claude Code (suggested kickoff prompt)

Paste this as your first message in Claude Code, in the repo that contains the three HTML
files + `build.js` + `CLAUDE.md` + `HANDOFF.md`:

> Read `CLAUDE.md` and `HANDOFF.md` in full before doing anything. This repo is the reference
> spec for Nerion, an executive cyber-risk decision platform (not a GRC tool). We are now
> building the real product.
>
> First, confirm you understand: (1) the build/validate workflow and the `</script>` data-URI
> landmine, (2) the config-driven data model (`ARCH`/`IND`/`SEAT_PACKS`, `FW`/`frameworkResults`,
> `EVIDENCE`, `SEATS`, the export `DOC_BUILDERS`, the War Room, and Items 1–3), and (3) the
> positioning vs Vanta/GRC.
>
> Then propose a production architecture for **P0 — make the data real**: the connector
> framework (read-only OAuth/API to Okta, CrowdStrike, Splunk, CyberArk, Rubrik, ServiceNow,
> SecurityScorecard, AWS, Azure), the control-scoring engine that feeds `frameworkResults()`'s
> shape, and per-number lineage/freshness/confidence. Map each piece back to the exact mock
> screen it must reproduce. Do not write product code yet — give me the architecture, the data
> contracts, and the build order, and flag anything in the mock that won't survive contact with
> real data.

When you do start editing the mock again, keep the build/validate loop and the data-URI rule.

---

## D. Quick reference — verify the build is healthy

```bash
# 1. validate OS app script
node -e "const f=require('fs').readFileSync('cyberrx-ciso-os.html','utf8');
const b=[...f.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const main=b.find(x=>x.includes('DOC_BUILDERS')&&x.includes('renderWar'));
new Function(main); console.log('OS app OK; closers:',(f.match(/<\/script>/g)||[]).length,'(want 3)');"

# 2. rebuild combined
node build.js   # -> "rebuilt with login, bytes: N"

# 3. confirm embedded copy is clean (3 closers, app parses)
node -e "const f=require('fs').readFileSync('cyberrx-platform.html','utf8');
const m=f.match(/OSDOC\s*=\s*['\"]([A-Za-z0-9+/=]{200,})['\"]/);
const os=Buffer.from(m[1],'base64').toString('utf8');
console.log('embedded closers:',(os.match(/<\/script>/g)||[]).length,'(want 3)');"
```
