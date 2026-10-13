---
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
---

Fixed a bot failing to start when Discord held its command deploy longer than 10 seconds, like on a third restart within a minute. Startup now gives the deploy up to 75 seconds for Discord's rate limit to reset.
