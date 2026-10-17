---
'@seedcord/utils': patch
---

Fixed `filterCirculars` in `json` mode printing `[Circular]` for an object that two fields share. Pretty logs from `@seedcord/logger` now show that object under both fields.
