---
'@seedcord/core': patch
---

`WebhookLog` cards now go through the bot's own REST client, so the REST options you set for the bot apply to them too.
