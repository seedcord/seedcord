---
'@seedcord/errors': minor
---

**BREAKING:** `ConfigUnknownExceptionWebhookMissing`, `ConfigUnknownExceptionWebhookInvalid`, `ConfigHandledExceptionWebhookMissing`, and `ConfigHandledExceptionWebhookInvalid` are removed. `ConfigWebhookUrlInvalid` covers a malformed webhook url for any reporter, `ConfigWebhookNotFound` covers a webhook Discord answers 404 or 401 for at boot, `DecoratorWebhookUrlMissing` covers a `WebhookLog` subclass without `@WebhookUrl`, and `ConfigEmojiUnresolved` renumbers to 1005.
