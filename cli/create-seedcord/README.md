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

[![npm](https://img.shields.io/npm/v/create-seedcord?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/create-seedcord) [![node](https://img.shields.io/node/v/create-seedcord?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![license](https://img.shields.io/npm/l/create-seedcord?style=flat-square&label=&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

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

It asks where the project goes, how Discord reaches your bot, what the bot should react to, your bot token, and an accent color. Then it writes the project, installs, formats, generates your command types, and makes the first commit.

On Windows, run it from Windows Terminal. The prompts fall back to ASCII in `cmd.exe` making the boxes draw as `T`, `|`, and `o`.

## Flags

Every question has a flag. Pass them all to skip all questions. `--help` prints the list.

npm forwards flags to the package only after a `--`:

```sh
npm create seedcord my-bot -- --transport gateway --capabilities reactions
pnpm create seedcord my-bot --transport gateway --capabilities reactions
```

`--no-install` and `--no-git` turn off those two steps.

With no terminal to ask on, it reads the flags alone. It names the flag that would supply any answer you left out.

## What you get

A TypeScript project holding one slash command, its handler, a sample event handler (if you picked `gateway`), `seedcord.config.ts`, eslint, prettier, and a `.env` listing every key the framework reads.

`pnpm dev` starts it with hot reload. On the http transport it also opens a cloudflared tunnel and sets it up, and Discord posts interactions to that URL.
