---
'@seedcord/errors': patch
---

`CliEntryNotFound` is now `CliFileNotFound`, still code 3103. Its message now says whether `instance` or `build.start` in the seedcord config points at the missing file.
