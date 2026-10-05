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

`create-seedcord` scaffolds a new seedcord bot project.

Until v1.0.0, minor versions can break.

## Usage

```sh
pnpm create seedcord my-bot
npm create seedcord my-bot
yarn create seedcord my-bot
```

It asks where the project goes, how Discord reaches your bot, what the bot should react to, your bot token, your app public key on http, and an accent color. Then it writes the project, installs dependencies, formats, generates your command types, and makes the first commit. If a step after the write fails, you get a warning and the summary still prints.

If you don't have the token or key yet, press Enter twice on its prompt to skip it. Fill it into `.env` before you start the bot.

On Windows, run it from Windows Terminal. The prompts fall back to ASCII in `cmd.exe` making the boxes draw as `T`, `|`, and `o`.

## Flags

Every question has a flag. Pass them all to skip all questions. `--help` prints the list.

npm forwards flags to the package only after a `--`:

```sh
npm create seedcord my-bot -- --transport gateway --capabilities reactions
pnpm create seedcord my-bot --transport gateway --capabilities reactions
```

`--no-install` and `--no-git` turn off those two steps. `--no-token` and `--no-public-key` leave those keys empty without asking. `-v` prints the version and `-h` prints the flag list.

With no terminal to ask on, it reads the flags alone. It prints the flag that would supply any answer you left out.

## What you get

A TypeScript project holding one slash command, its handler, a sample event handler (if you picked `gateway`), `seedcord.config.ts`, eslint, prettier, and a `.env` listing every key the framework reads.

`pnpm dev` starts it with hot reload. On the http transport it also opens a cloudflared tunnel and sets it up, and Discord posts interactions to that URL.
