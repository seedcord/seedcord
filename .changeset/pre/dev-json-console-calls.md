---
'seedcord': patch
---

Fixed `seedcord dev` without a terminal printing `console` calls as raw text. A `console.log` from a Vite plugin or your bot now comes out as a JSON line.
