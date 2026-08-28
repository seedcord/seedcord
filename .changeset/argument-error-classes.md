---
'@seedcord/plugin-kysely-postgres': minor
'@seedcord/plugin-mongoose': minor
'@seedcord/errors': minor
'@seedcord/gateway': minor
'@seedcord/core': minor
'@seedcord/http': minor
---

**BREAKING:** an error that reports a bad argument now throws `SeedcordTypeError` or `SeedcordRangeError`. Update any `isSeedcordError(error, 'SeedcordError', code)` call naming one of those codes, since branching on the code alone is unaffected.

An invalid plugin lifecycle timeout throws the new `PluginInvalidLifecycleTimeout` code.
