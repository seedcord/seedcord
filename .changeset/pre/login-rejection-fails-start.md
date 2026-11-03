---
'@seedcord/gateway': patch
---

Fixed a refused Discord login, like a bad token or disallowed intents, waiting out the 10 second startup timeout. Startup now fails right away with Discord's reason.
