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

[![npm](https://img.shields.io/npm/v/seedcord?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/seedcord) [![node](https://img.shields.io/node/v/seedcord?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![license](https://img.shields.io/npm/l/seedcord?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

seedcord wires a Discord bot together on top of discord.js and types every part of it. Commands, events, components, gates, lifecycle, and plugins all come with the framework. A wrong route or a wrong option name is a compile error, before the bot ever connects.

You pick one of two transports when you scaffold. `@seedcord/gateway` holds a websocket connection. `@seedcord/http` answers Discord's interaction requests. Everything you write on top of them is the same code.

## Features

- Option types generated from your discord.js builders
- Typed slash commands, subcommands, context menus, autocomplete
- A typed customId codec for buttons, selects, and modals
- Gates that refuse before the handler runs
- One `throw` that replies, logs, and reports
- The same handlers on both gateway and http
- Vite HMR that holds the Discord connection
- Startup and shutdown that run in ordered phases
- Typed plugins with `init`, `ready`, and `dispose`

## Get started

```sh
pnpm create seedcord
```

**[Read the guide →](https://guide.seedcord.org)**

_**seedcord is pre-1.0, so minor versions can break.** I've already completed nearly all of the massive changes I planned though, so it's relatively stable. Read the changelog before you bump. Also, the `http` transport's edge build for Cloudflare Workers is a work in progress, and currently cannot be used._

## Demo

<div align="center">
  <img src="https://cdn.seedcord.org/assets/readme-dev-tui.webp" alt="seedcord dev server" width="640" />
  <p><sub>The dev terminal, with startup phases, reply timings, and more.</sub></p>
</div>

From `pnpm create seedcord` to a running bot.

<https://github.com/user-attachments/assets/ed9fb965-3ac5-4e7c-a3aa-4b94fe58390b>

## Public packages

<!-- prettier-ignore-start -->

| package | changelogs | what it does |
| --- | --- | --- |
| [`create-seedcord`](cli/create-seedcord) | [![version](https://img.shields.io/npm/v/create-seedcord?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](cli/create-seedcord/CHANGELOG.md) | scaffolds a new bot |
| [`seedcord`](cli/seedcord) | [![version](https://img.shields.io/npm/v/seedcord?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](cli/seedcord/CHANGELOG.md) | the CLI, dev server, build, and codegen |
| [`@seedcord/core`](packages/core) | [![version](https://img.shields.io/npm/v/%40seedcord%2Fcore?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](packages/core/CHANGELOG.md) | foundational code shared by both transports |
| [`@seedcord/gateway`](packages/gateway) | [![version](https://img.shields.io/npm/v/%40seedcord%2Fgateway?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](packages/gateway/CHANGELOG.md) | the websocket transport, built on discord.js |
| [`@seedcord/http`](packages/http) | [![version](https://img.shields.io/npm/v/%40seedcord%2Fhttp?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](packages/http/CHANGELOG.md) | the interactions transport |
| [`@seedcord/logger`](packages/logger) | [![version](https://img.shields.io/npm/v/%40seedcord%2Flogger?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](packages/logger/CHANGELOG.md) | channelled logging |
| [`@seedcord/custom-id`](packages/custom-id) | [![version](https://img.shields.io/npm/v/%40seedcord%2Fcustom-id?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](packages/custom-id/CHANGELOG.md) | typed customId encoding and decoding |
| [`@seedcord/errors`](packages/errors) | [![version](https://img.shields.io/npm/v/%40seedcord%2Ferrors?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](packages/errors/CHANGELOG.md) | typed errors with registered codes |
| [`@seedcord/utils`](packages/utils) | [![version](https://img.shields.io/npm/v/%40seedcord%2Futils?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](packages/utils/CHANGELOG.md) | type helpers and small functions |
| [`@seedcord/types`](packages/types) | [![version](https://img.shields.io/npm/v/%40seedcord%2Ftypes?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](packages/types/CHANGELOG.md) | config shapes and shared types |
| [`@seedcord/rate-limiter`](packages/rate-limiter) | [![version](https://img.shields.io/npm/v/%40seedcord%2Frate-limiter?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](packages/rate-limiter/CHANGELOG.md) | rate limiting and key building |
| [`@seedcord/event-emitter`](packages/event-emitter) | [![version](https://img.shields.io/npm/v/%40seedcord%2Fevent-emitter?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](packages/event-emitter/CHANGELOG.md) | node-free typed event emitter with `waitFor` |
| [`@seedcord/plugin-mongoose`](plugins/mongoose) | [![version](https://img.shields.io/npm/v/%40seedcord%2Fplugin-mongoose?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](plugins/mongoose/CHANGELOG.md) | MongoDB through Mongoose |
| [`@seedcord/plugin-kysely-postgres`](plugins/kysely-postgres) | [![version](https://img.shields.io/npm/v/%40seedcord%2Fplugin-kysely-postgres?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](plugins/kysely-postgres/CHANGELOG.md) | Postgres through Kysely |
| [`@seedcord/eslint-plugin`](tooling/eslint-plugin) | [![version](https://img.shields.io/npm/v/%40seedcord%2Feslint-plugin?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](tooling/eslint-plugin/CHANGELOG.md) | ESLint rules for seedcord bots |
| [`eslint-plugin-discordjs`](tooling/eslint-plugin-discordjs) | [![version](https://img.shields.io/npm/v/eslint-plugin-discordjs?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](tooling/eslint-plugin-discordjs/CHANGELOG.md) | ESLint rules for discord.js bots |
| [`@seedcord/eslint-config`](tooling/eslint-config) | [![version](https://img.shields.io/npm/v/%40seedcord%2Feslint-config?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](tooling/eslint-config/CHANGELOG.md) | shared ESLint config |
| [`@seedcord/tsconfig`](tooling/tsconfig) | [![version](https://img.shields.io/npm/v/%40seedcord%2Ftsconfig?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](tooling/tsconfig/CHANGELOG.md) | shared TypeScript config |

<!-- prettier-ignore-end -->

---

<p align="center"><sub><a href=".github/CONTRIBUTING.md">Contributing</a> · Built by <a href="https://github.com/materwelonDhruv">@materwelonDhruv</a> · <a href="LICENSE">Apache-2.0</a></sub></p>
