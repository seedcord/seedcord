---
'@seedcord/core': minor
---

`Cooldown('1.5h')`, `Cooldown('0s')`, and any other duration literal the parser rejects now fail to compile, where they used to throw as the module loaded.
