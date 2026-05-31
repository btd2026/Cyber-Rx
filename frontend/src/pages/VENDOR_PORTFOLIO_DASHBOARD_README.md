# Vendor Portfolio Dashboard

Executive-level vendor risk visibility dashboard for CyberRx.

## Overview

The Vendor Portfolio Dashboard provides CIOs and CLOs with comprehensive visibility into their vendor risk posture, connector health, and recent alerts. It displays all vendors with sortable/filterable tables, risk score distribution, and real-time status indicators.

## Components

### Main Dashboard
- **File**: `frontend/src/pages/VendorPortfolioDashboard.jsx`
- Comprehensive dashboard with filters, sorting, pagination, and CSV export

### Dashboard Widgets

#### RiskDistributionWidget
- **File**: `frontend/src/components/dashboard/RiskDistributionWidget.jsx`
- Pie chart showing vendor distribution by risk level (Critical, High, Medium, Low)
- Interactive segments with tooltips
- Legend with counts and percentages

#### ConnectorHealthWidget
- **File**: `frontend/src/components/dashboard/ConnectorHealthWidget.jsx`
- Visual display of connector status (Connected, Syncing, Failed, Disconnected)
- Health score percentage
- Status progress bar
- Count and percentage for each status

#### RecentAlertsWidget
- **File**: `frontend/src/components/dashboard/RecentAlertsWidget.jsx`
- Last 5 alerts with severity indicators
- Acknowledge alerts inline
- Severity badges (Critical, High, Medium, Low)
- Relative timestamps

## Features

### Filtering
- **Search**: Filter vendors by name
- **Tier Filter**: Filter by vendor tier (Critical, High, Medium, Low)
- **Risk Level Filter**: Filter by risk score ranges
- **Status Filter**: Filter by connection status
- **Active Filters Count**: Badge showing number of active filters
- **Clear All**: Reset all filters at once

### Sorting
- Sortable columns:
  - Vendor Name
  - Tier
  - Risk Score
  - Status
  - Last Sync
- Visual sort indicators (↑/↓)
- Toggle between ascending and descending

### Pagination
- 50 vendors per page
- Previous/Next navigation
- Page indicator
- Showing X-Y of Z vendors display
- Disabled states at boundaries

### Export
- Export to CSV functionality
- Includes all displayed columns
- Filename with timestamp: `vendor-portfolio-YYYY-MM-DD.csv`
- Disabled when no vendors to export

### Manual Sync
- Trigger manual sync per vendor
- Loading state during sync
- Success/error feedback
- Non-blocking UI (other actions still available)

### Risk Visualization
- Color-coded risk scores:
  - Critical (0-40): Dark Red (#DC2626)
  - High (40-60): Red (#EF4444)
  - Medium (60-80): Orange (#F59E0B)
  - Low (80-100): Green (#10B981)
- Visual indicators in table
- Grade display (A, B, C, D, F)

### Status Indicators
- Connected (● Green)
- Syncing (⟳ Orange)
- Disconnected (○ Gray)
- Error (✗ Red)
- StatusIcon component with labels

## API Integration

### Endpoints Used

#### GET /api/vendors
Fetch vendors with filters, sorting, and pagination.

**Query Parameters**:
- `orgId` (required): Organization ID
- `search`: Search term for vendor name
- `tier`: Filter by tier (critical, high, medium, low)
- `riskLevel`: Filter by risk level
- `status`: Filter by status (connected, syncing, disconnected, error)
- `sort`: Column to sort by
- `order`: Sort direction (asc, desc)
- `limit`: Number of results per page
- `offset`: Offset for pagination

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "vendor-123",
      "name": "Vendor Name",
      "tier": "critical",
      "riskScore": 35,
      "grade": "D",
      "status": "connected",
      "lastSync": "2026-05-30T10:00:00Z",
      "description": "Vendor description"
    }
  ]
}
```

#### POST /api/vendors/:id/sync
Trigger manual sync for a vendor.

**Headers**:
- `Authorization`: Bearer token
- `Content-Type`: application/json

**Body**:
```json
{
  "orgId": "org-123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Sync triggered successfully"
}
```

#### GET /api/statistics/dashboard?orgId=X
Fetch dashboard statistics.

**Response**:
```json
{
  "success": true,
  "data": {
    "totalVendors": 50,
    "connected": 35,
    "syncing": 5,
    "error": 3,
    "disconnected": 7,
    "hasMore": true
  }
}
```

#### GET /api/alerts?orgId=X&limit=5
Fetch recent alerts.

**Query Parameters**:
- `orgId` (required): Organization ID
- `limit`: Number of alerts to return (default: 5)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "alert-123",
      "title": "Alert Title",
      "severity": "critical",
      "message": "Alert message",
      "vendorName": "Vendor Inc",
      "createdAt": "2026-05-30T12:00:00Z",
      "acknowledged": false
    }
  ]
}
```

#### POST /api/alerts/:id/acknowledge
Acknowledge an alert.

**Headers**:
- `Authorization`: Bearer token
- `Content-Type`: application/json

**Body**:
```json
{
  "orgId": "org-123"
}
```

**Response**:
```json
{
  "success": true
}
```

## Usage Example

```jsx
import VendorPortfolioDashboard from './pages/VendorPortfolioDashboard';

function App() {
  return (
    <VendorPortfolioDashboard
      api_url="https://cyberrx-api.onrender.com"
      authToken={userToken}
      orgId={orgId}
      onNavigate={(path) => navigate(path)}
    />
  );
}
```

## Styling

### Color Palette (BCBS Healthcare Theme)

**Primary Colors**:
- Primary Blue: #3B82F6
- Success Green: #10B981
- Warning Orange: #F59E0B
- Error Red: #EF4444
- Critical Red: #DC2626
- Gray: #6B7280

**Background Colors**:
- Page Background: #F8FAFC
- Card Background: #FFFFFF
- Hover Background: #F9FAFB
- Input Background: #FFFFFF

**Border Colors**:
- Default Border: #E5E7EB
- Focus Border: #3B82F6

### Typography

**Font Sizes**:
- Header: 24px
- Section Title: 14px
- Body Text: 13px
- Small Text: 11px
- Tiny Text: 10px

**Font Weights**:
- Bold: 700
- Semibold: 600
- Medium: 500
- Regular: 400

## Accessibility

### Keyboard Navigation
- Tab through all interactive elements
- Enter/Space to activate buttons and links
- Escape to close modals (if implemented)

### ARIA Labels
- Proper labels on all inputs
- Role attributes where appropriate
- Screen reader text for icons

### Focus Indicators
- Visible focus states on all interactive elements
- High contrast focus rings

### Color Contrast
- All text meets WCAG AA standards
- Color not used as only indicator
- Icons paired with text labels

## Testing

### Test Coverage
- **Unit Tests**: 20+ test cases per component
- **Integration Tests**: API integration tests
- **Accessibility Tests**: ARIA and keyboard navigation

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Files
- `VendorPortfolioDashboard.test.jsx` - Main dashboard tests
- `RiskDistributionWidget.test.jsx` - Risk chart tests
- `ConnectorHealthWidget.test.jsx` - Health status tests
- `RecentAlertsWidget.test.jsx` - Alerts widget tests

## Performance Considerations

### Optimization Strategies
1. **Debounced Search**: 300ms delay on search input
2. **Pagination**: Limit to 50 items per page
3. **Memoization**: useMemo for expensive calculations
4. **Lazy Loading**: Components load on demand
5. **Efficient Re-renders**: React Query caching

### Best Practices
- Avoid inline functions in render
- Use useCallback for event handlers
- Implement proper key props
- Optimize images and assets
- Minimize re-renders with React.memo

## Responsive Design

### Breakpoints
- **Desktop**: 1024px and up
- **Tablet**: 768px - 1023px
- **Mobile**: < 768px

### Responsive Features
- Horizontal scroll on tables
- Stacked widgets on mobile
- Collapsible filters
- Touch-friendly button sizes
- Responsive grid layouts

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile Safari: iOS 12+
- Chrome Mobile: Android 8+

## Future Enhancements

### Potential Features
1. **Real-time Updates**: WebSocket integration for live data
2. **Advanced Filters**: Date range, multiple selections
3. **Bulk Actions**: Sync multiple vendors at once
4. **Custom Views**: Save and share filter configurations
5. **Drill-down**: Detailed vendor profiles
6. **Trend Analysis**: Risk score trends over time
7. **Comparison**: Compare vendors side-by-side
8. **Export Formats**: PDF, Excel in addition to CSV
9. **Notifications**: In-app notifications for critical alerts
10. **Dashboard Customization**: Drag-and-drop widget arrangement

## Troubleshooting

### Common Issues

#### Dashboard not loading
- Check API URL configuration
- Verify auth token is valid
- Ensure orgId is provided
- Check browser console for errors

#### Vendors not displaying
- Verify API response format
- Check filter settings
- Ensure vendors exist in database
- Verify network requests

#### Sync not working
- Check user permissions
- Verify vendor is configured
- Check API endpoint availability
- Review error messages

#### Export failing
- Ensure vendors are loaded
- Check browser download permissions
- Verify CSV generation logic
- Check for special characters in data

## Contributing

### Code Style
- Use functional components with hooks
- Follow React best practices
- Implement proper error handling
- Add comprehensive comments
- Write tests for new features

### Pull Request Checklist
- [ ] Tests pass locally
- [ ] New tests added for features
- [ ] Documentation updated
- [ ] No console errors
- [ ] Responsive design verified
- [ ] Accessibility tested

## License

Proprietary - All Rights Reserved

## Support

For issues or questions:
- Create a GitHub issue
- Contact the development team
- Check documentation
- Review test files for examples
