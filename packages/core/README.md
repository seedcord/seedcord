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

[![npm](https://img.shields.io/npm/v/@seedcord/core?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/core) [![node](https://img.shields.io/node/v/@seedcord/core?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![bun](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fseedcord%2Fseedcord%2Fnext%2Fpackages%2Fcore%2Fpackage.json&query=%24.engines.bun&style=flat-square&label=bun&labelColor=1f1f1f&color=fbf0df)](https://bun.com) [![license](https://img.shields.io/npm/l/@seedcord/core?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/core` is the code both seedcord transports share. It has the route decorators, the handler bases, checks, pagination, the startup and shutdown phases, and the plugin base. [`@seedcord/gateway`](https://www.npmjs.com/package/@seedcord/gateway) and [`@seedcord/http`](https://www.npmjs.com/package/@seedcord/http) connect it to Discord.

Both transports depend on core and re-export all of it, so a bot imports everything from its transport. Install core directly when you write a plugin that works on both transports.

seedcord is pre-1.0, so a minor version can break your plugin. Each release's changelog says what changed and how to update.

## Installation

```sh
pnpm add -D @seedcord/core envapt typescript
```

Also list `@seedcord/core` in your plugin's `peerDependencies`, with the versions you tested against. A plugin that extends a different copy of core than the bot's throws `CorePluginFromOtherCore` when the bot attaches it.

## Usage

A plugin extends `Plugin` from `@seedcord/core/plugin` and implements `init()`:

```ts
import { Plugin } from '@seedcord/core/plugin';

export class Uptime extends Plugin {
    private startedAt = 0;

    public async init(): Promise<void> {
        this.startedAt = Date.now();
    }

    public elapsed(): number {
        return Date.now() - this.startedAt;
    }
}
```

A gateway or http bot attaches it with `.attach('uptime', Uptime)`, and handlers call `this.core.uptime.elapsed()`. The [Writing plugins guide](https://seedcord.org/guide/writing-plugins) covers options, lifecycle phases, testing a plugin locally, and publishing.
