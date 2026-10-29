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

[![npm](https://img.shields.io/npm/v/seedcord?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/seedcord) [![node](https://img.shields.io/node/v/seedcord?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![bun](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fseedcord%2Fseedcord%2Fnext%2Fcli%2Fseedcord%2Fpackage.json&query=%24.engines.bun&style=flat-square&label=bun&labelColor=1f1f1f&color=fbf0df)](https://bun.com) [![license](https://img.shields.io/npm/l/seedcord?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`seedcord` is the CLI a bot project runs during development and at build time. It reads `seedcord.config.ts` and gives you a dev server with hot reload, a production build, the codegen that types your commands, a way to deploy those commands to Discord, and new files written from your own templates.

It loads your bot through Vite every time, with any Vite plugin you add. Those plugins, your `.env` modes, and bundled data files you set up in dev work the same way in the build. One `seedcord build` makes a Node or Bun server, a single Bun binary, a Cloudflare Worker, or a package another app installs and starts.

seedcord is pre-1.0, so a minor version can break your bot. Each release's changelog says what changed and how to update.

## Installation

`pnpm create seedcord` adds it to a new project. To add it to an existing one:

```sh
pnpm add -D seedcord vite
```

Run it through your project's scripts, like `pnpm dev`. A global `seedcord` throws `CliNotProjectInstall`, because the CLI has to load the same seedcord packages your bot imports.

## Commands

<!-- prettier-ignore-start -->

| command | what it does |
| --- | --- |
| `seedcord dev` | runs the bot from the config file, reloading changed modules in place |
| `seedcord build` | type checks the bot and bundles it into `outDir` with Vite. An edge bot builds into a Cloudflare worker |
| `seedcord codegen` | writes the typed augmentations for your commands and config |
| `seedcord commands` | deploys, lists and cleans up your commands on Discord |
| `seedcord make` | writes new files from one of your Handlebars templates, or one an installed plugin ships |

<!-- prettier-ignore-end -->

`codegen --check` verifies the committed augmentations match your source. Run it in CI.

`make` asks for a name and each value the template reads. The [make guide](https://seedcord.org/guide/tooling/make) shows how to write a template.

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

Pass `--verbose` to any command for the resolved config and full error stacks.

## Config

`defineConfig` types `seedcord.config.ts`:

```ts
import yaml from '@rollup/plugin-yaml';
import { defineConfig } from 'seedcord';

export default defineConfig({
    root: './src',
    instance: './bot.ts',
    build: { start: './index.ts' },
    files: ['./locales'],
    vitePlugins: () => [yaml()]
});
```

- `instance` is the file that exports your bot.
- `build.start` is the file that starts it. Leave it out to build the bot as a package.
- `files` lists the folders of data files the build bundles. The bot reads them with `readFiles`.
- `vitePlugins` takes any Vite plugin, and each one runs in dev and in the build. With the YAML plugin above, a handler can import a `.yaml` file.

`ENV=staging pnpm build` builds in staging mode and loads your `.env.staging` files. [envapt](https://envapt.materwelon.dev) reads the same mode in your bot.

The [config guide](https://seedcord.org/guide/build/config) covers every key.

## Edge bots

A `cloudflare.config.ts` beside `seedcord.config.ts` turns an http bot into a Cloudflare Worker. `seedcord dev` runs it in workerd, and `seedcord build` writes a worker you deploy with `cf deploy --prebuilt`. The [Workers guide](https://seedcord.org/guide/build/workers) covers the setup.
