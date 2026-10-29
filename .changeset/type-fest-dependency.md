---
'@seedcord/core': patch
'@seedcord/custom-id': patch
'@seedcord/gateway': patch
'@seedcord/types': patch
'@seedcord/utils': patch
'@seedcord/plugin-kysely-postgres': patch
'@seedcord/plugin-mongoose': patch
---

Fixed the `type-fest` types in the published declarations failing to resolve, since each package listed `type-fest` only as a dev dependency.
