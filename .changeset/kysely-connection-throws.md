---
'@seedcord/plugin-kysely': patch
---

Fixed `connection` reading `undefined` before `init()`. It now throws `PluginServicesNotReady`, the same as `services`.
