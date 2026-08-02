# @seedcord/core

## 0.1.0-next.8

### Minor Changes

- 5ea2d74: **BREAKING:** `PermissionErrorNoticeOverrides` is now `PermissionNoticeOverrides` and comes from `@seedcord/core`.

    `assertPermissions` ships on `@seedcord/core` for both transports. The caller passes the effective bitfield and a subject, and gateway's `checkPermissions` computes those from discord.js.

- 5ea2d74: **BREAKING:** the `bot/utilities` fetch helpers have been removed, along with the `UserNotFound`, `UserNotInGuild`, `RoleDoesNotExist`, and `CouldNotFindChannel` notices. Call discord.js directly, `client.users.fetch(id)`, `guild.members.fetch({ user: ids })`, `guild.roles.fetch(id)`, `guild.roles.botRoleFor(user)`, and `client.channels.fetch(id)`.

    `updateMemberRoles` is replaced by `mergeRoles(current, add, remove)` (exported from `@seedcord/core`), which returns the merged ids for you to use.

- 58ee649: **BREAKING:** the plugin `needs` option and `this.ctx` have been removed.
- b586a14: `Commands` replaces `CommandMentions`, keyed by slash route. `ContextMenus` maps each deployed context-menu command, split into `user` and `message`. Both ship from `@seedcord/core` and re-export through each transport.

    **BREAKING:** `bot.emojis`, `bot.commands`, and `bot.mentions` are removed. Import `Emojis`, `Commands`, and `ContextMenus` directly. Reading one before startup resolves it throws.

- 597add8: `Paginator`, `ArraySource`, and `CursorSource` are available on `@seedcord/http`, matching gateway. A source loader on http receives `guildId` and fetches guild data through `core.rest`.

    **BREAKING:** a custom `PageSource` takes the page context as a second type parameter, `PageSource<Item, PageContext>`, and `PageContext.core` is required.

- 58ee649: `core.rest` is on `CoreBase`, so both transports expose the Discord REST client. Gateway returns the discord.js client's own, which carries no token until the Login phase.

### Patch Changes

- b586a14: **BREAKING:** An unreachable guild now fails the command deploy.
- Updated dependencies [b586a14]
- Updated dependencies [58ee649]
- Updated dependencies [b586a14]
- Updated dependencies [c26ec13]
    - @seedcord/errors@0.3.0-next.7
    - @seedcord/utils@0.8.0-next.9
    - @seedcord/logger@0.1.0-next.4

## 0.1.0-next.7

### Minor Changes

- f0ba9f3: **BREAKING:** `attach` rejects a plugin key matching a framework log channel, at compile time and at runtime with new code `CorePluginReservedChannel`. Rename any plugin attached under `bot`, `errors`, `plugins`, or another reserved name.
- 9ff4e85: **BREAKING:** the subscriber surface moves from `@seedcord/gateway` to `@seedcord/core`, and both transports re-export it. `Subscriber` and `WebhookLog` now bind their transport's `Core`, so a bot author writes the same one type argument as before.

    Each bot instance keeps its own fault-throttle window, so two bots in one process stop suppressing each other's reports.

    `core.bus` is available on both transports. Subscribers on one key run concurrently with no ordering guarantee. A webhook attachment carries `Uint8Array | string`, which a `Buffer` still satisfies.

- 44b6d72: **BREAKING:** `Core` no longer extends `SeedcordInstance`, so `this.core.version`, `this.core.username`, `this.core.augmentTarget`, and `this.core.start()` are gone from handlers. The host class still carries all four.

    Gateway's `Core` narrows `shutdown` and `startup` to `addTask`. Read the rest off the instance you constructed, whose `shutdown` and `startup` are now public.

    The HTTP `Core` carries neither coordinator, matching the edge runtime that has no lifecycle.

- 9dba6ea: **BREAKING:** core's default bus keys are now five, all camelCase, and each transport augments the set with its own. `publish` no longer accepts any of them, including `unknownException` and `handledException`. `on`, `once`, and `waitFor` stay open for every key. A bot that reported its own faults declares its own key and its own `WebhookLog`.

    Two keys are new. `interactionDispatched` fires once per dispatch with `routeId`, `interactionId`, `kind`, `outcome` (`handled` / `refused` / `failed`), `fallback`, `durationMs`, and `queuedMs`. `responseAttempted` fires on every write through the reply surface with `routeId`, `interactionId`, `method`, `outcome` (`sent` / `failed`), `durationMs`, `messageId`, and an `error` when the write threw.

    Autocomplete choices responses publish `responseAttempted` too, with `method` `respond`.

    A write that threw a non-Error reports an `Error` wrapping it, with the raw value on `cause`.

    One dispatch reports one `routeId` across both keys, on both transports. A dispatch that runs the unhandled default previously reported its handler's class name on `responseAttempted`, so grouping by route split one route into two buckets.

    Both carry `interactionId`, so a subscriber can join them and split a dispatch into its code time and its Discord round trips. `durationMs` on `interactionDispatched` runs from dispatch entry to the user having a response, replies included.

    The thrown value's type sets `outcome`, so a gate and a handler label the same stop identically. A `Silence` and a `Notice` with `report` false are `refused`. A `Notice` with `report` true, which includes a default `Fault`, is `failed`.

- f0ba9f3: Framework log lines carry a per-subsystem channel. `config.logger.channels` is typed by the `FrameworkChannel` set and still accepts any string.
- 6c35827: **BREAKING:** the startup and shutdown coordinators no longer emit events. `startup:start|complete|error`, `shutdown:start|complete|error`, and the per-phase `phase:N:start|complete` keys are gone, along with the emitter base on both coordinators and on `Pluggable`. Nothing replaces them. A task registered with `addTask` runs at the same point the matching event fired.

    A failed shutdown now logs every phase failure on its `Coordinated shutdown failed` error line. The `AggregateError` payload built for the removed `shutdown:error` event is gone.

- 479ed72: **BREAKING:** `PluginOptions.transport` and `.runtime` take `'any'` in place of `'both'`. `'any'` is the default for both axes, so a plugin that declares neither is unaffected.

    **BREAKING:** `attach` now rejects a plugin whose declared `transport` or `runtime` the host does not run, and an edge host rejects every plugin. The error message contains the plugin's declared value and the bot's.

    A plugin declaring any of `transport`, `runtime`, or `needs` can now be attached. Before this, `attach` accepted only plugins that declared no options.

    `new Seedcord(config)` on http reads its runtime from the config it is constructed with. A config typed as the whole `HttpConfig` union leaves the host on both runtimes and it accepts no plugins, so narrow the config to `HttpServerConfig` to attach.

- 464438f: Both transports now export a `Plugin` base bound to their own `Core`, so a plugin reads `this.core.bot` on gateway and `this.core.rest` on http with no `Core` import. A plugin that runs on either transport keeps extending the base from `@seedcord/core/plugin`, whose `this.core` carries the shared members.

    **BREAKING:** a plugin constructor takes `CoreBase` as its first parameter. Naming a transport `Core` there is a compile error at `attach`. Read the transport type off `this.core`.

    Every attach gate reports as a sentence naming both values, for example `this plugin declares transport 'http' and this bot runs 'gateway'`.

    **BREAKING:** a transport the imported base does not serve is a compile error on the type argument, so `Plugin<{ transport: 'http' }>` from `@seedcord/gateway` is rejected where it is declared.

    **BREAKING:** `Mongo` and `KyselyPg` declare `transport: 'gateway'` and no longer expose a public `core`.

- f0ba9f3: **BREAKING:** `Plugin` supplies `this.logger` itself, labelled from the class name and channelled to the attach key. Delete the `logger` field from your plugin. `PluginContext` no longer carries `logger`, read `this.logger`.

### Patch Changes

- 4f11816: Doc examples and docs search targets use the renamed plugin classes.
- Updated dependencies [f0ba9f3]
- Updated dependencies [44b6d72]
- Updated dependencies [9ff4e85]
- Updated dependencies [f0ba9f3]
- Updated dependencies [53d5cac]
- Updated dependencies [4f11816]
- Updated dependencies [9ff4e85]
- Updated dependencies [44b6d72]
    - @seedcord/errors@0.3.0-next.6
    - @seedcord/types@0.8.0-next.8
    - @seedcord/logger@0.1.0-next.3
    - @seedcord/utils@0.8.0-next.8

## 0.1.0-next.6

### Minor Changes

- 25b58be: The `Plugin` base and the `attach` host machinery moved to `@seedcord/core`. Plugin authors import the base from `@seedcord/core/plugin`. A host whose startup failed throws on a second `start()`, construct a new instance.

    **BREAKING (`@seedcord/gateway`):** `attach(key, Plugin, ...args)` no longer takes a `startupPhase` argument, plugin init runs during startup. `shutdownEnabled` is removed, coordinated shutdown is always on. `healthCheck` is `false | true | HealthCheckConfig` (omit for the defaults) and the health server's default path is `/health`. `runtime` accepts only `'server'`.

    **BREAKING (`@seedcord/types`):** `Config` removes `shutdownEnabled` and `healthCheck` (each transport config declares its own) and adds `runtime?: 'server' | 'edge'`.

- 8e33bf4: **BREAKING:** the lifecycle phase enums are renamed and trimmed. `StartupPhase` is `Configuration`, `Login`, `Ready`. `ShutdownPhase` is `Unbind`, `Drain`, `Disconnect`, `Logout`. An `addTask` call naming an old member moves to the new name (e.g. `ShutdownPhase.ExternalResources` becomes `ShutdownPhase.Disconnect`, `ShutdownPhase.StopServices` becomes `ShutdownPhase.Drain`).

    `@seedcord/gateway` drains in-flight interaction and event dispatch during shutdown before the client disconnects.

### Patch Changes

- Updated dependencies [25b58be]
- Updated dependencies [25b58be]
    - @seedcord/types@0.8.0-next.7
    - @seedcord/errors@0.3.0-next.5
    - @seedcord/logger@0.1.0-next.2
    - @seedcord/utils@0.8.0-next.7

## 0.1.0-next.5

### Minor Changes

- 137e641: Add `SelectMenuKind`, shared by the transport route decorators.
- b03c8cd: Adds the shared handler bases `BaseHandler` and `RepliableHandler`. Both transports extend them, the reply members are defined once, and each transport supplies its sender through `buildSender`.
- c89adde: `@seedcord/core/node` is a new subpath exporting the lifecycle coordinators (`CoordinatedStartup`, `CoordinatedShutdown`) and `HealthCheck`, moved out of the deleted `@seedcord/services`.

    **BREAKING:** the `@seedcord/gateway` barrel no longer re-exports the lifecycle coordinators, `HealthCheck`, or the lifecycle types (`LifecycleTask`, `PhaseEventMap`). `StartupPhase` and `ShutdownPhase` stay exported.

- 701b669: Add `RequirePermissions`, `RequireBotPermissions`, and `RequireRole` to the gate catalog. The permission gates read the payload's effective channel sets by default, and `{ in: 'guild' }` picks the base-set check, which types as `Gate<GuildPermissionsContext>` and fits gateway handlers only. The Administrator bit passes any scope.

    **BREAKING:** `GateContextBase` gains a required `appPermissions` field, so a hand-built gate context must add it.

- 3817214: Adds the six interaction route decorators (`@SlashRoute`, `@AutocompleteRoute`, `@ContextMenuRoute`, `@ButtonRoute`, `@ModalRoute`, `@SelectMenuRoute`), shared by both transports, each cross-checking the handler's generics at compile time.

### Patch Changes

- b03c8cd: Raise discord.js to `^14.27.0`, `@discordjs/rest` to `^2.6.2`, and discord-api-types to `^0.38.50`.
- 701b669: Require envapt 8.1. A bot declaring its own envapt needs `^8.1.0` there too, an older pin installs a second copy whose `Envapter` state (the bound source, the detected environment) splits from the framework's.
- 5ec46ca: Adds support for the gateway `@WebhookUrl` decorator.
- Updated dependencies [3817214]
- Updated dependencies [b03c8cd]
- Updated dependencies [701b669]
- Updated dependencies [c959e1a]
- Updated dependencies [e17f818]
- Updated dependencies [c959e1a]
- Updated dependencies [5ec46ca]
- Updated dependencies [701b669]
- Updated dependencies [c959e1a]
- Updated dependencies [137e641]
- Updated dependencies [137e641]
- Updated dependencies [c959e1a]
- Updated dependencies [5ec46ca]
    - @seedcord/errors@0.3.0-next.4
    - @seedcord/types@0.8.0-next.6
    - @seedcord/utils@0.8.0-next.6
    - @seedcord/logger@0.1.0-next.1
    - @seedcord/event-emitter@0.1.0-next.0

## 0.1.0-next.4

### Minor Changes

- 93544a8: Add the `./hmr` subpath exporting `HmrModuleHandler`, moved from `@seedcord/gateway`.

### Patch Changes

- Updated dependencies [cd3ee0f]
- Updated dependencies [cd3ee0f]
- Updated dependencies [cd3ee0f]
- Updated dependencies [cd3ee0f]
- Updated dependencies [cd3ee0f]
- Updated dependencies [cd3ee0f]
- Updated dependencies [cd3ee0f]
- Updated dependencies [cd3ee0f]
- Updated dependencies [cd3ee0f]
- Updated dependencies [cd3ee0f]
- Updated dependencies [93544a8]
- Updated dependencies [93544a8]
    - @seedcord/types@0.8.0-next.5
    - @seedcord/logger@0.1.0-next.0
    - @seedcord/utils@0.8.0-next.5

## 0.1.0-next.3

### Minor Changes

- 42fd262: Codegen captures a slash channel option's declared `addChannelTypes` into `SlashOptionRegistry`. The gateway `getChannel` narrows to the matching channel subtype, so a text-only option returns `TextChannel` with no cast.
- 42fd262: `Cooldown` keys its window by the handler's route and window settings, so a durable store keeps the same window across restarts and isolates. `GateContextBase` now has a `routeId` that identifies the dispatched handler, for example `slash:daily` or `button:confirm`.
- 42fd262: `@seedcord/core` adds `DispatchContext` and the augmentable `DispatchState`. The interaction dispatcher allocates one per dispatch and passes it to the handler as an optional third constructor argument. The bag is empty until middleware and i18n merge fields into `DispatchState`.

### Patch Changes

- Updated dependencies [d1cb181]
- Updated dependencies [e60fcf7]
- Updated dependencies [e60fcf7]
    - @seedcord/types@0.8.0-next.4
    - @seedcord/errors@0.3.0-next.3
    - @seedcord/utils@0.8.0-next.4

## 0.1.0-next.2

### Minor Changes

- 7174db3: Move the interaction metadata keys, the gate notices, and `RegisterCommand` from `seedcord` to `@seedcord/core`. `seedcord` re-exports them. `OnCooldown` is created with `resetAt` (renamed from the unpublished `expires`).
- 7174db3: New `CoreBase` in `@seedcord/core` with `config` and `rateLimiter`. The gateway `Core` extends it. `core.rateLimiter` is an async `IRateLimiter` backed by `MemoryRateLimiter`. `seedcord` re-exports `@seedcord/rate-limiter`. `SeedcordInstance` adds `version` and moves to `@seedcord/types/internal`.

    **BREAKING:** `@seedcord/types` no longer depends on discord.js. `clientOptions` and `events` move from `BotConfig` to `GatewayBotConfig` in `seedcord`, and the `Seedcord` constructor takes `GatewayConfig`. `Config.botColor` is a `BotColor`.

    **BREAKING:** `@seedcord/services` no longer exports `RateLimiter`, `RateLimitWindow`, or `RateLimitResult`. Use `MemoryRateLimiter` from `@seedcord/rate-limiter` and the types from `@seedcord/types`. `hit` is replaced by the async `charge`, and results carry `resetAt`, `remaining`, `retryAfterMs`.

- 7174db3: Gates move to `@seedcord/core`: `defineGate`/`defineEffectGate`, `and`/`or`, `OwnerOnly`/`GuildOnly`/`DmOnly`/`Cooldown`. `InteractionGateContext`/`EventGateContext`, the cache-reading gates, and `@Gated` stay in `seedcord`, which re-exports the moved pieces.

    **BREAKING:** `GateContextBase` is scalar: `core`, `userId`, `guildId`, `channelId`, `memberRoleIds`, `memberPermissions`. A gate that read `ctx.user`/`ctx.guild`/`ctx.member` now reads the id scalars or annotates a gateway arm.

### Patch Changes

- Updated dependencies [7174db3]
- Updated dependencies [7174db3]
    - @seedcord/types@0.8.0-next.3
    - @seedcord/utils@0.8.0-next.3
    - @seedcord/errors@0.3.0-next.2

## 0.1.0-next.1

### Minor Changes

- b384e8f: Move the component builders (`BuilderComponent`, `RowComponent`) and the bot color into `@seedcord/core`, now built on `@discordjs/builders`. The builders were previously imported from discord.js.
- 7f4fb2e: Dissolve `@seedcord/kit` into `@seedcord/core`. The Notice stop tree, the customId codec, and pagination move into `@seedcord/core`, joining the component builders already there, and `@seedcord/kit` is removed.

    **BREAKING:** `@seedcord/kit` is removed. Import its former exports (`Notice`, `Fault`, `Silence`, `CustomId`, `paginate`, `PageView`, `BuilderComponent`, `RowComponent`) from `seedcord` or `@seedcord/core`.

### Patch Changes

- Updated dependencies [b384e8f]
    - @seedcord/errors@0.3.0-next.2
    - @seedcord/types@0.8.0-next.2

## 0.1.0-next.0

### Minor Changes

- 993f609: **BREAKING:** The codegen registry types (`SlashOptionRegistry`, `SlashOption`, `OptionKind`, `UserContextMenuRegistry`, `MessageContextMenuRegistry`) move from `@seedcord/types` to `@seedcord/core`.
