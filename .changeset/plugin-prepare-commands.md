---
'@seedcord/core': minor
'seedcord': minor
---

A plugin can now define `prepareCommands` to edit commands before seedcord sends them to Discord, like setting `name_localizations`. A started bot, `seedcord commands deploy`, `seedcord build` and `seedcord codegen` all run it.
