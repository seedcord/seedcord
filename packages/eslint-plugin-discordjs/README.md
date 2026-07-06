# eslint-plugin-discordjs

Type-aware ESLint rules for discord.js. Aside from the two `prefer-*` style rules, each rule flags a payload or command definition that fails at runtime, either in discord.js validation or at the Discord API. Rules check only values known at lint time and skip dynamic ones.

## Install

```sh
pnpm add -D eslint-plugin-discordjs
```

Requires ESLint 9.22.0+ flat config with typed linting ([`projectService`](https://typescript-eslint.io/getting-started/typed-linting)), since most rules read types.

## Use

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

If your config already sets up typed linting, drop the `languageOptions` block and keep the scoped `extends` entry.

## Rules

<!-- prettier-ignore-start -->

| Rule | Catches |
| --- | --- |
| [no-mixed-message-format](docs/rules/no-mixed-message-format.md) | components v2 builders mixed with `content`/`embeds`/`poll`/`stickers`, Discord rejects the payload |
| [require-components-v2-flag](docs/rules/require-components-v2-flag.md) | v2 components without `MessageFlags.IsComponentsV2` |
| [select-menu-min-exceeds-max](docs/rules/select-menu-min-exceeds-max.md) | `setMinValues` above `setMaxValues`, no builder error, the API rejects it |
| [no-discord-limit-exceeded](docs/rules/no-discord-limit-exceeded.md) | more items than a builder's hard cap (5 row components, 25 options/fields/choices) |
| [no-conflicting-button-props](docs/rules/no-conflicting-button-props.md) | a Link button with a customId, or a url on a non-link style |
| [no-choices-and-autocomplete](docs/rules/no-choices-and-autocomplete.md) | autocomplete and static choices on one slash option |
| [required-option-before-optional](docs/rules/required-option-before-optional.md) | a required slash option after an optional one |
| [valid-command-name](docs/rules/valid-command-name.md) | slash command and option names Discord rejects |
| [prefer-ephemeral-flag](docs/rules/prefer-ephemeral-flag.md) | the deprecated `ephemeral: true` reply option, autofixes to `MessageFlags.Ephemeral` |
| [prefer-v2-component](docs/rules/prefer-v2-component.md) | embed usage that components v2 can replace (style preference, warns) |

<!-- prettier-ignore-end -->

All rules run at `error` except the two `prefer-*` style rules, which warn.

## seedcord

These rules are the discord.js half of the [seedcord](https://github.com/seedcord/seedcord) lint setup. seedcord bots add [`@seedcord/eslint-plugin`](https://github.com/seedcord/seedcord/tree/next/packages/eslint-plugin), whose `seedcord` preset layers the framework rules over this plugin's `recommended`.
