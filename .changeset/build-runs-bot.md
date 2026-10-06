---
'seedcord': minor
---

**BREAKING:** `seedcord build` now runs `bot.ts`. Set the env that `bot.ts` reads at construction in CI too, because a build without it now fails.
