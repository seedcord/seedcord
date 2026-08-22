---
'@seedcord/gateway': patch
'@seedcord/http': patch
---

_Kinda BREAKING:_ A transport plugin base no longer accepts `transport: 'any'` and the gateway base no longer accepts `runtime: 'edge'`. Extend `@seedcord/core/plugin` for a plugin that runs on either transport. This IS a bug fix. This should not have been allowed before.
