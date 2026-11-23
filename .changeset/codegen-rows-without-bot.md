---
'seedcord': patch
---

Fixed the "referenced directly or indirectly in its own initializer" error when a plugin option calls a plugin that the bot attached in an earlier statement, like a Kysely service. `seedcord codegen` wrote `typeof Bot` into every `PluginTypes` row. Run it again to rewrite them.
