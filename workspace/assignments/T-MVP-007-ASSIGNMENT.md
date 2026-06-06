# TASK ASSIGNMENT: T-MVP-007
## Agent Runtime Foundation Implementation

---

**To:** AI/ML Engineer
**From:** Autonomous Coordination Agent
**Date:** 2025-06-06 13:35 CST
**Task ID:** T-MVP-007
**Priority:** 🔴 CRITICAL PATH
**Branch:** `task/T-MVP-007-agent-runtime`
**Estimated:** 80 hours
**Dependencies:** ✅ ALL MET

---

## 📋 ASSIGNMENT OVERVIEW

You are assigned **T-MVP-007: Agent Runtime Foundation**, the foundational infrastructure for all AI agents in the CyberRX Multi-Agent Platform.

**Why This Matters:**
This task UNLOCKS the entire agent wave (T-MVP-008, T-MVP-009, T-MVP-010). Without it, we have no AI capabilities. You are building the bridge between our data engines and executive intelligence.

**What You're Building:**
A production-ready AI agent runtime that:
1. Maintains persistent agent state (memory, context, briefings)
2. Calls Claude Sonnet API with prompt templates
3. Formats structured outputs (JSON for frontend)
4. Validates NO PHI in LLM context (HIPAA security boundary)
5. Orchestrates agent lifecycle (start, stop, query, update)

---

## 📦 ASSIGNMENT PACKAGE

### 1. Task Prompt (READ THIS FIRST)
**Location:** `/workspace/prompts/T-MVP-007-task-prompt.md`
**Length:** ~47,000 characters
**Contents:**
- Complete technical specifications
- Architecture diagrams and data flows
- 7 deliverables with detailed requirements
- Security requirements (PHI validation)
- Testing requirements
- Success criteria

**Action:** Read the full task prompt before starting.

### 2. Implementation Artifact Template
**Location:** `/workspace/artifacts/T-MVP-007-TEMPLATE.out`
**Purpose:** Your completion report template
**Action:** Fill this out when you complete the task.

### 3. Branch Status
**Branch:** `task/T-MVP-007-agent-runtime`
**Status:** ✅ CREATED - Ready for development
**Current Commit:** e570b46 (docs: Add T-MVP-007 implementation artifact template)

**Action:** Start implementing on this branch.

---

## 🎯 DELIVERABLES (7 Components)

### 1. Agent Runtime Container
**File:** `/services/agent-runtime/src/agent_runtime.py`
**What:** Core orchestration service for agent lifecycle
**Key Methods:**
- `start_agent()` - Initialize and start an agent
- `query_agent()` - Query an agent and generate briefing
- `stop_agent()` - Stop an agent and persist state

### 2. Context Manager Service
**File:** `/services/agent-runtime/src/context_manager.py`
**What:** Load and aggregate data for agent context
**Key Methods:**
- `load_financial_context()` - Load from T-MVP-006
- `load_risk_context()` - Load from T-MVP-005
- `build_agent_context()` - Assemble complete context
- `validate_no_phi()` - Security validation

### 3. Claude LLM Client
**File:** `/services/agent-runtime/src/claude_client.py`
**What:** Claude Sonnet API integration
**Key Methods:**
- `call_claude()` - Call Claude API
- `call_claude_with_structured_output()` - Get structured JSON
- `estimate_cost()` - Track token costs

### 4. Prompt Template System
**File:** `/services/agent-runtime/src/prompt_manager.py`
**What:** Manage and render prompt templates
**Key Methods:**
- `load_template()` - Load template from filesystem
- `render_template()` - Inject context with Jinja2
**Templates:** 3 templates (CFO, CISO, Board)

### 5. Structured Output Formatter
**File:** `/services/agent-runtime/src/output_formatter.py`
**What:** Parse and validate Claude responses
**Key Methods:**
- `parse_structured_output()` - Parse JSON from Claude
- `format_for_frontend()` - Format for frontend

### 6. PHI Boundary Validator
**File:** `/services/agent-runtime/src/phi_validator.py`
**What:** Validate NO PHI in LLM context (CRITICAL)
**Key Methods:**
- `validate_no_phi()` - Validate context before LLM call
- `scan_for_phi()` - Detect PHI patterns

### 7. Agent State Persistence
**File:** `/services/agent-runtime/src/state_manager.py`
**What:** Persist agent state to database
**Key Methods:**
- `load_agent_state()` - Load from database
- `save_agent_state()` - Save to database
- `store_briefing()` - Store generated briefings

---

## 🔒 SECURITY REQUIREMENTS

### CRITICAL: NO PHI IN LLM CALLS
**This is a HIPAA security boundary.**

**What MUST NOT reach Claude:**
- ❌ Member IDs, patient names, medical record numbers
- ❌ Dates of birth, Social Security numbers
- ❌ Claims details, diagnosis codes, procedure codes
- ❌ Provider names, medical facility names

**What CAN reach Claude:**
- ✅ Business process names (e.g., "claims-adjudication")
- ✅ System names (e.g., "server-1", "database-3")
- ✅ Risk categories (e.g., "malware-detection")
- ✅ Financial exposure amounts (e.g., "$1.2M exposure")
- ✅ Blast radius descriptions
- ✅ Regulatory triggers (e.g., "HIPAA breach notification required")

**How We Achieve This:**
1. **Upstream:** T-MVP-005 already strips PHI before enrichment
2. **Double Validation:** Agent Runtime validates NO PHI before LLM call
3. **Fail-Safe:** If PHI detected, abort LLM call and alert security

---

## 📊 DATA FLOW

```
[T-MVP-006: Financial Engine] → [TimescaleDB: financial_impacts]
[T-MVP-005: Risk Normalization] → [Kafka: enriched-risk-objects]
                                          │
                                          ▼
                              [Agent Runtime Receives Query]
                                          │
                                          ├─→ [Load Agent State]
                                          │
                                          ├─→ [Select Prompt Template]
                                          │
                                          ├─→ [Build Context (NO PHI CHECK)]
                                          │
                                          ├─→ [Call Claude Sonnet API]
                                          │
                                          ├─→ [Parse Structured Output]
                                          │
                                          ├─→ [Store Briefing in Database]
                                          │
                                          └─→ [Return Briefing to Frontend]
```

---

## 🛠️ TECHNICAL STACK

**Required:**
- Python 3.11+
- Asyncio (async/await)
- PostgreSQL (TimescaleDB) for state persistence
- Anthropic Claude API (claude-3-5-sonnet-20241022)
- Jinja2 for template rendering
- JSON schema validation

**Libraries:**
```txt
anthropic>=0.18.0
jinja2>=3.1.0
asyncpg>=0.29.0  # PostgreSQL async client
pydantic>=2.0.0  # Data validation
python-dotenv>=1.0.0
```

**Configuration:**
```bash
# Claude API
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Database
DATABASE_URL=postgresql://user:pass@localhost/cyberrx

# Agent Runtime
AGENT_RUNTIME_HOST=0.0.0.0
AGENT_RUNTIME_PORT=8000
LOG_LEVEL=INFO
```

---

## ✅ SUCCESS CRITERIA

### Must Have (P0)
- ✅ Agent runtime container operational
- ✅ Claude Sonnet API calls working
- ✅ Prompt template system functional
- ✅ Structured output formatting working
- ✅ PHI boundary validation operational
- ✅ Agent state persistence working
- ✅ Metrics tracking (briefings, costs)

### Should Have (P1)
- ✅ Retry logic with exponential backoff
- ✅ Rate limiting handling
- ✅ Error handling and logging
- ✅ API health checks
- ✅ Template versioning

---

## 🧪 TESTING REQUIREMENTS

### Unit Tests
- ✅ Test agent lifecycle (start, stop, query)
- ✅ Test context building
- ✅ Test PHI validation (detect patterns)
- ✅ Test prompt template rendering
- ✅ Test structured output parsing
- ✅ Test state persistence

### Integration Tests
- ✅ Test end-to-end agent query
- ✅ Test Claude API integration
- ✅ Test database persistence
- ✅ Test API endpoints

### Security Tests
- ✅ Test PHI detection (known PHI patterns)
- ✅ Test LLM context validation
- ✅ Test API authentication

---

## 📝 DOCUMENTATION REQUIREMENTS

Create these documentation files:

1. **API Documentation:** `/services/agent-runtime/docs/api.md`
   - All API endpoints documented
   - Request/response schemas
   - Error codes

2. **PHI Validation Guide:** `/services/agent-runtime/docs/phi-validation.md`
   - How PHI validation works
   - Patterns detected
   - What to do if PHI detected

3. **Template Authoring Guide:** `/services/agent-runtime/docs/template-authoring.md`
   - How to write prompt templates
   - Jinja2 syntax
   - Best practices

4. **Troubleshooting Guide:** `/services/agent-runtime/docs/troubleshooting.md`
   - Common issues and solutions
   - Debug tips
   - Performance tuning

---

## 🚀 GETTING STARTED

### Step 1: Read Task Prompt
```bash
cat /workspace/prompts/T-MVP-007-task-prompt.md
```

### Step 2: Set Up Environment
```bash
# Activate your Python environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install anthropic jinja2 asyncpg pydantic python-dotenv

# Set environment variables
cp .env.example .env
# Edit .env with your Claude API key
```

### Step 3: Create Directory Structure
```bash
mkdir -p services/agent-runtime/src
mkdir -p services/agent-runtime/prompts/cfo
mkdir -p services/agent-runtime/prompts/ciso
mkdir -p services/agent-runtime/prompts/board
mkdir -p services/agent-runtime/docs
mkdir -p services/agent-runtime/tests
```

### Step 4: Start Implementing
Follow the task prompt specifications for each deliverable.

### Step 5: Test
```bash
# Run unit tests
pytest services/agent-runtime/tests/unit/

# Run integration tests
pytest services/agent-runtime/tests/integration/

# Run security tests
pytest services/agent-runtime/tests/security/
```

### Step 6: Create Completion Artifact
```bash
cp /workspace/artifacts/T-MVP-007-TEMPLATE.out /workspace/artifacts/T-MVP-007.out
# Fill out the template with your implementation details
```

### Step 7: Commit and Report
```bash
git add .
git commit -m "feat: Implement Agent Runtime Foundation (T-MVP-007)"
# Notify coordinator that task is complete
```

---

## 📊 WHAT YOU UNBLOCK

**Your task completion UNLOCKS 3 parallel tasks:**

1. **T-MVP-008: CFO Agent** (80 hours)
   - Uses your Agent Runtime for CFO briefings
   - Status: BLOCKED → READY TO START

2. **T-MVP-009: CISO Agent** (100 hours)
   - Uses your Agent Runtime for CISO briefings
   - Status: BLOCKED → READY TO START

3. **T-MVP-010: Board Agent** (80 hours)
   - Uses your Agent Runtime for Board briefings
   - Status: BLOCKED → READY TO START

**And then unblocks frontend wave:**
- T-MVP-011: Frontend CFO Dashboard
- T-MVP-012: Frontend CISO Dashboard
- T-MVP-013: Frontend Board Dashboard

**Total Impact:** Your 80-hour task unblocks 7 downstream tasks totaling ~580 hours of work.

---

## 📈 EXPECTATIONS

### Timeline
- **Start:** 2025-06-06
- **Complete:** 2025-06-15 (9 days, 80 hours)
- **Check-ins:** Autonomous coordinator will check every 24 hours

### Quality Standards
- **Code Quality:** Production-ready, well-documented
- **Test Coverage:** >80% for critical paths
- **Security:** NO PHI in LLM calls (validated)
- **Performance:** Agent queries < 30 seconds

### Communication
- **Autonomous Mode:** Coordinator will monitor progress via git commits
- **Blockers:** Escalate if stuck > 24 hours
- **Questions:** Document in code comments or create GitHub issues

---

## 🆘 SUPPORT AND ESCALATION

### If You Need Help:
1. **Technical Questions:** Create GitHub issue with label `help-needed`
2. **Blockers:** Create GitHub issue with label `blocker` (escalates immediately)
3. **Security Issues:** Create GitHub issue with label `security` (escalates immediately)

### Available Resources:
- **Task Prompt:** `/workspace/prompts/T-MVP-007-task-prompt.md` (comprehensive specs)
- **T-MVP-005 Code:** Risk Normalization Engine (data source)
- **T-MVP-006 Code:** Financial Modeling Engine (data source)
- **T-FOUND-003 Code:** Data models and schemas

---

## ✅ CHECKLIST

Use this checklist to track your progress:

### Code Implementation
- [ ] Agent runtime container (`agent_runtime.py`)
- [ ] Context manager (`context_manager.py`)
- [ ] Claude LLM client (`claude_client.py`)
- [ ] Prompt template system (`prompt_manager.py`)
- [ ] Structured output formatter (`output_formatter.py`)
- [ ] PHI boundary validator (`phi_validator.py`)
- [ ] State manager (`state_manager.py`)
- [ ] API endpoints (`api.py`)

### Prompt Templates
- [ ] CFO briefing template
- [ ] CISO briefing template
- [ ] Board briefing template

### Database
- [ ] Migration scripts created
- [ ] Tables created (agent_states, agent_briefings, agent_metrics)

### Testing
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Security tests written and passing

### Documentation
- [ ] API documentation complete
- [ ] PHI validation guide complete
- [ ] Template authoring guide complete
- [ ] Troubleshooting guide complete

### Completion Artifact
- [ ] Fill out `/workspace/artifacts/T-MVP-007.out`
- [ ] Commit all code to branch
- [ ] Notify coordinator

---

## 🎯 SUMMARY

**Your Mission:** Build the Agent Runtime Foundation that enables AI agents to generate executive briefings safely and reliably.

**Key Success Factor:** The Agent Runtime is the foundation for ALL AI agents. It must be reliable, secure, performant, and observable.

**Impact:** Your 80-hour task unblocks 7 downstream tasks (~580 hours of work).

**Autonomous Coordinator Status:** ACTIVE - Monitoring progress via git commits.

---

**GOOD LUCK! This is a critical task that unlocks the AI capabilities of the entire platform. 🚀**

**Questions? Refer to the comprehensive task prompt or create a GitHub issue.**

---

**Assignment Status:** ✅ READY FOR YOUR ATTENTION
**Branch:** `task/T-MVP-007-agent-runtime`
**Start:** When ready
**Complete:** 2025-06-15 (target)

*Autonomous Coordination Agent - 2025-06-06 13:35 CST*
