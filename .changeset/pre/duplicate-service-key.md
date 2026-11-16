---
'@seedcord/plugin-kysely': patch
'@seedcord/plugin-mongoose': patch
---

Fixed two service classes registered under the same key replacing each other. Startup and `seedcord codegen` now throw `CoreDuplicateName` with both class names.
