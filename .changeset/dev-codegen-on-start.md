---
'seedcord': minor
---

`seedcord dev` now updates `seedcord-gen.d.ts` each time the bot starts. Before, commands you edited while dev was stopped kept stale types until you ran `seedcord codegen`.
