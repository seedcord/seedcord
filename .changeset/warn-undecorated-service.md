---
'@seedcord/plugin-mongoose': patch
'@seedcord/plugin-kysely': patch
---

The plugin now logs a warning for a class in `dir` that extends its service base but isn't decorated. It used to skip that class without saying anything.
