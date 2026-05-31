# Service Layer Architecture

## Overview

The CyberRx API now implements a clean service layer architecture that separates business logic from HTTP handling. This refactoring improves maintainability, testability, and follows the Single Responsibility Principle.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Routes Layer                          │
│  (HTTP concerns: validation, response formatting, auth)     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  (Business logic: calculations, enrichment, orchestration)    │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐  │
│  │ SecurityService│ │  LegalService  │ │ FinancialService│  │
│  └────────────────┘ └────────────────┘ └────────────────┘  │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐  │
│  │OperationalSvc  │ │  AuditService  │ │ PlatformService │  │
│  └────────────────┘ └────────────────┘ └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Models Layer                           │
│  (Data access: database queries, ORM operations)             │
└─────────────────────────────────────────────────────────────┘
```

## Domain Services

### 1. SecurityService (`/domains/security/services/SecurityService.js`)

**Responsibilities:**
- Finding management and repeat detection
- Threat scenario analysis
- Control effectiveness assessment
- Security statistics and reporting

**Key Methods:**
- `getFindings(orgId, filters)` - Retrieve and enrich findings
- `createFinding(orgId, data)` - Create finding with auto-repeat detection
- `updateFinding(id, orgId, data)` - Update finding with access control
- `getThreats(orgId, filters)` - Retrieve threat scenarios
- `createThreatScenario(orgId, data)` - Create new threat scenario
- `getControls(orgId, filters)` - Retrieve controls with effectiveness
- `assessControlEffectiveness(controlId, orgId, assessment)` - Record control test

**Business Logic Examples:**
- Auto-detects repeat findings based on title, asset, and tool similarity
- Calculates financial exposure based on severity multipliers
- Enriches findings with business process context
- Computes control effectiveness scores

### 2. LegalService (`/domains/legal/services/LegalService.js`)

**Responsibilities:**
- Legal obligation management
- Notification tracking and deadlines
- Contract risk assessment
- HIPAA and regulatory compliance

**Key Methods:**
- `getObligations(orgId, filters)` - Retrieve and enrich obligations
- `createObligation(orgId, data)` - Create legal obligation
- `getUrgentObligations(orgId)` - Get obligations with upcoming deadlines
- `getHIPAAObligations(orgId)` - Get HIPAA-specific obligations
- `assessContractRisk(contractId, orgId)` - Assess contract financial risk

**Business Logic Examples:**
- Prioritizes obligations by notification deadline
- Calculates compliance status and penalty risk
- Generates deadline reminder notifications
- Assesses contract complexity and risk factors

### 3. FinancialService (`/domains/financial/services/FinancialService.js`)

**Responsibilities:**
- Financial impact calculation
- Scenario analysis and modeling
- Peer benchmarking and comparison
- High-exposure risk identification

**Key Methods:**
- `getImpacts(orgId, filters)` - Retrieve financial impacts
- `calculateImpact(riskId, threatScenario)` - Calculate expected loss
- `runScenario(orgId, scenarioParams)` - Run scenario analysis
- `comparePeers(orgId, peerId)` - Compare with peer organizations
- `getHighExposureRisks(orgId, minExposure)` - Get high-risk items

**Business Logic Examples:**
- Calculates expected loss using base impact × likelihood
- Applies scenario multipliers for threat modeling
- Aggregates scenario impacts across all risks
- Compares financial exposure with peer benchmarks

### 4. OperationalService (`/domains/operational/services/OperationalService.js`)

**Responsibilities:**
- Business process management
- Vendor risk assessment
- Asset discovery and system mapping
- Operational metrics calculation

**Key Methods:**
- `getProcesses(orgId, filters)` - Retrieve business processes
- `createProcess(orgId, data)` - Create business process
- `getVendors(orgId, filters)` - Retrieve vendors with risk assessment
- `assessVendorRisk(vendorId, orgId)` - Assess vendor risk score
- `discoverAssets(orgId, criteria)` - Discover assets via scanning

**Business Logic Examples:**
- Enriches processes with risk counts and control gaps
- Calculates vendor risk scores from multiple factors
- Groups assets by system type
- Maps processes to supported systems and data objects

### 5. AuditService (`/domains/audit/services/AuditService.js`)

**Responsibilities:**
- Audit test management
- Evidence collection and tracking
- Deficiency tracking and remediation
- Audit statistics and reporting

**Key Methods:**
- `getTests(orgId, filters)` - Retrieve audit tests
- `createTest(orgId, data)` - Create audit test
- `getEvidence(orgId, filters)` - Retrieve evidence with validity
- `collectEvidence(testId, orgId, evidenceData)` - Collect evidence
- `getDeficiencies(orgId, filters)` - Retrieve deficiencies
- `markTaskComplete(taskId, orgId, completionData)` - Complete remediation task

**Business Logic Examples:**
- Calculates evidence expiration status and validity days
- Identifies overdue tasks and prioritizes by severity
- Computes test completion percentages
- Generates audit statistics summaries

### 6. PlatformService (`/domains/platform/services/PlatformService.js`)

**Responsibilities:**
- Organization management
- User invitation and role assignment
- Permission management
- Platform configuration

**Key Methods:**
- `getOrgs(filters)` - Retrieve organizations
- `createOrg(data)` - Create organization
- `updateOrg(id, data)` - Update organization
- `getUsers(orgId, filters)` - Retrieve organization users
- `inviteUser(orgId, invitationData)` - Invite user to organization
- `assignPermissions(userId, roleId, orgId)` - Assign user permissions

**Business Logic Examples:**
- Generates organization IDs from names
- Sanitizes input data to prevent XSS
- Merges setup_json for incremental updates
- Creates invitation tokens with expiration

## Base Service Class

All services extend `BaseService` (`/domains/BaseService.js`) which provides:

**Common Functionality:**
- `logInfo(operation, metadata)` - Structured logging
- `logError(operation, error, metadata)` - Error logging
- `verifyOrgAccess(resource, orgId, resourceType)` - Access control
- `sanitize(str)` - XSS prevention
- `validateRequiredString(value, fieldName)` - Validation
- `validateEnum(value, validValues, fieldName)` - Enum validation
- `validateRange(value, min, max, fieldName)` - Range validation
- `handleError(error, operation)` - Consistent error handling

## Service Factory

The `ServiceFactory` (`/domains/ServiceFactory.js`) provides:

**Purpose:**
- Centralized service initialization
- Dependency injection management
- Singleton pattern for service instances

**Usage:**
```javascript
const factory = new ServiceFactory(models, db, logger);
const securityService = factory.getSecurityService();
const legalService = factory.getLegalService();
```

## Route Refactoring Pattern

### Before (Business Logic in Routes):
```javascript
router.post('/', authenticateJWT, async (req, res) => {
  try {
    // Validation mixed with HTTP handling
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title required' });
    }

    // Business logic in route handler
    const similar = await Finding.findSimilar({ ... });
    let finalIsRepeat = isRepeat || false;

    if (similar && similar.length > 0) {
      // Complex business logic
      const bestMatch = similar[0];
      if (bestMatch.title.toLowerCase() === title.toLowerCase()) {
        finalIsRepeat = true;
      }
    }

    const finding = await Finding.create({ ... });

    res.status(201).json(finding);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

### After (Clean Service Layer):
```javascript
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const securityService = new SecurityService(req.models, req.logger);
    const finding = await securityService.createFinding(req.orgId, req.body);
    res.status(201).json(finding);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      error: err.message || 'Failed to create finding'
    });
  }
});
```

## Benefits

### 1. Separation of Concerns
- **Routes**: Handle HTTP (validation, response, auth)
- **Services**: Handle business logic (calculations, enrichment)
- **Models**: Handle data access (database queries)

### 2. Testability
- Services can be tested in isolation without HTTP layer
- Easy to mock dependencies for unit testing
- Business logic tests are decoupled from Express

### 3. Maintainability
- Single Responsibility Principle
- Business logic is centralized and reusable
- Easy to locate and modify business rules

### 4. Scalability
- Services can be used by multiple routes
- Easy to add new endpoints with existing services
- Services can be extracted to microservices later

## Usage in Routes

### Middleware Setup

In `src/index.js`:
```javascript
const serviceInjectionMiddleware = require('./middleware/serviceInjection');

// Inject services into all requests
app.use(serviceInjectionMiddleware(models, db, logger));
```

### Route Handler Example

```javascript
router.get('/findings', authenticateJWT, async (req, res) => {
  try {
    // Use injected service factory
    const securityService = req.services.getSecurityService();
    const findings = await securityService.getFindings(req.orgId, req.query);

    res.json({
      organizationId: req.orgId,
      count: findings.length,
      data: findings
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message });
  }
});
```

### Direct Service Instantiation

```javascript
router.get('/findings', authenticateJWT, async (req, res) => {
  try {
    // Import and instantiate service directly
    const { SecurityService } = require('../domains');
    const securityService = new SecurityService(req.models, req.logger);
    const findings = await securityService.getFindings(req.orgId, req.query);

    res.json({ data: findings });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});
```

## Error Handling

Services use consistent error handling:

```javascript
try {
  // Business logic
  const result = await this.model.create(data);
  return result;
} catch (error) {
  this.handleError(error, 'operation name');
}
```

Errors include:
- `statusCode` - HTTP status code (400, 403, 404, 500)
- `message` - User-friendly error message
- `originalError` - Technical error details (logged only)

## Testing

### Unit Test Example

```javascript
const SecurityService = require('../domains/security/services/SecurityService');

describe('SecurityService', () => {
  let securityService;
  let mockModels;
  let mockLogger;

  beforeEach(() => {
    mockModels = {
      Finding: {
        findByOrganization: jest.fn(),
        create: jest.fn()
      }
    };
    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };
    securityService = new SecurityService(mockModels, mockLogger);
  });

  it('should get findings with enrichment', async () => {
    mockModels.Finding.findByOrganization.mockResolvedValue([
      { id: 'find_1', severity: 'High' }
    ]);

    const findings = await securityService.getFindings('org_1', {});

    expect(findings).toHaveLength(1);
    expect(findings[0]).toHaveProperty('financialExposure');
  });
});
```

## Migration Status

### Completed Services:
- ✅ SecurityService
- ✅ LegalService
- ✅ FinancialService
- ✅ OperationalService
- ✅ AuditService
- ✅ PlatformService

### Refactored Routes:
- ✅ findings.js → findings.refactored.js
- ✅ legal-obligations.js → legal-obligations.refactored.js
- ✅ risks.js → risks.refactored.js
- ✅ orgs.js → orgs.refactored.js

### Remaining Routes to Refactor:
- controls.js
- evidence.js
- tasks.js
- business-processes.js
- threat-scenarios.js
- vendor-monitoring.js
- executive-owners.js
- assets.js
- data-objects.js
- auth.js
- credentials.js
- itsm.js
- tools.js
- correlation.js
- seeds.js

## Next Steps

1. **Complete Route Refactoring**: Refactor remaining routes to use services
2. **Add Service Tests**: Write comprehensive unit tests for all services
3. **Update Main App**: Replace old routes with refactored versions
4. **Performance Testing**: Benchmark service layer overhead
5. **Documentation**: Add API documentation with service examples

## Best Practices

### DO:
- ✅ Keep routes thin (HTTP only)
- ✅ Put all business logic in services
- ✅ Use dependency injection for models and utilities
- ✅ Return consistent error formats with status codes
- ✅ Add comprehensive logging in services
- ✅ Write unit tests for services

### DON'T:
- ❌ Mix business logic with route handlers
- ❌ Access database directly in routes
- ❌ Put validation logic in routes (use services)
- ❌ Duplicate business logic across routes
- ❌ Create services with too many responsibilities

## Conclusion

The service layer architecture provides a clean separation of concerns, making the codebase more maintainable, testable, and scalable. All business logic is centralized in domain services, while routes focus solely on HTTP concerns.
