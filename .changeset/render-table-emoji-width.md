---
'@seedcord/utils': patch
---

Fixed `renderTable` counting a flag, a keycap, or an emoji-presentation symbol as one column, which left every border after it one column out.
