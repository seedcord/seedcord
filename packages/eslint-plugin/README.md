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
import { defineConfig } from 'eslint/config';
import seedcord from '@seedcord/eslint-plugin';
import tseslint from 'typescript-eslint';

export default defineConfig(
    // ...your existing config
    {
        files: ['**/*.ts'],
        extends: [seedcord.configs.seedcord],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname
            }
        }
    }
);
```

The rules read types, so they need typed linting ([`projectService`](https://typescript-eslint.io/getting-started/typed-linting)). If your config already sets it up, drop the `languageOptions` block and keep the scoped `extends` entry.

Part of the [seedcord](https://github.com/seedcord/seedcord) framework. Until a major v1.0.0 release, expect breaking changes in minor versions.
