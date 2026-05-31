# Alert Notification Center - Integration Guide

## Overview

The Alert Notification Center is a comprehensive UI component for viewing, filtering, and managing alerts in the CyberRx platform. It provides real-time alert monitoring with analytics dashboards and batch operations.

## Features

- **Alert Filtering**: Filter by severity, type, acknowledgment status, date range, and search text
- **Inline Acknowledgment**: Acknowledge alerts individually or in batch
- **Alert Analytics**: Three widgets showing alert summary, trends, and top types
- **Real-time Updates**: Auto-refresh every 30 seconds
- **Pagination**: Handle large alert volumes with 50 alerts per page
- **Alert Details Modal**: View full alert metadata and vendor information
- **Responsive Design**: Mobile-first layout with Tailwind CSS
- **Accessibility**: Full keyboard navigation and ARIA labels

## Components

### 1. AlertNotificationCenter (Main Component)

The main container for all alert functionality.

**Props:**
- `api_url` (string, required): Base URL for API calls
- `authToken` (string, required): JWT authentication token
- `orgId` (string, required): Organization ID for filtering

**Usage:**
```jsx
import { AlertNotificationCenter } from './components/alerts';

<AlertNotificationCenter
  api_url="https://api.example.com"
  authToken={userToken}
  orgId={orgId}
/>
```

### 2. AlertDetailsModal

Modal for displaying detailed alert information.

**Props:**
- `alert` (object, required): Alert data object
- `onClose` (function, required): Callback when modal is closed
- `onAcknowledge` (function, required): Callback for acknowledgment action
- `acknowledging` (boolean, optional): Loading state for acknowledgment

### 3. AlertsSummaryWidget

Donut chart showing alert distribution by severity.

**Props:**
- `orgId` (string, required): Organization ID
- `api_url` (string, required): Base API URL
- `authToken` (string, required): Authentication token

### 4. AlertTrendWidget

Line chart showing alert frequency over time.

**Props:**
- `orgId` (string, required): Organization ID
- `range` (string, optional): Date range ('7d', '30d', '90d', '365d') - defaults to '30d'
- `api_url` (string, required): Base API URL
- `authToken` (string, required): Authentication token

### 5. TopAlertTypesWidget

Bar chart showing most common alert types.

**Props:**
- `orgId` (string, required): Organization ID
- `limit` (number, optional): Number of top types to show - defaults to 5
- `api_url` (string, required): Base API URL
- `authToken` (string, required): Authentication token

## API Endpoints Required

### GET /api/alerts
List alerts with filtering and pagination.

**Query Parameters:**
- `orgId` (string, required): Organization ID
- `severity` (string, optional): Filter by severity (Critical, High, Medium, Low, Info)
- `type` (string, optional): Filter by alert type
- `acknowledged` (string, optional): Filter by acknowledgment status (acknowledged, unacknowledged)
- `dateRange` (string, optional): Date range filter (7d, 30d, 90d, 365d, all)
- `search` (string, optional): Full-text search query
- `page` (number, optional): Page number (defaults to 1)
- `limit` (number, optional): Items per page (defaults to 50)

**Response Format:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "alert-1",
        "severity": "Critical",
        "alert_type": "critical_signal",
        "message": "Critical security signal detected",
        "created_at": "2024-01-15T10:30:00Z",
        "acknowledged_at": null,
        "acknowledged_by": null,
        "vendor_id": "vendor-1",
        "vendor_name": "Test Vendor",
        "metadata": {
          "source": "security_scan"
        }
      }
    ],
    "pagination": {
      "totalCount": 150,
      "totalPages": 3,
      "currentPage": 1,
      "limit": 50
    }
  }
}
```

### POST /api/alerts/acknowledge
Batch acknowledge alerts.

**Request Body:**
```json
{
  "alertIds": ["alert-1", "alert-2", "alert-3"]
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "acknowledged": 3,
    "timestamp": "2024-01-15T11:00:00Z"
  }
}
```

### GET /api/alerts/:id
Get detailed information about a specific alert.

**Response Format:**
```json
{
  "success": true,
  "data": {
    "id": "alert-1",
    "severity": "Critical",
    "alert_type": "critical_signal",
    "message": "Critical security signal detected",
    "created_at": "2024-01-15T10:30:00Z",
    "acknowledged_at": null,
    "acknowledged_by": null,
    "vendor_id": "vendor-1",
    "vendor_name": "Test Vendor",
    "metadata": {
      "source": "security_scan",
      "details": "Additional information"
    }
  }
}
```

### GET /api/alerts/statistics
Get alert statistics for analytics widgets.

**Query Parameters:**
- `orgId` (string, required): Organization ID

**Response Format:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "unacknowledged": 45,
    "bySeverity": {
      "critical": 12,
      "high": 38,
      "medium": 45,
      "low": 35,
      "info": 20
    },
    "byType": {
      "critical_signal": 12,
      "score_increase": 38,
      "grade_degradation": 25,
      "sync_failure": 15,
      "multi_provider_confirmed": 10
    }
  }
}
```

### GET /api/alerts/trend
Get alert trend data over time.

**Query Parameters:**
- `orgId` (string, required): Organization ID
- `range` (string, optional): Date range (7d, 30d, 90d, 365d) - defaults to '30d'

**Response Format:**
```json
{
  "success": true,
  "data": {
    "points": [
      {
        "date": "2024-01-01",
        "label": "Jan 1",
        "count": 15
      },
      {
        "date": "2024-01-02",
        "label": "Jan 2",
        "count": 18
      }
    ],
    "summary": "Alert frequency increased by 20% over the last 30 days"
  }
}
```

### GET /api/alerts/types
Get top alert types by frequency.

**Query Parameters:**
- `orgId` (string, required): Organization ID
- `limit` (number, optional): Number of types to return - defaults to 5

**Response Format:**
```json
{
  "success": true,
  "data": {
    "total": 15,
    "types": [
      {
        "type": "critical_signal",
        "count": 45
      },
      {
        "type": "score_increase",
        "count": 38
      },
      {
        "type": "grade_degradation",
        "count": 25
      }
    ]
  }
}
```

## Alert Data Model

```typescript
interface Alert {
  id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  alert_type: string;
  message: string;
  created_at: string; // ISO 8601 datetime
  acknowledged_at: string | null; // ISO 8601 datetime or null
  acknowledged_by: string | null; // User email or null
  vendor_id: string | null;
  vendor_name: string | null;
  metadata: Record<string, any>;
}
```

## Severity Color Scheme

- **Critical**: Red (#DC2626)
- **High**: Orange (#F59E0B)
- **Medium**: Yellow (#EAB308)
- **Low**: Blue (#3B82F6)
- **Info**: Gray (#6B7280)

## Alert Types

- `critical_signal`: Critical security signal detected
- `score_increase`: Risk score increased significantly
- `grade_degradation`: Compliance grade degraded
- `sync_failure`: Data synchronization failure
- `multi_provider_confirmed`: Issue confirmed by multiple providers

## Integration Example

```jsx
import React from 'react';
import { AlertNotificationCenter } from './components/alerts';

function AlertsPage() {
  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.example.com';
  const token = localStorage.getItem('authToken');
  const orgId = localStorage.getItem('orgId');

  return (
    <div className="alerts-page">
      <AlertNotificationCenter
        api_url={apiUrl}
        authToken={token}
        orgId={orgId}
      />
    </div>
  );
}

export default AlertsPage;
```

## Testing

Run tests with:

```bash
npm test AlertNotificationCenter
```

The test suite includes:
- 40+ test cases
- Rendering tests
- Filter interaction tests
- Selection and batch operations tests
- Acknowledgment flow tests
- Modal interaction tests
- Pagination tests
- Empty state tests
- Accessibility tests
- Error handling tests

## Styling Customization

The component uses inline styles with BCBS healthcare colors. To customize:

1. Update color values in `getSeverityColor()` functions
2. Modify layout dimensions in style objects
3. Adjust spacing and sizing in responsive grid layouts

## Performance Considerations

- **Polling**: Auto-refresh every 30 seconds (configurable)
- **Pagination**: 50 alerts per page to limit DOM size
- **Lazy Loading**: Analytics widgets load data independently
- **Memoization**: Consider adding React.memo for child components if needed

## Accessibility Features

- Full keyboard navigation
- ARIA labels on all interactive elements
- Focus management in modals
- Semantic HTML structure
- Screen reader support

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 12+, Chrome Android

## Troubleshooting

### Alerts not loading
- Check network requests in browser dev tools
- Verify API URL and authentication token
- Check CORS configuration

### Analytics widgets not showing data
- Ensure `/api/alerts/statistics`, `/api/alerts/trend`, and `/api/alerts/types` endpoints are implemented
- Check response format matches expected schema

### Acknowledgment not working
- Verify POST `/api/alerts/acknowledge` endpoint exists
- Check request includes proper authentication headers
- Ensure response returns success status

## Future Enhancements

Potential improvements for future iterations:

- WebSocket support for real-time alerts (instead of polling)
- Alert export functionality (CSV, PDF)
- Alert scheduling and automation
- Custom alert rules and thresholds
- Alert notification preferences (email, SMS, push)
- Alert correlation and grouping
- Historical alert comparison
- Alert workflow integration
