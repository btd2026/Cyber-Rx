# DTNKShield Healthcare-Payer Demo Implementation

**Task:** T-233 - Claims Thin-Slice Pre-Seeded Demo
**Status:** Complete
**Date:** 2025-06-03

---

## Overview

This demo provides a complete end-to-end flow for the healthcare payer vertical, showcasing DTNKShield's capabilities from Excel upload to crown jewel classification.

### Demo Organization: Acme Health Plan

**Profile:**
- Size: Medium payer
- Revenue: $2.5B
- Members: 2.5M
- States: 12 states
- Core Platform: Facets (Change Healthcare)

**Demo Scope:**
- 8 processes (Claims thin-slice)
- 5 applications
- 2 Crown Jewels (Claims Adjudication, EDI Gateway)
- 3 Gaps (Utilization Management, Provider Network Management, Member Engagement)

---

## Demo Files Structure

```
demo/
├── fixtures/
│   └── acme-health-plan/
│       ├── processes.csv          # Process inventory (8 rows)
│       └── applications.csv       # Application inventory (5 rows)
├── DemoLanding.jsx               # Demo landing page component
├── DemoLanding.css               # Demo landing page styles
├── DEMO-SCRIPT.md                # Sales demo walkthrough script
└── README.md                     # This file

scripts/
└── seed-demo-data.js             # Demo data seeding script

workspace/artifacts/
└── T-233.out                     # Task output (this file)
```

---

## Quick Start

### 1. Seed Demo Data

```bash
# From project root
node scripts/seed-demo-data.js
```

**Output:**
```
🎯 Seeding DTNKShield Healthcare-Payer Demo...
1️⃣ Creating Acme Health Plan organization...
✅ Organization created: org_12345
2️⃣ Creating ingest session...
✅ Ingest session created: ingest_67890
3️⃣ Creating match session...
✅ Match session created: match_11223
4️⃣ Inserting AI match results...
✅ Inserted 8 match results
5️⃣ Inserting gap analysis...
✅ Inserted 3 gaps
6️⃣ Inserting tier analysis...
✅ Inserted 8 tier analysis records
7️⃣ Creating demo summary...
✨ Demo seeding complete!
📊 Demo Summary:
   Organization: Acme Health Plan
   Size: medium
   Match ID: match_11223
   Processes: 8
   Gaps: 3
   Crown Jewels: 2
🌐 Demo Access:
   Frontend: http://localhost:5174/demo/match_11223
   API: http://localhost:3001/api/mappings/match_11223
```

### 2. Access Demo

**Frontend:**
```
http://localhost:5174/demo/{matchId}
```

**API Endpoints:**
```bash
# Get match results
GET http://localhost:3001/api/mappings/{matchId}

# Get gap analysis
GET http://localhost:3001/api/mappings/{matchId}/gaps

# Get tier analysis
GET http://localhost:3001/api/mappings/{matchId}/tier-analysis
```

### 3. Run Demo Script

Follow the step-by-step sales script in `demo/DEMO-SCRIPT.md`.

---

## Demo Data Details

### Process Inventory (processes.csv)

| Process Name | Application | Criticality | Owner | Business Impact |
|--------------|-------------|-------------|-------|-----------------|
| Claims Processing | Facets | High | Claims Director | Revenue halting |
| EDI Gateway | Change Healthcare X12 | Crown Jewel | IT Director | Revenue halting |
| Provider Data Management | Manual spreadsheets | Medium | Provider Network | Data quality risks |
| Member Services | Qnxt | High | Member Services | Member satisfaction |
| Payment Processing | Facets | High | Finance | Revenue delay |
| Prior Authorization | Manual workflow | Medium | Care Management | Regulatory exposure |
| Care Management | None | Low | Care Management | Quality impact |
| Analytics & Reporting | Qnxt | Medium | Data Analytics | Regulatory reporting |

### Application Inventory (applications.csv)

| Application | Vendor | Type | Description | Hosting |
|-------------|--------|------|-------------|---------|
| Facets | Change Healthcare | Claims System | Core adjudication | On-premise |
| Change Healthcare X12 | Change Healthcare | EDI Gateway | X12 translator | Cloud (SaaS) |
| Qnxt | Cognizant | Member Platform | Enrollment & billing | On-premise |
| Manual spreadsheets | None | General Purpose | Provider tracking | Local file shares |
| Manual workflow | None | General Purpose | Prior auth (phone/fax) | Hybrid |

### AI Match Results

| Customer Process | Reference Process | Confidence | Method |
|------------------|-------------------|------------|--------|
| Claims Processing | claims-adjudication | 92% | LLM |
| EDI Gateway | edi-gateway-x12-translator | 95% | Exact |
| Provider Data Management | provider-data-management | 88% | LLM |
| Member Services | member-services-portal | 90% | LLM |
| Payment Processing | payment-processing | 85% | Fuzzy |
| Prior Authorization | prior-authorization | 93% | LLM |
| Care Management | care-management | 89% | LLM |
| Analytics & Reporting | analytics-reporting | 87% | LLM |

### Gap Analysis

| Gap | Severity | Regulatory Impact | Business Impact |
|-----|----------|-------------------|-----------------|
| Utilization Management | Critical | High | Fraud, waste, abuse |
| Provider Network Management | High | Medium | Network adequacy |
| Member Engagement | Medium | Low | Member satisfaction |

### Crown Jewels (Tier 1)

| Process | Downtime Cost | Score | Rationale |
|---------|--------------|-------|-----------|
| Claims Adjudication | $7.5M/day | 95/100 | Revenue-critical, HIPAA required |
| EDI Gateway X12 | $2.5M/day | 91/100 | Single point of failure, blocks all X12 transactions |

---

## Integration Points

### Backend Integration

**Seeding Script:** `scripts/seed-demo-data.js`
- Creates organization
- Inserts ingest session
- Creates match session with pre-computed AI results
- Inserts gap analysis
- Inserts tier analysis

**Database Tables Used:**
- `organizations`
- `ingest_sessions`
- `match_sessions`
- `process_matches`
- `gap_analysis`
- `tier_analysis`

### Frontend Integration

**Demo Landing Page:** `demo/DemoLanding.jsx`
- Route: `/demo`
- Shows demo options and stats
- Links to demo walkthrough

**Demo Review Page:** (existing)
- Route: `/demo/{matchId}`
- Shows match results, gaps, tiers

---

## Demo Walkthrough Steps

### Act 1: The Problem (2 min)
1. Show processes.csv in Excel
2. Highlight limited visibility (8 rows)
3. Emphasize missing insights (gaps, crown jewels, downtime costs)

### Act 2: Upload & Match (3 min)
1. Upload processes.csv to DTNKShield
2. Show AI matching in progress
3. Display match results with confidence scores

### Act 3: Human Confirmation (2 min)
1. Review AI proposals
2. Accept high-confidence matches
3. Override low-confidence match

### Act 4: Graph Visualization (2 min)
1. Show process hierarchy graph
2. Click nodes to see details
3. Highlight dependencies

### Act 5: Gap Detection (2 min)
1. Display 3 missing processes
2. Show regulatory and business impact
3. Review recommendations

### Act 6: Crown Jewels & Pricing (2 min)
1. Display Tier 1 Crown Jewels
2. Show downtime costs with sources
3. Review Tier 2, 3, 4 classifications

### Act 7: The Value (1 min)
1. Summarize insights gained
2. Compare before/after
3. Call to action

---

## Sales Talking Points

**Problem:**
- "90% of health plans have process inventory in spreadsheets"
- "No visibility into crown jewels or downtime costs"
- "Blind to gaps in coverage"

**Solution:**
- "AI-powered matching to payer reference model"
- "Transparent downtime cost methodology"
- "Prioritized gap analysis"

**Value:**
- "Complete risk visibility in 15 minutes"
- "Data-driven crown jewel classification"
- "Industry benchmarking"

**ROI:**
- "Demo: 15 minutes"
- "Implementation: 1-2 days"
- "Value: Immediate visibility"

---

## Troubleshooting

**Demo Won't Load:**
```bash
# Check API is running
cd cyberrx-api
npm run dev

# Check frontend is running
cd frontend
npm run dev
```

**No Demo Data:**
```bash
# Re-seed demo
node scripts/seed-demo-data.js
```

**Graph Not Rendering:**
- Check browser console for errors
- Refresh page
- Clear browser cache

**Match ID Not Found:**
- Run seeding script again
- Copy match ID from console output
- Verify in database: `SELECT * FROM match_sessions WHERE metadata->>'demo' = 'true';`

---

## Demo Reset

```bash
# Clear demo data from database
psql -U postgres -d cyberrx -c "
DELETE FROM tier_analysis WHERE match_session_id IN (
  SELECT id FROM match_sessions WHERE metadata->>'demo' = 'true'
);
DELETE FROM gap_analysis WHERE match_session_id IN (
  SELECT id FROM match_sessions WHERE metadata->>'demo' = 'true'
);
DELETE FROM process_matches WHERE match_session_id IN (
  SELECT id FROM match_sessions WHERE metadata->>'demo' = 'true'
);
DELETE FROM match_sessions WHERE metadata->>'demo' = 'true';
DELETE FROM ingest_sessions WHERE metadata->>'demo' = 'true';
DELETE FROM organizations WHERE metadata->>'demo' = 'true';
"

# Re-seed
node scripts/seed-demo-data.js
```

---

## Next Steps

### For Sales Team:
1. Review demo script in `demo/DEMO-SCRIPT.md`
2. Practice demo walkthrough (15 minutes)
3. Customize for prospect (Medicaid, Medicare, commercial)

### For Engineering Team:
1. Add `/demo` route to frontend
2. Add demo seeding API endpoint
3. Add demo analytics tracking

### For Product Team:
1. Gather feedback from demo users
2. Prioritize feature requests
3. Expand demo to other verticals

---

## Metrics & KPIs

**Demo Success Metrics:**
- Demo completion rate: >80%
- Time to complete: <15 minutes
- Prospect engagement: High (asks questions, requests follow-up)

**Demo Feedback:**
- Clarity of AI matching
- Accuracy of crown jewel classification
- Actionability of gap analysis

**Conversion Metrics:**
- Demo → Trial: 50%
- Trial → Customer: 30%

---

## Contact

**Questions?** Contact:
- Product: product@dtnkshield.com
- Engineering: engineering@dtnkshield.com
- Sales: sales@dtnkshield.com

---

**Last Updated:** 2025-06-03
**Version:** 1.0.0
**Task:** T-233
