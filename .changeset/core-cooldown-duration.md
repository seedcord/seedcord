---
'@seedcord/core': minor
---

`Cooldown('1.5h')`, `Cooldown('0s')`, and any other duration literal that the parser rejects now fail to compile. They used to throw when `Cooldown()` ran. For a `@Gated` handler, that happens as its module loads.
