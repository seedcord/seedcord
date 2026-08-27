---
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
---

A host whose startup failed used to tear down whichever host had replaced it, taking the replacement's signal handlers and logger config with it. Teardown now runs only for the host that is still live. A second `start()` racing the first rejects with the same error, where it used to resolve a half-started host.
