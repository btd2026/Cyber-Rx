# Risk Objects API

## Overview

The Risk Objects API provides CRUD operations for managing risk objects in the CyberRX platform. Risk objects are the canonical representation of risk that flows through the entire system.

**Base URL:** `https://api.cyberrx.com/api/v1`

**Authentication:** Bearer token (JWT)

**Content-Type:** `application/json`

---

## Create RiskObject

### Request

```http
POST /api/v1/risk-objects
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

### Request Body

```json
{
  "source": "splunk",
  "source_event_id": "splunk-event-123",
  "category": "threat",
  "affected_assets": ["server-1", "server-2"],
  "business_process_map": ["claims-adjudication"],
  "likelihood_score": 0.8,
  "blast_radius": ["database-1", "edi-gateway"],
  "financial_exposure": {
    "mlr_impact": 0.02,
    "mlr_impact_confidence": 0.85,
    "stop_loss_exposure": 500000,
    "stop_loss_attachment": 250000,
    "stop_loss_aggregate": 5000000,
    "stop_loss_remaining": 4500000,
    "reserve_at_risk": 750000,
    "reserve_type": "case_reserve",
    "premium_revenue_risk": 1200000,
    "line_of_business": "Commercial",
    "total_exposure": 2700000,
    "total_exposure_confidence": 0.82,
    "methodology": "Calculation engine v1.0: Sum of MLR impact + Stop-loss exposure + Reserve at risk + Premium revenue risk",
    "methodology_version": "1.0.0",
    "calculation_timestamp": "2025-06-06T12:00:00Z",
    "sources": [
      {
        "source": "actuarial_export",
        "timestamp": "2025-06-06T10:00:00Z",
        "data_quality_score": 0.90
      }
    ],
    "assumptions": ["Claims processing downtime for 24 hours", "Member attrition rate of 2%"]
  },
  "regulatory_triggers": [
    {
      "regulation_id": "CMS-10743",
      "name": "HIPAA 45 CFR §164.312",
      "obligation": " safeguard protected health information",
      "deadline": "2025-12-31T23:59:59Z",
      "status": "at_risk",
      "notification_required": true,
      "notification_timeline": "60 days"
    }
  ],
  "threshold_breaches": [],
  "remediation_owner": "security-team",
  "confidence": 0.9,
  "methodology_trail": {
    "normalization_steps": ["Parsed Splunk alert format", "Enriched with asset inventory", "Calculated blast radius using business process graph"],
    "enrichment_timestamps": ["2025-06-06T12:01:00Z", "2025-06-06T12:02:00Z", "2025-06-06T12:03:00Z"],
    "data_sources": ["splunk", "asset-inventory", "business-process-graph"],
    "calculation_methods": ["blast_radius_algorithm_v1"],
    "assumptions": ["Asset inventory is current", "Business process graph is up-to-date"],
    "confidence_scores": [0.95, 0.90, 0.85]
  },
  "normalization_notes": "Normalized from Splunk alert format to RiskObject schema"
}
```

### Response

**Status Code:** `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "source": "splunk",
  "source_event_id": "splunk-event-123",
  "category": "threat",
  "affected_assets": ["server-1", "server-2"],
  "business_process_map": ["claims-adjudication"],
  "likelihood_score": 0.8,
  "blast_radius": ["database-1", "edi-gateway"],
  "financial_exposure": { /* FinancialImpact object */ },
  "regulatory_triggers": [ /* Regulation objects */ ],
  "threshold_breaches": [],
  "remediation_owner": "security-team",
  "status": "active",
  "created_at": "2025-06-06T12:00:00Z",
  "updated_at": "2025-06-06T12:00:00Z",
  "first_detected_at": "2025-06-06T12:00:00Z",
  "confidence": 0.9,
  "methodology_trail": { /* MethodologyTrail object */ },
  "normalization_notes": "Normalized from Splunk alert format to RiskObject schema"
}
```

### Error Responses

**Status Code:** `400 Bad Request`

```json
{
  "error": "validation_error",
  "message": "Invalid request body",
  "details": {
    "likelihood_score": "Must be between 0 and 1",
    "confidence": "Must be between 0 and 1"
  }
}
```

**Status Code:** `401 Unauthorized`

```json
{
  "error": "authentication_error",
  "message": "Invalid or expired JWT token"
}
```

**Status Code:** `409 Conflict`

```json
{
  "error": "duplicate_error",
  "message": "Risk object with source_event_id already exists",
  "source": "splunk",
  "source_event_id": "splunk-event-123"
}
```

---

## Get RiskObject

### Request

```http
GET /api/v1/risk-objects/{id}
Authorization: Bearer {jwt_token}
```

### Path Parameters

| Parameter | Type   | Required | Description          |
|-----------|--------|----------|----------------------|
| id        | string | Yes      | RiskObject UUID      |

### Response

**Status Code:** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "source": "splunk",
  "category": "threat",
  /* ... all RiskObject fields ... */
}
```

### Error Responses

**Status Code:** `404 Not Found`

```json
{
  "error": "not_found",
  "message": "Risk object not found",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## List RiskObjects

### Request

```http
GET /api/v1/risk-objects?customer_id={customer_id}&status={status}&category={category}&page={page}&per_page={per_page}
Authorization: Bearer {jwt_token}
```

### Query Parameters

| Parameter    | Type   | Required | Description                              |
|--------------|--------|----------|------------------------------------------|
| customer_id  | string | Yes      | Customer identifier (tenant isolation)   |
| status       | string | No       | Filter by status (active, remediated, etc.)|
| category     | string | No       | Filter by category (threat, vulnerability, etc.) |
| page         | number | No       | Page number (default: 1)                  |
| per_page     | number | No       | Items per page (default: 20, max: 100)   |

### Response

**Status Code:** `200 OK`

```json
{
  "risk_objects": [
    { /* RiskObject 1 */ },
    { /* RiskObject 2 */ },
    /* ... */
  ],
  "total": 100,
  "page": 1,
  "per_page": 20,
  "total_pages": 5
}
```

---

## Update RiskObject

### Request

```http
PUT /api/v1/risk-objects/{id}
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

### Request Body

```json
{
  "status": "remediated",
  "likelihood_score": 0.2,
  "confidence": 0.95,
  "methodology_trail": { /* Updated methodology trail */ },
  "normalization_notes": "Updated after remediation verification"
}
```

### Response

**Status Code:** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "remediated",
  "updated_at": "2025-06-06T14:00:00Z",
  /* ... all RiskObject fields ... */
}
```

---

## Delete RiskObject

### Request

```http
DELETE /api/v1/risk-objects/{id}
Authorization: Bearer {jwt_token}
```

### Response

**Status Code:** `204 No Content`

---

## Data Model

### RiskObject

```typescript
interface RiskObject {
  // Identity
  id: string;                    // UUID
  source: string;                // Connector identifier
  source_event_id: string;       // Original event ID
  category: RiskCategory;        // threat | vulnerability | compliance | vendor | operational

  // What's affected
  affected_assets: string[];      // Systems, assets, IPs
  business_process_map: string[]; // Business process IDs

  // Risk assessment
  likelihood_score: number;       // 0.0 - 1.0
  blast_radius: string[];         // Downstream systems
  financial_exposure: FinancialImpact;
  regulatory_triggers: Regulation[];
  threshold_breaches: Threshold[];

  // Resolution
  remediation_owner: string;      // Team or person responsible
  status: RiskStatus;             // active | remediated | accepted | escalated

  // Metadata
  created_at: string;             // ISO 8601
  updated_at: string;             // ISO 8601
  first_detected_at: string;      // ISO 8601
  confidence: number;            // 0.0 - 1.0

  // Audit trail
  methodology_trail: MethodologyTrail;
  normalization_notes: string;
}
```

---

## Validation Rules

- `likelihood_score`: Must be between 0.0 and 1.0
- `confidence`: Must be between 0.0 and 1.0
- `category`: Must be one of: threat, vulnerability, compliance, vendor, operational
- `status`: Must be one of: active, remediated, accepted, escalated
- `affected_assets`: Cannot be empty
- `business_process_map`: Cannot be empty
- `remediation_owner`: Cannot be empty
- `financial_exposure.methodology`: Cannot be empty (CFO defensibility)
- `financial_exposure.sources`: Cannot be empty (audit trail)

---

## Rate Limiting

- **Rate Limit:** 100 requests per minute per customer
- **Rate Limit Header:** `X-RateLimit-Remaining: 75`

---

## SDK Examples

### TypeScript

```typescript
import { CyberRxClient } from '@cyberrx/sdk';

const client = new CyberRxClient({ apiKey: 'your-api-key' });

const riskObject = await client.riskObjects.create({
  source: 'splunk',
  source_event_id: 'splunk-event-123',
  category: RiskCategory.THREAT,
  affected_assets: ['server-1'],
  business_process_map: ['claims-adjudication'],
  likelihood_score: 0.8,
  blast_radius: ['database-1'],
  financial_exposure: { /* ... */ },
  regulatory_triggers: [],
  threshold_breaches: [],
  remediation_owner: 'security-team',
  confidence: 0.9,
  methodology_trail: { /* ... */ },
  normalization_notes: 'Normalized from Splunk'
});
```

### Python

```python
from cyberrx import CyberRxClient
from cyberrx.types import RiskCategory

client = CyberRxClient(api_key='your-api-key')

risk_object = client.risk_objects.create(
    source='splunk',
    source_event_id='splunk-event-123',
    category=RiskCategory.THREAT,
    affected_assets=['server-1'],
    business_process_map=['claims-adjudication'],
    likelihood_score=0.8,
    blast_radius=['database-1'],
    financial_exposure={ /* ... */ },
    regulatory_triggers=[],
    threshold_breaches=[],
    remediation_owner='security-team',
    confidence=0.9,
    methodology_trail={ /* ... */ },
    normalization_notes='Normalized from Splunk'
)
```
