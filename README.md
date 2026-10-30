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

seedcord is a TypeScript framework for Discord bots, typed end to end. Commands, events, components, checks, lifecycle, and plugins all come with it. A wrong route or a wrong option name is a compile error, before the bot ever connects.

You can build two kinds of bots with seedcord, and each one runs on its own package, called a transport. A gateway bot runs on `@seedcord/gateway`, which holds a websocket connection to Discord through the discord.js client and gets message, member, voice, and reaction events. An http bot runs on `@seedcord/http`, which answers the interaction requests Discord posts to your URL, on your own server or on Cloudflare Workers, with no discord.js dependency. You pick one when you scaffold. Handlers, checks, and the rest of the seedcord API work the same way on both. The objects a handler reads differ: discord.js objects on the gateway, raw payloads on http.

Your bot runs through Vite, from the first `seedcord dev` to the production build. You can add any Vite plugin in `seedcord.config.ts`, so your handlers can import YAML, SQL, or whatever else a plugin loads. `ENV=staging` loads your `.env.staging` files. A saved handler reloads in place without restarting the bot. One `seedcord build` turns the same code into a Node or Bun server, a single Bun binary, a Cloudflare Worker, or a module your own server imports.

## What it looks like

A slash command is a builder in `commands/` and a handler in `handlers/`:

```ts
// commands/Ping.ts
import { BuilderComponent, RegisterCommand } from '@seedcord/gateway';

@RegisterCommand()
export class Ping extends BuilderComponent<'command'> {
    constructor() {
        super('command');

        this.instance
            .setName('ping')
            .setDescription('Check that the bot is answering')
            .addBooleanOption((option) => option.setName('detailed').setDescription('Include process uptime'));
    }
}
```

```ts
// handlers/Ping.ts
import { SlashHandler, SlashRoute } from '@seedcord/gateway';

@SlashRoute('ping')
export class Ping extends SlashHandler<'ping'> {
    public async execute(): Promise<void> {
        const detailed = this.options.getBoolean('detailed'); // boolean | null
        await this.reply(detailed ? `Pong, up for ${process.uptime()}s` : 'Pong');
    }
}
```

`seedcord codegen` reads the builder and types the handler from it. `getBoolean('detail')` fails the type check, and so does `@SlashRoute('pong')`.

## Features

**Handlers**

- Typed slash commands, subcommands, context menus, and autocomplete, with option types read from your discord.js builders
- Typed customIds for buttons, selects, and modals
- Reusable checks for permissions, cooldowns, and your own rules, which refuse before the handler runs
- Middleware that runs around a handler
- One `throw` that replies, logs, and reports
- Pagination that survives a restart

**Tooling**

- Hot reload that keeps the Discord connection open
- Any Vite plugin, `.env` modes, and bundled data files, the same in dev and in the build
- A dev terminal that shows startup phases and reply timings
- `seedcord commands` to deploy, list, and clean up your commands on Discord
- `seedcord codegen --check` for CI
- `seedcord make` to write new files from your own templates
- ESLint rules for seedcord and discord.js mistakes

**Runtime**

- Startup and shutdown in ordered phases
- Typed config from `.env` and the shell through [envapt](https://envapt.materwelon.dev)
- Typed plugins with `init`, `ready`, and `dispose`, on a server or on Workers
- A typed event bus on both transports
- Custom emojis looked up by the name in your config
- Logging in named channels you can quiet one at a time

...and a lot more in [the guide](https://seedcord.org/guide).

## Get started

```sh
pnpm create seedcord
```

**[Read the guide →](https://seedcord.org/guide)**

seedcord is pre-1.0, so a minor version can break your bot. Each release's changelog says what changed and how to update.

## Where it runs

<!-- prettier-ignore-start -->

| where | how |
| --- | --- |
| a Node or Bun server | set `build.start` to the file that starts your bot, then `seedcord build` and `node --enable-source-maps dist/index.mjs` |
| one Bun binary | `seedcord build` prints the `bun build --compile` line for your bot |
| Cloudflare Workers | an http bot with a `cloudflare.config.ts`, then `seedcord build && cf deploy --prebuilt` |
| inside your own server | an http bot with `port: false` takes each request from your Hono or Next.js route through `bot.fetch()` |

<!-- prettier-ignore-end -->

## Your bot as a package

Without `build.start` in `seedcord.config.ts`, `seedcord build` turns your bot into a package. Once it's on npm, anyone can install it, import it, and start it, with your bot's types:

```sh
pnpm add your-bot
```

```ts
import bot from 'your-bot';

await bot.start();
```

## Demo

<div align="center">
  <img src="https://cdn.seedcord.org/assets/readme-dev-tui.webp" alt="seedcord dev server" width="640" />
  <p><sub>The dev terminal, with startup phases, reply timings, and more.</sub></p>
</div>

From `pnpm create seedcord` to a running bot.

<https://github.com/user-attachments/assets/ed9fb965-3ac5-4e7c-a3aa-4b94fe58390b>

## Packages

`pnpm create seedcord` installs the CLI and one transport. Add a plugin or the lint setup when you want them.

<!-- prettier-ignore-start -->

| package | changelogs | what it does |
| --- | --- | --- |
| [`create-seedcord`](cli/create-seedcord) | [![version](https://img.shields.io/npm/v/create-seedcord?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](cli/create-seedcord/CHANGELOG.md) | scaffolds a new bot |
| [`seedcord`](cli/seedcord) | [![version](https://img.shields.io/npm/v/seedcord?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](cli/seedcord/CHANGELOG.md) | the CLI: dev server, build, codegen, and command deploys |
| [`@seedcord/gateway`](packages/gateway) | [![version](https://img.shields.io/npm/v/%40seedcord%2Fgateway?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](packages/gateway/CHANGELOG.md) | the websocket transport, on the discord.js client |
| [`@seedcord/http`](packages/http) | [![version](https://img.shields.io/npm/v/%40seedcord%2Fhttp?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](packages/http/CHANGELOG.md) | the interactions transport, on a server or Cloudflare Workers |
| [`@seedcord/plugin-mongoose`](plugins/mongoose) | [![version](https://img.shields.io/npm/v/%40seedcord%2Fplugin-mongoose?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](plugins/mongoose/CHANGELOG.md) | MongoDB through Mongoose |
| [`@seedcord/plugin-kysely-postgres`](plugins/kysely-postgres) | [![version](https://img.shields.io/npm/v/%40seedcord%2Fplugin-kysely-postgres?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](plugins/kysely-postgres/CHANGELOG.md) | Postgres through Kysely |
| [`@seedcord/eslint-plugin`](tooling/eslint-plugin) | [![version](https://img.shields.io/npm/v/%40seedcord%2Feslint-plugin?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](tooling/eslint-plugin/CHANGELOG.md) | ESLint rules for seedcord bots |
| [`@seedcord/eslint-config`](tooling/eslint-config) | [![version](https://img.shields.io/npm/v/%40seedcord%2Feslint-config?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](tooling/eslint-config/CHANGELOG.md) | shared ESLint config |
| [`@seedcord/tsconfig`](tooling/tsconfig) | [![version](https://img.shields.io/npm/v/%40seedcord%2Ftsconfig?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](tooling/tsconfig/CHANGELOG.md) | shared TypeScript config |

<!-- prettier-ignore-end -->

Both transports depend on these, so a bot gets them without installing them. Each one also works on its own.

<!-- prettier-ignore-start -->

| package | changelogs | what it does |
| --- | --- | --- |
| [`@seedcord/core`](packages/core) | [![version](https://img.shields.io/npm/v/%40seedcord%2Fcore?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](packages/core/CHANGELOG.md) | the code both transports share |
| [`@seedcord/logger`](packages/logger) | [![version](https://img.shields.io/npm/v/%40seedcord%2Flogger?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](packages/logger/CHANGELOG.md) | channelled logging |
| [`@seedcord/custom-id`](packages/custom-id) | [![version](https://img.shields.io/npm/v/%40seedcord%2Fcustom-id?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](packages/custom-id/CHANGELOG.md) | typed customId encoding and decoding |
| [`@seedcord/errors`](packages/errors) | [![version](https://img.shields.io/npm/v/%40seedcord%2Ferrors?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](packages/errors/CHANGELOG.md) | typed errors with registered codes |
| [`@seedcord/utils`](packages/utils) | [![version](https://img.shields.io/npm/v/%40seedcord%2Futils?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](packages/utils/CHANGELOG.md) | type helpers and small functions |
| [`@seedcord/types`](packages/types) | [![version](https://img.shields.io/npm/v/%40seedcord%2Ftypes?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](packages/types/CHANGELOG.md) | config shapes and shared types |
| [`@seedcord/event-emitter`](packages/event-emitter) | [![version](https://img.shields.io/npm/v/%40seedcord%2Fevent-emitter?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](packages/event-emitter/CHANGELOG.md) | node-free typed event emitter with `waitFor` |

<!-- prettier-ignore-end -->

These two work without seedcord. `eslint-plugin-discordjs` lints any discord.js bot, and `discord-component-embed` builds the preview Discord shows when someone posts a link to your website.

<!-- prettier-ignore-start -->

| package | changelogs | what it does |
| --- | --- | --- |
| [`eslint-plugin-discordjs`](tooling/eslint-plugin-discordjs) | [![version](https://img.shields.io/npm/v/eslint-plugin-discordjs?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](tooling/eslint-plugin-discordjs/CHANGELOG.md) | ESLint rules for discord.js bots |
| [`discord-component-embed`](packages/discord-component-embed) | [![version](https://img.shields.io/npm/v/discord-component-embed?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](packages/discord-component-embed/CHANGELOG.md) | build and check Discord link previews, with JSX or plain functions |

<!-- prettier-ignore-end -->

## Agents

seedcord is newer than most models' training data, so your coding agent has to read the docs first. `pnpm create seedcord` writes an `AGENTS.md` into your project that points it there.

- [`seedcord.org/guide/llms.txt`](https://seedcord.org/guide/llms.txt) indexes the guide, and [`seedcord.org/docs/llms.txt`](https://seedcord.org/docs/llms.txt) indexes the reference.
- Every guide and reference page has a Markdown copy at the same URL plus `.md`.
- `pnpm dlx skills add https://seedcord.org` installs the seedcord skill into your agent. The file itself is at [`seedcord.org/.well-known/agent-skills/seedcord/SKILL.md`](https://seedcord.org/.well-known/agent-skills/seedcord/SKILL.md).

---

<p align="center"><sub><a href=".github/CONTRIBUTING.md">Contributing</a> · Built by <a href="https://github.com/materwelonDhruv">@materwelonDhruv</a> · <a href="LICENSE">Apache-2.0</a></sub></p>
