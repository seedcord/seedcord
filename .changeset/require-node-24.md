---
'@seedcord/gateway': minor
'@seedcord/services': minor
'@seedcord/utils': minor
'@seedcord/types': minor
'@seedcord/errors': minor
'@seedcord/plugins': minor
'seedcord': minor
---

**BREAKING:** require Node 24. `engines.node` moves to `>=24` so the framework can use Node 24 APIs like `Error.isError` and `RegExp.escape`. Upgrade your runtime to Node 24 or newer.
