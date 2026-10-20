---
'seedcord': patch
---

Fixed Ctrl-D in `seedcord dev` disconnecting the bot on the first press. It now asks first, the way Ctrl-C asks before it quits, and disconnects on the second press.
