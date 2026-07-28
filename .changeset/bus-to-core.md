---
'@seedcord/core': minor
'@seedcord/gateway': major
'@seedcord/http': minor
---

**BREAKING:** the subscriber surface moves from `@seedcord/gateway` to `@seedcord/core`, and both transports re-export it. `Subscriber` and `WebhookLog` now bind their transport's `Core`, so a bot author writes the same one type argument as before.

`core.bus` is available on both transports. Subscribers on one key run concurrently with no ordering guarantee. A webhook attachment carries `Uint8Array | string`, which a `Buffer` still satisfies.
