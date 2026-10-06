---
'seedcord': minor
---

**BREAKING:** `seedcord build` now empties `outDir` and bundles the bot into it with Vite, and the output also runs as a `bun build --compile` binary. Point a start script that used the removed `build.bootstrap` at `dist/index.mjs`, and set `build.tsconfig` if you relied on `tsconfig.build.json`, because the type check now defaults to `tsconfig.json`. Handler, command, event, and subscriber folders must now be absolute paths like `resolve(import.meta.dirname, './handlers')`, and the build loads `bot.ts` to check them.
