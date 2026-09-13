# @seedcord/http

## 0.8.0

### 💥 Breaking

- every handler constructor now takes a `DispatchContext`. ([#310](https://github.com/seedcord/seedcord/pull/310))

    The node host loads `InteractionMiddleware` from `bot.interactions.middlewares` and runs the chain over the handler's reply surface before its gates. Every middleware that started gets its `after()`, even when a gate refuses the interaction.

### ✨ Minor

- Added `dispatchId` to every bus key a dispatch publishes, and `dispatch.id` to the bag behind it. A fault used to carry no way back to the dispatch that raised it, so pairing one with its `interactionDispatched` meant guessing from the route and the clock. Key a store on it to line up a dispatch, its writes, and its faults. ([#311](https://github.com/seedcord/seedcord/pull/311))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/core` 0.6.0 → 0.7.0
- `@seedcord/types` 0.12.0 → 0.13.0
- `@seedcord/errors` 0.7.0 → 0.8.0
- `@seedcord/logger` 0.3.1 → 0.3.2
- `@seedcord/rate-limiter` 0.1.7 → 0.1.8
- `@seedcord/utils` 0.8.10 → 0.8.11
- `@seedcord/custom-id` 0.2.0 → 0.2.1

## 0.7.0

### ✨ Minor

- Halved the drain window to 5000ms for http bots to the same window gateway uses. An http shutdown now completes there, where it used to report a failure. Both transports log how many handlers were still running when the window closed. ([#309](https://github.com/seedcord/seedcord/pull/309))

### 🩹 Patch

- The transport packages now export `prefixOf`, `decodeFor`, and the custom-id types. Reading a raw customId no longer needs `@seedcord/custom-id` as a direct dependency. ([`0988f67`](https://github.com/seedcord/seedcord/commit/0988f67))

#### 📦 Seedcord packages

- `@seedcord/core` 0.5.0 → 0.6.0
- `@seedcord/custom-id` 0.1.1 → 0.2.0
- `@seedcord/errors` 0.6.0 → 0.7.0
- `@seedcord/types` 0.11.0 → 0.12.0
- `@seedcord/logger` 0.3.0 → 0.3.1
- `@seedcord/utils` 0.8.9 → 0.8.10
- `@seedcord/rate-limiter` 0.1.6 → 0.1.7

## 0.6.0

### 💥 Breaking

- Select menus get one decorator and one base per kind, so `@UserMenuRoute` pairs with `UserMenuHandler` as an example. `@SelectMenuRoute` and `SelectMenuKind` are removed, and `SelectMenuHandler` stays as the shared base your kind's base extends. Each base declares only the members its own menu resolves. Check the updated guide page for select menus. ([#303](https://github.com/seedcord/seedcord/pull/303))

### ✨ Minor

- A resolved pick now comes back as a `Collection`, matching gateway. This covers the select handler members and every `ModalFields` select getter. ([#303](https://github.com/seedcord/seedcord/pull/303))
- `InteractionKind` now ships from the package root. Use its members to compare against the `kind` you read off `interactionDispatched`. ([#301](https://github.com/seedcord/seedcord/pull/301))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/core` 0.4.1 → 0.5.0
- `@seedcord/errors` 0.5.1 → 0.6.0
- `@seedcord/types` 0.10.1 → 0.11.0
- `@seedcord/logger` 0.2.2 → 0.3.0
- `@seedcord/custom-id` 0.1.0 → 0.1.1
- `@seedcord/utils` 0.8.8 → 0.8.9
- `@seedcord/rate-limiter` 0.1.5 → 0.1.6

## 0.5.1

### 🩹 Patch

- `CustomId` moved to `@seedcord/custom-id`. Core still exports it under the same name. The new `setCustomIdErrors` swaps the card a stale or corrupt button shows. ([#299](https://github.com/seedcord/seedcord/pull/299))

#### 📦 Seedcord packages

- `@seedcord/custom-id` 0.1.0 (new)
- `@seedcord/core` 0.4.0 → 0.4.1
- `@seedcord/types` 0.10.0 → 0.10.1
- `@seedcord/errors` 0.5.0 → 0.5.1

## 0.5.0

### 💥 Breaking

- an error that reports a bad argument now throws `SeedcordTypeError` or `SeedcordRangeError`. Update any `isSeedcordError(error, 'SeedcordError', code)` call naming one of those codes, since branching on the code alone is unaffected. ([`1bf7d89`](https://github.com/seedcord/seedcord/commit/1bf7d89))

    An invalid plugin lifecycle timeout throws the new `PluginInvalidLifecycleTimeout` code.

- `start(handler, n)` opens a paginator on any page, and `page(handler, n)` renders one without sending it. A source you write yourself takes `PageSource<Item>`, which each transport exports with its page context already bound. ([#295](https://github.com/seedcord/seedcord/pull/295))

    **BREAKING:** `Paginator.page` now takes the handler. `PaginatorBase.page` is `protected buildPage`, and core's three source symbols gained a `Base` suffix so the plain names belong to the transports.

### ✨ Minor

- A context menu handler registered for several command names runs one arm per name through `match` and reads the fired name from `commandName`. On gateway each arm receives the target narrowed to that one command's cache state. ([#292](https://github.com/seedcord/seedcord/pull/292))
- Modal and select menu handlers read their inputs the same way on both transports. `this.fields` reads a modal's submitted values by custom id. A select handler carries `values` plus the resolved `users`, `members`, `roles`, and `channels` for its kind. ([#294](https://github.com/seedcord/seedcord/pull/294))
- `this.fields.getField(customId)` returns a modal field as Discord sent it, for a component kind the other getters do not cover yet. Naming a kind narrows the result. ([`27c022a`](https://github.com/seedcord/seedcord/commit/27c022a))
- Every repliable handler now carries its reply sender on a public `sender` property, replacing the internal `getSender()`. `ReplySender`, `BaseReplySender`, and `ModalLike` are also exported now. ([`3ff40e7`](https://github.com/seedcord/seedcord/commit/3ff40e7))

### 🩹 Patch

- Fixed `Seedcord.attach()` not showing up in the documentation. ([`2cb3c87`](https://github.com/seedcord/seedcord/commit/2cb3c87))
- Export the winston sinks from both node entries. ([#296](https://github.com/seedcord/seedcord/pull/296))
- Hide the internals that were already marked internal. `core.shutdown` and `core.startup` carry `addTask` alone, `core.bus` carries `publish` and the listener methods, and `core.bot` drops the controllers and the lifecycle calls. The http transport's `Core` declares the two lifecycle members, and a core built by `createSeedcord` throws from either one. ([#296](https://github.com/seedcord/seedcord/pull/296))
- Fix logger config not being used in an edge bot. ([`1fc18be`](https://github.com/seedcord/seedcord/commit/1fc18be))
- Fix TSDoc in `SlashHandler` and `getConfirmation`. They were showing the incorrect number of arguments for option getters. ([`58318fa`](https://github.com/seedcord/seedcord/commit/58318fa))
- A host whose startup failed used to tear down whichever host had replaced it, taking the replacement's signal handlers and logger config with it. Teardown now runs only for the host that is still live. A second `start()` racing the first rejects with the same error, where it used to resolve a half-started host. ([#293](https://github.com/seedcord/seedcord/pull/293))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.4.3 → 0.5.0
- `@seedcord/core` 0.3.1 → 0.4.0
- `@seedcord/event-emitter` 0.1.4 → 0.1.5
- `@seedcord/logger` 0.2.1 → 0.2.2
- `@seedcord/types` 0.9.1 → 0.10.0
- `@seedcord/utils` 0.8.7 → 0.8.8
- `@seedcord/rate-limiter` 0.1.4 → 0.1.5

## 0.4.1

### 🩹 Patch

- A new `commandsDeployed` framework event fires after seedcord deploys your commands, carrying what Discord returned for the global and guild scopes. You can now read the bot's application id from `core.applicationId` on both transports. ([#289](https://github.com/seedcord/seedcord/pull/289))

#### 📦 Seedcord packages

- `@seedcord/core` 0.3.0 → 0.3.1
- `@seedcord/errors` 0.4.2 → 0.4.3
- `@seedcord/utils` 0.8.6 → 0.8.7

## 0.4.0

### 💥 Breaking

- A handler's cache state now follows the `contexts` its command declares, so a command a DM can reach types `interaction.guild` as `Guild | null`. `SlashOptionRegistry` becomes `SlashRegistry`, `ContextMenuHandler` splits into `UserContextMenuHandler` and `MessageContextMenuHandler` with a route decorator each, a paginator's nav handler reads `this.event.guild` as nullable, and a gateway bot registering a guild-capable command without the `Guilds` intent throws at startup. Run `seedcord codegen` after upgrading. This won't affect most commands. ([#283](https://github.com/seedcord/seedcord/pull/283))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/core` 0.2.1 → 0.3.0
- `@seedcord/errors` 0.4.1 → 0.4.2

## 0.3.1

### 💥 Breaking

- A transport plugin base no longer accepts `transport: 'any'` and the gateway base no longer accepts `runtime: 'edge'`. Extend `@seedcord/core/plugin` for a plugin that runs on either transport. This IS a bug fix. This should not have been allowed before. ([`9c8e66a`](https://github.com/seedcord/seedcord/commit/9c8e66a))

### 🩹 Patch

- Fixed a gate mismatch on a Button or Modal handler labelling the handler `StringSelect`. Every interaction kind now reports its own label. ([#273](https://github.com/seedcord/seedcord/pull/273))
- Updated TSDoc reference generation. ([`1d2f1e3`](https://github.com/seedcord/seedcord/commit/1d2f1e3))

#### 📦 Seedcord packages

- `@seedcord/core` 0.2.0 → 0.2.1
- `@seedcord/event-emitter` 0.1.3 → 0.1.4
- `@seedcord/rate-limiter` 0.1.3 → 0.1.4
- `@seedcord/errors` 0.4.0 → 0.4.1
- `@seedcord/logger` 0.2.0 → 0.2.1
- `@seedcord/utils` 0.8.5 → 0.8.6
- `@seedcord/types` 0.9.0 → 0.9.1

## 0.3.0

### 💥 Breaking

- sixteen error codes collapse into `CliConfigInvalidField`, `ConfigMissingEnv`, and `ConfigInvalidEnv`. ([`aa6bb3a`](https://github.com/seedcord/seedcord/commit/aa6bb3a))
- `setEmoji(Emojis.X)` on gateway used to throw through the builder's strict validation. `Emojis.X` now carries `id`, `name`, and `animated`, and the `GuildEmoji` or `ApplicationEmoji` discord.js resolved moved to `Emojis.X.source`, still typed by the codegen tag. `ResolvedEmoji` moved from `@seedcord/http` to `@seedcord/core`. ([`5c7c3e2`](https://github.com/seedcord/seedcord/commit/5c7c3e2))
- Better encapsulate framework internals. ([#253](https://github.com/seedcord/seedcord/pull/253))

    **BREAKING:** `SeedcordError.identifier` is accessed via a symbol now. Older framework versions won't be able to access it anymore. Please update to the latest version.

### 🩹 Patch

- Update log colors in some places. ([`97b62ef`](https://github.com/seedcord/seedcord/commit/97b62ef))
- These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build. ([`f39cde0`](https://github.com/seedcord/seedcord/commit/f39cde0))
- Use `#` instead of `@` for tsconfig path aliases. ([`a259cdc`](https://github.com/seedcord/seedcord/commit/a259cdc))
- Rewrote package descriptions for all packages. Also added keywords. ([`a8d7b5f`](https://github.com/seedcord/seedcord/commit/a8d7b5f))
- Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link. ([`660a94d`](https://github.com/seedcord/seedcord/commit/660a94d))
- Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all. ([`c50ad6c`](https://github.com/seedcord/seedcord/commit/c50ad6c))
- Every fault now reaches your subscribers. A rare bug used to stay silent while a common one kept throwing on the same route. Webhook cards still group repeats to one a minute, and each carries how many it covers. ([#244](https://github.com/seedcord/seedcord/pull/244))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.4 → 0.4.0
- `@seedcord/logger` 0.1.4 → 0.2.0
- `@seedcord/core` 0.1.4 → 0.2.0
- `@seedcord/event-emitter` 0.1.2 → 0.1.3
- `@seedcord/rate-limiter` 0.1.2 → 0.1.3
- `@seedcord/types` 0.8.2 → 0.9.0
- `@seedcord/utils` 0.8.4 → 0.8.5

## 0.2.3

### 💥 Breaking

- envapt is a peer dependency now. Your project and seedcord load one copy, so the framework reads the config you set through `Envapter`. ([`71a0b99`](https://github.com/seedcord/seedcord/commit/71a0b99))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/core` 0.1.3 → 0.1.4
- `@seedcord/logger` 0.1.3 → 0.1.4
- `@seedcord/errors` 0.3.3 → 0.3.4
- `@seedcord/event-emitter` 0.1.1 → 0.1.2
- `@seedcord/rate-limiter` 0.1.1 → 0.1.2
- `@seedcord/types` 0.8.1 → 0.8.2
- `@seedcord/utils` 0.8.3 → 0.8.4

## 0.2.2

### 🩹 Patch

- 'reflect-metadata' is a direct dep now. No need to import it at the top. The packages import it in their index files, first thing. ([#237](https://github.com/seedcord/seedcord/pull/237))
- Export other useful packages from http transport like how gateway does ([#236](https://github.com/seedcord/seedcord/pull/236))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.2 → 0.3.3
- `@seedcord/logger` 0.1.2 → 0.1.3
- `@seedcord/core` 0.1.2 → 0.1.3
- `@seedcord/utils` 0.8.2 → 0.8.3

## 0.2.1

### 🩹 Patch

- Update comments ([`272b729`](https://github.com/seedcord/seedcord/commit/272b729))

#### 📦 Seedcord packages

- `@seedcord/core` 0.1.1 → 0.1.2
- `@seedcord/errors` 0.3.1 → 0.3.2
- `@seedcord/logger` 0.1.1 → 0.1.2
- `@seedcord/rate-limiter` 0.1.1 → 0.1.2
- `@seedcord/types` 0.8.1 → 0.8.2
- `@seedcord/utils` 0.8.1 → 0.8.2

## 0.2.0

### 💥 Breaking

- `@seedcord/http` no longer serves a health endpoint, and `healthCheck` is gone from its config. An unsigned POST to the interactions server answers 401, which covers an uptime check. ([#230](https://github.com/seedcord/seedcord/pull/230))
- `start()` takes no arguments. Declare the interactions port as `port` on the config. ([#230](https://github.com/seedcord/seedcord/pull/230))

### 🩹 Patch

- Bump deps. ([#228](https://github.com/seedcord/seedcord/pull/228))
- Both transports now trace the elapsed time of each dispatched interaction and each reply write. ([#234](https://github.com/seedcord/seedcord/pull/234))
- Set all packages' node floor to LTS. ([#228](https://github.com/seedcord/seedcord/pull/228))
- A hot reload now logs one line worded by what changed, `Unloaded` on a delete, `Registered` on a new file, and `Reloaded` with a duration on an edit. ([#231](https://github.com/seedcord/seedcord/pull/231))
- A dispatched interaction now logs its route and handler at debug like the gateway. ([#233](https://github.com/seedcord/seedcord/pull/233))
- Loads `reflect-metadata` from the package entry. ([#228](https://github.com/seedcord/seedcord/pull/228))
- A failed startup no longer drops sinks installed through `installSink`, so the `seedcord dev` log view keeps working after one. ([#231](https://github.com/seedcord/seedcord/pull/231))
- Now uses the appropriate log levels for logs across the lifecycle of the transports and plugins. ([#233](https://github.com/seedcord/seedcord/pull/233))

#### 📦 Seedcord packages

- `@seedcord/core` 0.1.0 → 0.1.1
- `@seedcord/errors` 0.3.0 → 0.3.1
- `@seedcord/logger` 0.1.0 → 0.1.1
- `@seedcord/types` 0.8.0 → 0.8.1
- `@seedcord/utils` 0.8.0 → 0.8.1
- `@seedcord/rate-limiter` 0.1.0 → 0.1.1

## 0.1.0

### 💥 Breaking

- Each transport exports a `Plugin` base bound to its own `Core`, so a plugin reads `this.core.bot` on gateway with no `Core` import. A plugin serving either transport extends the base from `@seedcord/core/plugin`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    **BREAKING:** `attach(key, Plugin, ...args)` takes no `startupPhase`, plugin init runs during startup. It rejects a plugin whose declared `transport` or `runtime` the host does not run, and a key matching a framework log channel.

    **BREAKING:** a plugin constructor takes `CoreBase` as its first parameter, `stop()` is now `dispose()`, and `this.logger` comes from the base.

- Node 24.3 or newer is required. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

### ✨ Minor

- New `@seedcord/http`, an HTTP-interactions receiver for a node server or an edge worker (edge worker build is WIP). ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    `new Seedcord(config).start(port)` runs a node host with handler discovery, dev HMR, a health server, coordinated shutdown, and plugin `attach`. Edge builds import `createSeedcord` from `@seedcord/http/edge`, which verifies the Ed25519 signature over the raw bytes, rejects stale and replayed requests, and dispatches through a generated route manifest.

    Handlers carry the same reply surface, gates, typed options, customId decoding, emoji and command accessors, and pagination as gateway.

### 🩹 Patch

- Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))
- Require envapt `^8.1.0`. An older pin in your own bot installs a second copy whose `Envapter` state splits from the framework's. ([#196](https://github.com/seedcord/seedcord/pull/196))

#### 📦 Seedcord packages

- `@seedcord/core` 0.1.0 (new)
- `@seedcord/logger` 0.1.0 (new)
- `@seedcord/rate-limiter` 0.1.0 (new)
- `@seedcord/types` 0.7.2-next.0 → 0.8.0
- `@seedcord/utils` 0.7.1-next.0 → 0.8.0
- `@seedcord/errors` 0.2.2-next.0 → 0.3.0
