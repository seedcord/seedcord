---
'@seedcord/gateway': minor
'@seedcord/core': minor
---

`Commands` and `ContextMenus` join `Emojis` as module-level accessors filled during startup. `Commands` is keyed by slash route and `ContextMenus` splits into `user` and `message`.

**BREAKING:** `bot.emojis`, `bot.commands`, and `bot.mentions` are removed. Import the accessors directly. Reading a key before startup resolves it will throw.
