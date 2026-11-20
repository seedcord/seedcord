---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

Plugins can now answer web requests with a `fetch(request)` method, like an OAuth callback. seedcord calls each plugin's `fetch` in attach order before the interactions engine. A gateway bot serves those routes on the same server as its health path.
