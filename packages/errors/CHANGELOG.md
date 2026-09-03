# @seedcord/errors

## 0.5.1

### Patch Changes

- 71c1896: Two codes for a customId that fails to decode. `CustomIdWireStale` fires when the wire predates a shape change, and `CustomIdWireInvalid` when it is corrupt or came from a different definition.

## 0.5.0

### Minor Changes

- 1bf7d89: **BREAKING:** an error that reports a bad argument now throws `SeedcordTypeError` or `SeedcordRangeError`. Update any `isSeedcordError(error, 'SeedcordError', code)` call naming one of those codes, since branching on the code alone is unaffected.

    An invalid plugin lifecycle timeout throws the new `PluginInvalidLifecycleTimeout` code.

- 5b15463: A context menu handler registered for several command names runs one arm per name through `match` and reads the fired name from `commandName`. On gateway each arm receives the target narrowed to that one command's cache state.
- 554129a: Add two error codes. `CoreLifecycleUnavailable` throws when a bot adds a startup or shutdown task to a core built by `createSeedcord`, and `CoreBusEmitUnavailable` throws when a bot calls `core.bus.emit`.
- 0ad8bd1: Modal and select menu handlers read their inputs the same way on both transports. `this.fields` reads a modal's submitted values by custom id. A select handler carries `values` plus the resolved `users`, `members`, `roles`, and `channels` for its kind.

### Patch Changes

- 554129a: `seedcord codegen` now throws and names the file when a class carrying `@RegisterCommand` fails to construct.

## 0.4.3

### Patch Changes

- 6b1cfbf: _Kinda BREAKING:_ Starting a bot or running the CLI on a Node version below the `engines` range now throws, naming the required range and the version you are running. The floor stays at `>=24.11`.

## 0.4.2

### Patch Changes

- a46a7dd: **BREAKING:** A handler's cache state now follows the `contexts` its command declares, so a command a DM can reach types `interaction.guild` as `Guild | null`. `SlashOptionRegistry` becomes `SlashRegistry`, `ContextMenuHandler` splits into `UserContextMenuHandler` and `MessageContextMenuHandler` with a route decorator each, a paginator's nav handler reads `this.event.guild` as nullable, and a gateway bot registering a guild-capable command without the `Guilds` intent throws at startup. Run `seedcord codegen` after upgrading. This won't affect most commands.

## 0.4.1

### Patch Changes

- 1d2f1e3: Updated TSDoc reference generation.

## 0.4.0

### Minor Changes

- aa6bb3a: **BREAKING:** sixteen error codes collapse into `CliConfigInvalidField`, `ConfigMissingEnv`, and `ConfigInvalidEnv`.
- 7553449: Better encapsulate framework internals.

    **BREAKING:** `SeedcordError.identifier` is accessed via a symbol now. Older framework versions won't be able to access it anymore. Please update to the latest version.

- c343f4a: `paint` now carries `bold`, `italic` and `underline` beside its color tones. `paint.mute` for dim.
- e11cbb3: **BREAKING:** `paint` now comes from `@seedcord/errors`, and `ILogSink`, `LogLevel`, `LogRecord`, `LogSinkHandle`, `LoggerConfig`, `LoggerChannelId`, and `FrameworkChannel` now come from `@seedcord/types`. `@seedcord/logger` no longer re-exports them. Both transports still expose every one of these.

### Patch Changes

- 1364c82: `isSeedcordError` now narrows correctly when two copies of `@seedcord/errors` are installed.
- 97b62ef: Update log colors in some places.
- f39cde0: These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build.
- a259cdc: Use `#` instead of `@` for tsconfig path aliases.
- a8d7b5f: Rewrote package descriptions for all packages. Also added keywords.
- 660a94d: Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link.
- c50ad6c: Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all.

## 0.3.4

### Patch Changes

- 8e8e952: _Kinda BREAKING?:_ `seedcord dev` no longer runs `tsc --watch` unless you set `hmr.typecheck`. Pass `true` for the nearest tsconfig, or `{ tsconfig }` to pick one, which replaces the old `hmr.tsconfig`.
- 527a465: Added `idleAnimation` to `seedcord.config.ts`. Setting it to `false` holds the running arc and the live dot still, which cuts idle redraws by about 80% and the bytes written to the terminal by 63%.

## 0.3.3

### Patch Changes

- dfd7dc2: Moved `paint` to the errors package
- dfd7dc2: New error codes for the create command

## 0.3.2

### Patch Changes

- 272b729: Update comments

## 0.3.1

### Patch Changes

- c567fea: Bump deps.
- 0642de5: `seedcord dev` exposes an http bot's interactions server through the `tunnel` dev config field. `true` opens a cloudflared quick tunnel and writes the interactions endpoint on every run. An https URL is one you already serve, and the CLI checks it reaches the bot, writes the endpoint when the stored value differs, then leaves it in place.
- c567fea: Set all packages' node floor to LTS.

## 0.3.0

### Minor Changes

- 789f17a: **BREAKING:** the error-code set was reworked. Codes were added, removed, and renumbered across every group, so re-check any code you match on by name or by number.

    Notable removals, the four per-reporter webhook codes collapse into `ConfigWebhookUrlInvalid` and `ConfigWebhookNotFound`. `PluginMongo*` is now `PluginMongoose*` and `PluginKpg*` is now `PluginKysely*`.

- 789f17a: **BREAKING:** Node 24.3 or newer is required.

## 0.2.2-next.0

### Patch Changes

- 8635423: Throw on a duplicate interaction route, and on two interaction middleware classes sharing a name. Before, the later registration silently overwrote the earlier one.
- 8635423: A failed hot-reload now restores the file's last-good version, so the handler stays registered through a broken edit until the next good save. Disable it with `hmr.rollback: false` in `seedcord.config.ts`.

## 0.2.1

### Patch Changes

- c3613bd: Add pagination. `Paginator` renders paged Components V2 replies with first/prev/next/last controls, backed by `ArraySource` for an in-memory list or `CursorSource` for one-page-at-a-time fetches. Each control encodes its target page, so clicks keep working after a restart. The pure `paginate()` math and the `PageView` shape ship from `@seedcord/kit` for headless use.
- 78377fa: update LICENSE copyright year

## 0.2.0

### Minor Changes

- 7121c18: remove `BaseSeedcordError` from public exports

### Patch Changes

- 7121c18: Add `seedcord commands` to find and delete guild application commands that duplicate a global command (or, with `--purge`, every command in a guild). Run it with no flags for a guided wizard, or headlessly with `--clean --guild <ids>` or `--all-guilds` plus `--apply`, `--purge`, and `--yes`. It reads deployed state over REST, dry-runs by default, and never touches global commands.
- 7121c18: `EmojiInjector` now throws at startup when a configured emoji cannot be resolved, instead of silently storing the raw config name. It collects every unresolvable emoji and reports them in one error, so the whole config is fixable in one pass. `bot.emojis` is narrowed to resolved emoji objects (the `string` fallback is gone), so a saved emoji is always usable.

## 0.1.0

### Minor Changes

- 6e39348: Add two published leaf packages.

    - `@seedcord/errors` holds the `SeedcordError` tree (`SeedcordError`, `SeedcordTypeError`, `SeedcordRangeError`, `SeedcordErrorCode`, `isSeedcordError`). It moved out of `@seedcord/services`, which no longer re-exports it. Import these from `@seedcord/errors` or from `seedcord`, which re-exports it.
    - `@seedcord/kit` holds the component builders (`BuilderComponent`, `RowComponent`), the `Notice` tree, and the typed `CustomId` codec. `seedcord` re-exports it.
