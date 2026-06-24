# CyberRx — Phase 1.5: Live preview & sign-in

**Status:** Code complete and building. Standing up *your* live URL is a short
guided step we do together (it needs your Supabase + Vercel accounts).

From this phase on, every phase ends with something you can open and click.

---

## What was built

- **The frontend is now TypeScript** (per brief §4) — converted from the
  starter scaffold.
- **A real login → MFA front door**, styled to the approved mock's "situation
  room" look (dark, Space Grotesk / Public Sans / JetBrains Mono, blue brand).
  It uses Supabase Auth: email + password, and a 6-digit authenticator (TOTP)
  step when the account has MFA enrolled.
- **A signed-in placeholder page** — confirms auth + tenant-isolated data are
  live and shows what's coming in Phase 2. Includes sign-out.
- **An auth-guarded route** (`/app`): you can't reach it without a session.
- **Secret hygiene verified:** the browser bundle references no Anthropic key
  and no `service_role` key. Only the Supabase URL + anon key are used, and the
  anon key is *designed* to be public — Row-Level Security (Phase 1) is what
  actually controls access.

Build output: ~127 kB gzipped. `npm run build` and `npm run typecheck` both pass.

---

## How we make it live (≈15 minutes, guided)

You do steps 1–3 (account stuff); I can do 4–5 with you.

### 1. Create the Supabase project & push the schema
- Sign up at supabase.com, create a project (pick a region near your users).
- Apply the Phase 1 database (one time):
  ```bash
  npm i -g supabase
  supabase login
  cd CyberRXNew
  supabase link --project-ref <your-project-ref>
  supabase db push        # applies supabase/migrations/*
  ```
- In the dashboard: **Authentication → Providers → Email** = on;
  **Authentication → MFA → TOTP** = on.

### 2. Grab your two public keys
- **Project Settings → API**: copy the **Project URL** and the **anon public** key.

### 3. Deploy the frontend to Vercel
- Sign up at vercel.com and "Add New → Project", import the GitHub repo
  `btd2026/Cyber-Rx`.
- Set **Root Directory = `CyberRXNew`** (this is the new app; the old app is
  ignored).
- Add two **Environment Variables**:
  - `VITE_SUPABASE_URL` = your Project URL
  - `VITE_SUPABASE_ANON_KEY` = your anon public key
- Click **Deploy**. Vercel gives you a URL like `https://cyberrx-xxxx.vercel.app`.

### 4. Create a first test user
- Supabase dashboard → **Authentication → Users → Add user** (email + password).
- Open your Vercel URL → sign in. (MFA prompts only after you enroll a factor,
  which we'll wire into the front door in Phase 2.)

### 5. You can now see and click it
- That URL is your permanent preview. Every future phase deploys to it
  automatically when I push.

---

## Local preview (optional, for you or me)
```bash
cd CyberRXNew
cp .env.example .env     # fill in your two Supabase values
npm install
npm run dev              # http://localhost:5174
```

---

## What's next — Phase 2 (after approval)

The executive shell, CISO-first: the full front door (incl. role-aware seat
switcher and MFA enrollment), then the CISO seat — the five questions, exec
summary, and the drill-to-evidence drawer — on clearly-flagged seed data, all
deployed to the same live URL.

**To proceed:** either say **"let's deploy"** and I'll walk you through the steps
above to get your live URL now, or **"approved — Phase 2"** to keep building and
deploy once there's more to see.
