# CyberRx Observability Setup Guide

This guide explains how to set up and configure observability and monitoring for the CyberRx platform.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Logging Configuration](#logging-configuration)
4. [Error Tracking with Sentry](#error-tracking-with-sentry)
5. [Health Checks](#health-checks)
6. [Monitoring with DataDog](#monitoring-with-datadog)
7. [Local Monitoring Stack](#local-monitoring-stack)
8. [Alerting Configuration](#alerting-configuration)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The CyberRx observability system provides:

- **Structured Logging**: JSON-formatted logs with Winston and daily rotation
- **Error Tracking**: Real-time error monitoring with Sentry
- **Health Checks**: Liveness, readiness, and dependency health endpoints
- **Metrics Collection**: Performance metrics via DataDog
- **Alerting**: Automated alerts for critical issues
- **Local Monitoring**: Docker-based Prometheus + Grafana for development

---

## Prerequisites

### Required Environment Variables

```bash
# Sentry Configuration
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production

# DataDog Configuration
DATADOG_API_KEY=your-datadog-api-key
DATADOG_APP_KEY=your-datadog-app-key
DATADOG_SITE=datadoghq.com

# Redis Configuration (for caching)
REDIS_URL=redis://localhost:6379

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/cyberrx

# Logging Configuration
LOG_LEVEL=info  # debug, info, warn, error
```

### Required Dependencies

All observability dependencies are installed via npm:

```bash
npm install winston winston-daily-rotate-file @sentry/node
```

---

## Logging Configuration

### Log Levels

- **debug**: Detailed information for debugging
- **info**: General informational messages (default)
- **warn**: Warning messages for potentially harmful situations
- **error**: Error messages for runtime errors

### Log Files

Logs are stored in the `logs/` directory with daily rotation:

- `application-YYYY-MM-DD.log`: All logs
- `error-YYYY-MM-DD.log`: Error-level logs only
- `exceptions-YYYY-MM-DD.log`: Uncaught exceptions
- `rejections-YYYY-MM-DD.log`: Unhandled promise rejections

### Log Format (Production)

```json
{
  "timestamp": "2026-05-30T12:34:56.789Z",
  "level": "info",
  "environment": "production",
  "service": "cyberrx-api",
  "version": "1.0.0",
  "message": "Request completed",
  "method": "GET",
  "path": "/api/assets",
  "orgId": "org-123",
  "status": 200,
  "duration": 45
}
```

### Using the Logger

```javascript
const logger = require('./config/logger');

// Basic logging
logger.info('User logged in', { userId: 'user-123' });
logger.warn('High memory usage', { usage: '85%' });
logger.error('Database connection failed', { error: err.message });

// Create child logger with context
const childLogger = logger.child({ component: 'asset-service' });
childLogger.info('Processing asset', { assetId: 'asset-456' });
```

---

## Error Tracking with Sentry

### Sentry Initialization

Sentry is automatically initialized in `src/index.js` when `SENTRY_DSN` is configured.

### Sentry Features

- **Error Tracking**: Captures uncaught exceptions and unhandled rejections
- **Performance Monitoring**: Tracks request/response times
- **Release Tracking**: Links errors to specific versions
- **Breadcrumbs**: Tracks user actions leading to errors

### Viewing Errors in Sentry

1. Go to your Sentry project
2. Filter by environment (production/staging/development)
3. View error details with stack traces
4. Track error trends over time

### Manual Error Reporting

```javascript
const Sentry = require('@sentry/node');

// Capture exceptions
try {
  dangerousOperation();
} catch (err) {
  Sentry.captureException(err);
}

// Capture messages
Sentry.captureMessage('Important event', {
  level: 'warning',
  extra: { context: 'value' }
});

// Set user context
Sentry.setUser({
  id: 'user-123',
  email: 'user@example.com',
  orgId: 'org-456'
});
```

---

## Health Checks

### Health Check Endpoints

| Endpoint | Purpose | Auth Required |
|----------|---------|---------------|
| `/health` | Basic health check | No |
| `/health/live` | Liveness probe (Kubernetes) | No |
| `/health/ready` | Readiness probe with dependency checks | No |
| `/health/database` | Database connectivity and stats | No |
| `/health/redis` | Redis connectivity and stats | No |
| `/health/metrics` | System metrics (memory, CPU, uptime) | No |

### Example Responses

#### Basic Health Check
```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-05-30T12:34:56.789Z",
  "environment": "production"
}
```

#### Readiness Check
```bash
curl http://localhost:3001/health/ready
```

Response:
```json
{
  "status": "ready",
  "timestamp": "2026-05-30T12:34:56.789Z",
  "checks": {
    "database": true,
    "redis": true
  }
}
```

#### Database Health
```bash
curl http://localhost:3001/health/database
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-05-30T12:34:56.789Z",
  "database": {
    "connected": true,
    "size": "128 MB",
    "activeConnections": 5,
    "pool": {
      "totalCount": 10,
      "idleCount": 5,
      "waitingCount": 0
    }
  }
}
```

### Kubernetes Configuration

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## Monitoring with DataDog

### DataDog Setup

1. **Install DataDog Agent** (for server deployment):

```bash
# For Ubuntu/Debian
DD_API_KEY=your-api-key bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# For Render/Heroku (add to buildpack)
heroku buildpacks:add https://github.com/DataDog/heroku-buildpack-datadog
```

2. **Configure Environment Variables**:

```bash
DATADOG_API_KEY=your-api-key
DATADOG_APP_KEY=your-app-key
DATADOG_SITE=datadoghq.com
DD_ENV=production
DD_SERVICE=cyberrx-api
DD_VERSION=1.0.0
```

### Custom Metrics

CyberRx automatically collects:

- **API Response Times**: p50, p95, p99 latencies
- **Request Rates**: Requests per second by endpoint
- **Error Rates**: 4xx and 5xx error percentages
- **Database Performance**: Query times and connection pool stats
- **Cache Performance**: Redis hit rates and memory usage
- **System Metrics**: CPU, memory, and disk usage

### Creating Dashboards

1. Go to DataDog Dashboards
2. Create new dashboard
3. Add widgets for key metrics:
   - API response time (p95)
   - Error rate (%)
   - Request throughput
   - Database query time
   - Cache hit rate
   - CPU/memory usage

### Key Metrics to Monitor

```yaml
# API Performance
api.request.count: Count by endpoint
api.request.duration: Histogram (p50, p95, p99)
api.error.count: Count by status code

# Database
db.query.duration: Histogram
db.pool.active_connections: Gauge
db.pool.idle_connections: Gauge

# Cache
cache.hit_rate: Percentage
cache.memory_usage: Bytes
cache.key_count: Gauge

# System
system.cpu.usage: Percentage
system.memory.usage: Percentage
system.disk.usage: Percentage
```

---

## Local Monitoring Stack

### Starting the Local Stack

The local monitoring stack includes Prometheus, Grafana, and various exporters:

```bash
cd docker
docker-compose up -d prometheus grafana
```

### Accessing Local Tools

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **Alertmanager**: http://localhost:9093

### Prometheus Configuration

Prometheus is configured to scrape metrics from:

- CyberRx Backend API: `backend:3001/metrics`
- PostgreSQL Exporter: `postgres-exporter:9187`
- Redis Exporter: `redis-exporter:9121`
- Node Exporter: `node-exporter:9100`

### Grafana Dashboards

Pre-configured dashboards are available in `docker/grafana/dashboards/`:

- **API Performance**: Response times, error rates, throughput
- **Database Performance**: Query stats, connection pool
- **System Metrics**: CPU, memory, disk, network
- **Cache Performance**: Redis hit rates, memory usage

Import dashboards via Grafana UI:
1. Go to Dashboards -> Import
2. Upload dashboard JSON files
3. Select Prometheus as data source

---

## Alerting Configuration

### Alert Rules

Alert rules are defined in `docker/prometheus/alerts.yml`:

#### Critical Alerts (Immediate Action)

- **API Down**: API endpoint not responding (2 minutes)
- **Database Connection Pool Exhausted**: >80% usage (5 minutes)
- **Redis Down**: Cache not responding (2 minutes)
- **Disk Space Critical**: <10% remaining (5 minutes)

#### Warning Alerts (Monitor Closely)

- **High Error Rate**: >5% error rate (5 minutes)
- **Slow Response Time**: p95 >1s (10 minutes)
- **High Memory Usage**: >85% (10 minutes)
- **Low Cache Hit Rate**: <70% (15 minutes)
- **Slow Database Queries**: >1000ms average (10 minutes)

### Configuring Alert Delivery

#### Email Alerts (Prometheus)

Edit `docker/prometheus/prometheus.yml`:

```yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093
```

Configure Alertmanager (`docker/alertmanager/alertmanager.yml`):

```yaml
receivers:
  - name: 'email-alerts'
    email_configs:
      - to: 'ops@cyberrx.com'
        from: 'alertmanager@cyberrx.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'your-email@gmail.com'
        auth_password: 'your-app-password'
```

#### PagerDuty Integration

```yaml
receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'your-pagerduty-integration-key'
        description: '{{ .GroupLabels.alertname }}'
```

#### Slack Integration

```yaml
receivers:
  - name: 'slack-alerts'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#ops-alerts'
        title: 'CyberRx Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

---

## Troubleshooting

### Logs Not Appearing

**Problem**: Log files are empty or missing

**Solutions**:
1. Check log level: `LOG_LEVEL=debug`
2. Verify logs directory exists: `mkdir -p logs`
3. Check file permissions: `chmod 755 logs`
4. Verify Winston configuration in `src/config/logger.js`

### Sentry Not Receiving Errors

**Problem**: Errors not appearing in Sentry dashboard

**Solutions**:
1. Verify `SENTRY_DSN` is set correctly
2. Check network connectivity to Sentry
3. Test error capture:
   ```javascript
   const Sentry = require('@sentry/node');
   Sentry.captureException(new Error('Test error'));
   ```

### Health Checks Failing

**Problem**: Health endpoints return errors

**Solutions**:
1. Check database connection: `DATABASE_URL`
2. Verify Redis connection: `REDIS_URL`
3. Check logs for specific error messages
4. Test dependencies individually:
   ```bash
   curl http://localhost:3001/health/database
   curl http://localhost:3001/health/redis
   ```

### DataDog Metrics Not Appearing

**Problem**: Metrics not showing in DataDog dashboard

**Solutions**:
1. Verify DataDog agent is running
2. Check `DATADOG_API_KEY` is valid
3. Review DataDog agent logs
4. Ensure proper tags: `DD_ENV`, `DD_SERVICE`, `DD_VERSION`

### High Memory Usage

**Problem**: Node.js process consuming excessive memory

**Solutions**:
1. Check for memory leaks using heap snapshots
2. Review connection pool settings
3. Implement rate limiting
4. Scale horizontally (add more instances)
5. Add memory monitoring and alerting

### Database Connection Pool Exhausted

**Problem**: All database connections in use

**Solutions**:
1. Increase pool size in `src/utils/db.js`
2. Check for connection leaks (queries not closing)
3. Implement connection timeout
4. Add connection pool monitoring
5. Review slow queries and optimize

### Monitoring Stack Not Starting

**Problem**: Docker containers for Prometheus/Grafana not starting

**Solutions**:
1. Check Docker is running: `docker ps`
2. Review container logs: `docker-compose logs`
3. Verify port availability (3001, 9090, 9093)
4. Restart stack: `docker-compose down && docker-compose up -d`
5. Check configuration files for syntax errors

---

## Support

For observability issues or questions:

1. Check this documentation first
2. Review logs in `logs/` directory
3. Check error tracking in Sentry
4. Review monitoring dashboards
5. Contact DevOps team: ops@cyberrx.com

---

## Related Documentation

- [SERVICE_LAYER_ARCHITECTURE.md](../cyberrx-api/SERVICE_LAYER_ARCHITECTURE.md)
- [Prometheus Configuration](../docker/prometheus/prometheus.yml)
- [Grafana Dashboards](../docker/grafana/dashboards/)
- [Alert Rules](../docker/prometheus/alerts.yml)
