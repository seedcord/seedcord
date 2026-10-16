---
'seedcord': minor
---

`seedcord build` and `seedcord dev` now run an edge bot in the Vite mode set by `ENVIRONMENT`, `ENV` or `NODE_ENV` in your shell, so `ENV=staging pnpm build` reads `.env.staging`. With none of them set, a build runs in `production` and dev runs in `development`. A value other than `development`, `staging`, `production` or `test` throws `ConfigInvalidEnv`.
