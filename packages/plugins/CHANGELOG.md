# @seedcord/plugins

## 0.7.2-next.1

### Patch Changes

- Updated dependencies [51006e2]
    - seedcord@0.15.0-next.1

## 0.7.2-next.0

### Patch Changes

- Updated dependencies [c3613bd]
- Updated dependencies [c3613bd]
    - seedcord@0.15.0-next.0
    - @seedcord/errors@0.2.1-next.0
    - @seedcord/services@0.8.2-next.0

## 0.7.1

### Patch Changes

- 043e2a1: Bump non-breaking runtime dependencies (envapt 6.0.2, discord-api-types 0.38.49, mongoose 9.7.1, ink 7.1.0, typescript-eslint 8.61.1, tailwindcss peer 4.3.1).
- Updated dependencies [043e2a1]
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
    - seedcord@0.14.0
    - @seedcord/services@0.8.1
    - @seedcord/utils@0.6.1
    - @seedcord/errors@0.2.0
    - @seedcord/types@0.7.0

## 0.7.1-next.0

### Patch Changes

- 043e2a1: Bump non-breaking runtime dependencies (envapt 6.0.2, discord-api-types 0.38.49, mongoose 9.7.1, ink 7.1.0, typescript-eslint 8.61.1, tailwindcss peer 4.3.1).
- Updated dependencies [043e2a1]
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
    - seedcord@0.14.0-next.0
    - @seedcord/services@0.8.1-next.0
    - @seedcord/utils@0.6.1-next.0
    - @seedcord/errors@0.2.0-next.0
    - @seedcord/types@0.7.0-next.0

## 0.7.0

### Minor Changes

- 6e39348: Replace the database error path with a general `Fault`.

    - `DatabaseError` is removed. `Fault` replaces it, a public `Notice` in `@seedcord/kit` whose `report` defaults true and whose constructor takes `{ cause }`. A service catch rethrows `new Fault({ cause: e })`.
    - `@WrapDatabaseError` and `throwDatabaseError` are removed.

    To migrate, replace `@WrapDatabaseError` and `throwDatabaseError` with a `try`/`catch` in the service method that rethrows `new Fault({ cause: e })` or write a decorator that does the same.

### Patch Changes

- 3c94f9e: fix mention of `SeedcordError`s in TSDoc
- 180b5a9: Upgrade the envapt runtime dependency to 6.0.0.
- Updated dependencies [3c94f9e]
- Updated dependencies [6e39348]
- Updated dependencies [3c94f9e]
- Updated dependencies [6e39348]
- Updated dependencies [180b5a9]
- Updated dependencies [6e39348]
- Updated dependencies [3c94f9e]
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
- Updated dependencies [74ea604]
- Updated dependencies [3c94f9e]
- Updated dependencies [3c94f9e]
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
- Updated dependencies [3c94f9e]
    - seedcord@0.13.0
    - @seedcord/services@0.8.0
    - @seedcord/types@0.6.0
    - @seedcord/errors@0.1.0
    - @seedcord/utils@0.6.0

## 0.7.0-next.0

### Minor Changes

- 6e39348: Replace the database error path with a general `Fault`.

    - `DatabaseError` is removed. `Fault` replaces it, a public `Notice` in `@seedcord/kit` whose `report` defaults true and whose constructor takes `{ cause }`. A service catch rethrows `new Fault({ cause: e })`.
    - `@WrapDatabaseError` and `throwDatabaseError` are removed.

    To migrate, replace `@WrapDatabaseError` and `throwDatabaseError` with a `try`/`catch` in the service method that rethrows `new Fault({ cause: e })` or write a decorator that does the same.

### Patch Changes

- 180b5a9: Upgrade the envapt runtime dependency to 6.0.0.
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
- Updated dependencies [180b5a9]
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
- Updated dependencies [74ea604]
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
    - @seedcord/services@0.8.0-next.0
    - seedcord@0.13.0-next.0
    - @seedcord/types@0.6.0-next.0
    - @seedcord/errors@0.1.0-next.0
    - @seedcord/utils@0.6.0-next.0

## 0.6.1

### Patch Changes

- 19bae0a: - Move the HMR types (`HmrEventType`, `HmrUpdateEvent`, `HmrAware`, and the framework/CLI event maps) from `@seedcord/cli` to `@seedcord/types/internal`. `seedcord` and `@seedcord/plugins` imported them only as types but listed `@seedcord/cli` in their runtime `dependencies`, which pulled the CLI and its Ink, React, Vite, and tsx tree into every install. Both now read the types from `@seedcord/types` and drop `@seedcord/cli` from their dependencies, so installing `seedcord` no longer installs the CLI.
    - **BREAKING** (`@seedcord/cli`): the HMR types are no longer re-exported from `@seedcord/cli` and the `@seedcord/cli/vite-hmr` subpath is removed. Import these types from `@seedcord/types` instead. The Vite `CustomEventMap` augmentation stays internal to the framework and the CLI.
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [b1c36ff]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
    - seedcord@0.12.0
    - @seedcord/types@0.5.0
    - @seedcord/utils@0.5.0
    - @seedcord/services@0.7.1

## 0.6.0

### Minor Changes

- d14a6b2: remove a handful of imports that don't need to be public
- 5e4bf42: Reclassify singleton runtime dependencies as peer dependencies so a consumer resolves a single shared instance.
    - `seedcord`: `discord.js` and `reflect-metadata` are now required peer dependencies.
    - `@seedcord/plugins`: `mongoose`, `pg`, and `kysely` are optional peer dependencies (install only the backend your plugin uses); `reflect-metadata` and `seedcord` are required peers.
    - `@seedcord/types`: `discord.js` is now an optional peer dependency.
    - `@seedcord/services` and `@seedcord/utils`: `type-fest` moved to `devDependencies` (its types are inlined into the published declarations).

- fe77998: bump `kysely` `^0.28.9` → `^0.29.2`. migration helpers now imported from `'kysely/migration'` (root re-exports deprecated). `MigrationTarget` switched from `typeof NO_MIGRATIONS` to the `NoMigrations` interface.
- 7308d36: Mongo and KyselyPg now rethrow a `SeedcordError` when teardown fails, so a failed disconnect is reported during coordinated shutdown instead of resolving silently. Accessing `db.services` before the plugin finishes initializing throws instead of returning an empty map. The Postgres on-connect listener is wrapped in a catch and detached on teardown.
- 7e6d80e: most packages were exporting more than what they should be exporting and now have smaller imports as they should

### Patch Changes

- 225977a: export "version" variable with the actual semantic version of each package
- 2c4201b: Bump envapt to v5. `seedcord` now reads `DISCORD_BOT_TOKEN` at the start of `Bot.init()`, so a missing or invalid token throws (via the existing converter) at the start of boot instead of partway through startup at login.
- d938005: bump deps
- 5a529d5: Fix the Mongo plugin crashing during shutdown when the initial connection never succeeded (e.g. a connect timeout). `disconnect()` now no-ops when no connection was established.
- fe77998: build pipeline migrated from `tsup` to `tsdown`. each published package now ships `dist/index.d.mts` + `dist/index.d.cts` (cjs is a one-line re-export stub) with a per-condition `exports` map. source-level public API unchanged. `@seedcord/tsup-config` renamed to `@seedcord/tsdown-config` and made private.
- a34366b: **BREAKING**: drop unused utility types from `@seedcord/types` (`AnyFunction`, `AnyAsyncFunction`, `PartialExcept`, `RequiredExcept`, `ReadonlyExcept`, `EnsureUndefinedForOptionalProps`, `StrictUnion`, `ReadonlyRecord`, `PartialRecord`). Migrate in-repo `TypedOmit` consumers to `Except` from `type-fest`.
- fe77998: bump peer floor: typescript `^6.0.3`, node `^22.13`. shared `tsconfig/base.json` now sets `esModuleInterop: true` and `types: ["node"]` for ts6's removed implicit defaults. no public API changes.
- Updated dependencies [225977a]
- Updated dependencies [2c4201b]
- Updated dependencies [2c4201b]
- Updated dependencies [b933d63]
- Updated dependencies [0083461]
- Updated dependencies [5a529d5]
- Updated dependencies [fe77998]
- Updated dependencies [80ec3d0]
- Updated dependencies [a34366b]
- Updated dependencies [0083461]
- Updated dependencies [12261b8]
- Updated dependencies [0083461]
- Updated dependencies [5ab61d1]
- Updated dependencies [d938005]
- Updated dependencies [5e4bf42]
- Updated dependencies [12261b8]
- Updated dependencies [cf9766d]
- Updated dependencies [7308d36]
- Updated dependencies [7308d36]
- Updated dependencies [7308d36]
- Updated dependencies [7308d36]
- Updated dependencies [7308d36]
- Updated dependencies [fe77998]
- Updated dependencies [a34366b]
- Updated dependencies [fe77998]
- Updated dependencies [7e6d80e]
    - seedcord@0.11.0
    - @seedcord/services@0.7.0
    - @seedcord/types@0.4.0
    - @seedcord/utils@0.4.0
    - @seedcord/cli@0.1.0

## 0.6.0-next.0

### Minor Changes

- d14a6b2: remove a handful of imports that don't need to be public
- 5e4bf42: Reclassify singleton runtime dependencies as peer dependencies so a consumer resolves a single shared instance.
    - `seedcord`: `discord.js` and `reflect-metadata` are now required peer dependencies.
    - `@seedcord/plugins`: `mongoose`, `pg`, and `kysely` are optional peer dependencies (install only the backend your plugin uses); `reflect-metadata` and `seedcord` are required peers.
    - `@seedcord/types`: `discord.js` is now an optional peer dependency.
    - `@seedcord/services` and `@seedcord/utils`: `type-fest` moved to `devDependencies` (its types are inlined into the published declarations).

- fe77998: bump `kysely` `^0.28.9` → `^0.29.2`. migration helpers now imported from `'kysely/migration'` (root re-exports deprecated). `MigrationTarget` switched from `typeof NO_MIGRATIONS` to the `NoMigrations` interface.
- 7308d36: Mongo and KyselyPg now rethrow a `SeedcordError` when teardown fails, so a failed disconnect is reported during coordinated shutdown instead of resolving silently. Accessing `db.services` before the plugin finishes initializing throws instead of returning an empty map. The Postgres on-connect listener is wrapped in a catch and detached on teardown.
- 7e6d80e: most packages were exporting more than what they should be exporting and now have smaller imports as they should

### Patch Changes

- 225977a: export "version" variable with the actual semantic version of each package
- 2c4201b: Bump envapt to v5. `seedcord` now reads `DISCORD_BOT_TOKEN` at the start of `Bot.init()`, so a missing or invalid token throws (via the existing converter) at the start of boot instead of partway through startup at login.
- d938005: bump deps
- 5a529d5: Fix the Mongo plugin crashing during shutdown when the initial connection never succeeded (e.g. a connect timeout). `disconnect()` now no-ops when no connection was established.
- fe77998: build pipeline migrated from `tsup` to `tsdown`. each published package now ships `dist/index.d.mts` + `dist/index.d.cts` (cjs is a one-line re-export stub) with a per-condition `exports` map. source-level public API unchanged. `@seedcord/tsup-config` renamed to `@seedcord/tsdown-config` and made private.
- a34366b: **BREAKING**: drop unused utility types from `@seedcord/types` (`AnyFunction`, `AnyAsyncFunction`, `PartialExcept`, `RequiredExcept`, `ReadonlyExcept`, `EnsureUndefinedForOptionalProps`, `StrictUnion`, `ReadonlyRecord`, `PartialRecord`). Migrate in-repo `TypedOmit` consumers to `Except` from `type-fest`.
- fe77998: bump peer floor: typescript `^6.0.3`, node `^22.13`. shared `tsconfig/base.json` now sets `esModuleInterop: true` and `types: ["node"]` for ts6's removed implicit defaults. no public API changes.
- Updated dependencies [225977a]
- Updated dependencies [2c4201b]
- Updated dependencies [2c4201b]
- Updated dependencies [b933d63]
- Updated dependencies [0083461]
- Updated dependencies [5a529d5]
- Updated dependencies [fe77998]
- Updated dependencies [80ec3d0]
- Updated dependencies [a34366b]
- Updated dependencies [0083461]
- Updated dependencies [12261b8]
- Updated dependencies [0083461]
- Updated dependencies [5ab61d1]
- Updated dependencies [d938005]
- Updated dependencies [5e4bf42]
- Updated dependencies [12261b8]
- Updated dependencies [cf9766d]
- Updated dependencies [7308d36]
- Updated dependencies [7308d36]
- Updated dependencies [7308d36]
- Updated dependencies [7308d36]
- Updated dependencies [7308d36]
- Updated dependencies [fe77998]
- Updated dependencies [a34366b]
- Updated dependencies [fe77998]
- Updated dependencies [7e6d80e]
    - seedcord@0.11.0-next.0
    - @seedcord/services@0.7.0-next.0
    - @seedcord/types@0.4.0-next.0
    - @seedcord/utils@0.4.0-next.0
    - @seedcord/cli@0.1.0-next.0

## 0.5.0

### Minor Changes

- f8fbe70: mongoose was bumped a major version

### Patch Changes

- f8fbe70: bump general dependencies
- Updated dependencies [f8fbe70]
- Updated dependencies [f8fbe70]
    - seedcord@0.10.6
    - @seedcord/types@0.3.5
    - @seedcord/utils@0.3.8

## 0.4.6

### Patch Changes

- 1d8986b: bump deps
- Updated dependencies [1d8986b]
- Updated dependencies [1d8986b]
    - @seedcord/types@0.3.4
    - @seedcord/utils@0.3.7
    - seedcord@0.10.5

## 0.4.5

### Patch Changes

- 6e067da: remove extra line(s) after tsdoc comments
- Updated dependencies [2049570]
- Updated dependencies [6e067da]
- Updated dependencies [6d12a7c]
- Updated dependencies [485670a]
- Updated dependencies [6fc2b8f]
- Updated dependencies [c0bf149]
    - seedcord@0.10.0
    - @seedcord/utils@0.3.6

## 0.4.4

### Patch Changes

- 5eb5d88: fix indentation inconsistency in logging
- Updated dependencies [c27ca87]
    - seedcord@0.9.0

## 0.4.3

### Patch Changes

- a1a90e6: custom seedcord errors and error codes
- a1a90e6: allow passing mongoose connection options and timeout ms for both mongo and kyselypg plugins
- Updated dependencies [a1a90e6]
- Updated dependencies [a1a90e6]
- Updated dependencies [a1a90e6]
- Updated dependencies [a1a90e6]
- Updated dependencies [a1a90e6]
- Updated dependencies [a1a90e6]
- Updated dependencies [a1a90e6]
- Updated dependencies [a1a90e6]
- Updated dependencies [a1a90e6]
- Updated dependencies [a1a90e6]
- Updated dependencies [a1a90e6]
    - seedcord@0.8.0
    - @seedcord/utils@0.3.5

## 0.4.2

### Patch Changes

- Updated dependencies
    - seedcord@0.7.0

## 0.4.1

### Patch Changes

- allow a way to pass in other kysely options via plugin

## 0.4.0

### Minor Changes

- d8b4c50: **BREAKING:** Mongo plugin's exported entities were renamed. And a Kysely-Postgres plugin was added.

### Patch Changes

- Updated dependencies [d8b4c50]
- Updated dependencies [615eac2]
- Updated dependencies [e48b386]
    - @seedcord/utils@0.3.2
    - seedcord@0.6.0

## 0.3.3

### Patch Changes

- daf5dd9: improve type exports and tsdoc
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
- Updated dependencies [0a74a7b]
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
    - seedcord@0.5.0
    - @seedcord/types@0.3.0

## 0.3.2

### Patch Changes

- 8374f01: set up project-wide ci/cd
- 31d1a56: bump deps
- Updated dependencies [8374f01]
- Updated dependencies [31d1a56]
- Updated dependencies [5625037]
    - seedcord@0.4.3
    - @seedcord/types@0.2.2

## 0.3.1

### Patch Changes

- bump deps
- Updated dependencies
    - seedcord@0.4.1
    - @seedcord/types@0.2.1

## 0.3.0

### Minor Changes

- update export settings (BREAKING)

### Patch Changes

- Updated dependencies
    - seedcord@0.4.0
    - @seedcord/types@0.2.0

## 0.2.2

### Patch Changes

- 8a7591a: bump deps
- Updated dependencies [e47636a]
- Updated dependencies [8a7591a]
- Updated dependencies [2ada52b]
- Updated dependencies [4585b73]
- Updated dependencies [ad2e3c3]
- Updated dependencies [4611ac7]
    - seedcord@0.3.0
    - @seedcord/types@0.1.4

## 0.2.1

### Patch Changes

- move IDocument type export to the plugins package
- Updated dependencies
    - seedcord@0.2.1
    - @seedcord/types@0.1.3

## 0.2.0

### Minor Changes

- dabf324: move services to its own package

### Patch Changes

- Updated dependencies [dabf324]
- Updated dependencies [0258dd5]
- Updated dependencies [0ed832b]
    - seedcord@0.2.0

## 0.1.1

### Patch Changes

- 72137e9: eslint issue fixes
- 5ac7d83: cleanup package files and bump deps
- Updated dependencies [72137e9]
- Updated dependencies [c188583]
- Updated dependencies [5ac7d83]
    - seedcord@0.1.1
    - @seedcord/types@0.1.2

## 0.1.0

### Minor Changes

- 2a141ec: Created a new package called @seedcord/plugins and moved mongo there

### Patch Changes

- Updated dependencies [d9e2a50]
- Updated dependencies [48a8c9b]
- Updated dependencies [8c4ce41]
- Updated dependencies [2a141ec]
- Updated dependencies [d9e2a50]
- Updated dependencies [48a8c9b]
- Updated dependencies [48a8c9b]
- Updated dependencies [48a8c9b]
    - @seedcord/types@0.1.0
    - seedcord@0.1.0

## 0.1.0-alpha.2

### Minor Changes

- 2a141ec: Created a new package called @seedcord/plugins and moved mongo there

### Patch Changes

- Updated dependencies [8c4ce41]
- Updated dependencies [2a141ec]
    - seedcord@0.1.0-alpha.3
    - @seedcord/types@0.1.0-alpha.2
