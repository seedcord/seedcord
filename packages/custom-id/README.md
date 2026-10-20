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

[![npm](https://img.shields.io/npm/v/@seedcord/custom-id?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/custom-id) [![node](https://img.shields.io/node/v/@seedcord/custom-id?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![bun](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fseedcord%2Fseedcord%2Fnext%2Fpackages%2Fcustom-id%2Fpackage.json&query=%24.engines.bun&style=flat-square&label=bun&labelColor=1f1f1f&color=fbf0df)](https://bun.com) [![license](https://img.shields.io/npm/l/@seedcord/custom-id?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

Discord gives a component one string to carry its state, capped at 100 characters. `@seedcord/custom-id` declares what that string holds, packs values into it, and reads them back with the types you declared. The component that mints the id and the code that reads a click share one declaration.

Each id also carries a short hash of its fields. A click on a component built before you changed them throws on decode, so values in the old layout never reach your code.

Both seedcord transports depend on it, and a seedcord bot imports `CustomId` from its transport. Install it directly to use it with discord.js or any other Discord library, without seedcord. You then match each click to its definition yourself.

seedcord is pre-1.0, so a minor version can break your bot. Each release's changelog says what changed and how to update.

## Installation

```sh
pnpm add @seedcord/custom-id
```

## Usage

```ts
import { ButtonBuilder, Events } from 'discord.js';
import { CustomId } from '@seedcord/custom-id';

const Approve = new CustomId('approve').snowflake('userId').oneOf('action', ['approve', 'deny']);

new ButtonBuilder().setCustomId(Approve.encode({ userId: '123', action: 'deny' })).setLabel('Deny');

client.on(Events.InteractionCreate, (interaction) => {
    if (!interaction.isButton()) return;
    if (!Approve.owns(interaction.customId)) return;

    const { userId, action } = Approve.decode(interaction.customId);
    // userId: string, action: 'approve' | 'deny'
});
```

The [custom ids guide](https://seedcord.org/guide/components/custom-ids) covers every field type and what `decode` throws. The [reference](https://seedcord.org/docs/packages/custom-id/latest) has the full API.
