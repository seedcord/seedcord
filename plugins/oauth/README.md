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

[![npm](https://img.shields.io/npm/v/@seedcord/plugin-oauth?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/plugin-oauth) [![node](https://img.shields.io/node/v/@seedcord/plugin-oauth?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![license](https://img.shields.io/npm/l/@seedcord/plugin-oauth?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/plugin-oauth` logs people in with Discord and calls the API as them. It serves the login and callback routes, keeps each user's tokens encrypted in your bot's `kv`, and refreshes them before they expire.

It works on gateway, on http, and on Cloudflare Workers.

seedcord is in beta, so a minor version can break your bot. Each release's changelog says what changed and how to update.

## Installation

```sh
pnpm add @seedcord/plugin-oauth
```

## Usage

The plugin needs three things from your bot: its public address in `server.url`, a `kv` driver that saves to a file or a database, and `DISCORD_CLIENT_SECRET` in the environment. Then attach what `OAuth.with()` returns:

```ts
// src/bot.ts
import { Seedcord, UnstorageDriver } from '@seedcord/http';
import { OAuth } from '@seedcord/plugin-oauth';
import { createStorage } from 'unstorage';
import fsDriver from 'unstorage/drivers/fs';

export default new Seedcord({
    server: { url: 'https://bot.example.com' },
    kv: new UnstorageDriver(createStorage({ driver: fsDriver({ base: './.kv' }) })),
    bot: {
        interactions: { path: './handlers' },
        commands: { path: './commands' }
    },
    subscribers: { path: null }
}).attach(
    'oauth',
    OAuth.with({
        scopes: ['guilds'],
        onLogin: ({ returnTo }) => Response.redirect(`https://bot.example.com${returnTo ?? '/'}`)
    })
);
```

Add `https://bot.example.com/oauth/callback` under Redirects on your application's OAuth2 page in the Developer Portal. The plugin logs the exact address at startup if it isn't there yet.

Send a visitor to the login route, and call Discord as them once they're back:

```ts
// in a handler
await this.reply({ content: this.core.oauth.loginUrl({ returnTo: '/servers' }) });

// after they logged in
const guilds = await this.core.oauth.as(userId).guilds();
```

A plugin of your own can make the same calls from its `fetch()`, to serve your own routes:

```ts
// src/plugins/Account.ts
public override async fetch(request: Request): Promise<Response | undefined> {
    if (new URL(request.url).pathname !== '/api/me') return undefined;

    // sessions is your own code. it could read the cookie set by onLogin, for example
    const userId = sessions.userOf(request);
    if (!userId) return new Response(null, { status: 401 });

    return Response.json(await this.core.oauth.as(userId).user());
}
```

Only the calls for your `scopes` compile. `guilds()` compiles here because `guilds` is in `scopes`, but `connections()` wouldn't.

### Without seedcord

`@seedcord/plugin-oauth/client` exports `OAuthClient`, the class that the plugin is built on. It works in any server that has a `Request` and takes a `Response`:

```ts
import { REST } from '@discordjs/rest';
import { OAuthClient } from '@seedcord/plugin-oauth/client';

const oauth = new OAuthClient({
    rest: new REST().setToken(process.env.DISCORD_BOT_TOKEN),
    // use a real store. a Map loses every token on restart
    store: new Map(),
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    baseUrl: 'https://example.com'
});

// the client has two routes built in, /oauth/login and /oauth/callback.
// pass it every request. it answers those two and resolves to undefined for the rest
Bun.serve({
    async fetch(request) {
        const login = await oauth.fetch(request, (outcome) =>
            // gets every outcome. a login arrives from /oauth/callback, after the user's tokens are saved
            outcome.kind === 'login'
                ? Response.redirect('https://example.com/')
                : new Response('Try again.', { status: 400 })
        );
        if (login) return login;

        return new Response('Not found', { status: 404 });
    }
});

// send people here to log in
const link = oauth.loginUrl();
```

On Cloudflare Workers, also pass `keepOpen: waitUntil`, with `waitUntil` imported from `cloudflare:workers`.

Check out the [OAuth guide](https://seedcord.org/guide/plugins/oauth) for more details on how to use the plugin.
