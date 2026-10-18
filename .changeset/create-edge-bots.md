---
'create-seedcord': minor
---

`create-seedcord` now asks where an http bot runs, and `--runtime edge` makes one for Cloudflare Workers with a `cloudflare.config.ts` and a `deploy` script. An edge bot made with Bun runs the `seedcord` CLI on Node, since Cloudflare's config loader throws on Bun.
