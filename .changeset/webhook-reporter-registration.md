---
'@seedcord/core': patch
---

A `WebhookLog` whose env var is unset now warns once at registration on every transport. `execute()` throws `ConfigMissingEnv` when the variable disappears after that.
