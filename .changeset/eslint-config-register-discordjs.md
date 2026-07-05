---
'@seedcord/eslint-config': minor
---

**BREAKING:** the `discordRules` option is gone. Two decoupled toggles replace it: `registerDiscordjsPlugin` applies `eslint-plugin-discordjs`'s recommended preset, and `registerSeedcordPlugin` applies `@seedcord/eslint-plugin`'s. The old option's hand-rolled builder-import ban now lives in `@seedcord/eslint-plugin` as the `no-djs-builder-import` rule, so packages that had `discordRules: true` want both toggles.
