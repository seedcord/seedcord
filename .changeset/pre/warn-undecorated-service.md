---
'@seedcord/plugin-mongoose': patch
'@seedcord/plugin-kysely': patch
---

The plugin now logs a warning for an exported class in `path` that extends its service base but isn't decorated. It used to skip that class without saying anything.
