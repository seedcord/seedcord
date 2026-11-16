---
'@seedcord/plugin-kysely': patch
---

Fixed `connection` reading `undefined` before `init()`. It now throws `PluginNotReady`, the same as `services`.
