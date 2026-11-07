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

[![npm](https://img.shields.io/npm/v/@seedcord/plugin-tasks?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/plugin-tasks) [![node](https://img.shields.io/node/v/@seedcord/plugin-tasks?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![license](https://img.shields.io/npm/l/@seedcord/plugin-tasks?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/plugin-tasks` runs code that no command starts. A task with a cron pattern runs on that schedule, and any task can run once at a later time, like an unban a day from now.

Install it when your bot needs recurring work or a job that runs later. It works with a gateway bot and with an http bot on your own server. On a Cloudflare Workers bot, attaching it is a compile error.

seedcord is pre-1.0, so a minor version can break your bot. Each release's changelog says what changed and how to update.

## Installation

```sh
pnpm add @seedcord/plugin-tasks
```

## Usage

Attach the plugin in `bot.ts` and point it at the folder that holds your tasks:

```ts
// bot.ts
import { Seedcord } from '@seedcord/gateway';
import { Tasks } from '@seedcord/plugin-tasks';
import { GatewayIntentBits } from 'discord.js';

export default new Seedcord({
    bot: {
        clientOptions: { intents: [GatewayIntentBits.Guilds] },
        interactions: { path: './handlers' },
        commands: { path: './commands' },
        events: { path: null }
    },
    subscribers: { path: null }
}).attach('tasks', Tasks, { path: './tasks', timezone: 'UTC' });
```

The plugin loads every class in `tasks/` that has `@RegisterTask`. This one runs every five minutes:

```ts
// tasks/Heartbeat.ts
import { RegisterTask, Task } from '@seedcord/plugin-tasks/gateway';

@RegisterTask('*/5 * * * *')
export class Heartbeat extends Task {
    public async execute(): Promise<void> {
        this.logger.info(`${this.core.bot.client.guilds.cache.size} servers`);
    }
}
```

A typo in a literal pattern fails to compile. The [Tasks guide](https://seedcord.org/guide/plugins/tasks) covers patterns, timezones, and controlling a task from a handler. [Scheduling jobs](https://seedcord.org/guide/plugins/tasks-scheduling) covers running a task once later, and what a kv driver has to do to keep those jobs through a restart.
