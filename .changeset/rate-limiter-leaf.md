---
'@seedcord/rate-limiter': minor
'@seedcord/types': minor
---

New `@seedcord/rate-limiter` package with `MemoryRateLimiter` (the exact-sliding-window in-memory limiter) and `buildKey`. The `IRateLimiter` contract (`charge`/`peek`/`reset`, async, returning `{ limited, resetAt, remaining, retryAfterMs }`) plus `RateLimitWindow`/`RateLimitResult` land in `@seedcord/types`.
