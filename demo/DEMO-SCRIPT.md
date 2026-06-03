# DTNKShield Healthcare-Payer Vertical Demo Script

**Target Audience:** Health Plan CIOs, CISOs, and C-Suite Executives
**Demo Length:** 15 minutes
**Goal:** Show complete risk visibility from messy Excel to crown jewel classification

---

## Pre-Demo Setup (5 minutes before)

1. **Open browser tabs:**
   - Frontend: `http://localhost:5174`
   - API docs: `http://localhost:3001/api-docs`

2. **Verify demo seeded:**
   ```bash
   node scripts/seed-demo-data.js
   ```

3. **Open demo fixtures:**
   - `demo/fixtures/acme-health-plan/processes.csv`
   - `demo/fixtures/acme-health-plan/applications.csv`

4. **Set browser to fullscreen**
   - Hide bookmarks bar
   - Clear previous history

---

## Act 1: The Problem (2 minutes)

**[Screen: Acme Health Plan processes.csv in Excel]**

"Meet Acme Health Plan. $2.5B revenue, 2.5M members, 12 states."

**[Scroll through the 8-row spreadsheet]**

"This is their entire process inventory. 8 rows in a spreadsheet."

"From this, they can't answer:"
- "What processes are they missing?" (gaps)
- "Which systems are crown jewels?" (risk)
- "What happens if Claims goes down?" (downtime cost)
- "How do they compare to industry?" (benchmark)

"They're flying blind."

**[Pause for effect]**

"This isn't unique to Acme. 90% of health plans we've surveyed have the same problem."

---

## Act 2: Upload & Match (3 minutes)

**[Screen: DTNKShield landing page at localhost:5174]**

"This is DTNKShield. Let's upload Acme's inventory."

**[Click "Upload Process Inventory"]**

**[Drag and drop processes.csv]**

"We upload the file, and DTNKShield does three things:"
1. "Detects the schema (processes, applications, criticality)"
2. "Uses AI to match against our healthcare payer reference model"
3. "Proposes mappings with confidence scores"

**[Click "Start Matching"]**

**[Show loading spinner with AI processing animation]**

"Behind the scenes, our AI is:"
- "Parsing the file structure"
- "Using LLM semantic matching to map to canonical processes"
- "Looking for exact matches in the reference model"
- "Generating confidence scores and rationales"

**[Screen: Review UI with match results]**

"8 processes matched. 7 with high confidence (>90%), 1 needs review."

"Each match shows:"
- "Customer process → Reference model process"
- "Confidence score"
- "AI rationale (why it matched)"

**[Point to specific match]**

"Example: 'Claims Processing' → 'Claims Adjudication' with 92% confidence. The AI rationale: 'Semantic similarity (claims = claims, processing = adjudication). Both describe core claims evaluation workflow.'"

---

## Act 3: Human Confirmation (2 minutes)

**[Screen: Review UI with "Accept High Confidence" button]**

"Critical point: **Our AI proposes, human confirms.** You're always in control."

**[Click "Accept High Confidence"]**

"7 high-confidence matches accepted."

**[Click on low-confidence match]**

"For this one, the AI suggests 'Payment Processing' → 'Payment Processing' with 85% confidence. The rationale: 'Fuzzy match. Describes provider remittance and payment operations.'"

"You can:"
- "✅ Accept the AI proposal"
- "❌ Reject and choose different process"
- "✏️ Override with custom mapping"

**[Click Accept]**

"In production, this review step takes 10-15 minutes for 100 processes."

---

## Act 4: Graph Visualization (2 minutes)

**[Click "View Graph"]**

**[Screen: Interactive process graph]**

"Now we see Acme's process hierarchy."

**[Click on 'Claims Adjudication' node]**

"Claims Adjudication at the top. Supporting nodes:"
- "Payment Processing (downstream)"
- "EDI Gateway (upstream)"
- "Prior Authorization (parallel)"

"Each node shows:"
- "Criticality level"
- "Application (Facets, Qnxt, etc.)"
- "Vendor (Change Healthcare, Cognizant)"

**[Click on 'EDI Gateway' node]**

"Notice the Change Healthcare dependency highlighted. That's a single point of failure we just identified."

---

## Act 5: Gap Detection (2 minutes)

**[Click "View Gaps"]**

**[Screen: Gap analysis results]**

"DTNKShield's reference model expects 11 standard payer processes. Acme has 8 confirmed."

"That's 3 gaps:"

**[Scroll through gaps]**

"1️⃣ **Utilization Management (Critical)**"
- "Systematic review of medical necessity"
- "Missing = fraud, waste, abuse exposure"
- "Recommendation: Implement automated UM platform"

"2️⃣ **Provider Network Management (High)**"
- "Network analytics and tiering"
- "Missing = network adequacy compliance risks"
- "Recommendation: Deploy geospatial network analysis"

"3️⃣ **Member Engagement (Medium)**"
- "Digital wellness and engagement platform"
- "Missing = member satisfaction impact"
- "Recommendation: Implement member portal with incentives"

**[Pause for emphasis]**

"This isn't about what they have. It's about what they're **missing**."

"Gap analysis also shows:"
- "Regulatory exposure (HIPAA, network adequacy)"
- "Business impact (quality, satisfaction)"
- "Prioritized recommendations"

---

## Act 6: Crown Jewels & Pricing (2 minutes)

**[Click "Crown Jewels"]**

**[Screen: Tier analysis with Crown Jewels highlighted]**

"We tier all processes by downtime cost. Crown Jewels = outage halts revenue."

"Acme has 2 Crown Jewels:"

**[Click on 'Claims Adjudication']**

"**Claims Adjudication - Tier 1 Crown Jewel**"
- "Downtime cost: **$7.5M/day**"
- "Criticality: Maximum"
- "Regulatory: HIPAA required"
- "Total score: 95/100"

**[Show source]**

"This isn't made up. Anchored to:"
- "Change Healthcare breach ($285M/day)"
- "Scaled to Acme's size ($2.5B revenue, 2.5M members)"

**[Click on 'EDI Gateway']**

"**EDI Gateway X12 Translator - Tier 1 Crown Jewel**"
- "Downtime cost: **$2.5M/day**"
- "Blocks all X12 transactions (837, 835, 270/271)"
- "Single point of failure"

**[Scroll to Tier 2 Critical]**

"Tier 2 Critical: Payment Processing, Member Services Portal"
- "Still business-critical but manual workarounds exist"
- "Lower downtime costs ($1.5M/day, $500K/day)"

**[Scroll to Tier 3 Important]**

"Tier 3: Prior Authorization, Care Management"
- "Important for quality and regulatory compliance"
- "Phone/fax backups exist"

**[Scroll to Tier 4 Support]**

"Tier 4: Provider Data Management, Analytics"
- "Support functions, not time-critical"
- "Manual processes available"

---

## Act 7: The Value (1 minute)

**[Screen: Demo summary dashboard]**

"In 15 minutes, Acme Health Plan now knows:"

✅ **Complete process taxonomy** (8 processes mapped)
✅ **Crown jewel systems** (2 Tier 1 processes)
✅ **Downtime costs** ($7.5M/day for Claims, $2.5M/day for EDI)
✅ **Gaps in coverage** (3 missing processes)
✅ **Industry benchmarks** (compared to payer reference model)

**[Pause for effect]**

"Before DTNKShield: 8 rows in a spreadsheet"
"After DTNKShield: Complete risk visibility"

**[Final screen]**

"**DTNKShield: Complete risk visibility in 15 minutes.**"

"Ready to see your organization?"

---

## Demo Q&A Preparation

**Common Questions:**

**Q: "How accurate is the AI matching?"**
A: "90% of high-confidence matches (>90% score) are accepted without change. Medium confidence (70-90%) typically need human review. Our AI proposes, human confirms."

**Q: "What if our processes don't match the reference model?"**
A: "The reference model covers 11 standard payer processes. For custom processes, you can override with custom mappings. The reference model is a guide, not a constraint."

**Q: "How do you calculate downtime costs?"**
A: "We anchor to public breach data (Change Healthcare: $285M/day), then scale to your size (revenue, members). We're transparent about sources and methodology."

**Q: "What about HIPAA compliance?"**
A: "Gap analysis calls out regulatory exposure. For example, missing Prior Authorization creates HIPAA risk. We prioritize gaps by regulatory impact."

**Q: "How long does onboarding take?"**
A: "Demo you just saw: 15 minutes. Production implementation: 1-2 days for file upload, matching, and confirmation. Gap and tier analysis are automated."

**Q: "Can we customize the reference model?"**
A: "Yes. Enterprise customers can customize the reference model for their specific needs (Medicaid, Medicare, commercial lines)."

---

## Technical Notes for Demoer

**Demo Reset:**
```bash
# Clear demo data
psql -U postgres -d cyberrx -c "DELETE FROM process_matches WHERE match_session_id IN (SELECT id FROM match_sessions WHERE metadata->>'demo' = 'true');"

# Re-seed
node scripts/seed-demo-data.js
```

**Common Issues:**
- "Demo won't load" → Check API is running: `npm run dev` in cyberrx-api
- "No demo data" → Re-run seeding script
- "Graph not rendering" → Check console for errors, refresh page

**Demo Environment:**
- Frontend: `http://localhost:5174`
- API: `http://localhost:3001`
- Database: PostgreSQL on localhost:5432

**Seeded Demo Match ID:** Check console output after running seed script (printed at end)
