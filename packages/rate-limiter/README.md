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

[![npm](https://img.shields.io/npm/v/@seedcord/rate-limiter?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/rate-limiter) [![node](https://img.shields.io/node/v/@seedcord/rate-limiter?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![license](https://img.shields.io/npm/l/@seedcord/rate-limiter?style=flat-square&label=&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/rate-limiter` gives you `MemoryRateLimiter` and `buildKey`. Each transport constructs one in its `Seedcord` constructor and assigns it to `core.rateLimiter`. The `Cooldown` gate reads it from there, and a handler gets the same instance from `this.core.rateLimiter`.

`MemoryRateLimiter` counts in one process, so it resets on restart and stays per-isolate on serverless. Pass your own `Store<'charge'>` as `config.store` to keep the counts across restarts and isolates.

Until v1.0.0, minor versions can break.

## Installation

Both transports depend on this package and re-export it, so a bot already has it.

```sh
pnpm add @seedcord/rate-limiter
```

## Usage

`buildKey` joins a prefix and its parts with `:`, substituting `global` for a null part, so two features never collide on one user id:

```ts
import { buildKey, MemoryRateLimiter } from '@seedcord/rate-limiter';

const limiter = new MemoryRateLimiter();
const key = buildKey('daily', interaction.user.id);
```

The `Cooldown` gate covers the common case. Call `this.core.rateLimiter` from a handler when the gate has no option for the window you want.
