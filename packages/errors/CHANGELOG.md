# @seedcord/errors

## 0.8.0

### 💥 Breaking

- `SeedcordErrorCode.InteractionDuplicateMiddleware` is now `DuplicateMiddleware`, since event middleware throws it too. Dropping `DecoratorInteractionEventFilter` renumbered the five `Decorator*` codes after it. ([#310](https://github.com/seedcord/seedcord/pull/310))

    Added `DispatchStateMissing` for a `dispatch.require()` key that nothing wrote.

## 0.7.0

### 💥 Breaking

- renamed `SeedcordErrorCode.CustomIdValueOutOfRange` to `CustomIdValueRejected` (same error code). It now gives a more accurate description of the error with what's wrong and what was expected. ([#306](https://github.com/seedcord/seedcord/pull/306))
- A shutdown that used to run more than 25 seconds now stops there and skips the rest. This will most likely affect no one. ([#309](https://github.com/seedcord/seedcord/pull/309))

    Added `lifecycle.shutdownDeadline`, a cap on the whole shutdown, 25000ms by default. A shutdown that interrupts a slow startup waits for that startup out of the same budget. A deadline that is zero, negative, or not finite throws `LifecycleInvalidShutdownDeadline`.

## 0.6.0

### 💥 Breaking

- Every shared symbol key now reads `seedcord:` plus kebab-case. Plugin service metadata moved to the same global registry the core keys use. Make sure to update your packages together! You don't need to change any code for this. ([#301](https://github.com/seedcord/seedcord/pull/301))

### 🩹 Patch

- `CustomIdHandlerRouteMissing` now tells you to add the decorator that matches your handler's base, with two examples. ([#303](https://github.com/seedcord/seedcord/pull/303))

## 0.5.1

### 🩹 Patch

- Two codes for a customId that fails to decode. `CustomIdWireStale` fires when the wire predates a shape change, and `CustomIdWireInvalid` when it is corrupt or came from a different definition. ([#299](https://github.com/seedcord/seedcord/pull/299))

## 0.5.0

### 💥 Breaking

- an error that reports a bad argument now throws `SeedcordTypeError` or `SeedcordRangeError`. Update any `isSeedcordError(error, 'SeedcordError', code)` call naming one of those codes, since branching on the code alone is unaffected. ([`1bf7d89`](https://github.com/seedcord/seedcord/commit/1bf7d89))

    An invalid plugin lifecycle timeout throws the new `PluginInvalidLifecycleTimeout` code.

### ✨ Minor

- A context menu handler registered for several command names runs one arm per name through `match` and reads the fired name from `commandName`. On gateway each arm receives the target narrowed to that one command's cache state. ([#292](https://github.com/seedcord/seedcord/pull/292))
- Add two error codes. `CoreLifecycleUnavailable` throws when a bot adds a startup or shutdown task to a core built by `createSeedcord`, and `CoreBusEmitUnavailable` throws when a bot calls `core.bus.emit`. ([#296](https://github.com/seedcord/seedcord/pull/296))
- Modal and select menu handlers read their inputs the same way on both transports. `this.fields` reads a modal's submitted values by custom id. A select handler carries `values` plus the resolved `users`, `members`, `roles`, and `channels` for its kind. ([#294](https://github.com/seedcord/seedcord/pull/294))

### 🩹 Patch

- `seedcord codegen` now throws and names the file when a class carrying `@RegisterCommand` fails to construct. ([#296](https://github.com/seedcord/seedcord/pull/296))

## 0.4.3

### 💥 Breaking

- Starting a bot or running the CLI on a Node version below the `engines` range now throws, naming the required range and the version you are running. The floor stays at `>=24.11`. ([#288](https://github.com/seedcord/seedcord/pull/288))

## 0.4.2

### 💥 Breaking

- A handler's cache state now follows the `contexts` its command declares, so a command a DM can reach types `interaction.guild` as `Guild | null`. `SlashOptionRegistry` becomes `SlashRegistry`, `ContextMenuHandler` splits into `UserContextMenuHandler` and `MessageContextMenuHandler` with a route decorator each, a paginator's nav handler reads `this.event.guild` as nullable, and a gateway bot registering a guild-capable command without the `Guilds` intent throws at startup. Run `seedcord codegen` after upgrading. This won't affect most commands. ([#283](https://github.com/seedcord/seedcord/pull/283))

## 0.4.1

### 🩹 Patch

- Updated TSDoc reference generation. ([`1d2f1e3`](https://github.com/seedcord/seedcord/commit/1d2f1e3))

## 0.4.0

### 💥 Breaking

- sixteen error codes collapse into `CliConfigInvalidField`, `ConfigMissingEnv`, and `ConfigInvalidEnv`. ([`aa6bb3a`](https://github.com/seedcord/seedcord/commit/aa6bb3a))
- Better encapsulate framework internals. ([#253](https://github.com/seedcord/seedcord/pull/253))

    **BREAKING:** `SeedcordError.identifier` is accessed via a symbol now. Older framework versions won't be able to access it anymore. Please update to the latest version.

- `paint` now comes from `@seedcord/errors`, and `ILogSink`, `LogLevel`, `LogRecord`, `LogSinkHandle`, `LoggerConfig`, `LoggerChannelId`, and `FrameworkChannel` now come from `@seedcord/types`. `@seedcord/logger` no longer re-exports them. Both transports still expose every one of these. ([`e11cbb3`](https://github.com/seedcord/seedcord/commit/e11cbb3))

### ✨ Minor

- `paint` now carries `bold`, `italic` and `underline` beside its color tones. `paint.mute` for dim. ([#251](https://github.com/seedcord/seedcord/pull/251))

### 🩹 Patch

- `isSeedcordError` now narrows correctly when two copies of `@seedcord/errors` are installed. ([#249](https://github.com/seedcord/seedcord/pull/249))
- Update log colors in some places. ([`97b62ef`](https://github.com/seedcord/seedcord/commit/97b62ef))
- These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build. ([`f39cde0`](https://github.com/seedcord/seedcord/commit/f39cde0))
- Use `#` instead of `@` for tsconfig path aliases. ([`a259cdc`](https://github.com/seedcord/seedcord/commit/a259cdc))
- Rewrote package descriptions for all packages. Also added keywords. ([`a8d7b5f`](https://github.com/seedcord/seedcord/commit/a8d7b5f))
- Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link. ([`660a94d`](https://github.com/seedcord/seedcord/commit/660a94d))
- Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all. ([`c50ad6c`](https://github.com/seedcord/seedcord/commit/c50ad6c))

## 0.3.4

### 💥 Breaking

- `seedcord dev` no longer runs `tsc --watch` unless you set `hmr.typecheck`. Pass `true` for the nearest tsconfig, or `{ tsconfig }` to pick one, which replaces the old `hmr.tsconfig`. ([`8e8e952`](https://github.com/seedcord/seedcord/commit/8e8e952))

### 🩹 Patch

- Added `idleAnimation` to `seedcord.config.ts`. Setting it to `false` holds the running arc and the live dot still, which cuts idle redraws by about 80% and the bytes written to the terminal by 63%. ([`527a465`](https://github.com/seedcord/seedcord/commit/527a465))

## 0.3.3

### 🩹 Patch

- Moved `paint` to the errors package ([#238](https://github.com/seedcord/seedcord/pull/238))
- New error codes for the create command ([#238](https://github.com/seedcord/seedcord/pull/238))

## 0.3.2

### 🩹 Patch

- Update comments ([`272b729`](https://github.com/seedcord/seedcord/commit/272b729))

## 0.3.1

### 🩹 Patch

- Bump deps. ([#228](https://github.com/seedcord/seedcord/pull/228))
- `seedcord dev` exposes an http bot's interactions server through the `tunnel` dev config field. `true` opens a cloudflared quick tunnel and writes the interactions endpoint on every run. An https URL is one you already serve, and the CLI checks it reaches the bot, writes the endpoint when the stored value differs, then leaves it in place. ([#230](https://github.com/seedcord/seedcord/pull/230))
- Set all packages' node floor to LTS. ([#228](https://github.com/seedcord/seedcord/pull/228))

## 0.3.0

### 💥 Breaking

- the error-code set was reworked. Codes were added, removed, and renumbered across every group, so re-check any code you match on by name or by number. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    Notable removals, the four per-reporter webhook codes collapse into `ConfigWebhookUrlInvalid` and `ConfigWebhookNotFound`. `PluginMongo*` is now `PluginMongoose*` and `PluginKpg*` is now `PluginKysely*`.

- Node 24.3 or newer is required. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

## 0.2.2-next.0

### 🩹 Patch

- Throw on a duplicate interaction route, and on two interaction middleware classes sharing a name. Before, the later registration silently overwrote the earlier one. ([#163](https://github.com/seedcord/seedcord/pull/163))
- A failed hot-reload now restores the file's last-good version, so the handler stays registered through a broken edit until the next good save. Disable it with `hmr.rollback: false` in `seedcord.config.ts`. ([#163](https://github.com/seedcord/seedcord/pull/163))

## 0.2.1

### 🩹 Patch

- Add pagination. `Paginator` renders paged Components V2 replies with first/prev/next/last controls, backed by `ArraySource` for an in-memory list or `CursorSource` for one-page-at-a-time fetches. Each control encodes its target page, so clicks keep working after a restart. The pure `paginate()` math and the `PageView` shape ship from `@seedcord/kit` for headless use. ([#149](https://github.com/seedcord/seedcord/pull/149))
- update LICENSE copyright year ([#152](https://github.com/seedcord/seedcord/pull/152))

## 0.2.0

### ✨ Minor

- remove `BaseSeedcordError` from public exports ([#147](https://github.com/seedcord/seedcord/pull/147))

### 🩹 Patch

- Add `seedcord commands` to find and delete guild application commands that duplicate a global command (or, with `--purge`, every command in a guild). Run it with no flags for a guided wizard, or headlessly with `--clean --guild <ids>` or `--all-guilds` plus `--apply`, `--purge`, and `--yes`. It reads deployed state over REST, dry-runs by default, and never touches global commands. ([#147](https://github.com/seedcord/seedcord/pull/147))
- `EmojiInjector` now throws at startup when a configured emoji cannot be resolved, instead of silently storing the raw config name. It collects every unresolvable emoji and reports them in one error, so the whole config is fixable in one pass. `bot.emojis` is narrowed to resolved emoji objects (the `string` fallback is gone), so a saved emoji is always usable. ([#147](https://github.com/seedcord/seedcord/pull/147))

## 0.1.0

### ✨ Minor

- Add two published leaf packages. ([#143](https://github.com/seedcord/seedcord/pull/143))

    - `@seedcord/errors` holds the `SeedcordError` tree (`SeedcordError`, `SeedcordTypeError`, `SeedcordRangeError`, `SeedcordErrorCode`, `isSeedcordError`). It moved out of `@seedcord/services`, which no longer re-exports it. Import these from `@seedcord/errors` or from `seedcord`, which re-exports it.
    - `@seedcord/kit` holds the component builders (`BuilderComponent`, `RowComponent`), the `Notice` tree, and the typed `CustomId` codec. `seedcord` re-exports it.
