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

[![npm](https://img.shields.io/npm/v/@seedcord/tsconfig?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/tsconfig) [![node](https://img.shields.io/node/v/@seedcord/tsconfig?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![bun](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fseedcord%2Fseedcord%2Fnext%2Ftooling%2Ftsconfig%2Fpackage.json&query=%24.engines.bun&style=flat-square&label=bun&labelColor=1f1f1f&color=fbf0df)](https://bun.com) [![license](https://img.shields.io/npm/l/@seedcord/tsconfig?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/tsconfig` is the base TypeScript config seedcord projects extend. It turns on `strict` plus the checks that catch the things `strict` leaves open, including `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`, and `noFallthroughCasesInSwitch`. `experimentalDecorators` is on. The framework's route and command decorators require it.

Two configs ship. `base` targets `ESNext`, and `node` targets `ES2024`.

Until v1.0.0, minor versions can break.

## Installation

```sh
pnpm add -D @seedcord/tsconfig
```

## Usage

```jsonc
{
    "extends": "@seedcord/tsconfig/node",
    "compilerOptions": {
        "outDir": "dist"
    },
    "include": ["src"]
}
```

Both configs set `noEmit`, so a package that builds sets its own `outDir` and turns emit back on.
