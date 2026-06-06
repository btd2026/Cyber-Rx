# CFO Agent Usage Guide

Complete guide for using the CFO Agent for financial risk briefings.

**Version:** 1.0.0
**Last Updated:** 2025-06-06

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Common Use Cases](#common-use-cases)
4. [Query Examples](#query-examples)
5. [Understanding Briefings](#understanding-briefings)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The CFO Agent generates board-meeting-ready financial briefings for health plan executives. It uses Claude Sonnet AI to analyze financial risks, calculate MLR impact, and provide executive recommendations.

### Key Capabilities

- **Dollar Exposure Analysis:** Break down financial exposure by business process, risk category, and time horizon
- **MLR Impact Calculation:** Quantify Medical Loss Ratio impact for each risk
- **Trend Analysis:** Track exposure changes over time
- **Board-Ready Summaries:** Generate executive-friendly briefings with methodology trails
- **Multiple Formats:** Output JSON (for dashboards), Markdown (for reports), or Summary (for quick review)

### What Makes the CFO Agent Different?

Unlike generic AI assistants, the CFO Agent is:

- **Domain-Specific:** Tailored for health plan financial risk
- **HIPAA-Compliant:** NO PHI in LLM calls (validated)
- **Auditable:** Full methodology trails for all calculations
- **Actionable:** Prioritized recommendations with urgency levels

---

## Quick Start

### 1. Generate Your First Briefing

**Request:**

```bash
curl -X POST https://api.cyberrx.com/api/cfo/agent/query \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "org-123",
    "query": "What is our total dollar exposure and MLR impact?"
  }'
```

**Response:**

```json
{
  "metadata": {
    "briefing_id": "uuid",
    "generated_at": "2025-06-06T12:00:00Z"
  },
  "executive_summary": {
    "summary": "Total exposure: $2.5M with 3.2% MLR impact...",
    "total_exposure": 2500000,
    "total_exposure_formatted": "$2.5M"
  },
  "exposure_breakdown": {...},
  "top_risks": [...],
  "recommendations": [...]
}
```

### 2. Get Exposure Breakdown (Fast)

For dashboard widgets, use the fast endpoint:

```bash
curl -X GET "https://api.cyberrx.com/api/cfo/exposure?organization_id=org-123" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### 3. Get Trends (Fast)

For trend charts:

```bash
curl -X GET "https://api.cyberrx.com/api/cfo/trends?organization_id=org-123" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

## Common Use Cases

### Use Case 1: Board Meeting Preparation

**Scenario:** You're preparing for a board meeting and need a comprehensive financial risk briefing.

**Query:**

```json
{
  "organization_id": "org-123",
  "query": "Prepare a board briefing on our current financial risk exposure, MLR impact, and top risks requiring attention",
  "include_trends": true,
  "format_type": "markdown"
}
```

**Why:** Generates full board-ready briefing in Markdown format for export to PDF.

### Use Case 2: Daily Dashboard

**Scenario:** You want to show current exposure on a dashboard widget.

**Approach:** Use fast endpoints (`/exposure` and `/trends`) with 5-minute caching.

```python
# Get exposure breakdown
exposure = await get_exposure_breakdown("org-123")

# Get trends
trends = await get_trends("org-123")

# Display on dashboard
display_exposure_widget(exposure)
display_trend_chart(trends)
```

### Use Case 3: Scenario Analysis

**Scenario:** You want to understand the financial impact of a ransomware attack.

**Query:**

```json
{
  "organization_id": "org-123",
  "query": "What is our financial exposure if a ransomware attack hits our claims adjudication system?",
  "include_trends": false
}
```

**Why:** Provides scenario-specific analysis with dollar amounts and MLR impact.

### Use Case 4: MLR Impact Review

**Scenario:** You need to understand which risks affect your MLR the most.

**Query:**

```json
{
  "organization_id": "org-123",
  "query": "Which cyber risks have the highest MLR impact and what mitigation should we prioritize?"
}
```

**Why:** Identifies top MLR risks with prioritized recommendations.

---

## Query Examples

### Dollar Exposure Queries

```
"What is our total dollar exposure by business process?"
"Show me exposure breakdown by risk category"
"What is our net exposure after insurance?"
"How much exposure is in the immediate time horizon?"
```

### MLR Impact Queries

```
"What is our total MLR impact from cyber risks?"
"Which business processes have the highest MLR impact?"
"What risks are driving our MLR impact?"
"How would a data breach affect our MLR?"
```

### Trend Queries

```
"How has our exposure changed over the last 30 days?"
"What are our emerging financial risks?"
"Are we seeing any anomalous spikes in exposure?"
"What is the trend velocity of our risk profile?"
```

### Scenario Queries

```
"What is the financial impact of a ransomware attack on claims?"
"How would a member portal data breach affect our premium revenue?"
"What is our exposure if the payment system goes down for a week?"
```

### Mitigation Queries

```
"What risks should we prioritize for mitigation?"
"What is the ROI of mitigating our top 3 risks?"
"How much exposure reduction would we get from investing in claims system security?"
```

---

## Understanding Briefings

### Briefing Structure

Every CFO briefing contains these sections:

#### 1. Metadata

```json
{
  "metadata": {
    "briefing_id": "uuid",
    "generated_at": "2025-06-06T12:00:00Z",
    "agent_type": "cfo",
    "duration_seconds": 15.5,
    "validation": {...}
  }
}
```

- **briefing_id:** Unique ID for tracking
- **generated_at:** When briefing was created
- **duration_seconds:** How long generation took
- **validation:** Completeness and quality checks

#### 2. Executive Summary

```json
{
  "executive_summary": {
    "summary": "2-3 sentence overview",
    "total_exposure": 2500000,
    "total_exposure_formatted": "$2.5M",
    "mlr_impact": 3.2,
    "top_risk_count": 12
  }
}
```

**Key Takeaway:** Read this first for the big picture.

#### 3. Exposure Breakdown

```json
{
  "exposure_breakdown": {
    "by_business_process": [...],
    "by_risk_category": [...],
    "by_time_horizon": {
      "immediate": {...},
      "30-days": {...},
      "90-days": {...}
    }
  }
}
```

**Key Takeaway:** Understand where your exposure is concentrated.

#### 4. MLR Impact Analysis

```json
{
  "mlr_impact_analysis": {
    "total_mlr_impact": 3.2,
    "top_ml_risks": [...]
  }
}
```

**Key Takeaway:** Which risks affect your MLR the most.

#### 5. Top Risks

```json
{
  "top_risks": [
    {
      "rank": 1,
      "title": "Ransomware on claims system",
      "exposure": 1000000,
      "mlr_impact": 5.0,
      "likelihood": 0.8,
      "business_process": "Claims Adjudication",
      "time_horizon": "immediate"
    }
  ]
}
```

**Key Takeaway:** Your top risks by exposure, ranked.

#### 6. Trends

```json
{
  "trends": {
    "insights": [
      "CRITICAL: $500K in immediate exposure",
      "HIGH VELOCITY: Exposure changing rapidly"
    ]
  }
}
```

**Key Takeaway:** What's changing in your risk profile.

#### 7. Methodology Trail

```json
{
  "methodology_trail": {
    "steps": [
      "Data Source: 12 financial impacts from T-MVP-006",
      "Calculation: MLR Impact = (Net Exposure / $1M) × 1%"
    ]
  }
}
```

**Key Takeaway:** How numbers were calculated (for auditors).

#### 8. Recommendations

```json
{
  "recommendations": {
    "items": [
      "Immediate: Address ransomware exposure",
      "High: Review data breach controls"
    ],
    "priority_ordered": [...]
  }
}
```

**Key Takeaway:** What to do, prioritized by urgency.

### Interpreting Key Metrics

#### Total Exposure

**Definition:** Sum of net exposure across all risks (after insurance)

**Example:** $2.5M total exposure

**What it means:** If all risks materialize, you could lose $2.5M

**Context:** Compare to your annual revenue and risk appetite

#### MLR Impact

**Definition:** How much the risk affects your Medical Loss Ratio (MLR)

**Example:** 3.2% MLR impact

**What it means:** Your MLR could increase by 3.2 percentage points

**Context:** MLR is typically 80-85% for health plans. A 3.2% impact is significant.

#### Time Horizon

**Definition:** When the exposure would materialize

**Categories:**
- **Immediate:** Materializes within 24-48 hours (ransomware, outages)
- **30-days:** Materializes within a month (data breaches, fraud)
- **90-days:** Materializes within 3 months (other risks)

**What it means:** How urgently you need to act

#### Likelihood

**Definition:** Probability of risk materialization (0.0 to 1.0)

**Example:** 0.8 likelihood = 80% chance

**What it means:** How confident we are the risk will occur

---

## Best Practices

### 1. Query Writing

**DO:**
- Be specific about what you want
- Use health plan terminology (MLR, claims adjudication, premium revenue)
- Ask for action items when needed

**DON'T:**
- Use vague queries ("Tell me about risks")
- Ask about individual PHI (will be blocked)
- Expect real-time stock prices or market data

### 2. Time Ranges

**DO:**
- Use time ranges for trend analysis
- Keep ranges to 90 days or less (better performance)
- Use ISO format: "2025-01-01T00:00:00Z/2025-03-31T23:59:59Z"

**DON'T:**
- Use ranges longer than 1 year (performance issues)
- Expect historical data beyond your retention period

### 3. Format Selection

**DO:**
- Use `json` for dashboards and API integrations
- Use `markdown` for reports and PDF generation
- Use `summary` for quick reviews and mobile

**DON'T:**
- Expect HTML or other formats (not supported)

### 4. Caching

**DO:**
- Cache exposure breakdown for 5 minutes
- Cache trends for 15 minutes
- Cache briefings by query hash for 1 hour

**DON'T:**
- Cache indefinitely (data changes)
- Cache PHI responses (security risk)

### 5. Error Handling

**DO:**
- Handle PHI detection errors gracefully
- Implement retry logic with exponential backoff
- Log all errors for troubleshooting

**DON'T:**
- Expose raw errors to end users
- Retry immediately after rate limiting
- Ignore validation warnings

---

## Troubleshooting

### Common Issues

#### Issue 1: "PHI Detected" Error

**Symptom:** API returns 400/500 error with "PHI detected" message

**Cause:** PHI present in request or response

**Solution:**
1. Remove any member IDs, patient names, SSNs from query
2. Ensure organization has no PHI in financial impacts
3. Check with security team if PHI detection is too aggressive

#### Issue 2: Slow Briefing Generation

**Symptom:** Briefing takes > 30 seconds

**Cause:** Large dataset or complex query

**Solution:**
1. Reduce time range to 30 days
2. Use fast endpoints (`/exposure`, `/trends`) instead of full briefing
3. Add caching for repeated queries
4. Check database performance

#### Issue 3: Empty Briefing

**Symptom:** Briefing returns with no data

**Cause:** No financial impacts in database for organization

**Solution:**
1. Verify organization_id is correct
2. Check that T-MVP-006 has run for this organization
3. Verify financial_impacts table has data
4. Check time range is not too narrow

#### Issue 4: Invalid JWT Token

**Symptom:** 401 Unauthorized error

**Cause:** Expired or invalid JWT token

**Solution:**
1. Refresh JWT token from auth service
2. Verify token is not expired
3. Check token has correct scopes

#### Issue 5: "Agent Not Initialized" Error

**Symptom:** 503 Service Unavailable

**Cause:** CFO Agent not started on server

**Solution:**
1. Check agent runtime logs for startup errors
2. Verify database connection is healthy
3. Restart agent runtime service
4. Contact support if issue persists

### Debug Mode

Enable debug logging for troubleshooting:

```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("cfo_agent")
logger.setLevel(logging.DEBUG)
```

### Health Check

Check agent health:

```bash
curl https://api.cyberrx.com/api/cfo/health
```

Expected response:

```json
{
  "status": "healthy",
  "service": "cfo-agent",
  "agent_initialized": true
}
```

---

## Support

For additional help:

- **Documentation:** https://docs.cyberrx.com
- **API Reference:** See `cfo-agent-api.md`
- **GitHub Issues:** https://github.com/cyberrx/cyberrx/issues
- **Email:** support@cyberrx.com

---

## Changelog

### Version 1.0.0 (2025-06-06)

**Initial Release:**
- CFO briefing generation
- Exposure analysis by business process
- MLR impact calculation
- Trend analysis
- Board-ready summaries
- Multiple output formats (JSON, Markdown, Summary)
- PHI validation
- JWT authentication
