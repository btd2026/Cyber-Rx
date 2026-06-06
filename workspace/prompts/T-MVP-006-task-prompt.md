# Task Assignment: T-MVP-006
## Financial Modeling Engine for CyberRX Multi-Agent AI Platform

---

**Task ID:** T-MVP-006
**Title:** Financial Modeling Engine
**Assigned To:** Senior Backend Engineer
**Phase:** Phase 1 - Third-Party Cyber Intelligence MVP
**Weeks:** 9-11
**Estimated Hours:** 120 hours
**Priority:** 🔴 CRITICAL PATH

---

## OBJECTIVE

Build the Financial Modeling Engine that calculates deterministic dollar exposure for enriched RiskObjects, producing MLR impact estimates, stop-loss exposure calculations, reserve-at-risk analysis, and premium revenue risk assessments. The engine must generate complete audit methodology trails for CFO board-meeting defensibility.

**What we're building:** A deterministic calculation engine (Python/pandas) that transforms enriched risk objects into board-meeting-ready financial impact assessments.

**Critical Requirement:** NO LLM in the calculation path. The CFO must be able to defend these figures in a board meeting with complete audit trails.

---

## ARCHITECTURE CONTEXT

### Data Flow Architecture

```
[Risk Normalization Engine] → [Kafka: enriched-risk-objects] → [Financial Modeling Engine]
                                                                          │
                                                                          ├─→ [Calculation Engine (pandas)]
                                                                          │
                                                                          ├─→ [MLR Impact Calculator]
                                                                          │
                                                                          ├─→ [Stop-Loss Exposure Calculator]
                                                                          │
                                                                          ├─→ [Reserve at Risk Calculator]
                                                                          │
                                                                          ├─→ [Premium Revenue Risk Calculator]
                                                                          │
                                                                          ├─→ [Methodology Trail Generator]
                                                                          │
                                                                          ├─→ [Actuarial Export Parser]
                                                                          │
                                                                          └─→ [TimescaleDB: financial_impacts]
                                                                                    │
                                                                                    ▼
                                                                            [CFO Agent (T-MVP-008)]
```

**Critical Insight:** Financial calculations MUST be deterministic and reproducible. Every dollar figure must be traceable to source data and calculation methodology.

### What T-MVP-005 Provides (Enriched RiskObjects)

**Enriched RiskObjects from T-MVP-005:**
- `business_process_map`: Claims adjudication, enrollment, etc.
- `blast_radius`: Downstream systems and processes
- `regulatory_triggers`: HIPAA, CMS obligations
- `affected_assets`: Servers, databases, applications
- `likelihood_score`: 0.0 - 1.0 probability
- `confidence`: Data quality score

**What We Add:**
- ✅ Dollar exposure calculations
- ✅ MLR impact (percentage points)
- ✅ Stop-loss exposure (dollars against position)
- ✅ Reserve at risk (reserve implications)
- ✅ Premium revenue risk (revenue implications)
- ✅ Total exposure (sum of all components)
- ✅ Complete audit methodology trails

---

## DELIVERABLES

### 1. Core Calculation Engine

**Location:** `/services/financial-engine/src/calculation_engine.py`

**Responsibilities:**
- Subscribe to Kafka topic `enriched-risk-objects`
- Calculate deterministic financial exposure
- Generate complete audit methodology trails
- Publish financial impacts to TimescaleDB
- Track calculation metrics
- Handle calculation errors

**Interface:**
```python
class CalculationEngine:
    def __init__(self, kafka_config, timescale_config, calculators):
        """Initialize calculation engine with services."""

    async def process_risk_object(self, risk_object: RiskObject) -> FinancialImpact:
        """
        Process enriched risk object through financial calculation pipeline.

        Pipeline:
        1. Parse actuarial data (CSV/SQL exports)
        2. Calculate MLR impact
        3. Calculate stop-loss exposure
        4. Calculate reserve at risk
        5. Calculate premium revenue risk
        6. Aggregate total exposure
        7. Generate methodology trail
        8. Validate financial impact
        9. Publish to TimescaleDB

        Args:
            risk_object: Enriched RiskObject from T-MVP-005

        Returns:
            FinancialImpact with complete audit trail

        Raises:
            CalculationError: If calculation fails
            ValidationError: If financial impact validation fails
        """

    async def calculate_exposure(self, risk_object: RiskObject) -> FinancialImpact:
        """Run full calculation pipeline on RiskObject."""

    def generate_methodology_trail(self, risk_object: RiskObject, financial_impact: FinancialImpact):
        """Generate complete audit methodology trail."""
```

**Key Features:**
- Deterministic calculations (no LLM)
- Pandas for data processing
- NumPy for numerical calculations
- Async event processing (asyncio)
- Error handling with fallback
- Metrics collection (Prometheus)
- Health check endpoints

---

### 2. MLR Impact Calculator

**Location:** `/services/financial-engine/src/calculators/mlr_impact_calculator.py`

**Responsibilities:**
- Calculate Medical Loss Ratio (MLR) impact
- Estimate percentage point increase
- Project claims cost increases
- Calculate MLR confidence scores

**Interface:**
```python
class MLRImpactCalculator:
    def __init__(self, actuarial_service: ActuarialService):
        """Initialize calculator with actuarial data service."""

    async def calculate_mlr_impact(self, risk_object: RiskObject) -> MLRImpactResult:
        """
        Calculate MLR impact from risk object.

        Calculation:
        1. Identify affected business processes (claims, enrollment)
        2. Get actuarial data for processes (claims costs, member counts)
        3. Calculate projected claims increase (blast_radius × likelihood_score)
        4. Calculate MLR impact (projected_increase / premium_revenue)
        5. Calculate confidence score (data_quality × methodology_certainty)

        Args:
            risk_object: Enriched RiskObject

        Returns:
            MLRImpactResult with mlr_impact (percentage points) and confidence

        Example:
            Input: blast_radius=["claims-system"], likelihood_score=0.8
            Output: mlr_impact=0.02 (2 percentage points), confidence=0.85
        """

    def calculate_mlr_impact_percentage_points(
        self,
        projected_claims_increase: float,
        premium_revenue: float
    ) -> float:
        """
        Calculate MLR impact in percentage points.

        Formula: mlr_impact = projected_increase / premium_revenue

        Args:
            projected_claims_increase: Projected claims cost increase ($)
            premium_revenue: Total premium revenue ($)

        Returns:
            MLR impact in percentage points (0.0 - 1.0)
        """

    def calculate_confidence_score(
        self,
        data_quality_score: float,
        methodology_certainty: float
    ) -> float:
        """
        Calculate MLR impact confidence score.

        Formula: confidence = (data_quality + methodology_certainty) / 2

        Args:
            data_quality_score: Actuarial data quality (0.0 - 1.0)
            methodology_certainty: Calculation methodology certainty (0.0 - 1.0)

        Returns:
            Confidence score (0.0 - 1.0)
        """
```

**Calculation Logic:**
```python
# Step 1: Get actuarial data for affected processes
claims_data = await actuarial_service.get_claims_data(business_process_map)

# Step 2: Calculate projected claims increase
projected_increase = (
    claims_data['average_claim_cost'] *
    likelihood_score *
    blast_radius_criticality_score
)

# Step 3: Calculate MLR impact (percentage points)
mlr_impact = projected_increase / premium_revenue

# Step 4: Calculate confidence
confidence = (data_quality_score + methodology_certainty) / 2.0
```

---

### 3. Stop-Loss Exposure Calculator

**Location:** `/services/financial-engine/src/calculators/stop_loss_exposure_calculator.py`

**Responsibilities:**
- Calculate stop-loss exposure
- Analyze attachment point risk
- Calculate aggregate limit utilization
- Determine stop-loss remaining capacity

**Interface:**
```python
class StopLossExposureCalculator:
    def __init__(self, actuarial_service: ActuarialService):
        """Initialize calculator with actuarial data service."""

    async def calculate_stop_loss_exposure(self, risk_object: RiskObject) -> StopLossExposureResult:
        """
        Calculate stop-loss exposure from risk object.

        Calculation:
        1. Get stop-loss parameters (attachment, aggregate, current_position)
        2. Calculate projected losses (blast_radius × likelihood_score × average_claim_cost)
        3. Calculate exposure against attachment (projected_losses - attachment)
        4. Calculate aggregate utilization (current_position + exposure / aggregate_limit)
        5. Calculate remaining capacity (aggregate_limit - current_position - exposure)

        Args:
            risk_object: Enriched RiskObject

        Returns:
            StopLossExposureResult with exposure, attachment, aggregate, remaining

        Example:
            Input: attachment=$250K, aggregate=$5M, current_position=$500K
            Output: exposure=$500K, remaining=$4.0M
        """

    def calculate_exposure_against_attachment(
        self,
        projected_losses: float,
        attachment_point: float
    ) -> float:
        """
        Calculate exposure against stop-loss attachment point.

        Formula: exposure = max(0, projected_losses - attachment_point)

        Args:
            projected_losses: Projected loss amount ($)
            attachment_point: Stop-loss attachment point ($)

        Returns:
            Exposure against attachment ($)
        """

    def calculate_remaining_capacity(
        self,
        aggregate_limit: float,
        current_position: float,
        exposure: float
    ) -> float:
        """
        Calculate remaining stop-loss capacity.

        Formula: remaining = aggregate_limit - current_position - exposure

        Args:
            aggregate_limit: Aggregate stop-loss limit ($)
            current_position: Current stop-loss position ($)
            exposure: Projected exposure ($)

        Returns:
            Remaining capacity ($)
        """
```

**Calculation Logic:**
```python
# Step 1: Get stop-loss parameters
stop_loss_params = await actuarial_service.get_stop_loss_params(line_of_business)

# Step 2: Calculate projected losses
projected_losses = (
    blast_radius_criticality_score *
    likelihood_score *
    average_claim_cost_per_member *
    affected_member_count
)

# Step 3: Calculate exposure against attachment
exposure = max(0, projected_losses - stop_loss_params['attachment'])

# Step 4: Calculate remaining capacity
remaining = (
    stop_loss_params['aggregate'] -
    stop_loss_params['current_position'] -
    exposure
)
```

---

### 4. Reserve at Risk Calculator

**Location:** `/services/financial-engine/src/calculators/reserve_at_risk_calculator.py`

**Responsibilities:**
- Calculate reserve at risk
- Identify reserve type (medical loss, case reserve, IBNR)
- Project reserve depletion
- Calculate reserve implications

**Interface:**
```python
class ReserveAtRiskCalculator:
    def __init__(self, actuarial_service: ActuarialService):
        """Initialize calculator with actuarial data service."""

    async def calculate_reserve_at_risk(self, risk_object: RiskObject) -> ReserveAtRiskResult:
        """
        Calculate reserve at risk from risk object.

        Calculation:
        1. Get reserve data for affected processes (reserve_type, reserve_balance)
        2. Identify reserve type (medical_loss, case_reserve, ibnr)
        3. Calculate projected depletion (blast_radius × likelihood_score × claim_rate)
        4. Calculate reserve at risk (projected_depletion × reserve_balance)

        Args:
            risk_object: Enriched RiskObject

        Returns:
            ReserveAtRiskResult with reserve_at_risk, reserve_type

        Example:
            Input: reserve_balance=$10M, claim_rate=0.02
            Output: reserve_at_risk=$750K, reserve_type="case_reserve"
        """

    def identify_reserve_type(self, business_process_map: List[str]) -> ReserveType:
        """
        Identify reserve type from business process map.

        Mapping:
        - "claims_adjudication" → CASE_RESERVE
        - "enrollment" → MEDICAL_LOSS
        - "care_management" → IBNR

        Args:
            business_process_map: List of affected business processes

        Returns:
            ReserveType enum value
        """

    def calculate_projected_depletion(
        self,
        blast_radius_criticality: float,
        likelihood_score: float,
        claim_rate: float,
        reserve_balance: float
    ) -> float:
        """
        Calculate projected reserve depletion.

        Formula: depletion = criticality × likelihood × claim_rate × reserve_balance

        Args:
            blast_radius_criticality: Blast radius criticality score (0.0 - 1.0)
            likelihood_score: Risk likelihood score (0.0 - 1.0)
            claim_rate: Historical claim rate (0.0 - 1.0)
            reserve_balance: Current reserve balance ($)

        Returns:
            Projected depletion ($)
        """
```

**Calculation Logic:**
```python
# Step 1: Identify reserve type
reserve_type = self.identify_reserve_type(business_process_map)

# Step 2: Get reserve data
reserve_data = await actuarial_service.get_reserve_data(reserve_type)

# Step 3: Calculate projected depletion
projected_depletion = (
    blast_radius_criticality_score *
    likelihood_score *
    reserve_data['claim_rate'] *
    reserve_data['reserve_balance']
)

# Step 4: Reserve at risk = projected depletion
reserve_at_risk = projected_depletion
```

---

### 5. Premium Revenue Risk Calculator

**Location:** `/services/financial-engine/src/calculators/premium_revenue_risk_calculator.py`

**Responsibilities:**
- Calculate premium revenue at risk
- Identify line of business (Medicare, Medicaid, Commercial)
- Project member attrition
- Calculate revenue implications

**Interface:**
```python
class PremiumRevenueRiskCalculator:
    def __init__(self, actuarial_service: ActuarialService):
        """Initialize calculator with actuarial data service."""

    async def calculate_premium_revenue_risk(self, risk_object: RiskObject) -> PremiumRevenueRiskResult:
        """
        Calculate premium revenue risk from risk object.

        Calculation:
        1. Identify line of business from business processes
        2. Get member data (member_count, premium_per_member)
        3. Calculate projected attrition (blast_radius × likelihood_score × attrition_rate)
        4. Calculate revenue risk (projected_attrition × premium_per_member × 12)

        Args:
            risk_object: Enriched RiskObject

        Returns:
            PremiumRevenueRiskResult with premium_revenue_risk, line_of_business

        Example:
            Input: member_count=100K, premium_per_member=$500/month
            Output: premium_revenue_risk=$1.2M, line_of_business="Medicare"
        """

    def identify_line_of_business(self, business_process_map: List[str]) -> str:
        """
        Identify line of business from business process map.

        Mapping:
        - "medicare_claim_processing" → "Medicare"
        - "medicaid_eligibility" → "Medicaid"
        - "commercial_enrollment" → "Commercial"

        Args:
            business_process_map: List of affected business processes

        Returns:
            Line of business string
        """

    def calculate_projected_attrition(
        self,
        blast_radius_criticality: float,
        likelihood_score: float,
        attrition_rate: float,
        member_count: int
    ) -> int:
        """
        Calculate projected member attrition.

        Formula: attrition = criticality × likelihood × attrition_rate × member_count

        Args:
            blast_radius_criticality: Blast radius criticality score (0.0 - 1.0)
            likelihood_score: Risk likelihood score (0.0 - 1.0)
            attrition_rate: Historical attrition rate (0.0 - 1.0)
            member_count: Current member count

        Returns:
            Projected attrition (member count)
        """

    def calculate_annual_revenue_risk(
        self,
        projected_attrition: int,
        premium_per_member_monthly: float
    ) -> float:
        """
        Calculate annual premium revenue risk.

        Formula: revenue_risk = projected_attrition × premium_per_member × 12

        Args:
            projected_attrition: Projected member attrition
            premium_per_member_monthly: Monthly premium per member ($)

        Returns:
            Annual revenue risk ($)
        """
```

**Calculation Logic:**
```python
# Step 1: Identify line of business
line_of_business = self.identify_line_of_business(business_process_map)

# Step 2: Get member data
member_data = await actuarial_service.get_member_data(line_of_business)

# Step 3: Calculate projected attrition
projected_attrition = (
    blast_radius_criticality_score *
    likelihood_score *
    member_data['attrition_rate'] *
    member_data['member_count']
)

# Step 4: Calculate annual revenue risk
revenue_risk = projected_attrition * member_data['premium_per_member'] * 12
```

---

### 6. Methodology Trail Generator

**Location:** `/services/financial-engine/src/methodology_trail_generator.py`

**Responsibilities:**
- Generate complete audit methodology trails
- Document all calculation steps
- Track data sources and assumptions
- Enable CFO board-meeting defensibility

**Interface:**
```python
class MethodologyTrailGenerator:
    def __init__(self):
        """Initialize methodology trail generator."""

    def generate_methodology_trail(
        self,
        risk_object: RiskObject,
        financial_impact: FinancialImpact,
        calculation_steps: List[CalculationStep]
    ) -> MethodologyTrail:
        """
        Generate complete audit methodology trail.

        Generates:
        1. Calculation methodology description
        2. Methodology version
        3. Calculation timestamp
        4. Data sources list
        5. Assumptions list
        6. Calculation steps with timestamps
        7. Confidence scores per component

        Args:
            risk_object: Enriched RiskObject
            financial_impact: Calculated financial impact
            calculation_steps: List of calculation steps performed

        Returns:
            MethodologyTrail with complete audit trail

        Example:
            Output: {
                "methodology": "Calculation engine v1.0: MLR impact (claims model) + ...",
                "methodology_version": "1.0.0",
                "calculation_timestamp": "2025-06-06T12:00:00Z",
                "sources": [...],
                "assumptions": [...]
            }
        """

    def generate_methodology_description(self, calculation_steps: List[CalculationStep]) -> str:
        """
        Generate human-readable methodology description.

        Format: "Calculation engine v{version}: {component1} ({method1}) + {component2} ({method2}) + ..."

        Args:
            calculation_steps: List of calculation steps

        Returns:
            Methodology description string
        """

    def document_data_sources(
        self,
        risk_object: RiskObject,
        actuarial_data_sources: List[str]
    ) -> List[FinancialSource]:
        """
        Document all data sources used in calculation.

        Sources:
        - Risk object source (connector)
        - Actuarial export files
        - Business process graph queries
        - Financial parameter database

        Args:
            risk_object: Enriched RiskObject
            actuarial_data_sources: List of actuarial data sources

        Returns:
            List of FinancialSource objects
        """

    def document_assumptions(
        self,
        risk_object: RiskObject,
        calculation_steps: List[CalculationStep]
    ) -> List[str]:
        """
        Document all assumptions made in calculation.

        Assumptions:
        - Blast radius criticality mapping
        - Likelihood score interpretation
        - Actuarial data quality
        - Claim rate projections
        - Attrition rate projections

        Args:
            risk_object: Enriched RiskObject
            calculation_steps: List of calculation steps

        Returns:
            List of assumption strings
        """
```

**Methodology Trail Structure:**
```python
{
    "methodology": "Calculation engine v1.0: MLR impact (claims cost model: projected_increase = average_claim × likelihood × criticality) + Stop-loss exposure (attachment analysis: exposure = max(0, projected_losses - attachment)) + Reserve at risk (reserve depletion model: depletion = criticality × likelihood × claim_rate × reserve_balance) + Premium revenue risk (attrition model: attrition = criticality × likelihood × attrition_rate × member_count)",
    "methodology_version": "1.0.0",
    "calculation_timestamp": "2025-06-06T12:00:00Z",
    "sources": [
        {
            "source": "actuarial_export_claims_2025Q1.csv",
            "timestamp": "2025-04-01T00:00:00Z",
            "data_quality_score": 0.95
        },
        {
            "source": "business_process_graph",
            "timestamp": "2025-06-06T11:00:00Z",
            "data_quality_score": 0.90
        }
    ],
    "assumptions": [
        "Blast radius criticality score: 0.85 (tier-based weighted score)",
        "Likelihood score: 0.80 (connector-provided probability)",
        "Claim rate: 0.02 (historical average from actuarial data)",
        "Attrition rate: 0.05 (historical average from member data)",
        "MLR calculation: projected_increase / premium_revenue",
        "Stop-loss attachment analysis: max(0, projected_losses - attachment)",
        "Reserve depletion: criticality × likelihood × claim_rate × reserve_balance"
    ]
}
```

---

### 7. Actuarial Export Parser

**Location:** `/services/financial-engine/src/actuarial_export_parser.py`

**Responsibilities:**
- Parse actuarial exports (CSV, SQL)
- Validate data quality
- Load actuarial parameters
- Cache actuarial data

**Interface:**
```python
class ActuarialExportParser:
    def __init__(self, timescale_config):
        """Initialize parser with TimescaleDB connection."""

    async def parse_csv_export(self, file_path: str) -> pd.DataFrame:
        """
        Parse actuarial CSV export.

        Expected columns:
        - line_of_business
        - member_count
        - premium_per_member
        - average_claim_cost
        - claim_rate
        - attrition_rate
        - reserve_type
        - reserve_balance
        - stop_loss_attachment
        - stop_loss_aggregate
        - stop_loss_current_position

        Args:
            file_path: Path to CSV export file

        Returns:
            Pandas DataFrame with actuarial data
        """

    async def parse_sql_export(self, query: str) -> pd.DataFrame:
        """
        Parse actuarial SQL export from data warehouse.

        Queries actuarial tables:
        - actuarial.member_premiums
        - actuarial.claims_history
        - actuarial.reserves
        - actuarial.stop_loss_positions

        Args:
            query: SQL query string

        Returns:
            Pandas DataFrame with actuarial data
        """

    def validate_data_quality(self, df: pd.DataFrame) -> float:
        """
        Validate data quality of actuarial export.

        Checks:
        - Required columns present
        - No missing values
        - Numeric values in valid ranges
        - No duplicates

        Args:
            df: Pandas DataFrame to validate

        Returns:
            Data quality score (0.0 - 1.0)
        """

    async def cache_actuarial_data(self, customer_id: str, data: pd.DataFrame):
        """
        Cache actuarial data in TimescaleDB.

        Args:
            customer_id: Customer ID for tenant isolation
            data: Actuarial data to cache
        """

    async def get_cached_actuarial_data(self, customer_id: str) -> pd.DataFrame:
        """
        Get cached actuarial data from TimescaleDB.

        Args:
            customer_id: Customer ID for tenant isolation

        Returns:
            Cached actuarial data as DataFrame
        """
```

**CSV Export Format:**
```csv
line_of_business,member_count,premium_per_member,average_claim_cost,claim_rate,attrition_rate,reserve_type,reserve_balance,stop_loss_attachment,stop_loss_aggregate,stop_loss_current_position
Medicare,50000,500,1200,0.02,0.05,case_reserve,10000000,250000,5000000,500000
Medicaid,75000,350,800,0.015,0.04,medical_loss,8000000,200000,4000000,300000
Commercial,100000,600,1500,0.025,0.06,ibnr,15000000,300000,8000000,600000
```

---

### 8. Batch Job Scheduler

**Location:** `/services/financial-engine/src/batch_scheduler.py`

**Responsibilities:**
- Schedule financial calculation batch jobs
- Trigger actuarial export processing
- Monitor batch job execution
- Handle batch job failures

**Interface:**
```python
class BatchScheduler:
    def __init__(self, calculation_engine, scheduler_config):
        """Initialize scheduler with calculation engine."""

    async def schedule_financial_updates(self, cron_schedule: str = "0 2 * * *"):
        """
        Schedule daily financial update batch jobs.

        Default: 2:00 AM daily (cron: "0 2 * * *")

        Job steps:
        1. Fetch actuarial exports from data warehouse
        2. Parse and validate actuarial data
        3. Query enriched risk objects from TimescaleDB
        4. Recalculate financial impacts for active risks
        5. Update financial_impacts table
        6. Send completion notification

        Args:
            cron_schedule: Cron schedule string
        """

    async def schedule_actuarial_export_processing(self, cron_schedule: str = "0 3 * * *"):
        """
        Schedule actuarial export processing batch jobs.

        Default: 3:00 AM daily (cron: "0 3 * * *")

        Job steps:
        1. Fetch latest actuarial exports from S3/FTP
        2. Parse and validate exports
        3. Cache actuarial data in TimescaleDB
        4. Trigger financial recalculation

        Args:
            cron_schedule: Cron schedule string
        """

    async def execute_batch_job(self, job_id: str, job_type: str):
        """
        Execute a batch job.

        Args:
            job_id: Unique job identifier
            job_type: Type of job (financial_update, actuarial_export)
        """

    async def handle_batch_failure(self, job_id: str, error: Exception):
        """
        Handle batch job failure.

        Args:
            job_id: Failed job identifier
            error: Exception that caused failure
        """
```

**Batch Job Types:**
1. **financial_update**: Daily recalculation of financial impacts
2. **actuarial_export**: Daily processing of actuarial exports

---

### 9. Configuration Management

**Location:** `/services/financial-engine/src/config.py`

**Configuration Sections:**
- Kafka (bootstrap servers, topics, consumer group)
- TimescaleDB (connection string, pool size)
- Calculation (methodology version, timeout, max retries)
- MLR calculation (claim rate defaults, premium revenue defaults)
- Stop-loss (attachment defaults, aggregate defaults)
- Reserve (reserve type mappings, claim rate defaults)
- Premium revenue (attrition rate defaults, member data defaults)
- Actuarial exports (S3 bucket, FTP credentials, CSV format)
- Batch scheduling (cron schedules, timeout, retry policies)
- Logging (level, format, file)
- Metrics (enabled, port)
- Health check (intervals, timeouts)

---

### 10. Health Check & Metrics

**Location:** `/services/financial-engine/src/health.py`

**Endpoints:**
- `GET /health` - Overall health status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /metrics` - Prometheus metrics

**Prometheus Metrics:**
- `financial_engine_calculations_total{status}` - Calculation count
- `financial_engine_calculation_duration_seconds{calculator}` - Calculation latency
- `financial_engine_mlr_impact_distribution` - MLR impact distribution
- `financial_engine_stop_loss_exposure_distribution` - Stop-loss exposure distribution
- `financial_engine_reserve_at_risk_distribution` - Reserve at risk distribution
- `financial_engine_premium_revenue_risk_distribution` - Premium revenue risk distribution
- `financial_engine_total_exposure_distribution` - Total exposure distribution
- `financial_engine_actuarial_data_quality_score` - Actuarial data quality
- `financial_engine_batch_jobs_total{status, job_type}` - Batch job count
- `financial_engine_calculation_errors_total{error_type}` - Calculation errors

---

### 11. Tests

**Location:** `/services/financial-engine/tests/`

**Unit Tests:**
- `test_calculation_engine.py` - Core engine logic
- `test_mlr_impact_calculator.py` - MLR calculations
- `test_stop_loss_exposure_calculator.py` - Stop-loss calculations
- `test_reserve_at_risk_calculator.py` - Reserve calculations
- `test_premium_revenue_risk_calculator.py` - Revenue calculations
- `test_methodology_trail_generator.py` - Methodology trails
- `test_actuarial_export_parser.py` - CSV/SQL parsing
- `test_batch_scheduler.py` - Batch job scheduling

**Integration Tests:**
- `test_financial_calculation_pipeline.py` - Full pipeline with TimescaleDB
- `test_kafka_integration.py` - Kafka consumer/producer
- `test_actuarial_data_integration.py` - Actuarial export processing
- `test_batch_job_execution.py` - Batch job scheduling

---

### 12. Documentation

**Location:** `/services/financial-engine/`

**Files:**
- `README.md` - Architecture overview, quick start, configuration reference
- `docs/ARCHITECTURE.md` - Detailed architecture, data flow, component diagrams
- `docs/CALCULATION_GUIDE.md` - Calculation formulas, methodology, assumptions
- `docs/MLR_CALCULATION.md` - MLR impact calculation details
- `docs/STOP_LOSS_CALCULATION.md` - Stop-loss exposure calculation details
- `docs/RESERVE_CALCULATION.md` - Reserve at risk calculation details
- `docs/PREMIUM_REVENUE_CALCULATION.md` - Premium revenue risk calculation details
- `docs/METHODOLOGY_TRAIL_GUIDE.md` - Methodology trail generation
- `docs/ACTUARIAL_DATA_GUIDE.md` - Actuarial export format, parsing, validation
- `docs/BATCH_SCHEDULING.md` - Batch job scheduling, cron schedules
- `docs/METRICS_REFERENCE.md` - Prometheus metrics, monitoring
- `docs/TROUBLESHOOTING.md` - Common issues, debugging

---

## SUCCESS CRITERIA

**You are done when:**

- ✅ Calculates dollar exposure deterministically (no LLM)
- ✅ Produces MLR impact estimates (percentage points)
- ✅ Calculates stop-loss exposure (dollars against position)
- ✅ Calculates reserve at risk (reserve implications)
- ✅ Calculates premium revenue risk (revenue implications)
- ✅ Generates complete audit methodology trails
- ✅ Processes actuarial exports (CSV/SQL)
- ✅ Batch job scheduler working
- ✅ Health endpoints return correct status
- ✅ Unit tests pass (>80% coverage)
- ✅ Integration tests pass
- ✅ Documentation complete

---

## TECHNICAL CONTEXT

### Technology Stack

**Language:** Python 3.11+
**Framework:** FastAPI (for health endpoints), asyncio (for event processing)
**Database:** PostgreSQL 16 + TimescaleDB (financial_impacts table)
**Message Queue:** Kafka (event consumption)
**Data Processing:** pandas, numpy (deterministic calculations)
**Scheduling:** APScheduler (batch job scheduling)
**Monitoring:** Prometheus (metrics)
**Logging:** structlog (structured logging)

### Database Schema

**financial_impacts Table:**
```sql
CREATE TABLE financial_impacts (
    id UUID PRIMARY KEY,
    risk_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    scenario_id UUID,

    -- MLR Impact
    mlr_impact FLOAT NOT NULL,
    mlr_impact_confidence FLOAT NOT NULL,

    -- Stop-Loss Exposure
    stop_loss_exposure FLOAT NOT NULL,
    stop_loss_attachment FLOAT NOT NULL,
    stop_loss_aggregate FLOAT NOT NULL,
    stop_loss_remaining FLOAT NOT NULL,

    -- Reserve at Risk
    reserve_at_risk FLOAT NOT NULL,
    reserve_type VARCHAR(50) NOT NULL,

    -- Premium Revenue Risk
    premium_revenue_risk FLOAT NOT NULL,
    line_of_business VARCHAR(50) NOT NULL,

    -- Total Exposure
    total_exposure FLOAT NOT NULL,
    total_exposure_confidence FLOAT NOT NULL,

    -- Methodology (CRITICAL FOR AUDIT TRAIL)
    methodology TEXT NOT NULL,
    methodology_version VARCHAR(50) NOT NULL,
    calculation_timestamp TIMESTAMP NOT NULL,
    sources JSONB NOT NULL,
    assumptions JSONB NOT NULL,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_risk FOREIGN KEY (risk_id) REFERENCES risk_objects(id),
    CONSTRAINT fk_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT check_mlr_confidence CHECK (mlr_impact_confidence BETWEEN 0 AND 1),
    CONSTRAINT check_total_confidence CHECK (total_exposure_confidence BETWEEN 0 AND 1),
    CONSTRAINT check_no_negatives CHECK (
        stop_loss_exposure >= 0 AND
        reserve_at_risk >= 0 AND
        premium_revenue_risk >= 0 AND
        total_exposure >= 0
    )
);
```

### Kafka Topics

**Input Topic:** `enriched-risk-objects`
- Partition key: customer_id
- Schema: RiskObject (enriched from T-MVP-005)

**Output:** TimescaleDB `financial_impacts` table

### Performance Requirements

**Latency:**
- Target: <1 second per risk object calculation
- Batch processing: 100 risk objects/batch

**Throughput:**
- Target: >500 risk objects/second
- Horizontal scaling: Multiple instances

**Error Rate:**
- Target: <0.1% of calculations fail
- Fallback to conservative estimates on error

---

## DEPENDENCIES

**Blocked by:**
- ✅ T-FOUND-003: Core Data Models (COMPLETE)
- ✅ T-MVP-005: Risk Normalization Engine (COMPLETE)

**Blocks:**
- T-MVP-007: Agent Runtime (needs financial impacts)
- T-MVP-008: CFO Agent (needs financial impacts)

---

## VALIDATION REQUIREMENTS

### Acceptance Validator

**Deliverables:**
- ✅ All 8 components implemented (Engine, 4 Calculators, Methodology, Parser, Scheduler)
- ✅ Configuration management
- ✅ Health check & metrics
- ✅ Unit tests (>80% coverage)
- ✅ Integration tests
- ✅ Documentation

**Success Criteria:**
- ✅ Calculates dollar exposure deterministically
- ✅ Produces MLR impact estimates
- ✅ Calculates stop-loss exposure
- ✅ Calculates reserve at risk
- ✅ Calculates premium revenue risk
- ✅ Generates audit methodology trails
- ✅ Processes actuarial exports
- ✅ Batch job scheduler working
- ✅ Health endpoints working

### Security Validator

**No LLM in Calculation Path:**
- ✅ All calculations deterministic (pandas/numpy)
- ✅ No LLM calls in calculation pipeline
- ✅ All calculations reproducible
- ✅ Methodology trails complete

**Data Privacy:**
- ✅ Customer_id in all database queries (tenant isolation)
- ✅ No cross-customer data leakage
- ✅ Actuarial data access controlled
- ✅ PHI not present in financial calculations

**Audit Trail:**
- ✅ Every calculation has methodology trail
- ✅ Every dollar figure traceable to source data
- ✅ Every assumption documented
- ✅ Calculation timestamps recorded

### No-Regression Validator

**If Existing Financial Code:**
- ✅ Additive changes only
- ✅ No breaking changes to FinancialImpact schema
- ✅ Backward compatible with existing financial impacts
- ✅ Safe rollback (can disable calculations)

**If Greenfield:**
- ✅ Schema forward-compatible
- ✅ Configuration versioned
- ✅ Feature flags (can disable calculators)

### Integration Validator

**T-MVP-005 Integration:**
- ✅ Consumes from `enriched-risk-objects` topic
- ✅ Deserializes RiskObjects correctly
- ✅ Uses enriched fields (business_process_map, blast_radius, regulatory_triggers)
- ✅ No data loss in calculations

**TimescaleDB Integration:**
- ✅ Inserts financial impacts correctly
- ✅ Updates financial impacts on recalculation
- ✅ Queries actuarial data correctly
- ✅ Caches actuarial data

**Kafka Integration:**
- ✅ Consumes events with correct consumer group
- ✅ Consumer lag monitored
- ✅ Error handling for malformed events

**Actuarial Export Validation:**
- ✅ CSV parsing works correctly
- ✅ SQL parsing works correctly
- ✅ Data quality validation accurate
- ✅ Caching works correctly

---

## EXECUTION INSTRUCTIONS

### Phase 1: Core Engine (Days 1-3)

1. **Create calculation engine skeleton:**
   - FastAPI app structure
   - Kafka consumer setup
   - Async event processing
   - Error handling

2. **Implement configuration management:**
   - Environment variables
   - YAML config loading
   - Schema validation

3. **Implement health endpoints:**
   - /health, /ready, /live
   - Kafka connectivity checks
   - Database connectivity checks

### Phase 2: MLR Impact Calculator (Days 4-6)

1. **Implement MLR impact calculation:**
   - Actuarial data queries
   - MLR impact formula
   - Confidence score calculation

2. **Implement actuarial data service:**
   - TimescaleDB queries
   - Caching (TTL: 1 hour)
   - Error handling

3. **Write tests:**
   - Unit tests for MLR calculation
   - Integration tests with actuarial data
   - Accuracy tests

### Phase 3: Stop-Loss Exposure Calculator (Days 7-9)

1. **Implement stop-loss exposure calculation:**
   - Stop-loss parameter queries
   - Exposure against attachment
   - Remaining capacity calculation

2. **Write tests:**
   - Unit tests for stop-loss calculation
   - Integration tests
   - Accuracy tests

### Phase 4: Reserve at Risk Calculator (Days 10-12)

1. **Implement reserve at risk calculation:**
   - Reserve type identification
   - Reserve depletion calculation
   - Reserve implications

2. **Write tests:**
   - Unit tests for reserve calculation
   - Integration tests
   - Accuracy tests

### Phase 5: Premium Revenue Risk Calculator (Days 13-15)

1. **Implement premium revenue risk calculation:**
   - Line of business identification
   - Member attrition calculation
   - Revenue risk calculation

2. **Write tests:**
   - Unit tests for revenue calculation
   - Integration tests
   - Accuracy tests

### Phase 6: Methodology Trail Generator (Days 16-18)

1. **Implement methodology trail generation:**
   - Methodology description
   - Data source documentation
   - Assumption documentation
   - Calculation step logging

2. **Write tests:**
   - Unit tests for methodology generation
   - Integration tests
   - Audit trail validation

### Phase 7: Actuarial Export Parser (Days 19-21)

1. **Implement CSV export parsing:**
   - CSV parsing (pandas)
   - Data validation
   - Data quality scoring
   - Caching

2. **Implement SQL export parsing:**
   - SQL query execution
   - Data extraction
   - Validation

3. **Write tests:**
   - Unit tests for CSV parsing
   - Unit tests for SQL parsing
   - Integration tests

### Phase 8: Batch Job Scheduler (Days 22-24)

1. **Implement batch job scheduling:**
   - APScheduler integration
   - Financial update job
   - Actuarial export processing job
   - Job monitoring

2. **Write tests:**
   - Unit tests for scheduler
   - Integration tests
   - Job execution tests

### Phase 9: End-to-End Integration (Days 25-27)

1. **Integrate all components:**
   - Assemble calculation pipeline
   - Test with real enriched risk objects
   - Measure performance

2. **Implement metrics:**
   - Prometheus metrics
   - Calculation latency
   - Error rates

3. **Write integration tests:**
   - End-to-end pipeline tests
   - Kafka integration tests
   - Performance tests

### Phase 10: Documentation & Artifact (Days 28-30)

1. **Write documentation:**
   - README
   - Architecture guide
   - Calculation guides
   - Component-specific guides
   - Troubleshooting

2. **Create artifact:**
   - Write `/workspace/artifacts/T-MVP-006.out`
   - Document all results
   - List deviations from spec
   - Recommendations for T-MVP-007

---

## TIMING

**Estimated:** 120 hours (3 weeks)

**Suggested Breakdown:**
- **Days 1-3:** Core engine, configuration, health
- **Days 4-6:** MLR impact calculator
- **Days 7-9:** Stop-loss exposure calculator
- **Days 10-12:** Reserve at risk calculator
- **Days 13-15:** Premium revenue risk calculator
- **Days 16-18:** Methodology trail generator
- **Days 19-21:** Actuarial export parser
- **Days 22-24:** Batch job scheduler
- **Days 25-27:** End-to-end integration
- **Days 28-30:** Documentation & artifact

**Deadline:** End of Week 11 (unblocks T-MVP-007 Agent Runtime)

---

## CRITICAL SUCCESS FACTORS

### Most Important Requirements

1. **Deterministic Calculations are Non-Negotiable**
   - NO LLM in calculation path
   - All calculations must be reproducible
   - All figures must be defensible in board meeting

2. **Methodology Trail is Board-Meeting Critical**
   - Every calculation step must be logged
   - Every dollar figure must be traceable
   - Every assumption must be documented

3. **Data Quality Scoring Enables Confidence**
   - Actuarial data quality must be tracked
   - Confidence scores must be accurate
   - Low quality data must trigger alerts

4. **Batch Processing Enables Fresh Data**
   - Actuarial exports must be processed daily
   - Financial impacts must be recalculated regularly
   - Stale data must trigger warnings

5. **Error Handling Prevents Failures**
   - Calculation errors must have fallbacks
   - Missing data must use conservative estimates
   - System must be resilient to failures

### Common Pitfalls to Avoid

- ❌ Don't use LLM in calculation path (violates determinism)
- ❌ Don't skip methodology trail (not defensible)
- ❌ Don't ignore data quality (low confidence)
- ❌ Don't hardcode financial parameters (customer-specific)
- ❌ Don't forget tenant isolation (customer_id everywhere)
- ❌ Don't block on calculation (timeout -> fallback)
- ❌ Don't mix tenant data (customer_id in queries)

### Questions to Ask Yourself

1. Can the CFO defend these figures in a board meeting?
2. Is every dollar figure traceable to source data?
3. Are all calculations deterministic and reproducible?
4. Is the methodology trail complete and auditable?
5. Are data quality scores accurate and tracked?
6. Can the system handle calculation failures gracefully?

---

## TESTING STRATEGY

### Unit Tests

**Calculation Engine:**
- Risk object processing
- Financial impact calculation
- Methodology trail generation

**MLR Impact Calculator:**
- MLR impact calculation
- Confidence score calculation
- Edge cases (zero premium, zero claims)

**Stop-Loss Exposure Calculator:**
- Stop-loss exposure calculation
- Attachment point analysis
- Remaining capacity calculation

**Reserve at Risk Calculator:**
- Reserve type identification
- Reserve depletion calculation
- Reserve implications

**Premium Revenue Risk Calculator:**
- Line of business identification
- Member attrition calculation
- Revenue risk calculation

**Methodology Trail Generator:**
- Methodology description generation
- Data source documentation
- Assumption documentation

**Actuarial Export Parser:**
- CSV parsing
- SQL parsing
- Data quality validation

**Batch Scheduler:**
- Job scheduling
- Job execution
- Error handling

### Integration Tests

**Financial Calculation Pipeline:**
- End-to-end calculation with real risk objects
- Enriched risk objects from T-MVP-005
- TimescaleDB integration
- Kafka integration

**Actuarial Data Integration:**
- CSV export processing
- SQL export processing
- Data validation
- Caching

**Batch Job Execution:**
- Financial update job
- Actuarial export processing job
- Job monitoring
- Error handling

---

## OUTPUT REQUIREMENTS

### Code Outputs

**Source Code:**
```
/services/financial-engine/
  src/
    __init__.py
    config.py
    calculation_engine.py
    health.py
    batch_scheduler.py
    calculators/
      __init__.py
      mlr_impact_calculator.py
      stop_loss_exposure_calculator.py
      reserve_at_risk_calculator.py
      premium_revenue_risk_calculator.py
    services/
      __init__.py
      actuarial_service.py
      methodology_trail_generator.py
      actuarial_export_parser.py
```

**Configuration:**
```
/services/financial-engine/
  config/
    schema.yaml
  requirements.txt
```

**Tests:**
```
/services/financial-engine/
  tests/
    test_calculation_engine.py
    test_mlr_impact_calculator.py
    test_stop_loss_exposure_calculator.py
    test_reserve_at_risk_calculator.py
    test_premium_revenue_risk_calculator.py
    test_methodology_trail_generator.py
    test_actuarial_export_parser.py
    test_batch_scheduler.py
    test_financial_calculation_pipeline.py
    test_kafka_integration.py
    test_actuarial_data_integration.py
    test_batch_job_execution.py
```

**Documentation:**
```
/services/financial-engine/
  README.md
  docs/
    ARCHITECTURE.md
    CALCULATION_GUIDE.md
    MLR_CALCULATION.md
    STOP_LOSS_CALCULATION.md
    RESERVE_CALCULATION.md
    PREMIUM_REVENUE_CALCULATION.md
    METHODOLOGY_TRAIL_GUIDE.md
    ACTUARIAL_DATA_GUIDE.md
    BATCH_SCHEDULING.md
    METRICS_REFERENCE.md
    TROUBLESHOOTING.md
```

**Deployment:**
```
/services/financial-engine/
  Dockerfile
  docker-compose.yml
  k8s/
    deployment.yaml
    service.yaml
```

### Artifact Output

**Location:** `/workspace/artifacts/T-MVP-006.out`

**Contents:**
- Executive summary
- List of all components implemented
- Test results (unit + integration)
- Performance metrics
- Methodology trail validation results
- Actuarial data processing results
- Deviations from specification
- Recommendations for T-MVP-007 (Agent Runtime)
- Known limitations
- Production readiness checklist

---

## NEXT STEPS AFTER COMPLETION

**Unblocks:**
- T-MVP-007: Agent Runtime (needs financial impacts)
- T-MVP-008: CFO Agent (needs financial impacts)

**Recommendations for T-MVP-007 (Agent Runtime):**
- Use financial_impacts from enriched RiskObjects
- Use methodology_trail for agent briefings
- Use confidence scores for agent uncertainty

**Recommendations for T-MVP-008 (CFO Agent):**
- Use financial_exposure for CFO briefings
- Use methodology_trail for board-meeting defensibility
- Use total_exposure for trend analysis
- Use component breakdown for detailed reporting

---

## BRANCHING

**Create branch:** `task/T-MVP-006-financial-modeling`

**Commit structure:**
- One commit per component
- Clear commit messages
- No merge to main without approval

---

**Ready to begin. This is the critical path for Phase 1. Build the deterministic calculation engine that turns enriched risk objects into board-meeting-ready financial impact assessments.**

**Remember: NO LLM in the calculation path. The CFO must be able to defend these figures in a board meeting.**

**Good luck! 🚀**
