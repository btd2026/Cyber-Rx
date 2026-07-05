/**
 * Monitoring Configuration for Nerion API
 *
 * Provides monitoring setup for Prometheus/Grafana and CloudWatch
 * Health check metrics are exposed via /health endpoints
 */

const logger = require('./logger');

/**
 * Prometheus metrics configuration
 * For self-hosted or Kubernetes deployments
 */
const prometheusConfig = {
  enabled: process.env.PROMETHEUS_ENABLED === 'true',
  port: process.env.PROMETHEUS_PORT || 9090,
  endpoint: '/metrics',

  metrics: [
    {
      name: 'cyberrx_health_status',
      type: 'gauge',
      help: 'Current health status (1=healthy, 0=unhealthy)',
      labels: ['environment', 'service']
    },
    {
      name: 'cyberrx_database_latency_ms',
      type: 'histogram',
      help: 'Database query latency in milliseconds',
      labels: ['environment'],
      buckets: [1, 5, 10, 50, 100, 500, 1000]
    },
    {
      name: 'cyberrx_memory_usage_bytes',
      type: 'gauge',
      help: 'Memory usage in bytes',
      labels: ['type', 'environment']
    }
  ]
};

/**
 * AWS CloudWatch configuration
 * For AWS/serverless deployments
 */
const cloudWatchConfig = {
  enabled: process.env.CLOUDWATCH_ENABLED === 'true',
  region: process.env.AWS_REGION || 'us-east-1',
  namespace: 'Nerion/API',

  metrics: [
    {
      name: 'HealthCheckStatus',
      unit: 'Count',
      dimensions: [{ name: 'Environment', value: process.env.NODE_ENV || 'development' }]
    },
    {
      name: 'DatabaseLatency',
      unit: 'Milliseconds',
      dimensions: [{ name: 'Environment', value: process.env.NODE_ENV || 'development' }]
    }
  ]
};

/**
 * Alert thresholds for monitoring systems
 */
const alertThresholds = {
  healthStatusUnhealthy: 0,
  databaseLatencyWarning: 100,
  databaseLatencyCritical: 500,
  memoryUsageWarning: 70,
  memoryUsageCritical: 85
};

module.exports = {
  prometheusConfig,
  cloudWatchConfig,
  alertThresholds
};
