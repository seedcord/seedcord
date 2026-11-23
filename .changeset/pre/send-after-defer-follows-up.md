---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** Fixed a second `send()` after `defer()` replacing the first one. The first call fills the placeholder, and every `send()` after it now sends a new message, the same as after `reply()`.
