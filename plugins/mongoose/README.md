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

[![npm](https://img.shields.io/npm/v/@seedcord/plugin-mongoose?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/plugin-mongoose) [![node](https://img.shields.io/node/v/@seedcord/plugin-mongoose?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![license](https://img.shields.io/npm/l/@seedcord/plugin-mongoose?style=flat-square&label=&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/plugin-mongoose` connects a seedcord bot to MongoDB through Mongoose. It opens the connection during startup, loads every class under `dir` that carries `@RegisterMongooseService`, builds each one's model from its schema, and exposes them under the key you attached it on.

It runs on the gateway transport and on http's server runtime. Attaching it to an edge host is a compile error, since Mongoose opens a TCP connection that edge runtimes have no socket for.

Until v1.0.0, minor versions can break.

## Installation

```sh
pnpm add @seedcord/plugin-mongoose mongoose
```

`mongoose`, `envapt`, `typescript`, and `@seedcord/core` are peer dependencies.

## Attach

`attach` takes a property name, the plugin class, and its options. Chain it off the constructor:

```ts
// bot.ts
import { resolve } from 'node:path';

import { Seedcord } from '@seedcord/gateway';
import { Mongoose } from '@seedcord/plugin-mongoose';

export const seedcord = new Seedcord(config).attach('db', Mongoose, {
    dir: resolve(import.meta.dirname, './services'),
    uri: Vars.mongoUri,
    name: Vars.dbName
});

export default seedcord;
```

```ts
// index.ts
import seedcord from './bot';

await seedcord.start();
```

`attach` returns the instance widened with the key, and `seedcord codegen` writes `db: (typeof Bot)['db']` into `seedcord-gen.d.ts` off a default import of that module. Calling `attach` as a bare statement drops the widened type. A named-only export leaves codegen with nothing to import.

Attach before startup. A call after initialization throws `CorePluginAfterInit`.

`Vars` stands in for an [`envapt`](https://www.npmjs.com/package/envapt) class. A `process.env` read types as `string | undefined`, which the required `uri` and `name` reject.

## Services

Declare the schema on the class as a `public static schema`. A class without one is a compile error.

```ts
import { MongooseService, RegisterMongooseService } from '@seedcord/plugin-mongoose';
import mongoose from 'mongoose';

interface IUser {
    userId: string;
    balance: number;
}

@RegisterMongooseService('users')
export class Users extends MongooseService<IUser> {
    public static schema = new mongoose.Schema<IUser>({
        userId: { type: String, required: true, unique: true },
        balance: { type: Number, default: 0 }
    });

    public async findByUserId(userId: string) {
        return this.model.findOne({ userId });
    }
}
```

Name each key once so the lookup types resolve:

```ts
declare module '@seedcord/plugin-mongoose' {
    interface MongooseServices {
        users: Users;
    }
}
```

Then call it from a handler through `core`:

```ts
const user = await this.core.db.services.users.findByUserId(this.event.user.id);
```
