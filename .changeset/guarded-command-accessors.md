---
'@seedcord/core': patch
'@seedcord/errors': patch
'@seedcord/gateway': minor
'@seedcord/utils': patch
---

`Commands` replaces `CommandMentions`, keyed by slash route. `ContextMenus` maps each deployed context-menu command, split into `user` and `message`.

**BREAKING:** `bot.commands` is now the `Commands` accessor, `bot.mentions` is removed, and reading `Emojis` before startup resolves it throws.
