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

[![npm](https://img.shields.io/npm/v/@seedcord/plugin-kysely-postgres?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/plugin-kysely-postgres) [![node](https://img.shields.io/node/v/@seedcord/plugin-kysely-postgres?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![license](https://img.shields.io/npm/l/@seedcord/plugin-kysely-postgres?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/plugin-kysely-postgres` connects a seedcord bot to Postgres through Kysely. It opens the pool during startup, runs your migrations, loads every class under `dir` that carries `@RegisterKyselyService`, and exposes them under the key you attached it on.

You declare the schema once. Kysely types every query off it, so a renamed column breaks the build.

It runs on the gateway transport and on http's server runtime. Attaching it to an edge host is a compile error.

Until v1.0.0, minor versions can break.

## Installation

```sh
pnpm add @seedcord/plugin-kysely-postgres kysely pg
```

`kysely`, `pg`, `envapt`, `typescript`, and `@seedcord/core` are peer dependencies.

## Attach

`attach` takes a property name, the plugin class, and its options. Chain it off the constructor:

```ts
// bot.ts
import { resolve } from 'node:path';

import { Seedcord } from '@seedcord/gateway';
import { KyselyPostgres } from '@seedcord/plugin-kysely-postgres';

export const seedcord = new Seedcord(config).attach('sql', KyselyPostgres, {
    dir: resolve(import.meta.dirname, './services'),
    connectionString: Vars.databaseUrl,
    migrations: { path: resolve(import.meta.dirname, './migrations') }
});

export default seedcord;
```

```ts
// index.ts
import seedcord from './bot';

await seedcord.start();
```

`attach` returns the instance widened with the key, and `seedcord codegen` writes `sql: (typeof Bot)['sql']` into `seedcord-gen.d.ts` off a default import of that module. Calling `attach` as a bare statement drops the widened type. A named-only export leaves codegen with nothing to import.

Attach before startup. A call after initialization throws `CorePluginAfterInit`.

`Vars.databaseUrl` stands in for an [`envapt`](https://www.npmjs.com/package/envapt) accessor. `process.env.DATABASE_URL` types as `string | undefined`, which `connectionString?: string` rejects under the `exactOptionalPropertyTypes` that `@seedcord/tsconfig` turns on.

`migrations.onStartup` runs to latest by default.

## Schema

Declare it once so every service and the plugin's own `connection` resolve table names from it:

```ts
declare module '@seedcord/plugin-kysely-postgres' {
    interface KyselyDatabase {
        schema: MyDatabase;
    }
}
```

Until that declaration exists, `KyselyTable` widens to `string` and any table name type-checks.

## Services

The key names the table, and `table` overrides it when the two differ:

```ts
import { KyselyService, RegisterKyselyService } from '@seedcord/plugin-kysely-postgres';

@RegisterKyselyService('users', { table: 'app_users' })
export class UsersService extends KyselyService<'app_users'> {
    public async findByUserId(userId: string) {
        return this.db.selectFrom(this.table).selectAll().where('user_id', '=', userId).executeTakeFirst();
    }
}
```

Name each key once so the lookup types resolve:

```ts
declare module '@seedcord/plugin-kysely-postgres' {
    interface KyselyServices {
        users: UsersService;
    }
}
```

Then call it from a handler through `core`:

```ts
const user = await this.core.sql.services.users.findByUserId(this.event.user.id);
```
