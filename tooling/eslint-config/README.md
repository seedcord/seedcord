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

`@seedcord/eslint-config` is the flat ESLint config seedcord projects run, with a matching Prettier config. Two options add the bot rules:

- `registerSeedcordPlugin` turns on [`@seedcord/eslint-plugin`](https://www.npmjs.com/package/@seedcord/eslint-plugin)
- `registerDiscordjsPlugin` turns on [`eslint-plugin-discordjs`](https://www.npmjs.com/package/eslint-plugin-discordjs)

`pnpm create seedcord` installs it and writes both config files. Install it yourself to add the same setup to an existing bot, or to any TypeScript project with both options left off.

## Installation

```sh
pnpm add -D @seedcord/eslint-config eslint jiti prettier typescript
```

ESLint loads an `eslint.config.ts` through `jiti`.

## Usage

```ts
// eslint.config.ts
import createConfig from '@seedcord/eslint-config';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    registerDiscordjsPlugin: true,
    registerSeedcordPlugin: true,
    generalIgnores: ['**/seedcord-gen.d.ts']
});
```

```ts
// prettier.config.ts
import { createPrettierConfig } from '@seedcord/eslint-config/prettier';

export default createPrettierConfig();
```

The [linting guide](https://seedcord.org/guide/tooling/lint) covers what the rules catch.
