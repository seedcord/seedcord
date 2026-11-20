---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** A gateway bot now has the `port` and `fetch()` members that an http bot already had, and every bot has the new `url`. Rename any plugin attached under one of those keys.
