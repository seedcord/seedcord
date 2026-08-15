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

[![npm](https://img.shields.io/npm/v/@seedcord/http?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/http) [![node](https://img.shields.io/node/v/@seedcord/http?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![license](https://img.shields.io/npm/l/@seedcord/http?style=flat-square&label=&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/http` runs a seedcord bot on Discord's interactions endpoint. Discord posts each interaction to your URL. The framework verifies the Ed25519 signature before dispatching it.

Discord posts only interactions over this transport. Use [`@seedcord/gateway`](https://www.npmjs.com/package/@seedcord/gateway) when the bot reacts to messages, members, or voice.

Until v1.0.0, minor versions can break.

## Installation

```sh
pnpm add @seedcord/http
```

`pnpm create seedcord` scaffolds the whole project. On this transport `pnpm dev` also opens a cloudflared tunnel and registers the URL with Discord.

## Entry points

The root entry runs on Node through the `Seedcord` class.

`@seedcord/http/edge` targets Web-standard runtimes through `createSeedcord`. The Node entry re-exports all of it. The edge build for Cloudflare Workers is a work in progress and cannot be used yet.
