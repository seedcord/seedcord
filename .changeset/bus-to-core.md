---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** the subscriber surface moves from `@seedcord/gateway` to `@seedcord/core`, and both transports re-export it. `Subscriber` and `WebhookLog` now bind their transport's `Core`, so a bot author writes the same one type argument as before.

Each bot instance keeps its own fault-throttle window, so two bots in one process stop suppressing each other's reports.

`core.bus` is available on both transports. Subscribers on one key run concurrently with no ordering guarantee. A webhook attachment carries `Uint8Array | string`, which a `Buffer` still satisfies.
