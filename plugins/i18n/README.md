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
  <a href="https://seedcord.org/chat/">Discord</a>
</div>

<br />

<div align="center">

[![npm](https://img.shields.io/npm/v/@seedcord/plugin-i18n?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/plugin-i18n) [![node](https://img.shields.io/node/v/@seedcord/plugin-i18n?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![license](https://img.shields.io/npm/l/@seedcord/plugin-i18n?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/plugin-i18n` translates your bot's replies and commands into each user's Discord language. You write the replies in [Fluent](https://projectfluent.org/) files, one per locale, and format them in any handler with `this.t`.

It works with a gateway bot, with an http bot on your own server, and with an http bot on Cloudflare Workers.

seedcord is pre-1.0, so a minor version can break your bot. Each release's changelog says what changed and how to update.

## Installation

```sh
pnpm add @seedcord/plugin-i18n
```

## Usage

Attach the plugin in `bot.ts`, and list its folder under `files` in `seedcord.config.ts`:

```ts
// src/bot.ts
import { Seedcord } from '@seedcord/http';
import { I18n } from '@seedcord/plugin-i18n';

export default new Seedcord({
    bot: {
        interactions: { path: './handlers' },
        commands: { path: './commands' }
    },
    subscribers: { path: null }
}).attach('i18n', I18n, { dir: './locales', base: 'en-US' });
```

```ts
// seedcord.config.ts
import { defineConfig } from 'seedcord';

export default defineConfig({
    root: './src',
    files: ['./locales']
});
```

Put every message in the base file. Give each other locale a file with its Discord locale code as the name, like `hi.ftl`:

```ftl
# src/locales/en-US.ftl
items =
    { $count ->
        [one] You have { $count } item
       *[other] You have { $count } items
    }
```

After `seedcord codegen`, `this.t` only accepts the keys and variables in the base file:

```ts
await this.reply(this.t('items', { count: cart.length }));
```

The [i18n guide](https://seedcord.org/guide/plugins/i18n) covers the Fluent files, which language `t` picks, and `t` in gates, notices, and components. [Translating commands](https://seedcord.org/guide/plugins/i18n-commands) shows how to translate your command names and descriptions.
