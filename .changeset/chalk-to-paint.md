---
'@seedcord/plugin-kysely-postgres': patch
'@seedcord/plugin-mongoose': patch
'@seedcord/gateway': patch
'@seedcord/logger': patch
'@seedcord/errors': patch
'@seedcord/core': patch
'@seedcord/http': patch
'seedcord': patch
---

Framework log lines and error messages now paint their interpolated values with the truecolor tones, so a terminal theme can no longer remap them. One tone per kind of value throughout, an identifier reads blue, a count purple, a success green, and a failure red. Both database plugins dropped their `chalk` dependency.
