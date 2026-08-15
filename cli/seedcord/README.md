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

[![npm](https://img.shields.io/npm/v/seedcord?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/seedcord) [![node](https://img.shields.io/node/v/seedcord?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![license](https://img.shields.io/npm/l/seedcord?style=flat-square&label=&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`seedcord` is the CLI a bot project runs during development and at build time. It reads `seedcord.config.ts` and gives you a dev server with hot reload, a production build, the codegen that types your commands, and a cleanup tool for stale guild commands.

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
| `seedcord build` | compiles the project from the config file |
| `seedcord codegen` | writes the typed augmentations for your commands and config |
| `seedcord commands` | inspects and cleans commands already deployed to Discord |

<!-- prettier-ignore-end -->

`codegen --check` verifies the committed augmentations match your source. Run it in CI.

`commands --clean` reports guild commands that duplicate a global one. It runs as a dry run until you pass `--apply`.

On the http transport, `dev` also opens a cloudflared tunnel and points Discord's interactions URL at it.

## Config

`defineConfig` types `seedcord.config.ts`:

```ts
import { defineConfig } from 'seedcord';

export default defineConfig({
    // ...
});
```
