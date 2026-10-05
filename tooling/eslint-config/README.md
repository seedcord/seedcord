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

[![npm](https://img.shields.io/npm/v/@seedcord/eslint-config?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/eslint-config) [![node](https://img.shields.io/node/v/@seedcord/eslint-config?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![bun](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fseedcord%2Fseedcord%2Fnext%2Ftooling%2Feslint-config%2Fpackage.json&query=%24.engines.bun&style=flat-square&label=bun&labelColor=1f1f1f&color=fbf0df)](https://bun.com) [![license](https://img.shields.io/npm/l/@seedcord/eslint-config?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/eslint-config` is the flat ESLint config seedcord projects run. `createConfig` builds the whole setup, and two options turn on the seedcord rules and the discord.js rules:

- `registerSeedcordPlugin` applies [`@seedcord/eslint-plugin`](https://www.npmjs.com/package/@seedcord/eslint-plugin)'s recommended preset
- `registerDiscordjsPlugin` applies [`eslint-plugin-discordjs`](https://www.npmjs.com/package/eslint-plugin-discordjs)'s recommended preset

`create-seedcord` writes a config that uses this.

Until v1.0.0, minor versions can break.

## Installation

```sh
pnpm add -D @seedcord/eslint-config
```

## Usage

```js
// eslint.config.js
import createConfig from '@seedcord/eslint-config';

export default createConfig({
    registerSeedcordPlugin: true,
    registerDiscordjsPlugin: true
});
```

`@seedcord/eslint-config/prettier` holds the matching Prettier config.
