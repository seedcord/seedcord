---
'@seedcord/core': minor
'@seedcord/errors': minor
---

**BREAKING:** `attach` rejects a plugin key matching a framework log channel, at compile time and at runtime with new code `CorePluginReservedChannel`. Rename any plugin attached under `bot`, `errors`, `plugins`, or another reserved name.
