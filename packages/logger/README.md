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

[![npm](https://img.shields.io/npm/v/@seedcord/logger?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/logger) [![node](https://img.shields.io/node/v/@seedcord/logger?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![bun](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fseedcord%2Fseedcord%2Fnext%2Fpackages%2Flogger%2Fpackage.json&query=%24.engines.bun&style=flat-square&label=bun&labelColor=1f1f1f&color=fbf0df)](https://bun.com) [![license](https://img.shields.io/npm/l/@seedcord/logger?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/logger` writes each log line on a named channel, and you set the level per channel. That lets you quiet one part of a program and keep the rest. `@seedcord/logger/node` adds console and file output through winston.

Both seedcord transports depend on it and re-export it, and every handler, subscriber, and plugin in a bot has a `this.logger`. Install it directly to use the same logger in a script or a tool outside a bot.

seedcord is pre-1.0, so a minor version can break your code. Each release's changelog says what changed and how to update.

## Installation

```sh
pnpm add @seedcord/logger envapt
```

## Usage

```ts
import { Logger } from '@seedcord/logger';
import { installNodeDefaults } from '@seedcord/logger/node';

installNodeDefaults({ channels: { sync: { level: 'warn' } } });

const logger = new Logger('Sync', { channel: 'sync' });
logger.info('starting'); // hidden, since sync only shows warn and above
logger.warn('retrying after a timeout');
```

The [logging guide](https://seedcord.org/guide/tooling/logging) covers channels, and the [logger config guide](https://seedcord.org/guide/tooling/logger-config) covers levels and sinks.
