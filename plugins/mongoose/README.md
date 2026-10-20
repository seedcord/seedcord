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

[![npm](https://img.shields.io/npm/v/@seedcord/plugin-mongoose?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/plugin-mongoose) [![node](https://img.shields.io/node/v/@seedcord/plugin-mongoose?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![bun](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fseedcord%2Fseedcord%2Fnext%2Fplugins%2Fmongoose%2Fpackage.json&query=%24.engines.bun&style=flat-square&label=bun&labelColor=1f1f1f&color=fbf0df)](https://bun.com) [![license](https://img.shields.io/npm/l/@seedcord/plugin-mongoose?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/plugin-mongoose` connects a seedcord bot to MongoDB through Mongoose. It connects when the bot starts, loads your service classes, and disconnects when the bot shuts down. Handlers reach each service through `this.core`.

Install it when your bot stores data in MongoDB. It works with a gateway bot and with an http bot on your own server. On a Cloudflare Workers bot, attaching it is a compile error.

seedcord is pre-1.0, so a minor version can break your bot. Each release's changelog says what changed and how to update.

## Installation

```sh
pnpm add @seedcord/plugin-mongoose mongoose
```

## Usage

Attach the plugin in `bot.ts`. Handlers read it from `this.core` under the key you pass:

```ts
// bot.ts
import { Seedcord } from '@seedcord/gateway';
import { Mongoose } from '@seedcord/plugin-mongoose';
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
}).attach('db', Mongoose, {
    dir: './services',
    uri: Envapter.getRequired('MONGO_URI', Converters.String),
    name: 'my-bot'
});
```

Each file in `services/` holds a service with its schema:

```ts
// services/Users.ts
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

declare module '@seedcord/plugin-mongoose' {
    interface MongooseServices {
        users: Users;
    }
}
```

A handler then calls `await this.core.db.services.users.findByUserId(this.event.user.id)`. The [Mongoose guide](https://seedcord.org/guide/plugins/mongoose) covers the options, services, and errors.
