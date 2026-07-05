---
'@seedcord/core': minor
'@seedcord/types': minor
'@seedcord/services': minor
'seedcord': minor
---

New `CoreBase` in `@seedcord/core` with `config` and `rateLimiter`. The gateway `Core` now extends `CoreBase`. The `core.rateLimiter` property is an async `IRateLimiter` implementation backed by `MemoryRateLimiter`. The `seedcord` package re-exports `@seedcord/rate-limiter`. `SeedcordInstance` gains `version` (the framework package version the instance runs on, implemented by `Seedcord`) and moves to `@seedcord/types/internal`, next to the brand mechanism its consumers already use.

**BREAKING:** `@seedcord/types` no longer depends on discord.js. `BotConfig.clientOptions` and `BotConfig.events` (with `EventsConfig`) have been moved to `GatewayBotConfig` in the gateway package, since an http bot receives no gateway events. The `Seedcord` constructor now accepts `GatewayConfig`. `Config.botColor` is now `BotColor` without discord.js dependencies.

**BREAKING:** `@seedcord/services` no longer exports `RateLimiter`, `RateLimitWindow`, or `RateLimitResult`. Use `MemoryRateLimiter` from `@seedcord/rate-limiter` and types from `@seedcord/types`. `RateLimitResult.expires` has been replaced with `resetAt` along with `remaining` and `retryAfter` properties. The `hit` method has been replaced with the async `charge` method.
