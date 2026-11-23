---
'seedcord': patch
---

Fixed the "referenced directly or indirectly in its own initializer" error on a bot whose plugin option reads another plugin, like a callback in one `attach()` that calls a Kysely service. `seedcord codegen` wrote `typeof Bot` into every `PluginTypes` row, so run it again to get rows without it.
