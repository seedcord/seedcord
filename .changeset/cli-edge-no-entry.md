---
'seedcord': minor
---

An edge bot's `seedcord.config.ts` can't set `build.outDir` or `build.start`, and `defineConfig` rejects both under the `workerd` condition. The CLI also rejects `entrypoint` in `cloudflare.config.ts`.
