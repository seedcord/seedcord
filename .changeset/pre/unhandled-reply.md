---
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** A command or button without a handler now replies "This doesn't do anything right now." To send your own reply, pass a handler class as `interactions.unhandled` in your config, and it can read `this.t` like any other handler.
