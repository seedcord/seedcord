<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.seedcord.org/assets/wordmark-dark.webp" />
    <img src="https://cdn.seedcord.org/assets/wordmark-light.webp" alt="seedcord" width="440" />
  </picture>
</p>

# create-seedcord

Scaffold a new seedcord bot project.

## Usage

```sh
pnpm create seedcord my-bot
npm create seedcord my-bot
yarn create seedcord my-bot
```

It asks where the project goes, how Discord reaches your bot, what the bot should react to, your bot token, and an accent color. Then it writes the project, installs, formats, generates your command types, and makes the first commit.

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

You get a TypeScript project with one slash command, its handler, a sample event handler (if you picked `gateway`), `seedcord.config.ts`, eslint, prettier, and a `.env` listing every key the framework reads.

`pnpm dev` starts it with hot reload. On the http transport it also opens a cloudflared tunnel and sets it up, and Discord posts interactions to that URL.

## Docs

- Guide: <https://guide.seedcord.org>
- API reference: <https://docs.seedcord.org>

Part of the [seedcord](https://github.com/seedcord/seedcord) framework. Until a major v1.0.0 release, expect breaking changes in minor versions.
