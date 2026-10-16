---
'@seedcord/plugin-mongoose': patch
'@seedcord/plugin-kysely-postgres': patch
---

Fixed a failed disconnect showing up twice at shutdown. The plugin used to log it and then throw it, and now only the thrown `PluginDisconnectFailed` reports it.
