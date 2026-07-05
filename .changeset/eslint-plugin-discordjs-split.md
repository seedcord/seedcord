---
'@seedcord/eslint-plugin': minor
---

**BREAKING:** the ten discord.js rules moved to the new `eslint-plugin-discordjs` package, and their ids changed from `@seedcord/<rule>` to `discordjs/<rule>`. This package now ships the seedcord rules plus a `seedcord` preset that layers them over `discordjs`'s `recommended`.
