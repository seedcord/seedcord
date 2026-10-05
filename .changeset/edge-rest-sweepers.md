---
'@seedcord/http': patch
---

Fixed an edge bot throwing at a worker's global scope, because its REST client started sweeper timers there.
