---
'@seedcord/utils': patch
---

`renderTable` now applies `maxWidth` under `border: 'markdown'` without needing `overflow: 'truncate'`, since a GFM cell holds one line. `header: false` under that border keeps row 0 as data and puts a blank row above the delimiter.
