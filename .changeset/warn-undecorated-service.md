---
'@seedcord/plugin-mongoose': patch
'@seedcord/plugin-kysely-postgres': patch
---

The plugin now logs a warning for a class in `dir` that extends its service base without the decorator. It skips that class, so `services.<key>` would read `undefined`.
