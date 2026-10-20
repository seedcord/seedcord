---
'@seedcord/plugin-kysely-postgres': minor
'@seedcord/plugin-mongoose': minor
---

**BREAKING:** A `.tsx` or `.mts` file in the services or migrations folder now loads. A file inside `node_modules` or a dot-folder like `.old/` in that folder is now skipped.
