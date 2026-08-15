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

[![npm](https://img.shields.io/npm/v/@seedcord/event-emitter?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/event-emitter) [![node](https://img.shields.io/node/v/@seedcord/event-emitter?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![license](https://img.shields.io/npm/l/@seedcord/event-emitter?style=flat-square&label=&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`TypedEventEmitter` ties each event name to its payload tuple, so a typo in a name or a wrong argument is a compile error. It carries no dependency on `node:events`, which lets it run on Cloudflare Workers and other edge runtimes alongside Node.

`waitFor` resolves with the payload of the next matching event. It rejects with a `WaitForError` when the timeout elapses or the `AbortSignal` fires, and `error.reason` says which of the two happened.

Until v1.0.0, minor versions can break.

## Installation

Both transports depend on this package and re-export it, so a bot already has it. It stands alone with no seedcord dependency:

```sh
pnpm add @seedcord/event-emitter
```

## Usage

```ts
import { TypedEventEmitter } from '@seedcord/event-emitter';

interface Events {
    ready: [startedAt: number];
    failed: [error: Error];
}

const bus = new TypedEventEmitter<Events>();

bus.on('ready', (startedAt) => {
    // startedAt is a number
});

const [startedAt] = await bus.waitFor('ready', { timeoutMs: 5_000 });
```

`waitFor` also takes a `filter`, which resolves on the first payload the filter accepts.
