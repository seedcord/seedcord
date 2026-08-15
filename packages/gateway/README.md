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

[![npm](https://img.shields.io/npm/v/@seedcord/gateway?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/gateway) [![node](https://img.shields.io/node/v/@seedcord/gateway?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![license](https://img.shields.io/npm/l/@seedcord/gateway?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/gateway` runs a seedcord bot over a websocket connection, built on discord.js. A gateway connection carries message, member, voice, and reaction events. Discord never posts those to an interactions endpoint. Pick this transport when the bot reacts to any of them.

Until v1.0.0, minor versions can break.

## Installation

```sh
pnpm add @seedcord/gateway discord.js
```

`discord.js`, `envapt`, and `typescript` are peer dependencies. `pnpm create seedcord` sets all of it up.

## What it adds over the core

Everything in `@seedcord/core`, plus the parts that use a live connection:

- `Seedcord`, the class that connects and holds the discord.js client
- event subscribers, through `Subscriber` and `WebhookLog`
- `getConfirmation`, which waits on a button press and returns the answer
- pagination sources bound to the gateway
