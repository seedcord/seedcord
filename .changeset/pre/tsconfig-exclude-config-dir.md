---
'@seedcord/tsconfig': patch
---

Fixed the base config's `exclude`, which pointed at the folder this package is installed in. It now skips `node_modules`, `dist`, `coverage` and `tests/temp` in your own project.
