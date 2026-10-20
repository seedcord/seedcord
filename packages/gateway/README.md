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

[![npm](https://img.shields.io/npm/v/@seedcord/gateway?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/gateway) [![node](https://img.shields.io/node/v/@seedcord/gateway?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![bun](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fseedcord%2Fseedcord%2Fnext%2Fpackages%2Fgateway%2Fpackage.json&query=%24.engines.bun&style=flat-square&label=bun&labelColor=1f1f1f&color=fbf0df)](https://bun.com) [![license](https://img.shields.io/npm/l/@seedcord/gateway?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/gateway` is the transport for a gateway bot. It holds a websocket connection to Discord through the discord.js client, which also keeps the cache. That connection carries message, member, voice, and reaction events, and Discord only sends those over a websocket. Pick this transport when your bot reacts to any of them.

A bot that only answers commands and components can use [`@seedcord/http`](https://www.npmjs.com/package/@seedcord/http) instead, which keeps no connection open and also runs on Cloudflare Workers.

seedcord is pre-1.0, so a minor version can break your bot. Each release's changelog says what changed and how to update.

## Installation

`pnpm create seedcord` sets up a new bot. To add seedcord to an existing project:

```sh
pnpm add @seedcord/gateway discord.js @discordjs/builders envapt
pnpm add -D seedcord vite typescript
```

`discord.js`, `envapt`, and `typescript` are peer dependencies. `seedcord` is the CLI that runs the bot in dev and builds it.

## Usage

`bot.ts` creates the bot and tells it where your handlers are:

```ts
import { Seedcord } from '@seedcord/gateway';
import { GatewayIntentBits } from 'discord.js';
import { Converters, Envapter } from 'envapt';

export default new Seedcord({
    bot: {
        clientOptions: { intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] },
        interactions: { path: './handlers' },
        commands: {
            path: './commands',
            guilds: Envapter.getAs('TESTING_GUILD_IDS', Converters.array(), [])
        },
        events: { path: './events' }
    },
    subscribers: { path: null }
});
```

Read your environment through [envapt](https://envapt.materwelon.dev), the way `TESTING_GUILD_IDS` is read above. seedcord loads your `.env` files into envapt, and reads `DISCORD_BOT_TOKEN` from it too. envapt also reads your shell's variables, while `process.env` misses everything in your `.env` files.

A file in `events/` reacts to any discord.js client event. Its handler reads the same arguments discord.js passes to `client.on()`:

```ts
import { EventHandler, RegisterEvent } from '@seedcord/gateway';
import { Events } from 'discord.js';

@RegisterEvent([Events.MessageCreate])
export class Mentioned extends EventHandler<Events.MessageCreate> {
    public async execute(): Promise<void> {
        const [message] = this.event;
        if (message.mentions.users.has(message.client.user.id)) await message.reply('hey');
    }
}
```

Slash commands, components, checks, and plugins work the same way as on http. The [guide](https://seedcord.org/guide) covers them.

## What it adds over the core

Everything in [`@seedcord/core`](https://www.npmjs.com/package/@seedcord/core), plus:

- `Seedcord`, which connects to Discord and holds the discord.js client
- handlers that read discord.js objects, like a `ChatInputCommandInteraction`
- event handlers for every discord.js client event, through `EventHandler` and `@RegisterEvent`
- `getConfirmation`, which shows buttons and waits for the answer in one `await`
