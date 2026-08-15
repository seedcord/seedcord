<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.seedcord.org/assets/wordmark-dark.webp" />
    <img src="https://cdn.seedcord.org/assets/wordmark-light.webp" alt="seedcord" width="440" />
  </picture>
</div>

<div align="center">
  <h3>The whole Discord bot, wired and typed</h3>
  <a href="https://seedcord.org">Website</a> ·
  <a href="https://guide.seedcord.org">Guide</a> ·
  <a href="https://docs.seedcord.org">Reference</a> ·
  <a href="https://discord.gg/DzFxY58WXf">Discord</a>
</div>

<br />

<div align="center">

[![npm](https://img.shields.io/npm/v/@seedcord/eslint-plugin?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/eslint-plugin) [![node](https://img.shields.io/node/v/@seedcord/eslint-plugin?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![license](https://img.shields.io/npm/l/@seedcord/eslint-plugin?style=flat-square&label=&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/eslint-plugin` holds the ESLint rules for seedcord bots. The `seedcord` preset layers these over [`eslint-plugin-discordjs`](https://www.npmjs.com/package/eslint-plugin-discordjs)'s `recommended`, so one entry covers the framework rules and the discord.js rules together.

The preset suits a project carrying its own ESLint config. A project on [`@seedcord/eslint-config`](https://www.npmjs.com/package/@seedcord/eslint-config) turns the same rules on with `registerSeedcordPlugin` and `registerDiscordjsPlugin`.

Until v1.0.0, minor versions can break.

## Installation

```sh
pnpm add -D @seedcord/eslint-plugin
```

## Usage

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
