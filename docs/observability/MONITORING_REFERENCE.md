# CyberRx Monitoring Reference Guide

This reference guide provides detailed information about monitoring, alerting, and operational procedures for the CyberRx platform.

## Table of Contents

1. [Monitoring Architecture](#monitoring-architecture)
2. [Key Metrics](#key-metrics)
3. [Alert Rules](#alert-rules)
4. [Dashboard Templates](#dashboard-templates)
5. [Operational Procedures](#operational-procedures)
6. [Emergency Runbook](#emergency-runbook)

---

## Monitoring Architecture

### Components

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   CyberRx API   │────▶│  DataDog Agent   │────▶│   DataDog Cloud │
│   (Backend)     │     │   (Server Side)  │     │   (SaaS)        │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│ Winston Logger  │     │  Sentry SDK       │
│   (Local Logs)  │     │  (Error Tracking) │
└─────────────────┘     └──────────────────┘
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│  Log Files      │     │   Sentry Cloud   │
│  (Daily Rotate) │     │   (Error Dash)   │
└─────────────────┘     └──────────────────┘
```

### Data Flow

1. **Application Logs**: Winston -> Local files -> DataDog Logs
2. **Metrics**: Custom metrics -> DataDog Agent -> DataDog Metrics
3. **Errors**: Sentry SDK -> Sentry Cloud
4. **Health Checks**: HTTP endpoints -> Monitoring tools

---

## Key Metrics

### API Performance Metrics

| Metric Name | Type | Description | Thresholds |
|-------------|------|-------------|------------|
| `api.request.count` | Counter | Total API requests | - |
| `api.request.duration` | Histogram | Request duration in ms | p95 <1000ms |
| `api.request.size` | Histogram | Request/response size | - |
| `api.error.count` | Counter | Total error responses | <5% of total |
| `api.4xx.count` | Counter | Client error responses | - |
| `api.5xx.count` | Counter | Server error responses | - |

### Database Metrics

| Metric Name | Type | Description | Thresholds |
|-------------|------|-------------|------------|
| `db.query.duration` | Histogram | Query execution time | <100ms avg |
| `db.pool.active_connections` | Gauge | Active DB connections | <80% of max |
| `db.pool.idle_connections` | Gauge | Idle connections | - |
| `db.pool.waiting_count` | Gauge | Requests waiting for connection | =0 |
| `db.transaction.count` | Counter | Total transactions | - |
| `db.transaction.duration` | Histogram | Transaction duration | <500ms avg |

### Cache Metrics (Redis)

| Metric Name | Type | Description | Thresholds |
|-------------|------|-------------|------------|
| `cache.hit_rate` | Gauge | Cache hit percentage | >70% |
| `cache.memory.usage` | Gauge | Memory used in bytes | <90% of max |
| `cache.key_count` | Gauge | Total keys stored | - |
| `cache.command.count` | Counter | Total commands | - |
| `cache.connection.count` | Gauge | Active connections | - |

### System Metrics

| Metric Name | Type | Description | Thresholds |
|-------------|------|-------------|------------|
| `system.cpu.usage` | Gauge | CPU utilization percentage | <80% |
| `system.memory.usage` | Gauge | Memory utilization percentage | <85% |
| `system.disk.usage` | Gauge | Disk utilization percentage | <80% |
| `system.network.receive` | Counter | Bytes received | - |
| `system.network.transmit` | Counter | Bytes transmitted | - |

### Business Metrics

| Metric Name | Type | Description | Thresholds |
|-------------|------|-------------|------------|
| `business.user.login.count` | Counter | User logins | - |
| `business.asset.count` | Gauge | Total assets per org | - |
| `business.risk.count` | Gauge | Total risks per org | - |
| `business.finding.count` | Gauge | Total findings per org | - |

---

## Alert Rules

### Critical Alerts (P1 - Immediate Action Required)

#### API Endpoint Down
```yaml
Alert: APIEndpointDown
Condition: up{job="cyberrx-backend"} == 0
For: 2 minutes
Severity: Critical
Action: Check server status, restart if needed, investigate logs
```

#### High API Error Rate
```yaml
Alert: HighAPIErrorRate
Condition: (sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) > 0.05
For: 5 minutes
Severity: Critical
Action: Investigate error logs, check recent deployments, verify dependencies
```

#### Database Connection Pool Exhausted
```yaml
Alert: DatabaseConnectionPoolExhausted
Condition: (pg_stat_activity_count{datname="cyberrx"} / pg_settings_max_connections) > 0.8
For: 5 minutes
Severity: Critical
Action: Check for connection leaks, increase pool size, scale database
```

#### Redis Down
```yaml
Alert: RedisDown
Condition: up{job="redis-exporter"} == 0
For: 2 minutes
Severity: Critical
Action: Restart Redis, check memory limits, verify configuration
```

#### Disk Space Critical
```yaml
Alert: DiskSpaceLow
Condition: (node_filesystem_avail_bytes{fstype!~"tmpfs|fuse.*"} / node_filesystem_size_bytes) < 0.10
For: 5 minutes
Severity: Critical
Action: Clean up logs, expand disk, rotate old data
```

### Warning Alerts (P2 - Monitor Closely)

#### Slow API Response Time
```yaml
Alert: SlowAPIResponseTime
Condition: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint)) > 1
For: 10 minutes
Severity: Warning
Action: Profile slow endpoints, optimize queries, add caching
```

#### High Memory Usage
```yaml
Alert: HighMemoryUsage
Condition: ((1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100) > 85
For: 10 minutes
Severity: Warning
Action: Check for memory leaks, profile memory usage, scale horizontally
```

#### High CPU Usage
```yaml
Alert: HighCPUUsage
Condition: (100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)) > 80
For: 10 minutes
Severity: Warning
Action: Profile CPU usage, optimize algorithms, scale vertically/horizontally
```

#### Low Cache Hit Rate
```yaml
Alert: LowCacheHitRate
Condition: (redis_keyspace_hits / (redis_keyspace_hits + redis_keyspace_misses)) < 0.7
For: 15 minutes
Severity: Warning
Action: Review caching strategy, increase cache size, analyze access patterns
```

#### Slow Database Queries
```yaml
Alert: SlowDatabaseQueries
Condition: pg_stat_statements_mean_exec_time > 1000
For: 10 minutes
Severity: Warning
Action: Identify slow queries, add indexes, optimize queries
```

---

## Dashboard Templates

### 1. Executive Dashboard

**Purpose**: High-level overview for executives

**Widgets**:
- Total Requests (Last 24h)
- Error Rate (Last 24h)
- Active Organizations
- Total Risks Tracked
- System Health Status
- Recent Incidents

**Query Examples**:
```promql
# Total requests
sum(crease(api.request.count)[24h:1h])

# Error rate
sum(rate(api.error.count[5m])) / sum(rate(api.request.count[5m])) * 100

# Active organizations
count(last_over_time(business.org.active[5m]))
```

### 2. Operations Dashboard

**Purpose**: Real-time operational monitoring

**Widgets**:
- Request Rate (requests/second)
- Response Time (p50, p95, p99)
- Error Rate by Endpoint
- Database Connection Pool
- Cache Hit Rate
- CPU/Memory/Disk Usage

**Query Examples**:
```promql
# Request rate
sum(rate(api.request.count[1m])) by (endpoint)

# Response time percentiles
histogram_quantile(0.95, sum(rate(api.request.duration.bucket[5m])) by (le, endpoint))

# Database pool usage
(db.pool.active_connections / db.pool.max_connections) * 100
```

### 3. Database Performance Dashboard

**Purpose**: Database health and performance

**Widgets**:
- Query Duration (avg, p95, p99)
- Connection Pool Usage
- Slow Queries (>1000ms)
- Transaction Rate
- Database Size
- Replication Lag

**Query Examples**:
```promql
# Average query duration
avg(db.query.duration)

# Slow queries
count(db.query.duration > 1000)

# Transaction rate
rate(db.transaction.count[5m])
```

### 4. Security Dashboard

**Purpose**: Security-related metrics

**Widgets**:
- Failed Authentication Attempts
- Rate Limited Requests
- Suspicious Activity Count
- High-Risk Findings
- Compliance Status
- Vendor Risk Signals

**Query Examples**:
```promql
# Failed auth rate
sum(rate(api.auth.failed.count[5m]))

# Rate limited requests
sum(rate(api.rate_limited.count[5m]))

# High-risk findings
count(business.finding.count{severity="Critical"})
```

---

## Operational Procedures

### Starting the Monitoring Stack

```bash
# Navigate to docker directory
cd docker

# Start monitoring stack
docker-compose up -d prometheus grafana

# Verify services are running
docker-compose ps

# View logs
docker-compose logs -f prometheus
```

### Accessing Monitoring Tools

| Tool | URL | Credentials |
|------|-----|-------------|
| Prometheus | http://localhost:9090 | None |
| Grafana | http://localhost:3001 | admin/admin |
| Alertmanager | http://localhost:9093 | None |
| CyberRx Health | http://localhost:3001/health | None |

### Checking Service Health

```bash
# Check all health endpoints
curl http://localhost:3001/health
curl http://localhost:3001/health/live
curl http://localhost:3001/health/ready
curl http://localhost:3001/health/database
curl http://localhost:3001/health/redis
curl http://localhost:3001/health/metrics

# Check with JSON formatting
curl http://localhost:3001/health | jq
```

### Viewing Logs

```bash
# View current logs
tail -f logs/application-$(date +%Y-%m-%d).log

# View error logs
tail -f logs/error-$(date +%Y-%m-%d).log

# Search logs for specific term
grep "ERROR" logs/application-*.log

# View logs from last hour
find logs/ -name "*.log" -mmin -60 -exec tail -f {} +
```

### Testing Alert Rules

```bash
# Test Prometheus alerts
curl -X POST http://localhost:9093/-/reload

# Manually trigger test alert
curl -X POST http://localhost:9093/api/v1/alerts -d '{
  "alerts": [
    {
      "labels": {
        "alertname": "TestAlert",
        "severity": "warning"
      },
      "annotations": {
        "description": "This is a test alert"
      }
    }
  ]
}'
```

### Performance Profiling

```bash
# Generate CPU profile
node --prof src/index.js

# Process profile
node --prof-process isolate-*.log > profile.txt

# Generate heap snapshot
node --heapsnapshot-signal=SIGUSR2 src/index.js
kill -USR2 <pid>
```

---

## Emergency Runbook

### Scenario 1: API Not Responding

**Symptoms**: Health checks failing, 503 errors, no response

**Steps**:
1. **Verify Server Status**
   ```bash
   curl http://localhost:3001/health/live
   ```

2. **Check Application Logs**
   ```bash
   tail -100 logs/error-$(date +%Y-%m-%d).log
   ```

3. **Check System Resources**
   ```bash
   top
   df -h
   free -m
   ```

4. **Restart Service**
   ```bash
   pm2 restart cyberrx-api
   # or
   systemctl restart cyberrx-api
   ```

5. **If Issue Persists**
   - Check database connectivity
   - Verify environment variables
   - Review recent code changes
   - Contact senior engineer

### Scenario 2: High Error Rate

**Symptoms**: Error rate >5%, many 5xx responses, Sentry showing errors

**Steps**:
1. **Identify Error Pattern**
   ```bash
   grep "ERROR" logs/application-*.log | tail -50
   ```

2. **Check Sentry Dashboard**
   - Review recent errors
   - Identify common patterns
   - Check stack traces

3. **Analyze Metrics**
   - Check DataDog error rate by endpoint
   - Review error distribution
   - Correlate with deployments

4. **Take Action**
   - If recent deployment: Rollback
   - If database issue: Check connectivity, restart if needed
   - If external service: Check service status, implement fallback
   - If memory issue: Restart service, investigate leak

### Scenario 3: Database Connection Issues

**Symptoms**: Database health check failing, connection pool exhausted

**Steps**:
1. **Check Database Status**
   ```bash
   curl http://localhost:3001/health/database
   ```

2. **Verify Database Connectivity**
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

3. **Check Connection Pool**
   - Review pool usage in metrics
   - Identify connection leaks
   - Check for long-running queries

4. **Take Action**
   - Restart application to reset pool
   - Increase pool size if needed
   - Kill long-running queries
   - Optimize slow queries

### Scenario 4: High Memory Usage

**Symptoms**: Memory usage >85%, OOM errors, slow performance

**Steps**:
1. **Check Memory Usage**
   ```bash
   curl http://localhost:3001/health/metrics
   ```

2. **Generate Heap Snapshot**
   ```bash
   kill -USR2 $(pidof node)
   ```

3. **Analyze Memory Profile**
   - Identify memory leaks
   - Check for large objects
   - Review caching strategy

4. **Take Action**
   - Clear cache: `redis-cli FLUSHDB`
   - Restart service
   - Implement memory limits
   - Add more memory/scale horizontally

### Scenario 5: Slow Response Times

**Symptoms**: p95 response time >1s, users complaining, dashboard shows slowness

**Steps**:
1. **Identify Slow Endpoints**
   - Check DataDog dashboard
   - Review response time by endpoint
   - Identify patterns

2. **Check Database Performance**
   ```bash
   curl http://localhost:3001/health/database
   ```

3. **Analyze Queries**
   - Review slow query log
   - Check query execution plans
   - Identify missing indexes

4. **Take Action**
   - Add caching to slow endpoints
   - Optimize slow queries
   - Add database indexes
   - Implement request batching
   - Scale vertically/horizontally

### Scenario 6: External Service Outage

**Symptoms**: Errors from external APIs, timeouts, 504 errors

**Steps**:
1. **Identify Affected Services**
   - Check error logs for service names
   - Review recent API calls
   - Check Sentry for external errors

2. **Check Service Status**
   - Visit service status page
   - Check service health endpoint
   - Review status page for incidents

3. **Take Action**
   - Enable fallback data
   - Implement circuit breaker
   - Use cached data if available
   - Gracefully degrade functionality
   - Communicate with users

### Scenario 7: Security Incident

**Symptoms**: Unauthorized access, suspicious activity, breach indicators

**Steps**:
1. **Activate Security Response**
   - Page security team
   - Initialize incident response plan
   - Document all actions

2. **Investigate Scope**
   - Review authentication logs
   - Check audit logs
   - Identify affected accounts/data

3. **Containment**
   - Disable compromised accounts
   - Block malicious IPs
   - Enable enhanced monitoring
   - Preserve evidence

4. **Recovery**
   - Restore from clean backups
   - Reset credentials
   - Patch vulnerabilities
   - Implement additional controls

---

## Maintenance Procedures

### Daily Tasks

- Review dashboard for anomalies
- Check error rate and response times
- Verify backup completion
- Review security logs

### Weekly Tasks

- Review and optimize slow queries
- Check database growth and trends
- Review and update alert thresholds
- Analyze capacity trends

### Monthly Tasks

- Review and update documentation
- Conduct disaster recovery test
- Review and optimize costs
- Update monitoring dashboards
- Review security vulnerabilities

---

## Contacts

### Team

- **DevOps Lead**: ops@cyberrx.com
- **Senior Backend Engineer**: backend@cyberrx.com
- **Security Team**: security@cyberrx.com
- **On-Call Engineer**: oncall@cyberrx.com

### External

- **DataDog Support**: support@datadoghq.com
- **Sentry Support**: support@sentry.io
- **Render Support**: support@render.com
- **AWS Support**: aws-support@cyberrx.com

---

## Related Documentation

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Initial setup and configuration
- [SERVICE_LAYER_ARCHITECTURE.md](../../cyberrx-api/SERVICE_LAYER_ARCHITECTURE.md) - Backend architecture
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [DataDog Documentation](https://docs.datadoghq.com/)
