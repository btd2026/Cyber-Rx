# TASK: T-PILOT-004
# TITLE: Agent Calibration & Executive Onboarding
# PHASE: Phase 2 - Pilot Deployment & Customer Onboarding
# OWNER: Product Manager + AI/ML Engineer

## OBJECTIVE

Activate and calibrate all CyberRX agents (CFO, CISO, Board) for the pilot customer, onboarding executive stakeholders, validating agent outputs against customer expectations, and delivering the first live cyber risk briefing to demonstrate platform value.

## DELIVERABLES

1. **Activated Agents**
   - CFO Agent operational with customer context
   - CISO Agent operational with customer context
   - Board Agent operational with customer context
   - Agent runtime configured for customer tenant
   - LLM inference endpoints validated
   - Agent state persistence operational
   - Agent coordination protocols enabled

2. **Calibrated Thresholds**
   - Agent sensitivity thresholds tuned based on customer feedback
   - False positive rates minimized through calibration
   - Alert noise reduced through threshold refinement
   - Executive response preferences incorporated
   - Time-to-remediation SLA expectations set
   - Materiality thresholds adjusted per executive role
   - Calibration documented for future reference

3. **Validated Outputs**
   - Agent briefings validated by customer executives
   - Financial accuracy confirmed by CFO/staff
   - Technical accuracy confirmed by CISO/staff
   - Board suitability confirmed by corporate secretary
   - Methodology trails reviewed and accepted
   - Visualization preferences incorporated
   - Output formatting tuned per role

4. **First Live Briefing Delivered**
   - First live cyber risk briefing delivered to customer executives
   - Briefing content appropriate to audience (CFO, CISO, Board)
   - Q&A session facilitated
   - Executive feedback captured
   - Action items identified
   - Follow-up schedule established
   - Briefing recording and materials archived

5. **Executive Onboarding Complete**
   - All executive users trained on platform access
   - Dashboard navigation training completed
   - On-demand query training completed
   - Alert notification preferences configured
   - Mobile access configured (if applicable)
   - Executive support channels established
   - Ongoing briefing schedule defined

## SUCCESS CRITERIA

- All three agents (CFO, CISO, Board) running and generating briefings
- Agent outputs validated by customer executive stakeholders
- Thresholds calibrated to acceptable false positive/negative rates
- First live briefing delivered successfully
- Executives confident in platform outputs
- Executives able to access and use dashboards independently
- Clear feedback captured for platform improvements
- Executive satisfaction survey shows 80%+ approval

## DEPENDENCIES

- T-PILOT-003: Financial Parameters & Threshold Configuration (must be complete)
- T-PILOT-001: Pilot Customer Environment Setup (must be complete)
- T-PILOT-002: Business Process Graph Construction (must be complete)
- All Phase 1 agents operational (T-MVP-008, T-MVP-009, T-MVP-010)

## CONTEXT

### Architecture Decisions
- **Agent Runtime:** LLM-based agents using Claude Sonnet for inference
- **Context Management:** Per-agent context managers with customer-specific data
- **Prompt Templates:** Role-specific prompts tuned during Phase 1
- **Output Formatting:** Structured outputs for dashboard consumption
- **Coordination:** Board Agent synthesizes CFO and CISO agent outputs

### Agent Calibration Approach

**Calibration Process:**
1. Run agents on historical customer data (last 30 days)
2. Present outputs to customer executives for review
3. Identify false positives (alerts that don't matter)
4. Identify false negatives (missed important events)
5. Adjust thresholds and sensitivity parameters
6. Repeat until acceptable balance achieved

**Calibration Metrics:**
- False Positive Rate: Target <10% of alerts
- False Negative Rate: Target <5% of significant events
- Alert Noise: Target <20 alerts/week per executive
- Executive Confidence: Target 80%+ approval

### Executive Onboarding Plan

**Week 1: Platform Access & Navigation**
- Account creation and authentication setup
- Dashboard overview and navigation training
- Role-specific features walkthrough
- Mobile app configuration (if applicable)
- Support channel introduction

**Week 2: Agent Interpretation Training**
- How to read CFO briefings
- How to read CISO briefings
- How to read Board briefings
- Methodology trail interpretation
- Action plan development

**Week 3: Interactive Query Training**
- On-demand query formulation
- Filter and drill-down techniques
- Export and reporting features
- Alert management workflows
- Collaboration features

**Week 4: First Live Briefing**
- Scheduled briefing delivery
- Executive Q&A session
- Feedback capture
- Action planning
- Follow-up scheduling

### Technical Constraints
- Agent prompts must avoid PHI/PII (validated in T-MVP-015)
- Agent inference latency must be <30 seconds for briefings
- Agent outputs must be consistent and deterministic
- Agents must handle edge cases gracefully (no data, system failures)
- Agent coordination must not create circular dependencies

### Related Tasks
- This task unblocks: T-PILOT-005 (MVP Success Criterion Validation)
- Depends on: All prior Phase 2 tasks
- Collaborative effort: Product Manager (customer engagement) + AI/ML Engineer (agent tuning)

### Customer Executive Engagement
- **Executive Sponsor:** Customer CFO or CISO
- **Stakeholder Group:** CFO, CISO, Corporate Secretary, CRO (if applicable)
- **Training Approach:** 1:1 executive coaching + small group workshops
- **Calibration Iterations:** 3-4 calibration cycles before live briefing

## OUTPUT REQUIREMENTS

### Code Locations
- Agent configurations: `/cyberrx-api/config/pilot-customer/agents/`
- Calibration scripts: `/cyberrx-api/scripts/calibration/`
- Prompt templates: `/cyberrx-api/src/agents/prompts/pilot-customer/`

### Configuration & Data
- Calibrated thresholds: `/cyberrx-api/config/pilot-customer/calibrated-thresholds.json`
- Executive preferences: `/cyberrx-api/config/pilot-customer/executive-preferences.json`
- Onboarding status: `/cyberrx-api/config/pilot-customer/onboarding-status.json`

### Documentation
- Calibration guide: `/docs/operations/agent-calibration-guide.md`
- Executive training materials: `/docs/training/executive-training-guide.md`
- Onboarding runbook: `/docs/onboarding/executive-onboarding-runbook.md`
- Briefing preparation guide: `/docs/operations/briefing-preparation.md`

### Artifacts
- Calibration report: `/workspace/artifacts/T-PILOT-004-CALIBRATION-REPORT.md`
- Executive feedback summary: `/workspace/artifacts/T-PILOT-004-EXECUTIVE-FEEDBACK.md`
- First briefing recording: `/workspace/artifacts/T-PILOT-004-FIRST-BRIEFING.pdf`
- Onboarding completion: `/workspace/artifacts/T-PILOT-004-ONBOARDING-COMPLETE.md`

### Testing
- Agent output accuracy tests (against labeled historical data)
- Calibration validation tests (false positive/negative rates)
- Executive satisfaction surveys
- Usability tests for dashboard navigation
- Performance tests for agent inference latency

### Validation Readiness
- All agents operational and calibrated
- Executive onboarding complete
- First briefing delivered successfully
- Ready for 4-validator review (Acceptance, Security, No-Regression, Integration)

## IMPLEMENTATION GUIDANCE

### Phase 1: Agent Activation (AI/ML Engineer - 15 hours)
1. Configure agent runtime for customer tenant
2. Load customer context into agent context managers
3. Validate LLM inference endpoints
4. Test agent state persistence
5. Verify agent coordination protocols
6. Run agents on sample customer data

### Phase 2: Initial Calibration (AI/ML Engineer - 20 hours)
1. Run agents on historical customer data (last 30 days)
2. Generate sample briefings for each role
3. Identify initial false positives and false negatives
4. Adjust agent sensitivity thresholds
5. Tune prompt templates for customer context
6. Iterate until acceptable baseline achieved

### Phase 3: Executive Review & Feedback (Product Manager Lead - 15 hours)
1. Present sample briefings to customer executives
2. Facilitate review sessions per role (CFO, CISO, Board)
3. Capture feedback on accuracy, relevance, clarity
4. Identify specific false positives/negatives
5. Gather visualization and formatting preferences
6. Document executive expectations

### Phase 4: Calibration Refinement (AI/ML Engineer - 15 hours)
1. Incorporate executive feedback into threshold adjustments
2. Refine agent prompts based on executive guidance
3. Reduce false positive rate to <10%
4. Reduce false negative rate to <5%
5. Minimize alert noise to <20 alerts/week
6. Validate calibration with independent test data

### Phase 5: Executive Onboarding (Product Manager Lead - 15 hours)
1. Create executive accounts and credentials
2. Conduct 1:1 navigation training sessions
3. Lead small group interpretation workshops
4. Configure mobile access and notification preferences
5. Establish ongoing support channels
6. Schedule recurring briefing cadence

### Phase 6: First Live Briefing Delivery (Joint - 10 hours)
1. Prepare first live briefing materials
2. Schedule briefing with executive stakeholders
3. Deliver briefing to mixed executive audience
4. Facilitate Q&A and discussion
5. Capture action items and feedback
6. Archive briefing recording and materials

## SECURITY CONSIDERATIONS

- **PHI Protection:** Ensure no PHI in agent context or outputs
- **Access Control:** Agent access restricted to authorized executive roles
- **Audit Logging:** All agent accesses and briefings logged
- **Prompt Injection:** Validate agent prompts against injection attacks
- **Output Validation:** Ensure agent outputs don't leak sensitive context
- **LLM Security:** No customer data in LLM training sets

## BLOCKER ESCALATION

If any of the following occur, escalate immediately:
- Agent outputs consistently rejected by executives
- Cannot achieve acceptable false positive/negative rates
- Executives refuse to participate in onboarding
- Agent inference latency exceeds 30 seconds
- Agents produce inconsistent or non-deterministic outputs
- Executives lack technical skills for platform access

## NEXT STEPS

After this task is complete and validated:
- T-PILOT-005: MVP Success Criterion Validation (final task)
- Continue executive engagement for success validation
- Prepare for board meeting scenario testing

## VALIDATION REQUESTED

After completion, this task requires validation from:
- [x] Acceptance Validator (agents operational, calibration complete, onboarding done)
- [x] Security Validator (PHI protection, access control, audit logging)
- [x] No-Regression Validator (existing agents not broken, calibration reversible)
- [x] Integration Validator (agents integrate with dashboards, end-to-end flows work)

---

**Task Prompt Version:** 1.0
**Created:** 2025-06-06
**Phase:** Phase 2 - Pilot Deployment & Customer Onboarding
**Dependencies:** T-PILOT-003 (Financial Parameters & Threshold Configuration)
**Estimated Duration:** 80 hours (40 hours AI/ML Engineer + 40 hours Product Manager)
**Priority:** HIGH
**Collaboration:** Joint task requiring executive engagement and agent technical work
