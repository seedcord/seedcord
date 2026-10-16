---
'seedcord': minor
---

An edge bot's `seedcord.config.ts` now leaves out `entry` and `build.outDir`, since Cloudflare calls the default export of `instance` and its plugin sets the output folder. Under the `workerd` condition, `defineConfig` now rejects both as you type them, and the CLI throws `CliConfigFieldUnused` when a config sets one anyway. It throws the same code when `cloudflare.config.ts` sets `entrypoint`.
