---
'@seedcord/core': minor
'@seedcord/errors': patch
---

`@WebhookUrl` now also takes a function that returns the url, like `@WebhookUrl(() => settings.banLogWebhook)`, for a url you keep outside the environment.
