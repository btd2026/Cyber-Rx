# CyberRx Observability Production Deployment Checklist

**Purpose**: Ensure all observability components are properly configured for production deployment

**Deployment Date**: _______________
**Deployed By**: _______________
**Environment**: ☐ Production  ☐ Staging  ☐ Development

---

## Pre-Deployment Checklist

### 1. Environment Configuration ☐

```bash
# Verify required environment variables are set
☐ SENTRY_DSN configured
☐ SENTRY_ENVIRONMENT set to "production"
☐ DATADOG_API_KEY configured (if using DataDog)
☐ DATADOG_APP_KEY configured (if using DataDog)
☐ DD_ENV set to "production"
☐ DD_SERVICE set to "cyberrx-api"
☐ LOG_LEVEL set to "info"
☐ REDIS_URL configured (for caching)
☐ DATABASE_URL configured and accessible
```

**Verification Commands**:
```bash
# Check environment variables
echo $SENTRY_DSN
echo $DATADOG_API_KEY
echo $REDIS_URL
echo $DATABASE_URL
```

### 2. Dependencies Verification ☐

```bash
# Check all observability packages are installed
☐ winston installed (npm list winston)
☐ winston-daily-rotate-file installed
☐ @sentry/node installed
☐ No security vulnerabilities (npm audit)
```

**Verification Commands**:
```bash
cd /Users/briandibassinga/Github/Cyber-Rx/cyberrx-api
npm list winston winston-daily-rotate-file @sentry/node
npm audit
```

### 3. Logging Configuration ☐

```bash
# Verify logging setup
☐ logs directory exists
☐ logs directory has write permissions
☐ Log rotation configured (14/30 days)
☐ JSON format enabled for production
☐ Error logs separated
```

**Verification Commands**:
```bash
cd /Users/briandibassinga/Github/Cyber-Rx/cyberrx-api
ls -la logs/
mkdir -p logs
chmod 755 logs
```

### 4. Sentry Configuration ☐

```bash
# Verify Sentry setup
☐ Sentry project created
☐ DSN configured correctly
☐ Source maps uploaded (if using)
☐ Alerts configured in Sentry
☐ Team members invited to Sentry project
```

**Verification Steps**:
1. Log into Sentry.io
2. Verify project exists
3. Check DSN matches environment variable
4. Test error capture:
   ```javascript
   const Sentry = require('@sentry/node');
   Sentry.captureException(new Error('Test error'));
   ```
5. Verify error appears in Sentry dashboard

### 5. DataDog Configuration (Optional but Recommended) ☐

```bash
# Verify DataDog setup
☐ DataDog account created
☐ API key and App key obtained
☐ Agent installed on server (if self-hosted)
☐ Service tags configured
☐ Dashboards created
☐ Monitors configured
```

**Verification Commands**:
```bash
# If using DataDog Agent
dd-agent status

# Verify tags
echo $DD_ENV
echo $DD_SERVICE
echo $DD_VERSION
```

---

## Deployment Checklist

### 6. Deploy Application ☐

```bash
# Build and deploy
☐ Application built successfully
☐ Environment variables set in production
☐ Database migrations run
☐ Services started without errors
☐ Health endpoints accessible
```

**Verification Commands**:
```bash
# Check health endpoints
curl https://api.cyberrx.com/health
curl https://api.cyberrx.com/health/live
curl https://api.cyberrx.com/health/ready

# Check all health endpoints
curl https://api.cyberrx.com/health/database
curl https://api.cyberrx.com/health/redis
curl https://api.cyberrx.com/health/metrics
```

### 7. Verify Logging ☐

```bash
# Verify logs are being written
☐ Application logs being created
☐ Error logs being created
☐ Logs in JSON format (production)
☐ Log rotation working
☐ No errors in logs
```

**Verification Commands**:
```bash
# Check log files exist
ls -la logs/application-$(date +%Y-%m-%d).log
ls -la logs/error-$(date +%Y-%m-%d).log

# Verify JSON format
cat logs/application-$(date +%Y-%m-%d).log | jq | head -20

# Check for errors
grep ERROR logs/error-$(date +%Y-%m-%d).log
```

### 8. Verify Error Tracking ☐

```bash
# Verify Sentry is capturing errors
☐ Sentry initialized on startup
☐ Test errors captured in Sentry
★ Performance data appearing in Sentry
★ Source maps working (if uploaded)
```

**Verification Steps**:
1. Check application logs for "Sentry initialized"
2. Trigger a test error:
   ```bash
   curl -X POST https://api.cyberrx.com/api/test-error
   ```
3. Verify error appears in Sentry dashboard within 1 minute

### 9. Verify Health Checks ☐

```bash
# Test all health endpoints
☐ /health returns 200
☐ /health/live returns 200
☐ /health/ready returns 200 (when dependencies are up)
☐ /health/database returns 200
☐ /health/redis returns 200 (if configured)
☐ /health/metrics returns 200
```

**Expected Responses**:
```bash
# Basic health
curl https://api.cyberrx.com/health
# {"status":"ok","version":"1.0.0","timestamp":"2026-05-30T...","environment":"production"}

# Readiness
curl https://api.cyberrx.com/health/ready
# {"status":"ready","timestamp":"...","checks":{"database":true,"redis":true}}

# Database
curl https://api.cyberrx.com/health/database
# {"status":"healthy","timestamp":"...","database":{"connected":true,"size":"..."}}
```

---

## Post-Deployment Checklist

### 10. Monitor First Hour ☐

```bash
# Monitor the application for first hour
☐ Error rate <1%
☐ Response time p95 <500ms
☐ No critical alerts triggered
☐ Logs show normal startup
☐ Health checks remain stable
☐ No memory leaks
☐ CPU usage <50%
```

**Monitoring Commands**:
```bash
# Watch logs
tail -f logs/application-$(date +%Y-%m-%d).log

# Check error rate
grep ERROR logs/error-$(date +%Y-%m-%d).log | wc -l

# Check health
watch -n 5 curl https://api.cyberrx.com/health
```

### 11. Verify Alerting ☐

```bash
# Test alert delivery
☐ Prometheus alerts configured
☐ Alertmanager notification working
☐ PagerDuty integration tested (if using)
☐ Slack integration tested (if using)
☐ Email alerts tested
☐ On-call engineer receives test alert
```

**Test Commands**:
```bash
# Test Prometheus alerts
curl -X POST http://localhost:9093/-/reload

# Manually trigger test alert
curl -X POST http://localhost:9093/api/v1/alerts -d '{
  "alerts": [{
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning"
    }
  }]
}'
```

### 12. Documentation ☐

```bash
# Update documentation
☐ Deployment runbook updated
☐ Architecture diagrams updated
☐ On-call runbook updated
☐ Incident response procedures updated
☐ Team trained on new monitoring
```

### 13. Create Dashboards ☐

```bash
# Create monitoring dashboards
☐ Executive dashboard created
☐ Operations dashboard created
☐ Database performance dashboard created
☐ Security dashboard created
☐ Custom dashboards for specific needs
```

**Recommended Dashboards**:
1. **Executive Dashboard**: High-level overview
2. **Operations Dashboard**: Real-time metrics
3. **Performance Dashboard**: Response times, throughput
4. **Database Dashboard**: Query performance, connections
5. **Security Dashboard**: Auth failures, rate limits

---

## Rollback Procedure

If critical issues are detected:

```bash
# Immediate rollback steps
☐ Stop traffic to new deployment
☐ Revert to previous version
☐ Verify health checks pass
☐ Monitor error rates return to normal
☐ Investigate issues in rollback version
☐ Document root cause
☐ Plan fix for future deployment
```

**Rollback Commands**:
```bash
# Render rollback
render rollback cyberrx-api

# Or manual version switch
git checkout <previous-version-tag>
git push origin main --force
```

---

## Success Criteria

Deployment is successful when:

- ✅ All health endpoints return 200
- ✅ Error rate <1% for first hour
- ✅ Response time p95 <500ms
- ✅ No critical alerts triggered
- ✅ Logs show no errors
- ✅ Sentry capturing errors
- ✅ DataDog metrics appearing (if configured)
- ✅ Alert delivery working
- ✅ Team trained on new monitoring

---

## Contact Information

**On-Call Engineer**: _______________
**DevOps Lead**: _______________
**Senior Backend Engineer**: _______________
**Security Team**: _______________

**Escalation Path**:
1. On-Call Engineer
2. DevOps Lead
3. CTO/Engineering Director

---

## Notes

```
Add any deployment notes or issues encountered here:





```

---

**Deployment Status**: ☐ SUCCESS  ☐ ROLLED_BACK  ☐ FAILED
**Completion Time**: _______________
**Next Review**: _______________
