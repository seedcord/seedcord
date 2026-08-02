---
'@seedcord/core': minor
'@seedcord/errors': patch
'@seedcord/gateway': minor
'@seedcord/utils': patch
---

`Commands` replaces `CommandMentions`, keyed by slash route. `ContextMenus` maps each deployed context-menu command, split into `user` and `message`. Both ship from `@seedcord/core` and re-export through each transport.

**BREAKING:** `bot.emojis`, `bot.commands`, and `bot.mentions` are removed. Import `Emojis`, `Commands`, and `ContextMenus` directly. Reading one before startup resolves it throws.
