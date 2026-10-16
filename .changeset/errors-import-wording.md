---
'@seedcord/errors': patch
---

`CoreImportFailed` now opens with "Could not import" and the file, since the CLI also throws it for a file still loading after 30s.
