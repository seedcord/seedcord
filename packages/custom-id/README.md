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

[![npm](https://img.shields.io/npm/v/@seedcord/custom-id?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/custom-id) [![node](https://img.shields.io/node/v/@seedcord/custom-id?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![license](https://img.shields.io/npm/l/@seedcord/custom-id?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

Discord gives a component one string to carry its state, capped at 100 characters. `@seedcord/custom-id` declares what that string holds, packs values into it, and reads them back with the types you declared. The component that mints the id and the code that reads a click share one declaration.

Values pack into a compact wire, which fits more of them under the cap. Every id carries a short hash of its shape, so a click on a component built before you changed the fields refuses, and the wrong values never reach your code.

When using it directly with discord.js or any other library, you'll have to set up routing yourself. Seedcord's gateway and http packages do that for you, so you can just declare the shape and read the wire.

Until v1.0.0, minor versions can break.

## Installation

```sh
pnpm add @seedcord/custom-id
```

A seedcord bot already has this through `@seedcord/gateway` or `@seedcord/http`. Installing it directly risks a second copy whose decode failures skip your bot's reply cards.

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

Fields come from `snowflake`, `uuid`, `int`, `bool`, `oneOf`, and `str`. Each one takes `{ nullable: true }` to also carry null. A bounded `int('page', 1, 50)` packs into fewer characters than an unbounded one.

`prefixOf` recovers the route prefix from a raw wire. The prefix survives a shape change, which makes it what you route on. `decodeFor` takes several definitions at once and returns the matched prefix with its own params.

Refer to the [guide](https://guide.seedcord.org/components/custom-ids) for more examples, and the [reference](https://docs.seedcord.org/packages/custom-id/latest) for the full API.

## Errors

`decode` throws two things. A wire minted before the shape changed throws `CustomIdWireStale`. A corrupt wire, or one another definition minted, throws `CustomIdWireInvalid`. Both are `SeedcordError` from `@seedcord/errors`, so branch on the code.

`setCustomIdErrors` replaces both with your own constructors. Replace them with `Notice` subclasses when using the seedcord framework.
