# Task Assignment: T-FOUND-003
## Core Data Models & Schema Design

---

**Task ID:** T-FOUND-003
**Title:** Core Data Models & Schema Design
**Assigned To:** Senior Backend Engineer
**Phase:** Phase 0 - Foundation & Architecture Setup
**Weeks:** 1-2
**Estimated Hours:** 60 hours
**Priority:** 🔴 CRITICAL

---

## OBJECTIVE

Define the core data models and schemas for the CyberRX Multi-Agent AI Platform. This is the foundational data structure that all services will use - RiskObjects, FinancialImpact, business process graphs, agent state, and event schemas.

**What we're building:** A platform where data flows from connectors → normalization → agents → dashboards. The data models are the contract that ensures everything works together.

**Your mission:** Create comprehensive, typed schemas that define every data structure in the system, with database migrations, event schemas, and API documentation.

---

## ARCHITECTURE CONTEXT

### Data Flow Architecture

```
[Connectors] → [Event Bus] → [Normalization Engine] → [Risk Objects]
                                                      ↓
[Financial Engine] → [Financial Impact] → [Agents] → [Briefings]
                                                      ↓
[Agent State] → [Dashboard APIs] → [Frontend]
```

**Critical Insight:** The RiskObject is the core data structure that flows through the entire system. Get this right, and everything else becomes easier.

### Schema Design Principles

1. **Strong Typing:** Everything is typed (TypeScript + Python)
2. **Versioned:** All schemas have version numbers
3. **Validated:** All data is validated before storage
4. **Documented:** Every field has clear documentation
5. **Tested:** Migrations are tested forward and backward

---

## DELIVERABLES

### 1. RiskObject Schema

**Location:** `/libraries/types/RiskObject.ts` and `/libraries/python_types/RiskObject.py`

**Schema Definition:**

```typescript
// RiskObject.ts
interface RiskObject {
  // Identity
  id: string;                    // UUID
  source: string;                // Connector identifier (e.g., "splunk", "crowdstrike")
  source_event_id: string;       // Original event ID from source
  category: RiskCategory;         // threat | vulnerability | compliance | vendor | operational

  // What's affected
  affected_assets: string[];      // System names, hostnames, IPs
  business_process_map: string[]; // Business process IDs (e.g., "claims-adjudication")

  // Risk assessment
  likelihood_score: number;       // 0.0 - 1.0 (probability of exploitation)
  blast_radius: string[];         // Downstream systems reachable
  financial_exposure: FinancialImpact;
  regulatory_triggers: Regulation[];
  threshold_breaches: Threshold[];

  // Resolution
  remediation_owner: string;      // Team or person responsible
  status: RiskStatus;             // active | remediated | accepted | escalated

  // Metadata
  created_at: string;             // ISO 8601 timestamp
  updated_at: string;             // ISO 8601 timestamp
  first_detected_at: string;      // ISO 8601 timestamp
  confidence: number;             // 0.0 - 1.0 (confidence in assessment)

  // Audit trail
  methodology_trail: MethodologyTrail;
  normalization_notes: string;    // How this was normalized from source
}

enum RiskCategory {
  THREAT = "threat",
  VULNERABILITY = "vulnerability",
  COMPLIANCE = "compliance",
  VENDOR = "vendor",
  OPERATIONAL = "operational"
}

enum RiskStatus {
  ACTIVE = "active",
  REMEDIATED = "remediated",
  ACCEPTED = "accepted",
  ESCALATED = "escalated"
}
```

**Python Equivalent:**
```python
# RiskObject.py
from dataclasses import dataclass
from datetime import datetime
from typing import List, Literal
from enum import Enum

class RiskCategory(str, Enum):
    THREAT = "threat"
    VULNERABILITY = "vulnerability"
    COMPLIANCE = "compliance"
    VENDOR = "vendor"
    OPERATIONAL = "operational"

class RiskStatus(str, Enum):
    ACTIVE = "active"
    REMEDIATED = "remediated"
    ACCEPTED = "accepted"
    ESCALATED = "escalated"

@dataclass
class RiskObject:
    id: str
    source: str
    source_event_id: str
    category: RiskCategory
    affected_assets: List[str]
    business_process_map: List[str]
    likelihood_score: float  # 0.0 - 1.0
    blast_radius: List[str]
    financial_exposure: 'FinancialImpact'
    regulatory_triggers: List['Regulation']
    threshold_breaches: List['Threshold']
    remediation_owner: str
    status: RiskStatus
    created_at: str  # ISO 8601
    updated_at: str  # ISO 8601
    first_detected_at: str  # ISO 8601
    confidence: float  # 0.0 - 1.0
    methodology_trail: 'MethodologyTrail'
    normalization_notes: str
```

### 2. FinancialImpact Schema

**Location:** `/libraries/types/FinancialImpact.ts` and `/libraries/python_types/FinancialImpact.py`

**Schema Definition:**

```typescript
interface FinancialImpact {
  // MLR Impact
  mlr_impact: number;              // Estimated effect on MLR ratio (percentage points)
  mlr_impact_confidence: number;    // 0.0 - 1.0

  // Stop-Loss Exposure
  stop_loss_exposure: number;       // Dollar amount against stop-loss position
  stop_loss_attachment: number;     // Current attachment point
  stop_loss_aggregate: number;      // Aggregate limit
  stop_loss_remaining: number;      // How much stop-loss remains

  // Reserve at Risk
  reserve_at_risk: number;          // Dollar amount of reserves implicated
  reserve_type: ReserveType;        // medical_loss | case_reserve | ibnr

  // Premium Revenue Risk
  premium_revenue_risk: number;     // Potential premium revenue at risk
  line_of_business: string;         // Commercial, Medicare, Medicaid, etc.

  // Total Exposure
  total_exposure: number;           // Sum dollar exposure (mlr + stop_loss + reserve + premium)
  total_exposure_confidence: number; // 0.0 - 1.0

  // Methodology
  methodology: string;              // How this was calculated
  methodology_version: string;      // Version of calculation engine
  calculation_timestamp: string;    // ISO 8601

  // Source Data
  sources: FinancialSource[];       // What data was used
  assumptions: string[];            // Key assumptions made
}

enum ReserveType {
  MEDICAL_LOSS = "medical_loss",
  CASE_RESERVE = "case_reserve",
  IBNR = "ibnr"  // Incurred But Not Reported
}

interface FinancialSource {
  source: string;                  // "actuarial_export", "claims_data", etc.
  timestamp: string;                // ISO 8601
  data_quality_score: number;       // 0.0 - 1.0
}
```

### 3. Business Process Graph Schema

**Location:** `/libraries/types/BusinessProcessGraph.ts` and `/libraries/python_types/BusinessProcessGraph.py`

**Schema Definition:**

```typescript
// Business Process Graph - maps systems to payer operations
interface BusinessProcessGraph {
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  metadata: GraphMetadata;
}

interface ProcessNode {
  id: string;                      // Unique process ID
  type: NodeType;                  // SYSTEM | PROCESS | OPERATION
  name: string;                    // Display name

  // System-specific
  system_type?: SystemType;        // If type === SYSTEM
  hostname?: string;               // If type === SYSTEM
  ip_address?: string;             // If type === SYSTEM

  // Process-specific
  process_type?: ProcessType;      // If type === PROCESS

  // Operation-specific
  operation_type?: OperationType;  // If type === OPERATION

  // Financial
  downtime_cost_per_day: number;   // Dollar amount
  downtime_cost_source: string;    // Benchmark source
  downtime_cost_confidence: number; // 0.0 - 1.0

  // Metadata
  dependencies: string[];          // IDs of dependent nodes
  dependents: string[];            // IDs of nodes that depend on this
  tier: Tier;                      // Crown jewel tier

  // Audit
  created_at: string;
  updated_at: string;
  source: string;                  // Where this came from
}

interface ProcessEdge {
  id: string;                      // Unique edge ID
  from: string;                    // Source node ID
  to: string;                      // Target node ID
  edge_type: EdgeType;             // DEPENDENCY | DATA_FLOW | CONTROL

  // Characteristics
  criticality: number;            // 0.0 - 1.0 (how critical this edge is)
  blast_radius_impact: number;     // 0.0 - 1.0 (if this edge fails)

  // Metadata
  created_at: string;
  updated_at: string;
}

enum NodeType {
  SYSTEM = "system",               // Server, application, database
  PROCESS = "process",             // Claims adjudication, enrollment
  OPERATION = "operation"          // Submit claim, check eligibility
}

enum SystemType {
  CLAIMS_SYSTEM = "claims_system",
  ENROLLMENT_PLATFORM = "enrollment_platform",
  EDI_GATEWAY = "edi_gateway",
  PROVIDER_PORTAL = "provider_portal",
  MEMBER_PORTAL = "member_portal",
  PBM_INTERFACE = "pbm_interface",
  CLEARINGHOUSE = "clearinghouse",
  ACTUARIAL_SYSTEM = "actuarial_system",
  DATABASE = "database",
  AUTHENTICATION = "authentication"
}

enum ProcessType {
  CLAIMS_ADJUDICATION = "claims_adjudication",
  ENROLLMENT = "enrollment",
  PROVIDER_PAYMENT = "provider_payment",
  PREMIUM_BILLING = "premium_billing",
  PRIOR_AUTH = "prior_authorization",
  CARE_MANAGEMENT = "care_management",
  EDI_837 = "edi_837",
  EDI_835 = "edi_835"
}

enum OperationType {
  SUBMIT_CLAIM = "submit_claim",
  CHECK_ELIGIBILITY = "check_eligibility",
  PROCESS_PAYMENT = "process_payment",
  VERIFY_COVERAGE = "verify_coverage",
  AUTHORIZE_SERVICE = "authorize_service"
}

enum EdgeType {
  DEPENDENCY = "dependency",       // System A depends on System B
  DATA_FLOW = "data_flow",         // Data flows from A to B
  CONTROL = "control"              // A controls B
}

enum Tier {
  CROWN_JEWEL = 1,                 // Most critical
  CRITICAL = 2,
  IMPORTANT = 3,
  STANDARD = 4
}

interface GraphMetadata {
  version: string;                 // Graph version
  last_updated: string;             // ISO 8601
  customer_id: string;              // Which customer this graph is for
  total_nodes: number;
  total_edges: number;
  crown_jewels: string[];          // IDs of crown jewel processes
}
```

### 4. Agent State Schema

**Location:** `/libraries/types/AgentState.ts` and `/libraries/python_types/AgentState.py`

**Schema Definition:**

```typescript
interface AgentState {
  agent_id: string;
  agent_type: AgentType;
  customer_id: string;

  // Current State
  current_risk_objects: string[];  // IDs of active risk objects
  risk_posture: RiskPosture;
  threshold_history: ThresholdHistory[];

  // Financial Context
  financial_context: FinancialContext;

  // Briefing History
  briefing_history: BriefingHistory[];
  last_briefing: Briefing | null;

  // Calibration
  thresholds: AgentThresholds;

  // Metadata
  created_at: string;
  updated_at: string;
}

enum AgentType {
  CFO = "cfo",
  CRO = "cro",
  CLO = "clo",
  CIO = "cio",
  CISO = "ciso",
  BOARD = "board"
}

interface RiskPosture {
  overall_score: number;           // 0.0 - 1.0
  trend: PostureTrend;             // IMPROVING | STABLE | DEGRADING
  critical_risks: string[];        // RiskObject IDs
  high_risks: string[];            // RiskObject IDs
  medium_risks: string[];          // RiskObject IDs
  low_risks: string[];             // RiskObject IDs
}

enum PostureTrend {
  IMPROVING = "improving",
  STABLE = "stable",
  DEGRADING = "degrading"
}

interface FinancialContext {
  mlr_ratio: number;               // Current MLR ratio
  mlr_target: number;              // Target MLR ratio
  stop_loss_position: number;      // Current stop-loss position
  stop_loss_limit: number;         // Stop-loss limit
  reserve_levels: ReserveLevels;
  premium_revenue: PremiumRevenue;

  // Timestamps
  last_updated: string;
  data_freshness: string;          // How fresh the data is
}

interface ReserveLevels {
  medical_loss_reserves: number;
  case_reserves: number;
  ibnr_reserves: number;
  total_reserves: number;
}

interface PremiumRevenue {
  monthly_premium: number;
  annual_premium: number;
  by_lob: PremiumByLOB[];
}

interface PremiumByLOB {
  line_of_business: string;
  monthly_premium: number;
  annual_premium: number;
}

interface AgentThresholds {
  risk_score_threshold: number;    // Alert if risk score exceeds
  financial_exposure_threshold: number;  // Alert if exposure exceeds
  trend_alert_threshold: number;   // Alert if trend degrades beyond this
  custom_thresholds: Record<string, number>;
}

interface ThresholdHistory {
  threshold_id: string;
  triggered_at: string;
  threshold_value: number;
  actual_value: number;
  severity: ThresholdSeverity;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
}

enum ThresholdSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical"
}

interface BriefingHistory {
  briefing_id: string;
  generated_at: string;
  briefing_type: BriefingType;
  risk_object_count: number;
  threshold_breach_count: number;
  summary: string;
}

enum BriefingType {
  SCHEDULED = "scheduled",
  THRESHOLD_BREACH = "threshold_breach",
  ON_DEMAND = "on_demand"
}

interface Briefing {
  id: string;
  agent_type: AgentType;
  briefing_type: BriefingType;
  content: BriefingContent;
  generated_at: string;
  expires_at: string;
}

interface BriefingContent {
  executive_summary: string;
  key_risks: RiskHighlight[];
  financial_exposure: FinancialHighlight;
  regulatory_items: RegulatoryHighlight[];
  recommended_actions: ActionItem[];
  methodology_trail: MethodologyTrail;
}

interface RiskHighlight {
  risk_object_id: string;
  title: string;
  description: string;
  severity: ThresholdSeverity;
  business_impact: string;
}

interface FinancialHighlight {
  total_exposure: number;
  exposure_breakdown: ExposureBreakdown;
  trend: string;
  methodology: string;
}

interface ExposureBreakdown {
  mlr_impact: number;
  stop_loss_exposure: number;
  reserve_at_risk: number;
  premium_revenue_risk: number;
}

interface RegulatoryHighlight {
  regulation_id: string;
  obligation: string;
  deadline: string;
  status: ComplianceStatus;
}

enum ComplianceStatus {
  COMPLIANT = "compliant",
  AT_RISK = "at_risk",
  NON_COMPLIANT = "non_compliant"
}

interface ActionItem {
  id: string;
  priority: number;
  title: string;
  description: string;
  owner: string;
  due_date: string;
  status: ActionStatus;
}

enum ActionStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETE = "complete",
  ACKNOWLEDGED = "acknowledged"
}
```

### 5. Event Bus Schemas

**Location:** `/libraries/schemas/events/` with Avro/JSON Schema definitions

**5.1 Raw Event Schema**

```json
{
  "type": "record",
  "name": "RawEvent",
  "namespace": "cyberrx.events",
  "fields": [
    {
      "name": "event_id",
      "type": "string",
      "doc": "Unique event identifier (UUID)"
    },
    {
      "name": "source",
      "type": "string",
      "doc": "Connector that produced this event (e.g., 'splunk', 'crowdstrike')"
    },
    {
      "name": "source_event_id",
      "type": "string",
      "doc": "Original event ID from source system"
    },
    {
      "name": "event_type",
      "type": "string",
      "doc": "Type of event (e.g., 'security_alert', 'vulnerability', 'claim_event')"
    },
    {
      "name": "timestamp",
      "type": "string",
      "doc": "ISO 8601 timestamp when event occurred"
    },
    {
      "name": "raw_data",
      "type": {
        "type": "map",
        "values": "string"
      },
      "doc": "Raw event data from source system"
    },
    {
      "name": "customer_id",
      "type": "string",
      "doc": "Customer identifier for tenant isolation"
    },
    {
      "name": "metadata",
      "type": {
        "type": "map",
        "values": "string"
      },
      "doc": "Additional metadata"
    }
  ]
}
```

**5.2 RiskObject Event Schema**

```json
{
  "type": "record",
  "name": "RiskObjectEvent",
  "namespace": "cyberrx.events",
  "fields": [
    {
      "name": "event_id",
      "type": "string"
    },
    {
      "name": "risk_object",
      "type": {
        "type": "record",
        "name": "RiskObject",
        "fields": [/* RiskObject fields */]
      }
    },
    {
      "name": "event_type",
      "type": {
        "type": "enum",
        "name": "RiskObjectEventType",
        "symbols": ["CREATED", "UPDATED", "REMEDIATED", "ACCEPTED", "ESCALATED"]
      }
    },
    {
      "name": "timestamp",
      "type": "string"
    },
    {
      "name": "customer_id",
      "type": "string"
    }
  ]
}
```

### 6. Database Migration Scripts

**Location:** `/infrastructure/database/migrations/`

**6.1 Initial Schema Migration**

```sql
-- migrations/001_initial_schema.sql
-- Version: 1.0.0
-- Description: Create initial database schema

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pgvector;

-- RiskObjects table (TimescaleDB hypertable for time-series)
CREATE TABLE risk_objects (
    id UUID PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    source_event_id VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    affected_assets TEXT[] NOT NULL,
    business_process_map TEXT[] NOT NULL,
    likelihood_score DECIMAL(3,2) NOT NULL CHECK (likelihood_score >= 0 AND likelihood_score <= 1),
    blast_radius TEXT[] NOT NULL,
    financial_exposure JSONB NOT NULL,
    regulatory_triggers JSONB NOT NULL,
    threshold_breaches JSONB NOT NULL,
    remediation_owner VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    first_detected_at TIMESTAMPTZ NOT NULL,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    methodology_trail JSONB NOT NULL,
    normalization_notes TEXT,
    customer_id VARCHAR(255) NOT NULL,

    CONSTRAINT valid_category CHECK (category IN ('threat', 'vulnerability', 'compliance', 'vendor', 'operational')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'remediated', 'accepted', 'escalated'))
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('risk_objects', 'created_at', if_not_exists => TRUE);

-- Create indexes
CREATE INDEX idx_risk_objects_customer_id ON risk_objects(customer_id);
CREATE INDEX idx_risk_objects_category ON risk_objects(category);
CREATE INDEX idx_risk_objects_status ON risk_objects(status);
CREATE INDEX idx_risk_objects_business_process_map ON risk_objects USING GIN(business_process_map);
CREATE INDEX idx_risk_objects_created_at ON risk_objects(created_at DESC);

-- Agent state table
CREATE TABLE agent_state (
    agent_id VARCHAR(255) PRIMARY KEY,
    agent_type VARCHAR(50) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    current_risk_objects TEXT[] NOT NULL,
    risk_posture JSONB NOT NULL,
    threshold_history JSONB NOT NULL,
    financial_context JSONB NOT NULL,
    briefing_history JSONB NOT NULL,
    last_briefing JSONB,
    thresholds JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_agent_type CHECK (agent_type IN ('cfo', 'cro', 'clo', 'cio', 'ciso', 'board'))
);

CREATE INDEX idx_agent_state_customer_id ON agent_state(customer_id);
CREATE INDEX idx_agent_state_agent_type ON agent_state(agent_type);

-- Business process graph table
CREATE TABLE business_process_graph (
    customer_id VARCHAR(255) NOT NULL,
    graph_id VARCHAR(255) NOT NULL,
    graph_version VARCHAR(50) NOT NULL,
    nodes JSONB NOT NULL,
    edges JSONB NOT NULL,
    metadata JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (customer_id, graph_id)
);

CREATE INDEX idx_business_process_graph_version ON business_process_graph(graph_version);

-- Event log table (TimescaleDB hypertable)
CREATE TABLE event_log (
    event_id UUID PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    source_event_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    raw_data JSONB NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT create_hypertable('event_log', 'timestamp', if_not_exists => TRUE);

CREATE INDEX idx_event_log_customer_id ON event_log(customer_id);
CREATE INDEX idx_event_log_processed ON event_log(processed);
CREATE INDEX idx_event_log_timestamp ON event_log(timestamp DESC);
```

**6.2 Rollback Migration**

```sql
-- migrations/001_initial_schema_rollback.sql
-- Version: 1.0.0
-- Description: Rollback initial schema

-- Drop tables
DROP TABLE IF EXISTS event_log;
DROP TABLE IF EXISTS business_process_graph;
DROP TABLE IF EXISTS agent_state;
DROP TABLE IF EXISTS risk_objects;

-- Drop extensions (optional - comment out if other tables use them)
-- DROP EXTENSION IF EXISTS pgvector;
-- DROP EXTENSION IF EXISTS timescaledb;
```

### 7. API Contract Documentation

**Location:** `/docs/api/risk-objects.md`, `/docs/api/agent-state.md`, etc.

**Example API Contract:**

```markdown
# Risk Objects API

## Create RiskObject

### Request
POST /api/v1/risk-objects

### Request Body
{
  "source": "splunk",
  "source_event_id": "splunk-event-123",
  "category": "threat",
  "affected_assets": ["server-1", "server-2"],
  "business_process_map": ["claims-adjudication"],
  "likelihood_score": 0.8,
  "blast_radius": ["database-1", "edi-gateway"],
  "financial_exposure": { /* FinancialImpact */ },
  "regulatory_triggers": [ /* Regulations */ ],
  "threshold_breaches": [ /* Thresholds */ ],
  "remediation_owner": "security-team",
  "confidence": 0.9
}

### Response
201 Created
{
  "id": "uuid",
  "created_at": "2025-06-05T12:00:00Z",
  "updated_at": "2025-06-05T12:00:00Z",
  "first_detected_at": "2025-06-05T12:00:00Z",
  "status": "active"
}

## Get RiskObject

### Request
GET /api/v1/risk-objects/{id}

### Response
200 OK
{
  "id": "uuid",
  "source": "splunk",
  "category": "threat",
  /* ... all RiskObject fields ... */
}

## List RiskObjects

### Request
GET /api/v1/risk-objects?customer_id={customer_id}&status={status}&category={category}

### Response
200 OK
{
  "risk_objects": [ /* RiskObject[] */ ],
  "total": 100,
  "page": 1,
  "per_page": 20
}
```

---

## SUCCESS CRITERIA

**You are done when:**

- ✅ All schemas defined with types (TypeScript + Python)
- ✅ Migration scripts tested on local database
- ✅ Event schemas registered in schema registry
- ✅ API documentation generated from types
- ✅ All fields documented with clear descriptions
- ✅ Enums and constraints defined
- ✅ Validation rules specified
- ✅ Migration rollback tested
- ✅ API examples documented
- ✅ Database indexes defined

---

## TECHNICAL CONTEXT

### Database: PostgreSQL 16 + Extensions

**TimescaleDB:**
- Hypertables for time-series data (risk_objects, event_log)
- Automatic partitioning by time
- Optimized queries for time-based analysis

**pgvector:**
- Vector similarity search
- Semantic search over risk objects
- Future: Embedding-based queries

### Schema Design Patterns

**1. Strong Typing:**
- TypeScript for frontend/backend
- Python type hints for backend
- Database constraints for data integrity

**2. JSONB for Flexible Data:**
- `financial_exposure` as JSONB (flexible structure)
- `regulatory_triggers` as JSONB (variable number)
- `risk_posture` as JSONB (complex nested data)

**3. Arrays for Relationships:**
- `affected_assets` as TEXT[] (array of strings)
- `business_process_map` as TEXT[] (array of process IDs)
- `current_risk_objects` as TEXT[] (array of risk object IDs)

**4. UUID for IDs:**
- All entities use UUID (not auto-increment)
- Prevents ID guessing
- Distributed ID generation safe

### Dependencies

**Blocked by:**
- T-FOUND-001: Repository structure
- T-FOUND-002: Infrastructure (database must exist)

**Blocks:**
- T-MVP-005: Risk Normalization Engine (needs RiskObject schema)
- T-MVP-006: Financial Engine (needs FinancialImpact schema)
- T-MVP-007: Agent Runtime (needs AgentState schema)

---

## VALIDATION REQUIREMENTS

### Acceptance Validator

**Deliverables:**
- ✅ All 6 schemas defined (RiskObject, FinancialImpact, BusinessProcessGraph, AgentState, Regulation, Threshold)
- ✅ TypeScript types created
- ✅ Python types created
- ✅ Migration scripts created
- ✅ Event schemas created
- ✅ API documentation created

**Success Criteria:**
- ✅ All schemas have complete type definitions
- ✅ Migration scripts run successfully
- ✅ Migration rollback scripts work
- ✅ API documentation is comprehensive
- ✅ All fields are documented

### Security Validator

**Data Privacy:**
- ✅ No PHI/PII fields in schemas (unless marked for stripping)
- ✅ Customer_id in all tables (for tenant isolation)
- ✅ No cross-customer joins possible
- ✅ Database access controls documented

**Data Integrity:**
- ✅ Constraints defined (CHECK, NOT NULL, etc.)
- ✅ Enum values constrained
- ✅ Foreign key relationships (if any)
- ✅ Indexes for performance and query correctness

### No-Regression Validator

**If Existing Database:**
- ✅ Migration is additive (no breaking changes)
- ✅ Data migration path exists
- ✅ Rollback is safe
- ✅ Existing queries still work

**If Greenfield:**
- ✅ Schema is forward-compatible
- ✅ Migration can be rerun
- ✅ Schema versioning is clear

### Integration Validator

**Database Integration:**
- ✅ Migration scripts run on actual database
- ✅ TimescaleDB extensions enabled
- ✅ pgvector extensions enabled
- ✅ Indexes created successfully
- ✅ Constraints enforced

**Type System Integration:**
- ✅ TypeScript types compile without errors
- ✅ Python types pass mypy validation
- ✅ Types match database schema
- ✅ Event schemas validate correctly

---

## OUTPUT REQUIREMENTS

### Code Outputs

**Type Definitions:**
```
/libraries/types/
  RiskObject.ts
  FinancialImpact.ts
  BusinessProcessGraph.ts
  AgentState.ts
  Regulation.ts
  Threshold.ts
  index.ts                    # Exports all types

/libraries/python_types/
  RiskObject.py
  FinancialImpact.py
  BusinessProcessGraph.py
  AgentState.py
  Regulation.py
  Threshold.py
  __init__.py                 # Exports all types
```

**Schemas:**
```
/libraries/schemas/events/
  raw-event.avsc
  risk-object-event.avsc
  financial-update-event.avsc
  agent-state-event.avsc
```

**Migrations:**
```
/infrastructure/database/migrations/
  001_initial_schema.sql
  001_initial_schema_rollback.sql
  002_add_indexes.sql
  002_add_indexes_rollback.sql
```

**Documentation:**
```
/docs/api/
  risk-objects.md
  financial-impact.md
  agent-state.md
  business-process-graph.md

/docs/data-model/
  risk-object-model.md
  financial-impact-model.md
  agent-state-model.md
  business-process-graph-model.md
```

### Artifact Output

**Location:** `/workspace/artifacts/T-FOUND-003.out`

**Contents:**
- List of all schemas created
- Migration test results
- API documentation links
- Deviations from specification
- Recommendations for T-MVP-005 (Normalization) and T-MVP-006 (Financial)
- Database schema diagram (if created)

---

## EXECUTION INSTRUCTIONS

### Phase 1: Core Schemas (Days 1-2)

1. **Create RiskObject schema:**
   - TypeScript interface
   - Python dataclass
   - Document all fields
   - Add enums

2. **Create FinancialImpact schema:**
   - TypeScript interface
   - Python dataclass
   - Document calculation fields

3. **Create supporting schemas:**
   - Regulation
   - Threshold
   - MethodologyTrail

### Phase 2: Business Process Graph & Agent State (Days 3-4)

1. **Create BusinessProcessGraph schema:**
   - Nodes and edges
   - All enums (NodeType, ProcessType, etc.)
   - Metadata structure

2. **Create AgentState schema:**
   - Complex nested structures
   - All agent-specific types
   - Briefing structures

### Phase 3: Database Migrations (Days 5-6)

1. **Create migration scripts:**
   - Initial schema
   - TimescaleDB setup
   - pgvector setup
   - Indexes
   - Constraints

2. **Create rollback scripts:**
   - Safe rollback
   - Test rollback

3. **Test migrations:**
   - Run on local database
   - Verify TimescaleDB
   - Verify pgvector
   - Test rollback

### Phase 4: Event Schemas & API Docs (Days 7-8)

1. **Create event schemas:**
   - Avro definitions
   - JSON Schema definitions
   - Validate schemas

2. **Create API documentation:**
   - All CRUD operations
   - Request/response examples
   - Error codes

3. **Create artifact:**
   - Write `/workspace/artifacts/T-FOUND-003.out`
   - Document all results

---

## TIMING

**Estimated:** 60 hours (1.5 weeks)

**Suggested Breakdown:**
- **Days 1-2:** RiskObject, FinancialImpact, supporting schemas
- **Days 3-4:** BusinessProcessGraph, AgentState
- **Days 5-6:** Database migrations, testing
- **Days 7-8:** Event schemas, API docs, artifact

**Deadline:** End of Week 2 (unblocks T-MVP-005, T-MVP-006)

---

## CRITICAL SUCCESS FACTORS

### Most Important Requirements

1. **RiskObject is the Core Data Structure**
   - Get this right, everything else becomes easier
   - Think about how it flows through the entire system
   - Ensure it's extensible

2. **Financial Impact Must Be Defensible**
   - Every dollar figure must have a methodology trail
   - CFO must be able to defend numbers in board meeting
   - No LLM in calculation path

3. **Business Process Graph is Customer-Specific**
   - Each customer has different systems and processes
   - Graph must be flexible
   - Must support Crown Jewel tiering

4. **Agent State Must Be Persistent**
   - Agents maintain state across briefings
   - History matters for trend analysis
   - State is tenant-isolated

### Common Pitfalls to Avoid

- ❌ Don't skip documentation (every field needs explanation)
- ❌ Don't forget enum constraints (enforce in database)
- ❌ Don't make schemas too rigid (leave room for extension)
- ❌ Don't ignore indexes (performance matters)
- ❌ Don't forget rollback (must be safe)
- ❌ Don't mix tenant data (customer_id everywhere)

### Questions to Ask Yourself

1. Can a CFO defend the financial numbers in a board meeting?
2. Is the RiskObject schema flexible enough for all data sources?
3. Does the business process graph support Crown Jewel tiering?
4. Can agent state be queried efficiently?
5. Are all migrations reversible?

---

## TESTING STRATEGY

### Unit Tests

**Type Validation:**
- TypeScript compiles without errors
- Python passes mypy validation
- All enums are constrained

**Schema Validation:**
- Event schemas validate against Avro/JSON Schema
- API examples validate against types
- Database constraints enforced

### Integration Tests

**Database Migration:**
- Run migration on local database
- Insert test data
- Verify constraints
- Test rollback
- Re-run migration

**Type System:**
- Create sample RiskObjects
- Serialize to JSON
- Deserialize from JSON
- Verify type safety

**API Examples:**
- Test API endpoints with examples
- Verify request/response schemas
- Test error cases

---

## NEXT STEPS AFTER COMPLETION

**Unblocks:**
- T-MVP-005: Risk Normalization Engine (needs RiskObject schema)
- T-MVP-006: Financial Modeling Engine (needs FinancialImpact schema)
- T-MVP-007: Agent Runtime (needs AgentState schema)

**Recommendations for T-MVP-005 (Normalization):**
- RiskObject validation logic
- Business process mapping approach
- Blast radius calculation algorithm
- Regulatory trigger mapping

**Recommendations for T-MVP-006 (Financial):**
- FinancialImpact calculation approach
- MLR impact calculation logic
- Stop-loss exposure calculation
- Methodology trail generation

**Recommendations for Database:**
- Connection pooling configuration
- Query optimization patterns
- Index maintenance procedures
- Backup strategies

---

**Ready to begin. Start with RiskObject, get it right, then build everything around it.**

**Good luck! 🚀**
