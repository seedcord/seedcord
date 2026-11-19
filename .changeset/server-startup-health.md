---
'@seedcord/gateway': patch
'@seedcord/http': patch
---

The health path now answers 503 while the bot starts and again once shutdown starts, and a gateway bot opens its server when the Ready phase begins. A request body over 1 MiB now gets a 413 on either transport.
