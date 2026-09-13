# @seedcord/gateway

## 0.6.0

### 💥 Breaking

- Fixed `eventDispatching` firing without a matching `eventDispatched` once a `frequency: 'once'` handler has run. seedcord published the first key alone on every later message, so a subscriber pairing them leaked an entry each time. ([#311](https://github.com/seedcord/seedcord/pull/311))
- Fixed the cooldown on a handler registered on two buttons. Because its route id joined both into `button:confirm,cancel`, clicking either one put both on cooldown. Now it would just be `button:confirm`, for example. ([#311](https://github.com/seedcord/seedcord/pull/311))
- `@RegisterEventMiddleware` replaces the `Middleware(type, priority, options)` decorator. seedcord now throws at load when two event middleware classes share a name. ([#310](https://github.com/seedcord/seedcord/pull/310))

    Both middleware bases gained an `after()` that runs on every middleware whose `execute()` started, even on a refused dispatch.

### ✨ Minor

- Added `dispatchId` to every bus key a dispatch publishes, and `dispatch.id` to the bag behind it. A fault used to carry no way back to the dispatch that raised it, so pairing one with its `interactionDispatched` meant guessing from the route and the clock. Key a store on it to line up a dispatch, its writes, and its faults. ([#311](https://github.com/seedcord/seedcord/pull/311))
- Added `eventDispatched`, which fires once an event's handlers settle and carries the class name and outcome of each one. An event used to report only that it started, so a handler that failed showed up nowhere. A fire that runs no handler stays quiet, matching `eventDispatching`. ([#311](https://github.com/seedcord/seedcord/pull/311))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/core` 0.6.0 → 0.7.0
- `@seedcord/types` 0.12.0 → 0.13.0
- `@seedcord/errors` 0.7.0 → 0.8.0
- `@seedcord/logger` 0.3.1 → 0.3.2
- `@seedcord/rate-limiter` 0.1.7 → 0.1.8
- `@seedcord/utils` 0.8.10 → 0.8.11
- `@seedcord/custom-id` 0.2.0 → 0.2.1

## 0.5.1

### 🩹 Patch

- The transport packages now export `prefixOf`, `decodeFor`, and the custom-id types. Reading a raw customId no longer needs `@seedcord/custom-id` as a direct dependency. ([`0988f67`](https://github.com/seedcord/seedcord/commit/0988f67))
- Halved the drain window to 5000ms for http bots, the same window gateway uses. An http shutdown now completes there, where it used to report a failure. Both transports log how many handlers were still running when the window closed. ([#309](https://github.com/seedcord/seedcord/pull/309))

#### 📦 Seedcord packages

- `@seedcord/core` 0.5.0 → 0.6.0
- `@seedcord/custom-id` 0.1.1 → 0.2.0
- `@seedcord/errors` 0.6.0 → 0.7.0
- `@seedcord/types` 0.11.0 → 0.12.0
- `@seedcord/logger` 0.3.0 → 0.3.1
- `@seedcord/utils` 0.8.9 → 0.8.10
- `@seedcord/rate-limiter` 0.1.6 → 0.1.7

## 0.5.0

### 💥 Breaking

- Select menus get one decorator and one base per kind, so `@UserMenuRoute` pairs with `UserMenuHandler` as an example. `@SelectMenuRoute` and `SelectMenuKind` are removed, and `SelectMenuHandler` stays as the shared base your kind's base extends. Each base declares only the members its own menu resolves. Check the updated guide page for select menus. ([#303](https://github.com/seedcord/seedcord/pull/303))

### ✨ Minor

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

## 0.4.1

### 🩹 Patch

- `CustomId` moved to `@seedcord/custom-id`. Core still exports it under the same name. The new `setCustomIdErrors` swaps the card a stale or corrupt button shows. ([#299](https://github.com/seedcord/seedcord/pull/299))

#### 📦 Seedcord packages

- `@seedcord/custom-id` 0.1.0 (new)
- `@seedcord/core` 0.4.0 → 0.4.1
- `@seedcord/types` 0.10.0 → 0.10.1
- `@seedcord/errors` 0.5.0 → 0.5.1

## 0.4.0

### 💥 Breaking

- an error that reports a bad argument now throws `SeedcordTypeError` or `SeedcordRangeError`. Update any `isSeedcordError(error, 'SeedcordError', code)` call naming one of those codes, since branching on the code alone is unaffected. ([`1bf7d89`](https://github.com/seedcord/seedcord/commit/1bf7d89))

    An invalid plugin lifecycle timeout throws the new `PluginInvalidLifecycleTimeout` code.

- The `anyEvent` bus key is now `eventDispatching`. It was a misnomer to call it `anyEvent` because it was only triggered for events with a registered handler. ([`3f74e62`](https://github.com/seedcord/seedcord/commit/3f74e62))
- `start(handler, n)` opens a paginator on any page, and `page(handler, n)` renders one without sending it. A source you write yourself takes `PageSource<Item>`, which each transport exports with its page context already bound. ([#295](https://github.com/seedcord/seedcord/pull/295))

    **BREAKING:** `Paginator.page` now takes the handler. `PaginatorBase.page` is `protected buildPage`, and core's three source symbols gained a `Base` suffix so the plain names belong to the transports.

### ✨ Minor

- A context menu handler registered for several command names runs one arm per name through `match` and reads the fired name from `commandName`. On gateway each arm receives the target narrowed to that one command's cache state. ([#292](https://github.com/seedcord/seedcord/pull/292))
- Modal and select menu handlers read their inputs the same way on both transports. `this.fields` reads a modal's submitted values by custom id. A select handler carries `values` plus the resolved `users`, `members`, `roles`, and `channels` for its kind. ([#294](https://github.com/seedcord/seedcord/pull/294))
- Every repliable handler now carries its reply sender on a public `sender` property, replacing the internal `getSender()`. `ReplySender`, `BaseReplySender`, and `ModalLike` are also exported now. ([`3ff40e7`](https://github.com/seedcord/seedcord/commit/3ff40e7))

### 🩹 Patch

- Fixed `Seedcord.attach()` not showing up in the documentation. ([`2cb3c87`](https://github.com/seedcord/seedcord/commit/2cb3c87))
- Export the winston sinks from both node entries. ([#296](https://github.com/seedcord/seedcord/pull/296))
- `EventHandler.match` threw `EventMatchArmMissing` for an unregistered event only when the name missed `Object.prototype`. An event named `toString` or `constructor` found the prototype's method and called it. This couldn't happen in the first place, but still was inconsistent behavior. ([#292](https://github.com/seedcord/seedcord/pull/292))
- Every gate seedcord ships now sets `summary`. An `or` whose arms all refuse lists what each one required, under the lead line `You need to meet any of these:`. ([`5f4e203`](https://github.com/seedcord/seedcord/commit/5f4e203))
- Hide the internals that were already marked internal. `core.shutdown` and `core.startup` carry `addTask` alone, `core.bus` carries `publish` and the listener methods, and `core.bot` drops the controllers and the lifecycle calls. The http transport's `Core` declares the two lifecycle members, and a core built by `createSeedcord` throws from either one. ([#296](https://github.com/seedcord/seedcord/pull/296))
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

## 0.3.1

### 🩹 Patch

- A new `commandsDeployed` framework event fires after seedcord deploys your commands, carrying what Discord returned for the global and guild scopes. You can now read the bot's application id from `core.applicationId` on both transports. ([#289](https://github.com/seedcord/seedcord/pull/289))

#### 📦 Seedcord packages

- `@seedcord/core` 0.3.0 → 0.3.1
- `@seedcord/errors` 0.4.2 → 0.4.3
- `@seedcord/utils` 0.8.6 → 0.8.7

## 0.3.0

### 💥 Breaking

- A handler's cache state now follows the `contexts` its command declares, so a command a DM can reach types `interaction.guild` as `Guild | null`. `SlashOptionRegistry` becomes `SlashRegistry`, `ContextMenuHandler` splits into `UserContextMenuHandler` and `MessageContextMenuHandler` with a route decorator each, a paginator's nav handler reads `this.event.guild` as nullable, and a gateway bot registering a guild-capable command without the `Guilds` intent throws at startup. Run `seedcord codegen` after upgrading. This won't affect most commands. ([#283](https://github.com/seedcord/seedcord/pull/283))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/core` 0.2.1 → 0.3.0
- `@seedcord/errors` 0.4.1 → 0.4.2

## 0.2.1

### 💥 Breaking

- A transport plugin base no longer accepts `transport: 'any'` and the gateway base no longer accepts `runtime: 'edge'`. Extend `@seedcord/core/plugin` for a plugin that runs on either transport. This IS a bug fix. This should not have been allowed before. ([`9c8e66a`](https://github.com/seedcord/seedcord/commit/9c8e66a))

### 🩹 Patch

- Updated TSDoc reference generation. ([`1d2f1e3`](https://github.com/seedcord/seedcord/commit/1d2f1e3))

#### 📦 Seedcord packages

- `@seedcord/core` 0.2.0 → 0.2.1
- `@seedcord/event-emitter` 0.1.3 → 0.1.4
- `@seedcord/rate-limiter` 0.1.3 → 0.1.4
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

## 0.1.4

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

## 0.1.3

### 🩹 Patch

- 'reflect-metadata' is a direct dep now. No need to import it at the top. The packages import it in their index files, first thing. ([#237](https://github.com/seedcord/seedcord/pull/237))
- Also export the ComponentHandler from handlers index for AE ([`e894fbf`](https://github.com/seedcord/seedcord/commit/e894fbf))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.2 → 0.3.3
- `@seedcord/logger` 0.1.2 → 0.1.3
- `@seedcord/core` 0.1.2 → 0.1.3
- `@seedcord/utils` 0.8.2 → 0.8.3

## 0.1.2

### 🩹 Patch

- Update comments ([`272b729`](https://github.com/seedcord/seedcord/commit/272b729))

#### 📦 Seedcord packages

- `@seedcord/core` 0.1.1 → 0.1.2
- `@seedcord/errors` 0.3.1 → 0.3.2
- `@seedcord/event-emitter` 0.1.1 → 0.1.2
- `@seedcord/logger` 0.1.1 → 0.1.2
- `@seedcord/rate-limiter` 0.1.1 → 0.1.2
- `@seedcord/types` 0.8.1 → 0.8.2
- `@seedcord/utils` 0.8.1 → 0.8.2

## 0.1.1

### 🩹 Patch

- Bump deps. ([#228](https://github.com/seedcord/seedcord/pull/228))
- Both transports now trace the elapsed time of each dispatched interaction and each reply write. ([#234](https://github.com/seedcord/seedcord/pull/234))
- Set all packages' node floor to LTS. ([#228](https://github.com/seedcord/seedcord/pull/228))
- A hot reload now logs one line worded by what changed, `Unloaded` on a delete, `Registered` on a new file, and `Reloaded` with a duration on an edit. ([#231](https://github.com/seedcord/seedcord/pull/231))
- A failed startup no longer drops sinks installed through `installSink`, so the `seedcord dev` log view keeps working after one. ([#231](https://github.com/seedcord/seedcord/pull/231))
- Now uses the appropriate log levels for logs across the lifecycle of the transports and plugins. ([#233](https://github.com/seedcord/seedcord/pull/233))

#### 📦 Seedcord packages

- `@seedcord/core` 0.1.0 → 0.1.1
- `@seedcord/errors` 0.3.0 → 0.3.1
- `@seedcord/logger` 0.1.0 → 0.1.1
- `@seedcord/types` 0.8.0 → 0.8.1
- `@seedcord/utils` 0.8.0 → 0.8.1
- `@seedcord/event-emitter` 0.1.0 → 0.1.1
- `@seedcord/rate-limiter` 0.1.0 → 0.1.1

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

- the gateway framework moved from `seedcord` to `@seedcord/gateway`. Its surface changed substantially in this release, so read the entries below before upgrading. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))
- Each transport exports a `Plugin` base bound to its own `Core`, so a plugin reads `this.core.bot` on gateway with no `Core` import. A plugin serving either transport extends the base from `@seedcord/core/plugin`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    **BREAKING:** `attach(key, Plugin, ...args)` takes no `startupPhase`, plugin init runs during startup. It rejects a plugin whose declared `transport` or `runtime` the host does not run, and a key matching a framework log channel.

    **BREAKING:** a plugin constructor takes `CoreBase` as its first parameter, `stop()` is now `dispose()`, and `this.logger` comes from the base.

- the `bot/utilities` fetch helpers are removed with their four notices. Call discord.js directly: `client.users.fetch(id)`, `guild.members.fetch({ user: ids })`, `guild.roles.fetch(id)`, `guild.roles.botRoleFor(user)`, and `client.channels.fetch(id)`. `updateMemberRoles` is replaced by `mergeRoles(current, add, remove)`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    **BREAKING:** `HmrModuleHandler` moved to `@seedcord/core/hmr` and no longer takes a `name` option. A failed hot reload restores the file's last-good version, which `hmr.rollback: false` turns off in the config file.

    **BREAKING:** `@seedcord/kit` is removed, its exports come from `@seedcord/core`.

- Handlers reply through members on the base, `this.reply`, `defer`, `followUp`, `edit`, `delete`, and `send`, with `update` and `deferUpdate` on component kinds and `showModal` on non-modal kinds. Autocomplete handlers define `this.respond(choices)`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    **BREAKING:** `ReplySender` is no longer exported. An unmatched interaction now gets a reply from an unhandled default, and a failed `getConfirmation` or `Paginator.start` send throws into the fault boundary.

- a `WebhookLog` subclass declares its url's env var with `@WebhookUrl` and implements `report()` returning `{ username?, components, files? }`. The abstract `webhook` field is removed. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    An unset url disables that reporter with a boot warning. A malformed one throws at boot, and a webhook Discord does not recognise stops the boot.

    **BREAKING:** the `unknownException` payload carries plain `guild` and `user` objects. Fetch anything else through the client.

- Node 24.3 or newer is required. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

### 🩹 Patch

- Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))
- Require envapt `^8.1.0`. An older pin in your own bot installs a second copy whose `Envapter` state splits from the framework's. ([#196](https://github.com/seedcord/seedcord/pull/196))
- Duplicate interaction routes and same-named middleware classes now throw at registration, where the later one used to overwrite the earlier silently. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    A `once` event handler no longer runs twice when its event fires concurrently. A throwing `core.bus.on()` listener no longer escapes `publish` or skips the listeners after it. Editing a subscriber file hot-reloads it in dev.

#### 📦 Seedcord packages

- `@seedcord/core` 0.1.0-next.2 → 0.1.0
- `@seedcord/logger` 0.1.0 (new)
- `@seedcord/event-emitter` 0.1.0 (new)
- `@seedcord/rate-limiter` 0.1.0-next.0 → 0.1.0
- `@seedcord/types` 0.7.2-next.0 → 0.8.0
- `@seedcord/utils` 0.7.1-next.0 → 0.8.0
- `@seedcord/errors` 0.2.2-next.0 → 0.3.0

---

#### Versions below were published as `seedcord` before the split into scoped packages.

---

## 0.16.0-next.4

### 💥 Breaking

- New `CoreBase` in `@seedcord/core` with `config` and `rateLimiter`. The gateway `Core` extends it. `core.rateLimiter` is an async `IRateLimiter` backed by `MemoryRateLimiter`. `seedcord` re-exports `@seedcord/rate-limiter`. `SeedcordInstance` adds `version` and moves to `@seedcord/types/internal`. ([#175](https://github.com/seedcord/seedcord/pull/175))

    **BREAKING:** `@seedcord/types` no longer depends on discord.js. `clientOptions` and `events` move from `BotConfig` to `GatewayBotConfig` in `seedcord`, and the `Seedcord` constructor takes `GatewayConfig`. `Config.botColor` is a `BotColor`.

    **BREAKING:** `@seedcord/services` no longer exports `RateLimiter`, `RateLimitWindow`, or `RateLimitResult`. Use `MemoryRateLimiter` from `@seedcord/rate-limiter` and the types from `@seedcord/types`. `hit` is replaced by the async `charge`, and results carry `resetAt`, `remaining`, `retryAfterMs`.

- Gates move to `@seedcord/core`: `defineGate`/`defineEffectGate`, `and`/`or`, `OwnerOnly`/`GuildOnly`/`DmOnly`/`Cooldown`. `InteractionGateContext`/`EventGateContext`, the cache-reading gates, and `@Gated` stay in `seedcord`, which re-exports the moved pieces. ([#175](https://github.com/seedcord/seedcord/pull/175))

    **BREAKING:** `GateContextBase` is scalar: `core`, `userId`, `guildId`, `channelId`, `memberRoleIds`, `memberPermissions`. A gate that read `ctx.user`/`ctx.guild`/`ctx.member` now reads the id scalars or annotates a gateway arm.

### 🩹 Patch

- Move the interaction metadata keys, the gate notices, and `RegisterCommand` from `seedcord` to `@seedcord/core`. `seedcord` re-exports them. `OnCooldown` is created with `resetAt` (renamed from the unpublished `expires`). ([#175](https://github.com/seedcord/seedcord/pull/175))

#### 📦 Seedcord packages

- `@seedcord/core` 0.1.0-next.1 → 0.1.0-next.2
- `@seedcord/types` 0.8.0-next.2 → 0.8.0-next.3
- `@seedcord/services` 0.9.0-next.3 → 0.9.0-next.4
- `@seedcord/rate-limiter` 0.1.0-next.0 (new)
- `@seedcord/utils` 0.8.0-next.2 → 0.8.0-next.3
- `@seedcord/errors` 0.3.0-next.1 → 0.3.0-next.2

## 0.16.0-next.3

### 💥 Breaking

- Build seedcord's component builders on `@discordjs/builders`. Import any builder you nest inside a seedcord component from `@discordjs/builders` too. The copy discord.js re-exports is a separate class that breaks `instanceof` and `toJSON`. ([#171](https://github.com/seedcord/seedcord/pull/171))

    **BREAKING:** `ControlCosmetics.emoji` (on `PaginatorControls.button`) narrows from `ComponentEmojiResolvable` to `APIMessageComponentEmoji`. Pass an emoji object like `{ name: '👍' }`. A bare string no longer type-checks.

- Dissolve `@seedcord/kit` into `@seedcord/core`. The Notice stop tree, the customId codec, and pagination move into `@seedcord/core`, joining the component builders already there, and `@seedcord/kit` is removed. ([#173](https://github.com/seedcord/seedcord/pull/173))

    **BREAKING:** `@seedcord/kit` is removed. Import its former exports (`Notice`, `Fault`, `Silence`, `CustomId`, `paginate`, `PageView`, `BuilderComponent`, `RowComponent`) from `seedcord` or `@seedcord/core`.

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.0-next.1 → 0.3.0-next.2
- `@seedcord/core` 0.1.0-next.0 → 0.1.0-next.1
- `@seedcord/services` 0.9.0-next.2 → 0.9.0-next.3
- `@seedcord/types` 0.8.0-next.1 → 0.8.0-next.2
- `@seedcord/utils` 0.8.0-next.1 → 0.8.0-next.2

## 0.16.0-next.2

### 💥 Breaking

- The codegen registry types (`SlashOptionRegistry`, `SlashOption`, `OptionKind`, `UserContextMenuRegistry`, `MessageContextMenuRegistry`) move from `@seedcord/types` to `@seedcord/core`. ([#169](https://github.com/seedcord/seedcord/pull/169))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/core` 0.1.0-next.0 (new)
- `@seedcord/types` 0.8.0-next.1 → 0.8.0-next.2
- `@seedcord/kit` 0.3.0-next.1 → 0.3.0-next.2
- `@seedcord/services` 0.9.0-next.1 → 0.9.0-next.2
- `@seedcord/utils` 0.8.0-next.1 → 0.8.0-next.2

## 0.16.0-next.1

### 💥 Breaking

- require Node 24. `engines.node` moves to `>=24` so the framework can use Node 24 APIs like `Error.isError` and `RegExp.escape`. Upgrade your runtime to Node 24 or newer. ([#168](https://github.com/seedcord/seedcord/pull/168))

### 🩹 Patch

- Modernize internals via the curated eslint-plugin-unicorn rules (modern array, string, and number APIs, and `Error.isError` in error checks). Behavior-preserving, no public API change. ([#168](https://github.com/seedcord/seedcord/pull/168))

#### 📦 Seedcord packages

- `@seedcord/services` 0.8.3-next.0 → 0.9.0-next.1
- `@seedcord/utils` 0.7.1-next.0 → 0.8.0-next.1
- `@seedcord/kit` 0.2.1-next.0 → 0.3.0-next.1
- `@seedcord/types` 0.7.2-next.0 → 0.8.0-next.1
- `@seedcord/errors` 0.2.2-next.0 → 0.3.0-next.1

## 0.16.0-next.0

### ✨ Minor

- Decouple HMR from vite's `import.meta.hot` behind a typed `DevChannel`. Drop the `HmrModuleHandler` `name` option where you construct the handler, it was only an internal cache key and is no longer accepted. ([#163](https://github.com/seedcord/seedcord/pull/163))
- A failed hot-reload now restores the file's last-good version, so the handler stays registered through a broken edit until the next good save. Disable it with `hmr.rollback: false` in `seedcord.config.ts`. ([#163](https://github.com/seedcord/seedcord/pull/163))

### 🩹 Patch

- Register the subscriber bus for HMR so editing a subscriber file hot-reloads it in dev. The wiring existed but was never invoked, so subscriber edits silently needed a full restart. ([#163](https://github.com/seedcord/seedcord/pull/163))
- Throw on a duplicate interaction route, and on two interaction middleware classes sharing a name. Before, the later registration silently overwrote the earlier one. ([#163](https://github.com/seedcord/seedcord/pull/163))
- Fix a `once` event handler running twice when the same event fired concurrently. Two overlapping fires both passed the spent-handler check before either marked it spent. ([#163](https://github.com/seedcord/seedcord/pull/163))

#### 📦 Seedcord packages

- `@seedcord/kit` 0.2.0 → 0.2.1-next.0
- `@seedcord/services` 0.8.2 → 0.8.3-next.0
- `@seedcord/errors` 0.2.1 → 0.2.2-next.0
- `@seedcord/types` 0.7.1 → 0.7.2-next.0
- `@seedcord/utils` 0.7.0 → 0.7.1-next.0

## 0.15.0

### ✨ Minor

- Add pagination. `Paginator` renders paged Components V2 replies with first/prev/next/last controls, backed by `ArraySource` for an in-memory list or `CursorSource` for one-page-at-a-time fetches. Each control encodes its target page, so clicks keep working after a restart. The pure `paginate()` math and the `PageView` shape ship from `@seedcord/kit` for headless use. ([#149](https://github.com/seedcord/seedcord/pull/149))
- Rename the `SelectHandler` base class to `SelectMenuHandler`, matching `SelectMenuRoute` and `SelectMenuKind`. Select-menu handlers should now extend `SelectMenuHandler`. ([#149](https://github.com/seedcord/seedcord/pull/149))

### 🩹 Patch

- `@internal` now actually hides `__componentDefs` from the docs. ([`781eb3d`](https://github.com/seedcord/seedcord/commit/781eb3d))
- mark some exports as internal so they don't show up in the docs ([#152](https://github.com/seedcord/seedcord/pull/152))
- add examples to some utils that should have them ([#152](https://github.com/seedcord/seedcord/pull/152))
- `__componentDefs` phantom field should be internal ([`51006e2`](https://github.com/seedcord/seedcord/commit/51006e2))
- update LICENSE copyright year ([#152](https://github.com/seedcord/seedcord/pull/152))

#### 📦 Seedcord packages

- `@seedcord/kit` 0.1.1 → 0.2.0
- `@seedcord/services` 0.8.1 → 0.8.2
- `@seedcord/utils` 0.6.1 → 0.7.0
- `@seedcord/errors` 0.2.0 → 0.2.1
- `@seedcord/types` 0.7.0 → 0.7.1

## 0.14.0

### ✨ Minor

- Add a typed `bot.mentions` accessor that maps each registered slash route to a clickable command mention like `</name:id>`. A command deployed to two or more guilds falls back to plain `/name` text. `setCommands` now returns the deployed command collections. ([#147](https://github.com/seedcord/seedcord/pull/147))
- `EmojiInjector` now throws at startup when a configured emoji cannot be resolved, instead of silently storing the raw config name. It collects every unresolvable emoji and reports them in one error, so the whole config is fixable in one pass. `bot.emojis` is narrowed to resolved emoji objects (the `string` fallback is gone), so a saved emoji is always usable. ([#147](https://github.com/seedcord/seedcord/pull/147))
- Type configured emojis precisely. `seedcord codegen` now writes an `EmojiMap` block that tags each key `'application'` or `'guild'`, and `Emojis.X` (and `bot.emojis.X`) resolves to the exact `ApplicationEmoji` or `GuildEmoji` rather than the union. Configure `config.bot.emojis` with the new `EmojiConfig` type and run `seedcord codegen`, you no longer hand-write the `EmojiMap` augmentation. The generated file is renamed from `command-registry.gen.ts` to `seedcord-gen.d.ts`, so delete the old file and re-run `seedcord codegen`. ([#147](https://github.com/seedcord/seedcord/pull/147))

### 🩹 Patch

- Bump non-breaking runtime dependencies (envapt 6.0.2, discord-api-types 0.38.49, mongoose 9.7.1, ink 7.1.0, typescript-eslint 8.61.1, tailwindcss peer 4.3.1). ([`043e2a1`](https://github.com/seedcord/seedcord/commit/043e2a1))
- Add `seedcord commands` to find and delete guild application commands that duplicate a global command (or, with `--purge`, every command in a guild). Run it with no flags for a guided wizard, or headlessly with `--clean --guild <ids>` or `--all-guilds` plus `--apply`, `--purge`, and `--yes`. It reads deployed state over REST, dry-runs by default, and never touches global commands. ([#147](https://github.com/seedcord/seedcord/pull/147))

#### 📦 Seedcord packages

- `@seedcord/services` 0.8.0 → 0.8.1
- `@seedcord/kit` 0.1.0 → 0.1.1
- `@seedcord/utils` 0.6.0 → 0.6.1
- `@seedcord/errors` 0.1.0 → 0.2.0
- `@seedcord/types` 0.6.0 → 0.7.0

## 0.13.0

### ✨ Minor

- Move error handling from the per-method `@Catchable`/`@EventCatchable` decorators to one controller boundary that catches every throw across the interaction and event lifecycle (middleware, construct, gate phase, execute). ([#143](https://github.com/seedcord/seedcord/pull/143))

    - A `Notice` renders through `ReplySender`, a reporting `Notice` and a raw error publish to `handledException`/`unknownException`, and a `Silence` stops silently. Events are report-only and never auto-reply.
    - Removes `@Catchable`, `@EventCatchable`, and the `setBreak`/`setErrored`/`shouldBreak`/`hasErrors` handler flags. Throw a `Silence` to stop a handler without a reply.
    - The default handled-exception subscriber requires the `HANDLED_EXCEPTION_WEBHOOK_URL` env var at boot.
    - `FaultSource` gains an `event` arm. Duplicate faults are throttled to one report per minute per route.
    - `ignoreCustomIds` is now `CustomIdMatcher[]`, matched against the raw customId. Adds `errors.ignoreApiCodes` and `errors.ignoreEventApiCodes` (both empty by default, so a handler's own discord.js api error reports).

- Rename `SelectMenuType` to `SelectMenuKind` because it clashes with djs' export ([#144](https://github.com/seedcord/seedcord/pull/144))
- Replace the database error path with a general `Fault`. ([#143](https://github.com/seedcord/seedcord/pull/143))

    - `DatabaseError` is removed. `Fault` replaces it, a public `Notice` in `@seedcord/kit` whose `report` defaults true and whose constructor takes `{ cause }`. A service catch rethrows `new Fault({ cause: e })`.
    - `@WrapDatabaseError` and `throwDatabaseError` are removed.

    To migrate, replace `@WrapDatabaseError` and `throwDatabaseError` with a `try`/`catch` in the service method that rethrows `new Fault({ cause: e })` or write a decorator that does the same.

- Add declarative preconditions and remove the manual check API. ([#143](https://github.com/seedcord/seedcord/pull/143))

    - `@Gated(...)` runs gate values before a handler. Build gates with `defineGate` and `defineEffectGate`, compose them with `and` and `or`, and use the built-in catalog (`Cooldown`, `OwnerOnly`, `GuildOnly`, `DmOnly`, `Nsfw`, `RequirePermissions`, `RequireBotPermissions`, `RequireRole`, `IgnoreBots`, and their inverses). A gate refuses by throwing a `Notice`.
    - `@Checkable`, `WithChecks`, and the user-written `runChecks` are removed.

    To migrate, move a reusable check into a `@Gated(...)` gate, or inline a one-off as `throw new SomeNotice()` in `execute()`.

- remove framework Notices from public exports ([#144](https://github.com/seedcord/seedcord/pull/144))
- Rework the error model around one base class and one reply shape. ([#143](https://github.com/seedcord/seedcord/pull/143))

    - `CustomError` is renamed to `Notice`, the abstract base you extend and throw. The `emit` field is renamed to `report`. The `response` field (a `readonly EmbedBuilder`) is replaced by a `render(ctx)` method that returns a `ReplyResponse`.
    - `ReplyResponse` is a new public type in `@seedcord/types`, a v2 reply shape of `components` plus optional `allowedMentions` and `files`. Discord's components-v2 flag forbids `content`, `embeds`, `stickers`, and `poll`. `RenderContext` is the new render argument.

    To migrate, rename `CustomError` to `Notice`, rename `emit` to `report`, and replace the `response` field with a `render(ctx)` method returning a `ReplyResponse`.

- Rename the cooldown store and land the gate leaf prep. ([#143](https://github.com/seedcord/seedcord/pull/143))

    - In `@seedcord/services`, `CooldownManager` is renamed to `RateLimiter` (`CooldownWindow` and `CooldownResult` become `RateLimitWindow` and `RateLimitResult`), and the `@seedcord/services/internal` subpath is removed. The throw-based `check()` API becomes `hit(key, { delay, limit? })`.
    - In `seedcord`, the store is reached at `core.rateLimiter`.
    - In `@seedcord/utils`, add `parseDuration`, the `ValidDuration` template type, and `toEpochSeconds`.
    - In `@seedcord/types`, add `Config.ownerIds` and the `Epoch` types (`EpochMs` and `EpochSec`).

- Clean up the handler API surface. ([#143](https://github.com/seedcord/seedcord/pull/143))

    - `getConfirmation(interaction, prompt, options?)` replaces the Confirmable decorator and its types. Gate an action with `if (!(await getConfirmation(...))) return`.
    - `populate()` is removed. The handler lifecycle runs construct, then gates, then `execute()`.
    - `attemptSendDM` and `sendInText` are removed. Resolve a channel with `fetchText`.

    To migrate, replace the Confirmable decorator with `getConfirmation`, move `populate()` setup to the top of `execute()`, and drop `attemptSendDM` and `sendInText`.

- Make IgnoreBots a Gate const instead of a Gate function ([#144](https://github.com/seedcord/seedcord/pull/144))

### 🩹 Patch

- fix mention of `SeedcordError`s in TSDoc ([#144](https://github.com/seedcord/seedcord/pull/144))
- some TSDoc updates ([#144](https://github.com/seedcord/seedcord/pull/144))
- Upgrade the envapt runtime dependency to 6.0.0. ([`180b5a9`](https://github.com/seedcord/seedcord/commit/180b5a9))
- HMR now explicitly also runs in the test environment, not only in development. ([`74ea604`](https://github.com/seedcord/seedcord/commit/74ea604))
- Harden interaction routing against metadata-key collisions. Route metadata is now keyed by unique Symbols instead of plain strings, so a third-party `Reflect.defineMetadata` call using a generic string key can no longer overwrite a handler's routes. ([#144](https://github.com/seedcord/seedcord/pull/144))

#### 📦 Seedcord packages

- `@seedcord/services` 0.7.1 → 0.8.0
- `@seedcord/errors` 0.1.0 (new)
- `@seedcord/kit` 0.1.0 (new)
- `@seedcord/types` 0.5.0 → 0.6.0
- `@seedcord/utils` 0.5.0 → 0.6.0

## 0.12.0

### 💥 Breaking

- `InteractionHandler` is no longer part of the public API. Every interaction kind now has its own typed base, so extend `SlashHandler`, `ButtonHandler`, `ModalHandler`, `SelectHandler`, or `AutocompleteHandler` instead. ([#139](https://github.com/seedcord/seedcord/pull/139))
- removed the public `buildSlashRoute` builder and the `CommandRouteString` type from `seedcord`. Slash routes are autocompletable typed literals from the generated registry now, so write them directly, e.g. `@SlashRoute('demo/setup')`. ([#139](https://github.com/seedcord/seedcord/pull/139))
    - Moved the route-string assembly to `@seedcord/utils/internal`, shared by the framework and `seedcord codegen` so a dispatched interaction and a generated registry key can never diverge. The interaction-to-route extraction is internal now.
    - Removed the unused `SeedcordErrorCode.UtilInvalidSlashRouteArgument`.

- Add `checkbox`, `checkbox_group`, `checkbox_group_option`, `radio_group`, and `radio_group_option` builders to the public API. ([#136](https://github.com/seedcord/seedcord/pull/136))
    - **BREAKING:** Rename `ActionRowComponentType` to `RowType` for consistency with `BuilderType`

- removed `buildCustomId` from the component builders. Encode a customId with the `CustomId` chain instead, `new CustomId('approve').snowflake('userId').encode({ userId })`, which the typed component handlers decode back through `this.params`. ([#139](https://github.com/seedcord/seedcord/pull/139))
- Add a typed autocomplete handler. Extend `AutocompleteHandler<'route'>`, branch on the focused field with `this.match`, and each arm receives the focused partial value plus a `respond` pinned to that field's choice type, so a mismatched choice value is a compile error and a missing field arm is a compile error. The focused field set comes from the options that called `setAutocomplete(true)`, which `seedcord codegen` records in the registry. ([#139](https://github.com/seedcord/seedcord/pull/139))
    - Read already-entered sibling options through `this.options`, restricted to the kinds Discord resolves during autocomplete (string, integer, number, boolean) and every read returns `T | null` since a sibling is partial while the user is still typing. The focused value is always a string, even for an integer or number option, because Discord delivers the partial input unparsed. One handler can serve several commands with `@AutocompleteRoute('search', 'find')`, and `this.route` reports which one fired.
    - **BREAKING:** `AutocompleteHandler` is now generic over its command route(s) and `@AutocompleteRoute` takes command routes only, replacing the previous per-field `(commandRoutes, focusedFields)` registration that registered one handler per field. Branch on the focused field with `this.match` instead.

- Add end-to-end typed context menus. Author a context-menu command as a plain discord.js `ContextMenuCommandBuilder`, run `seedcord codegen` to emit committed `UserContextMenuRegistry` and `MessageContextMenuRegistry` augmentations, then handlers extend `ContextMenuHandler<ApplicationCommandType.User>` or `ContextMenuHandler<ApplicationCommandType.Message>` and read `this.target`, a `User` for a user menu or a `Message` for a message menu, plus `this.targetMember` on user menus. `@ContextMenuRoute(ApplicationCommandType.Message, 'Report Message')` checks the name against its kind's registry and is cross-checked against the handler generic both directions, so a typo or a kind mismatch is a compile error. The two registries stay separate because Discord allows a user command and a message command to share a name. ([#139](https://github.com/seedcord/seedcord/pull/139))
    - Warn at boot for any registered context-menu command with no handler, parallel to the slash route guard.
    - **BREAKING:** `@ContextMenuRoute` now takes `(ApplicationCommandType.User | ApplicationCommandType.Message, ...names)` rather than `('user' | 'message', string | string[])`, and a context-menu handler extends the new `ContextMenuHandler` base rather than `InteractionHandler`.
    - **BREAKING:** `seedcord codegen` writes `command-registry.gen.ts` rather than `slash-registry.gen.ts`, since one file now holds the slash and context-menu registries. Delete the old file and re-run `seedcord codegen`.

- Add a typed customId system for buttons, modals, and select menus. Define a customId once with `new CustomId('approve').snowflake('userId').oneOf('action', ['approve', 'deny'])`, encode it onto a component, and read the decoded values back in the handler through `this.params` (single route) or `this.match` (several routes), fully typed end to end. Component handlers extend the new `ButtonHandler`, `ModalHandler`, and `SelectHandler` bases. ([#139](https://github.com/seedcord/seedcord/pull/139))
    - Components route by a stable prefix, so a customId minted before its shape changed still reaches its handler and replies with a `StaleCustomId` message instead of failing silently.
    - **BREAKING:** `@ButtonRoute`, `@ModalRoute`, and `@SelectMenuRoute` now take `CustomId` definitions instead of string prefixes. Passing a different definition to the decorator than the one in the handler's generic is a compile error.
    - **BREAKING:** removed `getArgs()` and `getArg()` from handlers, along with the `-` delimited positional customId arguments. Read decoded values from `this.params` or `this.match` instead.

- Type event middleware by the events it runs for. A middleware that lists a single event in `{ events }` and its `EventMiddleware` generic reads `this.event` as that event's payload tuple, fully typed. A middleware that spans several events, or omits `{ events }` to run for every event, reads `this.eventName` to know which event fired, and `this.event` is `never`, because a middleware runs the same for every event it handles and so has no `match`. The controller threads the fired event name into the middleware. The `{ events }` list and the `EventMiddleware` generic are cross-checked, so listing an event in one but not the other is a compile error in both directions. ([#139](https://github.com/seedcord/seedcord/pull/139))
    - **BREAKING:** on a middleware registered for two or more events, or a catchall with no `{ events }`, `this.event` is now `never`. Read `this.eventName` and do work that does not depend on the payload shape, or write one middleware per event to read a typed payload. Single-event middleware is unaffected.

- Add multi-event support to `EventHandler`. A handler registered for several events with `@RegisterEvent([Events.MessageCreate], [Events.MessageUpdate])` branches with `this.match`, keyed by event name, and each arm receives that event's payload as named parameters carrying the discord.js tuple labels, for example `messageUpdate: (oldMessage, newMessage) => ...`, fully typed, so a missing arm is a compile error and a param past the event's arity is a compile error. A single-event handler reads `this.event` as its payload tuple, unchanged. The controller threads the fired event name into the handler, so the branch is the real event that fired rather than a guess from the payload shape. ([#139](https://github.com/seedcord/seedcord/pull/139))
    - **BREAKING:** on a handler registered for two or more events, `this.event` is now `never`, so the previous hand-narrowing of the payload union no longer compiles. Branch with `this.match` instead. Single-event handlers are unaffected.

- Add end-to-end typed slash commands. Author commands as plain discord.js builders, run `seedcord codegen` to read each command's `toJSON()` and emit a committed `declare module 'seedcord'` registry, then handlers extend the new `SlashHandler<'route'>` base and read `this.options`. Options are typed off the registry, a required option drops the null, choices narrow to their literal union, and only the getters for kinds a command actually uses appear. A handler bound to several commands branches with `this.match`, each arm typed for its own route. ([#139](https://github.com/seedcord/seedcord/pull/139))
    - `seedcord codegen --check` regenerates in memory and exits non-zero, naming the fix, when the committed registry is stale.
    - `@SlashRoute` is cross-checked against the handler generic, so `@SlashRoute('ban', 'kick')` on `SlashHandler<'ban' | 'kick'>` compiles while listing fewer or more routes than the handler declares is a compile error. Route strings are autocompleted off the generated registry.
    - **BREAKING:** slash handlers now extend `SlashHandler<'route'>` instead of `InteractionHandler<ChatInputCommandInteraction>`, and `@SlashRoute` requires a `SlashHandler`. Read options through `this.options` rather than the raw `this.event.options`.

- Move the HMR types (`HmrEventType`, `HmrUpdateEvent`, `HmrAware`, and the framework/CLI event maps) from `@seedcord/cli` to `@seedcord/types/internal`. `seedcord` and `@seedcord/plugins` imported them only as types but listed `@seedcord/cli` in their runtime `dependencies`, which pulled the CLI and its Ink, React, Vite, and tsx tree into every install. Both now read the types from `@seedcord/types` and drop `@seedcord/cli` from their dependencies, so installing `seedcord` no longer installs the CLI. ([#139](https://github.com/seedcord/seedcord/pull/139))
    - **BREAKING:** the HMR types are no longer re-exported from `@seedcord/cli` and the `@seedcord/cli/vite-hmr` subpath is removed. Import these types from `@seedcord/types` instead. The Vite `CustomEventMap` augmentation stays internal to the framework and the CLI.

### ✨ Minor

- Warn at boot for any command route leaf with no registered `@SlashRoute` handler. The check runs after commands load in `Bot.init`, reads the same `routeLeavesOf` walk that `seedcord codegen` uses so the keys cannot diverge, and logs one warning per unhandled route rather than throwing. ([#139](https://github.com/seedcord/seedcord/pull/139))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/services` 0.7.0 → 0.7.1
- `@seedcord/types` 0.4.0 → 0.5.0
- `@seedcord/utils` 0.4.0 → 0.5.0

## 0.11.0

### 💥 Breaking

- seedcord now uses a config.ts file for dev server configuration. new cli as well. ([#98](https://github.com/seedcord/seedcord/pull/98))
- rename `Effects` → pub-sub bus. `core.effects.emit` → `core.bus.publish`. `EffectsHandler` → `Subscriber`. `@RegisterEffect` → `@Subscribe`. `Effects` augmentation interface → `Subscriptions`. config key `effects` → `subscribers`. `EffectsConfig` → `SubscribersConfig`. ([`a34366b`](https://github.com/seedcord/seedcord/commit/a34366b))
- drop unused utility types from `@seedcord/types` (`AnyFunction`, `AnyAsyncFunction`, `PartialExcept`, `RequiredExcept`, `ReadonlyExcept`, `EnsureUndefinedForOptionalProps`, `StrictUnion`, `ReadonlyRecord`, `PartialRecord`). Migrate in-repo `TypedOmit` consumers to `Except` from `type-fest`. ([`a34366b`](https://github.com/seedcord/seedcord/commit/a34366b))
- Move the non-secret startup settings from environment variables into the runtime config. `botColor`, `shutdownEnabled`, `healthCheck` (`port`/`path`/`host`), and `notifications.developerUsername` are now set through `new Seedcord({ ... })` instead of `DEFAULT_BOT_COLOR`, `SHUTDOWN_IS_ENABLED`, `HEALTH_CHECK_PORT`/`PATH`/`HOST`, and `DEVELOPER_DISCORD_USERNAME`. Secrets (bot token, exception webhook URL, Mongo URI) stay in the environment. ([`7308d36`](https://github.com/seedcord/seedcord/commit/7308d36))

    The bot color is applied when a component is used rather than when it is constructed, so a configured color reaches every component regardless of construction order, and any `ColorResolvable` (hex string, number, named color, or RGB tuple) works. The default health-check port is 6967.

    **BREAKING:** the framework no longer reads those four environment variables; move their values into the config object passed to `new Seedcord(...)`. The internal `hexToNumber` helper and its `UtilHexInputType` / `UtilHexInvalid` error codes are removed.

### ✨ Minor

- seedcord instance brand ([#129](https://github.com/seedcord/seedcord/pull/129))
- Reclassify singleton runtime dependencies as peer dependencies so a consumer resolves a single shared instance. ([`5e4bf42`](https://github.com/seedcord/seedcord/commit/5e4bf42))
    - `seedcord`: `discord.js` and `reflect-metadata` are now required peer dependencies.
    - `@seedcord/plugins`: `mongoose`, `pg`, and `kysely` are optional peer dependencies (install only the backend your plugin uses); `reflect-metadata` and `seedcord` are required peers.
    - `@seedcord/types`: `discord.js` is now an optional peer dependency.
    - `@seedcord/services` and `@seedcord/utils`: `type-fest` moved to `devDependencies` (its types are inlined into the published declarations).

- `fetchGuildMember`, `fetchRole`, and `fetchText` now rethrow non-404 Discord errors instead of rebranding every failure as not-found. Controllers throw a `SeedcordError` when constructed without a handler path, and `StrictEventEmitter`-backed `Bus.publish` marks `once` subscribers before awaiting so a re-entrant publish cannot run them twice. `throwCustomError` is removed from the public API (its database-error path moved into `@seedcord/plugins`), and several `@internal` types are no longer exported. ([`7308d36`](https://github.com/seedcord/seedcord/commit/7308d36))
- most packages were exporting more than what they should be exporting and now have smaller imports as they should ([`7e6d80e`](https://github.com/seedcord/seedcord/commit/7e6d80e))

### 🩹 Patch

- export "version" variable with the actual semantic version of each package ([`225977a`](https://github.com/seedcord/seedcord/commit/225977a))
- Bump envapt to v5. `seedcord` now reads `DISCORD_BOT_TOKEN` at the start of `Bot.init()`, so a missing or invalid token throws (via the existing converter) at the start of boot instead of partway through startup at login. ([`2c4201b`](https://github.com/seedcord/seedcord/commit/2c4201b))
- bump deps ([`d938005`](https://github.com/seedcord/seedcord/commit/d938005))
- make sure `@RegisterEffect` can only be used on an EffectHandler. this is the expected behavior so it isn't a breaking change. ([`cf9766d`](https://github.com/seedcord/seedcord/commit/cf9766d))
- build pipeline migrated from `tsup` to `tsdown`. each published package now ships `dist/index.d.mts` + `dist/index.d.cts` (cjs is a one-line re-export stub) with a per-condition `exports` map. source-level public API unchanged. `@seedcord/tsup-config` renamed to `@seedcord/tsdown-config` and made private. ([`fe77998`](https://github.com/seedcord/seedcord/commit/fe77998))
- bump peer floor: typescript `^6.0.3`, node `^22.13`. shared `tsconfig/base.json` now sets `esModuleInterop: true` and `types: ["node"]` for ts6's removed implicit defaults. no public API changes. ([`fe77998`](https://github.com/seedcord/seedcord/commit/fe77998))

#### 📦 Seedcord packages

- `@seedcord/services` 0.6.0 → 0.7.0
- `@seedcord/cli` 0.1.0 (new)
- `@seedcord/types` 0.3.5 → 0.4.0
- `@seedcord/utils` 0.3.8 → 0.4.0

## 0.10.6

### 🩹 Patch

- discord.js was bumped a patch version ([`f8fbe70`](https://github.com/seedcord/seedcord/commit/f8fbe70))
- bump general dependencies ([`f8fbe70`](https://github.com/seedcord/seedcord/commit/f8fbe70))

#### 📦 Seedcord packages

- `@seedcord/services` 0.5.1 → 0.6.0
- `@seedcord/types` 0.3.4 → 0.3.5
- `@seedcord/utils` 0.3.7 → 0.3.8

## 0.10.5

### 🩹 Patch

- bump deps ([`1d8986b`](https://github.com/seedcord/seedcord/commit/1d8986b))
- bump djs to 14.25.0 ([`1d8986b`](https://github.com/seedcord/seedcord/commit/1d8986b))

#### 📦 Seedcord packages

- `@seedcord/services` 0.5.0 → 0.5.1
- `@seedcord/types` 0.3.3 → 0.3.4
- `@seedcord/utils` 0.3.6 → 0.3.7

## 0.10.4

### 🩹 Patch

- fix configurable behavior not deferring when defer: true is provided ([`eb7de1f`](https://github.com/seedcord/seedcord/commit/eb7de1f))

## 0.10.3

### 🩹 Patch

- A previous change to make interaction handler routing decorators be very strict with types made it so that you couldn't use more than one on a single InteractionHandler anymore, which was a previous behavior that worked. This change now infers the types provided to the generic of InteractionHandler, extracts the type of the class, and compares it to the types expected by each decorator being used. It'll also tell you which one is missing in case of a mismatch. ([`398b08f`](https://github.com/seedcord/seedcord/commit/398b08f))

## 0.10.2

### 🩹 Patch

- strictly type the SelectMenuRoute decorator on a select menu interaction handler based on the SelectMenuType passed in

## 0.10.1

### 🩹 Patch

- add inferred literal string type to buildCustomId method so the customId shows up on hover ([`ce0d4bc`](https://github.com/seedcord/seedcord/commit/ce0d4bc))

## 0.10.0

### 💥 Breaking

- replaced the checkPermissions param-based calls with an options-style api and overloads that now require passing the target (role or member) and context (guild or channel) explicitly; added inverse and custom error support so usage signatures have changed and previous direct calls will need updating ([`c0bf149`](https://github.com/seedcord/seedcord/commit/c0bf149))

### ✨ Minor

- you can now pass in a tuple to the emojis map like [emojiName, guildId] where both the values are strings. the injector will then look through cached guilds and inject the emoji from that guild. ([`2049570`](https://github.com/seedcord/seedcord/commit/2049570))
- seedcord provided Emojis map will now either have the full ApplicationEmoji object, GuildEmoji object, or the provided string if an emoji is not found. ([`6d12a7c`](https://github.com/seedcord/seedcord/commit/6d12a7c))
- require all emojis in the EmojiMap to be provided in config ([`6fc2b8f`](https://github.com/seedcord/seedcord/commit/6fc2b8f))

### 🩹 Patch

- add optional custom error input for hasPermsToAssign function as well ([`485670a`](https://github.com/seedcord/seedcord/commit/485670a))

#### 📦 Seedcord packages

- `@seedcord/services` 0.4.0 → 0.5.0
- `@seedcord/utils` 0.3.5 → 0.3.6

## 0.9.1

### 🩹 Patch

- fix incorrect break on silent preventing unknownException effect from firing

## 0.9.0

### 💥 Breaking

- new option to silence caught errors in event handlers. you can now prevent the decorator from trying to send the error response in chat. The signature of the decorator has changed, making it a breaking change. ([`c27ca87`](https://github.com/seedcord/seedcord/commit/c27ca87))

## 0.8.1

### 🩹 Patch

- debug logging for emoji injection

## 0.8.0

### 💥 Breaking

- strongly type routing decorators so they can only be applied to the correct handler classes ([#62](https://github.com/seedcord/seedcord/pull/62))
- signature for the @RegisterEvent decorator has changed. It now accepts a list of event configs. Examples in its TSDoc. ([#62](https://github.com/seedcord/seedcord/pull/62))
- global Emojis and augmentable interface for the same. better DX than mutating user's own Emojis object ([#62](https://github.com/seedcord/seedcord/pull/62))

### ✨ Minor

- ignored key list for interactions now also accepts RegExp patterns. ([#62](https://github.com/seedcord/seedcord/pull/62))
- core.bot will now emit some useful events. (unhandled errors and all events) ([#62](https://github.com/seedcord/seedcord/pull/62))
- new StrictEventEmitter class. Plugin extends this now so strongly typed EventEmitter methods are available on all plugins. To use, pass a map of events as the generic to Plugin<here>. ([#62](https://github.com/seedcord/seedcord/pull/62))
- (beta feature) new Confirmable decorator makes it very easy to require a confirmation before running the "execute" method in handlers ([#62](https://github.com/seedcord/seedcord/pull/62))
- populate method that can be overridden to execute synchronous code. it's called at the end of the constructor in handlers. ([#62](https://github.com/seedcord/seedcord/pull/62))

### 🩹 Patch

- logger instance in handlers available via this.logger ([#62](https://github.com/seedcord/seedcord/pull/62))
- custom seedcord errors and error codes ([#62](https://github.com/seedcord/seedcord/pull/62))
- better validation for UNKNOWN_EXCEPTION_WEBHOOK_URL ([#62](https://github.com/seedcord/seedcord/pull/62))
- make sure that a registered command can only ever be guild OR global. this should not be breaking. If it is, your code was not following best practices. ([#62](https://github.com/seedcord/seedcord/pull/62))

#### 📦 Seedcord packages

- `@seedcord/services` 0.3.3 → 0.4.0
- `@seedcord/utils` 0.3.4 → 0.3.5

## 0.7.1

### 🩹 Patch

- fix "undefined" in log message on startup when registering events. will now show handler count per event in logging

## 0.7.0

### ✨ Minor

- fix login before handlers were registering making some of them useless

## 0.6.3

### 🩹 Patch

- bump deps (mainly djs to 14.24.2)

#### 📦 Seedcord packages

- `@seedcord/services` 0.3.2 → 0.3.3
- `@seedcord/types` 0.3.2 → 0.3.3
- `@seedcord/utils` 0.3.3 → 0.3.4

## 0.6.2

### 🩹 Patch

- bump discord.js version to latest

#### 📦 Seedcord packages

- `@seedcord/services` 0.3.1 → 0.3.2
- `@seedcord/types` 0.3.1 → 0.3.2
- `@seedcord/utils` 0.3.2 → 0.3.3

## 0.6.1

### 🩹 Patch

- fix logging for event handler. wrong ref to class name

## 0.6.0

### ✨ Minor

- add 'once' and 'on' functionality when registering event handlers ([`615eac2`](https://github.com/seedcord/seedcord/commit/615eac2))
- add option to choose "once" or "on" for effects for triggering them ([`e48b386`](https://github.com/seedcord/seedcord/commit/e48b386))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/utils` 0.3.1 → 0.3.2

## 0.5.1

### 🩹 Patch

- bump deps, update djs to 14.24.0, make file_upload available in BuilderComponent ([`aaa59b7`](https://github.com/seedcord/seedcord/commit/aaa59b7))

#### 📦 Seedcord packages

- `@seedcord/services` 0.3.0 → 0.3.1
- `@seedcord/types` 0.3.0 → 0.3.1
- `@seedcord/utils` 0.3.0 → 0.3.1

## 0.5.0

### 💥 Breaking

- remove action row components for modals. (we are not following deprecations till seedcord v1 is out. minor versions will be breaking changes) ([#54](https://github.com/seedcord/seedcord/pull/54))
- some utility types were renamed and some were moved to different packages ([#56](https://github.com/seedcord/seedcord/pull/56))
- utils in seedcord are no longer static methods on classes but standalone functions ([#56](https://github.com/seedcord/seedcord/pull/56))

### ✨ Minor

- new middlewares feature for both interactions and other events with priority sorting ([#56](https://github.com/seedcord/seedcord/pull/56))
- added metadata to default UnknownException so it's easier to debug issues down the line in bots ([#56](https://github.com/seedcord/seedcord/pull/56))
- better parsing and handling for DEFAULT_BOT_COLOR from env file as a hex string, or number, or a Discord.js Color string ([#56](https://github.com/seedcord/seedcord/pull/56))
- buildSlashRoute method as an alternative to building the argument for command-based route decorators ([#56](https://github.com/seedcord/seedcord/pull/56))

### 🩹 Patch

- some tsdoc for better info and documentation ([#56](https://github.com/seedcord/seedcord/pull/56))
- improve type exports and tsdoc ([#56](https://github.com/seedcord/seedcord/pull/56))
- update effects related docs for clarity ([#56](https://github.com/seedcord/seedcord/pull/56))
- export missing classes and entities ([#56](https://github.com/seedcord/seedcord/pull/56))

#### 📦 Seedcord packages

- `@seedcord/services` 0.2.2 → 0.3.0
- `@seedcord/types` 0.2.2 → 0.3.0
- `@seedcord/utils` 0.2.3 → 0.3.0

## 0.4.3

### 🩹 Patch

- set up project-wide ci/cd ([#47](https://github.com/seedcord/seedcord/pull/47))
- bump deps ([`31d1a56`](https://github.com/seedcord/seedcord/commit/31d1a56))
- add a way to specify HOST for healthcheck ([#45](https://github.com/seedcord/seedcord/pull/45))

#### 📦 Seedcord packages

- `@seedcord/services` 0.2.1 → 0.2.2
- `@seedcord/types` 0.2.1 → 0.2.2
- `@seedcord/utils` 0.2.2 → 0.2.3

## 0.4.2

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/utils` 0.2.1 → 0.2.2

## 0.4.1

### 🩹 Patch

- bump deps

#### 📦 Seedcord packages

- `@seedcord/services` 0.2.0 → 0.2.1
- `@seedcord/types` 0.2.0 → 0.2.1
- `@seedcord/utils` 0.2.0 → 0.2.1

## 0.4.0

### ✨ Minor

- update export settings (BREAKING)

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/services` 0.1.1 → 0.2.0
- `@seedcord/types` 0.1.4 → 0.2.0
- `@seedcord/utils` 0.1.1 → 0.2.0

## 0.3.0

### ✨ Minor

- update how emit stacks is handled via new config property ([`2ada52b`](https://github.com/seedcord/seedcord/commit/2ada52b))
- config entry to be able to ignore specific custom-ids from the InteractionController ([`4585b73`](https://github.com/seedcord/seedcord/commit/4585b73))
- make commands registry maps public via bot. Also validate existence of bot token automatically ([`4611ac7`](https://github.com/seedcord/seedcord/commit/4611ac7))

### 🩹 Patch

- validate existence of unknown_interaction_url ([`e47636a`](https://github.com/seedcord/seedcord/commit/e47636a))
- bump deps ([`8a7591a`](https://github.com/seedcord/seedcord/commit/8a7591a))
- use djs Collection object ([`ad2e3c3`](https://github.com/seedcord/seedcord/commit/ad2e3c3))

#### 📦 Seedcord packages

- `@seedcord/services` 0.1.0 → 0.1.1
- `@seedcord/types` 0.1.3 → 0.1.4
- `@seedcord/utils` 0.1.0 → 0.1.1

## 0.2.1

### 🩹 Patch

- move IDocument type export to the plugins package

#### 📦 Seedcord packages

- `@seedcord/types` 0.1.2 → 0.1.3

## 0.2.0

### ✨ Minor

- move services to its own package ([`dabf324`](https://github.com/seedcord/seedcord/commit/dabf324))
- add ComponentsV2 builders to BuilderComponent and a number utility ([`0258dd5`](https://github.com/seedcord/seedcord/commit/0258dd5))

### 🩹 Patch

- debug logging in emoji injector ([`0ed832b`](https://github.com/seedcord/seedcord/commit/0ed832b))

#### 📦 Seedcord packages

- `@seedcord/utils` 0.1.0 (new)
- `@seedcord/services` 0.1.0 (new)

## 0.1.1

### 🩹 Patch

- eslint issue fixes ([`72137e9`](https://github.com/seedcord/seedcord/commit/72137e9))
- move buildCustomId method to BaseComponent so all components can access ([`c188583`](https://github.com/seedcord/seedcord/commit/c188583))
- cleanup package files and bump deps ([`5ac7d83`](https://github.com/seedcord/seedcord/commit/5ac7d83))

#### 📦 Seedcord packages

- `@seedcord/types` 0.1.1 → 0.1.2

## 0.1.0

### ✨ Minor

- Created a new package called @seedcord/plugins and moved mongo there ([#23](https://github.com/seedcord/seedcord/pull/23))
- migrate to monorepo and first test for package ([`d9e2a50`](https://github.com/seedcord/seedcord/commit/d9e2a50))
- renamed hooks to effects because these aren't lifecycle hooks but fire-and-forget side effects ([#19](https://github.com/seedcord/seedcord/pull/19))

### 🩹 Patch

- Added eslint for TSDoc ([#22](https://github.com/seedcord/seedcord/pull/22))
- add LICENSE to all package roots ([#19](https://github.com/seedcord/seedcord/pull/19))
- add TSDoc to almost everything ([#19](https://github.com/seedcord/seedcord/pull/19))

#### 📦 Seedcord packages

- `@seedcord/types` 0.1.0 (new)
