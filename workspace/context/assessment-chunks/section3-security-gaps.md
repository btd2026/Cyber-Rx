# M0 Security Gaps (source slices)

## 3. Prioritized Product Backlog

### MVP MUST-HAVE (Prove Core Value Proposition)

#### 1. Fix Critical Security Gaps (Week 1-2)
Why: You can't sell a cybersecurity platform without proper authentication and multi-tenancy.

- Enforce JWT authentication on all API endpoints
- Implement real org isolation (header validation + auth identity binding)
- Tighten CORS to production allowlist (remove "For now, allow all - tighten in production")
- Either deploy background scheduler in production or remove dead code



## Current Security Gaps
Security Gaps: CORS allows all origins with TODO comment; no JWT enforcement on endpoints; no multi-tenant credential isolation; demo data fallbacks in production.
