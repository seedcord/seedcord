---
'@seedcord/services': minor
---

**BREAKING:** `@seedcord/services` no longer exports `Logger`, `LoggerChannelRegistry`, or the sink types. Import them from `@seedcord/logger`. `HealthCheck` and the lifecycle coordinators stay.
