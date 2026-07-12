---
'@seedcord/gateway': minor
---

`WebhookLog` now runs the webhook ceremony. A reporter declares its url's env var with the new `@WebhookUrl` decorator and implements `report()` returning `{ username?, components, files? }`. The base resolves and validates the url, reuses one sender per url, posts through `@discordjs/rest`, and logs send failures. `username` defaults to the class name.

The webhook urls are optional. An unset var disables that reporter with a boot warning. A set but malformed value throws at boot. `UNKNOWN_EXCEPTION_WEBHOOK_URL` and `HANDLED_EXCEPTION_WEBHOOK_URL` keep their names.

At boot each configured webhook is probed with a GET on the token-bearing webhook route, without a bot token and without sending a message. A webhook that does not exist on Discord stops the boot. An unreachable Discord logs a warning and the boot continues.

**BREAKING:** a `WebhookLog` subclass implements `report()` and carries `@WebhookUrl`. The abstract `webhook` field is removed.
