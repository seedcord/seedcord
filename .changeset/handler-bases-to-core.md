---
'@seedcord/core': minor
---

Adds the shared handler bases `BaseHandler` and `RepliableHandler`. Both transports extend them, the reply members are defined once, and each transport supplies its sender through `buildSender`.
