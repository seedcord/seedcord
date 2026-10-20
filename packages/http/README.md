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

[![npm](https://img.shields.io/npm/v/@seedcord/http?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/http) [![node](https://img.shields.io/node/v/@seedcord/http?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![bun](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fseedcord%2Fseedcord%2Fnext%2Fpackages%2Fhttp%2Fpackage.json&query=%24.engines.bun&style=flat-square&label=bun&labelColor=1f1f1f&color=fbf0df)](https://bun.com) [![license](https://img.shields.io/npm/l/@seedcord/http?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/http` is the transport for an http bot. Discord posts each interaction to your bot's URL, and the bot checks the request's Ed25519 signature before it runs your handler. It has no discord.js dependency and keeps no connection open, so it runs on your own server or on Cloudflare Workers.

Discord posts only interactions to that URL. Use [`@seedcord/gateway`](https://www.npmjs.com/package/@seedcord/gateway) when your bot reacts to messages, members, voice, or reactions.

seedcord is pre-1.0, so a minor version can break your bot. Each release's changelog says what changed and how to update.

## Installation

`pnpm create seedcord` sets up a new bot and asks where it runs. To add seedcord to an existing project:

```sh
pnpm add @seedcord/http @discordjs/builders envapt
pnpm add -D seedcord vite typescript
```

`envapt` and `typescript` are peer dependencies. `seedcord` is the CLI that runs the bot in dev and builds it. In dev, it also opens a cloudflared tunnel and sets your app's interactions URL to it.

## Usage

`bot.ts` creates the bot and tells it where your handlers are:

```ts
import { Seedcord } from '@seedcord/http';
import { Converters, Envapter } from 'envapt';

export default new Seedcord({
    bot: {
        interactions: { path: './handlers' },
        commands: {
            path: './commands',
            guilds: Envapter.getAs('TESTING_GUILD_IDS', Converters.array(), [])
        }
    },
    subscribers: { path: null }
});
```

Read your environment through [envapt](https://envapt.materwelon.dev), the way `TESTING_GUILD_IDS` is read above. seedcord loads your `.env` files into envapt, and binds a worker's `env` to it on Cloudflare Workers, so the same read works in dev, in a build, and on Workers. envapt also reads your shell's variables, while `process.env` misses everything in your `.env` files.

Handlers read raw payloads from `discord-api-types`. Slash commands, components, checks, and plugins work the same way as on the gateway. The [guide](https://seedcord.org/guide) covers them.

## Where it runs

### Its own server

On Node or Bun, `Seedcord` listens on `port`, 3000 by default.

### Inside your server

Set `port: false`, start the bot, then pass each request to `bot.fetch()`. It takes a web `Request` and returns a `Response`, so a Hono or Next.js route can forward to it:

```ts
import { Hono } from 'hono';

import bot from './bot';

await bot.start();

const app = new Hono();
app.post('/interactions', (c) => bot.fetch(c.req.raw));
```

### Cloudflare Workers

The same `Seedcord` import runs on Cloudflare Workers. A `cloudflare.config.ts` beside `seedcord.config.ts` makes `seedcord build` write a worker, which you deploy with `cf deploy --prebuilt`. The [Workers guide](https://seedcord.org/guide/build/workers) covers the setup.
