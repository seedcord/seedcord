---
'@seedcord/gateway': patch
'@seedcord/http': patch
---

The health path now answers 503 while the bot starts and again once shutdown starts, and a gateway bot opens its server when the Ready phase begins. The bot's own server now answers a request body over 1 MiB with a 413.
