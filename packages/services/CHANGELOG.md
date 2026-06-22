# @seedcord/services

## 0.8.1-next.0

### Patch Changes

- 043e2a1: Bump non-breaking runtime dependencies (envapt 6.0.2, discord-api-types 0.38.49, mongoose 9.7.1, ink 7.1.0, typescript-eslint 8.61.1, tailwindcss peer 4.3.1).
- Updated dependencies [043e2a1]
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
- Updated dependencies [7121c18]
    - @seedcord/utils@0.6.1-next.0
    - @seedcord/errors@0.2.0-next.0
    - @seedcord/types@0.7.0-next.0

## 0.8.0

### Minor Changes

- 6e39348: Rename the cooldown store and land the gate leaf prep.

    - In `@seedcord/services`, `CooldownManager` is renamed to `RateLimiter` (`CooldownWindow` and `CooldownResult` become `RateLimitWindow` and `RateLimitResult`), and the `@seedcord/services/internal` subpath is removed. The throw-based `check()` API becomes `hit(key, { delay, limit? })`.
    - In `seedcord`, the store is reached at `core.rateLimiter`.
    - In `@seedcord/utils`, add `parseDuration`, the `ValidDuration` template type, and `toEpochSeconds`.
    - In `@seedcord/types`, add `Config.ownerIds` and the `Epoch` types (`EpochMs` and `EpochSec`).

### Patch Changes

- 6e39348: remove vestigial caching in Logger. forgot to remove them after removing static methods.
- 180b5a9: Upgrade the envapt runtime dependency to 6.0.0.
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
    - @seedcord/types@0.6.0
    - @seedcord/errors@0.1.0
    - @seedcord/utils@0.6.0

## 0.8.0-next.0

### Minor Changes

- 6e39348: Rename the cooldown store and land the gate leaf prep.

    - In `@seedcord/services`, `CooldownManager` is renamed to `RateLimiter` (`CooldownWindow` and `CooldownResult` become `RateLimitWindow` and `RateLimitResult`), and the `@seedcord/services/internal` subpath is removed. The throw-based `check()` API becomes `hit(key, { delay, limit? })`.
    - In `seedcord`, the store is reached at `core.rateLimiter`.
    - In `@seedcord/utils`, add `parseDuration`, the `ValidDuration` template type, and `toEpochSeconds`.
    - In `@seedcord/types`, add `Config.ownerIds` and the `Epoch` types (`EpochMs` and `EpochSec`).

### Patch Changes

- 6e39348: remove vestigial caching in Logger. forgot to remove them after removing static methods.
- 180b5a9: Upgrade the envapt runtime dependency to 6.0.0.
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
- Updated dependencies [6e39348]
    - @seedcord/types@0.6.0-next.0
    - @seedcord/errors@0.1.0-next.0
    - @seedcord/utils@0.6.0-next.0

## 0.7.1

### Patch Changes

- 19bae0a: - **BREAKING**: removed the public `buildSlashRoute` builder and the `CommandRouteString` type from `seedcord`. Slash routes are autocompletable typed literals from the generated registry now, so write them directly, e.g. `@SlashRoute('demo/setup')`.
    - Moved the route-string assembly to `@seedcord/utils/internal`, shared by the framework and `seedcord codegen` so a dispatched interaction and a generated registry key can never diverge. The interaction-to-route extraction is internal now.
    - Removed the unused `SeedcordErrorCode.UtilInvalidSlashRouteArgument`.
- 19bae0a: - Add a typed autocomplete handler. Extend `AutocompleteHandler<'route'>`, branch on the focused field with `this.match`, and each arm receives the focused partial value plus a `respond` pinned to that field's choice type, so a mismatched choice value is a compile error and a missing field arm is a compile error. The focused field set comes from the options that called `setAutocomplete(true)`, which `seedcord codegen` records in the registry.
    - Read already-entered sibling options through `this.options`, restricted to the kinds Discord resolves during autocomplete (string, integer, number, boolean) and every read returns `T | null` since a sibling is partial while the user is still typing. The focused value is always a string, even for an integer or number option, because Discord delivers the partial input unparsed. One handler can serve several commands with `@AutocompleteRoute('search', 'find')`, and `this.route` reports which one fired.
    - **BREAKING**: `AutocompleteHandler` is now generic over its command route(s) and `@AutocompleteRoute` takes command routes only, replacing the previous per-field `(commandRoutes, focusedFields)` registration that registered one handler per field. Branch on the focused field with `this.match` instead.
- 19bae0a: - Add end-to-end typed context menus. Author a context-menu command as a plain discord.js `ContextMenuCommandBuilder`, run `seedcord codegen` to emit committed `UserContextMenuRegistry` and `MessageContextMenuRegistry` augmentations, then handlers extend `ContextMenuHandler<ApplicationCommandType.User>` or `ContextMenuHandler<ApplicationCommandType.Message>` and read `this.target`, a `User` for a user menu or a `Message` for a message menu, plus `this.targetMember` on user menus. `@ContextMenuRoute(ApplicationCommandType.Message, 'Report Message')` checks the name against its kind's registry and is cross-checked against the handler generic both directions, so a typo or a kind mismatch is a compile error. The two registries stay separate because Discord allows a user command and a message command to share a name.
    - Warn at boot for any registered context-menu command with no handler, parallel to the slash route guard.
    - **BREAKING**: `@ContextMenuRoute` now takes `(ApplicationCommandType.User | ApplicationCommandType.Message, ...names)` rather than `('user' | 'message', string | string[])`, and a context-menu handler extends the new `ContextMenuHandler` base rather than `InteractionHandler`.
    - **BREAKING**: `seedcord codegen` writes `command-registry.gen.ts` rather than `slash-registry.gen.ts`, since one file now holds the slash and context-menu registries. Delete the old file and re-run `seedcord codegen`.
- 19bae0a: - Add a typed customId system for buttons, modals, and select menus. Define a customId once with `new CustomId('approve').snowflake('userId').oneOf('action', ['approve', 'deny'])`, encode it onto a component, and read the decoded values back in the handler through `this.params` (single route) or `this.match` (several routes), fully typed end to end. Component handlers extend the new `ButtonHandler`, `ModalHandler`, and `SelectHandler` bases.
    - Components route by a stable prefix, so a customId minted before its shape changed still reaches its handler and replies with a `StaleCustomId` message instead of failing silently.
    - **BREAKING**: `@ButtonRoute`, `@ModalRoute`, and `@SelectMenuRoute` now take `CustomId` definitions instead of string prefixes. Passing a different definition to the decorator than the one in the handler's generic is a compile error.
    - **BREAKING**: removed `getArgs()` and `getArg()` from handlers, along with the `-` delimited positional customId arguments. Read decoded values from `this.params` or `this.match` instead.
- 19bae0a: - Type event middleware by the events it runs for. A middleware that lists a single event in `{ events }` and its `EventMiddleware` generic reads `this.event` as that event's payload tuple, fully typed. A middleware that spans several events, or omits `{ events }` to run for every event, reads `this.eventName` to know which event fired, and `this.event` is `never`, because a middleware runs the same for every event it handles and so has no `match`. The controller threads the fired event name into the middleware. The `{ events }` list and the `EventMiddleware` generic are cross-checked, so listing an event in one but not the other is a compile error in both directions.
    - **BREAKING**: on a middleware registered for two or more events, or a catchall with no `{ events }`, `this.event` is now `never`. Read `this.eventName` and do work that does not depend on the payload shape, or write one middleware per event to read a typed payload. Single-event middleware is unaffected.
- 19bae0a: - Add multi-event support to `EventHandler`. A handler registered for several events with `@RegisterEvent([Events.MessageCreate], [Events.MessageUpdate])` branches with `this.match`, keyed by event name, and each arm receives that event's payload as named parameters carrying the discord.js tuple labels, for example `messageUpdate: (oldMessage, newMessage) => ...`, fully typed, so a missing arm is a compile error and a param past the event's arity is a compile error. A single-event handler reads `this.event` as its payload tuple, unchanged. The controller threads the fired event name into the handler, so the branch is the real event that fired rather than a guess from the payload shape.
    - **BREAKING**: on a handler registered for two or more events, `this.event` is now `never`, so the previous hand-narrowing of the payload union no longer compiles. Branch with `this.match` instead. Single-event handlers are unaffected.
- 19bae0a: - Add end-to-end typed slash commands. Author commands as plain discord.js builders, run `seedcord codegen` to read each command's `toJSON()` and emit a committed `declare module 'seedcord'` registry, then handlers extend the new `SlashHandler<'route'>` base and read `this.options`. Options are typed off the registry, a required option drops the null, choices narrow to their literal union, and only the getters for kinds a command actually uses appear. A handler bound to several commands branches with `this.match`, each arm typed for its own route.
    - `seedcord codegen --check` regenerates in memory and exits non-zero, naming the fix, when the committed registry is stale.
    - `@SlashRoute` is cross-checked against the handler generic, so `@SlashRoute('ban', 'kick')` on `SlashHandler<'ban' | 'kick'>` compiles while listing fewer or more routes than the handler declares is a compile error. Route strings are autocompleted off the generated registry.
    - **BREAKING**: slash handlers now extend `SlashHandler<'route'>` instead of `InteractionHandler<ChatInputCommandInteraction>`, and `@SlashRoute` requires a `SlashHandler`. Read options through `this.options` rather than the raw `this.event.options`.
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
- Updated dependencies [19bae0a]
    - @seedcord/types@0.5.0
    - @seedcord/utils@0.5.0

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
