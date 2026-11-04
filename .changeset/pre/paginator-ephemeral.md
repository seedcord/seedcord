---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** `Paginator` now sends an ephemeral first page by default, where it used to post a public message that anyone could click through. Pass `ephemeral: false` to keep a public list.
