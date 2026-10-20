<div align="center">
  <h1>eslint-plugin-discordjs</h1>
  <p>Catch discord.js payloads that Discord would reject, before the bot runs.</p>
  <a href="https://github.com/seedcord/seedcord/blob/next/tooling/eslint-plugin-discordjs/CHANGELOG.md">Changelog</a> ·
  <a href="https://seedcord.org/docs/packages/eslint-plugin-discordjs/latest">Reference</a> ·
  <a href="https://discord.gg/DzFxY58WXf">Discord</a>
</div>

<br />

<div align="center">

[![npm](https://img.shields.io/npm/v/eslint-plugin-discordjs?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/eslint-plugin-discordjs) [![node](https://img.shields.io/node/v/eslint-plugin-discordjs?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![bun](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fseedcord%2Fseedcord%2Fnext%2Ftooling%2Feslint-plugin-discordjs%2Fpackage.json&query=%24.engines.bun&style=flat-square&label=bun&labelColor=1f1f1f&color=fbf0df)](https://bun.com) [![license](https://img.shields.io/npm/l/eslint-plugin-discordjs?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`eslint-plugin-discordjs` has type-aware ESLint rules for discord.js. Apart from the two `prefer-*` style rules, each rule catches a payload or command definition that discord.js or the Discord API rejects at run time. The rules check values known at lint time.

Install it in any discord.js project. It needs no seedcord package.

seedcord is pre-1.0, so a minor version can break your lint setup. Each release's changelog says what changed and how to update.

## Installation

```sh
pnpm add -D eslint-plugin-discordjs
```

Most rules read types, so they need typed linting ([`projectService`](https://typescript-eslint.io/getting-started/typed-linting)). The sample below uses `defineConfig` from `eslint/config`, which needs ESLint 9.22 or later.

## Usage

```js
// eslint.config.js
import { defineConfig } from 'eslint/config';
import discordjs from 'eslint-plugin-discordjs';
import tseslint from 'typescript-eslint';

export default defineConfig(
    // ...your existing config
    {
        files: ['**/*.ts'],
        extends: [discordjs.configs.recommended],
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

If your config already sets up typed linting, leave out the `languageOptions` block.

## Rules

<!-- prettier-ignore-start -->

| Rule | Catches |
| --- | --- |
| [no-mixed-message-format](docs/rules/no-mixed-message-format.md) | components v2 builders in the same message as `content`, `embeds`, `poll`, or `stickers` |
| [require-components-v2-flag](docs/rules/require-components-v2-flag.md) | v2 components without `MessageFlags.IsComponentsV2` |
| [select-menu-min-exceeds-max](docs/rules/select-menu-min-exceeds-max.md) | a select menu whose minimum is above its maximum |
| [no-discord-limit-exceeded](docs/rules/no-discord-limit-exceeded.md) | more items than Discord allows on a builder, like a sixth component in a row or a 26th choice |
| [no-conflicting-button-props](docs/rules/no-conflicting-button-props.md) | button props that don't go together, like a `customId` with a `url` |
| [require-button-props](docs/rules/require-button-props.md) | a button missing its style or a prop its style needs |
| [no-choices-and-autocomplete](docs/rules/no-choices-and-autocomplete.md) | autocomplete and static choices on one slash option |
| [required-option-before-optional](docs/rules/required-option-before-optional.md) | a required slash option after an optional one |
| [valid-command-name](docs/rules/valid-command-name.md) | slash command and option names Discord rejects |
| [prefer-ephemeral-flag](docs/rules/prefer-ephemeral-flag.md) | the deprecated `ephemeral: true` reply option. Its autofix writes `MessageFlags.Ephemeral` |
| [prefer-v2-component](docs/rules/prefer-v2-component.md) | an embed that components v2 can replace |

<!-- prettier-ignore-end -->

All rules run at `error` except the two `prefer-*` style rules, which warn.

## seedcord

A [seedcord](https://seedcord.org) bot gets these rules through [`@seedcord/eslint-plugin`](https://www.npmjs.com/package/@seedcord/eslint-plugin), whose `seedcord` preset turns on this plugin's `recommended` rules plus the seedcord rules.

---

<div align="center">
  Part of <a href="https://seedcord.org">seedcord</a> · Built by <a href="https://materwelon.dev">materwelonDhruv</a>
</div>
