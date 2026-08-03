---
'@seedcord/gateway': minor
---

**BREAKING:** a `WebhookLog` subclass declares its url's env var with `@WebhookUrl` and implements `report()` returning `{ username?, components, files? }`. The abstract `webhook` field is removed.

An unset url disables that reporter with a boot warning. A malformed one throws at boot, and a webhook Discord does not recognise stops the boot.

**BREAKING:** the `unknownException` payload carries plain `guild` and `user` objects. Fetch anything else through the client.
