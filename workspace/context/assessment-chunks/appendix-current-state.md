## Appendix: Current State Summary

Frontend (React 19 + Vite 8): 18 pages in a single 24,539-line App.jsx file. Executive dashboards: CISO, CRO/Audit, CFO, Board (4 of 6). Healthcare-specific org templates and process catalogs. Embedded datasets: CIS v8, NIST, HIPAA, CMS controls, vendor ecosystem.

Backend (Node 20 + Express): real API integrations (5 ITSM systems, 7 security tools); background scheduler code (deployment status unclear); PostgreSQL with 5 tables (orgs, users, metrics, route_actions, tool_connections); credential vault (local mode, not multi-tenant).

Deployment: frontend on Vercel; backend on Render; database on Render PostgreSQL; authentication JWT configured but not enforced.

Security Gaps: CORS allows all origins with TODO comment; no JWT enforcement on endpoints; no multi-tenant credential isolation; demo data fallbacks in production.
