---
'@seedcord/utils': patch
---

Fixed `renderTable` hanging when a single character is wider than `maxWidth`, like an emoji with `maxWidth: 1`.
