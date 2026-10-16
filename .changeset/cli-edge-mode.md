---
'seedcord': minor
---

`seedcord build` and `seedcord dev` now run an edge bot in the Vite mode set by `ENVIRONMENT`, `ENV` or `NODE_ENV` in your shell. `ENV=staging pnpm build`, for example, reads `.env.staging`. With none of them set, a build runs in `production` and dev runs in `development`.
