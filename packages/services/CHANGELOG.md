# @seedcord/services

## 0.7.0

### Minor Changes

- 12261b8: new custom winston transport that forwards logs to custom sinks that users can implement
- 12261b8: better Logger with new utils and better file transports + lots of config options
- 7308d36: CoordinatedShutdown and CoordinatedStartup now extend StrictEventEmitter, so `on`/`off` are typed per event and the `CoordinatedShutdownEventKey` / `CoordinatedStartupEventKey` types are removed. The static `Logger.Error/Info/Warn/Debug/Silly` helpers are removed; use a `Logger` instance. `StrictEventEmitter.waitFor` rejects with a `SeedcordError` instead of a bare `Error`. Also fixes a HealthCheck shutdown hang, a logger-transport leak on reconfigure, and drops the unused `discord.js` dependency.
- 7308d36: Move the non-secret startup settings from environment variables into the runtime config. `botColor`, `shutdownEnabled`, `healthCheck` (`port`/`path`/`host`), and `notifications.developerUsername` are now set through `new Seedcord({ ... })` instead of `DEFAULT_BOT_COLOR`, `SHUTDOWN_IS_ENABLED`, `HEALTH_CHECK_PORT`/`PATH`/`HOST`, and `DEVELOPER_DISCORD_USERNAME`. Secrets (bot token, exception webhook URL, Mongo URI) stay in the environment.

    The bot color is applied when a component is used rather than when it is constructed, so a configured color reaches every component regardless of construction order, and any `ColorResolvable` (hex string, number, named color, or RGB tuple) works. The default health-check port is 6967.

    **Breaking:** the framework no longer reads those four environment variables; move their values into the config object passed to `new Seedcord(...)`. The internal `hexToNumber` helper and its `UtilHexInputType` / `UtilHexInvalid` error codes are removed.

- 7e6d80e: most packages were exporting more than what they should be exporting and now have smaller imports as they should

### Patch Changes

- 225977a: export "version" variable with the actual semantic version of each package
- 2c4201b: Bump envapt to v5. `seedcord` now reads `DISCORD_BOT_TOKEN` at the start of `Bot.init()`, so a missing or invalid token throws (via the existing converter) at the start of boot instead of partway through startup at login.
- b933d63: fix inconsistent env var name in param tsdoc
- 80ec3d0: **BREAKING**: seedcord now uses a config.ts file for dev server configuration. new cli as well.
- 5ab61d1: better generics and type narrowing for SeedcordErrors and the isSeedcordError type-guard (and tests for these changes)
- d938005: bump deps
- 5e4bf42: Reclassify singleton runtime dependencies as peer dependencies so a consumer resolves a single shared instance.
    - `seedcord`: `discord.js` and `reflect-metadata` are now required peer dependencies.
    - `@seedcord/plugins`: `mongoose`, `pg`, and `kysely` are optional peer dependencies (install only the backend your plugin uses); `reflect-metadata` and `seedcord` are required peers.
    - `@seedcord/types`: `discord.js` is now an optional peer dependency.
    - `@seedcord/services` and `@seedcord/utils`: `type-fest` moved to `devDependencies` (its types are inlined into the published declarations).

- fe77998: build pipeline migrated from `tsup` to `tsdown`. each published package now ships `dist/index.d.mts` + `dist/index.d.cts` (cjs is a one-line re-export stub) with a per-condition `exports` map. source-level public API unchanged. `@seedcord/tsup-config` renamed to `@seedcord/tsdown-config` and made private.
- fe77998: bump peer floor: typescript `^6.0.3`, node `^22.13`. shared `tsconfig/base.json` now sets `esModuleInterop: true` and `types: ["node"]` for ts6's removed implicit defaults. no public API changes.
- Updated dependencies [225977a]
- Updated dependencies [0083461]
- Updated dependencies [a34366b]
- Updated dependencies [0083461]
- Updated dependencies [0083461]
- Updated dependencies [5e4bf42]
- Updated dependencies [7308d36]
- Updated dependencies [7308d36]
- Updated dependencies [fe77998]
- Updated dependencies [a34366b]
- Updated dependencies [fe77998]
- Updated dependencies [7e6d80e]
    - @seedcord/types@0.4.0
    - @seedcord/utils@0.4.0

## 0.7.0-next.0

### Minor Changes

- 12261b8: new custom winston transport that forwards logs to custom sinks that users can implement
- 12261b8: better Logger with new utils and better file transports + lots of config options
- 7308d36: CoordinatedShutdown and CoordinatedStartup now extend StrictEventEmitter, so `on`/`off` are typed per event and the `CoordinatedShutdownEventKey` / `CoordinatedStartupEventKey` types are removed. The static `Logger.Error/Info/Warn/Debug/Silly` helpers are removed; use a `Logger` instance. `StrictEventEmitter.waitFor` rejects with a `SeedcordError` instead of a bare `Error`. Also fixes a HealthCheck shutdown hang, a logger-transport leak on reconfigure, and drops the unused `discord.js` dependency.
- 7308d36: Move the non-secret startup settings from environment variables into the runtime config. `botColor`, `shutdownEnabled`, `healthCheck` (`port`/`path`/`host`), and `notifications.developerUsername` are now set through `new Seedcord({ ... })` instead of `DEFAULT_BOT_COLOR`, `SHUTDOWN_IS_ENABLED`, `HEALTH_CHECK_PORT`/`PATH`/`HOST`, and `DEVELOPER_DISCORD_USERNAME`. Secrets (bot token, exception webhook URL, Mongo URI) stay in the environment.

    The bot color is applied when a component is used rather than when it is constructed, so a configured color reaches every component regardless of construction order, and any `ColorResolvable` (hex string, number, named color, or RGB tuple) works. The default health-check port is 6967.

    **Breaking:** the framework no longer reads those four environment variables; move their values into the config object passed to `new Seedcord(...)`. The internal `hexToNumber` helper and its `UtilHexInputType` / `UtilHexInvalid` error codes are removed.

- 7e6d80e: most packages were exporting more than what they should be exporting and now have smaller imports as they should

### Patch Changes

- 225977a: export "version" variable with the actual semantic version of each package
- 2c4201b: Bump envapt to v5. `seedcord` now reads `DISCORD_BOT_TOKEN` at the start of `Bot.init()`, so a missing or invalid token throws (via the existing converter) at the start of boot instead of partway through startup at login.
- b933d63: fix inconsistent env var name in param tsdoc
- 80ec3d0: **BREAKING**: seedcord now uses a config.ts file for dev server configuration. new cli as well.
- 5ab61d1: better generics and type narrowing for SeedcordErrors and the isSeedcordError type-guard (and tests for these changes)
- d938005: bump deps
- 5e4bf42: Reclassify singleton runtime dependencies as peer dependencies so a consumer resolves a single shared instance.
    - `seedcord`: `discord.js` and `reflect-metadata` are now required peer dependencies.
    - `@seedcord/plugins`: `mongoose`, `pg`, and `kysely` are optional peer dependencies (install only the backend your plugin uses); `reflect-metadata` and `seedcord` are required peers.
    - `@seedcord/types`: `discord.js` is now an optional peer dependency.
    - `@seedcord/services` and `@seedcord/utils`: `type-fest` moved to `devDependencies` (its types are inlined into the published declarations).

- fe77998: build pipeline migrated from `tsup` to `tsdown`. each published package now ships `dist/index.d.mts` + `dist/index.d.cts` (cjs is a one-line re-export stub) with a per-condition `exports` map. source-level public API unchanged. `@seedcord/tsup-config` renamed to `@seedcord/tsdown-config` and made private.
- fe77998: bump peer floor: typescript `^6.0.3`, node `^22.13`. shared `tsconfig/base.json` now sets `esModuleInterop: true` and `types: ["node"]` for ts6's removed implicit defaults. no public API changes.
- Updated dependencies [225977a]
- Updated dependencies [0083461]
- Updated dependencies [a34366b]
- Updated dependencies [0083461]
- Updated dependencies [0083461]
- Updated dependencies [5e4bf42]
- Updated dependencies [7308d36]
- Updated dependencies [7308d36]
- Updated dependencies [fe77998]
- Updated dependencies [a34366b]
- Updated dependencies [fe77998]
- Updated dependencies [7e6d80e]
    - @seedcord/types@0.4.0-next.0
    - @seedcord/utils@0.4.0-next.0

## 0.6.0

### Minor Changes

- f354d30: coordinated shutdown will now be enabled by default. set the env var to false to turn it off

### Patch Changes

- f8fbe70: discord.js was bumped a patch version
- f8fbe70: bump general dependencies
- Updated dependencies [f8fbe70]
    - @seedcord/types@0.3.5

## 0.5.1

### Patch Changes

- 1d8986b: bump deps
- 1d8986b: bump djs to 14.25.0
- Updated dependencies [1d8986b]
    - @seedcord/types@0.3.4

## 0.5.0

### Minor Changes

- c0bf149: **BREAKING**: replaced the checkPermissions param-based calls with an options-style api and overloads that now require passing the target (role or member) and context (guild or channel) explicitly; added inverse and custom error support so usage signatures have changed and previous direct calls will need updating

## 0.4.0

### Minor Changes

- a1a90e6: new StrictEventEmitter class. Plugin extends this now so strongly typed EventEmitter methods are available on all plugins. To use, pass a map of events as the generic to Plugin<here>.

### Patch Changes

- a1a90e6: custom seedcord errors and error codes

## 0.3.3

### Patch Changes

- bump deps (mainly djs to 14.24.2)
- Updated dependencies
    - @seedcord/types@0.3.3

## 0.3.2

### Patch Changes

- bump discord.js version to latest
- Updated dependencies
    - @seedcord/types@0.3.2

## 0.3.1

### Patch Changes

- aaa59b7: bump deps, update djs to 14.24.0, make file_upload available in BuilderComponent
- Updated dependencies [aaa59b7]
    - @seedcord/types@0.3.1

## 0.3.0

### Minor Changes

- daf5dd9: **BREAKING:** BaseService was renamed to MongoService
- daf5dd9: **BREAKING:** some utility types were renamed and some were moved to different packages

### Patch Changes

- daf5dd9: improve type exports and tsdoc
- daf5dd9: new function called filterCirculars that cleans up objects with circular refs
  new ILogger interface defining logging methods for various log levels so packages that would normally have a circular dependency on services can just depend on types instead
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
- Updated dependencies [daf5dd9]
    - @seedcord/types@0.3.0

## 0.2.2

### Patch Changes

- 8374f01: set up project-wide ci/cd
- 31d1a56: bump deps
- Updated dependencies [8374f01]
- Updated dependencies [31d1a56]
    - @seedcord/types@0.2.2

## 0.2.1

### Patch Changes

- bump deps
- Updated dependencies
    - @seedcord/types@0.2.1

## 0.2.0

### Minor Changes

- update export settings (BREAKING)

### Patch Changes

- Updated dependencies
    - @seedcord/types@0.2.0

## 0.1.1

### Patch Changes

- 8a7591a: bump deps
- Updated dependencies [8a7591a]
    - @seedcord/types@0.1.4

## 0.1.0

### Minor Changes

- dabf324: move services to its own package
