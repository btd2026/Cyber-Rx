# Task Assignment: T-MVP-007
## Agent Runtime Foundation for CyberRX Multi-Agent AI Platform

---

**Task ID:** T-MVP-007
**Title:** Agent Runtime Foundation
**Assigned To:** AI/ML Engineer
**Phase:** Phase 1 - Third-Party Cyber Intelligence MVP
**Weeks:** 11-12
**Estimated Hours:** 80 hours
**Priority:** 🔴 CRITICAL PATH - UNLOCKS ALL AGENTS

---

## OBJECTIVE

Build the Agent Runtime Foundation that provides the core infrastructure for running AI agents (CFO, CISO, Board) with Claude LLM integration, persistent state management, prompt template orchestration, structured output formatting, and PHI boundary validation. This is the foundational runtime that all AI agents depend on.

**What we're building:** A robust, production-ready AI agent runtime service that:
1. Maintains persistent agent state (memory, context, briefings)
2. Calls Claude Sonnet API with prompt templates
3. Formats structured outputs (JSON for frontend consumption)
4. Validates NO PHI in LLM context (security boundary)
5. Orchestrates agent lifecycle (start, stop, query, update)
6. Handles LLM API failures gracefully

**Your mission:** Build the foundational AI infrastructure that enables the CFO, CISO, and Board agents to generate executive briefings safely and reliably.

---

## ARCHITECTURE CONTEXT

### Agent Runtime Architecture

```
[Financial Engine (T-MVP-006)] → [TimescaleDB: financial_impacts] → [Agent Runtime]
                                                                          │
                                                                          ├─→ [Agent State Manager]
                                                                          │
                                                                          ├─→ [Claude LLM Client]
                                                                          │
                                                                          ├─→ [Prompt Template System]
                                                                          │
                                                                          ├─→ [Structured Output Formatter]
                                                                          │
                                                                          ├─→ [PHI Boundary Validator]
                                                                          │
                                                                          └─→ [Agent Lifecycle Manager]
                                                                              │
                                                                              ▼
                                                          [CFO Agent (T-MVP-008)]
                                                          [CISO Agent (T-MVP-009)]
                                                          [Board Agent (T-MVP-010)]
```

**Critical Insight:** The Agent Runtime is the foundation for ALL AI agents. Without it, we have no AI capabilities. This is the bridge between our data engines and executive intelligence.

### Security Boundary: NO PHI IN LLM CALLS

**CRITICAL REQUIREMENT:** The Agent Runtime must validate that NO Protected Health Information (PHI) reaches the Claude LLM. This is a HIPAA security boundary.

**What MUST NOT reach Claude:**
- ❌ Member IDs, patient names, medical record numbers
- ❌ Dates of birth, Social Security numbers
- ❌ Claims details, diagnosis codes, procedure codes
- ❌ Provider names, medical facility names
- ❌ Any direct identifiers under HIPAA

**What CAN reach Claude:**
- ✅ Business process names (e.g., "claims-adjudication")
- ✅ System names (e.g., "server-1", "database-3")
- ✅ Risk categories (e.g., "malware-detection", "auth-failure")
- ✅ Financial exposure amounts (e.g., "$1.2M exposure")
- ✅ Blast radius descriptions (e.g., "affects 3 downstream processes")
- ✅ Regulatory triggers (e.g., "HIPAA breach notification required")
- ✅ Likelihood scores and confidence levels

**How We Achieve This:**
1. **Upstream PHI Stripping:** T-MVP-005 already strips PHI before enrichment
2. **Double Validation:** Agent Runtime validates NO PHI before LLM call
3. **Fail-Safe:** If PHI detected, abort LLM call and alert security

### Data Flow

```
[Risk/Final Data from T-MVP-006]
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

## DELIVERABLES

### 1. Agent Runtime Container

**Location:** `/services/agent-runtime/src/agent_runtime.py`

**Responsibilities:**
- Manage agent lifecycle (start, stop, query)
- Maintain persistent agent state in database
- Handle incoming briefing requests
- Orchestrate LLM calls with prompt templates
- Return structured briefings to frontend
- Track agent metrics (briefings generated, LLM costs)
- Handle LLM API failures with retries

**Interface:**
```python
class AgentRuntime:
    def __init__(self, db_pool, claude_client, prompt_manager, phi_validator):
        """Initialize agent runtime with services."""

    async def start_agent(self, agent_id: str, config: AgentConfig) -> AgentState:
        """
        Initialize and start an agent with configuration.

        Args:
            agent_id: Agent identifier (e.g., "cfo", "ciso", "board")
            config: Agent configuration (temperature, max_tokens, etc.)

        Returns:
            AgentState: Initial agent state
        """

    async def stop_agent(self, agent_id: str) -> None:
        """Stop an agent and persist final state."""

    async def query_agent(
        self,
        agent_id: str,
        query: str,
        context: dict
    ) -> AgentBriefing:
        """
        Query an agent and generate briefing.

        This is the CORE method that agents use:
        1. Load agent state
        2. Select appropriate prompt template
        3. Build context (PHI validation)
        4. Call Claude LLM
        5. Parse structured output
        6. Update agent state
        7. Return briefing

        Args:
            agent_id: Agent identifier
            query: Executive query (e.g., "What's our current exposure?")
            context: Additional context (time_range, risk_categories, etc.)

        Returns:
            AgentBriefing: Structured briefing with insights
        """

    async def get_agent_state(self, agent_id: str) -> AgentState:
        """Retrieve current agent state."""

    async def update_agent_config(self, agent_id: str, config: AgentConfig) -> None:
        """Update agent configuration."""
```

**Success Criteria:**
- ✅ Agents can be started and stopped
- ✅ Agent state persists across restarts
- ✅ Queries return structured briefings
- ✅ LLM failures handled gracefully
- ✅ Metrics tracked (briefings, costs)

---

### 2. Context Manager Service

**Location:** `/services/agent-runtime/src/context_manager.py`

**Responsibilities:**
- Load financial impacts from T-MVP-006
- Load enriched risk objects from T-MVP-005
- Aggregate data for agent context
- Apply time filters, risk category filters
- Format data for LLM consumption
- Validate NO PHI in context

**Interface:**
```python
class ContextManager:
    def __init__(self, db_pool, phi_validator):
        """Initialize context manager."""

    async def load_financial_context(
        self,
        time_range: TimeRange,
        risk_categories: List[str]
    ) -> List[FinancialImpact]:
        """
        Load financial impacts from T-MVP-006.

        Returns financial impacts matching criteria.
        """

    async def load_risk_context(
        self,
        time_range: TimeRange,
        likelihood_min: float
    ) -> List[RiskObject]:
        """
        Load enriched risk objects from T-MVP-005.

        Returns risk objects matching criteria.
        """

    async def build_agent_context(
        self,
        agent_id: str,
        query: str,
        time_range: TimeRange
    ) -> dict:
        """
        Build complete context for agent query.

        This is where we assemble ALL data an agent needs:
        1. Financial impacts (T-MVP-006)
        2. Risk objects (T-MVP-005)
        3. Agent state (memory, previous briefings)
        4. Query metadata

        CRITICAL: Validates NO PHI before returning.

        Returns:
            dict: Context ready for LLM prompt injection
        """

    async def validate_no_phi(self, context: dict) -> bool:
        """
        Validate that context contains NO PHI.

        Checks for:
        - Member IDs, patient names, MRNs
        - DOBs, SSNs
        - Claims details, diagnosis codes
        - Provider names

        Returns:
            bool: True if NO PHI detected, False otherwise
        """
```

**Success Criteria:**
- ✅ Loads financial impacts correctly
- ✅ Loads risk objects correctly
- ✅ Aggregates data for agent context
- ✅ Validates NO PHI in context
- ✅ Formats data for LLM consumption

---

### 3. Claude LLM Client

**Location:** `/services/agent-runtime/src/claude_client.py`

**Responsibilities:**
- Call Claude Sonnet API (claude-3-5-sonnet-20241022)
- Handle API authentication (Anthropic API key)
- Implement retry logic with exponential backoff
- Handle rate limiting (429) gracefully
- Track token usage and costs
- Log LLM calls for audit trail

**Interface:**
```python
class ClaudeClient:
    def __init__(self, api_key: str, max_retries: int = 3):
        """Initialize Claude client with API key."""

    async def call_claude(
        self,
        prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.7
    ) -> str:
        """
        Call Claude Sonnet API with prompt.

        Args:
            prompt: Formatted prompt for Claude
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature (0.0 - 1.0)

        Returns:
            str: Claude response text

        Raises:
            LLMAPIError: If API call fails after retries
            RateLimitError: If rate limit exceeded
        """

    async def call_claude_with_structured_output(
        self,
        prompt: str,
        output_schema: dict,
        max_tokens: int = 4096
    ) -> dict:
        """
        Call Claude with structured output expectation.

        Uses Claude's structured output feature to ensure
        response matches output_schema (JSON).

        Args:
            prompt: Formatted prompt
            output_schema: JSON schema for expected output
            max_tokens: Maximum tokens

        Returns:
            dict: Parsed structured output matching schema
        """

    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """
        Estimate cost in USD for tokens used.

        Claude Sonnet pricing:
        - Input: $3.00 per million tokens
        - Output: $15.00 per million tokens

        Returns:
            float: Cost in USD
        """
```

**Success Criteria:**
- ✅ Calls Claude Sonnet API successfully
- ✅ Handles API failures with retries
- ✅ Tracks token usage and costs
- ✅ Logs all LLM calls for audit

---

### 4. Prompt Template System

**Location:** `/services/agent-runtime/src/prompt_manager.py`

**Responsibilities:**
- Manage prompt templates for each agent
- Load templates from filesystem
- Inject context into templates
- Validate template syntax
- Version templates for reproducibility
- Support template variables ({{context}}, {{query}}, etc.)

**Template Directory Structure:**
```
/services/agent-runtime/prompts/
  ├── cfo/
  │   ├── briefing.txt
  │   ├── trend_analysis.txt
  │   └── board_summary.txt
  ├── ciso/
  │   ├── briefing.txt
  │   ├── attack_analysis.txt
  │   └── coordination.txt
  └── board/
      ├── governance_brief.txt
      └── synthesis.txt
```

**Template Format (Jinja2):**
```jinja2
You are the CFO Agent for CyberRX, a cyber risk intelligence platform for health plans.

CURRENT CONTEXT:
Time Range: {{time_range}}
Total Exposure: {{total_exposure}}

FINANCIAL IMPACTS:
{% for impact in financial_impacts %}
- {{impact.business_process}}: ${{impact.exposure}} (MLR impact: {{impact.mlr_impact}}%)
{% endfor %}

EXECUTIVE QUERY:
{{query}}

TASK:
Generate a CFO briefing that addresses the executive query above. Your briefing should:
1. Summarize current dollar exposure with breakdown
2. Highlight trends over the time range
3. Identify top 3 risk categories by exposure
4. Provide methodology trail for each figure

Respond in JSON format:
{
  "briefing_summary": "...",
  "exposure_breakdown": {...},
  "trends": [...],
  "top_risks": [...],
  "methodology_trail": [...]
}
```

**Interface:**
```python
class PromptManager:
    def __init__(self, template_dir: str):
        """Initialize prompt manager with template directory."""

    def load_template(self, agent_id: str, template_name: str) -> str:
        """
        Load prompt template from filesystem.

        Args:
            agent_id: Agent identifier (e.g., "cfo")
            template_name: Template name (e.g., "briefing")

        Returns:
            str: Raw template content
        """

    def render_template(
        self,
        template: str,
        context: dict
    ) -> str:
        """
        Render template with context injection.

        Uses Jinja2 to inject variables into template.

        Args:
            template: Raw template string
            context: Variables for injection

        Returns:
            str: Rendered prompt ready for LLM
        """

    def validate_template(self, template: str) -> bool:
        """
        Validate template syntax.

        Returns:
            bool: True if template valid, False otherwise
        """
```

**Success Criteria:**
- ✅ Templates load from filesystem
- ✅ Context injects correctly
- ✅ Templates render to valid prompts
- ✅ Template versions tracked

---

### 5. Structured Output Formatter

**Location:** `/services/agent-runtime/src/output_formatter.py`

**Responsibilities:**
- Parse structured JSON output from Claude
- Validate output against expected schema
- Handle malformed JSON gracefully
- Format output for frontend consumption
- Generate error messages if output invalid

**Interface:**
```python
class OutputFormatter:
    def __init__(self):
        """Initialize output formatter."""

    def parse_structured_output(
        self,
        llm_response: str,
        output_schema: dict
    ) -> dict:
        """
        Parse structured output from Claude response.

        Args:
            llm_response: Raw response text from Claude
            output_schema: Expected JSON schema

        Returns:
            dict: Parsed structured output

        Raises:
            OutputFormatError: If response doesn't match schema
        """

    def format_for_frontend(self, briefing: dict) -> dict:
        """
        Format briefing for frontend consumption.

        Ensures consistent structure for frontend rendering.

        Args:
            briefing: Raw agent briefing

        Returns:
            dict: Formatted briefing for frontend
        """

    def generate_error_message(self, error: Exception) -> dict:
        """
        Generate user-friendly error message.

        Args:
            error: Exception from LLM or parsing

        Returns:
            dict: Error message for frontend
        """
```

**Success Criteria:**
- ✅ Parses structured JSON output
- ✅ Validates against schema
- ✅ Handles malformed JSON gracefully
- ✅ Formats for frontend consumption

---

### 6. PHI Boundary Validator

**Location:** `/services/agent-runtime/src/phi_validator.py`

**Responsibilities:**
- Validate NO PHI in LLM context
- Detect member IDs, patient names, MRNs
- Detect DOBs, SSNs, claims details
- Detect provider names, medical facilities
- Abort LLM call if PHI detected
- Alert security if PHI detected

**Interface:**
```python
class PHIValidator:
    def __init__(self):
        """Initialize PHI validator with patterns."""

    def validate_no_phi(self, context: dict) -> ValidationResult:
        """
        Validate that context contains NO PHI.

        This is a CRITICAL security boundary. NO PHI should reach Claude.

        Args:
            context: Context dictionary for LLM

        Returns:
            ValidationResult: {
                "valid": bool,
                "phi_detected": bool,
                "phi_matches": List[str],
                "error_message": str
            }
        """

    def scan_for_phi(self, text: str) -> List[str]:
        """
        Scan text for PHI patterns.

        Patterns to detect:
        - Member IDs (alphanumeric, 8-20 chars)
        - Patient names (title case + last name)
        - MRNs (medical record numbers)
        - DOBs (date patterns)
        - SSNs (social security numbers)
        - Claims IDs (numeric, 6-15 digits)
        - ICD-10 codes (diagnosis codes)
        - CPT codes (procedure codes)
        - Provider names (medical entities)

        Returns:
            List[str]: List of PHI matches found
        """
```

**Success Criteria:**
- ✅ Detects common PHI patterns
- ✅ Validates context before LLM call
- ✅ Aborts if PHI detected
- ✅ Logs security alerts

---

### 7. Agent State Persistence

**Location:** `/services/agent-runtime/src/state_manager.py`

**Responsibilities:**
- Persist agent state to database
- Load agent state from database
- Track agent lifecycle (start, stop)
- Store briefings in database
- Maintain agent memory (previous briefings)

**Database Schema:**
```sql
-- Agent states
CREATE TABLE agent_states (
    agent_id VARCHAR(50) PRIMARY KEY,
    agent_type VARCHAR(50) NOT NULL,  -- 'cfo', 'ciso', 'board'
    status VARCHAR(20) NOT NULL,     -- 'running', 'stopped', 'error'
    config JSONB NOT NULL,            -- Agent configuration
    state JSONB NOT NULL,             -- Current agent state
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Agent briefings
CREATE TABLE agent_briefings (
    briefing_id UUID PRIMARY KEY,
    agent_id VARCHAR(50) NOT NULL REFERENCES agent_states(agent_id),
    query TEXT NOT NULL,
    context JSONB NOT NULL,
    briefing JSONB NOT NULL,
    generated_at TIMESTAMP NOT NULL,
    token_cost DECIMAL(10, 4)
);

-- Agent metrics
CREATE TABLE agent_metrics (
    agent_id VARCHAR(50) NOT NULL REFERENCES agent_states(agent_id),
    metric_date DATE NOT NULL,
    briefings_generated INTEGER NOT NULL,
    total_tokens_used BIGINT NOT NULL,
    total_cost DECIMAL(10, 4) NOT NULL,
    PRIMARY KEY (agent_id, metric_date)
);
```

**Interface:**
```python
class StateManager:
    def __init__(self, db_pool):
        """Initialize state manager with database pool."""

    async def load_agent_state(self, agent_id: str) -> AgentState:
        """Load agent state from database."""

    async def save_agent_state(self, agent_id: str, state: AgentState) -> None:
        """Save agent state to database."""

    async def store_briefing(
        self,
        agent_id: str,
        query: str,
        context: dict,
        briefing: dict,
        token_cost: float
    ) -> str:
        """Store briefing in database."""

    async def get_recent_briefings(
        self,
        agent_id: str,
        limit: int = 10
    ) -> List[AgentBriefing]:
        """Get recent briefings for agent."""

    async def update_metrics(
        self,
        agent_id: str,
        tokens_used: int,
        cost: float
    ) -> None:
        """Update agent metrics."""
```

**Success Criteria:**
- ✅ Agent state persists across restarts
- ✅ Briefings stored in database
- ✅ Metrics tracked correctly
- ✅ Previous briefings loadable

---

## TECHNICAL REQUIREMENTS

### Dependencies

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

### Configuration

**Environment Variables:**
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

# Cost Tracking
COST_TRACKING_ENABLED=true
COST_ALERT_THRESHOLD=100.0  # Alert if daily cost > $100
```

### API Endpoints

**FastAPI Service:**
```python
# /services/agent-runtime/src/api.py
from fastapi import FastAPI
from .agent_runtime import AgentRuntime

app = FastAPI(title="Agent Runtime API")

@app.post("/agents/{agent_id}/start")
async def start_agent(agent_id: str, config: AgentConfig):
    """Start an agent."""
    pass

@app.post("/agents/{agent_id}/stop")
async def stop_agent(agent_id: str):
    """Stop an agent."""
    pass

@app.post("/agents/{agent_id}/query")
async def query_agent(agent_id: str, query: str, context: dict):
    """Query an agent and generate briefing."""
    pass

@app.get("/agents/{agent_id}/state")
async def get_agent_state(agent_id: str):
    """Get current agent state."""
    pass

@app.get("/agents/{agent_id}/briefings")
async def get_agent_briefings(agent_id: str, limit: int = 10):
    """Get recent agent briefings."""
    pass
```

---

## SUCCESS CRITERIA

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

### Nice to Have (P2)
- ⚡ Prompt template caching
- ⚡ Cost optimization (token estimation)
- ⚡ Agent performance analytics

---

## TESTING REQUIREMENTS

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

## DELIVERABLE ARTIFACTS

1. **Code:**
   - `/services/agent-runtime/src/agent_runtime.py`
   - `/services/agent-runtime/src/context_manager.py`
   - `/services/agent-runtime/src/claude_client.py`
   - `/services/agent-runtime/src/prompt_manager.py`
   - `/services/agent-runtime/src/output_formatter.py`
   - `/services/agent-runtime/src/phi_validator.py`
   - `/services/agent-runtime/src/state_manager.py`
   - `/services/agent-runtime/src/api.py`

2. **Templates:**
   - `/services/agent-runtime/prompts/cfo/briefing.txt`
   - `/services/agent-runtime/prompts/ciso/briefing.txt`
   - `/services/agent-runtime/prompts/board/briefing.txt`

3. **Database:**
   - Migration scripts for agent tables
   - Sample data for testing

4. **Documentation:**
   - Agent Runtime API documentation
   - PHI validation guide
   - Prompt template authoring guide
   - Troubleshooting guide

5. **Tests:**
   - Unit tests (pytest)
   - Integration tests
   - Security tests (PHI validation)

---

## COMPLETION CHECKLIST

### Code Completion
- [ ] Agent runtime container implemented
- [ ] Context manager implemented
- [ ] Claude LLM client implemented
- [ ] Prompt template system implemented
- [ ] Structured output formatter implemented
- [ ] PHI boundary validator implemented
- [ ] State manager implemented
- [ ] API endpoints implemented

### Database
- [ ] Migration scripts created
- [ ] Tables created (agent_states, agent_briefings, agent_metrics)
- [ ] Sample data loaded

### Templates
- [ ] CFO briefing template created
- [ ] CISO briefing template created
- [ ] Board briefing template created
- [ ] Templates tested

### Testing
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Security tests written and passing
- [ ] PHI validation tested with known patterns

### Documentation
- [ ] API documentation complete
- [ ] PHI validation guide complete
- [ ] Template authoring guide complete
- [ ] Troubleshooting guide complete

### Validation
- [ ] Acceptance criteria validated
- [ ] Security criteria validated
- [ ] Integration criteria validated
- [ ] No-regression criteria validated

---

## NEXT STEPS

After T-MVP-007 completion, the following tasks are UNBLOCKED:

1. **T-MVP-008: CFO Agent** (80 hours)
   - Implements CFO-specific context and prompts
   - Uses Agent Runtime for briefing generation

2. **T-MVP-009: CISO Agent** (100 hours)
   - Implements CISO-specific context and prompts
   - Uses Agent Runtime for briefing generation

3. **T-MVP-010: Board Agent** (80 hours)
   - Implements Board-specific context and prompts
   - Uses Agent Runtime for briefing generation

These 3 tasks can run IN PARALLEL once T-MVP-007 is complete.

---

## NOTES

**Critical Success Factor:** The Agent Runtime is the foundation for ALL AI agents. It must be:
1. **Reliable:** LLM failures must not crash agents
2. **Secure:** NO PHI in LLM calls (HIPAA boundary)
3. **Performant:** Agents must respond in < 30 seconds
4. **Observable:** Metrics tracking for costs and performance

**Dependencies:**
- T-MVP-005 (Risk Normalization) ✅ COMPLETE
- T-MVP-006 (Financial Modeling) ✅ COMPLETE
- T-FOUND-004 (Authentication) ✅ COMPLETE

**Unblocks:**
- T-MVP-008 (CFO Agent)
- T-MVP-009 (CISO Agent)
- T-MVP-010 (Board Agent)

**Estimated Cost:** $50-100/month in Claude API costs (at ~100 briefings/day)

---

**Good luck! This task unlocks the AI capabilities of the entire platform. 🚀**
