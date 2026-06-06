# TASK: T-MVP-014
# TITLE: Alerting & Notification System
# PHASE: Phase 1 - MVP Development
# OWNER: Senior Backend Engineer

---

## OBJECTIVE

Build a production-ready alerting and notification system that detects threshold breaches across all agents (CFO, CISO, Board) and routes alerts to the appropriate executive roles via multiple channels (email, Slack, Microsoft Teams, in-app feed).

The alerting system must be tenant-aware, secure, and integrate seamlessly with the existing agent infrastructure. It should provide configurable thresholds, intelligent deduplication, and reliable delivery guarantees.

---

## DELIVERABLES

### 1. Threshold Breach Detection Service
- **File**: `cyberrx-api/src/services/alerting/ThresholdDetector.js`
- Real-time monitoring of agent outputs for threshold violations
- Configurable thresholds per tenant, per role, per metric type
- Support for:
  - Dollar exposure thresholds (CFO)
  - Blast radius thresholds (CISO)
  - Risk score thresholds (CISO)
  - Governance question triggers (Board)
- Hysteresis to prevent alert flapping
- Cooldown periods between alerts

### 2. Alert Router Service
- **File**: `cyberrx-api/src/services/alerting/AlertRouter.js`
- Intelligent routing based on alert severity and role
- Role-based distribution:
  - CFO alerts → CFO role users
  - CISO alerts → CISO role users
  - Board alerts → Board role users
  - Critical alerts → Multiple roles (escalation)
- Tenant-aware routing (no cross-tenant leakage)
- Dead letter queue for failed alerts

### 3. Email Notification Service
- **File**: `cyberrx-api/src/services/alerting/EmailService.js`
- SendGrid or AWS SES integration
- HTML email templates for each alert type
- Tenant-branded emails (custom branding per tenant)
- Attachment support (PDF reports, CSV exports)
- Bounce handling and retry logic
- Rate limiting to prevent provider blocking
- Unsubscribe management (per regulations)

### 4. Slack Integration Service
- **File**: `cyberrx-api/src/services/alerting/SlackService.js`
- Slack Web API integration
- Per-tenant Slack workspace configuration
- Channel routing based on alert type
- Rich message formatting (blocks, attachments)
- Interactive buttons (acknowledge, dismiss, investigate)
- Threaded conversations for alert context
- Webhook verification and security

### 5. Microsoft Teams Integration Service
- **File**: `cyberrx-api/src/services/alerting/TeamsService.js`
- Microsoft Teams Webhook integration
- Adaptive Cards for rich notifications
- Per-tenant Teams configuration
- Channel routing based on alert type
- Actionable buttons (acknowledge, dismiss)
- Connector security validation

### 6. Alert Feed API
- **File**: `cyberrx-api/src/routes/alerting/alertFeed.js`
- REST API for fetching alert history
- WebSocket endpoint for real-time alert stream
- Filtering (severity, role, date range, status)
- Pagination for large alert sets
- Alert aggregation (group similar alerts)
- Alert lifecycle management (acknowledge, dismiss, escalate)

### 7. Alert Storage Schema
- **File**: `cyberrx-api/src/models/Alert.js`
- Database table for alert persistence
- Fields:
  - `alert_id` (UUID, primary key)
  - `tenant_id` (foreign key, indexed)
  - `role` (enum: cfo, ciso, board)
  - `severity` (enum: critical, high, medium, low)
  - `metric_type` (enum: dollar_exposure, blast_radius, risk_score, governance)
  - `threshold_value` (numeric)
  - `actual_value` (numeric)
  - `triggered_at` (timestamp, indexed)
  - `status` (enum: active, acknowledged, dismissed, escalated)
  - `acknowledged_by` (foreign key to users)
  - `acknowledged_at` (timestamp)
  - `context_data` (JSONB - related risk objects, agent outputs)
- Indexes for efficient querying
- Retention policy (configurable per tenant)

### 8. Alert Configuration Schema
- **File**: `cyberrx-api/src/models/AlertConfig.js`
- Database table for threshold configuration
- Fields:
  - `config_id` (UUID, primary key)
  - `tenant_id` (foreign key)
  - `role` (enum)
  - `metric_type` (enum)
  - `threshold_value` (numeric)
  - `severity` (enum)
  - `enabled` (boolean)
  - `cooldown_minutes` (integer)
  - `hysteresis_percent` (decimal)
  - `notification_channels` (JSON array: email, slack, teams)
- UI for configuration (via API)

### 9. API Documentation
- **File**: `cyberrx-api/docs/alerting-API.md`
- OpenAPI specification for all alert endpoints
- Example requests/responses
- Alert schema definitions
- Configuration guide
- Integration examples (Slack, Teams setup)

### 10. Tests
- **File**: `cyberrx-api/src/services/alerting/__tests__/`
- Unit tests for all services (90%+ coverage)
- Integration tests for email/Slack/Teams (mocked)
- End-to-end tests for alert flow
- Load tests for high-volume scenarios
- Security tests (tenant isolation)

---

## SUCCESS CRITERIA

- [ ] Threshold breach detection works for all 3 agent types
- [ ] Alerts route correctly to 3 roles (CFO, CISO, Board)
- [ ] Email notifications deliver successfully with proper formatting
- [ ] Slack integration sends rich messages to correct channels
- [ ] Teams integration sends Adaptive Cards correctly
- [ ] Alert feed API provides real-time alerts via WebSocket
- [ ] Alerts persist in database with proper indexing
- [ ] Tenant isolation enforced (no cross-tenant alerts)
- [ ] Alert deduplication prevents spam
- [ ] Configuration UI allows threshold management
- [ ] All tests passing (unit + integration)
- [ ] API documentation complete
- [ ] Ready for 4-validator review

---

## DEPENDENCIES

- **T-MVP-010 (Board Agent)** - COMPLETE ✅
  - Board agent outputs needed for governance alerts
  - Agent runtime infrastructure available
- **T-MVP-008 (CFO Agent)** - COMPLETE ✅
  - CFO outputs for dollar exposure alerts
- **T-MVP-009 (CISO Agent)** - COMPLETE ✅
  - CISO outputs for blast radius and risk alerts
- **T-FOUND-004 (Authentication)** - COMPLETE ✅
  - User role data for routing
  - JWT validation for API access

---

## CONTEXT

### Architecture Decisions
- **Alert Processing**: Event-driven via Event Hubs/Kafka
- **Storage**: PostgreSQL with TimescaleDB for time-series data
- **Email Provider**: SendGrid (API-based, reliable)
- **Real-time**: WebSocket connections for alert feed
- **Tenant Isolation**: All queries filtered by tenant_id
- **Security**: No PHI in alerts (already stripped by agents)

### Related Tasks
- **T-MVP-008 (CFO Agent)**: Generates dollar exposure data
- **T-MVP-009 (CISO Agent)**: Generates blast radius and risk data
- **T-MVP-010 (Board Agent)**: Generates governance briefs
- **T-MVP-011 (CFO Dashboard)**: Will display CFO alerts
- **T-MVP-012 (CISO Dashboard)**: Will display CISO alerts
- **T-MVP-013 (Board Dashboard)**: Will display Board alerts

### Technical Constraints
- Must integrate with existing JWT authentication
- Must respect tenant isolation (no cross-tenant leakage)
- Must handle high alert volumes (1000+ alerts/minute)
- Must provide delivery guarantees (no lost alerts)
- Must support multi-channel notifications (email, Slack, Teams)
- Must be configurable per tenant (thresholds, channels, severity)

### Integration Points
- **Agent Runtime**: Subscribe to agent output events
- **Event Bus**: Publish alert events for downstream consumers
- **User Service**: Query user roles for routing
- **Database**: Persist alerts and configuration
- **Email Provider**: SendGrid API
- **Slack**: Slack Web API
- **Microsoft Teams**: Incoming webhook API

---

## OUTPUT REQUIREMENTS

### Code Locations
- Alert detection service: `cyberrx-api/src/services/alerting/ThresholdDetector.js`
- Alert router: `cyberrx-api/src/services/alerting/AlertRouter.js`
- Email service: `cyberrx-api/src/services/alerting/EmailService.js`
- Slack service: `cyberrx-api/src/services/alerting/SlackService.js`
- Teams service: `cyberrx-api/src/services/alerting/TeamsService.js`
- Alert feed API: `cyberrx-api/src/routes/alerting/alertFeed.js`
- Alert model: `cyberrx-api/src/models/Alert.js`
- Alert config model: `cyberrx-api/src/models/AlertConfig.js`
- Tests: `cyberrx-api/src/services/alerting/__tests__/`
- API docs: `cyberrx-api/docs/alerting-API.md`

### Database Migrations
- Create alerts table with proper indexes
- Create alert_configs table
- Add tenant_id indexes for isolation
- Migration file: `cyberrx-api/migrations/YYYY_MM_DD_create_alerting_tables.sql`

### Environment Variables
- `SENDGRID_API_KEY`: SendGrid API key
- `SLACK_CLIENT_ID`: Slack app client ID
- `SLACK_CLIENT_SECRET`: Slack app client secret
- `SLACK_SIGNING_SECRET`: Slack webhook signing secret
- `TEAMS_WEBHOOK_BASE_URL`: Base URL for Teams webhooks
- `ALERT_COOLDOWN_DEFAULT`: Default cooldown minutes
- `ALERT_RETENTION_DAYS`: Default retention period

### Tests
- Unit tests: 90%+ coverage
- Integration tests: Mock external providers
- Load tests: 1000 alerts/minute
- Security tests: Verify tenant isolation

---

## IMPLEMENTATION GUIDANCE

### Step 1: Database Schema & Models
1. Create migrations for alerts and alert_configs tables
2. Create Sequelize models with proper validations
3. Add indexes for efficient querying (tenant_id, triggered_at, severity)
4. Add foreign key constraints for data integrity
5. Test migrations locally with Docker Postgres

### Step 2: Threshold Detection Service
1. Subscribe to agent output events from Event Hubs/Kafka
2. Parse agent outputs to extract metrics:
   - CFO: dollar_exposure, mlr_impact, stop_loss_exposure
   - CISO: blast_radius, risk_score, attack_pathway_count
   - Board: governance_question_triggered
3. Query AlertConfig table for tenant thresholds
4. Compare metrics against thresholds (with hysteresis)
5. Check cooldown period to prevent alert flapping
6. Publish alert event when threshold breached
7. Log all evaluations for debugging

### Step 3: Alert Router Service
1. Consume alert events from Threshold Detector
2. Determine routing based on role and severity:
   - Low/Medium: Route to primary role only
   - High: Route to primary role + escalate to Board
   - Critical: Route to all roles
3. Query User table for users in target roles
4. Check user notification preferences (from AlertConfig)
5. Publish routed alert events for notification services
6. Implement dead letter queue for failed routing
7. Add monitoring for routing failures

### Step 4: Email Service
1. Initialize SendGrid client with API key
2. Create HTML templates for each alert type:
   - `templates/email/cfo-alert.html`
   - `templates/email/ciso-alert.html`
   - `templates/email/board-alert.html`
   - `templates/email/critical-alert.html`
3. Build email composition function:
   - Populate template with alert data
   - Add tenant branding (logo, colors)
   - Generate PDF attachment for high-severity alerts
4. Implement send function with retry logic:
   - Try 3 times with exponential backoff
   - Log failures to dead letter queue
   - Track bounces and unsubscribes
5. Add rate limiting (100 emails/minute per SendGrid best practices)
6. Test with SendGrid test API key first

### Step 5: Slack Service
1. Create Slack app configuration (per tenant)
2. Implement webhook verification:
   - Verify signature using signing secret
   - Reject invalid requests
3. Create message formatting function:
   - Use Slack Block Kit for rich formatting
   - Include alert severity, description, context
   - Add interactive buttons (acknowledge, dismiss)
4. Implement channel lookup:
   - Map alert type to Slack channel
   - Fallback to default channel if not found
5. Add interactive button handlers:
   - Acknowledge: Update alert status in DB
   - Dismiss: Mark alert as dismissed
   - Investigate: Link to dashboard with context
6. Test with Slack workspace test environment

### Step 6: Teams Service
1. Create Teams webhook configuration (per tenant)
2. Implement Adaptive Card templates:
   - `templates/teams/cfo-card.json`
   - `templates/teams/ciso-card.json`
   - `templates/teams/board-card.json`
   - `templates/teams/critical-card.json`
3. Build card composition function:
   - Populate template with alert data
   - Add actionable buttons
4. Implement webhook posting:
   - POST to tenant's webhook URL
   - Handle rate limiting (Teams limits)
   - Retry on failure
5. Test with Teams webhook test endpoint

### Step 7: Alert Feed API
1. Create REST endpoints:
   - `GET /api/alerting/feed` - Fetch alert history
   - `GET /api/alerting/feed/:alert_id` - Fetch single alert
   - `PUT /api/alerting/feed/:alert_id/acknowledge` - Acknowledge alert
   - `PUT /api/alerting/feed/:alert_id/dismiss` - Dismiss alert
   - `GET /api/alerting/config` - Fetch alert configuration
   - `PUT /api/alerting/config` - Update alert configuration
2. Add WebSocket endpoint:
   - `WS /api/alerting/stream` - Real-time alert stream
   - Filter by user roles (only send relevant alerts)
   - Handle connection/disconnection gracefully
3. Implement filtering:
   - Query parameters: severity, role, start_date, end_date, status
   - Build dynamic WHERE clause
   - Apply pagination (limit, offset)
4. Add aggregation:
   - Group similar alerts within time window
   - Return count per group
5. Secure all endpoints with JWT authentication
6. Add OpenAPI documentation

### Step 8: Configuration Management
1. Create API endpoints for CRUD on AlertConfig
2. Build UI for threshold configuration (if time permits)
3. Add validation:
   - Threshold values must be positive
   - Cooldown must be >= 0
   - Severity must be valid enum
4. Add default configuration on tenant provisioning
5. Implement configuration versioning (track changes)

### Step 9: Testing
1. Unit tests:
   - Threshold detection logic (all metric types)
   - Alert routing logic (all severity levels)
   - Email composition (all templates)
   - Slack message formatting
   - Teams card formatting
   - Alert feed queries (all filters)
2. Integration tests:
   - Mock SendGrid API
   - Mock Slack API
   - Mock Teams API
   - Test end-to-end alert flow
3. Load tests:
   - 1000 alerts/minute sustained
   - Verify no alerts lost
   - Verify no database deadlocks
4. Security tests:
   - Verify tenant_id filtering on all queries
   - Verify JWT authentication on all endpoints
   - Verify no cross-tenant data leakage

### Step 10: Documentation
1. Write API documentation:
   - All endpoints with examples
   - Alert schema definitions
   - Configuration guide
2. Write integration guide:
   - SendGrid setup steps
   - Slack app setup steps
   - Teams webhook setup steps
3. Write troubleshooting guide:
   - Common alert issues
   - Debugging tips
   - Monitoring queries

---

## VALIDATION REQUESTED

- [ ] Acceptance Validator
- [ ] Security Validator
- [ ] Integration Validator
- [ ] No-Regression Validator

---

## ESTIMATED HOURS

80 hours (2 weeks)

---

## NOTES

- This is the final MVP task alongside T-MVP-015
- Both tasks can run in parallel (no dependencies between them)
- Critical to get right - alerting is a key user-facing feature
- Focus on reliability and delivery guarantees
- Over-communicate status if blockers encountered

---

**END OF TASK PROMPT**
