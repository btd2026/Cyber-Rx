# ConnectorCredentialModal Component

## Overview

The ConnectorCredentialModal is a production-ready React component for configuring credentials for vendor monitoring services in the CyberRx platform. It provides a secure, user-friendly interface for setting up API keys, OAuth credentials, and other authentication methods for third-party cyber intelligence services.

## Features

- **Dynamic Form Fields**: Automatically displays appropriate fields based on connector type
- **Secure Password Handling**: Password field with show/hide toggle
- **Connection Testing**: Validates credentials before saving
- **Sync Frequency Selection**: Options for Real-time, Hourly, Daily, Weekly
- **Comprehensive Error Handling**: Clear error messages and validation feedback
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Accessibility**: Full keyboard navigation, ARIA labels, and screen reader support
- **Credential Masking**: Never stores actual API keys in plaintext

## Supported Connectors

### 1. SecurityScorecard
- **Fields**: API Key (required), Domain (optional)
- **API Endpoint**: `POST /api/credentials/securityscorecard/validate`
- **Documentation**: https://www.securityscorecard.com/docs/api/

### 2. BitSight
- **Fields**: API Key (required), Domain (optional)
- **API Endpoint**: `POST /api/credentials/bitsight/validate`
- **Documentation**: https://www.bitsighttech.com/resources/

### 3. RiskRecon
- **Fields**: API Key (required), Domain (optional)
- **API Endpoint**: `POST /api/credentials/riskrecon/validate`
- **Documentation**: https://www.riskrecon.com/docs/

### 4. Recorded Future
- **Fields**: API Key (required)
- **API Endpoint**: `POST /api/credentials/recorded_future/validate`
- **Documentation**: https://www.recordedfuture.com/docs/

### 5. Compliance Evidence
- **Fields**: File upload (PDF, DOC, DOCX)
- **API Endpoint**: `POST /api/credentials/compliance_evidence/validate`
- **Description**: Upload SOC 2 reports, ISO 27001 certificates

### 6. Google Alerts
- **Fields**: RSS Feed URL (required)
- **API Endpoint**: `POST /api/credentials/google_alerts/validate`
- **Description**: Monitor vendor-related news via Google Alerts

### 7. Vendor Questionnaire
- **Fields**: Send via email (checkbox), Recipient Email (optional)
- **API Endpoint**: `POST /api/credentials/questionnaire/validate`
- **Description**: Send structured questionnaires to vendors

## Installation

The component is already integrated into the CyberRx frontend. No additional installation is required.

## Usage

### Basic Integration

```jsx
import React, { useState } from 'react';
import ConnectorCredentialModal from './components/ConnectorCredentialModal';

function VendorManagement() {
  const [showModal, setShowModal] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState(null);

  const handleConnect = (connector) => {
    setSelectedConnector(connector);
    setShowModal(true);
  };

  const handleSuccess = (connectorId, syncFrequency) => {
    console.log('Connected:', connectorId, 'Sync:', syncFrequency);
    // Refresh your connector list
    fetchConnectors();
  };

  return (
    <>
      <button onClick={() => handleConnect(securityScorecardConnector)}>
        Configure SecurityScorecard
      </button>

      <ConnectorCredentialModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        connector={selectedConnector}
        api_url={apiUrl}
        authToken={authToken}
        orgId={orgId}
        onSuccess={handleSuccess}
      />
    </>
  );
}
```

### Integration with ConnectorCard

The ConnectorCredentialModal is automatically integrated with the ConnectorCard component:

```jsx
import ConnectorCard from './components/ConnectorCard';

function ConnectorGrid() {
  return (
    <ConnectorCard
      connector={securityScorecardConnector}
      connection={connectionData}
      onConnect={handleConnect}
      onTest={handleTest}
      onSync={handleSync}
      api_url={apiUrl}
      authToken={authToken}
      orgId={orgId}
    />
  );
}
```

## Props API

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | boolean | Yes | - | Controls modal visibility |
| `onClose` | function | Yes | - | Callback when modal is closed |
| `connector` | object | Yes | - | Connector configuration object |
| `api_url` | string | No | `import.meta.env.VITE_API_URL` | API base URL |
| `authToken` | string | No | `localStorage.getItem('authToken')` | JWT authentication token |
| `orgId` | string | No | `localStorage.getItem('orgId')` | Organization ID |
| `onSuccess` | function | No | - | Callback after successful credential save |

### Connector Object Structure

```javascript
{
  id: 'securityscorecard',        // Unique connector ID
  name: 'SecurityScorecard',       // Display name
  icon: '🛡️',                      // Emoji icon
  purpose: 'Cyber risk ratings',   // Short description
  description: 'Full description', // Detailed description
  docsUrl: 'https://...'          // Documentation URL
}
```

### Callback Signatures

#### `onClose`
```javascript
() => void
```

#### `onSuccess`
```javascript
(connectorId: string, syncFrequency: string) => void
```

## Backend API Requirements

### Validate Credentials Endpoint

**Endpoint**: `POST /api/credentials/:connectorId/validate`

**Headers**:
- `Content-Type: application/json`
- `Authorization: Bearer {authToken}`
- `X-Org-Id: {orgId}`

**Body**:
```json
{
  "credentials": {
    "apiKey": "user-api-key",
    "domain": "example.com"
  },
  "syncFrequency": "daily"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Connection verified successfully",
  "data": {
    "valid": true,
    "connector": "securityscorecard"
  }
}
```

**Error Response** (401/400):
```json
{
  "success": false,
  "message": "Invalid API key",
  "error": "authentication_failed"
}
```

### Save Credentials Endpoint

**Endpoint**: `POST /api/credentials/:connectorId`

**Headers**:
- `Content-Type: application/json`
- `Authorization: Bearer {authToken}`
- `X-Org-Id: {orgId}`

**Body**:
```json
{
  "credentials": {
    "apiKey": "••••••••••••",
    "domain": "example.com"
  },
  "syncFrequency": "daily",
  "connectorId": "securityscorecard"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "saved": true,
    "connectorId": "securityscorecard"
  }
}
```

**Error Response** (500):
```json
{
  "success": false,
  "message": "Failed to save credentials",
  "error": "database_error"
}
```

## Security Considerations

### Credential Storage
- **Never store actual API keys** in the database
- Store only masked versions: `••••••••••••`
- Use the vault service for secure credential storage
- Implement encryption at rest for all credentials

### API Key Validation
- Validate credentials on the backend only
- Never send API keys to the frontend after validation
- Implement rate limiting for validation endpoints
- Log all validation attempts for audit trails

### Data Transmission
- Always use HTTPS for API communication
- Include CSRF protection headers
- Implement proper CORS policies
- Use short-lived JWT tokens

### User Interface
- Mask password fields by default
- Provide show/hide toggle for user convenience
- Clear credentials from form after close
- Show warning about third-party access

## Testing

### Run Tests

```bash
npm test ConnectorCredentialModal.test.jsx
```

### Test Coverage

The component includes comprehensive unit tests covering:
- Component rendering
- User interactions
- Form validation
- API integration
- Error handling
- Accessibility
- Edge cases

Run coverage report:

```bash
npm test -- --coverage ConnectorCredentialModal.test.jsx
```

## Styling

The component uses inline styles following the CyberRx design system:

### Colors
- Primary Blue: `#2563EB`
- Success Green: `#0FBB80`
- Error Red: `#EF4545`
- Warning Yellow: `#F5A623`
- Text Dark: `#111827`
- Text Gray: `#6B7280`
- Border Gray: `#D1D5DB`

### Typography
- Headers: 14px, font-weight 700
- Labels: 11px, font-weight 600
- Body: 12px, font-weight 400
- Helper text: 10px, font-weight 400

### Spacing
- Input padding: 8px 12px
- Margin between fields: 16px
- Modal padding: 20px
- Button gap: 8px

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile Safari: iOS 12+
- Chrome Mobile: Android 8+

## Dependencies

### Peer Dependencies
- React: ^18.0.0
- React DOM: ^18.0.0

### Required Components
- `Modal`: `/components/molecules/Modal`
- `Input`: `/components/molecules/Input`
- `Select`: `/components/molecules/Select`
- `Button`: `/components/atoms/Button`

## Accessibility Features

- **Keyboard Navigation**: ESC to close, Tab to navigate fields
- **ARIA Labels**: Proper labeling for screen readers
- **Focus Management**: Auto-focus first input on open
- **Focus Trapping**: Keep focus within modal when open
- **Body Scroll Lock**: Prevent background scrolling
- **Color Contrast**: WCAG AA compliant color ratios

## Performance Considerations

- Lazy loading of modal content
- Debounced input validation (future enhancement)
- Optimized re-renders with React.memo (future enhancement)
- Efficient state management with useCallback

## Future Enhancements

- [ ] OAuth flow support for SecurityScorecard
- [ ] Credential rotation workflow
- [ ] Bulk credential import
- [ ] Credential health monitoring
- [ ] Auto-adjust sync frequency based on vendor tier
- [ ] Credential usage analytics
- [ ] Multi-factor authentication for sensitive connectors

## Troubleshooting

### Common Issues

**Modal doesn't open**
- Check `isOpen` prop is being set correctly
- Verify `onClose` callback is defined
- Check console for React errors

**Connection test fails**
- Verify API endpoints are implemented
- Check CORS configuration
- Verify auth token is valid
- Check network tab in browser DevTools

**Save button stays disabled**
- Ensure connection test passes first
- Check `testResult` state is set correctly
- Verify `onSuccess` callback is defined

**Styles not applying**
- Ensure no global CSS conflicts
- Check browser compatibility
- Verify no inline style overrides

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review test files for usage examples
3. Check backend API documentation
4. Open an issue on GitHub

## License

Internal CyberRx component - Not for external distribution

## Changelog

### Version 1.0.0 (2025-01-31)
- Initial release
- Support for 7 connector types
- Connection testing
- Credential validation
- Sync frequency selection
- Comprehensive error handling
- Full accessibility support
- Unit test coverage
