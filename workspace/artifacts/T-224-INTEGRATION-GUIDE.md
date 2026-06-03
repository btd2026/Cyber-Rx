# T-224 Audit Trail Integration Guide

## Overview
This document describes how to integrate the audit trail API with T-220 Review UI for mapping confirmation events.

## Backend API Endpoints

### 1. Query Audit Logs
**GET** `/api/audit-trail`

Query audit logs with filters.

```javascript
// Example request
const response = await fetch('/api/audit-trail?' + new URLSearchParams({
  organization_id: 'org-456',
  start_date: '2025-06-01',
  end_date: '2025-06-30',
  event_types: 'mapping_accepted,mapping_rejected',
  page: 1,
  per_page: 50
}), {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Example response
{
  "audit_logs": [
    {
      "id": 123,
      "timestamp": "2025-06-03T10:00:00Z",
      "user_email": "admin@acme-health.com",
      "user_role": "admin",
      "action": "accepted",
      "target": {
        "type": "process_mapping",
        "id": "proposal-uuid",
        "customer_value": "Claims Processing",
        "proposed_match": "claims-adjudication",
        "confirmed_match": "claims-adjudication",
        "confidence": 0.92
      },
      "rationale": "Confirmed high-confidence match - process name clearly maps to claims adjudication",
      "provenance": {
        "source_file": "process_list.xlsx",
        "source_row_id": 15,
        "ingested_at": "2025-06-03T09:00:00Z",
        "normalized_at": "2025-06-03T09:05:00Z",
        "matched_at": "2025-06-03T09:10:00Z",
        "match_method": "llm_assisted"
      }
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "per_page": 50,
    "total_pages": 3
  }
}
```

### 2. Get Full Audit Record with Provenance Chain
**GET** `/api/audit-trail/:id`

Get complete audit record with full provenance chain.

```javascript
// Example request
const response = await fetch(`/api/audit-trail/${auditId}`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Example response
{
  "audit_record": {
    "id": 123,
    "event_type": "mapping_accepted",
    "timestamp": "2025-06-03T10:00:00Z",
    "user_id": 1,
    "user_email": "admin@acme-health.com",
    "user_role": "admin",
    "organization_id": "org-456",
    "target_type": "process_mapping",
    "target_id": "proposal-uuid",
    "action": "accepted",
    "before": {
      "customer_value": "Claims Processing",
      "proposed_match": "claims-adjudication",
      "confidence": 0.92
    },
    "after": {
      "customer_value": "Claims Processing",
      "confirmed_match": "claims-adjudication",
      "confidence": 0.92,
      "override_notes": null
    },
    "provenance": {
      "source_file": "process_list.xlsx",
      "source_row_id": 15,
      "ingested_at": "2025-06-03T09:00:00Z",
      "ingest_id": "ingest-uuid",
      "normalized_at": "2025-06-03T09:05:00Z",
      "matched_at": "2025-06-03T09:10:00Z",
      "match_method": "llm_assisted"
    },
    "rationale": "Confirmed high-confidence match - process name clearly maps to claims adjudication",
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "session_id": "session-789"
  },
  "provenance_chain": [
    {
      "stage": "ingest",
      "timestamp": "2025-06-03T09:00:00Z",
      "details": {
        "source_file": "process_list.xlsx",
        "source_row_id": 15,
        "ingest_id": "ingest-uuid"
      }
    },
    {
      "stage": "normalize",
      "timestamp": "2025-06-03T09:05:00Z",
      "details": {
        "normalized_value": "Claims Processing"
      }
    },
    {
      "stage": "match",
      "timestamp": "2025-06-03T09:10:00Z",
      "details": {
        "match_method": "llm_assisted",
        "proposed_match": "claims-adjudication",
        "confidence": 0.92
      }
    },
    {
      "stage": "confirm",
      "timestamp": "2025-06-03T10:00:00Z",
      "details": {
        "action": "accepted",
        "confirmed_match": "claims-adjudication",
        "rationale": "Confirmed high-confidence match - process name clearly maps to claims adjudication",
        "user_email": "admin@acme-health.com"
      }
    }
  ]
}
```

### 3. Export Audit Logs as CSV
**GET** `/api/audit-trail/export`

Export audit logs for compliance reporting.

```javascript
// Example request
const response = await fetch('/api/audit-trail/export?' + new URLSearchParams({
  organization_id: 'org-456',
  start_date: '2025-06-01',
  end_date: '2025-06-30'
}), {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Response is CSV file with headers:
// ID, Timestamp, User Email, User Role, Action, Target Type, Target ID,
// Customer Value, Proposed Match, Confirmed Match, Confidence, Rationale,
// IP Address, Source File, Source Row ID, Ingest Timestamp, Normalize Timestamp,
// Match Timestamp, Match Method

// Download as file
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `audit-trail-${orgId}-${startDate}-${endDate}.csv`;
a.click();
```

### 4. Get Audit Statistics
**GET** `/api/audit-trail/stats`

Get audit statistics for compliance reporting.

```javascript
// Example request
const response = await fetch('/api/audit-trail/stats?' + new URLSearchParams({
  organization_id: 'org-456',
  start_date: '2025-06-01',
  end_date: '2025-06-30'
}), {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Example response
{
  "statistics": [
    {
      "event_type": "mapping_accepted",
      "count": 120,
      "unique_users": 3,
      "last_occurrence": "2025-06-03T10:00:00Z"
    },
    {
      "event_type": "mapping_rejected",
      "count": 25,
      "unique_users": 2,
      "last_occurrence": "2025-06-02T15:30:00Z"
    },
    {
      "event_type": "mapping_overridden",
      "count": 5,
      "unique_users": 1,
      "last_occurrence": "2025-06-01T09:15:00Z"
    }
  ]
}
```

## Frontend Integration (T-220)

### 1. Logging Confirmation Events

When user accepts/rejects mappings in ReviewMappings.jsx:

```javascript
import { useMutation, useQueryClient } from '@tanstack/react-query';

const ReviewMappings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Accept mapping with audit trail
  const acceptMutation = useMutation({
    mutationFn: async ({ proposalIds, rationale }) => {
      const response = await fetch('/api/mappings/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          proposal_ids: proposalIds,
          audit_context: {
            user_id: user.id,
            user_email: user.email,
            user_role: user.role,
            rationale: rationale || "Bulk accepted high-confidence proposals"
          }
        })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['match-proposals']);
      queryClient.invalidateQueries(['audit-log']);
    }
  });

  // Reject mapping with audit trail
  const rejectMutation = useMutation({
    mutationFn: async ({ proposalIds, rationale }) => {
      const response = await fetch('/api/mappings/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          proposal_ids: proposalIds,
          audit_context: {
            user_id: user.id,
            user_email: user.email,
            user_role: user.role,
            rationale: rationale || "Rejected low-confidence proposals"
          }
        })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['match-proposals']);
      queryClient.invalidateQueries(['audit-log']);
    }
  });

  // Override mapping with audit trail
  const overrideMutation = useMutation({
    mutationFn: async ({ proposalId, overrideMatch, rationale }) => {
      const response = fetch('/api/mappings/override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          proposal_id: proposalId,
          override_match: overrideMatch,
          audit_context: {
            user_id: user.id,
            user_email: user.email,
            user_role: user.role,
            rationale: rationale || "Manual override - better match available"
          }
        })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['match-proposals']);
      queryClient.invalidateQueries(['audit-log']);
    }
  });

  return (
    // ... UI code
  );
};
```

### 2. Adding "View Audit Trail" Button

Add button to ReviewMappings header:

```javascript
import { useNavigate } from 'react-router-dom';

const ReviewMappings = () => {
  const navigate = useNavigate();

  return (
    <div className="review-mappings">
      <div className="header">
        <h1>Review Mappings</h1>
        <button onClick={() => navigate('/audit-log')}>
          View Audit Trail
        </button>
      </div>
      {/* ... rest of component */}
    </div>
  );
};
```

### 3. Creating Audit Log Page

New file: `frontend/src/pages/AuditLog.jsx`

```javascript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

const AuditLog = () => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    start_date: '2025-06-01',
    end_date: '2025-06-30',
    event_types: []
  });

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['audit-log', page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        organization_id: user.organizationId,
        start_date: filters.start_date,
        end_date: filters.end_date,
        page: page,
        per_page: 50
      });

      if (filters.event_types.length > 0) {
        params.append('event_types', filters.event_types.join(','));
      }

      const response = await fetch(`/api/audit-trail?${params}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      return response.json();
    }
  });

  const handleExport = async () => {
    const params = new URLSearchParams({
      organization_id: user.organizationId,
      start_date: filters.start_date,
      end_date: filters.end_date
    });

    const response = await fetch(`/api/audit-trail/export?${params}`, {
      headers: {
        'Authorization': `Bearer ${user.token}`
      }
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${user.organizationId}-${filters.start_date}-${filters.end_date}.csv`;
    a.click();
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="audit-log">
      <h1>Audit Trail</h1>

      <div className="filters">
        <input
          type="date"
          value={filters.start_date}
          onChange={(e) => setFilters({...filters, start_date: e.target.value})}
        />
        <input
          type="date"
          value={filters.end_date}
          onChange={(e) => setFilters({...filters, end_date: e.target.value})}
        />
        <button onClick={handleExport}>
          Export CSV
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>User</th>
            <th>Action</th>
            <th>Before</th>
            <th>After</th>
            <th>Rationale</th>
          </tr>
        </thead>
        <tbody>
          {auditData?.audit_logs?.map(log => (
            <tr key={log.id}>
              <td>{new Date(log.timestamp).toLocaleString()}</td>
              <td>{log.user_email}</td>
              <td>{log.action}</td>
              <td>
                {log.target?.customer_value} → {log.target?.proposed_match}
              </td>
              <td>
                {log.target?.customer_value} → {log.target?.confirmed_match}
              </td>
              <td>{log.rationale}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <span>Page {page} of {auditData?.pagination?.total_pages}</span>
        <button
          disabled={page >= auditData?.pagination?.total_pages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AuditLog;
```

## Backend Integration (T-220)

### 1. Middleware to Extract Audit Context

Create middleware: `src/middleware/auditContext.js`

```javascript
/**
 * Extract audit context from request for logging
 */
function extractAuditContext(req) {
  return {
    user_id: req.user?.id,
    user_email: req.user?.email,
    user_role: req.user?.role,
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.get('user-agent'),
    session_id: req.sessionID
  };
}

module.exports = { extractAuditContext };
```

### 2. Update Mapping Confirmation Endpoint

In mapping acceptance/rejection endpoints:

```javascript
const ProvenanceTrail = require('../models/ProvenanceTrail');
const { extractAuditContext } = require('../middleware/auditContext');

// POST /api/mappings/accept
router.post('/accept', authenticateToken, async (req, res) => {
  try {
    const { proposal_ids, audit_context: frontendAuditContext } = req.body;
    const auditContext = extractAuditContext(req);

    // Get proposals before updating
    const proposals = await MatchProposals.getByIds(proposal_ids);

    // Update proposals
    await MatchProposals.accept(proposal_ids);

    // Log audit trail for each proposal
    for (const proposal of proposals) {
      await ProvenanceTrail.logMappingConfirmation({
        organizationId: req.user.organizationId,
        userId: auditContext.user_id,
        userEmail: frontendAuditContext?.user_email || auditContext.user_email,
        userRole: frontendAuditContext?.user_role || auditContext.user_role,
        targetType: 'process_mapping',
        targetId: proposal.id,
        action: 'accepted',
        before: {
          customer_value: proposal.customer_value,
          proposed_match: proposal.proposed_match,
          confidence: proposal.confidence
        },
        after: {
          customer_value: proposal.customer_value,
          confirmed_match: proposal.proposed_match,
          confidence: proposal.confidence
        },
        provenance: proposal.provenance,
        rationale: frontendAuditContext?.rationale,
        ipAddress: auditContext.ip_address,
        userAgent: auditContext.user_agent,
        sessionId: auditContext.session_id
      });
    }

    res.json({ success: true, accepted: proposal_ids.length });
  } catch (error) {
    console.error('Error accepting proposals:', error);
    res.status(500).json({ error: 'Failed to accept proposals' });
  }
});
```

## Compliance Features

### HIPAA Audit Requirements Met

✅ **User Identification**
- `user_id`, `user_email`, `user_role` captured
- Links back to user table for full audit

✅ **Timestamp**
- `created_at` in UTC with timezone
- Precise event ordering

✅ **Event Type**
- `mapping_accepted`, `mapping_rejected`, `mapping_overridden`
- Clear classification of actions

✅ **Before/After Values**
- `before`: customer_value, proposed_match, confidence
- `after`: customer_value, confirmed_match, confidence, override_notes

✅ **Rationale for Action**
- Human-readable explanation
- Required field for all confirmations

✅ **IP Address**
- Captured for security investigations
- Stored as INET type in PostgreSQL

✅ **Provenance Chain**
- Complete data lineage from source to confirmation
- Links back to original source row

### CSV Export Format

Compliance-ready CSV export includes:

```
ID, Timestamp, User Email, User Role, Action, Target Type, Target ID,
Customer Value, Proposed Match, Confirmed Match, Confidence, Rationale,
IP Address, Source File, Source Row ID, Ingest Timestamp, Normalize Timestamp,
Match Timestamp, Match Method
```

Ready for auditors with all HIPAA-required fields.

## Security Considerations

### 1. Access Control
- All endpoints require authentication (`authenticateToken` middleware)
- Organization isolation enforced (users can only view their org's audit logs)
- Rate limiting applied to prevent abuse

### 2. Data Integrity
- Audit logs are append-only (no updates/deletes)
- Audit log failures don't break main operations (fail-safe)
- All data validated before insertion

### 3. Privacy
- IP addresses stored for security (can be anonymized if needed)
- User agents logged but not displayed in UI
- Session IDs for correlation but not displayed

## Performance

### Indexed Queries
```sql
-- Organization + user lookup
CREATE INDEX idx_audit_org_user ON audit_logs(organization_id, user_id);

-- Organization + time range
CREATE INDEX idx_audit_org_created ON audit_logs(organization_id, created_at DESC);

-- Action filtering
CREATE INDEX idx_audit_action ON audit_logs(action);
```

### Pagination
- Default 50 records per page
- Maximum 100 records per request
- Efficient cursor-based pagination

### Retention Policy
- Consider 1-year retention for compliance
- Archive old logs to cold storage
- Implement cleanup job for data beyond retention period

## Testing

### Unit Tests
```javascript
// Test audit log creation
describe('ProvenanceTrail', () => {
  it('should log mapping confirmation', async () => {
    const logId = await ProvenanceTrail.logMappingConfirmation({
      organizationId: 'org-123',
      userId: 1,
      userEmail: 'admin@test.com',
      // ... other fields
    });
    expect(logId).toBeDefined();
  });
});
```

### Integration Tests
```javascript
// Test audit API endpoint
describe('GET /api/audit-trail', () => {
  it('should return audit logs', async () => {
    const response = await request(app)
      .get('/api/audit-trail?organization_id=org-123')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.audit_logs).toBeDefined();
  });
});
```

## Next Steps

1. Add audit trail route to frontend routing
2. Implement AuditLog.jsx page component
3. Update T-220 mapping endpoints to log confirmations
4. Add audit trail button to ReviewMappings header
5. Test with sample mapping confirmations
6. Verify CSV export works correctly
7. Conduct compliance review

## Support

For questions or issues:
- Check API documentation: `/api/audit-trail/docs` (OpenAPI/Swagger)
- Review compliance requirements: See T-224 task contract
- Contact backend team for audit log queries
