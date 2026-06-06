# Task Assignment: T-MVP-005
## Risk Normalization Engine for CyberRX Multi-Agent AI Platform

---

**Task ID:** T-MVP-005
**Title:** Risk Normalization Engine
**Assigned To:** Senior Backend Engineer
**Phase:** Phase 1 - Third-Party Cyber Intelligence MVP
**Weeks:** 5-8
**Estimated Hours:** 120 hours
**Priority:** 🔴 CRITICAL PATH

---

## OBJECTIVE

Build the Risk Normalization Engine that enriches raw security events from all 4 connectors (Splunk, CrowdStrike, Azure AD, Nasco) into fully-enriched RiskObjects ready for downstream consumption by the Financial Modeling Engine (T-MVP-006) and AI Agents (T-MVP-008 through T-MVP-010).

**What we're building:** A centralized enrichment and normalization service that transforms connector events into actionable risk intelligence by:
1. Mapping raw events to business processes (e.g., "server-1" → "claims-adjudication")
2. Stripping PHI/PII before LLM processing
3. Calculating blast radius (downstream impact)
4. Mapping regulatory triggers (HIPAA, CMS forms, notification timelines)
5. Validating all RiskObjects against schema constraints

**Your mission:** Build the critical enrichment pipeline that turns raw security events into board-meeting-ready risk intelligence.

---

## ARCHITECTURE CONTEXT

### Data Flow Architecture

```
[Connectors] → [Kafka: raw-security-events] → [Risk Normalization Engine]
                                                            │
                                                            ├─→ [Kafka: enriched-risk-objects]
                                                            │
                                                            ├─→ [Business Process Graph Service]
                                                            │
                                                            ├─→ [PHI Stripping Service]
                                                            │
                                                            ├─→ [Blast Radius Analyzer]
                                                            │
                                                            └─→ [Regulatory Trigger Mapper]
                                                                        │
                                                                        ▼
                                                        [Financial Engine (T-MVP-006)]
                                                                        │
                                                                        ▼
                                                        [AI Agents (T-MVP-008+)]
```

**Critical Insight:** The Normalization Engine is the bridge between raw connector data and actionable intelligence. Without it, we have alerts but no understanding of business impact.

### What Connectors Provide (Raw Events)

**Splunk (T-MVP-001):**
- Security alerts, anomaly detections, brute force attempts
- Fields: src_ip, dest_ip, user, severity, raw logs

**CrowdStrike (T-MVP-002):**
- EDR detections, malware alerts, host context
- Fields: hostname, device_id, severity, process_tree

**Azure AD (T-MVP-003):**
- Sign-in failures, MFA failures, privilege escalation
- Fields: user_id, app_id, error_code, risk_level

**Nasco (T-MVP-004):**
- Claims adjudication anomalies, authorization failures
- Fields: claim_id, member_id (PHI!), provider_id, anomaly_type

**What Connectors DON'T Provide:**
- ❌ Business process mapping (they don't know what "server-1" does)
- ❌ PHI stripping (Nasco events contain member_id)
- ❌ Blast radius (they don't know downstream dependencies)
- ❌ Regulatory triggers (they don't know HIPAA obligations)
- ❌ Crown jewel tiering (they don't know what's critical)

**That's OUR Job.**

---

## DELIVERABLES

### 1. Core Normalization Engine

**Location:** `/services/normalization-engine/src/normalization_engine.py`

**Responsibilities:**
- Subscribe to Kafka topic `raw-security-events`
- Deserialize RiskObjects from connectors
- Orchestrate enrichment pipeline
- Publish enriched RiskObjects to `enriched-risk-objects`
- Track enrichment metrics
- Handle errors with dead letter queue

**Interface:**
```python
class NormalizationEngine:
    def __init__(self, kafka_config, enrichment_services):
        """Initialize normalization engine with services."""

    async def process_event(self, raw_event: RawEvent) -> RiskObject:
        """
        Process a raw event through the enrichment pipeline.

        Pipeline:
        1. Deserialize RiskObject
        2. Enrich with business process mapping
        3. Strip PHI/PII
        4. Calculate blast radius
        5. Map regulatory triggers
        6. Validate RiskObject
        7. Update methodology trail
        8. Publish to enriched topic

        Args:
            raw_event: Raw event from connector

        Returns:
            Enriched RiskObject

        Raises:
            ValidationError: If RiskObject validation fails
            EnrichmentError: If enrichment step fails
        """

    async def enrich_risk_object(self, risk_object: RiskObject) -> RiskObject:
        """Run full enrichment pipeline on RiskObject."""

    def update_methodology_trail(self, risk_object: RiskObject, step: str, confidence: float):
        """Update methodology trail with enrichment step."""
```

**Key Features:**
- Async event processing (asyncio)
- Batch processing support (100 events/batch)
- Error handling with dead letter queue
- Metrics collection (Prometheus)
- Health check endpoints
- Circuit breaker for downstream services

---

### 2. Business Process Graph Service

**Location:** `/services/normalization-engine/src/enrichment/business_process_service.py`

**Responsibilities:**
- Map affected_assets to business_process_map
- Query customer-specific business process graph
- Identify crown jewel processes
- Calculate process criticality score

**Interface:**
```python
class BusinessProcessService:
    def __init__(self, timescale_config):
        """Initialize service with TimescaleDB connection."""

    async def map_assets_to_processes(self, assets: List[str], customer_id: str) -> List[str]:
        """
        Map affected assets to business process IDs.

        Example:
        Input: ["server-1", "database-2"]
        Output: ["claims-adjudication", "edi-837-processing"]

        Args:
            assets: List of asset names/hostnames/IPs
            customer_id: Customer for tenant isolation

        Returns:
            List of business process IDs
        """

    async def get_process_criticality(self, process_id: str, customer_id: str) -> float:
        """
        Get criticality score for a business process (0.0 - 1.0).

        Based on:
        - Tier (Crown Jewel = 1.0, Critical = 0.8, etc.)
        - Downtime cost per day
        - Number of dependent processes
        - Premium revenue at risk

        Args:
            process_id: Business process ID
            customer_id: Customer for tenant isolation

        Returns:
            Criticality score (0.0 - 1.0)
        """

    async def identify_crown_jewels(self, process_ids: List[str], customer_id: str) -> List[str]:
        """
        Identify crown jewel processes from list.

        Args:
            process_ids: List of business process IDs
            customer_id: Customer for tenant isolation

        Returns:
            List of crown jewel process IDs
        """
```

**Database Query:**
```sql
-- Query business process graph for asset-to-process mapping
SELECT
    bp.id AS process_id,
    bp.name AS process_name,
    bp.tier,
    bp.downtime_cost_per_day,
    bp.process_type
FROM business_process_graph bpg
CROSS JOIN LATERAL jsonb_array_elements(bpg.nodes) AS node
JOIN LATERAL jsonb_to_record(node) AS bp(
    id TEXT,
    name TEXT,
    type TEXT,
    hostname TEXT,
    ip_address TEXT,
    process_type TEXT,
    tier INT,
    downtime_cost_per_day NUMERIC
) ON TRUE
WHERE bpg.customer_id = $1
  AND (bp.hostname = ANY($2) OR bp.ip_address = ANY($2));
```

---

### 3. PHI Stripping Service

**Location:** `/services/normalization-engine/src/enrichment/phi_stripping_service.py`

**Responsibilities:**
- Detect and strip PHI/PII from RiskObjects
- Support regex-based pattern matching
- Support NLP-based entity detection (spaCy)
- Log stripping operations for audit trail
- Preserve data for financial calculations (de-identify)

**Interface:**
```python
class PHIStrippingService:
    def __init__(self, spacy_model: str = "en_core_web_sm"):
        """
        Initialize PHI stripping service.

        Args:
            spacy_model: spaCy model for NLP-based detection
        """

    def strip_phi_from_risk_object(self, risk_object: RiskObject) -> Tuple[RiskObject, List[str]]:
        """
        Strip PHI/PII from RiskObject.

        Strips from:
        - affected_assets (if contains member IDs)
        - normalization_notes (if contains member names)
        - methodology_trail.assumptions (if contains PHI)
        - raw event data (if attached)

        Args:
            risk_object: RiskObject potentially containing PHI

        Returns:
            Tuple of (stripped_risk_object, stripped_fields_list)

        Example:
            Input: affected_assets=["member-12345-pc", "server-1"]
            Output: affected_assets=["member-XXXXX-pc", "server-1"]
                    stripped_fields=["affected_assets[0]"]
        """

    def detect_phi_patterns(self, text: str) -> List[Dict]:
        """
        Detect PHI patterns in text using regex.

        Patterns:
        - Member ID: \b(MEMBER|MEMB|ID)[-_]?\d{6,}\b
        - SSN: \b\d{3}-\d{2}-\d{4}\b
        - Claim ID: \b(CLAIM|CLM)[-_]?\d{8,}\b
        - Medical Record Number: \b(MRN|MR)[-_]?\d{6,}\b
        - Patient Name: (Mr|Mrs|Ms|Dr)\.?\s+[A-Z][a-z]+\s+[A-Z][a-z]+

        Args:
            text: Text to search

        Returns:
            List of detected PHI with positions
        """

    def detect_phi_entities(self, text: str) -> List[Dict]:
        """
        Detect PHI entities using spaCy NLP.

        Detects:
        - PERSON names
        - ORGANizations (healthcare providers)
        - Dates (birth dates, admission dates)
        - Locations (addresses)

        Args:
            text: Text to search

        Returns:
            List of detected PHI entities with positions
        """

    def redact_phi(self, text: str, phi_detections: List[Dict]) -> str:
        """
        Redact detected PHI from text.

        Args:
            text: Original text
            phi_detections: List of PHI detections from detect_phi_*()

        Returns:
            Redacted text with PHI replaced by XXXX
        """
```

**PHI Patterns (Regex):**
```python
PHI_PATTERNS = {
    "member_id": r"\b(MEMBER|MEMB|ID)[-_]?\d{6,}\b",
    "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
    "claim_id": r"\b(CLAIM|CLM)[-_]?\d{8,}\b",
    "mrn": r"\b(MRN|MR)[-_]?\d{6,}\b",
    "patient_name": r"(Mr|Mrs|Ms|Dr)\.?\s+[A-Z][a-z]+\s+[A-Z][a-z]+",
    "phone": r"\b\d{3}-\d{3}-\d{4}\b",
    "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
}
```

**Security Requirements:**
- ✅ All stripping operations logged to audit trail
- ✅ No PHI in logs or error messages
- ✅ Stripping before LLM calls (mandatory)
- ✅ Preserve financial calculation data (de-identify only)
- ✅ Validate stripping effectiveness

---

### 4. Blast Radius Analyzer

**Location:** `/services/normalization-engine/src/enrichment/blast_radius_analyzer.py`

**Responsibilities:**
- Calculate downstream impact from affected assets
- Traverse business process graph edges
- Identify reachable systems and processes
- Calculate blast radius criticality score

**Interface:**
```python
class BlastRadiusAnalyzer:
    def __init__(self, timescale_config):
        """Initialize analyzer with TimescaleDB connection."""

    async def calculate_blast_radius(self, risk_object: RiskObject, customer_id: str) -> List[str]:
        """
        Calculate blast radius from affected assets.

        Traverses business process graph from affected assets
        to find all downstream systems and processes.

        Args:
            risk_object: RiskObject with affected_assets
            customer_id: Customer for tenant isolation

        Returns:
            List of downstream system/process IDs reachable

        Example:
            Input: affected_assets=["server-1"]
            Output: ["database-1", "edi-gateway", "claims-system"]
        """

    async def calculate_blast_radius_criticality(self, blast_radius: List[str], customer_id: str) -> float:
        """
        Calculate criticality score of blast radius (0.0 - 1.0).

        Based on:
        - Number of crown jewels in blast radius
        - Total downtime cost per day
        - Premium revenue at risk
        - Number of affected members

        Args:
            blast_radius: List of system/process IDs
            customer_id: Customer for tenant isolation

        Returns:
            Criticality score (0.0 - 1.0)
        """

    async def find_attack_paths(self, source: str, target: str, customer_id: str) -> List[List[str]]:
        """
        Find attack paths from source to target in business process graph.

        Uses breadth-first search with depth limit (max 10 hops).

        Args:
            source: Source system/process ID
            target: Target system/process ID
            customer_id: Customer for tenant isolation

        Returns:
            List of attack paths (each path is list of IDs)
        """
```

**Algorithm (BFS):**
```python
async def calculate_blast_radius(self, risk_object: RiskObject, customer_id: str) -> List[str]:
    """Calculate blast radius using BFS traversal."""

    visited = set()
    queue = deque(risk_object.affected_assets)
    blast_radius = set()

    while queue:
        current = queue.popleft()

        if current in visited:
            continue

        visited.add(current)

        # Query downstream dependencies from business process graph
        downstream = await self._get_downstream_dependencies(current, customer_id)

        for system in downstream:
            if system not in visited:
                queue.append(system)
                blast_radius.add(system)

    return list(blast_radius)
```

**Database Query:**
```sql
-- Query downstream dependencies from business process graph
SELECT
    jsonb_array_elements_text(bp.dependencies) AS downstream_system
FROM business_process_graph bpg
CROSS JOIN LATERAL jsonb_array_elements(bpg.nodes) AS node
JOIN LATERAL jsonb_to_record(node) AS bp(
    id TEXT,
    dependencies TEXT[]
) ON TRUE
WHERE bpg.customer_id = $1
  AND bp.id = $2;
```

---

### 5. Regulatory Trigger Mapper

**Location:** `/services/normalization-engine/src/enrichment/regulatory_mapper.py`

**Responsibilities:**
- Map risk events to regulatory obligations
- Identify HIPAA requirements triggered
- Map to CMS forms (CMS-10743, etc.)
- Calculate notification timelines (60 days, etc.)
- Determine compliance status

**Interface:**
```python
class RegulatoryMapper:
    def __init__(self, timescale_config):
        """Initialize mapper with TimescaleDB connection."""

    async def map_regulatory_triggers(self, risk_object: RiskObject, customer_id: str) -> List[Regulation]:
        """
        Map risk event to regulatory obligations.

        Maps based on:
        - Business processes affected (claims adjudication → HIPAA)
        - PHI exposure (member_id in affected_assets → HIPAA 45 CFR §164.312)
        - System type (claims_system → CMS regulations)
        - Severity (critical → breach notification required)

        Args:
            risk_object: RiskObject with business_process_map
            customer_id: Customer for tenant isolation

        Returns:
            List of regulatory obligations triggered
        """

    async def check_hipaa_triggers(self, risk_object: RiskObject) -> bool:
        """
        Check if HIPAA obligations are triggered.

        HIPAA triggered if:
        - Business process involves PHI (claims, enrollment, care management)
        - PHI present in affected_assets
        - System type is claims_system, member_portal, provider_portal

        Args:
            risk_object: RiskObject to check

        Returns:
            True if HIPAA obligations triggered
        """

    async def check_cms_triggers(self, risk_object: RiskObject) -> bool:
        """
        Check if CMS regulations are triggered.

        CMS triggered if:
        - Medicare/Medicaid business process affected
        - MLR impact > threshold (e.g., 1 percentage point)
        - Premium revenue at risk for Medicare line of business

        Args:
            risk_object: RiskObject to check

        Returns:
            True if CMS obligations triggered
        """

    def calculate_notification_deadline(self, regulation_id: str, breach_date: str) -> str:
        """
        Calculate notification deadline based on regulation.

        Examples:
        - HIPAA breach notification: 60 days from discovery
        - CMS-10743 (Part D): 60 days from discovery
        - State breach laws: Varies by state (CA: 30 days, TX: 60 days)

        Args:
            regulation_id: Regulation identifier
            breach_date: ISO 8601 date of breach discovery

        Returns:
            ISO 8601 deadline for notification
        """
```

**Regulation Mapping Rules:**
```python
REGULATORY_MAPPINGS = {
    "hipaa_phi_disclosure": {
        "triggers": [
            "business_process_map CONTAINS 'claims_adjudication'",
            "affected_assets MATCHES 'member.*'",
            "source IN ('nasco', 'azure_ad')"
        ],
        "regulation_id": "HIPAA-45CFR164.312",
        "obligation": "Safeguard electronic PHI",
        "notification_required": True,
        "notification_timeline": "60 days",
        "deadline_calc": "breach_date + 60 days"
    },
    "cms_mlr_breach": {
        "triggers": [
            "financial_exposure.mlr_impact > 1.0",
            "financial_exposure.line_of_business IN ('Medicare', 'Medicaid')"
        ],
        "regulation_id": "CMS-4202-B",
        "obligation": "Report MLR shortfall to CMS",
        "notification_required": True,
        "notification_timeline": "90 days",
        "deadline_calc": "year_end + 90 days"
    },
    "cms_part_d_breach": {
        "triggers": [
            "business_process_map CONTAINS 'pbm_interface'",
            "severity >= 'HIGH'"
        ],
        "regulation_id": "CMS-10743",
        "obligation": "Report Part D breach to CMS",
        "notification_required": True,
        "notification_timeline": "60 days",
        "cms_form_required": "CMS-10743",
        "deadline_calc": "discovery_date + 60 days"
    }
}
```

---

### 6. RiskObject Validator

**Location:** `/services/normalization-engine/src/validation/risk_object_validator.py`

**Responsibilities:**
- Validate all RiskObjects against schema constraints
- Check required fields and ranges
- Validate methodology trail completeness
- Validate financial_exposure structure
- Validate business_process_map references
- Validate regulatory_trigger deadlines

**Interface:**
```python
class RiskObjectValidator:
    def __init__(self, schema_registry):
        """Initialize validator with JSON Schema registry."""

    def validate_risk_object(self, risk_object: RiskObject) -> ValidationResult:
        """
        Validate RiskObject against schema constraints.

        Validates:
        - Required fields present
        - Field types correct
        - Score ranges (0.0 - 1.0)
        - Timestamps valid ISO 8601
        - Arrays non-empty where required
        - Enum values valid
        - financial_exposure structure valid
        - methodology_trail completeness
        - business_process_map references valid

        Args:
            risk_object: RiskObject to validate

        Returns:
            ValidationResult with is_valid, errors, warnings
        """

    def validate_financial_exposure(self, financial_exposure: FinancialImpact) -> ValidationResult:
        """
        Validate financial_exposure structure.

        Validates:
        - methodology present
        - methodology_version present
        - calculation_timestamp present
        - sources non-empty
        - assumptions non-empty
        - Dollar amounts non-negative
        - Confidence scores 0.0 - 1.0

        Args:
            financial_exposure: FinancialImpact to validate

        Returns:
            ValidationResult
        """

    def validate_methodology_trail(self, methodology_trail: MethodologyTrail) -> ValidationResult:
        """
        Validate methodology_trail completeness.

        Validates:
        - normalization_steps non-empty
        - enrichment_timestamps non-empty
        - data_sources non-empty
        - calculation_methods present
        - assumptions present
        - confidence_scores present
        - Arrays same length

        Args:
            methodology_trail: MethodologyTrail to validate

        Returns:
            ValidationResult
        """

    def validate_business_process_map(self, business_process_map: List[str], customer_id: str) -> ValidationResult:
        """
        Validate business_process_map references exist.

        Validates:
        - All process IDs exist in business_process_graph
        - Processes belong to customer

        Args:
            business_process_map: List of process IDs
            customer_id: Customer for tenant isolation

        Returns:
            ValidationResult
        """
```

---

### 7. Configuration Management

**Location:** `/services/normalization-engine/src/config.py`

**Configuration Sections:**
- Kafka (bootstrap servers, topics, consumer group)
- TimescaleDB (connection string, pool size)
- PHI stripping (patterns, spaCy model)
- Business process graph (cache TTL, query timeout)
- Blast radius (max depth, BFS timeout)
- Regulatory mapping (rules, notification timelines)
- Validation (strict mode, warnings as errors)
- Logging (level, format, file)
- Metrics (Prometheus port, enabled)
- Health check (intervals, timeouts)

---

### 8. Health Check & Metrics

**Location:** `/services/normalization-engine/src/health.py`

**Endpoints:**
- `GET /health` - Overall health status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /metrics` - Prometheus metrics

**Prometheus Metrics:**
- `normalization_engine_events_total{source, status}` - Event processing count
- `normalization_engine_enrichment_duration_seconds{step}` - Enrichment latency
- `normalization_engine_phi_stripping_total{status}` - PHI stripping count
- `normalization_engine_blast_radius_size` - Blast radius size distribution
- `normalization_engine_regulatory_triggers_total{regulation_id}` - Regulatory triggers
- `normalization_engine_validation_errors_total{error_type}` - Validation errors
- `normalization_engine_kafka_lag` - Kafka consumer lag

---

### 9. Tests

**Location:** `/services/normalization-engine/tests/`

**Unit Tests:**
- `test_business_process_service.py` - Asset mapping, criticality calculation
- `test_phi_stripping_service.py` - PHI detection, redaction
- `test_blast_radius_analyzer.py` - BFS traversal, attack paths
- `test_regulatory_mapper.py` - Regulation mapping, deadlines
- `test_risk_object_validator.py` - Schema validation, constraints
- `test_normalization_engine.py` - End-to-end enrichment pipeline

**Integration Tests:**
- `test_enrichment_pipeline.py` - Full pipeline with TimescaleDB
- `test_kafka_integration.py` - Kafka consumer/producer
- `test_phi_stripping_validation.py` - PHI stripping effectiveness
- `test_regulatory_mapping_accuracy.py` - Regulation mapping correctness

---

### 10. Documentation

**Location:** `/services/normalization-engine/`

**Files:**
- `README.md` - Architecture overview, quick start, configuration reference
- `docs/ARCHITECTURE.md` - Detailed architecture, data flow, component diagrams
- `docs/ENRICHMENT_GUIDE.md` - How enrichment works, methodology trail
- `docs/BUSINESS_PROCESS_MAPPING.md` - Business process graph queries
- `docs/PHI_STRIPPING_GUIDE.md` - PHI patterns, redaction, validation
- `docs/BLAST_RADIUS_GUIDE.md` - BFS algorithm, attack paths, criticality
- `docs/REGULATORY_MAPPING.md` - Regulation mappings, triggers, deadlines
- `docs/VALIDATION_RULES.md` - Validation constraints, error handling
- `docs/METRICS_REFERENCE.md` - Prometheus metrics, monitoring
- `docs/TROUBLESHOOTING.md` - Common issues, debugging

---

## SUCCESS CRITERIA

**You are done when:**

- ✅ Raw events from all 4 connectors are enriched successfully
- ✅ Business process mapping works for all asset types
- ✅ PHI stripping validated (no PHI in enriched events)
- ✅ Blast radius calculation accurate (BFS traversal)
- ✅ Regulatory mapping correct (HIPAA, CMS deadlines)
- ✅ All RiskObjects validate against schema
- ✅ Methodology trails complete and audit-ready
- ✅ Health endpoints return correct status
- ✅ Unit tests pass (>80% coverage)
- ✅ Integration tests pass
- ✅ Documentation complete

---

## TECHNICAL CONTEXT

### Technology Stack

**Language:** Python 3.11+
**Framework:** FastAPI (for health endpoints), asyncio (for event processing)
**Database:** PostgreSQL 16 + TimescaleDB (business process graph queries)
**Message Queue:** Kafka (event consumption/publishing)
**NLP:** spaCy (PHI entity detection)
**Monitoring:** Prometheus (metrics)
**Logging:** structlog (structured logging)

### Database Queries

**Business Process Graph Queries:**
- Asset-to-process mapping (JOIN on nodes)
- Downstream dependencies (traverse edges)
- Crown jewel identification (tier filter)
- Criticality calculation (aggregate downtime cost)

### Kafka Topics

**Input Topic:** `raw-security-events`
- Partition key: source (splunk, crowdstrike, azure_ad, nasco)
- Schema: RiskObject (from connectors)

**Output Topic:** `enriched-risk-objects`
- Partition key: customer_id
- Schema: RiskObject (enriched)

### Performance Requirements

**Latency:**
- Target: <500ms per event enrichment
- Batch processing: 100 events/batch

**Throughput:**
- Target: >1000 events/second
- Horizontal scaling: Multiple instances

**Error Rate:**
- Target: <0.1% of events fail enrichment
- Dead letter queue for failed events

---

## DEPENDENCIES

**Blocked by:**
- ✅ T-FOUND-003: Core Data Models (COMPLETE)
- ✅ T-MVP-001: Splunk Connector (COMPLETE)
- ✅ T-MVP-002: CrowdStrike Connector (COMPLETE)
- ✅ T-MVP-003: Azure AD Connector (COMPLETE)
- ✅ T-MVP-004: Nasco Connector (COMPLETE)

**Blocks:**
- T-MVP-006: Financial Modeling Engine (needs enriched RiskObjects)
- T-MVP-007: Agent Runtime (needs enriched RiskObjects)
- T-MVP-008: CFO Agent (needs enriched RiskObjects)
- T-MVP-009: CISO Agent (needs enriched RiskObjects)
- T-MVP-010: CRO Agent (needs enriched RiskObjects)

---

## VALIDATION REQUIREMENTS

### Acceptance Validator

**Deliverables:**
- ✅ All 6 components implemented (Engine, Business Process, PHI Stripping, Blast Radius, Regulatory, Validator)
- ✅ Configuration management
- ✅ Health check & metrics
- ✅ Unit tests (>80% coverage)
- ✅ Integration tests
- ✅ Documentation

**Success Criteria:**
- ✅ Enriches events from all 4 connectors
- ✅ Business process mapping accurate
- ✅ PHI stripping validated (no PHI in output)
- ✅ Blast radius calculation correct
- ✅ Regulatory mapping accurate
- ✅ All RiskObjects validate
- ✅ Methodology trails complete
- ✅ Health endpoints working

### Security Validator

**PHI Stripping:**
- ✅ All PHI patterns detected and stripped
- ✅ NLP-based entity detection working
- ✅ No PHI in enriched events
- ✅ No PHI in logs or error messages
- ✅ Stripping operations logged to audit trail
- ✅ Financial data preserved (de-identified only)

**Data Privacy:**
- ✅ Customer_id in all database queries (tenant isolation)
- ✅ No cross-customer data leakage
- ✅ PHI stripped before LLM calls (mandatory)
- ✅ Secure credential handling (Kafka, database)

**Access Control:**
- ✅ Health endpoints require authentication (documented)
- ✅ Configuration changes require admin role (documented)

### No-Regression Validator

**If Existing Normalization Code:**
- ✅ Additive changes only
- ✅ No breaking changes to RiskObject schema
- ✅ Backward compatibility with existing events
- ✅ Safe rollback (can disable enrichment)

**If Greenfield:**
- ✅ Schema forward-compatible
- ✅ Configuration versioned
- ✅ Feature flags (can disable enrichment steps)

### Integration Validator

**Connector Integration:**
- ✅ Consumes from `raw-security-events` topic
- ✅ Deserializes RiskObjects from all 4 connectors
- ✅ Handles connector-specific fields
- ✅ No data loss in enrichment

**Database Integration:**
- ✅ TimescaleDB queries work correctly
- ✅ Business process graph queries performant
- ✅ Connection pooling configured
- ✅ Query timeouts configured

**Kafka Integration:**
- ✅ Consumes events with correct consumer group
- ✅ Publishes enriched events to output topic
- ✅ Consumer lag monitored
- ✅ Dead letter queue for failed events

**PHI Stripping Validation:**
- ✅ Test PHI patterns detected
- ✅ Test NLP entities detected
- ✅ Test redaction effective
- ✅ Test financial data preserved

**Regulatory Mapping Validation:**
- ✅ Test HIPAA triggers correct
- ✅ Test CMS triggers correct
- ✅ Test notification deadlines accurate
- ✅ Test CMS forms mapped correctly

---

## EXECUTION INSTRUCTIONS

### Phase 1: Core Engine (Days 1-3)

1. **Create normalization engine skeleton:**
   - FastAPI app structure
   - Kafka consumer/producer setup
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

### Phase 2: Business Process Service (Days 4-6)

1. **Implement asset-to-process mapping:**
   - TimescaleDB queries
   - Caching (TTL: 1 hour)
   - Error handling

2. **Implement criticality calculation:**
   - Tier-based scoring
   - Downtime cost aggregation
   - Dependent process counting

3. **Write tests:**
   - Unit tests for mapping
   - Integration tests with TimescaleDB
   - Performance tests

### Phase 3: PHI Stripping Service (Days 7-9)

1. **Implement regex-based PHI detection:**
   - Compile all PHI patterns
   - Test pattern accuracy
   - Measure false positive/negative rates

2. **Implement NLP-based PHI detection:**
   - Load spaCy model
   - Implement entity detection
   - Test accuracy

3. **Implement redaction:**
   - Redact detected PHI
   - Preserve financial data
   - Log stripping operations

4. **Validate PHI stripping:**
   - Test with PHI samples
   - Verify no PHI in output
   - Verify financial data preserved

### Phase 4: Blast Radius Analyzer (Days 10-12)

1. **Implement BFS traversal:**
   - Queue-based traversal
   - Depth limit (10 hops)
   - Circular reference detection

2. **Implement criticality calculation:**
   - Aggregate downtime cost
   - Count crown jewels
   - Calculate premium revenue at risk

3. **Implement attack path finding:**
   - BFS from source to target
   - Path enumeration
   - Criticality scoring

4. **Write tests:**
   - Unit tests for BFS
   - Integration tests with business process graph
   - Performance tests (large graphs)

### Phase 5: Regulatory Mapper (Days 13-15)

1. **Implement regulation mappings:**
   - HIPAA triggers
   - CMS triggers
   - State breach laws

2. **Implement deadline calculation:**
   - HIPAA (60 days)
   - CMS-10743 (60 days)
   - State-specific timelines

3. **Implement CMS form mapping:**
   - CMS-10743 (Part D breaches)
   - CMS-4202-B (MLR breaches)

4. **Write tests:**
   - Unit tests for mappings
   - Integration tests with regulatory database
   - Accuracy tests

### Phase 6: RiskObject Validator (Days 16-17)

1. **Implement schema validation:**
   - JSON Schema validation
   - Field type checking
   - Range validation

2. **Implement business logic validation:**
   - Financial exposure structure
   - Methodology trail completeness
   - Business process map references

3. **Write tests:**
   - Unit tests for validation
   - Integration tests with RiskObject schema
   - Error case tests

### Phase 7: End-to-End Integration (Days 18-20)

1. **Integrate all components:**
   - Assemble enrichment pipeline
   - Test with real connector events
   - Measure performance

2. **Implement metrics:**
   - Prometheus metrics
   - Enrichment latency
   - Error rates

3. **Implement dead letter queue:**
   - Failed event handling
   - Error logging
   - Retry logic

4. **Write integration tests:**
   - End-to-end pipeline tests
   - Kafka integration tests
   - Performance tests

### Phase 8: Documentation & Artifact (Days 21-22)

1. **Write documentation:**
   - README
   - Architecture guide
   - Enrichment guide
   - Component-specific guides
   - Troubleshooting

2. **Create artifact:**
   - Write `/workspace/artifacts/T-MVP-005.out`
   - Document all results
   - List deviations from spec
   - Recommendations for T-MVP-006

---

## TIMING

**Estimated:** 120 hours (3 weeks)

**Suggested Breakdown:**
- **Days 1-3:** Core engine, configuration, health
- **Days 4-6:** Business process service
- **Days 7-9:** PHI stripping service
- **Days 10-12:** Blast radius analyzer
- **Days 13-15:** Regulatory mapper
- **Days 16-17:** RiskObject validator
- **Days 18-20:** End-to-end integration
- **Days 21-22:** Documentation & artifact

**Deadline:** End of Week 8 (unblocks T-MVP-006 Financial Engine)

---

## CRITICAL SUCCESS FACTORS

### Most Important Requirements

1. **Business Process Mapping is Critical**
   - Without it, we don't know business impact
   - Must be accurate for crown jewel tiering
   - Must be performant (<100ms per query)

2. **PHI Stripping is Non-Negotiable**
   - Mandatory before LLM calls
   - Must be validated (no false negatives)
   - Must preserve financial data

3. **Blast Radius Enables Impact Analysis**
   - BFS traversal must be correct
   - Must handle circular references
   - Must scale to large graphs (1000+ nodes)

4. **Regulatory Mapping is Board-Meeting Critical**
   - HIPAA obligations must be accurate
   - CMS deadlines must be correct
   - Notification timelines must be defensible

5. **Methodology Trail Enables CFO Defensibility**
   - Every enrichment step must be logged
   - Every calculation must be auditable
   - Every assumption must be documented

### Common Pitfalls to Avoid

- ❌ Don't skip PHI stripping (security violation)
- ❌ Don't hard-code business processes (customer-specific)
- ❌ Don't ignore circular references in BFS (infinite loop)
- ❌ Don't miss regulatory triggers (compliance violation)
- ❌ Don't forget methodology trail (not defensible)
- ❌ Don't mix tenant data (customer_id everywhere)
- ❌ Don't block on enrichment (timeout -> dead letter queue)

### Questions to Ask Yourself

1. Can the CFO defend the regulatory triggers in a board meeting?
2. Is PHI stripping validated (no false negatives)?
3. Does blast radius calculation handle circular references?
4. Are all enrichment steps logged in methodology trail?
5. Can business process mapping handle customer-specific graphs?
6. Is enrichment latency <500ms per event?

---

## TESTING STRATEGY

### Unit Tests

**Business Process Service:**
- Asset-to-process mapping
- Criticality calculation
- Crown jewel identification

**PHI Stripping Service:**
- PHI pattern detection (all patterns)
- NLP entity detection
- Redaction effectiveness
- Financial data preservation

**Blast Radius Analyzer:**
- BFS traversal
- Circular reference handling
- Attack path finding
- Criticality calculation

**Regulatory Mapper:**
- HIPAA trigger mapping
- CMS trigger mapping
- Deadline calculation
- CMS form mapping

**RiskObject Validator:**
- Schema validation
- Field constraints
- Financial exposure structure
- Methodology trail completeness

### Integration Tests

**Enrichment Pipeline:**
- End-to-end enrichment with real events
- All 4 connectors
- TimescaleDB integration
- Kafka integration

**PHI Stripping Validation:**
- Test with PHI samples
- Verify no PHI in output
- Verify financial data preserved
- Verify audit trail logged

**Regulatory Mapping Accuracy:**
- Test HIPAA triggers
- Test CMS triggers
- Verify deadlines accurate
- Verify CMS forms correct

**Performance Tests:**
- 1000 events/second throughput
- <500ms enrichment latency
- Large business process graphs (1000+ nodes)
- Deep blast radius (10+ hops)

---

## OUTPUT REQUIREMENTS

### Code Outputs

**Source Code:**
```
/services/normalization-engine/
  src/
    __init__.py
    config.py
    normalization_engine.py
    health.py
    enrichment/
      business_process_service.py
      phi_stripping_service.py
      blast_radius_analyzer.py
      regulatory_mapper.py
    validation/
      risk_object_validator.py
```

**Configuration:**
```
/services/normalization-engine/
  config/
    schema.yaml
  requirements.txt
```

**Tests:**
```
/services/normalization-engine/
  tests/
    test_business_process_service.py
    test_phi_stripping_service.py
    test_blast_radius_analyzer.py
    test_regulatory_mapper.py
    test_risk_object_validator.py
    test_normalization_engine.py
    test_enrichment_pipeline.py
    test_kafka_integration.py
    test_phi_stripping_validation.py
    test_regulatory_mapping_accuracy.py
```

**Documentation:**
```
/services/normalization-engine/
  README.md
  docs/
    ARCHITECTURE.md
    ENRICHMENT_GUIDE.md
    BUSINESS_PROCESS_MAPPING.md
    PHI_STRIPPING_GUIDE.md
    BLAST_RADIUS_GUIDE.md
    REGULATORY_MAPPING.md
    VALIDATION_RULES.md
    METRICS_REFERENCE.md
    TROUBLESHOOTING.md
```

**Deployment:**
```
/services/normalization-engine/
  Dockerfile
  docker-compose.yml
  k8s/
    deployment.yaml
    service.yaml
```

### Artifact Output

**Location:** `/workspace/artifacts/T-MVP-005.out`

**Contents:**
- Executive summary
- List of all components implemented
- Test results (unit + integration)
- Performance metrics
- PHI stripping validation results
- Regulatory mapping accuracy results
- Deviations from specification
- Recommendations for T-MVP-006 (Financial Engine)
- Known limitations
- Production readiness checklist

---

## NEXT STEPS AFTER COMPLETION

**Unblocks:**
- T-MVP-006: Financial Modeling Engine (needs enriched RiskObjects)
- T-MVP-007: Agent Runtime (needs enriched RiskObjects)
- T-MVP-008: CFO Agent (needs enriched RiskObjects)
- T-MVP-009: CISO Agent (needs enriched RiskObjects)
- T-MVP-010: CRO Agent (needs enriched RiskObjects)

**Recommendations for T-MVP-006 (Financial Engine):**
- Use financial_exposure from enriched RiskObjects
- Use methodology_trail for defensibility
- Use blast_radius for impact calculation
- Use regulatory_triggers for compliance costs

**Recommendations for Agents (T-MVP-008+):**
- Use business_process_map for contextualization
- Use regulatory_triggers for compliance briefings
- Use blast_radius for attack pathway analysis
- Use methodology_trail for audit trails

---

## BRANCHING

**Create branch:** `task/T-MVP-005-risk-normalization`

**Commit structure:**
- One commit per component
- Clear commit messages
- No merge to main without approval

---

**Ready to begin. This is the critical path for Phase 1. Build the enrichment pipeline that turns raw alerts into board-meeting-ready intelligence.**

**Good luck! 🚀**
