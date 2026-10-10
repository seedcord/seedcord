---
'seedcord': minor
---

An edge bot's `seedcord.config.ts` now leaves out `entry`, since Cloudflare calls the default export of `instance`. Under the `workerd` condition, `defineConfig` now rejects `entry` as you type it, and the CLI throws the new `CliConfigEntryOnEdge` when a config sets it anyway.
