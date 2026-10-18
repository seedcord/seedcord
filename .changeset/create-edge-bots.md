---
'create-seedcord': minor
---

`create-seedcord` now asks where an http bot runs, and `--runtime edge` makes one for Cloudflare Workers with a `cloudflare.config.ts` and a `deploy` script. Run it with pnpm or npm, since Cloudflare's config loader refuses Bun.
