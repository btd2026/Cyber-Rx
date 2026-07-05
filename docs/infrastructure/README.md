# Nerion Production Infrastructure

## Overview

Nerion is a healthcare cybersecurity platform designed for healthcare payers. This infrastructure is built with HIPAA compliance, high availability, and security as top priorities.

**Stack:**
- Frontend: React 19 + Vite → Vercel (CDN)
- Backend: Node 20 + Express → Render (AWS)
- Database: PostgreSQL 15 → AWS RDS (Multi-AZ)
- Cache: Redis 7 → Redis Cloud
- Monitoring: Prometheus + Grafana + DataDog + Sentry
- CI/CD: GitHub Actions
- CDN: CloudFront

## Architecture

```
┌─────────────────┐
│   Users         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CloudFront     │ ← SSL Certificate
│  (CDN)          │ ← WAF Rules
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────┐
│ Vercel │ │  Render  │
│ (Front) │ │ (Backend)│
└────────┘ └────┬─────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
┌──────────────┐  ┌──────────────┐
│   RDS        │  │ Redis Cloud  │
│ (PostgreSQL) │  │   (Cache)    │
└──────────────┘  └──────────────┘
        │
        ▼
┌───────────────────┐
│   AWS Secrets     │
│   Manager         │
└───────────────────┘
```

## Prerequisites

### Required Accounts & Services

1. **AWS Account** - For RDS, Secrets Manager, CloudFront
2. **Vercel Account** - Frontend deployment
3. **Render Account** - Backend deployment
4. **Redis Cloud** - Caching layer
5. **DataDog Account** - Monitoring and observability
6. **Sentry Account** - Error tracking
7. **GitHub Account** - CI/CD and source control

### Required Environment Variables

```bash
# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# Database
DB_HOST=xxx.xxx.rds.amazonaws.com
DB_PORT=5432
DB_NAME=cyberrx
DB_USER=cyberrx_user
DB_PASSWORD=xxx

# Redis
REDIS_HOST=xxx.redis.cloud.com
REDIS_PORT=6379
REDIS_PASSWORD=xxx

# Security
JWT_SECRET=xxx
AWS_SECRET_ID=cyberrx/credentials

# Monitoring
DATADOG_API_KEY=xxx
SENTRY_DSN=https://xxx@sentry.io/xxx

# Deployment
VERCEL_TOKEN=xxx
VERCEL_ORG_ID=xxx
VERCEL_PROJECT_ID=xxx
RENDER_API_KEY=xxx
RENDER_SERVICE_ID=xxx

# Notifications
SLACK_WEBHOOK_URL=xxx
PAGERDUTY_API_TOKEN=xxx
PAGERDUTY_ROUTING_KEY=xxx
```

## Quick Start

### 1. Initial Setup

```bash
# Clone repository
git clone https://github.com/your-org/cyber-rx.git
cd cyber-rx

# Install dependencies
cd frontend && npm install
cd ../cyberrx-api && npm install

# Setup monitoring
./deployment/scripts/monitoring-setup.sh
```

### 2. Deploy Infrastructure

```bash
# Deploy with Terraform
cd terraform/environments/production
terraform init
terraform plan
terraform apply
```

### 3. Deploy Applications

```bash
# Deploy to staging
./deployment/scripts/deploy.sh staging main

# Deploy to production
./deployment/scripts/deploy.sh production main
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci-cd.yml`) automatically:

1. **Tests** - Runs all unit and integration tests
2. **Security Scans** - Runs Snyk, Trivy, and OWASP dependency checks
3. **Builds** - Builds frontend and backend
4. **Deploys** - Deploys to staging/production
5. **E2E Tests** - Runs end-to-end tests
6. **Monitoring** - Runs performance tests and security checks
7. **Notifications** - Sends Slack and PagerDuty alerts

## Monitoring & Observability

### DataDog Dashboards

**Key Metrics:**
- API response times (p50, p95, p99)
- Database query performance
- Cache hit rates
- Error rates by endpoint
- System resource usage

**Alerts:**
- API error rate > 5% (critical)
- Response time p95 > 1s (warning)
- Database connection pool exhausted (critical)
- Redis down (critical)
- High CPU/memory usage (warning)

### Grafana Dashboards

Access at `https://monitoring.cyberrx.com:3000`

**Available Dashboards:**
- API Performance
- Database Performance
- Cache Performance
- System Metrics
- Error Tracking

### Sentry Error Tracking

**Configuration:**
- Real-time error tracking
- Performance monitoring
- Release tracking
- Alert rules for critical errors

## Security

### HIPAA Compliance

- All data encrypted at rest (AES-256)
- All data encrypted in transit (TLS 1.3)
- Audit logging enabled
- Access controls enforced
- Regular security assessments

### Access Controls

- Multi-factor authentication required
- Role-based access control (RBAC)
- Principle of least privilege
- Regular access reviews

### Network Security

- VPC with private subnets
- Security groups restricting access
- Web Application Firewall (WAF)
- DDoS protection via CloudFront

## Backup & Disaster Recovery

### Automated Backups

- **Database**: Daily automated backups (30-day retention)
- **Redis**: AOF persistence with daily snapshots
- **S3**: Cross-region replication enabled

### Recovery Procedures

**Database Recovery:**
```bash
# List snapshots
aws rds describe-db-snapshots --db-instance-identifier cyberrx-db

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier cyberrx-db-restored \
  --db-snapshot-identifier cyberrx-db-snapshot-2024-01-15
```

## Performance Optimization

### Database

- Connection pooling: 50 max connections
- Read replicas for scaling
- Query optimization with pg_stat_statements
- Index monitoring and optimization

### Cache

- Redis memory limit: 512MB
- Eviction policy: allkeys-lru
- Persistence: RDB + AOF
- Connection pooling

### CDN

- CloudFront for static assets
- Cache policy: 1 year for /assets/
- Gzip compression enabled
- Brotli compression enabled

## Scaling

### Horizontal Scaling

- **Backend**: Auto-scaling on Render (2-10 instances)
- **Database**: Read replicas for read-heavy workloads
- **Cache**: Redis Cluster for high availability

### Vertical Scaling

- **Database**: t3.large → t3.xlarge → t3.2xlarge
- **Cache**: 512MB → 1GB → 2GB

## Troubleshooting

### Common Issues

**Issue: High API latency**
```bash
# Check response times
curl -w "@-" -o /dev/null -s 'http://api.cyberrx.com/health' <<EOF
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
   time_pretransfer:  %{time_pretransfer}\n
      time_redirect:  %{time_redirect}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
EOF

# Check database performance
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

**Issue: Redis connection failures**
```bash
# Check Redis status
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD PING

# Check Redis memory
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD INFO memory
```

**Issue: High memory usage**
```bash
# Check process memory
docker stats

# Check Node.js heap size
node --max-old-space-size=4096 src/index.js
```

## Support & Escalation

### On-Call Procedures

1. **Critical Issues** - PagerDuty alerts → On-call engineer
2. **High Priority** - Slack notifications → Engineering team
3. **Low Priority** - GitHub issues → Development team

### Contacts

- **DevOps Lead**: devops@cyberrx.com
- **Engineering Manager**: eng@cyberrx.com
- **Security Team**: security@cyberrx.com

## Documentation

- [Architecture Decisions](./ARCHITECTURE.md)
- [Deployment Runbook](./RUNBOOK.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Security Policies](./SECURITY.md)
- [API Documentation](./API.md)

## Maintenance

### Regular Tasks

**Daily:**
- Review DataDog dashboards
- Check Sentry error reports
- Monitor system health

**Weekly:**
- Review and optimize slow queries
- Check cache hit rates
- Review security logs

**Monthly:**
- Database backup verification
- Security patch updates
- Capacity planning review
- Cost optimization review

**Quarterly:**
- Disaster recovery drill
- Security audit
- Performance review
- Architecture review

## Costs

**Monthly Cost Breakdown:**
- AWS RDS: $200-500 (depending on instance size)
- Redis Cloud: $80-150
- Vercel: $20-100
- Render: $50-200
- DataDog: $75-200
- CloudFront: $50-100
- **Total**: $475-1,250/month

**Cost Optimization Tips:**
- Use reserved instances for databases
- Enable CloudFront caching
- Optimize Redis memory usage
- Regularly review and remove unused resources

## Compliance

### HIPAA

- Business Associate Agreements (BAAs) in place
- Encryption at rest and in transit
- Access controls and audit logging
- Regular security assessments
- Incident response procedures

### SOC 2 Type II

- Annual audit conducted
- Security controls documented
- Monitoring and logging enabled
- Incident response tested

### PCI DSS

- Not applicable (no payment processing)

## Future Enhancements

**Planned Improvements:**
- [ ] Multi-region deployment
- [ ] Kubernetes orchestration
- [ ] GraphQL API
- [ ] Real-time analytics with ClickHouse
- [ ] Machine learning for anomaly detection
- [ ] Automated compliance scanning

## Contributing

When making infrastructure changes:

1. Update this README
2. Update Terraform documentation
3. Test in staging first
4. Get approval for production changes
5. Document the change

## License

Proprietary - All rights reserved

---

**Last Updated:** 2025-01-15
**Maintained By:** DevOps Team
