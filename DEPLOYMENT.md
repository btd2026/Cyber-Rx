# Deployment

CyberRx ships as two services that deploy independently from this monorepo:

| Part | Platform | Source dir | Config in repo |
|------|----------|-----------|----------------|
| Frontend (React + Vite) | **Vercel** | `frontend/` | `vercel.json` (root) |
| Backend API + scheduler + Postgres | **Render** | `cyberrx-api/` | `cyberrx-api/render.yaml` |

Deployment is **native Git auto-deploy** on both platforms — not GitHub Actions.
The `CI/CD Pipeline` workflow only validates (test + build) on every push/PR; it
does **not** deploy. Once the two integrations below are connected, every merge to
`main` ships automatically.

---

## 1. Backend — Render (Blueprint)

`cyberrx-api/render.yaml` already declares the web service, the metrics worker, and
a managed Postgres database, with `autoDeploy: true`.

1. Render Dashboard → **New → Blueprint**.
2. Connect `btd2026/Cyber-Rx`. Render reads `cyberrx-api/render.yaml`
   (set the blueprint root to `cyberrx-api/` if prompted).
3. Apply. This creates `cyberrx-api` (web), `cyberrx-scheduler` (worker), and
   `cyberrx-db` (Postgres). DB credentials wire in automatically via `fromDatabase`.
4. The API serves `https://cyberrx-api.onrender.com` with health check `/health`.
   The schema self-migrates on boot (`db.init()`), and `ingest/bootstrap.js` seeds
   the four-lens engine on first start (idempotent).

On every push to `main`, Render rebuilds and redeploys both services.

> If the live frontend origin differs from the defaults, update `FRONTEND_URL` /
> `CORS_ALLOWLIST` in `render.yaml` (or the service's env vars) so CORS allows it.

## 2. Frontend — Vercel

The root `vercel.json` builds the monorepo frontend
(`cd frontend && npm install && npm run build`, output `frontend/dist`).

1. Vercel → **Add New → Project**, import `btd2026/Cyber-Rx`.
2. Leave the root directory at the repo root (the root `vercel.json` handles the
   `frontend/` build). Framework preset: **Vite**.
3. **Environment variable** (optional): `VITE_API_URL = https://cyberrx-api.onrender.com`.
   The app already falls back to that URL when the var is unset, so this is only
   needed if the API lives elsewhere.
4. Deploy. Production branch = `main`; every merge triggers a new build.

## 3. Verify

```bash
curl -fsS https://cyberrx-api.onrender.com/health        # → {"status":"ok",...}
# then open the Vercel URL and confirm the CISO dashboard loads live data
```

---

## Local development

```bash
# Postgres (this env: local cluster on :5599)
export DATABASE_URL="postgresql://postgres:postgres@localhost:5599/cyberrx"

# Backend
cd cyberrx-api && npm install && npm start          # serves :3001, self-migrates + seeds

# Frontend (separate shell)
cd frontend && npm install && \
  VITE_API_URL=http://localhost:3001 npm run dev     # Vite dev server on :5173
```

Toggles: `ENGINE_BOOTSTRAP=false` skips four-lens seeding; `VERBATIM_CIS=true`
stores licensed CIS text verbatim (default false → paraphrase + native IDs only).
