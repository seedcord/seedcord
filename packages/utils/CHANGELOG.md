# @seedcord/utils

## 0.9.2

### 🩹 Patch

- `@seedcord/core` now reads `fileUrl` from here. ([#444](https://github.com/seedcord/seedcord/pull/444))

#### 📦 Seedcord packages

- `@seedcord/types` 0.16.1 → 0.16.2
- `@seedcord/errors` 0.15.0 → 0.15.1

## 0.9.1

### 🩹 Patch

- Fixed `node dist/index.js` crashing with `Cannot read properties of undefined (reading 'root')` when your code reads `import.meta.dirname`. It now throws `CoreBuiltModuleRanDirectly`, which tells you to run `dist/index.mjs`. ([`c5ba606`](https://github.com/seedcord/seedcord/commit/c5ba60619473410e2ee65801a830f290fae6d71d))
- Fixed the edge logger losing a `Date` passed to a log call, and spreading a class instance's fields into the top level. Both now go in `args`. ([#426](https://github.com/seedcord/seedcord/pull/426))
- Fixed the `type-fest` types in the published declarations failing to resolve, since each package listed `type-fest` only as a dev dependency. ([`50db882`](https://github.com/seedcord/seedcord/commit/50db8827aca008f874bf60e5796a696c894056cc))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.15.0-next.3 → 0.15.0
- `@seedcord/types` 0.16.0-next.1 → 0.16.0

## 0.9.0

### 💥 Breaking

- Requires Node 24.22.1+ on 24.x or Node 26.12.1+ for the October 2026 security fixes. ([`cc7930b`](https://github.com/seedcord/seedcord/commit/cc7930b810b17be66cff49c6cd793b199ef752a3))
- A relative folder path in the bot config, a plugin's `dir`, Kysely's migrations folder, and a folder passed to `importFiles` now resolve against `root` from `seedcord.config.ts`. With `root: './src'`, write `interactions: { path: './handlers' }` where you wrote `'./src/handlers'`. Outside `seedcord dev` and the built output, like in a test or a `tsx` run, a relative path now throws `CoreDirectoryRootUnknown` while an absolute path like `resolve(import.meta.dirname, './handlers')` works as before. ([#382](https://github.com/seedcord/seedcord/pull/382))
- A mistake in your own code or command line now throws `SeedcordTypeError`, like two handlers on one route or a bad CLI flag. A zero `Cooldown` and other numbers out of range get `SeedcordRangeError`. An env var with a bad value is reported as a plain `SeedcordError`. ([#397](https://github.com/seedcord/seedcord/pull/397))
- Error codes that cover the same failure are now merged, like the five match-arm codes into `MatchArmMissing`, and the codes of removed features, like `CliBootstrapWriteFailed`, are gone. Many of the rest have a new number, and some old numbers now belong to a different code. Match on the `SeedcordErrorCode` member and never on the raw number. ([#397](https://github.com/seedcord/seedcord/pull/397))
- `importFiles`, and with it every handler, command, subscriber, service and migration folder, now loads `.tsx`, `.mts`, `.jsx` and `.mjs` files as well as `.ts` and `.js`. A stray `.mjs` file left in a handler folder starts loading too. `seedcord build` writes each one as a `.js` file and throws `CoreDuplicateName` for two files that would build to the same one, like `Roll.ts` and `Roll.tsx`. ([#410](https://github.com/seedcord/seedcord/pull/410))
- Under `seedcord dev` and in a built bot, `importFiles` now throws `CorePathOutsideRoot` for a folder outside `root`. `importFiles` and `readFiles` throw `CoreDirectorySkipped` for a folder that `seedcord build` leaves out of the bot, like `./locales/.cache`, and `seedcord codegen`, `build` and `commands` run the same checks on the folders in your config. ([#410](https://github.com/seedcord/seedcord/pull/410))
- `@seedcord/utils/node` is gone, and its `traverseDirectory` is now `importFiles` from `@seedcord/utils` (#410). It takes only the folder and returns files for a `for await` loop, sorted by path. A plugin that wrote `await traverseDirectory(dir, (fullPath, relativePath, imported) => {})` should now write `for await (const { fullPath, relativePath, imported } of importFiles(dir)) {}`. ([#358](https://github.com/seedcord/seedcord/pull/358))
- `importFiles` now skips dotfiles, dot-folders, `node_modules`, `outDir` and the logs folder, the same way a built bot does. That covers handler, command and service folders, the command scan in `seedcord codegen` and `commands`, and hot reload in `seedcord dev`. Move a handler out of a folder like `.drafts/` to keep it loading. ([#359](https://github.com/seedcord/seedcord/pull/359))

### ✨ Minor

- Added `files` to `seedcord.config.ts`, like `files: ['./locales']` or `files: ['../assets']` beside `root`, for the folders a built bot reads through `readFiles`. `seedcord build` bundles non-code files from only those folders, binary files included, and `readFiles` throws `CoreDirectoryNotListed` for a folder `files` leaves out. A listed folder that is missing, is a file, or sits outside the folder that holds `seedcord.config.ts` throws `CliListedFolderUnusable`. ([#410](https://github.com/seedcord/seedcord/pull/410))
- Added `readFiles` for bots and plugins that read json, markdown, images, or other non-code files from a folder that `files` in `seedcord.config.ts` lists, in dev and in a built bot alike. Each file comes back as a `Buffer`, and `bytes.toString()` turns a text file into a string. `@seedcord/gateway` and `@seedcord/http` now export `readFiles` and `importFiles` too (#410). ([#358](https://github.com/seedcord/seedcord/pull/358))

### 🩹 Patch

- `seedcord dev` now reads `{"do":"restart"}`, `{"do":"disconnect"}`, and `{"do":"quit"}` lines from stdin when it runs without a terminal. ([#418](https://github.com/seedcord/seedcord/pull/418))
- Handler, middleware, command, subscriber, and service folders now load their files sorted by path. ([#358](https://github.com/seedcord/seedcord/pull/358))
- Fixed `formatFilePath` printing backslashes on Windows. It now prints `./src/bot.ts` where it printed `.\src\bot.ts`. ([#401](https://github.com/seedcord/seedcord/pull/401))
- Fixed `roundToDenomination` rounding 1949 up to `2K` and printing `1undefined` for a value after the last suffix. Now 1949 gives `1.9K`, for example. ([#384](https://github.com/seedcord/seedcord/pull/384), thanks [@dumbramkrishna](https://github.com/dumbramkrishna))
- Fixed `filterCirculars` printing a child that two fields share as `[Circular]`. Both fields now show that child's contents, in `decycle` and `json` mode. ([#378](https://github.com/seedcord/seedcord/pull/378), thanks [@lunaradev1](https://github.com/lunaradev1))
- Fixed `importFiles` and `readFiles` showing a file outside the working directory as a long relative path, like `../../../../bot/handlers/Roll.js`. They now show its full path, `/bot/handlers/Roll.js` for example. ([#407](https://github.com/seedcord/seedcord/pull/407))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.14.0-next.0 → 0.14.0
- `@seedcord/types` 0.15.0-next.0 → 0.15.0

## 0.8.17

### 🩹 Patch

- Every package declares Bun 1.4.2 as its minimum in `engines`. ([`edbe71a`](https://github.com/seedcord/seedcord/commit/edbe71a8c8d5c9f20a2166f8848d2a638798c196))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.12.0 → 0.13.0
- `@seedcord/types` 0.14.3 → 0.14.4

## 0.8.16

### 🩹 Patch

- The README and the `discord-component-embed` doc comment examples now link the guide at `seedcord.org/guide` and the reference at `seedcord.org/docs`. ([#343](https://github.com/seedcord/seedcord/pull/343))
- Fixed the peer conflict that a bot on TypeScript 5.9 hit at install. The `typescript` peer now accepts 5.9, 6, and 7. ([#340](https://github.com/seedcord/seedcord/pull/340))
- Fixed `renderTable` with `maxWidth` so two spaces in a row or a tab wrap like a single space. ([#323](https://github.com/seedcord/seedcord/pull/323), thanks [@ramsquishnaaa](https://github.com/ramsquishnaaa))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.11.1 → 0.12.0
- `@seedcord/types` 0.14.1 → 0.14.2

## 0.8.15

### 🩹 Patch

- The README tagline now reads "The whole Discord bot, typed end to end". ([`56f9eb8`](https://github.com/seedcord/seedcord/commit/56f9eb8d40c0c654530f950480820ae863441935))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.11.0 → 0.11.1
- `@seedcord/types` 0.14.0 → 0.14.1

## 0.8.14

### 🩹 Patch

- `@seedcord/logger` and `seedcord` now read `isPlainObject` from `@seedcord/utils`. ([#336](https://github.com/seedcord/seedcord/pull/336))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.10.0 → 0.11.0

## 0.8.13

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.9.0 → 0.10.0

## 0.8.12

### 🩹 Patch

- Fixed `renderTable` hanging when a single character is wider than `maxWidth`, like an emoji with `maxWidth: 1`. ([#305](https://github.com/seedcord/seedcord/pull/305), thanks [@ramsquishnaaa](https://github.com/ramsquishnaaa))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.8.0 → 0.9.0
- `@seedcord/types` 0.13.0 → 0.14.0

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
