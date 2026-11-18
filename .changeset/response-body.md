---
'@seedcord/core': minor
'@seedcord/gateway': patch
'@seedcord/http': patch
---

`responseAttempted` now includes a `body` with what the write sent, like the components of a reply or the modal from `showModal`, so a subscriber can log what Discord rejected.
