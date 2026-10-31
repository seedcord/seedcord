---
'@seedcord/http': patch
---

Fixed interactions through `fetch()` failing while a `ready()` call took longer than Discord's three seconds, because `fetch()` held every request until all of them finished. It now answers once the Ready phase starts, the same moment the built-in server does.
