---
'@seedcord/plugin-mongoose': patch
'@seedcord/plugin-kysely-postgres': patch
---

Fixed a service that a barrel file re-exports being built twice at startup. Both plugins now need `@seedcord/core` 0.13 or later.
