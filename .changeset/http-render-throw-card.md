---
'@seedcord/http': patch
---

Fixed a `Notice` whose `render()` throws leaving the user with no reply on http. The user now gets the default fault card, the same as on gateway.
