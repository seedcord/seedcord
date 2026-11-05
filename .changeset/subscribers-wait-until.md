---
'@seedcord/http': patch
'@seedcord/core': patch
---

Fixed subscribers on an edge bot getting cut off when the request ended, which lost `WebhookLog` cards and error reports. A request now stays open until the subscribers it published to finish.
