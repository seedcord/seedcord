---
'@seedcord/errors': minor
---

**BREAKING:** `PluginServicesNotReady` is now `PluginNotReady`, since it also covers `connection` and reads after `dispose()`. Update any code that checks for the old name.
