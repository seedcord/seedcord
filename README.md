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

```sh
pnpm create seedcord
```

**[Read the guide →](https://guide.seedcord.org)**

_**seedcord is pre-1.0, so minor versions can break.** I've already completed nearly all of the massive changes I planned though, so it's relatively stable. Read the changelog before you bump. Also, the `http` transport's edge build for CloudFlare Workers is a work in progress, and currently cannot be used._

<div align="center">
  <img src="https://cdn.seedcord.org/assets/readme-dev-tui.webp" alt="seedcord dev server" width="640" />
</div>

## Public packages

<!-- prettier-ignore-start -->

| package | what it does |
| --- | --- |
| [`create-seedcord`](cli/create-seedcord) | scaffolds a new bot |
| [`seedcord`](cli/seedcord) | the CLI, dev server, build, and codegen |
| [`@seedcord/core`](packages/core) | foundational code shared by both transports |
| [`@seedcord/gateway`](packages/gateway) | the websocket transport, built on discord.js |
| [`@seedcord/http`](packages/http) | the interactions transport |
| [`@seedcord/logger`](packages/logger) | channelled logging |
| [`@seedcord/errors`](packages/errors) | typed errors with registered codes |
| [`@seedcord/utils`](packages/utils) | type helpers and small functions |
| [`@seedcord/types`](packages/types) | config shapes and shared types |
| [`@seedcord/rate-limiter`](packages/rate-limiter) | rate limiting and key building |
| [`@seedcord/event-emitter`](packages/event-emitter) | node-free typed event emitter with `waitFor` |
| [`@seedcord/plugin-mongoose`](plugins/mongoose) | MongoDB through Mongoose |
| [`@seedcord/plugin-kysely-postgres`](plugins/kysely-postgres) | Postgres through Kysely |
| [`@seedcord/eslint-plugin`](tooling/eslint-plugin) | ESLint rules for seedcord bots |
| [`eslint-plugin-discordjs`](tooling/eslint-plugin-discordjs) | ESLint rules for discord.js bots |
| [`@seedcord/eslint-config`](tooling/eslint-config) | shared ESLint config |
| [`@seedcord/tsconfig`](tooling/tsconfig) | shared TypeScript config |

<!-- prettier-ignore-end -->

---

<p align="center"><sub><a href=".github/CONTRIBUTING.md">Contributing</a> · Built by <a href="https://github.com/materwelonDhruv">@materwelonDhruv</a> · <a href="LICENSE">Apache-2.0</a></sub></p>
