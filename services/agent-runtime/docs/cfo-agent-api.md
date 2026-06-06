# CFO Agent API Documentation

Complete API reference for the CFO Agent endpoints.

**Version:** 1.0.0
**Last Updated:** 2025-06-06
**Base Path:** `/api/cfo`

---

## Overview

The CFO Agent API provides board-meeting-ready financial briefings for health plan executives. All endpoints require JWT authentication and validate NO PHI in responses.

**Key Features:**
- Generate financial risk briefings using Claude Sonnet
- Analyze dollar exposure by business process
- Calculate MLR (Medical Loss Ratio) impact
- Track exposure trends over time
- Support multiple output formats (JSON, Markdown, Summary)

---

## Authentication

All endpoints require JWT authentication via the `Authorization` header:

```http
Authorization: Bearer <jwt_token>
```

JWT tokens are obtained from the authentication service (T-FOUND-004).

---

## Endpoints

### 1. Generate CFO Briefing

**Endpoint:** `POST /api/cfo/agent/query`

**Description:** Generate board-meeting-ready financial briefing (PRIMARY ENDPOINT)

**Authentication:** Required

**Request Body:**

```json
{
  "organization_id": "org-123",
  "query": "What's our current dollar exposure and MLR impact?",
  "time_range": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-03-31T23:59:59Z"
  },
  "include_trends": true,
  "format_type": "json"
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| organization_id | string | Yes | Organization ID |
| query | string | Yes | Executive query (min 1 character) |
| time_range | object | No | Time range filter |
| include_trends | boolean | No | Include trend analysis (default: true) |
| format_type | string | No | Output format: json, markdown, summary (default: json) |

**Response (200 OK):**

```json
{
  "metadata": {
    "briefing_id": "uuid",
    "generated_at": "2025-06-06T12:00:00Z",
    "agent_type": "cfo",
    "format": "board_ready_briefing",
    "validation": {
      "is_valid": true,
      "errors": [],
      "warnings": []
    },
    "duration_seconds": 15.5
  },
  "executive_summary": {
    "summary": "Total exposure: $2.5M with 3.2% MLR impact across 12 risks...",
    "total_exposure": 2500000,
    "total_exposure_formatted": "$2.5M",
    "mlr_impact": 3.2,
    "top_risk_count": 12
  },
  "exposure_breakdown": {
    "total_exposure": 2500000,
    "total_exposure_formatted": "$2.5M",
    "by_business_process": [
      {
        "process": "Claims Adjudication",
        "exposure": 1000000,
        "exposure_formatted": "$1.0M",
        "percentage": 40.0,
        "mlr_impact": 5.0,
        "likelihood": 0.8
      }
    ],
    "by_risk_category": [
      {
        "category": "ransomware",
        "exposure": 1500000,
        "exposure_formatted": "$1.5M",
        "percentage": 60.0,
        "count": 5
      }
    ],
    "by_time_horizon": {
      "immediate": {
        "exposure": 500000,
        "exposure_formatted": "$500K",
        "percentage": 20.0
      },
      "30-days": {
        "exposure": 1000000,
        "exposure_formatted": "$1.0M",
        "percentage": 40.0
      },
      "90-days": {
        "exposure": 1000000,
        "exposure_formatted": "$1.0M",
        "percentage": 40.0
      }
    }
  },
  "mlr_impact_analysis": {
    "total_mlr_impact": 3.2,
    "total_mlr_impact_formatted": "3.2%",
    "top_ml_risks": [
      {
        "process": "Claims Adjudication",
        "mlr_impact": 5.0,
        "mlr_impact_formatted": "5.0%",
        "exposure": 1000000,
        "exposure_formatted": "$1.0M"
      }
    ]
  },
  "top_risks": [
    {
      "rank": 1,
      "title": "Ransomware attack on claims system",
      "exposure": 1000000,
      "exposure_formatted": "$1.0M",
      "mlr_impact": 5.0,
      "likelihood": 0.8,
      "likelihood_formatted": "80%",
      "business_process": "Claims Adjudication",
      "risk_category": "ransomware",
      "time_horizon": "immediate"
    }
  ],
  "trends": {
    "insights": [
      "CRITICAL: $500K in immediate exposure requires urgent attention",
      "HIGH VELOCITY: Exposure changing rapidly"
    ],
    "count": 2
  },
  "methodology_trail": {
    "steps": [
      "Data Source: 12 financial impacts from T-MVP-006",
      "Total Net Exposure: $2.5M (sum of all net_exposure fields)"
    ],
    "count": 10
  },
  "recommendations": {
    "items": [
      "Immediate: Address ransomware exposure in claims adjudication",
      "High: Review data breach controls in member portal"
    ],
    "count": 2,
    "priority_ordered": [
      {
        "recommendation": "Immediate: Address ransomware exposure",
        "priority": "urgent",
        "rank": 1
      }
    ]
  }
}
```

**Error Responses:**

* **400 Bad Request** - Invalid request or PHI detected
* **401 Unauthorized** - Invalid JWT token
* **500 Internal Server Error** - Server error or PHI validation failed
* **503 Service Unavailable** - CFO Agent not initialized

**Example Error Response:**

```json
{
  "detail": "Security validation failed. PHI detected in response."
}
```

---

### 2. Get Agent State

**Endpoint:** `GET /api/cfo/agent/state`

**Description:** Get CFO Agent current state and status

**Authentication:** Required

**Response (200 OK):**

```json
{
  "agent_id": "cfo",
  "status": "running",
  "config": {
    "organization_id": "org-123"
  },
  "state": {
    "last_briefing_id": "uuid",
    "briefings_generated": 10
  },
  "created_at": "2025-06-01T00:00:00Z",
  "updated_at": "2025-06-06T12:00:00Z"
}
```

---

### 3. Get Recent Briefings

**Endpoint:** `GET /api/cfo/agent/briefings?organization_id=org-123&limit=10`

**Description:** Get recent CFO briefings for organization

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| organization_id | string | Yes | Organization ID |
| limit | integer | No | Maximum briefings (default: 10) |

**Response (200 OK):**

```json
{
  "organization_id": "org-123",
  "count": 5,
  "briefings": [
    {
      "briefing_id": "uuid",
      "query": "What's our exposure?",
      "generated_at": "2025-06-06T12:00:00Z",
      "metadata": {...}
    }
  ]
}
```

---

### 4. Get Agent Metrics

**Endpoint:** `GET /api/cfo/agent/metrics?organization_id=org-123&metric_date=2025-06-06`

**Description:** Get CFO Agent usage metrics

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| organization_id | string | Yes | Organization ID |
| metric_date | string | No | Date (YYYY-MM-DD, default: today) |

**Response (200 OK):**

```json
{
  "agent_id": "cfo",
  "organization_id": "org-123",
  "metric_date": "2025-06-06",
  "briefings_generated": 10,
  "total_tokens_used": 70000,
  "total_cost": 0.45
}
```

---

### 5. Get Exposure Breakdown

**Endpoint:** `GET /api/cfo/exposure?organization_id=org-123&time_range=2025-01-01/2025-03-31`

**Description:** Get current exposure breakdown (fast endpoint for dashboards)

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| organization_id | string | Yes | Organization ID |
| time_range | string | No | Time range (ISO: YYYY-MM-DD/YYYY-MM-DD) |

**Response (200 OK):**

```json
{
  "organization_id": "org-123",
  "time_range": null,
  "exposure_analysis": {
    "total_exposure": 2500000,
    "by_business_process": [...],
    "by_risk_category": [...],
    "mlr_impact_analysis": {...},
    "top_risks": [...],
    "methodology_trail": [...]
  },
  "generated_at": "2025-06-06T12:00:00Z"
}
```

---

### 6. Get Exposure Trends

**Endpoint:** `GET /api/cfo/trends?organization_id=org-123&time_range=2025-01-01/2025-03-31`

**Description:** Get exposure trends (fast endpoint for trend charts)

**Authentication:** Required

**Query Parameters:** Same as exposure breakdown

**Response (200 OK):**

```json
{
  "organization_id": "org-123",
  "time_range": null,
  "trend_analysis": {
    "period_trends": {...},
    "emerging_risks": [...],
    "trend_velocity": {...},
    "anomalies": [...],
    "insights": [...]
  },
  "generated_at": "2025-06-06T12:00:00Z"
}
```

---

### 7. Health Check

**Endpoint:** `GET /api/cfo/health`

**Description:** Health check endpoint

**Authentication:** Not Required

**Response (200 OK):**

```json
{
  "status": "healthy",
  "service": "cfo-agent",
  "agent_initialized": true,
  "timestamp": "2025-06-06T12:00:00Z"
}
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request (invalid input, PHI detected) |
| 401 | Unauthorized (invalid JWT) |
| 404 | Not Found |
| 500 | Internal Server Error |
| 503 | Service Unavailable (agent not initialized) |

---

## Rate Limiting

Currently, no rate limiting is enforced. However, best practices include:

- Limit briefing generation to 1 request per minute per organization
- Cache exposure breakdown and trends for 5 minutes
- Implement exponential backoff for retries

---

## Cost Tracking

Each briefing generation incurs Claude API costs:

- **Input tokens:** ~5,000 tokens
- **Output tokens:** ~2,000 tokens
- **Cost per briefing:** ~$0.045
- **Daily cost (100 briefings):** ~$4.50
- **Monthly cost:** ~$135.00

Cost tracking is available via the `/metrics` endpoint.

---

## Security

### PHI Validation

All responses are validated for NO PHI before returning:

- Member IDs, patient names, MRNs are BLOCKED
- Claims details, diagnosis codes are BLOCKED
- Only business process names, system names, dollar amounts allowed

If PHI is detected, the request fails with a 400 or 500 error.

### JWT Authentication

All endpoints (except `/health`) require valid JWT token:

```http
Authorization: Bearer <your_jwt_token>
```

Tokens are obtained from the authentication service (T-FOUND-004).

---

## Examples

### cURL Examples

**Generate Briefing:**

```bash
curl -X POST https://api.cyberrx.com/api/cfo/agent/query \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "org-123",
    "query": "What is our current MLR impact?",
    "include_trends": true,
    "format_type": "json"
  }'
```

**Get Exposure Breakdown:**

```bash
curl -X GET "https://api.cyberrx.com/api/cfo/exposure?organization_id=org-123" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Get Trends:**

```bash
curl -X GET "https://api.cyberrx.com/api/cfo/trends?organization_id=org-123" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Python Examples

```python
import requests
import json

# Configuration
BASE_URL = "https://api.cyberrx.com"
JWT_TOKEN = "your_jwt_token"
ORG_ID = "org-123"

# Headers
headers = {
    "Authorization": f"Bearer {JWT_TOKEN}",
    "Content-Type": "application/json"
}

# Generate briefing
response = requests.post(
    f"{BASE_URL}/api/cfo/agent/query",
    headers=headers,
    json={
        "organization_id": ORG_ID,
        "query": "What is our current MLR impact?",
        "include_trends": True
    }
)

briefing = response.json()
print(json.dumps(briefing, indent=2))

# Get exposure breakdown
response = requests.get(
    f"{BASE_URL}/api/cfo/exposure",
    headers=headers,
    params={"organization_id": ORG_ID}
)

exposure = response.json()
print(f"Total Exposure: {exposure['exposure_analysis']['total_exposure']}")
```

---

## Support

For API support, contact:

- **Email:** support@cyberrx.com
- **Documentation:** https://docs.cyberrx.com
- **GitHub Issues:** https://github.com/cyberrx/cyberrx/issues
