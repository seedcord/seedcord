---
'@seedcord/plugin-mongoose': patch
---

Fixed `connection` reading `undefined` before `init()` and after `dispose()`. It now throws `PluginServicesNotReady`, the same as `services`.
