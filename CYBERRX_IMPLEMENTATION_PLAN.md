# CyberRX Implementation Plan
## Multi-Agent AI Platform for Health Plans

**Document Version:** 1.1 (Updated with Resolved Architecture Decisions)
**Based on:** CyberRX Architecture Document v0.1
**Target:** Production-ready enterprise deployment
**Status:** ✅ All 5 Open Questions Resolved - Ready for Engineering

---

## Executive Summary

CyberRX is a multi-agent AI platform that deploys inside a health plan's cloud tenant, reads existing security/operational data sources continuously, and produces role-specific intelligence briefings for C-suite leaders (CFO, CRO, CLO, CIO, CISO, Board).

**Core Architectural Principles:**
- **Read-only** - No writes to customer systems
- **Tenant-isolated** - Fully isolated deployments per customer
- **Source-native** - Agents read primary data sources directly
- **Continuous** - Persistent state, near-real-time reactions
- **Role-scoped** - Every output mapped to executive context

---

## Phase 0: Foundation & Architecture Setup (Weeks 1-2)

### Objective
Establish the core infrastructure, development environment, and architectural patterns that all subsequent phases depend on.

### Tasks

#### T-FOUND-001: Repository Structure & Development Environment
**Owner:** Senior Backend Engineer
**Description:**
- Initialize monorepo structure with clear separation of concerns
- Set up development Docker containers for each service type
- Configure CI/CD pipeline foundations
- Establish code review patterns and branching strategy

**Deliverables:**
- Repository structure:
  ```
  /cyberrx
    /infrastructure        # Terraform/Kubernetes configs
    /services              # Backend microservices
      /ingestion          # Connector services
      /normalization      # Risk normalization engine
      /financial          # Financial modeling service
      /agents             # Agent runtime
    /frontend             # React dashboard
    /libraries            # Shared code (types, utilities)
    /docs                 # Architecture & API docs
  ```
- Docker compose for local development
- GitHub Actions workflow templates
- Contributing guidelines

**Success Criteria:**
- Developer can run entire stack locally with one command
- CI/CD runs on every PR
- Clear contribution documentation

---

#### T-FOUND-002: Cloud Infrastructure Foundation
**Owner:** Senior Backend Engineer + Security Engineer
**Description:**
- Design and implement tenant isolation architecture
- Set up Kubernetes cluster with namespace isolation
- Configure Azure Event Hubs / Kafka for event streaming
- Set up TimescaleDB for time-series data storage
- Configure pgvector for semantic search
- Implement customer-managed encryption keys (BYOK)

**Deliverables:**
- Terraform modules for:
  - AKS/EKS cluster with network policies
  - Event Hubs/Kafka deployment
  - TimescaleDB with pgvector extension
  - Key Vault integration for BYOK
- Network isolation documentation
- Tenant provisioning runbooks

**Success Criteria:**
- New tenant can be provisioned via automated script
- Tenant data cannot leak between namespaces
- All data encrypted with customer-managed keys
- Event streaming handles 10,000 events/second minimum

---

#### T-FOUND-003: Core Data Models & Schema Design
**Owner:** Senior Backend Engineer
**Description:**
- Define RiskObject schema and all subtypes
- Design FinancialImpact calculation model
- Create business process graph data structure
- Design agent state persistence schema
- Define event bus message schemas

**Deliverables:**
- Type definitions (TypeScript/Python):
  ```
  RiskObject {
    id: string
    source: string
    category: enum
    affected_assets: string[]
    business_process_map: string[]
    likelihood_score: float (0-1)
    blast_radius: string[]
    financial_exposure: FinancialImpact
    regulatory_triggers: Regulation[]
    threshold_breaches: Threshold[]
    remediation_owner: string
    status: enum
  }
  ```
- Database migration scripts
- Event schema registry (Avro/JSON Schema)
- API contract documentation

**Success Criteria:**
- All schemas defined with types
- Migration scripts tested on local database
- Event schemas registered in schema registry
- API documentation generated from types

---

#### T-FOUND-004: Authentication & Authorization Foundation
**Owner:** Security Engineer
**Description:**
- Implement standalone credential authentication (username/password with MFA)
- Design secure password storage and hashing (bcrypt/argon2)
- Implement role-based access control (RBAC) for 6 executive roles
- Implement agent-specific data isolation
- Set up audit logging foundation
- Design secure session management (JWT tokens)

**Deliverables:**
- Authentication service (FastAPI) with standalone auth
- Password hashing and validation service
- MFA implementation (TOTP)
- RBAC policy definitions for CFO, CRO, CLO, CIO, CISO, Board roles
- Agent-to-data authorization matrix
- JWT token management service
- Audit logging service
- Security baseline documentation

**Success Criteria:**
- Users can authenticate with username/password + MFA
- JWT tokens issued and validated correctly
- Agents can only access their designated data
- All access attempts logged
- Password security meets NIST standards
- Security baseline passes initial review

**Note:** Standalone credentials chosen over SSO for faster MVP deployment. SSO federation can be added in Phase 3 if needed.

---

## Phase 1: MVP - Three Agents, Four Sources (Weeks 3-16)

### Objective
Build production-ready MVP for single customer with CFO, CISO, and Board agents reading from SIEM, EDR, IAM, and claims data.

### Tasks

#### T-MVP-001: SIEM Connector (Splunk)
**Owner:** Senior Backend Engineer
**Weeks:** 3-4
**Description:**
- Build Splunk API connector microservice
- Implement Splunk search result normalization
- Set up continuous polling for new events
- Implement rate limiting and error handling

**Deliverables:**
- `/services/ingestion/connectors/splunk/`
  - Connector service container
  - Splunk API client
  - Event normalization logic
  - Health check endpoints
  - Configuration schema

**Success Criteria:**
- Connects to Splunk instance via API
- Pulls security events continuously
- Normalizes to RiskObject schema
- Handles Splunk API rate limits
- Publishes to event bus

---

#### T-MVP-002: EDR Connector (CrowdStrike)
**Owner:** Senior Backend Engineer
**Weeks:** 4-5
**Description:**
- Build CrowdStrike Falcon API connector
- Implement detection normalization
- Set up real-time alert streaming
- Implement host and process enrichment

**Deliverables:**
- `/services/ingestion/connectors/crowdstrike/`
  - Falcon API client
  - Detection normalization logic
  - Host enrichment service
  - Process tree mapping

**Success Criteria:**
- Connects to CrowdStrike Falcon API
- Streams detections in real-time
- Enriches with host and process context
- Normalizes to RiskObject schema

---

#### T-MVP-003: IAM Connector (Azure AD)
**Owner:** Senior Backend Engineer
**Weeks:** 5-6
**Description:**
- Build Microsoft Graph API connector
- Implement sign-in event normalization
- Set up MFA failure tracking
- Implement privilege change monitoring

**Deliverables:**
- `/services/ingestion/connectors/azuread/`
  - Microsoft Graph API client
  - Sign-in event normalization
  - MFA failure tracking
  - Privilege change monitoring

**Success Criteria:**
- Connects to Azure AD via Graph API
- Tracks sign-in events and failures
- Monitors privilege changes
- Normalizes to RiskObject schema

---

#### T-MVP-004: Claims Adjudication Connector (Nasco)
**Owner:** Senior Backend Engineer
**Weeks:** 6-7
**Description:**
- Build Nasco-specific claims data connector
- Implement Nasco data model integration (claims, members, providers)
- Implement claims event normalization (adjudication events, payment events)
- Set up business process mapping for claims operations
- Implement financial impact preprocessing
- Handle Nasco-specific data formats and APIs

**Deliverables:**
- `/services/ingestion/connectors/claims/nasco/`
  - Nasco API client or SQL connector
  - Claims event normalization (Nasco schema to RiskObject)
  - Business process mapper (claims to payer operations)
  - Financial preprocessor (claims costs for exposure calculation)
  - Nasco data model documentation

**Success Criteria:**
- Connects to Nasco system via supported interface (API/SQL/export)
- Reads claims events continuously
- Maps claims events to business processes
- Preprocesses claims costs for financial modeling
- Normalizes to RiskObject schema
- Handles Nasco-specific error scenarios

**Note:** Nasco platform confirmed as pilot customer's claims system. Integration approach will be determined during pilot discovery (API access preferred, SQL export fallback).

---

#### T-MVP-005: Risk Normalization Engine
**Owner:** Senior Backend Engineer
**Weeks:** 7-9
**Description:**
- Build core normalization engine
- Implement business process graph
- Create RiskObject enrichment pipeline
- Implement blast radius analysis
- Set up regulatory trigger mapping

**Deliverables:**
- `/services/normalization/`
  - Core normalization engine
  - Business process graph service
  - Blast radius analyzer
  - Regulatory trigger mapper
  - RiskObject validator

**Success Criteria:**
- Enriches raw events to RiskObjects
- Maps to business processes
- Calculates blast radius
- Maps regulatory triggers
- Validates all RiskObjects

---

#### T-MVP-006: Financial Modeling Engine
**Owner:** Senior Backend Engineer
**Weeks:** 9-11
**Description:**
- Build deterministic financial calculation engine (Python/pandas)
- Implement MLR impact calculator (Medical Loss Ratio)
- Implement stop-loss exposure calculator
- Implement reserve at risk calculator
- Create methodology trail generator
- Design batch processing for actuarial exports
- Build file parser for actuarial data warehouse exports

**Deliverables:**
- `/services/financial/`
  - Calculation engine (Python/pandas)
  - MLR impact calculator
  - Stop-loss exposure calculator
  - Reserve at risk calculator
  - Methodology trail generator
  - Actuarial export parser (CSV/SQL export formats)
  - Batch job scheduler for financial data updates

**Success Criteria:**
- Calculates dollar exposure deterministically
- Produces MLR impact estimates
- Calculates stop-loss exposure
- Generates audit methodology trails
- No LLM in calculation path
- Processes actuarial exports on scheduled basis
- Handles batch updates from data warehouse

**Note:** Actuarial data accessed via batch exports from data warehouse, not real-time API. Financial parameters updated on scheduled basis (daily/weekly as configured by customer).

---

#### T-MVP-007: Agent Runtime Foundation
**Owner:** AI/ML Engineer
**Weeks:** 11-12
**Description:**
- Build agent runtime infrastructure
- Implement context manager for agent state
- Create LLM inference client (Claude Sonnet)
- Set up prompt template system
- Implement output formatter

**Deliverables:**
- `/services/agents/runtime/`
  - Agent runtime container
  - Context manager service
  - LLM inference client
  - Prompt template system
  - Output formatter

**Success Criteria:**
- Maintains persistent agent state
- Calls Claude Sonnet API
- Manages prompt templates
- Formats structured outputs

---

#### T-MVP-008: CFO Agent Implementation
**Owner:** AI/ML Engineer
**Weeks:** 12-13
**Description:**
- Implement CFO agent context manager
- Create CFO-specific prompts
- Build dollar exposure briefing generator
- Implement trend analysis logic
- Create board-ready summary formatter

**Deliverables:**
- `/services/agents/cfo/`
  - Context manager
  - Prompt templates
  - Briefing generator
  - Trend analyzer
  - Summary formatter

**Success Criteria:**
- Generates CFO-specific briefings
- Presents dollar exposure with methodology trails
- Tracks trends over time
- Produces board-ready summaries

---

#### T-MVP-009: CISO Agent Implementation
**Owner:** AI/ML Engineer
**Weeks:** 13-14
**Description:**
- Implement CISO agent context manager
- Create CISO-specific prompts
- Build attack pathway analyzer
- Implement blast radius visualization
- Create unified executive action plan generator
- Integrate public threat intelligence feeds (CISA KEV, NIST NVD, Epss)
- Design abstract threat feed interface for future licensed feed integration

**Deliverables:**
- `/services/agents/ciso/`
  - Context manager
  - Prompt templates
  - Attack pathway analyzer
  - Blast radius visualizer
  - Action plan generator
  - Public threat feed parsers (CISA KEV, NIST, Epss)
  - Abstract threat feed interface

**Success Criteria:**
- Generates CISO-specific briefings
- Analyzes attack pathways
- Visualizes blast radius
- Coordinates with other agents' views
- Enriches risk objects with public threat intelligence
- Identifies known exploited vulnerabilities (CISA KEV)
- Provides CVE risk scores (NIST + Epss)
- Architecture supports licensed feed upgrade (Phase 3)

**Note:** Using public threat feeds for MVP (CISA KEV, NIST NVD, Epss). Licensed feed (CrowdStrike/Recorded Future) can be added in Phase 3 based on pilot feedback. Architecture designed for easy swap.

---

#### T-MVP-010: Board Agent Implementation
**Owner:** AI/ML Engineer
**Weeks:** 14-15
**Description:**
- Implement Board agent context manager
- Create Board-specific prompts
- Build synthesis engine for other agents' outputs
- Implement three-question governance brief
- Create ROI and trajectory analyzer

**Deliverables:**
- `/services/agents/board/`
  - Context manager
  - Prompt templates
  - Synthesis engine
  - Governance brief generator
  - ROI analyzer

**Success Criteria:**
- Synthesizes all agents' outputs
- Generates three-question governance brief
- Analyzes ROI and trajectory
- Produces board-ready reports

---

#### T-MVP-011: Frontend - CFO Dashboard
**Owner:** Frontend Engineer
**Weeks:** 12-13
**Description:**
- Build CFO-specific dashboard view
- Implement dollar exposure displays
- Create trend visualization charts
- Build methodology trail viewer
- Implement on-demand query interface

**Deliverables:**
- `/frontend/src/views/CFO/`
  - Dashboard component
  - Exposure display
  - Trend charts
  - Methodology viewer
  - Query interface

**Success Criteria:**
- Shows dollar exposure with breakdown
- Displays trends over time
- Shows methodology trails
- Handles on-demand queries

---

#### T-MVP-012: Frontend - CISO Dashboard
**Owner:** Frontend Engineer
**Weeks:** 13-14
**Description:**
- Build CISO-specific dashboard view
- Implement attack pathway visualizations
- Create blast radius diagrams
- Build risk object explorer
- Implement coordination view

**Deliverables:**
- `/frontend/src/views/CISO/`
  - Dashboard component
  - Attack pathway visualizations
  - Blast radius diagrams
  - Risk explorer
  - Coordination view

**Success Criteria:**
- Shows attack pathways clearly
- Displays blast radius chains
- Explores risk objects
- Shows cross-agent coordination

---

#### T-MVP-013: Frontend - Board Dashboard
**Owner:** Frontend Engineer
**Weeks:** 14-15
**Description:**
- Build Board-specific dashboard view
- Implement governance brief display
- Create synthesis view
- Build ROI and trajectory charts
- Implement PDF export

**Deliverables:**
- `/frontend/src/views/Board/`
  - Dashboard component
  - Governance brief display
  - Synthesis view
  - ROI/trajectory charts
  - PDF exporter

**Success Criteria:**
- Shows three-question governance brief
- Synthesizes all agents' outputs
- Displays ROI and trajectory
- Exports board-ready PDFs

---

#### T-MVP-014: Alerting & Notification System
**Owner:** Senior Backend Engineer
**Weeks:** 15-16
**Description:**
- Build threshold breach detection
- Implement alert routing service
- Set up email notifications
- Configure Slack/Teams integration
- Create alert feed API

**Deliverables:**
- `/services/alerting/`
  - Threshold breach detector
  - Alert router
  - Email service
  - Slack/Teams integration
  - Alert feed API

**Success Criteria:**
- Detects threshold breaches
- Routes alerts to correct roles
- Sends email notifications
- Pushes to Slack/Teams
- Provides alert feed API

---

#### T-MVP-015: HIPAA Compliance & SOC 2 Scope
**Owner:** Security Engineer
**Weeks:** 15-16
**Description:**
- Implement PHI stripping in normalization
- Set up audit trail logging
- Configure security monitoring
- Create compliance documentation
- Prepare for SOC 2 Type II

**Deliverables:**
- PHI stripping service
- Audit trail system
- Security monitoring dashboards
- Compliance documentation
- SOC 2 preparation checklist

**Success Criteria:**
- PHI stripped before LLM calls
- All access audited
- Security monitored continuously
- Compliance documentation complete
- Ready for SOC 2 Type II audit

---

## Phase 2: Pilot Deployment & Customer Onboarding (Weeks 17-20)

### Objective
Deploy MVP to pilot customer, complete onboarding sequence, validate core value proposition.

### Tasks

#### T-PILOT-001: Pilot Customer Environment Setup
**Owner:** Senior Backend Engineer
**Weeks:** 17
**Description:**
- Provision tenant infrastructure
- Deploy all services to customer cloud
- Configure customer-specific parameters
- Validate isolation architecture
- Test all connectors in customer environment

**Deliverables:**
- Provisioned tenant infrastructure
- Deployed services
- Validated connectors
- Customer-specific configuration
- Isolation validation report

**Success Criteria:**
- All services running in customer tenant
- Connectors pulling data successfully
- Data isolation validated
- Customer parameters configured

---

#### T-PILOT-002: Business Process Graph Construction
**Owner:** Senior Backend Engineer + Product Manager
**Weeks:** 17-18
**Description:**
- Conduct structured interviews with CIO/CISO
- Map systems to payer operations
- Build typed graph with dependencies
- Load financial values per process
- Validate graph with customer

**Deliverables:**
- Business process graph
- System-to-process mappings
- Dependency chains
- Financial values per process
- Customer validation

**Success Criteria:**
- Graph covers all critical systems
- Processes mapped correctly
- Dependencies validated
- Financial values accurate

---

#### T-PILOT-003: Financial Parameters & Threshold Configuration
**Owner:** Senior Backend Engineer + Product Manager
**Weeks:** 18-19
**Description:**
- Load MLR targets from customer
- Configure stop-loss parameters
- Load reserve positions
- Configure premium revenue by LOB
- Set risk appetite thresholds with CRO

**Deliverables:**
- MLR target configuration
- Stop-loss parameters
- Reserve positions
- Premium revenue mapping
- Risk appetite thresholds

**Success Criteria:**
- All financial parameters loaded
- Thresholds configured with CRO
- Validated against customer data

---

#### T-PILOT-004: Agent Calibration & Executive Onboarding
**Owner:** Product Manager + AI/ML Engineer
**Weeks:** 19-20
**Description:**
- Activate all three agents
- Run structured reviews with executives
- Calibrate thresholds and briefing cadence
- Validate output quality
- Deliver first live briefing

**Deliverables:**
- Activated agents
- Calibrated thresholds
- Validated outputs
- First live briefing delivered

**Success Criteria:**
- All agents running
- Executives satisfied with outputs
- Thresholds properly calibrated
- First briefing delivered successfully

---

#### T-PILOT-005: MVP Success Criterion Validation
**Owner:** Product Manager + All Engineers
**Weeks:** 20
**Description:**
- Validate CFO can defend dollar exposure in board meeting
- Validate CISO agrees with accuracy
- Validate methodology trail holds up to scrutiny
- Document feedback for roadmap

**Deliverables:**
- Board meeting performance documented
- CISO validation recorded
- Methodology trail validated
- Roadmap feedback compiled

**Success Criteria:**
- CFO successfully defends figures
- CISO confirms accuracy
- Methodology trail holds up
- Clear feedback for next phase

---

## Phase 3: Production Readiness & Scale (Weeks 21-28)

### Objective
Harden platform for production use, add remaining agents (CRO, CLO, CIO), implement advanced features, prepare for multi-tenant deployment.

### Tasks

#### T-PROD-001: CRO Agent Implementation
**Owner:** AI/ML Engineer
**Weeks:** 21-22
**Description:**
- Implement CRO agent context manager
- Create appetite status dashboard
- Build breach escalation tracker
- Implement CMS regulatory limit monitoring
- Create board appetite parameter visualizations

**Deliverables:**
- `/services/agents/cro/`
  - Context manager
  - Appetite status dashboard
  - Escalation tracker
  - Regulatory limit monitor
  - Visualization components

**Success Criteria:**
- Generates appetite status
- Tracks escalations with owners
- Monitors CMS limits
- Visualizes board parameters

---

#### T-PROD-002: CLO Agent Implementation
**Owner:** AI/ML Engineer
**Weeks:** 22-23
**Description:**
- Implement CLO agent context manager
- Create regulatory obligation mapper
- Build notification timeline tracker
- Implement vendor BAA status monitor
- Create state DOI requirement checker

**Deliverables:**
- `/services/agents/clo/`
  - Context manager
  - Obligation mapper
  - Timeline tracker
  - BAA status monitor
  - DOI requirement checker

**Success Criteria:**
- Maps regulatory obligations
- Tracks notification timelines
- Monitors BAA status
- Checks state requirements

---

#### T-PROD-003: CIO Agent Implementation
**Owner:** AI/ML Engineer
**Weeks:** 23-24
**Description:**
- Implement CIO agent context manager
- Create operational impact analyzer
- Build technology decision risk queue
- Implement system dependency mapper
- Create business process impact reports

**Deliverables:**
- `/services/agents/cio/`
  - Context manager
  - Impact analyzer
  - Risk queue
  - Dependency mapper
  - Impact reports

**Success Criteria:**
- Analyzes operational impact
- Prioritizes technology decisions
- Maps system dependencies
- Generates impact reports

---

#### T-PROD-004: Additional Data Source Connectors
**Owner:** Senior Backend Engineer
**Weeks:** 24-26
**Description:**
- Build PBM interface connector
- Build vendor security assessment connector
- Build clearinghouse connector
- Build actuarial data warehouse connector
- Build regulatory feed connector (CMS, state DOI)

**Deliverables:**
- `/services/ingestion/connectors/pbm/`
- `/services/ingestion/connectors/vendor/`
- `/services/ingestion/connectors/clearinghouse/`
- `/services/ingestion/connectors/actuarial/`
- `/services/ingestion/connectors/regulatory/`

**Success Criteria:**
- All connectors running
- Normalizing data correctly
- Publishing to event bus

---

#### T-PROD-005A: Licensed Threat Intelligence Feed Integration (Optional)
**Owner:** Senior Backend Engineer + AI/ML Engineer
**Weeks:** 26-27 (Optional, based on pilot feedback)
**Description:**
- Evaluate licensed threat intelligence feed options (CrowdStrike Intel, Recorded Future, Mandiant)
- Implement licensed feed integration via existing abstract interface
- Replace public feed parsers with licensed feed API client
- Enhanced CISO Agent with healthcare-specific actor intelligence
- Cost/benefit analysis for feed upgrade

**Deliverables:**
- `/services/ingestion/connectors/threat-intel/`
  - Licensed feed API client (CrowdStrike/Recorded Future/Mandiant)
  - Healthcare-specific threat actor profiles
  - Enhanced CVE exploitation intelligence
  - Real-time threat actor TTP tracking
- Cost/benefit analysis report
- Upgrade recommendation

**Success Criteria:**
- Abstract interface supports swap from public to licensed feed
- Healthcare-specific threat intelligence integrated
- Real-time actor profiling operational
- CISO briefings enhanced with active threat actor context
- Cost justified by customer demand

**Triggers for Upgrade:**
- 3+ customers deployed
- CISOs request healthcare-specific intelligence
- Budget available ($100k+ annual cost)
- Competitive pressure from alternatives

**Skip if:** Public feeds sufficient for customer needs, budget constraints

---
**Owner:** AI/ML Engineer
**Weeks:** 26-27
**Description:**
- Implement CISO cross-agent access
- Build agent coordination protocol
- Create unified executive action plan
- Implement trend analysis across agents
- Build conflict detection/resolution

**Deliverables:**
- Agent coordination service
- Cross-agent access controls
- Unified action plan generator
- Trend analysis service
- Conflict resolution system

**Success Criteria:**
- CISO can read all agents
- Coordination protocol working
- Unified plans generated
- Trends analyzed across agents
- Conflicts detected and resolved

---

#### T-PROD-006: Multi-Tenant Architecture
**Owner:** Senior Backend Engineer + Security Engineer
**Weeks:** 27-28
**Description:**
- Implement tenant provisioning automation
- Build tenant management service
- Implement per-tenant monitoring
- Create tenant upgrade orchestration
- Build tenant data migration tools

**Deliverables:**
- Tenant provisioning service
- Tenant management UI
- Per-tenant monitoring
- Upgrade orchestration
- Migration tools

**Success Criteria:**
- New tenant provisioned automatically
- Management UI working
- Monitoring isolated per tenant
- Upgrades orchestrated safely
- Migration tools validated

---

#### T-PROD-007: Production Hardening & Observability
**Owner:** Senior Backend Engineer + Security Engineer
**Weeks:** 27-28
**Description:**
- Implement comprehensive observability (OpenTelemetry)
- Set up Azure Monitor/Datadog integration
- Build comprehensive alerting
- Implement disaster recovery procedures
- Complete SOC 2 Type II audit preparation

**Deliverables:**
- OpenTelemetry instrumentation
- Monitoring dashboards
- Alerting rules
- DR procedures
- SOC 2 audit complete

**Success Criteria:**
- All services instrumented
- Monitoring comprehensive
- Alerting reliable
- DR tested
- SOC 2 certified

---

## Open Questions - ✅ ALL RESOLVED

### ✅ Q1: Actuarial Data Access Model - RESOLVED
**Question:** Are we reading data warehouse exports or have API access to actuarial platform?
**Answer:** **Reading batch exports** from data warehouse (not real-time API)
**Impact:** Financial modeling engine processes actuarial data on scheduled basis (daily/weekly)
**Owner:** Product Manager
**Resolved:** Week 1

**Architecture Implications:**
- Financial parameters updated via batch jobs, not real-time
- T-MVP-006 (Financial Engine) includes export parser and scheduler
- Sufficient for MVP - financial parameters don't change second-by-second
- Can upgrade to API in Phase 3 if customer requires real-time

---

### ✅ Q2: Claims Adjudication Platform - RESOLVED
**Question:** Which platform is pilot customer running?
**Answer:** **Nasco** platform
**Impact:** Connector design specific to Nasco data model and interfaces
**Owner:** Product Manager
**Resolved:** Week 1

**Architecture Implications:**
- T-MVP-004 (Claims Connector) built for Nasco specifically
- Integration approach: API preferred, SQL export fallback
- Nasco data model documented for business process mapping
- Connector tested against Nasco staging environment during Phase 1

---

### ✅ Q3: LLM Data Boundary Policy - RESOLVED
**Question:** Legal sign-off on no PHI/member data in API calls
**Answer:** **CONFIRMED** - No PHI, no member-level data, no customer-identifying strings in LLM calls
**Impact:** PHI stripping service required before normalization layer outputs to agents
**Owner:** Security Engineer + Legal Counsel
**Resolved:** Week 1

**Architecture Implications:**
- T-MVP-005 (Normalization Engine) includes PHI stripping
- T-MVP-015 (Compliance) validates no PHI in LLM context
- Legal sign-off documented in compliance pack
- HIPAA BAA scope defined around this boundary
- **Critical:** All validator agents check for PHI violations

---

### ✅ Q4: Role Access Provisioning - RESOLVED
**Question:** Will customer use SSO federation?
**Answer:** **Standalone credentials** (username/password with MFA) - not SSO federation
**Impact:** Authentication service built with standalone auth, JWT tokens, MFA support
**Owner:** Security Engineer
**Resolved:** Week 1

**Architecture Implications:**
- T-FOUND-004 (Authentication) uses standalone credentials
- JWT tokens for session management
- MFA required (TOTP)
- Password security per NIST standards
- **Phase 3 upgrade path:** SSO federation can be added if customers demand it
- Faster MVP deployment (no customer IT integration needed)

---

### ✅ Q5: Threat Intelligence Feed - RESOLVED
**Question:** Licensed feed (CrowdStrike, Recorded Future) or public (CISA KEV, FS-ISAC)?
**Answer:** **Public feeds** for MVP (CISA KEV, NIST NVD, Epss) - upgrade to licensed in Phase 3
**Impact:** CISO Agent uses public feed parsers, architecture supports licensed feed upgrade
**Owner:** Senior Backend Engineer + CISO
**Resolved:** Week 1

**Architecture Implications:**
- T-MVP-009 (CISO Agent) includes public feed parsers
- Abstract threat feed interface designed for easy swap
- **MVP approach:**
  - CISA KEV (Known Exploited Vulnerabilities) - weekly updates
  - NIST NVD (National Vulnerability Database) - daily updates
  - Epss (Exploit Prediction Scoring System) - free predictions
- **Phase 3 upgrade:** Licensed feed (CrowdStrike/Recorded Future) based on pilot feedback
- **Cost savings:** $100k+ in Year 1, can justify cost with multiple customers

---

## Summary of Architecture Decisions

| Decision | Answer | Phase 3 Upgrade Path |
|----------|--------|----------------------|
| Actuarial Access | Batch exports | API integration if needed |
| Claims Platform | Nasco | Add other platforms as connectors |
| LLM Data Boundary | No PHI in LLM calls | Enforced via validation |
| Authentication | Standalone credentials | SSO federation if demanded |
| Threat Intelligence | Public feeds (CISA KEV, NIST, Epss) | Licensed feed when justified |

**🚀 All blockers removed. Ready to begin Phase 0 engineering.**

---

## Team Structure

### Engineering Leadership
- **Engineering Lead:** Overall architecture and delivery
- **Security Lead:** Security architecture, HIPAA, SOC 2

### Core Team
- **2 × Senior Backend Engineers:** Ingestion, normalization, financial modeling
- **1 × AI/ML Engineer:** Agent architecture, LLM integration
- **1 × Security Engineer:** Tenant isolation, compliance
- **1 × Frontend Engineer:** Dashboards, query interface
- **1 × Product Manager:** Customer onboarding, requirements

---

## Success Criteria by Phase

### Phase 0 (Foundation)
- [ ] Development environment running locally
- [ ] Cloud infrastructure provisioned
- [ ] Core data models defined
- [ ] Authentication working

### Phase 1 (MVP)
- [ ] All four connectors pulling data
- [ ] Risk normalization enriching events
- [ ] Financial modeling calculating exposure
- [ ] Three agents generating briefings
- [ ] Three dashboards displaying outputs
- [ ] Pilot customer deployed

### Phase 2 (Pilot)
- [ ] Business process graph built
- [ ] Financial parameters loaded
- [ ] All agents calibrated
- [ ] First briefing delivered
- [ ] CFO validates board readiness

### Phase 3 (Production)
- [ ] All six agents implemented
- [ ] All data sources connected
- [ ] Multi-tenant architecture operational
- [ ] SOC 2 Type II certified
- [ ] Production ready for scale

---

## Non-Goals - Explicitly Out of Scope

CyberRX is NOT:
- A GRC platform - does not manage policies or controls
- A SIEM - does not collect or store raw security events
- An incident response platform - does not manage response workflows
- A compliance automation tool - does not file breach notifications

**Core Value:** Translation and synthesis - making security stack outputs actionable for executives.

---

## Implementation Guidelines for Agent Teams

### When to Use This Plan
1. **Kickoff:** Read entire plan, understand phases and dependencies
2. **Task Assignment:** Each task has clear owner, timeline, deliverables, success criteria
3. **Execution:** Follow task order within phases, respect dependencies
4. **Validation:** Each task has success criteria - validate before claiming complete
5. **Integration:** Test integration points between services

### Code Organization Principles
- One microservice per directory
- Shared code in `/libraries`
- All services typed (TypeScript/Python type hints)
- API contracts defined with OpenAPI
- Event schemas registered

### Testing Strategy
- Unit tests for all business logic
- Integration tests for connectors
- End-to-end tests for critical paths
- Security tests for all data handling
- Performance tests for scaling

### Documentation Requirements
- README for each service
- API documentation auto-generated
- Architecture decision records (ADRs)
- Runbooks for operational procedures
- Customer-facing documentation

---

## Next Steps

✅ **COMPLETED:**
1. ✅ All 5 Open Questions resolved
2. ✅ Architecture decisions documented
3. ✅ Implementation plan updated

**READY TO EXECUTE:**
1. **Assign Team** - Assign agents to specific task types
2. **Initialize Task Board** - Create `/workspace/task-board.json` with all Phase 0 tasks
3. **Set Up Development Environment** - Begin T-FOUND-001 immediately
4. **Start Phase 0 Execution** - All 4 foundation tasks can begin in parallel
5. **Establish Weekly Rhythm** - Manager agent coordinates, human reviews milestones

**Week 1-2 Priorities:**
- T-FOUND-001: Repository setup (Backend Engineer)
- T-FOUND-002: Cloud infrastructure (Backend + Security Engineers)
- T-FOUND-003: Data models (Backend Engineer)
- T-FOUND-004: Authentication (Security Engineer)

**Week 3-16 Priorities (Phase 1 MVP):**
- 4 connectors (SIEM, EDR, IAM, Nasco Claims)
- Risk normalization engine
- Financial modeling engine
- 3 agents (CFO, CISO, Board)
- 3 dashboards

**🚀 ENGINEERING CAN BEGIN IMMEDIATELY**

---

**End of Implementation Plan**
