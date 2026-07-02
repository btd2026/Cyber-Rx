# Sample upload data — healthcare payer

Realistic test fixtures in the onboarding upload formats, for exercising the
framework end to end.

- **healthcare-payer-risk-register.csv** — 27 risks. Upload at onboarding
  *Section 6 · Risk register*. Columns: `title, severity, asset, exposure, status`
  (plus `process, likelihood, owner` for realism). Asset names match common payer
  systems so risks link to crown jewels and drive the material-exposure math.
- **healthcare-payer-cyber-projects.csv** — 17 initiatives. Upload at onboarding
  *Section 6b · Cyber projects & initiatives*. Columns: `name, owner, cost, roi,
  status`. Statuses (in progress / planned / completed / blocked) drive the
  portfolio delivered-to-date bars.

Tip: also upload a matching **systems/apps** inventory so each risk's `asset`
becomes a scored crown jewel — that is what rolls the risk exposure into the
board/CFO dollar figures and the per-crown-jewel columns.
