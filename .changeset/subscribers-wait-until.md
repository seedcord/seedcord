---
'@seedcord/http': patch
'@seedcord/core': patch
---

Fixed subscribers and async `bus.on()` listeners on an edge bot getting cut off when the request ended, which lost `WebhookLog` cards and error reports. The bot now keeps each request open until that work finishes, including work that a startup task publishes.
