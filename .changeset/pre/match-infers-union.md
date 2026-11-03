---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

`this.match()` now resolves to the union of what its cases return, so cases can return different types. A named case map with an extra key no longer compiles, unless you pass `Ret`. With `this.match<Ret>()`, each case must still return `Ret`.
