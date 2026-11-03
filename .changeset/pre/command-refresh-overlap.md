---
'@seedcord/core': patch
---

Fixed `seedcord dev` registering a new command twice when a command refresh started before the startup deploy or the previous refresh finished. They now run one at a time.
