---
'@seedcord/types': minor
---

`Config` gains `logger`, `store`, and `runtime`.

**BREAKING:** `Config` drops `shutdownEnabled` and `healthCheck`, which each transport config now declares. `clientOptions` and `events` move to `GatewayBotConfig` in `@seedcord/gateway`.
