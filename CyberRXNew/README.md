# CyberRXNew

A standalone React + Vite + Tailwind frontend, kept fully separate from the
existing `frontend/` (Cyber-Rx) application.

## Why this is separate

- Lives in its own folder (`CyberRXNew/`) with its own `package.json`,
  `node_modules`, and config. Nothing here imports from or affects the old app.
- Runs on **port 5174**, so it can run at the same time as the existing app
  (port 5173).
- Has its own `vercel.json` for an independent deploy. The repo-root
  `vercel.json` still deploys the **old** app (`frontend/`) and is untouched.

## Getting started

```bash
cd CyberRXNew
npm install
npm run dev      # http://localhost:5174
```

## Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the dev server on port 5174    |
| `npm run build`   | Production build to `dist/`          |
| `npm run preview` | Preview the production build         |
| `npm run lint`    | Run ESLint                           |

## Deploying separately

This app builds independently. To deploy it as its own Vercel project, point a
new project at the `CyberRXNew/` directory (Root Directory = `CyberRXNew`). The
existing app's deploy is unaffected.
