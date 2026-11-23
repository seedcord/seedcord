---
'@seedcord/core': minor
'@seedcord/utils': minor
---

`Cooldown('1.5h')`, `Cooldown('0s')`, and any other duration literal that `parseDuration` rejects now fail to compile. They used to throw when `Cooldown()` ran, which for a `@Gated` handler is when its module loads. `ValidDuration` checks the literal for this, so it now takes it as a type argument, like `ValidDuration<TText>`.
