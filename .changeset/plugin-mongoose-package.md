---
'@seedcord/plugin-mongoose': minor
---

The mongoose plugin ships as its own package, and it attaches to a gateway bot and to an http server bot.

**BREAKING:** `stop()` is now `dispose()`. The plugin declares its shutdown step, so the host runs it only when `init()` resolved.

**BREAKING:** `MongooseService` takes `CoreBase` as its second constructor parameter.

Model cleanup covers only the models this plugin registered, leaving the rest of the mongoose registry alone.
