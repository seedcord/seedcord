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

[![npm](https://img.shields.io/npm/v/@seedcord/plugin-linked-roles?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/plugin-linked-roles) [![node](https://img.shields.io/node/v/@seedcord/plugin-linked-roles?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![license](https://img.shields.io/npm/l/@seedcord/plugin-linked-roles?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/plugin-linked-roles` sets up Discord's Linked Roles for your bot. A server puts a requirement on a role, like "100 matches won or more" in your game, and your bot answers it for each member. The plugin registers your records with Discord, serves the verification and callback routes, and checks the values you return against the records you declared.

It works on gateway, on http, and on Cloudflare Workers.

seedcord is in beta, so a minor version can break your bot. Each release's changelog says what changed and how to update.

## Installation

```sh
pnpm add @seedcord/plugin-linked-roles
```

## Usage

The plugin needs two things from your bot: its public address in `server.url`, and `DISCORD_CLIENT_SECRET` in the environment. `LinkedRoles.with()` returns a plugin class with your options in it. Attach that class:

```ts
// src/bot.ts
import { Seedcord } from '@seedcord/http';
import { LinkedRoles, RecordType } from '@seedcord/plugin-linked-roles';

// your own code. it looks up your game's player by their Discord id
import { players } from './players';

const Ranked = LinkedRoles.with({
    records: {
        matches_won: {
            type: RecordType.IntegerGreaterThanOrEqual,
            name: 'Matches won',
            description: 'or more matches won'
        }
    },
    values: async ({ user }) => {
        const player = await players.byDiscordId(user.id);
        if (!player) return { refuse: 'Link Discord in the game first.' };
        return { platformUsername: player.name, metadata: { matches_won: player.wins } };
    }
});

export default new Seedcord({
    server: { url: 'https://bot.example.com' },
    bot: {
        interactions: { path: './handlers' },
        commands: { path: './commands' }
    },
    subscribers: { path: null }
}).attach('linkedRoles', Ranked);
```

Add `https://bot.example.com/linked-roles/callback` under Redirects on your application's OAuth2 page in the Developer Portal. The plugin logs the exact address at startup if it isn't there yet.

`records` lists what a server can set a requirement on. The plugin runs `values` for each member who connects. `metadata` takes its types from your records, so `matches_won` has to be a number here. Return `{ refuse: 'your message' }` to turn someone away without writing anything.

A server admin adds the requirement under Server Settings, Roles, then Links on a role. A member then has to claim the role from the server's Linked Roles menu.

### Updating a member later

With `keepTokens: true`, the plugin saves each member's tokens in your bot's `kv`, so you can write their values again after they change. Your `kv` then needs a driver that saves to a file or a database.

```ts
// in a handler, after the member finished a match
const result = await this.core.linkedRoles.push(this.user.id);
if (result.kind === 'refused') await this.reply(result.message);

// for a member who shouldn't keep the roles that depend on your records
await this.core.linkedRoles.clear(this.user.id);
```

`push()` runs your `values` for that member again and writes what it returns. Both calls only compile with `keepTokens: true`.

Check out the [Linked Roles guide](https://seedcord.org/guide/plugins/linked-roles) for more details on how to use the plugin.
