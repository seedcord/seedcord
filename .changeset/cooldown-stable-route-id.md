---
'@seedcord/core': minor
'@seedcord/gateway': minor
---

`Cooldown` keys its window by the handler's route and window settings, so a durable store keeps the same window across restarts and isolates. `GateContextBase` now has a `routeId` that identifies the dispatched handler, for example `slash:daily` or `button:confirm`.
