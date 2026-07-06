---
'@seedcord/eslint-config': minor
---

Add `registerDiscordjsPlugin` and `registerSeedcordPlugin` options. `registerDiscordjsPlugin` applies `eslint-plugin-discordjs`'s recommended preset, `registerSeedcordPlugin` applies `@seedcord/eslint-plugin`'s. The seedcord preset includes `no-djs-builder-import`, which bans discord.js component builder imports in favor of `@discordjs/builders`.
