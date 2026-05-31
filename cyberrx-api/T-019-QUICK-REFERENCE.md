# T-019: PDF Report Export - Quick Reference

## Overview
Professional PDF report generation for vendor risk portfolio dashboard. Enables executive stakeholders to download comprehensive risk reports with visualizations, vendor portfolios, and alert summaries.

## Features Implemented

### 1. PDF Report Service (`PDFReportService.js`)
- Full PDF generation with multiple sections
- Professional formatting with BCBS healthcare color scheme
- Chart generation using Chart.js and Canvas
- Organization branding support
- Comprehensive error handling

### 2. Report Sections
- **Cover Page**: Organization info, report title, date, confidentiality notice
- **Executive Summary**: Key metrics, risk distribution, tier distribution
- **Vendor Portfolio**: Complete vendor table with risk scores and ratings
- **Trend Charts**: Risk distribution and risk-by-tier visualizations
- **Alert Summary**: Critical alerts with statistics
- **Appendix**: Detailed vendor data table

### 3. API Endpoints
- `POST /api/reports/generate` - Generate and download PDF
- `GET /api/reports/preview` - Preview report metadata
- `GET /api/reports/health` - Check service health

## API Usage

### Generate PDF Report

```bash
POST /api/reports/generate

Headers:
  Authorization: Bearer <jwt-token>
  Content-Type: application/json

Body:
{
  "reportType": "executive",      // Report type (default: "executive")
  "dateRange": "12M",              // Date range for alerts (default: "12M")
  "includeCharts": true,           // Include chart visualizations (default: true)
  "includeAppendix": true          // Include detailed appendix (default: true)
}

Response:
  Content-Type: application/pdf
  Content-Disposition: attachment; filename="vendor-risk-report-{orgId}-{date}.pdf"
  Content-Length: {size}

Body: PDF binary data
```

### Preview Report Metadata

```bash
GET /api/reports/preview

Headers:
  Authorization: Bearer <jwt-token>

Response:
{
  "success": true,
  "data": {
    "organizationId": "org-123",
    "preview": {
      "totalVendors": 150,
      "averageRiskScore": "67.5",
      "criticalVendors": 12,
      "unacknowledgedAlerts": 5,
      "totalAlerts": 45
    },
    "estimatedSize": "15 MB",
    "estimatedTime": "30-60 seconds"
  }
}
```

### Health Check

```bash
GET /api/reports/health

Response:
{
  "success": true,
  "status": "healthy",
  "message": "PDF generation service is operational",
  "details": {
    "canGeneratePDF": true,
    "testPDFSize": 12345
  }
}
```

## Dependencies Installed

```bash
npm install pdfkit svg-to-pdfkit chart.js chartjs-node-canvas
```

- **pdfkit**: PDF document generation
- **chartjs-node-canvas**: Server-side chart rendering
- **chart.js**: Chart visualization library

## Color Scheme (BCBS Healthcare)

```javascript
colors: {
  primary: '#1e40af',      // BCBS Blue
  secondary: '#3b82f6',    // Light Blue
  success: '#10b981',      // Green (Low Risk)
  warning: '#f59e0b',      // Orange (Medium Risk)
  danger: '#ef4444',       // Red (Critical Risk)
  text: '#374151',         // Dark Gray
  light: '#f3f4f6'         // Light Gray
}
```

## Risk Score Mapping

| Range | Category | Color |
|-------|----------|-------|
| 80-100 | Low Risk | Green (#10b981) |
| 60-79 | Medium Risk | Orange (#f59e0b) |
| 40-59 | High Risk | Red (#dc2626) |
| 0-39 | Critical Risk | Red (#ef4444) |

## Testing

### Unit Tests
```bash
npm test tests/services/PDFReportService.test.js
```

### Integration Tests
```bash
npm test tests/integration/reports.test.js
```

### Manual Testing

```bash
# Generate PDF with all options
curl -X POST http://localhost:3001/api/reports/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"includeCharts": true, "includeAppendix": true}' \
  --output report.pdf

# Preview report
curl http://localhost:3001/api/reports/preview \
  -H "Authorization: Bearer $TOKEN"

# Health check
curl http://localhost:3001/api/reports/health \
  -H "Authorization: Bearer $TOKEN"
```

## Error Handling

The service handles:
- Missing organization data
- Chart generation failures (graceful degradation)
- Database connection errors
- PDF generation errors
- Invalid request parameters

## Performance Considerations

- **PDF Generation**: 30-60 seconds for 100+ vendors
- **Chart Rendering**: 5-10 seconds per chart
- **Memory Usage**: ~50MB for full report with charts
- **Rate Limiting**: POST endpoints limited to prevent abuse

## Frontend Integration

### React Component Example

```javascript
const handleGenerateReport = async () => {
  try {
    const response = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reportType: 'executive',
        dateRange: '12M',
        includeCharts: true,
        includeAppendix: true
      })
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendor-risk-report-${orgId}-${new Date().toISOString().split('T')[0]}.pdf`;
    a.click();
  } catch (error) {
    console.error('Report generation failed:', error);
  }
};
```

## File Structure

```
cyberrx-api/
├── src/
│   ├── routes/
│   │   └── reports.js                    # PDF generation endpoints
│   └── services/
│       └── PDFReportService.js           # PDF generation logic
└── tests/
    ├── services/
    │   └── PDFReportService.test.js     # Unit tests
    └── integration/
        └── reports.test.js               # Integration tests
```

## Configuration

The service uses default PDF configuration:
- Page Size: LETTER
- Margins: 50px (top, bottom, left, right)
- Font: Helvetica
- Auto-paging: Enabled

## Future Enhancements

1. **Async Generation**: Background job queue for large reports
2. **Custom Templates**: Organization-specific templates
3. **Scheduled Reports**: Automated weekly/monthly reports
4. **Multiple Formats**: Excel, CSV export options
5. **Email Delivery**: Direct email delivery of reports
6. **Report Caching**: Cache recently generated reports
7. **Watermarking**: Add dynamic watermarks
8. **Digital Signatures**: Add cryptographic signatures

## Troubleshooting

### PDF Generation Fails
- Check Node.js version (>= 20.0.0 required)
- Verify dependencies installed correctly
- Check database connection
- Review logs: `docker-compose logs api`

### Charts Not Rendering
- Verify chartjs-node-canvas installation
- Check system has canvas support
- Review memory allocation
- Try with `includeCharts: false`

### Large File Sizes
- Reduce `includeAppendix` to false
- Limit vendor count with filters
- Consider pagination for future versions

## Security Considerations

- All endpoints require JWT authentication
- Organization isolation enforced
- Rate limiting applied to prevent abuse
- No sensitive data in PDF filenames
- Confidentiality markings on all pages

## Monitoring

Monitor these metrics:
- PDF generation success rate
- Average generation time
- Error rates by endpoint
- Memory usage during generation
- Rate limit violations

## Support

For issues or questions:
1. Check logs in `cyberrx-api/logs/`
2. Review error messages in response
3. Verify authentication tokens
4. Test with `/api/reports/health`
5. Check database connectivity
