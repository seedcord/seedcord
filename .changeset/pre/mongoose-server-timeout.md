---
'@seedcord/plugin-mongoose': patch
---

Fixed a bot with an unreachable MongoDB failing startup with `LifecycleTaskTimeout` before the driver could report why. The plugin now gives up on finding a server after 10 seconds, so `init()` throws `PluginConnectionFailed` with the driver's reason, and `connectionOptions.serverSelectionTimeoutMS` still overrides it.
