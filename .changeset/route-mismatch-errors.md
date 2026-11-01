---
'@seedcord/core': patch
---

Fixed the compile error for a route decorator that doesn't match its handler's generic. It now shows both values, like `{ decorator: "roster"; generic: "ping" }`, and a misspelled command gives one error that quotes it.
