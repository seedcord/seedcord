---
'@seedcord/gateway': minor
'@seedcord/http': minor
---

`@seedcord/gateway` and `@seedcord/http` now export `HmrModuleHandler`, so a plugin in your bot's own code can import it without depending on `@seedcord/core`.
