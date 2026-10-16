---
'seedcord': minor
---

**BREAKING:** The CLI now runs every bot in the Vite mode set by `ENVIRONMENT`, `ENV`, `NODE_ENV` or `MODE` in your shell, so `ENV=staging pnpm build` reads `.env.staging`. With none of them set, a build runs in `production` and the other commands in `development`. A value other than `development`, `staging`, `production` or `test`, like `NODE_ENV=prod`, now throws `ConfigInvalidEnv`.
