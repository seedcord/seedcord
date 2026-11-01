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

`@seedcord/plugin-tasks` runs code without a command. A task with a cron pattern runs on that schedule. Any task can also run once at a later time, like an unban a day from now. Handlers reach the plugin through `this.core`.

Install it when your bot needs recurring work or delayed jobs. It works with a gateway bot and with an http bot on your own server. On a Cloudflare Workers bot, attaching it is a compile error.

seedcord is pre-1.0, so a minor version can break your bot. Each release's changelog says what changed and how to update.

## Installation

```sh
pnpm add @seedcord/plugin-tasks
```

## Usage

Attach the plugin in `bot.ts`. Pass a kv driver too, or scheduled jobs end when the process does:

```ts
// bot.ts
import KeyvSqlite from '@keyv/sqlite';
import { KeyvDriver, Seedcord } from '@seedcord/gateway';
import { Tasks } from '@seedcord/plugin-tasks';
import { GatewayIntentBits } from 'discord.js';
import Keyv from 'keyv';

export default new Seedcord({
    kv: new KeyvDriver(new Keyv(new KeyvSqlite('sqlite://./kv.sqlite'))),
    bot: {
        clientOptions: { intents: [GatewayIntentBits.Guilds] },
        interactions: { path: './handlers' },
        commands: { path: './commands' },
        events: { path: null }
    },
    subscribers: { path: null }
}).attach('tasks', Tasks, { path: './tasks', timezone: 'UTC' });
```

Each file in `tasks/` holds one task. Import `Task` from `/gateway` or `/http`, so `this.core` has your bot's type:

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

A task without a pattern runs when you schedule it. Its type argument says what data it takes:

```ts
// tasks/Remind.ts
import { RegisterTask, Task } from '@seedcord/plugin-tasks/gateway';

@RegisterTask()
export class Remind extends Task<{ userId: string; text: string }> {
    public async execute(): Promise<void> {
        const { userId, text } = this.data;
        this.logger.info(`Reminding ${userId}: ${text}`);
    }
}
```

```ts
const job = await this.core.tasks.schedule(Remind, {
    in: '1d',
    data: { userId: '123456789', text: 'Check the logs' }
});
```

`in` takes a duration like `'30s'` or `'2h'`, and `at` takes a `Date` or a timestamp in milliseconds. A wrong or missing `data` field fails to compile. So does a cron pattern with a typo, or a timezone that doesn't exist.

## Inside a task

Each run gets a new instance, so a field doesn't keep its value between runs.

| member      | holds                                                    |
| ----------- | -------------------------------------------------------- |
| `data`      | what you passed to `schedule()`, after its trip as JSON  |
| `core`      | your bot's `Core`, with the client and your plugins      |
| `logger`    | logs under the task's key                                |
| `signal`    | aborts when the bot shuts down. Pass it to anything slow |
| `startedAt` | when this run started                                    |
| `trigger`   | `'cron'`, `'scheduled'`, or `'manual'`                   |

A task can also define `onError(error)` and `onOverrun()`. The bus gets `taskFinished` and `taskFailed` for every run, which is the place to hook up Sentry or a webhook.

## Controlling tasks

```ts
this.core.tasks.pause(Heartbeat);
this.core.tasks.resume(Heartbeat);
this.core.tasks.nextRun(Heartbeat);
await this.core.tasks.trigger(Heartbeat); // runs it now
this.core.tasks.list(); // cron tasks and their state
this.core.tasks.jobs(); // jobs waiting to run
```

`pause()`, `resume()`, and `nextRun()` throw for a task with no pattern. `trigger()` takes tasks with no data.

## What survives a restart

Scheduled jobs live in `config.kv` under the attach key, so `seedcord.attach('tasks', ...)` keeps its jobs only while the key stays `tasks`. A job that came due while the bot was down runs when it comes back up.

- **A run can repeat.** If the process dies during a run, or shutdown aborts one that then throws, the job runs again on the next start. Write a scheduled task so that a second run does no harm. A task that throws for any other reason doesn't run again.
- **Data is JSON.** A `Date` in `data` reads back as a string. A `Map`, a function, or a `bigint` fails to compile. `this.data` has the type you get back.
- **A stored job finds its task by key.** The key is the class name unless you set `key`, so set `key` on a scheduled task before you rename its class. When no task has a job's key, the job stays in the store and the plugin logs a warning.
- **Your driver has to list keys.** The plugin reads every job at startup through `entries()`. A cache adapter like `@keyv/memcache` can't do that, so the bot won't start with one.
- **Run one copy of the bot per store.** The plugin doesn't lock a job, so two copies sharing a store both run it.
- **Cron state isn't stored.** A cron task paused with `pause()` runs again after a restart. A cron run that came due while the bot was down doesn't run late.

## Daylight saving time

A `timezone` with daylight saving changes when some cron tasks run. A task with one value each for second, minute, and hour, like `30 2 * * *`, runs once when clocks go back. When clocks go forward past its time, it runs at the first valid time after the gap. Every other task, like `*/5 * * * *` or `30 1,2 * * *`, runs on both passes through the repeated hour and skips the times the gap removes.
