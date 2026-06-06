# CyberRX Quick Reference Guide
## For Human Oversight of Agent Teams

**Version:** 1.0
**Status:** Ready for Execution

---

## 📋 What Are We Building?

**CyberRX** = Multi-agent AI platform for health plans

**What it does:**
- Deploys inside health plan's cloud (read-only, tenant-isolated)
- Reads security/operational data continuously
- Produces role-specific intelligence briefings for C-suite
- Six roles: CFO, CRO, CLO, CIO, CISO, Board

**Key differentiator:** NOT an AI wrapper
- Dollar figures from deterministic calculations, not LLM hallucination
- Business process graph maps systems to operations
- Agents maintain persistent state (not stateless)
- Tenant isolation at infrastructure level (not prompt level)
- Every output traceable to source (auditable and defensible)

---

## 📁 Documentation Structure

| File | Purpose |
|------|---------|
| `CYBERRX_IMPLEMENTATION_PLAN.md` | Complete technical implementation plan |
| `AGENT_ORCHESTRATION_GUIDE.md` | How agents work together |
| `QUICK_REFERENCE.md` | This file - quick navigation |

---

## 🚀 Quick Start - Week 1

### Step 1: Resolve Open Questions (Week 1-2)

**5 Questions MUST be answered before engineering starts:**

1. **Actuarial Data Access** - Data warehouse exports or API access?
2. **Claims Platform** - Which platform does pilot customer use?
3. **LLM Data Boundary** - Legal sign-off on no PHI in API calls?
4. **SSO Federation** - Will customer use Azure AD/Okta federation?
5. **Threat Intel Feed** - Licensed (CrowdStrike, Recorded Future) or public (CISA KEV)?

**Who:** Product Manager + Security Engineer + Engineering Lead

### Step 2: Assign Agent Team

**Required Agents:**
- 1 × Manager Agent (orchestration)
- 2 × Senior Backend Engineers (microservices, connectors)
- 1 × AI/ML Engineer (agents, LLM integration)
- 1 × Security Engineer (isolation, compliance)
- 1 × Frontend Engineer (dashboards)
- 1 × Product Manager (onboarding, requirements)

**Plus 4 Validator Agents:**
- Acceptance Validator
- Security Validator
- No-Regression Validator
- Integration Validator

### Step 3: Initialize Task Board

**Manager Agent creates task board from plan:**
```
/workspace/task-board.json
```

### Step 4: Begin Phase 0 Execution

**Manager assigns first task:**
- T-FOUND-001: Repository Structure & Dev Environment
- Assigned to: Senior Backend Engineer
- Timeline: Week 1-2

---

## 📊 Three-Phase Execution

### Phase 0: Foundation (Weeks 1-2)

**Goal:** Infrastructure and architecture setup

**Tasks:**
1. T-FOUND-001: Repository & dev environment
2. T-FOUND-002: Cloud infrastructure
3. T-FOUND-003: Core data models
4. T-FOUND-004: Authentication & authorization

**Gate:** All infrastructure ready, auth working

---

### Phase 1: MVP - Three Agents (Weeks 3-16)

**Goal:** Production MVP for single customer

**Scope:**
- **3 Agents:** CFO, CISO, Board
- **4 Connectors:** SIEM (Splunk), EDR (CrowdStrike), IAM (Azure AD), Claims
- **3 Dashboards:** CFO, CISO, Board views

**Critical Path:**
```
Weeks 3-7:  Connectors (SIEM, EDR, IAM, Claims)
Weeks 7-9:  Risk normalization engine
Weeks 9-11: Financial modeling engine
Weeks 11-12: Agent runtime foundation
Weeks 12-15: Three agents (CFO, CISO, Board)
Weeks 12-15: Three dashboards (parallel with agents)
Weeks 15-16: Alerting + compliance
```

**MVP Success Criterion:**
"CFO can walk into board meeting, cite a dollar exposure figure, defend it with methodology trail, and CISO confirms accuracy."

**Gate:** Pilot deployed, first briefing delivered

---

### Phase 2: Pilot Onboarding (Weeks 17-20)

**Goal:** Deploy to pilot customer and validate

**Tasks:**
1. T-PILOT-001: Environment setup
2. T-PILOT-002: Business process graph (CRITICAL)
3. T-PILOT-003: Financial parameters
4. T-PILOT-004: Agent calibration
5. T-PILOT-005: Validate MVP success criterion

**Gate:** CFO validated in board meeting, CISO confirmed accuracy

---

### Phase 3: Production Scale (Weeks 21-28)

**Goal:** Production-ready, all agents, multi-tenant

**Additions:**
- **3 More Agents:** CRO, CLO, CIO
- **More Connectors:** PBM, vendor, clearinghouse, actuarial, regulatory
- **Multi-tenant:** Automated provisioning, per-tenant isolation
- **SOC 2:** Complete Type II certification

**Gate:** SOC 2 certified, production ready

---

## 🤖 Agent Orchestration Pattern

### Standard Task Flow

```
1. Manager assigns task → Worker Agent
   ↓
2. Worker implements → Tests + Docs
   ↓
3. Validators check → 4 verdicts
   ↓
4. Manager processes:
   - All PASS → Complete, next task
   - Any FAIL → Revise, re-validate
```

### Parallel Execution

**Independent tasks run in parallel:**
- Multiple connectors can be built simultaneously
- Agents and dashboards developed in parallel
- Validation runs in parallel across validators

**Manager coordinates:**
- Assigns parallel tasks
- Tracks dependencies
- Merges results when complete

---

## ✅ Quality Gates

### Each Task Must Pass 4 Validators

**Acceptance Validator:**
- [ ] All deliverables present
- [ ] Success criteria met
- [ ] Documentation complete

**Security Validator:**
- [ ] No PHI/PII in LLM calls
- [ ] Tenant isolation maintained
- [ ] Authentication enforced
- [ ] Audit logging present

**No-Regression Validator:**
- [ ] Existing tests pass
- [ ] No breaking changes
- [ ] Performance not degraded

**Integration Validator:**
- [ ] API calls succeed
- [ ] Database queries work
- [ ] End-to-end flows tested

---

## 📂 Project Structure

```
/cyberrx
  /infrastructure          # Terraform, Kubernetes configs
  /services                # Backend microservices
    /ingestion             # Connectors (SIEM, EDR, IAM, claims)
    /normalization         # Risk normalization engine
    /financial             # Financial modeling (Python/pandas)
    /agents                # Agent runtime and 6 agents
    /alerting              # Threshold breach, notifications
  /frontend                # React dashboards (6 views)
  /libraries               # Shared types, utilities
  /docs                    # Architecture, API docs
/workspace
  /task-board.json         # Live task status
  /artifacts/              # Agent outputs (T-XXX.out)
  /verdicts/               # Validation results
  /checkpoints/            # Recovery points
```

---

## 🔑 Key Technical Decisions

### Why This Architecture?

| Decision | Rationale |
|----------|-----------|
| **Read-only** | No risk to customer systems |
| **Tenant isolation** | Infrastructure guarantee, not prompt constraint |
| **Deterministic financial modeling** | Defensible in board meetings |
| **Business process graph** | Maps systems to operations (customer-specific) |
| **Agent state persistence** | Real trend analysis, not inferred |
| **Methodology trails** | Audit-ready, CMS-proof |

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Cloud** | Azure (primary), AWS (secondary) |
| **Containers** | Kubernetes (AKS/EKS) |
| **Event bus** | Azure Event Hubs / Kafka |
| **Database** | TimescaleDB + pgvector |
| **LLM** | Anthropic Claude (Sonnet/Haiku) |
| **Financial** | Python (pandas, numpy) |
| **API** | FastAPI (Python) |
| **Auth** | OAuth 2.0 + OIDC |
| **Frontend** | React + TypeScript |

---

## 🎯 Success Metrics

### Phase 0 (Foundation)
- [ ] Dev environment running locally
- [ ] Cloud infrastructure deployed
- [ ] Authentication working

### Phase 1 (MVP)
- [ ] 4 connectors pulling data
- [ ] Normalization enriching events
- [ ] Financial engine calculating exposure
- [ ] 3 agents generating briefings
- [ ] 3 dashboards functional
- [ ] Pilot deployed

### Phase 2 (Pilot)
- [ ] Business process graph built
- [ ] Financial parameters loaded
- [ ] Agents calibrated
- [ ] First briefing delivered
- [ ] CFO board-ready validated

### Phase 3 (Production)
- [ ] 6 agents operational
- [ ] All data sources connected
- [ ] Multi-tenant working
- [ ] SOC 2 certified

---

## ⚠️ Common Pitfalls - Avoid These

### ❌ Don't Overflow Context
- **NEVER** read entire `src/App.jsx` (24,539 lines)
- **NEVER** load entire assessment document
- **USE** index files to find line ranges
- **READ** only necessary chunks

### ❌ Don't Skip Validation
- Every task must pass 4 validators
- No "it's probably fine" - validate
- Security validator is non-negotiable
- Integration validation critical

### ❌ Don't Break Dependencies
- Respect task order in critical path
- Don't start agent work before normalization
- Don't build dashboards before APIs

### ❌ Don't Ignore Security
- PHI must be stripped before LLM calls
- Tenant isolation is infrastructure, not prompt
- Authentication on all endpoints
- Audit everything

---

## 🚨 When to Escalate to Human

**Manager escalates when:**

1. **Open Questions Block Progress**
   - Can't proceed without answer
   - Decision affects architecture

2. **Validator Conflict**
   - Validators disagree on PASS/FAIL
   - Need human judgment

3. **Technical Blocker**
   - No clear technical path
   - Requires research or experimentation

4. **Requirement Ambiguity**
   - Success criteria unclear
   - Conflicting requirements

5. **Security Concern**
   - Potential vulnerability found
   - Compliance issue identified

---

## 📞 Human Responsibilities

### Weekly Rhythm

**Monday:**
- Review weekly goals
- Approve task assignments
- Resolve escalations

**Thursday:**
- Review progress
- Address blockers
- Adjust plan if needed

**Friday:**
- Review checkpoint
- Approve phase transitions
- Provide feedback

### Phase Transitions

**Human must approve:**
- Phase 0 → Phase 1 (Foundation ready)
- Phase 1 → Phase 2 (MVP complete)
- Phase 2 → Phase 3 (Pilot validated)
- Phase 3 → Production (SOC 2 certified)

### Critical Decisions

**Human decides:**
- Open Questions (5 questions)
- Phase transitions
- Major architecture changes
- Security/compliance issues
- Customer feedback integration

---

## 🎉 Milestones to Celebrate

### 🏆 Phase 0 Complete
**Infrastructure ready!**

### 🏆 Phase 1 Complete
**MVP delivered!**
- First customer deployed
- Three agents working
- Three dashboards live

### 🏆 Phase 2 Complete
**Pilot validated!**
- CFO defended in board meeting
- CISO confirmed accuracy
- Methodology trails held up

### 🏆 Phase 3 Complete
**Production ready!**
- All six agents operational
- Multi-tenant architecture
- SOC 2 certified
- Ready to scale

---

## 🔍 Quick Links

**Want to understand the architecture?**
→ Read `CYBERRX_IMPLEMENTATION_PLAN.md` sections 1-3

**Want to know how agents work together?**
→ Read `AGENT_ORCHESTRATION_GUIDE.md` patterns section

**Want to see task breakdown?**
→ Check `workspace/task-board.json` (once initialized)

**Want to understand validation?**
→ Read `AGENT_ORCHESTRATION_GUIDE.md` validator section

**Want to see what's built?**
→ Check `/workspace/artifacts/` for task outputs

---

## 📋 Checklist - Ready to Start?

**Pre-Execution Checklist:**

- [ ] Implementation plan reviewed
- [ ] Orchestration guide understood
- [ ] 5 open questions answered
- [ ] Agent team assigned
- [ ] Task board initialized
- [ ] Phase 0 tasks approved
- [ ] Manager agent ready to coordinate
- [ ] Worker agents understand roles
- [ ] Validators ready
- [ ] Human oversight scheduled

**When all checked - BEGIN EXECUTION!**

---

## 💡 Pro Tips

### For Manager Agent
- Create checkpoints liberally
- Escalate early, not late
- Coordinate parallel work
- Maintain clear status

### For Worker Agents
- Read context first
- Follow success criteria
- Write comprehensive tests
- Document everything

### For Human
- Trust but verify
- Review checkpoints
- Celebrate milestones
- Provide feedback
- Stay engaged

---

## 🚀 Let's Build CyberRX!

**Target:** Production-ready multi-agent AI platform for health plans

**Timeline:** 28 weeks to production

**Team:** Manager + Workers + Validators + Human oversight

**Success:** CFO walks into board meeting with defendable dollar exposure figures

**Let's go!**

---

**End of Quick Reference**

For detailed information, see:
- `CYBERRX_IMPLEMENTATION_PLAN.md` - Full technical plan
- `AGENT_ORCHESTRATION_GUIDE.md` - Agent coordination patterns
