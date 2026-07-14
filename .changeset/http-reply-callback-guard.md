---
'@seedcord/http': minor
---

`reply()` and `update()` throw the registered `ReplyCallbackMissingMessage` error when the interaction callback carries no created message. Handlers gain `this.delete()` for the initial reply or a message the interaction sent.
