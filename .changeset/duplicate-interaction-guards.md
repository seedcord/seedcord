---
'@seedcord/gateway': patch
'@seedcord/errors': patch
---

Throw on a duplicate interaction route, and on two interaction middleware classes sharing a name. Before, the later registration silently overwrote the earlier one.
