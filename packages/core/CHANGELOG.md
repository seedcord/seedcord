# @seedcord/core

## 0.4.0-next.0

### Minor Changes

- 1bf7d89: **BREAKING:** an error that reports a bad argument now throws `SeedcordTypeError` or `SeedcordRangeError`. Update any `isSeedcordError(error, 'SeedcordError', code)` call naming one of those codes, since branching on the code alone is unaffected.

    An invalid plugin lifecycle timeout throws the new `PluginInvalidLifecycleTimeout` code.

- 9b6a31c: `errors.catchProcessErrors` reports a throw that escaped every handler, and defaults on. The bot keeps running after a rejection. An uncaught exception runs the coordinated shutdown and exits 1.
- 8dc4791: Every `CustomId` field now also takes `{ nullable: true }` and decodes to `T | null`, at one extra slot on the wire. Marking a live field nullable will change its layout hash as well.
- 8dc4791: `start(handler, n)` opens a paginator on any page, and `page(handler, n)` renders one without sending it. A source you write yourself takes `PageSource<Item>`, which each transport exports with its page context already bound.

    **BREAKING:** `Paginator.page` now takes the handler. `PaginatorBase.page` is `protected buildPage`, and core's three source symbols gained a `Base` suffix so the plain names belong to the transports.

- 3ff40e7: Every repliable handler now carries its reply sender on a public `sender` property, replacing the internal `getSender()`. `ReplySender`, `BaseReplySender`, and `ModalLike` are also exported now.
- 0c6cdc8: **BREAKING:** The `responseAttempted` payload is now a union of `ResponseSent` and `ResponseFailed`, both exported. Check `outcome` to reach `error`. Every framework payload field is readonly now, because the bus hands one object to every subscriber.

### Patch Changes

- 2cb3c87: Fixed `Seedcord.attach()` not showing up in the documentation.
- 554129a: `seedcord codegen` now skips a `BuilderComponent` subclass that carries no `@RegisterCommand`, matching the set your bot deploys at startup. An undecorated class previously got a route, and a handler could then typecheck against a command that never reached Discord.
- 5f4e203: Every gate seedcord ships now sets `summary`. An `or` whose arms all refuse lists what each one required, under the lead line `You need to meet any of these:`.
- 554129a: Hide the internals that were already marked internal. `core.shutdown` and `core.startup` carry `addTask` alone, `core.bus` carries `publish` and the listener methods, and `core.bot` drops the controllers and the lifecycle calls. The http transport's `Core` declares the two lifecycle members, and a core built by `createSeedcord` throws from either one.
- 6872865: `and` and `or` now bracket an arm that is itself a combinator. `or(and(A, B), C)` names itself `(A & B) | C` on a `@Gated` hover and in the compile error for a gate that does not fit its handler.
- 554129a: Fix the `Silence` example. It threw from an interaction while the text above it said to throw only in event handlers.
- 9b6a31c: A host whose startup failed used to tear down whichever host had replaced it, taking the replacement's signal handlers and logger config with it. Teardown now runs only for the host that is still live. A second `start()` racing the first rejects with the same error, where it used to resolve a half-started host.
- Updated dependencies [1bf7d89]
- Updated dependencies [9b6a31c]
- Updated dependencies [9b6a31c]
- Updated dependencies [9b6a31c]
- Updated dependencies [5b15463]
- Updated dependencies [554129a]
- Updated dependencies [554129a]
- Updated dependencies [554129a]
- Updated dependencies [0ad8bd1]
- Updated dependencies [64c9a0e]
- Updated dependencies [e4e8605]
- Updated dependencies [554129a]
    - @seedcord/errors@0.5.0-next.0
    - @seedcord/event-emitter@0.1.5-next.0
    - @seedcord/logger@0.2.2-next.0
    - @seedcord/types@0.10.0-next.0
    - @seedcord/utils@0.8.8-next.0

## 0.3.1

### Patch Changes

- a98d27b: A new `commandsDeployed` framework event fires after seedcord deploys your commands, carrying what Discord returned for the global and guild scopes. You can now read the bot's application id from `core.applicationId` on both transports.
- 6b1cfbf: _Kinda BREAKING:_ Starting a bot or running the CLI on a Node version below the `engines` range now throws, naming the required range and the version you are running. The floor stays at `>=24.11`.
- aa4d4c0: `Plugin`, `PluginLifecycleSpec`, and `PluginOptions` are better documented now with examples and explanations.

    _Kinda BREAKING:_ `Initializeable` moved to `@seedcord/core/internal`. It describes framework wiring, and `Plugin` already declares `abstract init()` for you. This was supposed to be internal anyway. No one should have been implementing it.

- Updated dependencies [6b1cfbf]
- Updated dependencies [b29904c]
    - @seedcord/errors@0.4.3
    - @seedcord/utils@0.8.7

## 0.3.0

### Minor Changes

- a46a7dd: **BREAKING:** A handler's cache state now follows the `contexts` its command declares, so a command a DM can reach types `interaction.guild` as `Guild | null`. `SlashOptionRegistry` becomes `SlashRegistry`, `ContextMenuHandler` splits into `UserContextMenuHandler` and `MessageContextMenuHandler` with a route decorator each, a paginator's nav handler reads `this.event.guild` as nullable, and a gateway bot registering a guild-capable command without the `Guilds` intent throws at startup. Run `seedcord codegen` after upgrading. This won't affect most commands.

### Patch Changes

- Updated dependencies [a46a7dd]
    - @seedcord/errors@0.4.2

## 0.2.1

### Patch Changes

- 8f662bb: The gate mismatch compile error now reads `gate 'Name' requires a X handler, and this handler is Y`. The `@see` lines on the gate factories now point at your transport package for `@Gated`.
- 1d2f1e3: Updated TSDoc reference generation.
- Updated dependencies [1d2f1e3]
    - @seedcord/event-emitter@0.1.4
    - @seedcord/errors@0.4.1
    - @seedcord/logger@0.2.1
    - @seedcord/utils@0.8.6
    - @seedcord/types@0.9.1

## 0.2.0

### Minor Changes

- 5c7c3e2: **BREAKING:** `setEmoji(Emojis.X)` on gateway used to throw through the builder's strict validation. `Emojis.X` now carries `id`, `name`, and `animated`, and the `GuildEmoji` or `ApplicationEmoji` discord.js resolved moved to `Emojis.X.source`, still typed by the codegen tag. `ResolvedEmoji` moved from `@seedcord/http` to `@seedcord/core`.

### Patch Changes

- 97b62ef: Update log colors in some places.
- ad1e4d5: A WebhookLog report can also set avatarUrl for the webhook now.
- 7553449: Better encapsulate framework internals.

    **BREAKING:** `SeedcordError.identifier` is accessed via a symbol now. Older framework versions won't be able to access it anymore. Please update to the latest version.

- f39cde0: These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build.
- a259cdc: Use `#` instead of `@` for tsconfig path aliases.
- 1364c82: A failed lifecycle phase or plugin dispose now throws an error carrying each underlying failure.
- a8d7b5f: Rewrote package descriptions for all packages. Also added keywords.
- 660a94d: Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link.
- c50ad6c: Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all.
- ad1e4d5: Every fault now reaches your subscribers. A rare bug used to stay silent while a common one kept throwing on the same route. Webhook cards still group repeats to one a minute, and each carries how many it covers.
- Updated dependencies [1364c82]
- Updated dependencies [97b62ef]
- Updated dependencies [aa6bb3a]
- Updated dependencies [7553449]
- Updated dependencies [f39cde0]
- Updated dependencies [a259cdc]
- Updated dependencies [a8d7b5f]
- Updated dependencies [660a94d]
- Updated dependencies [c50ad6c]
- Updated dependencies [c343f4a]
- Updated dependencies [e11cbb3]
- Updated dependencies [1364c82]
    - @seedcord/errors@0.4.0
    - @seedcord/logger@0.2.0
    - @seedcord/event-emitter@0.1.3
    - @seedcord/types@0.9.0
    - @seedcord/utils@0.8.5

## 0.1.4

### Patch Changes

- 71a0b99: _Kinda BREAKING?:_ envapt is a peer dependency now. Your project and seedcord load one copy, so the framework reads the config you set through `Envapter`.
- Updated dependencies [71a0b99]
- Updated dependencies [8e8e952]
- Updated dependencies [527a465]
    - @seedcord/logger@0.1.4
    - @seedcord/errors@0.3.4
    - @seedcord/event-emitter@0.1.2
    - @seedcord/types@0.8.2
    - @seedcord/utils@0.8.4

## 0.1.3

### Patch Changes

- 9b0a6a6: 'reflect-metadata' is a direct dep now. No need to import it at the top. The packages import it in their index files, first thing.
- Updated dependencies [dfd7dc2]
- Updated dependencies [dfd7dc2]
    - @seedcord/errors@0.3.3
    - @seedcord/logger@0.1.3
    - @seedcord/utils@0.8.3

## 0.1.2

### Patch Changes

- 272b729: Update comments
- Updated dependencies [272b729]
    - @seedcord/errors@0.3.2
    - @seedcord/event-emitter@0.1.2
    - @seedcord/logger@0.1.2
    - @seedcord/types@0.8.2
    - @seedcord/utils@0.8.2

## 0.1.1

### Patch Changes

- c567fea: Bump deps.
- 814902a: Both transports now trace the elapsed time of each dispatched interaction and each reply write.
- c567fea: Set all packages' node floor to LTS.
- 5b57bda: A hot reload now logs one line worded by what changed, `Unloaded` on a delete, `Registered` on a new file, and `Reloaded` with a duration on an edit.
- 0642de5: **BREAKING:** `@seedcord/http` no longer serves a health endpoint, and `healthCheck` is gone from its config. An unsigned POST to the interactions server answers 401, which covers an uptime check.
- d470ad4: Per-phase lines are now debug and per-task lines are trace.
- d470ad4: Now uses the appropriate log levels for logs across the lifecycle of the transports and plugins.
- Updated dependencies [c567fea]
- Updated dependencies [0642de5]
- Updated dependencies [c567fea]
- Updated dependencies [814902a]
    - @seedcord/errors@0.3.1
    - @seedcord/logger@0.1.1
    - @seedcord/types@0.8.1
    - @seedcord/utils@0.8.1
    - @seedcord/event-emitter@0.1.1

## 0.1.0

### Minor Changes

- 789f17a: New `@seedcord/core`, the transport-agnostic framework surface both `@seedcord/gateway` and `@seedcord/http` build on and re-export. The transport packages re-exporting most things from it though.
- 789f17a: `Commands` and `ContextMenus` join `Emojis` as module-level accessors filled during startup. `Commands` is keyed by slash route and `ContextMenus` splits into `user` and `message`.

    **BREAKING:** `bot.emojis`, `bot.commands`, and `bot.mentions` are removed. Import the accessors directly. Reading a key before startup resolves it will throw.

- 789f17a: **BREAKING:** the component builders are built on `@discordjs/builders`. Import any builder you nest inside a seedcord component from there too, because the copy discord.js re-exports is a separate class that breaks `instanceof`.

    **BREAKING:** `ControlCosmetics.emoji` takes an `APIMessageComponentEmoji` such as `{ name: '👍' }`. A bare string no longer type-checks.

- 789f17a: **BREAKING:** `core.bot` no longer emits events. The four keys moved to `core.bus` as `unhandledInteractionError`, `unhandledEventError`, `anyEvent`, and `anyInteraction`. Register them with `core.bus.on(...)` or a `@Subscribe` subscriber.

    `interactionDispatched` and `responseAttempted` are new, and both carry `interactionId` so a subscriber can join them to calculate durations such as network time. `publish` rejects the framework's own keys.

    **BREAKING:** `AllSubscriptions` is no longer exported. Type a payload with `SubscriptionData<K>` if needed.

- 789f17a: **BREAKING:** `RequirePermissions`, `RequireBotPermissions`, and `RequireRole` check the payload's effective channel permissions by default. Pass `{ in: 'guild' }` for the previous base-set behavior. They fit modal and event handlers now.

    **BREAKING:** `GateContextBase` is scalar (`userId`, `guildId`, `channelId`, `memberRoleIds`, `memberPermissions`, `appPermissions`, `routeId`). A gate that read `ctx.user`, `ctx.guild`, or `ctx.member` reads the id scalars or annotates a gateway arm.

    `Cooldown` keys its window by route, so a durable store keeps it across restarts.

- 789f17a: **BREAKING:** the lifecycle phases are renamed and trimmed. `StartupPhase` is `Configuration`, `Login`, `Ready`. `ShutdownPhase` is `Unbind`, `Drain`, `Disconnect`, `Logout`.

    **BREAKING:** the coordinators no longer emit events, and nothing replaces them. A task registered with `addTask` runs where the matching event fired. Gateway drains in-flight dispatch before the client disconnects.

    **BREAKING:** `Core` no longer extends `SeedcordInstance`, so `this.core.version`, `username`, `augmentTarget`, and `start()` are gone from handlers. Read them off the instance you constructed.

- 789f17a: Each transport exports a `Plugin` base bound to its own `Core`, so a plugin reads `this.core.bot` on gateway with no `Core` import. A plugin serving either transport extends the base from `@seedcord/core/plugin`.

    **BREAKING:** `attach(key, Plugin, ...args)` takes no `startupPhase`, plugin init runs during startup. It rejects a plugin whose declared `transport` or `runtime` the host does not run, and a key matching a framework log channel.

    **BREAKING:** a plugin constructor takes `CoreBase` as its first parameter, `stop()` is now `dispose()`, and `this.logger` comes from the base.

- 789f17a: **BREAKING:** the `bot/utilities` fetch helpers are removed with their four notices. Call discord.js directly: `client.users.fetch(id)`, `guild.members.fetch({ user: ids })`, `guild.roles.fetch(id)`, `guild.roles.botRoleFor(user)`, and `client.channels.fetch(id)`. `updateMemberRoles` is replaced by `mergeRoles(current, add, remove)`.

    **BREAKING:** `HmrModuleHandler` moved to `@seedcord/core/hmr` and no longer takes a `name` option. A failed hot reload restores the file's last-good version, which `hmr.rollback: false` turns off in the config file.

    **BREAKING:** `@seedcord/kit` is removed, its exports come from `@seedcord/core`.

- 789f17a: **BREAKING:** Node 24.3 or newer is required.

### Patch Changes

- 789f17a: Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`.
- 701b669: Require envapt `^8.1.0`. An older pin in your own bot installs a second copy whose `Envapter` state splits from the framework's.
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
- Updated dependencies [93544a8]
    - @seedcord/types@0.8.0
    - @seedcord/utils@0.8.0
    - @seedcord/logger@0.1.0
    - @seedcord/errors@0.3.0
    - @seedcord/event-emitter@0.1.0
