---
'@seedcord/services': minor
'@seedcord/utils': minor
'@seedcord/types': minor
'seedcord': minor
---

Rename the cooldown store and land the gate leaf prep.

- In `@seedcord/services`, `CooldownManager` is renamed to `RateLimiter` (`CooldownWindow` and `CooldownResult` become `RateLimitWindow` and `RateLimitResult`), and the `@seedcord/services/internal` subpath is removed. The throw-based `check()` API becomes `hit(key, { delay, limit? })`.
- In `seedcord`, the store is reached at `core.rateLimiter`.
- In `@seedcord/utils`, add `parseDuration`, the `ValidDuration` template type, and `toEpochSeconds`.
- In `@seedcord/types`, add `Config.ownerIds` and the `Epoch` types (`EpochMs` and `EpochSec`).
