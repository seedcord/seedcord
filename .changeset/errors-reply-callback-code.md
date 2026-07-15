---
'@seedcord/errors': minor
---

Add the reply-surface error code `ReplyCallbackMissingMessage`, thrown when a `withResponse` interaction callback returns no created message. The foreign-target message now names the calling method, so `delete()` renders its own name.
