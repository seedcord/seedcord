---
'@seedcord/gateway': minor
---

**BREAKING:** The `anyEvent` bus key is now `eventDispatching`. It was a misnomer to call it `anyEvent` because it was only triggered for events with a registered handler.
