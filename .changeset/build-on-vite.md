---
'seedcord': minor
---

**BREAKING:** `seedcord build` now bundles the bot with Vite, and the output also runs as a `bun build --compile` binary. The `build.bootstrap` option has been removed, and a start script that used it now points at `dist/index.mjs`.
