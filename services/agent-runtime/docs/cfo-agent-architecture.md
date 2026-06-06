# CFO Agent Architecture

Technical architecture and data flow documentation for the CFO Agent.

**Version:** 1.0.0
**Last Updated:** 2025-06-06
**Author:** AI/ML Engineer (T-MVP-008)

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Component Architecture](#component-architecture)
3. [Data Flow](#data-flow)
4. [Integration Points](#integration-points)
5. [Security Architecture](#security-architecture)
6. [Performance Considerations](#performance-considerations)
7. [Deployment Architecture](#deployment-architecture)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend Layer                       │
│  React Dashboard / Mobile App / API Client                  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                       API Gateway Layer                      │
│  JWT Authentication / Rate Limiting / Request Routing       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     CFO Agent API Layer                      │
│  FastAPI Endpoints (/api/cfo/agent/query, /exposure, /trends)│
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   CFO Agent Orchestration                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  CFOAgent (cfo_agent.py)                              │  │
│  │  - Briefing orchestration                             │  │
│  │  - Component coordination                             │  │
│  │  - Error handling                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌───────────┐ ┌──────────────┐ ┌──────────────────────┐   │
│  │ Context   │ │  Exposure    │ │      Trend           │   │
│  │ Manager   │ │  Analyzer    │ │      Analyzer        │   │
│  └───────────┘ └──────────────┘ └──────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Summary Formatter (board-ready output)              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Agent Runtime Foundation                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │
│  │ Claude       │ │  Prompt      │ │    State         │   │
│  │ Client       │ │  Manager     │ │    Manager       │   │
│  └──────────────┘ └──────────────┘ └──────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PHI Validator (HIPAA security boundary)             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
┌──────────────────────┐   ┌──────────────────────┐
│  Claude Sonnet API   │   │  PostgreSQL (TimescaleDB)  │
│  (Anthropic)         │   │  - financial_impacts  │
└──────────────────────┘   │  - agent_briefings    │
                            │  - agent_metrics     │
                            └──────────────────────┘
```

---

## Component Architecture

### 1. CFO Context Manager (`cfo_context_manager.py`)

**Purpose:** Load and enrich financial impact data

**Responsibilities:**
- Load financial impacts from `financial_impacts` table
- Load risk objects from `risks` table
- Calculate CFO-specific enrichments:
  - MLR impact
  - Stop-loss exposure
  - Reserve-at-risk
  - Premium revenue risk
  - Time horizon estimation
- Validate NO PHI before returning context

**Key Methods:**
```python
load_financial_context(organization_id, time_range, risk_categories)
load_risk_context(organization_id, time_range, likelihood_min)
build_cfo_context(organization_id, query, time_range)
```

**Data Sources:**
- T-MVP-006: Financial impacts
- T-MVP-005: Enriched risk objects

**Output:** Enriched context with 50 financial impacts + 50 risk objects

---

### 2. CFO Exposure Analyzer (`cfo_exposure_analyzer.py`)

**Purpose:** Analyze dollar exposure with methodology trails

**Responsibilities:**
- Calculate total exposure by business process
- Break down exposure by cost category
- Calculate MLR impact aggregation
- Identify top risks by exposure
- Generate methodology trails

**Key Methods:**
```python
analyze_exposure(financial_impacts)
analyze_scenario(financial_impacts, scenario_type, scenario_multiplier)
compare_exposure(current_impacts, previous_impacts)
```

**Output:** Structured exposure analysis with methodology

**Calculations:**
- Total Exposure = Σ(net_exposure)
- MLR Impact = (Net Exposure / $1M) × 1%
- Stop-Loss = Business Interruption × 30%
- Reserve-at-Risk = (Fraud + Legal) × 50%
- Premium Revenue Risk = Reputational Loss × 20%

---

### 3. CFO Trend Analyzer (`cfo_trend_analyzer.py`)

**Purpose:** Track exposure changes over time

**Responsibilities:**
- Calculate period trends (immediate, 30-day, 90-day)
- Identify emerging risks (increasing exposure)
- Calculate trend velocity (rate of change)
- Detect anomalous spikes
- Generate trend insights

**Key Methods:**
```python
analyze_trends(financial_impacts, historical_impacts)
forecast_exposure(financial_impacts, forecast_days)
```

**Output:** Trend analysis with insights and anomalies

**Trend Classification:**
- **Emerging Risk:** Likelihood ≥60%, Exposure ≥$100K, Time Horizon ≤30 days
- **Anomaly:** Exposure >$1M AND Likelihood >80% OR Exposure >3x median
- **Velocity Score:** (High-Velocity % × 70) + (Medium-Velocity % × 30)

---

### 4. CFO Summary Formatter (`cfo_summary_formatter.py`)

**Purpose:** Format briefings for board presentation

**Responsibilities:**
- Format briefings as JSON, Markdown, or Summary
- Generate executive summaries
- Create visual breakdowns (tables, charts)
- Highlight key metrics
- Validate briefing completeness

**Key Methods:**
```python
format_for_frontend(briefing, format_type)
validate_briefing(briefing)
```

**Output Formats:**
- **JSON:** Structured data for dashboards
- **Markdown:** Report-ready text for PDF
- **Summary:** Condensed 2-3 sentence summary

---

### 5. CFO Agent (`cfo_agent.py`)

**Purpose:** Orchestrate all components for briefing generation

**Responsibilities:**
- Coordinate context loading
- Trigger exposure analysis
- Trigger trend analysis
- Call Claude Sonnet with prompt
- Parse structured output
- Store briefing in database
- Return formatted briefing

**Key Methods:**
```python
generate_briefing(organization_id, query, time_range, include_trends, format_type)
get_exposure_breakdown(organization_id, time_range)
get_trends(organization_id, time_range)
get_recent_briefings(organization_id, limit)
get_metrics(organization_id, metric_date)
```

**Workflow:**
1. Build context (Context Manager)
2. Analyze exposure (Exposure Analyzer)
3. Analyze trends (Trend Analyzer) [optional]
4. Load and render prompt template
5. Call Claude Sonnet API
6. Parse structured output
7. Format for frontend
8. Validate completeness
9. Store in database
10. Return briefing

---

### 6. CFO Agent API (`cfo_api.py`)

**Purpose:** FastAPI endpoints for external access

**Endpoints:**
- `POST /api/cfo/agent/query` - Generate briefing (PRIMARY)
- `GET /api/cfo/agent/state` - Get agent state
- `GET /api/cfo/agent/briefings` - Get recent briefings
- `GET /api/cfo/agent/metrics` - Get usage metrics
- `GET /api/cfo/exposure` - Get exposure breakdown (fast)
- `GET /api/cfo/trends` - Get trends (fast)
- `GET /api/cfo/health` - Health check

**Authentication:**
- JWT token required (except `/health`)
- Token validation against auth service (T-FOUND-004)

**Response Validation:**
- NO PHI validation before returning
- Structured JSON responses
- Error handling with status codes

---

## Data Flow

### Briefing Generation Flow

```
User Request
    │
    ▼
[API Layer] Receives POST /api/cfo/agent/query
    │
    ├─→ Validate JWT Token
    ├─→ Parse Request (query, time_range, format_type)
    │
    ▼
[CFOAgent.generate_briefing()]
    │
    ├─→ [Context Manager] build_cfo_context()
    │       ├─→ Load financial impacts from DB
    │       ├─→ Load risk objects from DB
    │       ├─→ Enrich with CFO metrics (MLR, stop-loss, etc.)
    │       └─→ Validate NO PHI → context
    │
    ├─→ [Exposure Analyzer] analyze_exposure()
    │       ├─→ Calculate total exposure
    │       ├─→ Break down by business process
    │       ├─→ Break down by risk category
    │       ├─→ Calculate MLR impact aggregation
    │       └─→ Generate methodology trail → exposure_analysis
    │
    ├─→ [Trend Analyzer] analyze_trends() [if include_trends]
    │       ├─→ Calculate period trends
    │       ├─→ Identify emerging risks
    │       ├─→ Detect anomalies
    │       └─→ Generate insights → trend_analysis
    │
    ├─→ [Prompt Manager] load_template("cfo", "briefing.txt")
    │       └─→ Render with Jinja2 → rendered_prompt
    │
    ├─→ [Claude Client] call_claude_with_structured_output()
    │       ├─→ Call Claude Sonnet API
    │       ├─→ Parse structured JSON response
    │       └─→ Track tokens/cost → claude_response
    │
    ├─→ [Output Formatter] parse_structured_output()
    │       └─→ Validate JSON schema → briefing
    │
    ├─→ [Summary Formatter] format_for_frontend(briefing, format_type)
    │       └─→ Format JSON/Markdown/Summary → formatted_briefing
    │
    ├─→ [Summary Formatter] validate_briefing(formatted_briefing)
    │       └─→ Check completeness → validation
    │
    ├─→ [State Manager] store_cfo_briefing()
    │       └─→ Store in DB → briefing_id
    │
    └─→ Return formatted_briefing to API layer
            │
            ▼
[API Layer] Return JSON response
    │
    ▼
User Receives Board-Ready Briefing
```

### Fast Endpoint Flow (Exposure/Trends)

```
User Request (GET /api/cfo/exposure or /trends)
    │
    ▼
[API Layer] Receives request
    │
    ├─→ Validate JWT Token
    │
    ▼
[CFOAgent.get_exposure_breakdown() or get_trends()]
    │
    ├─→ [Context Manager] load_financial_context()
    │       └─→ Load from DB → financial_impacts
    │
    ├─→ [Exposure/Trend Analyzer] analyze()
    │       └─→ Generate analysis → analysis_result
    │
    └─→ Return analysis_result (no LLM call)
            │
            ▼
[API Layer] Return JSON response
```

**Key Difference:** Fast endpoints skip LLM call for better performance.

---

## Integration Points

### 1. T-MVP-006 Integration (Financial Modeling)

**Purpose:** Load financial impact data

**Integration:**
- **Table:** `financial_impacts`
- **Fields:**
  - `net_exposure`: Primary exposure metric
  - `total_gross`: Gross exposure before insurance
  - `insurance_coverage`: Insurance reimbursement
  - `breach_response_cost`, `regulatory_fine`, `business_interruption`, etc.
- **Enrichment:** CFO Context Manager adds MLR, stop-loss, reserve-at-risk

**Data Flow:**
```
T-MVP-006 → PostgreSQL:financial_impacts → Context Manager → CFO Agent
```

---

### 2. T-MVP-005 Integration (Risk Normalization)

**Purpose:** Load enriched risk objects

**Integration:**
- **Table:** `risks`
- **Fields:**
  - `risk_id`, `title`, `description`
  - `risk_category`, `likelihood`, `financial_exposure`
  - `business_process`, `affected_systems`, `blast_radius`
  - `mitigation_status`

**Data Flow:**
```
T-MVP-005 → PostgreSQL:risks → Context Manager → CFO Agent
```

---

### 3. T-FOUND-004 Integration (Authentication)

**Purpose:** JWT token validation

**Integration:**
- **Service:** Auth service from T-FOUND-004
- **Token Format:** JWT with `Authorization: Bearer <token>` header
- **Validation:** API layer validates token before processing request

**Data Flow:**
```
Client → API Layer → Auth Service (T-FOUND-004) → Token Valid/Invalid
```

---

### 4. T-MVP-007 Integration (Agent Runtime)

**Purpose:** Use agent runtime foundation

**Integration:**
- **Components:**
  - `ClaudeClient`: LLM API calls
  - `PromptManager`: Template loading/rendering
  - `StateManager`: Briefing storage/metrics
  - `PHIValidator`: Security validation
- **Prompt Template:** `/prompts/cfo/briefing.txt`

**Data Flow:**
```
CFO Agent → Agent Runtime (T-MVP-007) → Claude Sonnet API
```

---

### 5. Database Integration (TimescaleDB)

**Purpose:** Persist briefings and metrics

**Tables Used:**
- `financial_impacts`: Source data (from T-MVP-006)
- `risks`: Source data (from T-MVP-005)
- `agent_briefings`: Store generated briefings
- `agent_metrics`: Track usage/costs
- `agent_states`: Agent state persistence

**Data Flow:**
```
CFO Agent → TimescaleDB → Query/Store
```

---

## Security Architecture

### PHI Validation Boundary

**CRITICAL:** NO PHI reaches Claude Sonnet

**Validation Layers:**

1. **Context Manager:** Validates NO PHI after loading data
2. **API Layer:** Validates NO PHI before returning response
3. **Fail-Safe:** If PHI detected, abort immediately

**PHI Patterns Detected:**
- Member IDs: `MEM-\d+`, `MBR-\d+`, `\d{9}-\d{2}`
- Patient Names: `Patient \w+`, `Mr\. \w+`, `Ms\. \w+`
- MRNs: `MRN\d+`, `Medical Record \d+`
- DOBs: `\d{2}-\d{2}-\d{4}`, `\d{2}/\d{2}/\d{4}`
- SSNs: `\d{3}-\d{2}-\d{4}`, `\d{9}`
- Claims IDs: `CLM-\d+`, `Claim \d+`
- ICD-10: `[A-Z]\d{2}(\.\d{1,2})?`
- CPT: `\d{5}`
- Provider Names: `Dr\. \w+`, `Hospital`, `Clinic`, `Health Center`

**What CAN reach Claude:**
- Business process names (e.g., "Claims Adjudication")
- System names (e.g., "claims-system-1")
- Risk categories (e.g., "ransomware")
- Dollar amounts (e.g., "$1.2M exposure")
- Regulatory triggers (e.g., "HIPAA breach notification required")

**Security Flow:**
```
Context Manager → validate_no_phi()
    │
    ├─→ If PHI detected → Raise ValueError → Abort
    │
    └─→ If NO PHI → Continue to LLM
```

---

### JWT Authentication

**Token Validation:**

```
Client Request
    │
    ▼
[API Layer] Extract Bearer token
    │
    ├─→ If missing → Return 401 Unauthorized
    │
    ▼
[Auth Service (T-FOUND-004)] Validate token
    │
    ├─→ If invalid → Return 401 Unauthorized
    │
    └─→ If valid → Continue processing
```

---

### Database Security

**Access Control:**
- Database user has least-privilege access
- Only can read from `financial_impacts`, `risks`
- Only can write to `agent_briefings`, `agent_metrics`
- NO access to PHI tables (members, claims, etc.)

**Connection Security:**
- SSL/TLS required
- Connection pooling
- Prepared statements (SQL injection protection)

---

## Performance Considerations

### Performance Targets

- **Briefing Generation:** < 30 seconds (p95)
- **Exposure Breakdown:** < 5 seconds
- **Trends Analysis:** < 5 seconds
- **API Response Time:** < 100ms (p95) for fast endpoints

### Optimization Strategies

1. **Database Query Optimization:**
   - Indexes on `organization_id`, `created_at`
   - Limit to top 50 impacts/risks (not entire dataset)
   - Use materialized views for aggregations

2. **Caching:**
   - Cache rendered prompts (1 hour)
   - Cache exposure breakdown (5 minutes)
   - Cache trends (15 minutes)
   - Cache briefings by query hash (1 hour)

3. **LLM Call Optimization:**
   - Use structured output (faster than free-form)
   - Limit context to top 50 impacts/risks
   - Enable prompt caching (20-30% token savings)

4. **Async Processing:**
   - All database calls async
   - Parallel context loading (financial + risk)
   - Background briefing generation (for large queries)

### Scalability

**Horizontal Scaling:**
- Stateless API layer (can scale horizontally)
- Multiple agent instances (load balanced)
- Database connection pooling

**Vertical Scaling:**
- CPU: Claude API calls are CPU-bound
- Memory: Context loading requires memory
- Network: Database + Claude API bandwidth

**Resource Limits:**
- Max concurrent briefings: 10 per instance
- Max database connections: 20 per instance
- Max Claude API calls: 100 per minute

---

## Deployment Architecture

### Development Environment

```
┌─────────────────────────────────────────┐
│         Developer Laptop                 │
│  ┌───────────────────────────────────┐  │
│  │  CFO Agent (Local Python)         │  │
│  │  - PostgreSQL (Docker)            │  │
│  │  - Mock Claude Client             │  │
│  │  - Test Data                      │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Staging Environment

```
┌─────────────────────────────────────────┐
│         AWS / GCP Cloud                 │
│  ┌───────────────────────────────────┐  │
│  │  Load Balancer                    │  │
│  └───────────────────────────────────┘  │
│           │                              │
│  ┌────────┴────────┐                    │
│  │  Agent Instance 1 │                   │
│  │  Agent Instance 2 │                   │
│  └────────────────────┘                  │
│           │                              │
│  ┌────────▼──────────────────────────┐  │
│  │  PostgreSQL (RDS)                  │  │
│  │  - Staging Database               │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Production Environment

```
┌──────────────────────────────────────────────────────────┐
│                    Production Cloud                       │
│  ┌────────────────────────────────────────────────────┐  │
│  │  CDN / API Gateway                                  │  │
│  │  - JWT Authentication                              │  │
│  │  - Rate Limiting                                    │  │
│  │  - Request Routing                                  │  │
│  └────────────────────────────────────────────────────┘  │
│                         │                                 │
│  ┌─────────────────────┴──────────────────────────┐      │
│  │  Agent Runtime Service (Auto-scaling)           │      │
│  │  ┌───────────────┐ ┌───────────────┐           │      │
│  │  │ Agent Pod 1   │ │ Agent Pod 2   │  (N pods)  │      │
│  │  │               │ │               │           │      │
│  │  │ - CFO Agent   │ │ - CFO Agent   │           │      │
│  │  │ - CISO Agent  │ │ - CISO Agent  │           │      │
│  │  │ - Board Agent │ │ - Board Agent │           │      │
│  │  └───────────────┘ └───────────────┘           │      │
│  └─────────────────────────────────────────────────┘      │
│                         │                                 │
│  ┌─────────────────────┴──────────────────────────┐      │
│  │  Database Cluster (Primary + Replicas)          │      │
│  │  ┌──────────────────┐  ┌──────────────────┐    │      │
│  │  │ Primary (Write)  │  │ Replica (Read)   │    │      │
│  │  │ - TimescaleDB    │  │ - TimescaleDB    │    │      │
│  │  └──────────────────┘  └──────────────────┘    │      │
│  └─────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────┘
```

**Deployment Checklist:**

- [ ] Environment variables configured (Claude API key, DB URL)
- [ ] Database migrations applied
- [ ] SSL/TLS certificates installed
- [ ] Load balancer configured
- [ ] Health check endpoints configured
- [ ] Logging/metrics configured
- [ ] JWT authentication integrated
- [ ] PHI validation tested
- [ ] Performance benchmarks met
- [ ] Monitoring/alerting configured

---

## Support

For architecture questions:

- **Documentation:** See `cfo-agent-api.md` and `cfo-agent-usage.md`
- **GitHub Issues:** https://github.com/cyberrx/cyberrx/issues
- **Email:** support@cyberrx.com

---

**Document Version:** 1.0.0
**Last Updated:** 2025-06-06
**Author:** AI/ML Engineer (T-MVP-008)
