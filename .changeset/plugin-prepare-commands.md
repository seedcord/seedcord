---
'@seedcord/core': minor
'seedcord': minor
---

A plugin can now define `prepareCommands` to edit commands before seedcord sends them to Discord, like setting `name_localizations`. A started bot runs it before it deploys, and so do `seedcord codegen`, a Workers build, and `seedcord commands deploy`, `list` and `remove`.
