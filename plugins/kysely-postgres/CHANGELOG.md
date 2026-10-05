# @seedcord/plugin-kysely-postgres

## 0.6.0

### 💥 Breaking

- Fixed your built bot throwing `corrupted migrations` against a database that `seedcord dev` migrated from a file or an array path. Because the recorded name kept its extension, `001-create-users.ts` and `001-create-users.js` counted as two migrations. If a database already holds a name like that, rename its row in `kysely_migration` to the name without the extension. ([#357](https://github.com/seedcord/seedcord/pull/357))

### 🩹 Patch

- Every package declares Bun 1.4.2 as its minimum in `engines`. ([`edbe71a`](https://github.com/seedcord/seedcord/commit/edbe71a8c8d5c9f20a2166f8848d2a638798c196))
- Fixed a listed migration going missing when another listed file has the same name, like `users/001-init.ts` and `guilds/001-init.ts`. Startup now throws `PluginKyselyDuplicateMigrationName` with both file paths. ([#357](https://github.com/seedcord/seedcord/pull/357))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.12.0 → 0.13.0
- `@seedcord/logger` 0.4.3 → 0.4.4
- `@seedcord/types` 0.14.3 → 0.14.4
- `@seedcord/utils` 0.8.16 → 0.8.17

## 0.5.3

### 🩹 Patch

- The README and the `discord-component-embed` doc comment examples now link the guide at `seedcord.org/guide` and the reference at `seedcord.org/docs`. ([#343](https://github.com/seedcord/seedcord/pull/343))
- Fixed the peer conflict that a bot on TypeScript 5.9 hit at install. The `typescript` peer now accepts 5.9, 6, and 7. ([#340](https://github.com/seedcord/seedcord/pull/340))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.11.1 → 0.12.0
- `@seedcord/logger` 0.4.2 → 0.4.3
- `@seedcord/types` 0.14.1 → 0.14.2
- `@seedcord/utils` 0.8.15 → 0.8.16

## 0.5.2

### 🩹 Patch

- The README tagline now reads "The whole Discord bot, typed end to end". ([`56f9eb8`](https://github.com/seedcord/seedcord/commit/56f9eb8d40c0c654530f950480820ae863441935))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.11.0 → 0.11.1
- `@seedcord/logger` 0.4.1 → 0.4.2
- `@seedcord/types` 0.14.0 → 0.14.1
- `@seedcord/utils` 0.8.14 → 0.8.15

## 0.5.1

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.10.0 → 0.11.0
- `@seedcord/utils` 0.8.13 → 0.8.14
- `@seedcord/logger` 0.4.0 → 0.4.1

## 0.5.0

### 💥 Breaking

- seedcord now needs envapt 8.2.2 or newer. Older versions throw `Cannot redefine property` when the CLI loads a class that reads its config through an `@Envapt` property. ([#327](https://github.com/seedcord/seedcord/pull/327))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/logger` 0.3.3 → 0.4.0
- `@seedcord/errors` 0.9.0 → 0.10.0
- `@seedcord/utils` 0.8.12 → 0.8.13

## 0.4.3

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.8.0 → 0.9.0
- `@seedcord/types` 0.13.0 → 0.14.0
- `@seedcord/utils` 0.8.11 → 0.8.12
- `@seedcord/logger` 0.3.2 → 0.3.3

## 0.4.2

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/types` 0.12.0 → 0.13.0
- `@seedcord/errors` 0.7.0 → 0.8.0
- `@seedcord/logger` 0.3.1 → 0.3.2
- `@seedcord/utils` 0.8.10 → 0.8.11

## 0.4.1

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.6.0 → 0.7.0
- `@seedcord/types` 0.11.0 → 0.12.0
- `@seedcord/logger` 0.3.0 → 0.3.1
- `@seedcord/utils` 0.8.9 → 0.8.10

## 0.4.0

### 💥 Breaking

- Every shared symbol key now reads `seedcord:` plus kebab-case. Plugin service metadata moved to the same global registry the core keys use. Make sure to update your packages together! You don't need to change any code for this. ([#301](https://github.com/seedcord/seedcord/pull/301))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.5.1 → 0.6.0
- `@seedcord/types` 0.10.1 → 0.11.0
- `@seedcord/logger` 0.2.2 → 0.3.0
- `@seedcord/utils` 0.8.8 → 0.8.9

## 0.3.0

### 💥 Breaking

- an error that reports a bad argument now throws `SeedcordTypeError` or `SeedcordRangeError`. Update any `isSeedcordError(error, 'SeedcordError', code)` call naming one of those codes, since branching on the code alone is unaffected. ([`1bf7d89`](https://github.com/seedcord/seedcord/commit/1bf7d89))

    An invalid plugin lifecycle timeout throws the new `PluginInvalidLifecycleTimeout` code.

### 🩹 Patch

- The `kysely` and `pg` peer ranges now start at `^0.29.4` and `^8.22.0`. ([#296](https://github.com/seedcord/seedcord/pull/296))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.4.3 → 0.5.0
- `@seedcord/logger` 0.2.1 → 0.2.2
- `@seedcord/types` 0.9.1 → 0.10.0
- `@seedcord/utils` 0.8.7 → 0.8.8

## 0.2.1

### 🩹 Patch

- Updated TSDoc reference generation. ([`1d2f1e3`](https://github.com/seedcord/seedcord/commit/1d2f1e3))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.4.0 → 0.4.1
- `@seedcord/logger` 0.2.0 → 0.2.1
- `@seedcord/utils` 0.8.5 → 0.8.6
- `@seedcord/types` 0.9.0 → 0.9.1

## 0.2.0

### 🩹 Patch

- Update log colors in some places. ([`97b62ef`](https://github.com/seedcord/seedcord/commit/97b62ef))
- These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build. ([`f39cde0`](https://github.com/seedcord/seedcord/commit/f39cde0))
- Use `#` instead of `@` for tsconfig path aliases. ([`a259cdc`](https://github.com/seedcord/seedcord/commit/a259cdc))
- Rewrote package descriptions for all packages. Also added keywords. ([`a8d7b5f`](https://github.com/seedcord/seedcord/commit/a8d7b5f))
- Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link. ([`660a94d`](https://github.com/seedcord/seedcord/commit/660a94d))
- Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all. ([`c50ad6c`](https://github.com/seedcord/seedcord/commit/c50ad6c))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.4 → 0.4.0
- `@seedcord/logger` 0.1.4 → 0.2.0
- `@seedcord/types` 0.8.2 → 0.9.0
- `@seedcord/utils` 0.8.4 → 0.8.5

## 0.1.4

### 💥 Breaking

- envapt is a peer dependency now. Your project and seedcord load one copy, so the framework reads the config you set through `Envapter`. ([`71a0b99`](https://github.com/seedcord/seedcord/commit/71a0b99))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/logger` 0.1.3 → 0.1.4
- `@seedcord/errors` 0.3.3 → 0.3.4
- `@seedcord/types` 0.8.1 → 0.8.2
- `@seedcord/utils` 0.8.3 → 0.8.4

## 0.1.3

### 🩹 Patch

- 'reflect-metadata' is a direct dep now. No need to import it at the top. The packages import it in their index files, first thing. ([#237](https://github.com/seedcord/seedcord/pull/237))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.2 → 0.3.3
- `@seedcord/logger` 0.1.2 → 0.1.3
- `@seedcord/utils` 0.8.2 → 0.8.3

## 0.1.2

### 🩹 Patch

- Update comments ([`272b729`](https://github.com/seedcord/seedcord/commit/272b729))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.1 → 0.3.2
- `@seedcord/logger` 0.1.1 → 0.1.2
- `@seedcord/types` 0.8.1 → 0.8.2
- `@seedcord/utils` 0.8.1 → 0.8.2

## 0.1.1

### 🩹 Patch

- Bump deps. ([#228](https://github.com/seedcord/seedcord/pull/228))
- Set all packages' node floor to LTS. ([#228](https://github.com/seedcord/seedcord/pull/228))
- A hot reload now logs one line worded by what changed, `Unloaded` on a delete, `Registered` on a new file, and `Reloaded` with a duration on an edit. ([#231](https://github.com/seedcord/seedcord/pull/231))
- Now uses the appropriate log levels for logs across the lifecycle of the transports and plugins. ([#233](https://github.com/seedcord/seedcord/pull/233))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.0 → 0.3.1
- `@seedcord/logger` 0.1.0 → 0.1.1
- `@seedcord/types` 0.8.0 → 0.8.1
- `@seedcord/utils` 0.8.0 → 0.8.1

## 0.1.0

### ✨ Minor

- New `@seedcord/plugin-kysely-postgres`, replacing the kysely surface from `@seedcord/plugins`. It attaches to a gateway bot and to an http server bot. ([#212](https://github.com/seedcord/seedcord/pull/212))

    Augment `KyselyDatabase` with your schema once, then `KyselyService<'users'>` resolves against it. A failure after the pool opens closes it before `init()` rejects.

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/logger` 0.1.0 (new)
- `@seedcord/types` 0.7.2-next.0 → 0.8.0
- `@seedcord/utils` 0.7.1-next.0 → 0.8.0
- `@seedcord/errors` 0.2.2-next.0 → 0.3.0
