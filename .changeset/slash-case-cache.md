---
'@seedcord/gateway': patch
---

Fixed a `this.match()` case for a guild-only route getting wide types like `Role | APIRole` when another route on the same `SlashHandler` works in DMs. A `Cache` that you write on the class still applies to every case.
