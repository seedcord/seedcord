---
'@seedcord/types': minor
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
'@seedcord/errors': minor
'seedcord': minor
---

**BREAKING:** `config.store` is now `config.kv`, and your handlers and plugins read it through `core.kv` and `this.kv`. Leave it out to keep everything in memory, or pass a `KeyvDriver`, an `UnstorageDriver`, or your own driver. Import `buildKey` from your transport package, and rename any plugin attached as `kv`.
