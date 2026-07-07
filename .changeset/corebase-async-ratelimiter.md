---
'@seedcord/core': minor
'@seedcord/types': minor
'@seedcord/services': minor
'@seedcord/gateway': minor
---

New `CoreBase` in `@seedcord/core` with `config` and `rateLimiter`. The gateway `Core` extends it. `core.rateLimiter` is an async `IRateLimiter` backed by `MemoryRateLimiter`. `@seedcord/gateway` re-exports `@seedcord/rate-limiter`. `SeedcordInstance` adds `version` and moves to `@seedcord/types/internal`.

**BREAKING:** `@seedcord/types` no longer depends on discord.js. `clientOptions` and `events` move from `BotConfig` to `GatewayBotConfig` in `@seedcord/gateway`, and the `Seedcord` constructor takes `GatewayConfig`. `Config.botColor` is a `BotColor`.

**BREAKING:** `@seedcord/services` no longer exports `RateLimiter`, `RateLimitWindow`, or `RateLimitResult`. Use `MemoryRateLimiter` from `@seedcord/rate-limiter` and the types from `@seedcord/types`. `hit` is replaced by the async `charge`, and results carry `resetAt`, `remaining`, `retryAfterMs`.
