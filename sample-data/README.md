# Sample upload data — healthcare payer

Realistic test fixtures in the onboarding upload formats, for exercising the
framework end to end. Upload them in this order so each layer links to the next.

## 1 · Business processes — `healthcare-payer-processes.csv`
13 processes. Upload at *Section 4 · Business processes*.
Columns: `name, revenue, rto, data, criticality, transactions_per_day, downtime_tolerance`.
- `revenue` drives each crown jewel's **value processed / day** (revenue ÷ 365).
- `transactions_per_day` fills the **transactions / day** metric on the crown-jewel cards.
- `downtime_tolerance` is the board-approved loss ceiling — it powers the **loss-vs-tolerance**
  bar and the escalating alarm when a crown jewel is caught in a War-Room incident.

## 2 · Systems / applications — `healthcare-payer-systems.csv`
23 systems. Upload at *Section 5 · Systems*.
Columns: `name, hosting, data, vendor, eol, recovery`.
Names match the `asset` values in the risk register and share tokens with the process
names, so the onboarding map auto-links most systems to their processes (refine any in
the visual map). This is what turns a system into a **scored crown jewel**.

## 3 · Risk register — `healthcare-payer-risk-register.csv`
27 risks. Upload at *Section 6 · Risk register*.
Columns: `title, severity, asset, exposure, status` (plus `process, likelihood, owner`).
Asset names match the systems file, so each risk links to a crown jewel and rolls up into
the material-exposure math the board and CFO see.

## 4 · Cyber projects & initiatives — `healthcare-payer-cyber-projects.csv`
17 initiatives. Upload at *Section 6b · Cyber projects & initiatives*.
Columns: `name, owner, cost, roi, status, engagement`.
- `status` (in progress / planned / completed / blocked) drives the portfolio delivered bars.
- `engagement` (design / gate) powers the CISO **“engaged early”** metric — this set is
  ~88% design.

## 5 · Growth inputs (form fields, not a file)
At *Section 2c · Security as a growth engine* enter, e.g.: pipeline in security review
**$48M**, review time before **6** / now **2** weeks, deals gated **11**, trust reviews
**34**, and tick certifications **SOC 2 Type II, HITRUST CSF, ISO 27001, HIPAA attestation**.
This lights up the CISO **Growth** tab (pipeline, cycle-time, certs, trust) — otherwise it
shows a labelled illustrative example.

---
Everything here is illustrative sample data for testing. Once uploaded, every cockpit
figure traces back to these files (or is labelled modeled/illustrative) — no hidden
hardcoded numbers.
