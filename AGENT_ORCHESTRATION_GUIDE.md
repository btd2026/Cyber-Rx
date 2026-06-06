# Agent Team Orchestration Guide
## CyberRX Multi-Agent Implementation Framework

**Document Version:** 1.0
**Purpose:** Guide for orchestrating agent teams to execute the CyberRX Implementation Plan

---

## Overview

This guide defines how specialized AI agents work together to build the CyberRX platform. The implementation follows a **Manager → Worker → Validator** pattern where agents collaborate to deliver production-ready code.

---

## Agent Roles and Responsibilities

### 1. Manager Agent
**Purpose:** Orchestration, planning, and validation coordination

**Responsibilities:**
- Reads implementation plan and task board
- Assigns tasks to appropriate worker agents
- Coordinates between worker agents
- Routes outputs to validator agents
- Maintains project status and checkpoints
- Escalates blockers to human

**Inputs:**
- Implementation plan
- Task board status
- Worker agent outputs
- Validator verdicts

**Outputs:**
- Task assignments
- Coordination messages
- Status reports
- Escalation requests

---

### 2. Worker Agents

#### Backend Engineer Agent
**Specialties:**
- Microservice architecture
- Database design and migrations
- API development (FastAPI, Express)
- Event streaming (Kafka, Event Hubs)
- Data normalization and ETL
- Financial modeling (Python, pandas)

**Typical Tasks:**
- Connector development (SIEM, EDR, IAM, claims)
- Risk normalization engine
- Financial modeling service
- Agent runtime infrastructure
- Alerting and notification systems

**Tools:**
- FastAPI, Express.js
- PostgreSQL, TimescaleDB
- Docker, Kubernetes
- Azure services
- Python pandas/numpy

---

#### AI/ML Engineer Agent
**Specialties:**
- Agent architecture design
- LLM integration (Claude Sonnet, Haiku)
- Prompt engineering
- Context management
- Output formatting and validation
- Agent coordination protocols

**Typical Tasks:**
- Agent runtime foundation
- CFO, CISO, Board, CRO, CLO, CIO agents
- Prompt template development
- Agent coordination system
- Output formatting and visualization

**Tools:**
- Anthropic Claude API
- Python, TypeScript
- LangChain or similar
- Vector databases
- LLM evaluation frameworks

---

#### Security Engineer Agent
**Specialties:**
- Tenant isolation architecture
- Authentication and authorization (OAuth 2.0, OIDC)
- HIPAA compliance
- SOC 2 preparation
- Encryption and key management
- Audit logging

**Typical Tasks:**
- Authentication and authorization
- Tenant isolation implementation
- PHI stripping services
- Compliance monitoring
- Security baseline documentation
- SOC 2 preparation

**Tools:**
- Azure AD, Okta
- Key Vault
- Security scanning tools
- Compliance frameworks
- Audit logging systems

---

#### Frontend Engineer Agent
**Specialties:**
- React/TypeScript development
- Role-specific dashboard design
- Data visualization
- Query interfaces
- PDF generation

**Typical Tasks:**
- CFO dashboard
- CISO dashboard
- Board dashboard
- CRO dashboard
- CLO dashboard
- CIO dashboard
- Alert feed interface
- On-demand query interface

**Tools:**
- React, TypeScript
- Charting libraries (D3, Plotly)
- PDF generation
- Vite
- Component libraries

---

#### Product Manager Agent
**Specialties:**
- Requirements gathering
- Customer onboarding
- Executive calibration
- User story development
- Roadmap planning

**Typical Tasks:**
- Customer onboarding sequence
- Business process graph construction
- Financial parameter configuration
- Executive calibration sessions
- Feedback compilation and prioritization

**Tools:**
- Interview guides
- Requirement documents
- Prioritization frameworks
- Communication tools

---

### 3. Validator Agents

#### Acceptance Validator
**Purpose:** Validate task meets acceptance criteria

**Checks:**
- All deliverables present
- Success criteria met
- Documentation complete
- User-facing requirements satisfied

**Output:** PASS/FAIL with feedback

---

#### Security Validator
**Purpose:** Validate security requirements

**Checks:**
- No PHI/PII in LLM calls
- Tenant isolation maintained
- Authentication enforced
- Authorization correct
- Audit logging present
- HIPAA compliance

**Output:** PASS/FAIL with security feedback

---

#### No-Regression Validator
**Purpose:** Validate no existing functionality broken

**Checks:**
- Existing tests pass
- No breaking changes to APIs
- Database migrations reversible
- Performance not degraded
- No new security vulnerabilities

**Output:** PASS/FAIL with regression details

---

#### Integration Validator
**Purpose:** Validate integration points work

**Checks:**
- Event streaming works
- API calls succeed
- Database queries correct
- LLM calls properly formatted
- Frontend connects to backend
- End-to-end flows work

**Output:** PASS/FAIL with integration issues

---

## Orchestration Patterns

### Pattern 1: Sequential Task Execution

```
Manager → Worker Agent → Implementation
         ↓
      Validator Team → 4 Verdicts
         ↓
      Manager → Status Update → Next Task
```

**Use when:** Tasks have clear dependencies

**Example:**
1. Backend Engineer implements SIEM connector
2. Validators check implementation
3. If all 4 validators PASS, Manager assigns next task
4. If any validator FAIL, Manager routes back to worker for fixes

---

### Pattern 2: Parallel Task Execution

```
Manager → Worker Agent 1 → Independent Task
         → Worker Agent 2 → Independent Task
         → Worker Agent 3 → Independent Task
         ↓
      Validator Team → All Tasks
         ↓
      Manager → Merge Results
```

**Use when:** Tasks are independent

**Example:**
1. Three connectors (SIEM, EDR, IAM) can be built in parallel
2. Backend Engineer works on all three simultaneously
3. Validators check all three
4. Manager merges results when all complete

---

### Pattern 3: Collaborative Task Execution

```
Manager → Worker Agent 1 (Backend) → API Definition
         ↓
      Manager → Worker Agent 2 (Frontend) → UI Implementation
         ↓
      Manager → Integration Validator → End-to-End Test
         ↓
      Manager → Status
```

**Use when:** Tasks require handoffs between agents

**Example:**
1. Backend Engineer defines API contract
2. Frontend Engineer implements UI against contract
3. Integration Validator validates end-to-end
4. Manager coordinates any needed changes

---

## Task Execution Flow

### Step 1: Manager Initializes Task

**Manager Agent:**
1. Reads task from implementation plan
2. Creates task workspace
3. Generates task prompt for worker
4. Assigns to appropriate worker agent

**Task Prompt Template:**
```
TASK: [Task ID]
TITLE: [Task Title]
PHASE: [Phase Number]
OWNER: [Worker Agent Type]

OBJECTIVE:
[Clear objective description]

DELIVERABLES:
- [Deliverable 1]
- [Deliverable 2]

SUCCESS CRITERIA:
- [Criteria 1]
- [Criteria 2]

DEPENDENCIES:
- [Any prerequisite tasks]

CONTEXT:
- [Relevant architectural decisions]
- [Related tasks]
- [Technical constraints]

OUTPUT REQUIREMENTS:
- Code in appropriate directory
- All tests passing
- Documentation updated
- Ready for validation
```

---

### Step 2: Worker Agent Executes Task

**Worker Agent:**
1. Receives task prompt
2. Reads relevant context (implementation plan, existing code)
3. Implements solution
4. Writes tests
5. Updates documentation
6. Creates pull request
7. Reports completion to Manager

**Worker Output Template:**
```
TASK COMPLETION REPORT
Task ID: [Task ID]
Agent: [Agent Type]

STATUS: ✓ COMPLETE | ✗ BLOCKED

DELIVERABLES:
[ ] Deliverable 1 - [Location]
[ ] Deliverable 2 - [Location]

CHANGES MADE:
- [File 1]: [Brief description]
- [File 2]: [Brief description]

TESTS:
- Unit tests: [Count] passing
- Integration tests: [Count] passing
- Coverage: [Percentage]%

DOCUMENTATION:
- [ ] README updated
- [ ] API docs updated
- [ ] Architecture decisions recorded

BLOCKERS:
[Any blockers encountered]

NEXT STEPS:
[Suggested next tasks]

VALIDATION REQUESTED:
[ ] Acceptance
[ ] Security
[ ] No-Regression
[ ] Integration
```

---

### Step 3: Validator Team Validates

**Each Validator Agent:**

**Acceptance Validator:**
```
ACCEPTANCE VALIDATION - Task [ID]

REQUIREMENTS CHECK:
[ ] All deliverables present
[ ] Success criteria met
[ ] User requirements satisfied
[ ] Documentation complete

VERDICT: PASS | FAIL

FEEDBACK:
[Specific feedback on acceptance criteria]
```

**Security Validator:**
```
SECURITY VALIDATION - Task [ID]

SECURITY CHECKS:
[ ] No PHI/PII in LLM calls
[ ] Tenant isolation maintained
[ ] Authentication enforced
[ ] Authorization correct
[ ] Audit logging present
[ ] Input validation added
[ ] Output encoding correct
[ ] No SQL injection vectors
[ ] No XSS vectors

VERDICT: PASS | FAIL

SECURITY FEEDBACK:
[Specific security feedback]
```

**No-Regression Validator:**
```
REGRESSION VALIDATION - Task [ID]

REGRESSION CHECKS:
[ ] Existing tests pass
[ ] No breaking API changes
[ ] Database migrations reversible
[ ] Performance not degraded
[ ] No new vulnerabilities
[ ] Backwards compatibility maintained

VERDICT: PASS | FAIL

REGRESSION DETAILS:
[Any regression concerns]
```

**Integration Validator:**
```
INTEGRATION VALIDATION - Task [ID]

INTEGRATION CHECKS:
[ ] Event streaming works
[ ] API calls succeed
[ ] Database queries correct
[ ] LLM calls properly formatted
[ ] Frontend connects to backend
[ ] End-to-end flows tested

VERDICT: PASS | FAIL

INTEGRATION ISSUES:
[Any integration problems]
```

---

### Step 4: Manager Processes Results

**Manager Agent:**

**If All 4 Validators PASS:**
```
TASK [ID] - VALIDATION COMPLETE ✓

Status: READY FOR MERGE

Actions:
- Mark task as complete
- Update task board
- Create checkpoint
- Assign next task(s)
- Notify human of milestone

Next Tasks:
- [List dependent tasks ready to start]
```

**If Any Validator FAIL:**
```
TASK [ID] - VALIDATION FAILED ✗

Status: REVISION REQUIRED

Failed Validators:
- [Validator 1]: [Brief issue]
- [Validator 2]: [Brief issue]

Actions:
- Route feedback to worker agent
- Request revisions
- Re-queue for validation

Revisions Required:
[Specific revision requests]
```

---

## Dependency Management

### Task Dependencies

**Phase 0 dependencies:**
```
T-FOUND-001 (Repository Setup)
    ↓
T-FOUND-002 (Cloud Infrastructure) ← T-FOUND-001
    ↓
T-FOUND-003 (Data Models) ← T-FOUND-002
    ↓
T-FOUND-004 (Authentication) ← T-FOUND-003
```

**Phase 1 dependencies:**
```
T-FOUND-004 (Authentication - complete)
    ↓
├─ T-MVP-001 (SIEM Connector)
├─ T-MVP-002 (EDR Connector)
├─ T-MVP-003 (IAM Connector)
├─ T-MVP-004 (Claims Connector)
    ↓
T-MVP-005 (Normalization Engine) ← All connectors
    ↓
T-MVP-006 (Financial Engine) ← Normalization
    ↓
T-MVP-007 (Agent Runtime) ← Financial Engine
    ↓
├─ T-MVP-008 (CFO Agent)
├─ T-MVP-009 (CISO Agent)
├─ T-MVP-010 (Board Agent)
    ↓ (parallel)
├─ T-MVP-011 (CFO Dashboard)
├─ T-MVP-012 (CISO Dashboard)
├─ T-MVP-013 (Board Dashboard)
    ↓
T-MVP-014 (Alerting)
T-MVP-015 (Compliance)
```

### Parallel Execution Strategy

**Week 3-4 (Phase 1 start):**
```
Backend Engineer:
├─ T-MVP-001 (SIEM Connector) - Week 3-4
└─ T-MVP-002 (EDR Connector) - Week 4-5

[These can overlap slightly]
```

**Week 12-15 (Agents + Frontend):**
```
AI/ML Engineer:
├─ T-MVP-008 (CFO Agent) - Week 12-13
├─ T-MVP-009 (CISO Agent) - Week 13-14
└─ T-MVP-010 (Board Agent) - Week 14-15

Frontend Engineer (in parallel):
├─ T-MVP-011 (CFO Dashboard) - Week 12-13
├─ T-MVP-012 (CISO Dashboard) - Week 13-14
└─ T-MVP-013 (Board Dashboard) - Week 14-15
```

---

## Checkpoint System

### Automatic Checkpoints

**Manager creates checkpoints:**
- After each phase completion
- After critical task completion
- Before risky changes
- After integration points

**Checkpoint contains:**
- Task board state
- All agent outputs
- Validation verdicts
- Current code state (git commit)
- Blockers and resolutions

### Recovery from Checkpoint

**If context crash occurs:**
1. Load latest checkpoint
2. Resume from last safe state
3. No duplicate work
4. Continue execution

---

## Human Escalation

### When to Escalate

**Manager escalates to human when:**
1. **Open Questions need answers** - Can't proceed without decision
2. **Validator conflict** - Validators disagree on PASS/FAIL
3. **Technical blocker** - No clear path forward
4. **Requirement ambiguity** - Can't determine correct implementation
5. **Security concern** - Potential security issue identified

### Escalation Template

```
ESCALATION REQUIRED
Task: [Task ID]
Type: [QUESTION | BLOCKER | CONFLICT]

Context:
[Background information]

Issue:
[Clear description of issue]

Options:
[A] Option A - [Pros/cons]
[B] Option B - [Pros/cons]
[C] Option C - [Pros/cons]

Recommendation:
[Agent recommendation]

Waiting for human decision.
```

---

## Agent Communication Patterns

### Manager → Worker
```
ASSIGNMENT: Task [ID]
[Prompt template with requirements]

Expected: Implementation + Tests + Docs
Deadline: [Timeline]
Validation: [Which validators needed]
```

### Worker → Manager
```
UPDATE: Task [ID] - [PERCENT]%
[Progress report]

BLOCKER: [If any blockers]

READY FOR VALIDATION: [When complete]
```

### Validator → Manager
```
VERDICT: Task [ID]
Status: PASS | FAIL
Feedback: [Specific feedback]
```

### Manager → Human
```
MILESTONE: [Phase/task complete]
Summary: [Brief summary]
Next: [Next steps]

OR

ESCALATION: [Issue]
Needs: [Human input]
```

---

## Quality Gates

### Phase 0 Gate
- [ ] Repository structure complete
- [ ] Cloud infrastructure deployed
- [ ] Data models defined
- [ ] Authentication working
- [ ] All validators pass

### Phase 1 Gate (MVP)
- [ ] All four connectors operational
- [ ] Normalization engine enriching events
- [ ] Financial engine calculating exposure
- [ ] Three agents generating briefings
- [ ] Three dashboards functional
- [ ] Pilot customer deployed
- [ ] All validators pass

### Phase 2 Gate (Pilot)
- [ ] Business process graph validated
- [ ] Financial parameters loaded
- [ ] All agents calibrated
- [ ] First briefing delivered
- [ ] CFO validates board readiness
- [ ] All validators pass

### Phase 3 Gate (Production)
- [ ] All six agents operational
- [ ] All data sources connected
- [ ] Multi-tenant architecture working
- [ ] SOC 2 Type II certified
- [ ] Production ready
- [ ] All validators pass

---

## Tool Integration

### Task Board
**Location:** `/workspace/task-board.json`

**Contains:**
- All tasks with status
- Dependencies
- Assignments
- Validation results

### Artifacts Directory
**Location:** `/workspace/artifacts/`

**Contains:**
- One output file per task
- Format: `T-XXX.out`
- Validation verdicts linked

### Verdicts Directory
**Location:** `/workspace/verdicts/`

**Contains:**
- One verdict file per validator per task
- Format: `T-XXX-[VALIDATOR]-VERDICT.md`

### Checkpoints Directory
**Location:** `/workspace/checkpoints/`

**Contains:**
- Board snapshots
- Agent states
- Recovery points

---

## Execution Timeline

### Weekly Rhythm

**Monday:**
- Manager reviews weekly goals
- Assigns tasks for week
- Sets up parallel work streams

**Tuesday-Wednesday:**
- Worker agents execute tasks
- Manager coordinates
- Validators validate completed tasks

**Thursday:**
- Manager reviews progress
- Addresses blockers
- Escalates if needed

**Friday:**
- Manager creates checkpoint
- Reports weekly status
- Plans next week

### Phase Transitions

**Phase → Phase:**
1. All tasks in phase complete
2. Quality gate passed
3. Human approval received
4. Checkpoint created
5. Next phase initiated

---

## Success Metrics

### Team Metrics
- Tasks completed per week
- Validation pass rate (target: 80%+ first pass)
- Blocker resolution time
- Human escalations (target: minimize)

### Quality Metrics
- Test coverage (target: 80%+)
- Security vulnerabilities (target: 0 critical)
- Performance benchmarks met
- Documentation completeness

### Delivery Metrics
- Phases completed on time
- Milestones achieved
- Customer acceptance criteria met

---

## Getting Started

### Initial Setup

1. **Human reviews** Implementation Plan and Orchestration Guide
2. **Human resolves** Open Questions (5 questions)
3. **Manager initializes** task board from plan
4. **Human assigns** agent types to tasks
5. **Manager begins** Phase 0 execution

### First Task Execution

**Manager:**
1. Assigns T-FOUND-001 to Backend Engineer
2. Provides task prompt
3. Sets expected deliverables

**Backend Engineer:**
1. Receives assignment
2. Implements repository structure
3. Creates Docker setup
4. Writes tests
5. Updates docs
6. Reports complete

**Validators:**
1. Validate implementation
2. Provide 4 verdicts

**Manager:**
1. Processes verdicts
2. If all PASS, marks complete
3. Assigns next task
4. If any FAIL, routes back for fixes

---

## Best Practices

### For Manager Agent
- Always validate dependencies before assigning tasks
- Create checkpoints regularly
- Escalate early when stuck
- Maintain clear task status
- Coordinate parallel work effectively

### For Worker Agents
- Read context before implementing
- Follow success criteria precisely
- Write comprehensive tests
- Document all changes
- Report blockers immediately

### For Validator Agents
- Validate against success criteria
- Provide specific, actionable feedback
- Check security thoroughly
- Test integrations
- Verify no regressions

### For Human
- Review and approve phase transitions
- Resolve escalations promptly
- Provide feedback on agent performance
- Adjust plan based on learnings
- Celebrate milestones!

---

## Conclusion

This orchestration framework enables efficient, coordinated agent teamwork to build CyberRX. Clear roles, defined patterns, and systematic validation ensure production-ready code delivery.

**Key to success:**
- Manager maintains coordination
- Workers focus on implementation
- Validators ensure quality
- Human provides oversight and direction

**Let's build CyberRX!**

---

**End of Orchestration Guide**
