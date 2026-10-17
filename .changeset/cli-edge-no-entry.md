---
'seedcord': minor
---

An edge bot's `seedcord.config.ts` now leaves out `entry` and `build.outDir`, and `defineConfig` rejects both under the `workerd` condition. The CLI also rejects `entrypoint` in `cloudflare.config.ts`.
