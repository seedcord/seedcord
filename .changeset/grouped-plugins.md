---
'@seedcord/core': minor
---

A plugin key takes one dot, so `attach('services.users', Users)` reads back as `core.services.users`. The compiler rejects a key that collides with a plugin, a group, or a member the bot already carries.
