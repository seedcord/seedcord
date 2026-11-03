---
'@seedcord/core': patch
---

Fixed `seedcord dev` leaving a route without a handler when you move a handler to a new file. The new file now loads as soon as the old one unloads.
