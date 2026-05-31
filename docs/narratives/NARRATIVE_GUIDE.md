# Executive Narratives Generation System - Complete Guide

## Overview

The Executive Narratives Generation System is the **CORE VALUE PROPOSITION** of CyberRx. It transforms technical security findings into executive-ready narratives that C-level stakeholders can understand and act upon.

### What It Does

**Input:** Technical finding (e.g., "Critical CVE-2024-1234 on NASCO server")

**Output:** Executive narrative with complete business context:
```
Critical CVE-2024-1234 on NASCO server affecting Claims & Payment Operations
(Tier 1 Primary) involving 3.2M PHI records with potential for ransomware,
exposing $217M financial exposure
```

### Key Features

1. **Automated Business Context Correlation**
   - Links findings to business processes (Tier 1 Primary, Tier 2 Strategic)
   - Identifies data involvement (PHI, PII, Financial) with volumes
   - Maps to systems and applications

2. **Financial Impact Analysis**
   - Estimates total exposure (breach costs, fines, business interruption)
   - Breaks down by category (breach response, regulatory, reputational)
   - Calculates net exposure after insurance

3. **Regulatory Compliance Mapping**
   - Auto-detects HIPAA obligations for PHI involvement
   - Identifies CMS breach notification requirements
   - Flags urgent notification timelines (5 days, 60 days)

4. **Executive Ownership Assignment**
   - Remediation Owner (CIO/CTO for technical fixes)
   - Validation Owner (CISO for control effectiveness)
   - Legal Owner (CLO for compliance and notification)

5. **Recommended Actions**
   - Priority-ranked actions with owners and target dates
   - Template-based for consistency
   - Customizable by organization

## Architecture

### Backend Components

#### 1. **EnhancedCorrelationEngine** (`src/services/EnhancedCorrelationEngine.js`)

The core engine that generates comprehensive narratives from findings.

**Key Method:**
```javascript
static async generateExecutiveNarrative(findingId, organizationId, options = {})
```

**Process:**
1. Fetch finding with all relationships
2. Correlate business process and tier
3. Correlate system/asset impact
4. Correlate data objects with volumes
5. Correlate threat scenario with MITRE mapping
6. Calculate financial exposure
7. Map regulatory obligations with urgency
8. Assign executive ownership
9. Determine audit evidence requirements
10. Build comprehensive narrative structure
11. Apply template for recommended actions
12. Save narrative if requested

#### 2. **Narrative Model** (`src/models/Narrative.js`)

Stores generated narratives with version history.

**Schema:**
```sql
CREATE TABLE narratives (
  id UUID PRIMARY KEY,
  finding_id UUID REFERENCES findings(id),
  organization_id UUID REFERENCES organizations(id),
  narrative_data JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  is_published BOOLEAN DEFAULT false,
  template_id VARCHAR(100),
  generated_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Key Methods:**
- `create()` - Save new narrative
- `findByFindingId()` - Get latest narrative for finding
- `findByOrganization()` - List all narratives
- `publish()` / `unpublish()` - Publishing workflow
- `search()` - Search narratives

#### 3. **NarrativeTemplateService** (`src/services/NarrativeTemplateService.js`)

Manages narrative templates and organization customizations.

**Default Templates:**
- `critical_severity` - Critical findings requiring immediate action
- `high_severity` - High severity findings
- `compliance_finding` - Compliance-related findings
- `vendor_finding` - Third-party vendor findings

**Template Structure:**
```javascript
{
  summaryTemplate: "{{severity}} {{title}} on {{system}}...",
  priority: 1,
  recommendedActions: [
    {
      action: "Immediate patching of {{vulnerability}}",
      owner: "{{remediationOwner}}",
      targetDate: "{{addDays 7}}",
      priority: 1
    }
  ]
}
```

**Template Variables:**
- `{{severity}}` - Finding severity
- `{{title}}` - Finding title
- `{{system}}` - Affected system name
- `{{businessProcess}}` - Business process name
- `{{tier}}` - Process tier (Tier 1, Tier 2)
- `{{dataTypes}}` - Data types involved
- `{{threatType}}` - Threat scenario type
- `{{financialExposure}}` - Total exposure amount
- `{{remediationOwner}}` - Assigned remediation role
- `{{validationOwner}}` - Assigned validation role
- `{{legalOwner}}` - Assigned legal role

**Helper Functions:**
- `{{formatNumber number}}` - Format as currency
- `{{addDays n}}` - Calculate date n days from now

#### 4. **NarrativeExportService** (`src/services/NarrativeExportService.js`)

Generates executive summaries in multiple formats.

**Export Formats:**
- PDF - Professional PDF document
- Word (DOCX) - Microsoft Word document
- PowerPoint (PPTX) - Executive briefing slides
- Text - Plain text executive summary

**Key Methods:**
```javascript
static async exportToPDF(narrative, options)
static async exportToWord(narrative, options)
static async exportToPowerPoint(narrative, options)
static async generateExecutiveSummary(narrative, options)
```

### Frontend Components

#### Narratives Dashboard (`frontend/src/pages/Narratives.jsx`)

Main interface for viewing and managing narratives.

**Features:**
- List all narratives with filters (status, severity, search)
- View narrative details in modal
- Export to PDF/Word
- Publish/unpublish narratives
- View statistics (total, published, drafts)

**Key Sections:**
1. **Statistics Cards** - Quick overview of narrative counts
2. **Filter Panel** - Filter by status, search by keyword
3. **Narratives Table** - List with actions (View, PDF, Word, Publish)
4. **Detail Modal** - Full narrative view with all sections

## API Reference

### Generate Narrative

**Endpoint:** `POST /api/narratives/generate`

**Request:**
```json
{
  "findingId": "uuid-of-finding",
  "save": true,
  "applyTemplate": true
}
```

**Response:**
```json
{
  "finding": {
    "id": "uuid",
    "title": "Critical CVE-2024-1234 on NASCO server",
    "severity": "Critical",
    "status": "open",
    "discoveredDate": "2026-05-30",
    "source": "CrowdStrike"
  },
  "executiveNarrative": {
    "summary": "Critical CVE-2024-1234 on NASCO server affecting Claims & Payment Operations (Tier 1 Primary) involving 3.2M PHI records with potential for ransomware, exposing $217,000,000 financial exposure",

    "businessProcess": {
      "id": "uuid",
      "name": "Claims & Payment Operations",
      "tier": "Tier 1",
      "tierLabel": "Primary",
      "criticality": "Critical",
      "owner": "CIO"
    },

    "systemImpact": {
      "system": "NASCO Gateway",
      "location": "Production",
      "businessProcessesSupported": ["Claims Adjudication", "Payment Processing"],
      "assetType": "server",
      "hostname": "nasco-gw01.prod.example.com"
    },

    "dataInvolvement": [
      {
        "type": "PHI",
        "classification": "Protected Health Information",
        "volume": "3.2M records",
        "sensitivity": "Critical"
      },
      {
        "type": "Financial",
        "classification": "Financial Data",
        "volume": "$340M annual claims",
        "sensitivity": "High"
      }
    ],

    "threatScenario": {
      "type": "Ransomware",
      "name": "Ransomware Attack",
      "probability": 78,
      "probabilityLabel": "High",
      "impactLevel": "Critical",
      "mitreTechnique": "T1486",
      "mitreTechniqueName": "Data Encrypted for Impact",
      "mitreTactic": "Impact"
    },

    "financialExposure": {
      "totalGrossExposure": 217000000,
      "netExposure": 217000000,
      "insuranceCoverage": 0,
      "breakdown": {
        "breachResponseCost": 86800000,
        "regulatoryFine": 43400000,
        "businessInterruption": 65100000,
        "reputationalLoss": 21700000,
        "legalCosts": 21700000
      }
    },

    "regulatoryObligations": [
      {
        "name": "HIPAA Breach Notification",
        "source": "HIPAA Privacy Rule",
        "notificationTimeline": "60 days",
        "citation": "45 CFR §164.312",
        "maxPenalty": "$68,925 per violation",
        "urgency": "high"
      },
      {
        "name": "CMS Breach Notification",
        "source": "CMS 42 CFR §422.306(c)(1)",
        "notificationTimeline": "5 days",
        "citation": "42 CFR §422.306(c)(1)",
        "maxPenalty": "$100,000 per violation",
        "urgency": "critical"
      }
    ],

    "executiveOwnership": {
      "remediation": {
        "roleId": "CIO",
        "name": "John Smith",
        "email": "john.cio@example.com",
        "responsibility": "Technology asset remediation and system patching"
      },
      "validation": {
        "roleId": "CISO",
        "name": "Jane Smith",
        "email": "jane.ciso@example.com",
        "responsibility": "Control effectiveness validation and security testing"
      },
      "legal": {
        "roleId": "CLO",
        "name": "Bob Johnson",
        "email": "bob.clo@example.com",
        "responsibility": "Regulatory compliance, breach notification, and legal counsel"
      }
    },

    "auditEvidence": {
      "required": true,
      "description": "Penetration test required to validate exploitability and confirm business impact",
      "tests": ["Penetration Test", "Configuration Review", "Access Control Review"],
      "lastEvidenceDate": null
    },

    "recommendedActions": [
      {
        "priority": 1,
        "action": "Patch CVE-2024-1234 on NASCO server",
        "owner": "CIO",
        "targetDate": "2026-06-06",
        "status": "pending"
      },
      {
        "priority": 2,
        "action": "Validate control effectiveness",
        "owner": "CISO",
        "targetDate": "2026-06-10",
        "status": "pending"
      },
      {
        "priority": 3,
        "action": "Prepare breach notification templates",
        "owner": "CLO",
        "targetDate": "2026-06-06",
        "status": "pending"
      }
    ]
  },
  "_meta": {
    "generationTimeMs": 1247,
    "generatedAt": "2026-05-30T12:34:56Z"
  }
}
```

### Batch Generate Narratives

**Endpoint:** `POST /api/narratives/batch`

**Request:**
```json
{
  "findingIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Response:**
```json
{
  "organizationId": "uuid",
  "count": 3,
  "successful": 3,
  "failed": 0,
  "data": [...],
  "_meta": {
    "generationTimeMs": 4521,
    "generatedAt": "2026-05-30T12:34:56Z"
  }
}
```

### Get Narrative

**Endpoint:** `GET /api/narratives/narrative/:id`

**Response:** Same structure as generate response

### List Narratives

**Endpoint:** `GET /api/narratives`

**Query Parameters:**
- `isPublished` - Filter by published status (true/false)
- `templateId` - Filter by template ID
- `search` - Search by keyword
- `limit` - Limit results (default 50)
- `offset` - Offset results

**Response:**
```json
{
  "organizationId": "uuid",
  "count": 25,
  "statistics": {
    "total": 25,
    "publishedCount": 15,
    "draftCount": 10,
    "uniqueFindings": 20
  },
  "data": [
    {
      "id": "uuid",
      "findingId": "uuid",
      "findingTitle": "Critical CVE-2024-1234",
      "severity": "Critical",
      "version": 1,
      "isPublished": true,
      "generatedAt": "2026-05-30T12:34:56Z"
    }
  ]
}
```

### Publish/Unpublish Narrative

**Endpoint:** `PUT /api/narratives/:id/publish` or `PUT /api/narratives/:id/unpublish`

**Response:**
```json
{
  "id": "uuid",
  "isPublished": true,
  "publishedAt": "2026-05-30T12:34:56Z"
}
```

### Export Narrative

**Endpoints:**
- `GET /api/narratives/:id/export/pdf` - Export to PDF
- `GET /api/narratives/:id/export/word` - Export to Word
- `GET /api/narratives/:id/export/powerpoint` - Export to PowerPoint
- `GET /api/narratives/:id/export/summary` - Get text summary

### Template Management

**Get Templates:**
```http
GET /api/narratives/templates
```

**Get Healthcare Templates:**
```http
GET /api/narratives/templates/healthcare
```

**Customize Template:**
```http
POST /api/narratives/templates/:templateId/customize

{
  "customizations": {
    "summaryTemplate": "Custom summary template...",
    "recommendedActions": [...]
  }
}
```

## Database Migration

Run the migration to create required tables:

```bash
psql -h localhost -U postgres -d cyberrx -f seeds/2026_06_12_narratives.sql
```

**Tables Created:**
1. `narratives` - Stores generated narratives
2. `narrative_templates` - Default templates
3. `organization_template_customizations` - Organization customizations

## Customization Guide

### Organization-Specific Templates

Each organization can customize templates to match their terminology and workflows.

**Example Customization:**

```javascript
POST /api/narratives/templates/critical_severity/customize
{
  "customizations": {
    "summaryTemplate": "{{severity}} {{title}} detected on {{system}} impacting {{businessProcess}} with {{dataTypes}} exposure",
    "priority": 1,
    "recommendedActions": [
      {
        "action": "Engage security team for immediate remediation",
        "owner": "{{remediationOwner}}",
        "targetDate": "{{addDays 3}}",
        "priority": 1
      },
      {
        "action": "Notify executive leadership",
        "owner": "{{legalOwner}}",
        "targetDate": "{{addDays 1}}",
        "priority": 1
      }
    ]
  }
}
```

### Custom Financial Calculations

Organizations can customize financial exposure calculations by modifying the `_estimateFinancialExposure` method in `EnhancedCorrelationEngine.js`.

**Current Formula:**
- Base exposure: $100K
- PHI involvement: ×5
- PII involvement: ×3
- Financial data: ×4
- Ransomware threat: ×2.5

### Custom Regulatory Obligations

Add organization-specific obligations by inserting into the `legal_obligations` table:

```sql
INSERT INTO legal_obligations (id, name, source, organization_id, notification_timeline, citation)
VALUES (
  'custom-obl-1',
  'State Breach Notification',
  'State Law',
  'org-uuid',
  '30 days',
  'State Code §123.45'
);
```

## Performance Optimization

### Target Performance
- **Single narrative generation:** <3 seconds
- **Batch generation (50 findings):** <30 seconds
- **Narrative retrieval:** <500ms
- **Export generation:** <2 seconds

### Optimization Strategies

1. **Database Indexes**
   - Index on `finding_id`, `organization_id`
   - Index on `is_published`, `generated_at`
   - JSONB indexes for `narrative_data` queries

2. **Caching**
   - Cache business process lookups
   - Cache executive owner assignments
   - Cache template configurations

3. **Query Optimization**
   - Use `JOIN` instead of multiple queries
   - Batch fetch related entities
   - Use `JSONB` query operators

4. **Background Processing**
   - Generate large batches in background jobs
   - Queue export jobs for processing
   - Send notifications when complete

## Testing

### Unit Tests

```javascript
// tests/unit/NarrativeTemplateService.test.js
describe('NarrativeTemplateService', () => {
  test('should apply template to narrative', async () => {
    const template = await NarrativeTemplateService.getTemplate('critical_severity', orgId);
    const narrative = await NarrativeTemplateService.applyTemplate(template, testData);
    expect(narrative.executiveNarrative.summary).toContain('Claims & Payment Operations');
  });
});
```

### Integration Tests

```javascript
// tests/integration/narratives.test.js
describe('Narratives API', () => {
  test('should generate narrative for finding', async () => {
    const response = await request(app)
      .post('/api/narratives/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ findingId: testFindingId });

    expect(response.status).toBe(200);
    expect(response.body.executiveNarrative).toBeDefined();
    expect(response.body.executiveNarrative.summary).toBeDefined();
  });
});
```

### E2E Tests

```javascript
// frontend/src/tests/e2e/narratives.spec.js
test('should generate and view narrative', async ({ page }) => {
  await page.goto('/narratives');
  await page.click('[data-testid="generate-narrative"]');
  await page.waitForSelector('[data-testid="narrative-detail"]');
  expect(await page.textContent('h1')).toContain('Executive Narrative');
});
```

## Success Criteria

- ✅ User can generate narrative for any finding
- ✅ Narrative generation takes <3 seconds
- ✅ Narrative includes all 7 sections (summary, business process, system impact, data involvement, threat, financial, regulatory, ownership, audit evidence, recommended actions)
- ✅ Narrative is C-level ready (executive language)
- ✅ PDF export works
- ✅ Word export works
- ✅ Dashboard shows narrative history
- ✅ Templates are customizable

## Future Enhancements

1. **AI-Powered Summaries**
   - Integrate OpenAI API for enhanced narrative generation
   - Use GPT-4 for executive summary refinement
   - Add semantic search across narratives

2. **Advanced Analytics**
   - Narrative trends over time
   - Repeat finding patterns
   - Executive accountability reports

3. **Integration**
   - Email narratives to stakeholders
   - Slack/Teams notifications
   - Calendar integration for action items

4. **Multi-Language Support**
   - Translate narratives to multiple languages
   - Region-specific regulatory mappings
   - Localized financial calculations

## Troubleshooting

### Issue: Narrative generation is slow

**Solutions:**
1. Check database query performance
2. Verify indexes are created
3. Check for N+1 queries in correlation logic
4. Consider caching frequently accessed data

### Issue: Missing business process correlation

**Solutions:**
1. Verify finding has `businessProcessId` or `assetId`
2. Check asset has `businessProcessIds`
3. Verify business process exists in database
4. Check organization isolation

### Issue: Financial exposure seems incorrect

**Solutions:**
1. Verify risk has `financialExposure` set
2. Check if custom calculation is needed
3. Verify data objects have correct `recordCount`
4. Adjust `_estimateFinancialExposure` multipliers

### Issue: Regulatory obligations not appearing

**Solutions:**
1. Verify PHI data objects are linked
2. Check legal obligations exist for organization
3. Verify HIPAA obligations are seeded
4. Check organization isolation

## Support

For issues or questions:
1. Check this guide
2. Review API documentation
3. Check database logs
4. Review correlation engine logs
5. Contact backend team

## Related Documentation

- [Correlation Engine Guide](./CORRELATION_ENGINE.md)
- [Business Processes Guide](./BUSINESS_PROCESSES.md)
- [Data Objects Guide](./DATA_OBJECTS.md)
- [Threat Scenarios Guide](./THREAT_SCENARIOS.md)
- [Legal Obligations Guide](./LEGAL_OBLIGATIONS.md)
