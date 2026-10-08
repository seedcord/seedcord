---
'@seedcord/core': minor
'@seedcord/errors': minor
'@seedcord/gateway': patch
'@seedcord/http': patch
'@seedcord/plugin-mongoose': patch
'@seedcord/plugin-kysely-postgres': patch
---

`attach` now throws `CorePluginScopeMismatch` when a plugin's transport or runtime differs from the bot's, even when a cast or plain JS gets past the types. A plugin that narrows either one, like `Plugin<{ runtime: 'server' }>`, now has to pass the same value to `super()`, for example `super(host, { runtime: 'server' })`.
