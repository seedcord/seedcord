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

[![npm](https://img.shields.io/npm/v/@seedcord/event-emitter?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/event-emitter) [![node](https://img.shields.io/node/v/@seedcord/event-emitter?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![bun](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fseedcord%2Fseedcord%2Fnext%2Fpackages%2Fevent-emitter%2Fpackage.json&query=%24.engines.bun&style=flat-square&label=bun&labelColor=1f1f1f&color=fbf0df)](https://bun.com) [![license](https://img.shields.io/npm/l/@seedcord/event-emitter?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/event-emitter` exports `TypedEventEmitter`, which ties each event name to its payload types. A typo in an event name or a wrong argument is a compile error. It imports nothing from Node, so it runs on Node, Bun, and Cloudflare Workers.

Both seedcord transports depend on it and re-export it, and a bot's `this.core.bus` is one. Install it directly for a typed emitter in any project. It has no dependencies.

seedcord is pre-1.0, so a minor version can break your code. Each release's changelog says what changed and how to update.

## Installation

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

`waitFor` resolves with the next payload for that event. It rejects with a `WaitForError` when `timeoutMs` passes or a `signal` aborts.
