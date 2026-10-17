---
'seedcord': minor
---

**BREAKING:** The CLI now runs every bot in the Vite mode from `ENVIRONMENT`, `ENV`, `NODE_ENV` or `MODE` in your shell, so `ENV=staging pnpm build` reads `.env.staging`. With none set, `build` runs in `production` and the other commands in `development`. Any other name, like `NODE_ENV=prod`, now throws `ConfigInvalidEnv`.
