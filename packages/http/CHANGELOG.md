# @seedcord/http

## 0.5.1

### Patch Changes

- 71c1896: `CustomId` moved to `@seedcord/custom-id`. Core still exports it under the same name. The new `setCustomIdErrors` swaps the card a stale or corrupt button shows.
- Updated dependencies [71c1896]
- Updated dependencies [71c1896]
- Updated dependencies [71c1896]
- Updated dependencies [71c1896]
    - @seedcord/custom-id@0.1.0
    - @seedcord/core@0.4.1
    - @seedcord/types@0.10.1
    - @seedcord/errors@0.5.1

## 0.5.0

### Minor Changes

- 1bf7d89: **BREAKING:** an error that reports a bad argument now throws `SeedcordTypeError` or `SeedcordRangeError`. Update any `isSeedcordError(error, 'SeedcordError', code)` call naming one of those codes, since branching on the code alone is unaffected.

    An invalid plugin lifecycle timeout throws the new `PluginInvalidLifecycleTimeout` code.

- 5b15463: A context menu handler registered for several command names runs one arm per name through `match` and reads the fired name from `commandName`. On gateway each arm receives the target narrowed to that one command's cache state.
- 0ad8bd1: Modal and select menu handlers read their inputs the same way on both transports. `this.fields` reads a modal's submitted values by custom id. A select handler carries `values` plus the resolved `users`, `members`, `roles`, and `channels` for its kind.
- 27c022a: `this.fields.getField(customId)` returns a modal field as Discord sent it, for a component kind the other getters do not cover yet. Naming a kind narrows the result.
- 8dc4791: `start(handler, n)` opens a paginator on any page, and `page(handler, n)` renders one without sending it. A source you write yourself takes `PageSource<Item>`, which each transport exports with its page context already bound.

    **BREAKING:** `Paginator.page` now takes the handler. `PaginatorBase.page` is `protected buildPage`, and core's three source symbols gained a `Base` suffix so the plain names belong to the transports.

- 3ff40e7: Every repliable handler now carries its reply sender on a public `sender` property, replacing the internal `getSender()`. `ReplySender`, `BaseReplySender`, and `ModalLike` are also exported now.

### Patch Changes

- 2cb3c87: Fixed `Seedcord.attach()` not showing up in the documentation.
- 554129a: Export the winston sinks from both node entries.
- 554129a: Hide the internals that were already marked internal. `core.shutdown` and `core.startup` carry `addTask` alone, `core.bus` carries `publish` and the listener methods, and `core.bot` drops the controllers and the lifecycle calls. The http transport's `Core` declares the two lifecycle members, and a core built by `createSeedcord` throws from either one.
- 1fc18be: Fix logger config not being used in an edge bot.
- 58318fa: Fix TSDoc in `SlashHandler` and `getConfirmation`. They were showing the incorrect number of arguments for option getters.
- 9b6a31c: A host whose startup failed used to tear down whichever host had replaced it, taking the replacement's signal handlers and logger config with it. Teardown now runs only for the host that is still live. A second `start()` racing the first rejects with the same error, where it used to resolve a half-started host.
- Updated dependencies [1bf7d89]
- Updated dependencies [9b6a31c]
- Updated dependencies [9b6a31c]
- Updated dependencies [2cb3c87]
- Updated dependencies [9b6a31c]
- Updated dependencies [554129a]
- Updated dependencies [5b15463]
- Updated dependencies [8dc4791]
- Updated dependencies [554129a]
- Updated dependencies [5f4e203]
- Updated dependencies [554129a]
- Updated dependencies [554129a]
- Updated dependencies [0ad8bd1]
- Updated dependencies [8dc4791]
- Updated dependencies [6872865]
- Updated dependencies [3ff40e7]
- Updated dependencies [64c9a0e]
- Updated dependencies [554129a]
- Updated dependencies [9b6a31c]
- Updated dependencies [0c6cdc8]
- Updated dependencies [e4e8605]
- Updated dependencies [554129a]
    - @seedcord/errors@0.5.0
    - @seedcord/core@0.4.0
    - @seedcord/event-emitter@0.1.5
    - @seedcord/logger@0.2.2
    - @seedcord/types@0.10.0
    - @seedcord/utils@0.8.8
    - @seedcord/rate-limiter@0.1.5

## 0.4.1

### Patch Changes

- a98d27b: A new `commandsDeployed` framework event fires after seedcord deploys your commands, carrying what Discord returned for the global and guild scopes. You can now read the bot's application id from `core.applicationId` on both transports.
- Updated dependencies [a98d27b]
- Updated dependencies [6b1cfbf]
- Updated dependencies [aa4d4c0]
- Updated dependencies [b29904c]
    - @seedcord/core@0.3.1
    - @seedcord/errors@0.4.3
    - @seedcord/utils@0.8.7

## 0.4.0

### Minor Changes

- a46a7dd: **BREAKING:** A handler's cache state now follows the `contexts` its command declares, so a command a DM can reach types `interaction.guild` as `Guild | null`. `SlashOptionRegistry` becomes `SlashRegistry`, `ContextMenuHandler` splits into `UserContextMenuHandler` and `MessageContextMenuHandler` with a route decorator each, a paginator's nav handler reads `this.event.guild` as nullable, and a gateway bot registering a guild-capable command without the `Guilds` intent throws at startup. Run `seedcord codegen` after upgrading. This won't affect most commands.

### Patch Changes

- Updated dependencies [a46a7dd]
    - @seedcord/core@0.3.0
    - @seedcord/errors@0.4.2

## 0.3.1

### Patch Changes

- 9c8e66a: _Kinda BREAKING:_ A transport plugin base no longer accepts `transport: 'any'` and the gateway base no longer accepts `runtime: 'edge'`. Extend `@seedcord/core/plugin` for a plugin that runs on either transport. This IS a bug fix. This should not have been allowed before.
- 8f662bb: Fixed a gate mismatch on a Button or Modal handler labelling the handler `StringSelect`. Every interaction kind now reports its own label.
- 1d2f1e3: Updated TSDoc reference generation.
- Updated dependencies [8f662bb]
- Updated dependencies [1d2f1e3]
    - @seedcord/core@0.2.1
    - @seedcord/event-emitter@0.1.4
    - @seedcord/rate-limiter@0.1.4
    - @seedcord/errors@0.4.1
    - @seedcord/logger@0.2.1
    - @seedcord/utils@0.8.6
    - @seedcord/types@0.9.1

## 0.3.0

### Minor Changes

- aa6bb3a: **BREAKING:** sixteen error codes collapse into `CliConfigInvalidField`, `ConfigMissingEnv`, and `ConfigInvalidEnv`.
- 5c7c3e2: **BREAKING:** `setEmoji(Emojis.X)` on gateway used to throw through the builder's strict validation. `Emojis.X` now carries `id`, `name`, and `animated`, and the `GuildEmoji` or `ApplicationEmoji` discord.js resolved moved to `Emojis.X.source`, still typed by the codegen tag. `ResolvedEmoji` moved from `@seedcord/http` to `@seedcord/core`.

### Patch Changes

- 97b62ef: Update log colors in some places.
- 7553449: Better encapsulate framework internals.

    **BREAKING:** `SeedcordError.identifier` is accessed via a symbol now. Older framework versions won't be able to access it anymore. Please update to the latest version.

- f39cde0: These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build.
- a259cdc: Use `#` instead of `@` for tsconfig path aliases.
- a8d7b5f: Rewrote package descriptions for all packages. Also added keywords.
- 660a94d: Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link.
- c50ad6c: Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all.
- ad1e4d5: Every fault now reaches your subscribers. A rare bug used to stay silent while a common one kept throwing on the same route. Webhook cards still group repeats to one a minute, and each carries how many it covers.
- Updated dependencies [1364c82]
- Updated dependencies [97b62ef]
- Updated dependencies [ad1e4d5]
- Updated dependencies [aa6bb3a]
- Updated dependencies [7553449]
- Updated dependencies [f39cde0]
- Updated dependencies [5c7c3e2]
- Updated dependencies [a259cdc]
- Updated dependencies [1364c82]
- Updated dependencies [a8d7b5f]
- Updated dependencies [660a94d]
- Updated dependencies [c50ad6c]
- Updated dependencies [c343f4a]
- Updated dependencies [e11cbb3]
- Updated dependencies [ad1e4d5]
- Updated dependencies [1364c82]
    - @seedcord/errors@0.4.0
    - @seedcord/logger@0.2.0
    - @seedcord/core@0.2.0
    - @seedcord/event-emitter@0.1.3
    - @seedcord/rate-limiter@0.1.3
    - @seedcord/types@0.9.0
    - @seedcord/utils@0.8.5

## 0.2.3

### Patch Changes

- 71a0b99: _Kinda BREAKING?:_ envapt is a peer dependency now. Your project and seedcord load one copy, so the framework reads the config you set through `Envapter`.
- Updated dependencies [71a0b99]
- Updated dependencies [8e8e952]
- Updated dependencies [527a465]
    - @seedcord/core@0.1.4
    - @seedcord/logger@0.1.4
    - @seedcord/errors@0.3.4
    - @seedcord/event-emitter@0.1.2
    - @seedcord/rate-limiter@0.1.2
    - @seedcord/types@0.8.2
    - @seedcord/utils@0.8.4

## 0.2.2

### Patch Changes

- 9b0a6a6: 'reflect-metadata' is a direct dep now. No need to import it at the top. The packages import it in their index files, first thing.
- b8189ab: Export other useful packages from http transport like how gateway does
- Updated dependencies [dfd7dc2]
- Updated dependencies [dfd7dc2]
- Updated dependencies [9b0a6a6]
    - @seedcord/errors@0.3.3
    - @seedcord/logger@0.1.3
    - @seedcord/core@0.1.3
    - @seedcord/utils@0.8.3

## 0.2.1

### Patch Changes

- 272b729: Update comments
- Updated dependencies [272b729]
    - @seedcord/core@0.1.2
    - @seedcord/errors@0.3.2
    - @seedcord/logger@0.1.2
    - @seedcord/rate-limiter@0.1.2
    - @seedcord/types@0.8.2
    - @seedcord/utils@0.8.2

## 0.2.0

### Minor Changes

- 0642de5: **BREAKING:** `@seedcord/http` no longer serves a health endpoint, and `healthCheck` is gone from its config. An unsigned POST to the interactions server answers 401, which covers an uptime check.
- 0642de5: **BREAKING:** `start()` takes no arguments. Declare the interactions port as `port` on the config.

### Patch Changes

- c567fea: Bump deps.
- 814902a: Both transports now trace the elapsed time of each dispatched interaction and each reply write.
- c567fea: Set all packages' node floor to LTS.
- 5b57bda: A hot reload now logs one line worded by what changed, `Unloaded` on a delete, `Registered` on a new file, and `Reloaded` with a duration on an edit.
- d470ad4: A dispatched interaction now logs its route and handler at debug like the gateway.
- c567fea: Loads `reflect-metadata` from the package entry.
- 5b57bda: A failed startup no longer drops sinks installed through `installSink`, so the `seedcord dev` log view keeps working after one.
- d470ad4: Now uses the appropriate log levels for logs across the lifecycle of the transports and plugins.
- Updated dependencies [c567fea]
- Updated dependencies [0642de5]
- Updated dependencies [814902a]
- Updated dependencies [c567fea]
- Updated dependencies [5b57bda]
- Updated dependencies [0642de5]
- Updated dependencies [d470ad4]
- Updated dependencies [d470ad4]
- Updated dependencies [814902a]
    - @seedcord/core@0.1.1
    - @seedcord/errors@0.3.1
    - @seedcord/logger@0.1.1
    - @seedcord/types@0.8.1
    - @seedcord/utils@0.8.1
    - @seedcord/rate-limiter@0.1.1

## 0.1.0

### Minor Changes

- 789f17a: Each transport exports a `Plugin` base bound to its own `Core`, so a plugin reads `this.core.bot` on gateway with no `Core` import. A plugin serving either transport extends the base from `@seedcord/core/plugin`.

    **BREAKING:** `attach(key, Plugin, ...args)` takes no `startupPhase`, plugin init runs during startup. It rejects a plugin whose declared `transport` or `runtime` the host does not run, and a key matching a framework log channel.

    **BREAKING:** a plugin constructor takes `CoreBase` as its first parameter, `stop()` is now `dispose()`, and `this.logger` comes from the base.

- 789f17a: New `@seedcord/http`, an HTTP-interactions receiver for a node server or an edge worker (edge worker build is WIP).

    `new Seedcord(config).start(port)` runs a node host with handler discovery, dev HMR, a health server, coordinated shutdown, and plugin `attach`. Edge builds import `createSeedcord` from `@seedcord/http/edge`, which verifies the Ed25519 signature over the raw bytes, rejects stale and replayed requests, and dispatches through a generated route manifest.

    Handlers carry the same reply surface, gates, typed options, customId decoding, emoji and command accessors, and pagination as gateway.

- 789f17a: **BREAKING:** Node 24.3 or newer is required.

### Patch Changes

- 789f17a: Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`.
- 701b669: Require envapt `^8.1.0`. An older pin in your own bot installs a second copy whose `Envapter` state splits from the framework's.
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [701b669]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [789f17a]
- Updated dependencies [93544a8]
    - @seedcord/core@0.1.0
    - @seedcord/types@0.8.0
    - @seedcord/utils@0.8.0
    - @seedcord/logger@0.1.0
    - @seedcord/errors@0.3.0
    - @seedcord/rate-limiter@0.1.0
