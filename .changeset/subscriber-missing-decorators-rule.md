---
'@seedcord/eslint-plugin': minor
---

New rule `subscriber-missing-decorators`, on in the recommended preset. A concrete `Subscriber` subclass without `@Subscribe` is never registered by the bus, and a `WebhookLog` reporter without `@WebhookUrl` throws at boot. The decorators match by origin, an aliased import counts and a same-named decorator from another package never satisfies the rule.
