<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.seedcord.org/assets/wordmark-dark.webp" />
    <img src="https://cdn.seedcord.org/assets/wordmark-light.webp" alt="seedcord" width="440" />
  </picture>
</div>

<div align="center">
  <h3>The whole Discord bot, typed end to end</h3>
  <a href="https://seedcord.org">Website</a> ·
  <a href="https://seedcord.org/guide">Guide</a> ·
  <a href="https://seedcord.org/docs">Reference</a> ·
  <a href="https://discord.gg/DzFxY58WXf">Discord</a>
</div>

<br />

<div align="center">

[![npm](https://img.shields.io/npm/v/@seedcord/eslint-plugin?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/eslint-plugin) [![node](https://img.shields.io/node/v/@seedcord/eslint-plugin?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![bun](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fseedcord%2Fseedcord%2Fnext%2Ftooling%2Feslint-plugin%2Fpackage.json&query=%24.engines.bun&style=flat-square&label=bun&labelColor=1f1f1f&color=fbf0df)](https://bun.com) [![license](https://img.shields.io/npm/l/@seedcord/eslint-plugin?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/eslint-plugin` has the ESLint rules for seedcord bots. Each one catches a seedcord mistake that still compiles, like a handler with no route decorator, which never registers. Its `seedcord` preset also turns on [`eslint-plugin-discordjs`](https://www.npmjs.com/package/eslint-plugin-discordjs)'s `recommended` rules.

Install it in a seedcord bot that has its own ESLint config. A bot on [`@seedcord/eslint-config`](https://www.npmjs.com/package/@seedcord/eslint-config) already has it, through `registerSeedcordPlugin`.

seedcord is pre-1.0, so a minor version can break your lint setup. Each release's changelog says what changed and how to update.

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

The rules read types, so they need typed linting ([`projectService`](https://typescript-eslint.io/getting-started/typed-linting)). If your config already sets it up, leave out the `languageOptions` block.

## Rules

Every rule runs at `error` in the preset.

<!-- prettier-ignore-start -->

| Rule | Catches |
| --- | --- |
| [command-builder-missing-register-command](docs/rules/command-builder-missing-register-command.md) | a command builder without `@RegisterCommand`, which never deploys |
| [interaction-handler-missing-route](docs/rules/interaction-handler-missing-route.md) | an interaction handler without its route decorator, which never runs |
| [event-handler-missing-register-event](docs/rules/event-handler-missing-register-event.md) | an event handler without `@RegisterEvent`, which never runs |
| [middleware-missing-register-decorator](docs/rules/middleware-missing-register-decorator.md) | a middleware without its register decorator, or with the other kind's |
| [subscriber-missing-decorators](docs/rules/subscriber-missing-decorators.md) | a subscriber without `@Subscribe`, or a webhook log without `@WebhookUrl` |
| [no-djs-builder-import](docs/rules/no-djs-builder-import.md) | a component builder imported from `discord.js`. Import it from `@discordjs/builders` |
| [no-raw-client-events](docs/rules/no-raw-client-events.md) | a `client.on()` listener for a gateway event, which skips `@RegisterEvent` and its middleware |
| [no-raw-interaction-acks](docs/rules/no-raw-interaction-acks.md) | `this.event.reply()` and the other discord.js replies inside a handler, which skip seedcord's reply tracking |
| [use-custom-id-codec](docs/rules/use-custom-id-codec.md) | a hand-written string in `setCustomId` |
| [use-paint-in-logs](docs/rules/use-paint-in-logs.md) | chalk inside a logger call |

<!-- prettier-ignore-end -->
