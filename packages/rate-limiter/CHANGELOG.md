# @seedcord/rate-limiter

## 0.1.0-next.1

### Patch Changes

- d1cb181: Add optional `config.store` to supply a durable rate-limiter backend, replacing the in-memory default.
- e60fcf7: Raise `engines.node` to `>=24.3`, the floor for the `Error.isError` calls the framework uses.
- Updated dependencies [d1cb181]
- Updated dependencies [e60fcf7]
    - @seedcord/types@0.8.0-next.4

## 0.1.0-next.0

### Minor Changes

- 7174db3: New `@seedcord/rate-limiter` package: `MemoryRateLimiter` (exact sliding window, in-memory) and `buildKey`. `IRateLimiter` (`charge`/`peek`/`reset`) and `RateLimitWindow`/`RateLimitResult` are in `@seedcord/types`.

### Patch Changes

- Updated dependencies [7174db3]
- Updated dependencies [7174db3]
    - @seedcord/types@0.8.0-next.3
