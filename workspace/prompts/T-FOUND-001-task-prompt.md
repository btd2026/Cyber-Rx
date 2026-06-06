# Task Assignment: T-FOUND-001
## Repository Structure & Development Environment

---

**Task ID:** T-FOUND-001
**Title:** Repository Structure & Development Environment
**Assigned To:** Senior Backend Engineer
**Phase:** Phase 0 - Foundation & Architecture Setup
**Weeks:** 1-2
**Estimated Hours:** 40 hours
**Priority:** 🔴 CRITICAL

---

## OBJECTIVE

Create the foundational repository structure and development environment for the CyberRX Multi-Agent AI Platform. This is the first task in the implementation - all subsequent work depends on a solid foundation.

**What we're building:** A multi-agent AI platform that deploys inside health plans' cloud tenants, reads their security/operational data, and produces role-specific intelligence briefings for C-suite leaders (CFO, CRO, CLO, CIO, CISO, Board).

**Your mission:** Set up the monorepo structure so the entire team can work efficiently, with clear separation of concerns, local development capability, and CI/CD foundations.

---

## DELIVERABLES

### 1. Monorepo Structure
Create the following directory structure:

```
/cyberrx
  /infrastructure              # Terraform/Kubernetes configs
    /terraform
      /aks-cluster            # Kubernetes cluster setup
      /event-hubs             # Azure Event Hubs/Kafka
      /database               # TimescaleDB + pgvector
      /key-vault              # BYOK encryption
    /kubernetes
      /namespaces             # Per-tenant namespace configs
      /network-policies       # Isolation policies
      /deployments            # Service deployments

  /services                    # Backend microservices
    /ingestion                # Data source connectors
      /connectors
        /splunk               # T-MVP-001
        /crowdstrike          # T-MVP-002
        /azuread              # T-MVP-003
        /claims
          /nasco              # T-MVP-004
      /base                  # Shared connector code
    /normalization            # Risk normalization engine
      /core                  # T-MVP-005
      /phi-stripping         # PHI stripping service
      /business-process      # Business process graph
    /financial                # Financial modeling engine
      /calculator            # T-MVP-006
      /actuarial-parser      # Export parser
    /agents                   # Agent runtime and 6 agents
      /runtime               # T-MVP-007
      /cfo                   # T-MVP-008
      /ciso                  # T-MVP-009
      /board                 # T-MVP-010
      /cro                   # T-PROD-001
      /clo                   # T-PROD-002
      /cio                   # T-PROD-003
    /alerting                # T-MVP-014
      /threshold-detector
      /alert-router
      /notifications

  /frontend                   # React dashboards
    /src
      /views
        /cfo                  # T-MVP-011
        /ciso                 # T-MVP-012
        /board                # T-MVP-013
      /components            # Shared components
      /services              # API clients
      /utils                 # Frontend utilities

  /libraries                   # Shared code
    /types                    # TypeScript type definitions
    /python-types             # Python type definitions
    /utils                    # Shared utilities
    /schemas                  # Event/RiskObject schemas

  /docs                        # Documentation
    /architecture              # Architecture docs
    /api                      # API documentation (auto-generated)
    /runbooks                 # Operational procedures
    /adr                      # Architecture Decision Records
```

### 2. Docker Compose for Local Development
Create `docker-compose.yml` that runs:
- PostgreSQL with TimescaleDB + pgvector extensions
- Kafka or Azure Event Hubs emulator
- All microservices (hot-reload enabled)
- Frontend with hot-reload
- **One command to start entire stack:** `docker-compose up`

### 3. GitHub Actions Workflow Templates
Create `.github/workflows/` with:
- `ci.yml` - Run on every PR: lint, type-check, unit tests
- `security-scan.yml` - Security vulnerability scanning
- `infra-validate.yml` - Terraform validation
- Templates for future workflows

### 4. Contributing Guidelines
Create `CONTRIBUTING.md` with:
- How to set up local development
- Code style guidelines
- PR submission process
- Testing requirements
- Code review criteria

### 5. Repository README
Create `README.md` with:
- Project overview (CyberRX Multi-Agent AI Platform)
- Architecture diagram (high-level)
- Quick start for developers
- Links to documentation
- Team structure and responsibilities

---

## SUCCESS CRITERIA

**You are done when:**
- ✅ Developer can run entire stack locally with one command (`docker-compose up`)
- ✅ CI/CD runs on every PR (lint, type-check, tests pass)
- ✅ Clear contribution documentation exists
- ✅ Directory structure matches specification
- ✅ All services have placeholder code that compiles
- ✅ Docker images build successfully
- ✅ Local PostgreSQL database with TimescaleDB + pgvector works
- ✅ Local Kafka/Event Hubs emulator works
- ✅ Frontend dev server connects to backend services
- ✅ README explains the project clearly

---

## CONTEXT

### Architecture Decisions (Already Made)

1. **Actuarial Data:** Batch exports from data warehouse (not real-time API)
2. **Claims Platform:** Nasco (specific connector needed)
3. **LLM Data Boundary:** No PHI in LLM calls (confirmed - legal sign-off complete)
4. **Authentication:** Standalone credentials (username/password + MFA), not SSO
5. **Threat Intelligence:** Public feeds (CISA KEV, NIST, Epss) for MVP, upgrade to licensed in Phase 3

### Technology Stack

**Backend:**
- Python 3.11+ (FastAPI for services, pandas for financial modeling)
- Node.js 20+ (if any Express services needed)
- PostgreSQL 16+ with TimescaleDB extension
- pgvector extension for semantic search
- Azure Event Hubs or Apache Kafka
- Kubernetes (AKS/EKS)

**Frontend:**
- React 19 + TypeScript
- Vite for build tooling
- Chart.js or D3.js for visualizations

**DevOps:**
- Docker for containerization
- Terraform for infrastructure
- GitHub Actions for CI/CD
- Azure (primary) or AWS (secondary)

### Core Architectural Principles

- **Read-only:** No writes to customer systems
- **Tenant-isolated:** Fully isolated deployments per customer
- **Source-native:** Agents read primary data sources directly
- **Continuous:** Persistent state, near-real-time reactions
- **Role-scoped:** Every output mapped to executive context

### Dependencies

**This task has no dependencies** - it's the first task.

**This task unblocks:**
- T-FOUND-002: Cloud Infrastructure Foundation (needs Terraform modules)
- T-FOUND-003: Core Data Models & Schema Design (needs types/schemas structure)

---

## TECHNICAL REQUIREMENTS

### Repository Configuration

1. **Git Configuration:**
   - Initialize as git repository (if not already)
   - Create `.gitignore` for Python, Node.js, Docker, IDEs
   - Set up branch structure (main, feature/*, task/*)

2. **Python Setup:**
   - `requirements.txt` for shared dependencies
   - Individual `requirements.txt` per service
   - `pyproject.toml` for project metadata
   - Python 3.11+ specified

3. **Node.js Setup:**
   - `package.json` for frontend
   - `.nvmrc` to pin Node.js version (20)
   - TypeScript configuration

4. **Docker Setup:**
   - `Dockerfile` for each service type
   - `docker-compose.yml` for local development
   - `.dockerignore` files

### Code Organization Principles

- One microservice per directory in `/services`
- Shared code in `/libraries`
- All services typed (TypeScript + Python type hints)
- API contracts defined with OpenAPI
- Event schemas registered in schema registry

### Development Workflow

1. **Local Development:**
   ```bash
   # One command to start everything
   docker-compose up

   # Services hot-reload on code changes
   # Frontend hot-reloads via Vite
   # Database persists in Docker volume
   ```

2. **Testing:**
   ```bash
   # Run all tests
   docker-compose exec app pytest

   # Run with coverage
   docker-compose exec app pytest --cov
   ```

3. **CI/CD:**
   - Automatically runs on PR to main
   - Linters: Black, Flake8, ESLint
   - Type checkers: MyPy, tsc
   - Unit tests: pytest, jest

---

## VALIDATION REQUIREMENTS

Your output will be validated by 4 validator agents:

### Acceptance Validator
- ✅ All deliverables present
- ✅ Directory structure matches specification
- ✅ Docker compose runs entire stack
- ✅ CI/CD workflows defined
- ✅ Documentation complete

### Security Validator
- ✅ `.gitignore` prevents committing secrets
- ✅ Docker images use non-root users
- ✅ No hardcoded credentials
- ✅ Dependencies scanned for vulnerabilities
- ✅ Database credentials use environment variables

### No-Regression Validator
- ✅ No existing functionality broken (if this is a repo migration)
- ✅ Git history preserved
- ✅ No breaking changes to existing workflows

### Integration Validator
- ✅ All services compile/build
- ✅ Docker images build successfully
- ✅ Services can communicate via Docker network
- ✅ Database connections work
- ✅ Frontend connects to backend APIs

---

## OUTPUT REQUIREMENTS

### Code Outputs

1. **Directory Structure:** All directories created as specified
2. **Configuration Files:** All `.json`, `.yml`, `.txt`, `.toml` files
3. **Docker Files:** All `Dockerfile`, `docker-compose.yml`, `.dockerignore`
4. **Documentation:** README.md, CONTRIBUTING.md
5. **Placeholder Code:** Minimal `__init__.py`, `main.py`, `App.tsx` files that compile

### Documentation Outputs

1. **Repository README:** `README.md` at root
2. **Contributing Guide:** `CONTRIBUTING.md`
3. **Structure Documentation:** Brief explanation in each major directory

### Commit to Repository

1. **Create branch:** `task/T-FOUND-001-repo-setup`
2. **Commit all changes:** Single commit with clear message
3. **Create PR:** To main branch
4. **PR Description:** Summary of deliverables, how to test

### Artifact Output

Create `/workspace/artifacts/T-FOUND-001.out` with:
- List of all directories created
- List of all configuration files
- Docker compose test results (showing it works)
- CI/CD workflow test results
- Any deviations from specification (with rationale)
- Recommendations for next tasks

---

## NOTES

### Critical Success Factors

1. **One-Command Startup:** The `docker-compose up` command must work flawlessly. This is the most important success criterion.
2. **Hot-Reload:** Developers should see changes immediately without rebuilding containers.
3. **Clear Structure:** New team members should understand where code goes by looking at directory structure.
4. **Documentation:** README must explain what CyberRX is and how to start developing.

### Common Pitfalls to Avoid

- ❌ Don't create too many nested directories (keep it flat and navigable)
- ❌ Don't hardcode database credentials (use environment variables)
- ❌ Don't forget pgvector extension (needed for semantic search)
- ❌ Don't make Docker images too large (use multi-stage builds)
- ❌ Don't forget `.gitignore` for secrets, `node_modules`, `__pycache__`

### Questions to Ask Yourself

1. Can a new developer run the entire stack in 5 minutes?
2. Does the directory structure make sense at a glance?
3. Are all services typed (TypeScript + Python)?
4. Does CI/CD catch obvious errors before merge?
5. Is the README clear about what we're building?

---

## EXECUTION INSTRUCTIONS

1. **Read the task board** at `/workspace/cyberrx-multi-agent-task-board.json`
2. **Review the implementation plan** at `CYBERRX_IMPLEMENTATION_PLAN.md`
3. **Create the repository structure** as specified
4. **Set up Docker compose** for local development
5. **Create GitHub Actions workflows**
6. **Write documentation** (README, CONTRIBUTING)
7. **Test everything** (docker-compose up, CI/CD runs)
8. **Create artifact** at `/workspace/artifacts/T-FOUND-001.out`
9. **Commit and create PR**

---

## TIMING

- **Estimated:** 40 hours (1 week)
- **Suggested breakdown:**
  - Day 1-2: Directory structure, Python/Node setup, initial configs
  - Day 3-4: Docker compose, Dockerfiles, getting everything to run
  - Day 5: CI/CD workflows, documentation, testing
- **Deadline:** End of Week 2 (to unblock T-FOUND-002 and T-FOUND-003)

---

## BLOCKER DETECTION

**Escalate to human if:**
- Unclear about technology choices (Python vs Node for specific services)
- Conflicts with existing repository (if migrating)
- Docker compose cannot run all services due to resource constraints
- Cannot get TimescaleDB or pgvector working locally
- Unsure about specific directory structure

---

**Ready to begin. Start with `docker-compose up` working, then build everything around that.**

**Good luck! 🚀**
