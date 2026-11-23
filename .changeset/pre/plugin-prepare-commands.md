---
'@seedcord/core': minor
'seedcord': minor
---

A plugin can now define `prepareCommands` to edit commands before seedcord sends them to Discord, like setting `name_localizations`. A started bot runs it before it deploys, and so do `seedcord codegen`, a Workers build, `seedcord commands deploy`, and `seedcord commands list`.
