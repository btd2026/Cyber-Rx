# Agent Runtime API Documentation

**Version:** 1.0.0
**Service:** Agent Runtime API
**Purpose:** AI Agent Runtime Service for CyberRX Multi-Agent Platform

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Agent Configuration](#agent-configuration)
5. [Briefing Format](#briefing-format)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)

---

## Overview

The Agent Runtime API provides REST endpoints for managing AI agents (CFO, CISO, Board) that generate executive briefings on cyber risk.

### Key Capabilities

- **Agent Lifecycle:** Start, stop, and query AI agents
- **Briefing Generation:** Query agents for executive insights
- **State Management:** Persistent agent state and metrics
- **PHI Security:** HIPAA-compliant validation (NO PHI in LLM calls)

### Architecture

```
Frontend → Agent Runtime API → Agent Runtime Service
                                        ↓
                                   Claude LLM
                                        ↓
                                   Database
```

---

## Authentication

### JWT Authentication

The Agent Runtime API uses JWT authentication (integrated with T-FOUND-004).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Configuration:**
- JWT Secret: Configure via `JWT_SECRET` environment variable
- JWT Algorithm: HS256
- Token Expiration: 3600 seconds (1 hour)

**Example:**
```bash
curl -H "Authorization: Bearer eyJhbGc..." \
  http://localhost:8000/agents/cfo/state
```

---

## API Endpoints

### Health Check

Check service health status.

**Endpoint:** `GET /health`

**Authentication:** None required

**Response:**
```json
{
  "status": "healthy",
  "service": "agent-runtime",
  "timestamp": "2025-01-31T12:00:00Z"
}
```

**Example:**
```bash
curl http://localhost:8000/health
```

---

### Start Agent

Initialize and start an agent with configuration.

**Endpoint:** `POST /agents/{agent_id}/start`

**Authentication:** Required

**Path Parameters:**
- `agent_id` (string): Agent identifier (`cfo`, `ciso`, `board`)

**Request Body:**
```json
{
  "config": {
    "temperature": 0.7,
    "max_tokens": 4096,
    "timeout": 30,
    "retry_attempts": 3
  }
}
```

**Response:**
```json
{
  "agent_id": "cfo",
  "agent_type": "cfo",
  "status": "running",
  "config": {
    "temperature": 0.7,
    "max_tokens": 4096,
    "timeout": 30,
    "retry_attempts": 3
  },
  "state": {},
  "created_at": "2025-01-31T12:00:00Z",
  "updated_at": "2025-01-31T12:00:00Z",
  "last_briefing_id": null,
  "briefings_generated": 0,
  "total_tokens_used": 0,
  "total_cost": 0.0
}
```

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"config": {"temperature": 0.7, "max_tokens": 4096}}' \
  http://localhost:8000/agents/cfo/start
```

**Python Example:**
```python
import requests

headers = {"Authorization": f"Bearer {token}"}
data = {
    "config": {
        "temperature": 0.7,
        "max_tokens": 4096
    }
}

response = requests.post(
    "http://localhost:8000/agents/cfo/start",
    headers=headers,
    json=data
)

agent_state = response.json()
```

---

### Stop Agent

Stop an agent and persist final state.

**Endpoint:** `POST /agents/{agent_id}/stop`

**Authentication:** Required

**Path Parameters:**
- `agent_id` (string): Agent identifier

**Response:**
```json
{
  "message": "Agent cfo stopped successfully",
  "timestamp": "2025-01-31T12:00:00Z"
}
```

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:8000/agents/cfo/stop
```

---

### Query Agent

Query an agent and generate briefing (PRIMARY ENDPOINT).

**Endpoint:** `POST /agents/{agent_id}/query`

**Authentication:** Required

**Path Parameters:**
- `agent_id` (string): Agent identifier

**Request Body:**
```json
{
  "query": "What's our current cyber exposure?",
  "time_start": "2025-01-01T00:00:00Z",
  "time_end": "2025-01-31T23:59:59Z",
  "risk_categories": ["ransomware", "malware"],
  "likelihood_min": 0.5,
  "template": "briefing"
}
```

**Request Parameters:**
- `query` (string, required): Executive query (1-1000 characters)
- `time_start` (datetime, required): Query start time
- `time_end` (datetime, required): Query end time
- `risk_categories` (array, optional): Risk category filter
- `likelihood_min` (float, optional): Minimum likelihood threshold (0.0-1.0)
- `template` (string, optional): Template name (default: "briefing")

**Response:**
```json
{
  "briefing_id": "brf-123",
  "agent_id": "cfo",
  "query": "What's our current cyber exposure?",
  "context": {
    "time_range": {...},
    "financial_impacts": [...],
    "risk_objects": [...],
    "summary": {...}
  },
  "briefing": {
    "briefing_summary": "...",
    "exposure_breakdown": {...},
    "trends": [...],
    "top_risks": [...],
    "methodology_trail": [...]
  },
  "generated_at": "2025-01-31T12:00:00Z",
  "token_cost": 0.15,
  "input_tokens": 5000,
  "output_tokens": 2000
}
```

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What'\''s our current cyber exposure?",
    "time_start": "2025-01-01T00:00:00Z",
    "time_end": "2025-01-31T23:59:59Z"
  }' \
  http://localhost:8000/agents/cfo/query
```

**Python Example:**
```python
import requests
from datetime import datetime

headers = {"Authorization": f"Bearer {token}"}
data = {
    "query": "What's our current cyber exposure?",
    "time_start": "2025-01-01T00:00:00Z",
    "time_end": "2025-01-31T23:59:59Z"
}

response = requests.post(
    "http://localhost:8000/agents/cfo/query",
    headers=headers,
    json=data
)

briefing = response.json()
print(f"Briefing: {briefing['briefing']['briefing_summary']}")
```

---

### Get Agent State

Retrieve current agent state.

**Endpoint:** `GET /agents/{agent_id}/state`

**Authentication:** Required

**Path Parameters:**
- `agent_id` (string): Agent identifier

**Response:**
```json
{
  "agent_id": "cfo",
  "agent_type": "cfo",
  "status": "running",
  "config": {...},
  "state": {},
  "created_at": "2025-01-31T12:00:00Z",
  "updated_at": "2025-01-31T12:00:00Z",
  "last_briefing_id": "brf-123",
  "briefings_generated": 45,
  "total_tokens_used": 225000,
  "total_cost": 4.50
}
```

**Example:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/agents/cfo/state
```

---

### Update Agent Config

Update agent configuration.

**Endpoint:** `PUT /agents/{agent_id}/config`

**Authentication:** Required

**Path Parameters:**
- `agent_id` (string): Agent identifier

**Request Body:**
```json
{
  "config": {
    "temperature": 0.8,
    "max_tokens": 8192
  }
}
```

**Response:**
```json
{
  "message": "Agent cfo configuration updated",
  "timestamp": "2025-01-31T12:00:00Z"
}
```

**Example:**
```bash
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"config": {"temperature": 0.8}}' \
  http://localhost:8000/agents/cfo/config
```

---

### Get Agent Briefings

Retrieve recent agent briefings.

**Endpoint:** `GET /agents/{agent_id}/briefings`

**Authentication:** Required

**Path Parameters:**
- `agent_id` (string): Agent identifier

**Query Parameters:**
- `limit` (integer, optional): Maximum briefings to return (default: 10)

**Response:**
```json
[
  {
    "briefing_id": "brf-123",
    "agent_id": "cfo",
    "query": "What's our exposure?",
    "context": {...},
    "briefing": {...},
    "generated_at": "2025-01-31T12:00:00Z",
    "token_cost": 0.15,
    "input_tokens": 5000,
    "output_tokens": 2000
  }
]
```

**Example:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/agents/cfo/briefings?limit=5
```

---

### Get Agent Metrics

Retrieve agent usage metrics.

**Endpoint:** `GET /agents/{agent_id}/metrics`

**Authentication:** Required

**Path Parameters:**
- `agent_id` (string): Agent identifier

**Query Parameters:**
- `metric_date` (string, optional): Date in YYYY-MM-DD format (default: today)

**Response:**
```json
{
  "agent_id": "cfo",
  "metric_date": "2025-01-31",
  "briefings_generated": 45,
  "total_tokens_used": 225000,
  "total_cost": 4.50
}
```

**Example:**
```bash
# Today's metrics
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/agents/cfo/metrics

# Specific date
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/agents/cfo/metrics?metric_date=2025-01-31
```

---

## Agent Configuration

### Agent Types

| Agent ID | Type | Purpose |
|----------|------|---------|
| `cfo` | CFO | Financial risk and MLR impact analysis |
| `ciso` | CISO | Security threat and mitigation prioritization |
| `board` | Board | Governance-level risk oversight |

### Configuration Options

```json
{
  "temperature": 0.7,        // Sampling temperature (0.0 - 1.0)
  "max_tokens": 4096,       // Maximum tokens in response
  "timeout": 30,            // Request timeout in seconds
  "retry_attempts": 3       // Number of retry attempts
}
```

**Temperature:**
- `0.0`: Deterministic, focused responses
- `0.7`: Balanced creativity and consistency (recommended)
- `1.0`: Highly creative, varied responses

**Max Tokens:**
- Range: 1 - 8192
- Recommended: 4096 for most queries
- Higher: For complex, detailed briefings

**Timeout:**
- Range: 5 - 120 seconds
- Recommended: 30 seconds
- Adjust based on query complexity

---

## Briefing Format

All briefings follow a structured JSON format for frontend consumption.

### CFO Briefing Structure

```json
{
  "briefing_summary": "Executive summary",
  "exposure_breakdown": {
    "total_exposure": 0.00,
    "by_business_process": [...],
    "by_risk_category": [...],
    "by_time_horizon": {...}
  },
  "mlr_impact_analysis": {...},
  "top_risks": [...],
  "trends": [...],
  "methodology_trail": [...],
  "recommendations": [...]
}
```

### CISO Briefing Structure

```json
{
  "briefing_summary": "Security posture summary",
  "attack_vectors": [...],
  "mitigation_priorities": [...],
  "cascade_risks": [...],
  "coordination_points": [...],
  "security_posture": {...},
  "methodology_trail": [...],
  "recommendations": [...]
}
```

### Board Briefing Structure

```json
{
  "executive_summary": "Governance-level summary",
  "material_risks": [...],
  "risk_assessment": {...},
  "stakeholder_perspectives": {...},
  "key_insights": [...],
  "governance_recommendations": [...],
  "regulatory_compliance": {...},
  "methodology_trail": [...],
  "oversight_questions": [...]
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": true,
  "error_type": "ValidationError",
  "user_message": "Invalid request parameter",
  "technical_message": "temperature must be between 0.0 and 1.0",
  "severity": "error",
  "timestamp": "2025-01-31T12:00:00Z"
}
```

### Common Error Codes

| HTTP Code | Error Type | Description |
|-----------|------------|-------------|
| 400 | ValidationError | Invalid request parameters |
| 401 | AuthenticationError | Missing or invalid JWT |
| 403 | AuthorizationError | Insufficient permissions |
| 404 | NotFoundError | Agent or resource not found |
| 429 | RateLimitError | Rate limit exceeded |
| 500 | InternalError | Server error |
| 503 | ServiceUnavailable | Claude API unavailable |

### Retry Strategy

For transient errors (429, 500, 503):
- Retry with exponential backoff
- Max retries: 3
- Initial delay: 1 second
- Backoff multiplier: 2.0

---

## Rate Limiting

### Default Limits

- Per agent: 60 requests per minute
- Per IP: 100 requests per minute

### Rate Limit Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1706707200
```

### Rate Limit Error Response

```json
{
  "error": true,
  "error_type": "RateLimitError",
  "user_message": "Rate limit exceeded. Please retry in 30 seconds.",
  "retry_after": 30
}
```

---

## OpenAPI Documentation

Interactive API documentation available at:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## Quick Start

### 1. Start the Service

```bash
cd services/agent-runtime
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
python run.py
```

### 2. Start an Agent

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"config": {"temperature": 0.7}}' \
  http://localhost:8000/agents/cfo/start
```

### 3. Query an Agent

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What'\''s our current exposure?",
    "time_start": "2025-01-01T00:00:00Z",
    "time_end": "2025-01-31T23:59:59Z"
  }' \
  http://localhost:8000/agents/cfo/query
```

---

## Support

For issues or questions:
- Documentation: `/services/agent-runtime/docs/`
- Troubleshooting Guide: `troubleshooting-guide.md`
- Task: T-MVP-007
