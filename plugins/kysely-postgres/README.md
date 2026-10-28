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

[![npm](https://img.shields.io/npm/v/@seedcord/plugin-kysely-postgres?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/plugin-kysely-postgres) [![node](https://img.shields.io/node/v/@seedcord/plugin-kysely-postgres?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![bun](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fseedcord%2Fseedcord%2Fnext%2Fplugins%2Fkysely-postgres%2Fpackage.json&query=%24.engines.bun&style=flat-square&label=bun&labelColor=1f1f1f&color=fbf0df)](https://bun.com) [![license](https://img.shields.io/npm/l/@seedcord/plugin-kysely-postgres?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/plugin-kysely-postgres` connects a seedcord bot to Postgres through Kysely. It opens a connection pool when the bot starts, runs your migrations, loads your service classes, and closes the pool when the bot shuts down. Handlers reach each service through `this.core`. You declare your database schema once, and Kysely types every query from it.

Install it when your bot stores data in Postgres. It works with a gateway bot and with an http bot on your own server. On a Cloudflare Workers bot, attaching it is a compile error.

seedcord is pre-1.0, so a minor version can break your bot. Each release's changelog says what changed and how to update.

## Installation

```sh
pnpm add @seedcord/plugin-kysely-postgres kysely pg
```

## Usage

Attach the plugin in `bot.ts`. Handlers read it from `this.core` under the key you pass:

```ts
// bot.ts
import { Seedcord } from '@seedcord/gateway';
import { KyselyPostgres } from '@seedcord/plugin-kysely-postgres';
import { GatewayIntentBits } from 'discord.js';
import { Converters, Envapter } from 'envapt';

export default new Seedcord({
    bot: {
        clientOptions: { intents: [GatewayIntentBits.Guilds] },
        interactions: { path: './handlers' },
        commands: { path: './commands' },
        events: { path: null }
    },
    subscribers: { path: null }
}).attach('sql', KyselyPostgres, {
    dir: './services',
    connectionString: Envapter.getRequired('DATABASE_URL', Converters.String),
    migrations: { dir: './migrations' }
});
```

Each file in `services/` holds a service for one table. `Database` is the table interface you write for Kysely:

```ts
// services/Users.ts
import { KyselyService, RegisterKyselyService } from '@seedcord/plugin-kysely-postgres';

import type { Database } from '../database';

@RegisterKyselyService('users')
export class Users extends KyselyService<'users'> {
    public async findByUserId(userId: string) {
        return this.db.selectFrom(this.table).selectAll().where('user_id', '=', userId).executeTakeFirst();
    }
}

declare module '@seedcord/plugin-kysely-postgres' {
    interface KyselyDatabase {
        schema: Database;
    }
}
```

Run `seedcord codegen` after you add or rename a service. It adds the service's key to `KyselyServices`, the type behind the decorator and `core.sql.services`. A handler then calls `await this.core.sql.services.users.findByUserId(this.event.user.id)`. The [Kysely guide](https://seedcord.org/guide/plugins/kysely) covers the options, the schema, services, and migrations.
