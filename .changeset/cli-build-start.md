---
'seedcord': minor
---

**BREAKING:** `entry` in `seedcord.config.ts` moved to `build.start`, like `build: { start: './index.ts' }`. Without `build.start`, `seedcord build` writes a `dist/index.mjs` that exports the bot without starting it, typed by `dist/index.d.mts`, for another node server like Express or Next.js to import, start, and on an http bot pass requests to `fetch()`.
