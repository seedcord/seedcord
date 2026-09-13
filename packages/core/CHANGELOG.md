# @seedcord/core

## 0.7.0

### 💥 Breaking

- Renamed `routeId` on `unknownException` and `handledException` to `origin`, because on an event it carries a third segment naming the handler that threw. A subscriber reading `this.data.routeId` now reads `this.data.origin`. `interactionDispatched` and `responseAttempted` keep theirs. ([#311](https://github.com/seedcord/seedcord/pull/311))
- Renamed `routeId` on the gate context to `declaredRoute`, because the bag beside it carries a field of the same name, and only the gate context's is null off a route. A gate reading `ctx.routeId` now reads `ctx.declaredRoute`. The bag is unchanged. ([#311](https://github.com/seedcord/seedcord/pull/311))
- every handler constructor now takes a `DispatchContext`. ([#310](https://github.com/seedcord/seedcord/pull/310))

    `@RegisterInteractionMiddleware` registers an interaction middleware and filters it with `{ kinds }`. Middleware, gates, and error cards read one typed bag per dispatch through `this.dispatch`.

### ✨ Minor

- Added `dispatchId` to every bus key a dispatch publishes, and `dispatch.id` to the bag behind it. A fault used to carry no way back to the dispatch that raised it, so pairing one with its `interactionDispatched` meant guessing from the route and the clock. Key a store on it to line up a dispatch, its writes, and its faults. ([#311](https://github.com/seedcord/seedcord/pull/311))
- `interactionDispatched` now carries `userId` and `guildId`. ([#310](https://github.com/seedcord/seedcord/pull/310))
- Added `eventDispatched`, which fires once an event's handlers settle and carries the class name and outcome of each one. An event used to report only that it started, so a handler that failed showed up nowhere. A fire that runs no handler stays quiet, matching `eventDispatching`. ([#311](https://github.com/seedcord/seedcord/pull/311))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/types` 0.12.0 → 0.13.0
- `@seedcord/errors` 0.7.0 → 0.8.0
- `@seedcord/logger` 0.3.1 → 0.3.2
- `@seedcord/utils` 0.8.10 → 0.8.11
- `@seedcord/custom-id` 0.2.0 → 0.2.1

## 0.6.0

### 💥 Breaking

- A shutdown that used to run more than 25 seconds now stops there and skips the rest. This will most likely affect no one. ([#309](https://github.com/seedcord/seedcord/pull/309))

    Added `lifecycle.shutdownDeadline`, a cap on the whole shutdown, 25000ms by default. A shutdown that interrupts a slow startup waits for that startup out of the same budget. A deadline that is zero, negative, or not finite throws `LifecycleInvalidShutdownDeadline`.

### 🩹 Patch

- Fixed a plugin whose `init()` outlasts its timeout. Its `dispose()` now runs when that `init()` resolves, for as long as the process is still alive, so it can release whatever `init()` claimed past the deadline. A late `init()` that rejects now logs a warning. ([#309](https://github.com/seedcord/seedcord/pull/309))
- The transport packages now export `prefixOf`, `decodeFor`, and the custom-id types. Reading a raw customId no longer needs `@seedcord/custom-id` as a direct dependency. ([`0988f67`](https://github.com/seedcord/seedcord/commit/0988f67))
- Fixed the wait that bounds a shutdown step. The shutdown now continues past a failing step. ([#308](https://github.com/seedcord/seedcord/pull/308))

    Fixed a lifecycle task or plugin hook that throws before returning a promise. The throw now rejects the returned promise.

#### 📦 Seedcord packages

- `@seedcord/custom-id` 0.1.1 → 0.2.0
- `@seedcord/errors` 0.6.0 → 0.7.0
- `@seedcord/types` 0.11.0 → 0.12.0
- `@seedcord/logger` 0.3.0 → 0.3.1
- `@seedcord/utils` 0.8.9 → 0.8.10

## 0.5.0

### 💥 Breaking

- Select menus get one decorator and one base per kind, so `@UserMenuRoute` pairs with `UserMenuHandler` as an example. `@SelectMenuRoute` and `SelectMenuKind` are removed, and `SelectMenuHandler` stays as the shared base your kind's base extends. Each base declares only the members its own menu resolves. Check the updated guide page for select menus. ([#303](https://github.com/seedcord/seedcord/pull/303))
- Every shared symbol key now reads `seedcord:` plus kebab-case. Plugin service metadata moved to the same global registry the core keys use. Make sure to update your packages together! You don't need to change any code for this. ([#301](https://github.com/seedcord/seedcord/pull/301))

### ✨ Minor

- `InteractionKind` now ships from the package root. Use its members to compare against the `kind` you read off `interactionDispatched`. ([#301](https://github.com/seedcord/seedcord/pull/301))

### 🩹 Patch

- Fixed handler metadata reads across two copies of core. ([#301](https://github.com/seedcord/seedcord/pull/301))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.5.1 → 0.6.0
- `@seedcord/types` 0.10.1 → 0.11.0
- `@seedcord/logger` 0.2.2 → 0.3.0
- `@seedcord/custom-id` 0.1.0 → 0.1.1
- `@seedcord/utils` 0.8.8 → 0.8.9

## 0.4.1

### 🩹 Patch

- `CustomId` moved to `@seedcord/custom-id`. Core still exports it under the same name. The new `setCustomIdErrors` swaps the card a stale or corrupt button shows. ([#299](https://github.com/seedcord/seedcord/pull/299))

#### 📦 Seedcord packages

- `@seedcord/custom-id` 0.1.0 (new)
- `@seedcord/types` 0.10.0 → 0.10.1
- `@seedcord/errors` 0.5.0 → 0.5.1

## 0.4.0

### 💥 Breaking

- an error that reports a bad argument now throws `SeedcordTypeError` or `SeedcordRangeError`. Update any `isSeedcordError(error, 'SeedcordError', code)` call naming one of those codes, since branching on the code alone is unaffected. ([`1bf7d89`](https://github.com/seedcord/seedcord/commit/1bf7d89))

    An invalid plugin lifecycle timeout throws the new `PluginInvalidLifecycleTimeout` code.

- `start(handler, n)` opens a paginator on any page, and `page(handler, n)` renders one without sending it. A source you write yourself takes `PageSource<Item>`, which each transport exports with its page context already bound. ([#295](https://github.com/seedcord/seedcord/pull/295))

    **BREAKING:** `Paginator.page` now takes the handler. `PaginatorBase.page` is `protected buildPage`, and core's three source symbols gained a `Base` suffix so the plain names belong to the transports.

- The `responseAttempted` payload is now a union of `ResponseSent` and `ResponseFailed`, both exported. Check `outcome` to reach `error`. Every framework payload field is readonly now, because the bus hands one object to every subscriber. ([`0c6cdc8`](https://github.com/seedcord/seedcord/commit/0c6cdc8))

### ✨ Minor

- `errors.catchProcessErrors` reports a throw that escaped every handler, and defaults on. The bot keeps running after a rejection. An uncaught exception runs the coordinated shutdown and exits 1. ([#293](https://github.com/seedcord/seedcord/pull/293))
- Every `CustomId` field now also takes `{ nullable: true }` and decodes to `T | null`, at one extra slot on the wire. Marking a live field nullable will change its layout hash as well. ([#295](https://github.com/seedcord/seedcord/pull/295))
- Every repliable handler now carries its reply sender on a public `sender` property, replacing the internal `getSender()`. `ReplySender`, `BaseReplySender`, and `ModalLike` are also exported now. ([`3ff40e7`](https://github.com/seedcord/seedcord/commit/3ff40e7))

### 🩹 Patch

- Fixed `Seedcord.attach()` not showing up in the documentation. ([`2cb3c87`](https://github.com/seedcord/seedcord/commit/2cb3c87))
- `seedcord codegen` now skips a `BuilderComponent` subclass that carries no `@RegisterCommand`, matching the set your bot deploys at startup. An undecorated class previously got a route, and a handler could then typecheck against a command that never reached Discord. ([#296](https://github.com/seedcord/seedcord/pull/296))
- Every gate seedcord ships now sets `summary`. An `or` whose arms all refuse lists what each one required, under the lead line `You need to meet any of these:`. ([`5f4e203`](https://github.com/seedcord/seedcord/commit/5f4e203))
- Hide the internals that were already marked internal. `core.shutdown` and `core.startup` carry `addTask` alone, `core.bus` carries `publish` and the listener methods, and `core.bot` drops the controllers and the lifecycle calls. The http transport's `Core` declares the two lifecycle members, and a core built by `createSeedcord` throws from either one. ([#296](https://github.com/seedcord/seedcord/pull/296))
- `and` and `or` now bracket an arm that is itself a combinator. `or(and(A, B), C)` names itself `(A & B) | C` on a `@Gated` hover and in the compile error for a gate that does not fit its handler. ([`6872865`](https://github.com/seedcord/seedcord/commit/6872865))
- Fix the `Silence` example. It threw from an interaction while the text above it said to throw only in event handlers. ([#296](https://github.com/seedcord/seedcord/pull/296))
- A host whose startup failed used to tear down whichever host had replaced it, taking the replacement's signal handlers and logger config with it. Teardown now runs only for the host that is still live. A second `start()` racing the first rejects with the same error, where it used to resolve a half-started host. ([#293](https://github.com/seedcord/seedcord/pull/293))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.4.3 → 0.5.0
- `@seedcord/event-emitter` 0.1.4 → 0.1.5
- `@seedcord/logger` 0.2.1 → 0.2.2
- `@seedcord/types` 0.9.1 → 0.10.0
- `@seedcord/utils` 0.8.7 → 0.8.8

## 0.3.1

### 💥 Breaking

- Starting a bot or running the CLI on a Node version below the `engines` range now throws, naming the required range and the version you are running. The floor stays at `>=24.11`. ([#288](https://github.com/seedcord/seedcord/pull/288))
- `Plugin`, `PluginLifecycleSpec`, and `PluginOptions` are better documented now with examples and explanations. ([`aa4d4c0`](https://github.com/seedcord/seedcord/commit/aa4d4c0))

    **BREAKING:** `Initializeable` moved to `@seedcord/core/internal`. It describes framework wiring, and `Plugin` already declares `abstract init()` for you. This was supposed to be internal anyway. No one should have been implementing it.

### 🩹 Patch

- A new `commandsDeployed` framework event fires after seedcord deploys your commands, carrying what Discord returned for the global and guild scopes. You can now read the bot's application id from `core.applicationId` on both transports. ([#289](https://github.com/seedcord/seedcord/pull/289))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.4.2 → 0.4.3
- `@seedcord/utils` 0.8.6 → 0.8.7

## 0.3.0

### 💥 Breaking

- A handler's cache state now follows the `contexts` its command declares, so a command a DM can reach types `interaction.guild` as `Guild | null`. `SlashOptionRegistry` becomes `SlashRegistry`, `ContextMenuHandler` splits into `UserContextMenuHandler` and `MessageContextMenuHandler` with a route decorator each, a paginator's nav handler reads `this.event.guild` as nullable, and a gateway bot registering a guild-capable command without the `Guilds` intent throws at startup. Run `seedcord codegen` after upgrading. This won't affect most commands. ([#283](https://github.com/seedcord/seedcord/pull/283))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.4.1 → 0.4.2

## 0.2.1

### 🩹 Patch

- The gate mismatch compile error now reads `gate 'Name' requires a X handler, and this handler is Y`. The `@see` lines on the gate factories now point at your transport package for `@Gated`. ([#273](https://github.com/seedcord/seedcord/pull/273))
- Updated TSDoc reference generation. ([`1d2f1e3`](https://github.com/seedcord/seedcord/commit/1d2f1e3))

#### 📦 Seedcord packages

- `@seedcord/event-emitter` 0.1.3 → 0.1.4
- `@seedcord/errors` 0.4.0 → 0.4.1
- `@seedcord/logger` 0.2.0 → 0.2.1
- `@seedcord/utils` 0.8.5 → 0.8.6
- `@seedcord/types` 0.9.0 → 0.9.1

## 0.2.0

### 💥 Breaking

- `setEmoji(Emojis.X)` on gateway used to throw through the builder's strict validation. `Emojis.X` now carries `id`, `name`, and `animated`, and the `GuildEmoji` or `ApplicationEmoji` discord.js resolved moved to `Emojis.X.source`, still typed by the codegen tag. `ResolvedEmoji` moved from `@seedcord/http` to `@seedcord/core`. ([`5c7c3e2`](https://github.com/seedcord/seedcord/commit/5c7c3e2))
- Better encapsulate framework internals. ([#253](https://github.com/seedcord/seedcord/pull/253))

    **BREAKING:** `SeedcordError.identifier` is accessed via a symbol now. Older framework versions won't be able to access it anymore. Please update to the latest version.

### 🩹 Patch

- Update log colors in some places. ([`97b62ef`](https://github.com/seedcord/seedcord/commit/97b62ef))
- A WebhookLog report can also set avatarUrl for the webhook now. ([#244](https://github.com/seedcord/seedcord/pull/244))
- These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build. ([`f39cde0`](https://github.com/seedcord/seedcord/commit/f39cde0))
- Use `#` instead of `@` for tsconfig path aliases. ([`a259cdc`](https://github.com/seedcord/seedcord/commit/a259cdc))
- A failed lifecycle phase or plugin dispose now throws an error carrying each underlying failure. ([#249](https://github.com/seedcord/seedcord/pull/249))
- Rewrote package descriptions for all packages. Also added keywords. ([`a8d7b5f`](https://github.com/seedcord/seedcord/commit/a8d7b5f))
- Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link. ([`660a94d`](https://github.com/seedcord/seedcord/commit/660a94d))
- Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all. ([`c50ad6c`](https://github.com/seedcord/seedcord/commit/c50ad6c))
- Every fault now reaches your subscribers. A rare bug used to stay silent while a common one kept throwing on the same route. Webhook cards still group repeats to one a minute, and each carries how many it covers. ([#244](https://github.com/seedcord/seedcord/pull/244))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.4 → 0.4.0
- `@seedcord/logger` 0.1.4 → 0.2.0
- `@seedcord/event-emitter` 0.1.2 → 0.1.3
- `@seedcord/types` 0.8.2 → 0.9.0
- `@seedcord/utils` 0.8.4 → 0.8.5

## 0.1.4

### 💥 Breaking

- envapt is a peer dependency now. Your project and seedcord load one copy, so the framework reads the config you set through `Envapter`. ([`71a0b99`](https://github.com/seedcord/seedcord/commit/71a0b99))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/logger` 0.1.3 → 0.1.4
- `@seedcord/errors` 0.3.3 → 0.3.4
- `@seedcord/event-emitter` 0.1.1 → 0.1.2
- `@seedcord/types` 0.8.1 → 0.8.2
- `@seedcord/utils` 0.8.3 → 0.8.4

## 0.1.3

### 🩹 Patch

- 'reflect-metadata' is a direct dep now. No need to import it at the top. The packages import it in their index files, first thing. ([#237](https://github.com/seedcord/seedcord/pull/237))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.2 → 0.3.3
- `@seedcord/logger` 0.1.2 → 0.1.3
- `@seedcord/utils` 0.8.2 → 0.8.3

## 0.1.2

### 🩹 Patch

- Update comments ([`272b729`](https://github.com/seedcord/seedcord/commit/272b729))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.1 → 0.3.2
- `@seedcord/event-emitter` 0.1.1 → 0.1.2
- `@seedcord/logger` 0.1.1 → 0.1.2
- `@seedcord/types` 0.8.1 → 0.8.2
- `@seedcord/utils` 0.8.1 → 0.8.2

## 0.1.1

### 💥 Breaking

- `@seedcord/http` no longer serves a health endpoint, and `healthCheck` is gone from its config. An unsigned POST to the interactions server answers 401, which covers an uptime check. ([#230](https://github.com/seedcord/seedcord/pull/230))

### 🩹 Patch

- Bump deps. ([#228](https://github.com/seedcord/seedcord/pull/228))
- Both transports now trace the elapsed time of each dispatched interaction and each reply write. ([#234](https://github.com/seedcord/seedcord/pull/234))
- Set all packages' node floor to LTS. ([#228](https://github.com/seedcord/seedcord/pull/228))
- A hot reload now logs one line worded by what changed, `Unloaded` on a delete, `Registered` on a new file, and `Reloaded` with a duration on an edit. ([#231](https://github.com/seedcord/seedcord/pull/231))
- Per-phase lines are now debug and per-task lines are trace. ([#233](https://github.com/seedcord/seedcord/pull/233))
- Now uses the appropriate log levels for logs across the lifecycle of the transports and plugins. ([#233](https://github.com/seedcord/seedcord/pull/233))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.0 → 0.3.1
- `@seedcord/logger` 0.1.0 → 0.1.1
- `@seedcord/types` 0.8.0 → 0.8.1
- `@seedcord/utils` 0.8.0 → 0.8.1
- `@seedcord/event-emitter` 0.1.0 → 0.1.1

## 0.1.0

### 💥 Breaking

- `Commands` and `ContextMenus` join `Emojis` as module-level accessors filled during startup. `Commands` is keyed by slash route and `ContextMenus` splits into `user` and `message`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    **BREAKING:** `bot.emojis`, `bot.commands`, and `bot.mentions` are removed. Import the accessors directly. Reading a key before startup resolves it will throw.

- the component builders are built on `@discordjs/builders`. Import any builder you nest inside a seedcord component from there too, because the copy discord.js re-exports is a separate class that breaks `instanceof`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    **BREAKING:** `ControlCosmetics.emoji` takes an `APIMessageComponentEmoji` such as `{ name: '👍' }`. A bare string no longer type-checks.

- `core.bot` no longer emits events. The four keys moved to `core.bus` as `unhandledInteractionError`, `unhandledEventError`, `anyEvent`, and `anyInteraction`. Register them with `core.bus.on(...)` or a `@Subscribe` subscriber. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    `interactionDispatched` and `responseAttempted` are new, and both carry `interactionId` so a subscriber can join them to calculate durations such as network time. `publish` rejects the framework's own keys.

    **BREAKING:** `AllSubscriptions` is no longer exported. Type a payload with `SubscriptionData<K>` if needed.

- `RequirePermissions`, `RequireBotPermissions`, and `RequireRole` check the payload's effective channel permissions by default. Pass `{ in: 'guild' }` for the previous base-set behavior. They fit modal and event handlers now. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    **BREAKING:** `GateContextBase` is scalar (`userId`, `guildId`, `channelId`, `memberRoleIds`, `memberPermissions`, `appPermissions`, `routeId`). A gate that read `ctx.user`, `ctx.guild`, or `ctx.member` reads the id scalars or annotates a gateway arm.

    `Cooldown` keys its window by route, so a durable store keeps it across restarts.

- the lifecycle phases are renamed and trimmed. `StartupPhase` is `Configuration`, `Login`, `Ready`. `ShutdownPhase` is `Unbind`, `Drain`, `Disconnect`, `Logout`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    **BREAKING:** the coordinators no longer emit events, and nothing replaces them. A task registered with `addTask` runs where the matching event fired. Gateway drains in-flight dispatch before the client disconnects.

    **BREAKING:** `Core` no longer extends `SeedcordInstance`, so `this.core.version`, `username`, `augmentTarget`, and `start()` are gone from handlers. Read them off the instance you constructed.

- Each transport exports a `Plugin` base bound to its own `Core`, so a plugin reads `this.core.bot` on gateway with no `Core` import. A plugin serving either transport extends the base from `@seedcord/core/plugin`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    **BREAKING:** `attach(key, Plugin, ...args)` takes no `startupPhase`, plugin init runs during startup. It rejects a plugin whose declared `transport` or `runtime` the host does not run, and a key matching a framework log channel.

    **BREAKING:** a plugin constructor takes `CoreBase` as its first parameter, `stop()` is now `dispose()`, and `this.logger` comes from the base.

- the `bot/utilities` fetch helpers are removed with their four notices. Call discord.js directly: `client.users.fetch(id)`, `guild.members.fetch({ user: ids })`, `guild.roles.fetch(id)`, `guild.roles.botRoleFor(user)`, and `client.channels.fetch(id)`. `updateMemberRoles` is replaced by `mergeRoles(current, add, remove)`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    **BREAKING:** `HmrModuleHandler` moved to `@seedcord/core/hmr` and no longer takes a `name` option. A failed hot reload restores the file's last-good version, which `hmr.rollback: false` turns off in the config file.

    **BREAKING:** `@seedcord/kit` is removed, its exports come from `@seedcord/core`.

- Node 24.3 or newer is required. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

### ✨ Minor

- New `@seedcord/core`, the transport-agnostic framework surface both `@seedcord/gateway` and `@seedcord/http` build on and re-export. The transport packages re-exporting most things from it though. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

### 🩹 Patch

- Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))
- Require envapt `^8.1.0`. An older pin in your own bot installs a second copy whose `Envapter` state splits from the framework's. ([#196](https://github.com/seedcord/seedcord/pull/196))

#### 📦 Seedcord packages

- `@seedcord/logger` 0.1.0 (new)
- `@seedcord/event-emitter` 0.1.0 (new)
- `@seedcord/types` 0.7.2-next.0 → 0.8.0
- `@seedcord/utils` 0.7.1-next.0 → 0.8.0
- `@seedcord/errors` 0.2.2-next.0 → 0.3.0
