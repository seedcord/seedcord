# @seedcord/core

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
