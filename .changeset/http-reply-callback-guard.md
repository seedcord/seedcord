---
'@seedcord/http': minor
---

`reply()` and `update()` throw the registered `ReplyCallbackMissingMessage` error when the interaction callback carries no created message. `this.delete()` removes the initial reply or a message the interaction sent.
