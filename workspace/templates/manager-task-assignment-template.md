# Manager Agent Task Assignment Template
## CyberRX Multi-Agent AI Platform - Orchestration Template

---

**Template Version:** 1.0
**Last Updated:** 2025-06-05
**Purpose:** Reusable template for Manager Agent to assign, track, and complete tasks

---

## 📋 PART 1: TASK ASSIGNMENT

### Use This Template When Assigning ANY Task

---

**TASK ASSIGNMENT**

**Task ID:** [T-XXX]
**Title:** [Task Title]
**Phase:** [Phase 0/1/2/3]
**Assigned To:** [Worker Agent Type]
**Priority:** [CRITICAL/HIGH/MEDIUM/LOW]
**Estimated Hours:** [Number]

---

### OBJECTIVE

[Clear, concise objective - what are we building and why]

**Context:** This task is part of [Phase name] and [brief context about why it matters].

**Mission:** [Specific mission statement]

---

### DELIVERABLES

**What you need to produce:**

1. **[Deliverable 1]**
   - Location: `/path/to/deliverable`
   - Format: [code/config/docs]
   - Description: [Brief description]

2. **[Deliverable 2]**
   - Location: `/path/to/deliverable`
   - Format: [code/config/docs]
   - Description: [Brief description]

[Continue for all deliverables]

---

### SUCCESS CRITERIA

**You are done when:**

- ✅ [Criterion 1]
- ✅ [Criterion 2]
- ✅ [Criterion 3]
- ✅ [Criterion 4]
- ✅ [Criterion 5]

---

### DEPENDENCIES

**Blocked by:** [List of task IDs that must complete first]

**Blocks:** [List of task IDs that depend on this one]

**Status of dependencies:**
- [ ] [Dependency 1]: [Status]
- [ ] [Dependency 2]: [Status]

---

### TECHNICAL CONTEXT

**Technology Stack:**
- Language: [Python/Node.js/TypeScript]
- Framework: [FastAPI/Express/React]
- Database: [PostgreSQL/TimescaleDB]
- Other: [Relevant technologies]

**Architecture Principles:**
- Read-only (no writes to customer systems)
- Tenant-isolated (per-customer namespaces)
- Source-native (direct data source access)
- Continuous (persistent agent state)
- Role-scoped (executive-specific outputs)

**Key Decisions:**
1. Actuarial: Batch exports
2. Claims: Nasco platform
3. LLM boundary: No PHI in LLM calls
4. Authentication: Standalone credentials
5. Threat intel: Public feeds → licensed upgrade

---

### VALIDATION REQUIREMENTS

**Your output will be validated by:**

1. **Acceptance Validator:**
   - All deliverables present
   - Success criteria met
   - Documentation complete

2. **Security Validator:**
   - No PHI/PII in LLM calls
   - Tenant isolation maintained
   - Authentication enforced
   - Audit logging present

3. **No-Regression Validator:**
   - Existing tests pass
   - No breaking changes
   - Performance not degraded

4. **Integration Validator:**
   - API calls succeed
   - Database queries work
   - Event streaming works
   - End-to-end flows tested

---

### OUTPUT REQUIREMENTS

**Code Outputs:**
- [ ] Code written to `/services/[service-name]/`
- [ ] Tests passing (unit + integration)
- [ ] Types defined (TypeScript/Python)
- [ ] Documentation updated

**Git Workflow:**
- Branch: `task/[T-XXX]-[brief-name]`
- Commit: Clear message with task ID
- PR: Created with description
- Artifact: `/workspace/artifacts/T-XXX.out`

**Artifact Contents:**
- Summary of implementation
- List of files created/modified
- Test results
- Deviations from specification
- Recommendations

---

### TIMING

**Estimated Hours:** [Number]
**Suggested Timeline:** [Weeks X-Y]
**Deadline:** [Date]
**Dependencies Status:** [All/Some/None] complete

**Blockers:**
- [ ] [Any blockers that would prevent completion]
- [ ] [Questions that need answers]

---

### ESCALATION TRIGGERS

**Escalate to human if:**

1. **Unclear Requirements:** Can't determine what to build
2. **Technical Blocker:** No clear path forward
3. **Dependency Issue:** Prerequisite task not complete
4. **Security Concern:** Potential vulnerability identified
5. **Scope Creep:** Task growing beyond estimated hours

**Escalation Template:**
```
ESCALATION: Task [T-XXX]
Type: [BLOCKER/QUESTION/CONFLICT]
Context: [Brief context]
Issue: [Clear description]
Options:
- A) [Option A]
- B) [Option B]
Recommendation: [Your recommendation]
Waiting for human decision.
```

---

## 📊 PART 2: PROGRESS TRACKING

### Use This Template When Checking Task Status

---

**TASK STATUS UPDATE**

**Task ID:** [T-XXX]
**Assigned To:** [Worker Agent Type]
**Current Status:** [pending/in_progress/completed/blocked]
**Started At:** [Timestamp]
**Last Updated:** [Timestamp]

---

### Progress Summary

**Completion:** [XX]%

**Completed:**
- ✅ [Item 1]
- ✅ [Item 2]

**In Progress:**
- 🔄 [Item 3] - [Brief status]
- 🔄 [Item 4] - [Brief status]

**Not Started:**
- ⏳ [Item 5]
- ⏳ [Item 6]

---

### Blockers

**Current Blockers:**
- [ ] [Blocker 1] - [Impact: High/Medium/Low]
- [ ] [Blocker 2] - [Impact: High/Medium/Low]

**Blockers Resolved:**
- ✅ [Resolved blocker 1] - [How resolved]

---

### Time Tracking

**Estimated Hours:** [Number]
**Actual Hours:** [Number] (so far)
**Remaining:** [Number]
**On Track:** [Yes/No]

**If not on track:**
- Reason: [Why not on track]
- Impact: [How this affects timeline]
- Mitigation: [What can be done]

---

### Next Steps

**Immediate:**
- [ ] [Next action 1]
- [ ] [Next action 2]

**This Week:**
- [ ] [Weekly goal 1]
- [ ] [Weekly goal 2]

---

## ✅ PART 3: TASK COMPLETION

### Use This Template When Worker Claims Task Complete

---

**TASK COMPLETION REPORT**

**Task ID:** [T-XXX]
**Worker Agent:** [Agent Type]
**Completed At:** [Timestamp]
**Status:** ✅ COMPLETE | ⚠️ COMPLETE WITH ISSUES

---

### Deliverables Checklist

**All Deliverables Present:**
- [ ] [Deliverable 1] - `/path/to/file`
- [ ] [Deliverable 2] - `/path/to/file`
- [ ] [Deliverable 3] - `/path/to/file`

**All Deliverables Valid:**
- [ ] Code compiles/builds
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Artifact created

---

### Success Criteria Validation

**Success Criteria Met:**
- ✅ [Criterion 1] - [Validation notes]
- ✅ [Criterion 2] - [Validation notes]
- ✅ [Criterion 3] - [Validation notes]
- ✅ [Criterion 4] - [Validation notes]
- ✅ [Criterion 5] - [Validation notes]

**Issues Found:**
- [ ] [Any issues that prevent passing validation]

---

### Testing Summary

**Tests Run:**
- Unit tests: [X/Y] passing
- Integration tests: [X/Y] passing
- Security tests: [X/Y] passing
- Performance tests: [X/Y] passing (if applicable)

**Coverage:** [XX]%

**Failed Tests:**
- [ ] [Any failed tests with reasons]

---

### Git Workflow Status

**Branch Created:** `task/[T-XXX]-[name]`
**Commit:** [Commit hash] - [Commit message]
**PR Created:** [Yes/No] - [PR number]
**PR Description:** [Link or summary]

**Files Changed:**
- `M` [Modified files]
- `A` [Added files]
- `D` [Deleted files]

---

### Artifact Created

**Location:** `/workspace/artifacts/T-XXX.out`

**Artifact Contains:**
- [ ] Implementation summary
- [ ] List of files created/modified
- [ ] Test results
- [ ] Deviations from specification
- [ ] Recommendations for next tasks
- [ ] Any issues or concerns

---

### Deviations from Specification

**Planned Deviations:**
- [None] OR
- [ ] [Deviation 1] - [Rationale]
- [ ] [Deviation 2] - [Rationale]

**Unplanned Deviations:**
- [ ] [Unplanned deviation] - [Why it happened]

---

### Recommendations

**For Next Tasks:**
- [ ] [Recommendation 1]
- [ ] [Recommendation 2]

**For Process Improvement:**
- [ ] [Process suggestion 1]
- [ ] [Process suggestion 2]

---

### Ready for Validation

**Status:** [YES/NO]

**If YES:**
- Routing to validators: [List of validators]
- Expected validation time: [Hours/Days]

**If NO:**
- Missing items: [What's missing]
- Blocking issues: [What needs to be fixed]
- Return to worker: [Yes/No]

---

## 🔴 PART 4: VALIDATION RESULTS

### Use This Template After Validators Respond

---

**VALIDATION SUMMARY**

**Task ID:** [T-XXX]
**Validation Completed At:** [Timestamp]
**Overall Status:** ✅ PASS | ❌ FAIL | ⚠️ PASS WITH MINOR ISSUES

---

### Validator Results

**Acceptance Validator:** [PASS/FAIL]
- [Feedback summary]
- [Specific issues if any]

**Security Validator:** [PASS/FAIL]
- [Feedback summary]
- [Security concerns if any]

**No-Regression Validator:** [PASS/FAIL]
- [Feedback summary]
- [Regression issues if any]

**Integration Validator:** [PASS/FAIL]
- [Feedback summary]
- [Integration issues if any]

---

### Failed Validation Items

**Critical (Must Fix):**
- [ ] [Critical issue 1] - [Which validator]
- [ ] [Critical issue 2] - [Which validator]

**Minor (Should Fix):**
- [ ] [Minor issue 1] - [Which validator]
- [ ] [Minor issue 2] - [Which validator]

---

### Resolution Required

**If ALL PASS:**
- ✅ Task marked as COMPLETE
- ✅ Task board updated
- ✅ Next tasks unblocked (if any)
- ✅ Checkpoint created

**If ANY FAIL:**
- ⚠️ Task returned to worker with feedback
- ⚠️ Clear list of fixes required
- ⚠️ Re-validation scheduled
- ⚠️ Timeline impact assessed

---

### Final Decision

**Manager Decision:** [APPROVED/REVISE/ESCALATE]

**If APPROVED:**
- Mark task complete
- Update task board
- Notify worker
- Create checkpoint
- Assign next tasks

**If REVISE:**
- Send revision request to worker
- Include validator feedback
- Set revision deadline
- Plan re-validation

**If ESCALATE:**
- Escalate to human
- Provide context
- Request decision
- Wait for human input

---

## 📈 PART 5: CHECKPOINT CREATION

### Use This Template After Task Completion

---

**CHECKPOINT CREATED**

**Checkpoint ID:** CP-[T-XXX]
**Created At:** [Timestamp]
**Triggered By:** [Task T-XXX completion]

---

### Checkpoint Contents

**Task Board State:**
- Phase: [Current phase]
- Completed tasks: [List]
- In-progress tasks: [List]
- Pending tasks: [List]

**Agent Outputs:**
- [ ] `/workspace/artifacts/T-XXX.out` created
- [ ] All validator verdicts collected
- [ ] Git commit created
- [ ] PR merged (if approved)

**Repository State:**
- Git commit: [Commit hash]
- Branch: [Current branch]
- PR status: [Open/Merged/Closed]

**Blockers:**
- [ ] Current blockers (if any)

---

### Recovery Information

**If Crash Occurs:**
1. Load this checkpoint
2. Resume from task board state
3. No duplicate work
4. Continue execution

---

### Next Tasks Unblocked

**Tasks Ready to Start:**
- [ ] [Task ID 1] - [Task title]
- [ ] [Task ID 2] - [Task title]
- [ ] [Task ID 3] - [Task title]

**Dependencies Resolved:**
- [ ] [Which dependencies are now met]

---

## 🚨 PART 6: ESCALATION TO HUMAN

### Use This Template When Escalating

---

**ESCALATION REQUIRED**

**Task ID:** [T-XXX]
**Phase:** [Phase name]
**Escalation Type:** [BLOCKER/QUESTION/CONFLICT]
**Raised At:** [Timestamp]
**Priority:** [CRITICAL/HIGH/MEDIUM]

---

### Context

**Task Background:**
- [Brief description of what the task is trying to accomplish]
- [Current status]
- [What has been tried so far]

---

### Issue

**Problem Statement:**
[Clear description of the issue]

**Impact:**
- [How this blocks progress]
- [Which tasks are affected]
- [Timeline impact if any]

---

### Options Considered

**Option A:** [Description]
- Pros: [Advantages]
- Cons: [Disadvantages]
- Confidence: [High/Medium/Low]

**Option B:** [Description]
- Pros: [Advantages]
- Cons: [Disadvantages]
- Confidence: [High/Medium/Low]

**Option C:** [Description]
- Pros: [Advantages]
- Cons: [Disadvantages]
- Confidence: [High/Medium/Low]

---

### Recommendation

**Agent Recommendation:** [Option A/B/C]

**Rationale:**
[Why this option is recommended]

**Confidence:** [High/Medium/Low]

---

### Information Needed

**Human Decision Required On:**
- [ ] [Decision point 1]
- [ ] [Decision point 2]

**Additional Context Needed:**
- [ ] [What information would help]

---

### Waiting For Human Response

**Status:** ⏸️ PAUSED
**Cannot Proceed Until:** [What's needed]
**Alternative Tasks:** [Are there other tasks that can proceed?]

---

## 📝 PART 7: WEEKLY STATUS REPORT

### Use This Template for Weekly Updates

---

**WEEKLY STATUS REPORT**

**Week Of:** [Date range]
**Phase:** [Current phase]
Reporting Period: [Week X of Y]

---

### Summary

**Overall Progress:** [XX]% complete
**Tasks Completed This Week:** [Number]
**Tasks In Progress:** [Number]
**Tasks Blocked:** [Number]

**Milestone Status:** [On Track/At Risk/Delayed]

---

### Completed Tasks

**This Week:**
- ✅ [T-XXX] - [Task title] - [Worker Agent]
- ✅ [T-XXX] - [Task title] - [Worker Agent]

**Cumulative:** [Total number] tasks completed

---

### In Progress Tasks

**Actively Working On:**
- 🔄 [T-XXX] - [Task title] - [Worker Agent] - [XX]% complete
- 🔄 [T-XXX] - [Task title] - [Worker Agent] - [XX]% complete

**Expected Completion:**
- [T-XXX]: [Date]
- [T-XXX]: [Date]

---

### Blocked Tasks

**Currently Blocked:**
- 🚧 [T-XXX] - [Task title] - [Blocker reason]
- 🚧 [T-XXX] - [Task title] - [Blocker reason]

**Blocker Resolution:**
- [ ] [Blocker 1] - [Who is resolving, expected resolution]
- [ ] [Blocker 2] - [Who is resolving, expected resolution]

---

### Upcoming Tasks

**Next Week:**
- ⏳ [T-XXX] - [Task title] - [Assigned to]
- ⏳ [T-XXX] - [Task title] - [Assigned to]

**Ready to Start:**
- ⏳ [T-XXX] - [Task title] - [Assigned to]
- ⏳ [T-XXX] - [Task title] - [Assigned to]

---

### Risk Summary

**Risks This Week:**
- [ ] [Risk 1] - [Impact: High/Medium/Low] - [Mitigation]
- [ ] [Risk 2] - [Impact: High/Medium/Low] - [Mitigation]

**New Risks:**
- [ ] [New risk identified]

**Resolved Risks:**
- ✅ [Previously resolved risk]

---

### Timeline Status

**Original Timeline:** [Weeks X-Y]
**Current Timeline:** [Weeks X-Y]
**Variance:** [+/- weeks]

**If Delayed:**
- Reason: [Why delayed]
- Impact: [How this affects overall timeline]
- Recovery Plan: [How to get back on track]

---

### Agent Performance

**Worker Agents:**
- [Agent Type 1]: [Tasks completed/In progress] - [Performance notes]
- [Agent Type 2]: [Tasks completed/In progress] - [Performance notes]

**Validator Agents:**
- [Validator 1]: [Validations completed] - [Quality notes]
- [Validator 2]: [Validations completed] - [Quality notes]

---

### Next Week Goals

**Primary Goals:**
1. [Complete T-XXX] - [Why it's important]
2. [Complete T-XXX] - [Why it's important]
3. [Complete T-XXX] - [Why it's important]

**Secondary Goals:**
1. [Secondary goal 1]
2. [Secondary goal 2]

---

### Human Actions Needed

**Decisions Required:**
- [ ] [Decision 1] - [Needed by when]
- [ ] [Decision 2] - [Needed by when]

**Reviews Required:**
- [ ] [Review 1] - [PR/Milestone]
- [ ] [Review 2] - [PR/Milestone]

---

### Checkpoint Status

**Last Checkpoint:** CP-[T-XXX]
**Checkpoint Created At:** [Timestamp]
**Recovery Point:** [Valid/Invalid]

---

### Recommendations

**Process Improvements:**
- [ ] [Improvement 1]
- [ ] [Improvement 2]

**Resource Adjustments:**
- [ ] [Need more/less of specific agent type]

**Next Phase Readiness:**
- [ ] [Phase X] ready to start: [Yes/No]
- [ ] [What's needed before next phase]

---

## 🔧 QUICK REFERENCE

### Template Usage Guide

**When to use each part:**

1. **PART 1:** When assigning a task to a worker agent
2. **PART 2:** When checking task status (daily/weekly)
3. **PART 3:** When worker claims task complete
4. **PART 4:** After validators provide verdicts
5. **PART 5:** After task approval (checkpoint creation)
6. **PART 6:** When escalation to human is needed
7. **PART 7:** For weekly status reports

---

### Manager Agent Workflow

```
1. ASSIGN TASK
   ↓
   Use PART 1 template
   ↓
2. TRACK PROGRESS
   ↓
   Use PART 2 template (daily)
   ↓
3. RECEIVE COMPLETION
   ↓
   Use PART 3 template
   ↓
4. ROUTE TO VALIDATORS
   ↓
   Validators provide verdicts
   ↓
5. PROCESS RESULTS
   ↓
   Use PART 4 template
   ↓
6a. IF APPROVED
    ↓
    Use PART 5 template (checkpoint)
    ↓
    Update task board
    ↓
    Assign next tasks

6b. IF FAILED
    ↓
    Return to worker with feedback
    ↓
    Go back to step 2
```

---

### Escalation Path

```
Worker Agent
  ↓ (encounters blocker)
Manager Agent
  ↓ (can't resolve)
Human
  ↓ (makes decision)
Manager Agent
  ↓ (continues execution)
Worker Agent
```

---

### Status Flow

```
pending → in_progress → completion_report → validation → approved → completed
                                                              ↓
                                                         failed → in_progress
```

---

## END OF TEMPLATE

**This template is reusable for all tasks in the CyberRX implementation.**

**Copy the relevant part, fill in the brackets [like this], and execute.**

**For questions or issues, refer to the AGENT_ORCHESTRATION_GUIDE.md**
