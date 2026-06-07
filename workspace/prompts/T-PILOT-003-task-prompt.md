# TASK: T-PILOT-003
# TITLE: Financial Parameters & Threshold Configuration
# PHASE: Phase 2 - Pilot Deployment & Customer Onboarding
# OWNER: Senior Backend Engineer + Product Manager

## OBJECTIVE

Configure the pilot customer's financial parameters and risk thresholds, loading MLR targets, stop-loss structures, reserve positions, and premium revenue mappings to enable accurate cyber risk quantification aligned with the customer's financial reality.

## DELIVERABLES

1. **MLR Target Configuration**
   - MLR target percentage loaded (e.g., 80% or 85% depending on market)
   - MLR calculation methodology documented
   - Premium revenue baseline established
   - Claims cost baseline established
   - MLR impact thresholds defined
   - Regulatory requirements incorporated (CMS MLR reporting)

2. **Stop-Loss Parameters**
   - Specific stop-loss attachment points loaded
   - Aggregate stop-loss threshold configured
   - Per-occurrence stop-loss threshold configured
   - Stop-loss carrier information loaded
   - Reinsurance treaty details captured
   - Laser-specific items documented
   - Stop-loss exhaustion scenarios modeled

3. **Reserve Positions**
   - IBNR (Incurred But Not Reported) reserves loaded
   - Case reserves loaded
   - Contractual reserves loaded
   - Reserve at risk calculations configured
   - Reserve impact modeling validated
   - Actuarial assumptions documented

4. **Premium Revenue Mapping**
   - Monthly/quarterly/annual premium revenue loaded
   - Revenue by product line mapped
   - Revenue by state/region mapped
   - Revenue attribution to business processes
   - Premium trends analyzed
   - Revenue seasonality factors incorporated

5. **Risk Appetite Thresholds**
   - Board-approved risk tolerance thresholds loaded
   - CRO-defined escalation triggers configured
   - CMS regulatory limit thresholds set
   - Internal audit thresholds established
   - Materiality thresholds defined
   - Threshold breach notification rules configured

## SUCCESS CRITERIA

- All financial parameters loaded from customer's actuarial data
- MLR calculations validated against customer's historical data
- Stop-loss thresholds match customer's reinsurance contracts
- Reserve positions align with customer's actuarial reports
- Premium revenue mapping reconciles with customer's general ledger
- Risk appetite thresholds approved by customer's CRO
- Financial modeling engine produces accurate outputs
- Threshold breach detection operational
- Customer finance team validates all parameters

## DEPENDENCIES

- T-PILOT-002: Business Process Graph Construction (must be complete)
- T-MVP-006: Financial Modeling Engine (must be operational)
- Customer must provide actuarial data and reinsurance contracts

## CONTEXT

### Architecture Decisions
- **Financial Engine:** Python/pandas-based calculation engine from T-MVP-006
- **Data Source:** Batch exports from customer's data warehouse or actuarial systems
- **Calculation Method:** Deterministic calculations (no LLM in financial path)
- **Threshold Enforcement:** Real-time monitoring from T-MVP-014 Alerting System

### Financial Parameter Categories

**1. MLR (Medical Loss Ratio) Parameters**
- MLR Target: 80% (individual market) or 85% (group market) per ACA
- Premium Revenue: Total premium collected per reporting period
- Quality Supplement: Amount subtractible from numerator
- Rebate Threshold: Trigger for customer rebates
- MLR Impact: Cyber events affecting claims/premium balance

**2. Stop-Loss Parameters**
- Specific Attachment: $50K - $500K per occurrence
- Aggregate Attachment: 120% - 130% of expected claims
- Laser Items: High-risk individuals excluded from coverage
- Reinsurance Treaties: Layer details, limits, deductibles
- Exhaustion Scenarios: When stop-loss is fully consumed

**3. Reserve Parameters**
- IBNR Reserves: Unreported claim reserves
- Case Reserves: Known claim reserves
- Contractual Reserves: Contractual obligations
- Reserve at Risk: Portion exposed to cyber events

**4. Premium Revenue**
- Total Premium: Monthly/quarterly/annual revenue
- Product Lines: Medicare Advantage, Individual, Group, etc.
- Geographic Distribution: State-level revenue
- Seasonality: Premium collection patterns

### Risk Appetite Thresholds

**Board-Level Thresholds:**
- Maximum single event exposure: $X (e.g., $10M)
- Maximum annual aggregate exposure: $Y (e.g., $50M)
- MLR impact tolerance: ±Z% (e.g., ±2%)
- Regulatory fine tolerance: $W (e.g., $100K)

**CRO-Level Thresholds:**
- Daily exposure limit: $X (e.g., $1M)
- Weekly exposure limit: $Y (e.g., $5M)
- Escalation triggers: Breach of appetite
- CMS limit proximity alerts: 90% of threshold

**CISO-Level Thresholds:**
- Blast radius severity levels: Low/Medium/High/Critical
- Time-to-remediation SLA breaches
- Compliance violation triggers
- Vendor risk threshold breaches

### Technical Constraints
- Must handle customer's actual financial data (may be sensitive)
- Must align with customer's actuarial methodology
- Must support audit trails for financial calculations
- Must enable threshold tuning without code changes
- Must integrate with financial modeling engine's expectations

### Related Tasks
- This task unblocks: T-PILOT-004 (Agent Calibration & Executive Onboarding)
- Depends on: T-PILOT-002 (financial values per process needed)
- Depends on: T-MVP-006 (financial modeling engine needed)
- Collaborative effort: Backend Engineer (technical) + Product Manager (customer finance engagement)

### Customer Finance Team Engagement
- **Week 1:** Gather actuarial data and reinsurance contracts
- **Week 2:** Load parameters and validate calculations
- **Week 3:** Configure thresholds with CRO
- **Week 4:** Finance team validation and sign-off

## OUTPUT REQUIREMENTS

### Code Locations
- Configuration schema: `/cyberrx-api/src/models/FinancialParameters.js`
- Configuration service: `/cyberrx-api/src/services/FinancialConfigurationService.js`
- API endpoints: `/cyberrx-api/src/routes/financial-parameters.js`
- Threshold engine: `/cyberrx-api/src/services/ThresholdEngine.js`

### Data & Configuration
- MLR parameters: `/cyberrx-api/config/pilot-customer/mlr-parameters.json`
- Stop-loss parameters: `/cyberrx-api/config/pilot-customer/stoploss-parameters.json`
- Reserve data: `/cyberrx-api/config/pilot-customer/reserve-data.json`
- Premium revenue: `/cyberrx-api/config/pilot-customer/premium-revenue.json`
- Risk thresholds: `/cyberrx-api/config/pilot-customer/risk-thresholds.json`

### Documentation
- Configuration guide: `/docs/configuration/financial-configuration-guide.md`
- Threshold tuning guide: `/docs/operations/threshold-tuning-guide.md`
- Actuarial methodology: `/docs/methodology/actuarial-methodology.md`
- Customer financial profile: `/docs/customers/pilot-customer/financial-profile.md`

### Artifacts
- Parameter loading report: `/workspace/artifacts/T-PILOT-003-PARAMETER-LOADING.md`
- Threshold configuration: `/workspace/artifacts/T-PILOT-003-THRESHOLD-CONFIG.md`
- Validation results: `/workspace/artifacts/T-PILOT-003-VALIDATION-RESULTS.md`
- Finance team sign-off: `/workspace/artifacts/T-PILOT-003-FINANCE-SIGNOFF.md`

### Testing
- Unit tests for parameter loading and validation
- Integration tests for financial modeling engine
- Validation tests for threshold breach detection
- Accuracy tests against customer's historical data
- Performance tests for real-time threshold monitoring

### Validation Readiness
- All tests passing
- Finance team sign-off obtained
- Documentation complete
- Ready for 4-validator review (Acceptance, Security, No-Regression, Integration)

## IMPLEMENTATION GUIDANCE

### Phase 1: Data Gathering & Requirements (Product Manager Lead - 15 hours)
1. Collect actuarial data exports from customer
2. Obtain reinsurance contracts and stop-loss details
3. Gather premium revenue reports from customer finance
4. Document customer's MLR calculation methodology
5. Identify risk appetite thresholds from CRO
6. Map data sources to financial modeling engine requirements

### Phase 2: Configuration Schema & Service Development (Backend Engineer - 20 hours)
1. Design financial parameter schema
2. Implement parameter loading service
3. Create threshold configuration service
4. Build parameter validation logic
5. Implement threshold breach detection
6. Create API endpoints for parameter management

### Phase 3: Parameter Loading & Validation (Backend Engineer - 15 hours)
1. Load MLR targets and baseline data
2. Load stop-loss parameters from contracts
3. Load reserve positions from actuarial data
4. Load premium revenue mappings
5. Validate data integrity and consistency
6. Test financial modeling outputs with loaded parameters

### Phase 4: Threshold Configuration (Joint - 10 hours)
1. Configure board-level risk thresholds
2. Configure CRO escalation triggers
3. Configure CMS regulatory limit monitors
4. Configure internal audit thresholds
5. Test threshold breach detection
6. Configure alert routing for breaches

### Phase 5: Customer Validation & Sign-off (Product Manager Lead - 10 hours)
1. Present loaded parameters to customer finance team
2. Walk through MLR calculations with actuaries
3. Validate stop-loss thresholds with reinsurance team
4. Confirm reserve positions with actuarial
5. Demonstrate threshold breach detection
6. Obtain finance team sign-off

## SECURITY CONSIDERATIONS

- **Data Sensitivity:** Financial parameters are highly sensitive business data
- **Access Control:** Parameter modification restricted to authorized finance roles
- **Audit Logging:** All parameter changes logged with user attribution
- **Encryption:** Financial data encrypted at rest and in transit
- **Validation:** Ensure no competitive financial intelligence leaked
- **PHI Protection:** No PHI in financial parameters

## BLOCKER ESCALATION

If any of the following occur, escalate immediately:
- Customer cannot provide actuarial data or reinsurance contracts
- Financial parameters incompatible with modeling engine
- Risk appetite thresholds undefined by CRO
- Finance team rejects calculation methodology
- Cannot reconcile financial data with customer's general ledger

## NEXT STEPS

After this task is complete and validated:
- T-PILOT-004: Agent Calibration & Executive Onboarding (next in sequence)
- Financial parameters feed into agent calibration
- Threshold configuration enables alert routing

## VALIDATION REQUESTED

After completion, this task requires validation from:
- [x] Acceptance Validator (all deliverables present, finance sign-off obtained)
- [x] Security Validator (access control, audit logging, data encryption)
- [x] No-Regression Validator (existing functionality not broken, calculations accurate)
- [x] Integration Validator (parameters integrate with financial engine, threshold detection works)

---

**Task Prompt Version:** 1.0
**Created:** 2025-06-06
**Phase:** Phase 2 - Pilot Deployment & Customer Onboarding
**Dependencies:** T-PILOT-002 (Business Process Graph Construction)
**Estimated Duration:** 60 hours (30 hours Backend Engineer + 30 hours Product Manager)
**Priority:** CRITICAL
**Collaboration:** Joint task requiring customer finance engagement and technical implementation
