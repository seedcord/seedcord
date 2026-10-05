# eslint-plugin-discordjs

## 0.1.7

### 🩹 Patch

- Every package declares Bun 1.4.2 as its minimum in `engines`. ([`edbe71a`](https://github.com/seedcord/seedcord/commit/edbe71a8c8d5c9f20a2166f8848d2a638798c196))

## 0.1.6

### 🩹 Patch

- An `eslint.config.cjs` now loads the plugin's ESM build through `require()`. ([`4a3318c`](https://github.com/seedcord/seedcord/commit/4a3318c91e4466acac62a09eb934d8b785e7700d))
- The README opens with the plugin's own name and links, and the npm homepage now points at that README. ([#340](https://github.com/seedcord/seedcord/pull/340))
- The README and the `discord-component-embed` doc comment examples now link the guide at `seedcord.org/guide` and the reference at `seedcord.org/docs`. ([#343](https://github.com/seedcord/seedcord/pull/343))
- Fixed the peer conflict that a project on TypeScript 5.9 hit at install. The `typescript` peer now accepts 5.9 and 6.0. ([#340](https://github.com/seedcord/seedcord/pull/340))

## 0.1.5

### 🩹 Patch

- The README tagline now reads "The whole Discord bot, typed end to end". ([`56f9eb8`](https://github.com/seedcord/seedcord/commit/56f9eb8d40c0c654530f950480820ae863441935))

## 0.1.4

### 🩹 Patch

- Updated TSDoc reference generation. ([`1d2f1e3`](https://github.com/seedcord/seedcord/commit/1d2f1e3))

## 0.1.3

### 🩹 Patch

- Use `#` instead of `@` for tsconfig path aliases. ([`a259cdc`](https://github.com/seedcord/seedcord/commit/a259cdc))
- Rewrote package descriptions for all packages. Also added keywords. ([`a8d7b5f`](https://github.com/seedcord/seedcord/commit/a8d7b5f))
- Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link. ([`660a94d`](https://github.com/seedcord/seedcord/commit/660a94d))
- Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all. ([`c50ad6c`](https://github.com/seedcord/seedcord/commit/c50ad6c))
- Relocated the folder in the monorepo. ([`c75f837`](https://github.com/seedcord/seedcord/commit/c75f837))

## 0.1.2

### 🩹 Patch

- Update comments ([`272b729`](https://github.com/seedcord/seedcord/commit/272b729))

## 0.1.1

### 🩹 Patch

- Set all packages' node floor to LTS. ([#228](https://github.com/seedcord/seedcord/pull/228))

## 0.1.0

### ✨ Minor

- New `eslint-plugin-discordjs`, type-aware ESLint rules for discord.js bots covering button props, select-menu bounds, and Discord's own limits. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

### 🩹 Patch

- Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))
