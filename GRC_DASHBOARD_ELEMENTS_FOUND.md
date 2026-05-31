# GRC Dashboard Elements Scan - Found 9 Elements

**Date:** 2026-05-30
**Scan Location:** `frontend/src/App.jsx`
**Purpose:** Identify remaining GRC-like dashboard elements for removal

---

## Executive Summary

Found **9 GRC-like dashboard elements** that should be reviewed for removal to complete the transformation from GRC tool to Executive Cyber Responsibility Platform.

**Recommendation:** Remove 7 elements, Keep 2 elements

---

## 🔴 REMOVE: GRC-Focused Elements (7 items)

### 1. "Days to Regulatory Risk" Dashboard Metric ⚠️ HIGH PRIORITY
**Location:** Line 10465
**Current Code:**
```javascript
{label:"Days to Regulatory Risk",val:"Now",color:"#EF4545", icon:"⚖",
 context:"[MAILING_VENDOR] gap: 47 days open. OCR investigation risk if breach occurs today."}
```

**Why Remove:**
- Pure GRC compliance metric
- Focuses on "days until regulatory penalty"
- NOT a business outcome or executive accountability metric
- Replaced by business impact metrics (revenue at risk, member impact)

**Executive Platform Alternative:** Show "Days to Business Disruption" instead

---

### 2. "Regulatory License Risk" CRO Narrative ⚠️ HIGH PRIORITY
**Location:** Line 10566-10568
**Current Code:**
```javascript
{title:"Regulatory License Risk", icon:"🏛", color:"#EF4545",
 narrative:"State Department of Insurance market conduct examination authority includes cybersecurity. [ORG]'s combination of unencrypted PHI (F-003), MFA gaps (F-001), SIEM retention failures (F-006), and expired BAAs (F-017) creates a pattern that could trigger a DOI enforcement action or corrective action plan if a breach occurs...",
 likelihood:"Medium", impact:"Catastrophic", trend:"Stable"}
```

**Why Remove:**
- Focuses on "DOI enforcement action" - GRC language
- Talks about "license conditions" and "corrective action plans"
- NOT about business impact (revenue loss, member churn, brand damage)
- Executive platform should show "Operational Continuity Risk" instead

**Executive Platform Alternative:** Replace with "State Market Operations Risk" focusing on inability to operate in key markets

---

### 3. "Regulatory Compliance Status" Grid ⚠️ REMOVE
**Location:** Lines 19483-19504
**Current Code:**
```javascript
{/* Regulatory status grid */}
<div style={{marginBottom:16}}>
  <div style={{color:C.muted,fontSize:10,fontWeight:700,
    textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>
    Regulatory Compliance Status
  </div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
    {Object.keys(selAppData.regs).map(function(reg){
      var status = selAppData.regs[reg];
      var bs = regBadge(status);
      var labels = {hipaa:"HIPAA",nist:"NIST",pci:"PCI DSS",cms:"CMS"};
      return (
        <div key={reg} style={{background:bs.bg,border:"1px solid "+bs.fg+"30",
          borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
          <div style={{color:C.muted,fontSize:9,fontWeight:700,
            textTransform:"uppercase",marginBottom:4}}>{labels[reg]}</div>
          <div style={{color:bs.fg,fontSize:13,fontWeight:800}}>{status}</div>
        </div>
      );
    })}
  </div>
</div>
```

**Why Remove:**
- Shows HIPAA, NIST, PCI, CMS compliance status
- Pure GRC compliance tracking
- Executive platform focuses on "Controls Tested" and "Gaps Found" (business outcomes)
- Compliance status is a means to an end, not the end itself

**Executive Platform Alternative:** Already have "Controls Tested" / "Gaps Found" metrics

---

### 4. "State DOI Fines" Calculation ⚠️ REMOVE
**Location:** Lines 1317-1326
**Current Code:**
```javascript
// ── 8. State DOI Fines ──────────────────────────────────────────
if (statesNum > 0) {
  var doiFine = Math.round(statesNum * 2.5);
  rows.push({
    cat:"Regulatory",
    label:(statesNum>1?"Multi-State ":"")+"DOI Regulatory Fines",
    exp:doiFine,
    formula:statesNum+" state"+(statesNum>1?"s":"")+" × $2.5M avg per state (NAIC model law, state breach notification laws)"
  });
}
```

**Why Remove:**
- Depends on `statesNum` variable from removed numStates question
- Calculates "DOI regulatory fines" - GRC penalty focus
- Multi-state enforcement is GRC complexity, not executive accountability
- Without state selection, this calculation is invalid

**Executive Platform Alternative:** Remove entirely (state selection no longer exists)

---

### 5. State-Specific Regulation Frameworks (3 entries) ⚠️ REMOVE
**Locations:**
- Line 2936: `mass_201` - "Massachusetts 201 CMR 17.00"
- Line 2937: `ny_shield` - "NY SHIELD Act + DFS Part 500"
- Line 2939: `doi_state` - "State DOI Cybersecurity Regulations (Market Conduct)"

**Why Remove:**
- State-specific compliance frameworks
- GRC tool feature for multi-state compliance tracking
- Executive platform focuses on federal frameworks (HIPAA, NIST) that apply to all operations
- State-by-state complexity is GRC, not executive accountability

**Executive Platform Alternative:** Keep only federal frameworks (HIPAA, NIST, CMS)

---

### 6. "State DOI Regulations" References in Process Data ⚠️ REMOVE
**Locations:** Lines 1133-1172 (multiple occurrences in PROCESS data)
**Examples:**
```javascript
regs:["HIPAA Security Rule","NIST CSF 2.0","SOC 2 Type II","State DOI Regulations"]
keyRisks:["State DOI audit","Claims fraud","Employer contract risk"]
boardContext:"Primary oversight is your state DOI. Cybersecurity incidents trigger state regulatory action..."
```

**Why Remove:**
- "State DOI Regulations" in regs arrays for processes
- References to "State DOI audit" as key risk
- Board context mentions "state regulatory action"
- These are GRC compliance references, not business outcomes

**Executive Platform Alternative:** Remove "State DOI Regulations" from all regs arrays, replace with business impact language

---

### 7. "Business / Regulatory Risk" Section Header ⚠️ SIMPLIFY
**Location:** Line 8875
**Current Code:**
```javascript
<div style={{color:"#EF454580",fontSize:9,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>
  Business / Regulatory Risk
</div>
```

**Why Remove:**
- "Regulatory Risk" is GRC language
- Executive platform should focus on "Business Risk" or "Operational Risk"
- Regulatory is a subset of business risk, not co-equal

**Executive Platform Alternative:** Change to "Business Risk" or "Operational & Strategic Risk"

---

## 🟢 KEEP: Executive-Focused Elements (2 items)

### 1. "Audit Ready: X%" Metric ✅ KEEP
**Location:** Line 12694
**Current Code:**
```javascript
<span style={{color:hc(report.auditReadiness),fontSize:10,fontWeight:700,
  background:hc(report.auditReadiness)+"14",borderRadius:4,padding:"2px 8px"}}>
  Audit Ready: {report.auditReadiness}%
</span>
```

**Why Keep:**
- "Audit Ready" is an executive accountability metric
- Shows preparedness for external review (audit, board examination)
- Executives care about "are we ready for audit?" - this is a governance metric
- Different from "compliance status" - it's about readiness, not ticking boxes

**Executive Platform Alignment:** ✅ Supports CLO/Board governance oversight

---

### 2. "Document Compliance Status" Section ✅ KEEP WITH REFACTORING
**Location:** Lines 18938-19560
**Current Header:** "Document Compliance Status"
**Current Metrics:** "Compliant", "Needs Attention", "Not Yet Analyzed"

**Why Keep (with refactoring):**
- Shows AI-validated policy documents
- "Compliant" documents mean controls are documented
- Executive platform needs to show "do we have documentation?"
- But header should be changed from "Compliance Status"

**Suggested Refactoring:**
- Change header from "Document Compliance Status" → **"Control Documentation"**
- Change "Compliant" → **"Verified"** or **"Valid"**
- Change "Needs Attention" → **"Requires Update"**
- Keep the AI validation feature (it's an executive enabler, not GRC)

---

## 📊 Impact Analysis

### Before (GRC Tool):
- Shows 9 GRC-focused dashboard elements
- Tracks state-by-state compliance
- Shows regulatory penalty countdowns
- Displays compliance status grids
- Focus: "Are we compliant?"

### After Removal (Executive Platform):
- **2 executive-focused elements remain**
- Removes state-specific compliance tracking
- Removes regulatory penalty focus
- Removes compliance status grids
- Focus: "Are we prepared? What's the business impact?"

---

## 🎯 Removal Priority

### Phase 1: Critical GRC Elements (Remove First)
1. ✅ "State DOI Fines" calculation (depends on removed state selection)
2. ✅ "Days to Regulatory Risk" dashboard metric
3. ✅ "Regulatory License Risk" narrative

### Phase 2: State-Specific Compliance (Remove Second)
4. ✅ State-specific regulation frameworks (mass_201, ny_shield, doi_state)
5. ✅ "State DOI Regulations" references in process data
6. ✅ "Regulatory Compliance Status" grid

### Phase 3: Language Refinement (Remove Third)
7. ✅ "Business / Regulatory Risk" → "Business Risk"
8. ✅ "Document Compliance Status" → "Control Documentation"
9. ✅ "Compliant" → "Verified"

---

## 🔧 Implementation Plan

### Step 1: Remove Critical GRC Elements (Phase 1)
```javascript
// Remove these elements:
- Line 10465: "Days to Regulatory Risk" metric
- Line 10566-10568: "Regulatory License Risk" narrative
- Lines 1317-1326: State DOI Fines calculation
```

### Step 2: Remove State-Specific Compliance (Phase 2)
```javascript
// Remove these framework entries:
- Line 2936: mass_201 framework
- Line 2937: ny_shield framework
- Line 2939: doi_state framework

// Remove from PROCESS data:
- Lines 1133-1172: "State DOI Regulations" from regs arrays
- Replace "State DOI audit" key risks with business risks
- Remove state regulatory board context
```

### Step 3: Remove Regulatory Status Grid (Phase 2)
```javascript
// Remove entire grid:
- Lines 19483-19504: Regulatory Compliance Status grid
```

### Step 4: Refine Language (Phase 3)
```javascript
// Change headers:
- Line 8875: "Business / Regulatory Risk" → "Business Risk"
- Line 18941: "Document Compliance Status" → "Control Documentation"

// Change labels:
- Line 18952: "Compliant" → "Verified"
- Line 18953: "Needs Attention" → "Requires Update"
```

---

## ✅ Success Criteria

After removal:
- [ ] No state-specific compliance tracking
- [ ] No regulatory penalty countdowns
- [ ] No "compliance status" grids
- [ ] All language focuses on business outcomes
- [ ] Dashboard shows 2 executive-focused elements (Audit Ready, Control Documentation)
- [ ] No references to "State DOI Regulations" in process data
- [ ] No state-by-state complexity in risk calculations

---

## 📝 Next Steps

**Option A: Remove all 7 GRC elements now**
- Cleanest break from GRC tool positioning
- Most complete transformation to executive platform
- ~150 additional lines of code removed

**Option B: Remove Phase 1 (critical) elements first, test, then Phase 2-3**
- Safer incremental approach
- Can test after each phase
- More commits for easier rollback

**Recommendation:** Option A (remove all at once) since:
1. Critical elements depend on removed state selection (will break without removal)
2. Cleaner git history (one transformation commit)
3. All identified elements are clearly GRC-focused (no ambiguity)

---

**Status:** ✅ Scan complete - 7 GRC elements identified for removal
**Ready to proceed:** Yes - all elements clearly categorized with removal rationale
