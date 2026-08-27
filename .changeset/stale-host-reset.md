---
'@seedcord/gateway': patch
'@seedcord/http': patch
---

Calling `start()` again on a host whose startup already failed used to tear down whichever host had replaced it, taking its signal handlers and its logger config with it. The retry now throws and leaves the live host alone.
