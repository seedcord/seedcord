---
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
---

Fixed a node bot that waited 5 extra seconds to shut down after a page's server-sent events stream closed.
