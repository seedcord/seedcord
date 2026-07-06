<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.seedcord.org/assets/wordmark-dark.webp" />
    <img src="https://cdn.seedcord.org/assets/wordmark-light.webp" alt="seedcord" width="440" />
  </picture>
</p>

# @seedcord/eslint-plugin

ESLint rules for seedcord bots. The `seedcord` preset layers these over [`eslint-plugin-discordjs`](https://www.npmjs.com/package/eslint-plugin-discordjs)'s `recommended`, so one entry covers both the framework rules and the discord.js rules. The preset is for setups with their own ESLint config. A project on `@seedcord/eslint-config` sets `registerSeedcordPlugin` and `registerDiscordjsPlugin` instead.

```js
// eslint.config.js
import seedcord from '@seedcord/eslint-plugin';

export default [
    // ...your existing config
    ...seedcord.configs.seedcord
];
```

Part of the [seedcord](https://github.com/seedcord/seedcord) framework. Until a major v1.0.0 release, expect breaking changes in minor versions.
