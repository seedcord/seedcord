---
'@seedcord/gateway': patch
'@seedcord/http': patch
---

Fixed a `Notice` whose `render()` throws leaving the user with no reply. The user now gets the default fault card on both transports.
