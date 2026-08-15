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

[![npm](https://img.shields.io/npm/v/@seedcord/logger?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/logger) [![node](https://img.shields.io/node/v/@seedcord/logger?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![license](https://img.shields.io/npm/l/@seedcord/logger?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/logger` writes log lines into named channels, so you can quiet the framework's startup and dispatch output while keeping your own. seedcord registers its channels through `FRAMEWORK_CHANNELS`. You register whatever else your bot logs.

The root entry stays runtime-agnostic and writes through `ObjectConsoleSink`. `@seedcord/logger/node` swaps in the winston sinks for pretty console output and rotating files.

Until v1.0.0, minor versions can break.

## Installation

Your transport already re-exports this. Install it directly for a standalone tool:

```sh
pnpm add @seedcord/logger
```

## Usage

```ts
import { Logger } from '@seedcord/logger';
import { installNodeDefaults } from '@seedcord/logger/node';

installNodeDefaults();

const logger = new Logger('Payments', { channel: 'app' });
logger.info('charge captured', { id });
```

`paint` holds the truecolor tones the framework uses for interpolated values. `logger.utils` renders multi-line output as a summary, a block, or entries.
