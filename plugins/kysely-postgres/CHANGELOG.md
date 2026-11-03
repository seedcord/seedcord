# @seedcord/plugin-kysely-postgres

## 0.8.0-next.1

### 🩹 Patch

- Updated some documentation. ([`bb8ee7c`](https://github.com/seedcord/seedcord/commit/bb8ee7cfcfedf4b70765ca547f191b68958553fa))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.15.0-next.0 → 0.15.0-next.1
- `@seedcord/logger` 0.6.0-next.0 → 0.6.0-next.1
- `@seedcord/types` 0.16.0-next.0 → 0.16.0-next.1

## 0.8.0-next.0

### ✨ Minor

- `seedcord codegen` now fills in `MongooseServices` and `KyselyServices` from your decorated service classes. You can delete the `declare module` blocks that list your services. ([#426](https://github.com/seedcord/seedcord/pull/426))

### 🩹 Patch

- Fixed the `type-fest` types in the published declarations failing to resolve, since each package listed `type-fest` only as a dev dependency. ([`50db882`](https://github.com/seedcord/seedcord/commit/50db8827aca008f874bf60e5796a696c894056cc))

#### 📦 Seedcord packages

- `@seedcord/logger` 0.5.0 → 0.6.0-next.0
- `@seedcord/utils` 0.9.0 → 0.9.1-next.0
- `@seedcord/core` 0.11.0 → 0.12.0-next.0
- `@seedcord/types` 0.15.0 → 0.16.0-next.0
- `@seedcord/errors` 0.14.0 → 0.15.0-next.0

## 0.7.0

### 💥 Breaking

- Requires Node 24.22.1+ on 24.x or Node 26.12.1+ for the October 2026 security fixes. ([`cc7930b`](https://github.com/seedcord/seedcord/commit/cc7930b810b17be66cff49c6cd793b199ef752a3))
- A relative folder path in the bot config, a plugin's `dir`, Kysely's migrations folder, and a folder passed to `importFiles` now resolve against `root` from `seedcord.config.ts`. With `root: './src'`, write `interactions: { path: './handlers' }` where you wrote `'./src/handlers'`. Outside `seedcord dev` and the built output, like in a test or a `tsx` run, a relative path now throws `CoreDirectoryRootUnknown` while an absolute path like `resolve(import.meta.dirname, './handlers')` works as before. ([#382](https://github.com/seedcord/seedcord/pull/382))
- seedcord now needs envapt ≥9.2. Run `pnpm add envapt@latest`, then update your own envapt reads with the [v8 to v9 migration guide](https://envapt.materwelon.dev/docs/migration-v8-to-v9/). ([`99e7d64`](https://github.com/seedcord/seedcord/commit/99e7d6400b19af6db55548fd02c41ac1eb9b1737))
- A mistake in your own code or command line now throws `SeedcordTypeError`, like two handlers on one route or a bad CLI flag. A zero `Cooldown` and other numbers out of range get `SeedcordRangeError`. An env var with a bad value is reported as a plain `SeedcordError`. ([#397](https://github.com/seedcord/seedcord/pull/397))
- Error codes that cover the same failure are now merged, like the five match-arm codes into `MatchArmMissing`, and the codes of removed features, like `CliBootstrapWriteFailed`, are gone. Many of the rest have a new number, and some old numbers now belong to a different code. Match on the `SeedcordErrorCode` member and never on the raw number. ([#397](https://github.com/seedcord/seedcord/pull/397))
- `migrations.path` is now `migrations.dir`, and the plugin now runs the migrations in its subfolders too. Every code file in it has to export `up` by name or on a default export object, or the plugin throws `PluginKyselyInvalidMigrationModule`, and `down` is now optional. A `.cjs` or `.cts` migration no longer loads. ([#383](https://github.com/seedcord/seedcord/pull/383))
- `importFiles`, and with it every handler, command, subscriber, service and migration folder, now loads `.tsx`, `.mts`, `.jsx` and `.mjs` files as well as `.ts` and `.js`. A stray `.mjs` file left in a handler folder starts loading too. `seedcord build` writes each one as a `.js` file and throws `CoreDuplicateName` for two files that would build to the same one, like `Roll.ts` and `Roll.tsx`. ([#410](https://github.com/seedcord/seedcord/pull/410))
- `importFiles` now skips dotfiles, dot-folders, `node_modules`, `outDir` and the logs folder, the same way a built bot does. That covers handler, command and service folders, the command scan in `seedcord codegen` and `commands`, and hot reload in `seedcord dev`. Move a handler out of a folder like `.drafts/` to keep it loading. ([#359](https://github.com/seedcord/seedcord/pull/359))

### 🩹 Patch

- Handler, middleware, command, subscriber, and service folders now load their files sorted by path. ([#358](https://github.com/seedcord/seedcord/pull/358))
- Fixed `migrateDown({ steps: 3 })` skipping the same migration three times when the newest applied one has no `down`. It now logs that migration as skipped once and stops. ([`ab7cf81`](https://github.com/seedcord/seedcord/commit/ab7cf813bb7e93115902b5e7e2bf50206b4435b3))
- Fixed `seedcord dev` skipping the restart prompt when you save a migration. ([#383](https://github.com/seedcord/seedcord/pull/383))
- Fixed `corrupted migrations` for two migrations that ran at the same time with names like `B` and `a`, because the plugin never passed `migrations.nameComparator` to Kysely. ([#383](https://github.com/seedcord/seedcord/pull/383))
- `attach` now throws `CorePluginScopeMismatch` when a plugin's transport or runtime differs from the bot's, even when a cast or plain JS gets past the types. A plugin that narrows either one, like `Plugin<{ runtime: 'server' }>`, now has to pass the same value to `super()`, for example `super(host, { runtime: 'server' })`. ([#363](https://github.com/seedcord/seedcord/pull/363))
- Fixed a failed disconnect showing up twice at shutdown. The plugin used to log it and then throw it, and now only the thrown `PluginDisconnectFailed` reports it. ([#397](https://github.com/seedcord/seedcord/pull/397))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.14.0-next.0 → 0.14.0
- `@seedcord/logger` 0.5.0-next.1 → 0.5.0
- `@seedcord/types` 0.15.0-next.0 → 0.15.0
- `@seedcord/utils` 0.9.0-next.1 → 0.9.0

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
