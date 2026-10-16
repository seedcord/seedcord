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
seedcord commands list                      # show the commands Discord has
seedcord commands list --all-guilds         # include every guild the bot is in
seedcord commands list --json               # print them as JSON
seedcord commands clean                     # pick guilds, then remove commands that copy a global one
seedcord commands clean --all-guilds        # list those copies in every guild
seedcord commands clean --all-guilds --yes  # delete them
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

A `wrangler.jsonc`, `wrangler.json` or `wrangler.toml` beside `seedcord.config.ts` makes the bot an edge bot, for Cloudflare Workers. An edge bot needs three things:

- `"customConditions": ["workerd"]` in its tsconfig
- a `root` in `seedcord.config.ts` that points at the bot's code, like `'./src'`, and no `entry`
- `@cloudflare/vite-plugin` and `wrangler` as dev dependencies

```sh
pnpm add -D @cloudflare/vite-plugin wrangler
```

`seedcord dev` runs the bot in workerd through `@cloudflare/vite-plugin`. It listens on the `dev.port` in your wrangler config, or on 8787 if the config doesn't set one. The worker reads its secrets from `.dev.vars` or `.env` beside the wrangler config. A saved handler reloads in place. After you change `.dev.vars`, `.env` or the wrangler config, press `r` to restart.

`seedcord build` bundles the worker into `outDir`, then starts it once in workerd to check that it loads. Run `wrangler deploy` from the project folder to deploy it.

Before it bundles, the build reads the public key, command ids and emoji ids from Discord with `DISCORD_BOT_TOKEN` from your environment or `.env`, and writes them into the worker. Every command in your code has to be deployed already, or the build stops and lists the ones that aren't. Run `seedcord commands deploy` first.
