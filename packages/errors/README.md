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

[![npm](https://img.shields.io/npm/v/@seedcord/errors?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/errors) [![node](https://img.shields.io/node/v/@seedcord/errors?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![bun](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fseedcord%2Fseedcord%2Fnext%2Fpackages%2Ferrors%2Fpackage.json&query=%24.engines.bun&style=flat-square&label=bun&labelColor=1f1f1f&color=fbf0df)](https://bun.com) [![license](https://img.shields.io/npm/l/@seedcord/errors?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/errors` defines the codes for every error seedcord throws, in `SeedcordErrorCode`. `isSeedcordError` checks a caught value against a code, so your code can react to one specific failure.

Both seedcord transports depend on it and re-export it, so a bot imports `isSeedcordError` from its transport. Install it directly in a plugin or a library that catches errors from a seedcord package, like [`@seedcord/custom-id`](https://www.npmjs.com/package/@seedcord/custom-id) in a discord.js bot.

seedcord is pre-1.0, so a minor version can break your code. Each release's changelog says what changed and how to update.

## Installation

```sh
pnpm add @seedcord/errors
```

## Usage

Say `Approve` is a `CustomId` from `@seedcord/custom-id`, and a click arrives on a button built from an older version of it:

```ts
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';

try {
    Approve.decode(interaction.customId);
} catch (error) {
    if (!isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.CustomIdWireStale)) throw error;
    await interaction.reply('This button is out of date. Run the command again.');
}
```

The [error handling guide](https://seedcord.org/guide/replying/error-behavior) covers how a seedcord bot replies to an error.
