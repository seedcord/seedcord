---
'seedcord': patch
---

Fixed `seedcord dev` setting your interactions endpoint to the tunnel's base path, which meant a page at `/` conflicted with it. It now sets the tunnel address plus `/__seedcord/interactions`.
