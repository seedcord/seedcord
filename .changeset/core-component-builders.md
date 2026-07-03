---
'@seedcord/core': minor
'@seedcord/kit': minor
---

Move the component builders (`BuilderComponent`, `RowComponent`) and the bot color into `@seedcord/core`, now built on `@discordjs/builders`. The builders were previously imported from discord.js.

**BREAKING:** `@seedcord/kit` no longer exports `BuilderComponent`, `RowComponent`, `BuilderType`, or `RowType`. Import them from `seedcord` or `@seedcord/core`.
