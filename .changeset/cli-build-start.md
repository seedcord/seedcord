---
'seedcord': minor
---

**BREAKING:** `entry` in `seedcord.config.ts` is now `build.start`, like `build: { start: './index.ts' }`. Without `build.start`, `seedcord build` now writes an `index.mjs` in `outDir` that default exports the bot, typed by `index.d.mts`, for your own server to import and start. An http bot run this way sets `port: false` and gets each request from your server through `bot.fetch()`.
