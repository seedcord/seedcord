# @seedcord/eslint-plugin

## 0.5.1-next.0

### 🩹 Patch

- Fixed `use-custom-id-codec` flagging the custom id of a text input, like `input.setCustomId('reason')` in a modal. That id only keys the value you read back with `getTextInputValue`. ([`f0177b9`](https://github.com/seedcord/seedcord/commit/f0177b9aa7503cf9aabfb5009d802e83d9ade50a))

## 0.5.0

### 💥 Breaking

- Requires Node 24.22.1+ on 24.x or Node 26.12.1+ for the October 2026 security fixes. ([`cc7930b`](https://github.com/seedcord/seedcord/commit/cc7930b810b17be66cff49c6cd793b199ef752a3))

### 🩹 Patch

- Updated the README. ([`0a2520e`](https://github.com/seedcord/seedcord/commit/0a2520e3ac58ce714dae728c5b9fc6f60d40c7c2))

#### 📦 Seedcord packages

- `eslint-plugin-discordjs` 0.1.8-next.0 → 0.2.0

## 0.4.3

### 🩹 Patch

- Every package declares Bun 1.4.2 as its minimum in `engines`. ([`edbe71a`](https://github.com/seedcord/seedcord/commit/edbe71a8c8d5c9f20a2166f8848d2a638798c196))

#### 📦 Seedcord packages

- `eslint-plugin-discordjs` 0.1.6 → 0.1.7

## 0.4.2

### 🩹 Patch

- The README and the `discord-component-embed` doc comment examples now link the guide at `seedcord.org/guide` and the reference at `seedcord.org/docs`. ([#343](https://github.com/seedcord/seedcord/pull/343))
- Fixed the peer conflict that a project on TypeScript 5.9 hit at install. The `typescript` peer now accepts 5.9 and 6.0. ([#340](https://github.com/seedcord/seedcord/pull/340))

#### 📦 Seedcord packages

- `eslint-plugin-discordjs` 0.1.5 → 0.1.6

## 0.4.1

### 🩹 Patch

- The README tagline now reads "The whole Discord bot, typed end to end". ([`56f9eb8`](https://github.com/seedcord/seedcord/commit/56f9eb8d40c0c654530f950480820ae863441935))

#### 📦 Seedcord packages

- `eslint-plugin-discordjs` 0.1.4 → 0.1.5

## 0.4.0

### ✨ Minor

- `middleware-missing-register-decorator` now matches the per-kind middleware decorators. `no-raw-interaction-acks` now reports a raw ack inside a middleware. ([#310](https://github.com/seedcord/seedcord/pull/310))

## 0.3.1

### 🩹 Patch

- `interaction-handler-missing-route` and `no-raw-interaction-acks` now match the per-kind select menu bases. ([#303](https://github.com/seedcord/seedcord/pull/303))

## 0.3.0

### 💥 Breaking

- A handler's cache state now follows the `contexts` its command declares, so a command a DM can reach types `interaction.guild` as `Guild | null`. `SlashOptionRegistry` becomes `SlashRegistry`, `ContextMenuHandler` splits into `UserContextMenuHandler` and `MessageContextMenuHandler` with a route decorator each, a paginator's nav handler reads `this.event.guild` as nullable, and a gateway bot registering a guild-capable command without the `Guilds` intent throws at startup. Run `seedcord codegen` after upgrading. This won't affect most commands. ([#283](https://github.com/seedcord/seedcord/pull/283))

## 0.2.1

### 🩹 Patch

- Updated TSDoc reference generation. ([`1d2f1e3`](https://github.com/seedcord/seedcord/commit/1d2f1e3))

#### 📦 Seedcord packages

- `eslint-plugin-discordjs` 0.1.3 → 0.1.4

## 0.2.0

### ✨ Minor

- New `use-paint-in-logs` rule flags chalk inside a logger call and points you at the `paint` tones from `@seedcord/errors`. ([#251](https://github.com/seedcord/seedcord/pull/251))

### 🩹 Patch

- These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build. ([`f39cde0`](https://github.com/seedcord/seedcord/commit/f39cde0))
- Use `#` instead of `@` for tsconfig path aliases. ([`a259cdc`](https://github.com/seedcord/seedcord/commit/a259cdc))
- Rewrote package descriptions for all packages. Also added keywords. ([`a8d7b5f`](https://github.com/seedcord/seedcord/commit/a8d7b5f))
- Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link. ([`660a94d`](https://github.com/seedcord/seedcord/commit/660a94d))
- Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all. ([`c50ad6c`](https://github.com/seedcord/seedcord/commit/c50ad6c))
- Relocated the folder in the monorepo. ([`c75f837`](https://github.com/seedcord/seedcord/commit/c75f837))

#### 📦 Seedcord packages

- `eslint-plugin-discordjs` 0.1.2 → 0.1.3

## 0.1.2

### 🩹 Patch

- Update comments ([`272b729`](https://github.com/seedcord/seedcord/commit/272b729))

#### 📦 Seedcord packages

- `eslint-plugin-discordjs` 0.1.1 → 0.1.2

## 0.1.1

### 🩹 Patch

- Set all packages' node floor to LTS. ([#228](https://github.com/seedcord/seedcord/pull/228))

#### 📦 Seedcord packages

- `eslint-plugin-discordjs` 0.1.0 → 0.1.1

## 0.1.0

### ✨ Minor

- New `@seedcord/eslint-plugin`, type-aware rules that catch seedcord footguns before runtime. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    Exports `recommended` and a `seedcord` preset layering it over eslint-plugin-discordjs. The rules cover missing route and registration decorators, raw discord.js acknowledgement calls, and discord.js builder imports.

### 🩹 Patch

- Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

#### 📦 Seedcord packages

- `eslint-plugin-discordjs` 0.1.0 (new)
