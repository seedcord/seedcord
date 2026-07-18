# @seedcord/core

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
