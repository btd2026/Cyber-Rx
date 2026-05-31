# CyberRx Deployment Runbook

## Overview

This runbook provides step-by-step procedures for common operational tasks.

## Pre-Deployment Checklist

Before deploying to production, complete these steps:

- [ ] All tests pass locally
- [ ] Code review approved
- [ ] Security scan completed with no critical issues
- [ ] Database migrations prepared
- [ ] Feature flags configured
- [ ] Monitoring dashboards ready
- [ ] Rollback plan documented
- [ ] Stakeholders notified

## Deployment Procedures

### Standard Deployment

**Time Required:** 15-30 minutes
**Impact:** Zero-downtime

```bash
# 1. Create deployment branch
git checkout -b deploy/$(date +%Y%m%d)-feature-name

# 2. Merge to staging
git checkout staging
git merge deploy/$(date +%Y%m%d)-feature-name
git push origin staging

# 3. Monitor staging deployment
# Check GitHub Actions workflow
# Verify staging.cyberrx.com

# 4. Run smoke tests on staging
cd tests/e2e
npx playwright test --grep "@smoke" --env=staging

# 5. Merge to main
git checkout main
git merge staging
git push origin main

# 6. Monitor production deployment
# Check GitHub Actions workflow
# Verify app.cyberrx.com

# 7. Run smoke tests on production
npx playwright test --grep "@smoke" --env=production

# 8. Monitor dashboards for 30 minutes
```

### Emergency Deployment

**Time Required:** 5-10 minutes
**Impact:** Low risk (critical fixes only)

```bash
# 1. Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-issue

# 2. Apply fix
git add .
git commit -m "hotfix: critical security fix"

# 3. Push and create PR
git push origin hotfix/critical-issue

# 4. Expedite review and merge
# Request immediate review from team lead

# 5. Deploy to main
git checkout main
git merge hotfix/critical-issue
git push origin main

# 6. Monitor production closely for 1 hour
```

### Rollback Procedure

**Time Required:** 5 minutes
**Impact:** Immediate service restoration

```bash
# 1. Identify last stable deployment
git log --oneline | head -10

# 2. Rollback Git (if needed)
git revert HEAD
git push origin main

# 3. Rollback Vercel
cd frontend
vercel rollback --token=$VERCEL_TOKEN

# 4. Rollback Render (if needed)
# Trigger previous deployment via Render dashboard

# 5. Verify services restored
curl -f https://api.cyberrx.com/health
curl -f https://app.cyberrx.com/health

# 6. Monitor for 30 minutes
```

## Database Migrations

### Running Migrations

```bash
# 1. Review migration
cat migrations/20240115_add_audit_log.sql

# 2. Test on staging
psql $STAGING_DATABASE_URL < migrations/20240115_add_audit_log.sql

# 3. Verify changes
psql $STAGING_DATABASE_URL -c "\d audit_log"

# 4. Run on production during maintenance window
psql $PRODUCTION_DATABASE_URL < migrations/20240115_add_audit_log.sql

# 5. Verify production
psql $PRODUCTION_DATABASE_URL -c "SELECT COUNT(*) FROM audit_log;"
```

### Rollback Migration

```bash
# Create rollback migration first
cat migrations/20240115_rollback_add_audit_log.sql

# Test rollback on staging
psql $STAGING_DATABASE_URL < migrations/20240115_rollback_add_audit_log.sql

# If successful, run on production
psql $PRODUCTION_DATABASE_URL < migrations/20240115_rollback_add_audit_log.sql
```

## Scaling Operations

### Vertical Scaling (Database)

```bash
# 1. Current instance size
aws rds describe-db-instances \
  --db-instance-identifier cyberrx-db \
  --query 'DBInstances[0].DBInstanceClass'

# 2. Modify instance (maintenance window)
aws rds modify-db-instance \
  --db-instance-identifier cyberrx-db \
  --db-instance-class db.t3.xlarge \
  --apply-immediately

# 3. Monitor during scaling
# Check DataDog dashboard
# Monitor connection pool

# 4. Verify new capacity
psql $DATABASE_URL -c "SELECT version();"
```

### Horizontal Scaling (Backend)

```bash
# 1. Update Render instance count
# Via Render dashboard or API

# 2. Verify load balancing
curl -H "Host: api.cyberrx.com" https://lb1.cyberrx.com/health
curl -H "Host: api.cyberrx.com" https://lb2.cyberrx.com/health

# 3. Monitor metrics
# Check DataDog for request distribution
```

## Monitoring Procedures

### Daily Health Checks

```bash
# 1. Check all services
./deployment/scripts/health-check.sh

# 2. Review error rates
# DataDog dashboard → API Performance

# 3. Check database performance
psql $DATABASE_URL -c "
  SELECT query, calls, mean_exec_time 
  FROM pg_stat_statements 
  ORDER BY mean_exec_time DESC 
  LIMIT 10;
"

# 4. Check cache performance
redis-cli -h $REDIS_HOST INFO stats | grep hit_rate
```

### Weekly Performance Review

```bash
# 1. Generate weekly report
./deployment/scripts/performance-report.sh

# 2. Review slow queries
psql $DATABASE_URL -c "
  SELECT query, mean_exec_time, calls 
  FROM pg_stat_statements 
  WHERE mean_exec_time > 100 
  ORDER BY total_exec_time DESC 
  LIMIT 20;
"

# 3. Review cache efficiency
redis-cli -h $REDIS_HOST INFO stats

# 4. Review cost optimization
# AWS Cost Explorer
# Render billing dashboard
```

## Incident Response

### Severity Levels

**SEV1 (Critical):**
- Service completely down
- Data breach suspected
- Impact: All users
- Response time: 15 minutes

**SEV2 (High):**
- Major functionality broken
- Performance degradation > 50%
- Impact: Many users
- Response time: 1 hour

**SEV3 (Medium):**
- Minor functionality broken
- Performance degradation < 50%
- Impact: Some users
- Response time: 4 hours

**SEV4 (Low):**
- Cosmetic issues
- No impact to functionality
- Impact: Few users
- Response time: 1 business day

### Incident Response Procedure

1. **Detection**
   - Alert received from monitoring
   - User report received

2. **Assessment**
   - Determine severity level
   - Identify affected users
   - Estimate impact

3. **Response**
   - Assemble incident team
   - Create incident Slack channel
   - Update status page

4. **Mitigation**
   - Implement workaround
   - Deploy fix (if safe)
   - Rollback (if needed)

5. **Resolution**
   - Verify fix successful
   - Monitor for 1 hour
   - Close incident

6. **Post-Mortem**
   - Document root cause
   - Create action items
   - Update runbook

## Backup & Recovery

### Database Backup

```bash
# 1. Create manual backup
aws rds create-db-snapshot \
  --db-instance-identifier cyberrx-db \
  --db-snapshot-identifier cyberrx-manual-$(date +%Y%m%d)

# 2. Verify snapshot
aws rds describe-db-snapshots \
  --db-snapshot-identifier cyberrx-manual-$(date +%Y%m%d)

# 3. List all snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier cyberrx-db
```

### Database Recovery

```bash
# 1. Identify snapshot to restore
aws rds describe-db-snapshots \
  --db-instance-identifier cyberrx-db \
  --query 'DBSnapshots[*].{Snapshot:DBSnapshotIdentifier,Time:SnapshotCreateTime}' \
  --output table

# 2. Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier cyberrx-db-restored \
  --db-snapshot-identifier cyberrx-snapshot-20240115

# 3. Wait for restore to complete
aws rds wait db-instance-available \
  --db-instance-identifier cyberrx-db-restored

# 4. Update application connection
# Update DATABASE_URL environment variable

# 5. Verify restore
psql $NEW_DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

## Security Incidents

### Suspected Data Breach

1. **Immediate Actions**
   - Lock down affected systems
   - Enable verbose logging
   - Preserve forensic data

2. **Assessment**
   - Determine scope of breach
   - Identify affected data
   - Assess legal implications

3. **Notification**
   - Notify security team
   - Notify legal counsel
   - Notify affected parties (if required)

4. **Remediation**
   - Patch security vulnerability
   - Reset compromised credentials
   - Implement additional controls

5. **Post-Incident**
   - Complete incident report
   - Update security policies
   - Conduct security review

## Maintenance Windows

### Scheduled Maintenance

**Weekly:** Wednesday 2-4 AM ET
- Database backups verification
- Security patch application
- Performance optimization

**Monthly:** First Sunday 2-6 AM ET
- Database maintenance
- Redis cluster maintenance
- Major updates

**Quarterly:** As scheduled
- Disaster recovery testing
- Major version upgrades
- Infrastructure review

### Maintenance Announcements

```bash
# Send maintenance notification 1 week before
./deployment/scripts/send-maintenance-notice.sh \
  --date "2024-01-21" \
  --window "02:00-06:00" \
  --impact "Minor performance degradation expected"

# Update status page
# Update monitoring dashboards
# Notify stakeholders
```

## Troubleshooting

### Common Issues and Solutions

**Issue: API returns 500 errors**
```bash
# 1. Check application logs
cd cyberrx-api
tail -f logs/error.log

# 2. Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# 3. Check Redis connectivity
redis-cli -h $REDIS_HOST PING

# 4. Restart application
# Via Render dashboard or API
```

**Issue: Database connection pool exhausted**
```bash
# 1. Check active connections
psql $DATABASE_URL -c "
  SELECT count(*) 
  FROM pg_stat_activity 
  WHERE state = 'active';
"

# 2. Identify long-running queries
psql $DATABASE_URL -c "
  SELECT pid, now() - query_start as duration, query 
  FROM pg_stat_activity 
  WHERE state = 'active' 
  ORDER BY duration DESC;
"

# 3. Kill long-running queries (if safe)
psql $DATABASE_URL -c "SELECT pg_cancel_backend(pid);"

# 4. Increase pool size if needed
```

**Issue: High memory usage**
```bash
# 1. Check process memory
docker stats

# 2. Check Node.js heap
kill -USR2 <pid>  # triggers heap dump

# 3. Analyze heap dump
node --heap-prof snapshot-1.heapsnapshot

# 4. Restart service if needed
```

## Communication Procedures

### Stakeholder Notifications

**Pre-Deployment:**
- Engineering team: Slack
- Product team: Email
- Support team: Email
- Customers (for major changes): Status page

**During Incident:**
- Create incident Slack channel
- Update status page
- Send email to affected customers
- Page on-call engineer (if SEV1)

**Post-Incident:**
- Share post-mortem
- Update documentation
- Schedule follow-up meeting

## Documentation Updates

When updating this runbook:

1. Update procedures based on lessons learned
2. Add new troubleshooting scenarios
3. Update contact information
4. Review and update monthly
5. Maintain version history

---

**Last Updated:** 2024-01-15
**Version:** 1.0
**Maintained By:** DevOps Team
