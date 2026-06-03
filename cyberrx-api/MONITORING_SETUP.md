# Monitoring Setup Guide for CyberRx API

This guide provides step-by-step instructions for setting up monitoring for the CyberRx API using Prometheus/Grafana or AWS CloudWatch.

## Health Check Endpoints

### `/health` - Main Health Check
Returns comprehensive health status including database and Redis connectivity.

**Response (Healthy):**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-06-02T14:30:00.000Z",
  "environment": "production",
  "checks": {
    "database": {
      "status": "healthy",
      "latency_ms": 15,
      "connected": true
    },
    "redis": {
      "status": "healthy",
      "latency_ms": 2,
      "connected": true
    }
  },
  "duration_ms": 18
}
```

**HTTP Status Codes:**
- `200` - All critical services healthy
- `503` - One or more critical services unhealthy

### `/health/live` - Liveness Probe
Simple aliveness check for Kubernetes.

**Response:**
```json
{
  "status": "alive",
  "timestamp": "2025-06-02T14:30:00.000Z"
}
```

### `/health/ready` - Readiness Probe
Service readiness with dependency checks. MUST respond within 1 second.

**Response (Ready):**
```json
{
  "status": "ready",
  "timestamp": "2025-06-02T14:30:00.000Z",
  "checks": {
    "database": true,
    "redis": true
  }
}
```

### `/health/database` - Database Health
Returns detailed database status including pool stats.

### `/health/metrics` - System Metrics
Returns application-level metrics (memory, uptime, CPU).

## Prometheus + Grafana Setup

### Step 1: Configure Prometheus

Add to `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'cyberrx-api'
    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: '/health'
    static_configs:
      - targets: ['cyberrx-api:3001']
        labels:
          environment: 'production'
          service: 'cyberrx-api'
```

### Step 2: Create Prometheus Alert Rules

```yaml
groups:
  - name: cyberrx_alerts
    interval: 30s
    rules:
      - alert: CyberRxAPIUnhealthy
        expr: cyberrx_health_status == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "CyberRx API is unhealthy"
```

### Step 3: Configure Grafana

1. Add Prometheus as a data source
2. Import dashboard or create panels with queries

## Kubernetes Health Probes

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: cyberrx-api
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3001
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3

          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 3
```

## Alert Thresholds

| Metric | Warning | Critical | Description |
|--------|---------|----------|-------------|
| Health Status | - | 0 | 0 = unhealthy, 1 = healthy |
| Database Latency | 100ms | 500ms | Query response time |
| Memory Usage | 70% | 85% | Heap memory usage |

## Testing Health Endpoints

```bash
# Test all health endpoints
curl -s http://localhost:3001/health | jq .
curl -s http://localhost:3001/health/live | jq .
curl -s http://localhost:3001/health/ready | jq .
curl -s http://localhost:3001/health/database | jq .
curl -s http://localhost:3001/health/metrics | jq .

# Response time testing
time curl http://localhost:3001/health
```

## Troubleshooting

### Health endpoint returns 503

**Check individual services:**
```bash
curl http://localhost:3001/health/database
curl http://localhost:3001/health/redis
```

**Common causes:**
- Database connection pool exhausted
- Redis not running (if enabled)
- Network connectivity issues

### Health check timeout

**Measure database query time:**
```bash
time curl http://localhost:3001/health/database
```

**Solution:**
- Increase database pool size in `src/utils/db.js`
- Optimize slow queries

## Next Steps

1. Set up monitoring system (Prometheus/Grafana or CloudWatch)
2. Configure health probes in orchestration (Kubernetes, ECS)
3. Create alert rules based on thresholds
4. Test failover scenarios
5. Set up notification channels
