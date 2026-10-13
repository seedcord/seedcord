---
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
---

Fixed a bot failing to start when Discord held its command deploy longer than 10 seconds, like on a third restart within a minute. The deploy now waits out Discord's rate limit for up to 75 seconds.
