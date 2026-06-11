---
'seedcord': minor
---

Warn at boot for any command route leaf with no registered `@SlashRoute` handler. The check runs after commands load in `Bot.init`, reads the same `routeLeavesOf` walk that `seedcord codegen` uses so the keys cannot diverge, and logs one warning per unhandled route rather than throwing.
