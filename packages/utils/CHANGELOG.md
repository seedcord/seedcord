# @seedcord/utils

## 0.6.1

### Patch Changes

- 043e2a1: Bump non-breaking runtime dependencies (envapt 6.0.2, discord-api-types 0.38.49, mongoose 9.7.1, ink 7.1.0, typescript-eslint 8.61.1, tailwindcss peer 4.3.1).
- Updated dependencies [7121c18]
    - @seedcord/types@0.7.0

## 0.6.1-next.0

### Patch Changes

- 043e2a1: Bump non-breaking runtime dependencies (envapt 6.0.2, discord-api-types 0.38.49, mongoose 9.7.1, ink 7.1.0, typescript-eslint 8.61.1, tailwindcss peer 4.3.1).
- Updated dependencies [7121c18]
    - @seedcord/types@0.7.0-next.0

## 0.6.0

### Minor Changes

- 6e39348: Rename the cooldown store and land the gate leaf prep.

    - In `@seedcord/services`, `CooldownManager` is renamed to `RateLimiter` (`CooldownWindow` and `CooldownResult` become `RateLimitWindow` and `RateLimitResult`), and the `@seedcord/services/internal` subpath is removed. The throw-based `check()` API becomes `hit(key, { delay, limit? })`.
    - In `seedcord`, the store is reached at `core.rateLimiter`.
    - In `@seedcord/utils`, add `parseDuration`, the `ValidDuration` template type, and `toEpochSeconds`.
    - In `@seedcord/types`, add `Config.ownerIds` and the `Epoch` types (`EpochMs` and `EpochSec`).

### Patch Changes

- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
    - @seedcord/types@0.6.0

## 0.6.0-next.0

### Minor Changes

- 6e39348: Rename the cooldown store and land the gate leaf prep.

    - In `@seedcord/services`, `CooldownManager` is renamed to `RateLimiter` (`CooldownWindow` and `CooldownResult` become `RateLimitWindow` and `RateLimitResult`), and the `@seedcord/services/internal` subpath is removed. The throw-based `check()` API becomes `hit(key, { delay, limit? })`.
    - In `seedcord`, the store is reached at `core.rateLimiter`.
    - In `@seedcord/utils`, add `parseDuration`, the `ValidDuration` template type, and `toEpochSeconds`.
    - In `@seedcord/types`, add `Config.ownerIds` and the `Epoch` types (`EpochMs` and `EpochSec`).

### Patch Changes

- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
    - @seedcord/types@0.6.0-next.0

## 0.5.0

### Minor Changes

- 19bae0a: Add `routeLeavesOf` to `@seedcord/utils/internal`, the single walk that turns a slash command's JSON into its route-leaf keys. `@seedcord/cli` codegen now reads route leaves from there and depends on `discord-api-types` for its API enums and types instead of the full `discord.js` runtime.

### Patch Changes

- 19bae0a: - **BREAKING**: removed the public `buildSlashRoute` builder and the `CommandRouteString` type from `seedcord`. Slash routes are autocompletable typed literals from the generated registry now, so write them directly, e.g. `@SlashRoute('demo/setup')`.
    - Moved the route-string assembly to `@seedcord/utils/internal`, shared by the framework and `seedcord codegen` so a dispatched interaction and a generated registry key can never diverge. The interaction-to-route extraction is internal now.
    - Removed the unused `SeedcordErrorCode.UtilInvalidSlashRouteArgument`.
- 19bae0a: Fix `roundToDenomination`'s second example
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
    - @seedcord/types@0.5.0

## 0.4.0

### Minor Changes

- 0083461: seedcord instance brand
- 7e6d80e: most packages were exporting more than what they should be exporting and now have smaller imports as they should

### Patch Changes

- 225977a: export "version" variable with the actual semantic version of each package
- 0083461: new method to format a file path relative to the root directory
- 0083461: new fully typed hasKeys function that can check for the existence of a key and narrow the type based on the distributive union the key is coming from. works with nested keys too
- 5e4bf42: Reclassify singleton runtime dependencies as peer dependencies so a consumer resolves a single shared instance.
    - `seedcord`: `discord.js` and `reflect-metadata` are now required peer dependencies.
    - `@seedcord/plugins`: `mongoose`, `pg`, and `kysely` are optional peer dependencies (install only the backend your plugin uses); `reflect-metadata` and `seedcord` are required peers.
    - `@seedcord/types`: `discord.js` is now an optional peer dependency.
    - `@seedcord/services` and `@seedcord/utils`: `type-fest` moved to `devDependencies` (its types are inlined into the published declarations).

- 7308d36: `filterCirculars` now returns a serializable `{ '[unserializable]': reason }` placeholder when a value cannot be made JSON-safe, instead of returning the original value (which would re-throw in the caller's own `JSON.stringify`). `traverseDirectory` logs the directory path and cause on a read failure.
- fe77998: build pipeline migrated from `tsup` to `tsdown`. each published package now ships `dist/index.d.mts` + `dist/index.d.cts` (cjs is a one-line re-export stub) with a per-condition `exports` map. source-level public API unchanged. `@seedcord/tsup-config` renamed to `@seedcord/tsdown-config` and made private.
- fe77998: bump peer floor: typescript `^6.0.3`, node `^22.13`. shared `tsconfig/base.json` now sets `esModuleInterop: true` and `types: ["node"]` for ts6's removed implicit defaults. no public API changes.
- Updated dependencies [225977a]
- Updated dependencies [a34366b]
- Updated dependencies [5e4bf42]
- Updated dependencies [7308d36]
- Updated dependencies [fe77998]
- Updated dependencies [a34366b]
- Updated dependencies [fe77998]
- Updated dependencies [7e6d80e]
    - @seedcord/types@0.4.0

## 0.4.0-next.0

### Minor Changes

- 0083461: seedcord instance brand
- 7e6d80e: most packages were exporting more than what they should be exporting and now have smaller imports as they should

### Patch Changes

- 225977a: export "version" variable with the actual semantic version of each package
- 0083461: new method to format a file path relative to the root directory
- 0083461: new fully typed hasKeys function that can check for the existence of a key and narrow the type based on the distributive union the key is coming from. works with nested keys too
- 5e4bf42: Reclassify singleton runtime dependencies as peer dependencies so a consumer resolves a single shared instance.
    - `seedcord`: `discord.js` and `reflect-metadata` are now required peer dependencies.
    - `@seedcord/plugins`: `mongoose`, `pg`, and `kysely` are optional peer dependencies (install only the backend your plugin uses); `reflect-metadata` and `seedcord` are required peers.
    - `@seedcord/types`: `discord.js` is now an optional peer dependency.
    - `@seedcord/services` and `@seedcord/utils`: `type-fest` moved to `devDependencies` (its types are inlined into the published declarations).

- 7308d36: `filterCirculars` now returns a serializable `{ '[unserializable]': reason }` placeholder when a value cannot be made JSON-safe, instead of returning the original value (which would re-throw in the caller's own `JSON.stringify`). `traverseDirectory` logs the directory path and cause on a read failure.
- fe77998: build pipeline migrated from `tsup` to `tsdown`. each published package now ships `dist/index.d.mts` + `dist/index.d.cts` (cjs is a one-line re-export stub) with a per-condition `exports` map. source-level public API unchanged. `@seedcord/tsup-config` renamed to `@seedcord/tsdown-config` and made private.
- fe77998: bump peer floor: typescript `^6.0.3`, node `^22.13`. shared `tsconfig/base.json` now sets `esModuleInterop: true` and `types: ["node"]` for ts6's removed implicit defaults. no public API changes.
- Updated dependencies [225977a]
- Updated dependencies [a34366b]
- Updated dependencies [5e4bf42]
- Updated dependencies [7308d36]
- Updated dependencies [fe77998]
- Updated dependencies [a34366b]
- Updated dependencies [fe77998]
- Updated dependencies [7e6d80e]
    - @seedcord/types@0.4.0-next.0

## 0.3.8

### Patch Changes

- f8fbe70: bump general dependencies
- Updated dependencies [f354d30]
- Updated dependencies [f8fbe70]
- Updated dependencies [f8fbe70]
    - @seedcord/services@0.6.0
    - @seedcord/types@0.3.5

## 0.3.7

### Patch Changes

- 1d8986b: bump deps
- Updated dependencies [1d8986b]
- Updated dependencies [1d8986b]
    - @seedcord/types@0.3.4
    - @seedcord/services@0.5.1

## 0.3.6

### Patch Changes

- 6e067da: remove extra line(s) after tsdoc comments
- Updated dependencies [c0bf149]
    - @seedcord/services@0.5.0

## 0.3.5

### Patch Changes

- a1a90e6: custom seedcord errors and error codes
- Updated dependencies [a1a90e6]
- Updated dependencies [a1a90e6]
    - @seedcord/services@0.4.0

## 0.3.4

### Patch Changes

- bump deps (mainly djs to 14.24.2)
- Updated dependencies
    - @seedcord/services@0.3.3
    - @seedcord/types@0.3.3

## 0.3.3

### Patch Changes

- bump discord.js version to latest
- Updated dependencies
    - @seedcord/services@0.3.2
    - @seedcord/types@0.3.2

## 0.3.2

### Patch Changes

- d8b4c50: new util function `keepDefined`

## 0.3.1

### Patch Changes

- aaa59b7: bump deps, update djs to 14.24.0, make file_upload available in BuilderComponent
- Updated dependencies [aaa59b7]
    - @seedcord/services@0.3.1
    - @seedcord/types@0.3.1

## 0.3.0

### Minor Changes

- daf5dd9: new function called filterCirculars that cleans up objects with circular refs
  new ILogger interface defining logging methods for various log levels so packages that would normally have a circular dependency on services can just depend on types instead

### Patch Changes

- daf5dd9: improve type exports and tsdoc
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
    - @seedcord/services@0.3.0
    - @seedcord/types@0.3.0

## 0.2.3

### Patch Changes

- 8374f01: set up project-wide ci/cd
- 31d1a56: bump deps
- Updated dependencies [8374f01]
- Updated dependencies [31d1a56]
    - @seedcord/services@0.2.2
    - @seedcord/types@0.2.2

## 0.2.2

### Patch Changes

- versioning fix

## 0.2.1

### Patch Changes

- bump deps
- Updated dependencies
    - @seedcord/services@0.2.1
    - @seedcord/types@0.2.1

## 0.2.0

### Minor Changes

- update export settings (BREAKING)

### Patch Changes

- Updated dependencies
    - @seedcord/services@0.2.0
    - @seedcord/types@0.2.0

## 0.1.1

### Patch Changes

- 8a7591a: bump deps
- Updated dependencies [8a7591a]
    - @seedcord/services@0.1.1
    - @seedcord/types@0.1.4

## 0.1.0

### Minor Changes

- dabf324: move services to its own package
- f0650e8: new utils package

### Patch Changes

- Updated dependencies [dabf324]
    - @seedcord/services@0.1.0
