# @seedcord/utils

## 0.8.11

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/types` 0.12.0 → 0.13.0
- `@seedcord/errors` 0.7.0 → 0.8.0

## 0.8.10

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.6.0 → 0.7.0
- `@seedcord/types` 0.11.0 → 0.12.0

## 0.8.9

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.5.1 → 0.6.0
- `@seedcord/types` 0.10.1 → 0.11.0

## 0.8.8

### 🩹 Patch

- `renderTable` now applies `maxWidth` under `border: 'markdown'` without needing `overflow: 'truncate'`, since a GFM cell holds one line. `header: false` under that border keeps row 0 as data and puts a blank row above the delimiter. ([`64c9a0e`](https://github.com/seedcord/seedcord/commit/64c9a0e))
- Fixed `roundToDenomination` shortening from 10_000 up. It should have been 1_000. `1234` now correctly returns `'1.2K'` where it used to return `'1234'`. Also, this function now takes any number of `suffixes`. ([`e4e8605`](https://github.com/seedcord/seedcord/commit/e4e8605))

    Fixed `longestStringLength([])` returning `-Infinity` instead of `0`.

#### 📦 Seedcord packages

- `@seedcord/errors` 0.4.3 → 0.5.0
- `@seedcord/types` 0.9.1 → 0.10.0

## 0.8.7

### 🩹 Patch

- Bots now start on Windows. seedcord imported handler, command, and subscriber files by raw filesystem path, and Node read the `D:` drive letter as a URL protocol. ([#286](https://github.com/seedcord/seedcord/pull/286))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.4.2 → 0.4.3

## 0.8.6

### 🩹 Patch

- Updated TSDoc reference generation. ([`1d2f1e3`](https://github.com/seedcord/seedcord/commit/1d2f1e3))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.4.0 → 0.4.1
- `@seedcord/types` 0.9.0 → 0.9.1

## 0.8.5

### 🩹 Patch

- These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build. ([`f39cde0`](https://github.com/seedcord/seedcord/commit/f39cde0))
- Use `#` instead of `@` for tsconfig path aliases. ([`a259cdc`](https://github.com/seedcord/seedcord/commit/a259cdc))
- Rewrote package descriptions for all packages. Also added keywords. ([`a8d7b5f`](https://github.com/seedcord/seedcord/commit/a8d7b5f))
- Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link. ([`660a94d`](https://github.com/seedcord/seedcord/commit/660a94d))
- Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all. ([`c50ad6c`](https://github.com/seedcord/seedcord/commit/c50ad6c))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.4 → 0.4.0
- `@seedcord/types` 0.8.2 → 0.9.0

## 0.8.4

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.3 → 0.3.4
- `@seedcord/types` 0.8.1 → 0.8.2

## 0.8.3

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.2 → 0.3.3

## 0.8.2

### 🩹 Patch

- Update comments ([`272b729`](https://github.com/seedcord/seedcord/commit/272b729))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.1 → 0.3.2
- `@seedcord/types` 0.8.1 → 0.8.2

## 0.8.1

### 🩹 Patch

- Bump deps. ([#228](https://github.com/seedcord/seedcord/pull/228))
- Set all packages' node floor to LTS. ([#228](https://github.com/seedcord/seedcord/pull/228))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.0 → 0.3.1
- `@seedcord/types` 0.8.0 → 0.8.1

## 0.8.0

### 💥 Breaking

- Node 24.3 or newer is required. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))
- `traverseDirectory` and `isTsOrJsFile` moved to `@seedcord/utils/node`, and `traverseDirectory` no longer takes a logger. ([#188](https://github.com/seedcord/seedcord/pull/188))

    **BREAKING:** an unreadable directory and a file that throws while importing both reject. An unreadable directory used to resolve empty, which started a bot with none of its handlers registered.

### ✨ Minor

- Add `stripAnsi` and `timestampFromSnowflake`. `formatFilePath` returns a path outside the working directory unchanged. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

### 🩹 Patch

- Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

#### 📦 Seedcord packages

- `@seedcord/types` 0.7.2-next.0 → 0.8.0
- `@seedcord/errors` 0.2.2-next.0 → 0.3.0

## 0.7.0

### ✨ Minor

- Rename `generateAsciiTable` to `renderTable` and fold pagination into it. Passing a `budget` returns one `string` per page (header repeated on each, default 2000) instead of a single string, so the separate `paginateAsciiTable` is gone. Fix `numericAlign` to judge a column by its body rows so a numeric column under a text header now right-aligns. Add `fence` to wrap the output in a triple-backtick block for monospace rendering in Discord messages and embeds, counted against `budget`. Default is now a rounded table. And a lot more customization options! ([#152](https://github.com/seedcord/seedcord/pull/152))

### 🩹 Patch

- Remove unused exports. ([#154](https://github.com/seedcord/seedcord/pull/154))
- add examples to some utils that should have them ([#152](https://github.com/seedcord/seedcord/pull/152))
- update LICENSE copyright year ([#152](https://github.com/seedcord/seedcord/pull/152))

#### 📦 Seedcord packages

- `@seedcord/types` 0.7.0 → 0.7.1

## 0.6.1

### 🩹 Patch

- Bump non-breaking runtime dependencies (envapt 6.0.2, discord-api-types 0.38.49, mongoose 9.7.1, ink 7.1.0, typescript-eslint 8.61.1, tailwindcss peer 4.3.1). ([`043e2a1`](https://github.com/seedcord/seedcord/commit/043e2a1))

#### 📦 Seedcord packages

- `@seedcord/types` 0.6.0 → 0.7.0

## 0.6.0

### ✨ Minor

- Rename the cooldown store and land the gate leaf prep. ([#143](https://github.com/seedcord/seedcord/pull/143))

    - In `@seedcord/services`, `CooldownManager` is renamed to `RateLimiter` (`CooldownWindow` and `CooldownResult` become `RateLimitWindow` and `RateLimitResult`), and the `@seedcord/services/internal` subpath is removed. The throw-based `check()` API becomes `hit(key, { delay, limit? })`.
    - In `seedcord`, the store is reached at `core.rateLimiter`.
    - In `@seedcord/utils`, add `parseDuration`, the `ValidDuration` template type, and `toEpochSeconds`.
    - In `@seedcord/types`, add `Config.ownerIds` and the `Epoch` types (`EpochMs` and `EpochSec`).

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/types` 0.5.0 → 0.6.0

## 0.5.0

### 💥 Breaking

- removed the public `buildSlashRoute` builder and the `CommandRouteString` type from `seedcord`. Slash routes are autocompletable typed literals from the generated registry now, so write them directly, e.g. `@SlashRoute('demo/setup')`. ([#139](https://github.com/seedcord/seedcord/pull/139))
    - Moved the route-string assembly to `@seedcord/utils/internal`, shared by the framework and `seedcord codegen` so a dispatched interaction and a generated registry key can never diverge. The interaction-to-route extraction is internal now.
    - Removed the unused `SeedcordErrorCode.UtilInvalidSlashRouteArgument`.

### ✨ Minor

- Add `routeLeavesOf` to `@seedcord/utils/internal`, the single walk that turns a slash command's JSON into its route-leaf keys. `@seedcord/cli` codegen now reads route leaves from there and depends on `discord-api-types` for its API enums and types instead of the full `discord.js` runtime. ([#139](https://github.com/seedcord/seedcord/pull/139))

### 🩹 Patch

- Fix `roundToDenomination`'s second example ([#139](https://github.com/seedcord/seedcord/pull/139))

#### 📦 Seedcord packages

- `@seedcord/types` 0.4.0 → 0.5.0

## 0.4.0

### ✨ Minor

- seedcord instance brand ([#129](https://github.com/seedcord/seedcord/pull/129))
- most packages were exporting more than what they should be exporting and now have smaller imports as they should ([`7e6d80e`](https://github.com/seedcord/seedcord/commit/7e6d80e))

### 🩹 Patch

- export "version" variable with the actual semantic version of each package ([`225977a`](https://github.com/seedcord/seedcord/commit/225977a))
- new method to format a file path relative to the root directory ([#129](https://github.com/seedcord/seedcord/pull/129))
- new fully typed hasKeys function that can check for the existence of a key and narrow the type based on the distributive union the key is coming from. works with nested keys too ([#129](https://github.com/seedcord/seedcord/pull/129))
- Reclassify singleton runtime dependencies as peer dependencies so a consumer resolves a single shared instance. ([`5e4bf42`](https://github.com/seedcord/seedcord/commit/5e4bf42))
    - `seedcord`: `discord.js` and `reflect-metadata` are now required peer dependencies.
    - `@seedcord/plugins`: `mongoose`, `pg`, and `kysely` are optional peer dependencies (install only the backend your plugin uses); `reflect-metadata` and `seedcord` are required peers.
    - `@seedcord/types`: `discord.js` is now an optional peer dependency.
    - `@seedcord/services` and `@seedcord/utils`: `type-fest` moved to `devDependencies` (its types are inlined into the published declarations).

- `filterCirculars` now returns a serializable `{ '[unserializable]': reason }` placeholder when a value cannot be made JSON-safe, instead of returning the original value (which would re-throw in the caller's own `JSON.stringify`). `traverseDirectory` logs the directory path and cause on a read failure. ([`7308d36`](https://github.com/seedcord/seedcord/commit/7308d36))
- build pipeline migrated from `tsup` to `tsdown`. each published package now ships `dist/index.d.mts` + `dist/index.d.cts` (cjs is a one-line re-export stub) with a per-condition `exports` map. source-level public API unchanged. `@seedcord/tsup-config` renamed to `@seedcord/tsdown-config` and made private. ([`fe77998`](https://github.com/seedcord/seedcord/commit/fe77998))
- bump peer floor: typescript `^6.0.3`, node `^22.13`. shared `tsconfig/base.json` now sets `esModuleInterop: true` and `types: ["node"]` for ts6's removed implicit defaults. no public API changes. ([`fe77998`](https://github.com/seedcord/seedcord/commit/fe77998))

#### 📦 Seedcord packages

- `@seedcord/types` 0.3.5 → 0.4.0

## 0.3.8

### 🩹 Patch

- bump general dependencies ([`f8fbe70`](https://github.com/seedcord/seedcord/commit/f8fbe70))

#### 📦 Seedcord packages

- `@seedcord/services` 0.5.1 → 0.6.0
- `@seedcord/types` 0.3.4 → 0.3.5

## 0.3.7

### 🩹 Patch

- bump deps ([`1d8986b`](https://github.com/seedcord/seedcord/commit/1d8986b))

#### 📦 Seedcord packages

- `@seedcord/services` 0.5.0 → 0.5.1
- `@seedcord/types` 0.3.3 → 0.3.4

## 0.3.6

### 🩹 Patch

- remove extra line(s) after tsdoc comments ([`6e067da`](https://github.com/seedcord/seedcord/commit/6e067da))

#### 📦 Seedcord packages

- `@seedcord/services` 0.4.0 → 0.5.0

## 0.3.5

### 🩹 Patch

- custom seedcord errors and error codes ([#62](https://github.com/seedcord/seedcord/pull/62))

#### 📦 Seedcord packages

- `@seedcord/services` 0.3.3 → 0.4.0

## 0.3.4

### 🩹 Patch

- bump deps (mainly djs to 14.24.2)

#### 📦 Seedcord packages

- `@seedcord/services` 0.3.2 → 0.3.3
- `@seedcord/types` 0.3.2 → 0.3.3

## 0.3.3

### 🩹 Patch

- bump discord.js version to latest

#### 📦 Seedcord packages

- `@seedcord/services` 0.3.1 → 0.3.2
- `@seedcord/types` 0.3.1 → 0.3.2

## 0.3.2

### 🩹 Patch

- new util function `keepDefined` ([`d8b4c50`](https://github.com/seedcord/seedcord/commit/d8b4c50))

## 0.3.1

### 🩹 Patch

- bump deps, update djs to 14.24.0, make file_upload available in BuilderComponent ([`aaa59b7`](https://github.com/seedcord/seedcord/commit/aaa59b7))

#### 📦 Seedcord packages

- `@seedcord/services` 0.3.0 → 0.3.1
- `@seedcord/types` 0.3.0 → 0.3.1

## 0.3.0

### ✨ Minor

- new function called filterCirculars that cleans up objects with circular refs new ILogger interface defining logging methods for various log levels so packages that would normally have a circular dependency on services can just depend on types instead ([#56](https://github.com/seedcord/seedcord/pull/56))

### 🩹 Patch

- improve type exports and tsdoc ([#56](https://github.com/seedcord/seedcord/pull/56))

#### 📦 Seedcord packages

- `@seedcord/services` 0.2.2 → 0.3.0
- `@seedcord/types` 0.2.2 → 0.3.0

## 0.2.3

### 🩹 Patch

- set up project-wide ci/cd ([#47](https://github.com/seedcord/seedcord/pull/47))
- bump deps ([`31d1a56`](https://github.com/seedcord/seedcord/commit/31d1a56))

#### 📦 Seedcord packages

- `@seedcord/services` 0.2.1 → 0.2.2
- `@seedcord/types` 0.2.1 → 0.2.2

## 0.2.2

### 🩹 Patch

- versioning fix

## 0.2.1

### 🩹 Patch

- bump deps

#### 📦 Seedcord packages

- `@seedcord/services` 0.2.0 → 0.2.1
- `@seedcord/types` 0.2.0 → 0.2.1

## 0.2.0

### ✨ Minor

- update export settings (BREAKING)

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/services` 0.1.1 → 0.2.0
- `@seedcord/types` 0.1.4 → 0.2.0

## 0.1.1

### 🩹 Patch

- bump deps ([`8a7591a`](https://github.com/seedcord/seedcord/commit/8a7591a))

#### 📦 Seedcord packages

- `@seedcord/services` 0.1.0 → 0.1.1
- `@seedcord/types` 0.1.3 → 0.1.4

## 0.1.0

### ✨ Minor

- move services to its own package ([`dabf324`](https://github.com/seedcord/seedcord/commit/dabf324))
- new utils package ([`f0650e8`](https://github.com/seedcord/seedcord/commit/f0650e8))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/services` 0.1.0 (new)
