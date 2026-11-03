---
'@seedcord/http': patch
---

Fixed http not logging a warning when an interaction reaches the unhandled default or carries a custom ID that seedcord can't route. It now warns the same as gateway.
