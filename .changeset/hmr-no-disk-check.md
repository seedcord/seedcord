---
'@seedcord/core': patch
'seedcord': patch
---

`HmrModuleHandler` now reloads every `update` it gets, because `seedcord dev` sends a `delete` for a file that no longer exists.
