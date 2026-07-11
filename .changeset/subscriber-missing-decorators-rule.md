---
'@seedcord/eslint-plugin': minor
---

New rule `subscriber-missing-decorators`, on in the recommended preset. A concrete `Subscriber` subclass without `@Subscribe` is never registered by the bus, and a `WebhookLog` reporter without `@WebhookUrl` throws at boot.
