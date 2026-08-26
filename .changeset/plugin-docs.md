---
'@seedcord/core': patch
---

`Plugin`, `PluginLifecycleSpec`, and `PluginOptions` are better documented now with examples and explanations.

_Kinda BREAKING:_ `Initializeable` moved to `@seedcord/core/internal`. It describes framework wiring, and `Plugin` already declares `abstract init()` for you. This was supposed to be internal anyway. No one should have been implementing it.
