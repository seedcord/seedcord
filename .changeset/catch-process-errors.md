---
'@seedcord/types': minor
'@seedcord/core': minor
---

`errors.catchProcessErrors` reports a throw that escaped every handler, and defaults on. The bot keeps running after a rejection. An uncaught exception runs the coordinated shutdown and exits 1.
