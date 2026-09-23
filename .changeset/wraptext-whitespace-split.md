---
"@seedcord/utils": patch
---

Fixed `renderTable` leaving a trailing space on a wrapped line when a cell holds consecutive spaces or tabs, because word-wrap split only on a single space.