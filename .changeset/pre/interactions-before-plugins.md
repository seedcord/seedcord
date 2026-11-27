---
'@seedcord/http': minor
---

**BREAKING:** Discord's interactions now go straight to the interactions engine on any path, and a plugin's `fetch()` never gets them. A slow `fetch()` used to use up part of their three seconds.
