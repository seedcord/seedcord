# @seedcord/types

## 0.9.1

### Patch Changes

- 1d2f1e3: Updated TSDoc reference generation.

## 0.9.1-next.0

### Patch Changes

- 1d2f1e3: Updated TSDoc reference generation.

## 0.9.0

### Minor Changes

- e11cbb3: **BREAKING:** `paint` now comes from `@seedcord/errors`, and `ILogSink`, `LogLevel`, `LogRecord`, `LogSinkHandle`, `LoggerConfig`, `LoggerChannelId`, and `FrameworkChannel` now come from `@seedcord/types`. `@seedcord/logger` no longer re-exports them. Both transports still expose every one of these.

### Patch Changes

- f39cde0: These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build.
- a259cdc: Use `#` instead of `@` for tsconfig path aliases.
- a8d7b5f: Rewrote package descriptions for all packages. Also added keywords.
- 660a94d: Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link.
- c50ad6c: Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all.

## 0.8.2

### Patch Changes

- 272b729: Update comments

## 0.8.1

### Patch Changes

- c567fea: Bump deps.
- 0642de5: `seedcord dev` exposes an http bot's interactions server through the `tunnel` dev config field. `true` opens a cloudflared quick tunnel and writes the interactions endpoint on every run. An https URL is one you already serve, and the CLI checks it reaches the bot, writes the endpoint when the stored value differs, then leaves it in place.
- c567fea: Set all packages' node floor to LTS.

## 0.8.0

### Minor Changes

- 789f17a: **BREAKING:** Node 24.3 or newer is required.
- 789f17a: `Config` gains `logger`, `store`, and `runtime`.

    **BREAKING:** `Config` drops `shutdownEnabled` and `healthCheck`, which each transport config now declares. `clientOptions` and `events` move to `GatewayBotConfig` in `@seedcord/gateway`.

- 789f17a: **BREAKING:** `ILogger` levels are `error`, `warn`, `info`, `debug`, and `trace`. `http`, `verbose`, and `silly` are gone.
- 789f17a: **BREAKING:** `@seedcord/types` no longer depends on discord.js. `ReplyResponse` and its parts are structural types over `discord-api-types`.

    **BREAKING:** `ReplyFile` is now `{ data: Uint8Array; name: string; description?; title? }`, which sends on either transport. the Gateway transport does still accept Djs' `AttachmentBuilder` though.

### Patch Changes

- 789f17a: Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`.

## 0.7.2-next.0

### Patch Changes

- 8635423: Decouple HMR from vite's `import.meta.hot` behind a typed `DevChannel`. Drop the `HmrModuleHandler` `name` option where you construct the handler, it was only an internal cache key and is no longer accepted.

## 0.7.1

### Patch Changes

- 78377fa: mark some exports as internal so they don't show up in the docs
- 78377fa: update LICENSE copyright year

## 0.7.0

### Minor Changes

- 7121c18: Type configured emojis precisely. `seedcord codegen` now writes an `EmojiMap` block that tags each key `'application'` or `'guild'`, and `Emojis.X` (and `bot.emojis.X`) resolves to the exact `ApplicationEmoji` or `GuildEmoji` rather than the union. Configure `config.bot.emojis` with the new `EmojiConfig` type and run `seedcord codegen`, you no longer hand-write the `EmojiMap` augmentation. The generated file is renamed from `command-registry.gen.ts` to `seedcord-gen.d.ts`, so delete the old file and re-run `seedcord codegen`.

## 0.6.0

### Minor Changes

- 6e39348: Move error handling from the per-method `@Catchable`/`@EventCatchable` decorators to one controller boundary that catches every throw across the interaction and event lifecycle (middleware, construct, gate phase, execute).

    - A `Notice` renders through `ReplySender`, a reporting `Notice` and a raw error publish to `handledException`/`unknownException`, and a `Silence` stops silently. Events are report-only and never auto-reply.
    - Removes `@Catchable`, `@EventCatchable`, and the `setBreak`/`setErrored`/`shouldBreak`/`hasErrors` handler flags. Throw a `Silence` to stop a handler without a reply.
    - The default handled-exception subscriber requires the `HANDLED_EXCEPTION_WEBHOOK_URL` env var at boot.
    - `FaultSource` gains an `event` arm. Duplicate faults are throttled to one report per minute per route.
    - `ignoreCustomIds` is now `CustomIdMatcher[]`, matched against the raw customId. Adds `errors.ignoreApiCodes` and `errors.ignoreEventApiCodes` (both empty by default, so a handler's own discord.js api error reports).

- 6e39348: Rework the error model around one base class and one reply shape.

    - `CustomError` is renamed to `Notice`, the abstract base you extend and throw. The `emit` field is renamed to `report`. The `response` field (a `readonly EmbedBuilder`) is replaced by a `render(ctx)` method that returns a `ReplyResponse`.
    - `ReplyResponse` is a new public type in `@seedcord/types`, a v2 reply shape of `components` plus optional `allowedMentions` and `files`. Discord's components-v2 flag forbids `content`, `embeds`, `stickers`, and `poll`. `RenderContext` is the new render argument.

    To migrate, rename `CustomError` to `Notice`, rename `emit` to `report`, and replace the `response` field with a `render(ctx)` method returning a `ReplyResponse`.

- 6e39348: Rename the cooldown store and land the gate leaf prep.

    - In `@seedcord/services`, `CooldownManager` is renamed to `RateLimiter` (`CooldownWindow` and `CooldownResult` become `RateLimitWindow` and `RateLimitResult`), and the `@seedcord/services/internal` subpath is removed. The throw-based `check()` API becomes `hit(key, { delay, limit? })`.
    - In `seedcord`, the store is reached at `core.rateLimiter`.
    - In `@seedcord/utils`, add `parseDuration`, the `ValidDuration` template type, and `toEpochSeconds`.
    - In `@seedcord/types`, add `Config.ownerIds` and the `Epoch` types (`EpochMs` and `EpochSec`).

## 0.5.0

### Minor Changes

- 19bae0a: - Add end-to-end typed context menus. Author a context-menu command as a plain discord.js `ContextMenuCommandBuilder`, run `seedcord codegen` to emit committed `UserContextMenuRegistry` and `MessageContextMenuRegistry` augmentations, then handlers extend `ContextMenuHandler<ApplicationCommandType.User>` or `ContextMenuHandler<ApplicationCommandType.Message>` and read `this.target`, a `User` for a user menu or a `Message` for a message menu, plus `this.targetMember` on user menus. `@ContextMenuRoute(ApplicationCommandType.Message, 'Report Message')` checks the name against its kind's registry and is cross-checked against the handler generic both directions, so a typo or a kind mismatch is a compile error. The two registries stay separate because Discord allows a user command and a message command to share a name.
    - Warn at boot for any registered context-menu command with no handler, parallel to the slash route guard.
    - **BREAKING**: `@ContextMenuRoute` now takes `(ApplicationCommandType.User | ApplicationCommandType.Message, ...names)` rather than `('user' | 'message', string | string[])`, and a context-menu handler extends the new `ContextMenuHandler` base rather than `InteractionHandler`.
    - **BREAKING**: `seedcord codegen` writes `command-registry.gen.ts` rather than `slash-registry.gen.ts`, since one file now holds the slash and context-menu registries. Delete the old file and re-run `seedcord codegen`.
- 19bae0a: - Add end-to-end typed slash commands. Author commands as plain discord.js builders, run `seedcord codegen` to read each command's `toJSON()` and emit a committed `declare module 'seedcord'` registry, then handlers extend the new `SlashHandler<'route'>` base and read `this.options`. Options are typed off the registry, a required option drops the null, choices narrow to their literal union, and only the getters for kinds a command actually uses appear. A handler bound to several commands branches with `this.match`, each arm typed for its own route.
    - `seedcord codegen --check` regenerates in memory and exits non-zero, naming the fix, when the committed registry is stale.
    - `@SlashRoute` is cross-checked against the handler generic, so `@SlashRoute('ban', 'kick')` on `SlashHandler<'ban' | 'kick'>` compiles while listing fewer or more routes than the handler declares is a compile error. Route strings are autocompleted off the generated registry.
    - **BREAKING**: slash handlers now extend `SlashHandler<'route'>` instead of `InteractionHandler<ChatInputCommandInteraction>`, and `@SlashRoute` requires a `SlashHandler`. Read options through `this.options` rather than the raw `this.event.options`.

### Patch Changes

- 19bae0a: - Move the HMR types (`HmrEventType`, `HmrUpdateEvent`, `HmrAware`, and the framework/CLI event maps) from `@seedcord/cli` to `@seedcord/types/internal`. `seedcord` and `@seedcord/plugins` imported them only as types but listed `@seedcord/cli` in their runtime `dependencies`, which pulled the CLI and its Ink, React, Vite, and tsx tree into every install. Both now read the types from `@seedcord/types` and drop `@seedcord/cli` from their dependencies, so installing `seedcord` no longer installs the CLI.
    - **BREAKING** (`@seedcord/cli`): the HMR types are no longer re-exported from `@seedcord/cli` and the `@seedcord/cli/vite-hmr` subpath is removed. Import these types from `@seedcord/types` instead. The Vite `CustomEventMap` augmentation stays internal to the framework and the CLI.
- 19bae0a: - Add a typed autocomplete handler. Extend `AutocompleteHandler<'route'>`, branch on the focused field with `this.match`, and each arm receives the focused partial value plus a `respond` pinned to that field's choice type, so a mismatched choice value is a compile error and a missing field arm is a compile error. The focused field set comes from the options that called `setAutocomplete(true)`, which `seedcord codegen` records in the registry.
    - Read already-entered sibling options through `this.options`, restricted to the kinds Discord resolves during autocomplete (string, integer, number, boolean) and every read returns `T | null` since a sibling is partial while the user is still typing. The focused value is always a string, even for an integer or number option, because Discord delivers the partial input unparsed. One handler can serve several commands with `@AutocompleteRoute('search', 'find')`, and `this.route` reports which one fired.
    - **BREAKING**: `AutocompleteHandler` is now generic over its command route(s) and `@AutocompleteRoute` takes command routes only, replacing the previous per-field `(commandRoutes, focusedFields)` registration that registered one handler per field. Branch on the focused field with `this.match` instead.

## 0.4.0

### Minor Changes

- a34366b: **BREAKING**: rename `Effects` → pub-sub bus. `core.effects.emit` → `core.bus.publish`. `EffectsHandler` → `Subscriber`. `@RegisterEffect` → `@Subscribe`. `Effects` augmentation interface → `Subscriptions`. config key `effects` → `subscribers`. `EffectsConfig` → `SubscribersConfig`.
- 5e4bf42: Reclassify singleton runtime dependencies as peer dependencies so a consumer resolves a single shared instance.
    - `seedcord`: `discord.js` and `reflect-metadata` are now required peer dependencies.
    - `@seedcord/plugins`: `mongoose`, `pg`, and `kysely` are optional peer dependencies (install only the backend your plugin uses); `reflect-metadata` and `seedcord` are required peers.
    - `@seedcord/types`: `discord.js` is now an optional peer dependency.
    - `@seedcord/services` and `@seedcord/utils`: `type-fest` moved to `devDependencies` (its types are inlined into the published declarations).

- 7308d36: Move the non-secret startup settings from environment variables into the runtime config. `botColor`, `shutdownEnabled`, `healthCheck` (`port`/`path`/`host`), and `notifications.developerUsername` are now set through `new Seedcord({ ... })` instead of `DEFAULT_BOT_COLOR`, `SHUTDOWN_IS_ENABLED`, `HEALTH_CHECK_PORT`/`PATH`/`HOST`, and `DEVELOPER_DISCORD_USERNAME`. Secrets (bot token, exception webhook URL, Mongo URI) stay in the environment.

    The bot color is applied when a component is used rather than when it is constructed, so a configured color reaches every component regardless of construction order, and any `ColorResolvable` (hex string, number, named color, or RGB tuple) works. The default health-check port is 6967.

    **Breaking:** the framework no longer reads those four environment variables; move their values into the config object passed to `new Seedcord(...)`. The internal `hexToNumber` helper and its `UtilHexInputType` / `UtilHexInvalid` error codes are removed.

- a34366b: **BREAKING**: drop unused utility types from `@seedcord/types` (`AnyFunction`, `AnyAsyncFunction`, `PartialExcept`, `RequiredExcept`, `ReadonlyExcept`, `EnsureUndefinedForOptionalProps`, `StrictUnion`, `ReadonlyRecord`, `PartialRecord`). Migrate in-repo `TypedOmit` consumers to `Except` from `type-fest`.
- 7e6d80e: most packages were exporting more than what they should be exporting and now have smaller imports as they should

### Patch Changes

- 225977a: export "version" variable with the actual semantic version of each package
- fe77998: build pipeline migrated from `tsup` to `tsdown`. each published package now ships `dist/index.d.mts` + `dist/index.d.cts` (cjs is a one-line re-export stub) with a per-condition `exports` map. source-level public API unchanged. `@seedcord/tsup-config` renamed to `@seedcord/tsdown-config` and made private.
- fe77998: bump peer floor: typescript `^6.0.3`, node `^22.13`. shared `tsconfig/base.json` now sets `esModuleInterop: true` and `types: ["node"]` for ts6's removed implicit defaults. no public API changes.

## 0.3.5

### Patch Changes

- f8fbe70: bump general dependencies

## 0.3.4

### Patch Changes

- 1d8986b: bump deps

## 0.3.3

### Patch Changes

- bump deps (mainly djs to 14.24.2)

## 0.3.2

### Patch Changes

- bump discord.js version to latest

## 0.3.1

### Patch Changes

- aaa59b7: bump deps, update djs to 14.24.0, make file_upload available in BuilderComponent

## 0.3.0

### Minor Changes

- daf5dd9: lots of new utility types for various uses
- daf5dd9: **BREAKING:** some utility types were renamed and some were moved to different packages

### Patch Changes

- daf5dd9: improve type exports and tsdoc
- daf5dd9: new function called filterCirculars that cleans up objects with circular refs new ILogger interface defining logging methods for various log levels so packages that would normally have a circular dependency on services can just depend on types instead

## 0.2.2

### Patch Changes

- 8374f01: set up project-wide ci/cd
- 31d1a56: bump deps

## 0.2.1

### Patch Changes

- bump deps

## 0.2.0

### Minor Changes

- update export settings (BREAKING)

## 0.1.4

### Patch Changes

- 8a7591a: bump deps

## 0.1.3

### Patch Changes

- move IDocument type export to the plugins package

## 0.1.2

### Patch Changes

- 5ac7d83: cleanup package files and bump deps

## 0.1.1

### Patch Changes

- ae9f9b5: update tsdoc to use correct tags

## 0.1.0

### Minor Changes

- d9e2a50: publish types too

### Patch Changes

- 48a8c9b: fix repository url in package.json
- 8c4ce41: Added eslint for TSDoc
- 48a8c9b: add LICENSE to all package roots
- 48a8c9b: add TSDoc to almost everything
