# CFO Agent Methodology Documentation

Complete documentation of calculation methodologies, assumptions, and data sources used in CFO Agent briefings.

**Version:** 1.0.0
**Last Updated:** 2025-06-06
**Author:** AI/ML Engineer (T-MVP-008)

---

## Table of Contents

1. [Overview](#overview)
2. [Financial Impact Methodology](#financial-impact-methodology)
3. [MLR Impact Methodology](#mlr-impact-methodology)
4. [Stop-Loss Exposure Methodology](#stop-loss-exposure-methodology)
5. [Reserve-at-Risk Methodology](#reserve-at-risk-methodology)
6. [Premium Revenue Risk Methodology](#premium-revenue-risk-methodology)
7. [Time Horizon Estimation](#time-horizon-estimation)
8. [Trend Analysis Methodology](#trend-analysis-methodology)
9. [Data Sources](#data-sources)
10. [Assumptions and Limitations](#assumptions-and-limitations)
11. [Auditing and Validation](#auditing-and-validation)

---

## Overview

### Purpose

This document provides complete transparency into how the CFO Agent calculates financial risk metrics. Every figure in a CFO briefing is traceable to its data source, calculation, and assumptions.

### Why Methodology Trails Matter

**For Board Members:**
- Understand how numbers were calculated
- Verify assumptions are reasonable
- Compare methodologies across organizations

**For Auditors:**
- Trace every figure to source data
- Validate calculation accuracy
- Ensure consistency over time

**For CFOs:**
- Defend figures to regulators
- Benchmark against industry standards
- Improve data quality over time

### Methodology Trail Format

Every CFO briefing includes a `methodology_trail` array with steps like:

```
[
  "Data Source: 12 financial impacts from T-MVP-006",
  "Calculation: Total Net Exposure = Σ(net_exposure) = $2.5M",
  "Assumption: 85% confidence interval for likelihood scores",
  "Formula: MLR Impact = (Net Exposure / $1M) × 1%",
  ...
]
```

---

## Financial Impact Methodology

### Core Formula

**Total Net Exposure = Σ(net_exposure)**

Where:
- `net_exposure` comes from `financial_impacts` table
- Each risk has a calculated `net_exposure` value
- Sum is across all risks in scope

### Cost Category Breakdown

Each financial impact includes these cost categories:

| Cost Category | Description | Source |
|---------------|-------------|--------|
| Breach Response Cost | Forensic investigation, breach notification | T-MVP-006 |
| Regulatory Fine | HIPAA penalties, state fines | T-MVP-006 |
| Business Interruption | Lost revenue during downtime | T-MVP-006 |
| Fraud Loss | Direct financial fraud | T-MVP-006 |
| Reputational Loss | Member attrition, brand damage | T-MVP-006 |
| Legal Cost | Legal fees, settlements | T-MVP-006 |
| Recovery Cost | System restoration, data recovery | T-MVP-006 |
| Insurance Coverage | Reimbursement from cyber insurance | T-MVP-006 |

### Calculations

**Gross Exposure:**
```
total_gross = breach_response_cost + regulatory_fine +
              business_interruption + fraud_loss +
              reputational_loss + legal_cost + recovery_cost
```

**Net Exposure:**
```
net_exposure = total_gross - insurance_coverage
```

### Example

**Input:**
```
breach_response_cost: $100,000
regulatory_fine: $50,000
business_interruption: $200,000
fraud_loss: $50,000
reputational_loss: $100,000
legal_cost: $75,000
recovery_cost: $125,000
insurance_coverage: $200,000
```

**Calculation:**
```
total_gross = 100,000 + 50,000 + 200,000 + 50,000 +
              100,000 + 75,000 + 125,000 = $700,000

net_exposure = 700,000 - 200,000 = $500,000
```

**Methodology Trail Entry:**
```
"Cost Category Breakdown for 'Ransomware on Claims':",
"  - Breach Response: $100,000 (14.3% of gross)",
"  - Regulatory Fine: $50,000 (7.1% of gross)",
"  - Business Interruption: $200,000 (28.6% of gross)",
"  - Fraud Loss: $50,000 (7.1% of gross)",
"  - Reputational Loss: $100,000 (14.3% of gross)",
"  - Legal Cost: $75,000 (10.7% of gross)",
"  - Recovery Cost: $125,000 (17.9% of gross)",
"  - Total Gross: $700,000",
"  - Insurance Coverage: $200,000 (28.6% reduction)",
"  - Net Exposure: $500,000"
```

---

## MLR Impact Methodology

### Purpose

Calculate how cyber risk affects Medical Loss Ratio (MLR).

**MLR = Medical Claims / Premium Revenue**

Higher cyber losses = higher claims = worse MLR.

### Core Formula

**MLR Impact % = (Net Exposure / $1,000,000) × 1.0%**

### Assumptions

1. **Baseline Assumption:** For a mid-sized health plan ($500M-$1B annual revenue), $1M of cyber exposure = 1% MLR impact
2. **Cap:** Maximum 10% MLR impact per risk (to avoid overestimation)
3. **Additivity:** MLR impacts sum across risks (total MLR impact = Σ of individual MLR impacts)

### Rationale

- **Health Plan Economics:** MLR is typically 80-85%. A 1% impact is significant.
- **Correlation:** Cyber events increase claims (e.g., ransomware delays claim payments → higher costs)
- **Conservatism:** 1% per $1M is a conservative estimate (actual could be lower or higher)

### Example

**Input:**
```
Net Exposure: $5,000,000
```

**Calculation:**
```
MLR Impact = (5,000,000 / 1,000,000) × 1.0% = 5.0%
```

**Methodology Trail Entry:**
```
"MLR Impact Calculation:",
"  - Formula: (Net Exposure / $1M) × 1% = MLR Impact %",
"  - Input: $5,000,000 net exposure",
"  - Calculation: (5,000,000 / 1,000,000) × 1.0 = 5.0%",
"  - Result: 5.0% MLR impact",
"  - Assumption: $1M exposure = 1% MLR impact for mid-sized plan",
"  - Cap: Maximum 10% per risk (not exceeded)"
```

---

## Stop-Loss Exposure Methodology

### Purpose

Calculate exposure under stop-loss insurance (reinsurance position).

**Stop-Loss Insurance:** Kicks in after individual claim threshold (e.g., $100K).

### Core Formula

**Stop-Loss Exposure = Business Interruption × 30%**

### Assumptions

1. **Business Interruption Affects Claims:** Cyber events (e.g., ransomware) delay claim processing → larger claim sizes when finally processed
2. **30% Impact:** 30% of business interruption cost affects stop-loss position
3. **Conservative:** This is a heuristic; actual impact varies by plan design

### Rationale

- **Claim Accumulation:** During outages, claims accumulate and process in batches → larger average claim size
- **Stop-Loss Triggers:** Larger claims more likely to exceed stop-loss thresholds
- **30% Factor:** Industry heuristic (may vary 20-40% by plan)

### Example

**Input:**
```
Business Interruption: $200,000
```

**Calculation:**
```
Stop-Loss Exposure = 200,000 × 0.30 = $60,000
```

**Methodology Trail Entry:**
```
"Stop-Loss Exposure Calculation:",
"  - Formula: Business Interruption × 30% = Stop-Loss Exposure",
"  - Input: $200,000 business interruption",
"  - Calculation: 200,000 × 0.30 = $60,000",
"  - Result: $60,000 stop-loss exposure",
"  - Assumption: 30% of business interruption affects reinsurance position",
"  - Context: Delayed claims → larger batch processing → higher stop-loss triggers"
```

---

## Reserve-at-Risk Methodology

### Purpose

Calculate how much of the plan's reserves are at risk from cyber events.

**Reserves:** Funds set aside for large claims and catastrophes.

### Core Formula

**Reserve-at-Risk = (Fraud Loss + Legal Cost) × 50%**

### Assumptions

1. **Fraud Affects Reserves:** Cyber fraud directly depletes reserves
2. **Legal Costs Affect Reserves:** Legal settlements often paid from reserves
3. **50% Impact:** Half of fraud + legal costs affect reserves
4. **Other Costs:** Breach response, business interruption paid from operating budget (not reserves)

### Rationale

- **Reserve Purpose:** Reserves for large claims, not operational expenses
- **Fraud Impact:** Cyber fraud often catastrophic → reserve depletion
- **Legal Impact:** Regulatory settlements paid from reserves
- **50% Factor:** Conservative estimate (actual may be higher)

### Example

**Input:**
```
Fraud Loss: $50,000
Legal Cost: $75,000
```

**Calculation:**
```
Reserve-at-Risk = (50,000 + 75,000) × 0.50 = $62,500
```

**Methodology Trail Entry:**
```
"Reserve-at-Risk Calculation:",
"  - Formula: (Fraud Loss + Legal Cost) × 50% = Reserve at Risk",
"  - Input: $50,000 fraud + $75,000 legal = $125,000",
"  - Calculation: 125,000 × 0.50 = $62,500",
"  - Result: $62,500 reserve at risk",
"  - Assumption: 50% of fraud + legal costs deplete reserves",
"  - Context: Reserves for large claims; cyber events accelerate depletion"
```

---

## Premium Revenue Risk Methodology

### Purpose

Calculate premium revenue risk from member attrition due to cyber breaches.

**Premium Revenue:** Recurring revenue from member premiums.

### Core Formula

**Premium Revenue Risk = Reputational Loss × 20%**

### Assumptions

1. **Reputation Affects Retention:** Cyber breaches damage brand → member attrition
2. **20% Revenue Impact:** 20% of reputational loss translates to premium attrition
3. **Time Horizon:** Premium loss occurs over 12-24 months (not immediate)
4. **Conservative:** Actual impact could be higher (plan-dependent)

### Rationale

- **Member Trust:** Health plans rely on trust; breaches erode trust
- **Attrition:** Members switch plans after data breaches
- **20% Factor:** Industry heuristic (varies 10-30% by plan, market)

### Example

**Input:**
```
Reputational Loss: $100,000
```

**Calculation:**
```
Premium Revenue Risk = 100,000 × 0.20 = $20,000
```

**Methodology Trail Entry:**
```
"Premium Revenue Risk Calculation:",
"  - Formula: Reputational Loss × 20% = Premium Revenue Risk",
"  - Input: $100,000 reputational loss",
"  - Calculation: 100,000 × 0.20 = $20,000",
"  - Result: $20,000 premium revenue risk",
"  - Assumption: 20% of reputational loss translates to member attrition",
"  - Context: Breach damages trust → members switch plans → premium loss"
```

---

## Time Horizon Estimation

### Purpose

Estimate when exposure will materialize (immediate, 30-days, 90-days).

### Categorization Logic

**Immediate (0-48 hours):**
- Ransomware
- Malware
- System Outage
- Service Disruption

**30-Days (1-30 days):**
- Data Breach
- Fraud
- Theft
- Unauthorized Access

**90-Days (31-90 days):**
- All other categories

### Assumptions

1. **Immediate Impact:** Ransomware and outages cause immediate operational disruption
2. **30-Day Impact:** Breaches take weeks to fully assess and contain
3. **90-Day Impact:** Long-tail risks (e.g., third-party issues)

### Rationale

Based on industry incident response timelines:
- **Ransomware:** Immediate disruption (systems locked)
- **Data Breach:** Discovery → Investigation → Notification (weeks)
- **Other:** Lower priority or slower materialization

### Example

**Input:**
```
Risk Category: "ransomware"
```

**Calculation:**
```
Time Horizon = "immediate" (based on category mapping)
```

**Methodology Trail Entry:**
```
"Time Horizon Estimation:",
"  - Input: Risk category 'ransomware'",
"  - Mapping: ransomware → immediate",
"  - Result: immediate impact (0-48 hours)",
"  - Assumption: Ransomware causes immediate operational disruption",
"  - Context: Systems locked → immediate revenue loss → urgent response required"
```

---

## Trend Analysis Methodology

### Purpose

Identify patterns, trends, and anomalies in exposure over time.

### Emerging Risk Identification

**Criteria:**
1. Likelihood ≥ 60%
2. Exposure ≥ $100,000
3. Time Horizon = "immediate" or "30-days"

**Urgency Classification:**
- **Critical:** Likelihood ≥ 80% AND Exposure ≥ $500K AND Immediate
- **High:** Likelihood ≥ 70% AND Exposure ≥ $250K
- **Medium:** Likelihood ≥ 60% AND Exposure ≥ $100K
- **Low:** All other emerging risks

### Anomaly Detection

**Criteria:**
1. **High-Impact High-Probability:** Exposure > $1M AND Likelihood > 80%
2. **Extreme Outlier:** Exposure > 5x median exposure
3. **Significant Outlier:** Exposure > 3x median exposure

### Trend Velocity Calculation

**Formula:**
```
Velocity Score = (High-Velocity % × 70) + (Medium-Velocity % × 30)
```

Where:
- **High-Velocity:** Immediate horizon + likelihood ≥ 70%
- **Medium-Velocity:** 30-day horizon

**Interpretation:**
- **≥70:** Rapid change (weekly monitoring)
- **40-69:** Moderate change (bi-weekly monitoring)
- **20-39:** Slow change (monthly monitoring)
- **<20:** Stable (quarterly monitoring)

### Example

**Input:**
```
Total Risks: 100
Immediate High-Likelihood Risks: 10 (10%)
30-Day Risks: 20 (20%)
```

**Calculation:**
```
Velocity Score = (10% × 70) + (20% × 30) = 7 + 6 = 13
Interpretation: "Stable exposure profile (long-term risks dominate)"
```

**Methodology Trail Entry:**
```
"Trend Velocity Calculation:",
"  - High-Velocity Risks: 10 of 100 (10%)",
"  - Medium-Velocity Risks: 20 of 100 (20%)",
"  - Formula: (10% × 70) + (20% × 30) = 13",
"  - Result: Velocity score 13 (stable)",
"  - Interpretation: Long-term risks dominate; monthly monitoring sufficient"
```

---

## Data Sources

### Primary Data Sources

| Data Source | Table | Fields Used | Task |
|-------------|-------|-------------|------|
| Financial Impacts | `financial_impacts` | All cost categories, net_exposure | T-MVP-006 |
| Risk Objects | `risks` | risk_id, title, likelihood, business_process | T-MVP-005 |
| Agent Briefings | `agent_briefings` | briefing, metadata, generated_at | T-MVP-008 |
| Agent Metrics | `agent_metrics` | briefings_generated, tokens_used, cost | T-MVP-008 |

### Data Flow

```
[T-MVP-005: Risk Normalization] → [PostgreSQL:risks]
                                      │
                                      ▼
                                 [CFO Context Manager]
                                      │
                                      ▼
[T-MVP-006: Financial Modeling] → [PostgreSQL:financial_impacts]
                                      │
                                      ▼
                                 [CFO Agent]
                                      │
                                      ▼
                           [PostgreSQL:agent_briefings]
```

### Data Freshness

- **Financial Impacts:** Updated daily (or on risk change)
- **Risk Objects:** Updated daily (or on risk change)
- **Briefings:** Real-time (generated on demand)
- **Metrics:** Aggregated daily

---

## Assumptions and Limitations

### Key Assumptions

1. **MLR Impact:** $1M exposure = 1% MLR impact (mid-sized plan baseline)
2. **Stop-Loss:** 30% of business interruption affects reinsurance
3. **Reserves:** 50% of fraud + legal costs deplete reserves
4. **Premium Attrition:** 20% of reputational loss translates to premium loss
5. **Time Horizon:** Risk categories map to time horizons (immediate/30/90-day)
6. **Likelihood Scores:** 85% confidence interval (estimates vary by plan)

### Limitations

1. **Plan Size:** Methodologies calibrated for mid-sized plans ($500M-$1B revenue)
   - Small plans may have higher per-$1M impact
   - Large plans may have lower per-$1M impact (economies of scale)

2. **Plan Design:** MLR impact varies by plan design
   - Medicare Advantage vs. Commercial vs. Medicaid
   - Different risk pools, different MLR baselines

3. **Geography:** Regional variation in regulatory fines, breach notification

4. **Insurance:** Not all plans have cyber insurance (net = gross if no insurance)

5. **Data Quality:** Methodologies only as good as input data
   - Garbage in, garbage out
   - Requires accurate likelihood estimates

### Recommended Improvements

1. **Plan-Specific Calibration:** Calibrate MLR impact to actual plan data
2. **Historical Validation:** Compare predictions to actual losses
3. **Scenario Testing:** Test against real cyber incidents
4. **Sensitivity Analysis:** Vary assumptions (20%, 30%, 40% instead of 30%)

---

## Auditing and Validation

### How to Audit a Briefing

**Step 1: Check Data Sources**
```
Verify:
- financial_impacts table has data for organization
- risks table has enriched risk objects
- All calculations trace back to source records
```

**Step 2: Validate Calculations**
```
Verify:
- Total exposure = Σ(net_exposure)
- MLR impact = (net_exposure / $1M) × 1%
- Stop-loss = business_interruption × 30%
- etc.
```

**Step 3: Check Assumptions**
```
Verify:
- MLR impact assumptions appropriate for plan size
- Insurance coverage accurately reflected
- Likelihood scores within reasonable range (0-1)
```

**Step 4: Review Methodology Trail**
```
Verify:
- All steps documented
- Calculations transparent
- Assumptions stated
```

### Validation Checklist

- [ ] All figures traceable to data sources
- [ ] Calculations mathematically correct
- [ ] Assumptions reasonable for organization
- [ ] Methodology trail complete
- [ ] NO PHI in briefing (validated)
- [ ] Timestamps correct (data freshness)
- [ ] Recommendations supported by data

### Common Audit Findings

1. **Stale Data:** Financial impacts not updated (recommend daily refresh)
2. **Missing Insurance:** Insurance coverage = 0 (verify plan has no insurance)
3. **Overestimated MLR:** Plan is small/large (recalibrate for plan size)
4. **Underestimated Likelihood:** Likelihood scores too conservative (update risk assessment)

---

## Support

For methodology questions:

- **Documentation:** This document
- **GitHub:** https://github.com/cyberrx/cyberrx/issues (tag: methodology)
- **Email:** support@cyberrx.com

---

## Changelog

### Version 1.0.0 (2025-06-06)

**Initial Release:**
- Core methodologies documented
- MLR, stop-loss, reserve-at-risk, premium revenue risk
- Time horizon estimation
- Trend analysis
- Data sources and assumptions

---

**Document Version:** 1.0.0
**Last Updated:** 2025-06-06
**Author:** AI/ML Engineer (T-MVP-008)
