---
'@seedcord/types': minor
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
'@seedcord/errors': minor
'seedcord': minor
---

**BREAKING:** `config.kv` now replaces `config.store`, and your handlers and plugins keep state in it through `core.kv` and a plugin's `this.kv`. Pass a `KeyvDriver`, an `UnstorageDriver`, or your own `KvDriver`, or leave it out to keep everything in memory. Rename any plugin you attached under the key `kv`, and import `buildKey` from your transport package if you imported it from `@seedcord/rate-limiter`.
