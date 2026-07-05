#!/bin/bash
# Nerion Monitoring Setup Script
# Configures DataDog, Sentry, and Grafana monitoring

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Setup DataDog monitoring
setup_datadog() {
    log_info "Setting up DataDog monitoring..."
    
    # Check if DataDog API key is set
    if [ -z "$DATADOG_API_KEY" ]; then
        log_warn "DATADOG_API_KEY not set. Skipping DataDog setup."
        return
    fi
    
    # Install DataDog agent on backend
    cd "$PROJECT_ROOT/cyberrx-api"
    npm install --save dd-trace
    
    # Create DataDog configuration
    cat > src/config/datadog.js <<EOF
const tracer = require('dd-trace').init({
    service: 'cyberrx-api',
    env: process.env.NODE_ENV,
    logInjection: true,
    analytics: true,
    tags: {
        environment: process.env.NODE_ENV,
        version: process.env.APP_VERSION || '1.0.0'
    }
});

module.exports = tracer;
EOF
    
    log_info "DataDog setup completed."
}

# Setup Sentry error tracking
setup_sentry() {
    log_info "Setting up Sentry error tracking..."
    
    # Check if Sentry DSN is set
    if [ -z "$SENTRY_DSN" ]; then
        log_warn "SENTRY_DSN not set. Skipping Sentry setup."
        return
    fi
    
    # Backend Sentry setup
    cd "$PROJECT_ROOT/cyberrx-api"
    npm install --save @sentry/node
    
    cat > src/config/sentry.js <<EOF
const Sentry = require("@sentry/node");

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app }),
        new Sentry.Integrations.Postgres(),
    ],
    beforeSend(event) {
        // Filter sensitive data
        if (event.request) {
            delete event.request.cookies;
            delete event.request.headers;
        }
        return event;
    }
});

module.exports = Sentry;
EOF
    
    # Frontend Sentry setup
    cd "$PROJECT_ROOT/frontend"
    npm install --save @sentry/react
    
    log_info "Sentry setup completed."
}

# Setup Grafana dashboards
setup_grafana() {
    log_info "Setting up Grafana dashboards..."
    
    # Create dashboards directory
    mkdir -p "$PROJECT_ROOT/docker/grafana/dashboards"
    
    # Create API performance dashboard
    cat > "$PROJECT_ROOT/docker/grafana/dashboards/api-performance.json" <<'EOF'
{
  "dashboard": {
    "title": "Nerion API Performance",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (endpoint)"
          }
        ]
      },
      {
        "title": "Response Times (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint))"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))"
          }
        ]
      }
    ]
  }
}
EOF
    
    # Create database performance dashboard
    cat > "$PROJECT_ROOT/docker/grafana/dashboards/database-performance.json" <<'EOF'
{
  "dashboard": {
    "title": "Nerion Database Performance",
    "panels": [
      {
        "title": "Connection Pool Usage",
        "targets": [
          {
            "expr": "pg_stat_activity_count / pg_settings_max_connections"
          }
        ]
      },
      {
        "title": "Query Performance",
        "targets": [
          {
            "expr": "pg_stat_statements_mean_exec_time"
          }
        ]
      },
      {
        "title": "Replication Lag",
        "targets": [
          {
            "expr": "pg_stat_replication_lag_seconds"
          }
        ]
      }
    ]
  }
}
EOF
    
    log_info "Grafana dashboards created."
}

# Setup Prometheus alerts
setup_prometheus_alerts() {
    log_info "Setting up Prometheus alerts..."
    
    mkdir -p "$PROJECT_ROOT/docker/prometheus/alerts"
    
    cat > "$PROJECT_ROOT/docker/prometheus/alerts/cyberrx.yml" <<'EOF'
groups:
  - name: cyberrx_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High API error rate"
          
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 10m
        annotations:
          summary: "Slow API response times"
EOF
    
    log_info "Prometheus alerts configured."
}

# Main setup
main() {
    log_info "Setting up Nerion monitoring stack..."
    
    setup_datadog
    setup_sentry
    setup_grafana
    setup_prometheus_alerts
    
    log_info "Monitoring setup completed!"
    log_info "Next steps:"
    log_info "  1. Set DATADOG_API_KEY environment variable"
    log_info "  2. Set SENTRY_DSN environment variable"
    log_info "  3. Deploy monitoring stack with: docker-compose up -d prometheus grafana"
}

main
