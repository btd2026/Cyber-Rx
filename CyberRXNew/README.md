# CyberRx (CyberRXNew)

The new **CyberRx** executive cybersecurity decision platform — built fresh and
kept fully separate from the legacy app at the repo root (`frontend/`,
`cyberrx-api/`), which is untouched.

Source of truth lives in [`docs/`](./docs): the build brief, the prompt pack,
the approved mock, and the per-phase plans/proofs.

## Layout

```
CyberRXNew/
├── src/            # React + Vite + TypeScript frontend (the seven seats)
├── supabase/       # backend: SQL migrations (schema + RLS) — the data layer
├── scripts/local/  # the two-tenant RLS isolation test + runner
└── docs/           # brief, prompt pack, mock, phase plans & proofs
```

Frontend and backend are separated: the browser only ever talks to Supabase /
server functions — never to secrets or the database directly. The Anthropic key
and `service_role` key are server-side only.

## Getting started (frontend)

```bash
cd CyberRXNew
cp .env.example .env      # fill in your Supabase URL + anon key
npm install
npm run dev               # http://localhost:5174
```

## Scripts

| Command             | Description                                  |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Dev server on port 5174 (alongside old app)  |
| `npm run build`     | Production build to `dist/`                  |
| `npm run preview`   | Preview the production build                 |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`)            |
| `npm run lint`      | Run ESLint                                   |

## Database / backend

The schema, Row-Level Security, role model, and signed decision ledger live in
`supabase/migrations/`. Prove tenant isolation locally anytime:

```bash
bash scripts/local/run_isolation_test.sh
```

Apply to your own Supabase project: see `docs/PHASE_1_5_PREVIEW.md`.

## Progress

- ✅ **Phase 1** — Foundation: schema, RLS, role model, signed ledger (isolation proven)
- ✅ **Phase 1.5** — Live preview: TypeScript frontend, login → MFA, auth-guarded app
- ⏭️ **Phase 2** — Executive shell + CISO seat

Deploy to Vercel with **Root Directory = `CyberRXNew`**.
