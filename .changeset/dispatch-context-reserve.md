---
'@seedcord/core': minor
'@seedcord/gateway': minor
---

`@seedcord/core` adds `DispatchContext` and the augmentable `DispatchState`. The interaction dispatcher allocates one per dispatch and passes it to the handler as an optional third constructor argument. The bag is empty until middleware and i18n merge fields into `DispatchState`.
