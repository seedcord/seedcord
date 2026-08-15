---
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
---

Every fault now reaches your subscribers. A rare bug used to stay silent while a common one kept throwing on the same route. Webhook cards still group repeats to one a minute, and each carries how many it covers.
