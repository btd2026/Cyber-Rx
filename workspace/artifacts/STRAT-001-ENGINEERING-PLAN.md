# M-STRAT Engineering Implementation Plan
**Engineering Manager Assessment: Strategic Refocusing Execution**

**Date:** 2026-05-30
**Branch:** feature/strategic-refocusing
**Status:** Planning Phase

---

## Executive Summary

**Challenge:** Execute 7 M-STRAT tasks to remove GRC drift and reposition CyberRx as an Executive Cyber Responsibility Platform.

**Technical Constraint:** App.jsx is 24,539 lines (larger than context window). Cannot load entire file.

**Solution:** Surgical, line-range-specific edits with comprehensive testing after each change.

---

## Technical Assessment

### Current State Analysis

**App.jsx Structure:**
- **Total Lines:** 24,539
- **CISO Dashboard (CISODash):** Lines 7769-8500+ (731+ lines)
- **Compliance Grids:** Lines 9313-9700+ (387+ lines)
- **Navigation:** Lines 113-132 (top-level routes)
- **Dashboard Headers:** Integrated within each dashboard component

**Compliance Grid Location (T-STRAT-001):**
- **HIPAA Grid:** Lines 9464-9512
- **SOC2 Grid:** Lines 9522-9570 (estimated)
- **CMS Grid:** Lines 9580-9628 (estimated)
- **NIST Grid:** Lines 9638-9686 (estimated)
- **CIS Grid:** Lines 9696-9744 (estimated)

**Risk Assessment:**
- **Risk Level:** HIGH (editing large file without full context)
- **Mitigation:** Line-range-specific edits, comprehensive testing, incremental commits
- **Rollback:** Git branch allows safe rollback if issues arise

---

## Implementation Strategy

### Phase 1: Preparation (Day 1, Hours 1-2)

**Step 1: Create Line Range Map**
```bash
# Map exact line ranges for each component
grep -n "HIPAA grid\|SOC2 grid\|CMS grid\|NIST grid\|CIS grid" App.jsx
```

**Step 2: Backup Current State**
```bash
# Create checkpoint before making changes
git commit -am "checkpoint: before M-STRAT refactoring"
```

**Step 3: Create Test Scenarios**
- CISO dashboard loads without errors
- Compliance score displays correctly
- Drill-down functionality works
- No console errors or warnings

### Phase 2: Execute M-STRAT Tasks (Day 1-7)

#### T-STRAT-001: Collapse Compliance Grids (Day 1, Hours 2-4)

**Objective:** Replace separate framework grids with single compliance score card.

**Implementation Approach:**

**Option A: Surgical Edit (RECOMMENDED)**
1. Read lines 9313-9700 (compliance grids section)
2. Replace grid tabs with single score card
3. Preserve all data structures (HIPAA_CONTROLS, SOC2_CONTROLS, etc.)
4. Add drill-down functionality

**Option B: Component Extraction (ALTERNATIVE)**
1. Create new ComplianceScoreCard component
2. Import and use in CISODash
3. Leave old grids in place (hidden) for fallback

**Decision:** Option A (Surgical Edit) - cleaner, preserves data structures, less code duplication.

**Line Ranges to Modify:**
- Lines 9313-9338: Replace framework tabs with score card
- Lines 9339-9359: Remove grid tab navigation
- Lines 9361-9512: Replace grid rendering with score card + drill-down button
- Preserve: All control data structures (lines 1946-2200)

**Acceptance Criteria:**
- Single "Regulatory Compliance Score: 89%" card displays
- Click score → drill-down to framework breakdown (modal)
- All backend data preserved (no breaking changes)
- No console errors
- Load time improved (fewer components)

**Testing:**
```bash
cd frontend
npm run dev
# Navigate to CISO dashboard
# Verify: Score card displays, drill-down works, no errors
```

#### T-STRAT-002: Remove Framework Browse UI (Day 1, Hours 5-6)

**Objective:** Remove browseable framework catalogs. Keep in Setup only.

**Line Ranges to Modify:**
- Search: `/frameworks` route
- Remove: Framework browse page component
- Preserve: Framework selection in Setup wizard
- Preserve: All framework data structures

**Implementation:**
1. Find framework browse route in navigation (lines 113-132)
2. Remove route entry
3. Preserve Setup wizard framework selection
4. Test: Setup wizard still works

#### T-STRAT-003: Remove Policy Library UI (Day 2, Hours 1-2)

**Objective:** Delete policy catalog, upload, categorization. Reposition Evidence Repository.

**Line Ranges to Modify:**
- Find: `/policies` route
- Remove: Policy upload, browse, categorization UI
- Reposition: Evidence Repository as "Control Effectiveness Proof"
- Delete: Policy data model (if exists)

#### T-STRAT-004: Replace Risk Heatmap (Day 2, Hours 3-4)

**Objective:** Remove generic heatmap. Replace with Business Process Risk Register.

**Line Ranges to Modify:**
- Find: CRO Dashboard component (CRODash function)
- Locate: Risk heatmap rendering
- Replace: With ranked Business Process Risk Register
- Preserve: Risk scoring data model

#### T-STRAT-005: Update Messaging (Days 3-4, Hours 1-4)

**Objective:** Update landing, dashboard headers, navigation to "Executive Cyber Responsibility Platform".

**Line Ranges to Modify:**
- Landing page header (lines 16740+)
- Dashboard headers (CISODash, CIODash, CLODash, CFODash, CRODash, BoardDash)
- Navigation structure (lines 113-132)
- Add: Correlation engine as hero feature

#### T-STRAT-006: Reorganize Navigation (Days 5-6, Hours 1-4)

**Objective:** Elevate Business Processes to top-level. Group executive dashboards. Bury compliance.

**Line Ranges to Modify:**
- Navigation structure (lines 113-132)
- Add: Business Processes expanded navigation
- Group: Executive dashboards under single nav entry
- Hide: Attack Paths from navigation
- Bury: Compliance in Setup only

#### T-STRAT-007: Global Text Replacement (Day 7, Hours 1-2)

**Objective:** Replace "annual" → "continuous", "quarterly" → "real-time".

**Implementation:**
```bash
# Global search and replace
cd frontend/src
grep -r "annual compliance review" App.jsx
grep -r "quarterly assessment" App.jsx
# Replace with: "continuous monitoring", "real-time updates"
```

---

## Risk Mitigation

### Risk 1: Breaking Large File
**Mitigation:** Line-range-specific edits only. Never load entire file.

### Risk 2: Regressions
**Mitigation:**
- Incremental commits after each task
- Comprehensive testing after each change
- Git branch for safe rollback

### Risk 3: Data Loss
**Mitigation:**
- Preserve all backend data structures
- No database changes
- UI-only modifications

### Risk 4: Performance Degradation
**Mitigation:**
- Measure load times before/after
- Fewer components = better performance (expected improvement)

---

## Testing Strategy

### Manual Testing (After Each Task)
1. **Load Test:** Does dashboard load without errors?
2. **Functionality Test:** Do features work as expected?
3. **Visual Test:** Does UI render correctly?
4. **Console Test:** Are there no errors/warnings?

### Automated Testing (If Time Permits)
```bash
cd frontend
npm run build
# Verify: Build succeeds, no errors
```

### Regression Testing (After All Tasks)
1. **All Dashboards:** Load and verify each dashboard
2. **Correlation Engine:** Test narrative generation
3. **Navigation:** Test all routes work
4. **Responsiveness:** Test on mobile/tablet

---

## Success Metrics

### Technical Metrics
- ✅ All 7 tasks completed
- ✅ Zero console errors
- ✅ All dashboards functional
- ✅ Build succeeds without errors
- ✅ No performance degradation

### Business Metrics (Post-Launch)
- CISO sees control effectiveness (not compliance checklists)
- Navigation emphasizes Crown Jewels (not frameworks)
- Messaging positions as Executive Cyber Responsibility Platform
- Differentiation vs. Vanta/Drata/Archer clear

---

## Timeline

**Day 1 (Hours 1-8):**
- T-STRAT-001: Collapse compliance grids (4 hours)
- T-STRAT-002: Remove framework browse UI (2 hours)
- Testing & Validation (2 hours)

**Day 2 (Hours 1-8):**
- T-STRAT-003: Remove policy library UI (2 hours)
- T-STRAT-004: Replace risk heatmap (2 hours)
- Testing & Validation (2 hours)
- Buffer (2 hours)

**Day 3-4 (Hours 1-8 each day):**
- T-STRAT-005: Update messaging (4 hours)
- Testing & Validation (2 hours)
- Buffer (2 hours)

**Day 5-6 (Hours 1-8 each day):**
- T-STRAT-006: Reorganize navigation (4 hours)
- Testing & Validation (2 hours)
- Buffer (2 hours)

**Day 7 (Hours 1-4):**
- T-STRAT-007: Global text replacement (2 hours)
- Final Testing & Validation (2 hours)

**Total Time Estimate:** 7 days, ~40 hours of work

---

## Rollback Plan

**If Critical Issues Arise:**
1. Stop current task
2. Document issue
3. Git revert to last known good state
4. Assess alternative approach
5. Resume with modified plan

**Rollback Commands:**
```bash
# Revert last commit
git revert HEAD

# Or reset to checkpoint
git reset --hard <checkpoint-commit>

# Or abandon branch entirely
git checkout main
git branch -D feature/strategic-refocusing
```

---

## Next Steps

**Immediate (Next 1 hour):**
1. Create line range map for all components
2. Create git checkpoint
3. Begin T-STRAT-001 execution

**Short-Term (Today):**
- Complete T-STRAT-001 and T-STRAT-002
- Test thoroughly
- Commit changes

**Medium-Term (This Week):**
- Complete all M-STRAT tasks
- Comprehensive testing
- Prepare for M-MVP beta testing

---

## Engineering Manager Recommendation

**Proceed with M-STRAT execution.**

**Rationale:**
- Strategic assessment is clear and well-defined
- Technical approach is sound (surgical edits, incremental commits)
- Risk mitigation is comprehensive (testing, rollback plan)
- Timeline is realistic (7 days, 40 hours)

**Go/No-Go Decision:** ✅ **GO**

**Confidence Level:** HIGH (85%)

**Key Success Factors:**
- Follow line-range-specific edit approach
- Test thoroughly after each task
- Commit incrementally
- Rollback if issues arise

---

**Document Version:** 1.0
**Status:** Ready for Execution
**Next Action:** Begin T-STRAT-001 (Collapse compliance grids)
