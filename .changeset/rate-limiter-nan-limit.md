---
'@seedcord/rate-limiter': patch
---

Fixed `MemoryRateLimiter` taking a NaN limit as no limit at all, which let every charge through and reported `remaining` as NaN.
