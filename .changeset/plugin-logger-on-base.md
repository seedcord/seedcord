---
'@seedcord/core': minor
---

**BREAKING:** `Plugin` supplies `this.logger` itself, labelled from the class name and channelled to the attach key. Delete the `logger` field from your plugin. `PluginContext` no longer carries `logger`, read `this.logger`.
