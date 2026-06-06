# CyberRX Architecture Overview

## High-Level Architecture

CyberRX is a multi-agent AI platform that processes healthcare security data and produces executive intelligence briefings.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CUSTOMER CLOUD TENANT                     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Splunk     │  │ CrowdStrike  │  │  Azure AD    │      │
│  │   Logs       │  │  Detections  │  │   Identity   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │                │
│         └─────────────────┼─────────────────┘                │
│                           │                                  │
│                   ┌───────▼────────┐                          │
│                   │  INGESTION     │                          │
│                   │  CONNECTORS    │                          │
│                   └───────┬────────┘                          │
│                           │                                  │
│                   ┌───────▼────────┐                          │
│                   │  NORMALIZATION │                          │
│                   │  ENGINE        │                          │
│                   └───────┬────────┘                          │
│                           │                                  │
│         ┌─────────────────┼─────────────────┐                │
│         │                 │                 │                │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐         │
│  │    AGENTS   │  │  FINANCIAL  │  │  ALERTING   │         │
│  │  (x6)       │  │  ENGINE     │  │  SERVICE    │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                 │                 │                │
│         └─────────────────┼─────────────────┘                │
│                           │                                  │
│                   ┌───────▼────────┐                          │
│                   │  TimescaleDB   │                          │
│                   │  + pgvector    │                          │
│                   └────────────────┘                          │
│                           │                                  │
│                   ┌───────▼────────┐                          │
│                   │  KAFKA         │                          │
│                   │  Events        │                          │
│                   └────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ (Executive Briefings)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND DASHBOARDS                     │
│                                                              │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐         │
│  │  CFO  │ │ CISO  │ │  CRO  │ │  CLO  │ │  CIO  │  Board  │
│  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘
└─────────────────────────────────────────────────────────────┘
```

## Components

### Ingestion Layer

**Purpose**: Connect to customer data sources and collect raw data

**Services**:
- Splunk Connector (T-MVP-001)
- CrowdStrike Connector (T-MVP-002)
- Azure AD Connector (T-MVP-003)
- Nasco Claims Connector (T-MVP-004)

**Technology**: Python FastAPI, async I/O

### Normalization Engine

**Purpose**: Transform raw data into standardized RiskObjects

**Services**:
- Core normalization logic (T-MVP-005)
- PHI stripping service
- Business process graph

**Technology**: Python, pandas, scikit-learn

### Financial Modeling

**Purpose**: Calculate cyber risk in financial terms

**Services**:
- Risk calculator (T-MVP-006)
- Actuarial export parser

**Technology**: Python, pandas, NumPy

### Agent Runtime

**Purpose**: Orchestrate AI agents and manage their state

**Services**:
- Agent runtime (T-MVP-007)
- Individual agents (CFO, CISO, CRO, CLO, CIO, Board)

**Technology**: Python, LangChain, OpenAI API

### Alerting Service

**Purpose**: Detect threshold violations and route alerts

**Services**:
- Threshold detector
- Alert router
- Notification service

**Technology**: Python, Kafka

## Data Flow

1. **Collection**: Ingestion connectors poll data sources
2. **Normalization**: Raw data transformed to RiskObjects
3. **Enrichment**: Business context added
4. **Analysis**: Agents process enriched data
5. **Output**: Briefings generated for each executive role

## Technology Decisions

### Why PostgreSQL + TimescaleDB?
- Time-series optimization for event data
- Full SQL capabilities for complex queries
- pgvector for semantic search
- Proven reliability at scale

### Why Kafka?
- Event-driven architecture
- Decouples services
- Enables real-time processing
- Replay capability for debugging

### Why Python for microservices?
- Rich data science ecosystem (pandas, NumPy)
- Excellent async support (asyncio, FastAPI)
- Easy AI/ML integration
- Large developer pool

### Why React + TypeScript?
- Type safety reduces bugs
- Rich component ecosystem
- Excellent developer experience
- Great for data visualization

## Security Architecture

### Tenant Isolation
- Each customer gets isolated deployment
- Separate Kubernetes namespaces
- Separate database schemas
- No cross-tenant data access

### Data Protection
- All data encrypted at rest (BYOK)
- TLS for data in transit
- PHI stripped before AI processing
- Audit logging for all operations

### Access Control
- Role-based access control (RBAC)
- MFA required for all users
- No shared credentials
- Regular access reviews

## Scalability

### Horizontal Scaling
- Stateless services can scale horizontally
- Kafka partitions for parallel processing
- Database connection pooling
- CDN for frontend assets

### Performance Optimization
- TimescaleDB hypertables for time-series data
- Vector indexes for semantic search
- Caching with Redis
- Lazy loading for dashboards

## Monitoring & Observability

### Metrics
- Prometheus for metrics collection
- Grafana for visualization
- Custom dashboards per service

### Logging
- Structured logging (JSON)
- Central log aggregation
- Correlation IDs for request tracing

### Health Checks
- HTTP health endpoints for all services
- Database connection checks
- Kafka connectivity checks
- Dependency health monitoring

## Deployment Architecture

### Development
- Docker Compose for local development
- Hot-reload enabled
- Shared PostgreSQL and Kafka

### Staging
- Single-tenant AKS cluster
- Production-like configuration
- Automated testing

### Production
- Per-customer AKS clusters
- High availability (multi-AZ)
- Automated backups
- Disaster recovery plan

See individual ADRs for detailed decision records.
