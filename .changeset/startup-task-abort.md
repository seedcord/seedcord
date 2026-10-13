---
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
---

Fixed a bot that failed to start still deploying its commands later, once Discord's rate limit cleared.
