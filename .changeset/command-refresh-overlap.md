---
'@seedcord/core': patch
---

Fixed `seedcord dev` registering a new command twice when a second command refresh started before the first one finished. Refreshes now run one at a time.
