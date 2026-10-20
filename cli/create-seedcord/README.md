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

[![npm](https://img.shields.io/npm/v/create-seedcord?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/create-seedcord) [![node](https://img.shields.io/node/v/create-seedcord?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![bun](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fseedcord%2Fseedcord%2Fnext%2Fcli%2Fcreate-seedcord%2Fpackage.json&query=%24.engines.bun&style=flat-square&label=bun&labelColor=1f1f1f&color=fbf0df)](https://bun.com) [![license](https://img.shields.io/npm/l/create-seedcord?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`create-seedcord` sets up a new seedcord bot. It asks a few questions, writes the project, and can install its dependencies and make the first git commit. You run it once, when you start a new bot.

seedcord is pre-1.0, so a minor version can break your bot. Each release's changelog says what changed and how to update.

## Usage

```sh
pnpm create seedcord my-bot
```

`npm create seedcord`, `yarn create seedcord`, and `bun create seedcord` work too, and the project uses that package manager.

It asks whether your bot is a gateway or an http bot, where an http bot runs, what a gateway bot reacts to, your bot token, and the servers to test your commands in. The [first bot guide](https://seedcord.org/guide/first-bot) walks through each question.

Every question has a flag, and `--help` prints them all. npm passes flags on only after a `--`:

```sh
npm create seedcord my-bot -- --transport gateway --capabilities reactions
```

## What you get

A TypeScript project with one slash command, its handler, a sample plugin, `seedcord.config.ts`, ESLint, Prettier, and a `.env` for your token. A gateway bot also gets a sample event handler. An http bot on Cloudflare Workers also gets a `cloudflare.config.ts` and a `deploy` script.

`pnpm dev` starts the bot with hot reload.
