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

[![npm](https://img.shields.io/npm/v/@seedcord/errors?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/errors) [![node](https://img.shields.io/node/v/@seedcord/errors?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![license](https://img.shields.io/npm/l/@seedcord/errors?style=flat-square&label=&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/errors` holds every error seedcord throws. Each one carries a registered code from `SeedcordErrorCode`, so a caller can branch on one specific failure.

Framework code never throws a raw `Error`. A third-party throw may be translated into one of these before you catch it.

Until v1.0.0, minor versions can break.

## Installation

Both transports depend on this package and re-export it, so a bot already has it.

```sh
pnpm add @seedcord/errors
```

## Usage

`isSeedcordError` narrows on the class and the code together:

```ts
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';

try {
    await run();
} catch (error) {
    if (isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.CliCancelled)) return;
    throw error;
}
```

Called with one argument it narrows to any seedcord error.
