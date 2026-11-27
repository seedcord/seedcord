---
'@seedcord/http': minor
---

**BREAKING:** Discord's interactions now go to the interactions engine before any plugin's `fetch()`, so a slow `fetch()` no longer uses up their three seconds. A plugin that answered POSTs on your interactions endpoint path no longer gets them.
