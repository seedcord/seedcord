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

[![npm](https://img.shields.io/npm/v/seedcord?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/seedcord) [![node](https://img.shields.io/node/v/seedcord?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![bun](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fseedcord%2Fseedcord%2Fnext%2Fcli%2Fseedcord%2Fpackage.json&query=%24.engines.bun&style=flat-square&label=bun&labelColor=1f1f1f&color=fbf0df)](https://bun.com) [![license](https://img.shields.io/npm/l/seedcord?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`seedcord` is the CLI a bot project runs during development and at build time. It reads `seedcord.config.ts` and gives you a dev server with hot reload, a production build, the codegen that types your commands, and a way to deploy those commands to Discord.

Until v1.0.0, minor versions can break.

## Installation

`pnpm create seedcord` adds it to a new project. To add it to an existing one:

```sh
pnpm add -D seedcord
```

## Commands

<!-- prettier-ignore-start -->

| command | what it does |
| --- | --- |
| `seedcord dev` | runs the bot from the config file, reloading changed modules in place |
| `seedcord build` | type checks the bot and bundles it into `outDir` with Vite. An edge bot builds into a Cloudflare worker |
| `seedcord codegen` | writes the typed augmentations for your commands and config |
| `seedcord commands` | deploys, lists and cleans up your commands on Discord |

<!-- prettier-ignore-end -->

`codegen --check` verifies the committed augmentations match your source. Run it in CI.

`commands` reads `DISCORD_BOT_TOKEN` from your environment or `.env`:

```sh
seedcord commands                           # pick what to do from a menu
seedcord commands deploy                    # show what changes, then ask before deploying
seedcord commands deploy --yes              # deploy without asking
seedcord commands deploy --force            # also deploy scopes that match the last deploy
seedcord commands list                      # show the commands Discord has
seedcord commands list --all-guilds         # include every guild the bot is in
seedcord commands list --json               # print them as JSON
seedcord commands clean                     # pick guilds, then delete commands that duplicate a global one
seedcord commands clean --all-guilds        # list those duplicates in every guild
seedcord commands clean --all-guilds --yes  # delete them
seedcord commands purge                     # pick where, then delete every command there
seedcord commands purge --guilds 111 222    # list every command in those guilds
seedcord commands purge --global --yes      # delete every global command
```

In CI, or anywhere without a terminal, nothing changes on Discord unless you pass `--yes`.

On the http transport, `dev` also opens a cloudflared tunnel and points Discord's interactions URL at it.

## Config

`defineConfig` types `seedcord.config.ts`:

```ts
import { defineConfig } from 'seedcord';

export default defineConfig({
    // ...
});
```

## Edge bots

A `cloudflare.config.ts` beside `seedcord.config.ts` makes the bot an edge bot, for Cloudflare Workers. An edge bot needs three things:

- `"customConditions": ["workerd"]` in its tsconfig
- a `root` in `seedcord.config.ts` that points at the bot's code, like `'./src'`, and no `entry`
- `@cloudflare/vite-plugin` 2 and `cf` as dev dependencies

```sh
pnpm add -D @cloudflare/vite-plugin@beta cf
```

The worker's `env` holds only the bindings that `cloudflare.config.ts` declares, so declare every secret the bot reads. The CLI throws if `cloudflare.config.ts` sets `entrypoint`, because seedcord builds the worker's entry from `instance`.

```ts
import { bindings, defineConfig } from 'cf/config';

export default defineConfig({
    worker: {
        name: 'my-bot',
        compatibilityDate: '2026-08-04',
        env: { DISCORD_BOT_TOKEN: bindings.secret() }
    }
});
```

`bindings.secret()` declares `DISCORD_BOT_TOKEN` without a value, so the token never sits in the file. Its value comes from your local env files in dev and from the secrets you upload when you deploy.

`seedcord dev` runs the bot in workerd through `@cloudflare/vite-plugin`. It listens on `port` from `seedcord.config.ts`, or on 8787 if you leave it out. The worker reads its secrets from `.dev.vars`, or from the `.env` files when there's no `.dev.vars`. A saved handler reloads in place. After you change `cloudflare.config.ts`, a `.dev.vars` file or a `.env` file, press `r` to restart.

`seedcord build` writes the worker to `.cloudflare/output`, then starts it once in workerd to check that it loads. Deploy it with `cf deploy --prebuilt`. Cloudflare refuses to deploy a worker while one of its declared secrets has no value, so the first deploy of a new worker needs `--secrets-file` with a value for each one.

`ENVIRONMENT`, `ENV` or `NODE_ENV` in your shell sets the Vite mode, as in `ENV=staging pnpm build`. A value in an env file doesn't count, since the mode decides which `.env.<mode>` files get read, and `.env` usually holds your dev environment. Vite reads the `.env.<mode>` files for the mode, and a `cloudflare.config.ts` that exports a function gets it as `mode`. With none of them set, `seedcord dev` runs in `development`, and `seedcord build` runs in `production` because the build is what you deploy. The mode has to be `development`, `staging`, `production` or `test`, the four environments envapt knows, so a node bot and an edge bot read the same files for one value.

Local env files never replace a `bindings.text()` value. For a value that differs per environment, export a function and read `mode`, as in `ENV: bindings.text(mode)`.

Cloudflare's config loader throws on Bun, so run the CLI on Node for an edge bot. `bun run dev` runs it on Node. `bun --bun run dev` runs it on Bun.

Before it bundles, the build reads the public key, command ids and emoji ids from Discord with `DISCORD_BOT_TOKEN` from your environment or `.env`, and writes them into the worker. Every command in your code has to be deployed already, or the build stops and lists the ones that aren't. Run `seedcord commands deploy` first.
