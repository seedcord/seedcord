---
'@seedcord/core': patch
---

Fixed `seedcord dev` hiding a failed command refresh on an edge bot. The `Commands` logger now logs the error on every transport.
